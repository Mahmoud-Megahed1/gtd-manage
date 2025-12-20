import { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';

export function NotificationBell() {
    const [, setLocation] = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const utils = trpc.useUtils();

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Fetch unread count
    const { data: countData } = trpc.notifications.unreadCount.useQuery(undefined, {
        refetchInterval: 30000,
    });

    // Fetch latest notifications
    const { data: notifications } = trpc.notifications.list.useQuery({ limit: 10 });

    // Mutations
    const markReadMutation = trpc.notifications.markRead.useMutation({
        onSuccess: () => utils.notifications.invalidate()
    });

    const markAllReadMutation = trpc.notifications.markAllRead.useMutation({
        onSuccess: () => utils.notifications.invalidate()
    });

    const unreadCount = countData?.count || 0;

    const handleNotificationClick = (notification: any) => {
        if (!notification.isRead) {
            markReadMutation.mutate({ notificationId: notification.id });
        }
        if (notification.link) {
            setIsOpen(false);
            setLocation(notification.link);
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'success': return 'bg-green-100 text-green-800';
            case 'warning': return 'bg-yellow-100 text-yellow-800';
            case 'action': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatTime = (date: Date | string) => {
        const d = new Date(date);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return 'الآن';
        if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
        if (diffHours < 24) return `منذ ${diffHours} ساعة`;
        if (diffDays < 7) return `منذ ${diffDays} يوم`;
        return d.toLocaleDateString('ar-SA');
    };

    return (
        <div className="relative" ref={menuRef}>
            <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => setIsOpen(!isOpen)}
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </Button>

            {isOpen && (
                <div className="absolute left-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-popover border rounded-lg shadow-lg z-[9999]">
                    <div className="flex items-center justify-between px-3 py-2 border-b">
                        <span className="font-semibold">الإشعارات</span>
                        <div className="flex items-center gap-1">
                            {unreadCount > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs h-7"
                                    onClick={() => markAllReadMutation.mutate()}
                                >
                                    <CheckCheck className="h-3 w-3 ml-1" />
                                    مقروء
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setIsOpen(false)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {notifications && notifications.length > 0 ? (
                        <div className="divide-y">
                            {notifications.map((notification: any) => (
                                <div
                                    key={notification.id}
                                    className={`flex flex-col items-start p-3 cursor-pointer hover:bg-accent ${!notification.isRead ? 'bg-blue-50 dark:bg-blue-950/30' : ''}`}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div className="flex items-center gap-2 w-full">
                                        <span className={`px-2 py-0.5 rounded text-xs ${getTypeColor(notification.type)}`}>
                                            {notification.type === 'success' ? 'تم' :
                                                notification.type === 'warning' ? 'تنبيه' :
                                                    notification.type === 'action' ? 'مطلوب' : 'معلومة'}
                                        </span>
                                        <span className="text-xs text-muted-foreground mr-auto">
                                            {formatTime(notification.createdAt)}
                                        </span>
                                        {!notification.isRead && (
                                            <span className="h-2 w-2 bg-blue-500 rounded-full"></span>
                                        )}
                                    </div>
                                    <span className="font-medium mt-1">{notification.title}</span>
                                    {notification.message && (
                                        <span className="text-sm text-muted-foreground line-clamp-2">
                                            {notification.message}
                                        </span>
                                    )}
                                </div>
                            ))}
                            <div
                                className="text-center p-2 text-primary cursor-pointer hover:bg-accent"
                                onClick={() => { setIsOpen(false); setLocation('/notifications'); }}
                            >
                                عرض كل الإشعارات
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 text-center text-muted-foreground">
                            لا توجد إشعارات
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
