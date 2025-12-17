---
description: إعداد بيئة Node.js على CloudLinux باستخدام NVM
---

# إعداد Node.js على CloudLinux

## 1️⃣ إنشاء ملف تعريف Bash

CloudLinux عادة الـ `.bashrc` مش موجود، فهنعمل `.bash_profile`:

```bash
nano ~/.bash_profile
```

ضيف السطور دي:

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

احفظ واخرج بالضغط على `Ctrl+O` ثم `Enter` ثم `Ctrl+X`.

بعد كده نفّذ:

```bash
source ~/.bash_profile
```

---

## 2️⃣ تثبيت NVM

لو مش مثبت NVM عندك، نفّذ:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.6/install.sh | bash
```

وبعدين فعّل NVM:

```bash
source ~/.bash_profile
```

تأكد إنه شغال:

```bash
nvm --version
```

---

## 3️⃣ تثبيت Node.js باستخدام NVM

نفّذ:

```bash
nvm install 22
nvm use 22
```

تأكد من النسخة:

```bash
node -v
npm -v
```

---

## 4️⃣ تشغيل المشروع

لو المشروع موجود عندك مثلاً في `~/my-project`:

```bash
cd ~/my-project
```

لو فيه `package.json`:

```bash
npm install
```

وبعدين شغل السيرفر (مثلاً لو `index.js` أو `dist/index.js`):

```bash
node dist/index.js
```

---

## ✅ ملاحظات مهمة

| ملاحظة | التفاصيل |
|--------|----------|
| **جلسة SSH جديدة** | كل مرة تفتح جلسة SSH جديدة، نفّذ `source ~/.bash_profile` عشان NVM يتعرف على الأوامر |
| **تفعيل تلقائي** | لو عايز النسخة تعمل تلقائي، ممكن تضيف `nvm use 22` في نفس `.bash_profile` |
| **Frontend Build** | لو المشروع فيه build frontend (React مثلاً)، اعمل `npm run build` قبل تشغيل Node |

---

## 🔧 إعداد تفعيل Node تلقائياً

عشان تتجنب تشغيل `nvm use 22` كل مرة، عدّل `.bash_profile`:

```bash
nano ~/.bash_profile
```

وأضف السطور التالية:

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# تفعيل Node 22 تلقائياً
nvm use 22 > /dev/null 2>&1
```

---

## 🚀 تشغيل المشروع في الخلفية (Production)

لتشغيل المشروع في الخلفية باستخدام PM2:

```bash
# تثبيت PM2
npm install -g pm2

# تشغيل المشروع
pm2 start dist/index.js --name "gtd-manage"

# عرض حالة المشاريع
pm2 status

# إعادة تشغيل
pm2 restart gtd-manage

# إيقاف
pm2 stop gtd-manage

# حفظ الإعدادات للتشغيل التلقائي
pm2 save
pm2 startup
```
