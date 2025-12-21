/*
 © 2025 - Property of [Mohammed Ahmed / Golden Touch Design co.]
 Unauthorized use or reproduction is prohibited.
*/
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import {
    Users,
    FolderKanban,
    CheckSquare,
    Receipt,
    Calculator,
    UserCog,
    FileText,
    LayoutDashboard,
    Printer,
    Download,
    RefreshCw,
    Loader2,
    TrendingUp,
    TrendingDown,
    Building2,
    Calendar
} from "lucide-react";
import { Pie, Bar } from "react-chartjs-2";
import {
    Chart as ChartJS,
    ArcElement,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from "chart.js";

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type ReportSection = 'clients' | 'projects' | 'tasks' | 'invoices' | 'accounting' | 'hr' | 'forms' | 'overview';

const sectionIcons: Record<ReportSection, React.ReactNode> = {
    clients: <Users className="h-4 w-4" />,
    projects: <FolderKanban className="h-4 w-4" />,
    tasks: <CheckSquare className="h-4 w-4" />,
    invoices: <Receipt className="h-4 w-4" />,
    accounting: <Calculator className="h-4 w-4" />,
    hr: <UserCog className="h-4 w-4" />,
    forms: <FileText className="h-4 w-4" />,
    overview: <LayoutDashboard className="h-4 w-4" />,
};

export default function GeneralReports() {
    useAuth({ redirectOnUnauthenticated: true });

    const [activeSection, setActiveSection] = useState<ReportSection>('overview');
    const [from, setFrom] = useState<string>("");
    const [to, setTo] = useState<string>("");
    const [clientId, setClientId] = useState<string>("all");
    const [projectId, setProjectId] = useState<string>("all");
    const printRef = useRef<HTMLDivElement>(null);

    // Get available sections for current user
    const { data: availableSections, isLoading: sectionsLoading } = trpc.generalReports.getAvailableSections.useQuery();

    // Get filter data
    const { data: clients } = trpc.clients.clientNames.useQuery(undefined, {
        refetchOnWindowFocus: false,
        enabled: availableSections?.some(s => s.key === 'clients' || s.key === 'invoices' || s.key === 'projects' || s.key === 'forms')
    });
    const { data: projects } = trpc.projects.list.useQuery(undefined, {
        refetchOnWindowFocus: false,
        enabled: availableSections?.some(s => s.key === 'projects' || s.key === 'tasks' || s.key === 'accounting')
    });

    // Prepare date filter
    const dateFilter = {
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
    };

    // Overview Report
    const { data: overviewData, isLoading: overviewLoading, refetch: refetchOverview } =
        trpc.generalReports.overviewReport.useQuery(dateFilter, {
            enabled: activeSection === 'overview' && availableSections?.some(s => s.key === 'overview'),
            refetchOnWindowFocus: false,
        });

    // Clients Report
    const { data: clientsData, isLoading: clientsLoading, refetch: refetchClients } =
        trpc.generalReports.clientsReport.useQuery(dateFilter, {
            enabled: activeSection === 'clients' && availableSections?.some(s => s.key === 'clients'),
            refetchOnWindowFocus: false,
        });

    // Projects Report
    const { data: projectsData, isLoading: projectsLoading, refetch: refetchProjects } =
        trpc.generalReports.projectsReport.useQuery({
            ...dateFilter,
            clientId: clientId !== 'all' ? Number(clientId) : undefined,
        }, {
            enabled: activeSection === 'projects' && availableSections?.some(s => s.key === 'projects'),
            refetchOnWindowFocus: false,
        });

    // Tasks Report
    const { data: tasksData, isLoading: tasksLoading, refetch: refetchTasks } =
        trpc.generalReports.tasksReport.useQuery({
            ...dateFilter,
            projectId: projectId !== 'all' ? Number(projectId) : undefined,
        }, {
            enabled: activeSection === 'tasks' && availableSections?.some(s => s.key === 'tasks'),
            refetchOnWindowFocus: false,
        });

    // Invoices Report
    const { data: invoicesData, isLoading: invoicesLoading, refetch: refetchInvoices } =
        trpc.generalReports.invoicesReport.useQuery({
            ...dateFilter,
            clientId: clientId !== 'all' ? Number(clientId) : undefined,
        }, {
            enabled: activeSection === 'invoices' && availableSections?.some(s => s.key === 'invoices'),
            refetchOnWindowFocus: false,
        });

    // Accounting Report
    const { data: accountingData, isLoading: accountingLoading, refetch: refetchAccounting } =
        trpc.generalReports.accountingReport.useQuery({
            ...dateFilter,
            projectId: projectId !== 'all' ? Number(projectId) : undefined,
        }, {
            enabled: activeSection === 'accounting' && availableSections?.some(s => s.key === 'accounting'),
            refetchOnWindowFocus: false,
        });

    // HR Report
    const { data: hrData, isLoading: hrLoading, refetch: refetchHr } =
        trpc.generalReports.hrReport.useQuery(dateFilter, {
            enabled: activeSection === 'hr' && availableSections?.some(s => s.key === 'hr'),
            refetchOnWindowFocus: false,
        });

    // Forms Report
    const { data: formsData, isLoading: formsLoading, refetch: refetchForms } =
        trpc.generalReports.formsReport.useQuery({
            ...dateFilter,
            clientId: clientId !== 'all' ? Number(clientId) : undefined,
        }, {
            enabled: activeSection === 'forms' && availableSections?.some(s => s.key === 'forms'),
            refetchOnWindowFocus: false,
        });

    const handleRefresh = () => {
        switch (activeSection) {
            case 'overview': refetchOverview(); break;
            case 'clients': refetchClients(); break;
            case 'projects': refetchProjects(); break;
            case 'tasks': refetchTasks(); break;
            case 'invoices': refetchInvoices(); break;
            case 'accounting': refetchAccounting(); break;
            case 'hr': refetchHr(); break;
            case 'forms': refetchForms(); break;
        }
    };

    const handlePrint = () => {
        if (printRef.current) {
            const printContent = printRef.current.innerHTML;
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(`
          <!DOCTYPE html>
          <html dir="rtl">
          <head>
            <meta charset="utf-8">
            <title>تقرير - ${availableSections?.find(s => s.key === activeSection)?.label || 'نظرة عامة'}</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; direction: rtl; }
              .grid { display: grid; gap: 16px; }
              .card { border: 1px solid #ddd; border-radius: 8px; padding: 16px; }
              .text-2xl { font-size: 1.5rem; font-weight: bold; }
              .text-muted { color: #666; font-size: 0.875rem; }
              table { width: 100%; border-collapse: collapse; margin-top: 16px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
              th { background: #f5f5f5; }
              @media print { body { padding: 0; } }
            </style>
          </head>
          <body>
            <h1>تقرير ${availableSections?.find(s => s.key === activeSection)?.label || 'نظرة عامة'}</h1>
            <p>التاريخ: ${new Date().toLocaleDateString('ar-EG')}</p>
            ${from || to ? `<p>الفترة: ${from || 'البداية'} - ${to || 'الآن'}</p>` : ''}
            ${printContent}
          </body>
          </html>
        `);
                printWindow.document.close();
                printWindow.print();
            }
        }
    };

    const isLoading = sectionsLoading ||
        (activeSection === 'overview' && overviewLoading) ||
        (activeSection === 'clients' && clientsLoading) ||
        (activeSection === 'projects' && projectsLoading) ||
        (activeSection === 'tasks' && tasksLoading) ||
        (activeSection === 'invoices' && invoicesLoading) ||
        (activeSection === 'accounting' && accountingLoading) ||
        (activeSection === 'hr' && hrLoading) ||
        (activeSection === 'forms' && formsLoading);

    if (sectionsLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-[60vh]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    if (!availableSections || availableSections.length === 0) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                    <LayoutDashboard className="h-16 w-16 text-muted-foreground mb-4" />
                    <h2 className="text-xl font-semibold">لا توجد تقارير متاحة</h2>
                    <p className="text-muted-foreground">ليس لديك صلاحية الوصول لأي تقارير</p>
                </div>
            </DashboardLayout>
        );
    }

    // Set initial section if current is not available
    if (!availableSections.find(s => s.key === activeSection)) {
        setActiveSection(availableSections[0].key);
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">التقارير العامة</h1>
                        <p className="text-muted-foreground">إحصائيات وتقارير شاملة لكل الأقسام</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
                            <RefreshCw className={`h-4 w-4 ml-2 ${isLoading ? 'animate-spin' : ''}`} />
                            تحديث
                        </Button>
                        <Button variant="outline" onClick={handlePrint}>
                            <Printer className="h-4 w-4 ml-2" />
                            طباعة
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader>
                        <CardTitle>الفلاتر</CardTitle>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-4 gap-4">
                        <div>
                            <label className="text-sm mb-2 block">من تاريخ</label>
                            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-sm mb-2 block">إلى تاريخ</label>
                            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                        </div>
                        {clients && clients.length > 0 && (
                            <div>
                                <label className="text-sm mb-2 block">العميل</label>
                                <Select value={clientId} onValueChange={setClientId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="الكل" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">الكل</SelectItem>
                                        {clients.map((c) => (
                                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {projects && projects.length > 0 && (
                            <div>
                                <label className="text-sm mb-2 block">المشروع</label>
                                <Select value={projectId} onValueChange={setProjectId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="الكل" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">الكل</SelectItem>
                                        {projects.map((p: any) => (
                                            <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Section Tabs */}
                <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as ReportSection)}>
                    <TabsList className="flex flex-wrap h-auto gap-1 p-1">
                        {availableSections.map((section) => (
                            <TabsTrigger
                                key={section.key}
                                value={section.key}
                                className="flex items-center gap-2"
                            >
                                {sectionIcons[section.key]}
                                {section.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <div ref={printRef} className="mt-4">
                        {/* Overview Tab */}
                        <TabsContent value="overview">
                            {overviewLoading ? (
                                <div className="h-48 bg-muted rounded animate-pulse" />
                            ) : overviewData && (
                                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <Card>
                                        <CardContent className="pt-6">
                                            <div className="flex items-center gap-4">
                                                <Users className="h-8 w-8 text-blue-500" />
                                                <div>
                                                    <p className="text-2xl font-bold">{overviewData.clients.total}</p>
                                                    <p className="text-muted-foreground text-sm">العملاء</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="pt-6">
                                            <div className="flex items-center gap-4">
                                                <FolderKanban className="h-8 w-8 text-green-500" />
                                                <div>
                                                    <p className="text-2xl font-bold">{overviewData.projects.total}</p>
                                                    <p className="text-muted-foreground text-sm">المشاريع</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="pt-6">
                                            <div className="flex items-center gap-4">
                                                <Receipt className="h-8 w-8 text-amber-500" />
                                                <div>
                                                    <p className="text-2xl font-bold">{overviewData.invoices.total}</p>
                                                    <p className="text-muted-foreground text-sm">الفواتير</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="pt-6">
                                            <div className="flex items-center gap-4">
                                                <FileText className="h-8 w-8 text-purple-500" />
                                                <div>
                                                    <p className="text-2xl font-bold">{overviewData.forms.total}</p>
                                                    <p className="text-muted-foreground text-sm">الاستمارات</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {overviewData.financials && (
                                        <>
                                            <Card className="md:col-span-2">
                                                <CardContent className="pt-6">
                                                    <div className="flex items-center gap-4">
                                                        <TrendingUp className="h-8 w-8 text-green-600" />
                                                        <div>
                                                            <p className="text-2xl font-bold">{overviewData.financials.paidRevenue.toLocaleString()} ر.س</p>
                                                            <p className="text-muted-foreground text-sm">الإيرادات المحصلة</p>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                            <Card className="md:col-span-2">
                                                <CardContent className="pt-6">
                                                    <div className="flex items-center gap-4">
                                                        <TrendingDown className="h-8 w-8 text-red-500" />
                                                        <div>
                                                            <p className="text-2xl font-bold">{overviewData.financials.totalExpenses.toLocaleString()} ر.س</p>
                                                            <p className="text-muted-foreground text-sm">المصروفات</p>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                            <Card className="md:col-span-4">
                                                <CardContent className="pt-6">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-4">
                                                            <Calculator className="h-10 w-10 text-primary" />
                                                            <div>
                                                                <p className="text-3xl font-bold">{overviewData.financials.netProfit.toLocaleString()} ر.س</p>
                                                                <p className="text-muted-foreground">صافي الربح</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-left">
                                                            <p className={`text-2xl font-bold ${overviewData.financials.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                {overviewData.financials.profitMargin.toFixed(1)}%
                                                            </p>
                                                            <p className="text-muted-foreground text-sm">هامش الربح</p>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </>
                                    )}
                                </div>
                            )}
                        </TabsContent>

                        {/* Clients Tab */}
                        <TabsContent value="clients">
                            {clientsLoading ? (
                                <div className="h-48 bg-muted rounded animate-pulse" />
                            ) : clientsData && (
                                <div className="grid md:grid-cols-2 gap-4">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>إحصائيات العملاء</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                                                <span>إجمالي العملاء</span>
                                                <span className="text-2xl font-bold">{clientsData.totalClients}</span>
                                            </div>
                                            <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                                                <span>العملاء الجدد (الفترة)</span>
                                                <span className="text-2xl font-bold text-green-600">{clientsData.newClients}</span>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {Object.keys(clientsData.clientsByCity).length > 0 && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>العملاء حسب المدينة</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <Pie
                                                    data={{
                                                        labels: Object.keys(clientsData.clientsByCity),
                                                        datasets: [{
                                                            data: Object.values(clientsData.clientsByCity),
                                                            backgroundColor: ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'],
                                                        }]
                                                    }}
                                                    options={{ plugins: { legend: { position: 'bottom' } } }}
                                                />
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            )}
                        </TabsContent>

                        {/* Projects Tab */}
                        <TabsContent value="projects">
                            {projectsLoading ? (
                                <div className="h-48 bg-muted rounded animate-pulse" />
                            ) : projectsData && (
                                <div className="grid md:grid-cols-2 gap-4">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>إحصائيات المشاريع</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                                                <span>إجمالي المشاريع</span>
                                                <span className="text-2xl font-bold">{projectsData.totalProjects}</span>
                                            </div>
                                            {projectsData.totalBudget !== null && (
                                                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                                                    <span>إجمالي الميزانية</span>
                                                    <span className="text-2xl font-bold text-green-600">{projectsData.totalBudget.toLocaleString()} ر.س</span>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {Object.keys(projectsData.projectsByStatus).length > 0 && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>المشاريع حسب الحالة</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <Bar
                                                    data={{
                                                        labels: Object.keys(projectsData.projectsByStatus).map(s => {
                                                            const labels: Record<string, string> = {
                                                                design: 'تصميم', execution: 'تنفيذ', delivery: 'تسليم',
                                                                completed: 'مكتمل', cancelled: 'ملغي'
                                                            };
                                                            return labels[s] || s;
                                                        }),
                                                        datasets: [{
                                                            label: 'عدد المشاريع',
                                                            data: Object.values(projectsData.projectsByStatus),
                                                            backgroundColor: ['#3b82f6', '#22c55e', '#f59e0b', '#10b981', '#ef4444'],
                                                        }]
                                                    }}
                                                    options={{
                                                        plugins: { legend: { display: false } },
                                                        scales: { y: { beginAtZero: true } }
                                                    }}
                                                />
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            )}
                        </TabsContent>

                        {/* Tasks Tab */}
                        <TabsContent value="tasks">
                            {tasksLoading ? (
                                <div className="h-48 bg-muted rounded animate-pulse" />
                            ) : tasksData && (
                                <div className="grid md:grid-cols-2 gap-4">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>إحصائيات المهام</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                                                <span>إجمالي المهام</span>
                                                <span className="text-2xl font-bold">{tasksData.totalTasks}</span>
                                            </div>
                                            <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                                <span>المهام المكتملة</span>
                                                <span className="text-2xl font-bold text-green-600">{tasksData.completedCount}</span>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {Object.keys(tasksData.tasksByStatus).length > 0 && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>المهام حسب الحالة</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <Pie
                                                    data={{
                                                        labels: Object.keys(tasksData.tasksByStatus).map(s => {
                                                            const labels: Record<string, string> = {
                                                                planned: 'مخطط', in_progress: 'قيد التنفيذ', done: 'مكتمل', cancelled: 'ملغي'
                                                            };
                                                            return labels[s] || s;
                                                        }),
                                                        datasets: [{
                                                            data: Object.values(tasksData.tasksByStatus),
                                                            backgroundColor: ['#9ca3af', '#3b82f6', '#22c55e', '#ef4444'],
                                                        }]
                                                    }}
                                                    options={{ plugins: { legend: { position: 'bottom' } } }}
                                                />
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            )}
                        </TabsContent>

                        {/* Invoices Tab */}
                        <TabsContent value="invoices">
                            {invoicesLoading ? (
                                <div className="h-48 bg-muted rounded animate-pulse" />
                            ) : invoicesData && (
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <Card>
                                        <CardContent className="pt-6">
                                            <div className="text-center">
                                                <p className="text-3xl font-bold">{invoicesData.totalInvoices}</p>
                                                <p className="text-muted-foreground">إجمالي الفواتير</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="pt-6">
                                            <div className="text-center">
                                                <p className="text-3xl font-bold text-green-600">{invoicesData.totalAmount.toLocaleString()} ر.س</p>
                                                <p className="text-muted-foreground">إجمالي المبالغ</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="pt-6">
                                            <div className="text-center">
                                                <p className="text-3xl font-bold text-blue-600">{invoicesData.paidAmount.toLocaleString()} ر.س</p>
                                                <p className="text-muted-foreground">المحصل</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="lg:col-span-3">
                                        <CardContent className="pt-6">
                                            <div className="text-center">
                                                <p className="text-3xl font-bold text-amber-600">{invoicesData.pendingAmount.toLocaleString()} ر.س</p>
                                                <p className="text-muted-foreground">المتبقي</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}
                        </TabsContent>

                        {/* Accounting Tab */}
                        <TabsContent value="accounting">
                            {accountingLoading ? (
                                <div className="h-48 bg-muted rounded animate-pulse" />
                            ) : accountingData && (
                                <div className="grid md:grid-cols-2 gap-4">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>ملخص مالي</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                                <span>الأقساط المحصلة</span>
                                                <span className="text-xl font-bold text-green-600">{accountingData.paidInstallments.toLocaleString()} ر.س</span>
                                            </div>
                                            <div className="flex justify-between items-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                                                <span>الأقساط المعلقة</span>
                                                <span className="text-xl font-bold text-amber-600">{accountingData.pendingInstallments.toLocaleString()} ر.س</span>
                                            </div>
                                            <div className="flex justify-between items-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                                <span>المصروفات</span>
                                                <span className="text-xl font-bold text-red-600">{accountingData.totalExpenses.toLocaleString()} ر.س</span>
                                            </div>
                                            <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg">
                                                <span>صافي الربح</span>
                                                <span className={`text-xl font-bold ${accountingData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {accountingData.netProfit.toLocaleString()} ر.س
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {Object.keys(accountingData.expensesByCategory).length > 0 && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>المصروفات حسب الفئة</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <Pie
                                                    data={{
                                                        labels: Object.keys(accountingData.expensesByCategory),
                                                        datasets: [{
                                                            data: Object.values(accountingData.expensesByCategory),
                                                            backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#22c55e', '#8b5cf6', '#06b6d4'],
                                                        }]
                                                    }}
                                                    options={{ plugins: { legend: { position: 'bottom' } } }}
                                                />
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            )}
                        </TabsContent>

                        {/* HR Tab */}
                        <TabsContent value="hr">
                            {hrLoading ? (
                                <div className="h-48 bg-muted rounded animate-pulse" />
                            ) : hrData && (
                                <div className="grid md:grid-cols-2 gap-4">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>إحصائيات الموظفين</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                                                <span>إجمالي الموظفين</span>
                                                <span className="text-2xl font-bold">{hrData.totalEmployees}</span>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {Object.keys(hrData.employeesByDepartment).length > 0 && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>الموظفين حسب القسم</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <Bar
                                                    data={{
                                                        labels: Object.keys(hrData.employeesByDepartment),
                                                        datasets: [{
                                                            label: 'عدد الموظفين',
                                                            data: Object.values(hrData.employeesByDepartment),
                                                            backgroundColor: '#3b82f6',
                                                        }]
                                                    }}
                                                    options={{
                                                        indexAxis: 'y',
                                                        plugins: { legend: { display: false } },
                                                        scales: { x: { beginAtZero: true } }
                                                    }}
                                                />
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            )}
                        </TabsContent>

                        {/* Forms Tab */}
                        <TabsContent value="forms">
                            {formsLoading ? (
                                <div className="h-48 bg-muted rounded animate-pulse" />
                            ) : formsData && (
                                <div className="grid md:grid-cols-2 gap-4">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>إحصائيات الاستمارات</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                                                <span>إجمالي الاستمارات</span>
                                                <span className="text-2xl font-bold">{formsData.totalForms}</span>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {Object.keys(formsData.formsByStatus).length > 0 && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>الاستمارات حسب الحالة</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <Pie
                                                    data={{
                                                        labels: Object.keys(formsData.formsByStatus).map(s => {
                                                            const labels: Record<string, string> = {
                                                                pending: 'قيد المراجعة', reviewed: 'تمت المراجعة',
                                                                approved: 'معتمد', rejected: 'مرفوض'
                                                            };
                                                            return labels[s] || s;
                                                        }),
                                                        datasets: [{
                                                            data: Object.values(formsData.formsByStatus),
                                                            backgroundColor: ['#f59e0b', '#3b82f6', '#22c55e', '#ef4444'],
                                                        }]
                                                    }}
                                                    options={{ plugins: { legend: { position: 'bottom' } } }}
                                                />
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            )}
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </DashboardLayout>
    );
}
