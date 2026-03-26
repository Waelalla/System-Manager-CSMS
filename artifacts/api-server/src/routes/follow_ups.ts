import { Router } from "express";
import { db } from "@workspace/db";
import { followUpsTable, invoicesTable, customersTable, usersTable, branchesTable, complaintsTable, complaintTypesTable } from "@workspace/db";
import { eq, count, asc } from "drizzle-orm";
import { requireAuth, requireRole, type AuthRequest } from "../lib/auth.js";
import { validateBody } from "../lib/validate.js";
import { CreateFollowUpBody } from "@workspace/api-zod";
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

router.post("/", requireAuth, requireRole("Accountant", "Customer Service Agent", "Manager/Voter", "Manager"), validateBody(CreateFollowUpBody), async (req: AuthRequest, res) => {
  try {
    const { invoice_ids, notes, assigned_user_id } = req.body;
    if (!invoice_ids || !Array.isArray(invoice_ids) || !assigned_user_id) {
      res.status(400).json({ error: "invoice_ids (array) and assigned_user_id are required" });
      return;
    }

    const created = [];
    const autoComplaints = [];

    for (const invoice_id of invoice_ids) {
      const [fu] = await db.insert(followUpsTable).values({
        invoice_id,
        assigned_user_id,
        notes: notes ?? null,
        status: "completed",
      }).returning();
      created.push(fu);

      const rating = typeof notes === "object" && notes !== null && "rating" in notes
        ? Number((notes as { rating?: unknown }).rating)
        : null;

      if (rating !== null && rating <= 2) {
        const [invoice] = await db
          .select({ customer_id: invoicesTable.customer_id, invoice_number: invoicesTable.invoice_number })
          .from(invoicesTable)
          .where(eq(invoicesTable.id, invoice_id));

        if (invoice) {
          const [defaultType] = await db
            .select({ id: complaintTypesTable.id })
            .from(complaintTypesTable)
            .orderBy(asc(complaintTypesTable.id))
            .limit(1);

          const comment = typeof notes === "object" && notes !== null && "comment" in notes
            ? String((notes as { comment?: unknown }).comment || "")
            : "";

          const [complaint] = await db.insert(complaintsTable).values({
            customer_id: invoice.customer_id,
            invoice_id,
            type_id: defaultType?.id ?? 1,
            description: `تقييم منخفض (${rating}/5) على الفاتورة ${invoice.invoice_number}. ملاحظة: ${comment || "لا توجد ملاحظات"}`,
            channel: "داخلي",
            priority: "عالية",
            status: "جديدة",
          }).returning();
          autoComplaints.push(complaint);
        }
      }
    }

    res.status(201).json({ data: created, count: created.length, auto_complaints: autoComplaints.length });
  } catch (err) {
    req.log.error({ err }, "Create follow-up error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
