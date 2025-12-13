import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

type ModItem = {
  id: string;
  text: string;
  file?: File | null;
  fileDataUrl?: string | null;
};

export default function Modifications() {
  useAuth({ redirectOnUnauthenticated: true });
  const [, setLocation] = useLocation();
  const { data: clients } = trpc.clients.list.useQuery();
  const { data: projects } = trpc.projects.list.useQuery();
  const uploadFile = trpc.files.upload.useMutation();
  const createForm = trpc.forms.create.useMutation();

  const [clientName, setClientName] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<number | undefined>(undefined);
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(undefined);
  const [items, setItems] = useState<ModItem[]>([
    { id: crypto.randomUUID(), text: "", file: null, fileDataUrl: null },
  ]);

  const printableHtml = useMemo(() => {
    const styles = `
      <style>
        body { font-family: system-ui, -apple-system, Segoe UI, Tahoma; direction: rtl; }
        .wrap { max-width: 900px; margin: 24px auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; }
        .title { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
        .meta { color: #6b7280; margin-bottom: 16px; }
        .section { margin-top: 16px; }
        .item { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-top: 12px; }
        .item h4 { margin: 0 0 8px; font-size: 16px; }
        .img { max-width: 100%; border-radius: 8px; margin-top: 8px; }
        .footer { margin-top: 16px; font-size: 12px; color: #9ca3af; }
      </style>
    `;
    const itemsHtml = items.map((it, idx) => {
      const img = it.fileDataUrl && it.file?.type.startsWith("image/") ? `<img class="img" src="${it.fileDataUrl}" alt="image ${idx + 1}" />` : "";
      const fileNote =
        it.file && !it.file.type.startsWith("image/")
          ? `<div class="meta">ملف مرفق: ${it.file.name}</div>`
          : "";
      return `
        <div class="item">
          <h4>التعديل ${idx + 1}</h4>
          <div>${it.text || ""}</div>
          ${img}
          ${fileNote}
        </div>
      `;
    }).join("");
    return `
      <!doctype html>
      <html lang="ar">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          ${styles}
          <title>تعديلات العملاء</title>
        </head>
        <body>
          <div class="wrap">
            <div class="title">تعديلات العملاء</div>
            <div class="meta">اسم العميل: ${clientName || "غير محدد"}</div>
            <div class="meta">عدد العناصر: ${items.length}</div>
            <div class="section">
              ${itemsHtml}
            </div>
            <div class="footer">تم الإنشاء بواسطة النظام</div>
          </div>
        </body>
      </html>
    `;
  }, [clientName, items]);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  useEffect(() => {
    if (!iframeRef.current) return;
    const doc = iframeRef.current.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(printableHtml);
    doc.close();
  }, [printableHtml]);

  const addItem = () => {
    setItems(prev => [...prev, { id: crypto.randomUUID(), text: "", file: null, fileDataUrl: null }]);
  };
  const removeItem = (id: string) => {
    setItems(prev => prev.filter(x => x.id !== id));
  };
  const duplicateItem = (id: string) => {
    setItems(prev => {
      const idx = prev.findIndex(x => x.id === id);
      if (idx === -1) return prev;
      const original = prev[idx];
      const copy: ModItem = { id: crypto.randomUUID(), text: original.text, file: original.file || null, fileDataUrl: original.fileDataUrl || null };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  };
  const onChangeFile = (id: string, file?: File | null) => {
    setItems(prev =>
      prev.map(x => (x.id === id ? { ...x, file, fileDataUrl: null } : x))
    );
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setItems(prev =>
          prev.map(x => (x.id === id ? { ...x, fileDataUrl: reader.result as string } : x))
        );
      };
      reader.readAsDataURL(file);
    }
  };

  const printNow = () => {
    if (!iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.focus();
    iframeRef.current.contentWindow.print();
  };
  const downloadHtml = () => {
    const blob = new Blob([printableHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `modification-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const saveHtmlToSystem = async () => {
    const base64 = btoa(unescape(encodeURIComponent(printableHtml)));
    await uploadFile.mutateAsync({
      entityType: "form_copy",
      entityId: 0,
      fileName: `modification-${Date.now()}.html`,
      fileData: base64,
      mimeType: "text/html",
    });
    toast.success("تم حفظ نسخة HTML في النظام");
  };
  const saveFormToSystem = async () => {
    try {
      const created = await createForm.mutateAsync({
        clientId: selectedClientId ?? 0,
        projectId: selectedProjectId,
        formType: "modification",
        formData: printableHtml,
      });
      const formId = (created as any)?.id;
      if (formId) {
        for (const it of items) {
          if (it.file) {
            const buf = await it.file.arrayBuffer();
            const bytes = new Uint8Array(buf);
            let binary = "";
            for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
            const base64 = btoa(binary);
            await uploadFile.mutateAsync({
              entityType: "form",
              entityId: formId,
              fileName: it.file.name,
              fileData: base64,
              mimeType: it.file.type || "application/octet-stream",
            });
          }
        }
      }
      toast.success("تم حفظ الاستمارة وكل المرفقات");
      setLocation("/forms");
    } catch {
      toast.error("تعذر حفظ الاستمارة");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">استمارة تعديلات العملاء</h1>
            <p className="text-muted-foreground">نموذج ضمني قابل للطباعة والتصدير والحفظ</p>
          </div>
          <Button variant="outline" onClick={() => setLocation("/forms")}>
            العودة
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>بيانات الاستمارة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-3">
              <div className="md:col-span-1">
                <div className="text-sm mb-1">اسم العميل</div>
                <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="اكتب اسم العميل" />
              </div>
              <div>
                <div className="text-sm mb-1">اختيار العميل (اختياري للحفظ)</div>
                <select
                  className="w-full p-2 border rounded"
                  value={selectedClientId ?? ""}
                  onChange={(e) => setSelectedClientId(e.target.value ? Number(e.target.value) : undefined)}
                >
                  <option value="">بدون</option>
                  {clients?.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="text-sm mb-1">اختيار المشروع (اختياري)</div>
                <select
                  className="w-full p-2 border rounded"
                  value={selectedProjectId ?? ""}
                  onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : undefined)}
                >
                  <option value="">بدون</option>
                  {projects?.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              {items.map((it, idx) => (
                <div key={it.id} className="border rounded-lg p-3">
                  <div className="text-sm mb-2">التعديل {idx + 1}</div>
                  <Input
                    value={it.text}
                    onChange={(e) => setItems(prev => prev.map(x => x.id === it.id ? { ...x, text: e.target.value } : x))}
                    placeholder="وصف التعديل"
                  />
                  <div className="mt-2">
                    <input
                      type="file"
                      onChange={(e) => onChangeFile(it.id, e.target.files?.[0] || null)}
                    />
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" onClick={() => duplicateItem(it.id)}>تكرار</Button>
                    <Button variant="destructive" onClick={() => removeItem(it.id)}>حذف</Button>
                  </div>
                </div>
              ))}
              <Button className="gap-2" onClick={addItem}>إضافة حقل جديد</Button>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              <Button onClick={printNow}>طباعة</Button>
              <Button variant="outline" onClick={downloadHtml}>تصدير HTML</Button>
              <Button variant="outline" onClick={saveHtmlToSystem}>حفظ HTML بالنظام</Button>
              <Button onClick={saveFormToSystem}>حفظ الاستمارة بالنظام</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>معاينة قابلة للطباعة</CardTitle>
          </CardHeader>
          <CardContent>
            <iframe ref={iframeRef} className="w-full h-[70vh] bg-white border rounded-lg" title="Printable Preview" />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
