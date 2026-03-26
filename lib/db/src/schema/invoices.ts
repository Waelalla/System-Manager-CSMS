import { pgTable, serial, text, integer, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";
import { productsTable } from "./products";

export const invoicesTable = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoice_number: text("invoice_number").notNull(),
  invoice_date: timestamp("invoice_date").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull(),
  product_id: integer("product_id").references(() => productsTable.id),
  customer_id: integer("customer_id").notNull().references(() => customersTable.id),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({ id: true, created_at: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoicesTable.$inferSelect;
