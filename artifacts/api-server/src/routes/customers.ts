import { Router } from "express";
import { db } from "@workspace/db";
import { customersTable, branchesTable, invoicesTable, branchChangeLogsTable } from "@workspace/db";
import { eq, count, ilike, and, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth.js";
import { parsePagination, buildPaginated } from "../lib/pagination.js";

const router = Router();

function generateCustomerCode(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = String(Math.floor(Math.random() * 9999) + 1).padStart(4, "0");
  return `CUST-${date}-${rand}`;
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const offset = (page - 1) * limit;
    const { search, branch_id, type, governorate } = req.query as Record<string, string>;

    const conditions: ReturnType<typeof eq>[] = [];
    if (branch_id) conditions.push(eq(customersTable.branch_id, parseInt(branch_id)));
    if (type) conditions.push(eq(customersTable.type, type));
    if (governorate) conditions.push(eq(customersTable.governorate, governorate));

    const whereClause = conditions.length > 0
      ? search
        ? and(...conditions, sql`(${customersTable.name} ilike ${'%' + search + '%'} OR ${customersTable.phone} ilike ${'%' + search + '%'})`)
        : and(...conditions)
      : search
        ? sql`(${customersTable.name} ilike ${'%' + search + '%'} OR ${customersTable.phone} ilike ${'%' + search + '%'})`
        : undefined;

    const [totalResult] = await db.select({ count: count() }).from(customersTable).where(whereClause);

    const customers = await db
      .select({
        id: customersTable.id,
        code: customersTable.code,
        name: customersTable.name,
        phone: customersTable.phone,
        type: customersTable.type,
        governorate: customersTable.governorate,
        branch_id: customersTable.branch_id,
        branch_name: branchesTable.name,
        address: customersTable.address,
      })
      .from(customersTable)
      .leftJoin(branchesTable, eq(customersTable.branch_id, branchesTable.id))
      .where(whereClause)
      .limit(limit)
      .offset(offset);

    const customerIds = customers.map(c => c.id);
    let invoiceCounts: Record<number, { invoice_count: number; last_invoice_date: string | null }> = {};

    if (customerIds.length > 0) {
      const invoiceStats = await db
        .select({
          customer_id: invoicesTable.customer_id,
          invoice_count: count(),
          last_invoice_date: sql<string>`max(${invoicesTable.invoice_date})`,
        })
        .from(invoicesTable)
        .where(sql`${invoicesTable.customer_id} = ANY(${sql.raw(`ARRAY[${customerIds.join(",")}]::int[]`)})`)
        .groupBy(invoicesTable.customer_id);

      for (const stat of invoiceStats) {
        invoiceCounts[stat.customer_id] = {
          invoice_count: stat.invoice_count,
          last_invoice_date: stat.last_invoice_date,
        };
      }
    }

    const enriched = customers.map(c => ({
      ...c,
      invoice_count: invoiceCounts[c.id]?.invoice_count ?? 0,
      last_invoice_date: invoiceCounts[c.id]?.last_invoice_date ?? null,
    }));

    res.json(buildPaginated(enriched, totalResult.count, { page, limit }));
  } catch (err) {
    req.log.error({ err }, "List customers error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const { code, name, phone, type, governorate, branch_id, address } = req.body;
    if (!name || !phone || !type || !governorate || !branch_id) {
      res.status(400).json({ error: "name, phone, type, governorate, branch_id are required" });
      return;
    }
    const customerCode = code || generateCustomerCode();
    const [customer] = await db.insert(customersTable).values({ code: customerCode, name, phone, type, governorate, branch_id, address }).returning();
    const [branch] = await db.select().from(branchesTable).where(eq(branchesTable.id, branch_id)).limit(1);
    res.status(201).json({ ...customer, branch_name: branch?.name ?? "" });
  } catch (err) {
    req.log.error({ err }, "Create customer error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [customer] = await db
      .select({ id: customersTable.id, code: customersTable.code, name: customersTable.name, phone: customersTable.phone, type: customersTable.type, governorate: customersTable.governorate, branch_id: customersTable.branch_id, branch_name: branchesTable.name, address: customersTable.address })
      .from(customersTable)
      .leftJoin(branchesTable, eq(customersTable.branch_id, branchesTable.id))
      .where(eq(customersTable.id, id))
      .limit(1);
    if (!customer) { res.status(404).json({ error: "Not Found" }); return; }
    res.json(customer);
  } catch (err) {
    req.log.error({ err }, "Get customer error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, phone, type, governorate, branch_id, address } = req.body;

    const [existing] = await db.select().from(customersTable).where(eq(customersTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Not Found" }); return; }

    const updates: Record<string, unknown> = {};
    if (name) updates.name = name;
    if (phone) updates.phone = phone;
    if (type) updates.type = type;
    if (governorate) updates.governorate = governorate;
    if (address !== undefined) updates.address = address;
    if (branch_id && branch_id !== existing.branch_id) {
      updates.branch_id = branch_id;
      await db.insert(branchChangeLogsTable).values({
        customer_id: id,
        old_branch_id: existing.branch_id,
        new_branch_id: branch_id,
        notes: "Updated via customer edit",
      });
    }

    await db.update(customersTable).set(updates).where(eq(customersTable.id, id));
    const [customer] = await db.select({ id: customersTable.id, code: customersTable.code, name: customersTable.name, phone: customersTable.phone, type: customersTable.type, governorate: customersTable.governorate, branch_id: customersTable.branch_id, branch_name: branchesTable.name, address: customersTable.address }).from(customersTable).leftJoin(branchesTable, eq(customersTable.branch_id, branchesTable.id)).where(eq(customersTable.id, id)).limit(1);
    res.json(customer);
  } catch (err) {
    req.log.error({ err }, "Update customer error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(customersTable).where(eq(customersTable.id, id));
    res.json({ success: true, message: "Customer deleted" });
  } catch (err) {
    req.log.error({ err }, "Delete customer error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
