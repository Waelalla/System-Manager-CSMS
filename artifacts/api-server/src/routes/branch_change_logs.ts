import { Router } from "express";
import { db } from "@workspace/db";
import { branchChangeLogsTable, customersTable, branchesTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { parsePagination, buildPaginated } from "../lib/pagination.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const offset = (page - 1) * limit;
    const whereClause = undefined;

    const [totalResult] = await db.select({ count: count() }).from(branchChangeLogsTable).where(whereClause);
    const logs = await db
      .select({
        id: branchChangeLogsTable.id,
        customer_id: branchChangeLogsTable.customer_id,
        customer_name: customersTable.name,
        customer_phone: customersTable.phone,
        old_branch_id: branchChangeLogsTable.old_branch_id,
        new_branch_id: branchChangeLogsTable.new_branch_id,
        notes: branchChangeLogsTable.notes,
        changed_at: branchChangeLogsTable.changed_at,
      })
      .from(branchChangeLogsTable)
      .leftJoin(customersTable, eq(branchChangeLogsTable.customer_id, customersTable.id))
      .limit(limit)
      .offset(offset)
      .orderBy(branchChangeLogsTable.changed_at);

    res.json(buildPaginated(logs, totalResult.count, { page, limit }));
  } catch (err) {
    req.log.error({ err }, "List branch change logs error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
