/*
 © 2025 - Property of [Mohammed Ahmed / Golden Touch Design co.]
 Unauthorized use or reproduction is prohibited.
*/
import React from 'react';
import { usePermission } from '@/hooks/usePermission';
import type { PermissionResource, PermissionAction } from '@/lib/permissions';

interface PermissionGuardProps {
    /** Resource to check permission for */
    resource?: PermissionResource;
    /** Action to check (default: 'view') */
    action?: PermissionAction;
    /** Tab name to check access for */
    tab?: string;
    /** Content to show when permission is granted */
    children: React.ReactNode;
    /** Content to show when permission is denied (optional) */
    fallback?: React.ReactNode;
    /** If true, shows nothing instead of fallback when permission denied */
    hide?: boolean;
}

/**
 * PermissionGuard - Conditionally renders content based on user permissions
 * 
 * Usage:
 * <PermissionGuard resource="accounting" action="edit">
 *   <EditButton />
 * </PermissionGuard>
 * 
 * <PermissionGuard tab="change-orders">
 *   <TabContent />
 * </PermissionGuard>
 * 
 * <PermissionGuard resource="users" action="delete" fallback={<DisabledButton />}>
 *   <DeleteButton />
 * </PermissionGuard>
 */
export function PermissionGuard({
    resource,
    action = 'view',
    tab,
    children,
    fallback = null,
    hide = false
}: PermissionGuardProps) {
    const { can, canAccessTab } = usePermission();

    let hasAccess = false;

    if (tab) {
        hasAccess = canAccessTab(tab);
    } else if (resource) {
        hasAccess = can(resource, action);
    } else {
        // No resource or tab specified = allow
        hasAccess = true;
    }

    if (hasAccess) {
        return <>{children}</>;
    }

    if (hide) {
        return null;
    }

    return <>{fallback}</>;
}

/**
 * RequirePermission - Wrapper that redirects or shows error when no permission
 */
interface RequirePermissionProps {
    resource: PermissionResource;
    action?: PermissionAction;
    children: React.ReactNode;
    redirectTo?: string;
}

export function RequirePermission({
    resource,
    action = 'view',
    children,
    redirectTo = '/dashboard'
}: RequirePermissionProps) {
    const { can } = usePermission();

    if (!can(resource, action)) {
        // Show access denied message
        return (
            <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-8">
                <div className="text-6xl mb-4">🔒</div>
                <h2 className="text-2xl font-bold text-foreground mb-2">غير مصرح لك بالوصول</h2>
                <p className="text-muted-foreground mb-4">
                    ليس لديك صلاحية للوصول إلى هذه الصفحة
                </p>
                <a
                    href={redirectTo}
                    className="text-primary hover:underline"
                >
                    العودة للرئيسية
                </a>
            </div>
        );
    }

    return <>{children}</>;
}

export default PermissionGuard;
