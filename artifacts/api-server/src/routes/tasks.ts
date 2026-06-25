import { Router } from "express";
import { db, tasks } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth";

const router = Router();
router.use(requireAuth);

router.get("/summary", async (req: AuthRequest, res) => {
  const rows = await db.select().from(tasks).where(eq(tasks.userId, req.userId!));
  const summary = { todo: 0, inProgress: 0, blocked: 0, done: 0, total: rows.length };
  for (const t of rows) {
    if (t.status === "TODO") summary.todo++;
    else if (t.status === "IN_PROGRESS") summary.inProgress++;
    else if (t.status === "BLOCKED") summary.blocked++;
    else if (t.status === "DONE") summary.done++;
  }
  res.json(summary);
});

router.get("/", async (req: AuthRequest, res) => {
  const { status, priority, projectId } = req.query as Record<string, string>;
  let rows = await db.select().from(tasks).where(eq(tasks.userId, req.userId!)).orderBy(desc(tasks.updatedAt));
  if (status) rows = rows.filter(t => t.status === status);
  if (priority) rows = rows.filter(t => t.priority === priority);
  if (projectId) rows = rows.filter(t => t.projectId === Number(projectId));
  res.json(rows.map(t => ({
    ...t,
    dueDate: t.dueDate?.toISOString() ?? null,
    projectId: t.projectId ?? null,
  })));
});

router.post("/", async (req: AuthRequest, res) => {
  const { title, description, status, priority, projectId, dueDate } = req.body;
  if (!title) { res.status(400).json({ error: "title required" }); return; }
  const [task] = await db.insert(tasks).values({
    userId: req.userId!, title, description: description ?? null,
    status: status ?? "TODO", priority: priority ?? "MEDIUM",
    projectId: projectId ?? null,
    dueDate: dueDate ? new Date(dueDate) : null,
  }).returning();
  res.status(201).json({ ...task, dueDate: task.dueDate?.toISOString() ?? null, projectId: task.projectId ?? null });
});

router.patch("/:id", async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const { title, description, status, priority, projectId, dueDate } = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (status !== undefined) updates.status = status;
  if (priority !== undefined) updates.priority = priority;
  if (projectId !== undefined) updates.projectId = projectId;
  if (dueDate !== undefined) updates.dueDate = dueDate ? new Date(dueDate) : null;
  const [task] = await db.update(tasks).set(updates).where(and(eq(tasks.id, id), eq(tasks.userId, req.userId!))).returning();
  if (!task) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...task, dueDate: task.dueDate?.toISOString() ?? null, projectId: task.projectId ?? null });
});

router.delete("/:id", async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, req.userId!)));
  res.status(204).end();
});

export default router;
