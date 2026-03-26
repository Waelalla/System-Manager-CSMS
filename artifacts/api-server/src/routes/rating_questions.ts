import { Router } from "express";
import { db } from "@workspace/db";
import { ratingQuestionsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const questions = await db
      .select()
      .from(ratingQuestionsTable)
      .orderBy(asc(ratingQuestionsTable.sort_order), asc(ratingQuestionsTable.id));
    res.json({ data: questions });
  } catch (err) {
    req.log.error({ err }, "List rating questions error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/", requireAuth, requireRole("Manager/Voter", "Manager"), async (req, res) => {
  try {
    const { text, sort_order } = req.body as { text?: string; sort_order?: number };
    if (!text?.trim()) {
      res.status(400).json({ error: "text is required" });
      return;
    }
    const [q] = await db
      .insert(ratingQuestionsTable)
      .values({ text: text.trim(), sort_order: sort_order ?? 0, is_active: true })
      .returning();
    res.status(201).json(q);
  } catch (err) {
    req.log.error({ err }, "Create rating question error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/:id", requireAuth, requireRole("Manager/Voter", "Manager"), async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const { text, sort_order, is_active } = req.body as { text?: string; sort_order?: number; is_active?: boolean };
    const updates: Record<string, unknown> = {};
    if (text !== undefined) updates.text = text.trim();
    if (sort_order !== undefined) updates.sort_order = sort_order;
    if (is_active !== undefined) updates.is_active = is_active;
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }
    await db.update(ratingQuestionsTable).set(updates).where(eq(ratingQuestionsTable.id, id));
    const [q] = await db.select().from(ratingQuestionsTable).where(eq(ratingQuestionsTable.id, id)).limit(1);
    if (!q) { res.status(404).json({ error: "Not Found" }); return; }
    res.json(q);
  } catch (err) {
    req.log.error({ err }, "Update rating question error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/:id", requireAuth, requireRole("Manager/Voter", "Manager"), async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    await db.delete(ratingQuestionsTable).where(eq(ratingQuestionsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Delete rating question error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
