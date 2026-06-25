import { pgTable, serial, text, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const memories = pgTable("memories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  category: text("category").notNull().default("CONVERSATION"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  importance: real("importance").notNull().default(0.5),
  tags: text("tags").array().notNull().default([]),
  accessCount: integer("access_count").notNull().default(0),
  lastAccess: timestamp("last_access", { withTimezone: true }),
  sourceRef: text("source_ref"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertMemorySchema = createInsertSchema(memories).omit({ id: true, createdAt: true, updatedAt: true, accessCount: true, lastAccess: true });
export type Memory = typeof memories.$inferSelect;
export type InsertMemory = z.infer<typeof insertMemorySchema>;
