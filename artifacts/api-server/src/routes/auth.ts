import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, rolesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashPassword,
  comparePassword,
  requireAuth,
  type AuthRequest,
} from "../lib/auth.js";

const router = Router();

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Bad Request", message: "email and password are required" });
      return;
    }

    const [user] = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        password_hash: usersTable.password_hash,
        role_id: usersTable.role_id,
        role_name: rolesTable.name,
        permissions: rolesTable.permissions,
        created_at: usersTable.created_at,
      })
      .from(usersTable)
      .leftJoin(rolesTable, eq(usersTable.role_id, rolesTable.id))
      .where(eq(usersTable.email, email))
      .limit(1);

    if (!user || !user.password_hash) {
      res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
      return;
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
      return;
    }

    const permissions = Array.isArray(user.permissions) ? (user.permissions as string[]) : [];
    const payload = {
      userId: user.id,
      email: user.email,
      roleId: user.role_id,
      roleName: user.role_name ?? "",
      permissions,
    };

    const access_token = signAccessToken(payload);
    const refresh_token = signRefreshToken(payload);

    res.json({
      access_token,
      refresh_token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role_id: user.role_id,
        role_name: user.role_name ?? "",
        permissions,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Login error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/refresh", async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      res.status(400).json({ error: "Bad Request", message: "refresh_token is required" });
      return;
    }

    const payload = verifyRefreshToken(refresh_token);
    const [user] = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        role_id: usersTable.role_id,
        role_name: rolesTable.name,
        permissions: rolesTable.permissions,
        created_at: usersTable.created_at,
      })
      .from(usersTable)
      .leftJoin(rolesTable, eq(usersTable.role_id, rolesTable.id))
      .where(eq(usersTable.id, payload.userId))
      .limit(1);

    if (!user) {
      res.status(401).json({ error: "Unauthorized", message: "User not found" });
      return;
    }

    const permissions = Array.isArray(user.permissions) ? (user.permissions as string[]) : [];
    const newPayload = {
      userId: user.id,
      email: user.email,
      roleId: user.role_id,
      roleName: user.role_name ?? "",
      permissions,
    };

    res.json({
      access_token: signAccessToken(newPayload),
      refresh_token: signRefreshToken(newPayload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role_id: user.role_id,
        role_name: user.role_name ?? "",
        permissions,
        created_at: user.created_at,
      },
    });
  } catch {
    res.status(401).json({ error: "Unauthorized", message: "Invalid or expired refresh token" });
  }
});

router.post("/logout", requireAuth, (_req, res) => {
  res.json({ success: true, message: "Logged out" });
});

router.get("/profile", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [user] = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        role_id: usersTable.role_id,
        role_name: rolesTable.name,
        permissions: rolesTable.permissions,
        created_at: usersTable.created_at,
      })
      .from(usersTable)
      .leftJoin(rolesTable, eq(usersTable.role_id, rolesTable.id))
      .where(eq(usersTable.id, req.user!.userId))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "Not Found" });
      return;
    }

    const permissions = Array.isArray(user.permissions) ? (user.permissions as string[]) : [];
    res.json({ id: user.id, name: user.name, email: user.email, role_id: user.role_id, role_name: user.role_name ?? "", permissions, created_at: user.created_at });
  } catch (err) {
    req.log.error({ err }, "Get profile error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/profile", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { name, email } = req.body;
    const updates: Record<string, unknown> = {};
    if (name) updates.name = name;
    if (email) updates.email = email;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    await db.update(usersTable).set(updates).where(eq(usersTable.id, req.user!.userId));

    const [user] = await db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role_id: usersTable.role_id, role_name: rolesTable.name, permissions: rolesTable.permissions, created_at: usersTable.created_at })
      .from(usersTable)
      .leftJoin(rolesTable, eq(usersTable.role_id, rolesTable.id))
      .where(eq(usersTable.id, req.user!.userId))
      .limit(1);

    const permissions = Array.isArray(user?.permissions) ? (user!.permissions as string[]) : [];
    res.json({ id: user!.id, name: user!.name, email: user!.email, role_id: user!.role_id, role_name: user!.role_name ?? "", permissions, created_at: user!.created_at });
  } catch (err) {
    req.log.error({ err }, "Update profile error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/change-password", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      res.status(400).json({ error: "Both current_password and new_password are required" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
    if (!user || !user.password_hash) {
      res.status(404).json({ error: "Not Found" });
      return;
    }

    const valid = await comparePassword(current_password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }

    const newHash = await hashPassword(new_password);
    await db.update(usersTable).set({ password_hash: newHash }).where(eq(usersTable.id, req.user!.userId));
    res.json({ success: true, message: "Password changed" });
  } catch (err) {
    req.log.error({ err }, "Change password error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
