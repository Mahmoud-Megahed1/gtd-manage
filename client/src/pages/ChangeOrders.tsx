import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { FileDiff, CheckCircle2, XCircle, Send } from "lucide-react";

type StatusColor = "default" | "secondary" | "destructive" | "outline";

function statusLabel(status: string) {
  const map: Record<string, string> = {
    draft: "مسودة",
    submitted: "مقدّم",
    approved: "معتمد",
    rejected: "مرفوض",
    cancelled: "ملغي",
  };
  return map[status] || status;
}

function statusVariant(status: string): StatusColor {
  switch (status) {
    case "draft": return "outline";
    case "submitted": return "secondary";
    case "approved": return "default";
    case "rejected": return "destructive";
    case "cancelled": return "outline";
    default: return "outline";
  }
}

export default function ChangeOrders() {
  const { user } = useAuth();
  const { data: projects } = trpc.projects.list.useQuery();
  const [projectId, setProjectId] = useState<number | null>(null);
  const { data: changeOrders, refetch, isLoading } = trpc.changeOrders.listByProject.useQuery(
    { projectId: projectId || 0 },
    { enabled: projectId != null }
  );

  useEffect(() => {
    if (projects && projects.length > 0 && projectId == null) {
      setProjectId(projects[0].id);
    }
  }, [projects, projectId]);

  const canManage = useMemo(() => user && ["admin", "project_manager"].includes(user.role), [user]);

  const createMutation = trpc.changeOrders.create.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء طلب تغيير");
      refetch();
    },
    onError: () => toast.error("تعذر إنشاء طلب التغيير"),
  });
  const submitMutation = trpc.changeOrders.submit.useMutation({
    onSuccess: () => {
      toast.success("تم تقديم الطلب للموافقة");
      refetch();
    },
    onError: () => toast.error("تعذر تقديم الطلب"),
  });
  const approveMutation = trpc.changeOrders.approve.useMutation({
    onSuccess: () => {
      toast.success("تم اعتماد طلب التغيير");
      refetch();
    },
    onError: () => toast.error("تعذر اعتماد الطلب"),
  });
  const rejectMutation = trpc.changeOrders.reject.useMutation({
    onSuccess: () => {
      toast.success("تم رفض طلب التغيير");
      refetch();
    },
    onError: () => toast.error("تعذر رفض الطلب"),
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [impactCost, setImpactCost] = useState<number>(0);
  const [impactDays, setImpactDays] = useState<number>(0);
  const [origin, setOrigin] = useState<"client" | "internal" | "site">("client");
  const [rejectReason, setRejectReason] = useState("");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">طلبات التغيير</h1>
            <p className="text-muted-foreground mt-2">
              إدارة طلبات تغيير نطاق المشروع مع الاعتمادات والتأثير المالي/الزمني
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <label className="text-sm text-muted-foreground">اختر مشروع</label>
            <Select
              onValueChange={(val) => setProjectId(Number(val))}
              value={projectId ? String(projectId) : undefined}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="اختر مشروع" />
              </SelectTrigger>
              <SelectContent>
                {(projects || []).map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.projectNumber} — {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {canManage && projectId && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-medium">إنشاء طلب تغيير</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">العنوان</label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">المصدر</label>
                  <Select value={origin} onValueChange={(v) => setOrigin(v as any)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">عميل</SelectItem>
                      <SelectItem value="internal">داخلي</SelectItem>
                      <SelectItem value="site">موقع</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-muted-foreground">الوصف</label>
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">التأثير المالي (ريال)</label>
                  <Input type="number" value={impactCost} onChange={(e) => setImpactCost(Number(e.target.value || 0))} />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">التأثير الزمني (أيام)</label>
                  <Input type="number" value={impactDays} onChange={(e) => setImpactDays(Number(e.target.value || 0))} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    if (!title.trim()) return toast.error("يرجى إدخال عنوان");
                    createMutation.mutate({
                      projectId,
                      title,
                      description,
                      origin,
                      impactCost,
                      impactDays,
                    } as any);
                  }}
                >
                  إنشاء
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <h3 className="font-medium">القائمة</h3>
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
          ) : (changeOrders || []).length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {changeOrders!.map((co) => (
                <Card key={co.id}>
                  <CardContent className="p-6 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileDiff className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">{co.code}</h3>
                          <Badge variant={statusVariant(co.status)}>{statusLabel(co.status)}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{co.title}</p>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {co.description}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>التأثير المالي: {co.impactCost} ر.س</div>
                      <div>التأثير الزمني: {co.impactDays} أيام</div>
                    </div>
                    <div className="flex gap-2">
                      {co.status === "draft" && canManage && (
                        <Button variant="outline" onClick={() => submitMutation.mutate({ id: co.id })}>
                          <Send className="w-4 h-4 ml-2" /> تقديم
                        </Button>
                      )}
                      {co.status === "submitted" && user && ["admin", "accountant", "project_manager"].includes(user.role) && (
                        <>
                          <Button onClick={() => approveMutation.mutate({ id: co.id })}>
                            <CheckCircle2 className="w-4 h-4 ml-2" /> اعتماد
                          </Button>
                          <Input
                            placeholder="سبب الرفض"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                          />
                          <Button
                            variant="destructive"
                            onClick={() => {
                              if (!rejectReason.trim()) return toast.error("يرجى إدخال سبب الرفض");
                              rejectMutation.mutate({ id: co.id, reason: rejectReason });
                              setRejectReason("");
                            }}
                          >
                            <XCircle className="w-4 h-4 ml-2" /> رفض
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FileDiff className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">لا يوجد طلبات تغيير لهذا المشروع</h3>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
