import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { PermissionsGrid } from "./PermissionsGrid";
import { PERMISSION_MATRIX } from "@/lib/permissions";

export function AddUserDialog() {
  const [open, setOpen] = useState(false);
  const [customizePermissions, setCustomizePermissions] = useState(false);
  const [customPermissions, setCustomPermissions] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "designer" as any,
  });

  const utils = trpc.useUtils();
  const createUser = trpc.users.create.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة المستخدم بنجاح");
      utils.users.list.invalidate();
      setOpen(false);
      setFormData({
        name: "",
        email: "",
        role: "designer",
      });
      setCustomizePermissions(false);
      setCustomPermissions({});
    },
    onError: (error) => {
      toast.error(`فشل إضافة المستخدم: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    // Warn if using default role
    if (formData.role === "designer") {
      const confirmed = confirm(
        "⚠️ تنبيه: الدور المختار هو 'مصمم' (صلاحيات محدودة جداً)\n\n" +
        "هل تريد الاستمرار بهذا الدور؟\n" +
        "اضغط 'إلغاء' لاختيار دور آخر"
      );
      if (!confirmed) return;
    }

    createUser.mutate({
      ...formData,
      permissions: customizePermissions ? customPermissions : undefined
    });
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      // الإدارة العليا
      admin: "مدير عام",
      department_manager: "مدير قسم",
      // إدارة المشاريع
      project_manager: "مدير مشاريع",
      project_coordinator: "منسق مشاريع",
      // المهندسين والفنيين
      architect: "مهندس معماري",
      interior_designer: "مصمم داخلي",
      site_engineer: "مهندس موقع",
      planning_engineer: "مهندس تخطيط",
      designer: "مصمم",
      technician: "فني",
      // الإدارة المالية
      finance_manager: "مدير مالي",
      accountant: "محاسب",
      // المبيعات
      sales_manager: "مسؤول مبيعات",
      // الموارد البشرية
      hr_manager: "مسؤول موارد بشرية",
      admin_assistant: "مساعد إداري",
      // المشتريات والمخازن
      procurement_officer: "مسؤول مشتريات",
      storekeeper: "أمين مخازن",
      qa_qc: "مسؤول جودة",
    };
    return labels[role] || role;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="ml-2 h-4 w-4" />
          إضافة مستخدم
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>إضافة مستخدم جديد</DialogTitle>
            <DialogDescription>
              أدخل بيانات المستخدم الجديد. سيتم إرسال دعوة للانضمام إلى البريد الإلكتروني.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">الاسم *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="أدخل اسم المستخدم"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">الدور *</Label>
              <Select
                value={formData.role}
                onValueChange={(value: any) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {/* الإدارة العليا */}
                  <SelectItem value="admin">{getRoleLabel("admin")}</SelectItem>
                  <SelectItem value="department_manager">{getRoleLabel("department_manager")}</SelectItem>
                  {/* إدارة المشاريع */}
                  <SelectItem value="project_manager">{getRoleLabel("project_manager")}</SelectItem>
                  <SelectItem value="project_coordinator">{getRoleLabel("project_coordinator")}</SelectItem>
                  {/* المهندسين والفنيين */}
                  <SelectItem value="architect">{getRoleLabel("architect")}</SelectItem>
                  <SelectItem value="interior_designer">{getRoleLabel("interior_designer")}</SelectItem>
                  <SelectItem value="site_engineer">{getRoleLabel("site_engineer")}</SelectItem>
                  <SelectItem value="planning_engineer">{getRoleLabel("planning_engineer")}</SelectItem>
                  <SelectItem value="designer">{getRoleLabel("designer")}</SelectItem>
                  <SelectItem value="technician">{getRoleLabel("technician")}</SelectItem>
                  {/* الإدارة المالية */}
                  <SelectItem value="finance_manager">{getRoleLabel("finance_manager")}</SelectItem>
                  <SelectItem value="accountant">{getRoleLabel("accountant")}</SelectItem>
                  {/* المبيعات */}
                  <SelectItem value="sales_manager">{getRoleLabel("sales_manager")}</SelectItem>
                  {/* الموارد البشرية */}
                  <SelectItem value="hr_manager">{getRoleLabel("hr_manager")}</SelectItem>
                  <SelectItem value="admin_assistant">{getRoleLabel("admin_assistant")}</SelectItem>
                  {/* المشتريات والمخازن */}
                  <SelectItem value="procurement_officer">{getRoleLabel("procurement_officer")}</SelectItem>
                  <SelectItem value="storekeeper">{getRoleLabel("storekeeper")}</SelectItem>
                  <SelectItem value="qa_qc">{getRoleLabel("qa_qc")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {formData.role === "admin" && "صلاحيات كاملة على النظام"}
                {formData.role === "department_manager" && "إدارة قسمه + تقارير + HR"}
                {formData.role === "project_manager" && "إدارة المشاريع والمهام والعملاء (أسماء فقط)"}
                {formData.role === "project_coordinator" && "تنسيق المشاريع والمهام بدون صلاحيات تعديل"}
                {formData.role === "architect" && "المشاريع المُسندة + الرسومات + RFIs"}
                {formData.role === "interior_designer" && "المشاريع المُسندة + الرسومات"}
                {formData.role === "site_engineer" && "المشاريع المُسندة + RFIs + Submittals"}
                {formData.role === "planning_engineer" && "المشاريع المُسندة + التقارير"}
                {formData.role === "designer" && "المشاريع والمهام المُسندة فقط"}
                {formData.role === "technician" && "المهام المُسندة فقط"}
                {formData.role === "finance_manager" && "إدارة مالية كاملة: فواتير + محاسبة"}
                {formData.role === "accountant" && "مشاهدة فقط + رفع طلبات اعتماد"}
                {formData.role === "sales_manager" && "إدارة العملاء والفواتير"}
                {formData.role === "hr_manager" && "إدارة شؤون الموظفين كاملة"}
                {formData.role === "admin_assistant" && "بياناته HR + طلب إجازة"}
                {formData.role === "procurement_officer" && "طلبات الشراء والموردين"}
                {formData.role === "storekeeper" && "المخزون والتوريدات"}
                {formData.role === "qa_qc" && "الجودة والفحوصات"}
              </p>
            </div>

            <div className="flex items-center space-x-2 space-x-reverse border-t pt-4">
              <Switch
                id="customize-mode"
                checked={customizePermissions}
                onCheckedChange={setCustomizePermissions}
              />
              <Label htmlFor="customize-mode" className="font-medium">تخصيص الصلاحيات المتقدمة</Label>
            </div>

            {customizePermissions && (
              <div className="border rounded-md p-4 bg-slate-50 max-h-[300px] overflow-y-auto">
                <PermissionsGrid
                  role={formData.role}
                  customPermissions={customPermissions}
                  onChange={setCustomPermissions}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={createUser.isPending}>
              {createUser.isPending ? "جاري الإضافة..." : "إضافة"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
