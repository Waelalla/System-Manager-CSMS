import { useState, useRef } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, Building2, Users, Tags, GitBranch, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { useGetSettings, useUpsertSettings, useListUsers, useListComplaintTypes, useListBranches } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

type Section = 'company' | 'users' | 'types' | 'branches' | 'import';

interface ImportResult {
  added_customers?: number;
  updated_customers?: number;
  added_invoices?: number;
  duplicate_invoices?: number;
  warnings?: { row?: number; field?: string; reason?: string }[];
  errors?: string[];
}

export default function Settings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [section, setSection] = useState<Section>('company');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<'customers_only' | 'customers_and_invoices'>('customers_only');
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const { data: settings } = useGetSettings();
  const { mutateAsync: upsert } = useUpsertSettings();
  const { data: usersData } = useListUsers(undefined, { query: { queryKey: ['listUsers'], enabled: section === 'users' } });
  const { data: typesData } = useListComplaintTypes({ query: { queryKey: ['listComplaintTypes'], enabled: section === 'types' } });
  const { data: branchesData } = useListBranches({ query: { queryKey: ['listBranches'], enabled: section === 'branches' } });

  const [form, setForm] = useState({
    company_name: (settings as { company_name?: string })?.company_name ?? '',
    company_email: (settings as { company_email?: string })?.company_email ?? '',
    company_address: (settings as { company_address?: string })?.company_address ?? '',
    timezone: (settings as { timezone?: string })?.timezone ?? 'Africa/Cairo',
    language: (settings as { language?: string })?.language ?? 'ar',
  });

  const handleSave = async () => {
    try {
      await upsert({ data: { settings: form } });
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
                </div>
                <div className="pt-6 border-t border-border/50 flex justify-end">
                  <Button onClick={handleSave} className="rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 h-12 px-8">
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
                      {types.map((t: { id: number; name: string; description?: string }, i: number) => (
                        <tr key={t.id} className="hover:bg-muted/20">
                          <td className="p-4 text-muted-foreground">{i + 1}</td>
                          <td className="p-4 font-medium">{t.name}</td>
                          <td className="p-4 text-muted-foreground text-xs">{t.description ?? '-'}</td>
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
