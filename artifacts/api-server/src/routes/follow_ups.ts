import { Router } from "express";
import { db } from "@workspace/db";
import { followUpsTable, invoicesTable, customersTable, usersTable, branchesTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth.js";
import { parsePagination, buildPaginated } from "../lib/pagination.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const offset = (page - 1) * limit;
    const { status } = req.query as Record<string, string>;

    const whereClause = status ? eq(followUpsTable.status, status) : undefined;
    const [totalResult] = await db.select({ count: count() }).from(followUpsTable).where(whereClause);

    const followUps = await db
      .select({
        id: followUpsTable.id,
        invoice_id: followUpsTable.invoice_id,
        invoice_number: invoicesTable.invoice_number,
        customer_name: customersTable.name,
        branch_name: branchesTable.name,
        assigned_user_id: followUpsTable.assigned_user_id,
        assigned_user_name: usersTable.name,
        notes: followUpsTable.notes,
        status: followUpsTable.status,
        created_at: followUpsTable.created_at,
      })
      .from(followUpsTable)
      .leftJoin(invoicesTable, eq(followUpsTable.invoice_id, invoicesTable.id))
      .leftJoin(customersTable, eq(invoicesTable.customer_id, customersTable.id))
      .leftJoin(branchesTable, eq(customersTable.branch_id, branchesTable.id))
      .leftJoin(usersTable, eq(followUpsTable.assigned_user_id, usersTable.id))
      .where(whereClause)
      .limit(limit)
      .offset(offset);

    res.json(buildPaginated(followUps, totalResult.count, { page, limit }));
  } catch (err) {
    req.log.error({ err }, "List follow-ups error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { invoice_ids, notes, assigned_user_id } = req.body;
    if (!invoice_ids || !Array.isArray(invoice_ids) || !assigned_user_id) {
      res.status(400).json({ error: "invoice_ids (array) and assigned_user_id are required" });
      return;
    }

    const created = [];
    for (const invoice_id of invoice_ids) {
      const [fu] = await db.insert(followUpsTable).values({
        invoice_id,
        assigned_user_id,
        notes: notes ?? null,
        status: "completed",
      }).returning();
      created.push(fu);
    }

    res.status(201).json({ data: created, count: created.length });
  } catch (err) {
    req.log.error({ err }, "Create follow-up error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
