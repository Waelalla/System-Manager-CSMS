import { useGetDashboardStats } from '@workspace/api-client-react';
import { useTranslation } from '@/lib/i18n';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle, Clock, FileText, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

export default function Dashboard() {
  const { t } = useTranslation();
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
        />
        <KpiCard 
          title={t('dashboard.receivedComplaints')}
          value={stats?.complaints_received || 0}
          icon={Clock}
          trend="-5%"
          trendUp={false}
          color="text-yellow-500"
          bg="bg-yellow-500/10"
        />
        <KpiCard 
          title={t('dashboard.closedComplaints')}
          value={stats?.complaints_closed || 0}
          icon={CheckCircle}
          trend="+18%"
          trendUp={true}
          color="text-green-500"
          bg="bg-green-500/10"
        />
        <KpiCard 
          title={t('dashboard.untrackedInvoices')}
          value={stats?.invoices_untracked || 0}
          icon={FileText}
          trend="-2%"
          trendUp={false}
          color="text-primary"
          bg="bg-primary/10"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 lg:col-span-2 shadow-lg shadow-black/5 border-white/5 bg-card/80 backdrop-blur-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-border/50 bg-muted/20">
            <CardTitle>{t('dashboard.trend')}</CardTitle>
          </CardHeader>
          <CardContent className="p-6 h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.trend || mockTrendData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {/* Activity Feed Placeholder */}
        <Card className="col-span-1 shadow-lg shadow-black/5 border-white/5 bg-card/80 backdrop-blur-sm rounded-2xl">
          <CardHeader className="border-b border-border/50 bg-muted/20">
            <CardTitle>أحدث النشاطات</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-4 flex items-start gap-4 hover:bg-muted/30 transition-colors">
                  <div className="w-2 h-2 mt-2 rounded-full bg-primary ring-4 ring-primary/20"></div>
                  <div>
                    <p className="text-sm font-medium text-foreground">تم إنشاء شكوى جديدة #10{i}</p>
                    <p className="text-xs text-muted-foreground mt-1">منذ {i} ساعة</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ title, value, icon: Icon, trend, trendUp, color, bg }: any) {
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="bg-card rounded-2xl p-6 shadow-lg shadow-black/5 border border-white/5 relative overflow-hidden group"
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
      <div className="flex items-center gap-1 relative z-10">
        <span className={`text-xs font-medium flex items-center ${trendUp ? 'text-green-500' : 'text-red-500'}`}>
          {trendUp ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
          {trend}
        </span>
        <span className="text-xs text-muted-foreground ml-1">مقارنة بالأسبوع الماضي</span>
      </div>
    </motion.div>
  );
}
