import { pgTable, serial, text, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const complaintTypesTable = pgTable("complaint_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  fields: jsonb("fields").notNull().default([]),
});

export const insertComplaintTypeSchema = createInsertSchema(complaintTypesTable).omit({ id: true });
export type InsertComplaintType = z.infer<typeof insertComplaintTypeSchema>;
export type ComplaintType = typeof complaintTypesTable.$inferSelect;
