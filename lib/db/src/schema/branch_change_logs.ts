import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";
import { branchesTable } from "./branches";

export const branchChangeLogsTable = pgTable("branch_change_logs", {
  id: serial("id").primaryKey(),
  customer_id: integer("customer_id").notNull().references(() => customersTable.id),
  old_branch_id: integer("old_branch_id").notNull().references(() => branchesTable.id),
  new_branch_id: integer("new_branch_id").notNull().references(() => branchesTable.id),
  changed_at: timestamp("changed_at").defaultNow().notNull(),
  notes: text("notes"),
});

export const insertBranchChangeLogSchema = createInsertSchema(branchChangeLogsTable).omit({ id: true, changed_at: true });
export type InsertBranchChangeLog = z.infer<typeof insertBranchChangeLogSchema>;
export type BranchChangeLog = typeof branchChangeLogsTable.$inferSelect;
