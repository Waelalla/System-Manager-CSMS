import { db } from "./index.js";
import { rolesTable, usersTable, branchesTable, productsTable, complaintTypesTable, settingsTable } from "./schema/index.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("🌱 Seeding database...");

  const ROLES = [
    { name: "Customer Service Agent" },
    { name: "Accountant" },
    { name: "Manager" },
    { name: "Manager/Voter" },
    { name: "Maintenance Engineer" },
  ];

  const roleMap: Record<string, number> = {};
  for (const role of ROLES) {
    const existing = await db.select().from(rolesTable).where(eq(rolesTable.name, role.name)).limit(1);
    if (existing.length === 0) {
      const [r] = await db.insert(rolesTable).values({ name: role.name, permissions: [] }).returning();
      roleMap[role.name] = r.id;
      console.log(`  ✓ Created role: ${role.name}`);
    } else {
      roleMap[role.name] = existing[0].id;
      console.log(`  - Role exists: ${role.name}`);
    }
  }

  const BRANCHES = [
    { name: "فرع القاهرة", address: "القاهرة، مصر", governorate: "القاهرة" },
    { name: "فرع الإسكندرية", address: "الإسكندرية، مصر", governorate: "الإسكندرية" },
    { name: "فرع الجيزة", address: "الجيزة، مصر", governorate: "الجيزة" },
  ];
  for (const branch of BRANCHES) {
    const existing = await db.select().from(branchesTable).where(eq(branchesTable.name, branch.name)).limit(1);
    if (existing.length === 0) {
      await db.insert(branchesTable).values(branch);
      console.log(`  ✓ Created branch: ${branch.name}`);
    } else {
      console.log(`  - Branch exists: ${branch.name}`);
    }
  }

  const PRODUCTS = [
    { name: "غسالة أوتوماتيك", category: "أجهزة كهربائية" },
    { name: "ثلاجة", category: "أجهزة كهربائية" },
    { name: "تكييف", category: "أجهزة تكييف" },
    { name: "بوتاجاز", category: "أجهزة منزلية" },
    { name: "شاشة تلفزيون", category: "أجهزة إلكترونية" },
  ];
  for (const product of PRODUCTS) {
    const existing = await db.select().from(productsTable).where(eq(productsTable.name, product.name)).limit(1);
    if (existing.length === 0) {
      await db.insert(productsTable).values({ name: product.name, category: product.category, attributes: null });
      console.log(`  ✓ Created product: ${product.name}`);
    } else {
      console.log(`  - Product exists: ${product.name}`);
    }
  }

  const COMPLAINT_TYPES = [
    { name: "عطل فني", fields: [{ label: "وصف العطل", type: "text", required: true }] },
    { name: "استفسار", fields: [{ label: "موضوع الاستفسار", type: "text", required: true }] },
    { name: "شكوى خدمة", fields: [{ label: "اسم الموظف", type: "text", required: false }] },
    { name: "طلب صيانة", fields: [{ label: "نوع الجهاز", type: "text", required: true }, { label: "تاريخ الشراء", type: "date", required: false }] },
    { name: "شكوى فاتورة", fields: [{ label: "رقم الفاتورة", type: "text", required: true }] },
  ];
  for (const ct of COMPLAINT_TYPES) {
    const existing = await db.select().from(complaintTypesTable).where(eq(complaintTypesTable.name, ct.name)).limit(1);
    if (existing.length === 0) {
      await db.insert(complaintTypesTable).values({ name: ct.name, fields: ct.fields });
      console.log(`  ✓ Created complaint type: ${ct.name}`);
    } else {
      console.log(`  - Complaint type exists: ${ct.name}`);
    }
  }

  const SETTINGS = [
    { key: "company_name", value: "نظام إدارة خدمة العملاء" },
    { key: "company_name_en", value: "Customer Service Management System" },
    { key: "default_language", value: "ar" },
    { key: "theme", value: "dark" },
  ];
  for (const setting of SETTINGS) {
    const existing = await db.select().from(settingsTable).where(eq(settingsTable.key, setting.key)).limit(1);
    if (existing.length === 0) {
      await db.insert(settingsTable).values({ key: setting.key, value: setting.value });
      console.log(`  ✓ Created setting: ${setting.key}`);
    }
  }

  const managerRoleId = roleMap["Manager"];
  const USERS = [
    { name: "Wael", email: "wael@system.com", password: "123", role_id: managerRoleId },
  ];
  for (const user of USERS) {
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, user.email)).limit(1);
    if (existing.length === 0) {
      const hash = await bcrypt.hash(user.password, 10);
      await db.insert(usersTable).values({ name: user.name, email: user.email, password_hash: hash, role_id: user.role_id, active: true });
      console.log(`  ✓ Created user: ${user.email}`);
    } else {
      console.log(`  - User exists: ${user.email}`);
    }
  }

  console.log("✅ Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed error:", err);
  process.exit(1);
});
