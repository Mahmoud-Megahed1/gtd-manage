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
import { useRoute } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export default function TaskDetails() {
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const [, params] = useRoute("/tasks/:id");
  const id = Number(params?.id || 0);
  const { data, isLoading, refetch } = trpc.tasks.getById.useQuery({ id }, { refetchOnWindowFocus: false, enabled: !!id });
  const update = trpc.tasks.update.useMutation({ onSuccess: () => { toast.success("تم التحديث"); refetch(); } });
  const addComment = trpc.tasks.comments.add.useMutation({ onSuccess: () => { toast.success("تمت إضافة التعليق"); refetch(); } });
  const deleteComment = trpc.tasks.comments.delete.useMutation({ onSuccess: () => { toast.success("تم حذف التعليق"); refetch(); } });
  const createChild = trpc.tasks.create.useMutation({ onSuccess: () => { toast.success("تمت إضافة المهمة الفرعية"); refetch(); } });
  const deleteTask = trpc.tasks.delete.useMutation({ onSuccess: () => { toast.success("تم حذف المهمة"); refetch(); } });
  const { data: logs } = trpc.auditLogs.getEntityLogs.useQuery({ entityType: "task", entityId: id }, { refetchOnWindowFocus: false, enabled: !!id && user?.role === "admin" });
  const [comment, setComment] = useState("");
  const [childName, setChildName] = useState("");
  const [childStatus, setChildStatus] = useState("planned");

  if (isLoading || !data) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="h-32 bg-muted rounded animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  const t = data.task as any;
  const children = (data.children || []) as any[];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>تفاصيل المهمة</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm">اسم المهمة</label>
              <Input defaultValue={t.name} onBlur={(e) => update.mutate({ id, name: e.target.value })} />
            </div>
            <div>
              <label className="text-sm">الحالة</label>
              <Input defaultValue={t.status} onBlur={(e) => update.mutate({ id, status: e.target.value as any })} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm">الوصف</label>
              <Textarea rows={4} defaultValue={t.description || ""} onBlur={(e) => update.mutate({ id, description: e.target.value })} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>المهام الفرعية</CardTitle>
          </CardHeader>
          <CardContent>
            {children.length === 0 ? (
              <div className="text-sm text-muted-foreground">لا توجد مهام فرعية</div>
            ) : (
              <div className="space-y-2">
                {children.map((c: any) => (
                  <div key={c.id} className="border rounded p-2 grid grid-cols-5 gap-2 items-center">
                    <div className="col-span-2">
                      <Input defaultValue={c.name} onBlur={(e) => update.mutate({ id: c.id, name: e.target.value })} />
                    </div>
                    <div>
                      <Input defaultValue={c.status} onBlur={(e) => update.mutate({ id: c.id, status: e.target.value as any })} />
                    </div>
                    <div>
                      <Input type="date" defaultValue={c.endDate ? new Date(c.endDate).toISOString().slice(0,10) : ""} onBlur={(e) => update.mutate({ id: c.id, endDate: e.target.value ? new Date(e.target.value) : undefined })} />
                    </div>
                    <div className="text-right">
                      <Button variant="outline" className="text-destructive" onClick={() => deleteTask.mutate({ id: c.id })}>حذف</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 grid md:grid-cols-4 gap-2">
              <div className="md:col-span-2">
                <Input placeholder="اسم المهمة الفرعية" value={childName} onChange={(e) => setChildName(e.target.value)} />
              </div>
              <div>
                <Input placeholder="الحالة" value={childStatus} onChange={(e) => setChildStatus(e.target.value)} />
              </div>
              <div>
                <Button
                  onClick={() => {
                    const name = childName.trim();
                    if (!name) return;
                    createChild.mutate({ projectId: t.projectId, name, parentId: id, status: childStatus as any });
                    setChildName("");
                    setChildStatus("planned");
                  }}
                >
                  إضافة مهمة فرعية
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>التعليقات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              {data.comments.length === 0 ? (
                <div className="text-sm text-muted-foreground">لا توجد تعليقات</div>
              ) : (
                data.comments.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between">
                    <span className="text-sm">{c.content}</span>
                    <Button variant="ghost" size="sm" onClick={() => deleteComment.mutate({ id: c.id })}>حذف</Button>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="أضف تعليقاً" />
              <Button
                variant="outline"
                onClick={() => {
                  const v = comment.trim();
                  if (!v) return;
                  addComment.mutate({ taskId: id, content: v });
                  setComment("");
                }}
              >
                إضافة
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>سجل النشاط</CardTitle>
          </CardHeader>
          <CardContent>
            {user?.role !== "admin" ? (
              <div className="text-sm text-muted-foreground">السجل مرئي للمسؤول فقط</div>
            ) : !logs ? (
              <div className="h-16 bg-muted rounded animate-pulse" />
            ) : logs.length === 0 ? (
              <div className="text-sm text-muted-foreground">لا يوجد سجل</div>
            ) : (
              <ul className="space-y-2">
                {logs.map((l: any) => (
                  <li key={l.id} className="border rounded p-2 flex justify-between">
                    <span className="text-sm">{l.action} - {l.details || ""}</span>
                    <span className="text-xs text-muted-foreground">{new Date(l.createdAt).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
