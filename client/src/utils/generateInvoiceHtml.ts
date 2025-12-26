
export const generateInvoiceHtml = (invoice: any) => {
    // 1. Prepare Data
    // Parse formData if it's a string, otherwise use as object
    const formData = typeof invoice.formData === 'string'
        ? JSON.parse(invoice.formData)
        : (invoice.formData || {});

    // Basic Invoice Info
    const docType = formData.docType || "عرض سعر وفاتورة سداد";
    const serialNumber = invoice.invoiceNumber ? String(invoice.invoiceNumber).padStart(4, '0') : "0000";
    const issueDate = invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

    // Client & Project Info
    const clientName = invoice.client?.name || "";
    const clientPhone = invoice.client?.phone || "";
    const clientCity = formData.clientCity || "";

    const projectId = invoice.project?.id || "";
    const projectNature = formData.projectNature || "";
    const otherProjectNature = formData.otherProjectNature || "";
    const siteNature = formData.siteNature || "";
    const otherSiteNature = formData.otherSiteNature || "";
    const designReq = formData.designReq || "";
    const otherDesignReq = formData.otherDesignReq || "";
    const style = formData.style || "";
    const otherStyle = formData.otherStyle || "";

    // Services Lists (default empty array if missing)
    const designServices = formData.designServices || [];
    const executionServices = formData.executionServices || [];
    const genericServices = formData.genericServices || [];

    // Table Items
    const invoiceItems = invoice.items || [];

    // Terms
    const terms = formData.terms || []; // Array of strings

    // CSS (Copied from Fatore.CSS / fatore.HTML)
    // CSS (Copied from Fatore.HTML)
    const css = `
        :root { --primary-color: #bfa670; --secondary-color: #1a1a1a; --border-color: #ddd; --bg-color: #f9f9f9; --paper-bg: #ffffff; }
        * { box-sizing: border-box; outline: none; }
        body { font-family: 'Tajawal', sans-serif; background-color: white; margin: 0; padding: 0; color: #333; font-size: 13px; direction: rtl; }
        .page-container { width: 100%; max-width: 210mm; margin: 0 auto; background: white; padding: 25px; min-height: 297mm; display: flex; flex-direction: column; }
        
        /* Headings */
        h1, h2, h3, h4 { margin: 0 0 8px 0; color: var(--secondary-color); }
        h1 { font-size: 22px; }
        h3 { font-size: 14px; margin-bottom: 5px; }
        h2 { font-size: 15px; border-bottom: 2px solid var(--primary-color); padding-bottom: 2px; margin-top: 10px; }

        /* Form Layout */
        .form-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
        .form-group { flex: 1; min-width: 150px; display: flex; flex-direction: column; }
        label { font-weight: 600; margin-bottom: 2px; font-size: 11px; color: #555; }
        .value-box { width: 100%; padding: 5px; border: 1px solid #ddd; border-radius: 4px; min-height: 25px; font-size: 11px; background: #fff; display: flex; align-items: center; }

        /* Table */
        table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 5px; }
        th, td { border: 1px solid #ddd; padding: 4px; text-align: center; vertical-align: middle; }
        th { background-color: var(--secondary-color) !important; color: white !important; font-weight: 500; font-size: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

        /* Totals */
        .totals-section { padding: 5px; border-top: 1px solid #000; display: flex; flex-direction: column; align-items: flex-end; margin-top: 5px; page-break-inside: avoid; }
        .total-row { display: flex; gap: 15px; align-items: center; font-size: 12px; font-weight: bold; }

        /* Checkboxes */
        .checkbox-group { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
        .checkbox-item { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; width: 30%; margin-bottom: 2px; }
        .print-checkbox {
            width: 12px; height: 12px; border: 1px solid #333; display: inline-block; border-radius: 2px;
        }
        .print-checkbox.checked {
            background-color: #bfa670 !important; border-color: #bfa670 !important;
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }

        /* Terms & Services */
        .service-list { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; margin-bottom: 5px; }
        .terms-ul { padding-right: 18px; margin-bottom: 0; line-height: 1.6; margin-top: 3px; font-size: 11px; }

        /* Footer */
        footer { margin-top: auto; font-size: 12px; page-break-inside: avoid; }
        .logo-placeholder { height: 100px; margin-bottom: 10px; display: flex; align-items: center; justify-content: flex-start; }
        .barcode-placeholder { height: 100px; width: 200px; float: left; }

        @media print {
            body { padding: 0; margin: 0; background: white; }
            .page-container { width: 100%; max-width: 100%; border: none; padding: 10mm; margin: 0; box-shadow: none; min-height: auto; }
            th { background-color: #eee !important; color: #000 !important; }
            .no-print { display: none !important; }
        }
    `;

    // Helper to render services
    const renderServiceList = (services: any[]) => {
        if (!services || services.length === 0) return '';
        return `
            <div class="service-list">
                ${services.map((s: any) => `
                    <div class="checkbox-item">
                        <span class="print-checkbox ${s.checked ? 'checked' : ''}"></span>
                        <span>${s.text}</span>
                    </div>
                `).join('')}
            </div>
        `;
    };

    // Helper calculate totals
    const calculateTotals = () => {
        // First try to use stored totals from invoice object (old invoices)
        if (invoice.subtotal !== undefined && invoice.total !== undefined) {
            return {
                subtotal: Number(invoice.subtotal) || 0,
                tax: Number(invoice.tax) || 0,
                total: Number(invoice.total) || 0,
                enableTax: (invoice.tax || 0) > 0 || formData.enableTax === true || formData.enableTax === "true" || formData.taxEnabled === true
            };
        }

        // Calculate from items if no stored totals
        const subtotal = invoiceItems.reduce((sum: number, item: any) => {
            const qty = Number(item.quantity) || 0;
            const price = Number(item.price) || Number(item.unitPrice) || 0;
            const discount = Number(item.discount) || 0;
            // Discount is a percentage
            const rawTotal = qty * price;
            const discountAmount = rawTotal * (discount / 100);
            return sum + rawTotal - discountAmount;
        }, 0);

        // Check for VAT setting
        const enableTax = formData.enableTax === true || formData.enableTax === "true" || formData.taxEnabled === true;
        const tax = enableTax ? subtotal * 0.15 : 0;
        const total = subtotal + tax;

        return { subtotal, tax, total, enableTax };
    };

    const totals = calculateTotals();

    // The HTML Template
    return `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>Invoice #${serialNumber}</title>
            <style>${css}</style>
            <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700&display=swap" rel="stylesheet">
        </head>
        <body>
            <div class="page-container">
                <header style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px;">
                    <div style="width: 30%;">
                        <div class="logo-placeholder">
                            <img src="/LOGO.png" alt="Logo" style="max-height: 100%; max-width: 100%; object-fit: contain;">
                        </div>
                    </div>
                    <div style="width: 65%; text-align: left;">
                        <h1 style="color: var(--primary-color);">GOLDEN TOUCH <span style="color: var(--grey-color);">DESIGN</span></h1>
                        <h3>شركة اللمسة الذهبية للتصميم</h3>
                        <p style="margin: 0 0 5px 0; font-size: 12px; font-weight: bold; color: #555;">سجل تجاري C.R. 7017891396</p>
                        
                        <div style="display: flex; gap: 10px; align-items: center; border-bottom: 1px solid #ccc; padding-bottom: 2px;">
                            <span class="value-box" style="width: auto;">${issueDate}</span>
                            <span class="value-box" style="font-weight: bold; text-align: left; flex: 1;">${docType} #${serialNumber}</span>
                        </div>
                    </div>
                </header>

                <section>
                    <h2>بيانات العميل</h2>
                    <div class="form-row">
                        <div class="form-group">
                            <label>اسم العميل</label>
                            <span class="value-box">${clientName}</span>
                        </div>
                        <div class="form-group">
                            <label>رقم الجوال</label>
                            <span class="value-box" style="text-align: right; direction: ltr;">${clientPhone}</span>
                        </div>
                        <div class="form-group">
                            <label>المدينة \\ الحي</label>
                            <span class="value-box">${clientCity}</span>
                        </div>
                    </div>
                </section>

                <section>
                    <h2>بيانات المشروع</h2>
                    <div class="form-row">
                        <div class="form-group">
                            <label>طبيعة المشروع</label>
                            <span class="value-box">${projectNature}${projectNature === 'other' ? ' - ' + otherProjectNature : ''}</span>
                        </div>
                        <div class="form-group">
                            <label>طبيعة الموقع</label>
                            <span class="value-box">${siteNature}${siteNature === 'other' ? ' - ' + otherSiteNature : ''}</span>
                        </div>

                        <div class="form-group">
                            <label>التصميم المطلوب</label>
                            <span class="value-box">${designReq}${designReq === 'other' ? ' - ' + otherDesignReq : ''}</span>
                        </div>
                        <div class="form-group">
                            <label>طراز التصميم</label>
                            <span class="value-box">${style}${style === 'other' ? ' - ' + otherStyle : ''}</span>
                        </div>
                    </div>
                    ${formData.notes ? `
                    <div class="form-row">
                        <div class="form-group">
                            <label>ملاحظات</label>
                            <span class="value-box" style="height: auto; white-space: pre-wrap;">${formData.notes}</span>
                        </div>
                    </div>` : ''}

                    ${(projectNature === 'تصميم' || projectNature === 'تنفيذ' || projectNature === 'other') && designServices.length > 0 ? `
                        <h3>خدمات التصميم:</h3>
                        ${renderServiceList(designServices)}
                    ` : ''}

                    ${(projectNature === 'تنفيذ' || projectNature === 'other') && executionServices.length > 0 ? `
                        <h3>خدمات التنفيذ:</h3>
                        ${renderServiceList(executionServices)}
                    ` : ''}
                    
                    ${genericServices.length > 0 ? `
                        <h3>خدمات عامة:</h3>
                        ${renderServiceList(genericServices)}
                    ` : ''}
                </section>

                <section>
                    <h2>بيان بالأعمال والأسعار</h2>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 5%;">#</th>
                                <th style="width: 40%;">الوصف</th>
                                <th style="width: 10%;">الوحدة</th>
                                <th style="width: 10%;">الكمية</th>
                                <th style="width: 10%;">سعر الوحدة</th>
                                <th style="width: 10%;">الخصم</th>
                                <th style="width: 15%;">الاجمالي</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${invoiceItems.map((item: any, idx: number) => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.price) || 0;
        const discount = Number(item.discount) || 0; // Discount is percentage in Fatore.tsx logic usually, but let's check input
        // In Fatore.tsx, discount input key was 'discount'
        // Logic: total = total - (total * (item.discount / 100));
        // BUT item.discount here might be value or percent.
        // Let's assume Fatore.tsx passes the calculated total or raw.
        // Fatore.tsx getInvoiceData passes raw 'discount'.
        // So we need to match the calculation logic.
        const rawTotal = qty * price;
        const discountAmount = rawTotal * (discount / 100);
        const total = rawTotal - discountAmount;

        return `
                                    <tr>
                                        <td>${idx + 1}</td>
                                        <td style="text-align: right;">${item.description}</td>
                                        <td>${item.unit === 'meter' ? 'متر' : item.unit === 'piece' ? 'قطعة' : 'مشروع'}</td>
                                        <td>${qty}</td>
                                        <td>${price}</td>
                                        <td>${discount}%</td>
                                        <td>${total.toFixed(2)}</td>
                                    </tr>
                                `;
    }).join('')}
                        </tbody>
                    </table>

                    <div class="totals-section">
                        <div class="total-row"><span>المجموع الفرعي:</span> <span>${totals.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                        ${totals.enableTax ? `<div class="total-row"><span>ضريبة (15%):</span> <span>${totals.tax.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>` : ''}
                        <div class="total-row" style="font-size: 16px; margin-top: 5px; border-top: 2px solid #333; padding-top: 3px;">
                            <span>الإجمالي النهائي:</span> <span>${totals.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </section>

                <section style="margin-top: 10px; border-top: 2px solid #ccc; padding-top: 5px;">
                    <h3>الشروط والأحكام:</h3>
                    <ul class="terms-ul">
                        ${terms.map((t: string) => `<li>${t}</li>`).join('')}
                    </ul>
                </section>

                <footer>
                     <div style="height: 4px; background: linear-gradient(90deg, #ccc, #bfa670); margin-bottom: 10px; width: 100%;"></div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                         <div class="barcode-placeholder">
                             <img src="/barcode.jpg" alt="Barcode" style="height: 100%; width: auto;">
                        </div>
                        <div style="text-align: right; order: 1; width: 70%;">
                             <p style="font-size: 16px; margin-bottom: 5px; color: var(--secondary-color);"><strong>شركة اللمسة الذهبية للتصميم | GOLDEN TOUCH DESIGN</strong></p>
                            <p style="margin: 4px 0; font-size: 14px; font-weight: bold;">الرياض, حي السفارات, مربع الفزاري, مبنى 3293, بوابة 5 <br /> سجل تجاري C . R . 7017891396</p>
                             <p style="margin: 0; font-size: 12px;">500511616 00966 - WWW.GOLDEN-TOUCH.NET - INFO@GOLDEN-TOUCH.NET</p>
                        </div>
                    </div>
                </footer>
            </div>
            <script>
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
    `;
};
