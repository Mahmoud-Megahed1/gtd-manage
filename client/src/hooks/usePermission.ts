/*
 © 2025 - Property of [Mohammed Ahmed / Golden Touch Design co.]
 Unauthorized use or reproduction is prohibited.
*/
import { useMemo } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import {
    hasPermission,
    canAccessTab,
    getAllowedTabs,
    type PermissionResource,
    type PermissionAction
} from '@/lib/permissions';

/**
 * Hook to check permissions for the current user
 * 
 * Usage:
 * const { can, canView, canEdit, canDelete, canAccessTab } = usePermission();
 * 
 * if (can('projects', 'edit')) { ... }
 * if (canView('accounting.reports')) { ... }
 */
export function usePermission() {
    const { user } = useAuth();
    const role = user?.role;

    const permissions = useMemo(() => ({
        /**
         * Check if user can perform action on resource
         */
        can: (resource: PermissionResource, action: PermissionAction = 'view'): boolean => {
            return hasPermission(role, resource, action);
        },

        /**
         * Check if user can view resource
         */
        canView: (resource: PermissionResource): boolean => {
            return hasPermission(role, resource, 'view');
        },

        /**
         * Check if user can create in resource
         */
        canCreate: (resource: PermissionResource): boolean => {
            return hasPermission(role, resource, 'create');
        },

        /**
         * Check if user can edit resource
         */
        canEdit: (resource: PermissionResource): boolean => {
            return hasPermission(role, resource, 'edit');
        },

        /**
         * Check if user can delete from resource
         */
        canDelete: (resource: PermissionResource): boolean => {
            return hasPermission(role, resource, 'delete');
        },

        /**
         * Check if user can approve in resource
         */
        canApprove: (resource: PermissionResource): boolean => {
            return hasPermission(role, resource, 'approve');
        },

        /**
         * Check if user can access a specific tab
         */
        canAccessTab: (tab: string): boolean => {
            return canAccessTab(role, tab);
        },

        /**
         * Get all allowed tabs for a page
         */
        getAllowedTabs: (page: 'forms' | 'accounting'): string[] => {
            return getAllowedTabs(role, page);
        },

        /**
         * Check if user is admin
         */
        isAdmin: role === 'admin',

        /**
         * Current user role
         */
        role,
    }), [role]);

    return permissions;
}

export default usePermission;
