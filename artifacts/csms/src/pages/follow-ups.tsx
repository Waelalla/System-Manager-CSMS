import { useState } from 'react';
import { Link } from 'wouter';
import { useListInvoices, useCreateFollowUp } from '@workspace/api-client-react';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/i18n';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock, RefreshCw, Star, X, Phone, MapPin, User, FileText, AlertTriangle, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

const STATUS_BADGE: Record<string, string> = {
  'جديدة':         'bg-blue-500/10 text-blue-500',
  'مستلمة':        'bg-yellow-500/10 text-yellow-600',
  'جاري المعالجة': 'bg-purple-500/10 text-purple-500',
  'مصعدة':         'bg-orange-500/10 text-orange-500',
  'تصعيد إداري':   'bg-red-500/10 text-red-500',
  'محلول':         'bg-teal-500/10 text-teal-500',
  'مغلق':          'bg-green-500/10 text-green-500',
  'مرفوض':         'bg-muted/50 text-muted-foreground',
};

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <button
          key={s}
          type="button"
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(s === value ? 0 : s)}
          className="focus:outline-none p-0.5"
        >
          <Star
            className={`w-6 h-6 transition-colors ${(hover || value) >= s ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`}
          />
        </button>
      ))}
      {value > 0 && (
        <span className="text-xs text-muted-foreground mr-2 self-center">{value}/5</span>
      )}
    </div>
  );
}

interface QuestionAnswer {
  id: string;
  question: string;
  rating: number;
  note: string;
}

const DEFAULT_QUESTIONS: QuestionAnswer[] = [
  { id: '1', question: 'كيف تقيّم جودة المنتج الذي استلمته؟', rating: 0, note: '' },
  { id: '2', question: 'كيف تقيّم سرعة التسليم والخدمة اللوجستية؟', rating: 0, note: '' },
  { id: '3', question: 'كيف تقيّم تعامل فريق خدمة العملاء معك؟', rating: 0, note: '' },
  { id: '4', question: 'هل الفاتورة تعكس ما حصلت عليه بشكل صحيح؟', rating: 0, note: '' },
  { id: '5', question: 'هل توصي بخدماتنا لمعارفك؟', rating: 0, note: '' },
];

type InvoiceDetail = {
  id: number;
  invoice_number: string;
  invoice_date: string;
  amount: string;
  status: string;
  product_name?: string;
  customer_id: number;
  customer_name?: string;
  customer_phone?: string;
  customer_type?: string;
  customer_governorate?: string;
  branch_name?: string;
  last_complaint?: {
    id: number;
    status: string;
    priority: string;
    description: string;
    created_at: string;
    type_name?: string;
  } | null;
};

function InvoiceDetailDrawer({
  invoiceId,
  onClose,
  onSubmit,
  submitting,
}: {
  invoiceId: number;
  onClose: () => void;
  onSubmit: (data: { overallRating: number; answers: QuestionAnswer[]; generalNote: string }) => void;
  submitting: boolean;
}) {
  const { data: invoiceRaw, isLoading } = useQuery<InvoiceDetail>({
    queryKey: ['invoiceDetail', invoiceId],
    queryFn: async () => {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/invoices/${invoiceId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Invoice not found');
      return res.json();
    },
    enabled: !!invoiceId,
  });
  const invoice = invoiceRaw as InvoiceDetail | undefined;

  const [overallRating, setOverallRating] = useState(0);
  const [generalNote, setGeneralNote] = useState('');
  const [answers, setAnswers] = useState<QuestionAnswer[]>(DEFAULT_QUESTIONS.map(q => ({ ...q })));

  const setAnswer = (id: string, patch: Partial<QuestionAnswer>) => {
    setAnswers(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));
  };

  return (
    <div className="fixed inset-0 z-50 flex" dir="rtl">
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-xl bg-background shadow-2xl flex flex-col h-full overflow-hidden border-r border-border/50">
        <div className="flex items-center justify-between p-5 border-b border-border/50 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold">تفاصيل متابعة الفاتورة</h2>
            {invoice && <p className="text-sm text-muted-foreground mt-0.5">فاتورة #{invoice.invoice_number}</p>}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted/50 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-12 animate-pulse">جاري تحميل البيانات...</div>
          ) : invoice ? (
            <>
              <div className="bg-card rounded-2xl p-4 border border-border/50 space-y-3">
                <h3 className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4" /> بيانات الفاتورة
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs">رقم الفاتورة</span>
                    <p className="font-semibold">{invoice.invoice_number}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">المبلغ</span>
                    <p className="font-bold text-green-400">{Number(invoice.amount).toLocaleString('ar-EG')} ج.م</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">الحالة</span>
                    <p className="font-medium">{invoice.status}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">تاريخ الفاتورة</span>
                    <p className="font-medium">{invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString('ar-EG') : '-'}</p>
                  </div>
                  {invoice.product_name && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground text-xs">المنتج</span>
                      <p className="font-medium">{invoice.product_name}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-card rounded-2xl p-4 border border-border/50 space-y-3">
                <h3 className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                  <User className="w-4 h-4" /> بيانات العميل
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="col-span-2">
                    <span className="text-muted-foreground text-xs">الاسم</span>
                    <p className="font-semibold text-base">{invoice.customer_name ?? '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs flex items-center gap-1"><Phone className="w-3 h-3" /> الهاتف</span>
                    <p className="font-medium">{invoice.customer_phone ?? '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">النوع</span>
                    <p className="font-medium">{invoice.customer_type ?? '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs flex items-center gap-1"><MapPin className="w-3 h-3" /> المحافظة</span>
                    <p className="font-medium">{invoice.customer_governorate ?? '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">الفرع</span>
                    <p className="font-medium">{invoice.branch_name ?? '-'}</p>
                  </div>
                </div>
              </div>

              {invoice.last_complaint ? (
                <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-4 space-y-2">
                  <h3 className="text-sm font-bold text-orange-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> آخر شكوى للعميل
                  </h3>
                  <div className="text-sm space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[invoice.last_complaint.status] ?? 'bg-muted/50'}`}>
                        {invoice.last_complaint.status}
                      </span>
                      {invoice.last_complaint.type_name && (
                        <span className="text-xs text-muted-foreground">{invoice.last_complaint.type_name}</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(invoice.last_complaint.created_at).toLocaleDateString('ar-EG')}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs line-clamp-2">{invoice.last_complaint.description}</p>
                    <Link href={`/complaints/${invoice.last_complaint.id}`} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                      عرض الشكوى <ChevronLeft className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-3 text-center text-sm text-green-400">
                  لا توجد شكاوى مسجلة لهذا العميل
                </div>
              )}

              <div className="bg-card rounded-2xl p-4 border border-border/50 space-y-5">
                <div>
                  <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-400" /> التقييم العام
                  </h3>
                  <StarRating value={overallRating} onChange={setOverallRating} />
                </div>

                <div className="border-t border-border/30 pt-4 space-y-5">
                  <p className="text-sm font-bold">أسئلة التقييم</p>
                  {answers.map((a) => (
                    <div key={a.id} className="space-y-2 pb-4 border-b border-border/20 last:border-0 last:pb-0">
                      <p className="text-sm font-medium leading-relaxed text-foreground/90">{a.question}</p>
                      <StarRating value={a.rating} onChange={v => setAnswer(a.id, { rating: v })} />
                      <textarea
                        value={a.note}
                        onChange={e => setAnswer(a.id, { note: e.target.value })}
                        placeholder="ملاحظات العميل على هذا السؤال (اختياري)..."
                        rows={2}
                        className="w-full bg-background/60 border border-input rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground"
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-2 pt-1">
                  <p className="text-sm font-bold">ملاحظة عامة</p>
                  <textarea
                    value={generalNote}
                    onChange={e => setGeneralNote(e.target.value)}
                    placeholder="أي ملاحظات إضافية من العميل..."
                    rows={3}
                    className="w-full bg-background/60 border border-input rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-destructive py-12">الفاتورة غير موجودة</div>
          )}
        </div>

        <div className="p-5 border-t border-border/50 flex-shrink-0 flex gap-3">
          <Button
            onClick={() => onSubmit({ overallRating, answers, generalNote })}
            disabled={submitting || isLoading || !invoice}
            className="flex-1 rounded-xl h-11 shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-accent hover:opacity-90"
          >
            {submitting ? (
              <><Clock className="w-4 h-4 ml-2 animate-spin" /> جاري الحفظ...</>
            ) : (
              <><CheckCircle2 className="w-4 h-4 ml-2" /> حفظ المتابعة</>
            )}
          </Button>
          <Button variant="outline" onClick={onClose} className="rounded-xl h-11 px-5">
            إلغاء
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function FollowUps() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number[]>([]);
  const [processing, setProcessing] = useState(false);
  const [activeInvoiceId, setActiveInvoiceId] = useState<number | null>(null);

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
      toast({ title: 'تم التمييز', description: `تم تسجيل متابعة ${selected.length} فاتورة` });
    } catch (err) {
      console.error(err);
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء الحفظ', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleDetailSubmit = async (data: { overallRating: number; answers: QuestionAnswer[]; generalNote: string }) => {
    if (!activeInvoiceId) return;
    setProcessing(true);
    try {
      await createFollowUp({
        data: {
          invoice_ids: [activeInvoiceId],
          assigned_user_id: user?.id ?? 1,
          notes: {
            overall_rating: data.overallRating,
            general_note: data.generalNote,
            questions: data.answers.map(a => ({
              question: a.question,
              rating: a.rating,
              note: a.note,
            })),
          },
        }
      });
      setActiveInvoiceId(null);
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      await refetch();
      toast({ title: 'تم حفظ المتابعة', description: 'تم تسجيل التقييم بنجاح' });
    } catch (err) {
      console.error(err);
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء الحفظ', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {activeInvoiceId && (
        <InvoiceDetailDrawer
          invoiceId={activeInvoiceId}
          onClose={() => setActiveInvoiceId(null)}
          onSubmit={handleDetailSubmit}
          submitting={processing}
        />
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">متابعة الفواتير</h1>
          <p className="text-muted-foreground mt-1">الفواتير التي لم يتم متابعتها مع العملاء</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => refetch()} className="rounded-xl border-border/50">
            <RefreshCw className="w-4 h-4 mr-2" /> تحديث
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
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center justify-between">
          <span className="text-sm font-medium">تم تحديد <strong>{selected.length}</strong> فاتورة</span>
          <Button variant="ghost" onClick={() => setSelected([])} className="h-8 text-xs rounded-lg">
            إلغاء التحديد
          </Button>
        </div>
      )}

      <div className="bg-card rounded-2xl shadow-lg shadow-black/5 border border-border/50 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground animate-pulse">جاري التحميل...</div>
        ) : untrackedInvoices.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground font-medium">لا توجد فواتير تحتاج متابعة اليوم</p>
            <p className="text-xs text-muted-foreground mt-1">جميع فواتير اليوم تمت متابعتها</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selected.length === untrackedInvoices.length && untrackedInvoices.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
                  />
                </TableHead>
                <TableHead>رقم الفاتورة</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>المبلغ</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(untrackedInvoices as (typeof untrackedInvoices[number] & { customer_name?: string; branch_name?: string })[]).map((inv) => (
                <TableRow
                  key={inv.id}
                  className="border-border/50 hover:bg-muted/20 cursor-pointer"
                  onClick={() => setActiveInvoiceId(inv.id)}
                >
                  <TableCell onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.includes(inv.id)}
                      onChange={() => handleToggleSelect(inv.id)}
                      className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
                    />
                  </TableCell>
                  <TableCell className="font-mono font-medium">{inv.invoice_number}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{inv.customer_name ?? `عميل #${inv.customer_id}`}</p>
                      {inv.branch_name && <p className="text-xs text-muted-foreground">{inv.branch_name}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-green-400">{Number(inv.amount).toLocaleString('ar-EG')} ج.م</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs px-2 py-1 rounded-full bg-muted/50">{inv.status}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {inv.invoice_date ? new Date(inv.invoice_date as string).toLocaleDateString('ar-EG') : '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={e => { e.stopPropagation(); setActiveInvoiceId(inv.id); }}
                      className="rounded-lg h-8 text-xs gap-1"
                    >
                      <Star className="w-3 h-3" /> تقييم
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {data && ((data as typeof data & { total_pages?: number }).total_pages ?? 1) > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-xl">
            السابق
          </Button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            {page} / {(data as typeof data & { total_pages?: number }).total_pages ?? 1}
          </span>
          <Button variant="outline" onClick={() => setPage(p => p + 1)} disabled={page === ((data as typeof data & { total_pages?: number }).total_pages ?? 1)} className="rounded-xl">
            التالي
          </Button>
        </div>
      )}
    </div>
  );
}
