import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, Building2, Users, Tags, Bell, Import } from 'lucide-react';
import { useGetSettings, useUpsertSettings, useListUsers, useCreateUser, useListComplaintTypes, useListBranches } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

type Section = 'company' | 'users' | 'types' | 'branches' | 'import';

export default function Settings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [section, setSection] = useState<Section>('company');

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

  const navItems = [
    { id: 'company' as Section, label: 'معلومات الشركة', icon: Building2 },
    { id: 'users' as Section, label: 'إدارة المستخدمين', icon: Users },
    { id: 'types' as Section, label: 'أنواع الشكاوى', icon: Tags },
    { id: 'branches' as Section, label: 'الفروع', icon: Bell },
    { id: 'import' as Section, label: 'استيراد CSV', icon: Import },
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
              <div className="space-y-4">
                <h2 className="text-xl font-bold">استيراد بيانات CSV</h2>
                <p className="text-muted-foreground text-sm">يمكنك رفع ملف CSV لاستيراد بيانات العملاء أو الفواتير بشكل مجمع.</p>
                <div className="border-2 border-dashed border-border/50 rounded-2xl p-12 text-center">
                  <Import className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">اسحب ملف CSV هنا أو اضغط للاختيار</p>
                  <Button variant="outline" className="rounded-xl">اختر ملف CSV</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
