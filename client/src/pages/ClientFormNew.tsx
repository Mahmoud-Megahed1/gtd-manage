import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

export default function ClientFormNew() {
  useAuth({ redirectOnUnauthenticated: true });
  const [, setLocation] = useLocation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const createForm = trpc.forms.create.useMutation({
    onError: () => toast.error("تعذر حفظ الاستمارة"),
  });
  const uploadFile = trpc.files.upload.useMutation({
    onError: () => toast.error("تعذر رفع المرفق"),
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/clinthope.raw.html", { cache: "no-store" });
        const html = await res.text();
        if (cancelled) return;
        // Inject styles from <head> into document head without modification
        const styleBlocks = html.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || [];
        styleBlocks.forEach((block, idx) => {
          const marker = `embedded-clinthope-style-${idx}`;
          if (!document.querySelector(`style[data-marker="${marker}"]`)) {
            const styleEl = document.createElement("style");
            styleEl.setAttribute("data-marker", marker);
            styleEl.textContent = block.replace(/<\/?style[^>]*>/gi, "");
            document.head.appendChild(styleEl);
          }
        });
        // Extract body content to preserve page markup without replacing the app root
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        const bodyInner = bodyMatch ? bodyMatch[1] : html;
        if (containerRef.current) {
          containerRef.current.innerHTML = bodyInner;
          // Re-execute scripts found inside the injected content
          const scripts = Array.from(containerRef.current.querySelectorAll("script"));
          scripts.forEach((old) => {
            const s = document.createElement("script");
            // Preserve inline vs src
            if (old.src) {
              s.src = old.src;
            } else {
              s.textContent = old.textContent || "";
            }
            // Carry basic attributes
            if (old.type) s.type = old.type;
            if (old.defer) s.defer = true;
            if (old.async) s.async = true;
            old.replaceWith(s);
          });
          // Hook saving without changing template
          const hook = () => {
            try {
              const collectImages = () => {
                const imgs = Array.from(containerRef.current!.querySelectorAll("img"));
                return imgs
                  .map((img) => img.getAttribute("src") || "")
                  .filter((src) => src.startsWith("data:image/"))
                  .map((src, idx) => {
                    const mime = src.substring(5, src.indexOf(";"));
                    const base64 = src.split(",")[1] || "";
                    return { mimeType: mime || "image/png", fileData: base64, fileName: `img-${idx + 1}.png` };
                  });
              };
              const saveIntoSystem = async () => {
                const htmlSnapshot = "<!DOCTYPE html>\n" + containerRef.current!.innerHTML;
                const base64 = btoa(unescape(encodeURIComponent(htmlSnapshot)));
                // Create form record
                const result = await createForm.mutateAsync({
                  clientId: 0,
                  projectId: undefined,
                  formType: "request",
                  formData: htmlSnapshot,
                });
                const formId = (result as any)?.id;
                if (formId) {
                  await uploadFile.mutateAsync({
                    entityType: "form",
                    entityId: formId,
                    fileName: `request-${Date.now()}.html`,
                    fileData: base64,
                    mimeType: "text/html",
                  });
                  const images = collectImages();
                  for (const img of images) {
                    await uploadFile.mutateAsync({
                      entityType: "form",
                      entityId: formId,
                      fileName: img.fileName,
                      fileData: img.fileData,
                      mimeType: img.mimeType,
                    });
                  }
                  toast.success("تم حفظ الاستمارة والمرفقات تلقائياً");
                  setLocation("/forms");
                }
              };
              // Attach click listener to catch "حفظ" buttons inside template
              containerRef.current!.addEventListener("click", async (e) => {
                const el = e.target as HTMLElement;
                const txt = (el?.textContent || "").trim();
                if (el?.tagName === "BUTTON" && /حفظ|PDF|تصدير/.test(txt)) {
                  try {
                    await saveIntoSystem();
                  } catch {}
                }
              }, true);
            } catch {}
          };
          setTimeout(hook, 0);
        }
        setLoading(false);
      } catch {
        toast.error("تعذر تحميل نموذج الاستمارة");
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">إنشاء استمارة طلب عميل</h1>
            <p className="text-muted-foreground mt-2">دمج القالب داخل التطبيق دون تعديل على المحتوى أو الخصائص</p>
          </div>
          <Button variant="outline" onClick={() => setLocation("/forms")}>
            العودة
          </Button>
        </div>
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-8 bg-muted rounded w-1/3"></div>
                  <div className="h-6 bg-muted rounded w-1/2"></div>
                  <div className="h-[60vh] bg-muted rounded"></div>
                </div>
              </div>
            ) : (
              <div ref={containerRef} className="w-full" />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
