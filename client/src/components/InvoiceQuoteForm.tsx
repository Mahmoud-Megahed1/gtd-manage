import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Save, Printer } from "lucide-react";

interface LineItem {
  id: number;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

export default function InvoiceQuoteForm() {
  const [documentType, setDocumentType] = useState("quote");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Client Info
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientCity, setClientCity] = useState("");
  
  // Project Info
  const [projectNature, setProjectNature] = useState("");
  const [siteType, setSiteType] = useState("");
  const [designType, setDesignType] = useState("");
  const [designStyle, setDesignStyle] = useState("");
  
  // Line Items
  const [items, setItems] = useState<LineItem[]>([
    { id: 1, description: "", unit: "متر", quantity: 1, unitPrice: 0, discount: 0 }
  ]);

  const addItem = () => {
    const newId = Math.max(...items.map(i => i.id), 0) + 1;
    setItems([...items, { id: newId, description: "", unit: "متر", quantity: 1, unitPrice: 0, discount: 0 }]);
  };

  const removeItem = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: number, field: keyof LineItem, value: string | number) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const calculateItemTotal = (item: LineItem) => {
    const subtotal = item.quantity * item.unitPrice;
    const discountAmount = subtotal * (item.discount / 100);
    return subtotal - discountAmount;
  };

  const grandTotal = items.reduce((sum, item) => sum + calculateItemTotal(item), 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-[210mm] mx-auto bg-white p-8 shadow-lg" dir="rtl" style={{ fontFamily: 'Tajawal, sans-serif' }}>
      {/* Header */}
      <div className="border-b-4 border-primary pb-6 mb-6">
        <div className="flex items-center justify-between">
          <img src="/LOGO.png" alt="Golden Touch Design" className="h-20" />
          <div className="text-left">
            <h1 className="text-2xl font-bold">
              <span className="text-foreground">GOLDEN </span>
              <span className="text-primary">TOUCH</span>
              <span className="text-foreground"> DESIGN</span>
            </h1>
            <p className="text-sm text-muted-foreground">شركة اللمسة الذهبية للتصميم</p>
            <p className="text-xs text-muted-foreground mt-1">C.R. 7017891396</p>
          </div>
        </div>
      </div>

      {/* Document Type & Date */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <Label>نوع المستند</Label>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            className="w-full p-2 border rounded-md mt-1"
          >
            <option value="quote">عرض سعر</option>
            <option value="invoice">فاتورة سداد</option>
            <option value="both">عرض سعر وفاتورة سداد</option>
          </select>
        </div>
        <div>
          <Label>التاريخ</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>

      {/* Client Info */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <h2 className="text-lg font-bold mb-4 pb-2 border-b-2 border-primary">بيانات العميل</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>اسم العميل</Label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="الاسم الكامل"
                className="mt-1"
              />
            </div>
            <div>
              <Label>رقم الجوال</Label>
              <Input
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="+966"
                className="mt-1"
              />
            </div>
            <div>
              <Label>المدينة / الحي</Label>
              <Input
                value={clientCity}
                onChange={(e) => setClientCity(e.target.value)}
                placeholder="المدينة"
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project Info */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <h2 className="text-lg font-bold mb-4 pb-2 border-b-2 border-primary">بيانات المشروع</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>طبيعة المشروع</Label>
              <select
                value={projectNature}
                onChange={(e) => setProjectNature(e.target.value)}
                className="w-full p-2 border rounded-md mt-1"
              >
                <option value="">اختر...</option>
                <option value="design">تصميم</option>
                <option value="execution">تنفيذ</option>
                <option value="consultation_site">استشارة في الموقع</option>
                <option value="consultation_office">استشارة في المكتب</option>
                <option value="consultation_online">استشارة أونلاين</option>
                <option value="custom">مخصص</option>
              </select>
            </div>
            <div>
              <Label>طبيعة الموقع</Label>
              <select
                value={siteType}
                onChange={(e) => setSiteType(e.target.value)}
                className="w-full p-2 border rounded-md mt-1"
              >
                <option value="">اختر...</option>
                <option value="room">غرفة</option>
                <option value="studio">استديو</option>
                <option value="apartment">شقة</option>
                <option value="villa">فيلا</option>
                <option value="palace">قصر</option>
                <option value="shop">محل تجاري</option>
                <option value="restaurant">مطعم</option>
                <option value="garden">حديقة</option>
                <option value="custom">مخصص</option>
              </select>
            </div>
            <div>
              <Label>التصميم المطلوب</Label>
              <select
                value={designType}
                onChange={(e) => setDesignType(e.target.value)}
                className="w-full p-2 border rounded-md mt-1"
              >
                <option value="">اختر...</option>
                <option value="interior">داخلي</option>
                <option value="exterior">خارجي</option>
                <option value="landscape">لاندسكيب</option>
                <option value="architectural">معماري</option>
                <option value="custom">مخصص</option>
              </select>
            </div>
            <div>
              <Label>طراز التصميم</Label>
              <select
                value={designStyle}
                onChange={(e) => setDesignStyle(e.target.value)}
                className="w-full p-2 border rounded-md mt-1"
              >
                <option value="">اختر...</option>
                <option value="modern">مودرن</option>
                <option value="classic">كلاسيك</option>
                <option value="neoclassic">نيوكلاسيك</option>
                <option value="bohemian">بوهيمي</option>
                <option value="industrial">صناعي</option>
                <option value="traditional">شعبي</option>
                <option value="najdi">نجدي</option>
                <option value="hijazi">حجازي</option>
                <option value="islamic">إسلامي</option>
                <option value="custom">مخصص</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold pb-2 border-b-2 border-primary">جدول الكميات والأسعار</h2>
            <Button onClick={addItem} size="sm" variant="outline">
              <Plus className="w-4 h-4 ml-2" />
              إضافة صف
            </Button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-foreground text-background">
                <tr>
                  <th className="p-2 text-right">#</th>
                  <th className="p-2 text-right">وصف الخدمة</th>
                  <th className="p-2 text-right">الوحدة</th>
                  <th className="p-2 text-right">الكمية</th>
                  <th className="p-2 text-right">السعر الإفرادي</th>
                  <th className="p-2 text-right">الخصم %</th>
                  <th className="p-2 text-right">الإجمالي</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id} className="border-b">
                    <td className="p-2">{index + 1}</td>
                    <td className="p-2">
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(item.id, "description", e.target.value)}
                        placeholder="وصف الخدمة"
                        className="min-w-[200px]"
                      />
                    </td>
                    <td className="p-2">
                      <select
                        value={item.unit}
                        onChange={(e) => updateItem(item.id, "unit", e.target.value)}
                        className="p-2 border rounded-md w-full"
                      >
                        <option value="متر">متر</option>
                        <option value="قطعة">قطعة</option>
                        <option value="مشروع">مشروع</option>
                      </select>
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, "quantity", parseFloat(e.target.value) || 0)}
                        className="w-20"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
                        className="w-24"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        value={item.discount}
                        onChange={(e) => updateItem(item.id, "discount", parseFloat(e.target.value) || 0)}
                        className="w-16"
                      />
                    </td>
                    <td className="p-2 font-bold">
                      {calculateItemTotal(item).toLocaleString()} ر.س
                    </td>
                    <td className="p-2">
                      <Button
                        onClick={() => removeItem(item.id)}
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end">
            <div className="text-right">
              <p className="text-lg font-bold">
                الإجمالي الكلي: <span className="text-primary text-2xl">{grandTotal.toLocaleString()} ر.س</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment & Terms */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <h2 className="text-lg font-bold mb-4 pb-2 border-b-2 border-primary">الدفع والشروط</h2>
          <div className="space-y-4">
            <div>
              <Label>وسائل الدفع</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {["تمارا", "MISpay", "فيزا", "مدى", "STCpay", "تحويل بنكي", "شبكة", "نقدي"].map(method => (
                  <label key={method} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="rounded" />
                    {method}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>جدولة الدفعات</Label>
              <select className="w-full p-2 border rounded-md mt-1">
                <option value="50-50">50% - 50%</option>
                <option value="50-25-25">50% - 25% - 25%</option>
                <option value="100">100% مقدم</option>
              </select>
            </div>
            <div>
              <Label>ملاحظات إضافية</Label>
              <Textarea
                placeholder="أي شروط أو ملاحظات إضافية..."
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="border-t-4 border-primary pt-6 mt-6">
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            <p>الرياض، حي السفارات</p>
            <p>هاتف: +966 XX XXX XXXX | البريد: info@goldentouch.sa</p>
            <p>الموقع: www.goldentouch.sa</p>
          </div>
          <img src="/BARCODE.jpg" alt="QR Code" className="h-24" />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="fixed bottom-6 left-6 flex gap-3 print:hidden">
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="w-4 h-4" />
          طباعة
        </Button>
        <Button variant="outline" className="gap-2">
          <Save className="w-4 h-4" />
          حفظ
        </Button>
      </div>

      <style>{`
        @media print {
          body { margin: 0; }
          .print\\:hidden { display: none !important; }
          @page { margin: 10mm; }
        }
      `}</style>
    </div>
  );
}
