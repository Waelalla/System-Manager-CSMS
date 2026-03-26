import { useTranslation } from '@/lib/i18n';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save } from 'lucide-react';

export default function Settings() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('nav.settings')}</h1>
        <p className="text-muted-foreground mt-1">إعدادات النظام والتحكم العام</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Settings Nav */}
        <Card className="col-span-1 bg-card rounded-2xl border-border/50 shadow-lg p-2 h-fit">
          <div className="space-y-1">
            <button className="w-full text-right px-4 py-3 rounded-xl bg-primary/10 text-primary font-bold text-sm">معلومات الشركة</button>
            <button className="w-full text-right px-4 py-3 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground font-medium text-sm transition-colors">إدارة المستخدمين</button>
            <button className="w-full text-right px-4 py-3 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground font-medium text-sm transition-colors">أنواع الشكاوى</button>
            <button className="w-full text-right px-4 py-3 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground font-medium text-sm transition-colors">إعدادات البريد</button>
          </div>
        </Card>

        {/* Settings Content */}
        <Card className="col-span-1 md:col-span-3 bg-card rounded-2xl border-border/50 shadow-lg">
          <CardContent className="p-8 space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-4">معلومات الشركة الأساسية</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">اسم الشركة</label>
                  <Input defaultValue="Customer Service Enterprise" className="h-12 bg-background/50 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">البريد الرسمي</label>
                  <Input defaultValue="support@company.com" dir="ltr" className="h-12 bg-background/50 rounded-xl text-right" />
                </div>
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-sm font-medium">العنوان</label>
                  <Input defaultValue="القاهرة، مصر" className="h-12 bg-background/50 rounded-xl" />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-border/50 flex justify-end">
              <Button className="rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 h-12 px-8">
                <Save className="w-4 h-4 mr-2" /> حفظ التغييرات
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
