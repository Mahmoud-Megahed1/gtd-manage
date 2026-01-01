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
  const { user } = useAuth({ redirectOnUnauthenticated: true });

  // Settings state
  const [pageUrl, setPageUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [adminKey, setAdminKey] = useState(""); // Admin API Key input
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

  const setKeyMutation = trpc.ai.setApiKey.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث مفتاح API بنجاح");
      setAdminKey("");
      configRefetch(); // Refetch config status
    },
    onError: (error) => {
      toast.error(error.message || "فشل تحديث المفتاح");
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
    try {
      if (!pageUrl) {
        toast.error("الرجاء إدخال رابط الصفحة");
        return;
      }
      setIsSaving(true);
      await savePageMutation.mutateAsync({
        pageUrl,
        apiKey: apiKey || undefined,
      });
      setIsSaving(false);
    } catch {
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
  const { data: config, refetch: configRefetch } = trpc.ai.isConfigured.useQuery();

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

  const handleUpdateAdminKey = async () => {
    if (!adminKey) return;
    await setKeyMutation.mutateAsync({ apiKey: adminKey });
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
            {user?.role === 'admin' && (
              <TabsTrigger value="admin" className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-red-500" />
                إعدادات المسؤول
              </TabsTrigger>
            )}
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

          {/* ADMIN CONFIG TAB */}
          {user?.role === 'admin' && (
            <TabsContent value="admin" className="space-y-4">
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-700">إعدادات المسؤول (API Key)</CardTitle>
                  <CardDescription>
                    إعداد مفتاح Gemini API. هذا المفتاح سيُستخدم لجميع موظفي الشركة.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-red-50 p-4 rounded-lg text-sm text-red-800 border-r-4 border-red-500 mb-4">
                    <p className="font-bold mb-1">تنبيه أمني:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>هذا المفتاح يتم تشفيره وحفظه في قاعدة البيانات.</li>
                      <li>يتم استخدامه بدلاً من المفتاح الموجود في ملف .env (إذا وجد).</li>
                      <li>لا يمكن استرجاع المفتاح بعد الحفظ (لأسباب أمنية)، يمكن فقط استبداله.</li>
                    </ul>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Gemini API Key الجديد
                    </label>
                    <Input
                      value={adminKey}
                      onChange={(e) => setAdminKey(e.target.value)}
                      placeholder='AIzaSy...'
                      type="password"
                      className="max-w-xl"
                    />
                  </div>

                  <Button
                    onClick={handleUpdateAdminKey}
                    disabled={setKeyMutation.isPending || !adminKey}
                    variant="destructive"
                  >
                    {setKeyMutation.isPending ? (
                      <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 ml-2" />
                    )}
                    تحديث المفتاح (تشفير وحفظ)
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}

        </Tabs>
      </div>
    </DashboardLayout>
  );
}
