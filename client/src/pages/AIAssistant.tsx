/*
 © 2025 - Property of [Mohammed Ahmed / Golden Touch Design co.]
 Unauthorized use or reproduction is prohibited.
*/
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

type Message = { role: "user" | "assistant"; content: string };

export default function AIAssistant() {
  useAuth({ redirectOnUnauthenticated: true });
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "مرحباً! أنا مساعد الذكاء الاصطناعي. كيف يمكنني مساعدتك؟" },
  ]);
  const [input, setInput] = useState("");

  const sendMessage = async () => {
    const prompt = input.trim();
    if (!prompt) return;
    setMessages((m) => [...m, { role: "user", content: prompt }]);
    setInput("");
    try {
      if (!apiUrl || !apiKey) {
        setMessages((m) => [...m, { role: "assistant", content: "يرجى ضبط رابط الـ API والمفتاح أولاً." }]);
        return;
      }
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          messages,
          query: prompt,
          context: {
            // Placeholder to pass needed context; can be extended to fetch data via tRPC
          }
        }),
      });
      const data = await res.json().catch(() => null);
      const reply = data?.reply ?? "لم أتلقَّ رداً من واجهة الـ API.";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "تعذّر الاتصال بواجهة الـ API." }]);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">مساعد AI</h1>
            <p className="text-muted-foreground">محادثة ذكية للوصول إلى بيانات النظام ومساعدتك</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>إعدادات الاتصال</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm mb-2">رابط الـ API</div>
              <Input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="https://api.example.com/chat" />
            </div>
            <div>
              <div className="text-sm mb-2">مفتاح الـ API</div>
              <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="أدخل المفتاح" type="password" />
            </div>
            <div className="flex items-end">
              <Button onClick={() => { /* No-op: values already bound */ }}>
                تفعيل
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>المحادثة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border rounded-lg p-4 h-[50vh] overflow-auto bg-accent/50">
              {messages.map((m, idx) => (
                <div key={idx} className={`mb-3 ${m.role === "user" ? "text-right" : "text-left"}`}>
                  <span className={`inline-block px-3 py-2 rounded-lg ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                    {m.content}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="اكتب رسالتك..." />
              <Button onClick={sendMessage}>إرسال</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
