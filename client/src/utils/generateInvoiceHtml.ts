
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
    const css = `
        :root { --primary-color: #bfa670; --secondary-color: #1a1a1a; --border-color: #ddd; --bg-color: #f9f9f9; --paper-bg: #ffffff; --danger-color: #e74c3c; --success-color: #2ecc71; --grey-color: #7f8c8d; }
        * { box-sizing: border-box; outline: none; }
        body { font-family: 'Tajawal', sans-serif; background-color: white; margin: 0; padding: 0; color: #333; font-size: 13px; direction: rtl; }
        .page-container { width: 100%; max-width: 210mm; margin: 0 auto; background: white; padding: 20px; }
        
        /* Hidden elements in print */
        .no-print { display: none !important; }

        /* Headings */
        h1, h2, h3, h4 { margin: 0 0 8px 0; color: var(--secondary-color); }
        h1 { font-size: 22px; }
        h3 { font-size: 14px; margin-bottom: 5px; }
        h2 { font-size: 15px; border-bottom: 2px solid var(--primary-color); padding-bottom: 2px; margin-top: 10px; }

        .form-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
        .form-group { flex: 1; min-width: 150px; display: flex; flexDirection: column; }
        label { font-weight: 600; margin-bottom: 2px; font-size: 11px; color: #555; }
        
        /* Inputs as Text spans for read-only display */
        .value-box { 
            width: 100%; padding: 2px 0; border: none; border-bottom: 1px_SOLID transparent; 
            font-family: inherit; font-size: 11px; color: #000; min-height: 18px;
        }

        /* Checkboxes */
        .checkbox-group { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
        .checkbox-item { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; width: 30%; margin-bottom: 2px; }
        .print-checkbox {
            width: 12px; height: 12px; border: 1px solid #333; display: inline-block; vertical-align: middle; border-radius: 2px;
        }
        .print-checkbox.checked {
            background-color: #bfa670 !important; border-color: #bfa670 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        /* Table */
        table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 5px; }
        th, td { border: 1px solid #ddd; padding: 4px; text-align: center; vertical-align: middle; }
        th { background-color: #eee !important; color: #000 !important; font-weight: 500; font-size: 10px; -webkit-print-color-adjust: exact; }

        /* Services Grid */
        .service-list {
            display: grid;
            grid-template-columns: repeat(3, 1fr); /* Force 3 columns for print layout */
            gap: 5px;
            margin-bottom: 5px;
        }

        /* Totals */
        .totals-section { padding: 5px; border-top: 1px solid #000; display: flex; flexDirection: column; alignItems: flex-end; margin-top: 5px; }
        .total-row { display: flex; gap: 15px; alignItems: center; font-size: 12px; font-weight: bold; }

        /* Terms */
        .terms-ul { padding-right: 18px; margin-bottom: 0; line-height: 1.6; margin-top: 3px; font-size: 11px; }

        /* Footer */
        footer { margin-top: 10px; font-size: 12px; }
        .logo-placeholder { height: 80px; margin-bottom: 5px; display: flex; align-items: center; justify-content: flex-start; }
        .logo-img { max-height: 100%; max-width: 100%; }

        @media print {
            body { padding: 0; margin: 0; }
            .page-container { width: 100%; max-width: 100%; border: none; padding: 10mm; margin: 0; }
            th { background-color: #eee !important; }
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
        const subtotal = invoiceItems.reduce((sum: number, item: any) => {
            const qty = Number(item.quantity) || 0;
            const price = Number(item.price) || 0;
            const discount = Number(item.discount) || 0;
            return sum + (qty * price) - discount;
        }, 0);

        // Check for VAT setting
        const enableTax = formData.enableTax === true || formData.enableTax === "true";
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
                <header style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                    <div style="width: 30%;">
                        <div class="logo-placeholder">
                            <img src="/LOGO.png" alt="Logo" class="logo-img">
                        </div>
                    </div>
                    <div style="width: 65%; text-align: left;">
                        <h1 style="color: #bfa670;">GOLDEN TOUCH <span style="color: #7f8c8d;">DESIGN</span></h1>
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
                            <span class="value-box">${projectNature}${projectNature === 'أخرى' ? ' - ' + otherProjectNature : ''}</span>
                        </div>
                        <div class="form-group">
                            <label>طبيعة الموقع</label>
                            <span class="value-box">${siteNature}${siteNature === 'أخرى' ? ' - ' + otherSiteNature : ''}</span>
                        </div>
                        <div class="form-group">
                            <label>متطلبات التصميم</label>
                            <span class="value-box">${designReq}</span>
                        </div>
                           <div class="form-group">
                            <label>النمط (الستايل)</label>
                            <span class="value-box">${style}</span>
                        </div>
                    </div>

                    ${(projectNature === 'تصميم' || projectNature === 'تصميم وتنفيذ' || projectNature === 'أخرى') && designServices.length > 0 ? `
                        <h3>خدمات التصميم:</h3>
                        ${renderServiceList(designServices)}
                    ` : ''}

                    ${(projectNature === 'تنفيذ' || projectNature === 'تصميم وتنفيذ' || projectNature === 'أخرى') && executionServices.length > 0 ? `
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
                                <th style="width: 50%;">الوصف</th>
                                <th style="width: 10%;">الوحدة</th>
                                <th style="width: 10%;">الكمية</th>
                                <th style="width: 15%;">سعر الوحدة</th>
                                <th style="width: 15%;">الاجمالي</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${invoiceItems.map((item: any) => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.price) || 0;
        const discount = Number(item.discount) || 0;
        const total = (qty * price) - discount;
        return `
                                    <tr>
                                        <td style="text-align: right;">${item.description}</td>
                                        <td>${item.unit}</td>
                                        <td>${qty}</td>
                                        <td>${price}</td>
                                        <td>${total.toFixed(2)}</td>
                                    </tr>
                                `;
    }).join('')}
                        </tbody>
                    </table>

                    <div class="totals-section">
                        <div class="total-row"><span>المجموع الفرعي:</span> <span>${totals.subtotal.toFixed(2)} ريال</span></div>
                        ${totals.enableTax ? `<div class="total-row"><span>ضريبة القيمة المضافة (15%):</span> <span>${totals.tax.toFixed(2)} ريال</span></div>` : ''}
                        <div class="total-row" style="font-size: 14px; margin-top: 5px; border-top: 1px solid #777; padding-top: 3px;">
                            <span>الإجمالي الكلي:</span> <span>${totals.total.toFixed(2)} ريال</span>
                        </div>
                    </div>
                </section>

                <section style="margin-top: 10px; border-top: 2px solid #ccc; padding-top: 5px;">
                    <h3>الشروط والأحكام والملاحظات:</h3>
                    <ul class="terms-ul">
                        ${terms.map((t: string) => `<li>${t}</li>`).join('')}
                    </ul>
                </section>

                <footer>
                    <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                        <div>
                            <p style="margin: 0; font-weight: bold;">العنوان: أبها - حي المنسك</p>
                            <p style="margin: 0;">جوال: 0500160892</p>
                            <p style="margin: 0; font-size: 10px; color: #777;">تم اصدار هذه الفاتورة الكترونيا</p>
                        </div>
                        <div class="barcode-placeholder">
                           <img src="/BARCODE.jpg" class="logo-img" style="max-height: 50px;">
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
