import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function AttendanceCsvImport() {
  const [csv, setCsv] = useState<string>("");
  const imp = trpc.hr.attendance.importCsv.useMutation({
    onSuccess: (res) => {
      toast.success(`تم الاستيراد: ${res.created} سجل، متأخر: ${res.late}, غياب: ${res.absent}`);
    },
    onError: () => toast.error("تعذر استيراد CSV"),
  });
  return (
    <div className="space-y-2">
      <textarea
        placeholder="employeeNumber,date,checkIn,checkOut\nEMP-001,2025-01-10,09:18,17:02"
        className="w-full h-28 p-2 border rounded"
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
      />
      <div className="flex gap-2">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const reader = new FileReader();
            reader.onload = () => setCsv(String(reader.result || ""));
            reader.readAsText(f);
          }}
        />
        <Button
          variant="outline"
          onClick={() => {
            const v = csv.trim();
            if (!v) { toast.error("أدخل CSV أو اختر ملفاً"); return; }
            imp.mutate({ csvData: v });
          }}
          disabled={imp.isPending}
        >
          {imp.isPending ? "جاري الاستيراد..." : "استيراد"}
        </Button>
      </div>
    </div>
  );
}
