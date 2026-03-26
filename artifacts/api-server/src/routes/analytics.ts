import { Router } from "express";
import { db } from "@workspace/db";
import {
  complaintsTable,
  customersTable,
  invoicesTable,
  complaintTypesTable,
  usersTable,
  feedbackTable,
  branchesTable,
  followUpsTable,
  branchChangeLogsTable,
} from "@workspace/db";
import { eq, count, sql, avg, and, gte, lte } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router = Router();

router.get("/dashboard", requireAuth, async (req, res) => {
  try {
    const byStatus = await db
      .select({ status: complaintsTable.status, count: count() })
      .from(complaintsTable)
      .groupBy(complaintsTable.status);

    const statusMap = Object.fromEntries(byStatus.map((s) => [s.status, s.count]));

    const [avgFeedback] = await db
      .select({ avg: avg(feedbackTable.rating) })
      .from(feedbackTable);

    const [allInvCount] = await db.select({ count: count() }).from(invoicesTable);
    const trackedResult = await db
      .select({ invoice_id: followUpsTable.invoice_id })
      .from(followUpsTable);
    const trackedCount = new Set(trackedResult.map((r) => r.invoice_id)).size;

    const escalatedCount =
      (statusMap["مصعدة"] ?? 0) + (statusMap["تصعيد إداري"] ?? 0);

    const monthlyTrend = await db
      .select({
        name: sql<string>`to_char(${complaintsTable.created_at}, 'Mon')`,
        value: count(),
      })
      .from(complaintsTable)
      .where(sql`${complaintsTable.created_at} >= now() - interval '12 months'`)
      .groupBy(
        sql`to_char(${complaintsTable.created_at}, 'Mon'), date_trunc('month', ${complaintsTable.created_at})`
      )
      .orderBy(sql`date_trunc('month', ${complaintsTable.created_at})`);

    res.json({
      complaints_new: statusMap["جديدة"] ?? 0,
      complaints_received: statusMap["مستلمة"] ?? 0,
      complaints_closed: statusMap["مغلق"] ?? 0,
      complaints_escalated: escalatedCount,
      avg_rating: parseFloat((avgFeedback.avg as unknown as string) ?? "0") || 0,
      invoices_untracked: Math.max(0, allInvCount.count - trackedCount),
      trend: monthlyTrend,
    });
  } catch (err) {
    req.log.error({ err }, "Analytics dashboard error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/complaints", requireAuth, async (req, res) => {
  try {
    const { date_from, date_to, branch_id } = req.query as Record<string, string>;
    const conditions = [];
    if (date_from) conditions.push(gte(complaintsTable.created_at, new Date(date_from)));
    if (date_to) conditions.push(lte(complaintsTable.created_at, new Date(date_to)));

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const by_type = await db
      .select({ type_name: complaintTypesTable.name, count: count() })
      .from(complaintsTable)
      .leftJoin(complaintTypesTable, eq(complaintsTable.type_id, complaintTypesTable.id))
      .where(whereClause)
      .groupBy(complaintTypesTable.name);

    const by_priority = await db
      .select({ priority: complaintsTable.priority, count: count() })
      .from(complaintsTable)
      .where(whereClause)
      .groupBy(complaintsTable.priority);

    const avg_resolution_by_type = await db
      .select({
        type_name: complaintTypesTable.name,
        complaint_count: count(),
      })
      .from(complaintsTable)
      .leftJoin(complaintTypesTable, eq(complaintsTable.type_id, complaintTypesTable.id))
      .where(whereClause)
      .groupBy(complaintTypesTable.name);

    const top_products = await db
      .select({ product_id: complaintsTable.product_id, count: count() })
      .from(complaintsTable)
      .where(whereClause)
      .groupBy(complaintsTable.product_id)
      .orderBy(sql`count(*) desc`)
      .limit(10);

    res.json({ by_type, by_priority, avg_resolution_by_type, top_products });
  } catch (err) {
    req.log.error({ err }, "Analytics complaints error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/customers", requireAuth, async (req, res) => {
  try {
    const top_by_purchase = await db
      .select({ customer_id: invoicesTable.customer_id, count: count() })
      .from(invoicesTable)
      .groupBy(invoicesTable.customer_id)
      .orderBy(sql`count(*) desc`)
      .limit(10);

    const by_complaints = await db
      .select({ customer_id: complaintsTable.customer_id, count: count() })
      .from(complaintsTable)
      .groupBy(complaintsTable.customer_id)
      .orderBy(sql`count(*) desc`)
      .limit(10);

    const branch_changes = await db
      .select({ customer_id: branchChangeLogsTable.customer_id, count: count() })
      .from(branchChangeLogsTable)
      .groupBy(branchChangeLogsTable.customer_id)
      .orderBy(sql`count(*) desc`)
      .limit(10);

    res.json({ top_by_purchase, by_complaints, branch_changes });
  } catch (err) {
    req.log.error({ err }, "Analytics customers error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/invoices", requireAuth, async (req, res) => {
  try {
    const [totalResult] = await db.select({ count: count() }).from(invoicesTable);
    const trackedResult = await db
      .select({ invoice_id: followUpsTable.invoice_id })
      .from(followUpsTable);
    const trackedCount = new Set(trackedResult.map((r) => r.invoice_id)).size;
    const untracked_count = Math.max(0, totalResult.count - trackedCount);

    const avgFollowup = await db
      .select({
        avg_days: sql<number>`avg(extract(epoch from (${followUpsTable.created_at} - ${invoicesTable.created_at})) / 86400)`,
      })
      .from(followUpsTable)
      .leftJoin(invoicesTable, eq(followUpsTable.invoice_id, invoicesTable.id));

    const low_rated = await db
      .select({ complaint_id: feedbackTable.complaint_id, rating: feedbackTable.rating })
      .from(feedbackTable)
      .where(sql`${feedbackTable.rating} <= 2`)
      .orderBy(feedbackTable.rating)
      .limit(20);

    res.json({
      untracked_count,
      avg_followup_days: avgFollowup[0]?.avg_days ?? 0,
      low_rated,
    });
  } catch (err) {
    req.log.error({ err }, "Analytics invoices error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/branches", requireAuth, async (req, res) => {
  try {
    const branches = await db
      .select({
        branch_id: branchesTable.id,
        branch_name: branchesTable.name,
        complaints_count: count(complaintsTable.id),
      })
      .from(branchesTable)
      .leftJoin(customersTable, eq(customersTable.branch_id, branchesTable.id))
      .leftJoin(complaintsTable, eq(complaintsTable.customer_id, customersTable.id))
      .groupBy(branchesTable.id, branchesTable.name)
      .orderBy(sql`count(${complaintsTable.id}) desc`);

    res.json({ branches });
  } catch (err) {
    req.log.error({ err }, "Analytics branches error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
