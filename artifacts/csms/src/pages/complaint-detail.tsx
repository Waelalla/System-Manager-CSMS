import { useParams, Link } from 'wouter';
import { useGetComplaint, useUpdateComplaintStatus } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, User, Clock, FileText, AlertTriangle, ShieldAlert, CheckCircle, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ComplaintDetail() {
  const params = useParams();
  const id = parseInt(params.id || '0');
  const { data: complaint, isLoading } = useGetComplaint(id);
  const { mutateAsync: updateStatus, isPending } = useUpdateComplaintStatus();
  const queryClient = useQueryClient();

  if (isLoading) return <div className="p-8 text-center animate-pulse">جاري تحميل بيانات الشكوى...</div>;
  if (!complaint) return <div className="p-8 text-center text-destructive">الشكوى غير موجودة</div>;

  const handleAction = async (newStatus: string) => {
    await updateStatus({ id, data: { status: newStatus, note: 'تحديث حالة بواسطة النظام' } });
    queryClient.invalidateQueries({ queryKey: ['/api/complaints', id] });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/complaints" className="p-2 rounded-xl bg-card border border-border/50 hover:bg-muted transition-colors">
          <ArrowRight className="w-5 h-5 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            شكوى #{complaint.id.toString().padStart(5, '0')}
            <span className="px-3 py-1 text-sm rounded-full bg-primary/10 text-primary border border-primary/20">{complaint.status}</span>
          </h1>
          <p className="text-muted-foreground mt-1">{complaint.type_name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-card rounded-2xl p-6 shadow-lg shadow-black/5 border border-border/50">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-primary"/> تفاصيل المشكلة</h2>
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">{complaint.description}</p>
          </div>

          {/* Activity Timeline */}
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
        </div>

        {/* Sidebar */}
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
                <p className="text-sm font-medium">{complaint.branch_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">الأولوية</p>
                <p className={`text-sm font-medium ${complaint.priority === 'عالية' ? 'text-destructive' : 'text-foreground'}`}>
                  {complaint.priority}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl p-6 shadow-lg shadow-black/5 border border-border/50">
            <h3 className="text-lg font-bold mb-4">إجراءات سريعة</h3>
            <div className="space-y-3">
              {complaint.status === 'جديدة' && (
                <Button onClick={() => handleAction('مستلمة')} disabled={isPending} className="w-full justify-start rounded-xl bg-blue-500 hover:bg-blue-600 text-white">
                  <Navigation className="w-4 h-4 ml-2" /> استلام الشكوى
                </Button>
              )}
              {complaint.status === 'مستلمة' && (
                <Button onClick={() => handleAction('قيد الحل')} disabled={isPending} className="w-full justify-start rounded-xl bg-purple-500 hover:bg-purple-600 text-white">
                  <Clock className="w-4 h-4 ml-2" /> بدء العمل (قيد الحل)
                </Button>
              )}
              {(complaint.status === 'قيد الحل' || complaint.status === 'مستلمة') && (
                <Button onClick={() => handleAction('محلول')} disabled={isPending} className="w-full justify-start rounded-xl bg-green-500 hover:bg-green-600 text-white">
                  <CheckCircle className="w-4 h-4 ml-2" /> تسجيل كـ "محلول"
                </Button>
              )}
              {complaint.status !== 'مغلق' && (
                <Button variant="outline" className="w-full justify-start rounded-xl border-destructive/50 text-destructive hover:bg-destructive/10">
                  <ShieldAlert className="w-4 h-4 ml-2" /> تصعيد إداري
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
