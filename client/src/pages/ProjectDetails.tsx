/*
 © 2025 - Property of [Mohammed Ahmed / Golden Touch Design co.]
 Unauthorized use or reproduction is prohibited.
*/
import { useParams } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  FileText,
  Users,
  BarChart3,
  Clock,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  ClipboardList,
  Layers,
  Trash2,
  Download,
  Upload,
  Database
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import ProjectTasksContent from "@/components/ProjectTasksContent";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

export default function ProjectDetails() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const projectId = params.id ? parseInt(params.id) : 0;

  const utils = trpc.useUtils();
  const { data: projectData, isLoading } = trpc.projects.getDetails.useQuery({ id: projectId });
  const { data: tasks } = trpc.projects.listTasks.useQuery({ projectId });
  const createTask = trpc.projects.createTask.useMutation({
    onSuccess: () => {
      utils.projects.listTasks.invalidate({ projectId });
    }
  });
  const deleteTask = trpc.projects.deleteTask.useMutation({
    onSuccess: () => {
      utils.projects.listTasks.invalidate({ projectId });
      toast.success("تم حذف المهمة بنجاح");
    },
    onError: () => {
      toast.error("تعذر حذف المهمة");
    }
  });
  const updateTask = trpc.projects.updateTask.useMutation({
    onSuccess: () => {
      utils.projects.listTasks.invalidate({ projectId });
      toast.success("تم تحديث المهمة بنجاح");
    },
    onError: () => {
      toast.error("تعذر تحديث المهمة");
    }
  });
  const [newTask, setNewTask] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    assignedTo: ""  // Added for controlled form
  });

  const project = projectData?.project;
  const boq = projectData?.boqItems || [];
  const expenses = projectData?.expenses || [];
  const installments = projectData?.installments || [];
  const sales = projectData?.sales || [];
  const client = projectData?.client;

  // Permission check for financial data
  const { user } = useAuth();
  const { data: permissions } = trpc.auth.getMyPermissions.useQuery();
  const canViewFinancials = permissions?.permissions.projects.viewFinancials || user?.role === 'admin' || user?.role === 'project_manager';
  const { data: rfis } = trpc.rfi.list.useQuery({ projectId });
  const { data: submittals } = trpc.submittals.list.useQuery({ projectId });
  const { data: drawings } = trpc.drawings.list.useQuery({ projectId });
  const { data: baseline } = trpc.projectReports.baselineVsActual.useQuery({ projectId });
  const { data: procurement } = trpc.projectReports.procurementTracker.useQuery({ projectId });

  // Fetch purchases and operating costs from accounting linked to this project
  const { data: allPurchases } = trpc.accounting.purchases.list.useQuery();
  const { data: allOperatingCosts } = trpc.accounting.expenses.list.useQuery({ projectId });

  // Filter purchases for this project (client-side filtering since API doesn't support projectId filter)
  const projectPurchases = (allPurchases || []).filter((p: any) => p.projectId === projectId);
  const projectOperatingCosts = allOperatingCosts || [];
  const createRfi = trpc.rfi.create.useMutation({
    onSuccess: () => utils.rfi.list.invalidate({ projectId })
  });
  const answerRfi = trpc.rfi.answer.useMutation({
    onSuccess: () => utils.rfi.list.invalidate({ projectId })
  });
  const deleteRfi = trpc.rfi.delete.useMutation({
    onSuccess: () => {
      utils.rfi.list.invalidate({ projectId });
      toast.success("تم حذف الـ RFI");
    }
  });
  const createSubmittal = trpc.submittals.create.useMutation({
    onSuccess: () => utils.submittals.list.invalidate({ projectId })
  });
  const approveSubmittal = trpc.submittals.approve.useMutation({
    onSuccess: () => utils.submittals.list.invalidate({ projectId })
  });
  const rejectSubmittal = trpc.submittals.reject.useMutation({
    onSuccess: () => utils.submittals.list.invalidate({ projectId })
  });
  const deleteSubmittal = trpc.submittals.delete.useMutation({
    onSuccess: () => {
      utils.submittals.list.invalidate({ projectId });
      toast.success("تم حذف الـ Submittal");
    }
  });
  const createDrawing = trpc.drawings.create.useMutation({
    onSuccess: () => utils.drawings.list.invalidate({ projectId })
  });
  const addDrawingVersion = trpc.drawings.addVersion.useMutation({
    onSuccess: () => {
      utils.drawings.list.invalidate({ projectId });
      if (openVersionsId) utils.drawings.versions.invalidate({ drawingId: openVersionsId });
    }
  });
  const deleteDrawing = trpc.drawings.delete.useMutation({
    onSuccess: () => {
      utils.drawings.list.invalidate({ projectId });
      toast.success("تم حذف الرسم");
    }
  });
  const uploadFile = trpc.files.upload.useMutation();
  const [openVersionsId, setOpenVersionsId] = useState<number | null>(null);
  const { data: openVersions } = trpc.drawings.versions.useQuery(
    { drawingId: openVersionsId || 0 },
    { enabled: !!openVersionsId }
  );
  // Team management
  const { data: teamMembers } = trpc.projects.listTeam.useQuery({ projectId });

  // Project files (attachments)
  const { data: projectFiles, refetch: refetchFiles } = trpc.files.list.useQuery(
    { entityType: 'project', entityId: projectId },
    { enabled: projectId > 0 }
  );
  const deleteFile = trpc.files.delete.useMutation({
    onSuccess: () => {
      refetchFiles();
      toast.success("تم حذف الملف");
    },
    onError: () => toast.error("تعذر حذف الملف")
  });

  // Financial Mutations
  const createInstallment = trpc.accounting.installments.create.useMutation({
    onSuccess: () => {
      utils.projects.getDetails.invalidate({ id: projectId });
      toast.success("تم إضافة القسط بنجاح");
      setIsAddInstallmentOpen(false);
    },
    onError: () => toast.error("تعذر إضافة القسط")
  });
  const createExpense = trpc.accounting.expenses.create.useMutation({
    onSuccess: () => {
      utils.projects.getDetails.invalidate({ id: projectId });
      toast.success("تم إضافة المصروف بنجاح");
      setIsAddExpenseOpen(false);
    },
    onError: () => toast.error("تعذر إضافة المصروف")
  });
  const createBoq = trpc.accounting.boq.create.useMutation({
    onSuccess: () => {
      utils.projects.getDetails.invalidate({ id: projectId });
      toast.success("تم إضافة بند BOQ بنجاح");
      setIsAddBoqOpen(false);
    },
    onError: () => toast.error("تعذر إضافة البند")
  });

  const [isAddInstallmentOpen, setIsAddInstallmentOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAddBoqOpen, setIsAddBoqOpen] = useState(false);

  // Upload progress state
  const [uploadProgress, setUploadProgress] = useState<{ progress: number; speed: string; fileName: string } | null>(null);

  // Project forms
  const { data: allForms } = trpc.forms.list.useQuery();
  const projectForms = allForms?.filter((f: any) => f.projectId === projectId) || [];
  const { data: allUsers } = trpc.users.list.useQuery();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [teamRole, setTeamRole] = useState<string>("member");
  const addTeamMember = trpc.projects.addTeamMember.useMutation({
    onSuccess: () => {
      utils.projects.listTeam.invalidate({ projectId });
      setSelectedUserId("");
      toast.success("تمت إضافة العضو بنجاح");
    },
    onError: (e) => toast.error(e.message || "تعذر إضافة العضو")
  });
  const removeTeamMember = trpc.projects.removeTeamMember.useMutation({
    onSuccess: () => {
      utils.projects.listTeam.invalidate({ projectId });
      toast.success("تم حذف العضو");
    },
    onError: () => toast.error("تعذر حذف العضو")
  });

  // Status labels for lifecycle (in_progress, delivered, cancelled)
  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      in_progress: "قيد التقدم",
      delivered: "تم التسليم",
      cancelled: "ملغي"
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      in_progress: "bg-blue-500/10 text-blue-500",
      delivered: "bg-green-500/10 text-green-500",
      cancelled: "bg-red-500/10 text-red-500"
    };
    return colorMap[status] || "bg-gray-500/10 text-gray-500";
  };

  // Project type labels (immutable after creation)
  const getProjectTypeLabel = (projectType: string) => {
    const typeMap: Record<string, string> = {
      design: "تصميم",
      execution: "تنفيذ",
      design_execution: "تصميم وتنفيذ",
      supervision: "إشراف"
    };
    return typeMap[projectType] || projectType;
  };

  // Check if project type allows financial section
  // Only execution and design_execution have financials
  const projectHasFinancials = (projectType: string) => {
    // Always show for admin and project manager
    if (user?.role === 'admin' || user?.role === 'project_manager') return true;
    return projectType === 'execution' || projectType === 'design_execution';
  };

  // Predefined task templates by project type
  const designTasks = [
    "جمع المعلومات (متطلبات العميل - المخططات والصور)",
    "الرفع المعماري (2D+3D الكونسبت - مخطط الوضع القائم)",
    "توزيع الحركة والمخططات (مخطط توزيع اولي - تحديد وتوزيع الحركة والاثاث والديكور)",
    "المود بورد + الماتريال (اختيار الألوان والخامات والاضاءة والاثاث)",
    "التصميم ثلاثي الابعاد (تطبيق التطشيبات ثم الديكور ثم الاثاث - رندر مبدئي)",
    "جلسات التعديل (تعديل طلبات العميل وفقا لاستمارة التعديلات)",
    "المخططات التنفيذية (المخططات التنفيذية كاملة - جداول الكميات)",
    "الإخراج النهائي فيديو + صور + VR",
    "ملفات التسليم (تجهيز ملفات التسليم PDF - فيديو و VR)",
    "التسليم النهائي",
    "مخصص"
  ];

  const executionTasks = [
    "هدم و ترحيل و طلب حاوية مخلفات",
    "تعميد مقاسات و كميات مباني (جدران - اسقف - حديد - خرسانة)",
    "تعميد مقاسات و كميات تشطيب (كهرباء - سباكة - لياسة - دهان - بلاط - ابواب - نوافذ - عزل)",
    "تعميد مقاسات و كميات ديكور (تكسيات جدران - تكسيات ارضيات - لوحات - جبس - جبس بورد)",
    "تعميد مقاسات و كميات اثاث (اسرة - خزائن - طاولات - رفوف - كنب - ستائر - سجاد)",
    "تعميد الخامات مع العميل (تشطيب - ديكور - اثاث)",
    "طلب مواد العظم",
    "طلب مواد التشطيب",
    "طلب مواد الديكور",
    "طلب الاثاث",
    "اعمال نجارة العظم",
    "اعمال حديد العظم",
    "صبة النظافة",
    "صب القواعد",
    "صب الاعمدة",
    "صب الجسور",
    "صب الاسقف",
    "عزل القواعد",
    "عزل الرقاب",
    "بناء الجدران",
    "تأسيس سباكة",
    "تأسيس كهرباء",
    "تأسيس التكييف",
    "تأسيس كاميرات وشبكات",
    "تأسيس سمارت هوم",
    "تأسيس لاندسكيب (احواض - كهرباء - سباكة)",
    "لياسة داخلية",
    "لياسة خارجية",
    "لياسة السور",
    "عزل مائي حمامات ومطابخ",
    "عزل مائي سطح",
    "عزل حراري جدران",
    "عزل حراري اسقف",
    "جبس الاسقف",
    "جبس الديكور",
    "فتحات جبس التكييف والصيانة",
    "فتحات جبس الانارة و الكهرباء",
    "بلاط الحمامات والمطابخ",
    "بلاط الارضيات الداخلية والخارجية",
    "دهان الاسقف والجدران الداخلية",
    "دهان الجدران والواجهات الخارجية",
    "تركيب الشبابيك",
    "تركيب الابواب",
    "تركيب المفاتيح والافياش",
    "تركيب الانارة",
    "تركيب المراحيض والمغاسل",
    "تركيب السخانات و الخزانات",
    "تركيب المضخات",
    "تركيب تكسيات ديكور الجدران",
    "تركيب تكسيات ديكور الارضيات",
    "تركيب اللوحات والمعلقات الجدارية",
    "تركيب الستائر",
    "تركيب غرف النوم",
    "تركيب الكنب",
    "تركيب الطاولات (جاهزة)",
    "تركيب الرفوف والطاولات (تفصيل)",
    "تركيب المظلات والسواتر",
    "تركيب الديكورات الخارجية واللاندسكيب",
    "الزراعة",
    "النظافة",
    "مخصص"
  ];

  // Get available tasks based on project type
  const getAvailableTasks = () => {
    const projectType = project?.projectType;
    if (projectType === 'design') return designTasks;
    if (projectType === 'execution') return executionTasks;
    if (projectType === 'design_execution') return [...designTasks, ...executionTasks];
    return [];
  };


  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0) +
    (projectPurchases || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  // Revenue from Sales (Invoices)
  const totalRevenue = (sales || []).reduce((sum, sale) => sum + (sale.status !== 'cancelled' ? sale.amount : 0), 0);
  const paidRevenue = (sales || []).filter(s => s.status === 'completed').reduce((sum, sale) => sum + sale.amount, 0);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid gap-6 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <div className="h-16 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">المشروع غير موجود</h3>
            <p className="text-muted-foreground text-center mb-6">
              لم يتم العثور على المشروع المطلوب
            </p>
            <Button onClick={() => setLocation("/projects")}>
              <ArrowLeft className="ml-2 h-4 w-4" />
              العودة للمشاريع
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/projects")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
              <p className="text-muted-foreground mt-1">
                {project.projectNumber}
                {client && (
                  <span className="mr-3 text-primary font-medium">• العميل: {client.name}</span>
                )}
              </p>
            </div>
            {/* Project Type Badge (immutable) */}
            {project.projectType && (
              <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-300">
                {getProjectTypeLabel(project.projectType)}
              </Badge>
            )}
            {/* Status Badge (lifecycle state) */}
            <Badge className={getStatusColor(project.status)}>
              {getStatusLabel(project.status)}
            </Badge>
          </div>

          <Button
            size="lg"
            className="gap-2"
            onClick={() => setLocation(`/projects/${project.id}/report`)}
          >
            <FileText className="w-5 h-5" />
            تقرير المشروع
          </Button>
        </div>

        {/* Stats Cards - Only visible to users with financial access */}
        {canViewFinancials && (
          <div className="grid gap-6 md:grid-cols-5">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">الميزانية</p>
                    <p className="text-2xl font-bold">{(project.budget || 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">ريال</p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">إجمالي BOQ</p>
                    <p className="text-2xl font-bold">{(boq.reduce((sum: number, item: any) => sum + (item.total || 0), 0) + (procurement || []).reduce((sum: number, item: any) => sum + (item.totalCost || 0), 0)).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">التكلفة المقدرة</p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Database className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">إجمالي الفواتير</p>
                    <p className="text-2xl font-bold">{totalRevenue.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">ريال</p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>


            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">المصروفات</p>
                    <p className="text-2xl font-bold">{totalExpenses.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">ريال</p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-red-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">المدفوع</p>
                    <p className="text-2xl font-bold">{paidRevenue.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">من {totalRevenue.toLocaleString()} ريال</p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Baseline vs Actual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">المخطط: {baseline?.plannedPercent ?? 0}%</div>
              <div className="text-sm">الفعلي: {baseline?.actualPercent ?? 0}%</div>
              <div className={`text-sm ${((baseline?.variance ?? 0) >= 0) ? 'text-green-600' : 'text-red-600'}`}>الانحراف: {baseline?.variance ?? 0}%</div>
              <div className="h-2 bg-muted rounded mt-2">
                <div className="h-2 bg-primary rounded" style={{ width: `${baseline?.actualPercent ?? 0}%` }} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>توريد البنود الحرجة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(procurement || []).slice(0, 6).map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="truncate max-w-[200px]" title={p.itemName}>
                      {p.itemName}
                      <span className="mr-2 text-xs text-muted-foreground">({(p.totalCost || 0).toLocaleString()} ريال)</span>
                    </span>
                    <span className="text-green-600 font-medium">
                      تم الفوترة
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="tasks" className="w-full">
          {/* First row of tabs: المالية - المهام الزمنية - الفريق */}
          <TabsList className="grid w-full max-w-4xl grid-cols-6 mb-2">
            {/* Financial tab - only shows for execution or design_execution projects */}
            {canViewFinancials && project.projectType && projectHasFinancials(project.projectType) && (
              <TabsTrigger value="financials" className="gap-2">
                <DollarSign className="w-4 h-4" />
                المالية
              </TabsTrigger>
            )}
            <TabsTrigger value="tasks" className="gap-2">
              <Clock className="w-4 h-4" />
              المهام الزمنية
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-2">
              <Users className="w-4 h-4" />
              الفريق
            </TabsTrigger>
            {/* Second row tabs: ملفات المشروع - استمارات المشروع - مراحل المشروع */}
            <TabsTrigger value="files" className="gap-2">
              <FolderOpen className="w-4 h-4" />
              ملفات المشروع
            </TabsTrigger>
            <TabsTrigger value="forms" className="gap-2">
              <ClipboardList className="w-4 h-4" />
              استمارات المشروع
            </TabsTrigger>
            <TabsTrigger value="phases" className="gap-2">
              <Layers className="w-4 h-4" />
              مراحل المشروع
            </TabsTrigger>
          </TabsList>

          {canViewFinancials && (
            <TabsContent value="financials" className="mt-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>ملخص المالية</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">الميزانية الكلية:</span>
                      <span className="font-bold">{(project.budget || 0).toLocaleString()} ريال</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">إجمالي BOQ (التكلفة المقدرة):</span>
                      <span className="font-bold text-blue-600">{(boq.reduce((sum: number, item: any) => sum + (item.total || 0), 0) + (procurement || []).reduce((sum: number, item: any) => sum + (item.totalCost || 0), 0)).toLocaleString()} ريال</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">المدفوع من العميل (الفواتير):</span>
                      <span className="font-bold text-green-500">{paidRevenue.toLocaleString()} ريال</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">المصروفات الفعلية:</span>
                      <span className="font-bold text-red-500">-{totalExpenses.toLocaleString()} ريال</span>
                    </div>
                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">صافي الربح:</span>
                        <span className={`font-bold text-lg ${(paidRevenue - totalExpenses) >= 0 ? "text-green-500" : "text-red-500"
                          }`}>
                          {(paidRevenue - totalExpenses).toLocaleString()} ريال
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <Tabs defaultValue="installments" className="w-full">
                    <div className="px-6 pt-6 flex justify-between items-center">
                      <TabsList>
                        <TabsTrigger value="installments">سجل الفواتير - الإيرادات ({sales.length})</TabsTrigger>
                        <TabsTrigger value="purchases">المشتريات ({projectPurchases.length})</TabsTrigger>
                        <TabsTrigger value="operatingCosts">التكاليف التشغيلية ({projectOperatingCosts.length})</TabsTrigger>
                      </TabsList>
                    </div>

                    <div className="p-6">
                      {/* Sales/Invoices Logic Replaces Installments */}
                      <TabsContent value="installments" className="mt-0">
                        <div className="flex justify-between items-center mb-4">
                          <div>
                            <h3 className="font-bold">سجل الفواتير والإيرادات</h3>
                            <p className="text-sm text-muted-foreground">يتم جلب هذه البيانات تلقائياً من الفواتير المربوطة بالمشروع.</p>
                          </div>
                        </div>
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>رقم الفاتورة</TableHead>
                                <TableHead>الوصف</TableHead>
                                <TableHead>المبلغ</TableHead>
                                <TableHead>التاريخ</TableHead>
                                <TableHead>الحالة</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(sales || []).length > 0 ? (
                                sales.map((sale) => (
                                  <TableRow key={sale.id}>
                                    <TableCell>{sale.saleNumber}</TableCell>
                                    <TableCell>{sale.description}</TableCell>
                                    <TableCell>{sale.amount.toLocaleString()} ريال</TableCell>
                                    <TableCell>{new Date(sale.saleDate).toLocaleDateString('ar-SA')}</TableCell>
                                    <TableCell>
                                      <span className={`px-2 py-1 rounded text-xs ${sale.status === 'completed' ? 'bg-green-100 text-green-800' :
                                        sale.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                        {sale.status === 'completed' ? 'مدفوع' : sale.status === 'pending' ? 'معلق' : 'ملغي'}
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center text-muted-foreground">لا توجد فواتير مربوطة بهذا المشروع</TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </TabsContent>

                      {/* Purchases Tab */}
                      <TabsContent value="purchases" className="mt-0">
                        <div className="flex justify-between items-center mb-4">
                          <div>
                            <h3 className="font-bold">المشتريات المرتبطة بالمشروع</h3>
                            <p className="text-sm text-muted-foreground">المشتريات المسجلة في المحاسبة والمربوطة بهذا المشروع.</p>
                          </div>
                        </div>
                        <div className="border rounded overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-right">رقم العملية</TableHead>
                                <TableHead className="text-right">المورد</TableHead>
                                <TableHead className="text-right">الوصف</TableHead>
                                <TableHead className="text-right">التاريخ</TableHead>
                                <TableHead className="text-left">المبلغ</TableHead>
                                <TableHead className="text-center">الحالة</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {projectPurchases.length > 0 ? projectPurchases.map((purchase: any) => (
                                <TableRow key={purchase.id}>
                                  <TableCell>{purchase.purchaseNumber}</TableCell>
                                  <TableCell>{purchase.supplierName}</TableCell>
                                  <TableCell>{purchase.description}</TableCell>
                                  <TableCell>{new Date(purchase.purchaseDate).toLocaleDateString("ar-SA")}</TableCell>
                                  <TableCell className="text-left font-bold text-orange-600">{purchase.amount?.toLocaleString()} ريال</TableCell>
                                  <TableCell className="text-center">
                                    <span className={`px-2 py-1 rounded text-xs ${purchase.status === 'completed' ? 'bg-green-100 text-green-800' :
                                      purchase.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                                      }`}>
                                      {purchase.status === 'completed' ? 'مكتمل' : purchase.status === 'pending' ? 'معلق' : 'ملغي'}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              )) : (
                                <TableRow>
                                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">لا توجد مشتريات مربوطة بهذا المشروع</TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </TabsContent>

                      {/* Operating Costs Tab */}
                      <TabsContent value="operatingCosts" className="mt-0">
                        <div className="flex justify-between items-center mb-4">
                          <div>
                            <h3 className="font-bold">التكاليف التشغيلية</h3>
                            <p className="text-sm text-muted-foreground">التكاليف التشغيلية المسجلة في المحاسبة والمربوطة بهذا المشروع.</p>
                          </div>
                        </div>
                        <div className="border rounded overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-right">التاريخ</TableHead>
                                <TableHead className="text-right">التصنيف</TableHead>
                                <TableHead className="text-right">الوصف</TableHead>
                                <TableHead className="text-left">المبلغ</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {projectOperatingCosts.length > 0 ? projectOperatingCosts.map((cost: any) => (
                                <TableRow key={cost.id}>
                                  <TableCell>{new Date(cost.expenseDate).toLocaleDateString("ar-SA")}</TableCell>
                                  <TableCell><Badge variant="outline">{cost.category}</Badge></TableCell>
                                  <TableCell>{cost.description}</TableCell>
                                  <TableCell className="text-left font-bold text-red-600">{cost.amount?.toLocaleString()} ريال</TableCell>
                                </TableRow>
                              )) : (
                                <TableRow>
                                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">لا توجد تكاليف تشغيلية مربوطة بهذا المشروع</TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </TabsContent>
                    </div>
                  </Tabs>
                </Card>
              </div>
            </TabsContent>
          )}

          <TabsContent value="team" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>إضافة عضو جديد</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm">اختر مستخدم</label>
                    <select
                      className="w-full p-2 border rounded mt-1"
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                    >
                      <option value="">اختر مستخدم...</option>
                      {(allUsers || []).filter((u: any) => !teamMembers?.find((t: any) => t.userId === u.id)).map((u: any) => (
                        <option key={u.id} value={u.id}>{u.name || u.email}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm">الدور في المشروع</label>
                    <select
                      className="w-full p-2 border rounded mt-1"
                      value={teamRole}
                      onChange={(e) => setTeamRole(e.target.value)}
                    >
                      <option value="member">عضو فريق</option>
                      <option value="manager">مدير مشروع</option>
                      <option value="engineer">مهندس</option>
                      <option value="designer">مصمم</option>
                      <option value="reviewer">مراجع</option>
                    </select>
                  </div>
                  <Button
                    onClick={() => {
                      if (!selectedUserId) {
                        toast.error("يرجى اختيار مستخدم");
                        return;
                      }
                      addTeamMember.mutate({ projectId, userId: parseInt(selectedUserId), role: teamRole });
                    }}
                    disabled={!selectedUserId || addTeamMember.isPending}
                  >
                    {addTeamMember.isPending ? "جاري الإضافة..." : "إضافة للفريق"}
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>أعضاء الفريق ({teamMembers?.length || 0})</CardTitle>
                </CardHeader>
                <CardContent>
                  {teamMembers && teamMembers.length > 0 ? (
                    <div className="space-y-2">
                      {teamMembers.map((member: any) => (
                        <div key={member.id} className="flex items-center justify-between p-3 border rounded">
                          <div>
                            <p className="font-medium">{member.userName || 'غير محدد'}</p>
                            <p className="text-sm text-muted-foreground">{member.userEmail}</p>
                            <Badge className="mt-1">{member.role || 'عضو'}</Badge>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeTeamMember.mutate({ id: member.id })}
                            disabled={removeTeamMember.isPending}
                          >
                            حذف
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
                      <p>لا يوجد أعضاء في الفريق</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="mt-6">
            <ProjectTasksContent projectId={projectId} />
          </TabsContent>

          {/* ملفات المشروع */}
          <TabsContent value="files" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-5 h-5" />
                    ملفات المشروع ({projectFiles?.length || 0})
                  </div>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        const startTime = Date.now();
                        setUploadProgress({ progress: 0, speed: '0 KB/s', fileName: file.name });

                        const reader = new FileReader();
                        reader.onprogress = (event) => {
                          if (event.lengthComputable) {
                            const percent = Math.round((event.loaded / event.total) * 100);
                            const elapsed = (Date.now() - startTime) / 1000;
                            const speed = elapsed > 0 ? (event.loaded / 1024 / elapsed).toFixed(1) : '0';
                            setUploadProgress({
                              progress: percent,
                              speed: `${speed} KB/s`,
                              fileName: file.name
                            });
                          }
                        };
                        reader.onload = async () => {
                          const base64 = (reader.result as string).split(",")[1];
                          try {
                            setUploadProgress(prev => prev ? { ...prev, progress: 90 } : null);
                            await uploadFile.mutateAsync({
                              entityType: "project",
                              entityId: projectId,
                              fileName: file.name,
                              fileData: base64,
                              mimeType: file.type
                            });
                            setUploadProgress(prev => prev ? { ...prev, progress: 100 } : null);
                            setTimeout(() => setUploadProgress(null), 1000);
                            refetchFiles();
                            toast.success("تم رفع الملف بنجاح");
                          } catch (err: any) {
                            setUploadProgress(null);
                            toast.error(err?.message || "فشل رفع الملف");
                          }
                        };
                        reader.readAsDataURL(file);
                        e.target.value = '';
                      }}
                    />
                    <Button variant="outline" size="sm" asChild disabled={!!uploadProgress}>
                      <span>
                        <Upload className="w-4 h-4 ml-2" />
                        رفع ملف
                      </span>
                    </Button>
                  </label>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Upload Progress Bar */}
                {uploadProgress && (
                  <div className="mb-4 p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium truncate">{uploadProgress.fileName}</span>
                      <span className="text-sm text-muted-foreground">{uploadProgress.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-primary h-3 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress.progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                      <span>السرعة: {uploadProgress.speed}</span>
                      <span>{uploadProgress.progress < 100 ? 'جاري الرفع...' : 'اكتمل!'}</span>
                    </div>
                  </div>
                )}

                {projectFiles && projectFiles.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {projectFiles.map((file: any) => (
                      <div key={file.id} className="flex items-center gap-3 p-3 border rounded hover:bg-muted/50 group">
                        <FileText className="w-8 h-8 text-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{file.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {file.fileSize ? `${(file.fileSize / 1024).toFixed(1)} KB` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // Download file properly instead of opening new tab
                              const link = document.createElement('a');
                              link.href = file.fileUrl;
                              link.download = file.fileName;
                              link.click();
                            }}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              if (confirm('هل تريد حذف هذا الملف؟')) {
                                deleteFile.mutate({ id: file.id });
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FolderOpen className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>لا توجد ملفات مرفقة بالمشروع</p>
                    <p className="text-sm mt-2">يمكنك إضافة ملفات التصميم والمخططات والمستندات هنا</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>



          {/* استمارات المشروع */}
          <TabsContent value="forms" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5" />
                    استمارات المشروع ({projectForms.length})
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation(`/forms?projectId=${projectId}`)}
                  >
                    <ClipboardList className="w-4 h-4 ml-2" />
                    إضافة استمارة
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {projectForms.length > 0 ? (
                  <div className="space-y-3">
                    {projectForms.map((form: any) => (
                      <div key={form.id} className="flex items-center justify-between p-4 border rounded hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                          <ClipboardList className="w-6 h-6 text-primary" />
                          <div>
                            <p className="font-medium">{form.formNumber}</p>
                            <p className="text-sm text-muted-foreground">{form.formType}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={
                            form.status === 'approved' ? 'default' :
                              form.status === 'rejected' ? 'destructive' :
                                form.status === 'reviewed' ? 'secondary' : 'outline'
                          }>
                            {form.status === 'approved' ? 'مقبولة' :
                              form.status === 'rejected' ? 'مرفوضة' :
                                form.status === 'reviewed' ? 'مراجعة' : 'معلقة'}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLocation(`/forms/${form.id}`)}
                          >
                            عرض
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <ClipboardList className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>لا توجد استمارات مرتبطة بالمشروع</p>
                    <p className="text-sm mt-2">يمكنك إنشاء استمارة جديدة وربطها بالمشروع</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* مراحل المشروع - using tasks as phases */}
          <TabsContent value="phases" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5" />
                    مراحل المشروع ({tasks?.length || 0})
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Add Phase Form */}
                <form
                  className="mb-6 p-4 border rounded-lg bg-muted/30"
                  onSubmit={async (e) => {
                    e.preventDefault();

                    // Debug logging - using newTask state
                    console.log("=== Phase Form Submission Debug ===");
                    console.log("newTask state:", newTask);
                    console.log("assignedTo value:", newTask.assignedTo);
                    console.log("teamMembers available:", teamMembers);

                    if (!newTask.name) {
                      toast.error("أدخل اسم المرحلة");
                      return;
                    }

                    try {
                      const mutationData = {
                        projectId,
                        name: newTask.name,
                        description: newTask.description || undefined,
                        startDate: newTask.startDate ? new Date(newTask.startDate) : undefined,
                        endDate: newTask.endDate ? new Date(newTask.endDate) : undefined,
                        assignedTo: newTask.assignedTo ? parseInt(newTask.assignedTo) : undefined
                      };
                      console.log("Mutation data being sent:", mutationData);

                      await createTask.mutateAsync(mutationData);
                      setNewTask({ name: "", description: "", startDate: "", endDate: "", assignedTo: "" });
                      toast.success("تم إضافة المرحلة");
                    } catch (err: any) {
                      console.error("Error creating phase:", err);
                      toast.error("تعذر إضافة المرحلة");
                    }
                  }}
                >
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    إضافة مرحلة جديدة
                  </h4>

                  {/* Quick Task Selection */}
                  {getAvailableTasks().length > 0 && (
                    <div className="mb-4">
                      <label className="text-sm font-medium mb-2 block">اختر من المهام الجاهزة:</label>
                      <select
                        className="w-full p-2 border rounded-md bg-background text-sm"
                        onChange={(e) => {
                          const selectedTask = e.target.value;
                          if (selectedTask) {
                            const input = document.querySelector('input[name="phaseName"]') as HTMLInputElement;
                            if (input) input.value = selectedTask;
                          }
                          e.target.value = '';
                        }}
                      >
                        <option value="">-- اختر مهمة جاهزة --</option>
                        {project?.projectType === 'design_execution' && (
                          <>
                            <optgroup label="مهام التصميم">
                              {designTasks.map((task, i) => (
                                <option key={`d-${i}`} value={task}>{task}</option>
                              ))}
                            </optgroup>
                            <optgroup label="مهام التنفيذ">
                              {executionTasks.map((task, i) => (
                                <option key={`e-${i}`} value={task}>{task}</option>
                              ))}
                            </optgroup>
                          </>
                        )}
                        {project?.projectType !== 'design_execution' && getAvailableTasks().map((task, i) => (
                          <option key={i} value={task}>{task}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid gap-3 md:grid-cols-2">
                    <Input
                      placeholder="اسم المرحلة *"
                      value={newTask.name}
                      onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                      required
                    />
                    <Input
                      placeholder="الوصف (اختياري)"
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    />
                    <Input
                      type="date"
                      placeholder="تاريخ البداية"
                      value={newTask.startDate}
                      onChange={(e) => setNewTask({ ...newTask, startDate: e.target.value })}
                    />
                    <Input
                      type="date"
                      placeholder="تاريخ النهاية"
                      value={newTask.endDate}
                      onChange={(e) => setNewTask({ ...newTask, endDate: e.target.value })}
                    />
                    <select
                      className="w-full p-2 border rounded bg-background text-sm"
                      value={newTask.assignedTo}
                      onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                    >
                      <option value="">-- تعيين لعضو فريق (اختياري) --</option>
                      {(teamMembers || []).map((m: any) => (
                        <option key={m.userId} value={m.userId}>{m.userName || m.userEmail || `User #${m.userId}`}</option>
                      ))}
                    </select>
                  </div>
                  <Button type="submit" className="mt-3" disabled={createTask.isPending}>
                    <Layers className="w-4 h-4 ml-2" />
                    إضافة مرحلة
                  </Button>
                </form>


                {tasks && tasks.length > 0 ? (
                  <div className="space-y-4">
                    {tasks.map((task: any, idx: number) => {
                      const start = task.startDate ? new Date(task.startDate) : null;
                      const end = task.endDate ? new Date(task.endDate) : null;
                      const now = new Date();
                      let progress = 0;
                      if (start && end) {
                        const total = end.getTime() - start.getTime();
                        const elapsed = now.getTime() - start.getTime();
                        progress = Math.min(100, Math.max(0, (elapsed / total) * 100));
                      }
                      const isCompleted = task.status === 'completed';

                      return (
                        <div key={task.id} className="relative group">
                          {idx < tasks.length - 1 && (
                            <div className="absolute left-5 top-12 w-0.5 h-full bg-border" />
                          )}
                          <div className="flex items-start gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isCompleted ? 'bg-green-500 text-white' : 'bg-primary/10 text-primary'
                              }`}>
                              {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                            </div>
                            <div className="flex-1 bg-muted/50 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold">{task.name}</h4>
                                <div className="flex items-center gap-2">
                                  <Badge variant={isCompleted ? 'default' : 'outline'}>
                                    {isCompleted ? 'مكتملة' : 'جارية'}
                                  </Badge>
                                  {/* Action Buttons */}
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                    {!isCompleted && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-green-600 hover:text-green-700"
                                        onClick={() => {
                                          updateTask.mutate({ id: task.id, status: 'done', progress: 100 });
                                        }}
                                      >
                                        <CheckCircle2 className="w-4 h-4" />
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-500 hover:text-red-600"
                                      onClick={() => {
                                        if (confirm('هل تريد حذف هذه المرحلة؟')) {
                                          deleteTask.mutate({ id: task.id });
                                        }
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                              {task.description && (
                                <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                              )}
                              {start && end && (
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span>من: {start.toLocaleDateString('ar-SA')}</span>
                                  <span>إلى: {end.toLocaleDateString('ar-SA')}</span>
                                </div>
                              )}
                              {!isCompleted && start && end && (
                                <div className="mt-2">
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-primary h-2 rounded-full transition-all"
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">{Math.round(progress)}% مكتمل</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Layers className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>لا توجد مراحل محددة للمشروع</p>
                    <p className="text-sm mt-2">أضف مرحلة جديدة من الفورم أعلاه</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>


        </Tabs>


        <Card>
          <CardHeader>
            <CardTitle>RFIs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <form
                className="grid md:grid-cols-4 gap-2 p-3 border rounded"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget as any;
                  const title = form.title.value;
                  const question = form.question.value;
                  const assignedTo = form.assignedTo.value ? parseInt(form.assignedTo.value) : undefined;
                  if (!title || !question) return;
                  await createRfi.mutateAsync({ projectId, title, question, assignedTo });
                  form.reset();
                }}
              >
                <Input name="title" placeholder="العنوان" />
                <Input name="question" placeholder="السؤال" />
                <select name="assignedTo" className="border rounded px-2 py-2 text-sm">
                  <option value="">موجه إلى (اختياري)</option>
                  {(teamMembers || []).map((m: any) => (
                    <option key={m.userId} value={m.userId}>{m.userName}</option>
                  ))}
                </select>
                <Button type="submit" variant="outline">إضافة</Button>
              </form>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>RFI</TableHead>
                    <TableHead>العنوان</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>إجابة</TableHead>
                    <TableHead className="text-left">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(rfis || []).map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.rfiNumber}</TableCell>
                      <TableCell>{r.title}</TableCell>
                      <TableCell>{r.status}</TableCell>
                      <TableCell>
                        <Input
                          defaultValue={r.answer || ""}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v) answerRfi.mutate({ id: r.id, answer: v });
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-left">
                        <Button variant="destructive" size="sm" onClick={() => deleteRfi.mutate({ id: r.id })}>
                          حذف
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Submittals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <form
                className="grid md:grid-cols-4 gap-2 p-3 border rounded"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget as any;
                  const title = form.title.value;
                  const assignedTo = form.assignedTo.value ? parseInt(form.assignedTo.value) : undefined;
                  if (!title) return;
                  await createSubmittal.mutateAsync({ projectId, title, assignedTo });
                  form.reset();
                }}
              >
                <Input name="title" placeholder="العنوان" />
                <select name="assignedTo" className="border rounded px-2 py-2 text-sm">
                  <option value="">موجه إلى (اختياري)</option>
                  {(teamMembers || []).map((m: any) => (
                    <option key={m.userId} value={m.userId}>{m.userName}</option>
                  ))}
                </select>
                <Button type="submit" variant="outline">إضافة</Button>
              </form>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الكود</TableHead>
                    <TableHead>العنوان</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="text-left">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(submittals || []).map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.submittalCode}</TableCell>
                      <TableCell>{s.title}</TableCell>
                      <TableCell>{s.status}</TableCell>
                      <TableCell className="text-left">
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" size="sm" onClick={() => approveSubmittal.mutate({ id: s.id })}>اعتماد</Button>
                          <Button variant="outline" size="sm" onClick={() => rejectSubmittal.mutate({ id: s.id })}>رفض</Button>
                          <Button variant="destructive" size="sm" onClick={() => deleteSubmittal.mutate({ id: s.id })}>حذف</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Drawings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <form
                className="grid md:grid-cols-4 gap-2 p-3 border rounded"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget as any;
                  const drawingCode = form.code.value;
                  const title = form.title.value;
                  const discipline = form.discipline.value;
                  if (!drawingCode || !title) return;
                  await createDrawing.mutateAsync({ projectId, drawingCode, title, discipline });
                  form.reset();
                }}
              >
                <Input name="code" placeholder="الكود" />
                <Input name="title" placeholder="العنوان" />
                <Input name="discipline" placeholder="التخصص" />
                <Button type="submit" variant="outline">إضافة</Button>
              </form>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الكود</TableHead>
                    <TableHead>العنوان</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="text-left">نسخة جديدة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(drawings || []).map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell>{d.drawingCode}</TableCell>
                      <TableCell>{d.title}</TableCell>
                      <TableCell>{d.status}</TableCell>
                      <TableCell className="text-left">
                        <div className="flex items-center gap-2 justify-end">
                          <Input type="text" placeholder="الإصدار" id={`ver-${d.id}`} />
                          <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const verInput = document.getElementById(`ver-${d.id}`) as HTMLInputElement;
                            const version = verInput?.value || "v1";
                            const reader = new FileReader();
                            reader.onload = async () => {
                              const base64 = (reader.result as string).split(",")[1];
                              const res = await uploadFile.mutateAsync({
                                entityType: "drawing",
                                entityId: d.id,
                                fileName: file.name,
                                fileData: base64,
                                mimeType: file.type
                              });
                              await addDrawingVersion.mutateAsync({ drawingId: d.id, version, fileUrl: res.url });
                            };
                            reader.readAsDataURL(file);
                          }} />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setOpenVersionsId(openVersionsId === d.id ? null : d.id)}
                          >
                            عرض النسخ
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => deleteDrawing.mutate({ id: d.id })}>
                            حذف
                          </Button>
                        </div>
                        {openVersionsId === d.id && (
                          <div className="mt-2 border-t pt-2">
                            {(openVersions || []).length === 0 ? (
                              <p className="text-sm text-muted-foreground">لا توجد نسخ</p>
                            ) : (
                              <div className="space-y-1">
                                {(openVersions || []).map((v: any) => (
                                  <div key={v.id} className="flex items-center justify-between text-sm">
                                    <span>{v.version}</span>
                                    <a href={v.fileUrl} target="_blank" rel="noreferrer" className="text-primary">فتح</a>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout >
  );
}
