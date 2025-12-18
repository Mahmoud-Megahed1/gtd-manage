/*
 © 2025 - Property of [Mohammed Ahmed / Golden Touch Design co.]
 Unauthorized use or reproduction is prohibited.
*/
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Plus, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function Forms() {
  const { data: forms, isLoading } = trpc.forms.list.useQuery();
  const [activeTab, setActiveTab] = useState<"requests" | "modifications">("requests");
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const deleteForm = trpc.forms.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الاستمارة بنجاح");
    },
    onError: () => {
      toast.error("تعذر حذف الاستمارة");
    }
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">الاستمارات</h1>
            <p className="text-muted-foreground mt-2">
              إدارة استمارات طلبات العملاء وتعديلاتهم
            </p>
          </div>
        </div>

        <Tabs defaultValue="requests" value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="requests">طلبات العملاء</TabsTrigger>
            <TabsTrigger value="modifications">تعديلات العملاء</TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="mt-6 space-y-6">
            <div className="flex gap-2 justify-end">
              <Button size="lg" variant="outline" onClick={() => setLocation('/clinthope')}>
                اضافة استمارة
              </Button>
            </div>

            {isLoading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-6 bg-muted rounded w-3/4 mb-4"></div>
                      <div className="h-4 bg-muted rounded w-1/2"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : forms && forms.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {forms.filter(f => (f.formType || '').toLowerCase() === 'request').map((form) => (
                  <Card key={form.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium">{form.formNumber}</h3>
                          <p className="text-xs text-muted-foreground">{form.formType}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={() => setLocation(`/forms/${form.id}`)}>
                          عرض التفاصيل
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('هل أنت متأكد من حذف هذه الاستمارة؟')) {
                              deleteForm.mutate({ id: form.id });
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
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
                  <h3 className="text-lg font-medium mb-2">لا يوجد استمارات في قسم الطلبات</h3>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" onClick={() => setLocation('/clinthope')}>
                      اضافة استمارة
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="modifications" className="mt-6 space-y-6">
            <div className="flex gap-2 justify-end">
              <Button size="lg" variant="outline" onClick={() => setLocation('/modifications')}>
                اضافة استمارة
              </Button>
            </div>

            {isLoading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-6 bg-muted rounded w-3/4 mb-4"></div>
                      <div className="h-4 bg-muted rounded w-1/2"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : forms && forms.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {forms.filter(f => (f.formType || '').toLowerCase() === 'modification').map((form) => (
                  <Card key={form.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium">{form.formNumber}</h3>
                          <p className="text-xs text-muted-foreground">{form.formType}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={() => setLocation(`/forms/${form.id}`)}>
                          عرض التفاصيل
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('هل أنت متأكد من حذف هذه الاستمارة؟')) {
                              deleteForm.mutate({ id: form.id });
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
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
                  <h3 className="text-lg font-medium mb-2">لا يوجد استمارات في قسم التعديلات</h3>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" onClick={() => setLocation('/modifications')}>
                      اضافة استمارة
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
