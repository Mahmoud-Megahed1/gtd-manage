import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function AttendanceCsvImport() {
  const [csvState, setCsvState] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const imp = trpc.hr.attendance.importCsv.useMutation({
    onSuccess: (res) => {
      const msgs = [];
      if (res.created > 0) msgs.push(`جديد: ${res.created}`);
      if (res.updated > 0) msgs.push(`تحديث: ${res.updated}`);
      if (res.late > 0) msgs.push(`متأخر: ${res.late}`);
      if (res.absent > 0) msgs.push(`غياب: ${res.absent}`);
      toast.success(`تم الاستيراد: ${msgs.join(', ') || 'بدون تغييرات'}`);
      setCsvState("");
      if (textareaRef.current) {
        textareaRef.current.value = "";
      }
    },
    onError: (err) => {
      console.error("Import error:", err);
      toast.error(err.message || "تعذر استيراد CSV");
    },
  });

  const handleImport = () => {
    // Get value directly from ref as a fallback
    const valueFromRef = textareaRef.current?.value || "";
    const valueFromState = csvState;
    const value = (valueFromRef || valueFromState).trim();

    console.log("CSV from state:", csvState);
    console.log("CSV from ref:", valueFromRef);
    console.log("CSV final value:", value);
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

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    console.log("Text changed, new length:", newValue.length);
    setCsvState(newValue);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      console.log("File loaded, length:", result.length);
      setCsvState(result);
      if (textareaRef.current) {
        textareaRef.current.value = result;
      }
    };
    reader.readAsText(f);
  };

  return (
    <div className="space-y-2">
      <textarea
        ref={textareaRef}
        placeholder={"employeeNumber,date,checkIn,checkOut\nEMP-001,2025-01-10,09:18,17:02"}
        className="w-full h-28 p-2 border rounded"
        value={csvState}
        onChange={handleTextChange}
      />
      <div className="flex gap-2">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
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
