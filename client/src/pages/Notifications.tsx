/*
 © 2025 - Property of [Mohammed Ahmed / Golden Touch Design co.]
 Unauthorized use or reproduction is prohibited.
*/
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Notifications() {
  useAuth({ redirectOnUnauthenticated: true });
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const notify = trpc.system.notifyOwner.useMutation({
    onSuccess: (res) => {
      if (res.success) toast.success("تم إرسال الإشعار بنجاح");
      else toast.error("تعذر إرسال الإشعار عبر الخدمة");
    },
    onError: () => toast.error("فشل إرسال الإشعار"),
  });
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">الإشعارات</h1>
          <p className="text-muted-foreground">إرسال إشعار إلى مالك النظام عبر خدمة الإشعارات المدمجة</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>إشعار جديد</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm">العنوان</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان الإشعار" />
            </div>
            <div className="space-y-2">
              <label className="text-sm">المحتوى</label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} placeholder="نص الإشعار" />
            </div>
            <Button
              onClick={() => notify.mutate({ title, content })}
              disabled={notify.isPending || !title.trim() || !content.trim()}
            >
              {notify.isPending ? "جاري الإرسال..." : "إرسال"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
