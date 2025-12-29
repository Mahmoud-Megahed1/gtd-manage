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
import { Slider } from "@/components/ui/slider";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface ProjectPhasesContentProps {
    projectId: number;
    projectType: string;
}

const DESIGN_PHASES = [
    "جمع المعلومات (طبات العميل - المخططات والصور)",
    "الرفع المعماري (2D+3D الكونسبت - مخطط الوضع القائم)",
    "توزيع الحركة والمخططات (مخطط توزيع اولي - تحديد وتوزيع الحركة والاثاث والديكور)",
    "المود بورد + الماتريال (اختيار الألوان والخامات والاضاءة والاثاث)",
    "التصميم ثلاثي الابعاد (تطبيق التطشيبات ثم الديكور ثم الاثاث - رندر مبدئي)",
    "جلسات التعديل (تعديل طلبات العميل وفقا لاستمارة التعديلات)",
    "المخططات التنفيذية (المخططات التنفيذية كاملة (مبسط او تفصيلي) - جداول الكميات)",
    "الإخراج النهائي فيديو + صور + VR (رندر نهائي للصور والفيديو و الـ VR وفقا لشمولية المشروع)",
    "ملفات التسليم (تجهيز ملفات التسليم (PDF - فيديو و VR))",
    "التسليم النهائي"
];

const EXECUTION_PHASES = [
    "هدم و ترحيل و طلب حاوية مخلفات",
    "تعميد مقاسات و كميات مباني (جدران - اسقف - حديد - خرسانة)",
    "تعميد مقاسات و كميات تشطيب (كهرباء- سباكة -لياسة - دهان -تشطيب - ابواب - نوافذ-عزل)",
    "تعميد مقاسات و كميات ديكور (تكسيات جدران - تكسيات ارضيات - لوحات -جبس -جبس بورد)",
    "تعميد مقاسات و كميات اثاث (اسرة - خزائن - طاولات -رفوف - كنب -ستائر -سجاد)",
    "تعميد الخامات مع العميل (تشطيب - ديكور - اثاث)",
    "طلب مواد العظم",
    "طلب مواد التشطيب",
    "طلب مواد الديكور",
    "طلب الاثاث",
    "اعمال نجارة العظم",
    "اعمال حديد العظم",
    "صبة النظافة",
    "صب القواعد",
    "صب الاعمدة",
    "صب الجسور",
    "صب الاسقف",
    "عزل القواعد",
    "عزل الرقاب",
    "بناء الجدران",
    "تأسيس سباكة",
    "تأسيس كهرباء",
    "تأسيس التكييف",
    "تأسيس كاميرات وشبكات",
    "تأسيس سمارت هوم",
    "تأسيس لاندسكيب (احواض - كهرباء - سباكة)",
    "لياسة داخلية",
    "لياسة خارجية",
    "لياسة السور",
    "عزل مائي حمامات ومطابخ",
    "عزل مائي سطح",
    "عزل حراري جدران",
    "عزل حراري اسقف",
    "جبس الاسقف",
    "جبس الديكور",
    "فتحات جبس التكييف والصيانة",
    "فتحات جبس الانارة و الكهرباء",
    "بلاط الحمامات والمطابخ",
    "بلاط الارضيات الداخلية والخارجية",
    "دهان الاسقف والجدران الداخلية",
    "دهان الجدران والواجهات الخارجية",
    "تركيب الشبابيك",
    "تركيب الابواب",
    "تركيب المفاتيح والافياش",
    "تركيب الانارة",
    "تركيب المراحيض والمغاسل",
    "تركيب السخانات و الخزانات",
    "تركيب المضخات",
    "تركيب تكسيات ديكور الجدران",
    "تركيب تكسيات ديكور الارضيات",
    "تركيب اللوحات والمعلقات الجدارية",
    "تركيب الستائر",
    "تركيب غرف النوم",
    "تركيب الكنب",
    "تركيب الطاولات (جاهزة)",
    "تركيب الرفوف والطاولات (تفصيل)",
    "تركيب المظلات والسواتر",
    "تركيب الديكورات الخارجية واللاندسكيب",
    "الزراعة",
    "النظافة"
];

export default function ProjectPhasesContent({ projectId, projectType }: ProjectPhasesContentProps) {
    const { canCreate, canDelete, canEdit } = usePermission();

    // Determine which phases to show
    const availablePhases = useMemo(() => {
        if (projectType === 'design') return DESIGN_PHASES;
        if (projectType === 'execution') return EXECUTION_PHASES;
        // For design_execution or supervision, assume combined or default to execution as it is more comprehensive
        if (projectType === 'design_execution') return [...DESIGN_PHASES, ...EXECUTION_PHASES];
        return [...DESIGN_PHASES, ...EXECUTION_PHASES]; // Default fallback
    }, [projectType]);

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
                                إعداد مرحلة جديدة
                            </h4>
                            <div className="space-y-4">
                                {/* Common Phases Selection (Toggle List) */}
                                <div>
                                    <Label className="text-sm">اختر مرحلة ({projectType === 'design' ? 'تصميم' : 'تنفيذ'})</Label>
                                    <Select
                                        onValueChange={(v) => setNewPhase({ ...newPhase, name: v })}
                                        value={availablePhases.includes(newPhase.name) ? newPhase.name : ""}
                                    >
                                        <SelectTrigger className="w-full mt-1">
                                            <SelectValue placeholder="-- اختر من مراحل المشروع --" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-60 overflow-y-auto">
                                            {availablePhases.map((phase, i) => (
                                                <SelectItem key={i} value={phase}>{phase}</SelectItem>
                                            ))}
                                            <SelectItem value="custom">مخصص (اكتب الاسم يدوياً)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-3 md:grid-cols-2">
                                    <div>
                                        <Label className="text-sm">اسم المرحلة</Label>
                                        <Input
                                            placeholder="اسم المرحلة *"
                                            value={newPhase.name}
                                            onChange={(e) => setNewPhase({ ...newPhase, name: e.target.value })}
                                            required
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-sm">الوصف (اختياري)</Label>
                                        <Input
                                            placeholder="الوصف"
                                            value={newPhase.description}
                                            onChange={(e) => setNewPhase({ ...newPhase, description: e.target.value })}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-sm">تاريخ البداية</Label>
                                        <Input
                                            type="date"
                                            value={newPhase.startDate}
                                            onChange={(e) => setNewPhase({ ...newPhase, startDate: e.target.value })}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-sm">تاريخ النهاية</Label>
                                        <Input
                                            type="date"
                                            value={newPhase.endDate}
                                            onChange={(e) => setNewPhase({ ...newPhase, endDate: e.target.value })}
                                            className="mt-1"
                                        />
                                    </div>
                                </div>
                            </div>
                            <Button type="submit" className="mt-4" disabled={createTask.isPending}>
                                <Plus className="w-4 h-4 ml-2" />
                                إضافة المرحلة
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
                                                <TableCell className="min-w-[120px]">
                                                    {canCreateTasks ? (
                                                        <Slider
                                                            defaultValue={[Number(phase.progress || 0)]}
                                                            max={100}
                                                            step={5}
                                                            onValueChange={(vals) => updateTask.mutate({ id: phase.id, progress: vals[0] })}
                                                            className="py-2"
                                                        />
                                                    ) : (
                                                        <span className="text-sm font-medium">{phase.progress || 0}%</span>
                                                    )}
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
