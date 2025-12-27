import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function AttendanceCsvImport() {
  const [csv, setCsv] = useState<string>("");
  const imp = trpc.hr.attendance.importCsv.useMutation({
    onSuccess: (res) => {
      const msgs = [];
      if (res.created > 0) msgs.push(`جديد: ${res.created}`);
      if (res.updated > 0) msgs.push(`تحديث: ${res.updated}`);
      if (res.late > 0) msgs.push(`متأخر: ${res.late}`);
      if (res.absent > 0) msgs.push(`غياب: ${res.absent}`);
      toast.success(`تم الاستيراد: ${msgs.join(', ') || 'بدون تغييرات'}`);
      setCsv(""); // Clear textarea after successful import
    },
    onError: (err) => {
      console.error("Import error:", err);
      toast.error(err.message || "تعذر استيراد CSV");
    },
  });

  const handleImport = () => {
    const value = csv.trim();
    console.log("CSV value:", value);
    console.log("CSV length:", value.length);

    if (!value) {
      toast.error("أدخل CSV أو اختر ملفاً");
      return;
    }

    // Validate CSV has at least header and one data row
    const lines = value.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) {
      toast.error("CSV يجب أن يحتوي على سطر رأس وسطر بيانات واحد على الأقل");
      return;
    }

    imp.mutate({ csvData: value });
  };

  return (
    <div className="space-y-2">
      <textarea
        placeholder="employeeNumber,date,checkIn,checkOut&#10;EMP-001,2025-01-10,09:18,17:02"
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
            reader.onload = () => {
              const result = String(reader.result || "");
              console.log("File loaded:", result.substring(0, 100));
              setCsv(result);
            };
            reader.readAsText(f);
          }}
        />
        <Button
          variant="outline"
          onClick={handleImport}
          disabled={imp.isPending}
        >
          {imp.isPending ? "جاري الاستيراد..." : "استيراد"}
        </Button>
      </div>
    </div>
  );
}

