import { Router } from "express";
import { db, conversations, messages, memories, agentRuns } from "@workspace/db";
import { eq, and, asc, desc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth";
import { runOrchestrator, streamOrchestrator, routeToAgent } from "../agents/orchestrator";

const router = Router();
router.use(requireAuth);

// List conversations
router.get("/conversations", async (req: AuthRequest, res) => {
  const rows = await db.select().from(conversations)
    .where(eq(conversations.userId, req.userId!))
    .orderBy(desc(conversations.updatedAt))
    .limit(50);
  const result = await Promise.all(rows.map(async (c) => {
    const msgs = await db.select().from(messages).where(eq(messages.conversationId, c.id));
    return { ...c, title: c.title ?? null, agentUsed: c.agentUsed ?? null, messageCount: msgs.length };
  }));
  res.json(result);
});

// Create conversation
router.post("/conversations", async (req: AuthRequest, res) => {
  const { title } = req.body;
  const [conv] = await db.insert(conversations).values({
    userId: req.userId!, title: title ?? null,
  }).returning();
  res.status(201).json({ ...conv, title: conv.title ?? null, agentUsed: conv.agentUsed ?? null, messageCount: 0 });
});

// Get conversation with messages
router.get("/conversations/:id", async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const [conv] = await db.select().from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, req.userId!))).limit(1);
  if (!conv) { res.status(404).json({ error: "Not found" }); return; }
  const msgs = await db.select().from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));
  res.json({
    ...conv, title: conv.title ?? null,
    messages: msgs.map(m => ({ ...m, agentUsed: m.agentUsed ?? null })),
  });
});

// Delete conversation
router.delete("/conversations/:id", async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  await db.delete(conversations).where(and(eq(conversations.id, id), eq(conversations.userId, req.userId!)));
  res.status(204).end();
});

// Stream message (SSE)
router.post("/conversations/:id/messages/stream", async (req: AuthRequest, res) => {
  const convId = Number(req.params.id);
  const { content } = req.body;
  if (!content) { res.status(400).json({ error: "content required" }); return; }

  const [conv] = await db.select().from(conversations)
    .where(and(eq(conversations.id, convId), eq(conversations.userId, req.userId!))).limit(1);
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }

  // Save user message immediately
  const [userMsg] = await db.insert(messages).values({
    conversationId: convId, role: "user", content,
  }).returning();

  // Load history
  const history = await db.select().from(messages)
    .where(eq(messages.conversationId, convId))
    .orderBy(asc(messages.createdAt))
    .limit(30);

  const historyForOrchestrator = history
    .filter(m => m.role === "user" || m.role === "assistant")
    .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const agentUsed = routeToAgent(content);
  const start = Date.now();

  // Send user message and detected agent first
  res.write(`data: ${JSON.stringify({ type: "init", userMessageId: userMsg.id, agentUsed })}\n\n`);

  const sendEvent = (data: Record<string, unknown>) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  await streamOrchestrator(
    content,
    historyForOrchestrator,
    (token) => {
      sendEvent({ type: "token", token });
    },
    async (fullText, finalAgent) => {
      const latencyMs = Date.now() - start;

      // Save assistant message
      const [assistantMsg] = await db.insert(messages).values({
        conversationId: convId, role: "assistant", content: fullText, agentUsed: finalAgent,
      }).returning();

      // Update conversation
      await db.update(conversations).set({
        agentUsed: finalAgent, updatedAt: new Date(),
        title: conv.title ?? content.slice(0, 60),
      }).where(eq(conversations.id, convId));

      // Log agent run
      await db.insert(agentRuns).values({
        userId: req.userId!, conversationId: convId, agentName: finalAgent,
        inputData: { content }, outputData: { text: fullText }, latencyMs,
      }).catch(() => {});

      // Store memory
      await db.insert(memories).values({
        userId: req.userId!, category: "CONVERSATION",
        title: content.slice(0, 80),
        content: `${content}\n\n→ ${fullText.slice(0, 400)}`,
        importance: 0.4, tags: [finalAgent],
      }).catch(() => {});

      sendEvent({ type: "done", assistantMessageId: assistantMsg.id, agentUsed: finalAgent });
      res.end();
    },
    (err) => {
      sendEvent({ type: "error", error: err.message });
      res.end();
    }
  );
});

// Non-streaming send message (kept for compatibility)
router.post("/conversations/:id/messages", async (req: AuthRequest, res) => {
  const convId = Number(req.params.id);
  const { content } = req.body;
  if (!content) { res.status(400).json({ error: "content required" }); return; }

  const [conv] = await db.select().from(conversations)
    .where(and(eq(conversations.id, convId), eq(conversations.userId, req.userId!))).limit(1);
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }

  const [userMsg] = await db.insert(messages).values({
    conversationId: convId, role: "user", content,
  }).returning();

  const history = await db.select().from(messages)
    .where(eq(messages.conversationId, convId))
    .orderBy(asc(messages.createdAt))
    .limit(30);

  const historyForOrchestrator = history
    .filter(m => m.role === "user" || m.role === "assistant")
    .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

  const start = Date.now();

  try {
    const { text, agentUsed } = await runOrchestrator(content, historyForOrchestrator);
    const latencyMs = Date.now() - start;

    const [assistantMsg] = await db.insert(messages).values({
      conversationId: convId, role: "assistant", content: text, agentUsed,
    }).returning();

    await db.update(conversations).set({
      agentUsed, updatedAt: new Date(),
      title: conv.title ?? content.slice(0, 60),
    }).where(eq(conversations.id, convId));

    await db.insert(agentRuns).values({
      userId: req.userId!, conversationId: convId, agentName: agentUsed,
      inputData: { content }, outputData: { text }, latencyMs,
    }).catch(() => {});

    await db.insert(memories).values({
      userId: req.userId!, category: "CONVERSATION",
      title: content.slice(0, 80),
      content: `${content}\n\n→ ${text.slice(0, 400)}`,
      importance: 0.4, tags: [agentUsed],
    }).catch(() => {});

    res.json({
      userMessage: { ...userMsg, agentUsed: null },
      assistantMessage: { ...assistantMsg, agentUsed },
      agentUsed,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: "Agent error: " + errorMessage });
  }
});

export default router;
