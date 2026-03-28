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
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Medal, Star, TrendingUp } from 'lucide-react';

import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, Legend,
} from 'recharts';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
];

type Tab = 'overview' | 'complaints' | 'invoices' | 'branches' | 'trend' | 'employees';

type EmployeeStat = {
  id: number;
  name: string;
  email: string;
  role_name: string;
  complaints_created: number;
  complaints_resolved: number;
  complaints_assigned: number;
  follow_ups_done: number;
  avg_customer_rating: number | null;
  performance_score: number;
};

type EmployeeRange = 'all' | 'this_month' | 'last_month';

function useGetEmployeeAnalytics(range: EmployeeRange) {
  return useQuery<{ employees: EmployeeStat[] }>({
    queryKey: ['/api/analytics/employees', range],
    queryFn: async () => {
      const token = localStorage.getItem('access_token');
      const url = `${BASE}/api/analytics/employees${range !== 'all' ? `?range=${range}` : ''}`;
      const res = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to fetch employee analytics');
      return res.json() as Promise<{ employees: EmployeeStat[] }>;
    },
  });
}

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
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [empRange, setEmpRange] = useState<EmployeeRange>('all');
  const { data: stats, isLoading } = useGetDashboardStats();
  const { data: complaintAnalytics } = useGetComplaintAnalytics();
  const { data: invoiceAnalytics } = useGetInvoiceAnalytics();
  const { data: branchAnalytics } = useGetBranchAnalytics();

  const canSeeEmployees =
    user?.role_name === 'Manager' ||
    user?.role_name === 'Manager/Voter' ||
    user?.role_name === 'Maintenance Engineer';

  const { data: employeeData, isLoading: empLoading } = useGetEmployeeAnalytics(empRange);

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
    ...(canSeeEmployees ? [{ id: 'employees' as Tab, label: 'أداء الموظفين' }] : []),
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

      {tab === 'employees' && canSeeEmployees && (
        <EmployeesTab
          data={employeeData?.employees ?? []}
          isLoading={empLoading}
          range={empRange}
          onRangeChange={setEmpRange}
          isManager={user?.role_name === 'Manager' || user?.role_name === 'Manager/Voter'}
        />
      )}
    </div>
  );
}

function EmptyChart() {
  return <div className="h-full flex items-center justify-center text-muted-foreground text-sm">لا توجد بيانات</div>;
}

const MEDAL_COLORS = ['#F59E0B', '#9CA3AF', '#CD7C3B'];
const MEDAL_LABELS = ['🥇', '🥈', '🥉'];

const RANGE_OPTIONS: { value: EmployeeRange; label: string }[] = [
  { value: 'all', label: 'كل الوقت' },
  { value: 'this_month', label: 'هذا الشهر' },
  { value: 'last_month', label: 'الشهر الماضي' },
];

function StarDisplay({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          className="w-3 h-3"
          fill={value >= s ? '#F59E0B' : 'transparent'}
          style={{ color: value >= s ? '#F59E0B' : '#6b7280' }}
        />
      ))}
      <span className="text-xs text-muted-foreground mr-1">{value.toFixed(1)}</span>
    </span>
  );
}

function EmployeesTab({
  data,
  isLoading,
  range,
  onRangeChange,
  isManager,
}: {
  data: EmployeeStat[];
  isLoading: boolean;
  range: EmployeeRange;
  onRangeChange: (r: EmployeeRange) => void;
  isManager: boolean;
}) {
  const handleExport = () => {
    exportCsv(
      data.map((e, i) => ({
        الترتيب: i + 1,
        الاسم: e.name,
        الدور: e.role_name,
        شكاوى_مسجلة: e.complaints_created,
        شكاوى_محلولة: e.complaints_resolved,
        متابعات_منجزة: e.follow_ups_done,
        متوسط_التقييم: e.avg_customer_rating ?? '',
        نقاط_الأداء: e.performance_score,
      })),
      'employee_performance.csv'
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {RANGE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onRangeChange(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${range === opt.value ? 'bg-primary/10 text-primary border border-primary/30' : 'border border-border/50 text-muted-foreground hover:bg-muted'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {isManager && (
          <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={handleExport}>
            <Download className="w-4 h-4" /> تصدير CSV
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-card rounded-xl animate-pulse" />)}
        </div>
      ) : data.length === 0 ? (
        <Card className="bg-card/80 shadow-xl rounded-2xl border-white/5">
          <CardContent className="h-40 flex items-center justify-center text-muted-foreground">لا توجد بيانات</CardContent>
        </Card>
      ) : (
        <Card className="bg-card/80 shadow-xl rounded-2xl border-white/5 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              ترتيب الأداء الوظيفي
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20">
                    <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">#</th>
                    <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">الموظف</th>
                    <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">شكاوى مُسجَّلة</th>
                    <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">شكاوى محلولة</th>
                    <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">متابعات منجزة</th>
                    <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">متوسط التقييم</th>
                    <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">نقاط الأداء</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((emp, idx) => (
                    <tr
                      key={emp.id}
                      className={`border-b border-border/30 hover:bg-muted/10 transition-colors ${idx < 3 ? 'bg-gradient-to-r from-transparent' : ''}`}
                    >
                      <td className="py-3 px-4">
                        {idx < 3 ? (
                          <span className="text-lg" title={`المركز ${idx + 1}`}>{MEDAL_LABELS[idx]}</span>
                        ) : (
                          <span className="text-muted-foreground">{idx + 1}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{emp.name}</span>
                          <span
                            className="text-xs px-1.5 py-0.5 rounded-md mt-0.5 w-fit"
                            style={{
                              background: idx < 3 ? `${MEDAL_COLORS[idx]}20` : 'hsl(var(--muted))',
                              color: idx < 3 ? MEDAL_COLORS[idx] : 'hsl(var(--muted-foreground))',
                            }}
                          >
                            {emp.role_name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-semibold">{emp.complaints_created}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-semibold text-green-500">{emp.complaints_resolved}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-semibold text-blue-500">{emp.follow_ups_done}</span>
                      </td>
                      <td className="py-3 px-4">
                        <StarDisplay value={emp.avg_customer_rating} />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted/30 rounded-full h-2 min-w-[60px]">
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{
                                width: `${emp.performance_score}%`,
                                background: idx === 0 ? '#F59E0B' : idx === 1 ? '#9CA3AF' : idx === 2 ? '#CD7C3B' : 'hsl(var(--primary))',
                              }}
                            />
                          </div>
                          <span className="text-xs font-bold text-foreground min-w-[28px] text-left">{emp.performance_score}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
