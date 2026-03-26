import { useState } from 'react';
import { useListInvoices, useCreateFollowUp } from '@workspace/api-client-react';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/i18n';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock, RefreshCw, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface RatingDialogState {
  invoiceId: number;
  invoiceNumber: string;
  customerId: number;
  rating: number;
  comment: string;
}

export default function FollowUps() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number[]>([]);
  const [processing, setProcessing] = useState(false);
  const [ratingDialog, setRatingDialog] = useState<RatingDialogState | null>(null);
  const [ratingError, setRatingError] = useState('');

  const { data, isLoading, refetch } = useListInvoices({ page, limit: 15, untracked_today: true });
  const { mutateAsync: createFollowUp } = useCreateFollowUp();


  const untrackedInvoices = data?.data ?? [];

  const handleToggleSelect = (id: number) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selected.length === untrackedInvoices.length) {
      setSelected([]);
    } else {
      setSelected(untrackedInvoices.map(inv => inv.id));
    }
  };

  const handleMarkFollowedUp = async () => {
    if (!selected.length) return;
    setProcessing(true);
    try {
      await createFollowUp({ data: { invoice_ids: selected, assigned_user_id: user?.id ?? 1 } });
      setSelected([]);
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      await refetch();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmitRating = async () => {
    if (!ratingDialog) return;
    if (!ratingDialog.rating) { setRatingError('يرجى اختيار تقييم'); return; }
    setProcessing(true);
    setRatingError('');
    try {
      await createFollowUp({
        data: {
          invoice_ids: [ratingDialog.invoiceId],
          assigned_user_id: user?.id ?? 1,
          notes: { rating: ratingDialog.rating, comment: ratingDialog.comment },
        }
      });
      setRatingDialog(null);
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      await refetch();
    } catch (err) {
      console.error(err);
      setRatingError('حدث خطأ أثناء الحفظ');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">متابعة الفواتير</h1>
          <p className="text-muted-foreground mt-1">
            الفواتير التي لم يتم متابعتها مع العملاء
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="rounded-xl border-border/50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            تحديث
          </Button>
          {selected.length > 0 && (
            <Button
              onClick={handleMarkFollowedUp}
              disabled={processing}
              className="rounded-xl shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              تمييز كمتابع ({selected.length})
            </Button>
          )}
        </div>
      </div>

      {selected.length > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
          <p className="text-sm font-medium text-primary">
            تم تحديد {selected.length} فاتورة
          </p>
          <Button variant="ghost" size="sm" onClick={() => setSelected([])} className="text-muted-foreground hover:text-foreground">
            إلغاء التحديد
          </Button>
        </div>
      )}

      <div className="bg-card rounded-2xl shadow-lg shadow-black/5 border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={selected.length === untrackedInvoices.length && untrackedInvoices.length > 0}
                    onChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>رقم الفاتورة</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>الفرع</TableHead>
                <TableHead>المبلغ</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>تاريخ الإنشاء</TableHead>
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
                  <TableCell colSpan={8} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="w-8 h-8 text-green-500" />
                      <span className="text-sm">جميع الفواتير تمت متابعتها</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : data.data.map(invoice => {
                const hasFollowUp = (invoice as { has_follow_up?: boolean }).has_follow_up;
                const isSelected = selected.includes(invoice.id);
                return (
                  <TableRow
                    key={invoice.id}
                    className={`hover:bg-muted/20 transition-colors cursor-pointer ${isSelected ? 'bg-primary/5' : ''}`}
                    onClick={() => !hasFollowUp && handleToggleSelect(invoice.id)}
                  >
                    <TableCell>
                      {!hasFollowUp && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(invoice.id)}
                          onClick={e => e.stopPropagation()}
                          className="rounded"
                        />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-semibold text-primary">{invoice.invoice_number}</TableCell>
                    <TableCell>
                      <p className="font-medium text-foreground">{invoice.customer_name}</p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{invoice.branch_name || '—'}</TableCell>
                    <TableCell className="font-semibold">{parseFloat(invoice.amount as string).toLocaleString('ar-EG')} ج.م</TableCell>
                    <TableCell>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                        invoice.status === 'مدفوع'
                          ? 'bg-green-500/10 text-green-500 border-green-500/20'
                          : invoice.status === 'غير مدفوع'
                          ? 'bg-red-500/10 text-red-500 border-red-500/20'
                          : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                      }`}>
                        {invoice.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {invoice.created_at ? new Date(invoice.created_at).toLocaleDateString('ar-EG') : '—'}
                    </TableCell>
                    <TableCell>
                      {hasFollowUp ? (
                        <span className="flex items-center gap-1 text-xs text-green-500 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> متابع
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-lg border-primary/30 text-primary hover:bg-primary/10 h-7 px-2 text-xs"
                          onClick={e => {
                            e.stopPropagation();
                            setRatingDialog({ invoiceId: invoice.id, invoiceNumber: invoice.invoice_number, customerId: invoice.customer_id, rating: 0, comment: '' });
                          }}
                        >
                          <Star className="w-3 h-3 mr-1" /> تقييم
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
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

      {ratingDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl border border-border p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold mb-1">تقييم المتابعة</h3>
            <p className="text-sm text-muted-foreground mb-4">فاتورة: {ratingDialog.invoiceNumber}</p>

            <div className="mb-4">
              <p className="text-sm font-medium mb-2">التقييم <span className="text-destructive">*</span></p>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setRatingDialog(d => d ? { ...d, rating: star } : d)}
                    className={`w-10 h-10 rounded-full transition-all ${ratingDialog.rating >= star ? 'text-yellow-400 scale-110' : 'text-muted-foreground/30 hover:text-yellow-300'}`}
                  >
                    <Star className={`w-8 h-8 ${ratingDialog.rating >= star ? 'fill-yellow-400' : ''}`} />
                  </button>
                ))}
              </div>
              {ratingDialog.rating > 0 && (
                <p className="text-center text-xs text-muted-foreground mt-2">
                  {ratingDialog.rating <= 2 ? '⚠️ سيتم إنشاء شكوى تلقائياً بسبب التقييم المنخفض' : ''}
                </p>
              )}
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium block mb-1">ملاحظات اختيارية</label>
              <textarea
                className="w-full h-20 rounded-xl bg-background/50 border border-border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="أضف ملاحظاتك هنا..."
                value={ratingDialog.comment}
                onChange={e => setRatingDialog(d => d ? { ...d, comment: e.target.value } : d)}
              />
            </div>

            {ratingError && <p className="text-sm text-destructive mb-3">{ratingError}</p>}

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => { setRatingDialog(null); setRatingError(''); }} className="rounded-xl">إلغاء</Button>
              <Button
                onClick={handleSubmitRating}
                disabled={processing}
                className="rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-90"
              >
                {processing ? 'جاري الحفظ...' : 'حفظ التقييم'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
