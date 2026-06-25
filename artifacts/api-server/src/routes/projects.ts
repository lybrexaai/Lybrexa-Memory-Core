import { Router } from "express";
import { db, projects, tasks } from "@workspace/db";
import { eq, and, desc, count } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: AuthRequest, res) => {
  const rows = await db.select().from(projects)
    .where(eq(projects.userId, req.userId!))
    .orderBy(desc(projects.updatedAt));
  const result = await Promise.all(rows.map(async (p) => {
    const [{ value }] = await db.select({ value: count() }).from(tasks).where(eq(tasks.projectId, p.id));
    return { ...p, description: p.description ?? null, repoUrl: p.repoUrl ?? null, taskCount: Number(value) };
  }));
  res.json(result);
});

router.post("/", async (req: AuthRequest, res) => {
  const { name, description, status, repoUrl } = req.body;
  if (!name) { res.status(400).json({ error: "name required" }); return; }
  const [project] = await db.insert(projects).values({
    userId: req.userId!, name, description: description ?? null,
    status: status ?? "ACTIVE", repoUrl: repoUrl ?? null,
  }).returning();
  res.status(201).json({ ...project, description: project.description ?? null, repoUrl: project.repoUrl ?? null, taskCount: 0 });
});

router.patch("/:id", async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const { name, description, status, repoUrl } = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (status !== undefined) updates.status = status;
  if (repoUrl !== undefined) updates.repoUrl = repoUrl;
  const [project] = await db.update(projects).set(updates)
    .where(and(eq(projects.id, id), eq(projects.userId, req.userId!))).returning();
  if (!project) { res.status(404).json({ error: "Not found" }); return; }
  const [{ value }] = await db.select({ value: count() }).from(tasks).where(eq(tasks.projectId, id));
  res.json({ ...project, description: project.description ?? null, repoUrl: project.repoUrl ?? null, taskCount: Number(value) });
});

router.delete("/:id", async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  await db.delete(projects).where(and(eq(projects.id, id), eq(projects.userId, req.userId!)));
  res.status(204).end();
});

export default router;
