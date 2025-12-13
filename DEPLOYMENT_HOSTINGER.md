# نشر النظام على Hostinger

## المتطلبات
- قاعدة بيانات MySQL مفعّلة مع صلاحيات إنشاء الجداول
- ضبط المتغيرات (`.env`) على الاستضافة
- Node.js مدعوم وخدمة تشغيل التطبيق

## ملخص سريع
- إبقِ فرع `main` هو فرع النشر.
- أضف أسرار GitHub وبيانات SSH أو FTP للاستضافة.
- ادفع (push) إلى `main` لتبدأ عملية CI/CD تلقائيًا.
- سيتكفّل GitHub Actions بالبناء والنشر (FTP أو SSH)، وتشغيل التطبيق مع فحص الصحة إن توفّر SSH/Node Manager.

## المتغيرات المطلوبة
- `DATABASE_URL` رابط الاتصال بقاعدة البيانات MySQL (اختياري إذا تستخدم المخزن التجريبي)
- `COOKIE_SECRET` قيمة سرية لتوقيع الجلسات (إلزامي في الإنتاج)
- `OAUTH_SERVER_URL` إذا كانت المصادقة الخارجية مطلوبة
- `VITE_OAUTH_PORTAL_URL` واجهة البوابة للمصادقة
- `VITE_APP_ID` معرف التطبيق
- `WEB_ORIGIN` أصل الويب العام مثل `https://your-domain.com`
- `VITE_SERVER_ORIGIN` أصل الخادم إذا لزم

## خطوات CI/CD تلقائية
يتم تنفيذ الخطوات تلقائياً عبر GitHub Actions:
- تثبيت الاعتمادات وبناء المشروع.
- نشر مجلد `dist/` إلى الخادم عبر SSH.
- كتابة ملف `.env` على الخادم من أسرار المستودع.
- تشغيل التطبيق عبر `pm2` في وضع الإنتاج.
- اختبار صحة الخدمة عبر مسار `GET /healthz`.

### أسرار GitHub المطلوبة
- `HOSTINGER_SSH_KEY` مفتاح SSH الخاص للنشر
- `HOSTINGER_HOST` عنوان الخادم
- `HOSTINGER_USER` المستخدم
- `HOSTINGER_PORT` منفذ SSH
- `HOSTINGER_TARGET` المسار الهدف على الخادم
- `HOSTINGER_DOMAIN` النطاق العام للتحقق الصحي
- `COOKIE_SECRET`, `WEB_ORIGIN`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL`, `VITE_APP_ID`, `VITE_SERVER_ORIGIN`, `DATABASE_URL`

### خيار بديل: النشر عبر FTP
- إذا لا يتوفر SSH ويمكنك فقط استخدام FTP، فعّل هذه الأسرار:
  - `HOSTINGER_FTP_HOST` مضيف FTP (مثل `ftp.your-domain.com` أو عنوان IP)
  - `HOSTINGER_FTP_USER` اسم مستخدم FTP
  - `HOSTINGER_FTP_PASSWORD` كلمة مرور FTP
  - `HOSTINGER_FTP_PORT` المنفذ (عادة `21`)
  - `HOSTINGER_FTP_TARGET` مسار الدليل على الخادم (مثل `/public_html/gtd-pro/`)
- سيتم تفعيل خطوة `Deploy via FTP` تلقائيًا عند وجود كلمة المرور.
- ملاحظة: FTP ينقل الملفات فقط ولا يدير تشغيل تطبيق Node؛ إذا كان التطبيق يحتاج PM2، احرص على تفعيل SSH أيضًا أو استخدم مدير Node في Hostinger.

## تشغيل الخادم خارجيًا (إذا لم يتوفر Node.js في Hostinger)
إذا كانت خطة الاستضافة لا تدعم Node.js App Manager، يمكنك تشغيل الخادم على Render والإبقاء على الواجهة على Hostinger:
- اربط المستودع مع Render واختر النشر من GitHub.
- الملف `render.yaml` في الجذر يعرّف خدمة الويب:
  - `buildCommand`: `pnpm install --frozen-lockfile && pnpm build`
  - `startCommand`: `pnpm start`
  - `healthCheckPath`: `/healthz`
  - المتغيرات:
    - `NODE_ENV=production`
    - `WEB_ORIGIN=https://gtd-sys.com`
    - أسرار: `COOKIE_SECRET`, `JWT_SECRET`, اختياريًا `DATABASE_URL` (تضبط من لوحة Render)
- بعد نشر الخادم، إن كان تطبيق الواجهة يحتاج أصل الخادم (`VITE_SERVER_ORIGIN`)، حدّده بقيمة عنوان الخادم في Render ثم أعد نشر `dist/public` إلى `public_html`.
### إنشاء مفتاح SSH وربطه
1. على جهازك:
   - Windows PowerShell: `ssh-keygen -t ed25519 -C "hostinger-deploy"`
   - سيتولد ملفان: مفتاح خاص `id_ed25519` ومفتاح عام `id_ed25519.pub`.
2. في Hostinger:
   - فعّل الوصول عبر SSH للموقع/الحساب.
   - أضف محتوى المفتاح العام إلى مفاتيح SSH المصرّح بها.
   - احصل على معلومات `HOST`, `USER`, `PORT`، وحدد مجلد الهدف للنشر مثل `/home/USER/apps/gtd`.
3. في GitHub (Settings → Secrets and variables → Actions):
   - أضف السر `HOSTINGER_SSH_KEY` بمحتوى المفتاح الخاص كاملًا.
   - أضف `HOSTINGER_HOST`, `HOSTINGER_USER`, `HOSTINGER_PORT`, `HOSTINGER_TARGET`, `HOSTINGER_DOMAIN`.
   - أضف أسرار البيئة: `COOKIE_SECRET`, `WEB_ORIGIN`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL`, `VITE_APP_ID`, `VITE_SERVER_ORIGIN`, `DATABASE_URL`.

### إعداد الأسرار تلقائيًا
- تثبيت GitHub CLI: `winget install GitHub.cli` أو من الموقع الرسمي.
- تسجيل الدخول: `gh auth login`
- تشغيل سكربت الإعداد:
  - `powershell -ExecutionPolicy Bypass -File scripts/setup-hostinger-secrets.ps1 -SshKeyPath C:\path\to\id_ed25519`
- سيطلب منك القيم اللازمة ويولّد تلقائيًا قيمًا قوية لـ `COOKIE_SECRET` و`JWT_SECRET` ويضبط جميع الأسرار في المستودع.
 - يدعم السكربت كذلك أسرار FTP الاختيارية (`HOSTINGER_FTP_HOST`, `HOSTINGER_FTP_USER`, `HOSTINGER_FTP_PASSWORD`, `HOSTINGER_FTP_PORT`, `HOSTINGER_FTP_TARGET`) لتفعيل خطوة النشر عبر FTP تلقائيًا عند عدم توفر SSH.

### ربط النطاق
- أنشئ سجل `A` في DNS يشير إلى عنوان IP للخادم.
- فعّل شهادة SSL (Let's Encrypt) من لوحة الاستضافة.
- حدّث `WEB_ORIGIN` في أسرار GitHub إلى `https://your-domain.com`.

### تشغيل يدوي إن لزم
- تثبيت: `pnpm install` أو `npm ci`
- بناء: `pnpm build` أو `npm run build`
- تشغيل: `NODE_ENV=production pm2 start dist/index.js --name manus`

## ملاحظات
- الملفات والصور المرفوعة تُخزّن عبر مزود التخزين ضمن `server/storage.ts`. تأكد من تكوين التخزين أو استخدم التخزين الافتراضي.
- لا تغييرات على هيكل المشروع العام. جميع الإضافات مطابقة للطلبات.

## التحقق واستكشاف الأخطاء
- بعد اكتمال النشر، تحقق من `https://your-domain.com/healthz` ويجب أن ترى حالة 200 مع `ok`.
- إذا فشل النشر:
  - تأكد من صحة `HOSTINGER_SSH_KEY` ووجود صلاحية SSH للمستخدم.
  - تحقق من أن `HOSTINGER_TARGET` موجود وللمستخدم صلاحية الكتابة.
  - تأكد من وجود أحد `COOKIE_SECRET` أو `JWT_SECRET` وإلا سيتوقف الخادم في الإنتاج.
  - راجع سجلات PM2 على الخادم: `npx pm2 logs manus`.

## إعداد مسبق للإطار (Framework Preset)
يعتمد اختيار الإعداد المسبق على ما إذا كنت ستشغّل خادم Node.js على Hostinger أم ستستضيف الواجهة فقط:

### الحالة A: استخدام Node.js App Manager (تطبيق كامل – API + واجهة)
- الإعداد المسبق للإطار: اختر **None / Custom** (ليست Next.js ولا React فقط؛ التطبيق مخصّص).
- ملف الإدخال (Entry file): `dist/index.js`.
- أمر التثبيت (Install): `pnpm install --frozen-lockfile` أو `npm ci`.
- أمر البناء (Build): `pnpm build` أو `npm run build`.
- أمر التشغيل (Start): `pnpm start` أو `npm run start`.
- دليل الإخراج للواجهة: لا حاجة لتحديده؛ الخادم يخدم `dist/public` تلقائيًا في الإنتاج.
- متغيرات البيئة الأساسية: `COOKIE_SECRET`, `WEB_ORIGIN`, اختياريًا `DATABASE_URL` و`OAUTH_SERVER_URL`… (انظر قسم المتغيرات).

### الحالة B: استضافة واجهة فقط (Static Hosting) بدون خادم Node
- الإعداد المسبق للإطار: اختر **React (Vite)**.
- أمر البناء: `pnpm build:client` (يبني الواجهة فقط) أو `pnpm build` (يبني الواجهة والخادم، لكنك سترفع الواجهة فقط).
- دليل الإخراج (Output directory): `dist/public`.
- ملف الإدخال: `index.html` داخل `dist/public` أو ارفع المحتوى إلى `public_html`.
- ملاحظة: إن كانت الواجهة تحتاج API، اضبط `VITE_SERVER_ORIGIN` ليشير إلى خادم خارجي (مثل Render) ثم أعد البناء.

### ملاحظة توافق: إن تطلبت المنصة اسم `server.js`
- أنشئ ملفًا في جذر المشروع باسم `server.js` يحتوي:
  - `require('./dist/index.js')`
- عيّن الإدخال إلى `server.js`، وسيستدعي الخادم المبني تلقائيًا.

### تحقق سريع بعد الضبط
- افتح `https://your-domain.com/healthz` وتأكد من الاستجابة 200 مع `{ ok: true }`.
- عند أي مشكلة، راجع سجلات التشغيل (PM2 أو سجل تطبيق Hostinger) وتأكد من ضبط `COOKIE_SECRET`.

## إصدار Node
- الإصدار الموصى به: اختر `Node 22.x` في Hostinger إذا كان متاحًا، لأن البناء يستهدف `node22` في سكربت البناء (`package.json:9`).
- بديل متوافق: إن كانت لوحة Hostinger تدعم `Node 20.x` فقط، غيّر هدف البناء إلى `node20` مؤقتًا عبر تعديل سكربت:
  - من: `esbuild server/_core/index.ts --platform=node --bundle --format=esm --target=node22 ...`
  - إلى: `esbuild server/_core/index.ts --platform=node --bundle --format=esm --target=node20 ...`
- توافق ESM: المشروع يستخدم `type: "module"` وملفات ESM؛ يتطلب Node 18+ على الأقل لتشغيل `dist/index.js` بشكل صحيح.
- أوامر التشغيل: استخدم `pnpm start` أو `npm run start` لتشغيل `node dist/index.js` في وضع الإنتاج (`package.json:11`).
