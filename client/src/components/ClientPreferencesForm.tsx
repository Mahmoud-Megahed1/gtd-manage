import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronRight, ChevronLeft, Save, FileDown } from "lucide-react";

interface FormData {
  // Section 1: Client & Project Info
  clientName: string;
  projectType: string;
  occupantType: string;
  specialNeeds: string;
  
  // Section 2: Project Layout
  propertyType: string;
  buildingStatus: string;
  totalArea: string;
  floors: string;
  
  // Section 3: Services
  services: string[];
  
  // Section 4: Design Preferences
  style: string;
  colors: string;
  
  // Section 5: Furniture
  furnitureDetails: string;
  
  // Section 6: Budget
  budgetLevel: string;
  
  // Section 7: Additional Notes
  notes: string;
}

export default function ClientPreferencesForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 7;
  
  const [formData, setFormData] = useState<FormData>({
    clientName: "",
    projectType: "",
    occupantType: "",
    specialNeeds: "",
    propertyType: "",
    buildingStatus: "",
    totalArea: "",
    floors: "",
    services: [],
    style: "",
    colors: "",
    furnitureDetails: "",
    budgetLevel: "",
    notes: ""
  });

  const updateField = (field: keyof FormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = () => {
    console.log("Form Data:", formData);
    alert("تم حفظ الاستمارة بنجاح!");
  };

  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="max-w-4xl mx-auto p-6" dir="rtl">
      {/* Header */}
      <div className="text-center mb-8">
        <img src="/LOGO.png" alt="Golden Touch Design" className="h-24 mx-auto mb-4" />
        <h1 className="text-3xl font-bold">
          <span className="text-foreground">GOLDEN </span>
          <span className="text-primary">TOUCH</span>
          <span className="text-foreground"> DESIGN</span>
        </h1>
        <p className="text-muted-foreground mt-2">استمارة تفضيلات العملاء</p>
        <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString('ar-SA')}</p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <Progress value={progress} className="h-2" />
        <p className="text-center text-sm text-muted-foreground mt-2">
          الخطوة {currentStep} من {totalSteps}
        </p>
      </div>

      {/* Form Content */}
      <Card className="border-t-4 border-t-primary">
        <CardHeader className="bg-accent/50">
          <CardTitle>
            {currentStep === 1 && "بيانات العميل والمشروع"}
            {currentStep === 2 && "مخطط المشروع"}
            {currentStep === 3 && "الخدمات المطلوبة"}
            {currentStep === 4 && "تفضيلات التصميم"}
            {currentStep === 5 && "تفضيلات الأثاث"}
            {currentStep === 6 && "الميزانية"}
            {currentStep === 7 && "ملاحظات إضافية"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {/* Step 1: Client & Project Info */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="clientName">الاسم الكامل *</Label>
                <Input
                  id="clientName"
                  value={formData.clientName}
                  onChange={(e) => updateField("clientName", e.target.value)}
                  placeholder="أدخل اسم العميل"
                />
              </div>
              <div>
                <Label>طبيعة المشروع *</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                  {["تصميم داخلي", "واجهة", "لاندسكيب", "تنفيذ", "مخصص"].map(type => (
                    <button
                      key={type}
                      onClick={() => updateField("projectType", type)}
                      className={`p-3 border-2 rounded-lg transition-all ${
                        formData.projectType === type
                          ? "border-primary bg-primary/10 shadow-md"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>طبيعة السكان</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {["زوجين", "عائلة مع أطفال", "أسرة كبيرة", "مخصص"].map(type => (
                    <button
                      key={type}
                      onClick={() => updateField("occupantType", type)}
                      className={`p-3 border-2 rounded-lg transition-all ${
                        formData.occupantType === type
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="specialNeeds">عناصر خاصة</Label>
                <Textarea
                  id="specialNeeds"
                  value={formData.specialNeeds}
                  onChange={(e) => updateField("specialNeeds", e.target.value)}
                  placeholder="مثال: كبار سن، ذوي همم، حيوانات أليفة..."
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 2: Project Layout */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <Label>نوع العقار *</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                  {["فيلا", "شقة", "قصر", "مخصص"].map(type => (
                    <button
                      key={type}
                      onClick={() => updateField("propertyType", type)}
                      className={`p-3 border-2 rounded-lg transition-all ${
                        formData.propertyType === type
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>حالة المبنى</Label>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {["تحت الإنشاء", "ترميم", "جاهز"].map(status => (
                    <button
                      key={status}
                      onClick={() => updateField("buildingStatus", status)}
                      className={`p-3 border-2 rounded-lg transition-all ${
                        formData.buildingStatus === status
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="totalArea">المساحة الكلية (م²)</Label>
                  <Input
                    id="totalArea"
                    type="number"
                    value={formData.totalArea}
                    onChange={(e) => updateField("totalArea", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="floors">عدد الأدوار</Label>
                  <Input
                    id="floors"
                    type="number"
                    value={formData.floors}
                    onChange={(e) => updateField("floors", e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Services */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <Label>الخدمات المطلوبة (يمكن اختيار أكثر من خدمة)</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  "الهيكل المعماري",
                  "التشطيب",
                  "الديكور",
                  "الأثاث",
                  "البصريات (VR/فيديو)",
                  "الإضاءة",
                  "اللاندسكيب",
                  "التصميم الداخلي"
                ].map(service => {
                  const isSelected = formData.services.includes(service);
                  return (
                    <button
                      key={service}
                      onClick={() => {
                        const newServices = isSelected
                          ? formData.services.filter(s => s !== service)
                          : [...formData.services, service];
                        updateField("services", newServices);
                      }}
                      className={`p-3 border-2 rounded-lg transition-all text-sm ${
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {service}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 4: Design Preferences */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <Label>الأسلوب المفضل</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                  {["مودرن", "كلاسيك", "نيوكلاسيك", "بوهيمي", "صناعي", "مخصص"].map(style => (
                    <button
                      key={style}
                      onClick={() => updateField("style", style)}
                      className={`p-3 border-2 rounded-lg transition-all ${
                        formData.style === style
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>الألوان المفضلة</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                  {["محايدة", "ترابية", "جريئة", "مخصص"].map(color => (
                    <button
                      key={color}
                      onClick={() => updateField("colors", color)}
                      className={`p-3 border-2 rounded-lg transition-all ${
                        formData.colors === color
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Furniture */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="furnitureDetails">تفاصيل الأثاث المطلوب</Label>
                <Textarea
                  id="furnitureDetails"
                  value={formData.furnitureDetails}
                  onChange={(e) => updateField("furnitureDetails", e.target.value)}
                  placeholder="اذكر تفاصيل الأثاث المطلوب: الكنب، السجاد، الستائر، طاولات الطعام، الخزائن، الأسرة، المطبخ..."
                  rows={6}
                />
              </div>
            </div>
          )}

          {/* Step 6: Budget */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <Label>مستوى الميزانية</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { level: "بسيط", label: "Minimal" },
                  { level: "متوسط", label: "Smart" },
                  { level: "عالي", label: "Premium" },
                  { level: "فاخر", label: "Luxury" }
                ].map(({ level, label }) => (
                  <button
                    key={level}
                    onClick={() => updateField("budgetLevel", level)}
                    className={`p-6 border-2 rounded-lg transition-all ${
                      formData.budgetLevel === level
                        ? "border-primary bg-primary/10 shadow-lg"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="text-lg font-bold">{level}</div>
                    <div className="text-sm text-muted-foreground">{label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 7: Notes */}
          {currentStep === 7 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="notes">ملاحظات إضافية</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  placeholder="أي ملاحظات أو متطلبات إضافية..."
                  rows={6}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="fixed bottom-6 left-6 flex gap-3">
        {currentStep > 1 && (
          <Button variant="outline" onClick={prevStep} className="gap-2">
            <ChevronRight className="w-4 h-4" />
            السابق
          </Button>
        )}
        {currentStep < totalSteps && (
          <Button onClick={nextStep} className="gap-2">
            التالي
            <ChevronLeft className="w-4 h-4" />
          </Button>
        )}
        {currentStep === totalSteps && (
          <>
            <Button onClick={handleSubmit} className="gap-2">
              <Save className="w-4 h-4" />
              حفظ
            </Button>
            <Button variant="outline" className="gap-2">
              <FileDown className="w-4 h-4" />
              تصدير PDF
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
