import { Router } from "express";
import { db, notes } from "@workspace/db";
import { eq, and, ilike, arrayContains, desc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: AuthRequest, res) => {
  const { search, tag } = req.query as { search?: string; tag?: string };
  let query = db.select().from(notes).where(eq(notes.userId, req.userId!)).$dynamic();
  if (search) query = query.where(and(eq(notes.userId, req.userId!), ilike(notes.title, `%${search}%`)));
  const rows = await query.orderBy(desc(notes.updatedAt));
  res.json(rows.map(n => ({ ...n, tags: n.tags ?? [] })));
});

router.post("/", async (req: AuthRequest, res) => {
  const { title, body, tags } = req.body;
  if (!title) { res.status(400).json({ error: "title required" }); return; }
  const [note] = await db.insert(notes).values({
    userId: req.userId!, title, body: body ?? "", tags: tags ?? [],
  }).returning();
  res.status(201).json({ ...note, tags: note.tags ?? [] });
});

router.get("/:id", async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const [note] = await db.select().from(notes).where(and(eq(notes.id, id), eq(notes.userId, req.userId!))).limit(1);
  if (!note) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...note, tags: note.tags ?? [] });
});

router.patch("/:id", async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const { title, body, tags } = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (title !== undefined) updates.title = title;
  if (body !== undefined) updates.body = body;
  if (tags !== undefined) updates.tags = tags;
  const [note] = await db.update(notes).set(updates).where(and(eq(notes.id, id), eq(notes.userId, req.userId!))).returning();
  if (!note) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...note, tags: note.tags ?? [] });
});

router.delete("/:id", async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  await db.delete(notes).where(and(eq(notes.id, id), eq(notes.userId, req.userId!)));
  res.status(204).end();
});

export default router;
