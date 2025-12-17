/*
 © 2025 - Property of [Mohammed Ahmed / Golden Touch Design co.]
 Unauthorized use or reproduction is prohibited.
*/
import { useParams, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  User,
  Calendar,
  DollarSign,
  Award,
  Clock,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  CreditCard
} from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function EmployeeProfile() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const employeeId = params.id ? parseInt(params.id) : 0;

  const { data, isLoading } = trpc.hr.employees.getDetails.useQuery({ id: employeeId });

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      active: "bg-green-500/10 text-green-500",
      on_leave: "bg-yellow-500/10 text-yellow-500",
      terminated: "bg-red-500/10 text-red-500"
    };
    return colorMap[status] || "bg-gray-500/10 text-gray-500";
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      active: "نشط",
      on_leave: "في إجازة",
      terminated: "منتهي الخدمة"
    };
    return statusMap[status] || status;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid gap-6 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <div className="h-16 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const details: any = data;
  if (!details || !details.employee) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <User className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">الموظف غير موجود</h3>
            <Button onClick={() => setLocation("/hr")}>
              <ArrowLeft className="ml-2 h-4 w-4" />
              العودة للموارد البشرية
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const { employee, user, recentAttendance, recentPayroll, activeLeaves, reviews } = details;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/hr")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">{user?.name || "غير محدد"}</h1>
                <p className="text-muted-foreground mt-1">
                  {employee.employeeNumber} • {employee.position || "غير محدد"}
                </p>
              </div>
              <Badge className={getStatusColor(employee.status)}>
                {getStatusLabel(employee.status)}
              </Badge>
            </div>
          </div>
          <Button size="lg" className="gap-2">
            تعديل البيانات
          </Button>
        </div>

        {/* Info Cards */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">الراتب الأساسي</p>
                  <p className="text-2xl font-bold">{(employee.salary || 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">ريال / شهر</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">سنوات الخدمة</p>
                  <p className="text-2xl font-bold">
                    {Math.floor((Date.now() - new Date(employee.hireDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))}
                  </p>
                  <p className="text-xs text-muted-foreground">سنة</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">الحضور هذا الشهر</p>
                  <p className="text-2xl font-bold">{recentAttendance.length}</p>
                  <p className="text-xs text-muted-foreground">يوم</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">التقييمات</p>
                  <p className="text-2xl font-bold">{reviews.length}</p>
                  <p className="text-xs text-muted-foreground">تقييم</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Award className="w-6 h-6 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full max-w-3xl grid-cols-5">
            <TabsTrigger value="info">المعلومات</TabsTrigger>
            <TabsTrigger value="attendance">الحضور</TabsTrigger>
            <TabsTrigger value="payroll">الرواتب</TabsTrigger>
            <TabsTrigger value="leaves">الإجازات</TabsTrigger>
            <TabsTrigger value="reviews">التقييمات</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>المعلومات الشخصية</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">البريد الإلكتروني</p>
                      <p className="font-medium">{user?.email || "غير محدد"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">رقم الطوارئ</p>
                      <p className="font-medium">{employee.emergencyContact || "غير محدد"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Briefcase className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">القسم</p>
                      <p className="font-medium">{employee.department || "غير محدد"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">تاريخ التوظيف</p>
                      <p className="font-medium">{new Date(employee.hireDate).toLocaleDateString("ar-SA")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>المعلومات المالية</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">الراتب الأساسي</p>
                      <p className="font-medium">{(employee.salary || 0).toLocaleString()} ريال</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">الحساب البنكي</p>
                      <p className="font-medium">{employee.bankAccount || "غير محدد"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">الدور في النظام</p>
                      <p className="font-medium">{user?.role === "admin" ? "مدير" : "موظف"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="attendance" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>سجل الحضور</CardTitle>
              </CardHeader>
              <CardContent>
                {recentAttendance && recentAttendance.length > 0 ? (
                  <div className="space-y-3">
                    {recentAttendance.map((record: any) => (
                      <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            record.status === "present" ? "bg-green-500/10" : 
                            record.status === "late" ? "bg-yellow-500/10" : "bg-red-500/10"
                          }`}>
                            <Clock className={`w-5 h-5 ${
                              record.status === "present" ? "text-green-500" : 
                              record.status === "late" ? "text-yellow-500" : "text-red-500"
                            }`} />
                          </div>
                          <div>
                            <p className="font-medium">{new Date(record.date).toLocaleDateString("ar-SA")}</p>
                            <p className="text-sm text-muted-foreground">
                              {record.checkIn ? new Date(record.checkIn).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }) : "-"}
                              {" → "}
                              {record.checkOut ? new Date(record.checkOut).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }) : "-"}
                            </p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="font-medium">{record.hoursWorked || 0} ساعة</p>
                          <Badge className={
                            record.status === "present" ? "bg-green-500/10 text-green-500" :
                            record.status === "late" ? "bg-yellow-500/10 text-yellow-500" :
                            "bg-red-500/10 text-red-500"
                          }>
                            {record.status === "present" ? "حاضر" : record.status === "late" ? "متأخر" : "غائب"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>لا يوجد سجل حضور</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payroll" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>سجل الرواتب</CardTitle>
              </CardHeader>
              <CardContent>
                {recentPayroll && recentPayroll.length > 0 ? (
                  <div className="space-y-3">
                    {recentPayroll.map((record: any) => (
                      <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{record.month}/{record.year}</p>
                            <p className="text-sm text-muted-foreground">
                              أساسي: {record.baseSalary.toLocaleString()} • 
                              مكافآت: {(record.bonuses || 0).toLocaleString()} • 
                              خصومات: {(record.deductions || 0).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-lg">{record.netSalary.toLocaleString()} ريال</p>
                          <Badge className={
                            record.status === "paid" ? "bg-green-500/10 text-green-500" :
                            "bg-yellow-500/10 text-yellow-500"
                          }>
                            {record.status === "paid" ? "مدفوع" : "معلق"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <DollarSign className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>لا يوجد سجل رواتب</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leaves" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>الإجازات النشطة</CardTitle>
              </CardHeader>
              <CardContent>
                {activeLeaves && activeLeaves.length > 0 ? (
                  <div className="space-y-3">
                    {activeLeaves.map((leave: any) => (
                      <div key={leave.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-blue-500" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {new Date(leave.startDate).toLocaleDateString("ar-SA")} - {new Date(leave.endDate).toLocaleDateString("ar-SA")}
                            </p>
                            <p className="text-sm text-muted-foreground">{leave.reason || "بدون سبب"}</p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="font-medium">{leave.days} يوم</p>
                          <Badge className="bg-green-500/10 text-green-500">
                            {leave.leaveType === "annual" ? "سنوية" : 
                             leave.leaveType === "sick" ? "مرضية" :
                             leave.leaveType === "emergency" ? "طارئة" : "بدون راتب"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>لا توجد إجازات نشطة</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>تقييمات الأداء</CardTitle>
              </CardHeader>
              <CardContent>
                {reviews && reviews.length > 0 ? (
                  <div className="space-y-4">
                    {reviews.map((review: any) => (
                      <div key={review.id} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                              <Award className="w-5 h-5 text-yellow-500" />
                            </div>
                            <div>
                              <p className="font-medium">{new Date(review.reviewDate).toLocaleDateString("ar-SA")}</p>
                              <p className="text-sm text-muted-foreground">{review.period || "غير محدد"}</p>
                            </div>
                          </div>
                          {review.rating && (
                            <div className="text-left">
                              <p className="text-2xl font-bold text-yellow-500">{review.rating}/5</p>
                            </div>
                          )}
                        </div>
                        {review.strengths && (
                          <div>
                            <p className="text-sm font-medium text-green-500 mb-1">نقاط القوة:</p>
                            <p className="text-sm text-muted-foreground">{review.strengths}</p>
                          </div>
                        )}
                        {review.weaknesses && (
                          <div>
                            <p className="text-sm font-medium text-red-500 mb-1">نقاط التحسين:</p>
                            <p className="text-sm text-muted-foreground">{review.weaknesses}</p>
                          </div>
                        )}
                        {review.comments && (
                          <div>
                            <p className="text-sm font-medium mb-1">ملاحظات:</p>
                            <p className="text-sm text-muted-foreground">{review.comments}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Award className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>لا توجد تقييمات</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
