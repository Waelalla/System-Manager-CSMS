import { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, Legend, LineChart, Line,
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

type Tab = 'overview' | 'complaints' | 'invoices' | 'branches' | 'trend';

function exportCsv(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Analytics() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('overview');
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

  const byTypeData = (complaintAnalytics?.by_type as ComplaintAnalyticsByTypeItem[] | undefined ?? []).map(item => ({
    name: (item.type_name as string | null) || 'غير محدد',
    value: item.count as number,
  }));
  const byPriorityData = (complaintAnalytics?.by_priority as ComplaintAnalyticsByPriorityItem[] | undefined ?? []).map(item => ({
    name: (item.priority as string | null) || 'غير محدد',
    value: item.count as number,
  }));
  const branchData = (branchAnalytics?.branches as BranchAnalyticsBranchesItem[] | undefined ?? []).map(b => ({
    name: (b.branch_name as string) || 'غير محدد',
    value: (b.complaints_count as number) || 0,
    avg_rating: (b.avg_rating as number | null) || 0,
  }));
  const trendData = (stats?.trend ?? []) as DashboardStatsTrendItem[];
  const avgFollowupDays = invoiceAnalytics?.avg_followup_days ?? 0;

  const kpis = [
    { label: 'جديدة', value: stats?.complaints_new ?? 0, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'مستلمة', value: stats?.complaints_received ?? 0, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { label: 'مغلقة', value: stats?.complaints_closed ?? 0, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'مصعدة', value: stats?.complaints_escalated ?? 0, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: 'فواتير غير متابعة', value: stats?.invoices_untracked ?? 0, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'متوسط التقييم', value: (stats?.avg_rating ?? 0).toFixed(1), color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'متوسط أيام المتابعة', value: Number(avgFollowupDays).toFixed(1), color: 'text-accent', bg: 'bg-accent/10' },
  ];

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'نظرة عامة' },
    { id: 'complaints', label: 'الشكاوى' },
    { id: 'invoices', label: 'الفواتير' },
    { id: 'branches', label: 'الفروع' },
    { id: 'trend', label: 'الاتجاه الزمني' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('nav.analytics')}</h1>
          <p className="text-muted-foreground mt-1">تقارير وإحصائيات شاملة للأداء</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${tab === t.id ? 'bg-primary/10 text-primary border border-primary/30' : 'border border-border/50 text-muted-foreground hover:bg-muted'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
            {kpis.map(kpi => (
              <div key={kpi.label} className={`rounded-xl p-4 border border-border/50 ${kpi.bg} flex flex-col items-center text-center gap-1`}>
                <span className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</span>
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card/80 backdrop-blur-sm shadow-xl rounded-2xl border-white/5">
              <CardHeader><CardTitle>توزيع حسب النوع</CardTitle></CardHeader>
              <CardContent className="h-[260px]">
                {byTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={byTypeData} innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" stroke="none">
                        {byTypeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <EmptyChart />}
              </CardContent>
            </Card>
            <Card className="bg-card/80 backdrop-blur-sm shadow-xl rounded-2xl border-white/5">
              <CardHeader><CardTitle>توزيع حسب الأولوية</CardTitle></CardHeader>
              <CardContent className="h-[260px]">
                {byPriorityData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={byPriorityData} outerRadius={90} dataKey="value" stroke="none">
                        {byPriorityData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <EmptyChart />}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {tab === 'complaints' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={() => exportCsv(byTypeData.map(d => ({ النوع: d.name, العدد: d.value })), 'complaints_by_type.csv')}>
              <Download className="w-4 h-4" /> تصدير CSV
            </Button>
          </div>
          <Card className="bg-card/80 shadow-xl rounded-2xl border-white/5">
            <CardHeader><CardTitle>الشكاوى حسب النوع</CardTitle></CardHeader>
            <CardContent className="h-[300px]">
              {byTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byTypeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: 'none' }} />
                    <Bar dataKey="value" name="العدد" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                      {byTypeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </CardContent>
          </Card>
          <Card className="bg-card/80 shadow-xl rounded-2xl border-white/5">
            <CardHeader><CardTitle>الشكاوى حسب الأولوية</CardTitle></CardHeader>
            <CardContent className="h-[260px]">
              {byPriorityData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byPriorityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: 'none' }} />
                    <Bar dataKey="value" name="العدد" radius={[4, 4, 0, 0]}>
                      {byPriorityData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'invoices' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card rounded-xl p-6 border border-border/50 text-center">
              <p className="text-3xl font-bold text-primary">{invoiceAnalytics?.untracked_count ?? 0}</p>
              <p className="text-sm text-muted-foreground mt-1">فواتير غير متابعة</p>
            </div>
            <div className="bg-card rounded-xl p-6 border border-border/50 text-center">
              <p className="text-3xl font-bold text-yellow-500">{stats?.invoices_untracked ?? 0}</p>
              <p className="text-sm text-muted-foreground mt-1">إجمالي غير متابعة</p>
            </div>
            <div className="bg-card rounded-xl p-6 border border-border/50 text-center">
              <p className="text-3xl font-bold text-accent">{Number(avgFollowupDays).toFixed(1)}</p>
              <p className="text-sm text-muted-foreground mt-1">متوسط أيام المتابعة</p>
            </div>
          </div>
          <Card className="bg-card/80 shadow-xl rounded-2xl border-white/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>تقييمات منخفضة</CardTitle>
                <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={() => {
                  const rows = [
                    { البيان: 'فواتير غير متابعة', القيمة: invoiceAnalytics?.untracked_count ?? 0 },
                    { البيان: 'متوسط أيام المتابعة', القيمة: Number(avgFollowupDays).toFixed(1) },
                  ];
                  exportCsv(rows, 'invoice_stats.csv');
                }}>
                  <Download className="w-4 h-4" /> تصدير
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {(invoiceAnalytics?.low_rated?.length ?? 0) > 0 ? (
                <div className="space-y-3">
                  {invoiceAnalytics?.low_rated?.slice(0, 5).map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted/20 rounded-xl">
                      <span className="text-sm">{(item as { invoice_number?: string }).invoice_number ?? 'فاتورة'}</span>
                      <span className="text-sm text-red-500 font-bold">تقييم: {(item as { rating?: number }).rating ?? '-'}/5</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-8">لا توجد تقييمات منخفضة</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'branches' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={() => exportCsv(branchData.map(b => ({ الفرع: b.name, الشكاوى: b.value, متوسط_التقييم: b.avg_rating })), 'branches.csv')}>
              <Download className="w-4 h-4" /> تصدير CSV
            </Button>
          </div>
          <Card className="bg-card/80 shadow-xl rounded-2xl border-white/5">
            <CardHeader><CardTitle>الشكاوى حسب الفرع</CardTitle></CardHeader>
            <CardContent className="h-[300px]">
              {branchData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={branchData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} width={110} tick={{ fontSize: 12 }} />
                    <Tooltip cursor={{ fill: 'hsl(var(--muted)/0.5)' }} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: 'none' }} />
                    <Bar dataKey="value" name="الشكاوى" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </CardContent>
          </Card>
          <Card className="bg-card/80 shadow-xl rounded-2xl border-white/5">
            <CardHeader><CardTitle>متوسط تقييم الفروع</CardTitle></CardHeader>
            <CardContent className="h-[260px]">
              {branchData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={branchData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 5]} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: 'none' }} />
                    <Bar dataKey="avg_rating" name="متوسط التقييم" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'trend' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={() => exportCsv((trendData as { name: string; value: number }[]).map(t => ({ الشهر: t.name, الشكاوى: t.value })), 'trend.csv')}>
              <Download className="w-4 h-4" /> تصدير CSV
            </Button>
          </div>
          {trendData.length > 0 ? (
            <Card className="bg-card/80 shadow-xl rounded-2xl border-white/5">
              <CardHeader><CardTitle>اتجاه الشكاوى خلال 12 شهر</CardTitle></CardHeader>
              <CardContent className="h-[340px]">
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
                    <Area type="monotone" dataKey="value" name="الشكاوى" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorTrend)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card/80 shadow-xl rounded-2xl border-white/5">
              <CardContent className="h-64 flex items-center justify-center text-muted-foreground">لا توجد بيانات كافية للعرض</CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyChart() {
  return <div className="h-full flex items-center justify-center text-muted-foreground text-sm">لا توجد بيانات</div>;
}
