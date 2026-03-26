import { useState, useEffect } from 'react';
import { useListComplaints } from '@workspace/api-client-react';
import { useTranslation } from '@/lib/i18n';
import { Plus, Filter, Eye, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link, useLocation } from 'wouter';

const ALL_STATUSES = ['جديدة', 'مستلمة', 'جاري المعالجة', 'مصعدة', 'تصعيد إداري', 'محلول', 'مغلق', 'مرفوض'];

export default function Complaints() {
  const { t } = useTranslation();
  const [location] = useLocation();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('status');
    if (s) { setStatusFilter(s); setShowFilters(true); }
  }, [location]);

  const { data, isLoading } = useListComplaints({ page, limit: 15, status: statusFilter || undefined });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'جديدة': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'مستلمة': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'جاري المعالجة': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'مصعدة': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'تصعيد إداري': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'محلول': return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
      case 'مغلق': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'مرفوض': return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const complaints = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = Math.ceil(total / 15);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('complaints.title')}</h1>
          <p className="text-muted-foreground mt-1">تتبع وحل مشاكل العملاء بكفاءة</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="rounded-xl border-border/50"
            onClick={() => setShowFilters(f => !f)}
          >
            <Filter className="w-4 h-4 mr-2" />
            تصفية
            {statusFilter && <span className="mr-2 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs">{statusFilter}</span>}
            <ChevronDown className={`w-4 h-4 mr-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </Button>
          <Link href="/complaints/new">
            <Button className="rounded-xl shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-accent hover:opacity-90 hover:-translate-y-0.5 transition-all">
              <Plus className="w-5 h-5 mr-2" />
              {t('complaints.add')}
            </Button>
          </Link>
        </div>
      </div>

      {showFilters && (
        <div className="bg-card rounded-2xl border border-border/50 p-4 shadow-sm">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium text-muted-foreground ml-2">تصفية بالحالة:</span>
            <button
              onClick={() => { setStatusFilter(''); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${!statusFilter ? 'bg-primary text-white border-primary' : 'border-border/50 text-muted-foreground hover:bg-muted'}`}
            >
              الكل
            </button>
            {ALL_STATUSES.map(s => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s === statusFilter ? '' : s); setPage(1); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${statusFilter === s ? `${getStatusColor(s)} font-bold` : 'border-border/50 text-muted-foreground hover:bg-muted'}`}
              >
                {s}
              </button>
            ))}
            {statusFilter && (
              <button onClick={() => { setStatusFilter(''); setPage(1); }} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground ml-2">
                <X className="w-3 h-3" /> مسح
              </button>
            )}
          </div>
        </div>
      )}

      <div className="bg-card rounded-2xl shadow-lg shadow-black/5 border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>رقم</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>الأولوية</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>تاريخ الإنشاء</TableHead>
                <TableHead className="text-right">إجراء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">جاري التحميل...</TableCell></TableRow>
              ) : complaints.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">لا توجد شكاوى {statusFilter ? `بحالة "${statusFilter}"` : ''}</TableCell></TableRow>
              ) : (
                complaints.map((c: {
                  id: number;
                  customer_name?: string;
                  type_name?: string;
                  priority?: string;
                  status: string;
                  created_at?: string;
                }) => (
                  <TableRow key={c.id} className="hover:bg-muted/20 transition-colors">
                    <TableCell className="font-mono text-sm text-primary font-bold">#{c.id}</TableCell>
                    <TableCell className="font-medium">{c.customer_name ?? '-'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{c.type_name ?? '-'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${
                        c.priority === 'عالية' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                        c.priority === 'متوسطة' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                        'bg-green-500/10 text-green-500 border-green-500/20'
                      }`}>
                        {c.priority ?? 'متوسطة'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(c.status)}`}>
                        {c.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString('ar-EG') : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/complaints/${c.id}`}>
                        <Button variant="ghost" size="sm" className="rounded-lg h-8 px-3 text-xs">
                          <Eye className="w-3.5 h-3.5 mr-1" /> عرض
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border/50">
            <span className="text-sm text-muted-foreground">إجمالي {total} شكوى</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded-lg">السابق</Button>
              <span className="text-sm px-3 py-1 bg-muted rounded-lg">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="rounded-lg">التالي</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
