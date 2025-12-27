import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface LeaveApprovalDialogProps {
  leaveId: number;
  employeeId: number;
  leaveType: string;
  days: number;
  reason?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: "approve" | "reject";
  onSuccess?: () => void;
}

export function LeaveApprovalDialog({
  leaveId,
  employeeId,
  leaveType,
  days,
  reason,
  open,
  onOpenChange,
  action,
  onSuccess,
}: LeaveApprovalDialogProps) {
  const [notes, setNotes] = useState("");

  const utils = trpc.useUtils();

  const approve = trpc.hr.leaves.approve.useMutation({
    onSuccess: () => {
      toast.success("تمت الموافقة على الإجازة");
      utils.hr.leaves.list.invalidate();
      onSuccess?.();
      onOpenChange(false);
      setNotes("");
    },
    onError: (error) => {
      toast.error(`فشلت الموافقة: ${error.message}`);
    },
  });

  const reject = trpc.hr.leaves.reject.useMutation({
    onSuccess: () => {
      toast.success("تم رفض الإجازة");
      utils.hr.leaves.list.invalidate();
      onSuccess?.();
      onOpenChange(false);
      setNotes("");
    },
    onError: (error) => {
      toast.error(`فشل الرفض: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    if (action === "approve") {
      approve.mutate({
        id: leaveId,
        notes: notes || undefined,
      });
    } else {
      if (!notes.trim()) {
        toast.error("يرجى إدخال سبب الرفض");
        return;
      }
      reject.mutate({
        id: leaveId,
        notes,
      });
    }
  };

  const getLeaveTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      annual: "سنوية",
      sick: "مرضية",
      emergency: "طارئة",
      unpaid: "بدون راتب",
    };
    return labels[type] || type;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {action === "approve" ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-500" />
                الموافقة على الإجازة
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-red-500" />
                رفض الإجازة
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {action === "approve"
              ? "هل أنت متأكد من الموافقة على هذا الطلب؟"
              : "يرجى إدخال سبب الرفض"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">رقم الموظف:</span>
              <span className="font-medium">#{employeeId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">نوع الإجازة:</span>
              <span className="font-medium">{getLeaveTypeLabel(leaveType)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">عدد الأيام:</span>
              <span className="font-medium">{days} يوم</span>
            </div>
            {reason && (
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground mb-1">السبب:</p>
                <p className="text-sm">{reason}</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">
              {action === "approve" ? "ملاحظات (اختياري)" : "سبب الرفض *"}
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={action === "approve"
                ? "أضف ملاحظات إن وجدت..."
                : "اذكر سبب رفض الطلب..."}
              rows={3}
              required={action === "reject"}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={approve.isPending || reject.isPending}
            variant={action === "approve" ? "default" : "destructive"}
          >
            {approve.isPending || reject.isPending
              ? "جاري المعالجة..."
              : action === "approve"
                ? "موافقة"
                : "رفض"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
