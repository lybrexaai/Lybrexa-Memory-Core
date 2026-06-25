import { Router } from "express";
import { db, goals } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: AuthRequest, res) => {
  const rows = await db.select().from(goals)
    .where(eq(goals.userId, req.userId!))
    .orderBy(desc(goals.updatedAt));
  res.json(rows.map(g => ({
    ...g, dueDate: g.dueDate?.toISOString() ?? null, projectId: g.projectId ?? null,
  })));
});

router.post("/", async (req: AuthRequest, res) => {
  const { title, horizon, progress, projectId, dueDate } = req.body;
  if (!title || !horizon) { res.status(400).json({ error: "title and horizon required" }); return; }
  const [goal] = await db.insert(goals).values({
    userId: req.userId!, title, horizon,
    progress: progress ?? 0,
    projectId: projectId ?? null,
    dueDate: dueDate ? new Date(dueDate) : null,
  }).returning();
  res.status(201).json({ ...goal, dueDate: goal.dueDate?.toISOString() ?? null, projectId: goal.projectId ?? null });
});

router.patch("/:id", async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const { title, horizon, progress, projectId, dueDate } = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (title !== undefined) updates.title = title;
  if (horizon !== undefined) updates.horizon = horizon;
  if (progress !== undefined) updates.progress = progress;
  if (projectId !== undefined) updates.projectId = projectId;
  if (dueDate !== undefined) updates.dueDate = dueDate ? new Date(dueDate) : null;
  const [goal] = await db.update(goals).set(updates)
    .where(and(eq(goals.id, id), eq(goals.userId, req.userId!))).returning();
  if (!goal) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...goal, dueDate: goal.dueDate?.toISOString() ?? null, projectId: goal.projectId ?? null });
});

router.delete("/:id", async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  await db.delete(goals).where(and(eq(goals.id, id), eq(goals.userId, req.userId!)));
  res.status(204).end();
});

export default router;
