/*
 © 2025 - Property of [Mohammed Ahmed / Golden Touch Design co.]
 Unauthorized use or reproduction is prohibited.
 
 Reusable Project Phases content - shows phases and their Gantt chart for a specific project
 Used inside ProjectDetails page
*/
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePermission } from "@/hooks/usePermission";
import { Plus, Layers, GanttChartSquare, CheckCircle2, Trash2 } from "lucide-react";
import { Gantt, Task, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import { Badge } from "@/components/ui/badge";

interface ProjectPhasesContentProps {
    projectId: number;
}

export default function ProjectPhasesContent({ projectId }: ProjectPhasesContentProps) {
    const { canCreate, canDelete, canEdit } = usePermission();

    const { data: phases, refetch, isLoading } = trpc.tasks.list.useQuery(
        { projectId, taskType: 'phase' },
        { refetchOnWindowFocus: false }
    );

    const utils = trpc.useUtils();

    const createTask = trpc.tasks.create.useMutation({
        onSuccess: () => {
            toast.success("تم إضافة المرحلة");
            utils.tasks.list.invalidate({ projectId });
        },
        onError: () => toast.error("تعذر إضافة المرحلة")
    });

    const deleteTask = trpc.tasks.delete.useMutation({
        onSuccess: () => {
            toast.success("تم الحذف بنجاح");
            utils.tasks.list.invalidate({ projectId });
        },
        onError: () => toast.error("تعذر الحذف")
    });

    const updateTask = trpc.tasks.update.useMutation({
        onSuccess: () => {
            toast.success("تم التحديث بنجاح");
            utils.tasks.list.invalidate({ projectId });
        },
        onError: () => toast.error("تعذر التحديث")
    });

    const [newPhase, setNewPhase] = useState({
        name: "",
        description: "",
        startDate: "",
        endDate: "",
    });

    // Transform phases for Gantt chart
    const ganttPhases = useMemo<Task[]>(() => {
        const list = (phases || []) as any[];
        return list.map((p) => ({
            id: String(p.id),
            name: p.name,
            start: p.startDate ? new Date(p.startDate) : new Date(),
            end: p.endDate ? new Date(p.endDate) : new Date(new Date().getTime() + 86400000 * 7),
            progress: typeof p.progress === "number" ? p.progress : (p.status === "done" ? 100 : 0),
            type: "task" as const,
            isDisabled: false,
        }));
    }, [phases]);

    const canCreateTasks = canCreate('tasks'); // Assuming phases share task permissions for now

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Layers className="w-5 h-5" />
                            مراحل المشروع ({phases?.length || 0})
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Add Phase Form */}
                    {canCreateTasks && (
                        <form
                            className="mb-6 p-4 border rounded-lg bg-muted/30"
                            onSubmit={async (e) => {
                                e.preventDefault();
                                if (!newPhase.name) {
                                    toast.error("أدخل اسم المرحلة");
                                    return;
                                }
                                try {
                                    await createTask.mutateAsync({
                                        projectId,
                                        name: newPhase.name,
                                        description: newPhase.description || undefined,
                                        startDate: newPhase.startDate ? new Date(newPhase.startDate) : undefined,
                                        endDate: newPhase.endDate ? new Date(newPhase.endDate) : undefined,
                                        taskType: 'phase'
                                    });
                                    setNewPhase({ name: "", description: "", startDate: "", endDate: "" });
                                } catch (err: any) {
                                    // Error handled in mutation
                                }
                            }}
                        >
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <Layers className="w-4 h-4" />
                                إضافة مرحلة جديدة
                            </h4>
                            <div className="grid gap-3 md:grid-cols-2">
                                <Input
                                    placeholder="اسم المرحلة *"
                                    value={newPhase.name}
                                    onChange={(e) => setNewPhase({ ...newPhase, name: e.target.value })}
                                    required
                                />
                                <Input
                                    placeholder="الوصف (اختياري)"
                                    value={newPhase.description}
                                    onChange={(e) => setNewPhase({ ...newPhase, description: e.target.value })}
                                />
                                <Input
                                    type="date"
                                    placeholder="تاريخ البداية"
                                    value={newPhase.startDate}
                                    onChange={(e) => setNewPhase({ ...newPhase, startDate: e.target.value })}
                                />
                                <Input
                                    type="date"
                                    placeholder="تاريخ النهاية"
                                    value={newPhase.endDate}
                                    onChange={(e) => setNewPhase({ ...newPhase, endDate: e.target.value })}
                                />
                            </div>
                            <Button type="submit" className="mt-3" disabled={createTask.isPending}>
                                <Plus className="w-4 h-4 ml-2" />
                                إضافة مرحلة
                            </Button>
                        </form>
                    )}

                    {isLoading ? (
                        <div className="h-48 bg-muted rounded animate-pulse" />
                    ) : phases && phases.length > 0 ? (
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-right">#</TableHead>
                                        <TableHead className="text-right">المرحلة</TableHead>
                                        <TableHead className="text-right">تاريخ البداية</TableHead>
                                        <TableHead className="text-right">تاريخ النهاية</TableHead>
                                        <TableHead className="text-center">الحالة</TableHead>
                                        <TableHead className="text-center">الإنجاز</TableHead>
                                        <TableHead className="text-left">إجراءات</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {phases.map((phase: any, idx: number) => {
                                        const start = phase.startDate ? new Date(phase.startDate) : null;
                                        const end = phase.endDate ? new Date(phase.endDate) : null;
                                        const isCompleted = phase.status === 'done' || phase.status === 'completed';

                                        return (
                                            <TableRow key={phase.id} className={isCompleted ? 'bg-green-50' : ''}>
                                                <TableCell className="font-medium">{idx + 1}</TableCell>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium">{phase.name}</p>
                                                        {phase.description && <p className="text-xs text-muted-foreground">{phase.description}</p>}
                                                    </div>
                                                </TableCell>
                                                <TableCell>{start ? start.toLocaleDateString('ar-SA') : '-'}</TableCell>
                                                <TableCell>{end ? end.toLocaleDateString('ar-SA') : '-'}</TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant={isCompleted ? 'default' : 'outline'}>
                                                        {isCompleted ? 'مكتملة' : 'جارية'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <span className="text-sm font-medium">{phase.progress || 0}%</span>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1 justify-end">
                                                        {!isCompleted && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-green-600 hover:text-green-700"
                                                                onClick={() => updateTask.mutate({ id: phase.id, status: 'done', progress: 100 })}
                                                            >
                                                                <CheckCircle2 className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-red-500"
                                                            onClick={() => {
                                                                if (confirm('هل أنت متأكد من حذف هذه المرحلة؟')) {
                                                                    deleteTask.mutate({ id: phase.id });
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <Layers className="mx-auto h-12 w-12 mb-4 opacity-50" />
                            <p>لا توجد مراحل مسجلة للمشروع</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Gantt Chart for Phases */}
            <Card className="mt-6">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GanttChartSquare className="w-5 h-5" />
                        <CardTitle>مخطط جانت للمراحل</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="h-72 bg-muted rounded animate-pulse" />
                    ) : ganttPhases.length > 0 ? (
                        <div className="overflow-x-auto">
                            <Gantt tasks={ganttPhases} viewMode={ViewMode.Month} locale="ar" />
                        </div>
                    ) : (
                        <div className="h-48 flex items-center justify-center text-sm text-muted-foreground border rounded">
                            لا توجد مراحل لعرض المخطط
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
