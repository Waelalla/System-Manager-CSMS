import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { complaintsTable } from "./complaints";

export const feedbackTable = pgTable("feedback", {
  id: serial("id").primaryKey(),
  complaint_id: integer("complaint_id").notNull().references(() => complaintsTable.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertFeedbackSchema = createInsertSchema(feedbackTable).omit({ id: true, created_at: true });
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedbackTable.$inferSelect;
