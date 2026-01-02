/*
 © 2025 - Property of [Mohammed Ahmed / Golden Touch Design co. ]
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
import { useState, useMemo, useRef, useEffect } from "react";
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
  Filler,
} from "chart.js";
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// Force cache bust: v1.1.1
export default function Accounting() {
  const { canView, loading: permLoading } = usePermission();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!permLoading && !canView('accounting')) {
      setLocation('/');
    }
  }, [canView, setLocation, permLoading]);

  if (permLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!canView('accounting')) {
    return null;
  }
  const { data: expenses, isLoading: loadingExpenses, refetch: refetchExpenses } = trpc.accounting.expenses.list.useQuery({});

  const { data: salesList, isLoading: loadingSales, refetch: refetchSales } = trpc.accounting.sales.list.useQuery();
  const { data: purchasesList, isLoading: loadingPurchases, refetch: refetchPurchases } = trpc.accounting.purchases.list.useQuery();
  const { data: invoicesList, isLoading: loadingInvoices } = trpc.invoices.list.useQuery({ type: 'invoice' });
  const { data: overallFinancials, refetch: refetchFinancials } = trpc.accounting.reports.overallFinancials.useQuery();
  const { data: projects } = trpc.projects.list.useQuery();
  const utils = trpc.useUtils();
  const summary = {
    totalRevenue: overallFinancials?.totalRevenue || 0,
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

  const manualSales = useMemo(() => {
    return (salesList || []).filter(s => !s.invoiceId);
  }, [salesList]);

  // ========== Advanced Reports States ==========
  const [reportFrom, setReportFrom] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6); // Last 6 months instead of full year
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
    {
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      onSuccess: (data) => {
        console.log('[Reports] Summary data received:', data);
      }
    }
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
    {
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      onSuccess: (data) => {
        console.log('[Reports] Timeseries data received:', data);
      }
    }
  );
  const chartRef = useRef<any>(null);
  const [invSel, setInvSel] = useState<string[]>(["paid", "sent", "draft"]);
  const [purSel, setPurSel] = useState<string[]>(["completed", "pending"]);
  const [expSel, setExpSel] = useState<string[]>(["active", "processing", "completed"]);
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

  // Helper function to convert dateKey like "2025-12" to Arabic month name
  const formatDateKeyToArabic = (dateKey: string) => {
    const arabicMonths = [
      "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
      "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
    ];
    const parts = dateKey.split('-');
    if (parts.length >= 2) {
      const monthIndex = parseInt(parts[1], 10) - 1;
      return arabicMonths[monthIndex] || dateKey;
    }
    return dateKey;
  };

  // CSV Export Functions - work directly in browser
  const exportTimeseriesCsv = () => {
    if (!timeseries || timeseries.length === 0) {
      toast.error('لا توجد بيانات للتصدير');
      return;
    }

    const headers = ['التاريخ', 'الإيرادات', 'المصروفات', 'الصافي'];
    const rows = timeseries.map(r => [
      formatDateKeyToArabic(r.dateKey),
      r.invoices || 0,
      r.expenses || 0,
      r.net || 0
    ]);

    const csvContent = '\uFEFF' + [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `تقرير_الإيرادات_والمصروفات_${reportFrom}_${reportTo}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('تم تصدير التقرير بنجاح');
  };

  const exportBreakdownCsv = () => {
    if (!breakdown || breakdown.length === 0) {
      toast.error('لا توجد بيانات للتصدير');
      return;
    }

    const headers = ['التاريخ', 'الإيرادات (مكتملة)', 'الإيرادات (قيد المعالجة)', 'المشتريات', 'المصروفات'];
    const rows = (breakdown as any[]).map(r => {
      // إيرادات مكتملة = invoices(paid + sent) + sales(completed) (User Request: Sent is considered Completed/Revenue)
      const completedRevenue = ((r.invoices?.paid || 0) + (r.invoices?.sent || 0) + (r.sales?.completed || 0));

      // إيرادات قيد المعالجة = invoices(draft) + sales(pending)
      const processingRevenue = ((r.invoices?.draft || 0) + (r.sales?.pending || 0));

      const completedPurchases = (r.purchases?.completed || 0);
      const totalExpenses = (r.expenses?.completed || 0) + (r.expenses?.active || 0) + (r.expenses?.processing || 0);

      return [
        formatDateKeyToArabic(r.dateKey),
        completedRevenue,
        processingRevenue,
        completedPurchases,
        totalExpenses
      ];
    });

    const csvContent = '\uFEFF' + [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `تقرير_التفصيل_${reportFrom}_${reportTo}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('تم تصدير التفصيل بنجاح');
  };


  const chartData = useMemo(() => {
    const labels = (timeseries || []).map(r => formatDateKeyToArabic(r.dateKey));
    return {
      labels,
      datasets: [
        {
          label: "الإيرادات",
          data: (timeseries || []).map(r => r.invoices || 0),  // Already combined: invoices + installments + sales
          borderColor: "#10B981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          tension: 0.4,
          fill: true,
          borderWidth: 3,
          pointRadius: 5,
          pointHoverRadius: 8,
          pointBackgroundColor: "#fff",
          pointBorderWidth: 2,
          pointBorderColor: "#10B981"
        },
        {
          label: "المصروفات",
          data: (timeseries || []).map(r => r.expenses || 0),  // Already combined: expenses + purchases
          borderColor: "#EF4444",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          tension: 0.4,
          fill: true,
          borderWidth: 3,
          pointRadius: 5,
          pointHoverRadius: 8,
          pointBackgroundColor: "#fff",
          pointBorderWidth: 2,
          pointBorderColor: "#EF4444"
        },
      ],
    };
  }, [timeseries]);

  const breakdownData = useMemo(() => {
    const rows = ((breakdown || []) as any[]);
    const labels = rows.map(r => formatDateKeyToArabic(r.dateKey));
    const ds: any[] = [];

    // Revenue logic: Aggregate Invoices, Installments, and Manual Sales
    // "Paid" Invoices + "Paid" Installments + "Completed" Sales = Completed Revenue
    // "Sent" Invoices + "Pending" Installments + "Pending" Sales = Processing Revenue

    // We will use instSel to drive the Revenue display as per user request to map "Installments" to "Revenue"
    if (instSel.includes("paid")) {
      ds.push({
        label: "إيرادات مكتملة",
        data: rows.map(r => ((r.invoices || {}).paid || 0) + ((r.installments || {}).paid || 0) + ((r.sales || {}).completed || 0)),
        borderColor: "#16A34A",
        backgroundColor: "rgba(22, 163, 74, 0.15)",
        tension: 0.4,
        fill: true,
        borderWidth: 3,
        pointRadius: 5,
        pointHoverRadius: 8,
        pointBackgroundColor: "#fff",
        pointBorderWidth: 2,
        pointBorderColor: "#16A34A"
      });
    }
    if (instSel.includes("pending")) {
      ds.push({
        label: "إيرادات قيد المعالجة",
        data: rows.map(r => ((r.invoices || {}).sent || 0) + ((r.installments || {}).pending || 0) + ((r.sales || {}).pending || 0)),
        borderColor: "#F59E0B",
        backgroundColor: "rgba(245, 158, 11, 0.15)",
        tension: 0.4,
        fill: true,
        borderWidth: 3,
        pointRadius: 5,
        pointHoverRadius: 8,
        pointBackgroundColor: "#fff",
        pointBorderWidth: 2,
        pointBorderColor: "#F59E0B"
      });
    }
    // Handle other installment statuses normally if needed, or ignore to avoid clutter
    instSel.forEach(st => {
      if (st === 'paid' || st === 'pending') return; // Handled above
      ds.push({
        label: `التكاليف: ${st}`,
        data: rows.map(r => (r.installments || {})[st] || 0),
        borderColor: "#6B7280",
        backgroundColor: "rgba(107, 114, 128, 0.15)",
        tension: 0.4,
        fill: true,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: "#fff",
        pointBorderWidth: 2,
        pointBorderColor: "#6B7280"
      });
    });

    // Keeping Purchases and Expenses as is
    const colorsPur: Record<string, string> = { pending: "#A78BFA", completed: "#22C55E", cancelled: "#EF4444" };
    purSel.forEach(st => {
      const color = colorsPur[st] || "#6B7280";
      // Extract R,G,B from hex
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      ds.push({
        label: `المشتريات: ${st}`,
        data: rows.map(r => (r.purchases || {})[st] || 0),
        borderColor: color,
        backgroundColor: `rgba(${r}, ${g}, ${b}, 0.15)`,
        tension: 0.4,
        fill: true,
        borderWidth: 3,
        pointRadius: 5,
        pointHoverRadius: 8,
        pointBackgroundColor: "#fff",
        pointBorderWidth: 2,
        pointBorderColor: color
      });
    });

    const colorsExp: Record<string, string> = { active: "#EF4444", processing: "#F59E0B", completed: "#22C55E", cancelled: "#9CA3AF" };
    expSel.forEach(st => {
      const color = colorsExp[st] || "#6B7280";
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      ds.push({
        label: `المصروفات: ${st}`,
        data: rows.map(r => (r.expenses || {})[st] || 0),
        borderColor: color,
        backgroundColor: `rgba(${r}, ${g}, ${b}, 0.15)`,
        tension: 0.4,
        fill: true,
        borderWidth: 3,
        pointRadius: 5,
        pointHoverRadius: 8,
        pointBackgroundColor: "#fff",
        pointBorderWidth: 2,
        pointBorderColor: color
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
            <div class="card"><div>إجمالي المشتريات</div><h2>${reportData?.purchasesTotal ?? 0}</h2></div>
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
  const { getAllowedTabs } = usePermission();

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
      setExpenseData({ category: "", description: "", amount: "", date: new Date().toISOString().split('T')[0], projectId: "" });
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
  const updateExpense = trpc.accounting.expenses.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث المصروف");
      refetchExpenses();
      refetchFinancials();
    },
    onError: () => toast.error("تعذر تحديث المصروف"),
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
  const updateInvoice = trpc.invoices.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث حالة الفاتورة");
      utils.invoices.list.invalidate();
      refetchFinancials();
      refetchReportData();
    },
    onError: () => toast.error("تعذر تعديل الفاتورة"),
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">المحاسبة</h1>
            <p className="text-muted-foreground text-sm sm:text-base">إدارة التكاليف والمصروفات والإيرادات</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
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
          <TabsList className="flex flex-wrap sm:grid w-full gap-1 sm:gap-0 h-auto sm:h-9" style={{ gridTemplateColumns: `repeat(${visibleTabCount}, 1fr)` }}>
            {canViewAccounting && <TabsTrigger value="expenses" className="flex-1 text-xs sm:text-sm min-w-[70px]">التكاليف</TabsTrigger>}
            {canViewAccounting && <TabsTrigger value="sales" className="flex-1 text-xs sm:text-sm min-w-[70px]">الإيرادات</TabsTrigger>}
            {canViewAccounting && <TabsTrigger value="purchases" className="flex-1 text-xs sm:text-sm min-w-[70px]">المشتريات</TabsTrigger>}
            {canViewReports && <TabsTrigger value="reports" className="flex-1 text-xs sm:text-sm min-w-[70px]">التقارير</TabsTrigger>}
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
                      <TableHead>الحالة</TableHead>
                      <TableHead className="text-left">المبلغ</TableHead>
                      <TableHead className="text-left">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingExpenses ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">جاري التحميل...</TableCell>
                      </TableRow>
                    ) : expenses && expenses.length > 0 ? (
                      expenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell>{new Date(expense.expenseDate).toLocaleDateString('ar-SA')}</TableCell>
                          <TableCell>{expense.category}</TableCell>
                          <TableCell>{expense.description}</TableCell>
                          <TableCell>
                            <Select
                              defaultValue={expense.status || "active"}
                              onValueChange={(v) => updateExpense.mutate({ id: expense.id, status: v as any })}
                            >
                              <SelectTrigger className="h-8 w-[130px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="processing">قيد المعالجة</SelectItem>
                                <SelectItem value="completed">مكتمل</SelectItem>
                                <SelectItem value="cancelled">ملغي</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-left font-medium">{expense.amount.toLocaleString()} ر.س</TableCell>
                          <TableCell className="text-left">
                            <div className="flex gap-2 justify-end">
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
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
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
            {/* Invoices Section */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>الفواتير</CardTitle>
                  <Button variant="outline" onClick={() => window.location.href = '/invoices'}>
                    إنشاء فاتورة جديدة
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingInvoices ? (
                  <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>
                ) : invoicesList && invoicesList.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>رقم الفاتورة</TableHead>
                        <TableHead>المشروع</TableHead>
                        <TableHead>العميل</TableHead>
                        <TableHead>المبلغ</TableHead>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead className="text-left">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoicesList.map((invoice: any) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                          <TableCell>{invoice.projectName || 'بدون مشروع'}</TableCell>
                          <TableCell>{invoice.clientName || '-'}</TableCell>
                          <TableCell className={`font-semibold ${invoice.status === 'paid' ? 'text-green-600' : 'text-muted-foreground'}`}>
                            {Number(invoice.total || 0).toLocaleString()} ر.س
                          </TableCell>
                          <TableCell>
                            {invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString('ar-SA') : '-'}
                          </TableCell>
                          <TableCell>
                            <select
                              value={invoice.status}
                              onChange={(e) => updateInvoice.mutate({ id: invoice.id, status: e.target.value as any })}
                              className={`border rounded p-1 text-xs ${invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                                invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                                  invoice.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                }`}
                            >
                              <option value="draft">قيد المعالجة</option>
                              <option value="sent">مرسلة</option>
                              <option value="paid">مكتملة (مدفوعة)</option>
                              <option value="cancelled">ملغية</option>
                            </select>
                          </TableCell>
                          <TableCell className="text-left">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.location.href = `/invoices/${invoice.id}`}
                            >
                              عرض
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}

                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center py-12 text-muted-foreground">لا توجد فواتير حالياً</p>
                )}
              </CardContent>
            </Card>

            {/* Manual Sales Section */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>سجل المبيعات اليدوية</CardTitle>
                  <AddSaleDialog />
                </div>
              </CardHeader>
              <CardContent>
                {loadingSales ? (
                  <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>
                ) : manualSales && manualSales.length > 0 ? (
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
                      {manualSales.map((sale) => (
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
                  <p className="text-center py-8 text-muted-foreground">لا توجد عمليات بيع يدوية</p>
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
                              <option value="tamara">تمارا (تقسيط)</option>
                              <option value="mispay">MISpay (تقسيط)</option>
                              <option value="visa">فيزا (تقسيط)</option>
                              <option value="mada">مدى</option>
                              <option value="stcpay">STCpay</option>
                              <option value="bank_transfer">تحويل بنكي</option>
                              <option value="pos">شبكة</option>
                              <option value="cash">نقدي</option>
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
                            <Select
                              defaultValue={purchase.status || "pending"}
                              onValueChange={(v) => updatePurchase.mutate({ id: purchase.id, status: v as any })}
                              className="w-[120px]"
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">معلقة</SelectItem>
                                <SelectItem value="completed">مكتمل</SelectItem>
                                <SelectItem value="cancelled">ملغى</SelectItem>
                              </SelectContent>
                            </Select>
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
                  <p className="text-center py-8 text-muted-foreground">لا توجد مشتريات مسجلة</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            {/* Summary Cards for Reports */}
            {reportLoading ? (
              <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="h-24 bg-muted rounded animate-pulse"></div>
                <div className="h-24 bg-muted rounded animate-pulse"></div>
                <div className="h-24 bg-muted rounded animate-pulse"></div>
                <div className="h-24 bg-muted rounded animate-pulse"></div>
                <div className="h-24 bg-muted rounded animate-pulse"></div>
                <div className="h-24 bg-muted rounded animate-pulse"></div>
              </div>
            ) : (
              <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">عدد الفواتير</div>
                    <div className="text-2xl font-bold">{reportData?.invoicesCount ?? 0} فاتورة</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">قيمة الفواتير</div>
                    <div className="text-2xl font-bold">{Number(reportData?.invoicesTotal ?? 0).toLocaleString()} ر.س</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">الإيرادات المحصلة</div>
                    <div className="text-2xl font-bold text-green-600">
                      {(Number(reportData?.paidInvoicesTotal || 0) + Number(reportData?.installmentsTotal || 0) + Number(reportData?.manualSalesTotal || 0)).toLocaleString()} ر.س
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">إجمالي المصروفات</div>
                    <div className="text-2xl font-bold text-red-600">
                      {(Number(reportData?.expensesTotal ?? 0) + Number(reportData?.purchasesTotal ?? 0)).toLocaleString()} ر.س
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">التكاليف التشغيلية</div>
                    <div className="text-2xl font-bold">{Number(reportData?.expensesTotal ?? 0).toLocaleString()} ر.س</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">المشتريات</div>
                    <div className="text-2xl font-bold">{Number(reportData?.purchasesTotal ?? 0).toLocaleString()} ر.س</div>
                  </CardContent>
                </Card>
                <Card className="sm:col-span-3">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">صافي الربح</div>
                      <div className={`text-3xl font-bold ${Number(reportData?.net ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {Number(reportData?.net ?? 0).toLocaleString()} ر.س
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Filters and Date Range Picker */}
            <Card>
              <CardHeader>
                <CardTitle>تقرير الإيرادات والمصروفات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="reportFrom">من تاريخ</Label>
                    <Input
                      id="reportFrom"
                      type="date"
                      value={reportFrom}
                      onChange={(e) => setReportFrom(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="reportTo">إلى تاريخ</Label>
                    <Input
                      id="reportTo"
                      type="date"
                      value={reportTo}
                      onChange={(e) => setReportTo(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientId">العميل</Label>
                    <Select
                      id="clientId"
                      value={reportClientId}
                      onValueChange={setReportClientId}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="جميع العملاء" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع العملاء</SelectItem>
                        {(clients || []).map(client => (
                          <SelectItem key={client.id} value={String(client.id)}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="projectId">المشروع</Label>
                    <Select
                      id="projectId"
                      value={reportProjectId}
                      onValueChange={setReportProjectId}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="جميع المشاريع" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع المشاريع</SelectItem>
                        {(projects || []).map(project => (
                          <SelectItem key={project.id} value={String(project.id)}>
                            {project.name}
                          </SelectItem>
                        ))}

                      </SelectContent>
                    </Select>
                  </div>

                </div>
              </CardContent>
            </Card>

            {/* Timeseries Chart */}
            <div className="mt-6">
              {tsLoading ? (
                <div className="text-center py-4 text-muted-foreground">جاري التحميل بيانات الرسم البياني...</div>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>الإيرادات والمصروفات الشهرية</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[400px] w-full">
                      <Line
                        ref={chartRef}
                        data={chartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'top' as const,
                              rtl: true,
                              labels: {
                                font: {
                                  family: 'Cairo, sans-serif',
                                  size: 13,
                                },
                                padding: 15,
                                usePointStyle: true,
                              },
                            },
                            tooltip: {
                              rtl: true,
                              titleFont: {
                                family: 'Cairo, sans-serif',
                                size: 14,
                              },
                              bodyFont: {
                                family: 'Cairo, sans-serif',
                                size: 13,
                              },
                              callbacks: {
                                label: (context: any) => {
                                  let label = context.dataset.label || '';
                                  if (label && context.parsed.y !== null) {
                                    label += ': ' + context.parsed.y.toLocaleString() + ' ر.س';
                                  }
                                  return label;
                                }
                              }
                            },
                          },
                          scales: {
                            x: {
                              grid: {
                                display: false,
                              },
                              ticks: {
                                font: {
                                  family: 'Cairo, sans-serif',
                                  size: 12,
                                },
                              },
                            },
                            y: {
                              beginAtZero: true,
                              grid: {
                                color: 'rgba(0, 0, 0, 0.05)',
                              },
                              ticks: {
                                font: {
                                  family: 'Cairo, sans-serif',
                                  size: 12,
                                },
                                callback: (value: any) => {
                                  return value.toLocaleString() + ' ر.س';
                                }
                              },
                            },
                          },
                        }}
                      />
                    </div>

                    {/* Download Buttons */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={exportPdf}
                        disabled={!chartData.labels.length}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        تصدير PDF
                      </Button>
                      <Button
                        variant="outline"
                        onClick={exportTimeseriesCsv}
                        disabled={!canExportCsv}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        تصدير CSV
                      </Button>
                      <Button
                        variant="outline"
                        onClick={exportBreakdownCsv}
                        disabled={!canExportBreakdown}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        تصدير التفصيل CSV
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Breakdown Table - Advanced Reports */}
            <Card>
              <CardHeader>
                <CardTitle>تفصيل شهري للإيرادات والمصروفات</CardTitle>
              </CardHeader>
              <CardContent>
                {bdLoading ? (
                  <div className="text-center py-4 text-muted-foreground">جاري التحميل بيانات التفصيل...</div>
                ) : (
                  <div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <Label htmlFor="invoiceStatuses">حالات الفواتير</Label>
                        <Select
                          value={invSel[0]}
                          onValueChange={(v) => setInvSel([v])}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="كل الحالات" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="paid">مدفوعة</SelectItem>
                            <SelectItem value="sent">مرسلة</SelectItem>
                            <SelectItem value="draft">مسودة</SelectItem>
                            <SelectItem value="cancelled">ملغاة</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="purchaseStatuses">حالات المشتريات</Label>
                        <Select
                          value={purSel[0]}
                          onValueChange={(v) => setPurSel([v])}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="كل الحالات" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="completed">مكتملة</SelectItem>
                            <SelectItem value="pending">قيد الانتظار</SelectItem>
                            <SelectItem value="cancelled">ملغاة</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="expenseStatuses">حالات المصروفات</Label>
                        <Select
                          value={expSel[0]}
                          onValueChange={(v) => setExpSel([v])}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="كل الحالات" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">نشطة</SelectItem>
                            <SelectItem value="processing">قيد المعالجة</SelectItem>
                            <SelectItem value="completed">مكتملة</SelectItem>
                            <SelectItem value="cancelled">ملغاة</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="installmentStatuses">حالات الأقساط</Label>
                        <Select
                          value={instSel[0]}
                          onValueChange={(v) => setInstSel([v])}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="كل الحالات" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">قيد الدفع</SelectItem>
                            <SelectItem value="paid">مدفوعة</SelectItem>
                            <SelectItem value="cancelled">ملغاة</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end mt-4">
                      <Button onClick={exportBreakdownCsv} variant="outline" disabled={!canExportBreakdown}>
                        <Download className="w-4 h-4 mr-2" />
                        تصدير التفصيل CSV
                      </Button>
                    </div>

                    {/* Note: Breakdown data structure is {dateKey, invoices, purchases, expenses, installments} */}
                    {/* The breakdown chart below shows the data correctly */}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Breakdown Chart */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>التفصيل حسب الحالة</CardTitle>
              </CardHeader>
              <CardContent>
                {bdLoading ? (
                  <div className="h-64 bg-muted rounded animate-pulse" />
                ) : (
                  <div className="h-[350px] w-full">
                    <Line
                      data={breakdownData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom' as const,
                            rtl: true,
                            labels: {
                              font: {
                                family: 'Cairo, sans-serif',
                                size: 12,
                              },
                              padding: 12,
                              usePointStyle: true,
                            },
                          },
                          tooltip: {
                            rtl: true,
                            titleFont: {
                              family: 'Cairo, sans-serif',
                              size: 13,
                            },
                            bodyFont: {
                              family: 'Cairo, sans-serif',
                              size: 12,
                            },
                            callbacks: {
                              label: (context: any) => {
                                let label = context.dataset.label || '';
                                if (label && context.parsed.y !== null) {
                                  label += ': ' + context.parsed.y.toLocaleString() + ' ر.س';
                                }
                                return label;
                              }
                            }
                          },
                        },
                        scales: {
                          x: {
                            grid: {
                              display: false,
                            },
                            ticks: {
                              font: {
                                family: 'Cairo, sans-serif',
                                size: 11,
                              },
                            },
                          },
                          y: {
                            beginAtZero: true,
                            grid: {
                              color: 'rgba(0, 0, 0, 0.05)',
                            },
                            ticks: {
                              font: {
                                family: 'Cairo, sans-serif',
                                size: 11,
                              },
                              callback: (value: any) => {
                                return value.toLocaleString() + ' ر.س';
                              }
                            },
                          },
                        },
                      }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
