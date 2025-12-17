/*
 © 2025 - Property of [Mohammed Ahmed / Golden Touch Design co.]
 Unauthorized use or reproduction is prohibited.
*/
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useMemo, useState } from "react";
import { Gantt, Task, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "wouter";

export default function Tasks() {
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const [projectId, setProjectId] = useState<number | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<number | undefined>(undefined);
  const { data: projects } = trpc.projects.list.useQuery(undefined, { refetchOnWindowFocus: false });
  const { data: tasks, refetch, isLoading } = trpc.tasks.list.useQuery(
    { projectId, status: statusFilter === "all" ? undefined : (statusFilter as any), assignedTo: assigneeFilter },
    { refetchOnWindowFocus: false }
  );
  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => { toast.success("تم إنشاء المهمة"); refetch(); },
    onError: () => toast.error("فشل إنشاء المهمة"),
  });
  const updateTask = trpc.tasks.update.useMutation({
    onSuccess: () => { toast.success("تم تحديث المهمة"); refetch(); },
    onError: () => toast.error("فشل تحديث المهمة"),
  });
  const deleteTask = trpc.tasks.delete.useMutation({
    onSuccess: () => { toast.success("تم حذف المهمة"); refetch(); },
    onError: () => toast.error("فشل حذف المهمة"),
  });
  const { data: usersList } = trpc.users.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
    enabled: user?.role === "admin"
  });
  const [form, setForm] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    priority: "medium",
    estimateHours: "",
    parentId: "none"
  });

  const ganttTasks = useMemo<Task[]>(() => {
    const list = (tasks || []) as any[];
    const hasChildren: Record<number, boolean> = {};
    list.forEach(t => {
      if (t.parentId) hasChildren[t.parentId] = true;
    });
    const items: Task[] = [];
    list.forEach((t) => {
      const base = {
        id: String(t.id),
        name: t.name,
        start: t.startDate ? new Date(t.startDate) : new Date(),
        end: t.endDate ? new Date(t.endDate) : new Date(new Date().getTime() + 86400000),
        progress: typeof t.progress === "number" ? t.progress : (t.status === "done" ? 100 : t.status === "in_progress" ? 50 : 0),
        isDisabled: false,
      } as any;
      if (hasChildren[t.id]) {
        items.push({ ...base, type: "project" });
      } else {
        const child: any = { ...base, type: "task" };
        if (t.parentId) child.project = String(t.parentId);
        items.push(child as Task);
      }
    });
    return items;
  }, [tasks]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">المهام وخط الزمن</h1>
            <p className="text-muted-foreground">إدارة المهام لكل مشروع وعرض مخطط جانت</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const el = document.getElementById("create-task");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
            >
              إنشاء مهمة
            </Button>
          </div>
        </div>
        <Card>
          <CardHeader id="create-task">
            <CardTitle>إضافة مهمة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-6 gap-3">
              <div>
                <label className="text-sm">المشروع</label>
                <Select
                  value={projectId ? String(projectId) : ""}
                  onValueChange={(v) => setProjectId(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر مشروعاً" />
                  </SelectTrigger>
                  <SelectContent>
                    {(projects || []).map((p: any) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm">اسم المهمة</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="text-sm">تاريخ البدء</label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div>
                <label className="text-sm">تاريخ الانتهاء</label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
              <div>
                <label className="text-sm">الأولوية</label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">منخفضة</SelectItem>
                    <SelectItem value="medium">متوسطة</SelectItem>
                    <SelectItem value="high">مرتفعة</SelectItem>
                    <SelectItem value="critical">حرجة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => {
                    if (!projectId) { toast.error("اختر مشروعاً"); return; }
                    if (!form.name.trim()) { toast.error("أدخل اسم المهمة"); return; }
                    createTask.mutate({
                      projectId: projectId,
                      name: form.name,
                      description: form.description || undefined,
                      startDate: form.startDate ? new Date(form.startDate) : undefined,
                      endDate: form.endDate ? new Date(form.endDate) : undefined,
                      status: "planned",
                      priority: form.priority as any,
                      estimateHours: form.estimateHours ? Number(form.estimateHours) : undefined,
                      parentId: form.parentId && form.parentId !== "none" ? Number(form.parentId) : undefined
                    });
                  }}
                >
                  إضافة
                </Button>
              </div>
            </div>
            <div>
              <label className="text-sm">تفاصيل</label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              <div>
                <label className="text-sm">تقدير الساعات</label>
                <Input type="number" min={0} value={form.estimateHours} onChange={(e) => setForm({ ...form, estimateHours: e.target.value })} />
              </div>
              <div>
                <label className="text-sm">مهمة رئيسية</label>
                <Select value={form.parentId} onValueChange={(v) => setForm({ ...form, parentId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="لا يوجد" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">لا يوجد</SelectItem>
                    {(tasks || []).map((t: any) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>فلاتر</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-3">
            <div>
              <label className="text-sm">الحالة</label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="الكل" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="planned">مخططة</SelectItem>
                  <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                  <SelectItem value="done">مكتملة</SelectItem>
                  <SelectItem value="cancelled">ملغاة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm">المسؤول</label>
              <Select
                value={assigneeFilter ? String(assigneeFilter) : "all"}
                onValueChange={(v) => setAssigneeFilter(v === "all" ? undefined : Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="الكل" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {(usersList || []).map((u: any) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={() => refetch()}>تطبيق الفلاتر</Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>قائمة المهام</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-48 bg-muted rounded animate-pulse" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المشروع</TableHead>
                    <TableHead>اسم المهمة</TableHead>
                    <TableHead>الأولوية</TableHead>
                    <TableHead>المسؤول</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>البدء</TableHead>
                    <TableHead>الانتهاء</TableHead>
                    <TableHead>التقدم</TableHead>
                    <TableHead>التقدير (ساعات)</TableHead>
                    <TableHead>تعليقات</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(tasks || []).map((t: any) => {
                    const projectName = (projects || []).find((p: any) => p.id === t.projectId)?.name || `#${t.projectId}`;
                    const assignedUser = (usersList || []).find((u: any) => u.id === t.assignedTo);
                    return (
                      <TableRow key={t.id}>
                        <TableCell>{projectName}</TableCell>
                        <TableCell>
                          <Input
                            defaultValue={t.name}
                            onBlur={(e) => {
                              const name = e.target.value.trim();
                              if (name && name !== t.name) {
                                updateTask.mutate({ id: t.id, name });
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={t.priority || "medium"}
                            onValueChange={(v) => updateTask.mutate({ id: t.id, priority: v as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">منخفضة</SelectItem>
                              <SelectItem value="medium">متوسطة</SelectItem>
                              <SelectItem value="high">مرتفعة</SelectItem>
                              <SelectItem value="critical">حرجة</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {user?.role === "admin" ? (
                            <Select
                              value={String(t.assignedTo ?? "")}
                              onValueChange={(v) => updateTask.mutate({ id: t.id, assignedTo: Number(v) })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={assignedUser?.name || "غير معيّن"} />
                              </SelectTrigger>
                              <SelectContent>
                                {(usersList || []).map((u: any) => (
                                  <SelectItem key={u.id} value={String(u.id)}>
                                    {u.name || u.email}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span>{assignedUser?.name || "غير معيّن"}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={t.status}
                            onValueChange={(v) => updateTask.mutate({ id: t.id, status: v as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="planned">مخططة</SelectItem>
                              <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                              <SelectItem value="done">مكتملة</SelectItem>
                              <SelectItem value="cancelled">ملغاة</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            defaultValue={t.startDate ? new Date(t.startDate).toISOString().slice(0,10) : ""}
                            onBlur={(e) => {
                              const val = e.target.value;
                              updateTask.mutate({ id: t.id, startDate: val ? new Date(val) : undefined });
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            defaultValue={t.endDate ? new Date(t.endDate).toISOString().slice(0,10) : ""}
                            onBlur={(e) => {
                              const val = e.target.value;
                              updateTask.mutate({ id: t.id, endDate: val ? new Date(val) : undefined });
                            }}
                          />
                        </TableCell>
                        <TableCell className="min-w-[180px]">
                          <Slider
                            defaultValue={[Number(t.progress || 0)]}
                            onValueChange={(vals) => updateTask.mutate({ id: t.id, progress: vals[0] })}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            defaultValue={t.estimateHours ?? ""}
                            onBlur={(e) => {
                              const val = e.target.value;
                              updateTask.mutate({ id: t.id, estimateHours: val ? Number(val) : undefined });
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <CommentsCell taskId={t.id} />
                        </TableCell>
                        <TableCell>
                          <Link href={`/tasks/${t.id}`}>
                            <Button variant="secondary">تفاصيل</Button>
                          </Link>
                          <Button
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteTask.mutate({ id: t.id })}
                          >
                            حذف
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>مخطط جانت</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-72 bg-muted rounded animate-pulse" />
            ) : (
              ganttTasks.length > 0 ? (
                <Gantt tasks={ganttTasks} viewMode={ViewMode.Month} locale="ar" />
              ) : (
                <div className="h-72 flex items-center justify-center text-sm text-muted-foreground border rounded">
                  لا توجد مهام لعرض المخطط
                </div>
              )
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
function CommentsCell({ taskId }: { taskId: number }) {
  const { data: comments, refetch } = trpc.tasks.comments.list.useQuery({ taskId }, { refetchOnWindowFocus: false });
  const addComment = trpc.tasks.comments.add.useMutation({
    onSuccess: () => refetch()
  });
  const deleteComment = trpc.tasks.comments.delete.useMutation({
    onSuccess: () => refetch()
  });
  const [value, setValue] = useState("");
  return (
    <div className="space-y-2">
      <div className="space-y-1 max-h-24 overflow-auto">
        {(comments || []).map((c: any) => (
          <div key={c.id} className="flex items-center justify-between">
            <span className="text-xs">{c.content}</span>
            <Button variant="ghost" size="sm" onClick={() => deleteComment.mutate({ id: c.id })}>حذف</Button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="أضف تعليقاً"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <Button
          variant="outline"
          onClick={() => {
            const v = value.trim();
            if (!v) return;
            addComment.mutate({ taskId, content: v });
            setValue("");
          }}
        >
          إضافة
        </Button>
      </div>
    </div>
  );
}
