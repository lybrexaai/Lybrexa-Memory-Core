import { Router } from "express";
import { db, journalEntries } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: AuthRequest, res) => {
  const rows = await db.select().from(journalEntries)
    .where(eq(journalEntries.userId, req.userId!))
    .orderBy(desc(journalEntries.date));
  res.json(rows.map(e => ({ ...e, date: e.date.toISOString(), tags: e.tags ?? [] })));
});

router.post("/", async (req: AuthRequest, res) => {
  const { date, body, mood, tags } = req.body;
  if (!date || !body) { res.status(400).json({ error: "date and body required" }); return; }
  const [entry] = await db.insert(journalEntries).values({
    userId: req.userId!, date: new Date(date), body, mood: mood ?? null, tags: tags ?? [],
  }).returning();
  res.status(201).json({ ...entry, date: entry.date.toISOString(), tags: entry.tags ?? [] });
});

router.patch("/:id", async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const { body, mood, tags } = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body !== undefined) updates.body = body;
  if (mood !== undefined) updates.mood = mood;
  if (tags !== undefined) updates.tags = tags;
  const [entry] = await db.update(journalEntries).set(updates)
    .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, req.userId!))).returning();
  if (!entry) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...entry, date: entry.date.toISOString(), tags: entry.tags ?? [] });
});

router.delete("/:id", async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  await db.delete(journalEntries).where(and(eq(journalEntries.id, id), eq(journalEntries.userId, req.userId!)));
  res.status(204).end();
});

export default router;
