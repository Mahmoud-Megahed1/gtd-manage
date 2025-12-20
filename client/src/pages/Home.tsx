/*
 © 2025 - Property of [Mohammed Ahmed / Golden Touch Design co.]
 Unauthorized use or reproduction is prohibited.
*/
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, KeyRound, ArrowRight } from "lucide-react";
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

  const loginMutation = trpc.auth.loginWithPassword.useMutation({
    onSuccess: () => {
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
      setForgotMode(false);
      setForgotEmail("");
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    }
  });

  useEffect(() => {
    if (!loading && user) {
      setLocation("/dashboard");
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

  // Forgot Password Mode
  if (forgotMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5" dir="rtl">
        <div className="max-w-md w-full p-8 space-y-8">
          <div className="text-center space-y-4">
            <KeyRound className="w-16 h-16 text-primary mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">نسيت كلمة السر؟</h1>
            <p className="text-muted-foreground">أدخل بريدك الإلكتروني وسنرسل طلبك للمدير</p>
          </div>

          <form onSubmit={handleForgotPassword} className="space-y-4">
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
              onClick={() => setForgotMode(false)}
            >
              <ArrowRight className="w-4 h-4 ml-2" />
              العودة لتسجيل الدخول
            </Button>
          </form>
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
