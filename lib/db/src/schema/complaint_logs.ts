import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { complaintsTable } from "./complaints";
import { usersTable } from "./users";

export const complaintLogsTable = pgTable("complaint_logs", {
  id: serial("id").primaryKey(),
  complaint_id: integer("complaint_id").notNull().references(() => complaintsTable.id),
  action: text("action").notNull(),
  user_id: integer("user_id").notNull().references(() => usersTable.id),
  note: text("note"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertComplaintLogSchema = createInsertSchema(complaintLogsTable).omit({ id: true, timestamp: true });
export type InsertComplaintLog = z.infer<typeof insertComplaintLogSchema>;
export type ComplaintLog = typeof complaintLogsTable.$inferSelect;
