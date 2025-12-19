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
import { Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function AddEmployeeDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    userName: "",
    employeeNumber: "",
    department: "",
    position: "",
    hireDate: new Date().toISOString().split('T')[0],
    salary: "",
    bankAccount: "",
    emergencyContact: "",
  });

  const utils = trpc.useUtils();
  const createEmployee = trpc.hr.employees.create.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة الموظف بنجاح");
      utils.hr.employees.list.invalidate();
      setOpen(false);
      // Reset form
      setFormData({
        userName: "",
        employeeNumber: "",
        department: "",
        position: "",
        hireDate: new Date().toISOString().split('T')[0],
        salary: "",
        bankAccount: "",
        emergencyContact: "",
      });
    },
    onError: (error) => {
      toast.error(`فشل إضافة الموظف: ${error.message}`);
    },
  });
  const { data: users } = trpc.users.list.useQuery();
  const createUser = trpc.users.create.useMutation({
    onSuccess: () => utils.users.list.invalidate()
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.userName || !formData.employeeNumber) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    const existing = (users || []).find((u: any) => (u.name || "").trim().toLowerCase() === formData.userName.trim().toLowerCase());
    const proceed = async (userId: number) => {
      createEmployee.mutate({
        userId,
        employeeNumber: formData.employeeNumber,
        department: formData.department || undefined,
        position: formData.position || undefined,
        hireDate: new Date(formData.hireDate),
        salary: formData.salary ? parseFloat(formData.salary) : undefined,
        bankAccount: formData.bankAccount || undefined,
        emergencyContact: formData.emergencyContact || undefined,
      });
    };
    if (existing) {
      proceed(existing.id);
    } else {
      // Generate unique email that won't have Arabic character issues
      const uniqueEmail = `emp-${Date.now()}@gtd-system.local`;
      createUser.mutate({
        name: formData.userName,
        email: uniqueEmail,
        role: 'designer'
      }, {
        onSuccess: (user: any) => proceed(user.id),
        onError: () => toast.error("تعذر إنشاء مستخدم جديد")
      } as any);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="ml-2 h-4 w-4" />
          موظف جديد
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>إضافة موظف جديد</DialogTitle>
            <DialogDescription>
              أدخل بيانات الموظف الجديد. الحقول المطلوبة مميزة بـ *
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="userName">اسم المستخدم *</Label>
                <Input
                  id="userName"
                  value={formData.userName}
                  onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employeeNumber">رقم الموظف *</Label>
                <Input
                  id="employeeNumber"
                  value={formData.employeeNumber}
                  onChange={(e) => setFormData({ ...formData, employeeNumber: e.target.value })}
                  placeholder="EMP-001"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department">القسم</Label>
                <Select
                  value={formData.department}
                  onValueChange={(value) => setFormData({ ...formData, department: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر القسم" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="التصميم الداخلي">التصميم الداخلي</SelectItem>
                    <SelectItem value="التصميم المعماري">التصميم المعماري</SelectItem>
                    <SelectItem value="الهندسة">الهندسة</SelectItem>
                    <SelectItem value="إدارة المشاريع">إدارة المشاريع</SelectItem>
                    <SelectItem value="التسويق والمبيعات">التسويق والمبيعات</SelectItem>
                    <SelectItem value="الموارد البشرية">الموارد البشرية</SelectItem>
                    <SelectItem value="المالية والمحاسبة">المالية والمحاسبة</SelectItem>
                    <SelectItem value="تقنية المعلومات">تقنية المعلومات</SelectItem>
                    <SelectItem value="خدمة العملاء">خدمة العملاء</SelectItem>
                    <SelectItem value="المشتريات">المشتريات</SelectItem>
                    <SelectItem value="الجودة">الجودة</SelectItem>
                    <SelectItem value="المخازن">المخازن</SelectItem>
                    <SelectItem value="الإدارة العامة">الإدارة العامة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">المنصب</Label>
                <Select
                  value={formData.position}
                  onValueChange={(value) => setFormData({ ...formData, position: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المنصب" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="مدير عام">مدير عام</SelectItem>
                    <SelectItem value="مدير قسم">مدير قسم</SelectItem>
                    <SelectItem value="مدير مشاريع">مدير مشاريع</SelectItem>
                    <SelectItem value="مهندس معماري">مهندس معماري</SelectItem>
                    <SelectItem value="مصمم داخلي">مصمم داخلي</SelectItem>
                    <SelectItem value="مهندس موقع">مهندس موقع</SelectItem>
                    <SelectItem value="مهندس تخطيط">مهندس تخطيط</SelectItem>
                    <SelectItem value="محاسب">محاسب</SelectItem>
                    <SelectItem value="مدير مالي">مدير مالي</SelectItem>
                    <SelectItem value="مسؤول موارد بشرية">مسؤول موارد بشرية</SelectItem>
                    <SelectItem value="مسؤول مبيعات">مسؤول مبيعات</SelectItem>
                    <SelectItem value="مسؤول مشتريات">مسؤول مشتريات</SelectItem>
                    <SelectItem value="مسؤول جودة">مسؤول جودة</SelectItem>
                    <SelectItem value="أمين مخازن">أمين مخازن</SelectItem>
                    <SelectItem value="منسق مشاريع">منسق مشاريع</SelectItem>
                    <SelectItem value="مساعد إداري">مساعد إداري</SelectItem>
                    <SelectItem value="فني">فني</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hireDate">تاريخ التوظيف</Label>
                <Input
                  id="hireDate"
                  type="date"
                  value={formData.hireDate}
                  onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salary">الراتب الأساسي (ريال)</Label>
                <Input
                  id="salary"
                  type="number"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  placeholder="5000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankAccount">رقم الحساب البنكي</Label>
              <Input
                id="bankAccount"
                value={formData.bankAccount}
                onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                placeholder="SA00 0000 0000 0000 0000 0000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergencyContact">رقم الطوارئ</Label>
              <Input
                id="emergencyContact"
                value={formData.emergencyContact}
                onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                placeholder="+966 50 000 0000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={createEmployee.isPending}>
              {createEmployee.isPending ? "جاري الإضافة..." : "إضافة"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
