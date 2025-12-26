
import React, { useState, useEffect, useRef } from 'react';
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import './Fatore.css';
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

// CSS Content for Export (minified or raw)
const INVOICE_CSS = `
        :root {
            --primary-color: #bfa670;
            --secondary-color: #1a1a1a;
            --border-color: #ddd;
            --bg-color: #f9f9f9;
            --paper-bg: #ffffff;
            --danger-color: #e74c3c;
            --success-color: #2ecc71;
            --grey-color: #7f8c8d;
        }

        * {
            box-sizing: border-box;
            outline: none;
        }

        body {
            font-family: 'Tajawal', sans-serif;
            background-color: var(--bg-color);
            margin: 0;
            padding: 20px;
            color: #333;
            font-size: 13px;
        }

        /* Paper Layout */
        .page-container {
            max-width: 210mm;
            margin: 0 auto;
            background: var(--paper-bg);
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            padding: 25px;
            min-height: 297mm;
            position: relative;
            display: flex;
            flex-direction: column;
        }

        /* Floating Action Bar */
        .action-bar {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #333;
            padding: 10px 20px;
            border-radius: 50px;
            display: flex;
            gap: 15px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.3);
            z-index: 1000;
        }

        .btn {
            background: var(--primary-color);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 25px;
            cursor: pointer;
            font-family: 'Tajawal', sans-serif;
            font-weight: bold;
            transition: 0.3s;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .btn:hover { background: #a38d5d; }
        .btn-danger { background: var(--danger-color); }
        .btn-secondary { background: #555; }
        .btn-small { padding: 5px 10px; font-size: 11px; border-radius: 4px; margin-top: 5px; }

        /* Placeholders - Modified for Images */
        .logo-placeholder, .barcode-placeholder {
            width: 100%;
            background: transparent; /* Removed grey background */
            border: none; /* Removed border */
            display: flex;
            align-items: center;
            justify-content: center; /* Center image */
            color: transparent;
        }

        .logo-placeholder { height: 100px; margin-bottom: 10px; justify-content: flex-start; /* Align logo to right (start in RTL) */ }
        .barcode-placeholder { height: 100px; width: 240px; } 

        /* Headings */
        h1, h2, h3, h4 { margin: 0 0 8px 0; color: var(--secondary-color); }
        h1 { font-size: 22px; }
        h3 { font-size: 14px; margin-bottom: 5px; }
        h2 {
            font-size: 15px;
            border-bottom: 2px solid var(--primary-color);
            padding-bottom: 2px;
            margin-top: 10px;
        }

        /* Form Grid */
        .form-row {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 8px;
        }

        .form-group {
            flex: 1;
            min-width: 150px;
            display: flex;
            flex-direction: column;
        }

        label {
            font-weight: 600;
            margin-bottom: 2px;
            font-size: 11px;
            color: #555;
        }

        input[type="text"], 
        input[type="number"], 
        input[type="date"], 
        input[type="tel"], 
        select, 
        textarea {
            width: 100%;
            padding: 5px;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            font-family: inherit;
            background: #fff;
            font-size: 11px;
        }

        textarea { resize: vertical; min-height: 30px; }

        /* Checkboxes & Radios */
        .checkbox-group {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            align-items: center;
        }

        .checkbox-item {
            display: flex;
            align-items: center;
            gap: 4px;
            background: #f4f4f4;
            padding: 3px 6px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 10px;
        }

        input[type="checkbox"] { width: 13px; height: 13px; margin: 0; }

        /* Tables */
        .table-responsive { width: 100%; overflow-x: auto; margin-bottom: 5px; }

        table { width: 100%; border-collapse: collapse; font-size: 11px; }

        th, td {
            border: 1px solid var(--border-color);
            padding: 4px;
            text-align: center;
            vertical-align: middle;
        }

        th { background-color: var(--secondary-color); color: white; font-weight: 500; font-size: 10px; }

        td input, td textarea, td select { border: none; background: transparent; width: 100%; text-align: center; padding: 2px; font-size: 11px; }
        td input:focus, td textarea:focus, td select:focus { background: #fff8e1; }

        /* Service Lists */
        .service-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
            gap: 5px;
            margin-bottom: 5px;
            border: 1px solid #eee;
            padding: 8px;
            background: #fafafa;
        }

        /* Image Upload */
        .image-upload-area {
            border: 2px dashed var(--border-color);
            padding: 5px;
            text-align: center;
            border-radius: 8px;
            margin-top: 5px;
            cursor: pointer;
            font-size: 11px;
            background-color: #fff;
        }

        .image-preview-grid {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-top: 10px;
        }

        .img-wrapper {
            position: relative;
            display: inline-block;
        }

        .preview-img {
            width: 200px;
            height: auto;
            object-fit: contain;
            border-radius: 4px;
            border: 1px solid #ddd;
        }

        .delete-img-btn {
            position: absolute;
            top: -8px;
            right: -8px;
            background: red;
            color: white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            text-align: center;
            line-height: 20px;
            font-size: 12px;
            cursor: pointer;
            font-weight: bold;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            z-index: 10;
        }

        /* Buttons in Tables/Sections */
        .row-action {
            background: none; border: none; cursor: pointer; color: #999; font-size: 14px;
        }
        .row-action:hover { color: var(--danger-color); }
        
        .add-row-btn {
            background: #eee; border: 1px dashed #999; width: 100%; padding: 4px; cursor: pointer; font-size: 11px;
        }
        .add-row-btn:hover { background: #e0e0e0; }

        /* Helpers */
        .hidden { display: none !important; }
        .other-input { margin-top: 3px; display: none; border-bottom: 1px dashed #ccc !important; border-top: none !important; border-left: none !important; border-right: none !important; border-radius: 0 !important;}
        
        /* Totals */
        .totals-section {
            background: #f0f0f0; padding: 8px; border-radius: 4px;
            display: flex; flex-direction: column; align-items: flex-end; margin-top: 5px;
        }
        
        .total-row { display: flex; gap: 15px; align-items: center; font-size: 12px; font-weight: bold; }

        /* Terms List */
        .terms-ul { padding-right: 18px; margin-bottom: 0; line-height: 1.6; margin-top: 3px; font-size: 11px; }
        .terms-ul li { margin-bottom: 2px; }

        /* Footer Main Styles */
        footer {
            margin-top: auto; /* Pushes footer to bottom if space permits */
            padding-top: 10px;
        }

        /* PRINT STYLES */
        @media print {
            @page { 
                size: A4; 
                margin: 0; 
            }
            
            html, body {
                width: 210mm;
                height: auto;
                margin: 0;
                padding: 0;
            }
            
            body { 
                background: white; 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact;
                padding: 10mm; 
            }
            
            .page-container {
                box-shadow: none; 
                margin: 0 auto;
                padding: 0; 
                width: 100%; 
                max-width: 100%; 
                border: none;
                min-height: auto;
                height: auto;
                display: block; /* Removed flex to allow normal flow */
            }
            
            .action-bar, .add-row-btn, .row-action, .image-upload-area, .delete-img-btn, .no-print {
                display: none !important;
            }

            /* 1. Compacting elements for density */
            h1 { font-size: 20px; margin-bottom: 2px; }
            h2 { font-size: 14px; margin-top: 5px; padding-bottom: 2px; margin-bottom: 3px; }
            h3 { font-size: 12px; margin-bottom: 2px;}
            
            .form-row { margin-bottom: 4px; gap: 5px; }
            .form-group { margin-bottom: 0; }
            
            /* Remove section breaking constraints to fill page 1 */
            section { page-break-inside: auto; margin-bottom: 5px; }
            tr { page-break-inside: avoid; }
            
            input, textarea, select {
                border: none !important; background: transparent !important; padding: 0; font-size: 11px; appearance: none;
                color: #000;
            }
            
            /* 2. Checkboxes: Custom Styling for Print - Solid Gold Block */
            input[type="checkbox"] {
                -webkit-appearance: none;
                appearance: none;
                background-color: transparent;
                border: 1px solid #333 !important;
                width: 12px;
                height: 12px;
                display: inline-block;
                border-radius: 2px;
                vertical-align: middle;
            }
            input[type="checkbox"]:checked {
                background-color: #bfa670 !important; /* Gold color */
                border-color: #bfa670 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                /* Remove any default tick content */
            }
            /* Double ensure no checkmark */
            input[type="checkbox"]:checked:after,
            input[type="checkbox"]:checked:before {
                content: none;
                display: none;
            }

            .other-input[style*="none"] { display: none !important; }
            
            /* Lists */
            .service-list { display: block; border: none; padding: 0; background: none; margin-bottom: 2px; }
            .checkbox-item { display: inline-flex; width: 30%; background: none; padding: 1px 0; font-size: 10px; margin-bottom: 2px; }
            
            .totals-section { padding: 5px; background: none; border-top: 1px solid #000; margin-top: 5px; }
            
            #newTermInput:placeholder-shown { display: none !important; }
            
            /* Footer Print adjustments */
            footer { margin-top: 10px; font-size: 12px; page-break-inside: avoid; }
            .logo-placeholder { height: 60px; margin-bottom: 5px; }

            table { font-size: 11px; margin-bottom: 5px; }
            th { font-size: 10px; background-color: #eee !important; color: #000 !important; } 
            td { padding: 2px; }
        }
`;

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
    const updateInvoice = trpc.invoices.update.useMutation(); // Needed for updates

    const { data: clients } = trpc.clients.list.useQuery();
    const { data: clientProjects } = trpc.projects.list.useQuery(
        { clientId: clientId || undefined },
        { enabled: !!clientId }
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
                    unit: 'meter', // Default as DB might not store unit if simplifed
                    quantity: i.quantity,
                    price: i.unitPrice,
                    discount: 0 // DB schema might not have per-item discount, assume 0 or handle logic
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

                    if (data.validityPeriod) setValidityPeriod(data.validityPeriod);
                    if (data.isCustomValidity) setIsCustomValidity(data.isCustomValidity);

                    if (data.designDuration) setDesignDuration(data.designDuration);
                    if (data.isCustomDuration) setIsCustomDuration(data.isCustomDuration);

                    if (data.cancellationFee) setCancellationFee(data.cancellationFee);
                    if (data.isCustomFee) setIsCustomFee(data.isCustomFee);

                    if (data.customTerms) setCustomTerms(data.customTerms);
                    if (data.taxEnabled !== undefined) setTaxEnabled(data.taxEnabled);
                } catch (e) {
                    console.error("Failed to parse formData", e);
                }
            }
        } else if (!editId && !serialNumber) {
            // Only generate new serial if NOT editing
            const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
            const randomPart = Math.floor(1000 + Math.random() * 9000);
            setSerialNumber(`INV-${datePart}-${randomPart}`);
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

    const handleAddCustomService = (listName: 'design' | 'execution' | 'generic') => {
        const newItem = { id: Math.random().toString(36).substr(2, 9), text: '', checked: true };
        if (listName === 'design') setCustomDesignServices([...customDesignServices, newItem]);
        else if (listName === 'execution') setCustomExecutionServices([...customExecutionServices, newItem]);
        else setCustomGenericServices([...customGenericServices, newItem]);
    };

    const handleUpdateCustomService = (listName: 'design' | 'execution' | 'generic', id: string, text: string) => {
        const updater = (list: CustomServiceItem[]) => list.map(item => item.id === id ? { ...item, text } : item);
        if (listName === 'design') setCustomDesignServices(updater(customDesignServices));
        else if (listName === 'execution') setCustomExecutionServices(updater(customExecutionServices));
        else setCustomGenericServices(updater(customGenericServices));
    };

    const handleDeleteCustomService = (listName: 'design' | 'execution' | 'generic', id: string) => {
        const filter = (list: CustomServiceItem[]) => list.filter(item => item.id !== id);
        if (listName === 'design') setCustomDesignServices(filter(customDesignServices));
        else if (listName === 'execution') setCustomExecutionServices(filter(customExecutionServices));
        else setCustomGenericServices(filter(customGenericServices));
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

    const saveAsHTML = async () => {
        // Construct Invoice Object from State
        const invoiceData = {
            invoiceNumber: serialNumber,
            issueDate: issueDate,
            dueDate: issueDate, // Assuming due date same as issue for now or add field
            client: {
                name: clientName,
                phone: clientPhone,
                city: clientCity
            },
            project: {
                id: projectId
            },
            items: items.map(i => ({
                description: i.description,
                unit: i.unit,
                quantity: i.quantity,
                price: i.price,
                discount: i.discount
            })),
            formData: { // match structure expected by utility
                docType,
                clientCity,
                projectNature, otherProjectNature,
                siteNature, otherSiteNature,
                designReq, otherDesignReq,
                style, otherStyle,
                projectLocation, floors, area, electricMeter, notes,

                // Services
                designServices: [
                    ...designServicesList.map(item => ({ text: item, checked: !!checkedDesignServices[item] })).filter(i => i.checked),
                    ...customDesignServices.filter(i => i.checked)
                ],
                executionServices: [
                    ...executionServicesList.map(item => ({ text: item, checked: !!checkedExecutionServices[item] })).filter(i => i.checked),
                    ...customExecutionServices.filter(i => i.checked)
                ],
                genericServices: customGenericServices.filter(i => i.checked),

                terms: [
                    `عرض السعر صالح حتى ${isCustomValidity ? validityPeriod : validityPeriod} من تاريخ إصداره.`,
                    `مدة التصميم ${isCustomDuration ? designDuration : designDuration}.`,
                    `مدة جلسات التعديل الخاصة بالعميل لا تدرج ضمن الفترة المحسوبة.`,
                    `أي اعمال إضافية او تعديلات لا تدرج ضمن الفترة المحسوبة.`,
                    `يحق للعميل الغاء الطلب قبل المباشرة ويحتسب رسوم ${isCustomFee ? cancellationFee : cancellationFee}.`,
                    ...customTerms
                ],

                enableTax: taxEnabled
            }
        };

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

        const formData = JSON.stringify({
            projectNature, otherProjectNature, siteNature, otherSiteNature,
            designReq, otherDesignReq, style, otherStyle,
            projectLocation, floors, area, electricMeter, notes,
            checkedDesignServices, checkedExecutionServices,
            customDesignServices, customExecutionServices, customGenericServices,
            paymentMethods, paymentTermType,
            validityPeriod, isCustomValidity,
            designDuration, isCustomDuration,
            cancellationFee, isCustomFee,
            customTerms,
            docType,
            taxEnabled
        });

        createInvoice.mutate({
            type: typeMap[docType] || 'invoice',
            clientId,
            projectId: projectId || undefined,
            issueDate: new Date(issueDate),
            subtotal,
            tax: taxEnabled ? vatAmount : 0,
            discount: items.reduce((sum, i) => sum + (i.price * i.quantity * (i.discount / 100)), 0),
            total: grandTotal,
            notes,
            terms: 'Terms stored in form data',
            invoiceNumber: serialNumber,
            formData,
            items: items.map(i => ({
                description: i.description,
                quantity: i.quantity,
                unitPrice: i.price,
                total: i.quantity * i.price * (1 - i.discount / 100)
            }))
        }, {
            onSuccess: () => {
                alert('تم حفظ الفاتورة بنجاح وتم تسجيلها في المحاسبة');
            },
            onError: (err) => {
                alert('حدث خطأ أثناء الحفظ: ' + err.message);
            }
        });
    };

    const handlePrint = async () => {
        // Reuse same data construction logic or factor it out (for now duplicating slightly for safety unless I refactor)
        // Actually, to avoid duplication, let's make a helper 'getInvoiceData' but since I can't easily refactor the whole file now without viewing all, I will duplicate the data construction which is robust enough.

        const invoiceData = {
            invoiceNumber: serialNumber,
            issueDate: issueDate,
            dueDate: issueDate,
            client: { name: clientName, phone: clientPhone, city: clientCity },
            project: { id: projectId },
            items: items.map(i => ({ description: i.description, unit: i.unit, quantity: i.quantity, price: i.price, discount: i.discount })),
            formData: {
                docType, clientCity, projectNature, otherProjectNature, siteNature, otherSiteNature, designReq, otherDesignReq, style, otherStyle, projectLocation, floors, area, electricMeter, notes,
                designServices: [...designServicesList.map(item => ({ text: item, checked: !!checkedDesignServices[item] })).filter(i => i.checked), ...customDesignServices.filter(i => i.checked)],
                executionServices: [...executionServicesList.map(item => ({ text: item, checked: !!checkedExecutionServices[item] })).filter(i => i.checked), ...customExecutionServices.filter(i => i.checked)],
                genericServices: customGenericServices.filter(i => i.checked),
                terms: [
                    `عرض السعر صالح حتى ${isCustomValidity ? validityPeriod : validityPeriod} من تاريخ إصداره.`,
                    `مدة التصميم ${isCustomDuration ? designDuration : designDuration}.`,
                    `مدة جلسات التعديل الخاصة بالعميل لا تدرج ضمن الفترة المحسوبة.`,
                    `أي اعمال إضافية او تعديلات لا تدرج ضمن الفترة المحسوبة.`,
                    `يحق للعميل الغاء الطلب قبل المباشرة ويحتسب رسوم ${isCustomFee ? cancellationFee : cancellationFee}.`,
                    ...customTerms
                ],
                enableTax: taxEnabled
            }
        };

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

    // Calculate Visibility
    const showDesign = projectNature === 'تصميم';
    const showExecution = projectNature === 'تنفيذ';
    const showGeneric = !showDesign && !showExecution && projectNature !== '';

    return (
        <div className="fatore-body">
            <div className="action-bar no-print">
                <button className="btn" style={{ backgroundColor: 'var(--success-color)' }} onClick={handleSaveToDB}>
                    <i className="fas fa-save"></i> حفظ في النظام
                </button>
                <button className="btn" onClick={saveAsHTML}><i className="fas fa-download"></i> تصدير HTML</button>
                <button className="btn" onClick={handlePrint}><i className="fas fa-file-pdf"></i> طباعة</button>
                <button className="btn btn-secondary" onClick={resetForm}><i className="fas fa-undo"></i> جديد</button>
            </div>

            <div className="page-container" id="form-content" ref={containerRef}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '5px' }}>
                    <div style={{ width: '30%' }}>
                        <div className="logo-placeholder">
                            <img src="/logo.png" alt="Logo" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                        </div>
                    </div>
                    <div style={{ width: '65%', textAlign: 'left' }}>
                        <h1 style={{ color: 'var(--primary-color)' }}>GOLDEN TOUCH <span style={{ color: 'var(--grey-color)' }}>DESIGN</span></h1>
                        <h3>شركة اللمسة الذهبية للتصميم</h3>
                        <p style={{ margin: '0 0 5px 0', fontSize: '12px', fontWeight: 'bold', color: '#555' }}>سجل تجاري C.R. 7017891396</p>

                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid #ccc', paddingBottom: '2px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                <span style={{ fontSize: '10px', color: '#777' }}>الرقم المتسلسل: {serialNumber}</span>
                                <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} style={{ width: 'auto', border: 'none', fontSize: '12px', color: '#555' }} />
                            </div>
                            <select value={docType} onChange={e => setDocType(e.target.value as any)} style={{ fontSize: '13px', fontWeight: 'bold', border: 'none', flex: 1, textAlign: 'left', padding: 0 }}>
                                <option value="عرض سعر وفاتورة سداد">عرض سعر وفاتورة سداد</option>
                                <option value="عرض سعر">عرض سعر</option>
                                <option value="فاتورة سداد">فاتورة سداد</option>
                            </select>
                        </div>
                    </div>
                </header>

                <section>
                    <h2>بيانات العميل</h2>
                    <div className="form-row">
                        <div className="form-group">
                            <label>اختيار عميل</label>
                            <select value={clientId} onChange={(e) => {
                                const cid = Number(e.target.value);
                                setClientId(cid);
                                const c = clients?.find((cl: any) => cl.id === cid);
                                if (c) {
                                    setClientName(c.name || "");
                                    setClientPhone(c.phone || "");
                                    setClientCity(c.city || "");
                                }
                            }}>
                                <option value={0}>جديد...</option>
                                {clients?.map((C: any) => <option key={C.id} value={C.id}>{C.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>اسم العميل</label>
                            <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>رقم الجوال</label>
                            <input type="tel" style={{ textAlign: 'right' }} value={clientPhone} onChange={e => setClientPhone(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>المدينة \ الحي</label>
                            <input type="text" value={clientCity} onChange={e => setClientCity(e.target.value)} />
                        </div>
                    </div>
                </section>

                <section>
                    <h2>بيانات المشروع</h2>
                    <div className="form-row">
                        <div className="form-group">
                            <label>اختيار مشروع</label>
                            <select value={projectId || ""} onChange={e => setProjectId(Number(e.target.value))} disabled={!clientId}>
                                <option value="">اختر...</option>
                                {clientProjects?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>طبيعة المشروع</label>
                            <select value={projectNature} onChange={e => setProjectNature(e.target.value)}>
                                <option value="">اختر...</option>
                                <option value="تصميم">تصميم</option>
                                <option value="تنفيذ">تنفيذ</option>
                                <option value="استشارة في موقع المشروع">استشارة في موقع المشروع</option>
                                <option value="استشارة في المكتب">استشارة في المكتب</option>
                                <option value="استشارة اونلاين">استشارة اونلاين</option>
                                <option value="other">مخصص</option>
                            </select>
                            <input type="text" className={`other-input ${projectNature === 'other' ? '' : 'hidden'}`} placeholder="حدد..." value={otherProjectNature} onChange={e => setOtherProjectNature(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>طبيعة الموقع</label>
                            <select value={siteNature} onChange={e => setSiteNature(e.target.value)}>
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
                            <input type="text" className={`other-input ${siteNature === 'other' ? '' : 'hidden'}`} placeholder="حدد..." value={otherSiteNature} onChange={e => setOtherSiteNature(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>التصميم المطلوب</label>
                            <select value={designReq} onChange={e => setDesignReq(e.target.value)}>
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
                            <input type="text" className={`other-input ${designReq === 'other' ? '' : 'hidden'}`} placeholder="حدد..." value={otherDesignReq} onChange={e => setOtherDesignReq(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>طراز التصميم</label>
                            <select value={style} onChange={e => setStyle(e.target.value)}>
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
                            <input type="text" className={`other-input ${style === 'other' ? '' : 'hidden'}`} placeholder="حدد..." value={otherStyle} onChange={e => setOtherStyle(e.target.value)} />
                        </div>
                    </div>
                </section>



                <section style={{ marginTop: '10px' }}>
                    <h2>الكميات والاسعار</h2>
                    <div className="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ width: '5%' }}>#</th>
                                    <th style={{ width: '40%' }}>وصف الخدمة</th>
                                    <th style={{ width: '10%' }}>الوحدة</th>
                                    <th style={{ width: '10%' }}>الكمية</th>
                                    <th style={{ width: '10%' }}>السعر</th>
                                    <th style={{ width: '10%' }}>الخصم %</th>
                                    <th style={{ width: '10%' }}>الاجمالي</th>
                                    <th className="no-print" style={{ width: '5%' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, idx) => (
                                    <tr key={item.id}>
                                        <td>{idx + 1}</td>
                                        <td><textarea rows={1} value={item.description} onChange={e => handleUpdateItem(item.id, 'description', e.target.value)} style={{ height: 'auto' }}></textarea></td>
                                        <td>
                                            <select value={item.unit} onChange={e => handleUpdateItem(item.id, 'unit', e.target.value)}>
                                                <option value="meter">متر</option>
                                                <option value="piece">قطعة</option>
                                                <option value="project">مشروع</option>
                                            </select>
                                        </td>
                                        <td><input type="number" className="qty" value={item.quantity} onChange={e => handleUpdateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)} /></td>
                                        <td><input type="number" className="price" value={item.price} onChange={e => handleUpdateItem(item.id, 'price', parseFloat(e.target.value) || 0)} /></td>
                                        <td><input type="number" className="discount" value={item.discount} onChange={e => handleUpdateItem(item.id, 'discount', parseFloat(e.target.value) || 0)} /></td>
                                        <td><input type="text" className="total" value={calculateRowTotal(item).toFixed(2)} readOnly /></td>
                                        <td className="no-print"><button className="row-action" onClick={() => handleDeleteItem(item.id)}>&times;</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <button className="add-row-btn no-print" onClick={handleAddItem}>+ إضافة بند</button>
                    </div>

                    <div className="totals-section">
                        <div className="total-row"><span>المجموع:</span><span>{subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                        <div className="total-row">
                            <span>ضريبة (15%) <input type="checkbox" className="no-print" checked={taxEnabled} onChange={e => setTaxEnabled(e.target.checked)} />:</span>
                            <span>{vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="total-row" style={{ fontSize: '16px', borderTop: '2px solid #333' }}>
                            <span>الإجمالي النهائي:</span>
                            <span>{grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </section>

                <section>
                    <div className="form-row">
                        <div className="form-group">
                            <label>وسائل الدفع</label>
                            <div className="checkbox-group">
                                {Object.keys(paymentMethods).map(k => (
                                    <label key={k} className="checkbox-item">
                                        <input type="checkbox" checked={paymentMethods[k as PaymentMethod]} onChange={e => setPaymentMethods(prev => ({ ...prev, [k]: e.target.checked }))} />
                                        {k === 'tamara' ? 'تمارا (تقسيط)' : k === 'mispay' ? 'MISpay (تقسيط)' : k === 'stcpay' ? 'STCpay' : k === 'visa' ? 'فيزا (تقسيط)' : k === 'mada' ? 'مدى' : k === 'bank' ? 'تحويل بنكي' : k === 'pos' ? 'شبكة' : 'نقدي'}
                                    </label>
                                ))}
                            </div>
                            <div style={{ marginTop: '5px' }}>
                                <label>الدفعات في حال اختيار سداد نقدي او تحويل بنكي:</label>
                                <select value={paymentTermType} onChange={e => setPaymentTermType(e.target.value)} style={{ width: '100%', border: '1px solid #777' }}>
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
                                <select value={isCustomValidity ? "other" : validityPeriod} onChange={e => {
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
                                <input type="text" className={`other-input ${isCustomValidity ? '' : 'hidden'}`} style={{ width: '80px', display: 'inline-block' }} value={validityPeriod} onChange={e => setValidityPeriod(e.target.value)} />
                                من تاريخ إصداره.
                            </li>
                            <li>
                                مدة التصميم
                                <select value={isCustomDuration ? "other" : designDuration} onChange={e => {
                                    if (e.target.value === "other") setIsCustomDuration(true);
                                    else { setIsCustomDuration(false); setDesignDuration(e.target.value); }
                                }} style={{ width: 'auto', margin: '0 5px', maxWidth: '300px' }}>
                                    <option value="لكل فراغ مدة تتراوح بين 2 و 5 ايام وفقا لعدد المساحات ">لكل فراغ 2-5 أيام...</option>
                                    <option value="ثلاثة أيام من تاريخ سداد الدفعة الأولى">3 أيام من الدفعة الأولى</option>
                                    <option value="سبعة أيام من تاريخ سداد الدفعة الأولى">7 أيام من الدفعة الأولى</option>
                                    <option value="14 يوم من تاريخ سداد الدفعة الأولى">14 يوم من الدفعة الأولى</option>
                                    <option value="30 يوم من تاريخ سداد الدفعة الأولى">30 يوم من الدفعة الأولى</option>
                                    <option value="other">مخصص</option>
                                </select>
                                <input type="text" className={`other-input ${isCustomDuration ? '' : 'hidden'}`} style={{ width: '150px', display: 'inline-block' }} value={designDuration} onChange={e => setDesignDuration(e.target.value)} />
                                .
                            </li>
                            <li>
                                <select style={{ width: '100%', padding: '1px' }}>
                                    <option>مدة جلسات التعديل الخاصة بالعميل لا تدرج ضمن الفترة المحسوبة لاعتمادها على نوعية تعديلات العميل</option>
                                    <option>أي اعمال إضافية او تعديلات لا تدرج ضمن الفترة المحسوبة لاعتمادها على نوعية طلبات العميل</option>
                                </select>
                            </li>
                            <li>
                                يحق للعميل الغاء الطلب قبل المباشرة ويحتسب رسوم
                                <select value={isCustomFee ? "other" : cancellationFee} onChange={e => {
                                    if (e.target.value === "other") setIsCustomFee(true);
                                    else { setIsCustomFee(false); setCancellationFee(e.target.value); }
                                }} style={{ width: 'auto', margin: '0 5px' }}>
                                    <option value="زيارة واستشارة">زيارة واستشارة</option>
                                    <option value="رفع مساحي">رفع مساحي</option>
                                    <option value="تسعير">تسعير</option>
                                    <option value="لايوجد رسوم">لا يوجد</option>
                                    <option value="other">مخصص</option>
                                </select>
                                <input type="text" className={`other-input ${isCustomFee ? '' : 'hidden'}`} style={{ width: '100px', display: 'inline-block' }} value={cancellationFee} onChange={e => setCancellationFee(e.target.value)} />
                                .
                            </li>
                            {customTerms.map((term, i) => (
                                <li key={i}>{term} <span className="no-print" style={{ color: 'red', cursor: 'pointer', marginRight: '5px' }} onClick={() => setCustomTerms(prev => prev.filter((_, idx) => idx !== i))}>[x]</span></li>
                            ))}
                        </ul>
                        <div className="no-print" style={{ marginTop: '5px' }}>
                            <input type="text" id="newTermInput" placeholder="اضافة شرط..." onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    setCustomTerms([...customTerms, (e.target as HTMLInputElement).value]);
                                    (e.target as HTMLInputElement).value = '';
                                }
                            }} style={{ width: '100%' }} />
                        </div>
                    </div>
                </section>

                <section className="no-print">
                    <div className="image-upload-area" onClick={() => document.getElementById('imgUpload')?.click()}>
                        <i className="fas fa-cloud-upload-alt"></i> اضغط لرفع صور (مخططات/مواقع)
                        <input type="file" id="imgUpload" multiple accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                    </div>
                    <div className="image-preview-grid">
                        {images.map((src, i) => (
                            <div key={i} className="img-wrapper">
                                <img src={src} className="preview-img" alt="Uploaded" />
                                <div className="delete-img-btn" onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}>&times;</div>
                            </div>
                        ))}
                    </div>
                </section>

                {images.length > 0 && (
                    <section className="print-only-section">
                        <h3>المرفقات</h3>
                        <div className="image-preview-grid">
                            {images.map((src, i) => (
                                <div key={i} className="img-wrapper">
                                    <img src={src} className="preview-img" alt="Uploaded" />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                <footer>
                    <div style={{ height: '4px', background: 'linear-gradient(90deg, #ccc, #bfa670)', marginBottom: '10px', width: '100%' }}></div>
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
            </div>
        </div>
    );
}
