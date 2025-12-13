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

export function AddUserDialog() {
  const [open, setOpen] = useState(false);
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

    createUser.mutate(formData);
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
                {formData.role === "site_engineer" && "مهام التنفيذ وRFIs/Submittals"}
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
