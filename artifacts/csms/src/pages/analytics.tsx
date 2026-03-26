import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Analytics() {
  const { t } = useTranslation();

  const pieData = [
    { name: 'جودة المنتج', value: 400 },
    { name: 'تأخير التوصيل', value: 300 },
    { name: 'سوء المعاملة', value: 300 },
    { name: 'أخرى', value: 200 },
  ];
  const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--destructive))', 'hsl(var(--muted-foreground))'];

  const barData = [
    { name: 'الفرع الرئيسي', value: 85 },
    { name: 'فرع الدقي', value: 45 },
    { name: 'فرع المعادي', value: 60 },
    { name: 'فرع زايد', value: 30 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('nav.analytics')}</h1>
        <p className="text-muted-foreground mt-1">تقارير وإحصائيات شاملة للأداء</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card/80 backdrop-blur-sm shadow-xl rounded-2xl border-white/5">
          <CardHeader>
            <CardTitle>توزيع الشكاوى حسب النوع</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={80} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}/>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-sm shadow-xl rounded-2xl border-white/5">
          <CardHeader>
            <CardTitle>أداء الفروع (عدد الشكاوى)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                <Tooltip cursor={{fill: 'hsl(var(--muted)/0.5)'}} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: 'none' }}/>
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
