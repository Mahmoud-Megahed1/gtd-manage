import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { PermissionsGrid } from "./PermissionsGrid";
import { PERMISSION_MATRIX, ROLE_LABELS } from "@/lib/permissions";

interface EditUserDialogProps {
  user: {
    id: number;
    name: string | null;
    email: string | null;
    role: any;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditUserDialog({ user, open, onOpenChange }: EditUserDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "designer" as any,
  });
  const [customizePermissions, setCustomizePermissions] = useState(false);
  const [customPermissions, setCustomPermissions] = useState<Record<string, boolean>>({});

  // Fetch user's current custom permissions
  const { data: savedPermissions, refetch: refetchPermissions } = trpc.users.getPermissions.useQuery(
    { userId: user?.id || 0 },
    { enabled: open && !!user }
  );

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        role: user.role,
      });
    }
  }, [user]);

  // Load saved permissions when dialog opens
  useEffect(() => {
    if (open && savedPermissions && Object.keys(savedPermissions).length > 0) {
      setCustomPermissions(savedPermissions);
      setCustomizePermissions(true);
    } else if (open) {
      setCustomPermissions({});
      setCustomizePermissions(false);
    }
  }, [open, savedPermissions]);

  const utils = trpc.useUtils();

  const updateUser = trpc.users.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث بيانات المستخدم بنجاح");
      utils.users.list.invalidate();
    },
    onError: (error) => {
      toast.error(`فشل التحديث: ${error.message}`);
    },
  });

  const updatePermissionsMutation = trpc.users.setPermissions.useMutation({
    onSuccess: () => {
      refetchPermissions();
    },
    onError: (error) => {
      toast.error(`فشل حفظ الصلاحيات: ${error.message}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    try {
      // Update user data
      await updateUser.mutateAsync({
        userId: user.id,
        name: formData.name !== user.name ? formData.name : undefined,
        email: formData.email !== user.email ? formData.email : undefined,
        role: formData.role !== user.role ? formData.role : undefined,
      });

      // Update permissions if customized
      if (customizePermissions && Object.keys(customPermissions).length > 0) {
        await updatePermissionsMutation.mutateAsync({
          userId: user.id,
          permissions: customPermissions,
        });
      }

      toast.success("تم حفظ جميع التغييرات بنجاح");
      onOpenChange(false);
    } catch (error) {
      // Errors are handled in mutation callbacks
    }
  };

  const handleResetPermissions = () => {
    setCustomPermissions({});
    toast.info("تم إعادة الصلاحيات للإعدادات الافتراضية للدور");
  };

  const getRoleLabel = (role: string) => {
    return ROLE_LABELS[role] || role;
  };

  const getRoleDescription = (role: string) => {
    const descriptions: Record<string, string> = {
      admin: "صلاحيات كاملة على النظام",
      department_manager: "إدارة قسمه + تقارير + HR",
      project_manager: "إدارة المشاريع والمهام",
      project_coordinator: "تنسيق المشاريع والمهام",
      architect: "المشاريع المُسندة + الرسومات + RFIs",
      interior_designer: "المشاريع المُسندة + الرسومات",
      site_engineer: "المشاريع المُسندة + RFIs + Submittals",
      planning_engineer: "المشاريع المُسندة + التقارير",
      designer: "المشاريع والمهام المُسندة فقط",
      technician: "المهام المُسندة فقط",
      finance_manager: "إدارة مالية كاملة + اعتماد",
      accountant: "مشاهدة + طباعة + رفع طلبات اعتماد",
      sales_manager: "العملاء والفواتير",
      hr_manager: "إدارة شؤون الموظفين كاملة",
      admin_assistant: "بياناته HR + طلب إجازة",
      procurement_officer: "طلبات الشراء والموردين",
      storekeeper: "المخزون والتوريدات",
      qa_qc: "الجودة والفحوصات",
      document_controller: "الوثائق والملفات",
      viewer: "مشاهدة فقط + HR self-service",
    };
    return descriptions[role] || "";
  };

  if (!user) return null;

  const isPending = updateUser.isPending || updatePermissionsMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${customizePermissions ? 'sm:max-w-4xl max-h-[90vh]' : 'sm:max-w-[500px]'}`}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>تعديل بيانات المستخدم</DialogTitle>
            <DialogDescription>
              قم بتحديث معلومات المستخدم أو تغيير دوره وصلاحياته في النظام
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className={customizePermissions ? "h-[60vh] pr-4" : ""}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">الاسم</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="أدخل اسم المستخدم"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email">البريد الإلكتروني</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="user@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-role">الدور</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: any) => {
                    setFormData({ ...formData, role: value });
                    // Reset permissions when role changes
                    if (value !== user.role) {
                      setCustomPermissions({});
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(ROLE_LABELS).map((role) => (
                      <SelectItem key={role} value={role}>
                        {getRoleLabel(role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {getRoleDescription(formData.role)}
                </p>
              </div>

              {formData.role !== user.role && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                  <p className="text-sm text-yellow-600 dark:text-yellow-500">
                    ⚠️ تحذير: تغيير الدور سيؤثر على صلاحيات المستخدم في النظام
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between space-x-2 space-x-reverse border-t pt-4">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Switch
                    id="customize-mode"
                    checked={customizePermissions}
                    onCheckedChange={setCustomizePermissions}
                  />
                  <Label htmlFor="customize-mode" className="font-medium">تخصيص الصلاحيات المتقدمة</Label>
                </div>
                {customizePermissions && Object.keys(customPermissions).length > 0 && (
                  <Button type="button" variant="ghost" size="sm" onClick={handleResetPermissions}>
                    إعادة للافتراضي
                  </Button>
                )}
              </div>

              {customizePermissions && (
                <div className="border rounded-md p-4 bg-slate-50 dark:bg-slate-900">
                  <PermissionsGrid
                    role={formData.role}
                    customPermissions={customPermissions}
                    onChange={setCustomPermissions}
                  />
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
