import { Router } from "express";
import { db } from "@workspace/db";
import { invoicesTable, customersTable, productsTable, branchesTable, followUpsTable } from "@workspace/db";
import { eq, count, and, sql, SQL } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { parsePagination, buildPaginated } from "../lib/pagination.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const offset = (page - 1) * limit;
    const { customer_id, status, untracked_today } = req.query as Record<string, string>;

    const conditions: SQL[] = [];
    if (customer_id) conditions.push(eq(invoicesTable.customer_id, parseInt(customer_id)));
    if (status) conditions.push(eq(invoicesTable.status, status));

    if (untracked_today === "true") {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      conditions.push(sql`${invoicesTable.id} NOT IN (SELECT invoice_id FROM follow_ups)`);
      conditions.push(sql`${invoicesTable.created_at} >= ${todayStart.toISOString()}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db.select({ count: count() }).from(invoicesTable).where(whereClause);

    const invoices = await db
      .select({
        id: invoicesTable.id,
        invoice_number: invoicesTable.invoice_number,
        invoice_date: invoicesTable.invoice_date,
        amount: invoicesTable.amount,
        status: invoicesTable.status,
        product_id: invoicesTable.product_id,
        product_name: productsTable.name,
        customer_id: invoicesTable.customer_id,
        customer_name: customersTable.name,
        branch_name: branchesTable.name,
        created_at: invoicesTable.created_at,
      })
      .from(invoicesTable)
      .leftJoin(customersTable, eq(invoicesTable.customer_id, customersTable.id))
      .leftJoin(branchesTable, eq(customersTable.branch_id, branchesTable.id))
      .leftJoin(productsTable, eq(invoicesTable.product_id, productsTable.id))
      .where(whereClause)
      .limit(limit)
      .offset(offset);

    const invoiceIds = invoices.map(i => i.id);
    const trackedSet = new Set<number>();
    if (invoiceIds.length > 0) {
      const tracked = await db
        .select({ invoice_id: followUpsTable.invoice_id })
        .from(followUpsTable)
        .where(sql`${followUpsTable.invoice_id} = ANY(${sql.raw(`ARRAY[${invoiceIds.join(",")}]::int[]`)})`);
      for (const t of tracked) trackedSet.add(t.invoice_id);
    }

    const enriched = invoices.map(i => ({ ...i, has_follow_up: trackedSet.has(i.id) }));
    res.json(buildPaginated(enriched, totalResult.count, { page, limit }));
  } catch (err) {
    req.log.error({ err }, "List invoices error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const { invoice_number, invoice_date, amount, status, product_id, customer_id } = req.body;
    if (!invoice_number || !invoice_date || !amount || !status || !customer_id) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }
    const [invoice] = await db.insert(invoicesTable).values({
      invoice_number,
      invoice_date: new Date(invoice_date),
      amount,
      status,
      product_id: product_id ?? null,
      customer_id,
    }).returning();
    res.status(201).json(invoice);
  } catch (err) {
    req.log.error({ err }, "Create invoice error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [invoice] = await db
      .select({
        id: invoicesTable.id,
        invoice_number: invoicesTable.invoice_number,
        invoice_date: invoicesTable.invoice_date,
        amount: invoicesTable.amount,
        status: invoicesTable.status,
        product_id: invoicesTable.product_id,
        product_name: productsTable.name,
        customer_id: invoicesTable.customer_id,
        customer_name: customersTable.name,
        branch_name: branchesTable.name,
        created_at: invoicesTable.created_at,
      })
      .from(invoicesTable)
      .leftJoin(customersTable, eq(invoicesTable.customer_id, customersTable.id))
      .leftJoin(branchesTable, eq(customersTable.branch_id, branchesTable.id))
      .leftJoin(productsTable, eq(invoicesTable.product_id, productsTable.id))
      .where(eq(invoicesTable.id, id))
      .limit(1);
    if (!invoice) { res.status(404).json({ error: "Not Found" }); return; }
    res.json(invoice);
  } catch (err) {
    req.log.error({ err }, "Get invoice error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { invoice_number, invoice_date, amount, status, product_id } = req.body;
    const updates: Record<string, unknown> = {};
    if (invoice_number) updates.invoice_number = invoice_number;
    if (invoice_date) updates.invoice_date = new Date(invoice_date);
    if (amount) updates.amount = amount;
    if (status) updates.status = status;
    if (product_id !== undefined) updates.product_id = product_id;
    await db.update(invoicesTable).set(updates).where(eq(invoicesTable.id, id));
    const [invoice] = await db.select({ id: invoicesTable.id, invoice_number: invoicesTable.invoice_number, amount: invoicesTable.amount, status: invoicesTable.status }).from(invoicesTable).where(eq(invoicesTable.id, id)).limit(1);
    if (!invoice) { res.status(404).json({ error: "Not Found" }); return; }
    res.json(invoice);
  } catch (err) {
    req.log.error({ err }, "Update invoice error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(invoicesTable).where(eq(invoicesTable.id, id));
    res.json({ success: true, message: "Invoice deleted" });
  } catch (err) {
    req.log.error({ err }, "Delete invoice error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
