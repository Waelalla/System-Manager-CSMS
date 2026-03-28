import { Router } from "express";
import { db } from "@workspace/db";
import {
  complaintsTable, customersTable, productsTable, invoicesTable,
  complaintTypesTable, usersTable, complaintLogsTable, feedbackTable,
  branchesTable, notificationsTable
} from "@workspace/db";
import { eq, count, and, or, ilike, sql, gte, lte } from "drizzle-orm";
import { requireAuth, requireRole, type AuthRequest } from "../lib/auth.js";
import { parsePagination, buildPaginated } from "../lib/pagination.js";
import { validateBody } from "../lib/validate.js";
import { CreateComplaintBody, UpdateComplaintStatusBody } from "@workspace/api-zod";

const router = Router();

async function logComplaintAction(complaint_id: number, action: string, user_id: number, note?: string) {
  await db.insert(complaintLogsTable).values({ complaint_id, action, user_id, note });
}

async function notifyUsers(user_ids: number[], type: string, title: string, message: string, link?: string) {
  if (user_ids.length === 0) return;
  await db.insert(notificationsTable).values(user_ids.map(uid => ({ user_id: uid, type, title, message, link: link ?? null })));
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const offset = (page - 1) * limit;
    const { status, type_id, priority, assigned_to_id, customer_id, date_from, date_to, channel, search } = req.query as Record<string, string>;

    const conditions: ReturnType<typeof eq>[] = [];
    if (status) conditions.push(eq(complaintsTable.status, status));
    if (type_id) conditions.push(eq(complaintsTable.type_id, parseInt(type_id)));
    if (priority) conditions.push(eq(complaintsTable.priority, priority));
    if (assigned_to_id) conditions.push(eq(complaintsTable.assigned_to_id, parseInt(assigned_to_id)));
    if (customer_id) conditions.push(eq(complaintsTable.customer_id, parseInt(customer_id)));
    if (date_from) conditions.push(gte(complaintsTable.created_at, new Date(date_from)));
    if (date_to) conditions.push(lte(complaintsTable.created_at, new Date(date_to)));
    if (channel) conditions.push(eq(complaintsTable.channel, channel));

    let searchCondition: ReturnType<typeof or> | undefined;
    if (search?.trim()) {
      const term = search.trim();
      const searchId = parseInt(term.replace(/[^0-9]/g, ''));
      const orParts: ReturnType<typeof eq>[] = [];
      if (!isNaN(searchId) && searchId > 0 && /^\d+$/.test(term.replace(/^#/, ''))) {
        orParts.push(eq(complaintsTable.id, searchId));
      }
      orParts.push(ilike(customersTable.name, `%${term}%`) as ReturnType<typeof eq>);
      orParts.push(ilike(customersTable.phone, `%${term}%`) as ReturnType<typeof eq>);
      searchCondition = or(...orParts);
    }

    const baseWhere = conditions.length > 0 ? and(...conditions) : undefined;
    const whereClause = baseWhere && searchCondition
      ? and(baseWhere, searchCondition)
      : searchCondition ?? baseWhere;

    const [totalResult] = await db
      .select({ count: count() })
      .from(complaintsTable)
      .leftJoin(customersTable, eq(complaintsTable.customer_id, customersTable.id))
      .where(whereClause);

    const complaints = await db
      .select({
        id: complaintsTable.id,
        customer_id: complaintsTable.customer_id,
        customer_name: customersTable.name,
        customer_phone: customersTable.phone,
        branch_name: branchesTable.name,
        product_id: complaintsTable.product_id,
        product_name: productsTable.name,
        invoice_id: complaintsTable.invoice_id,
        invoice_number: invoicesTable.invoice_number,
        type_id: complaintsTable.type_id,
        type_name: complaintTypesTable.name,
        channel: complaintsTable.channel,
        priority: complaintsTable.priority,
        description: complaintsTable.description,
        status: complaintsTable.status,
        assigned_to_id: complaintsTable.assigned_to_id,
        assigned_to_name: usersTable.name,
        created_at: complaintsTable.created_at,
      })
      .from(complaintsTable)
      .leftJoin(customersTable, eq(complaintsTable.customer_id, customersTable.id))
      .leftJoin(branchesTable, eq(customersTable.branch_id, branchesTable.id))
      .leftJoin(productsTable, eq(complaintsTable.product_id, productsTable.id))
      .leftJoin(invoicesTable, eq(complaintsTable.invoice_id, invoicesTable.id))
      .leftJoin(complaintTypesTable, eq(complaintsTable.type_id, complaintTypesTable.id))
      .leftJoin(usersTable, eq(complaintsTable.assigned_to_id, usersTable.id))
      .where(whereClause)
      .limit(limit)
      .offset(offset);

    res.json(buildPaginated(complaints, totalResult.count, { page, limit }));
  } catch (err) {
    req.log.error({ err }, "List complaints error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/", requireAuth, requireRole("Customer Service Agent", "Manager/Voter", "Manager"), validateBody(CreateComplaintBody), async (req: AuthRequest, res) => {
  try {
    const { customer_id, product_id, invoice_id, type_id, fields_values, channel, priority, description, images } = req.body;
    if (!customer_id || !type_id || !channel || !priority || !description) {
      res.status(400).json({ error: "customer_id, type_id, channel, priority, description are required" });
      return;
    }

    const [complaint] = await db.insert(complaintsTable).values({
      customer_id, product_id: product_id ?? null, invoice_id: invoice_id ?? null,
      type_id, fields_values: fields_values ?? null, channel, priority,
      description, images: images ?? null, status: "جديدة",
      created_by: req.user!.userId,
    }).returning();

    await logComplaintAction(complaint.id, "إنشاء الشكوى", req.user!.userId, "تم إنشاء الشكوى");

    const staffUsers = await db.select({ id: usersTable.id }).from(usersTable);
    const userIds = staffUsers.map(u => u.id).filter(id => id !== req.user!.userId);
    await notifyUsers(userIds, "new_complaint", "شكوى جديدة", `تم إنشاء شكوى جديدة #${complaint.id}`, `/complaints/${complaint.id}`);

    res.status(201).json(complaint);
  } catch (err) {
    req.log.error({ err }, "Create complaint error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const [complaint] = await db
      .select({
        id: complaintsTable.id,
        customer_id: complaintsTable.customer_id,
        customer_name: customersTable.name,
        customer_phone: customersTable.phone,
        branch_name: branchesTable.name,
        product_id: complaintsTable.product_id,
        product_name: productsTable.name,
        invoice_id: complaintsTable.invoice_id,
        invoice_number: invoicesTable.invoice_number,
        type_id: complaintsTable.type_id,
        type_name: complaintTypesTable.name,
        type_fields: complaintTypesTable.fields,
        channel: complaintsTable.channel,
        priority: complaintsTable.priority,
        description: complaintsTable.description,
        fields_values: complaintsTable.fields_values,
        images: complaintsTable.images,
        status: complaintsTable.status,
        assigned_to_id: complaintsTable.assigned_to_id,
        assigned_to_name: usersTable.name,
        created_at: complaintsTable.created_at,
      })
      .from(complaintsTable)
      .leftJoin(customersTable, eq(complaintsTable.customer_id, customersTable.id))
      .leftJoin(branchesTable, eq(customersTable.branch_id, branchesTable.id))
      .leftJoin(productsTable, eq(complaintsTable.product_id, productsTable.id))
      .leftJoin(invoicesTable, eq(complaintsTable.invoice_id, invoicesTable.id))
      .leftJoin(complaintTypesTable, eq(complaintsTable.type_id, complaintTypesTable.id))
      .leftJoin(usersTable, eq(complaintsTable.assigned_to_id, usersTable.id))
      .where(eq(complaintsTable.id, id))
      .limit(1);

    if (!complaint) { res.status(404).json({ error: "Not Found" }); return; }

    const logs = await db
      .select({
        id: complaintLogsTable.id,
        complaint_id: complaintLogsTable.complaint_id,
        action: complaintLogsTable.action,
        user_id: complaintLogsTable.user_id,
        user_name: usersTable.name,
        note: complaintLogsTable.note,
        timestamp: complaintLogsTable.timestamp,
      })
      .from(complaintLogsTable)
      .leftJoin(usersTable, eq(complaintLogsTable.user_id, usersTable.id))
      .where(eq(complaintLogsTable.complaint_id, id))
      .orderBy(complaintLogsTable.timestamp);

    const [feedback] = await db.select().from(feedbackTable).where(eq(feedbackTable.complaint_id, id)).limit(1);

    res.json({ ...complaint, logs, feedback: feedback ?? null });
  } catch (err) {
    req.log.error({ err }, "Get complaint error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const VALID_STATUSES = ["جديدة", "مستلمة", "جاري المعالجة", "مصعدة", "تصعيد إداري", "محلول", "مغلق", "مرفوض"] as const;
type ComplaintStatus = typeof VALID_STATUSES[number];

const LIFECYCLE_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  "جديدة":          ["مستلمة", "مرفوض"],
  "مستلمة":         ["جاري المعالجة", "مصعدة", "مرفوض"],
  "جاري المعالجة":  ["محلول", "مصعدة", "تصعيد إداري"],
  "مصعدة":          ["تصعيد إداري", "جاري المعالجة"],
  "تصعيد إداري":    ["محلول", "جاري المعالجة"],
  "محلول":          ["مغلق", "جاري المعالجة"],
  "مغلق":           [],
  "مرفوض":          [],
};

router.put("/:id/status", requireAuth, requireRole("Customer Service Agent", "Manager/Voter", "Manager"), validateBody(UpdateComplaintStatusBody), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const { status, note } = req.body;
    if (!status) { res.status(400).json({ error: "status is required" }); return; }
    if (!VALID_STATUSES.includes(status as ComplaintStatus)) {
      res.status(400).json({ error: `Invalid status: ${status}`, valid: VALID_STATUSES });
      return;
    }

    const [current] = await db.select({ status: complaintsTable.status }).from(complaintsTable).where(eq(complaintsTable.id, id)).limit(1);
    if (!current) { res.status(404).json({ error: "Complaint not found" }); return; }

    const currentStatus = current.status as ComplaintStatus;
    const allowed = LIFECYCLE_TRANSITIONS[currentStatus] ?? [];
    const userRole = req.user!.roleName;
    const isManager = userRole === "Manager" || userRole === "Manager/Voter";

    if (!isManager && !allowed.includes(status as ComplaintStatus)) {
      res.status(422).json({
        error: `Invalid transition from '${currentStatus}' to '${status}'`,
        allowed_transitions: allowed,
      });
      return;
    }

    const updateData: Record<string, unknown> = { status };
    if (status === "مستلمة") updateData.assigned_to_id = req.user!.userId;
    if (status === "محلول") {
      updateData.resolved_at = new Date();
      updateData.resolved_by = req.user!.userId;
    }

    await db.update(complaintsTable).set(updateData).where(eq(complaintsTable.id, id));
    await logComplaintAction(id, `تغيير الحالة إلى: ${status}`, req.user!.userId, note);

    const [complaint] = await db.select().from(complaintsTable).where(eq(complaintsTable.id, id)).limit(1);
    res.json(complaint);
  } catch (err) {
    req.log.error({ err }, "Update complaint status error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/:id/transfer", requireAuth, requireRole("Manager/Voter", "Manager"), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const { target_user_id, note } = req.body;
    if (!target_user_id) { res.status(400).json({ error: "target_user_id is required" }); return; }

    await db.update(complaintsTable).set({ assigned_to_id: target_user_id }).where(eq(complaintsTable.id, id));
    await logComplaintAction(id, "نقل الشكوى", req.user!.userId, note ?? `تم النقل إلى المستخدم #${target_user_id}`);
    await notifyUsers([target_user_id], "transfer", "تم تحويل شكوى إليك", `الشكوى #${id} تم تحويلها إليك`, `/complaints/${id}`);

    res.json({ success: true, message: "Complaint transferred" });
  } catch (err) {
    req.log.error({ err }, "Transfer complaint error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/:id/escalate", requireAuth, requireRole("Manager/Voter", "Manager"), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const { note } = req.body;

    await db.update(complaintsTable).set({ escalated_to_id: req.user!.userId, status: "تصعيد إداري" }).where(eq(complaintsTable.id, id));
    await logComplaintAction(id, "تصعيد إداري", req.user!.userId, note ?? "تم التصعيد للإدارة");

    const managers = await db.select({ id: usersTable.id }).from(usersTable);
    await notifyUsers(managers.map(m => m.id), "escalation", "تصعيد إداري", `الشكوى #${id} تم تصعيدها`, `/complaints/${id}`);

    res.json({ success: true, message: "Complaint escalated" });
  } catch (err) {
    req.log.error({ err }, "Escalate complaint error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/:id/logs", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const logs = await db
      .select({
        id: complaintLogsTable.id,
        complaint_id: complaintLogsTable.complaint_id,
        action: complaintLogsTable.action,
        user_id: complaintLogsTable.user_id,
        user_name: usersTable.name,
        note: complaintLogsTable.note,
        timestamp: complaintLogsTable.timestamp,
      })
      .from(complaintLogsTable)
      .leftJoin(usersTable, eq(complaintLogsTable.user_id, usersTable.id))
      .where(eq(complaintLogsTable.complaint_id, id))
      .orderBy(complaintLogsTable.timestamp);
    res.json({ data: logs });
  } catch (err) {
    req.log.error({ err }, "Get complaint logs error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/:id/feedback", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const { rating, comment } = req.body;
    if (rating === undefined) { res.status(400).json({ error: "rating is required" }); return; }
    const [feedback] = await db.insert(feedbackTable).values({ complaint_id: id, rating, comment }).returning();
    res.status(201).json(feedback);
  } catch (err) {
    req.log.error({ err }, "Add feedback error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
