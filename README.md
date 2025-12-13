# Golden Touch Design System

## المتطلبات
- Node.js 18+
- pnpm (أو npm/yarn)
- إعدادات البيئة عبر ملف `.env`

## تشغيل محلي
- تثبيت الحزم:
  - `pnpm install`
- تشغيل وضع التطوير:
  - `pnpm dev` على لينكس/ماك
  - `pnpm dev:win` على ويندوز
- التحقق من الأنواع:
  - `pnpx tsc --noEmit`

## البناء والنشر
- بناء العميل والخادم:
  - `pnpm build`
- تشغيل الإنتاج:
  - `pnpm start`

## إعدادات البيئة
- أنشئ `.env` من `.env.example` واضبط المتغيرات:
  - `COOKIE_SECRET` مفتاح توقيع الجلسات
  - `OAUTH_SERVER_URL` عنوان خادم OAuth
  - `VITE_OAUTH_PORTAL_URL` بوابة تسجيل الدخول
  - `VITE_APP_ID` معرّف التطبيق لدى OAuth
  - `WEB_ORIGIN` أصل الواجهة (مثال: `https://yourdomain.com`)
  - `VITE_SERVER_ORIGIN` أصل الخادم لوظائف التحقق
  - `DATABASE_URL` (اختياري) لقاعدة بيانات MySQL عبر Drizzle

## البنية
- العميل: `client/` مبني بـ Vite و React
- الخادم: `server/_core/index.ts` (Express + tRPC)
- المشاركة: `shared/` ثوابت وأخطاء مشتركة
- المخرجات: 
  - عميل: `dist/public`
  - خادم: `dist/index.js`

## النشر على GitHub
- تأكد من وجود:
  - `.gitignore` يتجاهل `node_modules`, `dist`, `.env`, `.demo_store`
  - `.env.example` بدون أسرار
  - هذا `README.md`
- إنشاء المستودع وإرسال:
  - `git init && git add . && git commit -m "Initial"`
  - `git remote add origin <REPO_URL>`
  - `git push -u origin main`

## النشر على هوستنجر (Hostinger)
- عبر hPanel → Advanced → Node.js:
  - حدّد مجلد التطبيق إلى جذر المشروع
  - أمر البدء: `node dist/index.js`
  - المنفذ: يستخدم المتغير `PORT` إن وُجد، وإلا يبحث عن منفذ متاح بدءاً من 3000
- الخطوات:
  1. رفع الكود إلى الاستضافة (git أو File Manager)
  2. تثبيت الحزم: `pnpm install --prod`
  3. بناء: `pnpm build`
  4. إعداد `.env` بالقيم الصحيحة
  5. بدء التطبيق من الواجهة (Start)
- CORS:
  - اضبط `WEB_ORIGIN` في `.env` ليطابق نطاق الواجهة
- OAuth:
  - احرص على ضبط `COOKIE_SECRET`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL`, `VITE_APP_ID`
  - رابط الرجوع: `https://<your-host>/api/oauth/callback`

## نصائح أمان
- لا تضع أسرار في المستودع العام
- استخدم `COOKIE_SECRET` قوي في الإنتاج
- فعّل HTTPS على النطاق

## اختبارات
- `pnpm test` لتشغيل اختبارات Vitest
- ملاحظة: بعض الاختبارات تعتمد على قاعدة بيانات؛ بدون `DATABASE_URL` ستعمل أجزاء تجريبية فقط

## الأسئلة الشائعة
- إذا فشل البناء، تأكد من صلاحيات الكتابة لـ `dist/`
- إذا واجهت CORS، راجع قيمة `WEB_ORIGIN`
- إذا فشل OAuth، تحقق من متغيرات `.env` وإعدادات التطبيق في خادم OAuth
