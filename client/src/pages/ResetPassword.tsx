import { useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, CheckCircle, XCircle, KeyRound } from 'lucide-react';

export default function ResetPassword() {
    const [, params] = useRoute('/reset-password/:token');
    const [, setLocation] = useLocation();
    const token = params?.token || '';

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Validate token
    const { data: validation, isLoading: validating } = trpc.users.validateResetToken.useQuery(
        { token },
        { enabled: !!token }
    );

    // Reset mutation
    const resetMutation = trpc.users.resetPasswordWithToken.useMutation({
        onSuccess: () => {
            toast.success('تم تغيير كلمة السر بنجاح!');
            setTimeout(() => setLocation('/'), 2000);
        },
        onError: (error) => {
            toast.error(error.message || 'حدث خطأ');
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (password.length < 4) {
            toast.error('كلمة السر يجب أن تكون 4 أحرف على الأقل');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('كلمتا السر غير متطابقتين');
            return;
        }

        resetMutation.mutate({ token, newPassword: password });
    };

    if (validating) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10" dir="rtl">
                <Card className="w-full max-w-md">
                    <CardContent className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="mr-3">جاري التحقق...</span>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!validation?.valid) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100" dir="rtl">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <XCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
                        <CardTitle className="text-red-600">رابط غير صالح</CardTitle>
                        <CardDescription>
                            هذا الرابط غير صالح أو منتهي الصلاحية.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <Button onClick={() => setLocation('/')} variant="outline">
                            العودة لصفحة الدخول
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (resetMutation.isSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100" dir="rtl">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
                        <CardTitle className="text-green-600">تم بنجاح!</CardTitle>
                        <CardDescription>
                            تم تغيير كلمة السر بنجاح. جاري تحويلك لصفحة الدخول...
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10" dir="rtl">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <KeyRound className="mx-auto h-12 w-12 text-primary mb-4" />
                    <CardTitle>تعيين كلمة سر جديدة</CardTitle>
                    <CardDescription>
                        مرحباً {validation.userName || validation.userEmail}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">كلمة السر الجديدة</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="أدخل كلمة السر الجديدة"
                                minLength={4}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">تأكيد كلمة السر</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="أعد إدخال كلمة السر"
                                minLength={4}
                                required
                            />
                        </div>
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={resetMutation.isPending}
                        >
                            {resetMutation.isPending ? (
                                <>
                                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                                    جاري الحفظ...
                                </>
                            ) : (
                                'تعيين كلمة السر'
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
