import { useState } from 'react';
import { useGetProfile, useUpdateProfile, useChangePassword } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, Lock, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Profile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: profile } = useGetProfile({ query: { queryKey: ['getProfile'] } });
  const { mutateAsync: updateProfile } = useUpdateProfile();
  const { mutateAsync: changePassword } = useChangePassword();

  const [nameForm, setNameForm] = useState({ name: profile?.name ?? '' });
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });

  const handleSaveName = async () => {
    try {
      await updateProfile({ data: { name: nameForm.name } });
      queryClient.invalidateQueries({ queryKey: ['getProfile'] });
      toast({ title: 'تم الحفظ', description: 'تم تحديث الاسم بنجاح' });
    } catch {
      toast({ title: 'خطأ', description: 'فشل في حفظ البيانات', variant: 'destructive' });
    }
  };

  const handleChangePassword = async () => {
    if (pwForm.new_password !== pwForm.confirm) {
      toast({ title: 'خطأ', description: 'كلمة المرور الجديدة غير متطابقة', variant: 'destructive' });
      return;
    }
    try {
      await changePassword({ data: { current_password: pwForm.current_password, new_password: pwForm.new_password } });
      setPwForm({ current_password: '', new_password: '', confirm: '' });
      toast({ title: 'تم التغيير', description: 'تم تغيير كلمة المرور بنجاح' });
    } catch {
      toast({ title: 'خطأ', description: 'فشل في تغيير كلمة المرور', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">الملف الشخصي</h1>
        <p className="text-muted-foreground mt-1">إدارة بياناتك الشخصية وكلمة المرور</p>
      </div>

      <div className="flex items-center gap-4 p-6 bg-card rounded-2xl border border-border/50 shadow-lg">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="w-8 h-8 text-primary" />
        </div>
        <div>
          <p className="text-xl font-bold">{profile?.name}</p>
          <p className="text-muted-foreground text-sm dir-ltr">{profile?.email}</p>
          <span className="mt-1 inline-block px-2 py-0.5 text-xs rounded-lg bg-primary/10 text-primary">{profile?.role_name}</span>
        </div>
      </div>

      <Card className="bg-card rounded-2xl border-border/50 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-primary" /> البيانات الشخصية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">الاسم الكامل</label>
            <Input
              value={nameForm.name}
              onChange={e => setNameForm({ name: e.target.value })}
              className="h-12 bg-background/50 rounded-xl"
              placeholder="الاسم الكامل"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">البريد الإلكتروني</label>
            <Input value={profile?.email ?? ''} disabled className="h-12 bg-background/50 rounded-xl opacity-50" dir="ltr" />
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveName} className="rounded-xl bg-primary hover:bg-primary/90 text-white h-12 px-8">
              <Save className="w-4 h-4 mr-2" /> حفظ الاسم
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card rounded-2xl border-border/50 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Lock className="w-5 h-5 text-primary" /> تغيير كلمة المرور</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">كلمة المرور الحالية</label>
            <Input
              type="password"
              value={pwForm.current_password}
              onChange={e => setPwForm(f => ({ ...f, current_password: e.target.value }))}
              className="h-12 bg-background/50 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">كلمة المرور الجديدة</label>
            <Input
              type="password"
              value={pwForm.new_password}
              onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))}
              className="h-12 bg-background/50 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">تأكيد كلمة المرور</label>
            <Input
              type="password"
              value={pwForm.confirm}
              onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
              className="h-12 bg-background/50 rounded-xl"
            />
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={handleChangePassword} className="rounded-xl bg-primary hover:bg-primary/90 text-white h-12 px-8">
              <Lock className="w-4 h-4 mr-2" /> تغيير كلمة المرور
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
