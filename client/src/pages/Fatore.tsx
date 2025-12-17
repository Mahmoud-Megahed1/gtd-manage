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

export default function Fatore() {
  useAuth({ redirectOnUnauthenticated: true });
  const [, setLocation] = useLocation();
  const uploadFile = trpc.files.upload.useMutation({
    onSuccess: () => toast.success("تم حفظ نسخة ملف"),
    onError: () => toast.error("تعذر حفظ ملف النسخة"),
  });
  const createInvoice = trpc.invoices.create.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ المستند كمسودة ويمكن حذفه من القائمة");
      setLocation("/invoices");
    },
    onError: () => toast.error("تعذر حفظ المسودة"),
  });
  const [htmlLoaded, setHtmlLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [docType, setDocType] = useState<"invoice" | "quote">("invoice");
  const { data: clients } = trpc.clients.list.useQuery();
  const { data: projects } = trpc.projects.list.useQuery();
  const [target, setTarget] = useState<{ clientId?: number; projectId?: number }>({});

  useEffect(() => {
    const onLoad = () => setHtmlLoaded(true);
    const iframe = iframeRef.current;
    if (!iframe) return;

    // Check if iframe is already loaded
    if (iframe.contentDocument?.readyState === 'complete') {
      setHtmlLoaded(true);
    }

    // Fallback: set loaded after 3 seconds regardless
    const timeout = setTimeout(() => setHtmlLoaded(true), 3000);

    iframe.addEventListener("load", onLoad);
    iframe.addEventListener("load", () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) return;
        const makeSnapshot = (d: Document) => {
          try {
            d.querySelectorAll('input').forEach((el) => {
              const input = el as HTMLInputElement;
              if (["checkbox", "radio"].includes(input.type)) {
                if (input.checked) el.setAttribute("checked", "");
                else el.removeAttribute("checked");
              } else {
                el.setAttribute("value", input.value ?? "");
              }
            });
            d.querySelectorAll('textarea').forEach((el) => {
              const ta = el as HTMLTextAreaElement;
              el.textContent = ta.value ?? "";
            });
            d.querySelectorAll('select').forEach((el) => {
              const sel = el as HTMLSelectElement;
              el.setAttribute("value", sel.value ?? "");
              Array.from(sel.options).forEach((opt) => {
                if (opt.selected) opt.setAttribute("selected", "");
                else opt.removeAttribute("selected");
              });
            });
          } catch { }
          return "<!DOCTYPE html>\n" + d.documentElement.outerHTML;
        };
        const extractHtml = async () => {
          try {
            return makeSnapshot(doc);
          } catch {
            try {
              const res = await fetch("/fatore.HTML", { cache: "no-store" });
              return await res.text();
            } catch {
              return doc.documentElement.outerHTML;
            }
          }
        };
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
        const saveInvoiceDraft = async () => {
          const text = await extractHtml();
          const created = await createInvoice.mutateAsync({
            type: docType,
            clientId: target.clientId || 0,
            projectId: target.projectId,
            issueDate: new Date(),
            subtotal: 0,
            tax: 0,
            discount: 0,
            total: 0,
            notes: "نسخة ضمنية تلقائية",
            terms: undefined,
            formData: text,
            items: [],
          });
          const invoiceId = (created as any)?.id;
          if (invoiceId) {
            const base64 = btoa(unescape(encodeURIComponent(text)));
            await uploadFile.mutateAsync({
              entityType: "invoice",
              entityId: invoiceId,
              fileName: `invoice-${Date.now()}.html`,
              fileData: base64,
              mimeType: "text/html",
            });
            const images = collectImages();
            for (let i = 0; i < images.length; i++) {
              await uploadFile.mutateAsync({
                entityType: "invoice",
                entityId: invoiceId,
                fileName: `img-${i + 1}.png`,
                fileData: images[i].fileData,
                mimeType: images[i].mimeType || "image/png",
              });
            }
          }
          toast.success("تم حفظ المسودة والمرفقات تلقائياً");
          setLocation("/invoices");
        };
        doc.addEventListener(
          "click",
          async (e) => {
            const targetEl = e.target as HTMLElement;
            const txt = (targetEl?.textContent || "").trim();
            if (targetEl?.tagName === "BUTTON" && /حفظ|PDF|تصدير/.test(txt)) {
              try {
                await saveInvoiceDraft();
              } catch { }
            }
          },
          true
        );
      } catch { }
    });
    return () => {
      iframe.removeEventListener("load", onLoad);
      clearTimeout(timeout);
    };
  }, []);

  const handleSaveFileCopy = async () => {
    try {
      let text: string | null = null;
      const doc = iframeRef.current?.contentDocument;
      const makeSnapshot = (d: Document) => {
        try {
          d.querySelectorAll('input').forEach((el) => {
            const input = el as HTMLInputElement;
            if (["checkbox", "radio"].includes(input.type)) {
              if (input.checked) el.setAttribute("checked", "");
              else el.removeAttribute("checked");
            } else {
              el.setAttribute("value", input.value ?? "");
            }
          });
          d.querySelectorAll('textarea').forEach((el) => {
            const ta = el as HTMLTextAreaElement;
            el.textContent = ta.value ?? "";
          });
          d.querySelectorAll('select').forEach((el) => {
            const sel = el as HTMLSelectElement;
            el.setAttribute("value", sel.value ?? "");
            Array.from(sel.options).forEach((opt) => {
              if (opt.selected) opt.setAttribute("selected", "");
              else opt.removeAttribute("selected");
            });
          });
        } catch { }
        return "<!DOCTYPE html>\n" + d.documentElement.outerHTML;
      };
      if (doc) {
        text = makeSnapshot(doc);
      } else {
        const res = await fetch("/fatore.HTML");
        if (res.ok) {
          text = await res.text();
        }
      }
      if (!text) throw new Error("fetch_failed");
      const base64 = btoa(unescape(encodeURIComponent(text)));
      const upload = await uploadFile.mutateAsync({
        entityType: "invoice_copy",
        entityId: 0,
        fileName: `fatore-${Date.now()}.html`,
        fileData: base64,
        mimeType: "text/html"
      });
      toast.success("تم حفظ نسخة الصفحة");
      return upload;
    } catch (error) {
      console.error("[Fatore] handleSaveFileCopy error:", error);
      toast.error("تعذر جلب الصفحة وحفظها");
    }
  };

  const handleSaveDraftRecord = async () => {
    try {
      console.log("[Fatore] Fetching /fatore.HTML...");
      const res = await fetch("/fatore.HTML");
      if (!res.ok) {
        console.error("[Fatore] Failed to fetch:", res.status, res.statusText);
        toast.error("تعذر جلب صفحة الفاتورة");
        return;
      }
      const text = await res.text();
      console.log("[Fatore] Creating invoice draft...");
      await createInvoice.mutateAsync({
        type: docType,
        clientId: target.clientId || 0,
        projectId: target.projectId,
        issueDate: new Date(),
        subtotal: 0,
        tax: 0,
        discount: 0,
        total: 0,
        notes: "نسخة ضمنية",
        terms: undefined,
        formData: text,
        items: []
      });
    } catch {
      toast.error("تعذر حفظ المسودة");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">إنشاء فاتورة / عرض سعر</h1>
            <p className="text-muted-foreground">صفحة ضمنية لحفظ نسخة داخل البرنامج</p>
          </div>
          <Button variant="outline" onClick={() => setLocation("/invoices")}>
            العودة
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>صفحة فاتورة / عرض سعر (ضمنية)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-sm">النوع:</span>
              <select
                className="p-2 border rounded"
                value={docType}
                onChange={(e) => setDocType(e.target.value as "invoice" | "quote")}
              >
                <option value="invoice">فاتورة</option>
                <option value="quote">عرض سعر</option>
              </select>
            </div>
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
            <div className="border rounded-lg overflow-hidden">
              <iframe
                ref={iframeRef}
                src="/fatore.HTML"
                className="w-full h-[70vh] bg-white"
                title="Fatore Page"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setLocation("/invoices")}>
                العودة للقائمة
              </Button>
              <Button onClick={handleSaveFileCopy} disabled={uploadFile.isPending || !htmlLoaded}>
                {uploadFile.isPending ? "جاري الحفظ..." : "حفظ نسخة في البرنامج"}
              </Button>
              <Button onClick={handleSaveDraftRecord} disabled={createInvoice.isPending || !htmlLoaded}>
                {createInvoice.isPending ? "جاري الحفظ..." : "حفظ كمسودة قابلة للحذف"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
