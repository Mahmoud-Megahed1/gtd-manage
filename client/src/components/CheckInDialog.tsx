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
import { Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function CheckInDialog() {
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");

  const utils = trpc.useUtils();
  const checkIn = trpc.hr.attendance.checkIn.useMutation({
    onSuccess: () => {
      toast.success("تم تسجيل الحضور بنجاح");
      utils.hr.attendance.list.invalidate();
      setOpen(false);
      setEmployeeId("");
    },
    onError: (error) => {
      toast.error(`فشل تسجيل الحضور: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!employeeId) {
      toast.error("يرجى إدخال رقم الموظف");
      return;
    }

    checkIn.mutate({
      employeeId: parseInt(employeeId),
      date: new Date(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Clock className="ml-2 h-4 w-4" />
          تسجيل حضور
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>تسجيل حضور</DialogTitle>
            <DialogDescription>
              سجل حضورك الآن. الوقت الحالي: {new Date().toLocaleTimeString('ar-SA')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="employeeId">رقم الموظف</Label>
              <Input
                id="employeeId"
                type="number"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="أدخل رقم الموظف"
                required
                autoFocus
              />
            </div>

            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">التاريخ:</span>
                <span className="font-medium">{new Date().toLocaleDateString('ar-SA')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">الوقت:</span>
                <span className="font-medium">{new Date().toLocaleTimeString('ar-SA')}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={checkIn.isPending}>
              {checkIn.isPending ? "جاري التسجيل..." : "تسجيل"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
