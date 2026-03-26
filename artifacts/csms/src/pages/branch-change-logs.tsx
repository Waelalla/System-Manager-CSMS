import { useState } from 'react';
import { useListBranchChangeLogs, type BranchChangeLogItem } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { GitBranch, ChevronLeft, ChevronRight, Phone, FileText } from 'lucide-react';

type CallNote = {
  id: number;
  customer_name?: string;
  customer_phone?: string;
  old_branch_name?: string;
  new_branch_name?: string;
};

export default function BranchChangeLogs() {
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<CallNote | null>(null);
  const [callNote, setCallNote] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useListBranchChangeLogs({ page, limit: 20 });
  const logs: BranchChangeLogItem[] = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const handleCallNote = (log: BranchChangeLogItem) => {
    setSelectedLog({
      id: log.id,
      customer_name: log.customer_name,
      customer_phone: log.customer_phone,
      old_branch_name: log.old_branch_name,
      new_branch_name: log.new_branch_name,
    });
    setCallNote((log as { notes?: string }).notes ?? '');
  };

  const saveCallNote = async () => {
    if (!selectedLog) return;
    setSaving(true);
    try {
      const accessToken = localStorage.getItem('access_token');
      const res = await fetch(`/api/branch-change-logs/${selectedLog.id}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ notes: callNote }),
      });
      if (!res.ok) throw new Error('فشل الحفظ');
      toast({ title: 'تم الحفظ', description: 'تم حفظ ملاحظة المكالمة بنجاح' });
      void queryClient.invalidateQueries({ queryKey: ['/api/branch-change-logs'] });
      setSelectedLog(null);
      setCallNote('');
    } catch {
      toast({ title: 'خطأ', description: 'فشل حفظ الملاحظة', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <GitBranch className="w-8 h-8 text-primary" />
          سجل تغيير الفروع
        </h1>
        <p className="text-muted-foreground mt-1">سجل جميع عمليات تغيير الفرع للعملاء</p>
      </div>

      <Card className="bg-card/80 backdrop-blur-sm shadow-xl rounded-2xl border-white/5">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground animate-pulse">جاري التحميل...</div>
          ) : logs.length === 0 ? (
            <div className="p-16 text-center">
              <GitBranch className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-30" />
              <p className="text-muted-foreground">لا توجد عمليات تغيير فرع</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border/50 bg-muted/20">
                  <tr>
                    <th className="text-right p-4 font-medium text-muted-foreground">العميل</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">رقم الهاتف</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">الفرع السابق</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">الفرع الجديد</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">ملاحظات</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">التاريخ</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-muted/10 transition-colors">
                      <td className="p-4 font-medium">{log.customer_name ?? '-'}</td>
                      <td className="p-4 text-muted-foreground dir-ltr">{log.customer_phone ?? '-'}</td>
                      <td className="p-4">
                        <span className="px-2 py-1 rounded-lg text-xs bg-red-500/10 text-red-400">{log.old_branch_name ?? '-'}</span>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 rounded-lg text-xs bg-green-500/10 text-green-400">{log.new_branch_name ?? '-'}</span>
                      </td>
                      <td className="p-4 text-muted-foreground text-xs max-w-xs truncate">{log.notes ?? '-'}</td>
                      <td className="p-4 text-muted-foreground text-xs">
                        {log.changed_at ? new Date(log.changed_at).toLocaleString('ar-EG') : '-'}
                      </td>
                      <td className="p-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCallNote(log)}
                          className="rounded-lg h-8 text-xs border-primary/30 text-primary hover:bg-primary/10"
                        >
                          <Phone className="w-3 h-3 mr-1" />
                          تسجيل مكالمة
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border/30">
              <span className="text-sm text-muted-foreground">
                صفحة {page} من {totalPages} — {total} سجل
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg h-8 w-8 p-0">
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-lg h-8 w-8 p-0">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedLog(null)}>
          <Card className="bg-card rounded-2xl border-border/50 shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /> تسجيل ملاحظة مكالمة</h3>
              <div className="p-4 rounded-xl bg-muted/30 space-y-1 text-sm">
                <p><span className="text-muted-foreground">العميل:</span> {selectedLog.customer_name}</p>
                <p><span className="text-muted-foreground">الهاتف:</span> <span dir="ltr">{selectedLog.customer_phone}</span></p>
                <p><span className="text-muted-foreground">من:</span> {selectedLog.old_branch_name} → <span className="text-primary">{selectedLog.new_branch_name}</span></p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">ملاحظات المكالمة</label>
                <textarea
                  value={callNote}
                  onChange={e => setCallNote(e.target.value)}
                  className="w-full h-32 rounded-xl bg-background/50 border border-border/50 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="اكتب ملاحظات المكالمة هنا..."
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setSelectedLog(null)} className="rounded-xl" disabled={saving}>إلغاء</Button>
                <Button
                  onClick={saveCallNote}
                  disabled={saving || !callNote.trim()}
                  className="rounded-xl bg-primary hover:bg-primary/90 text-white"
                >
                  {saving ? 'جاري الحفظ...' : 'حفظ الملاحظة'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
