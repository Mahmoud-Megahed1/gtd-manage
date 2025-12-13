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

export function AddPurchaseDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    supplierName: "",
    projectId: "",
    amount: "",
    paymentMethod: "cash",
    purchaseDate: new Date().toISOString().split('T')[0],
    description: "",
  });

  const { data: projects } = trpc.projects.list.useQuery();
  const utils = trpc.useUtils();

  const createPurchase = trpc.accounting.purchases.create.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة عملية الشراء بنجاح");
      utils.accounting.purchases.list.invalidate();
      setOpen(false);
      setFormData({
        supplierName: "",
        projectId: "",
        amount: "",
        paymentMethod: "cash",
        purchaseDate: new Date().toISOString().split('T')[0],
        description: "",
      });
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إضافة عملية الشراء");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.supplierName || !formData.amount) {
      toast.error("يرجى ملء الحقول المطلوبة");
      return;
    }

    createPurchase.mutate({
      supplierName: formData.supplierName,
      description: formData.description,
      projectId: formData.projectId && formData.projectId !== "none" ? parseInt(formData.projectId) : undefined,
      amount: parseFloat(formData.amount),
      paymentMethod: formData.paymentMethod as "cash" | "check" | "bank_transfer" | "credit",
      purchaseDate: formData.purchaseDate,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="ml-2 h-4 w-4" />
          إضافة عملية شراء
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>إضافة عملية شراء جديدة</DialogTitle>
          <DialogDescription>
            أدخل تفاصيل عملية الشراء
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Supplier Name */}
            <div className="space-y-2">
              <Label htmlFor="supplierName">
                المورد <span className="text-red-500">*</span>
              </Label>
              <Input
                id="supplierName"
                value={formData.supplierName}
                onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                placeholder="اسم المورد"
                required
              />
            </div>

            {/* Project (optional) */}
            <div className="space-y-2">
              <Label htmlFor="projectId">المشروع (اختياري)</Label>
              <Select
                value={formData.projectId}
                onValueChange={(value) => setFormData({ ...formData, projectId: value })}
              >
                <SelectTrigger id="projectId">
                  <SelectValue placeholder="اختر المشروع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون مشروع</SelectItem>
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

            {/* Payment Method */}
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">طريقة الدفع</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
              >
                <SelectTrigger id="paymentMethod">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">نقداً</SelectItem>
                  <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                  <SelectItem value="check">شيك</SelectItem>
                  <SelectItem value="credit">آجل</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Purchase Date */}
            <div className="space-y-2">
              <Label htmlFor="purchaseDate">تاريخ الشراء</Label>
              <Input
                id="purchaseDate"
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
              />
            </div>

            {/* Description */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">الوصف</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="تفاصيل إضافية..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={createPurchase.isPending}>
              {createPurchase.isPending ? "جاري الإضافة..." : "إضافة عملية الشراء"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
