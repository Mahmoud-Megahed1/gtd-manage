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
  AlertCircle
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
  const deleteTask = trpc.projects.deleteTask.useMutation();
  const [newTask, setNewTask] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: ""
  });

  const project = projectData?.project;
  const boq = projectData?.boq || [];
  const expenses = projectData?.expenses || [];
  const installments = projectData?.installments || [];
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
  const createRfi = trpc.rfi.create.useMutation();
  const answerRfi = trpc.rfi.answer.useMutation();
  const createSubmittal = trpc.submittals.create.useMutation();
  const approveSubmittal = trpc.submittals.approve.useMutation();
  const rejectSubmittal = trpc.submittals.reject.useMutation();
  const createDrawing = trpc.drawings.create.useMutation();
  const addDrawingVersion = trpc.drawings.addVersion.useMutation();
  const uploadFile = trpc.files.upload.useMutation();
  const [openVersionsId, setOpenVersionsId] = useState<number | null>(null);
  const { data: openVersions } = trpc.drawings.versions.useQuery(
    { drawingId: openVersionsId || 0 },
    { enabled: !!openVersionsId }
  );

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      design: "تصميم",
      execution: "تنفيذ",
      delivery: "تسليم",
      completed: "مكتمل",
      cancelled: "ملغي"
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      design: "bg-blue-500/10 text-blue-500",
      execution: "bg-yellow-500/10 text-yellow-500",
      delivery: "bg-purple-500/10 text-purple-500",
      completed: "bg-green-500/10 text-green-500",
      cancelled: "bg-red-500/10 text-red-500"
    };
    return colorMap[status] || "bg-gray-500/10 text-gray-500";
  };

  const totalBOQ = boq.reduce((sum, item) => sum + (item.total || 0), 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalInstallments = installments.reduce((sum, inst) => sum + inst.amount, 0);
  const paidInstallments = installments.filter(i => i.status === "paid").reduce((sum, inst) => sum + inst.amount, 0);

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
          <div className="grid gap-6 md:grid-cols-4">
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
                    <p className="text-2xl font-bold">{totalBOQ.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">ريال</p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-blue-500" />
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
                    <p className="text-2xl font-bold">{paidInstallments.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">من {totalInstallments.toLocaleString()} ريال</p>
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
                    <span>{p.itemName}</span>
                    <span className={`${p.status === 'ordered' ? 'text-green-600' : p.status === 'partial' ? 'text-yellow-600' : 'text-red-600'}`}>
                      {p.status === 'ordered' ? 'مكتمل' : p.status === 'partial' ? 'جزئي' : 'غير مؤمن'}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className={`grid w-full max-w-3xl ${canViewFinancials ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {canViewFinancials && (
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
                      <span className="text-muted-foreground">إجمالي BOQ:</span>
                      <span className="font-bold">{totalBOQ.toLocaleString()} ريال</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">المصروفات:</span>
                      <span className="font-bold text-red-500">-{totalExpenses.toLocaleString()} ريال</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">الإيرادات المتوقعة:</span>
                      <span className="font-bold">{totalInstallments.toLocaleString()} ريال</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">المدفوع:</span>
                      <span className="font-bold text-green-500">{paidInstallments.toLocaleString()} ريال</span>
                    </div>
                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">الربح المتوقع:</span>
                        <span className={`font-bold text-lg ${(totalInstallments - totalExpenses) >= 0 ? "text-green-500" : "text-red-500"
                          }`}>
                          {(totalInstallments - totalExpenses).toLocaleString()} ريال
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>الأقساط</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {installments && installments.length > 0 ? (
                      <div className="space-y-3">
                        {installments.map((inst) => (
                          <div key={inst.id} className="flex items-center justify-between p-3 border rounded">
                            <div>
                              <p className="font-medium">قسط #{inst.installmentNumber}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(inst.dueDate).toLocaleDateString("ar-SA")}
                              </p>
                            </div>
                            <div className="text-left">
                              <p className="font-bold">{inst.amount.toLocaleString()} ريال</p>
                              <Badge className={
                                inst.status === "paid" ? "bg-green-500/10 text-green-500" :
                                  inst.status === "overdue" ? "bg-red-500/10 text-red-500" :
                                    "bg-yellow-500/10 text-yellow-500"
                              }>
                                {inst.status === "paid" ? "مدفوع" : inst.status === "overdue" ? "متأخر" : "معلق"}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>لا توجد أقساط</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          <TabsContent value="team" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>فريق المشروع</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>سيتم إضافة إدارة الفريق قريباً</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>إضافة مهمة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm">اسم المهمة</label>
                      <input
                        className="w-full p-2 border rounded"
                        value={newTask.name}
                        onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm">تاريخ البداية</label>
                      <input
                        type="date"
                        className="w-full p-2 border rounded"
                        value={newTask.startDate}
                        onChange={(e) => setNewTask({ ...newTask, startDate: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm">الوصف</label>
                      <textarea
                        className="w-full p-2 border rounded"
                        value={newTask.description}
                        onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm">تاريخ النهاية</label>
                      <input
                        type="date"
                        className="w-full p-2 border rounded"
                        value={newTask.endDate}
                        onChange={(e) => setNewTask({ ...newTask, endDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      if (!newTask.name.trim()) {
                        toast.error("يرجى إدخال اسم المهمة");
                        return;
                      }
                      createTask.mutate({
                        projectId,
                        name: newTask.name,
                        description: newTask.description || undefined,
                        startDate: newTask.startDate ? new Date(newTask.startDate) : undefined,
                        endDate: newTask.endDate ? new Date(newTask.endDate) : undefined
                      });
                      setNewTask({ name: "", description: "", startDate: "", endDate: "" });
                    }}
                  >
                    إضافة
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>المهام</CardTitle>
                </CardHeader>
                <CardContent>
                  {tasks && tasks.length > 0 ? (
                    <div className="space-y-2">
                      {tasks.map((t: any) => (
                        <div key={t.id} className="flex items-center justify-between p-3 border rounded">
                          <div>
                            <p className="font-medium">{t.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {t.startDate ? new Date(t.startDate).toLocaleDateString('ar-SA') : '-'}
                              {t.endDate ? ` — ${new Date(t.endDate).toLocaleDateString('ar-SA')}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge>
                              {t.status === 'done' ? 'منجزة' :
                                t.status === 'in_progress' ? 'جارية' :
                                  t.status === 'cancelled' ? 'ملغاة' : 'مخططة'}
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteTask.mutate({ id: t.id })}
                            >
                              حذف
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">لا توجد مهام</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle>RFIs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <form
                className="grid md:grid-cols-3 gap-2 p-3 border rounded"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget as any;
                  const title = form.title.value;
                  const question = form.question.value;
                  if (!title || !question) return;
                  await createRfi.mutateAsync({ projectId, title, question });
                  form.reset();
                }}
              >
                <Input name="title" placeholder="العنوان" />
                <Input name="question" placeholder="السؤال" className="md:col-span-2" />
                <Button type="submit" variant="outline">إضافة</Button>
              </form>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>RFI</TableHead>
                    <TableHead>العنوان</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="text-left">إجابة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(rfis || []).map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.rfiNumber}</TableCell>
                      <TableCell>{r.title}</TableCell>
                      <TableCell>{r.status}</TableCell>
                      <TableCell className="text-left">
                        <Input
                          defaultValue={r.answer || ""}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v) answerRfi.mutate({ id: r.id, answer: v });
                          }}
                        />
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
                className="grid md:grid-cols-3 gap-2 p-3 border rounded"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget as any;
                  const title = form.title.value;
                  if (!title) return;
                  await createSubmittal.mutateAsync({ projectId, title });
                  form.reset();
                }}
              >
                <Input name="title" placeholder="العنوان" className="md:col-span-2" />
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
    </DashboardLayout>
  );
}
