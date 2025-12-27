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
import { LogOut } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function CheckOutDialog() {
    const [open, setOpen] = useState(false);
    const [employeeId, setEmployeeId] = useState("");

    const utils = trpc.useUtils();
    const { data: employees } = trpc.hr.employees.list.useQuery();
    const { data: attendanceList } = trpc.hr.attendance.list.useQuery({});

    const checkOut = trpc.hr.attendance.checkOut.useMutation({
        onSuccess: (data) => {
            toast.success(`تم تسجيل الانصراف بنجاح (${data.hoursWorked} ساعات عمل)`);
            utils.hr.attendance.list.invalidate();
            setOpen(false);
            setEmployeeId("");
        },
        onError: (error) => {
            toast.error(`فشل تسجيل الانصراف: ${error.message}`);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!employeeId) {
            toast.error("يرجى اختيار الموظف");
            return;
        }

        // Find today's attendance record for this employee
        const today = new Date().toDateString();
        const todayRecord = attendanceList?.find(a =>
            a.employeeId === parseInt(employeeId) &&
            new Date(a.date).toDateString() === today &&
            a.checkIn && !a.checkOut
        );

        if (!todayRecord) {
            toast.error("لا يوجد سجل حضور لهذا الموظف اليوم، أو تم تسجيل الانصراف مسبقاً");
            return;
        }

        checkOut.mutate({
            id: todayRecord.id,
            checkOut: new Date(),
        });
    };

    // Filter employees who have checked in today but not checked out
    const today = new Date().toDateString();
    const employeesWithOpenCheckIn = employees?.filter(emp => {
        const record = attendanceList?.find(a =>
            a.employeeId === emp.id &&
            new Date(a.date).toDateString() === today &&
            a.checkIn && !a.checkOut
        );
        return !!record;
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <LogOut className="ml-2 h-4 w-4" />
                    تسجيل انصراف
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>تسجيل انصراف</DialogTitle>
                        <DialogDescription>
                            سجل انصرافك الآن. الوقت الحالي: {new Date().toLocaleTimeString('ar-SA')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="employeeSelect">اختر الموظف</Label>
                            <select
                                id="employeeSelect"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={employeeId}
                                onChange={(e) => setEmployeeId(e.target.value)}
                                required
                            >
                                <option value="">-- اختر الموظف --</option>
                                {employeesWithOpenCheckIn?.map(emp => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.employeeNumber} - {emp.position || 'موظف'}
                                    </option>
                                ))}
                            </select>
                            {employeesWithOpenCheckIn?.length === 0 && (
                                <p className="text-sm text-muted-foreground">لا يوجد موظفين مسجلين للحضور اليوم</p>
                            )}
                        </div>

                        <div className="bg-muted p-4 rounded-lg space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">التاريخ:</span>
                                <span className="font-medium">{new Date().toLocaleDateString('ar-SA')}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">وقت الانصراف:</span>
                                <span className="font-medium">{new Date().toLocaleTimeString('ar-SA')}</span>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            إلغاء
                        </Button>
                        <Button type="submit" disabled={checkOut.isPending || !employeesWithOpenCheckIn?.length}>
                            {checkOut.isPending ? "جاري التسجيل..." : "تسجيل الانصراف"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
