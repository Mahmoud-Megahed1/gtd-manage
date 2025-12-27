
import React, { useState, useEffect } from 'react';
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation, useSearch } from "wouter";

import './IntegratedInvoiceForm.css';
import { InvoicePrintView } from './InvoicePrintView';
import { INVOICE_CSS } from '../utils/invoiceCss';
import { useRef } from 'react';

// Types
type InvoiceItem = {
    id: string;
    description: string;
    unit: 'meter' | 'piece' | 'project';
    quantity: number;
    price: number;
    discount: number;
};

type PaymentMethod = 'tamara' | 'mispay' | 'visa' | 'mada' | 'stcpay' | 'bank' | 'pos' | 'cash';

export default function IntegratedInvoiceForm() {
    const [, setLocation] = useLocation();
    const searchString = useSearch();
    const searchParams = new URLSearchParams(searchString);
    const editId = searchParams.get("id") ? Number(searchParams.get("id")) : undefined;

    const printRef = useRef<HTMLDivElement>(null);

    const [docType, setDocType] = useState<"invoice" | "quote">("invoice");
    const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);

    // Client Info
    const [clientId, setClientId] = useState<number>(0);
    const [clientName, setClientName] = useState("");
    const [clientPhone, setClientPhone] = useState("");
    const [clientCity, setClientCity] = useState("");

    // Project Info
    const [projectId, setProjectId] = useState<number | undefined>(undefined);
    const [projectNature, setProjectNature] = useState<string>("");
    const [otherProjectNature, setOtherProjectNature] = useState(""); // if manual input

    const [siteNature, setSiteNature] = useState("");
    const [otherSiteNature, setOtherSiteNature] = useState("");

    const [designReq, setDesignReq] = useState("");
    const [otherDesignReq, setOtherDesignReq] = useState("");

    const [style, setStyle] = useState("");
    const [otherStyle, setOtherStyle] = useState("");

    const [projectLocation, setProjectLocation] = useState("");
    const [floors, setFloors] = useState("");
    const [area, setArea] = useState("");
    const [electricMeter, setElectricMeter] = useState("");
    const [notes, setNotes] = useState("");

    // Services Lists
    const [services, setServices] = useState<Record<string, boolean>>({});
    const [genericServices, setGenericServices] = useState<string[]>([]); // For "Generic/Other" list

    // Items
    const [items, setItems] = useState<InvoiceItem[]>([
        { id: '1', description: '', unit: 'meter', quantity: 0, price: 0, discount: 0 }
    ]);

    // Payment & Terms
    const [paymentMethods, setPaymentMethods] = useState<Record<PaymentMethod, boolean>>({
        tamara: false, mispay: false, visa: false, mada: false,
        stcpay: false, bank: false, pos: false, cash: false
    });

    const [paymentTermType, setPaymentTermType] = useState("50-50");

    // Terms with "Other" logic
    const [validityPeriod, setValidityPeriod] = useState("يوم واحد");
    const [isCustomValidity, setIsCustomValidity] = useState(false);

    const [designDuration, setDesignDuration] = useState("لكل فراغ مدة تتراوح بين 2 و 5 ايام وفقا لعدد المساحات ");
    const [isCustomDuration, setIsCustomDuration] = useState(false);

    const [cancellationFee, setCancellationFee] = useState("زيارة واستشارة");
    const [isCustomFee, setIsCustomFee] = useState(false);

    // New editable terms
    const [modificationTerms, setModificationTerms] = useState("مدة جلسات التعديل الخاصة بالعميل لا تدرج ضمن الفترة المحسوبة.");
    const [additionalWorkTerms, setAdditionalWorkTerms] = useState("أي اعمال إضافية او تعديلات لا تدرج ضمن الفترة المحسوبة.");

    const [customTerms, setCustomTerms] = useState<string[]>([]);

    // Tax Settings
    const [taxEnabled, setTaxEnabled] = useState(true);
    const [serialNumber, setSerialNumber] = useState("");

    // Fetch existing invoice if in Edit Mode
    const { data: existingInvoice, isLoading: isLoadingInvoice } = trpc.invoices.getById.useQuery(
        { id: editId! },
        { enabled: !!editId }
    );

    // Populate form if editing
    useEffect(() => {
        if (existingInvoice && existingInvoice.invoice) {
            const inv = existingInvoice.invoice;
            setSerialNumber(inv.invoiceNumber);
            setIssueDate(new Date(inv.issueDate).toISOString().split('T')[0]);
            setDocType(inv.type as any);
            setClientId(inv.clientId || 0);
            if (existingInvoice.client) {
                setClientName(existingInvoice.client.name);
                setClientPhone(existingInvoice.client.phone || "");
                setClientCity(existingInvoice.client.city || existingInvoice.client.address || "");
            }
            if (inv.projectId) setProjectId(inv.projectId);
            setNotes(inv.notes || "");

            // Tax
            setTaxEnabled(inv.tax > 0);

            // Items
            if (existingInvoice.items) {
                const mappedItems = existingInvoice.items.map((it: any) => ({
                    id: Math.random().toString(36).substr(2, 9),
                    description: it.description,
                    unit: 'meter', // Default as stored items might not have unit
                    quantity: it.quantity,
                    price: it.unitPrice,
                    discount: 0 // If discount stored separately or calculated, adjust
                }));
                setItems(mappedItems as any);
            }

            // Form Data
            if (inv.formData) {
                try {
                    const fd = typeof inv.formData === 'string' ? JSON.parse(inv.formData) : inv.formData;
                    if (fd.projectNature) setProjectNature(fd.projectNature);
                    if (fd.otherProjectNature) setOtherProjectNature(fd.otherProjectNature);
                    if (fd.siteNature) setSiteNature(fd.siteNature);
                    if (fd.otherSiteNature) setOtherSiteNature(fd.otherSiteNature);
                    if (fd.designReq) setDesignReq(fd.designReq);
                    if (fd.otherDesignReq) setOtherDesignReq(fd.otherDesignReq);
                    if (fd.style) setStyle(fd.style);
                    if (fd.otherStyle) setOtherStyle(fd.otherStyle);

                    if (fd.paymentMethods) setPaymentMethods(fd.paymentMethods);
                    if (fd.paymentTermType) setPaymentTermType(fd.paymentTermType);

                    if (fd.validityPeriod) setValidityPeriod(fd.validityPeriod);
                    if (fd.isCustomValidity) setIsCustomValidity(fd.isCustomValidity);

                    if (fd.designDuration) setDesignDuration(fd.designDuration);
                    if (fd.isCustomDuration) setIsCustomDuration(fd.isCustomDuration);

                    if (fd.cancellationFee) setCancellationFee(fd.cancellationFee);
                    if (fd.isCustomFee) setIsCustomFee(fd.isCustomFee);

                    if (fd.modificationTerms) setModificationTerms(fd.modificationTerms);
                    if (fd.additionalWorkTerms) setAdditionalWorkTerms(fd.additionalWorkTerms);

                    if (fd.customTerms) setCustomTerms(fd.customTerms);
                } catch (e) {
                    console.error("Failed to parse form data", e);
                }
            }
        }
    }, [existingInvoice]);

    // Auto-generate Serial Number ONLY if NOT editing
    useEffect(() => {
        if (!editId && (!serialNumber || serialNumber === '(Auto-generated)')) {
            const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
            const randomPart = Math.floor(1000 + Math.random() * 9000);
            setSerialNumber(`INV-${datePart}-${randomPart}`);
        }
    }, [editId]);



    // API
    // API
    const createInvoice = trpc.invoices.create.useMutation();
    const updateInvoice = trpc.invoices.update.useMutation();

    const { data: clients } = trpc.clients.list.useQuery();
    const { data: clientProjects } = trpc.projects.list.useQuery(
        { clientId: clientId || undefined },
        { enabled: !!clientId }
    );

    // Calculations
    const calculateRowTotal = (item: InvoiceItem) => {
        let total = item.quantity * item.price;
        if (item.discount > 0) {
            total = total - (total * (item.discount / 100));
        }
        return total;
    };

    const subtotal = items.reduce((sum, item) => sum + calculateRowTotal(item), 0);

    const vatRate = taxEnabled ? 0.15 : 0;
    const vatAmount = subtotal * vatRate;
    const grandTotal = subtotal + vatAmount;

    // Handlers
    const handleAddItem = () => {
        setItems([...items, {
            id: Math.random().toString(36).substr(2, 9),
            description: '', unit: 'meter', quantity: 0, price: 0, discount: 0
        }]);
    };

    const handleDeleteItem = (id: string) => {
        if (items.length > 1) setItems(items.filter(item => item.id !== id));
    };

    const handleUpdateItem = (id: string, field: keyof InvoiceItem, value: any) => {
        setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const handleAddGenericService = () => {
        setGenericServices([...genericServices, ""]);
    };

    const handleSave = async (isDraft: boolean) => {
        try {
            const formData = {
                clientName, clientPhone, clientCity,
                projectNature, otherProjectNature,
                siteNature, otherSiteNature,
                designReq, otherDesignReq,
                style, otherStyle,
                projectLocation, floors, area, electricMeter, notes,
                services, genericServices,
                paymentMethods, paymentTermType,
                validityPeriod, designDuration, cancellationFee, customTerms,
                isCustomValidity, isCustomDuration, isCustomFee,
                modificationTerms, additionalWorkTerms,
                generatedBy: "System_V2"
            };

            const dbItems = items.map(item => ({
                description: item.description,
                quantity: Number(item.quantity),
                unitPrice: Number(item.price),
                total: calculateRowTotal(item)
            }));

            if (editId) {
                // UPDATE
                await updateInvoice.mutateAsync({
                    id: editId,
                    type: docType,
                    clientId: clientId || undefined,
                    projectId: projectId,
                    issueDate: new Date(issueDate),
                    subtotal: subtotal,
                    tax: vatAmount,
                    total: grandTotal,
                    notes: notes,
                    terms: JSON.stringify(customTerms),
                    formData: JSON.stringify(formData),
                    items: dbItems
                });
                toast.success("تم تحديث الفاتورة بنجاح");
            } else {
                // CREATE
                await createInvoice.mutateAsync({
                    type: docType,
                    clientId: clientId || 1,
                    projectId: projectId,
                    invoiceNumber: serialNumber,
                    issueDate: new Date(issueDate),
                    subtotal: subtotal,
                    tax: vatAmount,
                    total: grandTotal,
                    notes: notes,
                    terms: JSON.stringify(customTerms),
                    formData: JSON.stringify(formData),
                    items: dbItems
                });
                toast.success(isDraft ? "تم حفظ المسودة" : "تم إنشاء المستند بنجاح");
            }

            if (!isDraft) setLocation("/invoices");
        } catch (error) {
            console.error(error);
            toast.error("حدث خطأ أثناء الحفظ");
        }
    };

    // Lists from HTML
    // Lists from HTML
    const designServicesList = [
        "تصميم ثنائي الابعاد 2D", "تصميم ثلاثي الابعاد 3D", "رسوم تنفيذية", "جلسة تعديل لكل مرحلة",
        "تعيين الاثاث", "تعيين الديكور", "تعيين التشطيبات", "صور واقعية لكامل التصميم",
        "فيديو واقعي لكامل التصميم", "خصم%50 على جولة VR الواقع الافتراضي"
    ];

    const executionServicesList = [
        "ديكور جدران وارضيات", "ديكور جبس بورد", "ديكور جبس زخرفي", "اثاث غرف نوم وخزائن",
        "اثاث كنب وستائر", "اثاث طاولات طعام وخدمة", "اثاث سجاد وموكيت", "تشطيبات دهانات ولياسة",
        "تشطيبات كهرباء وسباكة", "تشطيبات أبواب ونوافذ(خشب والمنيوم)", "تشطيبات بلاط وحجر",
        "عظم خرسانة وحديد", "هدم وتكسير/إزالة وترحيل", "لاندسكيب ومظلات"
    ];

    return (
        <div className="invoice-form-container">


            <div className="invoice-page" id="invoice-content">
                {/* Header */}
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '5px' }}>
                    <div style={{ width: '30%' }}>
                        <div className="logo-placeholder">
                            <img src="/logo.png" alt="Logo" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                                onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
                        </div>
                    </div>
                    <div style={{ width: '65%', textAlign: 'left' }}>
                        <h1 style={{ color: 'var(--primary-color)' }}>GOLDEN TOUCH <span style={{ color: 'var(--grey-color)' }}>DESIGN</span></h1>
                        <h3>شركة اللمسة الذهبية للتصميم</h3>
                        <p style={{ margin: '0 0 5px 0', fontSize: '12px', fontWeight: 'bold', color: '#555' }}>سجل تجاري C.R. 7017891396</p>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid #ccc', paddingBottom: '2px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '10px', color: '#777' }}>الرقم المتسلسل</span>
                                <span style={{ fontWeight: 'bold', minWidth: '100px' }}>{serialNumber}</span>
                            </div>
                            <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} style={{ width: 'auto' }} />
                            <select value={docType} onChange={(e) => setDocType(e.target.value as any)} style={{ fontWeight: 'bold', flex: 1 }}>
                                <option value="invoice">عرض سعر وفاتورة سداد</option>
                                <option value="quote">عرض سعر</option>
                                <option value="payment_invoice">فاتورة سداد</option>
                            </select>
                        </div>
                    </div>
                </header>

                {/* Client Data */}
                <section>
                    <h2>بيانات العميل</h2>
                    <div className="invoice-form-row">
                        <div className="invoice-form-group">
                            <label>اختيار عميل</label>
                            <select value={clientId} onChange={(e) => {
                                const cid = Number(e.target.value);
                                setClientId(cid);
                                const c = clients?.find((cl: any) => cl.id === cid);
                                if (c) {
                                    setClientName(c.name || "");
                                    setClientPhone(c.phone || "");
                                    setClientCity(c.city || c.address || "");
                                }
                            }}>
                                <option value={0}>عميل جديد / غير مسجل</option>
                                {clients?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="invoice-form-group"><label>اسم العميل</label><input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} /></div>
                        <div className="invoice-form-group"><label>رقم الجوال</label><input type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} /></div>
                        <div className="invoice-form-group"><label>المدينة \ الحي</label><input type="text" value={clientCity} onChange={(e) => setClientCity(e.target.value)} /></div>
                    </div>
                </section>

                {/* Project Data */}
                <section>
                    <h2>بيانات المشروع</h2>
                    <div className="invoice-form-row">
                        <div className="invoice-form-group">
                            <label>اختيار مشروع (اختياري)</label>
                            <select
                                value={projectId || ""}
                                onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : undefined)}
                                disabled={!clientId}
                            >
                                <option value="">بدون مشروع للعميل المحدد</option>
                                {clientProjects?.map((p: any) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            {!clientId && <small style={{ color: '#888' }}>يرجى اختيار عميل أولاً</small>}
                        </div>
                    </div>

                    <div className="invoice-form-row">
                        <div className="invoice-form-group">
                            <label>طبيعة المشروع</label>
                            <select value={projectNature} onChange={(e) => setProjectNature(e.target.value)}>
                                <option value="">اختر...</option>
                                <option value="design">تصميم</option>
                                <option value="execution">تنفيذ</option>
                                <option value="visit">استشارة في موقع المشروع</option>
                                <option value="office">استشارة في المكتب</option>
                                <option value="online">استشارة اونلاين</option>
                                <option value="other">مخصص</option>
                            </select>
                            {projectNature === 'other' && <input type="text" className="other-input" placeholder="حدد..." value={otherProjectNature} onChange={(e) => setOtherProjectNature(e.target.value)} />}
                        </div>

                        <div className="invoice-form-group">
                            <label>طبيعة الموقع</label>
                            <select value={siteNature} onChange={(e) => setSiteNature(e.target.value)}>
                                <option value="">اختر...</option>
                                <option value="room">غرفة</option>
                                <option value="studio">استديو</option>
                                <option value="multi_rooms">غرف متعددة</option>
                                <option value="apartment">شقة</option>
                                <option value="villa">فيلا</option>
                                <option value="palace">قصر</option>
                                <option value="land">ارض</option>
                                <option value="farm">مزرعة</option>
                                <option value="chalet">شاليه</option>
                                <option value="building">عمارة</option>
                                <option value="office">مكتب</option>
                                <option value="company">شركة</option>
                                <option value="shop">محل تجاري</option>
                                <option value="showroom">معرض تجاري</option>
                                <option value="salon">صالون تجميل</option>
                                <option value="spa">سبا</option>
                                <option value="salon_spa">صالون تجميل وسبا</option>
                                <option value="nursery">مشتل</option>
                                <option value="flowers">محل ورود</option>
                                <option value="perfume">محل عطور</option>
                                <option value="gifts">محل هدايا</option>
                                <option value="hotel">فندق</option>
                                <option value="hospital">مستشفى</option>
                                <option value="dispensary">مستوصف</option>
                                <option value="clinic">عيادة</option>
                                <option value="school">مدرسة</option>
                                <option value="gov">مبنى حكومي</option>
                                <option value="tower">برج</option>
                                <option value="mall">مول</option>
                                <option value="market">سوق شعبي</option>
                                <option value="public_garden">حديقة عامة</option>
                                <option value="private_garden">حديقة خاصة</option>
                                <option value="booth">بوث</option>
                                <option value="workshop">ورشة سيارات</option>
                                <option value="other">مخصص</option>
                            </select>
                            {siteNature === 'other' && <input type="text" className="other-input" placeholder="حدد..." value={otherSiteNature} onChange={(e) => setOtherSiteNature(e.target.value)} />}
                        </div>

                        <div className="invoice-form-group">
                            <label>المطلوب تصميمه</label>
                            <select value={designReq} onChange={(e) => setDesignReq(e.target.value)}>
                                <option value="">اختر...</option>
                                <option value="int">داخلي</option>
                                <option value="ext">خارجي</option>
                                <option value="land">لاندسكيب</option>
                                <option value="arch">معماري</option>
                                <option value="int_ext">داخلي وخارجي</option>
                                <option value="int_land">داخلي ولاندسكيب</option>
                                <option value="int_ext_land">داخلي وخارجي ولاندسكيب</option>
                                <option value="ext_land">خارجي ولاندسكيب</option>
                                <option value="int_ext_arch">داخلي وخارجي ومعماري</option>
                                <option value="other">مخصص</option>
                            </select>
                            {designReq === 'other' && <input type="text" className="other-input" placeholder="حدد..." value={otherDesignReq} onChange={(e) => setOtherDesignReq(e.target.value)} />}
                        </div>

                        <div className="invoice-form-group">
                            <label>الاستايل</label>
                            <select value={style} onChange={(e) => setStyle(e.target.value)}>
                                <option value="">اختر...</option>
                                <option value="modern">مودرن</option>
                                <option value="classic">كلاسيك</option>
                                <option value="neoclassic">نيو كلاسيك</option>
                                <option value="boho">بوهيمي</option>
                                <option value="minimal">مينيمل</option>
                                <option value="industrial">صناعي</option>
                                <option value="folk">شعبي</option>
                                <option value="najdi">نجدي</option>
                                <option value="hijazi">حجازي</option>
                                <option value="islamic">إسلامي</option>
                                <option value="other">مخصص</option>
                            </select>
                            {style === 'other' && <input type="text" className="other-input" placeholder="حدد..." value={otherStyle} onChange={(e) => setOtherStyle(e.target.value)} />}
                        </div>
                    </div>



                </section>



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
                                    <th className="no-print" style={{ width: '5%' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, index) => (
                                    <tr key={item.id}>
                                        <td>{index + 1}</td>
                                        <td><textarea value={item.description} onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)} rows={1} /></td>
                                        <td>
                                            <select value={item.unit} onChange={(e) => handleUpdateItem(item.id, 'unit', e.target.value as any)}>
                                                <option value="meter">متر</option><option value="piece">قطعة</option><option value="project">مشروع</option>
                                            </select>
                                        </td>
                                        <td><input type="number" value={item.quantity} onChange={(e) => handleUpdateItem(item.id, 'quantity', e.target.value)} /></td>
                                        <td><input type="number" value={item.price} onChange={(e) => handleUpdateItem(item.id, 'price', e.target.value)} /></td>
                                        <td><input type="number" value={item.discount} onChange={(e) => handleUpdateItem(item.id, 'discount', e.target.value)} /></td>
                                        <td><input type="text" value={calculateRowTotal(item).toFixed(2)} readOnly /></td>
                                        <td className="no-print"><button className="row-action" onClick={() => handleDeleteItem(item.id)}>&times;</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <button className="add-row-btn no-print" onClick={handleAddItem}>+ إضافة بند</button>
                    </div>

                    <div className="totals-section">
                        <div className="total-row"><span>المجموع:</span><span>{subtotal.toFixed(2)}</span></div>
                        <div className="total-row">
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                ضريبة (15%):
                                <input type="checkbox" className="no-print" checked={taxEnabled} onChange={(e) => setTaxEnabled(e.target.checked)} />
                            </span>
                            <span>{vatAmount.toFixed(2)}</span>
                        </div>
                        <div className="total-row" style={{ fontSize: '16px', borderTop: '2px solid #333' }}>
                            <span>الإجمالي النهائي:</span>
                            <span>{grandTotal.toFixed(2)} ريال سعودي</span>
                        </div>
                    </div>
                </section>

                {/* Payment & Terms */}
                <section>
                    <div className="invoice-form-row">
                        <div className="invoice-form-group">
                            <label>وسائل الدفع</label>
                            <div className="checkbox-group">
                                {Object.keys(paymentMethods).map((k) => (
                                    <label className="checkbox-item" key={k}>
                                        <input type="checkbox" checked={paymentMethods[k as PaymentMethod]} onChange={e => setPaymentMethods({ ...paymentMethods, [k]: e.target.checked })} />
                                        {k === 'tamara' ? 'تمارا (تقسيط)' : k === 'mispay' ? 'MISpay (تقسيط)' : k === 'stcpay' ? 'STCpay' : k === 'visa' ? 'فيزا (تقسيط)' : k === 'mada' ? 'مدى' : k === 'bank' ? 'تحويل بنكي' : k === 'pos' ? 'شبكة' : 'نقدي'}
                                    </label>
                                ))}
                            </div>
                            <div style={{ marginTop: '5px' }}>
                                <label>الدفعات في حال اختيار سداد نقدي او تحويل بنكي:</label>
                                <select value={paymentTermType} onChange={(e) => setPaymentTermType(e.target.value)} style={{ width: '100%', border: '1px solid #777' }}>
                                    <option value="50-50">50%-50% | دفعة اولى - دفعة ثانية بعد رفع 3D</option>
                                    <option value="50-25-25">50%-25%-25% | دفعة اولى - دفعة ثانية بعد رفع 2D - دفعة ثالثة</option>
                                    <option value="100">دفعة مقدمة 100%</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div style={{ background: '#fffbe6', padding: '10px', border: '1px solid #ffe58f', marginTop: '10px' }}>
                        <h4>الشروط والاحكام</h4>
                        <ul className="terms-ul">
                            <li>
                                عرض السعر صالح حتى
                                <select value={isCustomValidity ? "other" : validityPeriod} onChange={(e) => {
                                    if (e.target.value === 'other') setIsCustomValidity(true);
                                    else { setIsCustomValidity(false); setValidityPeriod(e.target.value); }
                                }} style={{ width: 'auto', margin: '0 5px' }}>
                                    <option value="يوم واحد">يوم واحد</option>
                                    <option value="ثلاثة أيام">3 أيام</option>
                                    <option value="سبعة أيام">7 أيام</option>
                                    <option value="14 يوم">14 يوم</option>
                                    <option value="30 يوم">30 يوم</option>
                                    <option value="other">مخصص</option>
                                </select>
                                {isCustomValidity && <input type="text" className="other-input" style={{ width: '80px', display: 'inline-block' }} value={validityPeriod} onChange={(e) => setValidityPeriod(e.target.value)} />}
                                من تاريخ إصداره.
                            </li>
                            <li>
                                مدة التصميم
                                <select value={isCustomDuration ? "other" : designDuration} onChange={(e) => {
                                    if (e.target.value === 'other') setIsCustomDuration(true);
                                    else { setIsCustomDuration(false); setDesignDuration(e.target.value); }
                                }} style={{ width: 'auto', margin: '0 5px', maxWidth: '300px' }}>
                                    <option value="لكل فراغ مدة تتراوح بين 2 و 5 ايام وفقا لعدد المساحات ">لكل فراغ 2-5 أيام...</option>
                                    <option value="ثلاثة أيام من تاريخ سداد الدفعة الأولى">3 أيام من الدفعة الأولى</option>
                                    <option value="سبعة أيام من تاريخ سداد الدفعة الأولى">7 أيام من الدفعة الأولى</option>
                                    <option value="14 يوم من تاريخ سداد الدفعة الأولى">14 يوم من الدفعة الأولى</option>
                                    <option value="30 يوم من تاريخ سداد الدفعة الأولى">30 يوم من الدفعة الأولى</option>
                                    <option value="other">مخصص</option>
                                </select>
                                {isCustomDuration && <input type="text" className="other-input" style={{ width: '150px', display: 'inline-block' }} value={designDuration} onChange={(e) => setDesignDuration(e.target.value)} />}
                                .
                            </li>
                            <li>
                                <input type="text" style={{ width: '100%' }} value={modificationTerms} onChange={(e) => setModificationTerms(e.target.value)} />
                            </li>
                            <li>
                                <input type="text" style={{ width: '100%' }} value={additionalWorkTerms} onChange={(e) => setAdditionalWorkTerms(e.target.value)} />
                            </li>
                            <li>
                                يحق للعميل الغاء الطلب قبل المباشرة ويحتسب رسوم
                                <select value={isCustomFee ? "other" : cancellationFee} onChange={(e) => {
                                    if (e.target.value === 'other') setIsCustomFee(true);
                                    else { setIsCustomFee(false); setCancellationFee(e.target.value); }
                                }} style={{ width: 'auto', margin: '0 5px' }}>
                                    <option value="زيارة واستشارة">زيارة واستشارة</option>
                                    <option value="رفع مساحي">رفع مساحي</option>
                                    <option value="تسعير">تسعير</option>
                                    <option value="لايوجد رسوم">لا يوجد</option>
                                    <option value="other">مخصص</option>
                                </select>
                                {isCustomFee && <input type="text" className="other-input" style={{ width: '100px', display: 'inline-block' }} value={cancellationFee} onChange={(e) => setCancellationFee(e.target.value)} />}
                                .
                            </li>
                            {customTerms.map((t, i) => (
                                <li key={i}>{t} <span className="no-print" style={{ color: 'red', cursor: 'pointer' }} onClick={() => setCustomTerms(customTerms.filter((_, x) => x !== i))}>[x]</span></li>
                            ))}
                        </ul>
                        <div className="no-print" style={{ marginTop: '5px' }}>
                            <input type="text" placeholder="اضافة شرط..." onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    setCustomTerms([...customTerms, (e.target as HTMLInputElement).value]);
                                    (e.target as HTMLInputElement).value = '';
                                }
                            }} style={{ width: '100%' }} />
                        </div>
                    </div>
                </section>

                <footer className="invoice-footer print-only-section">

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div className="barcode-placeholder" style={{ order: 2, height: '100px', width: '200px', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                            <img src="/barcode.jpg" alt="Barcode" style={{ height: '80px', width: 'auto' }} />
                        </div>
                        <div style={{ textAlign: 'right', order: 1, width: '70%' }}>
                            <p style={{ fontSize: '16px', marginBottom: '5px', color: 'var(--secondary-color)' }}><strong>شركة اللمسة الذهبية للتصميم | GOLDEN TOUCH DESIGN</strong></p>
                            <p style={{ margin: '4px 0', fontSize: '14px', fontWeight: 'bold' }}>الرياض, حي السفارات, مربع الفزاري, مبنى 3293, بوابة 5 <br /> سجل تجاري C . R . 7017891396</p>
                            <p style={{ margin: '0', fontSize: '12px' }}>500511616 00966 - WWW.GOLDEN-TOUCH.NET - INFO@GOLDEN-TOUCH.NET</p>
                        </div>
                    </div>
                </footer>
            </div >


            <div className="invoice-action-bar no-print">
                <button className="invoice-btn" onClick={() => handleSave(false)}>
                    <i className="fas fa-save"></i> حفظ
                </button>
                <button className="invoice-btn" onClick={async () => {
                    if (!printRef.current) return;

                    // Clone the element to not modify the visible one
                    const clone = printRef.current.cloneNode(true) as HTMLElement;
                    const images = clone.querySelectorAll('img');

                    // Convert all images to Base64
                    await Promise.all(Array.from(images).map(async (img) => {
                        try {
                            // If it's already a data URL, we don't need to fetch it
                            if (img.src.startsWith('data:')) return;

                            const response = await fetch(img.src);
                            const blob = await response.blob();
                            return new Promise((resolve) => {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                    if (reader.result) {
                                        img.src = reader.result as string;
                                    }
                                    resolve(null);
                                };
                                reader.readAsDataURL(blob);
                            });
                        } catch (e) {
                            console.error("Failed to convert image", e);
                        }
                    }));

                    // Debugging: Log content length
                    console.log("Clone HTML length:", clone.innerHTML.length);
                    if (clone.innerHTML.length < 500) {
                        alert("Warning: Exported content seems empty. Please check console.");
                        console.log("Clone content:", clone.innerHTML);
                    }

                    const htmlContent = clone.innerHTML;
                    const fullHtml = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice - ${serialNumber}</title>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
        /* FORCE VISIBILITY IN EXPORT */
        .print-view-wrapper, .invoice-print-view, .print-view-container {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            position: relative !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
        }
        ${INVOICE_CSS}
    </style>
</head>
<body style="background-color: white !important; margin: 0; padding: 0;">
    <div class="print-view-wrapper" style="display:block !important; visibility:visible !important; width: 210mm; margin: 0 auto;">
        ${htmlContent}
    </div>
    <script>
        window.onload = function() {
            var wrapper = document.querySelector('.print-view-wrapper');
            if (!wrapper || wrapper.innerHTML.trim().length === 0) {
                alert('Detailed Error: Exported content is empty inside the wrapper.');
            }
        }
    </script>
</body>
</html>`;
                    const blob = new Blob([fullHtml], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `invoice-${serialNumber || 'draft'}.html`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }}>
                    <i className="fas fa-file-code"></i> حفظ كملف HTML
                </button>
                <button className="invoice-btn" onClick={() => window.print()}>
                    <i className="fas fa-print"></i> طباعة / PDF
                </button>
                <button className="invoice-btn invoice-btn-secondary" onClick={() => setLocation("/invoices")}>
                    <i className="fas fa-arrow-right"></i> عودة
                </button>
            </div>

            {/* Print View Component - wrapped for HTML capture */}
            <div className="print-view-wrapper">
                <div ref={printRef}>
                    <InvoicePrintView
                        serialNumber={serialNumber}
                        issueDate={issueDate}
                        docType={docType}
                        clientName={clientName}
                        clientPhone={clientPhone}
                        clientCity={clientCity}
                        projectNature={projectNature}
                        otherProjectNature={otherProjectNature}
                        siteNature={siteNature}
                        otherSiteNature={otherSiteNature}
                        designReq={designReq}
                        otherDesignReq={otherDesignReq}
                        style={style}
                        otherStyle={otherStyle}

                        items={items}
                        calculateRowTotal={calculateRowTotal}
                        subtotal={subtotal}
                        vatAmount={vatAmount}
                        grandTotal={grandTotal}
                        taxEnabled={taxEnabled}
                        paymentMethods={paymentMethods}
                        paymentTermType={paymentTermType}
                        validityPeriod={validityPeriod}
                        isCustomValidity={isCustomValidity}
                        designDuration={designDuration}
                        isCustomDuration={isCustomDuration}
                        cancellationFee={cancellationFee}
                        isCustomFee={isCustomFee}
                        modificationTerms={modificationTerms}
                        additionalWorkTerms={additionalWorkTerms}
                        customTerms={customTerms}
                    />
                </div>
            </div>
        </div >
    );
}
