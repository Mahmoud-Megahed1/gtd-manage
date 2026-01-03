import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  FileText,
  Receipt,
  Calculator,
  History,
  Settings,
  LogOut,
  Search,
  Menu,
  X,
  UserCog,
  Bell,
  BarChart3,
  Sparkles
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { NotificationBell } from "@/components/NotificationBell";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getLoginUrl } from "@/const";
import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

import { hasPermission, type PermissionResource } from "@/lib/permissions";

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  resource?: PermissionResource; // Link to permission resource
}

const navItems: NavItem[] = [
  // Dashboard - visible to all
  { title: "لوحة التحكم", href: "/dashboard", icon: <LayoutDashboard className="w-5 h-5" />, resource: 'dashboard' },

  // المشاريع - Projects
  { title: "المشاريع", href: "/projects", icon: <FolderKanban className="w-5 h-5" />, resource: 'projects' },

  // العملاء - Clients
  { title: "العملاء", href: "/clients", icon: <Users className="w-5 h-5" />, resource: 'clients' },

  // HR - شؤون الموظفين
  { title: "شؤون الموظفين", href: "/hr", icon: <UserCog className="w-5 h-5" />, resource: 'hr' },

  // الفواتير - Invoices
  { title: "الفواتير والعروض", href: "/invoices", icon: <Receipt className="w-5 h-5" />, resource: 'invoices' },

  // الاستمارات - Forms
  { title: "الاستمارات", href: "/forms", icon: <FileText className="w-5 h-5" />, resource: 'forms' },

  // المحاسبة - Accounting
  { title: "المحاسبة", href: "/accounting", icon: <Calculator className="w-5 h-5" />, resource: 'accounting' },


  // التقارير - Reports
  { title: "التقارير العامة", href: "/general-reports", icon: <BarChart3 className="w-5 h-5" />, resource: 'accounting.reports' as any },

  // مساعد AI - AI Assistant
  { title: "مساعد AI", href: "/ai-assistant", icon: <Sparkles className="w-5 h-5 text-indigo-500" /> },

  // الإشعارات - Notifications
  { title: "الإشعارات", href: "/notifications", icon: <Bell className="w-5 h-5" /> },

  // سجل النشاطات - Audit Logs
  { title: "سجل النشاطات", href: "/audit-logs", icon: <History className="w-5 h-5" />, resource: 'audit' },

  // الإعدادات - Settings
  { title: "الإعدادات", href: "/settings", icon: <Settings className="w-5 h-5" />, resource: 'settings' },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/" });
  const { theme, toggleTheme, switchable } = useTheme();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const logoutMutation = trpc.auth.logout.useMutation();
  const { data: mePermissions } = trpc.auth.getMyPermissions.useQuery(undefined, { enabled: !!user });
  const { data: notifCount } = trpc.notifications.unreadCount.useQuery(undefined, { enabled: !!user });

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      localStorage.removeItem("manus-runtime-user-info");
      document.cookie = "GT_SESSION=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      window.location.replace("/");
    } catch (error) {
      localStorage.removeItem("manus-runtime-user-info");
      document.cookie = "GT_SESSION=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      window.location.replace("/");
    }
  };

  const filteredNavItems = navItems.filter(item => {
    const role = user?.role || '';

    // Admin sees everything
    if (role === 'admin') return true;

    // Items without resource protection (e.g. AI Assistant, Notifications) are visible to all logged in users
    if (!item.resource) return true;

    // Check strict permissions
    // 1. Check DB Override first
    const permKey = item.resource;
    const userPerm = mePermissions?.permissions ? (mePermissions.permissions as any)[permKey] : undefined;

    if (userPerm?.view === true) return true;
    if (userPerm?.view === false) return false;

    // 2. Check Role Default
    return hasPermission(role, item.resource, 'view');
  });

  const getUserInitials = (name?: string | null) => {
    if (!name) return "م";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return parts[0][0] + parts[1][0];
    }
    return name.substring(0, 2);
  };

  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      admin: "مدير",
      department_manager: "مدير قسم",
      project_manager: "مدير مشاريع",
      project_coordinator: "منسق مشاريع",
      architect: "معماري",
      interior_designer: "مصمم داخلي",
      site_engineer: "مهندس موقع",
      planning_engineer: "مهندس تخطيط",
      designer: "مصمم",
      technician: "فني",
      finance_manager: "مدير مالي",
      accountant: "محاسب",
      sales_manager: "مبيعات",
      hr_manager: "موارد بشرية",
      admin_assistant: "مساعد إداري",
      procurement_officer: "مشتريات",
      storekeeper: "أمين مخازن",
      qa_qc: "جودة",
      document_controller: "مراقب وثائق",
      viewer: "مشاهد",
    };
    return roleMap[role] || role;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري التوجيه لصفحة الدخول...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Top Navigation Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border h-16">
        <div className="flex items-center justify-between px-4 h-full">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hover:bg-accent lg:hidden"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
            <div className="flex items-center gap-2 select-none pointer-events-none sm:pointer-events-auto">
              <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain" onError={(e) => { const t = e.target as HTMLImageElement; if (!t.src.includes('LOGO.png')) t.src = '/LOGO.png'; }} />
              <span className="font-bold text-lg hidden sm:inline-block">Golden Touch</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell />
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 right-0 z-40 bottom-0 w-72 bg-card border-l border-border transition-transform duration-300 pt-16 ${sidebarOpen ? "translate-x-0 shadow-2xl" : "translate-x-full lg:translate-x-0 lg:shadow-none"
          }`}
      >
        <div className="h-full overflow-y-auto custom-scrollbar">
          <div className="flex flex-col min-h-full">

            {/* Theme Toggle */}
            {switchable && (
              <div className="px-4 py-4">
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => toggleTheme && toggleTheme()}
                >
                  <span>تبديل المظهر</span>
                  {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>
              </div>
            )}

            <Separator className="md:hidden" />

            {/* Navigation */}
            <div className="flex-1 px-3 py-2">
              <nav className="space-y-1">
                {filteredNavItems.map((item) => {
                  const isActive = location === item.href || location.startsWith(item.href + "/");
                  return (
                    <Link key={item.href} href={item.href}>
                      <a
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive
                          ? "bg-primary text-primary-foreground font-medium"
                          : "text-foreground hover:bg-accent hover:text-accent-foreground"
                          }`}
                      >
                        <div className="relative">
                          {item.icon}
                          {item.href === "/notifications" && (notifCount?.count ?? 0) > 0 && (
                            <span className="absolute -top-1 -left-1 bg-red-600 text-white text-[10px] rounded-full px-1.5">
                              {notifCount?.count}
                            </span>
                          )}
                        </div>
                        <span>{item.title}</span>
                      </a>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <Separator />

            {/* User Profile */}
            <div className="p-4 mt-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start gap-3 h-auto p-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getUserInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-right">
                      <p className="font-medium text-sm">{user.name || "مستخدم"}</p>
                      <p className="text-xs text-muted-foreground">{getRoleLabel(user.role)}</p>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>حسابي</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="ml-2 w-4 h-4" />
                    تسجيل الخروج
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Logout Button */}
              <Button
                variant="outline"
                className="w-full mt-3 text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
                onClick={handleLogout}
              >
                <LogOut className="ml-2 w-4 h-4" />
                تسجيل الخروج
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="pt-16 transition-all duration-300 lg:mr-72">
        <div className="p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
