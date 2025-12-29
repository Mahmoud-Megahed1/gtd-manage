/*
 © 2025 - Property of [Mohammed Ahmed / Golden Touch Design co.]
 Unauthorized use or reproduction is prohibited.
*/
import DashboardLayout from "@/components/DashboardLayout";
import SimplifiedInvoiceForm from "@/components/SimplifiedInvoiceForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Receipt, Plus, FileText, ArrowRight, Trash2, Search } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

export default function Invoices() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // Accountant can only VIEW invoices - admin/finance_manager can add/delete
  const canModify = ['admin', 'finance_manager'].includes(user?.role || '');

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: allInvoices, isLoading: loadingAll, refetch: refetchAll } = trpc.invoices.list.useQuery({ search: debouncedSearch });
  const { data: invoices, isLoading: loadingInvoices, refetch: refetchInvoices } = trpc.invoices.list.useQuery({ type: "invoice", search: debouncedSearch });
  const { data: quotes, isLoading: loadingQuotes, refetch: refetchQuotes } = trpc.invoices.list.useQuery({ type: "quote", search: debouncedSearch });

  const [showNewInvoice, setShowNewInvoice] = useState(false);

  const utils = trpc.useUtils();

  const deleteInvoice = trpc.invoices.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف المستند بنجاح");
      utils.invoices.list.invalidate();
      utils.accounting.sales.list.invalidate();
      utils.accounting.reports.overallFinancials.invalidate();
      refetchAll();
      refetchInvoices();
      refetchQuotes();
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

  const getList = (list: any[] | undefined) => list || [];

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
              {invoice.clientName && (
                <p className="text-sm font-medium text-foreground">{invoice.clientName}</p>
              )}
              {invoice.projectName && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <span className="opacity-70">مشروع:</span>
                  {invoice.projectName}
                </p>
              )}
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
          <Button variant="outline" className="flex-1" onClick={() => setLocation(`/invoices/${invoice.id}`)}>
            عرض التفاصيل
          </Button>
          {canModify && (
            <Button
              variant="destructive"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('هل أنت متأكد من حذف هذا المستند؟')) {
                  deleteInvoice.mutate({ id: invoice.id });
                }
              }}
            >
              <Trash2 className="w-4 h-4" />
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
        <Button
          className="gap-2"
          onClick={() => setLocation('/fatore')}
        >
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
          {canModify && (
            <Button
              size="lg"
              className="gap-2"
              onClick={() => setLocation('/fatore')}
            >
              <Plus className="w-5 h-5" />
              فاتورة / عرض سعر جديد
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            placeholder="بحث برقم الفاتورة، اسم العميل، أو المبلغ..."
            className="w-full pl-4 pr-10 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-right"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
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
            ) : getList(allInvoices).length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {getList(allInvoices).map((invoice) => (
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
            ) : getList(invoices).length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {getList(invoices).map((invoice) => (
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
            ) : getList(quotes).length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {getList(quotes).map((quote) => (
                  <InvoiceCard key={quote.id} invoice={quote} />
                ))}
              </div>
            ) : (
              <EmptyState type="quote" />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout >
  );
}
