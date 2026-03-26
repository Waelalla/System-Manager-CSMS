import { pgTable, serial, integer, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const importLogsTable = pgTable("import_logs", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => usersTable.id),
  file_name: text("file_name").notNull(),
  total_rows: integer("total_rows").notNull().default(0),
  added_customers: integer("added_customers").notNull().default(0),
  updated_customers: integer("updated_customers").notNull().default(0),
  added_invoices: integer("added_invoices").notNull().default(0),
  duplicate_invoices: integer("duplicate_invoices").notNull().default(0),
  errors: jsonb("errors"),
  warnings: jsonb("warnings"),
  imported_at: timestamp("imported_at").defaultNow().notNull(),
});

export const insertImportLogSchema = createInsertSchema(importLogsTable).omit({ id: true, imported_at: true });
export type InsertImportLog = z.infer<typeof insertImportLogSchema>;
export type ImportLog = typeof importLogsTable.$inferSelect;
