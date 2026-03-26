import { useState } from 'react';
import { useListComplaints } from '@workspace/api-client-react';
import { useTranslation } from '@/lib/i18n';
import { Plus, Filter, MessageSquare, AlertCircle, Eye, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link } from 'wouter';

export default function Complaints() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useListComplaints({ page, limit: 15 });

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('complaints.title')}</h1>
          <p className="text-muted-foreground mt-1">تتبع وحل مشاكل العملاء بكفاءة</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl border-border/50">
            <Filter className="w-4 h-4 mr-2" />
            تصفية
          </Button>
          <Button className="rounded-xl shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-accent hover:opacity-90 hover:-translate-y-0.5 transition-all">
            <Plus className="w-5 h-5 mr-2" />
            {t('complaints.add')}
          </Button>
        </div>
      </div>

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
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">جاري التحميل...</TableCell>
                </TableRow>
              ) : data?.data?.map((complaint) => (
                <TableRow key={complaint.id} className="hover:bg-muted/20 transition-colors group cursor-pointer relative">
                  <TableCell className="font-mono text-xs text-muted-foreground">#{complaint.id.toString().padStart(5, '0')}</TableCell>
                  <TableCell>
                    <p className="font-medium text-foreground">{complaint.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{complaint.branch_name}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      {complaint.type_name || 'مشكلة جودة'}
                    </div>
                  </TableCell>
                  <TableCell>
                    {complaint.priority === 'عالية' ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-destructive"><AlertCircle className="w-3 h-3"/> {complaint.priority}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">{complaint.priority}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(complaint.status)}`}>
                      {complaint.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(complaint.created_at || Date.now()).toLocaleDateString('ar-EG')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/complaints/${complaint.id}`} className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors">
                      <Eye className="w-4 h-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
