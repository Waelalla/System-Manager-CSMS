import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db";
import { eq, count, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth.js";
import { parsePagination, buildPaginated } from "../lib/pagination.js";

const router = Router();

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const offset = (page - 1) * limit;
    const { unread_only } = req.query as Record<string, string>;

    const userId = req.user!.userId;
    const conditions = [eq(notificationsTable.user_id, userId)];
    if (unread_only === "true") conditions.push(eq(notificationsTable.is_read, false));

    const whereClause = and(...conditions);
    const [totalResult] = await db.select({ count: count() }).from(notificationsTable).where(whereClause);
    const notifications = await db
      .select()
      .from(notificationsTable)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(notificationsTable.created_at);

    const unreadCount = await db.select({ count: count() }).from(notificationsTable).where(and(eq(notificationsTable.user_id, userId), eq(notificationsTable.is_read, false)));

    res.json({ ...buildPaginated(notifications, totalResult.count, { page, limit }), unread_count: unreadCount[0].count });
  } catch (err) {
    req.log.error({ err }, "List notifications error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/:id/read", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.update(notificationsTable).set({ is_read: true }).where(and(eq(notificationsTable.id, id), eq(notificationsTable.user_id, req.user!.userId)));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Mark notification read error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/read-all", requireAuth, async (req: AuthRequest, res) => {
  try {
    await db.update(notificationsTable).set({ is_read: true }).where(eq(notificationsTable.user_id, req.user!.userId));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Mark all read error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
