import { Router } from "express";
import { db, memories } from "@workspace/db";
import { eq, and, desc, ilike } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth";

const router = Router();
router.use(requireAuth);

router.get("/stats", async (req: AuthRequest, res) => {
  const rows = await db.select().from(memories).where(eq(memories.userId, req.userId!));
  const byCat = new Map<string, number>();
  for (const m of rows) {
    byCat.set(m.category, (byCat.get(m.category) ?? 0) + 1);
  }
  res.json({
    total: rows.length,
    byCategory: Array.from(byCat.entries()).map(([category, count]) => ({ category, count })),
  });
});

router.get("/", async (req: AuthRequest, res) => {
  const { category, search } = req.query as { category?: string; search?: string };
  let rows = await db.select().from(memories)
    .where(eq(memories.userId, req.userId!))
    .orderBy(desc(memories.importance));
  if (category) rows = rows.filter(m => m.category === category);
  if (search) rows = rows.filter(m => m.title.toLowerCase().includes(search.toLowerCase()) || m.content.toLowerCase().includes(search.toLowerCase()));
  res.json(rows.map(m => ({ ...m, tags: m.tags ?? [], lastAccess: m.lastAccess?.toISOString() ?? null })));
});

router.post("/", async (req: AuthRequest, res) => {
  const { category, title, content, importance, tags } = req.body;
  if (!category || !title || !content) { res.status(400).json({ error: "category, title, content required" }); return; }
  const [mem] = await db.insert(memories).values({
    userId: req.userId!, category, title, content,
    importance: importance ?? 0.5, tags: tags ?? [],
  }).returning();
  res.status(201).json({ ...mem, tags: mem.tags ?? [], accessCount: mem.accessCount ?? 0 });
});

router.delete("/:id", async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  await db.delete(memories).where(and(eq(memories.id, id), eq(memories.userId, req.userId!)));
  res.status(204).end();
});

export default router;
