import { pgTable, serial, text, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { branchesTable } from "./branches";

export const customersTable = pgTable("customers", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  type: text("type").notNull(),
  governorate: text("governorate").notNull(),
  branch_id: integer("branch_id").notNull().references(() => branchesTable.id),
  address: text("address"),
  extra: jsonb("extra"),
});

export const insertCustomerSchema = createInsertSchema(customersTable).omit({ id: true });
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customersTable.$inferSelect;
