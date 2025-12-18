/*
 © 2025 - Property of [Mohammed Ahmed / Golden Touch Design co.]
 Unauthorized use or reproduction is prohibited.
*/
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Plus, Download, TrendingUp, TrendingDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AddSaleDialog } from "@/components/AddSaleDialog";
import { AddPurchaseDialog } from "@/components/AddPurchaseDialog";
import { AddInstallmentDialog } from "@/components/AddInstallmentDialog";

export default function Accounting() {
  const { data: expenses, isLoading: loadingExpenses } = trpc.accounting.expenses.list.useQuery({});
  // Removed installments section per requirement
  const { data: salesList, isLoading: loadingSales } = trpc.accounting.sales.list.useQuery();
  const { data: purchasesList, isLoading: loadingPurchases } = trpc.accounting.purchases.list.useQuery();
  const { data: overallFinancials } = trpc.accounting.reports.overallFinancials.useQuery();
  const { data: projects } = trpc.projects.list.useQuery();
  const utils = trpc.useUtils();
  const summary = {
    totalRevenue: overallFinancials?.paidRevenue || 0,
    totalExpenses: overallFinancials?.totalExpenses || 0
  };

  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseData, setExpenseData] = useState({
    category: "",
    description: "",
    amount: "",
    date: new Date().toISOString().split('T')[0]
  });


  const createExpense = trpc.accounting.expenses.create.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة التكلفة بنجاح");
      setShowExpenseForm(false);
      setExpenseData({ category: "", description: "", amount: "", date: new Date().toISOString().split('T')[0] });
      utils.accounting.expenses.list.invalidate({});
      utils.accounting.reports.overallFinancials.invalidate();
    },
    onError: () => {
      toast.error("حدث خطأ أثناء إضافة التكلفة");
    }
  });
  const cancelExpense = trpc.accounting.expenses.cancel.useMutation({
    onSuccess: () => {
      toast.success("تم إلغاء المصروف");
      utils.accounting.expenses.list.invalidate();
      utils.accounting.reports.overallFinancials.invalidate();
    },
    onError: () => toast.error("تعذر إلغاء المصروف"),
  });
  const deleteExpense = trpc.accounting.expenses.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف المصروف");
      utils.accounting.expenses.list.invalidate();
    },
    onError: () => toast.error("تعذر حذف المصروف"),
  });
  const cancelSale = trpc.accounting.sales.cancel.useMutation({
    onSuccess: () => {
      toast.success("تم إلغاء عملية البيع");
      utils.accounting.sales.list.invalidate();
      utils.accounting.reports.overallFinancials.invalidate();
    },
    onError: () => {
      toast.error("تعذر إلغاء عملية البيع");
    }
  });
  const updateSale = trpc.accounting.sales.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث عملية البيع");
      utils.accounting.sales.list.invalidate();
      utils.accounting.reports.overallFinancials.invalidate();
    },
    onError: () => toast.error("تعذر تحديث عملية البيع"),
  });
  const deleteSale = trpc.accounting.sales.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف عملية البيع");
      utils.accounting.sales.list.invalidate();
      utils.accounting.reports.overallFinancials.invalidate();
    },
    onError: () => toast.error("تعذر حذف عملية البيع"),
  });
  const cancelPurchase = trpc.accounting.purchases.cancel.useMutation({
    onSuccess: () => {
      toast.success("تم إلغاء عملية الشراء");
      utils.accounting.purchases.list.invalidate();
      utils.accounting.reports.overallFinancials.invalidate();
    },
    onError: () => {
      toast.error("تعذر إلغاء عملية الشراء");
    }
  });
  const updatePurchase = trpc.accounting.purchases.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث عملية الشراء");
      utils.accounting.purchases.list.invalidate();
      utils.accounting.reports.overallFinancials.invalidate();
    },
    onError: () => toast.error("تعذر تحديث عملية الشراء"),
  });
  const deletePurchase = trpc.accounting.purchases.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف عملية الشراء");
      utils.accounting.purchases.list.invalidate();
      utils.accounting.reports.overallFinancials.invalidate();
    },
    onError: () => toast.error("تعذر حذف عملية الشراء"),
  });
  const cancelInstallment = trpc.accounting.installments.cancel.useMutation({
    onSuccess: () => {
      toast.success("تم إلغاء القسط");
      utils.accounting.reports.overallFinancials.invalidate();
    },
    onError: () => toast.error("تعذر إلغاء القسط"),
  });

  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    createExpense.mutate({
      projectId: 0,
      category: expenseData.category,
      description: expenseData.description,
      amount: parseFloat(expenseData.amount),
      expenseDate: expenseData.date
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">المحاسبة</h1>
            <p className="text-muted-foreground">إدارة التكاليف والمصروفات والأقساط</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {summary?.totalRevenue?.toLocaleString() || 0} ر.س
              </div>
              <p className="text-xs text-muted-foreground">من الفواتير المدفوعة</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي المبيعات</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {salesList?.filter((s: any) => s.status === 'completed').reduce((a: number, s: any) => a + (s.amount || 0), 0).toLocaleString() || 0} ر.س
              </div>
              <p className="text-xs text-muted-foreground">{salesList?.filter((s: any) => s.status === 'completed').length || 0} عملية بيع</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي المشتريات</CardTitle>
              <TrendingDown className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {purchasesList?.filter((p: any) => p.status === 'completed').reduce((a: number, p: any) => a + (p.amount || 0), 0).toLocaleString() || 0} ر.س
              </div>
              <p className="text-xs text-muted-foreground">{purchasesList?.filter((p: any) => p.status === 'completed').length || 0} عملية شراء</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي المصروفات</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {summary?.totalExpenses?.toLocaleString() || 0} ر.س
              </div>
              <p className="text-xs text-muted-foreground">التكاليف التشغيلية</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">صافي الربح</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {((summary?.totalRevenue || 0) - (summary?.totalExpenses || 0)).toLocaleString()} ر.س
              </div>
              <p className="text-xs text-muted-foreground">الإيرادات - المصروفات</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="expenses" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="expenses">التكاليف</TabsTrigger>
            <TabsTrigger value="sales">المبيعات</TabsTrigger>
            <TabsTrigger value="purchases">المشتريات</TabsTrigger>
            <TabsTrigger value="reports">التقارير</TabsTrigger>
          </TabsList>

          {/* Expenses Tab */}
          <TabsContent value="expenses" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>التكاليف التشغيلية</CardTitle>
                  <Button onClick={() => setShowExpenseForm(!showExpenseForm)}>
                    <Plus className="w-4 h-4 ml-2" />
                    إضافة تكلفة
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {showExpenseForm && (
                  <form onSubmit={handleSubmitExpense} className="grid gap-4 p-4 border rounded-lg bg-accent/50">
                    <div className="grid gap-2">
                      <Label htmlFor="category">الفئة</Label>
                      <Input
                        id="category"
                        value={expenseData.category}
                        onChange={(e) => setExpenseData({ ...expenseData, category: e.target.value })}
                        placeholder="مثال: رواتب، إيجار، مواد..."
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">الوصف</Label>
                      <Input
                        id="description"
                        value={expenseData.description}
                        onChange={(e) => setExpenseData({ ...expenseData, description: e.target.value })}
                        placeholder="تفاصيل التكلفة"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="amount">المبلغ (ر.س)</Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          value={expenseData.amount}
                          onChange={(e) => setExpenseData({ ...expenseData, amount: e.target.value })}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="date">التاريخ</Label>
                        <Input
                          id="date"
                          type="date"
                          value={expenseData.date}
                          onChange={(e) => setExpenseData({ ...expenseData, date: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={createExpense.isPending}>
                        {createExpense.isPending ? "جاري الحفظ..." : "حفظ"}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setShowExpenseForm(false)}>
                        إلغاء
                      </Button>
                    </div>
                  </form>
                )}

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>الفئة</TableHead>
                      <TableHead>الوصف</TableHead>
                      <TableHead className="text-left">المبلغ</TableHead>
                      <TableHead className="text-left">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingExpenses ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center">جاري التحميل...</TableCell>
                      </TableRow>
                    ) : expenses && expenses.length > 0 ? (
                      expenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell>{new Date(expense.expenseDate).toLocaleDateString('ar-SA')}</TableCell>
                          <TableCell>{expense.category}</TableCell>
                          <TableCell>{expense.description}</TableCell>
                          <TableCell className="text-left font-medium">{expense.amount.toLocaleString()} ر.س</TableCell>
                          <TableCell className="text-left">
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => cancelExpense.mutate({ id: expense.id })}
                              >
                                إلغاء
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteExpense.mutate({ id: expense.id })}
                              >
                                حذف
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          لا توجد تكاليف مسجلة
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>



          {/* Sales Tab */}
          <TabsContent value="sales" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>المبيعات</CardTitle>
                  <AddSaleDialog />
                </div>
              </CardHeader>
              <CardContent>
                {loadingSales ? (
                  <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>
                ) : salesList && salesList.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>رقم العملية</TableHead>
                        <TableHead>المشروع</TableHead>
                        <TableHead>الوصف</TableHead>
                        <TableHead>المبلغ</TableHead>
                        <TableHead>طريقة الدفع</TableHead>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead className="text-left">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesList.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell className="font-medium">{sale.saleNumber}</TableCell>
                          <TableCell>
                            <select
                              defaultValue={String(sale.projectId ?? "")}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateSale.mutate({ id: sale.id, projectId: val ? Number(val) : undefined });
                              }}
                              className="border rounded p-1 text-sm"
                            >
                              <option value="">بدون</option>
                              {(projects || []).map((p: any) => (
                                <option key={p.id} value={String(p.id)}>{p.name}</option>
                              ))}
                            </select>
                          </TableCell>
                          <TableCell>
                            <Input
                              defaultValue={sale.description}
                              onBlur={(e) => {
                                const v = e.target.value;
                                if (v !== sale.description) updateSale.mutate({ id: sale.id, description: v });
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-green-600 font-semibold">
                            <Input
                              type="number"
                              defaultValue={sale.amount}
                              onBlur={(e) => {
                                const v = Number(e.target.value);
                                if (!Number.isNaN(v) && v !== sale.amount) updateSale.mutate({ id: sale.id, amount: v });
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <select
                              defaultValue={sale.paymentMethod}
                              onChange={(e) => updateSale.mutate({ id: sale.id, paymentMethod: e.target.value as any })}
                              className="border rounded p-1 text-sm"
                            >
                              <option value="cash">نقدي</option>
                              <option value="bank_transfer">تحويل بنكي</option>
                              <option value="check">شيك</option>
                              <option value="credit">آجل</option>
                            </select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="date"
                              defaultValue={new Date(sale.saleDate).toISOString().slice(0, 10)}
                              onBlur={(e) => {
                                const v = e.target.value;
                                updateSale.mutate({ id: sale.id, saleDate: v });
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs ${sale.status === 'completed' ? 'bg-green-100 text-green-800' :
                              sale.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                              {sale.status === 'completed' && 'مكتمل'}
                              {sale.status === 'pending' && 'قيد المعالجة'}
                              {sale.status === 'cancelled' && 'ملغي'}
                            </span>
                          </TableCell>
                          <TableCell className="text-left">
                            <div className="flex gap-2 justify-end">
                              {sale.status !== 'cancelled' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => cancelSale.mutate({ id: sale.id })}
                                >
                                  إلغاء
                                </Button>
                              )}
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteSale.mutate({ id: sale.id })}
                              >
                                حذف
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center py-12 text-muted-foreground">لا توجد عمليات بيع حالياً</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Purchases Tab */}
          <TabsContent value="purchases" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>المشتريات</CardTitle>
                  <AddPurchaseDialog />
                </div>
              </CardHeader>
              <CardContent>
                {loadingPurchases ? (
                  <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>
                ) : purchasesList && purchasesList.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>رقم العملية</TableHead>
                        <TableHead>المشروع</TableHead>
                        <TableHead>المورد</TableHead>
                        <TableHead>الوصف</TableHead>
                        <TableHead>المبلغ</TableHead>
                        <TableHead>طريقة الدفع</TableHead>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead className="text-left">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchasesList.map((purchase) => (
                        <TableRow key={purchase.id}>
                          <TableCell className="font-medium">{purchase.purchaseNumber}</TableCell>
                          <TableCell>
                            <select
                              defaultValue={String(purchase.projectId ?? "")}
                              onChange={(e) => {
                                const val = e.target.value;
                                updatePurchase.mutate({ id: purchase.id, projectId: val ? Number(val) : undefined });
                              }}
                              className="border rounded p-1 text-sm"
                            >
                              <option value="">بدون</option>
                              {(projects || []).map((p: any) => (
                                <option key={p.id} value={String(p.id)}>{p.name}</option>
                              ))}
                            </select>
                          </TableCell>
                          <TableCell>{purchase.supplierName}</TableCell>
                          <TableCell>
                            <Input
                              defaultValue={purchase.description}
                              onBlur={(e) => {
                                const v = e.target.value;
                                if (v !== purchase.description) updatePurchase.mutate({ id: purchase.id, description: v });
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-red-600 font-semibold">
                            <Input
                              type="number"
                              defaultValue={purchase.amount}
                              onBlur={(e) => {
                                const v = Number(e.target.value);
                                if (!Number.isNaN(v) && v !== purchase.amount) updatePurchase.mutate({ id: purchase.id, amount: v });
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <select
                              defaultValue={purchase.paymentMethod}
                              onChange={(e) => updatePurchase.mutate({ id: purchase.id, paymentMethod: e.target.value as any })}
                              className="border rounded p-1 text-sm"
                            >
                              <option value="cash">نقدي</option>
                              <option value="bank_transfer">تحويل بنكي</option>
                              <option value="check">شيك</option>
                              <option value="credit">آجل</option>
                            </select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="date"
                              defaultValue={new Date(purchase.purchaseDate).toISOString().slice(0, 10)}
                              onBlur={(e) => {
                                const v = e.target.value;
                                updatePurchase.mutate({ id: purchase.id, purchaseDate: v });
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs ${purchase.status === 'completed' ? 'bg-green-100 text-green-800' :
                              purchase.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                              {purchase.status === 'completed' && 'مكتمل'}
                              {purchase.status === 'pending' && 'قيد المعالجة'}
                              {purchase.status === 'cancelled' && 'ملغي'}
                            </span>
                          </TableCell>
                          <TableCell className="text-left">
                            <div className="flex gap-2 justify-end">
                              {purchase.status !== 'cancelled' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => cancelPurchase.mutate({ id: purchase.id })}
                                >
                                  إلغاء
                                </Button>
                              )}
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deletePurchase.mutate({ id: purchase.id })}
                              >
                                حذف
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center py-12 text-muted-foreground">لا توجد عمليات شراء حالياً</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>التقارير المالية</CardTitle>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const html = `
                        <!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>التقرير المالي</title>
                        <style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto;padding:24px}
                        .card{border:1px solid #ddd;padding:16px;margin:8px 0;border-radius:8px}
                        .green{color:#16a34a}.red{color:#dc2626}.blue{color:#2563eb}
                        table{width:100%;border-collapse:collapse;margin:16px 0}
                        th,td{border:1px solid #ddd;padding:8px;text-align:right}
                        th{background:#f3f4f6}</style>
                        </head><body>
                        <h1>التقرير المالي الشامل</h1>
                        <p>تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA')}</p>
                        <div class="card">
                          <h3>ملخص مالي</h3>
                          <p>إجمالي الإيرادات: <span class="green">${(summary.totalRevenue || 0).toLocaleString()} ر.س</span></p>
                          <p>إجمالي المصروفات: <span class="red">${(summary.totalExpenses || 0).toLocaleString()} ر.س</span></p>
                          <p>صافي الربح: <span class="blue">${(((summary.totalRevenue || 0) - (summary.totalExpenses || 0)) || 0).toLocaleString()} ر.س</span></p>
                        </div>
                        <div class="card">
                          <h3>تفاصيل الإيرادات</h3>
                          <p>عدد عمليات البيع: ${salesList?.length || 0}</p>
                          <p>إجمالي المبيعات المكتملة: ${salesList?.filter((s: any) => s.status === 'completed').reduce((a: number, s: any) => a + (s.amount || 0), 0).toLocaleString() || 0} ر.س</p>
                        </div>
                        <div class="card">
                          <h3>تفاصيل المصروفات</h3>
                          <p>عدد المصروفات: ${expenses?.length || 0}</p>
                          <p>عدد المشتريات: ${purchasesList?.length || 0}</p>
                        </div>
                        <script>window.onload=function(){window.print()}</script>
                        </body></html>`;
                      const w = window.open("", "_blank");
                      if (!w) return;
                      w.document.write(html);
                      w.document.close();
                    }}
                  >
                    <Download className="w-4 h-4 ml-2" />
                    طباعة التقرير
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Financial Summary */}
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="p-4 border rounded-lg bg-green-50">
                      <h3 className="font-medium text-green-800 mb-1">إجمالي المبيعات</h3>
                      <p className="text-2xl font-bold text-green-600">
                        {salesList?.filter((s: any) => s.status === 'completed').reduce((a: number, s: any) => a + (s.amount || 0), 0).toLocaleString() || 0} ر.س
                      </p>
                      <p className="text-xs text-muted-foreground">{salesList?.filter((s: any) => s.status === 'completed').length || 0} عملية مكتملة</p>
                    </div>
                    <div className="p-4 border rounded-lg bg-red-50">
                      <h3 className="font-medium text-red-800 mb-1">إجمالي المشتريات</h3>
                      <p className="text-2xl font-bold text-red-600">
                        {purchasesList?.filter((p: any) => p.status === 'completed').reduce((a: number, p: any) => a + (p.amount || 0), 0).toLocaleString() || 0} ر.س
                      </p>
                      <p className="text-xs text-muted-foreground">{purchasesList?.filter((p: any) => p.status === 'completed').length || 0} عملية مكتملة</p>
                    </div>
                    <div className="p-4 border rounded-lg bg-orange-50">
                      <h3 className="font-medium text-orange-800 mb-1">إجمالي التكاليف</h3>
                      <p className="text-2xl font-bold text-orange-600">
                        {expenses?.reduce((a: number, e: any) => a + (e.amount || 0), 0).toLocaleString() || 0} ر.س
                      </p>
                      <p className="text-xs text-muted-foreground">{expenses?.length || 0} تكلفة</p>
                    </div>
                    <div className="p-4 border rounded-lg bg-blue-50">
                      <h3 className="font-medium text-blue-800 mb-1">صافي الربح</h3>
                      <p className="text-2xl font-bold text-blue-600">
                        {((summary.totalRevenue || 0) - (summary.totalExpenses || 0)).toLocaleString()} ر.س
                      </p>
                      <p className="text-xs text-muted-foreground">الإيرادات - المصروفات</p>
                    </div>
                  </div>

                  {/* Reports List */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-medium mb-2">تفاصيل المبيعات</h3>
                      {salesList && salesList.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>الوصف</TableHead>
                              <TableHead>المبلغ</TableHead>
                              <TableHead>الحالة</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {salesList.slice(0, 5).map((sale) => (
                              <TableRow key={sale.id}>
                                <TableCell>{sale.description}</TableCell>
                                <TableCell className="text-green-600">{sale.amount?.toLocaleString()} ر.س</TableCell>
                                <TableCell>
                                  <span className={`px-2 py-1 rounded text-xs ${sale.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                    {sale.status === 'completed' ? 'مكتمل' : 'قيد المعالجة'}
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <p className="text-muted-foreground text-sm">لا توجد مبيعات</p>
                      )}
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-medium mb-2">تفاصيل المشتريات</h3>
                      {purchasesList && purchasesList.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>الوصف</TableHead>
                              <TableHead>المبلغ</TableHead>
                              <TableHead>الحالة</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {purchasesList.slice(0, 5).map((purchase) => (
                              <TableRow key={purchase.id}>
                                <TableCell>{purchase.description}</TableCell>
                                <TableCell className="text-red-600">{purchase.amount?.toLocaleString()} ر.س</TableCell>
                                <TableCell>
                                  <span className={`px-2 py-1 rounded text-xs ${purchase.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                    {purchase.status === 'completed' ? 'مكتمل' : 'قيد المعالجة'}
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <p className="text-muted-foreground text-sm">لا توجد مشتريات</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
