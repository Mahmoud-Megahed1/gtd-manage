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

export function AddSaleDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    clientId: "",
    projectId: "",
    amount: "",
    paymentMethod: "cash",
    saleDate: new Date().toISOString().split('T')[0],
    description: "",
  });

  const { data: clients } = trpc.clients.list.useQuery();
  const { data: projects } = trpc.projects.list.useQuery();
  const utils = trpc.useUtils();

  const createSale = trpc.accounting.sales.create.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة عملية البيع بنجاح");
      utils.accounting.sales.list.invalidate();
      setOpen(false);
      setFormData({
        clientId: "",
        projectId: "",
        amount: "",
        paymentMethod: "cash",
        saleDate: new Date().toISOString().split('T')[0],
        description: "",
      });
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إضافة عملية البيع");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.clientId || !formData.amount) {
      toast.error("يرجى ملء الحقول المطلوبة");
      return;
    }

    createSale.mutate({
      clientId: parseInt(formData.clientId),
      projectId: formData.projectId && formData.projectId !== "none" ? parseInt(formData.projectId) : undefined,
      amount: parseFloat(formData.amount),
      paymentMethod: formData.paymentMethod as "cash" | "check" | "bank_transfer" | "credit",
      saleDate: formData.saleDate,
      description: formData.description,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="ml-2 h-4 w-4" />
          إضافة عملية بيع
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>إضافة عملية بيع جديدة</DialogTitle>
          <DialogDescription>
            أدخل تفاصيل عملية البيع
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Client */}
            <div className="space-y-2">
              <Label htmlFor="clientId">
                العميل <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.clientId}
                onValueChange={(value) => setFormData({ ...formData, clientId: value })}
              >
                <SelectTrigger id="clientId">
                  <SelectValue placeholder="اختر العميل" />
                </SelectTrigger>
                <SelectContent>
                  {clients?.map((client) => (
                    <SelectItem key={client.id} value={String(client.id)}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

            {/* Sale Date */}
            <div className="space-y-2">
              <Label htmlFor="saleDate">تاريخ البيع</Label>
              <Input
                id="saleDate"
                type="date"
                value={formData.saleDate}
                onChange={(e) => setFormData({ ...formData, saleDate: e.target.value })}
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
            <Button type="submit" disabled={createSale.isPending}>
              {createSale.isPending ? "جاري الإضافة..." : "إضافة عملية البيع"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
