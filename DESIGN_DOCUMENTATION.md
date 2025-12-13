# 📐 دليل التصميم الشامل - Golden Touch Design

## 🎨 نظام الألوان (Color System)

### اللون الأساسي (Primary Color) - الذهبي
النظام يستخدم اللون الذهبي كلون أساسي يعكس هوية "اللمسة الذهبية":

```css
/* Light Mode */
--primary: oklch(0.75 0.12 75);              /* ذهبي فاتح */
--primary-foreground: oklch(0.15 0.02 75);   /* نص داكن على الذهبي */

/* Dark Mode */
--primary: oklch(0.75 0.12 75);              /* نفس الذهبي */
--primary-foreground: oklch(0.15 0.02 75);   /* نفس النص الداكن */
```

**الاستخدام:**
- الأزرار الرئيسية (Primary Buttons)
- العناصر التفاعلية المهمة
- الأيقونات البارزة
- Hover states للعناصر الرئيسية

---

### الخلفيات والبطاقات (Backgrounds & Cards)

#### الوضع الفاتح (Light Mode)
```css
--background: oklch(1 0 0);                  /* أبيض نقي #FFFFFF */
--foreground: oklch(0.235 0.015 65);         /* نص رمادي داكن */
--card: oklch(1 0 0);                        /* بطاقات بيضاء */
--card-foreground: oklch(0.235 0.015 65);    /* نص البطاقات */
```

#### الوضع الداكن (Dark Mode)
```css
--background: oklch(0.141 0.005 285.823);    /* خلفية داكنة جداً */
--foreground: oklch(0.85 0.005 65);          /* نص فاتح */
--card: oklch(0.21 0.006 285.885);           /* بطاقات رمادية داكنة */
--card-foreground: oklch(0.85 0.005 65);     /* نص البطاقات فاتح */
```

---

### الألوان الثانوية والمكتومة (Secondary & Muted)

```css
/* Light Mode */
--secondary: oklch(0.98 0.001 286.375);      /* رمادي فاتح جداً */
--secondary-foreground: oklch(0.4 0.015 65); /* نص رمادي متوسط */
--muted: oklch(0.967 0.001 286.375);         /* رمادي فاتح */
--muted-foreground: oklch(0.552 0.016 285.938); /* نص رمادي */

/* Dark Mode */
--secondary: oklch(0.24 0.006 286.033);      /* رمادي داكن */
--secondary-foreground: oklch(0.7 0.005 65); /* نص فاتح */
--muted: oklch(0.274 0.006 286.033);         /* رمادي داكن */
--muted-foreground: oklch(0.705 0.015 286.067); /* نص رمادي فاتح */
```

**الاستخدام:**
- `secondary`: أزرار ثانوية، خلفيات بديلة
- `muted`: نصوص توضيحية، عناصر غير نشطة، placeholders

---

### لون التأكيد (Accent Color)

```css
/* Light Mode */
--accent: oklch(0.967 0.001 286.375);        /* رمادي فاتح */
--accent-foreground: oklch(0.141 0.005 285.823); /* نص داكن */

/* Dark Mode */
--accent: oklch(0.274 0.006 286.033);        /* رمادي داكن */
--accent-foreground: oklch(0.985 0 0);       /* نص أبيض */
```

**الاستخدام:**
- تمييز العناصر المحددة
- Hover states
- العناصر التفاعلية الثانوية

---

### لون الخطر/الحذف (Destructive Color)

```css
/* Light Mode */
--destructive: oklch(0.577 0.245 27.325);    /* أحمر */
--destructive-foreground: oklch(0.985 0 0);  /* أبيض */

/* Dark Mode */
--destructive: oklch(0.704 0.191 22.216);    /* أحمر فاتح */
--destructive-foreground: oklch(0.985 0 0);  /* أبيض */
```

**الاستخدام:**
- أزرار الحذف
- رسائل الخطأ
- تحذيرات مهمة

---

### الحدود والإدخالات (Borders & Inputs)

```css
/* Light Mode */
--border: oklch(0.92 0.004 286.32);          /* رمادي فاتح */
--input: oklch(0.92 0.004 286.32);           /* نفس لون الحدود */
--ring: oklch(0.623 0.214 259.815);          /* أزرق للتركيز */

/* Dark Mode */
--border: oklch(1 0 0 / 10%);                /* أبيض شفاف 10% */
--input: oklch(1 0 0 / 15%);                 /* أبيض شفاف 15% */
--ring: oklch(0.488 0.243 264.376);          /* أزرق داكن للتركيز */
```

---

### ألوان الرسوم البيانية (Chart Colors)

```css
--chart-1: oklch(0.8 0.1 75);    /* ذهبي فاتح جداً */
--chart-2: oklch(0.7 0.12 75);   /* ذهبي فاتح */
--chart-3: oklch(0.65 0.14 75);  /* ذهبي متوسط */
--chart-4: oklch(0.6 0.12 75);   /* ذهبي داكن */
--chart-5: oklch(0.55 0.1 75);   /* ذهبي داكن جداً */
```

**الاستخدام:**
- الرسوم البيانية في Dashboard
- المخططات الدائرية
- مخططات الأعمدة

---

### ألوان الشريط الجانبي (Sidebar Colors)

```css
/* Light Mode */
--sidebar: oklch(0.985 0 0);                 /* أبيض مائل للرمادي */
--sidebar-foreground: oklch(0.235 0.015 65); /* نص داكن */
--sidebar-primary: oklch(0.75 0.12 75);      /* ذهبي */
--sidebar-primary-foreground: oklch(0.98 0 0); /* أبيض */
--sidebar-accent: oklch(0.967 0.001 286.375); /* رمادي فاتح */
--sidebar-accent-foreground: oklch(0.141 0.005 285.823); /* داكن */
--sidebar-border: oklch(0.92 0.004 286.32);  /* حدود رمادية */
--sidebar-ring: oklch(0.623 0.214 259.815);  /* أزرق للتركيز */

/* Dark Mode */
--sidebar: oklch(0.21 0.006 285.885);        /* رمادي داكن */
--sidebar-foreground: oklch(0.85 0.005 65);  /* نص فاتح */
--sidebar-primary: oklch(0.7 0.12 75);       /* ذهبي داكن */
--sidebar-primary-foreground: oklch(0.98 0 0); /* أبيض */
--sidebar-accent: oklch(0.274 0.006 286.033); /* رمادي */
--sidebar-accent-foreground: oklch(0.985 0 0); /* أبيض */
--sidebar-border: oklch(1 0 0 / 10%);        /* أبيض شفاف */
--sidebar-ring: oklch(0.488 0.243 264.376);  /* أزرق داكن */
```

---

## 🔤 نظام الخطوط (Typography System)

### الخط الأساسي: Tajawal

```html
<!-- في index.html -->
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;900&display=swap" rel="stylesheet" />
```

### الأوزان المستخدمة:
- **300 (Light)**: نصوص خفيفة، عناوين ثانوية
- **400 (Regular)**: النصوص العادية، الفقرات
- **500 (Medium)**: نصوص متوسطة، أزرار
- **700 (Bold)**: العناوين الرئيسية (h1-h6)
- **900 (Black)**: عناوين بارزة جداً (نادر الاستخدام)

### تطبيق الخطوط:

```css
body {
  font-family: 'Tajawal', sans-serif;
  direction: rtl;  /* اتجاه النص من اليمين لليسار */
}

h1, h2, h3, h4, h5, h6 {
  font-family: 'Tajawal', sans-serif;
  font-weight: 700;  /* Bold للعناوين */
}
```

---

## 📏 نظام الحواف والزوايا (Border Radius System)

```css
--radius: 0.65rem;  /* 10.4px - الزاوية الأساسية */

/* الزوايا المشتقة */
--radius-sm: calc(var(--radius) - 4px);   /* 6.4px - صغيرة */
--radius-md: calc(var(--radius) - 2px);   /* 8.4px - متوسطة */
--radius-lg: var(--radius);               /* 10.4px - كبيرة */
--radius-xl: calc(var(--radius) + 4px);   /* 14.4px - كبيرة جداً */
```

**الاستخدام:**
- `radius-sm`: Badges، Pills، Small buttons
- `radius-md`: Input fields، Select boxes
- `radius-lg`: Cards، Modals، Buttons (الأكثر استخداماً)
- `radius-xl`: Large cards، Hero sections

---

## 📦 المكونات المخصصة (Custom Components)

### 1. Container

```css
.container {
  width: 100%;
  margin-left: auto;
  margin-right: auto;
  padding-left: 1rem;   /* 16px على الموبايل */
  padding-right: 1rem;
}

/* Tablet (640px+) */
@media (min-width: 640px) {
  .container {
    padding-left: 1.5rem;  /* 24px */
    padding-right: 1.5rem;
  }
}

/* Desktop (1024px+) */
@media (min-width: 1024px) {
  .container {
    padding-left: 2rem;    /* 32px */
    padding-right: 2rem;
    max-width: 1280px;     /* عرض محتوى قياسي */
  }
}
```

**الاستخدام:**
```jsx
<div className="container">
  {/* المحتوى هنا سيكون محاذياً للوسط مع padding تلقائي */}
</div>
```

---

### 2. Flex Fix

```css
.flex {
  min-height: 0;
  min-width: 0;
}
```

**الغرض:** منع مشاكل overflow في Flexbox containers

---

## 🎯 أنماط الحالة (State Styles)

### Cursor Styles

```css
button:not(:disabled),
[role="button"]:not([aria-disabled="true"]),
[type="button"]:not(:disabled),
[type="submit"]:not(:disabled),
[type="reset"]:not(:disabled),
a[href],
select:not(:disabled),
input[type="checkbox"]:not(:disabled),
input[type="radio"]:not(:disabled) {
  cursor: pointer;
}
```

**الغرض:** جميع العناصر التفاعلية تظهر cursor pointer تلقائياً

---

### Focus & Outline

```css
* {
  @apply border-border outline-ring/50;
}
```

**الغرض:** 
- جميع الحدود تستخدم لون `border` الموحد
- جميع الـ outlines (عند التركيز) تستخدم لون `ring` بشفافية 50%

---

## 🎨 أمثلة الاستخدام (Usage Examples)

### مثال 1: بطاقة مشروع

```jsx
<Card className="hover:shadow-lg transition-shadow">
  <CardHeader>
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
        <FolderKanban className="w-6 h-6 text-primary" />
      </div>
      <CardTitle className="text-lg">{project.name}</CardTitle>
    </div>
  </CardHeader>
  <CardContent>
    <Badge className="bg-green-500/10 text-green-500">
      مكتمل
    </Badge>
  </CardContent>
</Card>
```

**الشرح:**
- `bg-primary/10`: خلفية ذهبية بشفافية 10%
- `text-primary`: نص ذهبي
- `hover:shadow-lg`: ظل كبير عند التمرير
- `transition-shadow`: انتقال سلس للظل

---

### مثال 2: زر رئيسي

```jsx
<Button 
  variant="default" 
  className="bg-primary text-primary-foreground hover:bg-primary/90"
>
  إضافة مشروع
</Button>
```

**الشرح:**
- `bg-primary`: خلفية ذهبية
- `text-primary-foreground`: نص داكن على الذهبي
- `hover:bg-primary/90`: ذهبي بشفافية 90% عند التمرير

---

### مثال 3: زر خطر

```jsx
<Button 
  variant="destructive"
  className="bg-destructive text-destructive-foreground"
>
  حذف
</Button>
```

---

### مثال 4: Badge بألوان مخصصة

```jsx
{/* حالة التصميم */}
<Badge className="bg-blue-500/10 text-blue-500">
  تصميم
</Badge>

{/* حالة التنفيذ */}
<Badge className="bg-yellow-500/10 text-yellow-500">
  تنفيذ
</Badge>

{/* حالة مكتمل */}
<Badge className="bg-green-500/10 text-green-500">
  مكتمل
</Badge>

{/* حالة ملغي */}
<Badge className="bg-red-500/10 text-red-500">
  ملغي
</Badge>
```

**النمط:** `bg-{color}-500/10 text-{color}-500`
- الخلفية: اللون بشفافية 10%
- النص: اللون الكامل

---

## 🌓 Dark Mode Support

النظام يدعم الوضع الداكن بالكامل عبر:

```jsx
// في App.tsx
<ThemeProvider defaultTheme="light" storageKey="ui-theme">
  {/* المحتوى */}
</ThemeProvider>
```

**التبديل بين الأوضاع:**
```jsx
import { useTheme } from "@/components/theme-provider";

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  
  return (
    <Button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      تبديل الوضع
    </Button>
  );
}
```

---

## 📱 Responsive Design

### Breakpoints

```css
/* Mobile First Approach */
/* Default: < 640px */

/* Tablet */
@media (min-width: 640px) { /* sm */ }

/* Desktop */
@media (min-width: 1024px) { /* lg */ }

/* Large Desktop */
@media (min-width: 1280px) { /* xl */ }
```

### مثال استخدام:

```jsx
<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
  {/* 1 عمود على الموبايل، 2 على التابلت، 3 على الديسكتوب */}
</div>
```

---

## 🎭 Animations & Transitions

### Transitions المستخدمة:

```jsx
// Shadow transition
className="transition-shadow hover:shadow-lg"

// All properties
className="transition-all duration-200"

// Specific properties
className="transition-colors duration-150"
```

### مكتبة الأنيميشن:

```css
@import "tw-animate-css";
```

**الأنيميشنات المتاحة:**
- `animate-pulse`: نبض (للتحميل)
- `animate-spin`: دوران (للتحميل)
- `animate-bounce`: قفز
- `animate-fade-in`: ظهور تدريجي
- `animate-slide-in`: انزلاق

---

## 🔧 Best Practices

### 1. استخدام المتغيرات الدلالية

❌ **خطأ:**
```jsx
<div className="bg-[#D4AF37]">
```

✅ **صحيح:**
```jsx
<div className="bg-primary">
```

---

### 2. الاتساق في الألوان

استخدم دائماً نمط `/10` للخلفيات الشفافة:

```jsx
<div className="bg-primary/10 text-primary">
<div className="bg-blue-500/10 text-blue-500">
<div className="bg-green-500/10 text-green-500">
```

---

### 3. التباين (Contrast)

تأكد دائماً من وجود تباين كافٍ:

```jsx
{/* خلفية فاتحة → نص داكن */}
<div className="bg-background text-foreground">

{/* خلفية داكنة → نص فاتح */}
<div className="bg-primary text-primary-foreground">

{/* خلفية ملونة → نص أبيض */}
<div className="bg-destructive text-destructive-foreground">
```

---

### 4. الظلال (Shadows)

استخدم الظلال بحكمة:

```jsx
{/* بطاقة عادية */}
<Card className="shadow-sm">

{/* بطاقة بارزة */}
<Card className="shadow-md">

{/* عند التمرير */}
<Card className="shadow-sm hover:shadow-lg transition-shadow">
```

---

## 📋 Checklist للتصميم الجديد

عند إضافة صفحة أو مكون جديد، تأكد من:

- [ ] استخدام `container` للمحتوى الرئيسي
- [ ] استخدام المتغيرات الدلالية (`primary`, `secondary`, إلخ)
- [ ] دعم Dark Mode
- [ ] Responsive على جميع الشاشات
- [ ] Transitions سلسة
- [ ] تباين كافٍ للنصوص
- [ ] استخدام خط Tajawal
- [ ] اتجاه RTL صحيح
- [ ] Hover states واضحة
- [ ] Focus states مرئية

---

## 🎨 لوحة الألوان السريعة (Quick Color Palette)

### الألوان الرئيسية:
- **الذهبي الأساسي**: `oklch(0.75 0.12 75)` → `#D4AF37` تقريباً
- **الأبيض**: `oklch(1 0 0)` → `#FFFFFF`
- **الأسود**: `oklch(0.141 0.005 285.823)` → `#1A1A1A` تقريباً
- **الأحمر (خطر)**: `oklch(0.577 0.245 27.325)` → `#DC2626` تقريباً

### الألوان الحالة:
- **أزرق (تصميم)**: `bg-blue-500/10 text-blue-500`
- **أصفر (تنفيذ)**: `bg-yellow-500/10 text-yellow-500`
- **أخضر (مكتمل)**: `bg-green-500/10 text-green-500`
- **أحمر (ملغي)**: `bg-red-500/10 text-red-500`
- **بنفسجي (تسليم)**: `bg-purple-500/10 text-purple-500`

---

## 📚 مراجع إضافية

- **Tailwind CSS Documentation**: https://tailwindcss.com/docs
- **shadcn/ui Components**: https://ui.shadcn.com
- **OKLCH Color Space**: https://oklch.com
- **Google Fonts - Tajawal**: https://fonts.google.com/specimen/Tajawal

---

**آخر تحديث:** ديسمبر 2025  
**الإصدار:** 1.0.0
