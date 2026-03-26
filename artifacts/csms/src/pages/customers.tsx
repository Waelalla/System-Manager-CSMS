import { useState } from 'react';
import {
  useListCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer,
  useGetCustomer, useListBranches, useListInvoices, useListComplaints,
  type CustomerItem, type InvoiceItem,
} from '@workspace/api-client-react';
import { useTranslation } from '@/lib/i18n';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Plus, Upload, Search, Edit, Trash2, Eye, X, User, Phone, MapPin, Building2, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

type CustomerForm = {
  name: string;
  phone: string;
  type: string;
  governorate: string;
  branch_id: string;
  address: string;
};

const emptyForm: CustomerForm = { name: '', phone: '', type: 'فردي', governorate: 'القاهرة', branch_id: '', address: '' };

const GOVERNORATES = ['القاهرة','الجيزة','الإسكندرية','الشرقية','الدقهلية','البحيرة','المنوفية','القليوبية','الغربية','الفيوم','بني سويف','المنيا','أسيوط','سوهاج','قنا','الأقصر','أسوان','البحر الأحمر','السويس','الإسماعيلية','بورسعيد','دمياط','كفر الشيخ','مطروح','شمال سيناء','جنوب سيناء','الوادي الجديد'];

export default function Customers() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [branchId, setBranchId] = useState('');
  const [profileId, setProfileId] = useState<number | null>(null);
  const [editCustomer, setEditCustomer] = useState<{ id: number } & CustomerForm | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useListCustomers({ page, limit: 10, search, branch_id: branchId ? parseInt(branchId) : undefined });
  const { data: branchesData } = useListBranches({ query: { queryKey: ['listBranchesCustomers'] } });
  const branches = branchesData?.data ?? [];
  const { mutateAsync: deleteCustomer, isPending: deleting } = useDeleteCustomer();

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteCustomer({ id: deleteId });
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      toast({ title: 'تم الحذف', description: 'تم حذف العميل بنجاح' });
      setDeleteId(null);
    } catch {
      toast({ title: 'خطأ', description: 'فشل حذف العميل', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('customers.title')}</h1>
          <p className="text-muted-foreground mt-1">إدارة قاعدة بيانات العملاء ({(data?.meta?.total || 0).toLocaleString()})</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate('/settings')} className="rounded-xl border-border/50 hover:bg-card hover:shadow-md transition-all">
            <Upload className="w-4 h-4 mr-2" />
            {t('customers.import')}
          </Button>
          <AddCustomerDialog branches={branches} />
        </div>
      </div>

      <div className="bg-card rounded-2xl p-4 shadow-sm border border-border/50 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder={t('common.search')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-4 pr-10 rounded-xl bg-background/50 border-border/50 h-11"
          />
        </div>
        <select
          value={branchId}
          onChange={e => { setBranchId(e.target.value); setPage(1); }}
          className="h-11 px-4 rounded-xl bg-background/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">كل الفروع</option>
          {branches.map((b: { id: number; name: string }) => (
            <option key={b.id} value={String(b.id)}>{b.name}</option>
          ))}
        </select>
      </div>

      <div className="bg-card rounded-2xl shadow-lg shadow-black/5 border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>{t('customers.code')}</TableHead>
                <TableHead>{t('customers.name')}</TableHead>
                <TableHead>{t('customers.phone')}</TableHead>
                <TableHead>{t('customers.type')}</TableHead>
                <TableHead>{t('customers.branch')}</TableHead>
                <TableHead>الفواتير</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    <div className="animate-pulse flex items-center justify-center gap-2">
                      <div className="w-4 h-4 bg-primary rounded-full animate-bounce"></div>
                      {t('common.loading')}
                    </div>
                  </TableCell>
                </TableRow>
              ) : data?.data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">لا يوجد عملاء</TableCell>
                </TableRow>
              ) : data?.data?.map((customer) => (
                <TableRow key={customer.id} className="hover:bg-muted/20 transition-colors group cursor-pointer" onClick={() => setProfileId(customer.id)}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{customer.code}</TableCell>
                  <TableCell className="font-medium text-foreground hover:text-primary transition-colors">{customer.name}</TableCell>
                  <TableCell dir="ltr" className="text-right">{customer.phone}</TableCell>
                  <TableCell>
                    <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                      {customer.type}
                    </span>
                  </TableCell>
                  <TableCell>{customer.branch_name || <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                  <TableCell>{customer.invoice_count || 0}</TableCell>
                  <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-sky-400 hover:bg-sky-500/10" onClick={() => setProfileId(customer.id)} title="عرض البروفايل">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:bg-blue-500/10" title="تعديل"
                        onClick={() => setEditCustomer({
                          id: customer.id,
                          name: customer.name,
                          phone: customer.phone,
                          type: customer.type,
                          governorate: customer.governorate ?? '',
                          branch_id: customer.branch_id ? String(customer.branch_id) : '',
                          address: customer.address ?? '',
                        })}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" title="حذف" onClick={() => setDeleteId(customer.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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

      {/* Profile Sheet */}
      {profileId !== null && (
        <CustomerProfileSheet customerId={profileId} onClose={() => setProfileId(null)} />
      )}

      {/* Edit Dialog */}
      {editCustomer && (
        <EditCustomerDialog customer={editCustomer} branches={branches} onClose={() => setEditCustomer(null)} />
      )}

      {/* Delete Confirm */}
      <Dialog open={deleteId !== null} onOpenChange={o => !o && setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm bg-card border-border rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-destructive">تأكيد الحذف</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground mt-2">هل أنت متأكد من حذف هذا العميل؟ لا يمكن التراجع عن هذا الإجراء.</p>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setDeleteId(null)} className="rounded-xl">إلغاء</Button>
            <Button variant="destructive" disabled={deleting} onClick={handleDelete} className="rounded-xl">
              {deleting ? 'جاري الحذف...' : 'حذف'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddCustomerDialog({ branches }: { branches: { id: number; name: string }[] }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { mutateAsync: create, isPending } = useCreateCustomer();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CustomerForm>(emptyForm);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const branchNum = form.branch_id ? parseInt(form.branch_id) : undefined;
      await create({ data: { name: form.name, phone: form.phone, type: form.type, governorate: form.governorate, address: form.address, ...(branchNum != null ? { branch_id: branchNum } : {}) } });
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      toast({ title: 'تم الإضافة', description: `تم إضافة العميل "${form.name}" بنجاح` });
      setOpen(false);
      setForm(emptyForm);
    } catch {
      toast({ title: 'خطأ', description: 'فشلت إضافة العميل', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-accent hover:opacity-90 hover:-translate-y-0.5 transition-all">
          <Plus className="w-5 h-5 mr-2" />
          {t('customers.add')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] p-6 bg-card border-border shadow-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{t('customers.add')}</DialogTitle>
        </DialogHeader>
        <CustomerFormFields form={form} setForm={setForm} branches={branches} />
        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl">{t('common.cancel')}</Button>
          <Button onClick={handleSubmit} disabled={isPending} className="rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
            {isPending ? t('common.loading') : t('common.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditCustomerDialog({ customer, branches, onClose }: { customer: { id: number } & CustomerForm; branches: { id: number; name: string }[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { mutateAsync: update, isPending } = useUpdateCustomer();
  const { toast } = useToast();
  const [form, setForm] = useState<CustomerForm>({
    name: customer.name,
    phone: customer.phone,
    type: customer.type,
    governorate: customer.governorate,
    branch_id: customer.branch_id,
    address: customer.address,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const branchIdNum = form.branch_id ? parseInt(form.branch_id) : undefined;
      await update({ id: customer.id, data: { name: form.name, phone: form.phone, type: form.type, governorate: form.governorate, address: form.address, ...(branchIdNum != null ? { branch_id: branchIdNum } : {}) } });
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      toast({ title: 'تم التعديل', description: 'تم تحديث بيانات العميل بنجاح' });
      onClose();
    } catch {
      toast({ title: 'خطأ', description: 'فشل تعديل العميل', variant: 'destructive' });
    }
  };

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-[500px] p-6 bg-card border-border shadow-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">تعديل بيانات العميل</DialogTitle>
        </DialogHeader>
        <CustomerFormFields form={form} setForm={setForm} branches={branches} />
        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl">إلغاء</Button>
          <Button onClick={handleSubmit} disabled={isPending} className="rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
            {isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CustomerFormFields({ form, setForm, branches }: { form: CustomerForm; setForm: (f: CustomerForm) => void; branches: { id: number; name: string }[] }) {
  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">الاسم *</label>
          <Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="rounded-xl bg-background/50 border-border/50" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">الهاتف *</label>
          <Input required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="rounded-xl bg-background/50 border-border/50 text-right" dir="ltr" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">النوع</label>
          <select className="w-full h-10 px-3 rounded-xl bg-background/50 border border-border/50 text-foreground outline-none" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
            <option value="فردي">فردي</option>
            <option value="شركة">شركة</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">المحافظة</label>
          <select className="w-full h-10 px-3 rounded-xl bg-background/50 border border-border/50 text-foreground outline-none" value={form.governorate} onChange={e => setForm({ ...form, governorate: e.target.value })}>
            {GOVERNORATES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">الفرع</label>
        <select className="w-full h-10 px-3 rounded-xl bg-background/50 border border-border/50 text-foreground outline-none" value={form.branch_id} onChange={e => setForm({ ...form, branch_id: e.target.value })}>
          <option value="">بدون فرع</option>
          {branches.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">العنوان</label>
        <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="rounded-xl bg-background/50 border-border/50" placeholder="العنوان التفصيلي (اختياري)" />
      </div>
    </div>
  );
}

type ComplaintSummary = { id: number; subject: string; type_name?: string; status: string };

function CustomerProfileSheet({ customerId, onClose }: { customerId: number; onClose: () => void }) {
  const { data: customer, isLoading } = useGetCustomer(customerId, { query: { queryKey: ['getCustomer', customerId] } });
  const { data: invoicesData } = useListInvoices({ customer_id: customerId, limit: 5 }, { query: { queryKey: ['customerInvoices', customerId] } });
  const { data: complaintsData } = useListComplaints({ customer_id: customerId, limit: 5 }, { query: { queryKey: ['customerComplaints', customerId] } });

  const c = customer as CustomerItem | undefined;
  const invoices: InvoiceItem[] = (invoicesData?.data ?? []) as InvoiceItem[];
  const complaints: ComplaintSummary[] = ((complaintsData as { data?: ComplaintSummary[] } | undefined)?.data ?? []);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" dir="rtl">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card border-l border-border shadow-2xl h-full overflow-y-auto animate-in slide-in-from-right duration-300">
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold">بروفايل العميل</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-9 w-9">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground">جاري التحميل...</div>
        ) : !c ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground">لم يتم العثور على العميل</div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-primary/20">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-foreground">{c.name}</h3>
                <p className="text-sm text-muted-foreground font-mono">{c.code}</p>
                <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">{c.type}</span>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-3">
              <InfoCard icon={<Phone className="w-4 h-4" />} label="الهاتف" value={c.phone} dir="ltr" />
              <InfoCard icon={<MapPin className="w-4 h-4" />} label="المحافظة" value={c.governorate || '—'} />
              <InfoCard icon={<Building2 className="w-4 h-4" />} label="الفرع" value={c.branch_name || '—'} />
              {c.address && <InfoCard icon={<MapPin className="w-4 h-4" />} label="العنوان" value={c.address} />}
            </div>

            {/* Invoices */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-primary" />
                <h4 className="font-semibold text-foreground">آخر الفواتير ({invoices.length})</h4>
              </div>
              {invoices.length === 0 ? (
                <p className="text-muted-foreground text-sm">لا توجد فواتير مسجلة</p>
              ) : (
                <div className="space-y-2">
                  {invoices.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/50">
                      <div>
                        <p className="text-sm font-medium font-mono">{inv.invoice_number}</p>
                        <p className="text-xs text-muted-foreground">{inv.invoice_date}</p>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-primary">{Number(inv.amount).toLocaleString()} ج.م</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${inv.status === 'مدفوع' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                          {inv.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Complaints */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-destructive" />
                <h4 className="font-semibold text-foreground">آخر الشكاوى ({complaints.length})</h4>
              </div>
              {complaints.length === 0 ? (
                <p className="text-muted-foreground text-sm">لا توجد شكاوى مسجلة</p>
              ) : (
                <div className="space-y-2">
                  {complaints.map(comp => (
                    <div key={comp.id} className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/50">
                      <div>
                        <p className="text-sm font-medium">{comp.subject}</p>
                        <p className="text-xs text-muted-foreground">{comp.type_name}</p>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">{comp.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoCard({ icon, label, value, dir }: { icon: React.ReactNode; label: string; value: string; dir?: string }) {
  return (
    <div className="p-3 rounded-xl bg-background/50 border border-border/50">
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <p className="font-medium text-foreground text-sm" dir={dir}>{value}</p>
    </div>
  );
}
