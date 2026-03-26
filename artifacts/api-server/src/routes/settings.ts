import { Router } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const rows = await db.select().from(settingsTable);
    const data = Object.fromEntries(rows.map(s => [s.key, s.value]));
    res.json({ data });
  } catch (err) {
    req.log.error({ err }, "Get settings error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/", requireAuth, requireRole("Manager", "Manager/Voter"), async (req, res) => {
  try {
    const body = req.body as { settings?: Record<string, unknown> };
    const updates = (body.settings && typeof body.settings === "object") ? body.settings : {};
    for (const [key, value] of Object.entries(updates)) {
      await db
        .insert(settingsTable)
        .values({ key, value: String(value) })
        .onConflictDoUpdate({ target: settingsTable.key, set: { value: String(value) } });
    }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Update settings error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
