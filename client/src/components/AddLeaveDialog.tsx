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
import { Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export function AddLeaveDialog() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  // Get employee profile to auto-fill employeeId
  const { data: myProfile } = trpc.hr.myProfile.get.useQuery(undefined, {
    enabled: open, // Only fetch when dialog is open
  });

  const [formData, setFormData] = useState({
    employeeId: "",
    leaveType: "annual" as "annual" | "sick" | "emergency" | "unpaid",
    startDate: "",
    endDate: "",
    reason: "",
  });

  // Auto-fill employeeId when profile is loaded
  useEffect(() => {
    if (myProfile?.id) {
      setFormData(prev => ({ ...prev, employeeId: myProfile.id.toString() }));
    }
  }, [myProfile]);

  const isAdmin = user?.role === 'admin' || user?.role === 'hr_manager';

  const utils = trpc.useUtils();
  const createLeave = trpc.hr.leaves.create.useMutation({
    onSuccess: () => {
      toast.success("تم إرسال طلب الإجازة بنجاح");
      utils.hr.leaves.list.invalidate();
      utils.hr.myProfile.myLeaves.invalidate();
      setOpen(false);
      setFormData({
        employeeId: myProfile?.id?.toString() || "",
        leaveType: "annual",
        startDate: "",
        endDate: "",
        reason: "",
      });
    },
    onError: (error) => {
      toast.error(`فشل إرسال الطلب: ${error.message}`);
    },
  });

  const calculateDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const employeeIdToUse = formData.employeeId || myProfile?.id?.toString();

    if (!employeeIdToUse || !formData.startDate || !formData.endDate) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    const days = calculateDays();
    if (days <= 0) {
      toast.error("تاريخ النهاية يجب أن يكون بعد تاريخ البداية");
      return;
    }

    createLeave.mutate({
      employeeId: parseInt(employeeIdToUse),
      leaveType: formData.leaveType,
      startDate: new Date(formData.startDate),
      endDate: new Date(formData.endDate),
      days,
      reason: formData.reason || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="ml-2 h-4 w-4" />
          طلب إجازة
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>طلب إجازة جديد</DialogTitle>
            <DialogDescription>
              أدخل تفاصيل الإجازة المطلوبة
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Show employee ID field only for admins */}
            {isAdmin ? (
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
            ) : (
              <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                سيتم تسجيل الإجازة على حسابك تلقائياً (موظف #{myProfile?.id || '...'})
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="leaveType">نوع الإجازة *</Label>
              <Select
                value={formData.leaveType}
                onValueChange={(value: any) => setFormData({ ...formData, leaveType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">إجازة سنوية</SelectItem>
                  <SelectItem value="sick">إجازة مرضية</SelectItem>
                  <SelectItem value="emergency">إجازة طارئة</SelectItem>
                  <SelectItem value="unpaid">إجازة بدون راتب</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">من تاريخ *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">إلى تاريخ *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  required
                />
              </div>
            </div>

            {formData.startDate && formData.endDate && (
              <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                عدد الأيام: <strong>{calculateDays()}</strong> يوم
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reason">السبب (اختياري)</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="اذكر سبب الإجازة..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={createLeave.isPending}>
              {createLeave.isPending ? "جاري الإرسال..." : "إرسال الطلب"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

