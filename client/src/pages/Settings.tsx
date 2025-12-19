import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Save, Upload, Users, Building2, Shield, Database, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import AuthHealth from "@/components/AuthHealth";
import { AddUserDialog } from "@/components/AddUserDialog";

export default function Settings() {
  // const { data: settings, isLoading } = trpc.settings.get.useQuery({ key: 'company' });
  const { data: users } = trpc.users.list.useQuery();
  const utils = trpc.useUtils();
  const setPermissionsMutation = trpc.users.setPermissions.useMutation({
    onSuccess: () => toast.success("تم تحديث الصلاحيات"),
    onError: () => toast.error("تعذر تحديث الصلاحيات"),
  });
  const setPasswordMutation = trpc.users.setPassword.useMutation({
    onSuccess: () => toast.success("تم تعيين كلمة السر بنجاح"),
    onError: (error) => toast.error(error.message || "فشل تعيين كلمة السر"),
  });
  const updateRoleMutation = trpc.users.updateRole.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "تم تغيير الدور بنجاح");
      utils.users.list.invalidate();
    },
    onError: (error) => toast.error(error.message || "فشل تغيير الدور"),
  });
  const [openPermUserId, setOpenPermUserId] = useState<number | null>(null);
  const [permState, setPermState] = useState<Record<string, boolean>>({
    dashboard: true,
    clients: true,
    projects: true,
    invoices: true,
    forms: true,
    accounting: false,
    hr: false,
    audit: false,
    settings: false
  });

  const [companyData, setCompanyData] = useState({
    name: "Golden Touch Design",
    commercialRegister: "7017891396",
    phone: "+966 XX XXX XXXX",
    email: "info@goldentouch.sa",
    address: "الرياض، حي السفارات",
    website: "www.goldentouch.sa"
  });

  const updateSettings = trpc.settings.set.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ الإعدادات بنجاح");
    },
    onError: () => {
      toast.error("حدث خطأ أثناء حفظ الإعدادات");
    }
  });
  const uploadFile = trpc.files.upload.useMutation({
    onError: () => toast.error("تعذر رفع الملف"),
  });
  const [stampUrl, setStampUrl] = useState<string | null>(null);
  const [barcodeUrl, setBarcodeUrl] = useState<string | null>(null);
  const { data: appLogo } = trpc.settings.get.useQuery({ key: "companyLogoUrl" });
  const { data: appBarcode } = trpc.settings.get.useQuery({ key: "companyBarcodeUrl" });
  const { data: savedStamp } = trpc.settings.get.useQuery({ key: "companyStampUrl" });
  const { data: savedBarcode } = trpc.settings.get.useQuery({ key: "companyBarcodeUrl" });
  const { data: injectLogo } = trpc.settings.get.useQuery({ key: "invoiceInjectLogo" });
  const { data: injectBarcode } = trpc.settings.get.useQuery({ key: "invoiceInjectBarcode" });

  // Load saved stamp and barcode URLs from database
  useEffect(() => {
    if (savedStamp?.settingValue) {
      setStampUrl(savedStamp.settingValue);
    }
    if (savedBarcode?.settingValue) {
      setBarcodeUrl(savedBarcode.settingValue);
    }
  }, [savedStamp, savedBarcode]);

  const [appSettings, setAppSettings] = useState({
    invoiceInjectLogo: true,
    invoiceInjectBarcode: true,
  });
  const saveAppSetting = (key: string, value: string) =>
    updateSettings.mutate({ key, value });

  const handleSaveCompany = () => {
    updateSettings.mutate({
      key: 'company',
      value: JSON.stringify(companyData)
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">الإعدادات</h1>
          <p className="text-muted-foreground">إدارة إعدادات النظام والشركة</p>
        </div>

        <Tabs defaultValue="company" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="company">
              <Building2 className="w-4 h-4 ml-2" />
              معلومات الشركة
            </TabsTrigger>
            <TabsTrigger value="app">
              <Shield className="w-4 h-4 ml-2" />
              إعدادات التطبيق
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="w-4 h-4 ml-2" />
              المستخدمين
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="w-4 h-4 ml-2" />
              الأمان
            </TabsTrigger>
            <TabsTrigger value="backup">
              <Database className="w-4 h-4 ml-2" />
              النسخ الاحتياطي
            </TabsTrigger>
            <TabsTrigger value="approvals">
              <Shield className="w-4 h-4 ml-2" />
              طلبات الاعتماد
            </TabsTrigger>
          </TabsList>

          {/* Company Settings */}
          <TabsContent value="company" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>معلومات الشركة</CardTitle>
                <CardDescription>تحديث بيانات الشركة الأساسية</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">اسم الشركة</Label>
                    <Input
                      id="companyName"
                      value={companyData.name}
                      onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="commercialRegister">رقم السجل التجاري</Label>
                    <Input
                      id="commercialRegister"
                      value={companyData.commercialRegister}
                      onChange={(e) => setCompanyData({ ...companyData, commercialRegister: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">رقم الهاتف</Label>
                    <Input
                      id="phone"
                      value={companyData.phone}
                      onChange={(e) => setCompanyData({ ...companyData, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">البريد الإلكتروني</Label>
                    <Input
                      id="email"
                      type="email"
                      value={companyData.email}
                      onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">الموقع الإلكتروني</Label>
                    <Input
                      id="website"
                      value={companyData.website}
                      onChange={(e) => setCompanyData({ ...companyData, website: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">العنوان</Label>
                    <Input
                      id="address"
                      value={companyData.address}
                      onChange={(e) => setCompanyData({ ...companyData, address: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logo">شعار الشركة</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center">
                      <img src={appLogo?.settingValue || "/logo.png"} alt="Logo" className="max-w-full max-h-full p-2" />
                    </div>
                    <Button variant="outline">
                      <Upload className="w-4 h-4 ml-2" />
                      تحميل شعار جديد
                    </Button>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>صورة الختم</Label>
                    <div className="flex items-center gap-4">
                      <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center">
                        {stampUrl ? (
                          <img src={stampUrl} alt="Stamp" className="max-w-full max-h-full p-2" />
                        ) : (
                          <span className="text-xs text-muted-foreground">لا يوجد</span>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = async () => {
                            const base64 = (reader.result as string).split(",")[1];
                            const res = await uploadFile.mutateAsync({
                              entityType: "setting",
                              entityId: 0,
                              fileName: file.name,
                              fileData: base64,
                              mimeType: file.type
                            });
                            setStampUrl(res.url);
                            updateSettings.mutate({ key: "companyStampUrl", value: res.url });
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                      {stampUrl && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setStampUrl(null);
                            updateSettings.mutate({ key: "companyStampUrl", value: "" });
                            toast.success("تم حذف صورة الختم");
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>صورة الباركود</Label>
                    <div className="flex items-center gap-4">
                      <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center">
                        {barcodeUrl ? (
                          <img src={barcodeUrl} alt="Barcode" className="max-w-full max-h-full p-2" />
                        ) : (
                          <span className="text-xs text-muted-foreground">لا يوجد</span>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = async () => {
                            const base64 = (reader.result as string).split(",")[1];
                            const res = await uploadFile.mutateAsync({
                              entityType: "setting",
                              entityId: 0,
                              fileName: file.name,
                              fileData: base64,
                              mimeType: file.type
                            });
                            setBarcodeUrl(res.url);
                            updateSettings.mutate({ key: "companyBarcodeUrl", value: res.url });
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                      {barcodeUrl && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setBarcodeUrl(null);
                            updateSettings.mutate({ key: "companyBarcodeUrl", value: "" });
                            toast.success("تم حذف صورة الباركود");
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <Button onClick={handleSaveCompany} disabled={updateSettings.isPending}>
                  <Save className="w-4 h-4 ml-2" />
                  {updateSettings.isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* App Settings */}
          <TabsContent value="app" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>إعدادات التطبيق</CardTitle>
                <CardDescription>تعديل سلوك القوالب والحقن دون الحاجة لتعديل الملفات</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>رابط شعار الشركة المستخدم بالقوالب</Label>
                    <div className="flex items-center gap-3">
                      <Input defaultValue={appLogo?.settingValue || ""} placeholder="/logo.png"
                        onBlur={(e) => saveAppSetting("companyLogoUrl", e.target.value || "/logo.png")}
                      />
                      <Button variant="outline" onClick={() => saveAppSetting("companyLogoUrl", appLogo?.settingValue || "/logo.png")}>
                        حفظ
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>رابط الباركود المستخدم بالقوالب</Label>
                    <div className="flex items-center gap-3">
                      <Input defaultValue={appBarcode?.settingValue || ""} placeholder="/barcode.jpg"
                        onBlur={(e) => saveAppSetting("companyBarcodeUrl", e.target.value || "/barcode.jpg")}
                      />
                      <Button variant="outline" onClick={() => saveAppSetting("companyBarcodeUrl", appBarcode?.settingValue || "/barcode.jpg")}>
                        حفظ
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>إظهار الشعار داخل صفحة الفاتورة</Label>
                      <p className="text-sm text-muted-foreground">يتم حقن الشعار داخل الحامل أعلى الصفحة</p>
                    </div>
                    <Switch
                      checked={(injectLogo?.settingValue ?? "true") === "true"}
                      onCheckedChange={(val) => saveAppSetting("invoiceInjectLogo", val ? "true" : "false")}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>إظهار الباركود داخل صفحة الفاتورة</Label>
                      <p className="text-sm text-muted-foreground">يتم حقن الباركود داخل الحامل أسفل الصفحة</p>
                    </div>
                    <Switch
                      checked={(injectBarcode?.settingValue ?? "true") === "true"}
                      onCheckedChange={(val) => saveAppSetting("invoiceInjectBarcode", val ? "true" : "false")}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Management */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>إدارة المستخدمين</CardTitle>
                    <CardDescription>عرض وإدارة مستخدمي النظام</CardDescription>
                  </div>
                  <AddUserDialog />
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الاسم</TableHead>
                      <TableHead>البريد الإلكتروني</TableHead>
                      <TableHead>الدور</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>آخر تسجيل دخول</TableHead>
                      <TableHead className="text-left">الصلاحيات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users && users.length > 0 ? (
                      users.map((user: any) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Select
                              value={user.role}
                              onValueChange={(newRole) => {
                                updateRoleMutation.mutate({ userId: user.id, role: newRole as any });
                              }}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">مدير عام</SelectItem>
                                <SelectItem value="department_manager">مدير قسم</SelectItem>
                                <SelectItem value="project_manager">مدير مشاريع</SelectItem>
                                <SelectItem value="project_coordinator">منسق مشاريع</SelectItem>
                                <SelectItem value="architect">مهندس معماري</SelectItem>
                                <SelectItem value="interior_designer">مصمم داخلي</SelectItem>
                                <SelectItem value="site_engineer">مهندس موقع</SelectItem>
                                <SelectItem value="planning_engineer">مهندس تخطيط</SelectItem>
                                <SelectItem value="designer">مصمم</SelectItem>
                                <SelectItem value="technician">فني</SelectItem>
                                <SelectItem value="finance_manager">مدير مالي</SelectItem>
                                <SelectItem value="accountant">محاسب</SelectItem>
                                <SelectItem value="sales_manager">مسؤول مبيعات</SelectItem>
                                <SelectItem value="hr_manager">مسؤول موارد بشرية</SelectItem>
                                <SelectItem value="admin_assistant">مساعد إداري</SelectItem>
                                <SelectItem value="procurement_officer">مسؤول مشتريات</SelectItem>
                                <SelectItem value="storekeeper">أمين مخازن</SelectItem>
                                <SelectItem value="qa_qc">مسؤول جودة</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                              {user.isActive ? 'نشط' : 'غير نشط'}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(user.lastSignedIn).toLocaleDateString('ar-SA')}
                          </TableCell>
                          <TableCell className="text-left">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                const opening = openPermUserId !== user.id;
                                setOpenPermUserId(opening ? user.id : null);
                                if (opening) {
                                  const perms = await utils.users.getPermissions.fetch({ userId: user.id });
                                  setPermState({
                                    dashboard: perms.dashboard ?? true,
                                    clients: perms.clients ?? true,
                                    projects: perms.projects ?? true,
                                    invoices: perms.invoices ?? true,
                                    forms: perms.forms ?? true,
                                    accounting: perms.accounting ?? false,
                                    hr: perms.hr ?? false,
                                    audit: perms.audit ?? false,
                                    settings: perms.settings ?? false
                                  });
                                }
                              }}
                            >
                              صلاحيات
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={setPasswordMutation.isPending}
                              onClick={() => {
                                const newPassword = prompt("أدخل كلمة سر جديدة (4 أحرف على الأقل):");
                                if (newPassword && newPassword.length >= 4) {
                                  setPasswordMutation.mutate({ userId: user.id, password: newPassword });
                                } else if (newPassword) {
                                  toast.error("كلمة السر يجب أن تكون 4 أحرف على الأقل");
                                }
                              }}
                            >
                              {setPasswordMutation.isPending ? "جاري..." : "كلمة سر"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          لا توجد بيانات
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {openPermUserId && (
                  <div className="mt-4 p-4 border rounded-lg">
                    <h4 className="font-medium mb-3">تحديد صلاحيات الوصول</h4>
                    <div className="grid md:grid-cols-3 gap-3">
                      {[
                        { key: 'dashboard', label: 'لوحة التحكم' },
                        { key: 'clients', label: 'العملاء' },
                        { key: 'projects', label: 'المشاريع' },
                        { key: 'invoices', label: 'الفواتير والعروض' },
                        { key: 'forms', label: 'الاستمارات' },
                        { key: 'accounting', label: 'المحاسبة' },
                        { key: 'hr', label: 'شؤون الموظفين' },
                        { key: 'audit', label: 'سجل النشاطات' },
                        { key: 'settings', label: 'الإعدادات' },
                      ].map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={permState[key]}
                            onChange={(e) => setPermState({ ...permState, [key]: e.target.checked })}
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        onClick={() => {
                          setPermissionsMutation.mutate({
                            userId: openPermUserId,
                            permissions: permState
                          });
                        }}
                      >
                        حفظ الصلاحيات
                      </Button>
                      <Button variant="outline" onClick={() => setOpenPermUserId(null)}>إغلاق</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>إعدادات الأمان</CardTitle>
                <CardDescription>إدارة خيارات الأمان والخصوصية</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">فحص صحة الدخول</h3>
                      <p className="text-sm text-muted-foreground">عرض حالة الإعدادات الأساسية لتسجيل الدخول</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => window.location.href = "/accounting"}
                    >
                      فتح التقارير
                    </Button>
                  </div>
                  <div className="mt-4 grid md:grid-cols-2 gap-3">
                    <AuthHealth />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>المصادقة الثنائية</Label>
                    <p className="text-sm text-muted-foreground">تفعيل المصادقة الثنائية لجميع المستخدمين</p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>تسجيل النشاطات</Label>
                    <p className="text-sm text-muted-foreground">حفظ سجل بجميع الإجراءات في النظام</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>إشعارات الأمان</Label>
                    <p className="text-sm text-muted-foreground">إرسال تنبيهات عند محاولات الدخول المشبوهة</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>انتهاء الجلسة التلقائي</Label>
                    <p className="text-sm text-muted-foreground">تسجيل الخروج التلقائي بعد فترة عدم النشاط</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Backup Settings */}
          <TabsContent value="backup" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>النسخ الاحتياطي</CardTitle>
                <CardDescription>إدارة النسخ الاحتياطية للبيانات</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">نسخة احتياطية يدوية</h3>
                      <p className="text-sm text-muted-foreground">إنشاء نسخة احتياطية فورية من جميع البيانات</p>
                    </div>
                    <Button variant="outline">
                      <Database className="w-4 h-4 ml-2" />
                      إنشاء نسخة
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">النسخ الاحتياطي التلقائي</h3>
                      <p className="text-sm text-muted-foreground">جدولة نسخ احتياطية دورية</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="space-y-2">
                    <Label>تكرار النسخ الاحتياطي</Label>
                    <select className="w-full p-2 border rounded-md">
                      <option>يومي</option>
                      <option>أسبوعي</option>
                      <option>شهري</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-medium">النسخ الاحتياطية السابقة</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="text-sm font-medium">نسخة احتياطية - {new Date().toLocaleDateString('ar-SA')}</p>
                          <p className="text-xs text-muted-foreground">الحجم: 2.5 MB</p>
                        </div>
                        <Button variant="outline" size="sm">تحميل</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Approval Requests */}
          <TabsContent value="approvals" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>طلبات الاعتماد</CardTitle>
                <CardDescription>مراجعة واعتماد أو رفض طلبات المحاسبة</CardDescription>
              </CardHeader>
              <CardContent>
                <ApprovalsSection />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// Approvals Section Component
function ApprovalsSection() {
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

  if (isLoading) {
    return <p className="text-center text-muted-foreground">جاري التحميل...</p>;
  }

  if (!pendingRequests || pendingRequests.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Shield className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p>لا توجد طلبات معلقة</p>
      </div>
    );
  }

  return (
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
  );
}
