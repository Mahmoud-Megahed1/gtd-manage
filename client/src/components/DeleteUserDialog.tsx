import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

interface DeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: number;
    name: string | null;
    email: string | null;
  } | null;
}

export function DeleteUserDialog({ open, onOpenChange, user }: DeleteUserDialogProps) {
  const utils = trpc.useUtils();

  const deleteUser = trpc.users.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف المستخدم بنجاح");
      utils.users.list.invalidate();
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error('Error deleting user:', error);
      const errorMessage = error?.message || error?.data?.message || "حدث خطأ أثناء حذف المستخدم";
      toast.error(errorMessage);
    },
  });

  const handleDelete = () => {
    if (!user) return;
    deleteUser.mutate({ userId: user.id });
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            تأكيد حذف المستخدم
          </DialogTitle>
          <DialogDescription>
            هذا الإجراء لا يمكن التراجع عنه. سيتم حذف المستخدم نهائياً من النظام.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="rounded-lg bg-destructive/10 p-4 space-y-2">
            <p className="font-medium">هل أنت متأكد من حذف المستخدم التالي؟</p>
            <div className="text-sm space-y-1">
              <p><span className="font-medium">الاسم:</span> {user.name || "غير محدد"}</p>
              <p><span className="font-medium">البريد الإلكتروني:</span> {user.email || "غير محدد"}</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteUser.isPending}
          >
            إلغاء
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteUser.isPending}
          >
            {deleteUser.isPending ? "جاري الحذف..." : "حذف المستخدم"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
