import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Shield } from "lucide-react";
import { toast } from "sonner";

export default function ApprovalsPage() {
    const { data: pendingRequests, isLoading, refetch } = trpc.approvals.pending.useQuery();
    const approveMutation = trpc.approvals.approve.useMutation({
        onSuccess: () => {
            toast.success("تمت الموافقة على الطلب");
            refetch();
        },
        onError: (error) => toast.error(error.message),
    });
    const rejectMutation = trpc.approvals.reject.useMutation({
        onSuccess: () => {
            toast.success("تم رفض الطلب");
            refetch();
        },
        onError: (error) => toast.error(error.message),
    });

    const entityTypeLabels: Record<string, string> = {
        expense: "مصروف",
        sale: "مبيعات",
        purchase: "مشتريات",
        invoice: "فاتورة",
        boq: "BOQ",
        installment: "قسط",
    };

    const actionLabels: Record<string, string> = {
        create: "إنشاء",
        update: "تعديل",
        delete: "حذف",
        cancel: "إلغاء",
        approve: "اعتماد",
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold">طلبات الاعتماد</h1>
                    <p className="text-muted-foreground">مراجعة واعتماد أو رفض الطلبات المعلقة</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>الطلبات المعلقة</CardTitle>
                        <CardDescription>جميع الطلبات التي تتطلب موافقتك</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <p className="text-center text-muted-foreground">جاري التحميل...</p>
                        ) : !pendingRequests || pendingRequests.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Shield className="w-12 h-12 mx-auto mb-4 opacity-30" />
                                <p>لا توجد طلبات معلقة</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>النوع</TableHead>
                                        <TableHead>الإجراء</TableHead>
                                        <TableHead>مقدم الطلب</TableHead>
                                        <TableHead>التاريخ</TableHead>
                                        <TableHead>الإجراءات</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pendingRequests.map((request: any) => (
                                        <TableRow key={request.id}>
                                            <TableCell>{entityTypeLabels[request.entityType] || request.entityType}</TableCell>
                                            <TableCell>{actionLabels[request.action] || request.action}</TableCell>
                                            <TableCell>#{request.requestedBy}</TableCell>
                                            <TableCell>{new Date(request.requestedAt).toLocaleDateString('ar-SA')}</TableCell>
                                            <TableCell className="space-x-2 space-x-reverse">
                                                <Button
                                                    size="sm"
                                                    variant="default"
                                                    disabled={approveMutation.isPending}
                                                    onClick={() => approveMutation.mutate({ id: request.id })}
                                                >
                                                    موافقة
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    disabled={rejectMutation.isPending}
                                                    onClick={() => {
                                                        const reason = prompt("سبب الرفض:");
                                                        if (reason) {
                                                            rejectMutation.mutate({ id: request.id, notes: reason });
                                                        }
                                                    }}
                                                >
                                                    رفض
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
