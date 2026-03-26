import { Router } from "express";
import { db } from "@workspace/db";
import { branchChangeLogsTable, customersTable, branchesTable } from "@workspace/db";
import { eq, count, inArray } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth.js";
import { parsePagination, buildPaginated } from "../lib/pagination.js";

const router = Router();

router.get("/", requireAuth, requireRole("Manager", "Manager/Voter"), async (req, res) => {
  try {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const offset = (page - 1) * limit;

    const [totalResult] = await db.select({ count: count() }).from(branchChangeLogsTable);

    const logs = await db
      .select({
        id: branchChangeLogsTable.id,
        customer_id: branchChangeLogsTable.customer_id,
        customer_code: customersTable.code,
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

    const branchIds = [...new Set(
      logs.flatMap(l => [l.old_branch_id, l.new_branch_id]).filter((id): id is number => id != null)
    )];
    let branchMap: Record<number, string> = {};
    if (branchIds.length > 0) {
      const branches = await db
        .select({ id: branchesTable.id, name: branchesTable.name })
        .from(branchesTable)
        .where(inArray(branchesTable.id, branchIds));
      branchMap = Object.fromEntries(branches.map(b => [b.id, b.name ?? ""]));
    }

    const enriched = logs.map(l => ({
      ...l,
      old_branch_name: l.old_branch_id != null ? (branchMap[l.old_branch_id] ?? null) : null,
      new_branch_name: l.new_branch_id != null ? (branchMap[l.new_branch_id] ?? null) : null,
    }));

    res.json(buildPaginated(enriched, totalResult.count, { page, limit }));
  } catch (err) {
    req.log.error({ err }, "List branch change logs error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.patch("/:id/notes", requireAuth, requireRole("Manager", "Manager/Voter"), async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const { notes } = req.body as { notes?: string };
    if (typeof notes !== "string") {
      res.status(400).json({ error: "notes field is required" });
      return;
    }
    const [updated] = await db
      .update(branchChangeLogsTable)
      .set({ notes })
      .where(eq(branchChangeLogsTable.id, id))
      .returning({ id: branchChangeLogsTable.id });
    if (!updated) { res.status(404).json({ error: "Not Found" }); return; }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Update branch change log notes error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
