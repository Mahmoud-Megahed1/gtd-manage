import { useState, useEffect } from "react";
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

export function AddProjectDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    clientId: "",
    name: "",
    description: "",
    // projectType is immutable after creation
    projectType: "design" as "design" | "execution" | "design_execution" | "supervision",
    startDate: "",
    endDate: "",
    budget: "",
    assignedTo: "",
  });

  const { data: clients } = trpc.clients.list.useQuery();
  const { data: users } = trpc.users.list.useQuery();
  const utils = trpc.useUtils();

  const createProject = trpc.projects.create.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة المشروع بنجاح");
      utils.projects.list.invalidate();
      setOpen(false);
      setFormData({
        clientId: "",
        name: "",
        description: "",
        projectType: "design",
        startDate: "",
        endDate: "",
        budget: "",
        assignedTo: "",
      });
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء إضافة المشروع");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientId || !formData.name) {
      toast.error("يرجى ملء الحقول المطلوبة");
      return;
    }

    createProject.mutate({
      clientId: parseInt(formData.clientId),
      name: formData.name,
      description: formData.description || undefined,
      projectType: formData.projectType,
      startDate: formData.startDate ? new Date(formData.startDate) : undefined,
      endDate: formData.endDate ? new Date(formData.endDate) : undefined,
      budget: formData.budget ? parseInt(formData.budget) : undefined,
      assignedTo: formData.assignedTo ? parseInt(formData.assignedTo) : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 ml-2" />
          مشروع جديد
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>إضافة مشروع جديد</DialogTitle>
          <DialogDescription>
            أدخل تفاصيل المشروع الجديد
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

            {/* Project Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                اسم المشروع <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="مثال: تصميم فيلا سكنية"
                required
              />
            </div>

            {/* Project Type - نوع المشروع (غير قابل للتغيير بعد الإنشاء) */}
            <div className="space-y-2">
              <Label htmlFor="projectType">
                نوع المشروع <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.projectType}
                onValueChange={(value: any) => setFormData({ ...formData, projectType: value })}
              >
                <SelectTrigger id="projectType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="design">تصميم</SelectItem>
                  <SelectItem value="execution">تنفيذ</SelectItem>
                  <SelectItem value="design_execution">تصميم وتنفيذ</SelectItem>
                  <SelectItem value="supervision">إشراف</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assigned To */}
            <div className="space-y-2">
              <Label htmlFor="assignedTo">المسؤول عن المشروع</Label>
              <Select
                value={formData.assignedTo}
                onValueChange={(value) => setFormData({ ...formData, assignedTo: value })}
              >
                <SelectTrigger id="assignedTo">
                  <SelectValue placeholder="اختر المسؤول" />
                </SelectTrigger>
                <SelectContent>
                  {users?.map((user) => (
                    <SelectItem key={user.id} value={String(user.id)}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="startDate">تاريخ البدء</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label htmlFor="endDate">تاريخ الانتهاء المتوقع</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>

            {/* Budget */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="budget">الميزانية (ريال سعودي)</Label>
              <Input
                id="budget"
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                placeholder="0"
                min="0"
              />
            </div>

            {/* Description */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">الوصف</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="وصف تفصيلي للمشروع..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={createProject.isPending}>
              {createProject.isPending ? "جاري الإضافة..." : "إضافة المشروع"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
