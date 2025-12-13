import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { toast } from "sonner";

interface PayslipData {
  payroll: {
    id: number;
    employeeId: number;
    month: number;
    year: number;
    baseSalary: number;
    bonuses: number | null;
    deductions: number | null;
    netSalary: number;
    status: string;
    paymentDate: Date | null;
    notes: string | null;
    createdAt: Date;
  };
  employee: {
    id: number;
    employeeNumber: string;
    department: string | null;
    position: string | null;
    hireDate: Date;
    salary: number | null;
    bankAccount: string | null;
  } | null;
  user: {
    id: number;
    name: string;
    email: string;
  } | null;
}

export function PayslipPDF({ data }: { data: PayslipData }) {
  const generatePDF = () => {
    const { payroll, employee, user } = data;
    
    // Create HTML content for PDF
    const htmlContent = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>كشف راتب - ${user?.name || 'موظف'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 40px;
      background: #f5f5f5;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #D4AF37;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header img.logo {
      max-width: 200px;
      height: auto;
      margin-bottom: 15px;
    }
    .header h1 {
      color: #D4AF37;
      font-size: 32px;
      margin-bottom: 10px;
    }
    .header p {
      color: #666;
      font-size: 14px;
    }
    .company-info {
      text-align: center;
      margin-bottom: 20px;
      color: #666;
      font-size: 12px;
      line-height: 1.6;
    }
    .info-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 30px;
    }
    .info-box {
      background: #f9f9f9;
      padding: 15px;
      border-radius: 8px;
    }
    .info-box h3 {
      color: #333;
      font-size: 14px;
      margin-bottom: 10px;
      font-weight: 600;
    }
    .info-box p {
      color: #666;
      font-size: 13px;
      margin: 5px 0;
    }
    .salary-table {
      width: 100%;
      border-collapse: collapse;
      margin: 30px 0;
    }
    .salary-table th,
    .salary-table td {
      padding: 12px;
      text-align: right;
      border-bottom: 1px solid #e0e0e0;
    }
    .salary-table th {
      background: #f5f5f5;
      font-weight: 600;
      color: #333;
    }
    .salary-table tr:hover {
      background: #fafafa;
    }
    .total-row {
      background: #D4AF37 !important;
      color: white !important;
      font-weight: bold;
      font-size: 18px;
    }
    .total-row td {
      border: none !important;
    }
    .positive {
      color: #10b981;
    }
    .negative {
      color: #ef4444;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e0e0e0;
      text-align: center;
      color: #999;
      font-size: 12px;
    }
    .footer img.barcode {
      max-width: 200px;
      height: auto;
      margin: 20px auto;
      display: block;
    }
    .signature-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 60px;
    }
    .signature-box {
      text-align: center;
    }
    .signature-line {
      border-top: 2px solid #333;
      margin-top: 60px;
      padding-top: 10px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="/logo.png" alt="Golden Touch Design" class="logo" />
      <h1>Golden Touch Design</h1>
      <p>كشف راتب شهر ${payroll.month}/${payroll.year}</p>
    </div>
    
    <div class="company-info">
      <p><strong>شركة اللمسة الذهبية للتصميم الداخلي والمعماري</strong></p>
      <p>المملكة العربية السعودية</p>
      <p>البريد الإلكتروني: info@goldentouch-design.sa | الهاتف: +966 XX XXX XXXX</p>
      <p>السجل التجاري: XXXXXXXXXX | الرقم الضريبي: XXXXXXXXXXXXXX</p>
    </div>

    <div class="info-section">
      <div class="info-box">
        <h3>معلومات الموظف</h3>
        <p><strong>الاسم:</strong> ${user?.name || 'غير محدد'}</p>
        <p><strong>رقم الموظف:</strong> ${employee?.employeeNumber || 'غير محدد'}</p>
        <p><strong>القسم:</strong> ${employee?.department || 'غير محدد'}</p>
        <p><strong>المنصب:</strong> ${employee?.position || 'غير محدد'}</p>
      </div>

      <div class="info-box">
        <h3>معلومات الدفع</h3>
        <p><strong>تاريخ الإصدار:</strong> ${new Date(payroll.createdAt).toLocaleDateString('ar-SA')}</p>
        <p><strong>تاريخ الدفع:</strong> ${payroll.paymentDate ? new Date(payroll.paymentDate).toLocaleDateString('ar-SA') : 'لم يُدفع بعد'}</p>
        <p><strong>الحالة:</strong> ${payroll.status === 'paid' ? 'مدفوع' : 'معلق'}</p>
        <p><strong>الحساب البنكي:</strong> ${employee?.bankAccount || 'غير محدد'}</p>
      </div>
    </div>

    <table class="salary-table">
      <thead>
        <tr>
          <th>البيان</th>
          <th>المبلغ (ريال)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>الراتب الأساسي</td>
          <td>${payroll.baseSalary.toLocaleString('ar-SA')}</td>
        </tr>
        ${payroll.bonuses && payroll.bonuses > 0 ? `
        <tr>
          <td>المكافآت والبدلات</td>
          <td class="positive">+${payroll.bonuses.toLocaleString('ar-SA')}</td>
        </tr>
        ` : ''}
        ${payroll.deductions && payroll.deductions > 0 ? `
        <tr>
          <td>الخصومات</td>
          <td class="negative">-${payroll.deductions.toLocaleString('ar-SA')}</td>
        </tr>
        ` : ''}
        <tr class="total-row">
          <td>صافي الراتب</td>
          <td>${payroll.netSalary.toLocaleString('ar-SA')}</td>
        </tr>
      </tbody>
    </table>

    ${payroll.notes ? `
    <div class="info-box">
      <h3>ملاحظات</h3>
      <p>${payroll.notes}</p>
    </div>
    ` : ''}

    <div class="signature-section">
      <div class="signature-box">
        <div class="signature-line">توقيع الموظف</div>
      </div>
      <div class="signature-box">
        <div class="signature-line">توقيع المدير المالي</div>
      </div>
    </div>

    <div class="footer">
      <img src="/barcode.jpg" alt="Barcode" class="barcode" />
      <p>هذا المستند تم إنشاؤه إلكترونياً من نظام Golden Touch Design</p>
      <p>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-SA')} - ${new Date().toLocaleTimeString('ar-SA')}</p>
      <p style="margin-top: 10px; font-size: 10px;">رقم المستند: PAY-${payroll.id}-${payroll.year}${String(payroll.month).padStart(2, '0')}</p>
    </div>
  </div>
</body>
</html>
    `;

    // Open print dialog
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      
      // Wait for content to load then print
      printWindow.onload = () => {
        printWindow.print();
      };
      
      toast.success('تم فتح نافذة الطباعة');
    } else {
      toast.error('فشل فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة.');
    }
  };

  return (
    <Button onClick={generatePDF} variant="outline" className="gap-2">
      <FileText className="w-4 h-4" />
      تحميل PDF
    </Button>
  );
}
