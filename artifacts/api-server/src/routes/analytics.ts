import { Router } from "express";
import { db } from "@workspace/db";
import { complaintsTable, customersTable, invoicesTable, complaintTypesTable, usersTable, feedbackTable, branchesTable, followUpsTable } from "@workspace/db";
import { eq, count, sql, avg } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router = Router();

router.get("/dashboard", requireAuth, async (req, res) => {
  try {
    const byStatus = await db
      .select({ status: complaintsTable.status, count: count() })
      .from(complaintsTable)
      .groupBy(complaintsTable.status);

    const statusMap = Object.fromEntries(byStatus.map(s => [s.status, s.count]));

    const [totalCustomers] = await db.select({ count: count() }).from(customersTable);
    const [totalInvoices] = await db.select({ count: count() }).from(invoicesTable);
    const [avgFeedback] = await db.select({ avg: avg(feedbackTable.rating) }).from(feedbackTable);

    const trackedInvoicesResult = await db
      .select({ invoice_id: followUpsTable.invoice_id })
      .from(followUpsTable);
    const trackedIds = new Set(trackedInvoicesResult.map(r => r.invoice_id));
    const [allInvCount] = await db.select({ count: count() }).from(invoicesTable);
    const invoices_untracked = allInvCount.count - trackedIds.size;

    const monthlyTrend = await db
      .select({
        name: sql<string>`to_char(${complaintsTable.created_at}, 'Mon')`,
        value: count(),
      })
      .from(complaintsTable)
      .where(sql`${complaintsTable.created_at} >= now() - interval '12 months'`)
      .groupBy(sql`to_char(${complaintsTable.created_at}, 'Mon'), date_trunc('month', ${complaintsTable.created_at})`)
      .orderBy(sql`date_trunc('month', ${complaintsTable.created_at})`);

    const byPriority = await db
      .select({ priority: complaintsTable.priority, count: count() })
      .from(complaintsTable)
      .groupBy(complaintsTable.priority);

    const byType = await db
      .select({ type_name: complaintTypesTable.name, count: count() })
      .from(complaintsTable)
      .leftJoin(complaintTypesTable, eq(complaintsTable.type_id, complaintTypesTable.id))
      .groupBy(complaintTypesTable.name);

    const byBranch = await db
      .select({ branch_name: branchesTable.name, count: count() })
      .from(complaintsTable)
      .leftJoin(customersTable, eq(complaintsTable.customer_id, customersTable.id))
      .leftJoin(branchesTable, eq(customersTable.branch_id, branchesTable.id))
      .groupBy(branchesTable.name);

    const byAgent = await db
      .select({ agent_name: usersTable.name, count: count() })
      .from(complaintsTable)
      .leftJoin(usersTable, eq(complaintsTable.assigned_to_id, usersTable.id))
      .groupBy(usersTable.name);

    res.json({
      complaints_new: statusMap["جديدة"] ?? 0,
      complaints_received: statusMap["مستلمة"] ?? 0,
      complaints_in_progress: statusMap["قيد الحل"] ?? 0,
      complaints_resolved: statusMap["محلول"] ?? 0,
      complaints_closed: statusMap["مغلق"] ?? 0,
      total_customers: totalCustomers.count,
      total_invoices: totalInvoices.count,
      invoices_untracked: Math.max(0, invoices_untracked),
      avg_feedback: parseFloat((avgFeedback.avg as unknown as string) ?? "0") || 0,
      trend: monthlyTrend,
      by_status: byStatus,
      by_priority: byPriority,
      by_type: byType,
      by_branch: byBranch,
      by_agent: byAgent,
    });
  } catch (err) {
    req.log.error({ err }, "Analytics dashboard error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
