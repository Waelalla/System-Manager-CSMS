import { Router } from "express";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { db } from "@workspace/db";
import { customersTable, invoicesTable, branchesTable, productsTable, importLogsTable, branchChangeLogsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();

function generateCustomerCode(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = String(Math.floor(Math.random() * 9999) + 1).padStart(4, "0");
  return `CUST-${date}-${rand}`;
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return new Date(dateStr);
  if (/^\d{2}\/\d{2}\/\d{4}/.test(dateStr)) {
    const [day, month, year] = dateStr.split("/");
    return new Date(`${year}-${month}-${day}`);
  }
  return null;
}

router.post("/csv", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { mode, rows, file_name } = req.body;
    if (!mode || !rows || !Array.isArray(rows)) {
      res.status(400).json({ error: "mode and rows are required" });
      return;
    }

    const stats = {
      total_rows: rows.length,
      added_customers: 0,
      updated_customers: 0,
      added_invoices: 0,
      duplicate_invoices: 0,
    };
    const errors: unknown[] = [];
    const warnings: unknown[] = [];

    const branches = await db.select().from(branchesTable);
    const branchMap = new Map(branches.map(b => [b.name.toLowerCase(), b]));
    const products = await db.select().from(productsTable);
    const productMap = new Map(products.map(p => [p.name.toLowerCase(), p]));

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as Record<string, string>;
      try {
        const { code, name, phone, type, governorate, branch, address } = row;
        if (!name || !phone) {
          errors.push({ row: i + 1, field: "name/phone", reason: "name and phone are required" });
          continue;
        }

        const branchRecord = branchMap.get((branch ?? "").toLowerCase());
        if (!branchRecord) {
          warnings.push({ row: i + 1, field: "branch", reason: `Branch '${branch}' not found, skipped` });
          continue;
        }

        const [existing] = await db
          .select()
          .from(customersTable)
          .where(and(eq(customersTable.name, name), eq(customersTable.phone, phone)))
          .limit(1);

        if (existing) {
          const updates: Record<string, unknown> = {};
          if (type && type !== existing.type) updates.type = type;
          if (governorate && governorate !== existing.governorate) updates.governorate = governorate;
          if (address !== undefined) updates.address = address;

          if (branchRecord.id !== existing.branch_id) {
            updates.branch_id = branchRecord.id;
            await db.insert(branchChangeLogsTable).values({
              customer_id: existing.id,
              old_branch_id: existing.branch_id,
              new_branch_id: branchRecord.id,
              notes: `Imported from CSV row ${i + 1}`,
            });
          }

          if (Object.keys(updates).length > 0) {
            await db.update(customersTable).set(updates).where(eq(customersTable.id, existing.id));
          }
          stats.updated_customers++;
        } else {
          const customerCode = code || generateCustomerCode();
          await db.insert(customersTable).values({
            code: customerCode,
            name,
            phone,
            type: type ?? "عادي",
            governorate: governorate ?? "",
            branch_id: branchRecord.id,
            address: address ?? null,
          });
          stats.added_customers++;
        }

        if (mode === "customers_and_invoices") {
          const { invoice_number, invoice_date, invoice_amount, invoice_status, invoice_product } = row;
          if (invoice_number) {
            const parsedDate = parseDate(invoice_date);
            if (!parsedDate) {
              warnings.push({ row: i + 1, field: "invoice_date", reason: `Invalid date format: '${invoice_date}'` });
            } else {
              const amount = parseFloat(invoice_amount);
              if (isNaN(amount)) {
                warnings.push({ row: i + 1, field: "invoice_amount", reason: `Invalid amount: '${invoice_amount}'` });
              } else {
                const [customer] = await db.select().from(customersTable).where(and(eq(customersTable.name, name), eq(customersTable.phone, phone))).limit(1);
                if (customer) {
                  const [existingInv] = await db.select().from(invoicesTable).where(eq(invoicesTable.invoice_number, invoice_number)).limit(1);
                  if (existingInv) {
                    stats.duplicate_invoices++;
                  } else {
                    const productRecord = invoice_product ? productMap.get(invoice_product.toLowerCase()) : null;
                    if (invoice_product && !productRecord) {
                      warnings.push({ row: i + 1, field: "invoice_product", reason: `Product '${invoice_product}' not found` });
                    }
                    await db.insert(invoicesTable).values({
                      invoice_number,
                      invoice_date: parsedDate,
                      amount: amount.toFixed(2),
                      status: invoice_status ?? "مدفوع",
                      product_id: productRecord?.id ?? null,
                      customer_id: customer.id,
                    });
                    stats.added_invoices++;
                  }
                }
              }
            }
          }
        }
      } catch (rowErr) {
        errors.push({ row: i + 1, reason: String(rowErr) });
      }
    }

    const [log] = await db.insert(importLogsTable).values({
      user_id: req.user!.userId,
      file_name: file_name ?? "upload.csv",
      total_rows: stats.total_rows,
      added_customers: stats.added_customers,
      updated_customers: stats.updated_customers,
      added_invoices: stats.added_invoices,
      duplicate_invoices: stats.duplicate_invoices,
      errors: errors.length > 0 ? errors : null,
      warnings: warnings.length > 0 ? warnings : null,
    }).returning();

    res.json({ ...stats, errors, warnings, log_id: log.id });
  } catch (err) {
    req.log.error({ err }, "Import CSV error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/upload", requireAuth, upload.single("file"), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "CSV file is required" });
      return;
    }
    const mode = (req.body.mode as string) || "customers_only";
    const csvContent = req.file.buffer.toString("utf-8");

    let rows: Record<string, string>[];
    try {
      rows = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];
    } catch (parseErr) {
      res.status(400).json({ error: `CSV parse error: ${String(parseErr)}` });
      return;
    }

    const processReq = {
      body: { mode, rows, file_name: req.file.originalname },
      user: req.user,
      log: req.log,
    } as AuthRequest;

    const stats = {
      total_rows: rows.length,
      added_customers: 0,
      updated_customers: 0,
      added_invoices: 0,
      duplicate_invoices: 0,
    };
    const errors: unknown[] = [];
    const warnings: unknown[] = [];

    const branches = await db.select().from(branchesTable);
    const branchMap = new Map(branches.map(b => [b.name.toLowerCase(), b]));
    const products = await db.select().from(productsTable);
    const productMap = new Map(products.map(p => [p.name.toLowerCase(), p]));

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const { code, name, phone, type, governorate, branch, address } = row;
        if (!name || !phone) {
          errors.push({ row: i + 1, field: "name/phone", reason: "name and phone are required" });
          continue;
        }
        const branchRecord = branchMap.get((branch ?? "").toLowerCase());
        if (!branchRecord) {
          warnings.push({ row: i + 1, field: "branch", reason: `Branch '${branch}' not found, skipped` });
          continue;
        }
        const [existing] = await db
          .select().from(customersTable)
          .where(and(eq(customersTable.name, name), eq(customersTable.phone, phone))).limit(1);

        if (existing) {
          const updates: Record<string, unknown> = {};
          if (type && type !== existing.type) updates.type = type;
          if (governorate && governorate !== existing.governorate) updates.governorate = governorate;
          if (address !== undefined) updates.address = address;
          if (branchRecord.id !== existing.branch_id) {
            updates.branch_id = branchRecord.id;
            await db.insert(branchChangeLogsTable).values({
              customer_id: existing.id, old_branch_id: existing.branch_id,
              new_branch_id: branchRecord.id, notes: `CSV upload row ${i + 1}`,
            });
          }
          if (Object.keys(updates).length > 0)
            await db.update(customersTable).set(updates).where(eq(customersTable.id, existing.id));
          stats.updated_customers++;
        } else {
          const customerCode = code || generateCustomerCode();
          await db.insert(customersTable).values({
            code: customerCode, name, phone, type: type ?? "عادي",
            governorate: governorate ?? "", branch_id: branchRecord.id, address: address ?? null,
          });
          stats.added_customers++;
        }

        if (mode === "customers_and_invoices") {
          const { invoice_number, invoice_date, invoice_amount, invoice_status, invoice_product } = row;
          if (invoice_number) {
            const parsedDate = parseDate(invoice_date);
            if (!parsedDate) {
              warnings.push({ row: i + 1, field: "invoice_date", reason: `Invalid date: '${invoice_date}'` });
            } else {
              const amount = parseFloat(invoice_amount);
              if (isNaN(amount)) {
                warnings.push({ row: i + 1, field: "invoice_amount", reason: `Invalid amount: '${invoice_amount}'` });
              } else {
                const [customer] = await db.select().from(customersTable)
                  .where(and(eq(customersTable.name, name), eq(customersTable.phone, phone))).limit(1);
                if (customer) {
                  const [existingInv] = await db.select().from(invoicesTable)
                    .where(eq(invoicesTable.invoice_number, invoice_number)).limit(1);
                  if (existingInv) {
                    stats.duplicate_invoices++;
                  } else {
                    const productRecord = invoice_product ? productMap.get(invoice_product.toLowerCase()) : null;
                    await db.insert(invoicesTable).values({
                      invoice_number, invoice_date: parsedDate,
                      amount: amount.toFixed(2),
                      status: invoice_status ?? "مدفوع",
                      product_id: productRecord?.id ?? null,
                      customer_id: customer.id,
                    });
                    stats.added_invoices++;
                  }
                }
              }
            }
          }
        }
      } catch (rowErr) {
        errors.push({ row: i + 1, reason: String(rowErr) });
      }
    }

    const [log] = await db.insert(importLogsTable).values({
      user_id: req.user!.userId,
      file_name: req.file.originalname,
      total_rows: stats.total_rows,
      added_customers: stats.added_customers,
      updated_customers: stats.updated_customers,
      added_invoices: stats.added_invoices,
      duplicate_invoices: stats.duplicate_invoices,
      errors: errors.length > 0 ? errors : null,
      warnings: warnings.length > 0 ? warnings : null,
    }).returning();

    processReq.log.info({ log_id: log.id }, "CSV upload processed");
    res.json({ ...stats, errors, warnings, log_id: log.id });
  } catch (err) {
    req.log.error({ err }, "CSV upload error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
