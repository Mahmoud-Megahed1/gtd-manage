import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function Home() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: false });
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5" dir="rtl">
      <div className="max-w-md w-full p-8 space-y-8">
        <div className="text-center space-y-6">
          <img src="/logo.png" alt="Golden Touch Design" className="h-32 mx-auto" />
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-3">Golden Touch Design</h1>
            <p className="text-xl text-primary font-medium">نظام الإدارة المتكامل</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="البريد الإلكتروني"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button
            onClick={() => {
              if (!email || !/.+@.+\..+/.test(email)) {
                toast.error("يرجى إدخال بريد إلكتروني صالح");
                return;
              }
              window.location.assign(getLoginUrl(email));
            }}
            size="lg"
            className="w-full text-lg h-14 shadow-lg hover:shadow-xl transition-all"
          >
            تسجيل الدخول
          </Button>
          
          <div className="text-center text-sm text-muted-foreground">
            <p>للوصول إلى النظام، يرجى تسجيل الدخول</p>
          </div>
        </div>

        
      </div>
    </div>
  );
}
