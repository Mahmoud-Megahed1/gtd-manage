/*
 © 2025 - Property of [Mohammed Ahmed / Golden Touch Design co.]
 Unauthorized use or reproduction is prohibited.
*/
import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";

export default function ProjectReport() {
  const params = useParams();
  const [, setLocation] = useLocation();
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
      const t = setTimeout(() => window.print(), 500);
      return () => clearTimeout(t);
    }
  }, [project]);

  if (isLoading || !project) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <div className="h-8 bg-muted rounded w-1/3 animate-pulse mb-4" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-24 bg-muted rounded animate-pulse" />
            <div className="h-24 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div id="printable-content" className="p-6 space-y-6 bg-white min-h-screen" dir="rtl">
        {/* Header - hidden in print */}
        <div className="flex items-center justify-between print:hidden">
          <h1 className="text-2xl font-bold">تقرير المشروع</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setLocation(`/projects/${project.id}`)}>عودة للتفاصيل</Button>
            <Button onClick={() => window.print()}>طباعة</Button>
          </div>
        </div>

        {/* Project Info */}
        <div className="border rounded p-4">
          <h2 className="text-xl font-bold mb-2">{project.name}</h2>
          <p className="text-muted-foreground">{project.projectNumber}</p>
          <div className="flex gap-4 mt-2 text-sm">
            <span>الحالة: <Badge>{project.status}</Badge></span>
            {project.startDate && <span>تاريخ البدء: {new Date(project.startDate).toLocaleDateString('ar-SA')}</span>}
            {project.endDate && <span>تاريخ الانتهاء: {new Date(project.endDate).toLocaleDateString('ar-SA')}</span>}
          </div>
        </div>

        {/* Client Info */}
        {client && (
          <div className="border rounded p-4">
            <h3 className="font-bold mb-2">بيانات العميل</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">الاسم:</span> {client.name}</div>
              {client.email && <div><span className="text-muted-foreground">البريد:</span> {client.email}</div>}
              {client.phone && <div><span className="text-muted-foreground">الهاتف:</span> {client.phone}</div>}
              {client.city && <div><span className="text-muted-foreground">المدينة:</span> {client.city}</div>}
            </div>
          </div>
        )}

        {/* Financial Summary */}
        <div>
          <h3 className="font-bold mb-3">الملخص المالي</h3>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5 print:grid-cols-5">
            <div className="p-4 border rounded">
              <div className="text-sm text-muted-foreground">الميزانية</div>
              <div className="text-2xl font-bold">{(project.budget || 0).toLocaleString()} ريال</div>
            </div>
            <div className="p-4 border rounded">
              <div className="text-sm text-muted-foreground">إجمالي BOQ</div>
              <div className="text-2xl font-bold">{totalBOQ.toLocaleString()} ريال</div>
            </div>
            <div className="p-4 border rounded">
              <div className="text-sm text-muted-foreground">المصروفات</div>
              <div className="text-2xl font-bold">{totalExpenses.toLocaleString()} ريال</div>
            </div>
            <div className="p-4 border rounded">
              <div className="text-sm text-muted-foreground">إجمالي الأقساط</div>
              <div className="text-2xl font-bold">{totalInstallments.toLocaleString()} ريال</div>
            </div>
            <div className="p-4 border rounded">
              <div className="text-sm text-muted-foreground">المدفوع</div>
              <div className="text-2xl font-bold">{paidInstallments.toLocaleString()} ريال</div>
            </div>
          </div>
        </div>

        {/* Team Members */}
        {teamMembers && teamMembers.length > 0 && (
          <div>
            <h3 className="font-bold mb-3">فريق المشروع ({teamMembers.length})</h3>
            <div className="border rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-right">الاسم</th>
                    <th className="p-2 text-right">البريد</th>
                    <th className="p-2 text-right">الدور</th>
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map((member: any) => (
                    <tr key={member.id} className="border-t">
                      <td className="p-2">{member.userName || 'غير محدد'}</td>
                      <td className="p-2">{member.userEmail}</td>
                      <td className="p-2">{member.role || 'عضو'}</td>
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
            <h3 className="font-bold mb-3">المهام ({tasks.length})</h3>
            <div className="border rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-right">المهمة</th>
                    <th className="p-2 text-right">الحالة</th>
                    <th className="p-2 text-right">التقدم</th>
                    <th className="p-2 text-right">الأولوية</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task: any) => (
                    <tr key={task.id} className="border-t">
                      <td className="p-2">{task.name}</td>
                      <td className="p-2"><Badge variant="outline">{getTaskStatusLabel(task.status)}</Badge></td>
                      <td className="p-2">{task.progress || 0}%</td>
                      <td className="p-2">{task.priority}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <style>{`
          @media print {
            body { 
              visibility: hidden; 
            }
            #printable-content {
              visibility: visible;
              position: absolute;
              left: 0;
              top: 100px;
              width: 100%;
              padding: 20px !important;
            }
            /* Show Logo wrapper if pseudo element not working */
            body::before {
              visibility: visible;
              content: "";
              display: block;
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 80px;
              background-image: url("/logo.png");
              background-repeat: no-repeat;
              background-position: center;
              background-size: contain;
              z-index: 1000;
            }
            
            /* Hide print buttons specifically */
            .print\\:hidden { display: none !important; }
            
            /* Text color force */
            * { color: black !important; border-color: #ddd !important; }
          }
        `}</style>
      </div>
    </DashboardLayout>
  );
}

