import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Save, FileText, Info } from "lucide-react";
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

interface ClientPreferencesFormData {
  // القسم 1: بيانات العميل والمشروع
  fullName: string;
  date: string;
  projectNature: string[];
  residentsNature: string;
  specialElements: string[];
  generalStylePreference: string;
  distributionPreference: string;
  detailsPreference: string;
  unwantedElements: string;
  pointsToConsider: string;

  // القسم 2: مخطط المشروع
  projectType: string;
  buildingStatus: string;
  totalArea: number;
  floors: string[];
  hasArchitecturalPlans: boolean;
  hasRedistribution: boolean;

  // القسم 3: الخدمات المطلوبة
  structuralServices: string[];
  finishingServices: string[];
  decorServices: string[];
  furnitureServices: string[];
  visualServices: string[];

  // القسم 4: تفضيلات التصميم
  designStyle: string;
  technicalDrawings: string;
  preferredColors: string[];
  unwantedColors: string;

  // القسم 5: تفضيلات الأثاث
  sofaType: string;
  carpetType: string;
  curtainType: string;
  curtainShape: string;
  diningTableChairs: number;
  diningTableShape: string;
  diningTableMaterial: string;

  // القسم 6: الميزانية
  budgetLevel: string;

  // القسم 7: ملاحظات
  engineerNotes: string;
  clientNotes: string;
}

interface SimplifiedClientPreferencesFormProps {
  formId?: number;
  onSave?: () => void;
}

export default function SimplifiedClientPreferencesForm({
  formId,
  onSave,
}: SimplifiedClientPreferencesFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showDevInfo, setShowDevInfo] = useState(false);

  const [formData, setFormData] = useState<ClientPreferencesFormData>({
    fullName: "",
    date: new Date().toISOString().split("T")[0],
    projectNature: [],
    residentsNature: "",
    specialElements: [],
    generalStylePreference: "",
    distributionPreference: "",
    detailsPreference: "",
    unwantedElements: "",
    pointsToConsider: "",
    projectType: "",
    buildingStatus: "",
    totalArea: 0,
    floors: [],
    hasArchitecturalPlans: false,
    hasRedistribution: false,
    structuralServices: [],
    finishingServices: [],
    decorServices: [],
    furnitureServices: [],
    visualServices: [],
    designStyle: "",
    technicalDrawings: "",
    preferredColors: [],
    unwantedColors: "",
    sofaType: "",
    carpetType: "",
    curtainType: "",
    curtainShape: "",
    diningTableChairs: 4,
    diningTableShape: "",
    diningTableMaterial: "",
    budgetLevel: "",
    engineerNotes: "",
    clientNotes: "",
  });

  const saveFormMutation = trpc.forms.create.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ الاستمارة بنجاح");
      onSave?.();
    },
    onError: (error) => {
      toast.error(`فشل حفظ الاستمارة: ${error.message}`);
    },
  });

  const steps = [
    "بيانات العميل والمشروع",
    "مخطط المشروع",
    "الخدمات المطلوبة",
    "تفضيلات التصميم",
    "تفضيلات الأثاث",
    "الميزانية",
    "ملاحظات ومرفقات",
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = () => {
    saveFormMutation.mutate({
      clientId: 1, // TODO: ربط بعميل حقيقي
      formType: "preferences",
      formData: JSON.stringify(formData),
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const toggleArrayItem = (array: string[], item: string) => {
    if (array.includes(item)) {
      return array.filter((i) => i !== item);
    } else {
      return [...array, item];
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6 bg-white" dir="rtl">
      {/* Header */}
      <div className="border-b pb-6 print:border-gray-300">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <img src="/LOGO.png" alt="Golden Touch Design" className="h-16 sm:h-20 mb-2" />
            <h1 className="text-xl sm:text-2xl font-bold text-amber-600">استمارة طلبات وتفضيلات عميل</h1>
            <p className="text-sm text-gray-600">(تصميم سكني)</p>
          </div>
          <div className="print-hide">
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
                    هذا النموذج مبسط حالياً. للتطوير الكامل، راجع الملف: desista-1.txt
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 text-sm">
                  <div>
                    <h3 className="font-semibold mb-2">الميزات المطلوبة للنسخة الكاملة:</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      <li>8 أقسام رئيسية مع تنقل متعدد الخطوات</li>
                      <li>أقسام شرطية تظهر حسب طبيعة المشروع (داخلي/واجهة/لاندسكيب)</li>
                      <li>خيارات "مخصص" مع حقول نصية وإرفاق صور</li>
                      <li>جدول ديناميكي للتفاصيل المخصصة</li>
                      <li>تفضيلات تفصيلية للجدران والأرضيات والسقف</li>
                      <li>تفضيلات الإضاءة والكهرباء</li>
                      <li>تفصيلات الواجهة والاندسكيب</li>
                      <li>حفظ HTML مع البيانات المدخلة</li>
                      <li>طباعة نظيفة مع إخفاء الأقسام الفارغة</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">المنطق الشرطي المطلوب:</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      <li>إظهار قسم "تفاصيل الواجهة" عند اختيار "تصميم واجهة"</li>
                      <li>إظهار قسم "تفاصيل اللاندسكيب" عند اختيار "تصميم لاندسكيب"</li>
                      <li>إظهار قسم "العناصر الداخلية" عند اختيار "تصميم داخلي"</li>
                      <li>تخطي قسم الأثاث إذا لم يكن "تصميم داخلي" محدداً</li>
                      <li>حقول مخصصة تظهر عند اختيار "مخصص"</li>
                    </ul>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div className="mt-4">
          <Label>التاريخ</Label>
          <Input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="max-w-xs"
          />
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="print-hide">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">
            الخطوة {currentStep + 1} من {steps.length}
          </span>
          <span className="text-sm text-muted-foreground">{steps[currentStep]}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      <Card className="p-6">
        {currentStep === 0 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">القسم 1: بيانات العميل والمشروع</h2>

            <div>
              <Label>الاسم الكامل</Label>
              <Input
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>

            <div>
              <Label>طبيعة المشروع</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {["تصميم داخلي", "تصميم واجهة", "تصميم لاندسكيب", "تنفيذ مخصص"].map((item) => (
                  <div key={item} className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox
                      id={`project-${item}`}
                      checked={formData.projectNature.includes(item)}
                      onCheckedChange={() =>
                        setFormData({
                          ...formData,
                          projectNature: toggleArrayItem(formData.projectNature, item),
                        })
                      }
                    />
                    <Label htmlFor={`project-${item}`} className="cursor-pointer">
                      {item}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>طبيعة السكان</Label>
              <RadioGroup
                value={formData.residentsNature}
                onValueChange={(value) => setFormData({ ...formData, residentsNature: value })}
              >
                {["زوجين", "زوجين وأطفال", "أسرة متوسطة", "أسرة كبيرة"].map((item) => (
                  <div key={item} className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value={item} id={`residents-${item}`} />
                    <Label htmlFor={`residents-${item}`} className="cursor-pointer">
                      {item}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <Label>عناصر خاصة</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {["أطفال", "كبار سن", "كرسي متحرك", "احتياجات خاصة", "حيوانات اليفة"].map(
                  (item) => (
                    <div key={item} className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox
                        id={`special-${item}`}
                        checked={formData.specialElements.includes(item)}
                        onCheckedChange={() =>
                          setFormData({
                            ...formData,
                            specialElements: toggleArrayItem(formData.specialElements, item),
                          })
                        }
                      />
                      <Label htmlFor={`special-${item}`} className="cursor-pointer">
                        {item}
                      </Label>
                    </div>
                  )
                )}
              </div>
            </div>

            <div>
              <Label>تفضيل العميل بالنمط العام</Label>
              <RadioGroup
                value={formData.generalStylePreference}
                onValueChange={(value) =>
                  setFormData({ ...formData, generalStylePreference: value })
                }
              >
                {["الهدوء", "الحيوية"].map((item) => (
                  <div key={item} className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value={item} id={`style-${item}`} />
                    <Label htmlFor={`style-${item}`} className="cursor-pointer">
                      {item}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <Label>تفضيل العميل بالتوزيع</Label>
              <RadioGroup
                value={formData.distributionPreference}
                onValueChange={(value) =>
                  setFormData({ ...formData, distributionPreference: value })
                }
              >
                {["الاحتواء", "المساحات المفتوحة"].map((item) => (
                  <div key={item} className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value={item} id={`dist-${item}`} />
                    <Label htmlFor={`dist-${item}`} className="cursor-pointer">
                      {item}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <Label>تفضيل العميل بالتفاصيل</Label>
              <RadioGroup
                value={formData.detailsPreference}
                onValueChange={(value) => setFormData({ ...formData, detailsPreference: value })}
              >
                {["الوظيفة", "الفخامة", "متوازن"].map((item) => (
                  <div key={item} className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value={item} id={`details-${item}`} />
                    <Label htmlFor={`details-${item}`} className="cursor-pointer">
                      {item}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <Label>العناصر التي لا يرغب العميل بوجودها نهائياً في التصميم</Label>
              <Textarea
                value={formData.unwantedElements}
                onChange={(e) => setFormData({ ...formData, unwantedElements: e.target.value })}
                placeholder="يرجى ذكر العناصر التي لا ترغب بها..."
              />
            </div>

            <div>
              <Label>نقاط يجب مراعاتها أو حلها</Label>
              <Textarea
                value={formData.pointsToConsider}
                onChange={(e) => setFormData({ ...formData, pointsToConsider: e.target.value })}
                placeholder="يرجى ذكر النقاط التي يجب مراعاتها..."
              />
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">القسم 2: مخطط المشروع وتفاصيله</h2>

            <div>
              <Label>نوع المشروع</Label>
              <Select
                value={formData.projectType}
                onValueChange={(value) => setFormData({ ...formData, projectType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="room">غرفة</SelectItem>
                  <SelectItem value="multiple-rooms">عدة غرف</SelectItem>
                  <SelectItem value="studio">استديو</SelectItem>
                  <SelectItem value="apartment">شقة</SelectItem>
                  <SelectItem value="villa">فيلا</SelectItem>
                  <SelectItem value="chalet">شاليه</SelectItem>
                  <SelectItem value="farm">مزرعة</SelectItem>
                  <SelectItem value="land">أرض</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>حالة المبنى</Label>
              <RadioGroup
                value={formData.buildingStatus}
                onValueChange={(value) => setFormData({ ...formData, buildingStatus: value })}
              >
                {["ترميم", "جاهز", "تحت الإنشاء", "مخطط"].map((item) => (
                  <div key={item} className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value={item} id={`building-${item}`} />
                    <Label htmlFor={`building-${item}`} className="cursor-pointer">
                      {item}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <Label>المساحة الكلية (م²)</Label>
              <Input
                type="number"
                value={formData.totalArea}
                onChange={(e) =>
                  setFormData({ ...formData, totalArea: parseFloat(e.target.value) || 0 })
                }
              />
            </div>

            <div>
              <Label>عدد الأدوار</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {["ارضي", "اول", "ثاني", "سطح"].map((item) => (
                  <div key={item} className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox
                      id={`floor-${item}`}
                      checked={formData.floors.includes(item)}
                      onCheckedChange={() =>
                        setFormData({
                          ...formData,
                          floors: toggleArrayItem(formData.floors, item),
                        })
                      }
                    />
                    <Label htmlFor={`floor-${item}`} className="cursor-pointer">
                      {item}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>هل توجد مخططات معمارية؟</Label>
              <RadioGroup
                value={formData.hasArchitecturalPlans ? "yes" : "no"}
                onValueChange={(value) =>
                  setFormData({ ...formData, hasArchitecturalPlans: value === "yes" })
                }
              >
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="yes" id="plans-yes" />
                  <Label htmlFor="plans-yes" className="cursor-pointer">
                    نعم
                  </Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="no" id="plans-no" />
                  <Label htmlFor="plans-no" className="cursor-pointer">
                    لا
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label>هل يوجد إعادة توزيع أو تعديل معماري او إنشائي؟</Label>
              <RadioGroup
                value={formData.hasRedistribution ? "yes" : "no"}
                onValueChange={(value) =>
                  setFormData({ ...formData, hasRedistribution: value === "yes" })
                }
              >
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="yes" id="redist-yes" />
                  <Label htmlFor="redist-yes" className="cursor-pointer">
                    نعم
                  </Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="no" id="redist-no" />
                  <Label htmlFor="redist-no" className="cursor-pointer">
                    لا
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">القسم 3: الخدمات المطلوبة للتصميم او التنفيذ</h2>

            <div>
              <Label>هيكل معماري</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {["الجدران", "اسقف", "ملاحق"].map((item) => (
                  <div key={item} className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox
                      id={`struct-${item}`}
                      checked={formData.structuralServices.includes(item)}
                      onCheckedChange={() =>
                        setFormData({
                          ...formData,
                          structuralServices: toggleArrayItem(formData.structuralServices, item),
                        })
                      }
                    />
                    <Label htmlFor={`struct-${item}`} className="cursor-pointer">
                      {item}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>تشطيب</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {[
                  "البلاط",
                  "اللياسة",
                  "المعجون والدهان",
                  "السباكة",
                  "الكهرباء",
                  "النوافذ",
                  "الأبواب",
                  "المنيوم",
                  "حديد",
                ].map((item) => (
                  <div key={item} className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox
                      id={`finish-${item}`}
                      checked={formData.finishingServices.includes(item)}
                      onCheckedChange={() =>
                        setFormData({
                          ...formData,
                          finishingServices: toggleArrayItem(formData.finishingServices, item),
                        })
                      }
                    />
                    <Label htmlFor={`finish-${item}`} className="cursor-pointer">
                      {item}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>ديكور</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {[
                  "تكسيات جدران مواد بديلة",
                  "تكسيات جدران مواد طبيعية",
                  "تكسيات جدران جبس زخرفي",
                  "تكسيات اسقف جبس زخرفي",
                  "تكسيات ارضيات باركيه مواد بدائل",
                  "تكسيات ارضيات باركيه خشب",
                ].map((item) => (
                  <div key={item} className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox
                      id={`decor-${item}`}
                      checked={formData.decorServices.includes(item)}
                      onCheckedChange={() =>
                        setFormData({
                          ...formData,
                          decorServices: toggleArrayItem(formData.decorServices, item),
                        })
                      }
                    />
                    <Label htmlFor={`decor-${item}`} className="cursor-pointer">
                      {item}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>اثاث</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {[
                  "غرف النوم",
                  "الخزائن",
                  "الكنب",
                  "الستائر",
                  "السجاد",
                  "الطاولات",
                  "النباتات",
                  "المعلقات الجدارية",
                ].map((item) => (
                  <div key={item} className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox
                      id={`furniture-${item}`}
                      checked={formData.furnitureServices.includes(item)}
                      onCheckedChange={() =>
                        setFormData({
                          ...formData,
                          furnitureServices: toggleArrayItem(formData.furnitureServices, item),
                        })
                      }
                    />
                    <Label htmlFor={`furniture-${item}`} className="cursor-pointer">
                      {item}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>البصريات</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {[
                  "صور لكامل التصميم",
                  "فيديو لكامل التصميم",
                  "VR الواقع الافتراضي لكامل التصميم",
                ].map((item) => (
                  <div key={item} className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox
                      id={`visual-${item}`}
                      checked={formData.visualServices.includes(item)}
                      onCheckedChange={() =>
                        setFormData({
                          ...formData,
                          visualServices: toggleArrayItem(formData.visualServices, item),
                        })
                      }
                    />
                    <Label htmlFor={`visual-${item}`} className="cursor-pointer">
                      {item}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">القسم 4: تفضيلات التصميم</h2>

            <div>
              <Label>نوع وأسلوب التصميم</Label>
              <Select
                value={formData.designStyle}
                onValueChange={(value) => setFormData({ ...formData, designStyle: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="modern">مودرن</SelectItem>
                  <SelectItem value="modern-luxury">مودرن فاخر</SelectItem>
                  <SelectItem value="neoclassic">نيوكلاسيك</SelectItem>
                  <SelectItem value="classic">كلاسيك</SelectItem>
                  <SelectItem value="minimal">مينيمل</SelectItem>
                  <SelectItem value="bohemian">بوهيمي</SelectItem>
                  <SelectItem value="industrial">اندستريال (صناعي)</SelectItem>
                  <SelectItem value="rustic">ريفي</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>الرسوم التنفيذية</Label>
              <RadioGroup
                value={formData.technicalDrawings}
                onValueChange={(value) => setFormData({ ...formData, technicalDrawings: value })}
              >
                {["مبسطة", "دقيقة", "لايوجد"].map((item) => (
                  <div key={item} className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value={item} id={`tech-${item}`} />
                    <Label htmlFor={`tech-${item}`} className="cursor-pointer">
                      {item}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <Label>الألوان المفضلة</Label>
              <div className="space-y-3 mt-2">
                {[
                  "ألوان محايدة: بيج – أوف وايت – رمادي – كريم – خشبي طبيعي",
                  "ألوان ترابية: جملي – تراكوتا – بني – رملي – زيتوني",
                  "ألوان هادئة: أزرق رمادي – أخضر باودر – سماوي باهت – لافندر خفيف",
                  "ألوان جريئة: أسود – كحلي – أخضر زمردي – خمري – ذهبي",
                ].map((item) => (
                  <div key={item} className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox
                      id={`color-${item}`}
                      checked={formData.preferredColors.includes(item)}
                      onCheckedChange={() =>
                        setFormData({
                          ...formData,
                          preferredColors: toggleArrayItem(formData.preferredColors, item),
                        })
                      }
                    />
                    <Label htmlFor={`color-${item}`} className="cursor-pointer text-sm">
                      {item}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>ألوان لا يرغب بها العميل</Label>
              <Textarea
                value={formData.unwantedColors}
                onChange={(e) => setFormData({ ...formData, unwantedColors: e.target.value })}
                placeholder="يرجى ذكر الألوان التي لا ترغب بها..."
              />
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">القسم 5: تفضيلات الأثاث</h2>

            <div>
              <Label>الكنب</Label>
              <RadioGroup
                value={formData.sofaType}
                onValueChange={(value) => setFormData({ ...formData, sofaType: value })}
              >
                {["منفصل", "متصل", "شكل L", "شكل U", "شكل دائري"].map((item) => (
                  <div key={item} className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value={item} id={`sofa-${item}`} />
                    <Label htmlFor={`sofa-${item}`} className="cursor-pointer">
                      {item}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <Label>السجاد</Label>
              <RadioGroup
                value={formData.carpetType}
                onValueChange={(value) => setFormData({ ...formData, carpetType: value })}
              >
                {["موكيت كامل الأرضية", "سجاد كبير", "سجاد وسط", "سجاد صغير", "بدون سجاد"].map(
                  (item) => (
                    <div key={item} className="flex items-center space-x-2 space-x-reverse">
                      <RadioGroupItem value={item} id={`carpet-${item}`} />
                      <Label htmlFor={`carpet-${item}`} className="cursor-pointer">
                        {item}
                      </Label>
                    </div>
                  )
                )}
              </RadioGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>الستائر - النوع</Label>
                <Select
                  value={formData.curtainType}
                  onValueChange={(value) => setFormData({ ...formData, curtainType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fabric">قماش</SelectItem>
                    <SelectItem value="blackout">بلاك آوت</SelectItem>
                    <SelectItem value="transparent">شفافة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>الستائر - الشكل</Label>
                <Select
                  value={formData.curtainShape}
                  onValueChange={(value) => setFormData({ ...formData, curtainShape: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wavy">ويفي</SelectItem>
                    <SelectItem value="american">امريكي</SelectItem>
                    <SelectItem value="roll">رول</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">طاولة الطعام</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>عدد الكراسي</Label>
                  <Select
                    value={formData.diningTableChairs.toString()}
                    onValueChange={(value) =>
                      setFormData({ ...formData, diningTableChairs: parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2, 4, 6, 8, 10, 12].map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>الشكل</Label>
                  <Select
                    value={formData.diningTableShape}
                    onValueChange={(value) => setFormData({ ...formData, diningTableShape: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="square">مربع</SelectItem>
                      <SelectItem value="rectangle">مستطيل</SelectItem>
                      <SelectItem value="circle">دائري</SelectItem>
                      <SelectItem value="oval">بيضاوي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>الخامة</Label>
                  <Select
                    value={formData.diningTableMaterial}
                    onValueChange={(value) =>
                      setFormData({ ...formData, diningTableMaterial: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="engineered-wood">خشب صناعي</SelectItem>
                      <SelectItem value="engineered-marble">رخام صناعي</SelectItem>
                      <SelectItem value="natural-wood">خشب طبيعي</SelectItem>
                      <SelectItem value="natural-marble">رخام طبيعي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 5 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">القسم 6: الميزانية ومستوى التصميم</h2>

            <RadioGroup
              value={formData.budgetLevel}
              onValueChange={(value) => setFormData({ ...formData, budgetLevel: value })}
            >
              <Card
                className={`p-4 cursor-pointer transition-all ${formData.budgetLevel === "minimal"
                    ? "border-primary border-2 bg-primary/5"
                    : "hover:border-gray-400"
                  }`}
                onClick={() => setFormData({ ...formData, budgetLevel: "minimal" })}
              >
                <div className="flex items-start space-x-3 space-x-reverse">
                  <RadioGroupItem value="minimal" id="budget-minimal" />
                  <div className="flex-1">
                    <Label htmlFor="budget-minimal" className="cursor-pointer font-semibold">
                      المستوى البسيط (Minimal) – الأناقة الوظيفية
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      الحل الأمثل لمن يبحث عن مساحات عملية ومريحة بأقل تكلفة. خامات أساسية، إضاءة
                      وظيفية، أثاث بسيط.
                    </p>
                  </div>
                </div>
              </Card>

              <Card
                className={`p-4 cursor-pointer transition-all ${formData.budgetLevel === "smart"
                    ? "border-primary border-2 bg-primary/5"
                    : "hover:border-gray-400"
                  }`}
                onClick={() => setFormData({ ...formData, budgetLevel: "smart" })}
              >
                <div className="flex items-start space-x-3 space-x-reverse">
                  <RadioGroupItem value="smart" id="budget-smart" />
                  <div className="flex-1">
                    <Label htmlFor="budget-smart" className="cursor-pointer font-semibold">
                      المستوى المتوسط (Smart) – اللمسات الذكية
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      مظهر عصري وراقٍ. دمج (2–3) عناصر ديكورية، إضاءة جذابة، أثاث راقٍ وعملي.
                    </p>
                  </div>
                </div>
              </Card>

              <Card
                className={`p-4 cursor-pointer transition-all ${formData.budgetLevel === "premium"
                    ? "border-primary border-2 bg-primary/5"
                    : "hover:border-gray-400"
                  }`}
                onClick={() => setFormData({ ...formData, budgetLevel: "premium" })}
              >
                <div className="flex items-start space-x-3 space-x-reverse">
                  <RadioGroupItem value="premium" id="budget-premium" />
                  <div className="flex-1">
                    <Label htmlFor="budget-premium" className="cursor-pointer font-semibold">
                      المستوى العالي (Premium) – الرقي والتميز
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      هوية خاصة. دمج (3–5) عناصر ديكورية، تنوع في الخامات (بديل رخام/شيبورد)، نظام
                      إضاءة متعدد، أثاث مخصص.
                    </p>
                  </div>
                </div>
              </Card>

              <Card
                className={`p-4 cursor-pointer transition-all ${formData.budgetLevel === "luxury"
                    ? "border-primary border-2 bg-primary/5"
                    : "hover:border-gray-400"
                  }`}
                onClick={() => setFormData({ ...formData, budgetLevel: "luxury" })}
              >
                <div className="flex items-start space-x-3 space-x-reverse">
                  <RadioGroupItem value="luxury" id="budget-luxury" />
                  <div className="flex-1">
                    <Label htmlFor="budget-luxury" className="cursor-pointer font-semibold">
                      المستوى الفاخر (Luxury) – الفخامة المطلقة
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      تجربة استثنائية. خامات أصيلة (رخام طبيعي/خشب صلب)، تفاصيل حصرية، إضاءة
                      سينمائية، أثاث فاخر.
                    </p>
                  </div>
                </div>
              </Card>
            </RadioGroup>
          </div>
        )}

        {currentStep === 6 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">القسم 7: ملاحظات ومرفقات إضافية</h2>

            <div>
              <Label>ملاحظات المهندس</Label>
              <Textarea
                value={formData.engineerNotes}
                onChange={(e) => setFormData({ ...formData, engineerNotes: e.target.value })}
                placeholder="ملاحظات المهندس..."
                className="min-h-[120px]"
              />
            </div>

            <div>
              <Label>ملاحظات العميل</Label>
              <Textarea
                value={formData.clientNotes}
                onChange={(e) => setFormData({ ...formData, clientNotes: e.target.value })}
                placeholder="ملاحظات العميل..."
                className="min-h-[120px]"
              />
            </div>

            <div className="bg-amber-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">المخططات والصور</h3>
              <p className="text-sm text-muted-foreground mb-3">
                في النسخة الكاملة، ستتمكن من إرفاق:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>مخططات الموقع</li>
                <li>صور للموقع الحالي</li>
                <li>صور لعناصر مخصصة</li>
                <li>صور تصاميم سابقة لتطبيقها بالمشروع الحالي</li>
                <li>صور تصاميم تلهم العميل</li>
              </ul>
            </div>
          </div>
        )}
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between print-hide">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 0}
          className="gap-2"
        >
          <ChevronRight className="w-4 h-4" />
          السابق
        </Button>

        <div className="flex gap-2">
          {currentStep === steps.length - 1 ? (
            <>
              <Button onClick={handleSave} disabled={saveFormMutation.isPending} className="gap-2">
                <Save className="w-4 h-4" />
                حفظ
              </Button>
              <Button onClick={handlePrint} variant="outline" className="gap-2">
                <FileText className="w-4 h-4" />
                طباعة / PDF
              </Button>
            </>
          ) : (
            <Button onClick={handleNext} className="gap-2">
              التالي
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
        </div>
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
