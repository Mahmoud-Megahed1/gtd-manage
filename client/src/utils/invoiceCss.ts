export const INVOICE_CSS = `
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

.invoice-form-container * {
    box-sizing: border-box;
    outline: none;
}

/* Main Container to match body style of reference */
.invoice-form-container {
    font-family: 'Tajawal', sans-serif;
    background-color: var(--bg-color);
    margin: 0;
    padding: 20px;
    color: #333;
    font-size: 13px;
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 100vh;
}

/* Paper Layout - mapped from .page-container */
.invoice-page {
    width: 100%;
    max-width: none;
    margin: 0 auto;
    background: var(--paper-bg);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    padding: 25px;
    min-height: 297mm;
    position: relative;
    display: flex;
    flex-direction: column;
    direction: rtl;
}

/* Action Bar - mapped from .action-bar */
.invoice-action-bar {
    margin-top: auto;
    margin-bottom: 20px;
    background: rgba(51, 51, 51, 0.9);
    backdrop-filter: blur(10px);
    padding: 8px 20px;
    border-radius: 50px;
    display: flex;
    gap: 10px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    z-index: 1000;
    transition: all 0.3s ease;
}

.invoice-action-bar:hover {
    background: rgba(51, 51, 51, 1);
}

/* Buttons - mapped from .btn */
.invoice-btn {
    background: var(--primary-color);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 20px;
    cursor: pointer;
    font-family: 'Tajawal', sans-serif;
    font-weight: 600;
    font-size: 13px;
    transition: 0.2s;
    display: flex;
    align-items: center;
    gap: 6px;
}

.invoice-btn:hover {
    background: #a38d5d;
}

.invoice-btn-danger {
    background: var(--danger-color);
}

.invoice-btn-secondary {
    background: #555;
}

.invoice-btn-small {
    padding: 5px 10px;
    font-size: 11px;
    border-radius: 4px;
    margin-top: 5px;
}

/* Placeholders */
.logo-placeholder,
.barcode-placeholder {
    width: 100%;
    background: transparent;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    color: transparent;
}

.logo-placeholder {
    height: 100px;
    margin-bottom: 10px;
    justify-content: flex-start;
}

.barcode-placeholder {
    height: 100px;
    width: 240px;
}

/* Headings */
.invoice-page h1,
.invoice-page h2,
.invoice-page h3,
.invoice-page h4 {
    margin: 0 0 8px 0;
    color: var(--secondary-color);
}

.invoice-page h1 {
    font-size: 22px;
}

.invoice-page h3 {
    font-size: 14px;
    margin-bottom: 5px;
}

.invoice-page h2 {
    font-size: 15px;
    border-bottom: 2px solid var(--primary-color);
    padding-bottom: 2px;
    margin-top: 10px;
}

/* Form Grid - mapped from .form-row */
.invoice-form-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 8px;
}

/* Mapped from .form-group */
.invoice-form-group {
    flex: 1;
    min-width: 150px;
    display: flex;
    flex-direction: column;
}

.invoice-form-group label {
    font-weight: 600;
    margin-bottom: 2px;
    font-size: 11px;
    color: #555;
    text-align: right;
}

.invoice-page input[type="text"],
.invoice-page input[type="number"],
.invoice-page input[type="date"],
.invoice-page input[type="tel"],
.invoice-page select,
.invoice-page textarea {
    width: 100%;
    padding: 5px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-family: inherit;
    background: #fff;
    font-size: 11px;
    text-align: right;
}

.invoice-page textarea {
    resize: vertical;
    min-height: 30px;
}

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

.invoice-page input[type="checkbox"] {
    width: 13px;
    height: 13px;
    margin: 0;
    cursor: pointer;
}

/* Tables */
.table-responsive {
    width: 100%;
    overflow-x: auto;
    margin-bottom: 5px;
}

.invoice-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
}

.invoice-table th,
.invoice-table td {
    border: 1px solid var(--border-color);
    padding: 4px;
    text-align: center;
    vertical-align: middle;
}

.invoice-table th {
    background-color: var(--secondary-color);
    color: white;
    font-weight: 500;
    font-size: 10px;
}

.invoice-table td input,
.invoice-table td textarea,
.invoice-table td select {
    border: none;
    background: transparent;
    width: 100%;
    text-align: center;
    padding: 2px;
    font-size: 11px;
}

.invoice-table td input:focus,
.invoice-table td textarea:focus,
.invoice-table td select:focus {
    background: #fff8e1;
}

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

/* Helpers */
.hidden {
    display: none !important;
}

.other-input {
    margin-top: 3px;
    border-bottom: 1px dashed #ccc !important;
    border-top: none !important;
    border-left: none !important;
    border-right: none !important;
    border-radius: 0 !important;
}

/* Totals */
.totals-section {
    background: #f0f0f0;
    padding: 8px;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 5px;
}

.total-row {
    display: flex;
    gap: 15px;
    align-items: center;
    font-size: 12px;
    font-weight: bold;
}

/* Terms List */
.terms-ul {
    padding-right: 18px;
    margin-bottom: 0;
    line-height: 1.6;
    margin-top: 3px;
    font-size: 11px;
}

.terms-ul li {
    margin-bottom: 2px;
}

/* Footer */
.invoice-footer {
    margin-top: auto;
    padding-top: 10px;
}

.row-action {
    background: none;
    border: none;
    cursor: pointer;
    color: #999;
    font-size: 14px;
}

.row-action:hover {
    color: var(--danger-color);
}

.add-row-btn {
    background: #eee;
    border: 1px dashed #999;
    width: 100%;
    padding: 4px;
    cursor: pointer;
    font-size: 11px;
}

.add-row-btn:hover {
    background: #e0e0e0;
}

.print-only-section {
    display: none !important;
}

/* PRINT STYLES - COPIED FROM @MEDIA PRINT BUT APPLIED GLOBALLY FOR HTML EXPORT */
   @page {
        size: A4;
        margin: 0;
    }

    html,
    body,
    .invoice-form-container {
        width: 210mm;
        height: auto;
        margin: 0;
        padding: 0;
        min-height: auto;
        display: block;
        background: white;
    }

    .invoice-form-container {
        padding: 0;
    }

    /* Hide the interactive form */
    .invoice-page {
       /* display: none !important;  -- WE WANT THIS VISIBLE FOR EXPORT IF IT IS THE ROOT */
    }

    /* Show the dedicated print view */
    .print-view-container {
        display: block !important;
        visibility: visible !important;
        position: relative; /* Changed from absolute to relative for static file */
        top: 0;
        left: 0;
        width: 100%;
        background: white;
    }

    .print-view-container * {
        visibility: visible;
    }

    .invoice-action-bar,
    .add-row-btn,
    .row-action,
    .no-print,
    aside,
    nav,
    .lg\\:hidden.fixed,
    div[class*="fixed top-0"] {
        display: none !important;
    }

    /* Reset Dashboard Layout wrappers */
    main {
        margin-right: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        max-width: none !important;
        height: auto !important;
        overflow: visible !important;
        display: block !important;
    }

    div[class*="p-6"] {
        padding: 0 !important;
    }

    .print-only-section {
        display: block !important;
    }

    .print-field {
        border-bottom: 1px solid #ccc;
        padding-bottom: 2px;
        min-height: 18px;
    }

    /* 1. Compacting elements for density */
    .invoice-page h1 {
        font-size: 20px;
        margin-bottom: 2px;
    }

    .invoice-page h2 {
        font-size: 14px;
        margin-top: 5px;
        padding-bottom: 2px;
        margin-bottom: 3px;
    }

    .invoice-page h3 {
        font-size: 12px;
        margin-bottom: 2px;
    }

    .invoice-form-row {
        margin-bottom: 4px;
        gap: 5px;
        display: flex;
    }

    .invoice-form-group {
        margin-bottom: 0;
    }

    /* Remove section breaking constraints */
    section {
        page-break-inside: auto;
        margin-bottom: 5px;
    }

    tr {
        page-break-inside: avoid;
    }

    .invoice-page input,
    .invoice-page textarea,
    .invoice-page select {
        border: none !important;
        background: transparent !important;
        padding: 0;
        font-size: 11px;
        appearance: none;
        color: #000;
    }

    /* 2. Checkboxes: Custom Styling for Print - Solid Gold Block */
    .invoice-page input[type="checkbox"] {
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

    .invoice-page input[type="checkbox"]:checked {
        background-color: #bfa670 !important;
        /* Gold color */
        border-color: #bfa670 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }

    .invoice-page input[type="checkbox"]:checked:after,
    .invoice-page input[type="checkbox"]:checked:before {
        content: none;
        display: none;
    }

    .other-input[style*="none"] {
        display: none !important;
    }

    /* Lists */
    .service-list {
        display: block;
        border: none;
        padding: 0;
        background: none;
        margin-bottom: 2px;
    }

    .checkbox-item {
        display: inline-flex;
        width: 33%;
        background: none;
        padding: 1px 0;
        font-size: 10px;
        margin-bottom: 2px;
    }

    .totals-section {
        padding: 5px;
        background: none;
        border-top: 1px solid #000;
        margin-top: 5px;
    }

    /* Footer Print adjustments */
    .invoice-footer {
        margin-top: 10px;
        font-size: 12px;
        page-break-inside: avoid;
        width: 100%;
    }

    .logo-placeholder {
        height: 60px;
        margin-bottom: 5px;
    }

    .invoice-table {
        font-size: 11px;
        margin-bottom: 5px;
    }

    .invoice-table th {
        font-size: 10px;
        background-color: #eee !important;
        color: #000 !important;
    }

    .invoice-table td {
        padding: 2px;
    }

    /* Screen styles for print view overrides */
    .print-only {
        display: block !important;
    }
`;
