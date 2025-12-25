/*
 © 2025 - Property of [Mohammed Ahmed / Golden Touch Design co.]
 Unauthorized use or reproduction is prohibited.
 
 UserPermissionsDialog - Admin UI for managing per-user permissions
*/
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Save, Shield, User } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import {
    PERMISSION_MATRIX,
    RESOURCE_LABELS,
    ACTION_LABELS,
    ROLE_LABELS,
    ALL_RESOURCES,
    ALL_ACTIONS,
    type PermissionResource,
    type PermissionAction,
} from '@/lib/permissions';

interface UserPermissionsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    userId: number;
    userName?: string;
    userRole?: string;
}

export default function UserPermissionsDialog({
    open,
    onOpenChange,
    userId,
    userName,
    userRole = 'viewer',
}: UserPermissionsDialogProps) {
    // Get default permissions from the role
    const defaultPermissions = PERMISSION_MATRIX[userRole] || {};

    // State for user-customized permissions
    const [customPermissions, setCustomPermissions] = useState<Record<string, boolean>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Fetch user's current custom permissions
    const { data: savedPermissions, refetch } = trpc.users.getPermissions.useQuery(
        { userId },
        { enabled: open && userId > 0 }
    );

    const updatePermissionsMutation = trpc.users.setPermissions.useMutation({
        onSuccess: () => {
            toast.success('تم حفظ الصلاحيات بنجاح');
            refetch();
            onOpenChange(false);
        },
        onError: (err) => {
            toast.error('فشل حفظ الصلاحيات: ' + err.message);
        },
    });

    // Load saved permissions when dialog opens
    useEffect(() => {
        if (open && savedPermissions) {
            setCustomPermissions(savedPermissions);
        } else if (open) {
            setCustomPermissions({});
        }
    }, [open, savedPermissions]);

    // Check if a specific permission is enabled (either from role default or custom override)
    const isPermissionEnabled = (resource: PermissionResource, action: PermissionAction): boolean => {
        const key = `${resource}.${action}`;

        // First check custom permissions
        if (key in customPermissions) {
            return customPermissions[key];
        }

        // Fall back to role default
        const rolePerms = defaultPermissions[resource];
        return rolePerms ? rolePerms.includes(action) : false;
    };

    // Toggle a permission
    const togglePermission = (resource: PermissionResource, action: PermissionAction) => {
        const key = `${resource}.${action}`;
        const currentValue = isPermissionEnabled(resource, action);

        setCustomPermissions((prev) => ({
            ...prev,
            [key]: !currentValue,
        }));
    };

    // Save permissions
    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updatePermissionsMutation.mutateAsync({
                userId,
                permissions: customPermissions,
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Reset to role defaults
    const handleReset = () => {
        setCustomPermissions({});
        toast.info('تم إعادة الصلاحيات للإعدادات الافتراضية للدور');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-amber-600" />
                        <span>إدارة صلاحيات المستخدم</span>
                    </DialogTitle>
                    <div className="flex items-center gap-3 pt-2">
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{userName || 'مستخدم'}</span>
                        </div>
                        <Badge variant="secondary">{ROLE_LABELS[userRole] || userRole}</Badge>
                    </div>
                </DialogHeader>

                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-6">
                        {ALL_RESOURCES.map((resource) => (
                            <div
                                key={resource}
                                className="border rounded-lg p-4 bg-muted/30"
                            >
                                <h3 className="font-semibold text-lg mb-3 text-amber-700">
                                    {RESOURCE_LABELS[resource]}
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                    {ALL_ACTIONS.map((action) => {
                                        const isEnabled = isPermissionEnabled(resource, action);
                                        const isDefault = (defaultPermissions[resource] || []).includes(action);
                                        const key = `${resource}.${action}`;
                                        const isCustom = key in customPermissions;

                                        return (
                                            <div key={action} className="flex items-center gap-2">
                                                <Checkbox
                                                    id={`${resource}-${action}`}
                                                    checked={isEnabled}
                                                    onCheckedChange={() => togglePermission(resource, action)}
                                                />
                                                <Label
                                                    htmlFor={`${resource}-${action}`}
                                                    className={`cursor-pointer ${isCustom && isEnabled !== isDefault ? 'text-amber-600 font-medium' : ''
                                                        }`}
                                                >
                                                    {ACTION_LABELS[action]}
                                                    {isDefault && !isCustom && (
                                                        <span className="text-xs text-muted-foreground mr-1">(افتراضي)</span>
                                                    )}
                                                    {isCustom && isEnabled !== isDefault && (
                                                        <span className="text-xs text-amber-600 mr-1">(مُعدّل)</span>
                                                    )}
                                                </Label>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>

                <DialogFooter className="flex gap-2">
                    <Button variant="outline" onClick={handleReset}>
                        إعادة للافتراضي
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-amber-600 hover:bg-amber-700"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                                جاري الحفظ...
                            </>
                        ) : (
                            <>
                                <Save className="ml-2 h-4 w-4" />
                                حفظ الصلاحيات
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
