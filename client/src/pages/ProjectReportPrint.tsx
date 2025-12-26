
import { useEffect } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";

export default function ProjectReportPrint() {
    const params = useParams();
    const projectId = params.id ? parseInt(params.id) : 0;
    const { data: projectData, isLoading } = trpc.projects.getDetails.useQuery({ id: projectId });
    const { data: tasks } = trpc.projects.listTasks.useQuery({ projectId });
    const { data: teamMembers } = trpc.projects.listTeam.useQuery({ projectId });

    const project = projectData?.project;
    const client = projectData?.client;
    const boq = projectData?.boq || [];
    const expenses = projectData?.expenses || [];
    const installments = projectData?.installments || [];
    const totalBOQ = boq.reduce((sum, item) => sum + (item.total || 0), 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const totalInstallments = installments.reduce((sum, inst) => sum + (inst.amount || 0), 0);
    const paidInstallments = installments.filter(i => i.status === "paid").reduce((sum, inst) => sum + inst.amount, 0);

    const getTaskStatusLabel = (status: string) => {
        const map: Record<string, string> = {
            planned: "مخطط",
            in_progress: "قيد التنفيذ",
            done: "مكتمل",
            cancelled: "ملغي"
        };
        return map[status] || status;
    };

    useEffect(() => {
        if (project && typeof window !== "undefined") {
            document.title = `تقرير المشروع - ${project.name}`;
            // Small delay to ensure styles loaded
            const t = setTimeout(() => window.print(), 800);
            return () => clearTimeout(t);
        }
    }, [project]);

    if (isLoading || !project) {
        return <div className="p-8 text-center">جاري تحميل التقرير...</div>;
    }

    return (
        <div className="min-h-screen bg-white text-black p-8 font-sans" dir="rtl">
            {/* Header / Logo */}
            <div className="flex justify-center mb-8">
                <img src="/logo.png" alt="Logo" className="h-24 object-contain" />
            </div>

            <div className="space-y-6 max-w-5xl mx-auto">
                <h1 className="text-2xl font-bold text-center mb-6">تقرير مفصل للمشروع</h1>

                {/* Project Info */}
                <div className="border border-gray-300 rounded p-4">
                    <h2 className="text-xl font-bold mb-2">{project.name}</h2>
                    <p className="text-gray-600">{project.projectNumber}</p>
                    <div className="flex gap-6 mt-2 text-sm">
                        <span>الحالة: <b>{project.status}</b></span>
                        {project.startDate && <span>تاريخ البدء: {new Date(project.startDate).toLocaleDateString('ar-SA')}</span>}
                        {project.endDate && <span>تاريخ الانتهاء: {new Date(project.endDate).toLocaleDateString('ar-SA')}</span>}
                    </div>
                </div>

                {/* Client Info */}
                {client && (
                    <div className="border border-gray-300 rounded p-4">
                        <h3 className="font-bold mb-2 text-lg border-b pb-1">بيانات العميل</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                            <div><span className="text-gray-600">الاسم:</span> {client.name}</div>
                            {client.email && <div><span className="text-gray-600">البريد:</span> {client.email}</div>}
                            {client.phone && <div><span className="text-gray-600">الهاتف:</span> {client.phone}</div>}
                            {client.city && <div><span className="text-gray-600">المدينة:</span> {client.city}</div>}
                        </div>
                    </div>
                )}

                {/* Financial Summary */}
                <div>
                    <h3 className="font-bold mb-3 text-lg border-b pb-1">الملخص المالي</h3>
                    <div className="grid grid-cols-5 gap-4">
                        <div className="p-4 border border-gray-300 rounded text-center">
                            <div className="text-sm text-gray-600 mb-1">الميزانية</div>
                            <div className="text-xl font-bold">{(project.budget || 0).toLocaleString()} ريال</div>
                        </div>
                        <div className="p-4 border border-gray-300 rounded text-center">
                            <div className="text-sm text-gray-600 mb-1">إجمالي BOQ</div>
                            <div className="text-xl font-bold">{totalBOQ.toLocaleString()} ريال</div>
                        </div>
                        <div className="p-4 border border-gray-300 rounded text-center">
                            <div className="text-sm text-gray-600 mb-1">المصروفات</div>
                            <div className="text-xl font-bold">{totalExpenses.toLocaleString()} ريال</div>
                        </div>
                        <div className="p-4 border border-gray-300 rounded text-center">
                            <div className="text-sm text-gray-600 mb-1">إجمالي الأقساط</div>
                            <div className="text-xl font-bold">{totalInstallments.toLocaleString()} ريال</div>
                        </div>
                        <div className="p-4 border border-gray-300 rounded text-center">
                            <div className="text-sm text-gray-600 mb-1">المدفوع</div>
                            <div className="text-xl font-bold">{paidInstallments.toLocaleString()} ريال</div>
                        </div>
                    </div>
                </div>

                {/* Team Members */}
                {teamMembers && teamMembers.length > 0 && (
                    <div>
                        <h3 className="font-bold mb-3 text-lg border-b pb-1">فريق المشروع ({teamMembers.length})</h3>
                        <div className="border border-gray-300 rounded overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-100 border-b border-gray-300">
                                    <tr>
                                        <th className="p-3 text-right">الاسم</th>
                                        <th className="p-3 text-right">البريد الإلكتروني</th>
                                        <th className="p-3 text-right">الدور في المشروع</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {teamMembers.map((member: any) => (
                                        <tr key={member.id} className="border-b last:border-0 border-gray-200">
                                            <td className="p-3 font-medium">{member.userName || 'غير محدد'}</td>
                                            <td className="p-3">{member.userEmail}</td>
                                            <td className="p-3">{member.role || 'عضو'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Tasks */}
                {tasks && tasks.length > 0 && (
                    <div>
                        <h3 className="font-bold mb-3 text-lg border-b pb-1">المهام ({tasks.length})</h3>
                        <div className="border border-gray-300 rounded overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-100 border-b border-gray-300">
                                    <tr>
                                        <th className="p-3 text-right">المهمة</th>
                                        <th className="p-3 text-right">الحالة</th>
                                        <th className="p-3 text-right">التقدم</th>
                                        <th className="p-3 text-right">الأولوية</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tasks.map((task: any) => (
                                        <tr key={task.id} className="border-b last:border-0 border-gray-200">
                                            <td className="p-3 font-medium">{task.name}</td>
                                            <td className="p-3"><span className="border border-gray-400 rounded px-2 py-0.5 text-xs">{getTaskStatusLabel(task.status)}</span></td>
                                            <td className="p-3">{task.progress || 0}%</td>
                                            <td className="p-3">{task.priority}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
        @media print {
            body { 
                background: white !important;
                -webkit-print-color-adjust: exact !important; 
                print-color-adjust: exact !important; 
            }
            @page { margin: 1cm; size: auto; }
        }
      `}</style>
        </div>
    );
}
