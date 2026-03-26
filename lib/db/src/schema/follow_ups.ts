import { pgTable, serial, integer, jsonb, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { invoicesTable } from "./invoices";
import { usersTable } from "./users";

export const followUpsTable = pgTable("follow_ups", {
  id: serial("id").primaryKey(),
  invoice_id: integer("invoice_id").notNull().references(() => invoicesTable.id),
  assigned_user_id: integer("assigned_user_id").notNull().references(() => usersTable.id),
  notes: jsonb("notes"),
  status: text("status").notNull().default("pending"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertFollowUpSchema = createInsertSchema(followUpsTable).omit({ id: true, created_at: true });
export type InsertFollowUp = z.infer<typeof insertFollowUpSchema>;
export type FollowUp = typeof followUpsTable.$inferSelect;
