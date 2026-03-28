export const PERMISSIONS = [
  "view:dashboard",
  "view:complaints",
  "create:complaints",
  "assign:complaints",
  "resolve:complaints",
  "escalate:complaints",
  "view:customers",
  "create:customers",
  "view:invoices",
  "create:invoices",
  "view:follow-ups",
  "create:follow-ups",
  "view:analytics",
  "view:reports",
  "view:employees-performance",
  "manage:users",
  "manage:roles",
  "manage:settings",
  "manage:branches",
  "manage:products",
  "manage:complaint-types",
  "import:data",
  "export:data",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_GROUPS: { label: string; permissions: Permission[] }[] = [
  {
    label: "لوحة القيادة والتقارير",
    permissions: ["view:dashboard", "view:analytics", "view:reports", "view:employees-performance"],
  },
  {
    label: "الشكاوى",
    permissions: [
      "view:complaints",
      "create:complaints",
      "assign:complaints",
      "resolve:complaints",
      "escalate:complaints",
    ],
  },
  {
    label: "العملاء",
    permissions: ["view:customers", "create:customers"],
  },
  {
    label: "الفواتير والمتابعات",
    permissions: ["view:invoices", "create:invoices", "view:follow-ups", "create:follow-ups"],
  },
  {
    label: "الإدارة",
    permissions: [
      "manage:users",
      "manage:roles",
      "manage:settings",
      "manage:branches",
      "manage:products",
      "manage:complaint-types",
      "import:data",
      "export:data",
    ],
  },
];

export const PERMISSION_LABELS: Record<Permission, string> = {
  "view:dashboard": "عرض لوحة القيادة",
  "view:complaints": "عرض الشكاوى",
  "create:complaints": "إنشاء شكاوى",
  "assign:complaints": "تعيين الشكاوى",
  "resolve:complaints": "حل الشكاوى",
  "escalate:complaints": "تصعيد الشكاوى",
  "view:customers": "عرض العملاء",
  "create:customers": "إنشاء عملاء",
  "view:invoices": "عرض الفواتير",
  "create:invoices": "إنشاء فواتير",
  "view:follow-ups": "عرض المتابعات",
  "create:follow-ups": "إنشاء متابعات",
  "view:analytics": "عرض التحليلات",
  "view:reports": "عرض التقارير",
  "view:employees-performance": "عرض أداء الموظفين",
  "manage:users": "إدارة المستخدمين",
  "manage:roles": "إدارة الأدوار",
  "manage:settings": "إدارة الإعدادات",
  "manage:branches": "إدارة الفروع",
  "manage:products": "إدارة المنتجات",
  "manage:complaint-types": "إدارة أنواع الشكاوى",
  "import:data": "استيراد البيانات",
  "export:data": "تصدير البيانات",
};

export const LOCKED_ROLES = ["Manager", "Manager/Voter"];
