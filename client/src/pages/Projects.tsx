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

export default function Projects() {
  const { data: projects, isLoading, refetch } = trpc.projects.list.useQuery();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { data: permissions } = trpc.auth.getMyPermissions.useQuery();

  // Permission flags
  const canAdd = permissions?.permissions.projects.create || user?.role === 'admin';
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{isOwnOnly ? 'مشاريعي' : 'إدارة المشاريع'}</h1>
            <p className="text-muted-foreground mt-2">
              {isOwnOnly ? 'المشاريع المُسندة إليك' : 'عرض وإدارة جميع مشاريع الشركة'}
            </p>
          </div>
          {canAdd && <AddProjectDialog />}
        </div>

        {/* Projects Grid */}
        {isLoading ? (
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
        ) : projects && projects.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
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
                  {project.budget && canViewFinancials && (
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
    </DashboardLayout>
  );
}
