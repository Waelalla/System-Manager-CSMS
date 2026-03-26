import {
  useGetDashboardStats,
  useGetComplaintAnalytics,
  useGetInvoiceAnalytics,
  useGetBranchAnalytics,
  type ComplaintAnalyticsByTypeItem,
  type ComplaintAnalyticsByPriorityItem,
  type BranchAnalyticsBranchesItem,
  type DashboardStatsTrendItem,
} from '@workspace/api-client-react';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, Legend
} from 'recharts';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
];

function mapTypeData(items: ComplaintAnalyticsByTypeItem[] | undefined) {
  if (!items) return [];
  return items.map(item => ({
    name: (item.type_name as string | null) || 'غير محدد',
    value: item.count as number,
  }));
}

function mapPriorityData(items: ComplaintAnalyticsByPriorityItem[] | undefined) {
  if (!items) return [];
  return items.map(item => ({
    name: (item.priority as string | null) || 'غير محدد',
    value: item.count as number,
  }));
}

function mapBranchData(items: BranchAnalyticsBranchesItem[] | undefined) {
  if (!items) return [];
  return items.map(b => ({
    name: (b.branch_name as string) || 'غير محدد',
    value: (b.complaints_count as number) || 0,
  }));
}

export default function Analytics() {
  const { t } = useTranslation();
  const { data: stats, isLoading } = useGetDashboardStats();
  const { data: complaintAnalytics } = useGetComplaintAnalytics();
  const { data: invoiceAnalytics } = useGetInvoiceAnalytics();
  const { data: branchAnalytics } = useGetBranchAnalytics();

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map(i => <div key={i} className="h-64 bg-card rounded-2xl" />)}
      </div>
    );
  }

  const byTypeData = mapTypeData(complaintAnalytics?.by_type);
  const byPriorityData = mapPriorityData(complaintAnalytics?.by_priority);
  const branchData = mapBranchData(branchAnalytics?.branches);
  const trendData = (stats?.trend ?? []) as DashboardStatsTrendItem[];

  const avgFollowupDays = invoiceAnalytics?.avg_followup_days ?? 0;
  const kpis = [
    { label: 'جديدة', value: stats?.complaints_new ?? 0, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'مستلمة', value: stats?.complaints_received ?? 0, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { label: 'مغلقة', value: stats?.complaints_closed ?? 0, color: 'text-muted-foreground', bg: 'bg-muted/30' },
    { label: 'مصعدة', value: stats?.complaints_escalated ?? 0, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: 'فواتير غير متابعة', value: stats?.invoices_untracked ?? 0, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'متوسط التقييم', value: (stats?.avg_rating ?? 0).toFixed(1), color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'متوسط أيام المتابعة', value: Number(avgFollowupDays).toFixed(1), color: 'text-accent', bg: 'bg-accent/10' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('nav.analytics')}</h1>
        <p className="text-muted-foreground mt-1">تقارير وإحصائيات شاملة للأداء</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map(kpi => (
          <div key={kpi.label} className={`rounded-xl p-4 border border-border/50 ${kpi.bg} flex flex-col items-center text-center gap-1`}>
            <span className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</span>
            <span className="text-xs text-muted-foreground">{kpi.label}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card/80 backdrop-blur-sm shadow-xl rounded-2xl border-white/5">
          <CardHeader>
            <CardTitle>توزيع الشكاوى حسب النوع</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            {byTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byTypeData} innerRadius={70} outerRadius={100} paddingAngle={4} dataKey="value" stroke="none">
                    {byTypeData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">لا توجد بيانات</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-sm shadow-xl rounded-2xl border-white/5">
          <CardHeader>
            <CardTitle>الشكاوى حسب الفرع</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            {branchData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} width={100} />
                  <Tooltip cursor={{ fill: 'hsl(var(--muted)/0.5)' }} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: 'none' }} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">لا توجد بيانات</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-sm shadow-xl rounded-2xl border-white/5">
          <CardHeader>
            <CardTitle>الشكاوى حسب الأولوية</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            {byPriorityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byPriorityData} outerRadius={100} dataKey="value" stroke="none">
                    {byPriorityData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">لا توجد بيانات</div>
            )}
          </CardContent>
        </Card>

        {trendData.length > 0 && (
          <Card className="bg-card/80 backdrop-blur-sm shadow-xl rounded-2xl border-white/5">
            <CardHeader>
              <CardTitle>اتجاه الشكاوى خلال 12 شهر</CardTitle>
            </CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData as { name: string; value: number }[]}>
                  <defs>
                    <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorTrend)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
