import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth.js";
import { parsePagination, buildPaginated } from "../lib/pagination.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const offset = (page - 1) * limit;
    const [totalResult] = await db.select({ count: count() }).from(productsTable);
    const products = await db.select().from(productsTable).limit(limit).offset(offset);
    res.json(buildPaginated(products, totalResult.count, { page, limit }));
  } catch (err) {
    req.log.error({ err }, "List products error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/", requireAuth, requireRole("Manager/Voter", "Manager"), async (req, res) => {
  try {
    const { name, category, attributes } = req.body;
    if (!name || !category) { res.status(400).json({ error: "name and category are required" }); return; }
    const [product] = await db.insert(productsTable).values({ name, category, attributes }).returning();
    res.status(201).json(product);
  } catch (err) {
    req.log.error({ err }, "Create product error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/:id", requireAuth, requireRole("Manager/Voter", "Manager"), async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const { name, category, attributes } = req.body;
    const updates: Record<string, unknown> = {};
    if (name) updates.name = name;
    if (category) updates.category = category;
    if (attributes !== undefined) updates.attributes = attributes;
    await db.update(productsTable).set(updates).where(eq(productsTable.id, id));
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
    if (!product) { res.status(404).json({ error: "Not Found" }); return; }
    res.json(product);
  } catch (err) {
    req.log.error({ err }, "Update product error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/:id", requireAuth, requireRole("Manager"), async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    await db.delete(productsTable).where(eq(productsTable.id, id));
    res.json({ success: true, message: "Product deleted" });
  } catch (err) {
    req.log.error({ err }, "Delete product error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
