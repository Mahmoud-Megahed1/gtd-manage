/*
 © 2025 - Property of [Mohammed Ahmed / Golden Touch Design co.]
 Unauthorized use or reproduction is prohibited.
*/
import { useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Users, Clock, DollarSign, Calendar, Award,
  Plus, FileText, CheckCircle, XCircle, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { AddEmployeeDialog } from "@/components/AddEmployeeDialog";
import { CheckInDialog } from "@/components/CheckInDialog";
import { CheckOutDialog } from "@/components/CheckOutDialog";
import { AddLeaveDialog } from "@/components/AddLeaveDialog";
import { AddPerformanceReviewDialog } from "@/components/AddPerformanceReviewDialog";
import { AddPayrollDialog } from "@/components/AddPayrollDialog";
import { EditPayrollDialog } from "@/components/EditPayrollDialog";
import { LeaveApprovalDialog } from "@/components/LeaveApprovalDialog";
import { useAuth } from "@/_core/hooks/useAuth";
import AttendanceCsvImport from "@/components/AttendanceCsvImport";
import AttendanceExport from "@/components/AttendanceExport";
import TeamCalendar from "@/components/TeamCalendar";
import PayrollExport from "@/components/PayrollExport";

export default function HR() {
  const [activeTab, setActiveTab] = useState("employees");
  const [, setLocation] = useLocation();
  const [approvalDialog, setApprovalDialog] = useState<{
    open: boolean;
    leaveId: number;
    employeeId: number;
    leaveType: string;
    days: number;
    reason?: string | null;
    action: "approve" | "reject";
  } | null>(null);

  // Queries
  const { user } = useAuth();
  const { data: permissions } = trpc.auth.getMyPermissions.useQuery();
  const hasFullAccess = Boolean(permissions?.permissions.hr.view || user?.role === 'admin' || user?.role === 'hr_manager');

  const { data: employees, isLoading: loadingEmployees, refetch: refetchEmployees } = trpc.hr.employees.list.useQuery(undefined, { enabled: !!hasFullAccess });
  const { data: attendanceList, isLoading: loadingAttendance } = trpc.hr.attendance.list.useQuery({}, { enabled: !!hasFullAccess });
  const [payrollFilter, setPayrollFilter] = useState<{ employeeId?: number; year?: number; month?: number }>({});
  const { data: payrollList, isLoading: loadingPayroll, refetch: refetchPayroll } = trpc.hr.payroll.list.useQuery(payrollFilter as any, { enabled: !!hasFullAccess });
  const { data: leavesList, isLoading: loadingLeaves, refetch: refetchLeaves } = trpc.hr.leaves.list.useQuery({}, { enabled: !!hasFullAccess });
  const { data: reviewsList, isLoading: loadingReviews } = trpc.hr.reviews.list.useQuery({}, { enabled: !!hasFullAccess });

  // Personal data queries for limited access users
  const { data: myProfile } = trpc.hr.myProfile.get.useQuery(undefined, { enabled: !hasFullAccess });
  const { data: myAttendance } = trpc.hr.myProfile.myAttendance.useQuery({}, { enabled: !hasFullAccess });
  const { data: myPayroll } = trpc.hr.myProfile.myPayroll.useQuery(undefined, { enabled: !hasFullAccess });
  const { data: myLeaves } = trpc.hr.myProfile.myLeaves.useQuery(undefined, { enabled: !hasFullAccess });
  const { data: myReviews } = trpc.hr.myProfile.myReviews.useQuery(undefined, { enabled: !hasFullAccess });

  const utils = trpc.useUtils();

  const deleteEmployee = trpc.hr.employees.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الموظف");
      refetchEmployees();
    },
    onError: () => toast.error("تعذر حذف الموظف"),
  });
  const deletePayslip = trpc.hr.payroll.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف كشف الراتب");
      refetchPayroll();
    },
    onError: () => toast.error("تعذر حذف كشف الراتب"),
  });

  const deleteLeave = trpc.hr.leaves.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف طلب الإجازة");
      utils.hr.leaves.list.invalidate();
    },
    onError: () => toast.error("تعذر حذف طلب الإجازة"),
  });

  const deleteAttendance = trpc.hr.attendance.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف سجل الحضور");
      utils.hr.attendance.list.invalidate();
    },
    onError: (err) => toast.error(err.message || "تعذر حذف سجل الحضور"),
  });

  // Cancellation mutations
  const requestCancellation = trpc.hr.leaves.requestCancellation.useMutation({
    onSuccess: () => {
      toast.success("تم إرسال طلب الإلغاء للإدارة");
      utils.hr.myProfile.myLeaves.invalidate();
    },
    onError: (e) => toast.error(e.message || "تعذر إرسال طلب الإلغاء"),
  });

  const { data: cancellationRequests, refetch: refetchCancellations } = trpc.hr.leaves.listCancellationRequests.useQuery(undefined, { enabled: !!hasFullAccess });

  const approveCancellation = trpc.hr.leaves.approveCancellation.useMutation({
    onSuccess: () => {
      toast.success("تم قبول طلب الإلغاء");
      refetchCancellations();
      utils.hr.leaves.list.invalidate();
    },
    onError: () => toast.error("تعذر قبول طلب الإلغاء"),
  });

  const rejectCancellation = trpc.hr.leaves.rejectCancellation.useMutation({
    onSuccess: () => {
      toast.success("تم رفض طلب الإلغاء");
      refetchCancellations();
      utils.hr.leaves.list.invalidate();
    },
    onError: () => toast.error("تعذر رفض طلب الإلغاء"),
  });

  const deleteReview = trpc.hr.reviews.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف تقييم الأداء");
      utils.hr.reviews.list.invalidate();
    },
    onError: () => toast.error("تعذر حذف تقييم الأداء"),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{hasFullAccess ? 'إدارة الموارد البشرية' : 'بياناتي الشخصية'}</h1>
            <p className="text-muted-foreground mt-1">
              {hasFullAccess ? 'نظام شامل لإدارة الموظفين والحضور والرواتب' : 'عرض وإدارة بياناتك الشخصية'}
            </p>
          </div>
        </div>

        {/* Stats Cards - Admin/HR Only */}
        {hasFullAccess && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الموظفين</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{employees?.length || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">الموظفون النشطون</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">الحضور اليوم</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {attendanceList?.filter(a => {
                    const today = new Date().toDateString();
                    return new Date(a.date).toDateString() === today;
                  }).length || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">سجلات الحضور</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">الرواتب المعلقة</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {payrollList?.filter(p => p.status === 'pending').length || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">بانتظار الدفع</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">طلبات الإجازة</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {leavesList?.filter(l => l.status === 'pending').length || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">بانتظار الموافقة</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">التقييمات</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reviewsList?.length || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">تقييمات الأداء</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Personal Data View for Regular Employees */}
        {!hasFullAccess && !myProfile && (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا يوجد ملف موظف</h3>
              <p className="text-muted-foreground">
                لم يتم إنشاء ملفك كموظف بعد. يرجى التواصل مع إدارة الموارد البشرية لإنشاء ملفك.
              </p>
            </CardContent>
          </Card>
        )}

        {!hasFullAccess && myProfile && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  معلوماتي الأساسية
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">رقم الموظف</p>
                    <p className="font-medium">{myProfile.employeeNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">القسم</p>
                    <p className="font-medium">{myProfile.department || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">المنصب</p>
                    <p className="font-medium">{myProfile.position || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Personal Data Tabs */}
            <Tabs defaultValue="attendance" className="space-y-4">
              <TabsList>
                <TabsTrigger value="attendance">حضوري</TabsTrigger>
                <TabsTrigger value="payroll">رواتبي</TabsTrigger>
                <TabsTrigger value="leaves">إجازاتي</TabsTrigger>
                <TabsTrigger value="reviews">تقييماتي</TabsTrigger>
              </TabsList>

              <TabsContent value="attendance">
                <Card>
                  <CardHeader>
                    <CardTitle>سجل الحضور</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {myAttendance && myAttendance.length > 0 ? (
                      <div className="space-y-2">
                        {myAttendance.slice(0, 10).map((a: any) => (
                          <div key={a.id} className="flex justify-between p-3 border rounded">
                            <span>{new Date(a.date).toLocaleDateString('ar-SA')}</span>
                            <Badge>{a.status === 'present' ? 'حاضر' : a.status}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-4">لا يوجد سجلات</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payroll">
                <Card>
                  <CardHeader>
                    <CardTitle>كشوفات الرواتب</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {myPayroll && myPayroll.length > 0 ? (
                      <div className="space-y-2">
                        {myPayroll.map((p: any) => (
                          <div key={p.id} className="flex justify-between p-3 border rounded">
                            <span>{p.month}/{p.year}</span>
                            <div className="text-left">
                              <span className="block font-bold text-lg">{p.netSalary?.toLocaleString()} ريال</span>
                              <div className="text-xs text-muted-foreground mt-1">
                                <span>أساسي: {p.baseSalary?.toLocaleString()}</span>
                                {p.bonuses > 0 && <span className="text-green-600 mx-2">+{p.bonuses.toLocaleString()}</span>}
                                {p.deductions > 0 && <span className="text-red-600">-{p.deductions.toLocaleString()}</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-4">لا يوجد كشوفات</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="leaves">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>إجازاتي</CardTitle>
                    <AddLeaveDialog />
                  </CardHeader>
                  <CardContent>
                    {myLeaves && myLeaves.length > 0 ? (
                      <div className="space-y-2">
                        {myLeaves.map((l: any) => (
                          <div key={l.id} className="flex justify-between items-center p-3 border rounded">
                            <div>
                              <span>{new Date(l.startDate).toLocaleDateString('ar-SA')}</span>
                              <span className="mx-2">-</span>
                              <span>{new Date(l.endDate).toLocaleDateString('ar-SA')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={l.status === 'approved' ? 'default' : l.status === 'pending' ? 'secondary' : 'destructive'}>
                                {l.status === 'approved' ? 'موافق' : l.status === 'pending' ? 'قيد المراجعة' : 'مرفوض'}
                              </Badge>
                              {l.cancellationRequested === 1 && (
                                <Badge variant="outline" className="text-orange-600">طلب إلغاء معلق</Badge>
                              )}
                              {l.cancellationRequested === 3 && (
                                <Badge variant="outline" className="text-red-600">رفض الإلغاء</Badge>
                              )}
                              {l.status === 'approved' && !l.cancellationRequested && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const reason = prompt("سبب طلب الإلغاء:");
                                    if (reason) {
                                      requestCancellation.mutate({ id: l.id, reason });
                                    }
                                  }}
                                  disabled={requestCancellation.isPending}
                                >
                                  طلب إلغاء
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-4">لا يوجد إجازات</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reviews">
                <Card>
                  <CardHeader>
                    <CardTitle>تقييماتي</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {myReviews && myReviews.length > 0 ? (
                      <div className="space-y-2">
                        {myReviews.map((r: any) => (
                          <div key={r.id} className="p-3 border rounded">
                            <div className="flex justify-between">
                              <span>{new Date(r.reviewDate).toLocaleDateString('ar-SA')}</span>
                              <span className="font-bold">{r.rating}/5</span>
                            </div>
                            {r.comments && <p className="text-sm text-muted-foreground mt-2">{r.comments}</p>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-4">لا يوجد تقييمات</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* Main Content - Admin View */}
        {hasFullAccess && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="employees">الموظفون</TabsTrigger>
              <TabsTrigger value="attendance">الحضور والانصراف</TabsTrigger>
              <TabsTrigger value="payroll">الرواتب</TabsTrigger>
              <TabsTrigger value="leaves">الإجازات</TabsTrigger>
              <TabsTrigger value="reviews">تقييم الأداء</TabsTrigger>
            </TabsList>

            {/* Employees Tab */}
            <TabsContent value="employees" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>قائمة الموظفين</CardTitle>
                      <CardDescription>إدارة ملفات الموظفين وبياناتهم</CardDescription>
                    </div>
                    <AddEmployeeDialog />
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingEmployees ? (
                    <p className="text-center text-muted-foreground py-8">جاري التحميل...</p>
                  ) : employees && employees.length > 0 ? (
                    <div className="space-y-4">
                      {employees.map((emp) => (
                        <div
                          key={emp.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                          onClick={() => setLocation(`/hr/employees/${emp.id}`)}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold flex items-center gap-2">
                                {emp.employeeNumber}
                                {(emp as any).userName && <span className="text-sm font-normal text-muted-foreground">- {(emp as any).userName}</span>}
                              </h3>
                              <Badge variant={emp.status === 'active' ? 'default' : 'secondary'}>
                                {emp.status === 'active' ? 'نشط' : emp.status === 'on_leave' ? 'في إجازة' : 'منتهي'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {emp.position || 'لا يوجد منصب'} - {emp.department || 'لا يوجد قسم'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              تاريخ التوظيف: {new Date(emp.hireDate).toLocaleDateString('ar-SA')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLocation(`/hr/employees/${emp.id}`);
                              }}
                            >
                              <FileText className="ml-2 h-4 w-4" />
                              التفاصيل
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm("هل أنت متأكد من حذف هذا الموظف؟ سيتم حذف جميع بياناته المرتبطة (الحضور، الرواتب، الإجازات، التقييمات).")) {
                                  deleteEmployee.mutate({ id: emp.id });
                                }
                              }}
                            >
                              <XCircle className="ml-2 h-4 w-4" />
                              حذف
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">لا يوجد موظفون حالياً</p>
                      <AddEmployeeDialog />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Attendance Tab */}
            <TabsContent value="attendance" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>سجلات الحضور والانصراف</CardTitle>
                      <CardDescription>تتبع حضور الموظفين وساعات العمل</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <CheckInDialog />
                      <CheckOutDialog />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="p-3 border rounded mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm">استيراد CSV للحضور (employeeNumber,date,checkIn,checkOut)</p>
                      <AttendanceExport attendanceList={attendanceList || []} />
                    </div>
                    <AttendanceCsvImport />
                  </div>
                  {loadingAttendance ? (
                    <p className="text-center text-muted-foreground py-8">جاري التحميل...</p>
                  ) : attendanceList && attendanceList.length > 0 ? (
                    <div className="space-y-2">
                      {attendanceList.slice(0, 10).map((att) => (
                        <div key={att.id} className="flex items-center justify-between p-3 border rounded">
                          <div>
                            <p className="font-medium">موظف #{att.employeeId}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(att.date).toLocaleDateString('ar-SA')}
                            </p>
                          </div>
                          <div className="text-left">
                            <p className="text-sm">
                              دخول: {att.checkIn ? new Date(att.checkIn).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '-'}
                            </p>
                            <p className="text-sm">
                              خروج: {att.checkOut ? new Date(att.checkOut).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '-'}
                            </p>
                          </div>
                          <Badge variant={att.status === 'present' ? 'default' : 'secondary'}>
                            {att.status === 'present' ? 'حاضر' : att.status === 'late' ? 'متأخر' : att.status === 'absent' ? 'غائب' : 'نصف يوم'}
                          </Badge>
                          {user?.role === 'admin' && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                if (confirm("هل أنت متأكد من حذف سجل الحضور هذا؟")) {
                                  deleteAttendance.mutate({ id: att.id });
                                }
                              }}
                              disabled={deleteAttendance.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">لا توجد سجلات حضور</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payroll Tab */}
            <TabsContent value="payroll" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>إدارة الرواتب</CardTitle>
                      <CardDescription>كشوف الرواتب والمكافآت والخصومات</CardDescription>
                    </div>
                    <AddPayrollDialog />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-3">
                    <div className="flex items-center gap-2">
                      <label className="text-sm">من شهر</label>
                      <Input
                        type="number"
                        placeholder="1"
                        onBlur={(e) => setPayrollFilter((f) => ({ ...f, month: e.target.value ? parseInt(e.target.value) : undefined }))}
                        className="w-24"
                      />
                      <label className="text-sm">سنة</label>
                      <Input
                        type="number"
                        placeholder="2025"
                        onBlur={(e) => setPayrollFilter((f) => ({ ...f, year: e.target.value ? parseInt(e.target.value) : undefined }))}
                        className="w-28"
                      />
                      <PayrollExport payrollList={payrollList || []} />
                    </div>
                  </div>
                  {loadingPayroll ? (
                    <p className="text-center text-muted-foreground py-8">جاري التحميل...</p>
                  ) : payrollList && payrollList.length > 0 ? (
                    <div className="space-y-2">
                      {payrollList.map((pay) => (
                        <div key={pay.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium">موظف #{pay.employeeId}</p>
                            <p className="text-sm text-muted-foreground">
                              {pay.month}/{pay.year}
                            </p>
                            <div className="flex gap-4 mt-2 text-sm">
                              <span>الراتب الأساسي: {pay.baseSalary.toLocaleString()} ريال</span>
                              {pay.bonuses && pay.bonuses > 0 && <span className="text-green-600">مكافآت: +{pay.bonuses.toLocaleString()}</span>}
                              {pay.deductions && pay.deductions > 0 && <span className="text-red-600">خصومات: -{pay.deductions.toLocaleString()}</span>}
                            </div>
                          </div>
                          <div className="text-left">
                            <p className="text-lg font-bold">{pay.netSalary.toLocaleString()} ريال</p>
                            <Badge variant={pay.status === 'paid' ? 'default' : 'secondary'}>
                              {pay.status === 'paid' ? 'مدفوع' : 'معلق'}
                            </Badge>
                            {user?.role === 'admin' && (
                              <div className="flex gap-2 justify-end mt-2">
                                <EditPayrollDialog payroll={pay} />
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => deletePayslip.mutate({ id: pay.id })}
                                >
                                  حذف الكشف
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <DollarSign className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">لا توجد كشوف رواتب</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Leaves Tab */}
            <TabsContent value="leaves" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>إدارة الإجازات</CardTitle>
                      <CardDescription>طلبات الإجازات والموافقات</CardDescription>
                    </div>
                    <AddLeaveDialog />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="p-3 border rounded mb-4">
                    <p className="text-sm mb-2">تقويم الفريق</p>
                    <TeamCalendar leaves={leavesList || []} />
                  </div>

                  {/* Cancellation Requests Section */}
                  {cancellationRequests && cancellationRequests.length > 0 && (
                    <div className="p-4 border-2 border-orange-300 bg-orange-50 rounded-lg mb-4">
                      <h3 className="font-bold text-orange-700 mb-3">⚠️ طلبات إلغاء الإجازات ({cancellationRequests.length})</h3>
                      <div className="space-y-2">
                        {cancellationRequests.map((req: any) => (
                          <div key={req.id} className="flex items-center justify-between p-3 bg-white border rounded">
                            <div>
                              <p className="font-medium">موظف #{req.employeeId}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(req.startDate).toLocaleDateString('ar-SA')} - {new Date(req.endDate).toLocaleDateString('ar-SA')}
                              </p>
                              <p className="text-sm text-orange-700">السبب: {req.cancellationReason}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => {
                                  const notes = prompt("ملاحظات (اختياري):");
                                  approveCancellation.mutate({ id: req.id, notes: notes || undefined });
                                }}
                                disabled={approveCancellation.isPending}
                              >
                                <CheckCircle className="h-4 w-4 ml-1" />
                                قبول
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  const notes = prompt("سبب الرفض:");
                                  if (notes) {
                                    rejectCancellation.mutate({ id: req.id, notes });
                                  }
                                }}
                                disabled={rejectCancellation.isPending}
                              >
                                <XCircle className="h-4 w-4 ml-1" />
                                رفض
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {loadingLeaves ? (
                    <p className="text-center text-muted-foreground py-8">جاري التحميل...</p>
                  ) : leavesList && leavesList.length > 0 ? (
                    <div className="space-y-2">
                      {leavesList.map((leave) => (
                        <div key={leave.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">موظف #{leave.employeeId}</p>
                              <Badge>
                                {leave.leaveType === 'annual' ? 'سنوية' :
                                  leave.leaveType === 'sick' ? 'مرضية' :
                                    leave.leaveType === 'emergency' ? 'طارئة' : 'بدون راتب'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              من {new Date(leave.startDate).toLocaleDateString('ar-SA')} إلى {new Date(leave.endDate).toLocaleDateString('ar-SA')}
                            </p>
                            <p className="text-sm text-muted-foreground">{leave.days} أيام</p>
                            {leave.reason && <p className="text-sm mt-1">{leave.reason}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              leave.status === 'approved' ? 'default' :
                                leave.status === 'rejected' ? 'destructive' : 'secondary'
                            }>
                              {leave.status === 'approved' ? 'موافق' :
                                leave.status === 'rejected' ? 'مرفوض' : 'معلق'}
                            </Badge>
                            <div className="flex gap-1">
                              {leave.status === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    title="موافقة"
                                    onClick={() => setApprovalDialog({
                                      open: true,
                                      leaveId: leave.id,
                                      employeeId: leave.employeeId,
                                      leaveType: leave.leaveType,
                                      days: leave.days,
                                      reason: leave.reason,
                                      action: "approve"
                                    })}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    title="رفض"
                                    onClick={() => setApprovalDialog({
                                      open: true,
                                      leaveId: leave.id,
                                      employeeId: leave.employeeId,
                                      leaveType: leave.leaveType,
                                      days: leave.days,
                                      reason: leave.reason,
                                      action: "reject"
                                    })}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              <Button
                                size="sm"
                                variant="destructive"
                                title="حذف الإجازة"
                                onClick={() => {
                                  const reason = prompt("سبب الحذف (اختياري):");
                                  if (reason !== null) {
                                    deleteLeave.mutate({ id: leave.id, reason: reason || undefined });
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">لا توجد طلبات إجازة</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reviews Tab */}
            <TabsContent value="reviews" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>تقييم الأداء</CardTitle>
                      <CardDescription>تقييمات الموظفين والأهداف</CardDescription>
                    </div>
                    <AddPerformanceReviewDialog />
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingReviews ? (
                    <p className="text-center text-muted-foreground py-8">جاري التحميل...</p>
                  ) : reviewsList && reviewsList.length > 0 ? (
                    <div className="space-y-4">
                      {reviewsList.map((review) => (
                        <div key={review.id} className="p-4 border rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{(review as any).employeeName || review.employee?.name || `موظف #${review.employeeId}`}</p>
                            <div className="flex items-center gap-2">
                              {hasFullAccess && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => {
                                    if (confirm("هل أنت متأكد من حذف هذا التقييم؟ سيتم إشعار الموظف.")) {
                                      deleteReview.mutate({ id: review.id });
                                    }
                                  }}
                                  disabled={deleteReview.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                              {review.rating && (
                                <Badge variant="outline">
                                  <Award className="ml-1 h-3 w-3" />
                                  {review.rating}/10
                                </Badge>
                              )}
                              <span className="text-sm text-muted-foreground">
                                {new Date(review.reviewDate).toLocaleDateString('ar-SA')}
                              </span>
                            </div>
                          </div>
                          {review.period && (
                            <p className="text-sm text-muted-foreground">الفترة: {review.period}</p>
                          )}
                          {review.strengths && (
                            <div className="text-sm">
                              <p className="font-medium text-green-600">نقاط القوة:</p>
                              <p className="text-muted-foreground">{review.strengths}</p>
                            </div>
                          )}
                          {review.weaknesses && (
                            <div className="text-sm">
                              <p className="font-medium text-orange-600">نقاط التحسين:</p>
                              <p className="text-muted-foreground">{review.weaknesses}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Award className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">لا توجد تقييمات أداء</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )
        }
      </div >

      {/* Leave Approval Dialog */}
      {
        approvalDialog && (
          <LeaveApprovalDialog
            leaveId={approvalDialog.leaveId}
            employeeId={approvalDialog.employeeId}
            leaveType={approvalDialog.leaveType}
            days={approvalDialog.days}
            reason={approvalDialog.reason}
            open={approvalDialog.open}
            onOpenChange={(open) => {
              if (!open) setApprovalDialog(null);
            }}
            action={approvalDialog.action}
            onSuccess={() => {
              refetchLeaves();
              utils.hr.leaves.list.invalidate(); // Extra safety
            }}
          />
        )
      }
    </DashboardLayout >
  );
}
