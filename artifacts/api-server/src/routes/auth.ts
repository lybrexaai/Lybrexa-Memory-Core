import { Router } from "express";
import { db } from "@workspace/db";
import { users } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword, createToken, requireAuth, AuthRequest } from "../lib/auth";

const router = Router();

router.post("/register", async (req, res) => {
  const { email, password, displayName } = req.body;
  if (!email || !password || !displayName) {
    res.status(400).json({ error: "email, password, and displayName are required" });
    return;
  }
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }
  const passwordHash = hashPassword(password);
  const [user] = await db.insert(users).values({ email, displayName, passwordHash }).returning();
  const token = createToken(user.id);
  res.status(201).json({
    token,
    user: { id: user.id, email: user.email, displayName: user.displayName, createdAt: user.createdAt },
  });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const token = createToken(user.id);
  res.json({
    token,
    user: { id: user.id, email: user.email, displayName: user.displayName, createdAt: user.createdAt },
  });
});

router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  const [user] = await db.select().from(users).where(eq(users.id, req.userId!)).limit(1);
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ id: user.id, email: user.email, displayName: user.displayName, createdAt: user.createdAt });
});

export default router;
