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
import { Award, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function AddPerformanceReviewDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: "",
    reviewDate: new Date().toISOString().split('T')[0],
    period: "",
    rating: "",
    strengths: "",
    weaknesses: "",
    goals: "",
    comments: "",
  });

  const utils = trpc.useUtils();
  const createReview = trpc.hr.reviews.create.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة التقييم بنجاح");
      utils.hr.reviews.list.invalidate();
      setOpen(false);
      setFormData({
        employeeId: "",
        reviewDate: new Date().toISOString().split('T')[0],
        period: "",
        rating: "",
        strengths: "",
        weaknesses: "",
        goals: "",
        comments: "",
      });
    },
    onError: (error) => {
      toast.error(`فشل إضافة التقييم: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.employeeId) {
      toast.error("يرجى إدخال رقم الموظف");
      return;
    }

    createReview.mutate({
      employeeId: parseInt(formData.employeeId),
      reviewDate: new Date(formData.reviewDate),
      period: formData.period || undefined,
      rating: formData.rating ? parseFloat(formData.rating) : undefined,
      strengths: formData.strengths || undefined,
      weaknesses: formData.weaknesses || undefined,
      goals: formData.goals || undefined,
      comments: formData.comments || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="ml-2 h-4 w-4" />
          تقييم جديد
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              إضافة تقييم أداء
            </DialogTitle>
            <DialogDescription>
              قيّم أداء الموظف وحدد نقاط القوة والضعف والأهداف المستقبلية
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employeeId">رقم الموظف *</Label>
                <Input
                  id="employeeId"
                  type="number"
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reviewDate">تاريخ التقييم</Label>
                <Input
                  id="reviewDate"
                  type="date"
                  value={formData.reviewDate}
                  onChange={(e) => setFormData({ ...formData, reviewDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="period">الفترة</Label>
                <Input
                  id="period"
                  value={formData.period}
                  onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                  placeholder="Q1 2024"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rating">التقييم (من 5)</Label>
                <Input
                  id="rating"
                  type="number"
                  min="1"
                  max="5"
                  step="0.1"
                  value={formData.rating}
                  onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                  placeholder="4.5"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="strengths">نقاط القوة</Label>
              <Textarea
                id="strengths"
                value={formData.strengths}
                onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
                placeholder="اذكر نقاط القوة والإنجازات..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weaknesses">نقاط التحسين</Label>
              <Textarea
                id="weaknesses"
                value={formData.weaknesses}
                onChange={(e) => setFormData({ ...formData, weaknesses: e.target.value })}
                placeholder="اذكر المجالات التي تحتاج تحسين..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goals">الأهداف المستقبلية</Label>
              <Textarea
                id="goals"
                value={formData.goals}
                onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                placeholder="حدد الأهداف للفترة القادمة..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comments">ملاحظات إضافية</Label>
              <Textarea
                id="comments"
                value={formData.comments}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                placeholder="أي ملاحظات أخرى..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={createReview.isPending}>
              {createReview.isPending ? "جاري الإضافة..." : "إضافة التقييم"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
