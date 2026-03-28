import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db } from "@workspace/db";
import {
  settingsTable,
  complaintTypesTable,
  complaintsTable,
  customersTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `pub-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpg|jpeg|png|gif|webp|pdf|doc|docx/i;
    const ext = path.extname(file.originalname).slice(1);
    cb(null, allowed.test(ext));
  },
});

router.get("/settings", async (req, res) => {
  try {
    const all = await db.select().from(settingsTable);
    const map = Object.fromEntries(all.map((r) => [r.key, r.value]));
    res.json({
      company_name: map.company_name ?? "نظام إدارة خدمة العملاء",
      company_logo: map.company_logo ?? "",
      primary_color: map.primary_color ?? "#6366f1",
      public_form_fields: map.public_form_fields ?? ["name", "phone", "complaint_type", "date"],
    });
  } catch (err) {
    req.log.error({ err }, "Public settings error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/complaint-types", async (req, res) => {
  try {
    const types = await db
      .select({
        id: complaintTypesTable.id,
        name: complaintTypesTable.name,
        description: complaintTypesTable.description,
        fields: complaintTypesTable.fields,
        success_message: complaintTypesTable.success_message,
      })
      .from(complaintTypesTable)
      .where(eq(complaintTypesTable.is_active, true));
    res.json({ data: types });
  } catch (err) {
    req.log.error({ err }, "Public complaint types error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/complaints", upload.single("file"), async (req, res) => {
  try {
    const body = req.body as {
      customer_name?: string;
      customer_phone?: string;
      customer_email?: string;
      customer_national_id?: string;
      customer_address?: string;
      customer_governorate?: string;
      type_id?: string | number;
      description?: string;
      fields_values?: string;
      date?: string;
    };

    if (!body.customer_name?.trim()) {
      return res.status(400).json({ error: "اسم العميل مطلوب" });
    }
    const typeId = body.type_id ? Number(body.type_id) : 0;
    if (!typeId) {
      return res.status(400).json({ error: "نوع الشكوى مطلوب" });
    }

    const [type] = await db
      .select()
      .from(complaintTypesTable)
      .where(and(eq(complaintTypesTable.id, typeId), eq(complaintTypesTable.is_active, true)))
      .limit(1);

    if (!type) {
      return res.status(400).json({ error: "نوع الشكوى غير موجود" });
    }

    let fieldsValues: Record<string, unknown> = {};
    if (body.fields_values) {
      try {
        fieldsValues = JSON.parse(body.fields_values) as Record<string, unknown>;
      } catch {
        fieldsValues = {};
      }
    }

    if (req.file) {
      const fileUrl = `/api/uploads/${req.file.filename}`;
      fieldsValues["_uploaded_file"] = fileUrl;
      fieldsValues["_uploaded_file_name"] = req.file.originalname;
    }

    let customerId: number;
    const phoneVal = body.customer_phone?.trim();
    const emailVal = body.customer_email?.trim();
    const existingCustomers = phoneVal
      ? await db
          .select()
          .from(customersTable)
          .where(eq(customersTable.phone, phoneVal))
          .limit(1)
      : [];

    if (existingCustomers.length > 0) {
      customerId = existingCustomers[0].id;
      if (emailVal) {
        const existing = existingCustomers[0];
        const existingExtra = (existing.extra as Record<string, unknown>) ?? {};
        if (!existingExtra.email) {
          await db
            .update(customersTable)
            .set({ extra: { ...existingExtra, email: emailVal } })
            .where(eq(customersTable.id, customerId));
        }
      }
    } else {
      const code = `PUB-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const extraData: Record<string, unknown> = {};
      if (emailVal) extraData.email = emailVal;
      if (body.customer_national_id?.trim()) extraData.national_id = body.customer_national_id.trim();

      const [newCustomer] = await db
        .insert(customersTable)
        .values({
          code,
          name: body.customer_name.trim(),
          phone: phoneVal ?? "غير محدد",
          type: "عميل بوابة",
          governorate: body.customer_governorate?.trim() ?? "غير محدد",
          address: body.customer_address?.trim() ?? undefined,
          extra: Object.keys(extraData).length > 0 ? extraData : undefined,
        })
        .returning({ id: customersTable.id });
      customerId = newCustomer.id;
    }

    const complaintDate = body.date ? new Date(body.date) : new Date();

    const [complaint] = await db
      .insert(complaintsTable)
      .values({
        customer_id: customerId,
        type_id: typeId,
        channel: "بوابة إلكترونية",
        priority: "عادية",
        description:
          body.description?.trim() ||
          `شكوى عبر البوابة الإلكترونية - ${type.name}`,
        fields_values: fieldsValues,
        status: "جديدة",
        created_at: complaintDate,
      })
      .returning({ id: complaintsTable.id });

    const refNumber = `PUB-${String(complaint.id).padStart(6, "0")}`;

    res.status(201).json({
      success: true,
      complaint_id: complaint.id,
      reference_number: refNumber,
      success_message: type.success_message ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Public complaint submit error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
