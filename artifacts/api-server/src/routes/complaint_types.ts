import { Router } from "express";
import { db } from "@workspace/db";
import { complaintTypesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const types = await db.select().from(complaintTypesTable);
    res.json({ data: types });
  } catch (err) {
    req.log.error({ err }, "List complaint types error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const { name, fields } = req.body;
    if (!name) { res.status(400).json({ error: "name is required" }); return; }
    const [type] = await db.insert(complaintTypesTable).values({ name, fields: fields ?? [] }).returning();
    res.status(201).json(type);
  } catch (err) {
    req.log.error({ err }, "Create complaint type error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, fields } = req.body;
    const updates: Record<string, unknown> = {};
    if (name) updates.name = name;
    if (fields !== undefined) updates.fields = fields;
    await db.update(complaintTypesTable).set(updates).where(eq(complaintTypesTable.id, id));
    const [type] = await db.select().from(complaintTypesTable).where(eq(complaintTypesTable.id, id)).limit(1);
    if (!type) { res.status(404).json({ error: "Not Found" }); return; }
    res.json(type);
  } catch (err) {
    req.log.error({ err }, "Update complaint type error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(complaintTypesTable).where(eq(complaintTypesTable.id, id));
    res.json({ success: true, message: "Complaint type deleted" });
  } catch (err) {
    req.log.error({ err }, "Delete complaint type error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
