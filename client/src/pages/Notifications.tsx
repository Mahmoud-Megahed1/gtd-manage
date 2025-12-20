/*
 © 2025 - Property of [Mohammed Ahmed / Golden Touch Design co.]
 Unauthorized use or reproduction is prohibited.
*/
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { Bell, CheckCheck, Trash2 } from "lucide-react";

export default function Notifications() {
  useAuth({ redirectOnUnauthenticated: true });

  const utils = trpc.useUtils();
  const { data: notifications, isLoading } = trpc.notifications.list.useQuery({ limit: 50 });
  const { data: countData } = trpc.notifications.unreadCount.useQuery();

  const markReadMutation = trpc.notifications.markRead.useMutation({
    onSuccess: () => utils.notifications.invalidate()
  });
  const markAllReadMutation = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.invalidate();
      toast.success("تم تحديد الكل كمقروء");
    }
  });
  const deleteMutation = trpc.notifications.delete.useMutation({
    onSuccess: () => {
      utils.notifications.invalidate();
      toast.success("تم حذف الإشعار");
    }
  });

  const unreadCount = countData?.count || 0;

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-100 text-green-800 border-green-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'action': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'success': return 'تم بنجاح';
      case 'warning': return 'تنبيه';
      case 'action': return 'مطلوب إجراء';
      default: return 'معلومة';
    }
  };

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Bell className="h-8 w-8" />
              الإشعارات
            </h1>
            <p className="text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} إشعار غير مقروء` : 'لا توجد إشعارات جديدة'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              <CheckCheck className="h-4 w-4 ml-2" />
              تحديد الكل كمقروء
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
        ) : notifications && notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.map((notification: any) => (
              <Card
                key={notification.id}
                className={`transition-all ${!notification.isRead ? 'border-blue-300 bg-blue-50/50 dark:bg-blue-950/20' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded text-xs border ${getTypeColor(notification.type)}`}>
                          {getTypeLabel(notification.type)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(notification.createdAt)}
                        </span>
                        {!notification.isRead && (
                          <span className="h-2 w-2 bg-blue-500 rounded-full"></span>
                        )}
                      </div>
                      <h3 className="font-medium mb-1">{notification.title}</h3>
                      {notification.message && (
                        <p className="text-sm text-muted-foreground">{notification.message}</p>
                      )}
                      {notification.link && (
                        <a href={notification.link} className="text-sm text-primary hover:underline mt-2 inline-block">
                          عرض التفاصيل ←
                        </a>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markReadMutation.mutate({ notificationId: notification.id })}
                          title="تحديد كمقروء"
                        >
                          <CheckCheck className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate({ notificationId: notification.id })}
                        title="حذف"
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">لا توجد إشعارات</h3>
              <p className="text-muted-foreground">ستظهر الإشعارات هنا عند وصولها</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
