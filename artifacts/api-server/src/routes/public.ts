import { Router } from "express";
import { db } from "@workspace/db";
import {
  settingsTable,
  complaintTypesTable,
  complaintsTable,
  customersTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

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

router.post("/complaints", async (req, res) => {
  try {
    const body = req.body as {
      customer_name?: string;
      customer_phone?: string;
      customer_email?: string;
      customer_national_id?: string;
      customer_address?: string;
      customer_governorate?: string;
      type_id?: number;
      description?: string;
      fields_values?: Record<string, unknown>;
      date?: string;
    };

    if (!body.customer_name?.trim()) {
      return res.status(400).json({ error: "اسم العميل مطلوب" });
    }
    if (!body.type_id) {
      return res.status(400).json({ error: "نوع الشكوى مطلوب" });
    }

    const [type] = await db
      .select()
      .from(complaintTypesTable)
      .where(and(eq(complaintTypesTable.id, body.type_id), eq(complaintTypesTable.is_active, true)))
      .limit(1);

    if (!type) {
      return res.status(400).json({ error: "نوع الشكوى غير موجود" });
    }

    let customerId: number;
    const phoneVal = body.customer_phone?.trim();
    const existingCustomers = phoneVal
      ? await db
          .select()
          .from(customersTable)
          .where(eq(customersTable.phone, phoneVal))
          .limit(1)
      : [];

    if (existingCustomers.length > 0) {
      customerId = existingCustomers[0].id;
    } else {
      const code = `PUB-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const [newCustomer] = await db
        .insert(customersTable)
        .values({
          code,
          name: body.customer_name.trim(),
          phone: phoneVal ?? "غير محدد",
          type: "عميل بوابة",
          governorate: body.customer_governorate?.trim() ?? "غير محدد",
          address: body.customer_address?.trim() ?? undefined,
        })
        .returning({ id: customersTable.id });
      customerId = newCustomer.id;
    }

    const complaintDate = body.date ? new Date(body.date) : new Date();

    const [complaint] = await db
      .insert(complaintsTable)
      .values({
        customer_id: customerId,
        type_id: body.type_id,
        channel: "بوابة إلكترونية",
        priority: "عادية",
        description:
          body.description?.trim() ||
          `شكوى عبر البوابة الإلكترونية - ${type.name}`,
        fields_values: body.fields_values ?? {},
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
