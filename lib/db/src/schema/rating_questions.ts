import { pgTable, serial, text, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ratingQuestionsTable = pgTable("rating_questions", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  sort_order: integer("sort_order").notNull().default(0),
  is_active: boolean("is_active").notNull().default(true),
});

export const insertRatingQuestionSchema = createInsertSchema(ratingQuestionsTable).omit({ id: true });
export type InsertRatingQuestion = z.infer<typeof insertRatingQuestionSchema>;
export type RatingQuestion = typeof ratingQuestionsTable.$inferSelect;
