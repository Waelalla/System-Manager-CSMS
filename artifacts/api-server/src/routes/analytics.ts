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
import { rolesTable } from "@workspace/db";
import { requireAuth, requireRole } from "../lib/auth.js";

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
      complaints_resolved: statusMap["محلول"] ?? 0,
      complaints_escalated: escalatedCount,
      complaints_escalated_admin: statusMap["تصعيد إداري"] ?? 0,
      avg_rating: parseFloat((avgFeedback.avg as unknown as string) ?? "0") || 0,
      invoices_untracked: Math.max(0, allInvCount.count - trackedCount),
      trend: monthlyTrend,
    });
  } catch (err) {
    req.log.error({ err }, "Analytics dashboard error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/complaints", requireAuth, requireRole("Manager", "Manager/Voter"), async (req, res) => {
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

router.get("/customers", requireAuth, requireRole("Manager", "Manager/Voter"), async (req, res) => {
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

router.get("/invoices", requireAuth, requireRole("Manager", "Manager/Voter"), async (req, res) => {
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

router.get("/branches", requireAuth, requireRole("Manager", "Manager/Voter"), async (req, res) => {
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

router.get(
  "/employees",
  requireAuth,
  requireRole("Manager", "Manager/Voter", "Maintenance Engineer"),
  async (req, res) => {
    try {
      const { range } = req.query as { range?: string };

      let dateCondition: ReturnType<typeof gte> | undefined;
      if (range === "this_month") {
        dateCondition = gte(complaintsTable.created_at, sql`date_trunc('month', now())`);
      } else if (range === "last_month") {
        dateCondition = gte(
          complaintsTable.created_at,
          sql`date_trunc('month', now()) - interval '1 month'`
        );
      }

      const allUsers = await db
        .select({
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
          role_name: rolesTable.name,
        })
        .from(usersTable)
        .leftJoin(rolesTable, eq(usersTable.role_id, rolesTable.id))
        .orderBy(usersTable.name);

      const complaintsCreated = await db
        .select({
          user_id: complaintsTable.created_by,
          count: count(),
        })
        .from(complaintsTable)
        .where(
          dateCondition
            ? and(sql`${complaintsTable.created_by} is not null`, dateCondition)
            : sql`${complaintsTable.created_by} is not null`
        )
        .groupBy(complaintsTable.created_by);

      const complaintsResolved = await db
        .select({
          user_id: complaintsTable.resolved_by,
          count: count(),
        })
        .from(complaintsTable)
        .where(
          dateCondition
            ? and(sql`${complaintsTable.resolved_by} is not null`, dateCondition)
            : sql`${complaintsTable.resolved_by} is not null`
        )
        .groupBy(complaintsTable.resolved_by);

      const complaintsAssigned = await db
        .select({
          user_id: complaintsTable.assigned_to_id,
          count: count(),
        })
        .from(complaintsTable)
        .where(sql`${complaintsTable.assigned_to_id} is not null`)
        .groupBy(complaintsTable.assigned_to_id);

      const followUpsDone = await db
        .select({
          user_id: followUpsTable.assigned_user_id,
          count: count(),
          avg_rating: avg(followUpsTable.rating),
        })
        .from(followUpsTable)
        .groupBy(followUpsTable.assigned_user_id);

      const createdMap = new Map(complaintsCreated.map((r) => [r.user_id, r.count]));
      const resolvedMap = new Map(complaintsResolved.map((r) => [r.user_id, r.count]));
      const assignedMap = new Map(complaintsAssigned.map((r) => [r.user_id, r.count]));
      const followUpMap = new Map(
        followUpsDone.map((r) => [r.user_id, { count: r.count, avg_rating: r.avg_rating }])
      );

      const allResolved = complaintsResolved.reduce((sum, r) => sum + r.count, 0);
      const allFollowUps = followUpsDone.reduce((sum, r) => sum + r.count, 0);
      const maxScore = Math.max(allResolved * 2 + allFollowUps * 1, 1);

      const employees = allUsers.map((user) => {
        const complaints_created = createdMap.get(user.id) ?? 0;
        const complaints_resolved = resolvedMap.get(user.id) ?? 0;
        const complaints_assigned = assignedMap.get(user.id) ?? 0;
        const follow_ups_done = followUpMap.get(user.id)?.count ?? 0;
        const avg_rating_raw = followUpMap.get(user.id)?.avg_rating;
        const avg_customer_rating =
          avg_rating_raw != null
            ? Math.round(parseFloat(avg_rating_raw as unknown as string) * 10) / 10
            : null;

        const rawScore = complaints_resolved * 2 + follow_ups_done * 1;
        const performance_score = Math.min(100, Math.round((rawScore / maxScore) * 100));

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role_name: user.role_name ?? "",
          complaints_created,
          complaints_resolved,
          complaints_assigned,
          follow_ups_done,
          avg_customer_rating,
          performance_score,
        };
      });

      employees.sort((a, b) => b.performance_score - a.performance_score);

      res.json({ employees });
    } catch (err) {
      req.log.error({ err }, "Analytics employees error");
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;
