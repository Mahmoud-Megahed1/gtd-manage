/*
 © 2025 - Property of [Mohammed Ahmed / Golden Touch Design co.]
 Unauthorized use or reproduction is prohibited.
 
 Permission Matrix - Defines what each role can access
*/

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'print' | 'submit';

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
    | 'hr.profile'          // بياناتي الشخصية
    | 'hr.leaves'           // الإجازات
    | 'hr.attendance'       // الحضور
    | 'hr.payroll'          // الرواتب
    | 'hr.reviews'          // التقييمات
    | 'hr.letters'          // الخطابات الرسمية
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
// HR Self-Service (hr.profile, hr.leaves, hr.attendance, hr.payroll, hr.reviews, hr.letters) - available to ALL employees
export const PERMISSION_MATRIX: Record<string, RolePermissions> = {
    // 1️⃣ admin (مدير النظام) - Full access to everything
    admin: {
        clients: ['view', 'create', 'edit', 'delete'],
        projects: ['view', 'create', 'edit', 'delete'],
        tasks: ['view', 'create', 'edit', 'delete'],
        invoices: ['view', 'create', 'edit', 'delete', 'print'],
        accounting: ['view', 'create', 'edit', 'delete'],
        'accounting.reports': ['view', 'create', 'print'],
        forms: ['view', 'create', 'edit', 'delete'],
        'forms.change_orders': ['view', 'create', 'edit', 'delete', 'approve'],
        hr: ['view', 'create', 'edit', 'delete'],
        'hr.profile': ['view', 'edit'],
        'hr.leaves': ['view', 'create', 'approve'],
        'hr.attendance': ['view', 'create', 'edit'],
        'hr.payroll': ['view', 'create', 'edit'],
        'hr.reviews': ['view', 'create', 'edit'],
        'hr.letters': ['view', 'create'],
        users: ['view', 'create', 'edit', 'delete'],
        settings: ['view', 'edit'],
        notifications: ['view', 'create'],
        audit_logs: ['view'],
        drawings: ['view', 'create', 'edit', 'delete'],
        rfis: ['view', 'create', 'edit', 'delete'],
        submittals: ['view', 'create', 'edit', 'delete'],
        approval_requests: ['view', 'create', 'approve'],
    },

    // 2️⃣ department_manager (مدير قسم) - VCU on projects/tasks/forms, no delete, readonly on accounting
    department_manager: {
        clients: ['view'],
        projects: ['view', 'create', 'edit'],
        tasks: ['view', 'create', 'edit'],
        invoices: ['view'],
        'accounting.reports': ['view', 'create', 'print'],
        forms: ['view', 'create', 'edit'],
        'forms.change_orders': ['view', 'create', 'edit', 'approve'],
        hr: ['view'],
        'hr.profile': ['view'],
        'hr.leaves': ['view', 'create'],
        'hr.attendance': ['view'],
        'hr.payroll': ['view'],
        'hr.reviews': ['view'],
        'hr.letters': ['view', 'create'],
        drawings: ['view', 'create', 'edit'],
        rfis: ['view', 'create', 'edit'],
        submittals: ['view', 'create', 'edit'],
    },

    // 3️⃣ project_manager (مدير المشاريع) - VCU on all projects, no delete, viewFinancials
    project_manager: {
        clients: ['view'],
        projects: ['view', 'create', 'edit'],
        tasks: ['view', 'create', 'edit'],
        forms: ['view', 'create', 'edit'],
        'forms.change_orders': ['view', 'create'],
        'accounting.reports': ['view'],
        'hr.profile': ['view'],
        'hr.leaves': ['view', 'create'],
        'hr.attendance': ['view'],
        'hr.payroll': ['view'],
        'hr.reviews': ['view'],
        'hr.letters': ['view', 'create'],
        drawings: ['view', 'create', 'edit'],
        rfis: ['view', 'create', 'edit'],
        submittals: ['view', 'create', 'edit'],
        hr: ['view'],
    },

    // 4️⃣ project_coordinator (منسق مشاريع) - assigned projects, VCU on tasks
    project_coordinator: {
        clients: ['view'],
        projects: ['view', 'edit'],
        tasks: ['view', 'create', 'edit'],
        forms: ['view'],
        'forms.change_orders': ['view'],
        'hr.profile': ['view'],
        'hr.leaves': ['view', 'create'],
        'hr.attendance': ['view'],
        'hr.payroll': ['view'],
        'hr.reviews': ['view'],
        'hr.letters': ['view', 'create'],
        drawings: ['view', 'create', 'edit'],
        rfis: ['view', 'create', 'edit'],
        submittals: ['view', 'create', 'edit'],
        approval_requests: ['view', 'create'],
        hr: ['view'],
    },

    // 5️⃣ architect (معماري) - assigned projects only, status only on tasks, VCU drawings/rfis
    architect: {
        projects: ['view'],
        tasks: ['view', 'edit'],
        'hr.profile': ['view'],
        'hr.leaves': ['view', 'create'],
        'hr.attendance': ['view'],
        'hr.payroll': ['view'],
        'hr.reviews': ['view'],
        'hr.letters': ['view', 'create'],
        drawings: ['view', 'create', 'edit'],
        rfis: ['view', 'create', 'edit'],
        hr: ['view'],
    },

    // 6️⃣ interior_designer (مصمم داخلي) - assigned projects only, VCU drawings
    interior_designer: {
        projects: ['view'],
        tasks: ['view', 'edit'],
        'hr.profile': ['view'],
        'hr.leaves': ['view', 'create'],
        'hr.attendance': ['view'],
        'hr.payroll': ['view'],
        'hr.reviews': ['view'],
        'hr.letters': ['view', 'create'],
        drawings: ['view', 'create', 'edit'],
        hr: ['view'],
    },

    // 7️⃣ site_engineer (مهندس موقع) - assigned projects, VCU rfis/submittals
    site_engineer: {
        projects: ['view'],
        tasks: ['view', 'edit'],
        'hr.profile': ['view'],
        'hr.leaves': ['view', 'create'],
        'hr.attendance': ['view'],
        'hr.payroll': ['view'],
        'hr.reviews': ['view'],
        'hr.letters': ['view', 'create'],
        rfis: ['view', 'create', 'edit'],
        submittals: ['view', 'create', 'edit'],
        hr: ['view'],
    },

    // 8️⃣ planning_engineer (مهندس تخطيط) - assigned projects, readonly reports
    planning_engineer: {
        projects: ['view'],
        tasks: ['view', 'edit'],
        'accounting.reports': ['view', 'create'],
        'hr.profile': ['view'],
        'hr.leaves': ['view', 'create'],
        'hr.attendance': ['view'],
        'hr.payroll': ['view'],
        'hr.reviews': ['view'],
        'hr.letters': ['view', 'create'],
        hr: ['view'],
    },

    // 9️⃣ designer (مصمم) - assigned projects only, no financials
    designer: {
        projects: ['view'],
        tasks: ['view', 'edit'],
        'hr.profile': ['view'],
        'hr.leaves': ['view', 'create'],
        'hr.attendance': ['view'],
        'hr.payroll': ['view'],
        'hr.reviews': ['view'],
        'hr.letters': ['view', 'create'],
        hr: ['view'],
    },

    // 🔟 technician (فني) - assigned projects only
    technician: {
        projects: ['view'],
        tasks: ['view', 'edit'],
        'hr.profile': ['view'],
        'hr.leaves': ['view', 'create'],
        'hr.attendance': ['view'],
        'hr.payroll': ['view'],
        'hr.reviews': ['view'],
        'hr.letters': ['view', 'create'],
        hr: ['view'],
    },

    // 1️⃣1️⃣ finance_manager (مدير مالي) - full accounting, approve change orders
    finance_manager: {
        projects: ['view'],
        invoices: ['view', 'create', 'edit', 'print'],
        accounting: ['view', 'create', 'edit', 'delete'],
        'accounting.reports': ['view', 'create', 'print'],
        forms: ['view', 'create', 'edit'],
        'forms.change_orders': ['view', 'approve'],
        'hr.profile': ['view'],
        'hr.leaves': ['view', 'create'],
        'hr.attendance': ['view'],
        'hr.payroll': ['view'],
        'hr.reviews': ['view'],
        'hr.letters': ['view', 'create'],
        approval_requests: ['view', 'create', 'approve'],
        hr: ['view'],
    },

    // 1️⃣2️⃣ accountant (محاسب) - مشاهدة + طباعة + رفع طلبات للاعتماد (لا إنشاء مباشر)
    accountant: {
        invoices: ['view', 'print'],
        accounting: ['view', 'print', 'submit'],  // submit = رفع طلب للاعتماد
        'accounting.reports': ['view', 'print'],
        clients: ['view'],  // مشاهدة العملاء
        'hr.profile': ['view', 'edit'],
        'hr.leaves': ['view', 'create'],
        'hr.attendance': ['view'],
        'hr.payroll': ['view'],
        'hr.reviews': ['view'],
        'hr.letters': ['view', 'create'],
        approval_requests: ['view', 'submit'],  // رفع طلبات للاعتماد
        hr: ['view'],
    },

    // 1️⃣3️⃣ sales_manager (مدير مبيعات) - full clients/invoices/forms
    sales_manager: {
        clients: ['view', 'create', 'edit'],
        invoices: ['view', 'create', 'edit', 'print'],
        forms: ['view', 'create', 'edit'],
        'hr.profile': ['view'],
        'hr.leaves': ['view', 'create'],
        'hr.attendance': ['view'],
        'hr.payroll': ['view'],
        'hr.reviews': ['view'],
        'hr.letters': ['view', 'create'],
        hr: ['view'],
    },

    // 1️⃣4️⃣ hr_manager (مدير الموارد البشرية) - full HR
    hr_manager: {
        hr: ['view', 'create', 'edit', 'delete'],
        'hr.profile': ['view', 'edit'],
        'hr.leaves': ['view', 'create', 'edit', 'approve'],
        'hr.attendance': ['view', 'create', 'edit'],
        'hr.payroll': ['view', 'create', 'edit'],
        'hr.reviews': ['view', 'create', 'edit'],
        'hr.letters': ['view', 'create'],
        users: ['view'],
    },

    // 1️⃣5️⃣ admin_assistant (مساعد إداري) - create clients, full forms
    admin_assistant: {
        clients: ['view', 'create'],
        forms: ['view', 'create', 'edit'],
        'hr.profile': ['view'],
        'hr.leaves': ['view', 'create'],
        'hr.attendance': ['view'],
        'hr.payroll': ['view'],
        'hr.reviews': ['view'],
        'hr.letters': ['view', 'create'],
        hr: ['view'],
    },

    // 1️⃣6️⃣ procurement_officer (مسؤول مشتريات) - readonly projects/accounting
    procurement_officer: {
        projects: ['view'],
        accounting: ['view'],
        'hr.profile': ['view'],
        'hr.leaves': ['view', 'create'],
        'hr.attendance': ['view'],
        'hr.payroll': ['view'],
        'hr.reviews': ['view'],
        'hr.letters': ['view', 'create'],
        hr: ['view'],
    },

    // 1️⃣7️⃣ storekeeper (أمين مخزن) - HR self-service only
    storekeeper: {
        projects: ['view'],
        'hr.profile': ['view'],
        'hr.leaves': ['view', 'create'],
        'hr.attendance': ['view'],
        'hr.payroll': ['view'],
        'hr.reviews': ['view'],
        'hr.letters': ['view', 'create'],
        hr: ['view'],
    },

    // 1️⃣8️⃣ qa_qc (ضبط الجودة) - readonly projects/tasks
    qa_qc: {
        projects: ['view'],
        tasks: ['view'],
        'hr.profile': ['view'],
        'hr.leaves': ['view', 'create'],
        'hr.attendance': ['view'],
        'hr.payroll': ['view'],
        'hr.reviews': ['view'],
        'hr.letters': ['view', 'create'],
        hr: ['view'],
    },

    // 1️⃣9️⃣ document_controller (مراقب وثائق) - readonly on documents
    document_controller: {
        projects: ['view'],
        forms: ['view'],
        'hr.profile': ['view'],
        'hr.leaves': ['view', 'create'],
        'hr.attendance': ['view'],
        'hr.payroll': ['view'],
        'hr.reviews': ['view'],
        'hr.letters': ['view', 'create'],
        drawings: ['view'],
        submittals: ['view'],
        hr: ['view'],
    },

    // 2️⃣0️⃣ viewer (مشاهد فقط) - HR self-service only
    viewer: {
        'hr.profile': ['view'],
        'hr.leaves': ['view', 'create'],
        'hr.attendance': ['view'],
        'hr.payroll': ['view'],
        'hr.reviews': ['view'],
        'hr.letters': ['view', 'create'],
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
    'hr.profile': 'بياناتي الشخصية',
    'hr.leaves': 'الإجازات',
    'hr.attendance': 'الحضور والانصراف',
    'hr.payroll': 'كشف الرواتب',
    'hr.reviews': 'التقييمات',
    'hr.letters': 'الخطابات الرسمية',
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
    print: 'طباعة',
    submit: 'رفع للاعتماد',
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
    'hr.profile',
    'hr.leaves',
    'hr.attendance',
    'hr.payroll',
    'hr.reviews',
    'hr.letters',
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
export const ALL_ACTIONS: PermissionAction[] = ['view', 'create', 'edit', 'delete', 'approve', 'print', 'submit'];

/**
 * Permission Modifiers - Granular flags to restrict/enhance access
 */
export type PermissionModifier = 'onlyAssigned' | 'canViewFinancials' | 'onlyOwn' | 'autoApprove';

export const ALL_MODIFIERS: PermissionModifier[] = ['onlyAssigned', 'canViewFinancials', 'onlyOwn', 'autoApprove'];

export const MODIFIER_LABELS: Record<PermissionModifier, string> = {
    onlyAssigned: 'المسندة فقط',
    canViewFinancials: 'عرض الماليات',
    onlyOwn: 'البيانات الشخصية فقط',
    autoApprove: 'اعتماد تلقائي',
};

/**
 * Default Modifiers per Role
 * Defines restrictions or enhancements enabled by default for specific roles
 */
export const DEFAULT_MODIFIERS: Record<string, Partial<Record<PermissionResource, PermissionModifier[]>>> = {
    // المهندسين والفنيين: المشاريع والمهام المُسندة فقط
    architect: {
        projects: ['onlyAssigned'],
        tasks: ['onlyAssigned'],
    },
    interior_designer: {
        projects: ['onlyAssigned'],
        tasks: ['onlyAssigned'],
    },
    designer: {
        projects: ['onlyAssigned'],
        tasks: ['onlyAssigned'],
    },
    site_engineer: {
        projects: ['onlyAssigned'],
        tasks: ['onlyAssigned'],
    },
    planning_engineer: {
        projects: ['onlyAssigned'],
        tasks: ['onlyAssigned'],
    },
    technician: {
        tasks: ['onlyAssigned'],
    },

    // منسق المشاريع: المسندة فقط
    project_coordinator: {
        projects: ['onlyAssigned'],
        tasks: ['onlyAssigned'],
    },

    // المحاسب: يرى الماليات لكن بدون autoApprove (يرفع طلبات)
    accountant: {
        projects: ['canViewFinancials'],
        accounting: ['canViewFinancials'],
        // بدون autoApprove = يرفع طلبات للاعتماد
    },

    // مسؤول المشتريات: بدون autoApprove (يرفع طلبات)
    procurement_officer: {
        accounting: ['canViewFinancials'],
        // بدون autoApprove
    },

    // الإدارة العليا: كل شيء متاح + autoApprove
    admin: {
        projects: ['canViewFinancials'],
        accounting: ['canViewFinancials', 'autoApprove'],
        invoices: ['autoApprove'],
    },
    finance_manager: {
        projects: ['canViewFinancials'],
        accounting: ['canViewFinancials', 'autoApprove'],
        invoices: ['autoApprove'],
    },
    department_manager: {
        projects: ['canViewFinancials'],
    },
    project_manager: {
        projects: ['canViewFinancials'],
    },
};

/**
 * Check if a role has a specific modifier enabled by default
 */
export function hasDefaultModifier(
    role: string | undefined,
    resource: PermissionResource,
    modifier: PermissionModifier
): boolean {
    if (!role) return false;
    const roleModifiers = DEFAULT_MODIFIERS[role];
    if (!roleModifiers) return false;
    const resourceModifiers = roleModifiers[resource];
    return resourceModifiers ? resourceModifiers.includes(modifier) : false;
}
