import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { Receipt, FileText, ArrowLeft, Paperclip, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useMemo } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useAuth } from "@/_core/hooks/useAuth";

export default function InvoiceDetails() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const id = params.id ? Number(params.id) : 0;
  const { data, isLoading } = trpc.invoices.getById.useQuery({ id });
  const { data: attachments, refetch } = trpc.files.list.useQuery({ entityType: "invoice", entityId: id }, { enabled: !!id });
  const deleteAttachment = trpc.files.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف المرفق");
      refetch();
    },
    onError: () => toast.error("تعذر حذف المرفق"),
  });
  const deleteInvoice = trpc.invoices.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف المستند");
      setLocation("/invoices");
    },
    onError: () => toast.error("تعذر حذف المستند"),
  });
  const { user } = useAuth();

  const statusLabel = useMemo(() => {
    const map: Record<string, string> = {
      draft: "مسودة",
      sent: "مرسلة",
      paid: "مدفوعة",
      cancelled: "ملغاة",
    };
    return (s: string) => map[s] || s;
  }, []);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <Card>
            <CardContent className="p-6">
              <div className="h-6 bg-muted rounded w-1/2 mb-3"></div>
              <div className="h-4 bg-muted rounded w-1/3"></div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!data?.invoice) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">لا توجد فاتورة بهذا الرقم</p>
            <Button className="mt-4" variant="outline" onClick={() => setLocation("/invoices")}>
              العودة
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const { invoice, client, items } = data;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/invoices")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                {invoice.type === "invoice" ? (
                  <Receipt className="w-6 h-6 text-primary" />
                ) : (
                  <FileText className="w-6 h-6 text-primary" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{invoice.invoiceNumber}</h1>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(invoice.issueDate), "dd MMMM yyyy", { locale: ar })}
                </p>
              </div>
              <Badge>{statusLabel(invoice.status)}</Badge>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>بيانات العميل</CardTitle>
          </CardHeader>
          <CardContent>
            {client ? (
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">الاسم</div>
                  <div className="font-medium">{client.name}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">البريد</div>
                  <div className="font-medium">{client.email || "-"}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">الهاتف</div>
                  <div className="font-medium">{client.phone || "-"}</div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">لا يوجد عميل مرتبط</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>بنود الفاتورة</CardTitle>
          </CardHeader>
          <CardContent>
            {items && items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="p-2 text-right">الوصف</th>
                      <th className="p-2 text-center">الكمية</th>
                      <th className="p-2 text-center">السعر</th>
                      <th className="p-2 text-center">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item: any, idx: number) => (
                      <tr key={idx} className="border-b">
                        <td className="p-2">{item.description}</td>
                        <td className="p-2 text-center">{item.quantity}</td>
                        <td className="p-2 text-center">{Number(item.unitPrice).toLocaleString()} ريال</td>
                        <td className="p-2 text-center font-medium">{Number(item.total).toLocaleString()} ريال</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/50">
                      <td colSpan={3} className="p-2 text-left font-bold">المجموع الفرعي</td>
                      <td className="p-2 text-center font-bold">{Number(invoice.subtotal).toLocaleString()} ريال</td>
                    </tr>
                    {invoice.tax > 0 && (
                      <tr className="bg-muted/50">
                        <td colSpan={3} className="p-2 text-left">الضريبة (15%)</td>
                        <td className="p-2 text-center">{Number(invoice.tax).toLocaleString()} ريال</td>
                      </tr>
                    )}
                    <tr className="bg-primary/10">
                      <td colSpan={3} className="p-2 text-left font-bold text-lg">الإجمالي</td>
                      <td className="p-2 text-center font-bold text-lg text-primary">{Number(invoice.total).toLocaleString()} ريال</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground">لا توجد بنود</p>
            )}
          </CardContent>
        </Card>

        {/* Formatted Form Data */}
        {invoice.formData && (() => {
          try {
            const fd = JSON.parse(invoice.formData);
            const projectNatureMap: Record<string, string> = {
              design: 'تصميم', execution: 'تنفيذ', visit: 'استشارة موقع',
              office: 'استشارة مكتب', online: 'استشارة اونلاين', other: 'مخصص'
            };
            const siteNatureMap: Record<string, string> = {
              room: 'غرفة', studio: 'استديو', apartment: 'شقة', villa: 'فيلا',
              palace: 'قصر', land: 'ارض', farm: 'مزرعة', chalet: 'شاليه',
              building: 'عمارة', office: 'مكتب', company: 'شركة', shop: 'محل تجاري',
              spa: 'سبا', salon: 'صالون', hotel: 'فندق', other: 'مخصص'
            };
            const paymentLabels: Record<string, string> = {
              tamara: 'Tamara', mispay: 'Mispay', visa: 'Visa', mada: 'Mada',
              stcpay: 'STC Pay', bank: 'تحويل بنكي', pos: 'نقاط بيع', cash: 'نقدي'
            };
            const activePayments = Object.entries(fd.paymentMethods || {})
              .filter(([, v]) => v)
              .map(([k]) => paymentLabels[k] || k);

            return (
              <Card>
                <CardHeader>
                  <CardTitle>تفاصيل المشروع</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">طبيعة المشروع</div>
                    <div className="font-medium">{projectNatureMap[fd.projectNature] || fd.projectNature || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">طبيعة الموقع</div>
                    <div className="font-medium">{siteNatureMap[fd.siteNature] || fd.siteNature || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">طريقة الدفع</div>
                    <div className="font-medium">{activePayments.length > 0 ? activePayments.join(', ') : '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">شروط الدفع</div>
                    <div className="font-medium">{fd.paymentTermType || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">صلاحية العرض</div>
                    <div className="font-medium">{fd.validityPeriod || '-'}</div>
                  </div>
                </CardContent>
              </Card>
            );
          } catch {
            return null; // If not valid JSON, don't show anything
          }
        })()}

        <Card>
          <CardHeader>
            <CardTitle>المرفقات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(attachments || []).length > 0 ? (
              attachments!.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between border rounded p-3">
                  <div className="flex items-center gap-2">
                    <Paperclip className="w-4 h-4" />
                    <a href={a.fileUrl} target="_blank" rel="noreferrer" className="text-sm underline">
                      {a.fileName}
                    </a>
                    <span className="text-xs text-muted-foreground">{a.mimeType}</span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteAttachment.mutate({ id: a.id })}
                  >
                    <Trash2 className="w-4 h-4 ml-2" />
                    حذف
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">لا توجد مرفقات</div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setLocation("/invoices")}>
            العودة
          </Button>
          {user?.role === "admin" && (
            <Button variant="destructive" onClick={() => deleteInvoice.mutate({ id })}>
              حذف المستند
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

