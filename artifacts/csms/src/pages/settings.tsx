import { useState, useRef } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Save, Building2, Users, Tags, GitBranch, Upload,
  CheckCircle2, AlertCircle, Mail, Star, Palette, Shield
} from 'lucide-react';
import {
  useGetSettings, useUpsertSettings,
  useListUsers, useListComplaintTypes, useListBranches
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

type Section = 'company' | 'users' | 'types' | 'branches' | 'import' | 'email' | 'points' | 'appearance' | 'security';

interface ImportResult {
  added_customers?: number;
  updated_customers?: number;
  added_invoices?: number;
  duplicate_invoices?: number;
  warnings?: { row?: number; field?: string; reason?: string }[];
  errors?: string[];
}

type SettingsRecord = Record<string, string | number | boolean | undefined>;

export default function Settings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [section, setSection] = useState<Section>('company');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<'customers_only' | 'customers_and_invoices'>('customers_only');
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const { data: rawSettings } = useGetSettings();
  const settings = (rawSettings as unknown as SettingsRecord) ?? {};
  const { mutateAsync: upsert } = useUpsertSettings();
  const { data: usersData } = useListUsers(undefined, { query: { queryKey: ['listUsers'], enabled: section === 'users' } });
  const { data: typesData } = useListComplaintTypes({ query: { queryKey: ['listComplaintTypes'], enabled: section === 'types' } });
  const { data: branchesData } = useListBranches({ query: { queryKey: ['listBranches'], enabled: section === 'branches' } });

  const [form, setForm] = useState({
    company_name: String(settings.company_name ?? ''),
    company_email: String(settings.company_email ?? ''),
    company_address: String(settings.company_address ?? ''),
    timezone: String(settings.timezone ?? 'Africa/Cairo'),
    language: String(settings.language ?? 'ar'),
    emailjs_service_id: String(settings.emailjs_service_id ?? ''),
    emailjs_template_id: String(settings.emailjs_template_id ?? ''),
    emailjs_public_key: String(settings.emailjs_public_key ?? ''),
    notify_on_new_complaint: settings.notify_on_new_complaint !== false,
    notify_on_escalation: settings.notify_on_escalation !== false,
    points_follow_up: String(settings.points_follow_up ?? '10'),
    points_resolve_complaint: String(settings.points_resolve_complaint ?? '20'),
    points_close_complaint: String(settings.points_close_complaint ?? '5'),
    points_escalation_penalty: String(settings.points_escalation_penalty ?? '5'),
    theme: String(settings.theme ?? 'dark'),
    accent_color: String(settings.accent_color ?? '#6366f1'),
    session_timeout_minutes: String(settings.session_timeout_minutes ?? '60'),
    max_login_attempts: String(settings.max_login_attempts ?? '5'),
    require_2fa: settings.require_2fa === true,
    google_oauth_client_id: String(settings.google_oauth_client_id ?? ''),
  });

  const handleSave = async (extra?: Partial<typeof form>) => {
    try {
      await upsert({ data: { settings: { ...form, ...extra } } });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({ title: 'تم الحفظ', description: 'تم حفظ الإعدادات بنجاح' });
    } catch {
      toast({ title: 'خطأ', description: 'فشل في حفظ الإعدادات', variant: 'destructive' });
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setImportResult(null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', importMode);
    const accessToken = localStorage.getItem('access_token');
    try {
      const res = await fetch('/api/import/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });
      const json = await res.json() as ImportResult & { error?: string };
      if (!res.ok) throw new Error(json.error || 'فشل الاستيراد');
      setImportResult(json);
      toast({ title: 'تم الاستيراد', description: `تم إضافة ${json.added_customers ?? 0} عميل و${json.added_invoices ?? 0} فاتورة` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ';
      toast({ title: 'خطأ', description: msg, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const navItems = [
    { id: 'company' as Section, label: 'معلومات الشركة', icon: Building2 },
    { id: 'users' as Section, label: 'إدارة المستخدمين', icon: Users },
    { id: 'types' as Section, label: 'أنواع الشكاوى', icon: Tags },
    { id: 'branches' as Section, label: 'الفروع', icon: GitBranch },
    { id: 'email' as Section, label: 'البريد الإلكتروني', icon: Mail },
    { id: 'points' as Section, label: 'نظام النقاط', icon: Star },
    { id: 'appearance' as Section, label: 'المظهر', icon: Palette },
    { id: 'security' as Section, label: 'الأمان', icon: Shield },
    { id: 'import' as Section, label: 'استيراد CSV', icon: Upload },
  ];

  const users = usersData?.data ?? [];
  const types = typesData?.data ?? [];
  const branches = branchesData?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('nav.settings')}</h1>
        <p className="text-muted-foreground mt-1">إعدادات النظام والتحكم العام</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="col-span-1 bg-card rounded-2xl border-border/50 shadow-lg p-2 h-fit">
          <div className="space-y-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={`w-full text-right px-4 py-3 rounded-xl flex items-center gap-2 text-sm transition-colors ${
                  section === item.id
                    ? 'bg-primary/10 text-primary font-bold'
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground font-medium'
                }`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </button>
            ))}
          </div>
        </Card>

        <Card className="col-span-1 md:col-span-3 bg-card rounded-2xl border-border/50 shadow-lg">
          <CardContent className="p-8">

            {section === 'company' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold">معلومات الشركة الأساسية</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">اسم الشركة</label>
                    <Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} className="h-12 bg-background/50 rounded-xl" placeholder="Customer Service Enterprise" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">البريد الرسمي</label>
                    <Input value={form.company_email} onChange={e => setForm(f => ({ ...f, company_email: e.target.value }))} dir="ltr" className="h-12 bg-background/50 rounded-xl text-right" placeholder="support@company.com" />
                  </div>
                  <div className="space-y-2 col-span-1 md:col-span-2">
                    <label className="text-sm font-medium">العنوان</label>
                    <Input value={form.company_address} onChange={e => setForm(f => ({ ...f, company_address: e.target.value }))} className="h-12 bg-background/50 rounded-xl" placeholder="القاهرة، مصر" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">المنطقة الزمنية</label>
                    <select
                      value={form.timezone}
                      onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}
                      className="w-full h-12 bg-background/50 border border-input rounded-xl px-3 text-sm text-foreground"
                    >
                      <option value="Africa/Cairo">Africa/Cairo (EET)</option>
                      <option value="Asia/Riyadh">Asia/Riyadh (AST)</option>
                      <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                      <option value="Europe/London">Europe/London (GMT)</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">لغة النظام الافتراضية</label>
                    <select
                      value={form.language}
                      onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                      className="w-full h-12 bg-background/50 border border-input rounded-xl px-3 text-sm text-foreground"
                    >
                      <option value="ar">العربية</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                </div>
                <div className="pt-6 border-t border-border/50 flex justify-end">
                  <Button onClick={() => handleSave()} className="rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 h-12 px-8">
                    <Save className="w-4 h-4 mr-2" /> حفظ التغييرات
                  </Button>
                </div>
              </div>
            )}

            {section === 'users' && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold">إدارة المستخدمين</h2>
                <div className="rounded-xl border border-border/50 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="text-right p-4 font-medium">الاسم</th>
                        <th className="text-right p-4 font-medium">البريد</th>
                        <th className="text-right p-4 font-medium">الدور</th>
                        <th className="text-right p-4 font-medium">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {users.map((user: { id: number; name: string; email: string; role_name?: string; is_active?: boolean }) => (
                        <tr key={user.id} className="hover:bg-muted/20">
                          <td className="p-4 font-medium">{user.name}</td>
                          <td className="p-4 text-muted-foreground dir-ltr">{user.email}</td>
                          <td className="p-4">
                            <span className="px-2 py-1 rounded-lg text-xs bg-primary/10 text-primary">{user.role_name ?? 'غير محدد'}</span>
                          </td>
                          <td className="p-4">
                            <span className={`w-2 h-2 rounded-full inline-block ${user.is_active ? 'bg-green-500' : 'bg-muted-foreground'}`}></span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {section === 'types' && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold">أنواع الشكاوى</h2>
                <div className="rounded-xl border border-border/50 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="text-right p-4 font-medium">#</th>
                        <th className="text-right p-4 font-medium">اسم النوع</th>
                        <th className="text-right p-4 font-medium">الوصف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {types.map((tp: { id: number; name: string; description?: string }, i: number) => (
                        <tr key={tp.id} className="hover:bg-muted/20">
                          <td className="p-4 text-muted-foreground">{i + 1}</td>
                          <td className="p-4 font-medium">{tp.name}</td>
                          <td className="p-4 text-muted-foreground text-xs">{tp.description ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {section === 'branches' && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold">إدارة الفروع</h2>
                <div className="rounded-xl border border-border/50 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="text-right p-4 font-medium">الفرع</th>
                        <th className="text-right p-4 font-medium">المحافظة</th>
                        <th className="text-right p-4 font-medium">العنوان</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {branches.map((b: { id: number; name: string; governorate?: string; address?: string }) => (
                        <tr key={b.id} className="hover:bg-muted/20">
                          <td className="p-4 font-medium">{b.name}</td>
                          <td className="p-4 text-muted-foreground">{b.governorate ?? '-'}</td>
                          <td className="p-4 text-muted-foreground text-xs">{b.address ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {section === 'email' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold">إعدادات البريد الإلكتروني</h2>
                  <p className="text-sm text-muted-foreground mt-1">إعداد EmailJS لإرسال الإشعارات والتنبيهات عبر البريد الإلكتروني</p>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">معرّف الخدمة (Service ID)</label>
                    <Input
                      dir="ltr"
                      value={form.emailjs_service_id}
                      onChange={e => setForm(f => ({ ...f, emailjs_service_id: e.target.value }))}
                      className="h-12 bg-background/50 rounded-xl font-mono"
                      placeholder="service_xxxxxxx"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">معرّف القالب (Template ID)</label>
                    <Input
                      dir="ltr"
                      value={form.emailjs_template_id}
                      onChange={e => setForm(f => ({ ...f, emailjs_template_id: e.target.value }))}
                      className="h-12 bg-background/50 rounded-xl font-mono"
                      placeholder="template_xxxxxxx"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">المفتاح العام (Public Key)</label>
                    <Input
                      dir="ltr"
                      value={form.emailjs_public_key}
                      onChange={e => setForm(f => ({ ...f, emailjs_public_key: e.target.value }))}
                      className="h-12 bg-background/50 rounded-xl font-mono"
                      placeholder="xxxxxxxxxxxxxxxx"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-base font-semibold">أحداث الإشعار</h3>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.notify_on_new_complaint}
                      onChange={e => setForm(f => ({ ...f, notify_on_new_complaint: e.target.checked }))}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">إرسال بريد عند تسجيل شكوى جديدة</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.notify_on_escalation}
                      onChange={e => setForm(f => ({ ...f, notify_on_escalation: e.target.checked }))}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">إرسال بريد عند تصعيد الشكوى</span>
                  </label>
                </div>
                <div className="bg-muted/20 rounded-xl p-4">
                  <p className="text-xs text-muted-foreground">احصل على بيانات الاعتماد من <span className="text-primary font-medium">emailjs.com</span> — أنشئ حساباً مجانياً، أضف خدمة بريد، ثم انسخ المعرّفات هنا.</p>
                </div>
                <div className="pt-4 border-t border-border/50 flex justify-end">
                  <Button onClick={() => handleSave()} className="rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 h-12 px-8">
                    <Save className="w-4 h-4 mr-2" /> حفظ الإعدادات
                  </Button>
                </div>
              </div>
            )}

            {section === 'points' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold">نظام نقاط الأداء</h2>
                  <p className="text-sm text-muted-foreground mt-1">تحديد عدد النقاط الممنوحة أو المخصومة لكل إجراء في النظام</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">نقاط المتابعة (follow-up)</label>
                    <Input
                      type="number"
                      min="0"
                      value={form.points_follow_up}
                      onChange={e => setForm(f => ({ ...f, points_follow_up: e.target.value }))}
                      className="h-12 bg-background/50 rounded-xl"
                      placeholder="10"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">نقاط حل الشكوى</label>
                    <Input
                      type="number"
                      min="0"
                      value={form.points_resolve_complaint}
                      onChange={e => setForm(f => ({ ...f, points_resolve_complaint: e.target.value }))}
                      className="h-12 bg-background/50 rounded-xl"
                      placeholder="20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">نقاط إغلاق الشكوى</label>
                    <Input
                      type="number"
                      min="0"
                      value={form.points_close_complaint}
                      onChange={e => setForm(f => ({ ...f, points_close_complaint: e.target.value }))}
                      className="h-12 bg-background/50 rounded-xl"
                      placeholder="5"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-red-400">خصم نقاط عند التصعيد</label>
                    <Input
                      type="number"
                      min="0"
                      value={form.points_escalation_penalty}
                      onChange={e => setForm(f => ({ ...f, points_escalation_penalty: e.target.value }))}
                      className="h-12 bg-background/50 rounded-xl border-red-500/30"
                      placeholder="5"
                    />
                  </div>
                </div>
                <div className="bg-muted/20 rounded-xl p-4">
                  <p className="text-xs text-muted-foreground">تُستخدم النقاط لقياس أداء الموظفين. يتم تجميعها في لوحة التحليلات ضمن تقرير الأداء.</p>
                </div>
                <div className="pt-4 border-t border-border/50 flex justify-end">
                  <Button onClick={() => handleSave()} className="rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 h-12 px-8">
                    <Save className="w-4 h-4 mr-2" /> حفظ الإعدادات
                  </Button>
                </div>
              </div>
            )}

            {section === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold">إعدادات المظهر</h2>
                  <p className="text-sm text-muted-foreground mt-1">تخصيص مظهر النظام ولون التمييز</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">السمة الافتراضية</label>
                    <div className="flex gap-3">
                      {[
                        { value: 'dark', label: 'داكن (Dark)', desc: 'خلفية غامقة مريحة للعين' },
                        { value: 'light', label: 'فاتح (Light)', desc: 'خلفية بيضاء كلاسيكية' },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setForm(f => ({ ...f, theme: opt.value }))}
                          className={`flex-1 px-4 py-4 rounded-xl border text-sm text-right transition-all ${
                            form.theme === opt.value
                              ? 'bg-primary/10 border-primary/60 text-primary'
                              : 'border-border/50 text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          <div className="font-medium">{opt.label}</div>
                          <div className="text-xs mt-1 opacity-70">{opt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">لون التمييز (Accent Color)</label>
                    <div className="flex items-center gap-4">
                      <input
                        type="color"
                        value={form.accent_color}
                        onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))}
                        className="h-12 w-24 rounded-xl border border-input bg-background cursor-pointer"
                      />
                      <Input
                        dir="ltr"
                        value={form.accent_color}
                        onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))}
                        className="h-12 bg-background/50 rounded-xl font-mono w-40"
                        placeholder="#6366f1"
                      />
                      <div className="flex gap-2">
                        {['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'].map(c => (
                          <button
                            key={c}
                            onClick={() => setForm(f => ({ ...f, accent_color: c }))}
                            className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                            style={{ backgroundColor: c, borderColor: form.accent_color === c ? 'white' : 'transparent' }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t border-border/50 flex justify-end">
                  <Button onClick={() => handleSave()} className="rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 h-12 px-8">
                    <Save className="w-4 h-4 mr-2" /> حفظ التغييرات
                  </Button>
                </div>
              </div>
            )}

            {section === 'security' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold">إعدادات الأمان</h2>
                  <p className="text-sm text-muted-foreground mt-1">التحكم في سياسات الأمان وتسجيل الدخول</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">مهلة الجلسة (بالدقائق)</label>
                    <Input
                      type="number"
                      min="15"
                      max="1440"
                      value={form.session_timeout_minutes}
                      onChange={e => setForm(f => ({ ...f, session_timeout_minutes: e.target.value }))}
                      className="h-12 bg-background/50 rounded-xl"
                      placeholder="60"
                    />
                    <p className="text-xs text-muted-foreground">يُسجَّل المستخدم خارجاً تلقائياً بعد هذه المدة من عدم النشاط</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">أقصى محاولات تسجيل دخول فاشلة</label>
                    <Input
                      type="number"
                      min="3"
                      max="20"
                      value={form.max_login_attempts}
                      onChange={e => setForm(f => ({ ...f, max_login_attempts: e.target.value }))}
                      className="h-12 bg-background/50 rounded-xl"
                      placeholder="5"
                    />
                    <p className="text-xs text-muted-foreground">يُوقَف الحساب مؤقتاً بعد هذا العدد من المحاولات الفاشلة</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl border border-border/50 hover:bg-muted/20">
                    <input
                      type="checkbox"
                      checked={form.require_2fa}
                      onChange={e => setForm(f => ({ ...f, require_2fa: e.target.checked }))}
                      className="w-4 h-4 rounded"
                    />
                    <div>
                      <span className="text-sm font-medium block">المصادقة الثنائية (2FA)</span>
                      <span className="text-xs text-muted-foreground">إلزام جميع المستخدمين بالمصادقة الثنائية عند تسجيل الدخول</span>
                    </div>
                  </label>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Google OAuth — معرّف العميل (Client ID)</label>
                  <Input
                    dir="ltr"
                    value={form.google_oauth_client_id}
                    onChange={e => setForm(f => ({ ...f, google_oauth_client_id: e.target.value }))}
                    className="h-12 bg-background/50 rounded-xl font-mono"
                    placeholder="xxxxxxxx.apps.googleusercontent.com"
                  />
                  <p className="text-xs text-muted-foreground">للسماح بتسجيل الدخول عبر حسابات Google. احصل عليه من Google Cloud Console.</p>
                </div>
                <div className="pt-4 border-t border-border/50 flex justify-end">
                  <Button onClick={() => handleSave()} className="rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 h-12 px-8">
                    <Save className="w-4 h-4 mr-2" /> حفظ الإعدادات
                  </Button>
                </div>
              </div>
            )}

            {section === 'import' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold">استيراد بيانات CSV</h2>
                <p className="text-muted-foreground text-sm">ارفع ملف CSV لاستيراد بيانات العملاء أو العملاء والفواتير معاً. يتم تجاهل السجلات المكررة (نفس الاسم والهاتف).</p>

                <div className="space-y-3">
                  <label className="text-sm font-medium">نوع الاستيراد</label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setImportMode('customers_only')}
                      className={`flex-1 px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${importMode === 'customers_only' ? 'bg-primary/10 border-primary/50 text-primary' : 'border-border/50 text-muted-foreground hover:bg-muted'}`}
                    >
                      عملاء فقط
                    </button>
                    <button
                      onClick={() => setImportMode('customers_and_invoices')}
                      className={`flex-1 px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${importMode === 'customers_and_invoices' ? 'bg-primary/10 border-primary/50 text-primary' : 'border-border/50 text-muted-foreground hover:bg-muted'}`}
                    >
                      عملاء + فواتير
                    </button>
                  </div>
                </div>

                <div
                  className="border-2 border-dashed border-border/50 rounded-2xl p-12 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) handleFileUpload(file); }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={e => { const file = e.target.files?.[0]; if (file) handleFileUpload(file); }}
                  />
                  <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  {uploading ? (
                    <p className="text-primary font-medium animate-pulse">جاري رفع الملف...</p>
                  ) : (
                    <>
                      <p className="text-muted-foreground mb-2">اسحب ملف CSV هنا أو اضغط للاختيار</p>
                      <p className="text-xs text-muted-foreground">يدعم النظام ملفات .csv بترميز UTF-8</p>
                    </>
                  )}
                </div>

                {importResult && (
                  <div className={`rounded-xl p-4 border ${importResult.errors?.length ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {importResult.errors?.length ? <AlertCircle className="w-5 h-5 text-red-500" /> : <CheckCircle2 className="w-5 h-5 text-green-500" />}
                      <p className="font-medium text-sm">نتيجة الاستيراد</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-muted-foreground">عملاء مضافون:</span>
                      <span className="text-green-500 font-bold">{importResult.added_customers ?? 0}</span>
                      <span className="text-muted-foreground">فواتير مضافة:</span>
                      <span className="text-accent font-bold">{importResult.added_invoices ?? 0}</span>
                      <span className="text-muted-foreground">فواتير مكررة:</span>
                      <span className="text-yellow-500 font-bold">{importResult.duplicate_invoices ?? 0}</span>
                    </div>
                    {(importResult.warnings?.length ?? 0) > 0 && (
                      <p className="text-xs text-yellow-400 mt-2">{importResult.warnings!.length} تحذير — تحقق من سجلات الاستيراد للتفاصيل</p>
                    )}
                    {importResult.errors?.slice(0, 3).map((e, i) => (
                      <p key={i} className="text-xs text-red-400 mt-1">{e}</p>
                    ))}
                  </div>
                )}

                <div className="bg-muted/20 rounded-xl p-4 space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-1">تنسيق ملف CSV المطلوب (عملاء فقط)</p>
                    <code className="text-xs text-muted-foreground block font-mono bg-background/50 px-2 py-1 rounded">code,name,phone,type,governorate,branch,address</code>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">تنسيق ملف CSV (عملاء + فواتير)</p>
                    <code className="text-xs text-muted-foreground block font-mono bg-background/50 px-2 py-1 rounded">code,name,phone,type,governorate,branch,address,invoice_number,invoice_date,invoice_amount,invoice_product,invoice_status</code>
                  </div>
                  <p className="text-xs text-muted-foreground">* الأعمدة بالإنجليزية كما هي موضحة أعلاه</p>
                </div>
              </div>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
