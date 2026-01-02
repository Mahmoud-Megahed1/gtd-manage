/*
 © 2025 - Property of [Mohammed Ahmed / Golden Touch Design co.]
 Unauthorized use or reproduction is prohibited.
*/
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Users, FolderKanban, Receipt, FileText, UserCog, Edit, Trash2, Calculator, Clock, Calendar, DollarSign, ClipboardList, BarChart3, FileCheck, FileQuestion, Image } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { AddUserDialog } from "@/components/AddUserDialog";
import { EditUserDialog } from "@/components/EditUserDialog";
import { DeleteUserDialog } from "@/components/DeleteUserDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/_core/hooks/useAuth";
import ProjectsChart from "@/components/ProjectsChart";
import RevenueChart from "@/components/RevenueChart";
import { hasPermission, hasDefaultModifier, type PermissionResource } from "@/lib/permissions";

export default function Dashboard() {
  const { user: currentUser } = useAuth();
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();
  const { data: projectsData } = trpc.dashboard.projectsByStatus.useQuery();
  const { data: revenueData } = trpc.dashboard.monthlyRevenue.useQuery();
  const { data: permissions } = trpc.auth.getMyPermissions.useQuery();
  const { data: users, isLoading: loadingUsers } = trpc.users.list.useQuery(undefined, {
    enabled: currentUser?.role === 'admin',
  });
  const [editUser, setEditUser] = useState<{
    id: number;
    name: string | null;
    email: string | null;
    role: any;
  } | null>(null);
  const [deleteUser, setDeleteUser] = useState<{
    id: number;
    name: string | null;
    email: string | null;
  } | null>(null);

  // Get permissions safely
  const perms = permissions?.permissions;

  // Helper to check permissions - Uses centralized permission matrix
  const canView = (section: PermissionResource) => {
    const role = currentUser?.role;
    if (role === 'admin') return true;
    return hasPermission(role, section, 'view');
  };

  // Check if user can only view their own data (assigned projects/tasks)
  const isOwnOnly = (section: PermissionResource) => {
    const role = currentUser?.role;
    if (!role) return false;
    return hasDefaultModifier(role, section, 'onlyAssigned');
  };

  // Roles that should NOT see accounting sidebar (but may view project financials)
  const hideAccountingSidebar = ['department_manager', 'project_manager', 'project_coordinator', 'architect', 'interior_designer', 'designer', 'technician', 'site_engineer', 'planning_engineer', 'qa_qc', 'document_controller', 'storekeeper'];

  // Get role-based stat cards
  const getStatCards = () => {
    const isAdmin = currentUser?.role === 'admin';
    const cards = [];

    if (canView('clients')) {
      cards.push({
        title: "إجمالي العملاء",
        value: stats?.totalClients || 0,
        icon: <Users className="w-8 h-8 text-primary" />,
        description: "عدد العملاء المسجلين"
      });
    }

    if (canView('projects')) {
      cards.push({
        title: isOwnOnly('projects') ? "مشاريعي النشطة" : "المشاريع النشطة",
        value: stats?.activeProjects || 0,
        icon: <FolderKanban className="w-8 h-8 text-primary" />,
        description: isOwnOnly('projects') ? "مشاريع مسندة إليك" : "مشاريع قيد التنفيذ",
        href: "/projects"
      });
    }

    if (canView('accounting')) {
      cards.push({
        title: "الفواتير والعروض",
        value: stats?.totalInvoices || 0,
        icon: <Receipt className="w-8 h-8 text-primary" />,
        description: "إجمالي الفواتير والعروض"
      });
    }

    if (canView('forms')) {
      cards.push({
        title: "الاستمارات",
        value: stats?.totalForms || 0,
        icon: <FileText className="w-8 h-8 text-primary" />,
        description: "استمارات العملاء"
      });
    }

    return cards;
  };

  const statCards = getStatCards();

  // Define quick actions based on role
  const getQuickActions = () => {
    const actions = [];
    const role = currentUser?.role || '';
    const isAdmin = role === 'admin';

    // HR Self-Service - Always shown for all employees
    actions.push({
      href: "/hr",
      icon: <Calendar className="w-10 h-10 text-green-500 mb-3 group-hover:scale-110 transition-transform" />,
      title: "بياناتي الشخصية",
      subtitle: "الإجازات، الرواتب، الحضور",
      show: true,
    });

    // Projects - for those with project access
    if (canView('projects')) {
      actions.push({
        href: "/projects",
        icon: <FolderKanban className="w-10 h-10 text-primary mb-3 group-hover:scale-110 transition-transform" />,
        title: isOwnOnly('projects') ? 'مشاريعي' : 'المشاريع',
        subtitle: isOwnOnly('projects') ? 'المشاريع المسندة لك' : 'جميع المشاريع',
        show: true,
      });
    }

    // Tasks - for those with task access
    if (canView('tasks')) {
      actions.push({
        href: "/tasks",
        icon: <ClipboardList className="w-10 h-10 text-blue-500 mb-3 group-hover:scale-110 transition-transform" />,
        title: isOwnOnly('tasks') ? 'مهامي' : 'المهام',
        subtitle: isOwnOnly('tasks') ? 'المهام المسندة لك' : 'جميع المهام',
        show: true,
      });
    }

    // Drawings - for architects and interior designers
    if (canView('drawings')) {
      actions.push({
        href: "/drawings",
        icon: <Image className="w-10 h-10 text-indigo-500 mb-3 group-hover:scale-110 transition-transform" />,
        title: "الرسومات",
        subtitle: "رسومات المشاريع",
        show: true,
      });
    }

    // Clients - only for those with clients access
    if (canView('clients')) {
      actions.push({
        href: "/clients",
        icon: <Users className="w-10 h-10 text-primary mb-3 group-hover:scale-110 transition-transform" />,
        title: "العملاء",
        subtitle: "قائمة العملاء",
        show: true,
      });
    }

    // Invoices - for those with invoices access
    if (canView('invoices')) {
      actions.push({
        href: "/invoices",
        icon: <Receipt className="w-10 h-10 text-primary mb-3 group-hover:scale-110 transition-transform" />,
        title: "الفواتير",
        subtitle: "الفواتير والعروض",
        show: true,
      });
    }

    // Accounting - for accountants and finance managers only
    if (canView('accounting')) {
      actions.push({
        href: "/accounting",
        icon: <Calculator className="w-10 h-10 text-yellow-500 mb-3 group-hover:scale-110 transition-transform" />,
        title: "المحاسبة",
        subtitle: "المصروفات والإيرادات",
        show: true,
      });
    }

    // Forms - for those with forms access
    if (canView('forms')) {
      actions.push({
        href: "/forms",
        icon: <FileText className="w-10 h-10 text-primary mb-3 group-hover:scale-110 transition-transform" />,
        title: "الاستمارات",
        subtitle: "استمارات العملاء",
        show: true,
      });
    }

    // Reports - for those with accounting.reports access
    if (canView('accounting.reports') || isAdmin) {
      actions.push({
        href: "/general-reports",
        icon: <BarChart3 className="w-10 h-10 text-purple-500 mb-3 group-hover:scale-110 transition-transform" />,
        title: "التقارير العامة",
        subtitle: "التقارير والإحصائيات",
        show: true,
      });
    }

    return actions.filter(a => a.show);
  };

  const quickActions = getQuickActions();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">لوحة التحكم</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            نظرة عامة على نشاطات Golden Touch Design
          </p>
        </div>

        {/* Stats Grid */}
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="h-4 bg-muted rounded w-24"></div>
                  <div className="h-8 w-8 bg-muted rounded"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-muted rounded w-16 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-32"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat, index) => (
              stat.href ? (
                <Link key={index} href={stat.href}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {stat.title}
                      </CardTitle>
                      {stat.icon}
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {stat.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ) : (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    {stat.icon}
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.description}
                    </p>
                  </CardContent>
                </Card>
              )
            ))}
          </div>
        )}

        {/* Charts - Only show for roles with financial access */}
        {canView('accounting') && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>توزيع المشاريع حسب الحالة</CardTitle>
              </CardHeader>
              <CardContent>
                <ProjectsChart data={projectsData || {
                  design: 0,
                  execution: 0,
                  design_execution: 0,
                  supervision: 0,
                  delivered: 0,
                  cancelled: 0,
                  in_progress: 0
                }} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>الإيرادات والمصروفات الشهرية</CardTitle>
              </CardHeader>
              <CardContent>
                <RevenueChart monthlyData={revenueData || [
                  { month: 'يناير', revenue: 0, expenses: 0 },
                  { month: 'فبراير', revenue: 0, expenses: 0 },
                  { month: 'مارس', revenue: 0, expenses: 0 },
                  { month: 'أبريل', revenue: 0, expenses: 0 },
                  { month: 'مايو', revenue: 0, expenses: 0 },
                  { month: 'يونيو', revenue: 0, expenses: 0 },
                ]} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Project Chart Only for Engineers/Designers (No Financials) */}
        {!canView('accounting') && canView('projects') && (
          <Card>
            <CardHeader>
              <CardTitle>توزيع المشاريع حسب الحالة</CardTitle>
            </CardHeader>
            <CardContent>
              <ProjectsChart data={projectsData || {
                design: 0,
                execution: 0,
                design_execution: 0,
                supervision: 0,
                delivered: 0,
                cancelled: 0,
                in_progress: 0
              }} />
            </CardContent>
          </Card>
        )}

        {/* Quick Actions - Role Based */}
        <Card>
          <CardHeader>
            <CardTitle>إجراءات سريعة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {quickActions.map((action, index) => (
                <Link key={index} href={action.href}>
                  <div className="flex flex-col items-center justify-center p-6 border border-border rounded-lg hover:bg-accent hover:border-primary transition-all cursor-pointer group">
                    {action.icon}
                    <span className="font-medium">{action.title}</span>
                    {action.subtitle && (
                      <span className="text-xs text-muted-foreground">{action.subtitle}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Users Management (Admin Only) */}
        {currentUser?.role === 'admin' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <UserCog className="w-5 h-5" />
                إدارة المستخدمين
              </CardTitle>
              <AddUserDialog />
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <p className="text-center text-muted-foreground py-8">جاري التحميل...</p>
              ) : users && users.length > 0 ? (
                <div className="space-y-2">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{user.name || 'غير محدد'}</p>
                          <p className="text-sm text-muted-foreground">{user.email || 'لا يوجد بريد'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role === 'admin' && 'مدير عام'}
                          {user.role === 'department_manager' && 'مدير قسم'}
                          {user.role === 'project_manager' && 'مدير مشاريع'}
                          {user.role === 'project_coordinator' && 'منسق مشاريع'}
                          {user.role === 'architect' && 'مهندس معماري'}
                          {user.role === 'interior_designer' && 'مصمم داخلي'}
                          {user.role === 'site_engineer' && 'مهندس موقع'}
                          {user.role === 'planning_engineer' && 'مهندس تخطيط'}
                          {user.role === 'designer' && 'مصمم'}
                          {user.role === 'technician' && 'فني'}
                          {user.role === 'finance_manager' && 'مدير مالي'}
                          {user.role === 'accountant' && 'محاسب'}
                          {user.role === 'sales_manager' && 'مسؤول مبيعات'}
                          {user.role === 'hr_manager' && 'مسؤول موارد بشرية'}
                          {user.role === 'admin_assistant' && 'مساعد إداري'}
                          {user.role === 'procurement_officer' && 'مسؤول مشتريات'}
                          {user.role === 'storekeeper' && 'أمين مخازن'}
                          {user.role === 'qa_qc' && 'مسؤول جودة'}
                          {user.role === 'document_controller' && 'مراقب وثائق'}
                          {user.role === 'viewer' && 'مشاهد'}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditUser({
                            id: user.id,
                            name: user.name || '',
                            email: user.email || '',
                            role: user.role
                          })}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteUser({
                            id: user.id,
                            name: user.name,
                            email: user.email
                          })}
                          disabled={user.id === currentUser?.id}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">لا يوجد مستخدمون حالياً</p>
                  <AddUserDialog />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Edit User Dialog */}
        <EditUserDialog
          user={editUser}
          open={!!editUser}
          onOpenChange={(open) => !open && setEditUser(null)}
        />

        {/* Delete User Dialog */}
        <DeleteUserDialog
          user={deleteUser}
          open={!!deleteUser}
          onOpenChange={(open) => !open && setDeleteUser(null)}
        />
      </div>
    </DashboardLayout>
  );
}
