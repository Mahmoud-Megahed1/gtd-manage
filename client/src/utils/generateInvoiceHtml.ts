
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
    const paymentMethods = formData.paymentMethods || {};

    const paymentMethodLabels: Record<string, string> = {
        tamara: 'تمارا (تقسيط)',
        mispay: 'MISpay (تقسيط)',
        stcpay: 'STCpay',
        visa: 'فيزا (تقسيط)',
        mada: 'مدى',
        bank: 'تحويل بنكي',
        pos: 'شبكة',
        cash: 'نقدي'
    };
    const paymentKeys = Object.keys(paymentMethodLabels);

    // Table Items
    const invoiceItems = invoice.items || [];

    // Terms - check formData first, then try to parse from invoice.terms
    let terms = formData.terms || [];
    if ((!terms || terms.length === 0) && invoice.terms) {
        // invoice.terms might be a JSON string array
        try {
            terms = typeof invoice.terms === 'string' ? JSON.parse(invoice.terms) : invoice.terms;
        } catch {
            // If parse fails, it might be a single string - wrap in array
            terms = [invoice.terms];
        }
    }
    // Fallback if still empty
    if (!terms || terms.length === 0) {
        terms = [];
    }

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
        .totals-section { 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-start;
            margin-top: 15px; 
            padding-top: 10px; 
            border-top: 2px solid #333;
        }
        .subtotals-box {
            text-align: left;
            font-size: 11px;
        }
        .subtotals-box .total-row {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
            margin-bottom: 3px;
        }
        .grand-total-box {
            background: linear-gradient(135deg, #bfa670 0%, #d4c4a0 100%);
            color: #fff;
            padding: 15px 25px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .grand-total-box .label {
            font-size: 12px;
            font-weight: 500;
            margin-bottom: 5px;
            color: #1a1a1a;
        }
        .grand-total-box .amount {
            font-size: 22px;
            font-weight: bold;
            color: #1a1a1a;
        }
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
        // First try to use stored totals from invoice object (for consistency)
        if (invoice.subtotal !== undefined && invoice.total !== undefined && Number(invoice.total) > 0) {
            return {
                subtotal: Number(invoice.subtotal) || 0,
                tax: Number(invoice.tax) || 0,
                total: Number(invoice.total) || 0,
                enableTax: (invoice.tax || 0) > 0 || formData.enableTax === true || formData.enableTax === "true"
            };
        }

        // Calculate from items if no stored totals
        const subtotal = invoiceItems.reduce((sum: number, item: any) => {
            const qty = Number(item.quantity) || 0;
            const price = Number(item.price) || Number(item.unitPrice) || 0;
            const discount = Number(item.discount) || 0;
            // Discount is percentage
            const rawTotal = qty * price;
            const discountAmount = rawTotal * (discount / 100);
            return sum + rawTotal - discountAmount;
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
                            <img src="https://pro.gtd-sys.com/logo.png" alt="Logo" class="logo-img">
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
                        <h3>خدمات التصميم المقدمة:</h3>
                        ${renderServiceList(designServices)}
                    ` : ''}

                    ${(projectNature === 'تنفيذ' || projectNature === 'other') && executionServices.length > 0 ? `
                        <h3>خدمات التنفيذ المقدمة:</h3>
                        ${renderServiceList(executionServices)}
                    ` : ''}
                    
                    ${genericServices.length > 0 ? `
                        <h3>الخدمات المقدمة:</h3>
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
        const price = Number(item.price) || Number(item.unitPrice) || 0;
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

        const unitLabel = item.unit === 'meter' ? 'متر' : item.unit === 'piece' ? 'قطعة' : item.unit === 'project' ? 'مشروع' : (item.unit || 'مشروع');

        return `
                                    <tr>
                                        <td>${idx + 1}</td>
                                        <td style="text-align: right;">${item.description}</td>
                                        <td>${unitLabel}</td>
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
                        <div class="grand-total-box">
                            <div class="label">الإجمالي النهائي</div>
                            <div class="amount">${totals.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div class="subtotals-box">
                            <div class="total-row"><span>${totals.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span> <span>:المجموع الفرعي</span></div>
                            ${totals.enableTax ? `<div class="total-row"><span>${totals.tax.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span> <span>:ضريبة (15%)</span></div>` : ''}
                        </div>
                    </div>
                </section>

                <section style="margin-top: 10px; border-top: 2px solid #ccc; padding-top: 5px;">
                    <h3>الشروط والأحكام:</h3>
                    <ul class="terms-ul">
                        ${terms.map((t: string) => `<li>${t}</li>`).join('')}
                    </ul>
                </section>

                <section style="margin-top: 10px; border-top: 1px dashed #ccc; padding-top: 10px;">
                     <h3>وسائل الدفع المتاحة:</h3>
                     <div style="display: flex; flex-wrap: wrap; gap: 15px;">
                         ${paymentKeys.map(key => {
        const isChecked = paymentMethods[key];
        return `
                                 <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; border: 1px solid #ddd; padding: 4px 10px; border-radius: 4px; background-color: ${isChecked ? '#f8f9fa' : 'transparent'}; opacity: ${isChecked ? '1' : '0.6'};">
                                     <span style="font-family: 'Segoe UI Symbol', sans-serif; font-size: 14px; color: ${isChecked ? 'green' : '#999'};">${isChecked ? '☑' : '☐'}</span>
                                     <span style="font-weight: ${isChecked ? 'bold' : 'normal'};">${paymentMethodLabels[key]}</span>
                                 </div>
                             `;
    }).join('')}
                     </div>
                </section>

                <footer>
                     <div style="height: 4px; background: linear-gradient(90deg, #ccc, #bfa670); margin-bottom: 10px; width: 100%;"></div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                         <div class="barcode-placeholder" style="order: 2; height: 100px; width: 200px; display: flex; align-items: flex-end; justify-content: flex-end;">
                             <img src="https://pro.gtd-sys.com/barcode.jpg" alt="Barcode" style="height: 80px; width: auto;">
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
