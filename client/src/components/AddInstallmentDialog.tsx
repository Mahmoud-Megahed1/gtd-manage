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

export function AddInstallmentDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    projectId: "",
    installmentNumber: "1",
    amount: "",
    dueDate: new Date().toISOString().split('T')[0],
    notes: "",
  });

  const { data: projects } = trpc.projects.list.useQuery();
  const utils = trpc.useUtils();

  const createInstallment = trpc.accounting.installments.create.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة القسط بنجاح");
      utils.accounting.installments.list.invalidate();
      setOpen(false);
      setFormData({
        projectId: "",
        installmentNumber: "1",
        amount: "",
        dueDate: new Date().toISOString().split('T')[0],
        notes: "",
      });
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إضافة القسط");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.projectId || !formData.amount) {
      toast.error("يرجى ملء الحقول المطلوبة");
      return;
    }

    createInstallment.mutate({
      projectId: parseInt(formData.projectId),
      installmentNumber: parseInt(formData.installmentNumber),
      amount: parseFloat(formData.amount),
      dueDate: new Date(formData.dueDate).getTime(),
      notes: formData.notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="ml-2 h-4 w-4" />
          إضافة قسط
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>إضافة قسط جديد</DialogTitle>
          <DialogDescription>
            أدخل تفاصيل القسط
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Project */}
            <div className="space-y-2">
              <Label htmlFor="projectId">
                المشروع <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.projectId}
                onValueChange={(value) => setFormData({ ...formData, projectId: value })}
              >
                <SelectTrigger id="projectId">
                  <SelectValue placeholder="اختر المشروع" />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={String(project.id)}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">
                المبلغ <span className="text-red-500">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0"
                min="0"
                step="0.01"
                required
              />
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label htmlFor="dueDate">تاريخ الاستحقاق</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>

            {/* Installment Number */}
            <div className="space-y-2">
              <Label htmlFor="installmentNumber">رقم القسط</Label>
              <Input
                id="installmentNumber"
                type="number"
                value={formData.installmentNumber}
                onChange={(e) => setFormData({ ...formData, installmentNumber: e.target.value })}
                min="1"
                required
              />
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
            <Button type="submit" disabled={createInstallment.isPending}>
              {createInstallment.isPending ? "جاري الإضافة..." : "إضافة القسط"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
