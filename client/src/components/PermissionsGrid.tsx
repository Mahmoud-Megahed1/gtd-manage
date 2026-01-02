import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
    ALL_ACTIONS,
    ALL_MODIFIERS,
    ALL_RESOURCES,
    ACTION_LABELS,
    MODIFIER_LABELS,
    RESOURCE_LABELS,
    hasPermission,
    hasDefaultModifier,
    type PermissionResource,
    type PermissionAction,
    type PermissionModifier
} from "@/lib/permissions";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

interface PermissionsGridProps {
    role: string;
    customPermissions: Record<string, boolean>;
    onChange: (permissions: Record<string, boolean>) => void;
}

export function PermissionsGrid({ role, customPermissions, onChange }: PermissionsGridProps) {

    const isEnabled = (resource: PermissionResource, type: string, isModifier: boolean) => {
        const key = `${resource}.${type}`;

        // 1. Check Custom Override
        if (key in customPermissions) {
            return customPermissions[key];
        }

        // 2. Check Default
        if (isModifier) {
            return hasDefaultModifier(role, resource, type as PermissionModifier);
        } else {
            return hasPermission(role, resource, type as PermissionAction);
        }
    };

    const toggle = (resource: PermissionResource, type: string, value: boolean) => {
        const key = `${resource}.${type}`;
        onChange({
            ...customPermissions,
            [key]: value
        });
    };

    // Group resources by category for better UI organization
    const groups = [
        {
            title: "المشاريع والمهام",
            resources: ['projects', 'tasks', 'drawings', 'rfis', 'submittals'] as PermissionResource[]
        },
        {
            title: "المالية",
            resources: ['accounting', 'accounting.reports', 'invoices', 'approval_requests'] as PermissionResource[]
        },
        {
            title: "الإدارة والموارد",
            resources: ['hr', 'users', 'clients', 'forms', 'forms.change_orders'] as PermissionResource[]
        },
        {
            title: "النظام",
            resources: ['settings', 'notifications', 'audit_logs'] as PermissionResource[]
        }
    ];

    return (
        <div className="space-y-4">
            {groups.map((group, idx) => (
                <div key={idx} className="border rounded-lg p-4 bg-card">
                    <h3 className="font-semibold text-lg mb-4 text-primary">{group.title}</h3>
                    <div className="space-y-6">
                        {group.resources.map(resource => (
                            <div key={resource} className="border-b pb-4 last:border-0 last:pb-0">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-medium text-base">{RESOURCE_LABELS[resource]}</h4>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Actions */}
                                    <div className="space-y-2">
                                        <span className="text-xs font-semibold text-muted-foreground block mb-1">الإجراءات</span>
                                        <div className="flex flex-wrap gap-3">
                                            {ALL_ACTIONS.map(action => {
                                                const checked = isEnabled(resource, action, false);
                                                const isDefault = hasPermission(role, resource, action);
                                                const isCustom = `${resource}.${action}` in customPermissions;

                                                return (
                                                    <div key={action} className="flex items-center gap-2">
                                                        <Checkbox
                                                            id={`${resource}-${action}`}
                                                            checked={checked}
                                                            onCheckedChange={(c) => toggle(resource, action, !!c)}
                                                        />
                                                        <Label
                                                            htmlFor={`${resource}-${action}`}
                                                            className={`cursor-pointer text-sm ${isCustom && checked !== isDefault ? 'text-amber-600 font-bold' : ''}`}
                                                        >
                                                            {ACTION_LABELS[action]}
                                                        </Label>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Modifiers (Constraints) */}
                                    <div className="space-y-2 bg-muted/20 p-2 rounded">
                                        <span className="text-xs font-semibold text-muted-foreground block mb-1">القيود والصلاحيات الخاصة</span>
                                        <div className="flex flex-wrap gap-3">
                                            {ALL_MODIFIERS.map(modifier => {
                                                const checked = isEnabled(resource, modifier, true);
                                                const isDefault = hasDefaultModifier(role, resource, modifier);
                                                const isCustom = `${resource}.${modifier}` in customPermissions;

                                                // Only show relevant modifiers for the resource?
                                                // For simplicity, showing all but we might want to filter.
                                                // e.g. 'onlyAssigned' makes sense for projects/tasks, not settings.
                                                // Let's implement a simple filter map.
                                                const relevant = isModifierRelevant(resource, modifier);
                                                if (!relevant) return null;

                                                return (
                                                    <div key={modifier} className="flex items-center gap-2">
                                                        <Checkbox
                                                            id={`${resource}-${modifier}`}
                                                            checked={checked}
                                                            onCheckedChange={(c) => toggle(resource, modifier, !!c)}
                                                        />
                                                        <Label
                                                            htmlFor={`${resource}-${modifier}`}
                                                            className={`cursor-pointer text-sm ${isCustom && checked !== isDefault ? 'text-amber-600 font-bold' : ''}`}
                                                        >
                                                            {MODIFIER_LABELS[modifier]}
                                                        </Label>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function isModifierRelevant(resource: PermissionResource, modifier: PermissionModifier): boolean {
    if (modifier === 'onlyAssigned') return ['projects', 'tasks', 'rfis', 'drawings', 'submittals'].includes(resource);
    if (modifier === 'canViewFinancials') return ['projects', 'tasks', 'accounting', 'invoices', 'accounting.reports'].includes(resource);
    if (modifier === 'onlyOwn') return ['hr', 'users'].includes(resource);
    if (modifier === 'autoApprove') return ['accounting', 'invoices', 'forms.change_orders'].includes(resource);
    return false;
}
