/*
 © 2025 - Property of [Mohammed Ahmed / Golden Touch Design co.]
 Unauthorized use or reproduction is prohibited.
*/
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { Plus, Download, TrendingUp, TrendingDown } from "lucide-react";
import { useState, useMemo, useRef } from "react";
import { toast } from "sonner";
import { AddSaleDialog } from "@/components/AddSaleDialog";
import { AddPurchaseDialog } from "@/components/AddPurchaseDialog";
import { AddInstallmentDialog } from "@/components/AddInstallmentDialog";
import { useSearch, useLocation } from "wouter";
import { usePermission } from "@/hooks/usePermission";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function Accounting() {
  const { data: expenses, isLoading: loadingExpenses, refetch: refetchExpenses } = trpc.accounting.expenses.list.useQuery({});
  // Removed installments section per requirement
  const { data: salesList, isLoading: loadingSales, refetch: refetchSales } = trpc.accounting.sales.list.useQuery();
  const { data: purchasesList, isLoading: loadingPurchases, refetch: refetchPurchases } = trpc.accounting.purchases.list.useQuery();
  const { data: overallFinancials, refetch: refetchFinancials } = trpc.accounting.reports.overallFinancials.useQuery();
  const { data: projects } = trpc.projects.list.useQuery();
  const utils = trpc.useUtils();
  const summary = {
    totalRevenue: overallFinancials?.paidRevenue || 0,
    totalExpenses: overallFinancials?.totalExpenses || 0,
    totalOperationalExpenses: overallFinancials?.totalOperationalExpenses || 0,
    totalPurchases: overallFinancials?.totalPurchases || 0
  };

  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseData, setExpenseData] = useState({
    category: "",
    description: "",
    amount: "",
    date: new Date().toISOString().split('T')[0],
    projectId: "" as string
  });

  // ========== Advanced Reports States ==========
  const [reportFrom, setReportFrom] = useState<string>(() => {
    const d = new Date();
    d.setMonth(0, 1); // January 1st
    return d.toISOString().split('T')[0];
  });
  const [reportTo, setReportTo] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [reportClientId, setReportClientId] = useState<string>("all");
  const [reportProjectId, setReportProjectId] = useState<string>("all");
  const [invoiceStatus, setInvoiceStatus] = useState<string>("all");
  const [purchaseStatus, setPurchaseStatus] = useState<string>("all");
  const [expenseStatus, setExpenseStatus] = useState<string>("all");
  const [installmentStatus, setInstallmentStatus] = useState<string>("all");
  const { data: clients } = trpc.clients.list.useQuery(undefined, { refetchOnWindowFocus: false });
  const { data: reportData, refetch: refetchReportData, isLoading: reportLoading } = trpc.reports.summary.useQuery(
    {
      from: reportFrom ? new Date(reportFrom) : undefined,
      to: reportTo ? new Date(reportTo) : undefined,
      clientId: reportClientId === "all" ? undefined : Number(reportClientId),
      projectId: reportProjectId === "all" ? undefined : Number(reportProjectId),
      invoiceStatus: invoiceStatus === "all" ? undefined : (invoiceStatus as any),
      purchaseStatus: purchaseStatus === "all" ? undefined : (purchaseStatus as any),
      expenseStatus: expenseStatus === "all" ? undefined : (expenseStatus as any),
      installmentStatus: installmentStatus === "all" ? undefined : (installmentStatus as any),
    },
    { refetchOnWindowFocus: false }
  );
  const { data: timeseries, isLoading: tsLoading, refetch: tsRefetch } = trpc.reports.timeseries.useQuery(
    {
      from: reportFrom ? new Date(reportFrom) : new Date(new Date().getFullYear(), 0, 1),
      to: reportTo ? new Date(reportTo) : new Date(),
      granularity: "month",
      clientId: reportClientId === "all" ? undefined : Number(reportClientId),
      projectId: reportProjectId === "all" ? undefined : Number(reportProjectId),
      invoiceStatus: invoiceStatus === "all" ? undefined : (invoiceStatus as any),
      purchaseStatus: purchaseStatus === "all" ? undefined : (purchaseStatus as any),
      expenseStatus: expenseStatus === "all" ? undefined : (expenseStatus as any),
      installmentStatus: installmentStatus === "all" ? undefined : (installmentStatus as any),
    },
    { refetchOnWindowFocus: false }
  );
  const chartRef = useRef<any>(null);
  const [invSel, setInvSel] = useState<string[]>(["paid", "sent"]);
  const [purSel, setPurSel] = useState<string[]>(["completed", "pending"]);
  const [expSel, setExpSel] = useState<string[]>(["active"]);
  const [instSel, setInstSel] = useState<string[]>(["pending", "paid"]);
  const { data: breakdown, isLoading: bdLoading, refetch: bdRefetch } = trpc.reports.timeseriesBreakdown.useQuery(
    {
      from: reportFrom ? new Date(reportFrom) : new Date(new Date().getFullYear(), 0, 1),
      to: reportTo ? new Date(reportTo) : new Date(),
      granularity: "month",
      clientId: reportClientId === "all" ? undefined : Number(reportClientId),
      projectId: reportProjectId === "all" ? undefined : Number(reportProjectId),
      invoiceStatuses: invSel as any,
      purchaseStatuses: purSel as any,
      expenseStatuses: expSel as any,
      installmentStatuses: instSel as any
    },
    { refetchOnWindowFocus: false }
  );

  const buildQuery = () => {
    const q = new URLSearchParams();
    if (reportFrom) q.set("from", reportFrom);
    if (reportTo) q.set("to", reportTo);
    if (reportClientId !== "all") q.set("clientId", reportClientId);
    if (reportProjectId !== "all") q.set("projectId", reportProjectId);
    if (invoiceStatus !== "all") q.set("invoiceStatus", invoiceStatus);
    if (purchaseStatus !== "all") q.set("purchaseStatus", purchaseStatus);
    if (expenseStatus !== "all") q.set("expenseStatus", expenseStatus);
    if (installmentStatus !== "all") q.set("installmentStatus", installmentStatus);
    return q.toString();
  };
  const buildBreakdownQuery = () => {
    const q = new URLSearchParams();
    if (reportFrom) q.set("from", reportFrom);
    if (reportTo) q.set("to", reportTo);
    if (reportClientId !== "all") q.set("clientId", reportClientId);
    if (reportProjectId !== "all") q.set("projectId", reportProjectId);
    invSel.forEach(s => q.append("invoiceStatuses", s));
    purSel.forEach(s => q.append("purchaseStatuses", s));
    expSel.forEach(s => q.append("expenseStatuses", s));
    instSel.forEach(s => q.append("installmentStatuses", s));
    return q.toString();
  };
  const chartData = useMemo(() => {
    const labels = (timeseries || []).map(r => r.dateKey);
    return {
      labels,
      datasets: [
        { label: "الإيرادات", data: (timeseries || []).map(r => r.invoices), borderColor: "#16a34a", backgroundColor: "#16a34a40", tension: 0.2 },
        { label: "الأقساط", data: (timeseries || []).map(r => r.installments), borderColor: "#3b82f6", backgroundColor: "#3b82f640", tension: 0.2 },
        { label: "المصروفات", data: (timeseries || []).map(r => r.expenses), borderColor: "#ef4444", backgroundColor: "#ef444440", tension: 0.2 },
        { label: "الصافي", data: (timeseries || []).map(r => r.net), borderColor: "#9333ea", backgroundColor: "#9333ea40", tension: 0.2 },
      ],
    };
  }, [timeseries]);
  const breakdownData = useMemo(() => {
    const rows = ((breakdown || []) as any[]);
    const labels = rows.map(r => r.dateKey);
    const ds: any[] = [];
    const colorsInv: Record<string, string> = { draft: "#9CA3AF", sent: "#F59E0B", paid: "#16A34A", cancelled: "#EF4444" };
    const colorsPur: Record<string, string> = { pending: "#A78BFA", completed: "#22C55E", cancelled: "#EF4444" };
    const colorsExp: Record<string, string> = { active: "#EF4444", cancelled: "#9CA3AF" };
    const colorsInst: Record<string, string> = { pending: "#F59E0B", paid: "#22C55E", overdue: "#DC2626", cancelled: "#9CA3AF" };
    invSel.forEach(st => {
      ds.push({
        label: `الفواتير: ${st}`,
        data: rows.map(r => (r.invoices || {})[st] || 0),
        borderColor: colorsInv[st] || "#6B7280",
        backgroundColor: (colorsInv[st] || "#6B7280") + "40",
        tension: 0.2
      });
    });
    purSel.forEach(st => {
      ds.push({
        label: `المشتريات: ${st}`,
        data: rows.map(r => (r.purchases || {})[st] || 0),
        borderColor: colorsPur[st] || "#6B7280",
        backgroundColor: (colorsPur[st] || "#6B7280") + "40",
        tension: 0.2
      });
    });
    expSel.forEach(st => {
      ds.push({
        label: `المصروفات: ${st}`,
        data: rows.map(r => (r.expenses || {})[st] || 0),
        borderColor: colorsExp[st] || "#6B7280",
        backgroundColor: (colorsExp[st] || "#6B7280") + "40",
        tension: 0.2
      });
    });
    instSel.forEach(st => {
      ds.push({
        label: `الأقساط: ${st}`,
        data: rows.map(r => (r.installments || {})[st] || 0),
        borderColor: colorsInst[st] || "#6B7280",
        backgroundColor: (colorsInst[st] || "#6B7280") + "40",
        tension: 0.2
      });
    });
    return { labels, datasets: ds };
  }, [breakdown, invSel, purSel, expSel, instSel]);
  const canExportCsv = useMemo(() => (timeseries || []).length > 0, [timeseries]);
  const canExportBreakdown = useMemo(() => (breakdown || []).length > 0, [breakdown]);
  const exportPdf = () => {
    try {
      const img = chartRef.current?.toBase64Image?.() || "";
      const html = `
        <html><head><meta charset="utf-8"><title>Reports</title>
        <style>
          body{font-family:system-ui,-apple-system,Segoe UI,Roboto; padding:24px}
          .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
          .card{border:1px solid #ddd;border-radius:8px;padding:12px}
          img{max-width:100%}
        </style></head>
        <body>
          <h1>التقارير</h1>
          <div class="grid">
            <div class="card"><div>إجمالي الفواتير</div><h2>${reportData?.invoicesTotal ?? 0}</h2></div>
            <div class="card"><div>إجمالي الأقساط</div><h2>${reportData?.installmentsTotal ?? 0}</h2></div>
            <div class="card"><div>إجمالي المصروفات</div><h2>${reportData?.expensesTotal ?? 0}</h2></div>
            <div class="card"><div>الصافي</div><h2>${reportData?.net ?? 0}</h2></div>
          </div>
          ${img ? `<h2>المخطط</h2><img id="chartImg" src="${img}" />` : "<div style='margin-top:16px;color:#6b7280'>لا يوجد مخطط لطباعته</div>"}
          <script>
            function readyToPrint(){
              try {
                window.focus();
                setTimeout(function(){ window.print(); }, 150);
              } catch {}
            }
            var pic = document.getElementById('chartImg');
            if (pic) {
              pic.onload = readyToPrint;
              setTimeout(readyToPrint, 400);
            } else {
              setTimeout(readyToPrint, 150);
            }
          </script>
        </body></html>`;
      const w = window.open("", "_blank");
      if (!w) return;
      w.document.open();
      w.document.write(html);
      w.document.close();
    } catch { }
  };
  const exportServerPdf = () => {
    const qs = buildQuery();
    window.open(`/reports.print.html?${qs}`, "_blank");
  };
  // ========== End Advanced Reports ==========

  // URL tab param handling for redirect from /reports
  const search = useSearch();
  const [, setLocationFn] = useLocation();
  const urlParams = new URLSearchParams(search);
  const { canView, getAllowedTabs } = usePermission();

  // Permission checks for tabs
  const canViewAccounting = canView('accounting');
  const canViewReports = canView('accounting.reports');

  // Determine initial tab based on URL and permissions
  const urlTab = urlParams.get('tab') || 'expenses';
  const initialTab = useMemo(() => {
    if (urlTab === 'reports' && canViewReports) return 'reports';
    if (['expenses', 'sales', 'purchases'].includes(urlTab) && canViewAccounting) return urlTab;
    if (canViewAccounting) return 'expenses';
    if (canViewReports) return 'reports';
    return 'expenses';
  }, [urlTab, canViewAccounting, canViewReports]);

  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // Count visible tabs for grid columns
  const visibleTabCount = (canViewAccounting ? 3 : 0) + (canViewReports ? 1 : 0);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'expenses') {
      setLocationFn('/accounting');
    } else {
      setLocationFn(`/accounting?tab=${value}`);
    }
  };

  const createExpense = trpc.accounting.expenses.create.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة التكلفة بنجاح");
      setShowExpenseForm(false);
      setExpenseData({ category: "", description: "", amount: "", date: new Date().toISOString().split('T')[0] });
      refetchExpenses();
      refetchFinancials();
    },
    onError: () => {
      toast.error("حدث خطأ أثناء إضافة التكلفة");
    }
  });
  const cancelExpense = trpc.accounting.expenses.cancel.useMutation({
    onSuccess: () => {
      toast.success("تم إلغاء المصروف");
      refetchExpenses();
      refetchFinancials();
    },
    onError: () => toast.error("تعذر إلغاء المصروف"),
  });
  const deleteExpense = trpc.accounting.expenses.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف المصروف");
      refetchExpenses();
      refetchFinancials();
    },
    onError: () => toast.error("تعذر حذف المصروف"),
  });
  const cancelSale = trpc.accounting.sales.cancel.useMutation({
    onSuccess: () => {
      toast.success("تم إلغاء عملية البيع");
      refetchSales();
      refetchFinancials();
    },
    onError: () => {
      toast.error("تعذر إلغاء عملية البيع");
    }
  });
  const updateSale = trpc.accounting.sales.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث عملية البيع");
      refetchSales();
      refetchFinancials();
    },
    onError: () => toast.error("تعذر تحديث عملية البيع"),
  });
  const deleteSale = trpc.accounting.sales.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف عملية البيع");
      refetchSales();
      refetchFinancials();
    },
    onError: () => toast.error("تعذر حذف عملية البيع"),
  });
  const cancelPurchase = trpc.accounting.purchases.cancel.useMutation({
    onSuccess: () => {
      toast.success("تم إلغاء عملية الشراء");
      refetchPurchases();
      refetchFinancials();
    },
    onError: () => {
      toast.error("تعذر إلغاء عملية الشراء");
    }
  });
  const updatePurchase = trpc.accounting.purchases.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث عملية الشراء");
      refetchPurchases();
      refetchFinancials();
    },
    onError: () => toast.error("تعذر تحديث عملية الشراء"),
  });
  const deletePurchase = trpc.accounting.purchases.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف عملية الشراء");
      refetchPurchases();
      refetchFinancials();
    },
    onError: () => toast.error("تعذر حذف عملية الشراء"),
  });
  const cancelInstallment = trpc.accounting.installments.cancel.useMutation({
    onSuccess: () => {
      toast.success("تم إلغاء القسط");
      refetchFinancials();
    },
    onError: () => toast.error("تعذر إلغاء القسط"),
  });

  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    createExpense.mutate({
      projectId: expenseData.projectId ? parseInt(expenseData.projectId) : undefined,
      category: expenseData.category,
      description: expenseData.description,
      amount: parseFloat(expenseData.amount),
      expenseDate: expenseData.date
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">المحاسبة</h1>
            <p className="text-muted-foreground">إدارة التكاليف والمصروفات والأقساط</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الإيرادات (الفواتير)</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {summary?.totalRevenue?.toLocaleString() || 0} ر.س
              </div>
              <p className="text-xs text-muted-foreground">{salesList?.filter((s: any) => s.status === 'completed').length || 0} عملية إيراد</p>
            </CardContent>
          </Card>


          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي المشتريات</CardTitle>
              <TrendingDown className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {purchasesList?.filter((p: any) => p.status === 'completed').reduce((a: number, p: any) => a + (p.amount || 0), 0).toLocaleString() || 0} ر.س
              </div>
              <p className="text-xs text-muted-foreground">{purchasesList?.filter((p: any) => p.status === 'completed').length || 0} عملية شراء</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي المصروفات</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {summary?.totalExpenses?.toLocaleString() || 0} ر.س
              </div>
              <p className="text-xs text-muted-foreground">شامل المشتريات والتشغيل</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">التكاليف التشغيلية</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {summary?.totalOperationalExpenses?.toLocaleString() || 0} ر.س
              </div>
              <p className="text-xs text-muted-foreground">المصروفات الإدارية والعمومية</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">صافي الربح</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {((summary?.totalRevenue || 0) - (summary?.totalExpenses || 0)).toLocaleString()} ر.س
              </div>
              <p className="text-xs text-muted-foreground">الإيرادات - المصروفات</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${visibleTabCount}, 1fr)` }}>
            {canViewAccounting && <TabsTrigger value="expenses">التكاليف التشغيلية</TabsTrigger>}
            {canViewAccounting && <TabsTrigger value="sales">سجل الإيرادات</TabsTrigger>}
            {canViewAccounting && <TabsTrigger value="purchases">المشتريات</TabsTrigger>}
            {canViewReports && <TabsTrigger value="reports">التقارير</TabsTrigger>}
          </TabsList>

          {/* Expenses Tab */}
          <TabsContent value="expenses" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>التكاليف التشغيلية</CardTitle>
                  <Button onClick={() => setShowExpenseForm(!showExpenseForm)}>
                    <Plus className="w-4 h-4 ml-2" />
                    إضافة تكلفة
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {showExpenseForm && (
                  <form onSubmit={handleSubmitExpense} className="grid gap-4 p-4 border rounded-lg bg-accent/50">
                    <div className="grid gap-2">
                      <Label htmlFor="project">المشروع (اختياري)</Label>
                      <select
                        id="project"
                        className="w-full border rounded px-3 py-2 bg-background"
                        value={expenseData.projectId}
                        onChange={(e) => setExpenseData({ ...expenseData, projectId: e.target.value })}
                      >
                        <option value="">-- مصروف عام --</option>
                        {(projects || []).map((p: any) => (
                          <option key={p.id} value={String(p.id)}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="category">الفئة</Label>
                      <Input
                        id="category"
                        value={expenseData.category}
                        onChange={(e) => setExpenseData({ ...expenseData, category: e.target.value })}
                        placeholder="مثال: رواتب، إيجار، مواد..."
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">الوصف</Label>
                      <Input
                        id="description"
                        value={expenseData.description}
                        onChange={(e) => setExpenseData({ ...expenseData, description: e.target.value })}
                        placeholder="تفاصيل التكلفة"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="amount">المبلغ (ر.س)</Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          value={expenseData.amount}
                          onChange={(e) => setExpenseData({ ...expenseData, amount: e.target.value })}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="date">التاريخ</Label>
                        <Input
                          id="date"
                          type="date"
                          value={expenseData.date}
                          onChange={(e) => setExpenseData({ ...expenseData, date: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={createExpense.isPending}>
                        {createExpense.isPending ? "جاري الحفظ..." : "حفظ"}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setShowExpenseForm(false)}>
                        إلغاء
                      </Button>
                    </div>
                  </form>
                )}

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>الفئة</TableHead>
                      <TableHead>الوصف</TableHead>
                      <TableHead className="text-left">المبلغ</TableHead>
                      <TableHead className="text-left">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingExpenses ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center">جاري التحميل...</TableCell>
                      </TableRow>
                    ) : expenses && expenses.length > 0 ? (
                      expenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell>{new Date(expense.expenseDate).toLocaleDateString('ar-SA')}</TableCell>
                          <TableCell>{expense.category}</TableCell>
                          <TableCell>{expense.description}</TableCell>
                          <TableCell className="text-left font-medium">{expense.amount.toLocaleString()} ر.س</TableCell>
                          <TableCell className="text-left">
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => cancelExpense.mutate({ id: expense.id })}
                              >
                                إلغاء
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteExpense.mutate({ id: expense.id })}
                              >
                                حذف
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          لا توجد تكاليف مسجلة
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>



          {/* Sales Tab */}
          <TabsContent value="sales" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>سجل الإيرادات (الفواتير)</CardTitle>
                  <AddSaleDialog />
                </div>
              </CardHeader>
              <CardContent>
                {loadingSales ? (
                  <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>
                ) : salesList && salesList.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>رقم العملية</TableHead>
                        <TableHead>المشروع</TableHead>
                        <TableHead>الوصف</TableHead>
                        <TableHead>المبلغ</TableHead>
                        <TableHead>طريقة الدفع</TableHead>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead className="text-left">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesList.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell className="font-medium">{sale.saleNumber}</TableCell>
                          <TableCell>
                            <select
                              defaultValue={String(sale.projectId ?? "")}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateSale.mutate({ id: sale.id, projectId: val ? Number(val) : undefined });
                              }}
                              className="border rounded p-1 text-sm"
                            >
                              <option value="">بدون</option>
                              {(projects || []).map((p: any) => (
                                <option key={p.id} value={String(p.id)}>{p.name}</option>
                              ))}
                            </select>
                          </TableCell>
                          <TableCell>
                            <Input
                              defaultValue={sale.description}
                              onBlur={(e) => {
                                const v = e.target.value;
                                if (v !== sale.description) updateSale.mutate({ id: sale.id, description: v });
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-green-600 font-semibold">
                            <Input
                              type="number"
                              defaultValue={sale.amount}
                              onBlur={(e) => {
                                const v = Number(e.target.value);
                                if (!Number.isNaN(v) && v !== sale.amount) updateSale.mutate({ id: sale.id, amount: v });
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <select
                              defaultValue={sale.paymentMethod}
                              onChange={(e) => updateSale.mutate({ id: sale.id, paymentMethod: e.target.value as any })}
                              className="border rounded p-1 text-sm"
                            >
                              <option value="cash">نقدي</option>
                              <option value="bank_transfer">تحويل بنكي</option>
                              <option value="check">شيك</option>
                              <option value="credit">آجل</option>
                            </select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="date"
                              defaultValue={new Date(sale.saleDate).toISOString().slice(0, 10)}
                              onBlur={(e) => {
                                const v = e.target.value;
                                updateSale.mutate({ id: sale.id, saleDate: v });
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <select
                              defaultValue={sale.status}
                              onChange={(e) => updateSale.mutate({ id: sale.id, status: e.target.value as any })}
                              className={`border rounded p-1 text-xs ${sale.status === 'completed' ? 'bg-green-100 text-green-800' :
                                sale.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}
                            >
                              <option value="pending">قيد المعالجة</option>
                              <option value="completed">مكتمل</option>
                              <option value="cancelled">ملغي</option>
                            </select>
                          </TableCell>
                          <TableCell className="text-left">
                            <div className="flex gap-2 justify-end">
                              {sale.status !== 'cancelled' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => cancelSale.mutate({ id: sale.id })}
                                >
                                  إلغاء
                                </Button>
                              )}
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteSale.mutate({ id: sale.id })}
                              >
                                حذف
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center py-12 text-muted-foreground">لا توجد عمليات بيع حالياً</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Purchases Tab */}
          <TabsContent value="purchases" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>المشتريات</CardTitle>
                  <AddPurchaseDialog />
                </div>
              </CardHeader>
              <CardContent>
                {loadingPurchases ? (
                  <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>
                ) : purchasesList && purchasesList.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>رقم العملية</TableHead>
                        <TableHead>المشروع</TableHead>
                        <TableHead>المورد</TableHead>
                        <TableHead>الوصف</TableHead>
                        <TableHead>المبلغ</TableHead>
                        <TableHead>طريقة الدفع</TableHead>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead className="text-left">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchasesList.map((purchase) => (
                        <TableRow key={purchase.id}>
                          <TableCell className="font-medium">{purchase.purchaseNumber}</TableCell>
                          <TableCell>
                            <select
                              defaultValue={String(purchase.projectId ?? "")}
                              onChange={(e) => {
                                const val = e.target.value;
                                updatePurchase.mutate({ id: purchase.id, projectId: val ? Number(val) : undefined });
                              }}
                              className="border rounded p-1 text-sm"
                            >
                              <option value="">بدون</option>
                              {(projects || []).map((p: any) => (
                                <option key={p.id} value={String(p.id)}>{p.name}</option>
                              ))}
                            </select>
                          </TableCell>
                          <TableCell>{purchase.supplierName}</TableCell>
                          <TableCell>
                            <Input
                              defaultValue={purchase.description}
                              onBlur={(e) => {
                                const v = e.target.value;
                                if (v !== purchase.description) updatePurchase.mutate({ id: purchase.id, description: v });
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-red-600 font-semibold">
                            <Input
                              type="number"
                              defaultValue={purchase.amount}
                              onBlur={(e) => {
                                const v = Number(e.target.value);
                                if (!Number.isNaN(v) && v !== purchase.amount) updatePurchase.mutate({ id: purchase.id, amount: v });
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <select
                              defaultValue={purchase.paymentMethod}
                              onChange={(e) => updatePurchase.mutate({ id: purchase.id, paymentMethod: e.target.value as any })}
                              className="border rounded p-1 text-sm"
                            >
                              <option value="cash">نقدي</option>
                              <option value="bank_transfer">تحويل بنكي</option>
                              <option value="check">شيك</option>
                              <option value="credit">آجل</option>
                            </select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="date"
                              defaultValue={new Date(purchase.purchaseDate).toISOString().slice(0, 10)}
                              onBlur={(e) => {
                                const v = e.target.value;
                                updatePurchase.mutate({ id: purchase.id, purchaseDate: v });
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs ${purchase.status === 'completed' ? 'bg-green-100 text-green-800' :
                              purchase.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                              {purchase.status === 'completed' && 'مكتمل'}
                              {purchase.status === 'pending' && 'قيد المعالجة'}
                              {purchase.status === 'cancelled' && 'ملغي'}
                            </span>
                          </TableCell>
                          <TableCell className="text-left">
                            <div className="flex gap-2 justify-end">
                              {purchase.status !== 'cancelled' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => cancelPurchase.mutate({ id: purchase.id })}
                                >
                                  إلغاء
                                </Button>
                              )}
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deletePurchase.mutate({ id: purchase.id })}
                              >
                                حذف
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center py-12 text-muted-foreground">لا توجد عمليات شراء حالياً</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>نطاق التاريخ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-7 gap-3">
                  <div>
                    <label className="text-sm">من</label>
                    <Input type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm">إلى</label>
                    <Input type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm">العميل</label>
                    <Select value={reportClientId} onValueChange={(v) => setReportClientId(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="الكل" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">الكل</SelectItem>
                        {(clients || []).map((c: any) => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm">المشروع</label>
                    <Select value={reportProjectId} onValueChange={(v) => setReportProjectId(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="الكل" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">الكل</SelectItem>
                        {(projects || []).map((p: any) => (
                          <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm">حالة الفاتورة</label>
                    <Select value={invoiceStatus} onValueChange={(v) => setInvoiceStatus(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="الكل" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">الكل</SelectItem>
                        <SelectItem value="draft">مسودة</SelectItem>
                        <SelectItem value="sent">مرسلة</SelectItem>
                        <SelectItem value="paid">مدفوعة</SelectItem>
                        <SelectItem value="cancelled">ملغاة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm">حالة المشتريات</label>
                    <Select value={purchaseStatus} onValueChange={(v) => setPurchaseStatus(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="الكل" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">الكل</SelectItem>
                        <SelectItem value="pending">قيد الانتظار</SelectItem>
                        <SelectItem value="completed">مكتملة</SelectItem>
                        <SelectItem value="cancelled">ملغاة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={() => { refetchReportData(); tsRefetch(); }} disabled={reportLoading || tsLoading}>تحديث</Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => window.open(`/reports.export.csv?${buildQuery()}`, "_blank")}
                    disabled={!canExportCsv}
                  >
                    تصدير CSV
                  </Button>
                  <Button variant="outline" onClick={exportServerPdf} disabled={reportLoading && tsLoading}>
                    تصدير PDF
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.open(`/reports.breakdown.csv?${buildBreakdownQuery()}`, "_blank")}
                    disabled={!canExportBreakdown}
                  >
                    تفصيل CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>ملخص مالي</CardTitle>
              </CardHeader>
              <CardContent>
                {reportLoading ? (
                  <div className="animate-pulse grid md:grid-cols-2 gap-4">
                    <div className="h-24 bg-muted rounded"></div>
                    <div className="h-24 bg-muted rounded"></div>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded">
                      <div className="text-sm text-muted-foreground">إجمالي الفواتير</div>
                      <div className="text-2xl font-bold">{reportData?.invoicesTotal ?? 0}</div>
                    </div>
                    <div className="p-4 border rounded">
                      <div className="text-sm text-muted-foreground">إجمالي الأقساط</div>
                      <div className="text-2xl font-bold">{(reportData?.invoicesTotal || 0) + (reportData?.installmentsTotal || 0)}</div>
                    </div>
                    <div className="p-4 border rounded">
                      <div className="text-sm text-muted-foreground">إجمالي المصروفات</div>
                      <div className="text-2xl font-bold">{reportData?.expensesTotal ?? 0}</div>
                    </div>
                    <div className="p-4 border rounded">
                      <div className="text-sm text-muted-foreground">إجمالي المشتريات</div>
                      <div className="text-2xl font-bold">{reportData?.purchasesTotal ?? 0}</div>
                    </div>
                    <div className="p-4 border rounded md:col-span-2">
                      <div className="text-sm text-muted-foreground">الصافي</div>
                      <div className="text-3xl font-bold">{reportData?.net ?? 0}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>مخطط زمني</CardTitle>
              </CardHeader>
              <CardContent>
                {tsLoading ? (
                  <div className="h-64 bg-muted rounded animate-pulse" />
                ) : (
                  <Line
                    ref={chartRef}
                    data={chartData}
                    options={{
                      responsive: true,
                      plugins: { legend: { position: "bottom" } },
                      scales: { y: { beginAtZero: true } }
                    }}
                  />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>تفصيل حسب الحالة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-5 gap-3">
                  <div>
                    <div className="text-sm mb-2">حالات الفواتير</div>
                    <div className="flex flex-col gap-2">
                      {["draft", "sent", "paid", "cancelled"].map(s => (
                        <label key={s} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={invSel.includes(s)}
                            onCheckedChange={(v) => {
                              setInvSel(prev => {
                                const set = new Set(prev);
                                if (v) set.add(s); else set.delete(s);
                                return Array.from(set);
                              });
                            }}
                          />
                          <span>{s}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm mb-2">حالات المشتريات</div>
                    <div className="flex flex-col gap-2">
                      {["pending", "completed", "cancelled"].map(s => (
                        <label key={s} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={purSel.includes(s)}
                            onCheckedChange={(v) => {
                              setPurSel(prev => {
                                const set = new Set(prev);
                                if (v) set.add(s); else set.delete(s);
                                return Array.from(set);
                              });
                            }}
                          />
                          <span>{s}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm mb-2">حالات المصروفات</div>
                    <div className="flex flex-col gap-2">
                      {["active", "cancelled"].map(s => (
                        <label key={s} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={expSel.includes(s)}
                            onCheckedChange={(v) => {
                              setExpSel(prev => {
                                const set = new Set(prev);
                                if (v) set.add(s); else set.delete(s);
                                return Array.from(set);
                              });
                            }}
                          />
                          <span>{s}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm mb-2">حالات الأقساط</div>
                    <div className="flex flex-col gap-2">
                      {["pending", "paid", "overdue", "cancelled"].map(s => (
                        <label key={s} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={instSel.includes(s)}
                            onCheckedChange={(v) => {
                              setInstSel(prev => {
                                const set = new Set(prev);
                                if (v) set.add(s); else set.delete(s);
                                return Array.from(set);
                              });
                            }}
                          />
                          <span>{s}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={() => bdRefetch()} disabled={bdLoading}>تحديث التفصيل</Button>
                  </div>
                </div>
                {bdLoading ? (
                  <div className="h-64 bg-muted rounded animate-pulse" />
                ) : (
                  <Line
                    data={breakdownData}
                    options={{
                      responsive: true,
                      plugins: { legend: { position: "bottom" } },
                      scales: { y: { beginAtZero: true } }
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
