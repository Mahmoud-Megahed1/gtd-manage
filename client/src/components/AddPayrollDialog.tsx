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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export function AddPayrollDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    baseSalary: "",
    bonuses: "",
    deductions: "",
    notes: "",
  });

  const { data: employees } = trpc.hr.employees.list.useQuery();
  const utils = trpc.useUtils();

  const createPayroll = trpc.hr.payroll.create.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء كشف الراتب بنجاح");
      utils.hr.payroll.list.invalidate();
      setOpen(false);
      setFormData({
        employeeId: "",
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        baseSalary: "",
        bonuses: "",
        deductions: "",
        notes: "",
      });
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إنشاء كشف الراتب");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.employeeId || !formData.baseSalary) {
      toast.error("يرجى ملء الحقول المطلوبة");
      return;
    }

    const baseSalary = parseFloat(formData.baseSalary);
    const bonuses = formData.bonuses ? parseFloat(formData.bonuses) : 0;
    const deductions = formData.deductions ? parseFloat(formData.deductions) : 0;
    const netSalary = baseSalary + bonuses - deductions;

    createPayroll.mutate({
      employeeId: parseInt(formData.employeeId),
      month: formData.month,
      year: formData.year,
      baseSalary,
      bonuses: bonuses > 0 ? bonuses : undefined,
      deductions: deductions > 0 ? deductions : undefined,
      notes: formData.notes || undefined,
    });
  };

  const netSalary = () => {
    const base = parseFloat(formData.baseSalary) || 0;
    const bonus = parseFloat(formData.bonuses) || 0;
    const deduct = parseFloat(formData.deductions) || 0;
    return base + bonus - deduct;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="ml-2 h-4 w-4" />
          كشف راتب جديد
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>إنشاء كشف راتب جديد</DialogTitle>
          <DialogDescription>
            أدخل تفاصيل الراتب للموظف
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Employee */}
            <div className="space-y-2">
              <Label htmlFor="employeeId">
                الموظف <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.employeeId}
                onValueChange={(value) => {
                  setFormData({ ...formData, employeeId: value });
                  // Auto-fill base salary from employee data
                  const emp = employees?.find(e => e.id === parseInt(value));
                  if (emp?.salary !== null && emp?.salary !== undefined) {
                    setFormData(prev => ({ ...prev, employeeId: value, baseSalary: emp.salary!.toString() }));
                  }
                }}
              >
                <SelectTrigger id="employeeId">
                  <SelectValue placeholder="اختر الموظف" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map((emp) => (
                    <SelectItem key={emp.id} value={String(emp.id)}>
                      {emp.employeeNumber} - {emp.position || "موظف"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Month */}
            <div className="space-y-2">
              <Label htmlFor="month">الشهر</Label>
              <Select
                value={String(formData.month)}
                onValueChange={(value) => setFormData({ ...formData, month: parseInt(value) })}
              >
                <SelectTrigger id="month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {new Date(2024, m - 1).toLocaleDateString('ar-SA', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Year */}
            <div className="space-y-2">
              <Label htmlFor="year">السنة</Label>
              <Input
                id="year"
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                min="2020"
                max="2100"
              />
            </div>

            {/* Base Salary */}
            <div className="space-y-2">
              <Label htmlFor="baseSalary">
                الراتب الأساسي <span className="text-red-500">*</span>
              </Label>
              <Input
                id="baseSalary"
                type="number"
                value={formData.baseSalary}
                onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
                placeholder="0"
                min="0"
                step="0.01"
                required
              />
            </div>

            {/* Bonuses */}
            <div className="space-y-2">
              <Label htmlFor="bonuses">المكافآت والبدلات</Label>
              <Input
                id="bonuses"
                type="number"
                value={formData.bonuses}
                onChange={(e) => setFormData({ ...formData, bonuses: e.target.value })}
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>

            {/* Deductions */}
            <div className="space-y-2">
              <Label htmlFor="deductions">الخصومات</Label>
              <Input
                id="deductions"
                type="number"
                value={formData.deductions}
                onChange={(e) => setFormData({ ...formData, deductions: e.target.value })}
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>

            {/* Net Salary (calculated) */}
            <div className="space-y-2 md:col-span-2">
              <Label>صافي الراتب</Label>
              <div className="text-2xl font-bold text-primary">
                {netSalary().toLocaleString('ar-SA')} ر.س
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">ملاحظات</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="ملاحظات إضافية..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={createPayroll.isPending}>
              {createPayroll.isPending ? "جاري الإنشاء..." : "إنشاء كشف الراتب"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
