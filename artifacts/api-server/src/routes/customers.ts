import { Router } from "express";
import { db } from "@workspace/db";
import { customersTable, branchesTable, invoicesTable, branchChangeLogsTable } from "@workspace/db";
import { eq, count, and, sql, gte } from "drizzle-orm";
import { requireAuth, requireRole, type AuthRequest } from "../lib/auth.js";
import { parsePagination, buildPaginated } from "../lib/pagination.js";
import { validateBody } from "../lib/validate.js";
import { CreateCustomerBody, UpdateCustomerBody } from "@workspace/api-zod";
import * as XLSX from "xlsx";

const router = Router();

function generateCustomerCode(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = String(Math.floor(Math.random() * 9999) + 1).padStart(4, "0");
  return `CUST-${date}-${rand}`;
}

async function fetchCustomersWithStats(filters: {
  search?: string;
  branch_id?: string;
  type?: string;
  governorate?: string;
  min_total_amount?: string;
  limit?: number;
  offset?: number;
  paginate?: boolean;
}) {
  const { search, branch_id, type, governorate, min_total_amount } = filters;

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

  const limit = filters.limit ?? 500;
  const offset = filters.offset ?? 0;

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
  const invoiceStats: Record<number, { invoice_count: number; last_invoice_date: string | null; total_amount: number }> = {};

  if (customerIds.length > 0) {
    const stats = await db
      .select({
        customer_id: invoicesTable.customer_id,
        invoice_count: count(),
        last_invoice_date: sql<string>`max(${invoicesTable.invoice_date})`,
        total_amount: sql<string>`coalesce(sum(${invoicesTable.amount}::numeric), 0)`,
      })
      .from(invoicesTable)
      .where(sql`${invoicesTable.customer_id} = ANY(${sql.raw(`ARRAY[${customerIds.join(",")}]::int[]`)})`)
      .groupBy(invoicesTable.customer_id);

    for (const stat of stats) {
      invoiceStats[stat.customer_id] = {
        invoice_count: stat.invoice_count,
        last_invoice_date: stat.last_invoice_date,
        total_amount: parseFloat(stat.total_amount ?? "0"),
      };
    }
  }

  let enriched = customers.map(c => ({
    ...c,
    invoice_count: invoiceStats[c.id]?.invoice_count ?? 0,
    last_invoice_date: invoiceStats[c.id]?.last_invoice_date ?? null,
    total_amount: invoiceStats[c.id]?.total_amount ?? 0,
  }));

  if (min_total_amount) {
    const minAmt = parseFloat(min_total_amount);
    if (!isNaN(minAmt)) {
      enriched = enriched.filter(c => c.total_amount >= minAmt);
    }
  }

  return enriched;
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const offset = (page - 1) * limit;
    const { search, branch_id, type, governorate, min_total_amount } = req.query as Record<string, string>;

    const enriched = await fetchCustomersWithStats({ search, branch_id, type, governorate, min_total_amount, limit, offset });

    let total = enriched.length;
    if (!min_total_amount) {
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
      total = totalResult.count;
    }

    res.json(buildPaginated(enriched, total, { page, limit }));
  } catch (err) {
    req.log.error({ err }, "List customers error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/export-excel", requireAuth, async (req, res) => {
  try {
    const { search, branch_id, type, governorate, min_total_amount } = req.query as Record<string, string>;

    const enriched = await fetchCustomersWithStats({ search, branch_id, type, governorate, min_total_amount, limit: 5000, offset: 0 });

    const rows = enriched.map((c, i) => ({
      "#": i + 1,
      "كود العميل": c.code,
      "الاسم": c.name,
      "الهاتف": c.phone,
      "النوع": c.type,
      "المحافظة": c.governorate,
      "الفرع": c.branch_name ?? "",
      "العنوان": c.address ?? "",
      "عدد الفواتير": c.invoice_count,
      "إجمالي المشتريات": c.total_amount,
      "آخر فاتورة": c.last_invoice_date ? new Date(c.last_invoice_date).toLocaleDateString("ar-EG") : "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "العملاء");

    const colWidths = [
      { wch: 4 }, { wch: 18 }, { wch: 24 }, { wch: 16 }, { wch: 14 },
      { wch: 14 }, { wch: 18 }, { wch: 24 }, { wch: 12 }, { wch: 16 }, { wch: 14 },
    ];
    ws["!cols"] = colWidths;

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="customers-${Date.now()}.xlsx"`);
    res.send(buf);
  } catch (err) {
    req.log.error({ err }, "Export customers error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/", requireAuth, requireRole("Customer Service Agent", "Manager/Voter", "Manager"), validateBody(CreateCustomerBody), async (req, res) => {
  try {
    const { code, name, phone, type, governorate, branch_id, address } = req.body;
    if (!name || !phone || !type || !governorate) {
      res.status(400).json({ error: "name, phone, type, governorate are required" });
      return;
    }
    const customerCode = code || generateCustomerCode();
    const [customer] = await db.insert(customersTable).values({ code: customerCode, name, phone, type, governorate, branch_id: branch_id ?? null, address }).returning();
    const branch = branch_id ? (await db.select().from(branchesTable).where(eq(branchesTable.id, branch_id)).limit(1))[0] : null;
    res.status(201).json({ ...customer, branch_name: branch?.name ?? null });
  } catch (err) {
    req.log.error({ err }, "Create customer error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
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

router.put("/:id", requireAuth, requireRole("Customer Service Agent", "Manager/Voter", "Manager"), validateBody(UpdateCustomerBody), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
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
      if (existing.branch_id != null) {
        await db.insert(branchChangeLogsTable).values({
          customer_id: id,
          old_branch_id: existing.branch_id,
          new_branch_id: branch_id,
          notes: "Updated via customer edit",
        });
      }
    }

    await db.update(customersTable).set(updates).where(eq(customersTable.id, id));
    const [customer] = await db.select({ id: customersTable.id, code: customersTable.code, name: customersTable.name, phone: customersTable.phone, type: customersTable.type, governorate: customersTable.governorate, branch_id: customersTable.branch_id, branch_name: branchesTable.name, address: customersTable.address }).from(customersTable).leftJoin(branchesTable, eq(customersTable.branch_id, branchesTable.id)).where(eq(customersTable.id, id)).limit(1);
    res.json(customer);
  } catch (err) {
    req.log.error({ err }, "Update customer error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/:id", requireAuth, requireRole("Manager"), async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    await db.delete(customersTable).where(eq(customersTable.id, id));
    res.json({ success: true, message: "Customer deleted" });
  } catch (err) {
    req.log.error({ err }, "Delete customer error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
