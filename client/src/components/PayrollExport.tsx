import { Button } from "@/components/ui/button";
import { useMemo } from "react";

export default function PayrollExport({ payrollList }: { payrollList: any[] }) {
  const csvUri = useMemo(() => {
    const header = ["employeeId","month","year","baseSalary","bonuses","deductions","netSalary","status"];
    const rows = [header, ...payrollList.map(p => [
      String(p.employeeId),
      String(p.month),
      String(p.year),
      String(p.baseSalary ?? 0),
      String(p.bonuses ?? 0),
      String(p.deductions ?? 0),
      String(p.netSalary ?? 0),
      String(p.status ?? "pending"),
    ])];
    const content = rows.map(r => r.join(",")).join("\n");
    return "data:text/csv;charset=utf-8," + encodeURIComponent(content);
  }, [payrollList]);
  return (
    <div className="flex gap-2">
      <a href={csvUri} download={`payroll-${Date.now()}.csv`}>
        <Button variant="outline">تصدير CSV</Button>
      </a>
    </div>
  );
}
