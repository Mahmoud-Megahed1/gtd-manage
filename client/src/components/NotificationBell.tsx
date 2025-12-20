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

    const { data: countData } = trpc.notifications.unreadCount.useQuery(undefined, {
        refetchInterval: 30000,
    });
    const { data: notifications } = trpc.notifications.list.useQuery({ limit: 8 });

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
            case 'success': return 'bg-green-100 text-green-700';
            case 'warning': return 'bg-yellow-100 text-yellow-700';
            case 'action': return 'bg-blue-100 text-blue-700';
            default: return 'bg-gray-100 text-gray-600';
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
        if (diffMins < 60) return `${diffMins}د`;
        if (diffHours < 24) return `${diffHours}س`;
        if (diffDays < 7) return `${diffDays}ي`;
        return d.toLocaleDateString('ar-SA');
    };

    return (
        <div className="relative" ref={menuRef}>
            <Button
                variant="ghost"
                size="icon"
                className="relative h-8 w-8"
                onClick={() => setIsOpen(!isOpen)}
            >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </Button>

            {isOpen && (
                <div
                    className="fixed bg-popover border rounded-md shadow-lg z-[99999] text-xs"
                    style={{
                        top: '50px',
                        left: '60px',
                        width: '260px',
                        maxHeight: '300px',
                        direction: 'rtl'
                    }}
                >
                    <div className="flex items-center justify-between px-2 py-1.5 border-b bg-muted/50">
                        <span className="font-medium text-xs">الإشعارات</span>
                        <div className="flex items-center gap-0.5">
                            {unreadCount > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-[10px] h-5 px-1"
                                    onClick={() => markAllReadMutation.mutate()}
                                >
                                    <CheckCheck className="h-3 w-3" />
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={() => setIsOpen(false)}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>

                    <div className="overflow-y-auto" style={{ maxHeight: '230px' }}>
                        {notifications && notifications.length > 0 ? (
                            <div className="divide-y">
                                {notifications.map((notification: any) => (
                                    <div
                                        key={notification.id}
                                        className={`p-2 cursor-pointer hover:bg-accent ${!notification.isRead ? 'bg-blue-50 dark:bg-blue-950/20' : ''}`}
                                        onClick={() => handleNotificationClick(notification)}
                                    >
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className={`px-1 py-0.5 rounded text-[9px] ${getTypeColor(notification.type)}`}>
                                                {notification.type === 'success' ? 'تم' :
                                                    notification.type === 'warning' ? 'تنبيه' :
                                                        notification.type === 'action' ? 'مطلوب' : 'معلومة'}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground mr-auto">
                                                {formatTime(notification.createdAt)}
                                            </span>
                                            {!notification.isRead && (
                                                <span className="h-1.5 w-1.5 bg-blue-500 rounded-full"></span>
                                            )}
                                        </div>
                                        <p className="text-[11px] font-medium leading-tight">{notification.title}</p>
                                        {notification.message && (
                                            <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                                                {notification.message}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 text-center text-muted-foreground text-[11px]">
                                لا توجد إشعارات
                            </div>
                        )}
                    </div>

                    <div
                        className="border-t py-1.5 text-center text-primary cursor-pointer hover:bg-accent text-[11px]"
                        onClick={() => { setIsOpen(false); setLocation('/notifications'); }}
                    >
                        عرض الكل
                    </div>
                </div>
            )}
        </div>
    );
}
