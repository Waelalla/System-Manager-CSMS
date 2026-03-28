import { useState, useEffect, useRef } from 'react';
import { useListComplaints } from '@workspace/api-client-react';
import { Globe, Eye, X, ChevronDown, Filter, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link, useLocation } from 'wouter';

const ALL_STATUSES = ['جديدة', 'مستلمة', 'جاري المعالجة', 'مصعدة', 'تصعيد إداري', 'محلول', 'مغلق', 'مرفوض'];

const PORTAL_CHANNEL = 'بوابة إلكترونية';

export default function PortalComplaints() {
  const [location] = useLocation();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('status');
    if (s) { setStatusFilter(s); setShowFilters(true); }
  }, [location]);

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setSearchQuery(val.trim());
      setPage(1);
    }, 400);
  };

  const { data, isLoading } = useListComplaints({
    page,
    limit: 15,
    status: statusFilter || undefined,
    channel: PORTAL_CHANNEL,
    search: searchQuery || undefined,
  });

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
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-indigo-400" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">شكاوى البوابة الإلكترونية</h1>
          </div>
          <p className="text-muted-foreground mt-1 mr-13">الشكاوى المقدمة من العملاء عبر البوابة العامة</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="rounded-xl border-border/50"
            onClick={() => setShowFilters(f => !f)}
          >
            <Filter className="w-4 h-4 mr-2" />
            تصفية بالحالة
            {statusFilter && <span className="mr-2 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs">{statusFilter}</span>}
            <ChevronDown className={`w-4 h-4 mr-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          value={searchInput}
          onChange={e => handleSearchChange(e.target.value)}
          placeholder="بحث برقم الشكوى، الاسم، أو رقم الهاتف..."
          className="pr-10 h-11 rounded-xl border-border/50"
          dir="rtl"
        />
        {searchInput && (
          <button
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => { setSearchInput(''); setSearchQuery(''); setPage(1); }}
          >
            <X className="w-4 h-4" />
          </button>
        )}
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
                <TableHead>رقم المرجع</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>الهاتف</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>الأولوية</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>تاريخ الإنشاء</TableHead>
                <TableHead className="text-right">إجراء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">جاري التحميل...</TableCell></TableRow>
              ) : complaints.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <Globe className="w-10 h-10 text-muted-foreground/30" />
                      <p className="text-muted-foreground">
                        {searchQuery
                          ? `لا توجد نتائج للبحث عن "${searchQuery}"`
                          : `لا توجد شكاوى من البوابة الإلكترونية ${statusFilter ? `بحالة "${statusFilter}"` : ''}`}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                complaints.map((c: {
                  id: number;
                  customer_name?: string;
                  customer_phone?: string;
                  type_name?: string;
                  priority?: string;
                  status: string;
                  created_at?: string;
                }) => (
                  <TableRow key={c.id} className="hover:bg-muted/20 transition-colors">
                    <TableCell className="font-mono text-sm text-indigo-400 font-bold">
                      PUB-{String(c.id).padStart(6, '0')}
                    </TableCell>
                    <TableCell className="font-medium">{c.customer_name ?? '-'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm font-mono" dir="ltr">{c.customer_phone ?? '-'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{c.type_name ?? '-'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${
                        c.priority === 'عالية' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                        c.priority === 'متوسطة' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                        'bg-green-500/10 text-green-500 border-green-500/20'
                      }`}>
                        {c.priority ?? 'عادية'}
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
            <span className="text-sm text-muted-foreground">إجمالي {total} شكوى من البوابة</span>
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
