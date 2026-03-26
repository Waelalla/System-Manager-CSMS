import { useState } from 'react';
import { useListImportLogs, useGetImportLog, type ImportLogItem, type ImportLogItemWarningsItem } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, Clock } from 'lucide-react';

export default function ImportLogs() {
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<number | null>(null);

  const { data, isLoading } = useListImportLogs({ page, limit: 20 });
  const { data: detail } = useGetImportLog(detailId!, { query: { queryKey: ['getImportLog', detailId], enabled: !!detailId } });

  const logs: ImportLogItem[] = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <Upload className="w-8 h-8 text-primary" />
          سجلات الاستيراد
        </h1>
        <p className="text-muted-foreground mt-1">سجل عمليات استيراد البيانات من ملفات CSV</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="bg-card/80 backdrop-blur-sm shadow-xl rounded-2xl border-white/5">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground animate-pulse">جاري التحميل...</div>
              ) : logs.length === 0 ? (
                <div className="p-16 text-center">
                  <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-30" />
                  <p className="text-muted-foreground">لا توجد عمليات استيراد سابقة</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border/50 bg-muted/20">
                      <tr>
                        <th className="text-right p-4 font-medium text-muted-foreground">اسم الملف</th>
                        <th className="text-right p-4 font-medium text-muted-foreground">المستخدم</th>
                        <th className="text-right p-4 font-medium text-muted-foreground">عملاء/فواتير</th>
                        <th className="text-right p-4 font-medium text-muted-foreground">تحذيرات</th>
                        <th className="text-right p-4 font-medium text-muted-foreground">التاريخ</th>
                        <th className="p-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {logs.map(log => (
                        <tr
                          key={log.id}
                          className={`hover:bg-muted/10 transition-colors cursor-pointer ${detailId === log.id ? 'bg-primary/5' : ''}`}
                          onClick={() => setDetailId(log.id)}
                        >
                          <td className="p-4 font-medium">{log.file_name}</td>
                          <td className="p-4 text-muted-foreground text-xs">{log.user_name ?? '-'}</td>
                          <td className="p-4 text-sm">
                            <span className="text-green-400 font-bold">{log.added_customers ?? 0}</span>
                            <span className="text-muted-foreground"> / </span>
                            <span className="text-accent font-bold">{log.added_invoices ?? 0}</span>
                          </td>
                          <td className="p-4">
                            {(log.warnings?.length ?? 0) > 0 ? (
                              <span className="flex items-center gap-1 text-xs text-yellow-400">
                                <AlertTriangle className="w-3 h-3" /> {log.warnings!.length}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-green-400">
                                <CheckCircle className="w-3 h-3" /> نظيف
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-muted-foreground text-xs">
                            {log.imported_at ? new Date(log.imported_at).toLocaleString('ar-EG') : '-'}
                          </td>
                          <td className="p-4">
                            <Button size="sm" variant="ghost" className="rounded-lg h-8 text-xs text-primary">تفاصيل</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-border/30">
                  <span className="text-sm text-muted-foreground">صفحة {page} من {totalPages}</span>
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
        </div>

        <div>
          <Card className="bg-card/80 backdrop-blur-sm shadow-xl rounded-2xl border-white/5 sticky top-4">
            <CardContent className="p-6">
              {!detailId ? (
                <div className="text-center py-8">
                  <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-30" />
                  <p className="text-sm text-muted-foreground">اختر سجلاً لعرض التفاصيل</p>
                </div>
              ) : detail ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold">تفاصيل الاستيراد</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الملف</span>
                      <span className="font-medium text-xs truncate max-w-32">{detail.file_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">إجمالي الصفوف</span>
                      <span className="font-bold">{detail.total_rows}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">عملاء مضافون</span>
                      <span className="font-bold text-green-400">{detail.added_customers ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">فواتير مضافة</span>
                      <span className="font-bold text-accent">{detail.added_invoices ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">فواتير مكررة</span>
                      <span className="font-bold text-yellow-400">{detail.duplicate_invoices ?? 0}</span>
                    </div>
                  </div>
                  {(detail.warnings?.length ?? 0) > 0 && (
                    <div className="mt-4 space-y-2">
                      <h4 className="text-sm font-bold text-yellow-400 flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" /> تحذيرات ({detail.warnings!.length})
                      </h4>
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {detail.warnings!.map((w: ImportLogItemWarningsItem, i: number) => (
                          <div key={i} className="text-xs p-2 rounded-lg bg-yellow-500/10 text-yellow-300">
                            صف {(w as { row?: number }).row ?? i + 1}: {(w as { reason?: string }).reason ?? 'تحذير'}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(detail.errors?.length ?? 0) > 0 && (
                    <div className="mt-4 space-y-2">
                      <h4 className="text-sm font-bold text-red-400 flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" /> أخطاء ({detail.errors!.length})
                      </h4>
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {detail.errors!.map((e, i: number) => (
                          <div key={i} className="text-xs p-2 rounded-lg bg-red-500/10 text-red-300">
                            {String((e as { message?: string }).message ?? (e as { reason?: string }).reason ?? JSON.stringify(e))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="animate-pulse text-center py-8">
                  <p className="text-sm text-muted-foreground">جاري التحميل...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
