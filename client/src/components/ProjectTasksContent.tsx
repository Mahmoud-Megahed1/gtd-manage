/*
 © 2025 - Property of [Mohammed Ahmed / Golden Touch Design co.]
 Unauthorized use or reproduction is prohibited.
 
 Reusable Project Tasks content - shows tasks for a specific project
 Used inside ProjectDetails page
*/
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
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "wouter";
import { usePermission } from "@/hooks/usePermission";
import { Plus, ListTodo, GanttChart } from "lucide-react";
import { Gantt, Task, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";

interface ProjectTasksContentProps {
    projectId: number;
}

export default function ProjectTasksContent({ projectId }: ProjectTasksContentProps) {
    const { user } = useAuth();
    const { can, canView, canCreate, canEdit, canDelete } = usePermission();
    const [statusFilter, setStatusFilter] = useState<string>("all");

    const { data: tasks, refetch, isLoading } = trpc.tasks.list.useQuery(
        { projectId, status: statusFilter === "all" ? undefined : (statusFilter as any) },
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
        enabled: can('users', 'view') || user?.role === 'admin' || user?.role === 'project_manager'
    });

    // Permission flags
    const canCreateTasks = canCreate('tasks');
    const canDeleteTasks = canDelete('tasks');
    const canEditTasks = canEdit('tasks');

    // Transform tasks for Gantt chart
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

    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        name: "",
        description: "",
        startDate: "",
        endDate: "",
        priority: "medium",
        estimateHours: "",
        assignedTo: "",  // Added for task assignment
    });

    const handleCreateTask = () => {
        if (!form.name.trim()) { toast.error("أدخل اسم المهمة"); return; }

        // Debug log
        console.log("Creating task with assignedTo:", form.assignedTo, "parsed:", form.assignedTo ? Number(form.assignedTo) : undefined);

        createTask.mutate({
            projectId,
            name: form.name,
            description: form.description || undefined,
            startDate: form.startDate ? new Date(form.startDate) : undefined,
            endDate: form.endDate ? new Date(form.endDate) : undefined,
            status: "planned",
            priority: form.priority as any,
            estimateHours: form.estimateHours ? Number(form.estimateHours) : undefined,
            assignedTo: form.assignedTo ? Number(form.assignedTo) : undefined,
        });
        setForm({ name: "", description: "", startDate: "", endDate: "", priority: "medium", estimateHours: "", assignedTo: "" });
        setShowForm(false);
    };

    return (
        <div className="space-y-6">
            {/* Header with Create Button */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ListTodo className="w-5 h-5" />
                    <h3 className="text-lg font-semibold">مهام المشروع</h3>
                    <span className="text-muted-foreground text-sm">({tasks?.length || 0} مهمة)</span>
                </div>
                {canCreateTasks && (
                    <Button onClick={() => setShowForm(!showForm)}>
                        <Plus className="w-4 h-4 ml-2" />
                        إضافة مهمة
                    </Button>
                )}
            </div>

            {/* Create Task Form */}
            {showForm && canCreateTasks && (
                <Card>
                    <CardHeader>
                        <CardTitle>إضافة مهمة جديدة</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm">اسم المهمة</label>
                                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="اسم المهمة" />
                            </div>
                            <div>
                                <label className="text-sm">الأولوية</label>
                                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">منخفضة</SelectItem>
                                        <SelectItem value="medium">متوسطة</SelectItem>
                                        <SelectItem value="high">مرتفعة</SelectItem>
                                        <SelectItem value="critical">حرجة</SelectItem>
                                    </SelectContent>
                                </Select>
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
                                <label className="text-sm">تقدير الساعات</label>
                                <Input type="number" min={0} value={form.estimateHours} onChange={(e) => setForm({ ...form, estimateHours: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-sm">تعيين لـ (المسؤول)</label>
                                <Select value={form.assignedTo} onValueChange={(v) => setForm({ ...form, assignedTo: v })}>
                                    <SelectTrigger><SelectValue placeholder="-- اختر المسؤول --" /></SelectTrigger>
                                    <SelectContent>
                                        {(usersList || []).map((u: any) => (
                                            <SelectItem key={u.id} value={String(u.id)}>{u.name || u.email}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div>
                            <label className="text-sm">التفاصيل</label>
                            <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="وصف المهمة" />
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={handleCreateTask} disabled={createTask.isPending}>
                                {createTask.isPending ? "جاري الإنشاء..." : "إنشاء"}
                            </Button>
                            <Button variant="outline" onClick={() => setShowForm(false)}>إلغاء</Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Filters */}
            <div className="flex gap-3 items-center">
                <label className="text-sm">الحالة:</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">الكل</SelectItem>
                        <SelectItem value="planned">مخططة</SelectItem>
                        <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                        <SelectItem value="done">مكتملة</SelectItem>
                        <SelectItem value="cancelled">ملغاة</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Tasks Table */}
            <Card>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="h-48 bg-muted rounded animate-pulse" />
                    ) : tasks && tasks.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>المهمة</TableHead>
                                    <TableHead>الأولوية</TableHead>
                                    <TableHead>المسؤول</TableHead>
                                    <TableHead>الحالة</TableHead>
                                    <TableHead>التقدم</TableHead>
                                    <TableHead>إجراءات</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tasks.map((t: any) => {
                                    const assignedUser = (usersList || []).find((u: any) => u.id === t.assignedTo);
                                    return (
                                        <TableRow key={t.id}>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">{t.name}</div>
                                                    {t.description && <div className="text-xs text-muted-foreground">{t.description.slice(0, 50)}...</div>}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 rounded text-xs ${t.priority === 'critical' ? 'bg-red-100 text-red-800' :
                                                    t.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                                        t.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {t.priority === 'critical' ? 'حرجة' : t.priority === 'high' ? 'مرتفعة' : t.priority === 'medium' ? 'متوسطة' : 'منخفضة'}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {canEditTasks && user?.role === 'admin' ? (
                                                    <Select
                                                        value={String(t.assignedTo ?? "")}
                                                        onValueChange={(v) => updateTask.mutate({ id: t.id, assignedTo: Number(v) })}
                                                    >
                                                        <SelectTrigger className="w-32">
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
                                                {canEditTasks ? (
                                                    <Select
                                                        value={t.status}
                                                        onValueChange={(v) => updateTask.mutate({ id: t.id, status: v as any })}
                                                    >
                                                        <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="planned">مخططة</SelectItem>
                                                            <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                                                            <SelectItem value="done">مكتملة</SelectItem>
                                                            <SelectItem value="cancelled">ملغاة</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                ) : (
                                                    <span className={`px-2 py-1 rounded text-xs ${t.status === 'done' ? 'bg-green-100 text-green-800' :
                                                        t.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                                            t.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                                'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {t.status === 'done' ? 'مكتملة' : t.status === 'in_progress' ? 'قيد التنفيذ' : t.status === 'cancelled' ? 'ملغاة' : 'مخططة'}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="min-w-[120px]">
                                                {canEditTasks ? (
                                                    <Slider
                                                        defaultValue={[Number(t.progress || 0)]}
                                                        max={100}
                                                        step={5}
                                                        onValueChange={(vals) => updateTask.mutate({ id: t.id, progress: vals[0] })}
                                                    />
                                                ) : (
                                                    <div className="text-sm">{t.progress || 0}%</div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-1">
                                                    <Link href={`/tasks/${t.id}`}>
                                                        <Button variant="outline" size="sm">تفاصيل</Button>
                                                    </Link>
                                                    {canDeleteTasks && (
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => deleteTask.mutate({ id: t.id })}
                                                        >
                                                            حذف
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="py-16 text-center text-muted-foreground">
                            <ListTodo className="w-12 h-12 mx-auto mb-4 opacity-30" />
                            <p>لا توجد مهام لهذا المشروع</p>
                            {canCreateTasks && (
                                <Button variant="outline" className="mt-4" onClick={() => setShowForm(true)}>
                                    <Plus className="w-4 h-4 ml-2" />
                                    إضافة أول مهمة
                                </Button>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Gantt Chart */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GanttChart className="w-5 h-5" />
                        <CardTitle>مخطط جانت</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="h-72 bg-muted rounded animate-pulse" />
                    ) : ganttTasks.length > 0 ? (
                        <div className="overflow-x-auto">
                            <Gantt tasks={ganttTasks} viewMode={ViewMode.Month} locale="ar" />
                        </div>
                    ) : (
                        <div className="h-48 flex items-center justify-center text-sm text-muted-foreground border rounded">
                            لا توجد مهام لعرض المخطط
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
