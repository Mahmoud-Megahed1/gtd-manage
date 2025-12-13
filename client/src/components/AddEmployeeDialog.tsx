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
    userId: "",
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
        userId: "",
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.userId || !formData.employeeNumber) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    createEmployee.mutate({
      userId: parseInt(formData.userId),
      employeeNumber: formData.employeeNumber,
      department: formData.department || undefined,
      position: formData.position || undefined,
      hireDate: new Date(formData.hireDate),
      salary: formData.salary ? parseFloat(formData.salary) : undefined,
      bankAccount: formData.bankAccount || undefined,
      emergencyContact: formData.emergencyContact || undefined,
    });
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
                <Label htmlFor="userId">رقم المستخدم *</Label>
                <Input
                  id="userId"
                  type="number"
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
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
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="التصميم الداخلي"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">المنصب</Label>
                <Input
                  id="position"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="مصمم داخلي"
                />
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
