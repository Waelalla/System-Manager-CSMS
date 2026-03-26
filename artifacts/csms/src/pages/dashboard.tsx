import { useGetDashboardStats } from '@workspace/api-client-react';
import { useTranslation } from '@/lib/i18n';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle, Clock, FileText, ArrowUpRight, ArrowDownRight, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useLocation } from 'wouter';

export default function Dashboard() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { data: stats, isLoading } = useGetDashboardStats();

  if (isLoading) return <div className="animate-pulse space-y-4">
    <div className="h-32 bg-card rounded-2xl"></div>
    <div className="h-64 bg-card rounded-2xl"></div>
  </div>;

  const mockTrendData = [
    { name: '1', value: 400 },
    { name: '2', value: 300 },
    { name: '3', value: 550 },
    { name: '4', value: 450 },
    { name: '5', value: 700 },
    { name: '6', value: 650 },
    { name: '7', value: 800 },
  ];

  const navigateToComplaints = (status?: string) => {
    if (status) {
      setLocation(`/complaints?status=${encodeURIComponent(status)}`);
      setTimeout(() => window.dispatchEvent(new PopStateEvent('popstate')), 50);
    } else {
      setLocation('/follow-ups');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('nav.dashboard')}</h1>
        <p className="text-muted-foreground mt-1">نظرة عامة على أداء النظام اليوم</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          title={t('dashboard.newComplaints')}
          value={stats?.complaints_new || 0}
          icon={AlertCircle}
          trend="+12%"
          trendUp={true}
          color="text-destructive"
          bg="bg-destructive/10"
          onClick={() => navigateToComplaints('جديدة')}
          hint="اضغط لعرض الشكاوى الجديدة"
        />
        <KpiCard
          title={t('dashboard.receivedComplaints')}
          value={stats?.complaints_received || 0}
          icon={Clock}
          trend="-5%"
          trendUp={false}
          color="text-yellow-500"
          bg="bg-yellow-500/10"
          onClick={() => navigateToComplaints('جاري المعالجة')}
          hint="اضغط لعرض قيد المعالجة"
        />
        <KpiCard
          title={t('dashboard.closedComplaints')}
          value={stats?.complaints_closed || 0}
          icon={CheckCircle}
          trend="+18%"
          trendUp={true}
          color="text-green-500"
          bg="bg-green-500/10"
          onClick={() => navigateToComplaints('مغلق')}
          hint="اضغط لعرض المغلقة"
        />
        <KpiCard
          title={t('dashboard.untrackedInvoices')}
          value={stats?.invoices_untracked || 0}
          icon={FileText}
          trend="-2%"
          trendUp={false}
          color="text-primary"
          bg="bg-primary/10"
          onClick={() => navigateToComplaints(undefined)}
          hint="اضغط للمتابعة"
        />
      </div>

      {/* Escalation Alert */}
      {(stats as { complaints_escalated_admin?: number } | undefined)?.complaints_escalated_admin ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:bg-red-500/15 transition-colors"
          onClick={() => navigateToComplaints('تصعيد إداري')}
        >
          <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-red-500">تنبيه: شكاوى مصعدة إداريًا تحتاج اهتمامًا عاجلاً</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              يوجد {(stats as { complaints_escalated_admin?: number }).complaints_escalated_admin} شكوى بحالة "تصعيد إداري" — اضغط للمراجعة الفورية
            </p>
          </div>
          <span className="text-xs text-red-400 font-medium border border-red-500/30 px-3 py-1 rounded-full">عاجل</span>
        </motion.div>
      ) : null}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 lg:col-span-2 shadow-lg shadow-black/5 border-white/5 bg-card/80 backdrop-blur-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-border/50 bg-muted/20">
            <CardTitle>{t('dashboard.trend')}</CardTitle>
          </CardHeader>
          <CardContent className="p-6 h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockTrendData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: '#1a1d27', border: '1px solid #2d3148', borderRadius: '12px', color: '#fff' }}
                />
                <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-lg shadow-black/5 border-white/5 bg-card/80 backdrop-blur-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-border/50 bg-muted/20">
            <CardTitle>{t('dashboard.recentActivity')}</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              {[
                { label: t('dashboard.newComplaints'), value: stats?.complaints_new ?? 0, color: 'bg-destructive' },
                { label: 'جاري المعالجة', value: stats?.complaints_received ?? 0, color: 'bg-yellow-500' },
                { label: 'محلولة', value: (stats as unknown as Record<string, number>)?.complaints_resolved ?? 0, color: 'bg-teal-500' },
                { label: 'مغلقة', value: stats?.complaints_closed ?? 0, color: 'bg-green-500' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${item.color} shrink-0`} />
                  <span className="text-sm text-muted-foreground flex-1">{item.label}</span>
                  <span className="text-sm font-bold text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend: string;
  trendUp: boolean;
  color: string;
  bg: string;
  onClick?: () => void;
  hint?: string;
}

function KpiCard({ title, value, icon: Icon, trend, trendUp, color, bg, onClick, hint }: KpiCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`bg-card rounded-2xl p-6 shadow-lg shadow-black/5 border border-white/5 relative overflow-hidden group ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-xl group-hover:blur-2xl transition-all"></div>
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-foreground tracking-tight">{value}</h3>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bg} ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div className="flex items-center justify-between relative z-10">
        <span className={`text-xs font-medium flex items-center ${trendUp ? 'text-green-500' : 'text-red-500'}`}>
          {trendUp ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
          {trend}
        </span>
        {hint && <span className="text-xs text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity">{hint}</span>}
      </div>
    </motion.div>
  );
}
