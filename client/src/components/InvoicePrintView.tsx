import React from 'react';
import './IntegratedInvoiceForm.css';
import { BARCODE_BASE64, LOGO_BASE64 } from '../utils/assets';


interface InvoiceItem {
    id: string;
    description: string;
    unit: 'meter' | 'piece' | 'project';
    quantity: number;
    price: number;
    discount: number;
}

interface InvoicePrintViewProps {
    // Header
    serialNumber: string;
    issueDate: string;
    docType: string;

    // Client
    clientName: string;
    clientPhone: string;
    clientCity: string;

    // Project
    projectNature: string;
    otherProjectNature: string;
    siteNature: string;
    otherSiteNature: string;
    designReq: string;
    otherDesignReq: string;
    style: string;
    otherStyle: string;





    // Items
    items: InvoiceItem[];
    calculateRowTotal: (item: InvoiceItem) => number;
    subtotal: number;
    vatAmount: number;
    grandTotal: number;
    taxEnabled: boolean;

    // Payment
    paymentMethods: Record<string, boolean>;
    paymentTermType: string;

    // Terms
    validityPeriod: string;
    isCustomValidity: boolean;
    designDuration: string;
    isCustomDuration: boolean;
    cancellationFee: string;
    isCustomFee: boolean;
    customTerms: string[];
}

export const InvoicePrintView: React.FC<InvoicePrintViewProps> = (props) => {
    // Helper to get formatted value (or "Other" text)
    const getSelectLabel = (val: string, options: { value: string, label: string }[], otherVal?: string) => {
        if (!val) return "---";
        if (val === 'other') return otherVal || "مخصص";
        const opt = options.find(o => o.value === val);
        return opt ? opt.label : val;
    };

    const natureOptions = [
        { value: "design", label: "تصميم" },
        { value: "execution", label: "تنفيذ" },
        { value: "visit", label: "استشارة في موقع المشروع" },
        { value: "office", label: "استشارة في المكتب" },
        { value: "online", label: "استشارة اونلاين" },
    ];

    const siteOptions = [
        { value: "room", label: "غرفة" }, { value: "studio", label: "استديو" }, { value: "multi_rooms", label: "غرف متعددة" },
        { value: "apartment", label: "شقة" }, { value: "villa", label: "فيلا" }, { value: "palace", label: "قصر" },
        { value: "land", label: "ارض" }, { value: "farm", label: "مزرعة" }, { value: "chalet", label: "شاليه" },
        { value: "building", label: "عمارة" }, { value: "office", label: "مكتب" }, { value: "company", label: "شركة" },
        { value: "shop", label: "محل تجاري" }, { value: "showroom", label: "معرض تجاري" }, { value: "salon", label: "صالون تجميل" },
        { value: "spa", label: "سبا" }, { value: "salon_spa", label: "صالون تجميل وسبا" }, { value: "nursery", label: "مشتل" },
        { value: "flowers", label: "محل ورود" }, { value: "perfume", label: "محل عطور" }, { value: "gifts", label: "محل هدايا" },
        { value: "hotel", label: "فندق" }, { value: "hospital", label: "مستشفى" }, { value: "dispensary", label: "مستوصف" },
        { value: "clinic", label: "عيادة" }, { value: "school", label: "مدرسة" }, { value: "gov", label: "مبنى حكومي" },
        { value: "tower", label: "برج" }, { value: "mall", label: "مول" }, { value: "market", label: "سوق شعبي" },
        { value: "public_garden", label: "حديقة عامة" }, { value: "private_garden", label: "حديقة خاصة" }, { value: "booth", label: "بوث" },
        { value: "workshop", label: "ورشة سيارات" },
    ];

    const designOptions = [
        { value: "int", label: "داخلي" }, { value: "ext", label: "خارجي" }, { value: "land", label: "لاندسكيب" },
        { value: "arch", label: "معماري" }, { value: "int_ext", label: "داخلي وخارجي" }, { value: "int_land", label: "داخلي ولاندسكيب" },
        { value: "int_ext_land", label: "داخلي وخارجي ولاندسكيب" }, { value: "ext_land", label: "خارجي ولاندسكيب" }, { value: "int_ext_arch", label: "داخلي وخارجي ومعماري" },
    ];

    const styleOptions = [
        { value: "modern", label: "مودرن" }, { value: "classic", label: "كلاسيك" }, { value: "neoclassic", label: "نيو كلاسيك" },
        { value: "boho", label: "بوهيمي" }, { value: "minimal", label: "مينيمل" }, { value: "industrial", label: "صناعي" },
        { value: "folk", label: "شعبي" }, { value: "najdi", label: "نجدي" }, { value: "hijazi", label: "حجازي" }, { value: "islamic", label: "إسلامي" },
    ];

    return (
        <div className="invoice-page print-view-container print-only">
            {/* Header */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '5px' }}>
                <div style={{ width: '30%' }}>
                    <div className="logo-placeholder">
                        <img src={LOGO_BASE64} alt="Logo" style={{ maxHeight: '100px', objectFit: 'contain' }}
                            onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
                    </div>
                </div>
                <div style={{ width: '65%', textAlign: 'left' }}>
                    <h1 style={{ color: 'var(--primary-color)' }}>GOLDEN TOUCH <span style={{ color: 'var(--grey-color)' }}>DESIGN</span></h1>
                    <h3>شركة اللمسة الذهبية للتصميم</h3>
                    <p style={{ margin: '0 0 5px 0', fontSize: '12px', fontWeight: 'bold', color: '#555' }}>سجل تجاري C.R. 7017891396</p>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid #ccc', paddingBottom: '2px' }}>
                        <span style={{ fontSize: '12px', color: '#555' }}><strong>الرقم:</strong> {props.serialNumber}</span>
                        <span style={{ fontSize: '12px', color: '#555' }}>| {props.issueDate}</span>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', flex: 1, textAlign: 'left' }}>
                            {props.docType === 'invoice' ? 'عرض سعر وفاتورة سداد' : props.docType === 'quote' ? 'عرض سعر' : 'فاتورة سداد'}
                        </span>
                    </div>
                </div>
            </header>

            {/* Client Data */}
            <section>
                <h2>بيانات العميل</h2>
                <div className="invoice-form-row">
                    <div className="invoice-form-group"><label>اسم العميل</label><div className="print-field">{props.clientName}</div></div>
                    <div className="invoice-form-group"><label>رقم الجوال</label><div className="print-field" style={{ direction: 'ltr', textAlign: 'right' }}>{props.clientPhone}</div></div>
                    <div className="invoice-form-group"><label>المدينة \ الحي</label><div className="print-field">{props.clientCity}</div></div>
                </div>
            </section>

            {/* Project Data */}
            <section>
                <h2>بيانات المشروع</h2>
                <div className="invoice-form-row">
                    <div className="invoice-form-group">
                        <label>طبيعة المشروع</label>
                        <div className="print-field">{getSelectLabel(props.projectNature, natureOptions, props.otherProjectNature)}</div>
                    </div>
                    <div className="invoice-form-group">
                        <label>طبيعة الموقع</label>
                        <div className="print-field">{getSelectLabel(props.siteNature, siteOptions, props.otherSiteNature)}</div>
                    </div>
                </div>

                <div className="invoice-form-row">
                    <div className="invoice-form-group">
                        <label>التصميم المطلوب</label>
                        <div className="print-field">{getSelectLabel(props.designReq, designOptions, props.otherDesignReq)}</div>
                    </div>
                    <div className="invoice-form-group">
                        <label>الاستايل</label>
                        <div className="print-field">{getSelectLabel(props.style, styleOptions, props.otherStyle)}</div>
                    </div>
                </div>


            </section>

            {/* Services */}


            {/* Pricing */}
            <section style={{ marginTop: '10px' }}>
                <h2>الكميات والاسعار</h2>
                <div className="table-responsive">
                    <table className="invoice-table">
                        <thead>
                            <tr>
                                <th style={{ width: '5%' }}>#</th>
                                <th style={{ width: '35%' }}>وصف الخدمة</th>
                                <th style={{ width: '10%' }}>الوحدة</th>
                                <th style={{ width: '10%' }}>الكمية</th>
                                <th style={{ width: '15%' }}>السعر</th>
                                <th style={{ width: '10%' }}>الخصم %</th>
                                <th style={{ width: '15%' }}>الاجمالي</th>
                            </tr>
                        </thead>
                        <tbody>
                            {props.items.map((item, index) => (
                                <tr key={item.id}>
                                    <td>{index + 1}</td>
                                    <td style={{ textAlign: 'right', whiteSpace: 'pre-wrap' }}>{item.description}</td>
                                    <td>{item.unit === 'meter' ? 'متر' : item.unit === 'piece' ? 'قطعة' : 'مشروع'}</td>
                                    <td>{item.quantity}</td>
                                    <td>{item.price}</td>
                                    <td>{item.discount}</td>
                                    <td>{props.calculateRowTotal(item).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="totals-section">
                    <div className="total-row"><span>المجموع:</span><span>{props.subtotal.toFixed(2)}</span></div>
                    {props.taxEnabled && (
                        <div className="total-row"><span>ضريبة (15%):</span><span>{props.vatAmount.toFixed(2)}</span></div>
                    )}
                    <div className="total-row" style={{ fontSize: '14px', borderTop: '1px solid #333' }}>
                        <span>الإجمالي النهائي:</span><span>{props.grandTotal.toFixed(2)} ريال سعودي</span>
                    </div>
                </div>
            </section>

            {/* Payment & Terms */}
            <section style={{ marginTop: '5px' }}>
                <div className="invoice-form-row">
                    <div className="invoice-form-group">
                        <label>وسائل الدفع</label>
                        <div className="checkbox-group">
                            {Object.keys(props.paymentMethods).map((k) => (
                                <label className="checkbox-item" key={k}>
                                    <input type="checkbox" checked={props.paymentMethods[k]} readOnly />
                                    {k === 'tamara' ? 'تمارا (تقسيط)' : k === 'mispay' ? 'MISpay (تقسيط)' : k === 'stcpay' ? 'STCpay' : k === 'visa' ? 'فيزا (تقسيط)' : k === 'mada' ? 'مدى' : k === 'bank' ? 'تحويل بنكي' : k === 'pos' ? 'شبكة' : 'نقدي'}
                                </label>
                            ))}
                        </div>
                        <div style={{ marginTop: '5px', fontSize: '11px' }}>
                            <strong>الدفعات:</strong> {
                                props.paymentTermType === '50-50' ? '50%-50% | دفعة اولى - دفعة ثانية بعد رفع 3D' :
                                    props.paymentTermType === '50-25-25' ? '50%-25%-25% | دفعة اولى - دفعة ثانية بعد رفع 2D - دفعة ثالثة' :
                                        'دفعة مقدمة 100%'
                            }
                        </div>
                    </div>
                </div>

                <div style={{ background: '#fffbe6', padding: '10px', border: '1px solid #ffe58f', marginTop: '10px' }}>
                    <h4>الشروط والاحكام</h4>
                    <ul className="terms-ul">
                        <li>عرض السعر صالح حتى <strong>{props.isCustomValidity ? props.validityPeriod : props.validityPeriod}</strong> من تاريخ إصداره.</li>
                        <li>مدة التصميم <strong>{props.isCustomDuration ? props.designDuration : props.designDuration}</strong>.</li>
                        <li>مدة جلسات التعديل الخاصة بالعميل لا تدرج ضمن الفترة المحسوبة.</li>
                        <li>يحق للعميل الغاء الطلب قبل المباشرة ويحتسب رسوم <strong>{props.isCustomFee ? props.cancellationFee : props.cancellationFee}</strong>.</li>
                        {props.customTerms.map((t, i) => <li key={i}>{t}</li>)}
                    </ul>
                </div>
            </section>

            <footer className="invoice-footer">
                <div style={{ height: '4px', background: 'linear-gradient(90deg, #ccc, #bfa670)', marginBottom: '10px', width: '100%' }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div className="barcode-placeholder" style={{ height: '80px', width: '150px' }}>
                        <img src={BARCODE_BASE64} alt="Barcode" style={{ height: '60px', width: 'auto' }} />
                    </div>
                    <div style={{ textAlign: 'right', order: 1, width: '70%' }}>
                        <p style={{ fontSize: '14px', marginBottom: '5px', color: 'var(--secondary-color)' }}><strong>شركة اللمسة الذهبية للتصميم | GOLDEN TOUCH DESIGN</strong></p>
                        <p style={{ margin: '4px 0', fontSize: '12px', fontWeight: 'bold' }}>الرياض, حي السفارات, مربع الفزاري, مبنى 3293, بوابة 5 <br /> سجل تجاري C . R . 7017891396</p>
                        <p style={{ margin: '0', fontSize: '10px' }}>500511616 00966 - WWW.GOLDEN-TOUCH.NET - INFO@GOLDEN-TOUCH.NET</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};
