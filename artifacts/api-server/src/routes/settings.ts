import { Router } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const settings = await db.select().from(settingsTable);
    const flat = Object.fromEntries(settings.map(s => [s.key, s.value]));
    res.json(flat);
  } catch (err) {
    req.log.error({ err }, "Get settings error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/", requireAuth, async (req, res) => {
  try {
    const updates = req.body as Record<string, unknown>;
    for (const [key, value] of Object.entries(updates)) {
      await db
        .insert(settingsTable)
        .values({ key, value: String(value) })
        .onConflictDoUpdate({ target: settingsTable.key, set: { value: String(value) } });
    }
    const settings = await db.select().from(settingsTable);
    const flat = Object.fromEntries(settings.map(s => [s.key, s.value]));
    res.json(flat);
  } catch (err) {
    req.log.error({ err }, "Update settings error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
