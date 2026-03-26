import { Router } from "express";
import { db } from "@workspace/db";
import { importLogsTable, usersTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { parsePagination, buildPaginated } from "../lib/pagination.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const offset = (page - 1) * limit;
    const [totalResult] = await db.select({ count: count() }).from(importLogsTable);
    const logs = await db
      .select({
        id: importLogsTable.id,
        user_id: importLogsTable.user_id,
        user_name: usersTable.name,
        file_name: importLogsTable.file_name,
        total_rows: importLogsTable.total_rows,
        added_customers: importLogsTable.added_customers,
        updated_customers: importLogsTable.updated_customers,
        added_invoices: importLogsTable.added_invoices,
        duplicate_invoices: importLogsTable.duplicate_invoices,
        imported_at: importLogsTable.imported_at,
      })
      .from(importLogsTable)
      .leftJoin(usersTable, eq(importLogsTable.user_id, usersTable.id))
      .limit(limit)
      .offset(offset)
      .orderBy(importLogsTable.imported_at);
    res.json(buildPaginated(logs, totalResult.count, { page, limit }));
  } catch (err) {
    req.log.error({ err }, "List import logs error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [log] = await db
      .select({
        id: importLogsTable.id,
        user_id: importLogsTable.user_id,
        user_name: usersTable.name,
        file_name: importLogsTable.file_name,
        total_rows: importLogsTable.total_rows,
        added_customers: importLogsTable.added_customers,
        updated_customers: importLogsTable.updated_customers,
        added_invoices: importLogsTable.added_invoices,
        duplicate_invoices: importLogsTable.duplicate_invoices,
        errors: importLogsTable.errors,
        warnings: importLogsTable.warnings,
        imported_at: importLogsTable.imported_at,
      })
      .from(importLogsTable)
      .leftJoin(usersTable, eq(importLogsTable.user_id, usersTable.id))
      .where(eq(importLogsTable.id, id))
      .limit(1);
    if (!log) { res.status(404).json({ error: "Not Found" }); return; }
    res.json(log);
  } catch (err) {
    req.log.error({ err }, "Get import log error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
