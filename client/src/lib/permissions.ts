/*
 © 2025 - Property of [Mohammed Ahmed / Golden Touch Design co.]
 Unauthorized use or reproduction is prohibited.
 
 Permission Matrix - Defines what each role can access
*/

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve';

export type PermissionResource =
    | 'clients'
    | 'projects'
    | 'tasks'
    | 'invoices'
    | 'accounting'
    | 'accounting.reports'
    | 'forms'
    | 'forms.change_orders'
    | 'hr'
    | 'users'
    | 'settings'
    | 'notifications'
    | 'audit_logs';

export type RolePermissions = {
    [resource in PermissionResource]?: PermissionAction[];
};

// Complete Permission Matrix for all 20 roles
export const PERMISSION_MATRIX: Record<string, RolePermissions> = {
    admin: {
        clients: ['view', 'create', 'edit', 'delete'],
        projects: ['view', 'create', 'edit', 'delete'],
        tasks: ['view', 'create', 'edit', 'delete'],
        invoices: ['view', 'create', 'edit', 'delete'],
        accounting: ['view', 'create', 'edit', 'delete'],
        'accounting.reports': ['view', 'create'],
        forms: ['view', 'create', 'edit', 'delete'],
        'forms.change_orders': ['view', 'create', 'edit', 'delete', 'approve'],
        hr: ['view', 'create', 'edit', 'delete'],
        users: ['view', 'create', 'edit', 'delete'],
        settings: ['view', 'edit'],
        notifications: ['view', 'create'],
        audit_logs: ['view'],
    },

    department_manager: {
        clients: ['view'],
        projects: ['view', 'create', 'edit'],
        tasks: ['view', 'create', 'edit'],
        invoices: ['view'],
        forms: ['view', 'create', 'edit'],
        'forms.change_orders': ['view', 'create', 'edit', 'approve'],
        hr: ['view'],
    },

    project_manager: {
        clients: ['view'],
        projects: ['view', 'create', 'edit'],
        tasks: ['view', 'create', 'edit', 'delete'],
        forms: ['view', 'create', 'edit'],
        'forms.change_orders': ['view', 'create'],
        hr: ['view'],
    },

    project_coordinator: {
        projects: ['view'],
        tasks: ['view', 'edit'],
        forms: ['view'],
        hr: ['view'],
    },

    architect: {
        projects: ['view'],
        tasks: ['view', 'edit'],
        hr: ['view'],
    },

    interior_designer: {
        projects: ['view'],
        tasks: ['view', 'edit'],
        hr: ['view'],
    },

    site_engineer: {
        projects: ['view'],
        tasks: ['view', 'edit'],
        hr: ['view'],
    },

    planning_engineer: {
        projects: ['view'],
        tasks: ['view', 'edit'],
        'accounting.reports': ['view'],
        hr: ['view'],
    },

    designer: {
        projects: ['view'],
        tasks: ['view', 'edit'],
        hr: ['view'],
    },

    technician: {
        projects: ['view'],
        tasks: ['view', 'edit'],
        hr: ['view'],
    },

    finance_manager: {
        projects: ['view'],
        invoices: ['view', 'create', 'edit'],
        accounting: ['view', 'create', 'edit', 'delete'],
        'accounting.reports': ['view', 'create'],
        forms: ['view', 'create', 'edit'],
        'forms.change_orders': ['view', 'approve'],
        hr: ['view'],
    },

    accountant: {
        invoices: ['view'],
        accounting: ['view'],
        'accounting.reports': ['view'],
        hr: ['view'],
    },

    sales_manager: {
        clients: ['view', 'create', 'edit'],
        invoices: ['view', 'create', 'edit'],
        hr: ['view'],
    },

    hr_manager: {
        hr: ['view', 'create', 'edit', 'delete'],
        users: ['view'],
    },

    admin_assistant: {
        hr: ['view'],
    },

    procurement_officer: {
        projects: ['view'],
        accounting: ['view'],
        hr: ['view'],
    },

    storekeeper: {
        projects: ['view'],
        hr: ['view'],
    },

    qa_qc: {
        projects: ['view'],
        tasks: ['view'],
        hr: ['view'],
    },

    document_controller: {
        projects: ['view'],
        forms: ['view'],
        hr: ['view'],
    },

    viewer: {
        hr: ['view'],
    },
};

/**
 * Check if a role has permission for a specific action on a resource
 */
export function hasPermission(
    role: string | undefined,
    resource: PermissionResource,
    action: PermissionAction = 'view'
): boolean {
    if (!role) return false;

    const permissions = PERMISSION_MATRIX[role];
    if (!permissions) return false;

    const resourcePermissions = permissions[resource];
    if (!resourcePermissions) return false;

    return resourcePermissions.includes(action);
}

/**
 * Check if a role can access a specific tab
 */
export function canAccessTab(role: string | undefined, tab: string): boolean {
    if (!role) return false;

    // Map tab names to resources
    const tabResourceMap: Record<string, PermissionResource> = {
        // Forms page tabs
        'requests': 'forms',
        'modifications': 'forms',
        'change-orders': 'forms.change_orders',
        // Accounting page tabs
        'expenses': 'accounting',
        'sales': 'accounting',
        'purchases': 'accounting',
        'reports': 'accounting.reports',
    };

    const resource = tabResourceMap[tab];
    if (!resource) return true; // Unknown tab = allow (safe default for simple tabs)

    return hasPermission(role, resource, 'view');
}

/**
 * Get all allowed tabs for a resource/page
 */
export function getAllowedTabs(role: string | undefined, page: 'forms' | 'accounting'): string[] {
    if (!role) return [];

    if (page === 'forms') {
        const tabs: string[] = [];
        if (hasPermission(role, 'forms', 'view')) {
            tabs.push('requests', 'modifications');
        }
        if (hasPermission(role, 'forms.change_orders', 'view')) {
            tabs.push('change-orders');
        }
        return tabs;
    }

    if (page === 'accounting') {
        const tabs: string[] = [];
        if (hasPermission(role, 'accounting', 'view')) {
            tabs.push('expenses', 'sales', 'purchases');
        }
        if (hasPermission(role, 'accounting.reports', 'view')) {
            tabs.push('reports');
        }
        return tabs;
    }

    return [];
}
