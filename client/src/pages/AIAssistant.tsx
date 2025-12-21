/*
 © 2025 - Property of [Mohammed Ahmed / Golden Touch Design co.]
 Unauthorized use or reproduction is prohibited.
*/
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { GeminiPage } from "@/components/GeminiPage";
import {
  Settings,
  MessageSquare,
  Globe,
  Save,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  AlertCircle
} from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

export default function AIAssistant() {
  useAuth({ redirectOnUnauthenticated: true });

  // Settings state
  const [pageUrl, setPageUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "مرحباً! أنا مساعد الذكاء الاصطناعي. كيف يمكنني مساعدتك؟" },
  ]);
  const [input, setInput] = useState("");
  const [activeTab, setActiveTab] = useState("settings");

  // Fetch saved Gemini page settings
  const { data: geminiPage, isLoading, refetch } = trpc.ai.getGeminiPage.useQuery();

  // Mutations
  const savePageMutation = trpc.ai.saveGeminiPage.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ الإعدادات بنجاح");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "فشل حفظ الإعدادات");
    },
  });

  const hidePageMutation = trpc.ai.hideGeminiPage.useMutation({
    onSuccess: () => {
      toast.success("تم إخفاء الصفحة");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "فشل إخفاء الصفحة");
    },
  });

  const showPageMutation = trpc.ai.showGeminiPage.useMutation({
    onSuccess: () => {
      toast.success("تم إظهار الصفحة");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "فشل إظهار الصفحة");
    },
  });

  // Initialize form with saved data
  useEffect(() => {
    if (geminiPage?.pageUrl) {
      setPageUrl(geminiPage.pageUrl);
    }
  }, [geminiPage]);

  // Switch to gemini tab if page exists and not hidden
  useEffect(() => {
    if (geminiPage?.pageUrl && !geminiPage.isHidden) {
      setActiveTab("gemini");
    }
  }, [geminiPage]);

  const handleSaveSettings = async () => {
    if (!pageUrl) {
      toast.error("يرجى إدخال رابط الصفحة");
      return;
    }

    // Validate URL
    try {
      new URL(pageUrl);
    } catch {
      toast.error("الرابط غير صالح");
      return;
    }

    if (!pageUrl.startsWith('https://')) {
      toast.error("يجب أن يكون الرابط آمناً (HTTPS)");
      return;
    }

    setIsSaving(true);
    try {
      await savePageMutation.mutateAsync({
        pageUrl,
        apiKey: apiKey || undefined,
      });
      setActiveTab("gemini");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleVisibility = async () => {
    if (geminiPage?.isHidden) {
      await showPageMutation.mutateAsync();
    } else {
      await hidePageMutation.mutateAsync();
    }
  };

  const handleRefreshIframe = () => {
    setIframeKey(prev => prev + 1);
  };

  const sendMessage = async () => {
    const prompt = input.trim();
    if (!prompt) return;
    setMessages((m) => [...m, { role: "user", content: prompt }]);
    setInput("");
    try {
      // For now, just show a placeholder response
      // This can be extended to use the actual API
      setMessages((m) => [...m, { role: "assistant", content: "هذه الميزة قيد التطوير. سيتم ربطها بنظام AI قريباً." }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "تعذّر الاتصال بواجهة الـ API." }]);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">مساعد AI</h1>
            <p className="text-muted-foreground">محادثة ذكية للوصول إلى بيانات النظام ومساعدتك</p>
          </div>

          {/* Status indicator */}
          {geminiPage?.pageUrl && (
            <div className="flex items-center gap-2">
              {geminiPage.isHidden ? (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <EyeOff className="h-4 w-4" />
                  الصفحة مخفية
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  الصفحة نشطة
                </span>
              )}
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              الإعدادات
            </TabsTrigger>
            <TabsTrigger
              value="gemini"
              className="flex items-center gap-2"
              disabled={!geminiPage?.pageUrl || geminiPage?.isHidden}
            >
              <Globe className="h-4 w-4" />
              صفحة Gemini
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              المحادثة
            </TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>إعدادات صفحة Gemini</CardTitle>
                <CardDescription>
                  أدخل رابط صفحة Gemini الخارجية ومفتاح API (اختياري) لعرضها داخل النظام
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      رابط الصفحة <span className="text-destructive">*</span>
                    </label>
                    <Input
                      value={pageUrl}
                      onChange={(e) => setPageUrl(e.target.value)}
                      placeholder="https://gemini.google.com/..."
                      dir="ltr"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      يجب أن يكون الرابط آمناً (HTTPS)
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      مفتاح API (اختياري)
                    </label>
                    <Input
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="أدخل المفتاح للتحقق"
                      type="password"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      سيتم تشفير المفتاح للأمان
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleSaveSettings}
                    disabled={isSaving || !pageUrl}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 ml-2" />
                    )}
                    حفظ الإعدادات
                  </Button>

                  {geminiPage?.pageUrl && (
                    <Button
                      variant="outline"
                      onClick={handleToggleVisibility}
                      disabled={hidePageMutation.isPending || showPageMutation.isPending}
                    >
                      {geminiPage.isHidden ? (
                        <>
                          <Eye className="h-4 w-4 ml-2" />
                          إظهار الصفحة
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-4 w-4 ml-2" />
                          إخفاء الصفحة
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* Saved Page Info */}
                {geminiPage && (
                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">معلومات الصفحة المحفوظة</h4>
                    <div className="text-sm space-y-1 text-muted-foreground">
                      <p>الرابط: <code className="bg-background px-1 rounded">{geminiPage.pageUrl}</code></p>
                      <p>مفتاح API: {geminiPage.hasApiKey ? "✓ محفوظ" : "✗ غير محدد"}</p>
                      <p>الحالة: {geminiPage.isHidden ? "مخفية" : "مرئية"}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Gemini Page Tab */}
          <TabsContent value="gemini">
            {geminiPage?.pageUrl && !geminiPage.isHidden ? (
              <GeminiPage
                key={iframeKey}
                pageUrl={geminiPage.pageUrl}
                onRefresh={handleRefreshIframe}
              />
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-[60vh] text-center">
                  <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">لا توجد صفحة نشطة</h3>
                  <p className="text-muted-foreground mb-4">
                    قم بإضافة رابط صفحة Gemini في تبويب الإعدادات لعرضها هنا
                  </p>
                  <Button onClick={() => setActiveTab("settings")}>
                    <Settings className="h-4 w-4 ml-2" />
                    الذهاب للإعدادات
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat">
            <Card>
              <CardHeader>
                <CardTitle>المحادثة</CardTitle>
                <CardDescription>
                  تواصل مع مساعد الذكاء الاصطناعي للحصول على مساعدة
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border rounded-lg p-4 h-[50vh] overflow-auto bg-accent/50">
                  {messages.map((m, idx) => (
                    <div key={idx} className={`mb-3 ${m.role === "user" ? "text-right" : "text-left"}`}>
                      <span className={`inline-block px-3 py-2 rounded-lg max-w-[80%] ${m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                        }`}>
                        {m.content}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="اكتب رسالتك..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  <Button onClick={sendMessage}>إرسال</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
