import DashboardLayout from "@/components/DashboardLayout";
import SimplifiedInvoiceForm from "@/components/SimplifiedInvoiceForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Receipt, Plus, FileText, ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

export default function Invoices() {
  const { data: allInvoices, isLoading: loadingAll } = trpc.invoices.list.useQuery({});
  const { data: invoices, isLoading: loadingInvoices } = trpc.invoices.list.useQuery({ type: "invoice" });
  const { data: quotes, isLoading: loadingQuotes } = trpc.invoices.list.useQuery({ type: "quote" });
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const deleteInvoice = trpc.invoices.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف المستند بنجاح");
    },
    onError: () => {
      toast.error("تعذر حذف المستند");
    }
  });

  if (showNewInvoice) {
    return (
      <div>
        <Button
          variant="ghost"
          onClick={() => setShowNewInvoice(false)}
          className="mb-4"
        >
          <ArrowRight className="w-4 h-4 ml-2" />
          العودة للقائمة
        </Button>
        <SimplifiedInvoiceForm onSave={() => setShowNewInvoice(false)} />
      </div>
    );
  }

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      draft: "مسودة",
      sent: "مرسلة",
      paid: "مدفوعة",
      cancelled: "ملغاة"
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      draft: "bg-gray-500/10 text-gray-500",
      sent: "bg-blue-500/10 text-blue-500",
      paid: "bg-green-500/10 text-green-500",
      cancelled: "bg-red-500/10 text-red-500"
    };
    return colorMap[status] || "bg-gray-500/10 text-gray-500";
  };

  const InvoiceCard = ({ invoice }: { invoice: any }) => (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              {invoice.type === "invoice" ? (
                <Receipt className="w-6 h-6 text-primary" />
              ) : (
                <FileText className="w-6 h-6 text-primary" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg">{invoice.invoiceNumber}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(invoice.issueDate), "dd MMMM yyyy", { locale: ar })}
              </p>
            </div>
          </div>
          <Badge className={getStatusColor(invoice.status)}>
            {getStatusLabel(invoice.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">المبلغ الإجمالي:</span>
          <span className="text-lg font-bold text-primary">{invoice.total.toLocaleString()} ريال</span>
        </div>
        {invoice.subtotal !== invoice.total && (
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>المبلغ الأساسي:</span>
              <span>{invoice.subtotal.toLocaleString()} ريال</span>
            </div>
            {invoice.tax > 0 && (
              <div className="flex justify-between">
                <span>الضريبة:</span>
                <span>{invoice.tax.toLocaleString()} ريال</span>
              </div>
            )}
            {invoice.discount > 0 && (
              <div className="flex justify-between">
                <span>الخصم:</span>
                <span>-{invoice.discount.toLocaleString()} ريال</span>
              </div>
            )}
          </div>
        )}
        <div className="flex gap-2 mt-4">
          <Button variant="outline" className="w-full">
            عرض التفاصيل
          </Button>
          {user?.role === 'admin' && (
            <Button
              variant="destructive"
              onClick={() => deleteInvoice.mutate({ id: invoice.id })}
            >
              حذف
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const EmptyState = ({ type }: { type: "invoice" | "quote" | "all" }) => (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        {type === "quote" ? (
          <FileText className="w-16 h-16 text-muted-foreground mb-4" />
        ) : (
          <Receipt className="w-16 h-16 text-muted-foreground mb-4" />
        )}
        <h3 className="text-lg font-medium mb-2">
          {type === "invoice" ? "لا يوجد فواتير" : type === "quote" ? "لا يوجد عروض أسعار" : "لا يوجد فواتير أو عروض"}
        </h3>
        <p className="text-muted-foreground text-center mb-6">
          {type === "invoice" ? "ابدأ بإنشاء فاتورة جديدة" : type === "quote" ? "ابدأ بإنشاء عرض سعر جديد" : "ابدأ بإنشاء فاتورة أو عرض سعر"}
        </p>
        <Button className="gap-2" onClick={() => setLocation('/fatore')}>
          <Plus className="w-5 h-5" />
          {type === "invoice" ? "إنشاء فاتورة" : type === "quote" ? "إنشاء عرض سعر" : "إضافة جديد"}
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">الفواتير والعروض</h1>
            <p className="text-muted-foreground mt-2">
              إدارة الفواتير وعروض الأسعار
            </p>
          </div>
          <Button size="lg" className="gap-2" onClick={() => setLocation('/fatore')}>
            <Plus className="w-5 h-5" />
            فاتورة / عرض سعر جديد
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="all">الكل</TabsTrigger>
            <TabsTrigger value="invoices">الفواتير</TabsTrigger>
            <TabsTrigger value="quotes">عروض الأسعار</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            {loadingAll ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-6 bg-muted rounded w-3/4"></div>
                      <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="h-4 bg-muted rounded"></div>
                      <div className="h-4 bg-muted rounded w-2/3"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : allInvoices && allInvoices.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {allInvoices.map((invoice) => (
                  <InvoiceCard key={invoice.id} invoice={invoice} />
                ))}
              </div>
            ) : (
              <EmptyState type="all" />
            )}
          </TabsContent>

          <TabsContent value="invoices" className="mt-6">
            {loadingInvoices ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-6 bg-muted rounded w-3/4"></div>
                      <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="h-4 bg-muted rounded"></div>
                      <div className="h-4 bg-muted rounded w-2/3"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : invoices && invoices.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {invoices.map((invoice) => (
                  <InvoiceCard key={invoice.id} invoice={invoice} />
                ))}
              </div>
            ) : (
              <EmptyState type="invoice" />
            )}
          </TabsContent>

          <TabsContent value="quotes" className="mt-6">
            {loadingQuotes ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-6 bg-muted rounded w-3/4"></div>
                      <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="h-4 bg-muted rounded"></div>
                      <div className="h-4 bg-muted rounded w-2/3"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : quotes && quotes.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {quotes.map((quote) => (
                  <InvoiceCard key={quote.id} invoice={quote} />
                ))}
              </div>
            ) : (
              <EmptyState type="quote" />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
