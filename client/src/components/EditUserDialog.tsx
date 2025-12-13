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
      admin: "مدير",
      accountant: "محاسب",
      project_manager: "مدير مشاريع",
      site_engineer: "مهندس موقع",
      planning_engineer: "مهندس تخطيط",
      procurement_officer: "مسؤول مشتريات",
      qa_qc: "جودة QA/QC",
      document_controller: "مسؤول وثائق",
      architect: "معماري",
      interior_designer: "مصمم داخلي",
      sales_manager: "مدير مبيعات",
      finance_manager: "مدير مالي",
      hr_manager: "مدير موارد بشرية",
      storekeeper: "أمين مستودع",
      designer: "مصمم",
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
                  <SelectItem value="designer">{getRoleLabel("designer")}</SelectItem>
                  <SelectItem value="architect">{getRoleLabel("architect")}</SelectItem>
                  <SelectItem value="interior_designer">{getRoleLabel("interior_designer")}</SelectItem>
                  <SelectItem value="project_manager">{getRoleLabel("project_manager")}</SelectItem>
                  <SelectItem value="site_engineer">{getRoleLabel("site_engineer")}</SelectItem>
                  <SelectItem value="planning_engineer">{getRoleLabel("planning_engineer")}</SelectItem>
                  <SelectItem value="document_controller">{getRoleLabel("document_controller")}</SelectItem>
                  <SelectItem value="procurement_officer">{getRoleLabel("procurement_officer")}</SelectItem>
                  <SelectItem value="qa_qc">{getRoleLabel("qa_qc")}</SelectItem>
                  <SelectItem value="sales_manager">{getRoleLabel("sales_manager")}</SelectItem>
                  <SelectItem value="accountant">{getRoleLabel("accountant")}</SelectItem>
                  <SelectItem value="finance_manager">{getRoleLabel("finance_manager")}</SelectItem>
                  <SelectItem value="hr_manager">{getRoleLabel("hr_manager")}</SelectItem>
                  <SelectItem value="storekeeper">{getRoleLabel("storekeeper")}</SelectItem>
                  <SelectItem value="admin">{getRoleLabel("admin")}</SelectItem>
                  <SelectItem value="viewer">عرض فقط</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {formData.role === "admin" && "صلاحيات كاملة على النظام"}
                {formData.role === "accountant" && "الوصول للمحاسبة والتقارير المالية"}
                {formData.role === "project_manager" && "إدارة المشاريع والمهام"}
                {formData.role === "designer" && "الوصول الأساسي للنظام"}
                {formData.role === "architect" && "مهام التصميم وإدارة الرسومات والمراجعات"}
                {formData.role === "interior_designer" && "التصميم الداخلي والرسومات"}
                {formData.role === "site_engineer" && "مهندس موقع وRFIs/Submittals"}
                {formData.role === "planning_engineer" && "الجدولة والتحليل (Baseline/Actual)"}
                {formData.role === "document_controller" && "إدارة الوثائق والرسومات"}
                {formData.role === "procurement_officer" && "المشتريات وBOQ وتتبع التوريد"}
                {formData.role === "qa_qc" && "الجودة والاعتمادات"}
                {formData.role === "sales_manager" && "المبيعات والعملاء والفواتير"}
                {formData.role === "finance_manager" && "إدارة مالية شاملة"}
                {formData.role === "hr_manager" && "إدارة الموارد البشرية"}
                {formData.role === "storekeeper" && "إدارة المخزون والتوريد"}
                {formData.role === "viewer" && "عرض فقط للصفحات المسموح بها"}
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
