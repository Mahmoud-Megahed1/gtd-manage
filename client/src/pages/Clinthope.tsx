/*
 © 2025 - Property of [Mohammed Ahmed / Golden Touch Design co.]
 Unauthorized use or reproduction is prohibited.
*/
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Clinthope() {
  useAuth({ redirectOnUnauthenticated: true });
  const [, setLocation] = useLocation();
  const uploadFile = trpc.files.upload.useMutation({
    onSuccess: () => toast.success("تم حفظ نسخة الصفحة"),
    onError: () => toast.error("تعذر حفظ نسخة الصفحة"),
  });
  const [htmlLoaded, setHtmlLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const { data: clients } = trpc.clients.list.useQuery();
  const { data: projects } = trpc.projects.list.useQuery();
  const createForm = trpc.forms.create.useMutation();
  const [target, setTarget] = useState<{ clientId?: number; projectId?: number }>({});

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const onLoad = () => setHtmlLoaded(true);
    iframe.addEventListener("load", onLoad);
    iframe.addEventListener("load", () => {
      try {
        const doc = iframe.contentDocument;
        const win = iframe.contentWindow as any;
        if (!doc || !win) return;
        const extractHtml = () => doc.documentElement.outerHTML;
        const collectImages = () => {
          const imgs = Array.from(doc.querySelectorAll("img"));
          return imgs
            .map((img) => img.getAttribute("src") || "")
            .filter((src) => src.startsWith("data:image/"))
            .map((src) => {
              const mime = src.substring(5, src.indexOf(";"));
              const base64 = src.split(",")[1] || "";
              return { mimeType: mime, fileData: base64 };
            });
        };
        const saveIntoSystem = async () => {
          const html = extractHtml();
          const result = await createForm.mutateAsync({
            clientId: target.clientId || 0,
            projectId: target.projectId,
            formType: "request",
            formData: html,
          });
          const formId = (result as any)?.id;
          if (formId) {
            const base64 = btoa(unescape(encodeURIComponent(html)));
            await uploadFile.mutateAsync({
              entityType: "form",
              entityId: formId,
              fileName: `request-${Date.now()}.html`,
              fileData: base64,
              mimeType: "text/html",
            });
            const images = collectImages();
            for (let i = 0; i < images.length; i++) {
              await uploadFile.mutateAsync({
                entityType: "form",
                entityId: formId,
                fileName: `img-${i + 1}.png`,
                fileData: images[i].fileData,
                mimeType: images[i].mimeType || "image/png",
              });
            }
          }
          toast.success("تم حفظ الاستمارة والمرفقات تلقائياً");
          setLocation("/forms");
        };
        if (typeof win.saveHTML === "function") {
          const original = win.saveHTML.bind(win);
          win.saveHTML = async function () {
            try {
              await saveIntoSystem();
            } catch (e) { }
            return original();
          };
        }
        if (typeof win.prepareAndPrint === "function") {
          const original = win.prepareAndPrint.bind(win);
          win.prepareAndPrint = async function () {
            try {
              await saveIntoSystem();
            } catch (e) { }
            return original();
          };
        }
      } catch { }
    });
    return () => iframe.removeEventListener("load", onLoad);
  }, []);

  const handleSaveFileCopy = async () => {
    try {
      if (!target.clientId) {
        toast.error("يرجى اختيار العميل قبل الحفظ");
        return;
      }
      let text: string | null = null;
      const makeSnapshot = (doc: Document) => {
        try {
          doc.querySelectorAll('input').forEach((el) => {
            const input = el as HTMLInputElement;
            if (["checkbox", "radio"].includes(input.type)) {
              if (input.checked) el.setAttribute("checked", "");
              else el.removeAttribute("checked");
            } else {
              el.setAttribute("value", input.value ?? "");
            }
          });
          doc.querySelectorAll('textarea').forEach((el) => {
            const ta = el as HTMLTextAreaElement;
            el.textContent = ta.value ?? "";
          });
          doc.querySelectorAll('select').forEach((el) => {
            const sel = el as HTMLSelectElement;
            el.setAttribute("value", sel.value ?? "");
            Array.from(sel.options).forEach((opt) => {
              if (opt.selected) opt.setAttribute("selected", "");
              else opt.removeAttribute("selected");
            });
          });
        } catch { }
        return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
      };
      if (iframeRef.current?.contentDocument) {
        text = makeSnapshot(iframeRef.current.contentDocument);
      } else {
        const res = await fetch("/clinthope.raw.html");
        if (res.ok) {
          const raw = await res.text();
          text = raw;
        }
      }
      if (!text) throw new Error("fetch_failed");
      const clientName = (clients || []).find((c: any) => c.id === (target.clientId || -1))?.name || "بدون_عميل";
      const projectName = (projects || []).find((p: any) => p.id === (target.projectId || -1))?.name || "بدون_مشروع";
      const safeClient = clientName.replace(/\s+/g, "_");
      const safeProject = projectName.replace(/\s+/g, "_");
      const created = await createForm.mutateAsync({
        clientId: target.clientId || 0,
        projectId: target.projectId,
        formType: "request",
        formData: text
      });
      const formId = (created as any)?.id;
      if (formId) {
        const base64 = btoa(unescape(encodeURIComponent(text)));
        await uploadFile.mutateAsync({
          entityType: "form",
          entityId: formId,
          fileName: `طلب_${safeClient}_${safeProject}_${Date.now()}.html`,
          fileData: base64,
          mimeType: "text/html"
        });
      }
      toast.success("تم حفظ الاستمارة في قسم طلبات العملاء");
      setLocation("/forms");
    } catch {
      toast.error("تعذر جلب الصفحة وحفظها");
    }
  };

  const handleSaveAsRequestForm = async () => {
    try {
      if (!target.clientId) {
        toast.error("يرجى اختيار العميل قبل الحفظ");
        return;
      }
      const makeSnapshot = (doc: Document) => {
        try {
          doc.querySelectorAll('input').forEach((el) => {
            const input = el as HTMLInputElement;
            if (["checkbox", "radio"].includes(input.type)) {
              if (input.checked) el.setAttribute("checked", "");
              else el.removeAttribute("checked");
            } else {
              el.setAttribute("value", input.value ?? "");
            }
          });
          doc.querySelectorAll('textarea').forEach((el) => {
            const ta = el as HTMLTextAreaElement;
            el.textContent = ta.value ?? "";
          });
          doc.querySelectorAll('select').forEach((el) => {
            const sel = el as HTMLSelectElement;
            el.setAttribute("value", sel.value ?? "");
            Array.from(sel.options).forEach((opt) => {
              if (opt.selected) opt.setAttribute("selected", "");
              else opt.removeAttribute("selected");
            });
          });
        } catch { }
        return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
      };
      const doc = iframeRef.current?.contentDocument;
      const text = doc ? makeSnapshot(doc) : (await (await fetch("/clinthope.raw.html")).text());
      const result = await createForm.mutateAsync({
        clientId: target.clientId || 0,
        projectId: target.projectId,
        formType: "request",
        formData: text
      });
      const formId = (result as any)?.id;
      if (formId) {
        const clientName = (clients || []).find((c: any) => c.id === (target.clientId || -1))?.name || "بدون_عميل";
        const projectName = (projects || []).find((p: any) => p.id === (target.projectId || -1))?.name || "بدون_مشروع";
        const safeClient = clientName.replace(/\s+/g, "_");
        const safeProject = projectName.replace(/\s+/g, "_");
        const base64 = btoa(unescape(encodeURIComponent(text)));
        await uploadFile.mutateAsync({
          entityType: "form",
          entityId: formId,
          fileName: `طلب_${safeClient}_${safeProject}_${Date.now()}.html`,
          fileData: base64,
          mimeType: "text/html"
        });
      }
      toast.success("تم حفظ الاستمارة");
      setLocation("/forms");
    } catch {
      toast.error("تعذر حفظ الاستمارة");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">إنشاء استمارة طلب عميل</h1>
            <p className="text-sm sm:text-base text-muted-foreground">صفحة ضمنية لحفظ نسخة داخل البرنامج</p>
          </div>
          <Button variant="outline" onClick={() => setLocation("/forms")} className="w-full sm:w-auto">
            العودة
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>نموذج استمارة طلب عميل (ضمني)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm">العميل</label>
                <select
                  className="w-full p-2 border rounded"
                  value={target.clientId ?? ""}
                  onChange={(e) =>
                    setTarget({
                      ...target,
                      clientId: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                >
                  <option value="">بدون</option>
                  {clients?.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm">المشروع (اختياري)</label>
                <select
                  className="w-full p-2 border rounded"
                  value={target.projectId ?? ""}
                  onChange={(e) =>
                    setTarget({
                      ...target,
                      projectId: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                >
                  <option value="">بدون</option>
                  {projects?.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="border rounded-lg overflow_hidden">
              <iframe
                ref={iframeRef}
                src="/clinthope.raw.html"
                className="w-full h-[70vh] bg-white"
                title="Clinthope Page"
              />
            </div>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2">
              <Button variant="outline" onClick={() => setLocation("/forms")} className="w-full sm:w-auto">
                العودة
              </Button>
              <Button onClick={handleSaveFileCopy} disabled={uploadFile.isPending || !htmlLoaded} className="w-full sm:w-auto">
                {uploadFile.isPending ? "جاري الحفظ..." : "حفظ نسخة في البرنامج"}
              </Button>
              <Button onClick={handleSaveAsRequestForm} disabled={createForm.isPending || !htmlLoaded} className="w-full sm:w-auto">
                {createForm.isPending ? "جاري الحفظ..." : "حفظ كاستمارة طلب"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
