/*
 © 2025 - Property of [Mohammed Ahmed / Golden Touch Design co.]
 Unauthorized use or reproduction is prohibited.
*/
import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/DashboardLayout";

export default function ProjectReport() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const projectId = params.id ? parseInt(params.id) : 0;
  const { data: projectData, isLoading } = trpc.projects.getDetails.useQuery({ id: projectId });
  const project = projectData?.project;
  const boq = projectData?.boq || [];
  const expenses = projectData?.expenses || [];
  const installments = projectData?.installments || [];
  const totalBOQ = boq.reduce((sum, item) => sum + (item.total || 0), 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const totalInstallments = installments.reduce((sum, inst) => sum + (inst.amount || 0), 0);
  const paidInstallments = installments.filter(i => i.status === "paid").reduce((sum, inst) => sum + inst.amount, 0);

  useEffect(() => {
    if (project && typeof window !== "undefined") {
      // slight delay to ensure fonts are ready before print
      const t = setTimeout(() => window.print(), 200);
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
      <div className="p-6 space-y-6" dir="rtl">
        <div className="flex items-center justify-between print:hidden">
          <h1 className="text-2xl font-bold">تقرير المشروع</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setLocation(`/projects/${project.id}`)}>عودة للتفاصيل</Button>
            <Button onClick={() => window.print()}>طباعة</Button>
          </div>
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold">{project.name}</h2>
          <p className="text-muted-foreground">{project.projectNumber}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 print:grid-cols-2">
          <div className="p-4 border rounded">
            <div className="text-sm text-muted-foreground">إجمالي BOQ</div>
            <div className="text-3xl font-bold">{totalBOQ.toLocaleString()} ريال</div>
          </div>
          <div className="p-4 border rounded">
            <div className="text-sm text-muted-foreground">المصروفات</div>
            <div className="text-3xl font-bold">{totalExpenses.toLocaleString()} ريال</div>
          </div>
          <div className="p-4 border rounded">
            <div className="text-sm text-muted-foreground">إجمالي الأقساط</div>
            <div className="text-3xl font-bold">{totalInstallments.toLocaleString()} ريال</div>
          </div>
          <div className="p-4 border rounded">
            <div className="text-sm text-muted-foreground">المدفوع</div>
            <div className="text-3xl font-bold">{paidInstallments.toLocaleString()} ريال</div>
          </div>
        </div>
        <style>{`
          @media print {
            .print\\:hidden { display: none !important; }
          }
        `}</style>
      </div>
    </DashboardLayout>
  );
}
