import { useParams, Link } from 'wouter';
import { useGetComplaint, useUpdateComplaintStatus } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ArrowRight, User, Clock, FileText, AlertTriangle, ShieldAlert, CheckCircle, Navigation, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';

const STATUS_COLORS: Record<string, string> = {
  'جديدة': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'مستلمة': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  'جاري المعالجة': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  'مصعدة': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  'تصعيد إداري': 'bg-red-500/10 text-red-500 border-red-500/20',
  'محلول': 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  'مغلق': 'bg-green-500/10 text-green-500 border-green-500/20',
  'مرفوض': 'bg-muted/50 text-muted-foreground border-muted',
};

export default function ComplaintDetail() {
  const params = useParams();
  const id = parseInt(params.id || '0');
  const { data: complaint, isLoading } = useGetComplaint(id);
  const { mutateAsync: updateStatus, isPending } = useUpdateComplaintStatus();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [noteInput, setNoteInput] = useState('');

  const role = user?.role_name ?? '';
  const isManager = role === 'Manager' || role === 'Manager/Voter';
  const canChangeStatus = role === 'Manager' || role === 'Manager/Voter' || role === 'Customer Service Agent';

  if (isLoading) return <div className="p-8 text-center animate-pulse">جاري تحميل بيانات الشكوى...</div>;
  if (!complaint) return <div className="p-8 text-center text-destructive">الشكوى غير موجودة</div>;

  const handleAction = async (newStatus: string, note?: string) => {
    try {
      await updateStatus({ id, data: { status: newStatus, note: note || `تم تغيير الحالة إلى "${newStatus}"` } });
      queryClient.invalidateQueries({ queryKey: [`/api/complaints/${id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/complaints'] });
      toast({ title: 'تم التحديث', description: `حالة الشكوى: ${newStatus}` });
    } catch {
      toast({ title: 'خطأ', description: 'تعذر تحديث الحالة', variant: 'destructive' });
    }
  };

  const statusColor = STATUS_COLORS[complaint.status] || 'bg-muted/50 text-muted-foreground border-muted';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/complaints" className="p-2 rounded-xl bg-card border border-border/50 hover:bg-muted transition-colors">
          <ArrowRight className="w-5 h-5 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            شكوى #{complaint.id.toString().padStart(5, '0')}
            <span className={`px-3 py-1 text-sm rounded-full border ${statusColor}`}>{complaint.status}</span>
          </h1>
          <p className="text-muted-foreground mt-1">{complaint.type_name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-card rounded-2xl p-6 shadow-lg shadow-black/5 border border-border/50">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-primary"/> تفاصيل المشكلة</h2>
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">{complaint.description}</p>
            {complaint.invoice_id && (
              <p className="mt-3 text-sm text-muted-foreground">رقم الفاتورة: <span className="text-primary font-medium">#{complaint.invoice_id}</span></p>
            )}
          </div>

          <div className="bg-card rounded-2xl p-6 shadow-lg shadow-black/5 border border-border/50">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Clock className="w-5 h-5 text-primary"/> سجل النشاطات</h2>
            <div className="space-y-6 pl-4 border-l-2 border-border/50 ml-2">
              <div className="relative">
                <div className="absolute -left-[25px] w-4 h-4 rounded-full bg-primary ring-4 ring-primary/20"></div>
                <p className="text-sm font-bold text-foreground">تم إنشاء الشكوى</p>
                <p className="text-xs text-muted-foreground mt-1">{new Date(complaint.created_at || '').toLocaleString('ar-EG')}</p>
              </div>
              {complaint.logs?.map((log, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-[25px] w-4 h-4 rounded-full bg-accent ring-4 ring-accent/20"></div>
                  <p className="text-sm font-bold text-foreground">{log.action}</p>
                  <p className="text-sm text-muted-foreground mt-1">{log.note}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(log.timestamp).toLocaleString('ar-EG')} - {log.user_name}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-2xl p-6 shadow-lg shadow-black/5 border border-border/50">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><MessageSquare className="w-5 h-5 text-primary"/> إضافة ملاحظة</h2>
            <div className="flex gap-3">
              <textarea
                className="flex-1 rounded-xl bg-background/50 border border-border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                rows={2}
                placeholder="اكتب ملاحظة أو تحديثاً..."
                value={noteInput}
                onChange={e => setNoteInput(e.target.value)}
              />
              <Button
                onClick={() => { if (noteInput.trim()) { handleAction(complaint.status, noteInput.trim()); setNoteInput(''); } }}
                disabled={!noteInput.trim() || isPending}
                className="rounded-xl self-start bg-gradient-to-r from-primary to-accent hover:opacity-90"
              >
                إضافة
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card rounded-2xl p-6 shadow-lg shadow-black/5 border border-border/50">
            <h3 className="text-lg font-bold mb-4">معلومات العميل</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{complaint.customer_name}</p>
                  <p className="text-xs text-muted-foreground dir-ltr">{complaint.customer_phone}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-1">الفرع</p>
                <p className="text-sm font-medium">{complaint.branch_name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">الأولوية</p>
                <p className={`text-sm font-medium ${complaint.priority === 'عالية' ? 'text-destructive' : 'text-foreground'}`}>
                  {complaint.priority}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">القناة</p>
                <p className="text-sm font-medium">{complaint.channel || '—'}</p>
              </div>
              {(complaint as { resolved_at?: string }).resolved_at && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">تاريخ الإغلاق</p>
                  <p className="text-sm font-medium">{new Date((complaint as { resolved_at?: string }).resolved_at!).toLocaleDateString('ar-EG')}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-card rounded-2xl p-6 shadow-lg shadow-black/5 border border-border/50">
            <h3 className="text-lg font-bold mb-4">إجراءات سريعة</h3>
            {!canChangeStatus ? (
              <p className="text-sm text-muted-foreground">ليس لديك صلاحية تعديل الحالة</p>
            ) : (
              <div className="space-y-3">
                {complaint.status === 'جديدة' && (
                  <Button onClick={() => handleAction('مستلمة')} disabled={isPending} className="w-full justify-start rounded-xl bg-blue-500 hover:bg-blue-600 text-white">
                    <Navigation className="w-4 h-4 ml-2" /> استلام الشكوى
                  </Button>
                )}
                {complaint.status === 'مستلمة' && (
                  <Button onClick={() => handleAction('جاري المعالجة')} disabled={isPending} className="w-full justify-start rounded-xl bg-purple-500 hover:bg-purple-600 text-white">
                    <Clock className="w-4 h-4 ml-2" /> بدء المعالجة
                  </Button>
                )}
                {(complaint.status === 'جاري المعالجة' || complaint.status === 'تصعيد إداري') && (
                  <Button onClick={() => handleAction('محلول')} disabled={isPending} className="w-full justify-start rounded-xl bg-teal-500 hover:bg-teal-600 text-white">
                    <CheckCircle className="w-4 h-4 ml-2" /> تحديد كمحلول
                  </Button>
                )}
                {complaint.status === 'محلول' && (
                  <Button onClick={() => handleAction('مغلق')} disabled={isPending} className="w-full justify-start rounded-xl bg-green-500 hover:bg-green-600 text-white">
                    <CheckCircle className="w-4 h-4 ml-2" /> إغلاق الشكوى
                  </Button>
                )}
                {complaint.status === 'محلول' && (
                  <Button onClick={() => handleAction('جاري المعالجة')} disabled={isPending} className="w-full justify-start rounded-xl bg-purple-500 hover:bg-purple-600 text-white">
                    <Clock className="w-4 h-4 ml-2" /> إعادة للمعالجة
                  </Button>
                )}
                {(complaint.status === 'جاري المعالجة' || complaint.status === 'مستلمة') && (
                  <Button onClick={() => handleAction('مصعدة')} disabled={isPending} className="w-full justify-start rounded-xl bg-orange-500 hover:bg-orange-600 text-white">
                    <AlertTriangle className="w-4 h-4 ml-2" /> تصعيد
                  </Button>
                )}
                {isManager && complaint.status === 'مصعدة' && (
                  <Button onClick={() => handleAction('تصعيد إداري')} disabled={isPending} className="w-full justify-start rounded-xl bg-red-500 hover:bg-red-600 text-white">
                    <ShieldAlert className="w-4 h-4 ml-2" /> تصعيد إداري
                  </Button>
                )}
                {(complaint.status === 'مصعدة' || complaint.status === 'تصعيد إداري') && (
                  <Button onClick={() => handleAction('جاري المعالجة')} disabled={isPending} className="w-full justify-start rounded-xl bg-purple-500 hover:bg-purple-600 text-white">
                    <Clock className="w-4 h-4 ml-2" /> إعادة للمعالجة
                  </Button>
                )}
                {isManager && complaint.status !== 'مغلق' && complaint.status !== 'مرفوض' && (
                  <Button onClick={() => handleAction('مرفوض')} variant="outline" disabled={isPending} className="w-full justify-start rounded-xl border-destructive/50 text-destructive hover:bg-destructive/10">
                    <ShieldAlert className="w-4 h-4 ml-2" /> رفض الشكوى
                  </Button>
                )}
                {!isManager && complaint.status !== 'مغلق' && complaint.status !== 'مرفوض' && complaint.status !== 'محلول' && (
                  <Button onClick={() => handleAction('مرفوض')} variant="outline" disabled={isPending} className="w-full justify-start rounded-xl border-destructive/50 text-destructive hover:bg-destructive/10">
                    <ShieldAlert className="w-4 h-4 ml-2" /> رفض الشكوى
                  </Button>
                )}
                {complaint.status === 'مغلق' && (
                  <p className="text-sm text-center text-muted-foreground py-2">الشكوى مغلقة</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
