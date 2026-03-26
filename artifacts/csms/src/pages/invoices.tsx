import { useState } from 'react';
import { useListInvoices, useListCustomers } from '@workspace/api-client-react';
import { useTranslation } from '@/lib/i18n';
import { FileText, Search, Plus, CheckCircle, Clock, AlertCircle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const statusColors: Record<string, string> = {
  'مدفوع': 'bg-green-500/10 text-green-500 border-green-500/20',
  'غير مدفوع': 'bg-red-500/10 text-red-500 border-red-500/20',
  'جزئي': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
};

export default function Invoices() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const { data, isLoading } = useListInvoices({ page, limit: 15, ...(status ? { status } : {}) });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">الفواتير</h1>
          <p className="text-muted-foreground mt-1">
            إجمالي الفواتير: {(data?.meta?.total || 0).toLocaleString()}
          </p>
        </div>
        <Button className="rounded-xl shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-accent hover:opacity-90 hover:-translate-y-0.5 transition-all">
          <Plus className="w-5 h-5 mr-2" />
          إضافة فاتورة
        </Button>
      </div>

      <div className="bg-card rounded-2xl p-4 shadow-sm border border-border/50 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="بحث برقم الفاتورة..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-4 pr-10 rounded-xl bg-background/50 border-border/50 h-11"
          />
        </div>
        <select
          className="h-11 px-4 rounded-xl bg-background/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-primary/20"
          value={status}
          onChange={e => setStatus(e.target.value)}
        >
          <option value="">كل الحالات</option>
          <option value="مدفوع">مدفوع</option>
          <option value="غير مدفوع">غير مدفوع</option>
          <option value="جزئي">جزئي</option>
        </select>
      </div>

      <div className="bg-card rounded-2xl shadow-lg shadow-black/5 border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>رقم الفاتورة</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>المنتج</TableHead>
                <TableHead>الفرع</TableHead>
                <TableHead>المبلغ</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>تاريخ الفاتورة</TableHead>
                <TableHead>متابع؟</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    جاري التحميل...
                  </TableCell>
                </TableRow>
              ) : !data?.data?.length ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    لا توجد فواتير
                  </TableCell>
                </TableRow>
              ) : data.data.map((invoice) => (
                <TableRow key={invoice.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="font-mono text-sm font-semibold text-primary">{invoice.invoice_number}</TableCell>
                  <TableCell className="font-medium text-foreground">{invoice.customer_name}</TableCell>
                  <TableCell className="text-muted-foreground">{invoice.product_name || '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{invoice.branch_name || '—'}</TableCell>
                  <TableCell className="font-semibold">{parseFloat(invoice.amount as string).toLocaleString('ar-EG')} ج.م</TableCell>
                  <TableCell>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[invoice.status] || 'bg-muted text-muted-foreground border-border'}`}>
                      {invoice.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString('ar-EG') : '—'}
                  </TableCell>
                  <TableCell>
                    {(invoice as { has_follow_up?: boolean }).has_follow_up ? (
                      <span className="flex items-center gap-1 text-xs text-green-500 font-medium">
                        <CheckCircle className="w-3.5 h-3.5" /> متابع
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" /> لا
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="p-4 border-t border-border/50 flex items-center justify-between text-sm text-muted-foreground bg-muted/10">
          <div>صفحة {data?.meta?.page || 1} من {data?.meta?.totalPages || 1}</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="rounded-lg">السابق</Button>
            <Button variant="outline" size="sm" disabled={page === (data?.meta?.totalPages || 1)} onClick={() => setPage(p => p + 1)} className="rounded-lg">التالي</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
