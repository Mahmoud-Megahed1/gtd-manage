import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Search, Filter, Download } from "lucide-react";
import { useState } from "react";

export default function ActivityLog() {
  const { data: logs, isLoading } = trpc.auditLogs.list.useQuery({});
  const [searchTerm, setSearchTerm] = useState("");

  const filteredLogs = logs?.filter((log: any) => 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.userName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return 'text-green-600 bg-green-50';
    if (action.includes('UPDATE')) return 'text-blue-600 bg-blue-50';
    if (action.includes('DELETE')) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'CREATE_CLIENT': 'إضافة عميل',
      'UPDATE_CLIENT': 'تعديل عميل',
      'DELETE_CLIENT': 'حذف عميل',
      'CREATE_PROJECT': 'إضافة مشروع',
      'UPDATE_PROJECT': 'تعديل مشروع',
      'DELETE_PROJECT': 'حذف مشروع',
      'CREATE_INVOICE': 'إصدار فاتورة',
      'UPDATE_INVOICE': 'تعديل فاتورة',
      'DELETE_INVOICE': 'حذف فاتورة',
      'CREATE_FORM': 'إضافة استمارة',
      'UPDATE_FORM': 'تعديل استمارة',
      'DELETE_FORM': 'حذف استمارة',
      'LOGIN': 'تسجيل دخول',
      'LOGOUT': 'تسجيل خروج',
    };
    return labels[action] || action;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">سجل النشاطات</h1>
            <p className="text-muted-foreground">تتبع جميع الإجراءات والتعديلات في النظام</p>
          </div>
          <Button variant="outline">
            <Download className="w-4 h-4 ml-2" />
            تصدير السجل
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث في السجل..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Button variant="outline">
                <Filter className="w-4 h-4 ml-2" />
                تصفية
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ والوقت</TableHead>
                  <TableHead>المستخدم</TableHead>
                  <TableHead>الإجراء</TableHead>
                  <TableHead>التفاصيل</TableHead>
                  <TableHead>عنوان IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">جاري التحميل...</TableCell>
                  </TableRow>
                ) : filteredLogs && filteredLogs.length > 0 ? (
                  filteredLogs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {new Date(log.createdAt).toLocaleString('ar-SA', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell className="font-medium">{log.userName || 'غير معروف'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                          {getActionLabel(log.action)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.details || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.ipAddress || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      {searchTerm ? 'لا توجد نتائج مطابقة للبحث' : 'لا توجد نشاطات مسجلة'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">إجمالي النشاطات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{logs?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">عمليات الإضافة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {logs?.filter((l: any) => l.action.includes('CREATE')).length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">عمليات التعديل</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {logs?.filter((l: any) => l.action.includes('UPDATE')).length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">عمليات الحذف</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {logs?.filter((l: any) => l.action.includes('DELETE')).length || 0}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
