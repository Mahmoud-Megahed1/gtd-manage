
import { getDb } from "../db";
import {
    expenses, sales, purchases, invoices, boq, installments, approvalRequests,
    projectTasks, forms
} from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export async function executeApprovalAction(requestId: number, request: any, ctx: any) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const data = JSON.parse(request.requestData || '{}');
    const { entityType, action, entityId, requestedBy } = request;

    // Helper to parse dates
    const parseDates = (obj: any, fields: string[]) => {
        const newObj = { ...obj };
        fields.forEach(f => {
            if (newObj[f]) newObj[f] = new Date(newObj[f]);
        });
        return newObj;
    };

    if (action === 'create') {
        switch (entityType) {
            case 'expense':
                await db.insert(expenses).values({
                    ...parseDates(data, ['expenseDate']),
                    createdBy: requestedBy,
                    status: 'active'
                });
                break;
            case 'sale':
                // Generate saleNumber if not present (though usually passed in data or auto-generated)
                // In accounting.ts, it was `SAL-${Date.now()}`.
                // We should ensure saleNumber exists.
                const saleData = parseDates(data, ['saleDate']);
                if (!saleData.saleNumber) saleData.saleNumber = `SAL-${Date.now()}`;

                await db.insert(sales).values({
                    ...saleData,
                    createdBy: requestedBy,
                    status: 'completed'
                });
                break;
            case 'purchase':
                const purchaseData = parseDates(data, ['purchaseDate']);
                if (!purchaseData.purchaseNumber) purchaseData.purchaseNumber = `PUR-${Date.now()}`;

                await db.insert(purchases).values({
                    ...purchaseData,
                    createdBy: requestedBy,
                    status: 'completed'
                });
                break;
            case 'boq':
                await db.insert(boq).values(data); // BOQ usually doesn't have date fields needing parse in basic create
                break;
            case 'installment':
                await db.insert(installments).values(parseDates(data, ['dueDate', 'paidDate']));
                break;
            case 'invoice':
                // Invoices are complex (headers + items). 
                // If requestData contains nested items, we need to handle them.
                // Assuming simplified handling for now or that data is flat structure for header.
                // Ideally this should call the invoice service.
                // For now, we will throw if not implemented to avoid bad data.
                // OR allow if data matches schema.
                const invoiceData = parseDates(data, ['issueDate', 'dueDate']);
                await db.insert(invoices).values({
                    ...invoiceData,
                    createdBy: requestedBy
                });
                // Note: Invoice items not handled here yet.
                break;
            default:
                throw new Error(`Create action not supported for ${entityType}`);
        }
    } else if (action === 'delete') {
        if (!entityId) throw new Error("Entity ID required for delete");

        switch (entityType) {
            case 'expense': await db.delete(expenses).where(eq(expenses.id, entityId)); break;
            case 'sale': await db.delete(sales).where(eq(sales.id, entityId)); break;
            case 'purchase': await db.delete(purchases).where(eq(purchases.id, entityId)); break;
            case 'boq': await db.delete(boq).where(eq(boq.id, entityId)); break;
            case 'installment': await db.delete(installments).where(eq(installments.id, entityId)); break;
            case 'invoice': await db.delete(invoices).where(eq(invoices.id, entityId)); break;
            default: throw new Error(`Delete action not supported for ${entityType}`);
        }
    } else if (action === 'update') {
        if (!entityId) throw new Error("Entity ID required for update");

        switch (entityType) {
            case 'expense':
                await db.update(expenses).set(parseDates(data, ['expenseDate'])).where(eq(expenses.id, entityId));
                break;
            case 'sale':
                await db.update(sales).set(parseDates(data, ['saleDate'])).where(eq(sales.id, entityId));
                break;
            case 'purchase':
                await db.update(purchases).set(parseDates(data, ['purchaseDate'])).where(eq(purchases.id, entityId));
                break;
            // Add others as needed
            default: throw new Error(`Update action not supported for ${entityType}`);
        }
    }
}
