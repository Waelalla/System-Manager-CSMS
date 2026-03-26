import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, rolesTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth.js";
import { parsePagination, buildPaginated } from "../lib/pagination.js";
import { hashPassword } from "../lib/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const offset = (page - 1) * limit;

    const [totalResult] = await db.select({ count: count() }).from(usersTable);
    const users = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        role_id: usersTable.role_id,
        role_name: rolesTable.name,
        created_at: usersTable.created_at,
      })
      .from(usersTable)
      .leftJoin(rolesTable, eq(usersTable.role_id, rolesTable.id))
      .limit(limit)
      .offset(offset);

    res.json(buildPaginated(users, totalResult.count, { page, limit }));
  } catch (err) {
    req.log.error({ err }, "List users error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/", requireAuth, requireRole("Manager", "Manager/Voter"), async (req, res) => {
  try {
    const { name, email, password, role_id } = req.body;
    if (!name || !email || !password || !role_id) {
      res.status(400).json({ error: "name, email, password, role_id are required" });
      return;
    }
    const password_hash = await hashPassword(password);
    const [user] = await db.insert(usersTable).values({ name, email, password_hash, role_id }).returning();
    const [role] = await db.select().from(rolesTable).where(eq(rolesTable.id, role_id)).limit(1);
    res.status(201).json({ ...user, role_name: role?.name ?? "" });
  } catch (err) {
    req.log.error({ err }, "Create user error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [user] = await db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role_id: usersTable.role_id, role_name: rolesTable.name, created_at: usersTable.created_at })
      .from(usersTable)
      .leftJoin(rolesTable, eq(usersTable.role_id, rolesTable.id))
      .where(eq(usersTable.id, id))
      .limit(1);
    if (!user) { res.status(404).json({ error: "Not Found" }); return; }
    res.json(user);
  } catch (err) {
    req.log.error({ err }, "Get user error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/:id", requireAuth, requireRole("Manager", "Manager/Voter"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, email, password, role_id } = req.body;
    const updates: Record<string, unknown> = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (password) updates.password_hash = await hashPassword(password);
    if (role_id) updates.role_id = role_id;
    if (Object.keys(updates).length === 0) { res.status(400).json({ error: "No fields to update" }); return; }
    await db.update(usersTable).set(updates).where(eq(usersTable.id, id));
    const [user] = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role_id: usersTable.role_id, role_name: rolesTable.name, created_at: usersTable.created_at }).from(usersTable).leftJoin(rolesTable, eq(usersTable.role_id, rolesTable.id)).where(eq(usersTable.id, id)).limit(1);
    if (!user) { res.status(404).json({ error: "Not Found" }); return; }
    res.json(user);
  } catch (err) {
    req.log.error({ err }, "Update user error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/:id", requireAuth, requireRole("Manager"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(usersTable).where(eq(usersTable.id, id));
    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    req.log.error({ err }, "Delete user error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
