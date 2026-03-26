import { pgTable, serial, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";
import { productsTable } from "./products";
import { invoicesTable } from "./invoices";
import { complaintTypesTable } from "./complaint_types";
import { usersTable } from "./users";

export const complaintsTable = pgTable("complaints", {
  id: serial("id").primaryKey(),
  customer_id: integer("customer_id").notNull().references(() => customersTable.id),
  product_id: integer("product_id").references(() => productsTable.id),
  invoice_id: integer("invoice_id").references(() => invoicesTable.id),
  type_id: integer("type_id").notNull().references(() => complaintTypesTable.id),
  fields_values: jsonb("fields_values"),
  channel: text("channel").notNull(),
  priority: text("priority").notNull().default("عادية"),
  description: text("description").notNull(),
  images: jsonb("images"),
  status: text("status").notNull().default("جديدة"),
  assigned_to_id: integer("assigned_to_id").references(() => usersTable.id),
  escalated_to_id: integer("escalated_to_id").references(() => usersTable.id),
  resolved_at: timestamp("resolved_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertComplaintSchema = createInsertSchema(complaintsTable).omit({ id: true, created_at: true });
export type InsertComplaint = z.infer<typeof insertComplaintSchema>;
export type Complaint = typeof complaintsTable.$inferSelect;
