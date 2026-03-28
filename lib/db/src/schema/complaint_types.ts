import { pgTable, serial, text, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const complaintTypesTable = pgTable("complaint_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"),
  is_active: boolean("is_active").notNull().default(true),
  fields: jsonb("fields").notNull().default([]),
  success_message: text("success_message"),
});

export const insertComplaintTypeSchema = createInsertSchema(complaintTypesTable).omit({ id: true });
export type InsertComplaintType = z.infer<typeof insertComplaintTypeSchema>;
export type ComplaintType = typeof complaintTypesTable.$inferSelect;
