import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Loader2, KeyRound, Eye, EyeOff, Shield } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function ChangePassword() {
    const [, setLocation] = useLocation();
    const { refresh } = useAuth({ redirectOnUnauthenticated: true });
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);

    const changePasswordMutation = trpc.users.changeMyPassword.useMutation({
        onSuccess: () => {
            toast.success("تم تغيير كلمة السر بنجاح!");
            refresh();
            setLocation("/dashboard");
        },
        onError: (error) => {
            toast.error(error.message || "فشل تغيير كلمة السر");
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentPassword) {
            toast.error("يرجى إدخال كلمة السر الحالية");
            return;
        }
        if (!newPassword || newPassword.length < 4) {
            toast.error("كلمة السر الجديدة يجب أن تكون 4 أحرف على الأقل");
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error("كلمة السر الجديدة غير متطابقة");
            return;
        }
        if (currentPassword === newPassword) {
            toast.error("كلمة السر الجديدة يجب أن تكون مختلفة عن الحالية");
            return;
        }

        changePasswordMutation.mutate({
            currentPassword,
            newPassword
        });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4" dir="rtl">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-orange-100 rounded-full">
                            <Shield className="w-8 h-8 text-orange-600" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl">تغيير كلمة السر</CardTitle>
                    <CardDescription className="text-orange-600">
                        ⚠️ يجب تغيير كلمة السر المؤقتة قبل المتابعة
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="currentPassword">كلمة السر الحالية (المؤقتة)</Label>
                            <div className="relative">
                                <Input
                                    id="currentPassword"
                                    type={showCurrentPassword ? "text" : "password"}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    placeholder="أدخل كلمة السر المؤقتة"
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                >
                                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="newPassword">كلمة السر الجديدة</Label>
                            <div className="relative">
                                <Input
                                    id="newPassword"
                                    type={showNewPassword ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="4 أحرف على الأقل"
                                />
                                <button
                                    type="button"
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                >
                                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">تأكيد كلمة السر الجديدة</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="أعد كتابة كلمة السر الجديدة"
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            size="lg"
                            disabled={changePasswordMutation.isPending}
                        >
                            {changePasswordMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                                    جاري التغيير...
                                </>
                            ) : (
                                <>
                                    <KeyRound className="w-4 h-4 ml-2" />
                                    تغيير كلمة السر
                                </>
                            )}
                        </Button>
                    </form>

                    <p className="text-xs text-muted-foreground text-center mt-4">
                        لن تتمكن من الوصول للنظام قبل تغيير كلمة السر
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
