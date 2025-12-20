import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, KeyRound, ArrowRight, Clock, CheckCircle, XCircle, Copy } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function Home() {
  const { user, loading, refresh } = useAuth({ redirectOnUnauthenticated: false });
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [requestId, setRequestId] = useState<number | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [approvalMessage, setApprovalMessage] = useState<string | null>(null);

  const loginMutation = trpc.auth.loginWithPassword.useMutation({
    onSuccess: (data) => {
      if (data.mustChangePassword) {
        toast.info("يجب تغيير كلمة السر المؤقتة");
        refresh();
        setLocation("/change-password");
        return;
      }
      toast.success("تم تسجيل الدخول بنجاح");
      refresh();
      setLocation("/dashboard");
    },
    onError: (error) => {
      toast.error(error.message || "فشل تسجيل الدخول");
      setIsLoggingIn(false);
    }
  });

  const forgotMutation = trpc.users.requestPasswordReset.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "تم إرسال طلبك للمدير");
      if (data.requestId) {
        setRequestId(data.requestId);
      }
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    }
  });

  // Poll for request status
  const checkQuery = trpc.users.checkResetRequest.useQuery(
    { requestId: requestId! },
    {
      enabled: !!requestId && !tempPassword && !approvalMessage,
      refetchInterval: 3000 // Poll every 3 seconds
    }
  );

  // Handle status changes
  useEffect(() => {
    if (checkQuery.data) {
      if (checkQuery.data.status === 'approved_temp' && checkQuery.data.tempPassword) {
        setTempPassword(checkQuery.data.tempPassword);
      } else if (checkQuery.data.status === 'approved_link') {
        setApprovalMessage('تم إرسال رابط تعيين كلمة السر لحسابك. يرجى فتح الإشعارات للوصول للرابط.');
      } else if (checkQuery.data.status === 'rejected') {
        setApprovalMessage(checkQuery.data.message || 'تم رفض طلبك');
      }
    }
  }, [checkQuery.data]);

  useEffect(() => {
    if (!loading && user) {
      // Check if user must change password (temp password was set)
      if ((user as any).mustChangePassword) {
        setLocation("/change-password");
      } else {
        setLocation("/dashboard");
      }
    }
  }, [loading, user, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/.+@.+\..+/.test(email)) {
      toast.error("يرجى إدخال بريد إلكتروني صالح");
      return;
    }
    if (!password) {
      toast.error("يرجى إدخال كلمة السر");
      return;
    }
    setIsLoggingIn(true);
    loginMutation.mutate({ email, password });
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || !/.+@.+\..+/.test(forgotEmail)) {
      toast.error("يرجى إدخال بريد إلكتروني صالح");
      return;
    }
    forgotMutation.mutate({ email: forgotEmail });
  };

  const resetForgotMode = () => {
    setForgotMode(false);
    setRequestId(null);
    setTempPassword(null);
    setApprovalMessage(null);
    setForgotEmail("");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("تم النسخ!");
  };

  // Forgot Password Mode
  if (forgotMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5" dir="rtl">
        <div className="max-w-md w-full p-8 space-y-8">
          <div className="text-center space-y-4">
            <KeyRound className="w-16 h-16 text-primary mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">نسيت كلمة السر؟</h1>

            {/* Show temp password if approved */}
            {tempPassword ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle className="w-6 h-6" />
                  <span>تمت الموافقة على طلبك!</span>
                </div>
                <p className="text-muted-foreground">كلمة السر المؤقتة:</p>
                <div className="bg-muted p-4 rounded-lg flex items-center justify-between">
                  <span className="font-mono text-xl font-bold">{tempPassword}</span>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(tempPassword)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <div className="text-sm space-y-1">
                  <p className="text-orange-600">⚠️ يجب تغيير كلمة السر بعد تسجيل الدخول</p>
                  <p className="text-muted-foreground">⏰ صالحة لمدة 24 ساعة فقط</p>
                </div>
                <Button onClick={resetForgotMode} className="w-full">
                  تسجيل الدخول
                </Button>
              </div>
            ) : approvalMessage ? (
              <div className="space-y-4">
                {approvalMessage.includes('رفض') ? (
                  <div className="flex items-center justify-center gap-2 text-red-600">
                    <XCircle className="w-6 h-6" />
                    <span>{approvalMessage}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <CheckCircle className="w-6 h-6" />
                    <span>{approvalMessage}</span>
                  </div>
                )}
                <Button onClick={resetForgotMode} className="w-full">
                  العودة لتسجيل الدخول
                </Button>
              </div>
            ) : requestId ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2 text-primary">
                  <Clock className="w-6 h-6 animate-pulse" />
                  <span>طلبك قيد المراجعة</span>
                </div>
                <p className="text-muted-foreground">يرجى الانتظار حتى موافقة المدير</p>
                <div className="flex gap-2">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                </div>
                <Button variant="outline" onClick={resetForgotMode} className="w-full">
                  إلغاء
                </Button>
              </div>
            ) : (
              <>
                <p className="text-muted-foreground">أدخل بريدك الإلكتروني وسنرسل طلبك للمدير</p>
                <form onSubmit={handleForgotPassword} className="space-y-4 text-right">
                  <div className="space-y-2">
                    <Input
                      type="email"
                      placeholder="البريد الإلكتروني"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full text-lg h-14"
                    disabled={forgotMutation.isPending}
                  >
                    {forgotMutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                        جاري الإرسال...
                      </>
                    ) : (
                      "إرسال طلب تعيين كلمة سر"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={resetForgotMode}
                  >
                    <ArrowRight className="w-4 h-4 ml-2" />
                    العودة لتسجيل الدخول
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5" dir="rtl">
      <div className="max-w-md w-full p-8 space-y-8">
        <div className="text-center space-y-6">
          <img
            src="/logo.png"
            alt="Golden Touch Design"
            className="h-32 mx-auto"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (!target.src.includes('LOGO.png')) {
                target.src = '/LOGO.png';
              }
            }}
          />
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-3">Golden Touch Design</h1>
            <p className="text-xl text-primary font-medium">نظام الإدارة المتكامل</p>
          </div>
        </div>

        <form onSubmit={handlePasswordLogin} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="البريد الإلكتروني"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2 relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="كلمة السر"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <Button
            type="submit"
            size="lg"
            className="w-full text-lg h-14 shadow-lg hover:shadow-xl transition-all"
            disabled={isLoggingIn}
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                جاري تسجيل الدخول...
              </>
            ) : (
              "تسجيل الدخول"
            )}
          </Button>

          <div className="text-center space-y-2">
            <button
              type="button"
              className="text-sm text-primary hover:underline"
              onClick={() => setForgotMode(true)}
            >
              نسيت كلمة السر؟
            </button>
            <p className="text-sm text-muted-foreground">للوصول إلى النظام، يرجى تسجيل الدخول</p>
          </div>
        </form>
      </div>
    </div>
  );
}
