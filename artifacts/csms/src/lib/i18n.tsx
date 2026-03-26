import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'ar' | 'en';

interface TranslationContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRtl: boolean;
}

const translations: Record<string, Record<Language, string>> = {
  // Navigation & Common
  'nav.dashboard': { ar: 'لوحة التحكم', en: 'Dashboard' },
  'nav.customers': { ar: 'العملاء', en: 'Customers' },
  'nav.complaints': { ar: 'الشكاوى', en: 'Complaints' },
  'nav.invoices': { ar: 'الفواتير', en: 'Invoices' },
  'nav.followUps': { ar: 'متابعة الفواتير', en: 'Follow-ups' },
  'nav.analytics': { ar: 'التقارير', en: 'Analytics' },
  'nav.settings': { ar: 'الإعدادات', en: 'Settings' },
  'nav.profile': { ar: 'الملف الشخصي', en: 'Profile' },
  'nav.logout': { ar: 'تسجيل الخروج', en: 'Logout' },
  'common.save': { ar: 'حفظ', en: 'Save' },
  'common.cancel': { ar: 'إلغاء', en: 'Cancel' },
  'common.actions': { ar: 'إجراءات', en: 'Actions' },
  'common.search': { ar: 'بحث...', en: 'Search...' },
  'common.loading': { ar: 'جاري التحميل...', en: 'Loading...' },
  
  // Dashboard
  'dashboard.newComplaints': { ar: 'شكاوى جديدة', en: 'New Complaints' },
  'dashboard.receivedComplaints': { ar: 'شكاوى قيد المعالجة', en: 'Received Complaints' },
  'dashboard.closedComplaints': { ar: 'شكاوى مغلقة', en: 'Closed Complaints' },
  'dashboard.untrackedInvoices': { ar: 'فواتير غير متابعة', en: 'Untracked Invoices' },
  'dashboard.trend': { ar: 'معدل الشكاوى', en: 'Complaints Trend' },
  
  // Customers
  'customers.title': { ar: 'إدارة العملاء', en: 'Customer Management' },
  'customers.add': { ar: 'إضافة عميل', en: 'Add Customer' },
  'customers.import': { ar: 'استيراد CSV', en: 'Import CSV' },
  'customers.code': { ar: 'الكود', en: 'Code' },
  'customers.name': { ar: 'الاسم', en: 'Name' },
  'customers.phone': { ar: 'رقم الهاتف', en: 'Phone' },
  'customers.type': { ar: 'النوع', en: 'Type' },
  'customers.branch': { ar: 'الفرع', en: 'Branch' },
  
  // Complaints
  'complaints.title': { ar: 'إدارة الشكاوى', en: 'Complaints Management' },
  'complaints.add': { ar: 'إنشاء شكوى', en: 'New Complaint' },
  'complaints.status': { ar: 'الحالة', en: 'Status' },
  'complaints.priority': { ar: 'الأولوية', en: 'Priority' },
  'complaints.date': { ar: 'التاريخ', en: 'Date' },
  
  // Copyright
  'copyright.text': { ar: 'جميع حقوق الطباعة والنشر محفوظة', en: 'All Rights Reserved' },
  'copyright.developer': { ar: 'المطور', en: 'Developer' },
  
  // Auth
  'auth.login': { ar: 'تسجيل الدخول', en: 'Login' },
  'auth.email': { ar: 'البريد الإلكتروني', en: 'Email' },
  'auth.password': { ar: 'كلمة المرور', en: 'Password' },
  'auth.welcome': { ar: 'مرحباً بك في نظام خدمة العملاء', en: 'Welcome to CSMS' },
};

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('ar');

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string) => {
    return translations[key]?.[language] || key;
  };

  return (
    <TranslationContext.Provider value={{ language, setLanguage, t, isRtl: language === 'ar' }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) throw new Error('useTranslation must be used within TranslationProvider');
  return context;
}
