import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface EditUserDialogProps {
  user: {
    id: number;
    name: string | null;
    email: string | null;
    role: any;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditUserDialog({ user, open, onOpenChange }: EditUserDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "designer" as any,
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        role: user.role,
      });
    }
  }, [user]);

  const utils = trpc.useUtils();
  const updateUser = trpc.users.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث بيانات المستخدم بنجاح");
      utils.users.list.invalidate();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`فشل التحديث: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    updateUser.mutate({
      userId: user.id,
      name: formData.name !== user.name ? formData.name : undefined,
      email: formData.email !== user.email ? formData.email : undefined,
      role: formData.role !== user.role ? formData.role : undefined,
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

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>تعديل بيانات المستخدم</DialogTitle>
            <DialogDescription>
              قم بتحديث معلومات المستخدم أو تغيير دوره في النظام
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">الاسم</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="أدخل اسم المستخدم"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">البريد الإلكتروني</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-role">الدور</Label>
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
                {formData.role === "project_manager" && "إدارة المشاريع والمهام"}
                {formData.role === "project_coordinator" && "تنسيق المشاريع والمهام"}
                {formData.role === "architect" && "المشاريع المُسندة + الرسومات + RFIs"}
                {formData.role === "interior_designer" && "المشاريع المُسندة + الرسومات"}
                {formData.role === "site_engineer" && "المشاريع المُسندة + RFIs + Submittals"}
                {formData.role === "planning_engineer" && "المشاريع المُسندة + التقارير"}
                {formData.role === "designer" && "المشاريع والمهام المُسندة فقط"}
                {formData.role === "technician" && "المهام المُسندة فقط"}
                {formData.role === "finance_manager" && "إدارة مالية كاملة"}
                {formData.role === "accountant" && "مشاهدة فقط + رفع طلبات"}
                {formData.role === "sales_manager" && "العملاء والفواتير"}
                {formData.role === "hr_manager" && "إدارة شؤون الموظفين كاملة"}
                {formData.role === "admin_assistant" && "بياناته HR + طلب إجازة"}
                {formData.role === "procurement_officer" && "طلبات الشراء والموردين"}
                {formData.role === "storekeeper" && "المخزون والتوريدات"}
                {formData.role === "qa_qc" && "الجودة والفحوصات"}
              </p>
            </div>

            {formData.role !== user.role && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                <p className="text-sm text-yellow-600 dark:text-yellow-500">
                  ⚠️ تحذير: تغيير الدور سيؤثر على صلاحيات المستخدم في النظام
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={updateUser.isPending}>
              {updateUser.isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
