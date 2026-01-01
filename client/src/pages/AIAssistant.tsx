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
  const [selectedModel, setSelectedModel] = useState<"flash" | "pro" | "exp">("flash");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");

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

  // Check if Gemini is configured (API key exists)
  const { data: config } = trpc.ai.isConfigured.useQuery();

  // Chat mutation
  const chatMutation = trpc.ai.chat.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
      setIsChatLoading(false);
    },
    onError: (error) => {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: `عذراً، حدث خطأ: ${error.message}`
      }]);
      setIsChatLoading(false);
    }
  });

  const sendMessage = async () => {
    const prompt = input.trim();
    if (!prompt || isChatLoading) return;

    // Add user message
    const newMessages = [...messages, { role: "user" as const, content: prompt }];
    setMessages(newMessages);
    setInput("");
    setIsChatLoading(true);

    // Call backend
    chatMutation.mutate({
      message: prompt,
      modelType: selectedModel,
      conversationHistory: messages.map(m => ({ role: m.role, content: m.content }))
    });
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
            <p className="text-muted-foreground">مساعد ذكي مدعوم بـ Google Gemini</p>
          </div>

          {/* Configuration Status */}
          <div className="flex items-center gap-2">
            {config?.configured ? (
              <span className="flex items-center gap-1 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                <CheckCircle className="h-4 w-4" />
                متصل بالخدمة
              </span>
            ) : (
              <span className="flex items-center gap-1 text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                <AlertCircle className="h-4 w-4" />
                غير متصل (يتطلب إعداد المفتاح)
              </span>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              المحادثة الذكية
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              إعدادات الصفحة (Legacy)
            </TabsTrigger>
          </TabsList>

          {/* Chat Tab */}
          <TabsContent value="chat" className="space-y-4">
            <Card>
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>محادثة مع Gemini</CardTitle>
                    <CardDescription>
                      اسأل عن أي شيء يخص العمل أو اطلب المساعدة في المهام
                    </CardDescription>
                  </div>

                  {/* Model Selector */}
                  <select
                    className="p-2 border rounded-md text-sm bg-background w-[280px]"
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value as any)}
                    disabled={isChatLoading}
                  >
                    <option value="flash">⚡ Gemini 1.5 Flash (سريع - للمهام اليومية)</option>
                    <option value="pro">🧠 Gemini 1.5 Pro (ذكي - للتحليل العميق)</option>
                    <option value="exp">🚀 Gemini 2.0 Exp (تجريبي - الأحدث)</option>
                  </select>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {/* Messages Area */}
                <div className="h-[60vh] overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                  {messages.map((m, idx) => (
                    <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] px-4 py-3 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${m.role === "user"
                            ? "bg-primary text-primary-foreground rounded-tl-none"
                            : "bg-white border text-slate-800 rounded-tr-none"
                          }`}
                      >
                        {m.content}
                      </div>
                    </div>
                  ))}

                  {isChatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border px-4 py-3 rounded-2xl rounded-tr-none shadow-sm flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground animate-pulse">جاري الكتابة...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <div className="p-4 border-t bg-background">
                  <div className="flex gap-2">
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="اكتب رسالتك هنا..."
                      className="min-h-[50px] resize-none focus-visible:ring-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      disabled={isChatLoading}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!input.trim() || isChatLoading}
                      className="h-auto px-6"
                    >
                      {isChatLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        "إرسال"
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    الردود يتم إنشاؤها بواسطة الذكاء الاصطناعي وقد تحتمل الخطأ. يرجى مراجعة المعلومات المهمة.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab (Legacy) */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>صفحة Gemini الخارجية (تضمين)</CardTitle>
                <CardDescription>
                  يمكنك هنا تضمين صفحة Gemini الخارجية، ولكن نوصي باستخدام المحادثة الذكية المباشرة في التبويب السابق.
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
                      onClick={() => window.open(geminiPage.pageUrl, '_blank')}
                    >
                      <Globe className="h-4 w-4 ml-2" />
                      فتح في نافذة جديدة
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
