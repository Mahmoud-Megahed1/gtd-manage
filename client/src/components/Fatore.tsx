import React, { useState, useEffect, useRef } from 'react';
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Printer, Download, Plus, Trash2 } from "lucide-react";
import { generateInvoiceHtml } from "@/utils/generateInvoiceHtml";

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

type CustomServiceItem = {
    id: string;
    text: string;
    checked: boolean;
};

export default function Fatore() {
    const [location, setLocation] = useLocation();
    const searchParams = new URLSearchParams(window.location.search);
    const editId = searchParams.get('id') ? Number(searchParams.get('id')) : null;
    const containerRef = useRef<HTMLDivElement>(null);

    // ---- State ----
    const [docType, setDocType] = useState<"عرض سعر وفاتورة سداد" | "عرض سعر" | "فاتورة سداد">("عرض سعر وفاتورة سداد");
    const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
    const [serialNumber, setSerialNumber] = useState("");

    // Client Info
    const [clientId, setClientId] = useState<number>(0);
    const [clientName, setClientName] = useState("");
    const [clientPhone, setClientPhone] = useState("");
    const [clientCity, setClientCity] = useState("");

    // Project Info
    const [projectId, setProjectId] = useState<number | undefined>(undefined);
    const [projectNature, setProjectNature] = useState<string>("");
    const [otherProjectNature, setOtherProjectNature] = useState("");

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

    // Service Lists Checkboxes
    const [checkedDesignServices, setCheckedDesignServices] = useState<Record<string, boolean>>({});
    const [checkedExecutionServices, setCheckedExecutionServices] = useState<Record<string, boolean>>({});

    // Custom Added Services
    const [customDesignServices, setCustomDesignServices] = useState<CustomServiceItem[]>([]);
    const [customExecutionServices, setCustomExecutionServices] = useState<CustomServiceItem[]>([]);
    const [customGenericServices, setCustomGenericServices] = useState<CustomServiceItem[]>([]);

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
    const [customPaymentSystem, setCustomPaymentSystem] = useState("");

    // Terms with "Other" logic
    const [validityPeriod, setValidityPeriod] = useState("يوم واحد");
    const [isCustomValidity, setIsCustomValidity] = useState(false);

    const [designDuration, setDesignDuration] = useState("لكل فراغ مدة تتراوح بين 2 و 5 ايام وفقا لعدد المساحات ");
    const [isCustomDuration, setIsCustomDuration] = useState(false);

    const [cancellationFee, setCancellationFee] = useState("زيارة واستشارة");
    const [isCustomFee, setIsCustomFee] = useState(false);

    const [customTerms, setCustomTerms] = useState<string[]>([]);

    // Tax Settings
    const [taxEnabled, setTaxEnabled] = useState(true);

    // Image Uploads
    const [images, setImages] = useState<string[]>([]);

    // ---- Predefined Lists Data ----
    const designServicesList = [
        "تصميم ثنائي الابعاد 2D", "تصميم ثلاثي الابعاد 3D", "رسوم تنفيذية",
        "جلسة تعديل لكل مرحلة", "تعيين الاثاث", "تعيين الديكور",
        "تعيين التشطيبات", "صور واقعية لكامل التصميم", "فيديو واقعي لكامل التصميم",
        "خصم%50 على جولة VR الواقع الافتراضي"
    ];

    const executionServicesList = [
        "ديكور جدران وارضيات", "ديكور جبس بورد", "ديكور جبس زخرفي",
        "اثاث غرف نوم وخزائن", "اثاث كنب وستائر", "اثاث طاولات طعام وخدمة",
        "اثاث سجاد وموكيت", "تشطيبات دهانات ولياسة", "تشطيبات كهرباء وسباكة",
        "تشطيبات أبواب ونوافذ(خشب والمنيوم)", "تشطيبات بلاط وحجر",
        "عظم خرسانة وحديد", "هدم وتكسير/إزالة وترحيل", "لاندسكيب ومظلات"
    ];

    // ---- Data Fetching ----
    const createInvoice = trpc.invoices.create.useMutation();
    const updateInvoice = trpc.invoices.update.useMutation();

    const { data: clients } = trpc.clients.list.useQuery();
    // Fetch projects - always enabled, filtered by clientId if one is selected
    const { data: clientProjects, isLoading: isLoadingProjects } = trpc.projects.list.useQuery(
        { clientId: clientId || undefined },
        { enabled: true } // Always fetch - show all projects for "New Client"
    );

    // Fetch existing invoice if in edit mode
    const { data: existingInvoice } = trpc.invoices.getById.useQuery(
        { id: editId! },
        { enabled: !!editId }
    );

    // ---- Effects ----
    useEffect(() => {
        if (existingInvoice && existingInvoice.invoice) {
            const inv = existingInvoice.invoice;
            const client = existingInvoice.client;

            // Basic Fields
            setSerialNumber(inv.invoiceNumber || "");
            setIssueDate(new Date(inv.issueDate).toISOString().split('T')[0]);
            if (client) {
                setClientId(client.id);
                setClientName(client.name);
                setClientPhone(client.phone || "");
                setClientCity(client.city || "");
            }
            if (inv.projectId) setProjectId(inv.projectId);

            // Restore items
            if (existingInvoice.items) {
                setItems(existingInvoice.items.map((i: any) => ({
                    id: Math.random().toString(36).substr(2, 9),
                    description: i.description,
                    unit: 'meter',
                    quantity: i.quantity,
                    price: i.unitPrice,
                    discount: 0
                })));
            }

            // Restore Complex State from formData JSON
            if (inv.formData) {
                try {
                    const data = JSON.parse(inv.formData);
                    if (data.docType) setDocType(data.docType);
                    if (data.projectNature) setProjectNature(data.projectNature);
                    if (data.otherProjectNature) setOtherProjectNature(data.otherProjectNature);
                    if (data.siteNature) setSiteNature(data.siteNature);
                    if (data.otherSiteNature) setOtherSiteNature(data.otherSiteNature);
                    if (data.designReq) setDesignReq(data.designReq);
                    if (data.otherDesignReq) setOtherDesignReq(data.otherDesignReq);
                    if (data.style) setStyle(data.style);
                    if (data.otherStyle) setOtherStyle(data.otherStyle);

                    if (data.projectLocation) setProjectLocation(data.projectLocation);
                    if (data.floors) setFloors(data.floors);
                    if (data.area) setArea(data.area);
                    if (data.electricMeter) setElectricMeter(data.electricMeter);
                    if (data.notes) setNotes(data.notes);

                    if (data.checkedDesignServices) setCheckedDesignServices(data.checkedDesignServices);
                    if (data.checkedExecutionServices) setCheckedExecutionServices(data.checkedExecutionServices);

                    if (data.customDesignServices) setCustomDesignServices(data.customDesignServices);
                    if (data.customExecutionServices) setCustomExecutionServices(data.customExecutionServices);
                    if (data.customGenericServices) setCustomGenericServices(data.customGenericServices);

                    if (data.paymentMethods) setPaymentMethods(data.paymentMethods);
                    if (data.paymentTermType) setPaymentTermType(data.paymentTermType);
                    if (data.customPaymentSystem) setCustomPaymentSystem(data.customPaymentSystem);

                    if (data.validityPeriod) setValidityPeriod(data.validityPeriod);
                    if (data.isCustomValidity) setIsCustomValidity(data.isCustomValidity);

                    if (data.designDuration) setDesignDuration(data.designDuration);
                    if (data.isCustomDuration) setIsCustomDuration(data.isCustomDuration);

                    if (data.cancellationFee) setCancellationFee(data.cancellationFee);
                    if (data.isCustomFee) setIsCustomFee(data.isCustomFee);

                    if (data.customTerms) setCustomTerms(data.customTerms);
                    if (data.taxEnabled !== undefined) setTaxEnabled(data.taxEnabled);
                    if (data.images) setImages(data.images);
                } catch (e) {
                    console.error("Failed to parse formData", e);
                }
            }
        } else if (!editId && !serialNumber) {
            const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
            const randomPart = Math.floor(1000 + Math.random() * 9000);
            setSerialNumber(`${datePart}${randomPart}`);
        }
    }, [existingInvoice, editId]);

    // ---- Calculations ----
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

    // ---- Handlers ----
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

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            Array.from(e.target.files).forEach(file => {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    if (ev.target?.result) {
                        setImages(prev => [...prev, ev.target!.result as string]);
                    }
                };
                reader.readAsDataURL(file);
            });
        }
    };

    // Helper to construct invoice Data object for generateInvoiceHtml and Save
    const getFormDataObject = () => {
        const isDesign = projectNature === 'تصميم';
        const isExecution = projectNature === 'تنفيذ';
        const isGeneric = !isDesign && !isExecution;

        return {
            docType,
            clientCity,
            projectNature, otherProjectNature,
            siteNature, otherSiteNature,
            designReq, otherDesignReq,
            style, otherStyle,
            projectLocation, floors, area, electricMeter, notes,

            // Computed Lists for Display/Print
            designServices: isDesign ? [
                ...designServicesList.map(item => ({ text: item, checked: !!checkedDesignServices[item] })).filter(i => i.checked),
                ...customDesignServices.filter(i => i.checked)
            ] : [],
            executionServices: isExecution ? [
                ...executionServicesList.map(item => ({ text: item, checked: !!checkedExecutionServices[item] })).filter(i => i.checked),
                ...customExecutionServices.filter(i => i.checked)
            ] : [],
            genericServices: isGeneric ? customGenericServices.filter(i => i.checked) : [],

            // Raw State for Editing Restoration
            checkedDesignServices,
            checkedExecutionServices,
            customDesignServices,
            customExecutionServices,
            customGenericServices,

            paymentMethods,
            paymentTermType,
            customPaymentSystem,

            validityPeriod, isCustomValidity,
            designDuration, isCustomDuration,
            cancellationFee, isCustomFee,

            customTerms,

            terms: [
                `نظام الدفعات: ${paymentTermType === 'custom' ? customPaymentSystem : paymentTermType === '50-50' ? '50%-50% (دفعتين)' : paymentTermType === '50-25-25' ? '50%-25%-25% (ثلاث دفعات)' : paymentTermType === '100' ? '100% (دفعة كاملة)' : paymentTermType}`,
                `عرض السعر صالح حتى ${isCustomValidity ? validityPeriod : validityPeriod} من تاريخ إصداره.`,
                `مدة التصميم ${isCustomDuration ? designDuration : designDuration}.`,
                `مدة جلسات التعديل الخاصة بالعميل لا تدرج ضمن الفترة المحسوبة.`,
                `أي اعمال إضافية او تعديلات لا تدرج ضمن الفترة المحسوبة.`,
                `يحق للعميل الغاء الطلب قبل المباشرة ويحتسب رسوم ${isCustomFee ? cancellationFee : cancellationFee}.`,
                ...customTerms
            ],
            enableTax: taxEnabled,
            images: images
        };
    };

    const getInvoiceData = () => {
        return {
            invoiceNumber: serialNumber,
            issueDate: issueDate,
            dueDate: issueDate,
            client: {
                name: clientName,
                phone: clientPhone,
                city: clientCity
            },
            project: { id: projectId },
            items: items.map(i => ({
                description: i.description,
                unit: i.unit,
                quantity: i.quantity,
                price: i.price,
                discount: i.discount
            })),
            formData: getFormDataObject()
        };
    };

    const saveAsHTML = async () => {
        const invoiceData = getInvoiceData();
        const fullHtml = generateInvoiceHtml(invoiceData);
        const blob = new Blob([fullHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Invoice_${serialNumber}.html`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const resetForm = () => {
        if (confirm('هل أنت متأكد من مسح جميع البيانات؟')) {
            window.location.reload();
        }
    };

    const handleSaveToDB = () => {
        if (!clientId) {
            alert('الرجاء اختيار العميل');
            return;
        }

        const typeMap: Record<string, 'invoice' | 'quote'> = {
            "عرض سعر وفاتورة سداد": 'invoice',
            "عرض سعر": 'quote',
            "فاتورة سداد": 'invoice'
        };

        const formDataObj = getFormDataObject();
        const formData = JSON.stringify(formDataObj);

        const mutationPayload = {
            type: typeMap[docType] || 'invoice',
            clientId,
            projectId: projectId || undefined,
            issueDate: new Date(issueDate),
            subtotal,
            tax: taxEnabled ? vatAmount : 0,
            discount: items.reduce((sum, i) => sum + (i.price * i.quantity * (i.discount / 100)), 0),
            total: grandTotal,
            notes,
            terms: JSON.stringify(formDataObj.terms),
            invoiceNumber: serialNumber,
            formData,
            items: items.map(i => ({
                description: i.description,
                unit: i.unit,
                quantity: i.quantity,
                unitPrice: i.price,
                total: i.quantity * i.price * (1 - i.discount / 100)
            }))
        };

        const mutationOptions = {
            onSuccess: () => {
                alert('تم حفظ الفاتورة بنجاح وتم تسجيلها في المحاسبة');
            },
            onError: (err: any) => {
                alert('حدث خطأ أثناء الحفظ: ' + err.message);
            }
        };

        if (editId) {
            updateInvoice.mutate({ id: editId, ...mutationPayload }, mutationOptions);
        } else {
            createInvoice.mutate(mutationPayload, mutationOptions);
        }
    };

    const handlePrint = async () => {
        const invoiceData = getInvoiceData();
        const printContent = generateInvoiceHtml(invoiceData);
        const printWindow = window.open('', 'printWindow', 'width=800,height=600');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(printContent);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
            }, 1000);
        }
    };

    // ---- Service Handlers ----
    const handleServiceChange = (type: 'design' | 'execution', service: string, checked: boolean) => {
        if (type === 'design') {
            setCheckedDesignServices(prev => ({ ...prev, [service]: checked }));
        } else {
            setCheckedExecutionServices(prev => ({ ...prev, [service]: checked }));
        }
    };

    const handleAddCustomService = (type: 'design' | 'execution' | 'generic') => {
        const text = prompt("أدخل اسم الخدمة:");
        if (!text) return;
        const newItem: CustomServiceItem = { id: Math.random().toString(36).substr(2, 9), text, checked: true };

        if (type === 'design') setCustomDesignServices(prev => [...prev, newItem]);
        else if (type === 'execution') setCustomExecutionServices(prev => [...prev, newItem]);
        else setCustomGenericServices(prev => [...prev, newItem]);
    };

    const handleCustomServiceToggle = (type: 'design' | 'execution' | 'generic', id: string) => {
        const toggle = (list: CustomServiceItem[]) => list.map(item => item.id === id ? { ...item, checked: !item.checked } : item);
        if (type === 'design') setCustomDesignServices(toggle);
        else if (type === 'execution') setCustomExecutionServices(toggle);
        else setCustomGenericServices(toggle);
    };

    const handleDeleteCustomService = (type: 'design' | 'execution' | 'generic', id: string) => {
        const remove = (list: CustomServiceItem[]) => list.filter(item => item.id !== id);
        if (type === 'design') setCustomDesignServices(remove);
        else if (type === 'execution') setCustomExecutionServices(remove);
        else setCustomGenericServices(remove);
    };

    return (
        <>
            <div className="space-y-6 p-1" dir="rtl">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">إنشاء / تعديل فاتورة</h1>
                        <p className="text-muted-foreground mt-2">
                            الرقم المتسلسل: <span className="font-mono font-bold text-primary">{serialNumber}</span>
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Basic Info & Client - Moved to Right (First in RTL) */}
                    <Card>
                        <CardHeader>
                            <CardTitle>بيانات الفاتورة والعميل</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">تاريخ الإصدار</label>
                                    <input
                                        type="date"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                        value={issueDate}
                                        onChange={e => setIssueDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">نوع المستند</label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={docType}
                                        onChange={e => setDocType(e.target.value as any)}
                                    >
                                        <option value="عرض سعر وفاتورة سداد">عرض سعر وفاتورة سداد</option>
                                        <option value="عرض سعر">عرض سعر</option>
                                        <option value="فاتورة سداد">فاتورة سداد</option>
                                    </select>
                                </div>
                            </div>

                            <hr className="border-muted" />

                            <div className="space-y-2">
                                <label className="text-sm font-medium">اختر العميل</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={clientId}
                                    onChange={(e) => {
                                        const cid = Number(e.target.value);
                                        setClientId(cid);
                                        const c = clients?.find((cl: any) => cl.id === cid);
                                        if (c) {
                                            setClientName(c.name || "");
                                            setClientPhone(c.phone || "");
                                            setClientCity(c.city || "");
                                        }
                                    }}
                                >
                                    <option value={0}>عميل جديد...</option>
                                    {clients?.map((C: any) => <option key={C.id} value={C.id}>{C.name}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">اسم العميل</label>
                                    <input type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={clientName} onChange={e => setClientName(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">رقم الجوال</label>
                                    <input type="tel" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-right" value={clientPhone} onChange={e => setClientPhone(e.target.value)} />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-sm font-medium">المدينة / الحي</label>
                                    <input type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={clientCity} onChange={e => setClientCity(e.target.value)} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Project Info - Moved to Left (Second in RTL) */}
                    <Card>
                        <CardHeader>
                            <CardTitle>بيانات المشروع</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">اختر المشروع (إن وجد)</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={projectId || ""}
                                    onChange={e => setProjectId(Number(e.target.value))}
                                    disabled={isLoadingProjects}
                                >
                                    <option value="">
                                        {isLoadingProjects
                                            ? "جاري تحميل المشاريع..."
                                            : clientProjects && clientProjects.length === 0
                                                ? "-- لا توجد مشاريع --"
                                                : clientId
                                                    ? "-- اختر المشروع --"
                                                    : "-- اختر المشروع (اختياري) --"
                                        }
                                    </option>
                                    {clientProjects?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>

                            <hr className="border-muted" />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Row 1: Nature, Site */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">طبيعة المشروع</label>
                                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={projectNature} onChange={e => setProjectNature(e.target.value)}>
                                        <option value="">اختر...</option>
                                        <option value="تصميم">تصميم</option>
                                        <option value="تنفيذ">تنفيذ</option>
                                        <option value="استشارة في موقع المشروع">استشارة في موقع المشروع</option>
                                        <option value="استشارة في المكتب">استشارة في المكتب</option>
                                        <option value="استشارة اونلاين">استشارة اونلاين</option>
                                        <option value="other">مخصص</option>
                                    </select>
                                    {projectNature === 'other' && (
                                        <input type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2" placeholder="حدد..." value={otherProjectNature} onChange={e => setOtherProjectNature(e.target.value)} />
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">طبيعة الموقع</label>
                                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={siteNature} onChange={e => setSiteNature(e.target.value)}>
                                        <option value="">اختر...</option>
                                        <option value="غرفة">غرفة</option>
                                        <option value="استديو">استديو</option>
                                        <option value="غرف متعددة">غرف متعددة</option>
                                        <option value="شقة">شقة</option>
                                        <option value="فيلا">فيلا</option>
                                        <option value="قصر">قصر</option>
                                        <option value="ارض">ارض</option>
                                        <option value="مزرعة">مزرعة</option>
                                        <option value="شاليه">شاليه</option>
                                        <option value="عمارة">عمارة</option>
                                        <option value="مكتب">مكتب</option>
                                        <option value="شركة">شركة</option>
                                        <option value="محل تجاري">محل تجاري</option>
                                        <option value="معرض تجاري">معرض تجاري</option>
                                        <option value="صالون تجميل">صالون تجميل</option>
                                        <option value="سبا">سبا</option>
                                        <option value="صالون تجميل وسبا">صالون تجميل وسبا</option>
                                        <option value="مشتل">مشتل</option>
                                        <option value="محل ورود">محل ورود</option>
                                        <option value="محل عطور">محل عطور</option>
                                        <option value="محل هدايا">محل هدايا</option>
                                        <option value="فندق">فندق</option>
                                        <option value="مستشفى">مستشفى</option>
                                        <option value="مستوصف">مستوصف</option>
                                        <option value="عيادة">عيادة</option>
                                        <option value="مدرسة">مدرسة</option>
                                        <option value="مبنى حكومي">مبنى حكومي</option>
                                        <option value="برج">برج</option>
                                        <option value="مول">مول</option>
                                        <option value="سوق شعبي">سوق شعبي</option>
                                        <option value="حديقة عامة">حديقة عامة</option>
                                        <option value="حديقة خاصة">حديقة خاصة</option>
                                        <option value="بوث">بوث</option>
                                        <option value="ورشة سيارات">ورشة سيارات</option>
                                        <option value="other">مخصص</option>
                                    </select>
                                    {siteNature === 'other' && (
                                        <input type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2" placeholder="حدد..." value={otherSiteNature} onChange={e => setOtherSiteNature(e.target.value)} />
                                    )}
                                </div>

                                {/* Row 2: Location, Floors */}


                                {/* Row 4: Design Req, Style */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">التصميم المطلوب</label>
                                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={designReq} onChange={e => setDesignReq(e.target.value)}>
                                        <option value="">اختر...</option>
                                        <option value="داخلي">داخلي</option>
                                        <option value="خارجي">خارجي</option>
                                        <option value="لاندسكيب">لاندسكيب</option>
                                        <option value="معماري">معماري</option>
                                        <option value="داخلي وخارجي">داخلي وخارجي</option>
                                        <option value="داخلي ولاندسكيب">داخلي ولاندسكيب</option>
                                        <option value="داخلي وخارجي ولاندسكيب">داخلي وخارجي ولاندسكيب</option>
                                        <option value="خارجي ولاندسكيب">خارجي ولاندسكيب</option>
                                        <option value="داخلي وخارجي ومعماري">داخلي وخارجي ومعماري</option>
                                        <option value="other">مخصص</option>
                                    </select>
                                    {designReq === 'other' && (
                                        <input type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2" placeholder="حدد..." value={otherDesignReq} onChange={e => setOtherDesignReq(e.target.value)} />
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">طراز التصميم</label>
                                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={style} onChange={e => setStyle(e.target.value)}>
                                        <option value="">اختر...</option>
                                        <option value="مودرن">مودرن</option>
                                        <option value="كلاسيك">كلاسيك</option>
                                        <option value="نيو كلاسيك">نيو كلاسيك</option>
                                        <option value="بوهيمي">بوهيمي</option>
                                        <option value="مينيمل">مينيمل</option>
                                        <option value="صناعي">صناعي</option>
                                        <option value="شعبي">شعبي</option>
                                        <option value="نجدي">نجدي</option>
                                        <option value="حجازي">حجازي</option>
                                        <option value="إسلامي">إسلامي</option>
                                        <option value="other">مخصص</option>
                                    </select>
                                    {style === 'other' && (
                                        <input type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2" placeholder="حدد..." value={otherStyle} onChange={e => setOtherStyle(e.target.value)} />
                                    )}
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-sm font-medium">ملاحظات</label>
                                    <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={notes} onChange={e => setNotes(e.target.value)} />
                                </div>

                                {/* Dynamic Services Section */}
                                {(projectNature) && (
                                    <div className="space-y-4 md:col-span-2 border-t pt-4 mt-4">
                                        {/* Design Services */}
                                        {(projectNature === 'تصميم') && (
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-sm font-bold text-primary">خدمات التصميم المقدمة</label>
                                                    <Button type="button" size="sm" variant="outline" onClick={() => handleAddCustomService('design')}>
                                                        <Plus className="w-3 h-3 ml-1" /> إضافة خيار مخصص
                                                    </Button>
                                                </div>
                                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                                                    {designServicesList.map(s => (
                                                        <label key={s} className="flex items-center gap-2 text-xs cursor-pointer bg-muted/20 p-2 rounded hover:bg-muted/50 transition-colors border border-transparent hover:border-gray-200">
                                                            <input type="checkbox" className="w-4 h-4 rounded border-gray-400 accent-primary"
                                                                checked={!!checkedDesignServices[s]}
                                                                onChange={e => handleServiceChange('design', s, e.target.checked)} />
                                                            <span>{s}</span>
                                                        </label>
                                                    ))}
                                                    {customDesignServices.map(s => (
                                                        <label key={s.id} className="flex items-center gap-2 text-xs cursor-pointer bg-blue-50/50 p-2 rounded border border-blue-100 hover:bg-blue-50 transition-colors">
                                                            <input type="checkbox" className="w-4 h-4 rounded border-blue-400 accent-primary"
                                                                checked={s.checked}
                                                                onChange={() => handleCustomServiceToggle('design', s.id)} />
                                                            <span>{s.text}</span>
                                                            <Trash2 className="w-3 h-3 text-red-400 hover:text-red-600 mr-auto" onClick={(e) => { e.preventDefault(); handleDeleteCustomService('design', s.id) }} />
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Execution Services */}
                                        {(projectNature === 'تنفيذ') && (
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-sm font-bold text-primary">خدمات التنفيذ المقدمة</label>
                                                    <Button type="button" size="sm" variant="outline" onClick={() => handleAddCustomService('execution')}>
                                                        <Plus className="w-3 h-3 ml-1" /> إضافة خيار مخصص
                                                    </Button>
                                                </div>
                                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                                                    {executionServicesList.map(s => (
                                                        <label key={s} className="flex items-center gap-2 text-xs cursor-pointer bg-muted/20 p-2 rounded hover:bg-muted/50 transition-colors border border-transparent hover:border-gray-200">
                                                            <input type="checkbox" className="w-4 h-4 rounded border-gray-400 accent-primary"
                                                                checked={!!checkedExecutionServices[s]}
                                                                onChange={e => handleServiceChange('execution', s, e.target.checked)} />
                                                            <span>{s}</span>
                                                        </label>
                                                    ))}
                                                    {customExecutionServices.map(s => (
                                                        <label key={s.id} className="flex items-center gap-2 text-xs cursor-pointer bg-blue-50/50 p-2 rounded border border-blue-100 hover:bg-blue-50 transition-colors">
                                                            <input type="checkbox" className="w-4 h-4 rounded border-blue-400 accent-primary"
                                                                checked={s.checked}
                                                                onChange={() => handleCustomServiceToggle('execution', s.id)} />
                                                            <span>{s.text}</span>
                                                            <Trash2 className="w-3 h-3 text-red-400 hover:text-red-600 mr-auto" onClick={(e) => { e.preventDefault(); handleDeleteCustomService('execution', s.id) }} />
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Generic Services (For Consultation/Other) */}
                                        {!(projectNature === 'تصميم' || projectNature === 'تنفيذ') && (
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-sm font-bold text-primary">الخدمات المقدمة</label>
                                                    <Button type="button" size="sm" variant="outline" onClick={() => handleAddCustomService('generic')}>
                                                        <Plus className="w-3 h-3 ml-1" /> إضافة خيار مخصص
                                                    </Button>
                                                </div>
                                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                                                    {customGenericServices.map(s => (
                                                        <label key={s.id} className="flex items-center gap-2 text-xs cursor-pointer bg-blue-50/50 p-2 rounded border border-blue-100 hover:bg-blue-50 transition-colors">
                                                            <input type="checkbox" className="w-4 h-4 rounded border-blue-400 accent-primary"
                                                                checked={s.checked}
                                                                onChange={() => handleCustomServiceToggle('generic', s.id)} />
                                                            <span>{s.text}</span>
                                                            <Trash2 className="w-3 h-3 text-red-400 hover:text-red-600 mr-auto" onClick={(e) => { e.preventDefault(); handleDeleteCustomService('generic', s.id) }} />
                                                        </label>
                                                    ))}
                                                    {customGenericServices.length === 0 && (
                                                        <div className="col-span-full text-center text-muted-foreground py-2 text-sm bg-muted/10 rounded border border-dashed">
                                                            لا توجد خدمات مضافة. اضغط على "إضافة خيار مخصص" لإضافة خدمات.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Items Table */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>الكميات والأسعار</CardTitle>
                        <Button onClick={handleAddItem} size="sm" variant="outline">
                            <Plus className="w-4 h-4 ml-2" />
                            إضافة بند
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <table className="w-full text-sm">
                                <thead className="bg-muted">
                                    <tr>
                                        <th className="h-10 px-2 text-right font-medium">#</th>
                                        <th className="h-10 px-2 text-right font-medium w-1/3">وصف الخدمة</th>
                                        <th className="h-10 px-2 text-center font-medium">الوحدة</th>
                                        <th className="h-10 px-2 text-center font-medium">الكمية</th>
                                        <th className="h-10 px-2 text-center font-medium">السعر</th>
                                        <th className="h-10 px-2 text-center font-medium">الخصم %</th>
                                        <th className="h-10 px-2 text-center font-medium">الإجمالي</th>
                                        <th className="h-10 px-2 w-[50px]"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, index) => (
                                        <tr key={item.id} className="border-t hover:bg-muted/50">
                                            <td className="p-2 text-center">{index + 1}</td>
                                            <td className="p-2">
                                                <input
                                                    type="text"
                                                    className="w-full bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary rounded px-2 h-8"
                                                    value={item.description}
                                                    onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)}
                                                    placeholder="الوصف..."
                                                />
                                            </td>
                                            <td className="p-2">
                                                <select
                                                    className="w-full bg-transparent border-none focus:outline-none h-8 text-center"
                                                    value={item.unit}
                                                    onChange={(e) => handleUpdateItem(item.id, 'unit', e.target.value)}
                                                >
                                                    <option value="meter">متر</option>
                                                    <option value="piece">قطعة</option>
                                                    <option value="project">مشروع</option>
                                                </select>
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="number"
                                                    className="w-full bg-transparent border-none text-center h-8"
                                                    value={item.quantity}
                                                    onChange={(e) => handleUpdateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="number"
                                                    className="w-full bg-transparent border-none text-center h-8"
                                                    value={item.price}
                                                    onChange={(e) => handleUpdateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="number"
                                                    className="w-full bg-transparent border-none text-center h-8"
                                                    value={item.discount}
                                                    onChange={(e) => handleUpdateItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                                                />
                                            </td>
                                            <td className="p-2 text-center font-bold">
                                                {calculateRowTotal(item).toFixed(2)}
                                            </td>
                                            <td className="p-2 text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:text-destructive/90"
                                                    onClick={() => handleDeleteItem(item.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-col items-end gap-2 mt-6 border-t pt-4">
                            <div className="flex justify-between w-64 text-sm">
                                <span>المجموع الفرعي:</span>
                                <span className="font-bold">{subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} ريال</span>
                            </div>
                            <div className="flex items-center justify-between w-64 text-sm">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="taxToggle"
                                        className="h-4 w-4 rounded border-gray-300"
                                        checked={taxEnabled}
                                        onChange={e => setTaxEnabled(e.target.checked)}
                                    />
                                    <label htmlFor="taxToggle" className="cursor-pointer">الضريبة (15%)</label>
                                </div>
                                <span>{vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ريال</span>
                            </div>
                            <div className="flex justify-between w-64 text-lg font-bold border-t pt-2 mt-2">
                                <span>الإجمالي:</span>
                                <span className="text-primary">{grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} ريال</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Terms, Payment & Attachments */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>الشروط والأحكام ووسائل الدفع</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">

                            {/* Payment Methods */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold">وسائل الدفع المتاحة</label>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    {Object.keys(paymentMethods).map(k => (
                                        <label key={k} className="flex items-center gap-2 cursor-pointer border p-2 rounded hover:bg-muted/50">
                                            <input type="checkbox" checked={paymentMethods[k as PaymentMethod]} onChange={e => setPaymentMethods(prev => ({ ...prev, [k]: e.target.checked }))} className="h-4 w-4" />
                                            <span>
                                                {k === 'tamara' ? 'تمارا (تقسيط)' :
                                                    k === 'mispay' ? 'MISpay (تقسيط)' :
                                                        k === 'stcpay' ? 'STCpay' :
                                                            k === 'visa' ? 'فيزا (تقسيط)' :
                                                                k === 'mada' ? 'مدى' :
                                                                    k === 'bank' ? 'تحويل بنكي' :
                                                                        k === 'pos' ? 'شبكة' : 'نقدي'}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <hr className="border-muted" />

                            <div className="space-y-2">
                                <label className="text-sm font-medium">نظام الدفعات</label>
                                <div className="flex gap-2">
                                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={paymentTermType} onChange={e => setPaymentTermType(e.target.value)}>
                                        <option value="50-50">50%-50% (دفعتين)</option>
                                        <option value="50-25-25">50%-25%-25% (ثلاث دفعات)</option>
                                        <option value="100">100% (دفعة كاملة)</option>
                                        <option value="custom">مخصص</option>
                                    </select>
                                    {paymentTermType === 'custom' && (
                                        <input
                                            type="text"
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            placeholder="أدخل نظام الدفعات المخصص"
                                            value={customPaymentSystem}
                                            onChange={e => setCustomPaymentSystem(e.target.value)}
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium whitespace-nowrap">مدة الصلاحية:</label>
                                <select
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                    value={isCustomValidity ? 'custom' : validityPeriod}
                                    onChange={e => {
                                        if (e.target.value === 'custom') setIsCustomValidity(true);
                                        else { setIsCustomValidity(false); setValidityPeriod(e.target.value); }
                                    }}
                                >
                                    <option value="يوم واحد">يوم واحد</option>
                                    <option value="ثلاثة أيام">3 أيام</option>
                                    <option value="سبعة أيام">7 أيام</option>
                                    <option value="14 يوم">14 يوم</option>
                                    <option value="30 يوم">30 يوم</option>
                                    <option value="custom">مخصص</option>
                                </select>
                                {isCustomValidity && (
                                    <input type="text" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" value={validityPeriod} onChange={e => setValidityPeriod(e.target.value)} />
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium whitespace-nowrap">مدة التصميم:</label>
                                <select
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-ellipsis overflow-hidden"
                                    value={isCustomDuration ? 'custom' : designDuration}
                                    onChange={e => {
                                        if (e.target.value === 'custom') setIsCustomDuration(true);
                                        else { setIsCustomDuration(false); setDesignDuration(e.target.value); }
                                    }}
                                >
                                    <option value="لكل فراغ مدة تتراوح بين 2 و 5 ايام وفقا لعدد المساحات ">لكل فراغ 2-5 أيام...</option>
                                    <option value="ثلاثة أيام من تاريخ سداد الدفعة الأولى">3 أيام من الدفعة الأولى</option>
                                    <option value="سبعة أيام من تاريخ سداد الدفعة الأولى">7 أيام من الدفعة الأولى</option>
                                    <option value="14 يوم من تاريخ سداد الدفعة الأولى">14 يوم من الدفعة الأولى</option>
                                    <option value="30 يوم من تاريخ سداد الدفعة الأولى">30 يوم من الدفعة الأولى</option>
                                    <option value="custom">مخصص</option>
                                </select>
                                {isCustomDuration && (
                                    <input type="text" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" value={designDuration} onChange={e => setDesignDuration(e.target.value)} />
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">الشروط الإضافية</label>
                                {customTerms.map((term, i) => (
                                    <div key={i} className="flex gap-2">
                                        <input
                                            type="text"
                                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                            value={term}
                                            onChange={e => {
                                                const newTerms = [...customTerms];
                                                newTerms[i] = e.target.value;
                                                setCustomTerms(newTerms);
                                            }}
                                        />
                                        <Button variant="ghost" size="icon" onClick={() => setCustomTerms(prev => prev.filter((_, idx) => idx !== i))}>
                                            <Trash2 className="w-4 h-4 text-destructive" />
                                        </Button>
                                    </div>
                                ))}
                                <div className="flex gap-2">
                                    <input
                                        id="newTermInput"
                                        type="text"
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                        placeholder="إضافة شرط جديد..."
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                const val = (e.target as HTMLInputElement).value;
                                                if (val) {
                                                    setCustomTerms(p => [...p, val]);
                                                    (e.target as HTMLInputElement).value = '';
                                                }
                                            }
                                        }}
                                    />
                                    <Button variant="outline" size="icon" onClick={() => {
                                        const input = document.getElementById('newTermInput') as HTMLInputElement;
                                        if (input && input.value) {
                                            setCustomTerms(p => [...p, input.value]);
                                            input.value = '';
                                        }
                                    }}>
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>مرفقات ومخططات</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div
                                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => document.getElementById('imgUpload')?.click()}
                            >
                                <div className="flex flex-col items-center gap-2">
                                    <Download className="w-8 h-8 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">اضغط لرفع صور (مخططات أو صور)</p>
                                </div>
                                <input type="file" id="imgUpload" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                            </div>

                            {images.length > 0 && (
                                <div className="grid grid-cols-3 gap-2">
                                    {images.map((src, i) => (
                                        <div key={i} className="relative aspect-square rounded-md overflow-hidden border group">
                                            <img src={src} className="object-cover w-full h-full" alt="Uploaded" />
                                            <button
                                                className="absolute top-1 right-1 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                                            >
                                                &times;
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Footer Buttons */}
                <div className="flex flex-wrap gap-4 justify-start mt-8 border-t pt-6 bg-background sticky bottom-0 p-4 shadow-lg z-10">
                    <Button onClick={handleSaveToDB} className="bg-[#bfa670] hover:bg-[#a68e59] text-white min-w-[150px]">
                        <Save className="w-5 h-5 ml-2" />
                        حفظ في النظام
                    </Button>
                    <Button variant="outline" onClick={handlePrint} className="bg-gray-50">
                        <Printer className="w-5 h-5 ml-2" />
                        طباعة
                    </Button>
                    <Button variant="outline" onClick={saveAsHTML} className="bg-gray-50">
                        <Download className="w-5 h-5 ml-2" />
                        تصدير HTML
                    </Button>
                    <Button variant="ghost" onClick={resetForm}>
                        <Plus className="w-5 h-5 ml-2" />
                        جديد
                    </Button>
                </div>
            </div>

            {/* Hidden Print Container */}
            <div id="print-container" style={{ display: 'none' }}></div>
        </>
    );
}
