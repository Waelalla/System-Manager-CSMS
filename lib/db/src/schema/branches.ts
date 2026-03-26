import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const branchesTable = pgTable("branches", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  governorate: text("governorate").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertBranchSchema = createInsertSchema(branchesTable).omit({ id: true, created_at: true });
export type InsertBranch = z.infer<typeof insertBranchSchema>;
export type Branch = typeof branchesTable.$inferSelect;
