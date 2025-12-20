/*
 © 2025 - Property of [Mohammed Ahmed / Golden Touch Design co.]
 Unauthorized use or reproduction is prohibited.
*/
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { Bell, CheckCheck, Trash2, Send, MessageSquare, MailCheck, MailX, ArrowUpRight } from "lucide-react";

export default function Notifications() {
  const { user } = useAuth({ redirectOnUnauthenticated: true });

  const utils = trpc.useUtils();
  const { data: notifications, isLoading } = trpc.notifications.list.useQuery({ limit: 50 });
  const { data: sentNotifications, isLoading: sentLoading } = trpc.notifications.listSent.useQuery({ limit: 50 });
  const { data: countData } = trpc.notifications.unreadCount.useQuery();
  const { data: users } = trpc.users.list.useQuery();

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

  const sendNotification = trpc.notifications.send.useMutation({
    onSuccess: (data) => {
      toast.success(`تم إرسال الإشعار لـ ${data.count} موظف`);
      setNewNotif({ userIds: [], title: '', message: '', type: 'info' });
      utils.notifications.listSent.invalidate();
    },
    onError: () => toast.error("تعذر إرسال الإشعار")
  });

  const messageAdmin = trpc.notifications.messageAdmin.useMutation({
    onSuccess: () => {
      toast.success("تم إرسال الرسالة للمدير");
      setMsgToAdmin({ title: '', message: '' });
      utils.notifications.listSent.invalidate();
    },
    onError: () => toast.error("فشل إرسال الرسالة")
  });

  const [newNotif, setNewNotif] = useState({ userIds: [] as number[], title: '', message: '', type: 'info' });
  const [msgToAdmin, setMsgToAdmin] = useState({ title: '', message: '' });

  const unreadCount = countData?.count || 0;
  const isAdmin = user?.role === 'admin' || user?.role === 'hr_manager';

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

        <Tabs defaultValue="inbox" className="space-y-4">
          <TabsList>
            <TabsTrigger value="inbox">
              <Bell className="h-4 w-4 ml-1" />
              الواردة ({notifications?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="sent">
              <ArrowUpRight className="h-4 w-4 ml-1" />
              الصادرة ({sentNotifications?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="send">
              <Send className="h-4 w-4 ml-1" />
              إرسال
            </TabsTrigger>
          </TabsList>

          {/* Inbox Tab */}
          <TabsContent value="inbox">
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
          </TabsContent>

          {/* Sent Tab - الصادرة */}
          <TabsContent value="sent">
            {sentLoading ? (
              <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
            ) : sentNotifications && sentNotifications.length > 0 ? (
              <div className="space-y-3">
                {sentNotifications.map((notification: any) => (
                  <Card key={notification.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-xs border ${getTypeColor(notification.type)}`}>
                              {getTypeLabel(notification.type)}
                            </span>
                            {notification.readCount !== undefined && (
                              <>
                                {notification.readCount > 0 && (
                                  <Badge variant="secondary" className="gap-1">
                                    <MailCheck className="h-3 w-3" />
                                    قرأها {notification.readCount}
                                  </Badge>
                                )}
                                {notification.unreadCount > 0 && (
                                  <Badge variant="outline" className="gap-1">
                                    <MailX className="h-3 w-3" />
                                    لم يقرأها {notification.unreadCount}
                                  </Badge>
                                )}
                              </>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatTime(notification.createdAt)}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mb-1">
                            إلى: <span className="font-medium text-foreground">
                              {notification.recipients ? notification.recipients.join('، ') : (notification.recipientName || `مستخدم #${notification.userId}`)}
                            </span>
                          </div>
                          <h3 className="font-medium mb-1">{notification.title}</h3>
                          {notification.message && (
                            <p className="text-sm text-muted-foreground">{notification.message}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <ArrowUpRight className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">لا توجد إشعارات صادرة</h3>
                  <p className="text-muted-foreground">الإشعارات التي ترسلها ستظهر هنا</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Send Tab */}
          <TabsContent value="send" className="space-y-4">
            {/* Employee to Admin - only for non-admins */}
            {!isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    إرسال رسالة للمدير
                  </CardTitle>
                  <CardDescription>أرسل رسالة أو استفسار لمدير النظام</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">العنوان</label>
                    <Input
                      value={msgToAdmin.title}
                      onChange={(e) => setMsgToAdmin({ ...msgToAdmin, title: e.target.value })}
                      placeholder="عنوان الرسالة"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">المحتوى</label>
                    <Textarea
                      value={msgToAdmin.message}
                      onChange={(e) => setMsgToAdmin({ ...msgToAdmin, message: e.target.value })}
                      rows={4}
                      placeholder="اكتب رسالتك هنا..."
                    />
                  </div>
                  <Button
                    onClick={() => messageAdmin.mutate(msgToAdmin)}
                    disabled={messageAdmin.isPending || !msgToAdmin.title.trim() || !msgToAdmin.message.trim()}
                  >
                    <Send className="h-4 w-4 ml-2" />
                    {messageAdmin.isPending ? "جاري الإرسال..." : "إرسال للمدير"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Admin to Employee (visible only for admins) */}
            {isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    إرسال إشعار للموظفين
                  </CardTitle>
                  <CardDescription>إرسال إشعار مباشر لواحد أو أكثر من الموظفين</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">اختر الموظفين ({newNotif.userIds.length} محدد)</label>
                    <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                      <div className="flex items-center gap-2 pb-2 border-b mb-2">
                        <input
                          type="checkbox"
                          id="select-all"
                          className="h-4 w-4 rounded"
                          checked={newNotif.userIds.length === (users?.filter((u: any) => u.id !== user?.id).length || 0)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewNotif({ ...newNotif, userIds: users?.filter((u: any) => u.id !== user?.id).map((u: any) => u.id) || [] });
                            } else {
                              setNewNotif({ ...newNotif, userIds: [] });
                            }
                          }}
                        />
                        <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">تحديد الكل</label>
                      </div>
                      {users?.filter((u: any) => u.id !== user?.id).map((u: any) => (
                        <div key={u.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`user-${u.id}`}
                            className="h-4 w-4 rounded"
                            checked={newNotif.userIds.includes(u.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewNotif({ ...newNotif, userIds: [...newNotif.userIds, u.id] });
                              } else {
                                setNewNotif({ ...newNotif, userIds: newNotif.userIds.filter(id => id !== u.id) });
                              }
                            }}
                          />
                          <label htmlFor={`user-${u.id}`} className="text-sm cursor-pointer">{u.name || u.email}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">النوع</label>
                    <Select value={newNotif.type} onValueChange={(v) => setNewNotif({ ...newNotif, type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">معلومة</SelectItem>
                        <SelectItem value="success">نجاح</SelectItem>
                        <SelectItem value="warning">تنبيه</SelectItem>
                        <SelectItem value="action">مطلوب إجراء</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">العنوان</label>
                    <Input
                      value={newNotif.title}
                      onChange={(e) => setNewNotif({ ...newNotif, title: e.target.value })}
                      placeholder="عنوان الإشعار"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">الرسالة (اختياري)</label>
                    <Textarea
                      value={newNotif.message}
                      onChange={(e) => setNewNotif({ ...newNotif, message: e.target.value })}
                      rows={3}
                      placeholder="تفاصيل إضافية..."
                    />
                  </div>
                  <Button
                    onClick={() => sendNotification.mutate({
                      userIds: newNotif.userIds,
                      title: newNotif.title,
                      message: newNotif.message || undefined,
                      type: newNotif.type as any
                    })}
                    disabled={sendNotification.isPending || newNotif.userIds.length === 0 || !newNotif.title.trim()}
                  >
                    <Send className="h-4 w-4 ml-2" />
                    {sendNotification.isPending ? "جاري الإرسال..." : `إرسال لـ ${newNotif.userIds.length} موظف`}
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
