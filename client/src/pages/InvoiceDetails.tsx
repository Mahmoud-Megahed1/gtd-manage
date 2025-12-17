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
            <CardTitle>محتوى المستند</CardTitle>
          </CardHeader>
          <CardContent>
            <iframe
              srcDoc={invoice.formData || ""}
              className="w-full h-[70vh] bg-white border rounded"
              title={`Invoice ${invoice.invoiceNumber}`}
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setLocation("/invoices")}>
                العودة
              </Button>
              {user?.role === "admin" && (
                <Button variant="destructive" onClick={() => deleteInvoice.mutate({ id })}>
                  حذف المستند
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

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
      </div>
    </DashboardLayout>
  );
}
