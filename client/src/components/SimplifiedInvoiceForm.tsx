import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Save, FileText, Info } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface InvoiceItem {
  description: string;
  unit: string;
  quantity: number;
  price: number;
  discount: number;
}

interface InvoiceFormData {
  id?: number;
  date: string;
  documentType: string;
  clientName: string;
  clientPhone: string;
  clientCity: string;
  projectNature: string;
  siteNature: string;
  designType: string;
  designStyle: string;
  items: InvoiceItem[];
  paymentMethods: string[];
  paymentSchedule: string;
  validityPeriod: string;
  designDuration: string;
}

interface SimplifiedInvoiceFormProps {
  invoiceId?: number;
  onSave?: () => void;
}

export default function SimplifiedInvoiceForm({ invoiceId, onSave }: SimplifiedInvoiceFormProps) {
  const [formData, setFormData] = useState<InvoiceFormData>({
    date: new Date().toISOString().split("T")[0],
    documentType: "quote",
    clientName: "",
    clientPhone: "",
    clientCity: "",
    projectNature: "",
    siteNature: "",
    designType: "",
    designStyle: "",
    items: [
      {
        description: "",
        unit: "متر",
        quantity: 0,
        price: 0,
        discount: 0,
      },
    ],
    paymentMethods: [],
    paymentSchedule: "50-50",
    validityPeriod: "3",
    designDuration: "custom",
  });

  const [showDevInfo, setShowDevInfo] = useState(false);

  const saveInvoiceMutation = trpc.invoices.create.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ الفاتورة بنجاح");
      onSave?.();
    },
    onError: (error) => {
      toast.error(`فشل حفظ الفاتورة: ${error.message}`);
    },
  });

  const calculateItemTotal = (item: InvoiceItem) => {
    const subtotal = item.quantity * item.price;
    const discountAmount = (subtotal * item.discount) / 100;
    return subtotal - discountAmount;
  };

  const calculateGrandTotal = () => {
    return formData.items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          description: "",
          unit: "متر",
          quantity: 0,
          price: 0,
          discount: 0,
        },
      ],
    });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const handleSave = () => {
    saveInvoiceMutation.mutate({
      clientId: 1, // TODO: ربط بعميل حقيقي
      type: formData.documentType === "quote" ? "quote" : "invoice",
      issueDate: new Date(formData.date),
      subtotal: calculateGrandTotal(),
      total: calculateGrandTotal(),
      items: formData.items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.price,
        total: calculateItemTotal(item)
      })),
      formData: JSON.stringify(formData),
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 bg-white" dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between border-b pb-6 print:border-gray-300">
        <div className="flex-1">
          <img src="/LOGO.png" alt="Golden Touch Design" className="h-24 mb-4" />
          <h1 className="text-2xl font-bold text-amber-600">GOLDEN TOUCH DESIGN</h1>
          <p className="text-lg font-semibold">شركة اللمسة الذهبية للتصميم</p>
          <p className="text-sm text-gray-600">سجل تجاري C.R. 7017891396</p>
        </div>
        <div className="space-y-2 print-hide">
          <Dialog open={showDevInfo} onOpenChange={setShowDevInfo}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Info className="ml-2 h-4 w-4" />
                تطوير النموذج
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" dir="rtl">
              <DialogHeader>
                <DialogTitle>مواصفات النموذج الكامل</DialogTitle>
                <DialogDescription>
                  هذا النموذج مبسط حالياً. للتطوير الكامل، راجع الملف: disfat-1.txt
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div>
                  <h3 className="font-semibold mb-2">الميزات المطلوبة للنسخة الكاملة:</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    <li>أقسام شرطية تظهر حسب طبيعة المشروع (تصميم/تنفيذ/استشارة)</li>
                    <li>خدمات التصميم المقدمة (2D, 3D, رسوم تنفيذية، إلخ)</li>
                    <li>خدمات التنفيذ المقدمة (ديكور، أثاث، تشطيبات، إلخ)</li>
                    <li>جدول ديناميكي للكميات والأسعار مع حسابات تلقائية</li>
                    <li>وسائل دفع متعددة (تمارا، MISpay، فيزا، مدى، إلخ)</li>
                    <li>جدولة الدفعات (50%-50%, 50%-25%-25%, 100%)</li>
                    <li>شروط وأحكام قابلة للتخصيص</li>
                    <li>حفظ HTML مع البيانات المدخلة</li>
                    <li>طباعة نظيفة مع إخفاء العناصر الفارغة</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">المنطق الشرطي المطلوب:</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    <li>إظهار قسم "خدمات التصميم" عند اختيار "تصميم"</li>
                    <li>إظهار قسم "خدمات التنفيذ" عند اختيار "تنفيذ"</li>
                    <li>حقول مخصصة تظهر عند اختيار "مخصص"</li>
                    <li>حسابات تلقائية للإجماليات والخصومات</li>
                  </ul>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Document Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>التاريخ</Label>
          <Input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          />
        </div>
        <div>
          <Label>نوع المستند</Label>
          <Select
            value={formData.documentType}
            onValueChange={(value) => setFormData({ ...formData, documentType: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="quote-invoice">عرض سعر وفاتورة سداد</SelectItem>
              <SelectItem value="quote">عرض سعر</SelectItem>
              <SelectItem value="invoice">فاتورة سداد</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Client Info */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-4">بيانات العميل</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>اسم العميل</Label>
            <Input
              value={formData.clientName}
              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
            />
          </div>
          <div>
            <Label>رقم الجوال</Label>
            <Input
              value={formData.clientPhone}
              onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
            />
          </div>
          <div>
            <Label>المدينة \ الحي</Label>
            <Input
              value={formData.clientCity}
              onChange={(e) => setFormData({ ...formData, clientCity: e.target.value })}
            />
          </div>
        </div>
      </Card>

      {/* Project Info */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-4">بيانات المشروع</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>طبيعة المشروع</Label>
            <Select
              value={formData.projectNature}
              onValueChange={(value) => setFormData({ ...formData, projectNature: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="design">تصميم</SelectItem>
                <SelectItem value="execution">تنفيذ</SelectItem>
                <SelectItem value="consultation-site">استشارة في موقع المشروع</SelectItem>
                <SelectItem value="consultation-office">استشارة في المكتب</SelectItem>
                <SelectItem value="consultation-online">استشارة اونلاين</SelectItem>
                <SelectItem value="custom">مخصص</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>طبيعة الموقع</Label>
            <Select
              value={formData.siteNature}
              onValueChange={(value) => setFormData({ ...formData, siteNature: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="room">غرفة</SelectItem>
                <SelectItem value="studio">استديو</SelectItem>
                <SelectItem value="apartment">شقة</SelectItem>
                <SelectItem value="villa">فيلا</SelectItem>
                <SelectItem value="palace">قصر</SelectItem>
                <SelectItem value="land">ارض</SelectItem>
                <SelectItem value="farm">مزرعة</SelectItem>
                <SelectItem value="chalet">شاليه</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>التصميم المطلوب</Label>
            <Select
              value={formData.designType}
              onValueChange={(value) => setFormData({ ...formData, designType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="interior">داخلي</SelectItem>
                <SelectItem value="exterior">خارجي</SelectItem>
                <SelectItem value="landscape">لاندسكيب</SelectItem>
                <SelectItem value="architectural">معماري</SelectItem>
                <SelectItem value="interior-exterior">داخلي وخارجي</SelectItem>
                <SelectItem value="interior-landscape">داخلي ولاندسكيب</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>طراز التصميم</Label>
            <Select
              value={formData.designStyle}
              onValueChange={(value) => setFormData({ ...formData, designStyle: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="modern">مودرن</SelectItem>
                <SelectItem value="classic">كلاسيك</SelectItem>
                <SelectItem value="neoclassic">نيو كلاسيك</SelectItem>
                <SelectItem value="bohemian">بوهيمي</SelectItem>
                <SelectItem value="minimal">مينيمل</SelectItem>
                <SelectItem value="industrial">صناعي</SelectItem>
                <SelectItem value="popular">شعبي</SelectItem>
                <SelectItem value="najdi">نجدي</SelectItem>
                <SelectItem value="hejazi">حجازي</SelectItem>
                <SelectItem value="islamic">إسلامي</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Items Table */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-4">الكميات والاسعار</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="p-2 text-right">#</th>
                <th className="p-2 text-right">وصف الخدمة</th>
                <th className="p-2 text-right">الوحدة</th>
                <th className="p-2 text-right">الكمية</th>
                <th className="p-2 text-right">السعر</th>
                <th className="p-2 text-right">الخصم %</th>
                <th className="p-2 text-right">الاجمالي</th>
                <th className="p-2 print-hide"></th>
              </tr>
            </thead>
            <tbody>
              {formData.items.map((item, index) => (
                <tr key={index} className="border-b">
                  <td className="p-2">{index + 1}</td>
                  <td className="p-2">
                    <Textarea
                      value={item.description}
                      onChange={(e) => updateItem(index, "description", e.target.value)}
                      className="min-h-[60px]"
                    />
                  </td>
                  <td className="p-2">
                    <Select
                      value={item.unit}
                      onValueChange={(value) => updateItem(index, "unit", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="متر">متر</SelectItem>
                        <SelectItem value="قطعة">قطعة</SelectItem>
                        <SelectItem value="مشروع">مشروع</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value) || 0)}
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      value={item.price}
                      onChange={(e) => updateItem(index, "price", parseFloat(e.target.value) || 0)}
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      value={item.discount}
                      onChange={(e) => updateItem(index, "discount", parseFloat(e.target.value) || 0)}
                    />
                  </td>
                  <td className="p-2 font-semibold">{calculateItemTotal(item).toFixed(2)}</td>
                  <td className="p-2 print-hide">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      disabled={formData.items.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button onClick={addItem} variant="outline" className="mt-4 print-hide">
          <Plus className="ml-2 h-4 w-4" />
          إضافة صف جديد
        </Button>
        <div className="mt-4 text-left border-t pt-4">
          <p className="text-xl font-bold">
            الإجمالي: <span className="text-amber-600">{calculateGrandTotal().toFixed(2)}</span> ريال سعودي
          </p>
        </div>
      </Card>

      {/* Payment Info */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-4">الدفع والشروط</h2>
        <div className="space-y-4">
          <div>
            <Label>جدولة الدفعات</Label>
            <Select
              value={formData.paymentSchedule}
              onValueChange={(value) => setFormData({ ...formData, paymentSchedule: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50-50">50%-50% | دفعة اولى - دفعة ثانية بعد رفع 3D</SelectItem>
                <SelectItem value="50-25-25">50%-25%-25% | دفعة اولى - دفعة ثانية بعد رفع 2D - دفعة ثالثة بعد رفع 3D</SelectItem>
                <SelectItem value="100">دفعة مقدمة 100%</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="bg-yellow-50 p-4 rounded">
            <h3 className="font-semibold mb-2">الشروط والاحكام</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>عرض السعر صالح حتى {formData.validityPeriod} أيام من تاريخ إصداره</li>
              <li>مدة التصميم حسب الاتفاق</li>
              <li>يحق للعميل الغاء الطلب قبل المباشرة بالمشروع</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Footer */}
      <div className="border-t pt-6 mt-6">
        <div className="flex items-end justify-between">
          <div className="text-sm text-gray-600">
            <p className="font-semibold">شركة اللمسة الذهبية للتصميم | GOLDEN TOUCH DESIGN</p>
            <p>الرياض, حي السفارات, مربع الفزاري, مبنى 3293, بوابة 5</p>
            <p>سجل تجاري C.R. 7017891396</p>
            <p>500511616 00966 - WWW.GOLDEN-TOUCH.NET - INFO@GOLDEN-TOUCH.NET</p>
          </div>
          <img src="/BARCODE.jpg" alt="Barcode" className="h-20" />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 print-hide sticky bottom-4 bg-white p-4 border-t shadow-lg">
        <Button onClick={handleSave} disabled={saveInvoiceMutation.isPending}>
          <Save className="ml-2 h-4 w-4" />
          حفظ
        </Button>
        <Button onClick={handlePrint} variant="outline">
          <FileText className="ml-2 h-4 w-4" />
          طباعة / PDF
        </Button>
      </div>

      <style>{`
        @media print {
          .print-hide {
            display: none !important;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
