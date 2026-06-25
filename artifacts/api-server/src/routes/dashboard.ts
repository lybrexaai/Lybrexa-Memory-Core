import { Router } from "express";
import { db, tasks, notes, memories, goals, projects, conversations, agentRuns } from "@workspace/db";
import { eq, and, gte, desc, count } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth";

const router = Router();
router.use(requireAuth);

router.get("/summary", async (req: AuthRequest, res) => {
  const uid = req.userId!;
  const [allTasks, noteCount, memCount, goalCount, projectCount, convCount] = await Promise.all([
    db.select().from(tasks).where(eq(tasks.userId, uid)),
    db.select({ value: count() }).from(notes).where(eq(notes.userId, uid)),
    db.select({ value: count() }).from(memories).where(eq(memories.userId, uid)),
    db.select({ value: count() }).from(goals).where(eq(goals.userId, uid)),
    db.select({ value: count() }).from(projects).where(eq(projects.userId, uid)),
    db.select({ value: count() }).from(conversations).where(eq(conversations.userId, uid)),
  ]);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const runs = await db.select({ value: count() }).from(agentRuns)
    .where(and(eq(agentRuns.userId, uid), gte(agentRuns.createdAt, today)));
  const taskSummary = { todo: 0, inProgress: 0, blocked: 0, done: 0, total: allTasks.length };
  for (const t of allTasks) {
    if (t.status === "TODO") taskSummary.todo++;
    else if (t.status === "IN_PROGRESS") taskSummary.inProgress++;
    else if (t.status === "BLOCKED") taskSummary.blocked++;
    else if (t.status === "DONE") taskSummary.done++;
  }
  res.json({
    tasks: taskSummary,
    notes: Number(noteCount[0]?.value ?? 0),
    memories: Number(memCount[0]?.value ?? 0),
    goals: Number(goalCount[0]?.value ?? 0),
    projects: Number(projectCount[0]?.value ?? 0),
    conversations: Number(convCount[0]?.value ?? 0),
    agentRunsToday: Number(runs[0]?.value ?? 0),
  });
});

router.get("/activity", async (req: AuthRequest, res) => {
  const uid = req.userId!;
  const [recentNotes, recentTasks, recentConvs, recentMems] = await Promise.all([
    db.select().from(notes).where(eq(notes.userId, uid)).orderBy(desc(notes.updatedAt)).limit(5),
    db.select().from(tasks).where(eq(tasks.userId, uid)).orderBy(desc(tasks.updatedAt)).limit(5),
    db.select().from(conversations).where(eq(conversations.userId, uid)).orderBy(desc(conversations.updatedAt)).limit(5),
    db.select().from(memories).where(eq(memories.userId, uid)).orderBy(desc(memories.createdAt)).limit(5),
  ]);
  const items = [
    ...recentNotes.map(n => ({ id: n.id, type: "note", title: n.title, meta: null, createdAt: n.updatedAt.toISOString() })),
    ...recentTasks.map(t => ({ id: t.id, type: "task", title: t.title, meta: t.status, createdAt: t.updatedAt.toISOString() })),
    ...recentConvs.map(c => ({ id: c.id, type: "conversation", title: c.title ?? "Untitled", meta: c.agentUsed, createdAt: c.updatedAt.toISOString() })),
    ...recentMems.map(m => ({ id: m.id, type: "memory", title: m.title, meta: m.category, createdAt: m.createdAt.toISOString() })),
  ];
  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(items.slice(0, 20));
});

export default router;
