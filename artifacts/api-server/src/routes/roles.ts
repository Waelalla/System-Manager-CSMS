import { Router } from "express";
import { db } from "@workspace/db";
import { rolesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const roles = await db.select().from(rolesTable);
    res.json({ data: roles });
  } catch (err) {
    req.log.error({ err }, "List roles error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const { name, permissions } = req.body;
    if (!name) { res.status(400).json({ error: "name is required" }); return; }
    const [role] = await db.insert(rolesTable).values({ name, permissions: permissions ?? [] }).returning();
    res.status(201).json(role);
  } catch (err) {
    req.log.error({ err }, "Create role error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, permissions } = req.body;
    const updates: Record<string, unknown> = {};
    if (name) updates.name = name;
    if (permissions !== undefined) updates.permissions = permissions;
    await db.update(rolesTable).set(updates).where(eq(rolesTable.id, id));
    const [role] = await db.select().from(rolesTable).where(eq(rolesTable.id, id)).limit(1);
    if (!role) { res.status(404).json({ error: "Not Found" }); return; }
    res.json(role);
  } catch (err) {
    req.log.error({ err }, "Update role error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(rolesTable).where(eq(rolesTable.id, id));
    res.json({ success: true, message: "Role deleted" });
  } catch (err) {
    req.log.error({ err }, "Delete role error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
