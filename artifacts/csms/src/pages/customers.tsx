import { useState } from 'react';
import { useListCustomers, useCreateCustomer, useListBranches } from '@workspace/api-client-react';
import { useTranslation } from '@/lib/i18n';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Plus, Upload, Search, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function Customers() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [branchId, setBranchId] = useState('');
  
  const { data, isLoading } = useListCustomers({ page, limit: 10, search, branch_id: branchId ? parseInt(branchId) : undefined });
  const { data: branchesData } = useListBranches({ query: { queryKey: ['listBranchesCustomers'] } });
  const branches = branchesData?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('customers.title')}</h1>
          <p className="text-muted-foreground mt-1">إدارة قاعدة بيانات العملاء ({(data?.meta?.total || 0).toLocaleString()})</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/settings')}
            className="rounded-xl border-border/50 hover:bg-card hover:shadow-md transition-all"
          >
            <Upload className="w-4 h-4 mr-2" />
            {t('customers.import')}
          </Button>
          <AddCustomerDialog />
        </div>
      </div>

      <div className="bg-card rounded-2xl p-4 shadow-sm border border-border/50 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input 
            placeholder={t('common.search')} 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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

      {/* Table */}
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
              ) : data?.data?.map((customer) => (
                <TableRow key={customer.id} className="hover:bg-muted/20 transition-colors group">
                  <TableCell className="font-mono text-xs text-muted-foreground">{customer.code}</TableCell>
                  <TableCell className="font-medium text-foreground">{customer.name}</TableCell>
                  <TableCell dir="ltr" className="text-right">{customer.phone}</TableCell>
                  <TableCell>
                    <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                      {customer.type}
                    </span>
                  </TableCell>
                  <TableCell>{customer.branch_name || 'الرئيسي'}</TableCell>
                  <TableCell>{customer.invoice_count || 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:bg-blue-500/10">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination */}
        <div className="p-4 border-t border-border/50 flex items-center justify-between text-sm text-muted-foreground bg-muted/10">
          <div>
            صفحة {data?.meta?.page || 1} من {data?.meta?.totalPages || 1}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="rounded-lg"
            >
              السابق
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={page === (data?.meta?.totalPages || 1)}
              onClick={() => setPage(p => p + 1)}
              className="rounded-lg"
            >
              التالي
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddCustomerDialog() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { mutateAsync: create, isPending } = useCreateCustomer();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '', phone: '', type: 'فردي', governorate: 'القاهرة', branch_id: 1, address: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await create({ data: formData });
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      setOpen(false);
      setFormData({ name: '', phone: '', type: 'فردي', governorate: 'القاهرة', branch_id: 1, address: '' });
    } catch (err) {
      console.error(err);
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
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('customers.name')}</label>
            <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="rounded-xl bg-background/50 border-border/50" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('customers.phone')}</label>
            <Input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="rounded-xl bg-background/50 border-border/50 text-right" dir="ltr" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('customers.type')}</label>
              <select className="w-full h-10 px-3 rounded-xl bg-background/50 border border-border/50 text-foreground outline-none" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                <option value="فردي">فردي</option>
                <option value="شركة">شركة</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">الفرع</label>
              <select className="w-full h-10 px-3 rounded-xl bg-background/50 border border-border/50 text-foreground outline-none" value={formData.branch_id} onChange={e => setFormData({...formData, branch_id: parseInt(e.target.value)})}>
                <option value="1">الرئيسي</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-8">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl">{t('common.cancel')}</Button>
            <Button type="submit" disabled={isPending} className="rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
              {isPending ? t('common.loading') : t('common.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
