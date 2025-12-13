import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Mail, Phone, MapPin, FolderKanban, FileText, ClipboardList } from "lucide-react";

export default function ClientDetails() {
  const params = useParams();
  const clientId = parseInt(params.id || "0");
  const [, setLocation] = useLocation();

  const { data, isLoading } = trpc.clients.getById.useQuery({ id: clientId });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout>
        <div className="text-center py-16">
          <h2 className="text-2xl font-bold mb-4">العميل غير موجود</h2>
          <Button onClick={() => setLocation("/clients")}>
            <ArrowLeft className="ml-2 h-4 w-4" />
            العودة إلى قائمة العملاء
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const { client, projects, invoices, forms } = data;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setLocation("/clients")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{client.name}</h1>
              <p className="text-muted-foreground mt-1">{client.clientNumber}</p>
            </div>
          </div>
        </div>

        {/* Client Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>معلومات العميل</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {client.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">البريد الإلكتروني</p>
                    <p className="font-medium">{client.email}</p>
                  </div>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">رقم الهاتف</p>
                    <p className="font-medium">{client.phone}</p>
                  </div>
                </div>
              )}
              {client.city && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">المدينة</p>
                    <p className="font-medium">{client.city}</p>
                  </div>
                </div>
              )}
            </div>
            {client.address && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">العنوان</p>
                <p className="font-medium">{client.address}</p>
              </div>
            )}
            {client.notes && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">ملاحظات</p>
                <p className="font-medium">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="projects" className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="projects" className="gap-2">
              <FolderKanban className="w-4 h-4" />
              المشاريع ({projects?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="invoices" className="gap-2">
              <FileText className="w-4 h-4" />
              الفواتير ({invoices?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="forms" className="gap-2">
              <ClipboardList className="w-4 h-4" />
              الاستمارات ({forms?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="mt-6">
            {projects && projects.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                  <Card key={project.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <Badge className="w-fit">
                        {project.status === "completed" ? "مكتمل" : 
                         project.status === "execution" ? "قيد التنفيذ" : 
                         project.status === "design" ? "تصميم" : "جديد"}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {project.description || "لا يوجد وصف"}
                      </p>
                      <Button
                        variant="outline"
                        className="w-full mt-4"
                        onClick={() => setLocation(`/projects/${project.id}`)}
                      >
                        عرض التفاصيل
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <FolderKanban className="w-16 h-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">لا توجد مشاريع لهذا العميل</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="invoices" className="mt-6">
            {invoices && invoices.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {invoices.map((invoice) => (
                  <Card key={invoice.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg">{invoice.invoiceNumber}</CardTitle>
                      <Badge className="w-fit">
                        {invoice.type === "invoice" ? "فاتورة" : "عرض سعر"}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm text-muted-foreground">المبلغ الإجمالي</p>
                          <p className="font-bold text-lg">{invoice.total.toLocaleString()} ر.س</p>
                        </div>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setLocation(`/invoices/${invoice.id}`)}
                        >
                          عرض الفاتورة
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <FileText className="w-16 h-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">لا توجد فواتير لهذا العميل</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="forms" className="mt-6">
            {forms && forms.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {forms.map((form) => (
                  <Card key={form.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg">{form.formNumber}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {new Date(form.createdAt).toLocaleDateString('ar-SA')}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setLocation(`/forms/${form.id}`)}
                      >
                        عرض الاستمارة
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <ClipboardList className="w-16 h-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">لا توجد استمارات لهذا العميل</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
