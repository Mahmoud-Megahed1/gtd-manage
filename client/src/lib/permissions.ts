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
    | 'audit_logs'
    | 'drawings'
    | 'rfis'
    | 'submittals'
    | 'approval_requests';

export type RolePermissions = {
    [resource in PermissionResource]?: PermissionAction[];
};

// Complete Permission Matrix for all 20 roles
// Based on the detailed matrix from the user
export const PERMISSION_MATRIX: Record<string, RolePermissions> = {
    // 1️⃣ admin (مدير النظام) - Full access to everything
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
        drawings: ['view', 'create', 'edit', 'delete'],
        rfis: ['view', 'create', 'edit', 'delete'],
        submittals: ['view', 'create', 'edit', 'delete'],
        approval_requests: ['view', 'create', 'approve'],
    },

    // 2️⃣ department_manager (مدير قسم)
    // المشاريع: VCU | المهام: VCU | الاستمارات: VCU | HR: عرض القسم | المحاسبة: عرض | التقارير: VCU
    department_manager: {
        clients: ['view'],
        projects: ['view', 'create', 'edit'],
        tasks: ['view', 'create', 'edit'],
        invoices: ['view'],
        'accounting.reports': ['view', 'create'],
        forms: ['view', 'create', 'edit'],
        'forms.change_orders': ['view', 'create', 'edit', 'approve'],
        hr: ['view'],
        drawings: ['view', 'create', 'edit'],
        rfis: ['view', 'create', 'edit'],
        submittals: ['view', 'create', 'edit'],
    },

    // 3️⃣ project_manager (مدير المشاريع)
    // العملاء: أسماء فقط | المشاريع: الكل VCU | المهام: VCU | الاستمارات: VCU | HR: بياناته فقط
    project_manager: {
        clients: ['view'], // أسماء فقط
        projects: ['view', 'create', 'edit'],
        tasks: ['view', 'create', 'edit'],
        forms: ['view', 'create', 'edit'],
        'forms.change_orders': ['view', 'create'],
        hr: ['view', 'create'], // بياناته + طلب إجازة
        drawings: ['view', 'create', 'edit'],
        rfis: ['view', 'create', 'edit'],
        submittals: ['view', 'create', 'edit'],
    },

    // 4️⃣ project_coordinator (منسق مشاريع)
    project_coordinator: {
        clients: ['view'], // names only
        projects: ['view', 'edit'],
        tasks: ['view', 'create', 'edit'],
        forms: ['view'],
        'forms.change_orders': ['view'],
        hr: ['view', 'create'], // بياناته + طلب إجازة
        drawings: ['view', 'create', 'edit'],
        rfis: ['view', 'create', 'edit'],
        submittals: ['view', 'create', 'edit'],
        approval_requests: ['view', 'create'],
    },

    // 5️⃣ architect (معماري)
    // المشاريع: المُسندة فقط | المهام: حالة فقط | الرسومات: VCU | RFIs: VCU
    architect: {
        projects: ['view'], // المُسندة فقط - filtered in backend
        tasks: ['view', 'edit'], // حالة فقط
        hr: ['view', 'create'], // بياناته + طلب إجازة
        drawings: ['view', 'create', 'edit'],
        rfis: ['view', 'create', 'edit'],
    },

    // 6️⃣ interior_designer (مصمم داخلي)
    // المشاريع: المُسندة فقط | المهام: حالة فقط | الرسومات: VCU
    interior_designer: {
        projects: ['view'], // المُسندة فقط
        tasks: ['view', 'edit'], // حالة فقط
        hr: ['view', 'create'], // بياناته + طلب إجازة
        drawings: ['view', 'create', 'edit'],
    },

    // 7️⃣ site_engineer (مهندس موقع)
    // المشاريع: المُسندة فقط | المهام: حالة | RFIs: VCU | Submittals: VCU
    site_engineer: {
        projects: ['view'], // المُسندة فقط
        tasks: ['view', 'edit'], // حالة فقط
        hr: ['view', 'create'], // بياناته + طلب إجازة
        rfis: ['view', 'create', 'edit'],
        submittals: ['view', 'create', 'edit'],
    },

    // 8️⃣ planning_engineer (مهندس تخطيط)
    // المشاريع: المُسندة فقط | المهام: حالة | التقارير: VC
    planning_engineer: {
        projects: ['view'], // المُسندة فقط
        tasks: ['view', 'edit'], // حالة فقط
        'accounting.reports': ['view', 'create'],
        hr: ['view', 'create'], // بياناته + طلب إجازة
    },

    // 9️⃣ designer (مصمم)
    // المشاريع: المُسندة فقط بدون ميزانية | المهام: حالة فقط
    designer: {
        projects: ['view'], // المُسندة فقط - no budget
        tasks: ['view', 'edit'], // حالة فقط
        hr: ['view', 'create'], // بياناته + طلب إجازة
    },

    // 🔟 technician (فني)
    technician: {
        projects: ['view'], // المُسندة فقط
        tasks: ['view', 'edit'], // حالة فقط
        hr: ['view', 'create'], // بياناته + طلب إجازة
    },

    // 1️⃣1️⃣ finance_manager (مدير مالي)
    // المشاريع: V بالميزانية | الفواتير: VCU | المحاسبة: VCUD | الاستمارات: VCU | طلبات اعتماد: approve
    finance_manager: {
        projects: ['view'], // بالميزانية
        invoices: ['view', 'create', 'edit'],
        accounting: ['view', 'create', 'edit', 'delete'],
        'accounting.reports': ['view', 'create'],
        forms: ['view', 'create', 'edit'],
        'forms.change_orders': ['view', 'approve'],
        hr: ['view', 'create'], // بياناته + طلب إجازة
        approval_requests: ['view', 'create', 'approve'],
    },

    // 1️⃣2️⃣ accountant (محاسب)
    // الفواتير: V | المحاسبة: V | التقارير: V + طباعة | طلبات اعتماد: V + رفع
    accountant: {
        invoices: ['view'],
        accounting: ['view'],
        'accounting.reports': ['view'],
        hr: ['view', 'create'], // بياناته + طلب إجازة
        approval_requests: ['view', 'create'],
    },

    // 1️⃣3️⃣ sales_manager (مدير مبيعات)
    // العملاء: VCU | الفواتير: VCU | الاستمارات: VCU
    sales_manager: {
        clients: ['view', 'create', 'edit'],
        invoices: ['view', 'create', 'edit'],
        forms: ['view', 'create', 'edit'],
        hr: ['view', 'create'], // بياناته + طلب إجازة
    },

    // 1️⃣4️⃣ hr_manager (مدير الموارد البشرية)
    hr_manager: {
        hr: ['view', 'create', 'edit', 'delete'],
        users: ['view'],
    },

    // 1️⃣5️⃣ admin_assistant (مساعد إداري)
    // العملاء: إنشاء | الاستمارات: VCU
    admin_assistant: {
        clients: ['view', 'create'],
        forms: ['view', 'create', 'edit'],
        hr: ['view', 'create'], // بياناته + طلب إجازة
    },

    // 1️⃣6️⃣ procurement_officer (مسؤول مشتريات)
    procurement_officer: {
        projects: ['view'],
        accounting: ['view'],
        hr: ['view', 'create'], // بياناته + طلب إجازة
    },

    // 1️⃣7️⃣ storekeeper (أمين مخزن)
    storekeeper: {
        projects: ['view'],
        hr: ['view', 'create'], // بياناته + طلب إجازة
    },

    // 1️⃣8️⃣ qa_qc (ضبط الجودة)
    qa_qc: {
        projects: ['view'],
        tasks: ['view'],
        hr: ['view', 'create'], // بياناته + طلب إجازة
    },

    // 1️⃣9️⃣ document_controller (مراقب وثائق)
    document_controller: {
        projects: ['view'],
        forms: ['view'],
        hr: ['view', 'create'], // بياناته + طلب إجازة
        drawings: ['view'],
        submittals: ['view'],
    },

    // 2️⃣0️⃣ viewer (مشاهد فقط)
    viewer: {
        hr: ['view', 'create'], // بياناته + طلب إجازة
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

/**
 * Get all resources a role has access to
 */
export function getRoleResources(role: string | undefined): PermissionResource[] {
    if (!role) return [];
    const permissions = PERMISSION_MATRIX[role];
    if (!permissions) return [];
    return Object.keys(permissions) as PermissionResource[];
}

/**
 * Get all actions a role can perform on a resource
 */
export function getRoleActions(role: string | undefined, resource: PermissionResource): PermissionAction[] {
    if (!role) return [];
    const permissions = PERMISSION_MATRIX[role];
    if (!permissions) return [];
    return permissions[resource] || [];
}

/**
 * Get label for resource in Arabic
 */
export const RESOURCE_LABELS: Record<PermissionResource, string> = {
    clients: 'العملاء',
    projects: 'المشاريع',
    tasks: 'المهام',
    invoices: 'الفواتير',
    accounting: 'المحاسبة',
    'accounting.reports': 'التقارير المالية',
    forms: 'الاستمارات',
    'forms.change_orders': 'أوامر التغيير',
    hr: 'الموارد البشرية',
    users: 'المستخدمين',
    settings: 'الإعدادات',
    notifications: 'الإشعارات',
    audit_logs: 'سجل المراجعة',
    drawings: 'الرسومات',
    rfis: 'طلبات المعلومات (RFI)',
    submittals: 'المقدمات (Submittals)',
    approval_requests: 'طلبات الاعتماد',
};

/**
 * Get label for action in Arabic
 */
export const ACTION_LABELS: Record<PermissionAction, string> = {
    view: 'عرض',
    create: 'إنشاء',
    edit: 'تعديل',
    delete: 'حذف',
    approve: 'اعتماد',
};

/**
 * Get label for role in Arabic
 */
export const ROLE_LABELS: Record<string, string> = {
    admin: 'مدير النظام',
    department_manager: 'مدير قسم',
    project_manager: 'مدير مشاريع',
    project_coordinator: 'منسق مشاريع',
    architect: 'معماري',
    interior_designer: 'مصمم داخلي',
    site_engineer: 'مهندس موقع',
    planning_engineer: 'مهندس تخطيط',
    designer: 'مصمم',
    technician: 'فني',
    finance_manager: 'مدير مالي',
    accountant: 'محاسب',
    sales_manager: 'مدير مبيعات',
    hr_manager: 'مدير موارد بشرية',
    admin_assistant: 'مساعد إداري',
    procurement_officer: 'مسؤول مشتريات',
    storekeeper: 'أمين مخزن',
    qa_qc: 'ضبط جودة',
    document_controller: 'مراقب وثائق',
    viewer: 'مشاهد',
};

/**
 * All available resources
 */
export const ALL_RESOURCES: PermissionResource[] = [
    'clients',
    'projects',
    'tasks',
    'invoices',
    'accounting',
    'accounting.reports',
    'forms',
    'forms.change_orders',
    'hr',
    'users',
    'settings',
    'notifications',
    'audit_logs',
    'drawings',
    'rfis',
    'submittals',
    'approval_requests',
];

/**
 * All available actions
 */
export const ALL_ACTIONS: PermissionAction[] = ['view', 'create', 'edit', 'delete', 'approve'];
