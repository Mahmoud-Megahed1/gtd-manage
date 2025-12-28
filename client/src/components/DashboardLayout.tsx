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
  BarChart3
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
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

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[];
}

const navItems: NavItem[] = [
  // Dashboard - visible to all logged in users
  { title: "لوحة التحكم", href: "/dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },

  // المشاريع - Projects (Most important for project management company)
  // المشاريع - Projects (Most important for project management company)
  {
    title: "المشاريع", href: "/projects", icon: <FolderKanban className="w-5 h-5" />, roles: [
      "admin", "hr_manager", "finance_manager", "department_manager", "project_manager",
      "project_coordinator", "architect", "interior_designer", "site_engineer",
      "planning_engineer", "designer", "technician", "sales_manager", "admin_assistant",
      "procurement_officer", "qa_qc"
    ]
  },

  // العملاء - Clients
  {
    title: "العملاء", href: "/clients", icon: <Users className="w-5 h-5" />, roles: [
      "admin", "hr_manager", "finance_manager", "accountant", "department_manager",
      "project_manager", "project_coordinator", "sales_manager", "admin_assistant"
    ]
  },

  // HR - شؤون الموظفين (all employees can see their personal data)
  { title: "شؤون الموظفين", href: "/hr", icon: <UserCog className="w-5 h-5" /> },


  // الفواتير - Invoices (Matrix: admin✅, finance_manager✅, accountant👁️+, department_manager👁️, sales_manager✅)
  {
    title: "الفواتير والعروض", href: "/invoices", icon: <Receipt className="w-5 h-5" />, roles: [
      "admin", "finance_manager", "accountant", "department_manager", "sales_manager"
    ]
  },

  // الاستمارات - Forms (Matrix: admin✅, hr_manager👁️, department_manager✅, project_manager✅, project_coordinator👁️, sales_manager✅, admin_assistant✅)
  {
    title: "الاستمارات", href: "/forms", icon: <FileText className="w-5 h-5" />, roles: [
      "admin", "hr_manager", "department_manager", "project_manager",
      "project_coordinator", "sales_manager", "admin_assistant"
    ]
  },

  // المحاسبة - Accounting (Matrix: admin✅, finance_manager✅, accountant👁️, department_manager👁️, project_manager👁️💰, sales_manager👁️💰, procurement_officer👁️)
  {
    title: "المحاسبة", href: "/accounting", icon: <Calculator className="w-5 h-5" />, roles: [
      "admin", "finance_manager", "accountant",
      "project_manager", "sales_manager", "procurement_officer"
    ]
  },

  // التقارير - Reports (Matrix: admin✅, finance_manager✅, accountant👁️, department_manager👁️+, project_manager👁️+, planning_engineer👁️, sales_manager👁️+, procurement_officer👁️, qa_qc👁️)
  {
    title: "التقارير العامة", href: "/general-reports", icon: <BarChart3 className="w-5 h-5" />, roles: [
      "admin", "finance_manager", "accountant", "department_manager", "project_manager",
      "planning_engineer", "sales_manager", "procurement_officer", "qa_qc"
    ]
  },

  // الإشعارات - Notifications (all users)
  { title: "الإشعارات", href: "/notifications", icon: <Bell className="w-5 h-5" /> },

  // سجل النشاطات - Audit Logs (admin only)
  { title: "سجل النشاطات", href: "/audit-logs", icon: <History className="w-5 h-5" />, roles: ["admin"] },

  // الإعدادات - Settings (admin only)
  { title: "الإعدادات", href: "/settings", icon: <Settings className="w-5 h-5" />, roles: ["admin"] },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/" });
  const { theme, toggleTheme, switchable } = useTheme();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const logoutMutation = trpc.auth.logout.useMutation();
  const { data: mePermissions } = trpc.users.mePermissions.useQuery(undefined, { enabled: !!user });
  const { data: notifCount } = trpc.notifications.unreadCount.useQuery(undefined, { enabled: !!user });

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      // Clear all localStorage
      localStorage.removeItem("manus-runtime-user-info");
      // Clear cookies manually as backup
      document.cookie = "GT_SESSION=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      // Force hard redirect to clear all state
      window.location.replace("/");
    } catch (error) {
      // Even on error, try to logout by clearing local state
      localStorage.removeItem("manus-runtime-user-info");
      document.cookie = "GT_SESSION=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      window.location.replace("/");
    }
  };

  const filteredNavItems = navItems.filter(item => {
    // First check: role-based access (primary)
    const byRole = !item.roles || (user && item.roles.includes(user.role));

    // If role doesn't allow, stop here
    if (!byRole) return false;

    // Second check: user-specific permissions (can only restrict, not grant)
    const keyMap: Record<string, string> = {
      "/dashboard": "dashboard",
      "/clients": "clients",
      "/projects": "projects",
      "/tasks": "projectTasks",
      "/change-orders": "change_orders",
      "/invoices": "invoices",
      "/forms": "forms",
      "/accounting": "accounting",
      "/hr": "hr",
      "/audit-logs": "audit",
      "/settings": "settings",
    };
    const permKey = keyMap[item.href];

    // Only check user perms if they exist and explicitly deny
    // Default is true (allowed) if not specified
    const byPerm = !mePermissions || mePermissions[permKey] !== false;

    return byPerm;
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
      accountant: "محاسب",
      project_manager: "مدير مشاريع",
      designer: "مصمم"
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
    // Automatic redirect to login - no user interaction needed
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
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="h-8" onError={(e) => { const t = e.target as HTMLImageElement; if (!t.src.includes('LOGO.png')) t.src = '/LOGO.png'; }} />
            <span className="font-bold text-lg">Golden Touch</span>
          </div>
          <div className="w-10" />
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 right-0 z-40 h-screen w-72 bg-card border-l border-border transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "translate-x-full"
          } lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 hidden lg:block">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Logo" className="h-12" onError={(e) => { const t = e.target as HTMLImageElement; if (!t.src.includes('LOGO.png')) t.src = '/LOGO.png'; }} />
              <div>
                <h1 className="font-bold text-xl text-primary">Golden Touch</h1>
                <p className="text-xs text-muted-foreground">نظام الإدارة المتكامل</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Search */}
          <div className="p-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="بحث..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>
          {/* Theme Toggle */}
          {switchable && (
            <div className="px-4">
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

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3 max-h-[calc(100vh-300px)] overflow-y-auto">
            <nav className="space-y-1 py-2">
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
          </ScrollArea>

          <Separator />

          {/* Notifications */}
          <div className="px-4 py-2 flex justify-end">
            <NotificationBell />
          </div>

          {/* User Profile */}
          <div className="p-4">
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

            {/* Logout Button - Direct */}
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
      </aside>

      {/* Main Content */}
      <main className="lg:mr-72 pt-16 lg:pt-0">
        <div className="p-1">
          {children}
        </div>
      </main>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
