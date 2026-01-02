/*
 © 2025 - Property of [Mohammed Ahmed / Golden Touch Design co.]
 Unauthorized use or reproduction is prohibited.
*/
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderKanban } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { AddProjectDialog } from "@/components/AddProjectDialog";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Edit2 } from "lucide-react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function Projects() {
  const { data: projects, isLoading, refetch } = trpc.projects.list.useQuery();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { data: permissions } = trpc.auth.getMyPermissions.useQuery();
  const { data: clients } = trpc.clients.clientNames.useQuery();
  const { data: users } = trpc.users.list.useQuery();
  const [activeTab, setActiveTab] = useState("all");

  // Create a map for quick client lookup
  const clientMap = (clients || []).reduce((acc: Record<number, string>, c: any) => {
    acc[c.id] = c.name;
    return acc;
  }, {});

  // Permission flags
  const canAdd = permissions?.permissions.projects.create || user?.role === 'admin';
  const canEdit = permissions?.permissions.projects.edit || user?.role === 'admin';
  const canDelete = permissions?.permissions.projects.delete || user?.role === 'admin';
  const canViewFinancials = permissions?.permissions.projects.viewFinancials || user?.role === 'admin';
  const isOwnOnly = permissions?.permissions.projects.viewOwn && !permissions?.permissions.projects.view;

  const utils = trpc.useUtils();
  const deleteProject = trpc.projects.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف المشروع");
      refetch();
    },
    onError: () => toast.error("تعذر حذف المشروع"),
  });

  const updateProject = trpc.projects.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث المشروع");
      refetch();
      setEditProject(null);
    },
    onError: () => toast.error("تعذر تحديث المشروع"),
  });

  const [editProject, setEditProject] = useState<any>(null);

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

  // Filter projects based on active tab
  const filteredProjects = (projects || []).filter((project: any) => {
    if (activeTab === "all") return true;
    return project.projectType === activeTab;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{isOwnOnly ? 'مشاريعي' : 'إدارة المشاريع'}</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              {isOwnOnly ? 'المشاريع المُسندة إليك' : 'عرض وإدارة جميع مشاريع الشركة'}
            </p>
          </div>
          {canAdd && <div className="w-full sm:w-auto"><AddProjectDialog /></div>}
        </div>

        {/* Tabs for Project Types */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto overflow-y-hidden flex-nowrap whitespace-nowrap scrollbar-hide pb-2 h-auto text-sm">
            <TabsTrigger value="all" className="flex-shrink-0 px-4">الكل ({projects?.length || 0})</TabsTrigger>
            <TabsTrigger value="design" className="flex-shrink-0 px-4">تصميم ({projects?.filter((p: any) => p.projectType === 'design').length || 0})</TabsTrigger>
            <TabsTrigger value="execution" className="flex-shrink-0 px-4">تنفيذ ({projects?.filter((p: any) => p.projectType === 'execution').length || 0})</TabsTrigger>
            <TabsTrigger value="design_execution" className="flex-shrink-0 px-4">تصميم وتنفيذ ({projects?.filter((p: any) => p.projectType === 'design_execution').length || 0})</TabsTrigger>
            <TabsTrigger value="supervision" className="flex-shrink-0 px-4">إشراف ({projects?.filter((p: any) => p.projectType === 'supervision').length || 0})</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
        ) : filteredProjects && filteredProjects.length > 0 ? (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project: any) => (
              <Card
                key={project.id}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FolderKanban className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{project.name}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          {project.projectNumber}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">الحالة:</span>
                    <Badge className={getStatusColor(project.status)}>
                      {getStatusLabel(project.status)}
                    </Badge>
                  </div>
                  {project.clientId && clientMap[project.clientId] && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">العميل:</span>
                      <span className="text-sm font-medium text-primary">{clientMap[project.clientId]}</span>
                    </div>
                  )}
                  {project.budget && canViewFinancials && (project.projectType === 'execution' || project.projectType === 'design_execution') && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">الميزانية:</span>
                      <span className="text-sm font-medium">{project.budget.toLocaleString()} ريال</span>
                    </div>
                  )}
                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocation(`/projects/${project.id}`);
                    }}
                  >
                    عرض التفاصيل
                  </Button>
                  {canEdit && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setEditProject({
                        id: project.id,
                        name: project.name,
                        status: project.status,
                        budget: project.budget || 0,
                        description: project.description || "",
                        startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : "",
                        endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : "",
                        assignedTo: project.assignedTo ? String(project.assignedTo) : "",
                        projectType: project.projectType
                      })}
                    >
                      <Edit2 className="w-4 h-4 ml-2" />
                      تعديل المشروع
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => deleteProject.mutate({ id: project.id })}
                    >
                      حذف المشروع
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FolderKanban className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">لا يوجد مشاريع</h3>
              <p className="text-muted-foreground text-center mb-6">
                ابدأ بإضافة مشروع جديد لإدارة أعمالك
              </p>
              {canAdd && <AddProjectDialog />}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Project Dialog */}
      <Dialog open={!!editProject} onOpenChange={(open) => !open && setEditProject(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل المشروع</DialogTitle>
          </DialogHeader>
          {editProject && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateProject.mutate({
                  id: editProject.id,
                  name: editProject.name,
                  status: editProject.status,
                  projectType: editProject.projectType,
                  budget: editProject.budget,
                  description: editProject.description,
                  startDate: editProject.startDate ? new Date(editProject.startDate) : undefined,
                  endDate: editProject.endDate ? new Date(editProject.endDate) : undefined,
                  assignedTo: editProject.assignedTo ? parseInt(editProject.assignedTo) : undefined
                });
              }}
              className="space-y-4"
            >
              <div>
                <Label>اسم المشروع</Label>
                <Input
                  value={editProject.name}
                  onChange={(e) => setEditProject({ ...editProject, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>نوع المشروع</Label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={editProject.projectType}
                    onChange={(e) => setEditProject({ ...editProject, projectType: e.target.value })}
                  >
                    <option value="design">تصميم</option>
                    <option value="execution">تنفيذ</option>
                    <option value="design_execution">تصميم وتنفيذ</option>
                    <option value="supervision">إشراف</option>
                  </select>
                </div>
                <div>
                  <Label>مدير المشروع</Label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={editProject.assignedTo}
                    onChange={(e) => setEditProject({ ...editProject, assignedTo: e.target.value })}
                  >
                    <option value="">-- اختر مدير المشروع --</option>
                    {users?.map((u) => (
                      <option key={u.id} value={u.id}>{u.name || u.email}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label>الحالة</Label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={editProject.status}
                  onChange={(e) => setEditProject({ ...editProject, status: e.target.value })}
                >
                  <option value="in_progress">قيد التقدم</option>
                  <option value="delivered">تم التسليم</option>
                  <option value="cancelled">ملغي</option>
                </select>
              </div>
              <div>
                <Label>الميزانية</Label>
                <Input
                  type="number"
                  value={editProject.budget}
                  onChange={(e) => setEditProject({ ...editProject, budget: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>تاريخ البدء</Label>
                  <Input
                    type="date"
                    value={editProject.startDate}
                    onChange={(e) => setEditProject({ ...editProject, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>تاريخ الانتهاء</Label>
                  <Input
                    type="date"
                    value={editProject.endDate}
                    onChange={(e) => setEditProject({ ...editProject, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>الوصف</Label>
                <Input
                  value={editProject.description}
                  onChange={(e) => setEditProject({ ...editProject, description: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">حفظ التغييرات</Button>
                <Button type="button" variant="outline" onClick={() => setEditProject(null)}>إلغاء</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout >
  );
}
