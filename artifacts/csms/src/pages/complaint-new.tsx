import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  useCreateComplaint, useListCustomers, useListComplaintTypes,
  useListProducts, useListInvoices, type CreateComplaintRequest,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

const CHANNELS = ['هاتف', 'بريد إلكتروني', 'تطبيق', 'زيارة', 'وسائل التواصل'];
const PRIORITIES = [
  { value: 'منخفضة', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  { value: 'متوسطة', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  { value: 'عالية', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
];

type FormState = {
  customer_id: string;
  type_id: string;
  channel: string;
  priority: string;
  description: string;
  product_id: string;
  invoice_id: string;
};

const emptyForm: FormState = {
  customer_id: '', type_id: '', channel: '', priority: 'متوسطة',
  description: '', product_id: '', invoice_id: '',
};

export default function ComplaintNew() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomerName, setSelectedCustomerName] = useState('');

  const { mutateAsync: createComplaint, isPending } = useCreateComplaint();
  const { data: customersData } = useListCustomers(
    { search: customerSearch, limit: 10 },
    { query: { queryKey: ['customersSearch', customerSearch], enabled: customerSearch.length >= 1 } }
  );
  const { data: typesData } = useListComplaintTypes({ query: { queryKey: ['complaintTypes'] } });
  const { data: productsData } = useListProducts(undefined, { query: { queryKey: ['productsForComplaint'] } });
  const { data: invoicesData } = useListInvoices(
    { customer_id: form.customer_id ? parseInt(form.customer_id) : undefined, limit: 20 },
    { query: { queryKey: ['customerInvoicesForComplaint', form.customer_id], enabled: !!form.customer_id } }
  );

  const customers = customersData?.data ?? [];
  const types = (typesData as { data?: { id: number; name: string; category?: string }[] } | undefined)?.data ?? [];
  const products = (productsData as { data?: { id: number; name: string }[] } | undefined)?.data ?? [];
  const invoices = (invoicesData?.data ?? []) as { id: number; invoice_number: string; amount: string }[];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customer_id || !form.type_id || !form.channel || !form.priority || !form.description.trim()) {
      toast({ title: 'بيانات ناقصة', description: 'يرجى ملء جميع الحقول المطلوبة', variant: 'destructive' });
      return;
    }
    try {
      const payload: CreateComplaintRequest = {
        customer_id: parseInt(form.customer_id),
        type_id: parseInt(form.type_id),
        channel: form.channel,
        priority: form.priority,
        description: form.description.trim(),
        ...(form.product_id ? { product_id: parseInt(form.product_id) } : {}),
        ...(form.invoice_id ? { invoice_id: parseInt(form.invoice_id) } : {}),
      };

      const result = await createComplaint({ data: payload });
      queryClient.invalidateQueries({ queryKey: ['/api/complaints'] });
      toast({ title: 'تم إنشاء الشكوى', description: `شكوى #${(result as { id: number }).id} تم تسجيلها بنجاح` });
      navigate(`/complaints/${(result as { id: number }).id}`);
    } catch {
      toast({ title: 'خطأ', description: 'فشل إنشاء الشكوى، يرجى المحاولة مجدداً', variant: 'destructive' });
    }
  };

  const set = (field: keyof FormState, value: string) => setForm(f => ({ ...f, [field]: value }));

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/complaints" className="p-2 rounded-xl bg-card border border-border/50 hover:bg-muted transition-colors">
          <ArrowRight className="w-5 h-5 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">إنشاء شكوى جديدة</h1>
          <p className="text-muted-foreground mt-1">تسجيل شكوى عميل جديدة في النظام</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Customer */}
        <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm">
          <h2 className="text-base font-semibold mb-4 text-foreground flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">1</span>
            بيانات العميل <span className="text-destructive">*</span>
          </h2>
          <div className="relative">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ابحث باسم العميل أو رقم الهاتف..."
                value={selectedCustomerName || customerSearch}
                onChange={e => {
                  setCustomerSearch(e.target.value);
                  setSelectedCustomerName('');
                  set('customer_id', '');
                  setShowCustomerDropdown(true);
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                className="pr-9 rounded-xl bg-background/50 border-border/50 h-11"
              />
            </div>
            {showCustomerDropdown && customerSearch && customers.length > 0 && !form.customer_id && (
              <div className="absolute top-12 right-0 left-0 z-50 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                {customers.map((c: { id: number; name: string; phone: string; code: string }) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => {
                      set('customer_id', String(c.id));
                      setSelectedCustomerName(`${c.name} — ${c.phone}`);
                      setCustomerSearch('');
                      setShowCustomerDropdown(false);
                    }}
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">{c.name[0]}</div>
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground" dir="ltr">{c.phone}</p>
                    </div>
                    <span className="mr-auto font-mono text-xs text-muted-foreground">{c.code}</span>
                  </div>
                ))}
              </div>
            )}
            {form.customer_id && (
              <div className="mt-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/20 text-sm text-primary flex items-center justify-between">
                <span>✓ {selectedCustomerName}</span>
                <button type="button" onClick={() => { set('customer_id', ''); setSelectedCustomerName(''); }} className="text-xs text-muted-foreground hover:text-destructive">تغيير</button>
              </div>
            )}
          </div>
        </div>

        {/* Type + Channel + Priority */}
        <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm">
          <h2 className="text-base font-semibold mb-4 text-foreground flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">2</span>
            تصنيف الشكوى
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">نوع الشكوى <span className="text-destructive">*</span></label>
              <select
                required
                value={form.type_id}
                onChange={e => set('type_id', e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-background/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">اختر النوع</option>
                {types.map(t => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">قناة الاستقبال <span className="text-destructive">*</span></label>
              <select
                required
                value={form.channel}
                onChange={e => set('channel', e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-background/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">اختر القناة</option>
                {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">الأولوية <span className="text-destructive">*</span></label>
              <div className="flex gap-2">
                {PRIORITIES.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => set('priority', p.value)}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all ${form.priority === p.value ? p.color + ' ring-2 ring-offset-1 ring-primary/30' : 'border-border/50 text-muted-foreground hover:bg-muted'}`}
                  >
                    {p.value}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm">
          <h2 className="text-base font-semibold mb-4 text-foreground flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">3</span>
            وصف المشكلة <span className="text-destructive">*</span>
          </h2>
          <textarea
            required
            rows={5}
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="اكتب وصفاً تفصيلياً للمشكلة التي يواجهها العميل..."
            className="w-full rounded-xl bg-background/50 border border-border/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />
          <div className="text-right text-xs text-muted-foreground mt-1">{form.description.length} حرف</div>
        </div>

        {/* Optional: Product + Invoice */}
        <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm">
          <h2 className="text-base font-semibold mb-4 text-foreground flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center font-bold">4</span>
            معلومات إضافية <span className="text-xs text-muted-foreground font-normal">(اختياري)</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">المنتج المرتبط</label>
              <select
                value={form.product_id}
                onChange={e => set('product_id', e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-background/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">بدون منتج</option>
                {products.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                الفاتورة المرتبطة
                {!form.customer_id && <span className="text-xs mr-2">(اختر عميلاً أولاً)</span>}
              </label>
              <select
                value={form.invoice_id}
                onChange={e => set('invoice_id', e.target.value)}
                disabled={!form.customer_id}
                className="w-full h-10 px-3 rounded-xl bg-background/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              >
                <option value="">بدون فاتورة</option>
                {invoices.map(inv => (
                  <option key={inv.id} value={String(inv.id)}>
                    {inv.invoice_number} — {Number(inv.amount).toLocaleString()} ج.م
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pb-8">
          <Link href="/complaints">
            <Button type="button" variant="outline" className="rounded-xl">إلغاء</Button>
          </Link>
          <Button
            type="submit"
            disabled={isPending || !form.customer_id || !form.type_id || !form.channel || !form.description.trim()}
            className="rounded-xl shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-accent hover:opacity-90 px-8"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                جاري الإنشاء...
              </span>
            ) : (
              <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> إنشاء الشكوى</span>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
