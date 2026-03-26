import { Router } from "express";
import { db } from "@workspace/db";
import { branchesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const branches = await db.select().from(branchesTable);
    res.json({ data: branches });
  } catch (err) {
    req.log.error({ err }, "List branches error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const { name, address, governorate } = req.body;
    if (!name || !governorate) { res.status(400).json({ error: "name and governorate are required" }); return; }
    const [branch] = await db.insert(branchesTable).values({ name, address, governorate }).returning();
    res.status(201).json(branch);
  } catch (err) {
    req.log.error({ err }, "Create branch error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, address, governorate } = req.body;
    const updates: Record<string, unknown> = {};
    if (name) updates.name = name;
    if (address !== undefined) updates.address = address;
    if (governorate) updates.governorate = governorate;
    await db.update(branchesTable).set(updates).where(eq(branchesTable.id, id));
    const [branch] = await db.select().from(branchesTable).where(eq(branchesTable.id, id)).limit(1);
    if (!branch) { res.status(404).json({ error: "Not Found" }); return; }
    res.json(branch);
  } catch (err) {
    req.log.error({ err }, "Update branch error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(branchesTable).where(eq(branchesTable.id, id));
    res.json({ success: true, message: "Branch deleted" });
  } catch (err) {
    req.log.error({ err }, "Delete branch error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
