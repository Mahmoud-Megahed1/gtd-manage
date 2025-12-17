import { eq, desc, and, or, like, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  clients, InsertClient,
  projects, InsertProject,

  invoices, InsertInvoice,
  invoiceItems, InsertInvoiceItem,
  forms, InsertForm,
  boq, InsertBOQ,
  expenses, InsertExpense,
  installments, InsertInstallment,
  auditLogs, InsertAuditLog,
  companySettings, InsertCompanySetting,
  attachments, InsertAttachment
} from "../drizzle/schema";
import { ENV } from './_core/env';
import * as demo from './_core/demoStore';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============= USER MANAGEMENT =============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    const existing = demo.filter("users", (u) => u.openId === user.openId);
    if (existing.length > 0) {
      const current = existing[0];
      demo.update("users", current.id, {
        name: user.name ?? current.name ?? null,
        email: user.email ?? current.email ?? null,
        loginMethod: user.loginMethod ?? current.loginMethod ?? null,
        role: user.role ?? current.role ?? null,
        lastSignedIn: user.lastSignedIn ?? new Date(),
      });
    } else {
      demo.insert("users", {
        openId: user.openId,
        name: user.name ?? null,
        email: user.email ?? null,
        loginMethod: user.loginMethod ?? null,
        role: user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : null),
        lastSignedIn: user.lastSignedIn ?? new Date(),
      });
    }
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    const match = demo.filter("users", (u) => u.openId === openId);
    return match.length > 0 ? match[0] : undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(users).orderBy(desc(users.createdAt));
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    const match = demo.filter("users", (u) => (u.email || "").toLowerCase() === email.toLowerCase());
    return match.length > 0 ? match[0] : undefined;
  }
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createUser(user: { name: string; email: string; role: any }) {
  const db = await getDb();
  if (!db) {
    const rec = demo.insert("users", {
      openId: `local-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      name: user.name,
      email: user.email,
      role: user.role,
      loginMethod: "email",
      lastSignedIn: new Date()
    });
    return rec;
  }

  await db.insert(users).values({
    openId: `local-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    name: user.name,
    email: user.email,
    role: user.role,
    loginMethod: 'email',
    lastSignedIn: new Date()
  });

  // Get the newly created user by email
  const newUser = await db.select().from(users).where(eq(users.email, user.email)).limit(1);
  return newUser[0];
}

export async function updateUser(userId: number, data: { name?: string; email?: string; role?: any }) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, userId));
}

export async function updateUserRole(userId: number, role: any) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function deleteUser(userId: number) {
  const db = await getDb();
  if (!db) {
    demo.remove("users", userId);
    return;
  }
  await db.delete(users).where(eq(users.id, userId));
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) {
    return demo.findById("users", userId);
  }
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result[0] || null;
}

export async function setUserPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) {
    demo.update("users", userId, { passwordHash });
    return;
  }
  await db.update(users).set({ passwordHash } as any).where(eq(users.id, userId));
}

export async function updateUserLastSignedIn(userId: number) {
  const db = await getDb();
  if (!db) {
    demo.update("users", userId, { lastSignedIn: new Date() });
    return;
  }
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));
}

// ============= CLIENT MANAGEMENT =============

export async function createClient(client: InsertClient) {
  const db = await getDb();
  if (!db) return demo.insert("clients", client);

  const result = await db.insert(clients).values(client);
  return result;
}

export async function getAllClients() {
  const db = await getDb();
  if (!db) return demo.list("clients");
  return await db.select().from(clients).orderBy(desc(clients.createdAt));
}

export async function getClientById(id: number) {
  const db = await getDb();
  if (!db) return demo.findById("clients", id);
  const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return result[0] || null;
}

export async function updateClient(id: number, data: Partial<InsertClient>) {
  const db = await getDb();
  if (!db) return;
  await db.update(clients).set(data).where(eq(clients.id, id));
}

export async function deleteClient(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(clients).where(eq(clients.id, id));
}

export async function getClientProjects(clientId: number) {
  const db = await getDb();
  if (!db) return demo.filter("projects", (p) => p.clientId === clientId);
  return await db.select().from(projects).where(eq(projects.clientId, clientId)).orderBy(desc(projects.createdAt));
}

export async function getClientInvoices(clientId: number) {
  const db = await getDb();
  if (!db) return demo.filter("invoices", (i) => i.clientId === clientId);
  return await db.select().from(invoices).where(eq(invoices.clientId, clientId)).orderBy(desc(invoices.createdAt));
}

export async function getClientForms(clientId: number) {
  const db = await getDb();
  if (!db) return demo.filter("forms", (f) => f.clientId === clientId);
  return await db.select().from(forms).where(eq(forms.clientId, clientId)).orderBy(desc(forms.createdAt));
}

// ============= PROJECT MANAGEMENT =============

export async function createProject(project: InsertProject) {
  const db = await getDb();
  if (!db) return demo.insert("projects", project);
  const result = await db.insert(projects).values(project);
  return result;
}

export async function getAllProjects() {
  const db = await getDb();
  if (!db) return demo.list("projects");
  return await db.select().from(projects).orderBy(desc(projects.createdAt));
}

export async function getProjectById(id: number) {
  const db = await getDb();
  if (!db) return demo.findById("projects", id);
  const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return result[0] || null;
}

export async function updateProject(id: number, data: Partial<InsertProject>) {
  const db = await getDb();
  if (!db) return;
  await db.update(projects).set(data).where(eq(projects.id, id));
}

export async function deleteProject(id: number) {
  const db = await getDb();
  if (!db) {
    demo.remove("projects", id);
    return;
  }
  // Delete related records first
  await db.delete(boq).where(eq(boq.projectId, id));
  await db.delete(expenses).where(eq(expenses.projectId, id));
  await db.delete(installments).where(eq(installments.projectId, id));
  // Delete project
  await db.delete(projects).where(eq(projects.id, id));
}


// ============= INVOICE MANAGEMENT =============

export async function createInvoice(invoice: InsertInvoice) {
  const db = await getDb();
  if (!db) return demo.insert("invoices", invoice);
  const result = await db.insert(invoices).values(invoice);
  return result;
}

export async function getAllInvoices() {
  const db = await getDb();
  if (!db) return demo.list("invoices");
  return await db.select().from(invoices).orderBy(desc(invoices.createdAt));
}

export async function getInvoiceById(id: number) {
  const db = await getDb();
  if (!db) return demo.findById("invoices", id);
  const result = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
  return result[0] || null;
}

export async function updateInvoice(id: number, data: Partial<InsertInvoice>) {
  const db = await getDb();
  if (!db) return;
  await db.update(invoices).set(data).where(eq(invoices.id, id));
}

export async function deleteInvoice(id: number) {
  const db = await getDb();
  if (!db) return;
  // Delete related items first
  await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
  // Delete invoice
  await db.delete(invoices).where(eq(invoices.id, id));
}

export async function getInvoiceItems(invoiceId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId)).orderBy(invoiceItems.sortOrder);
}

export async function createInvoiceItem(item: InsertInvoiceItem) {
  const db = await getDb();
  if (!db) return demo.insert("invoiceItems", item);
  const result = await db.insert(invoiceItems).values(item);
  return result;
}

export async function deleteInvoiceItem(id: number) {
  const db = await getDb();
  if (!db) {
    demo.remove("invoiceItems", id);
    return;
  }
  await db.delete(invoiceItems).where(eq(invoiceItems.id, id));
}

// ============= FORM MANAGEMENT =============

export async function createForm(form: InsertForm) {
  const db = await getDb();
  if (!db) return demo.insert("forms", form);
  const result = await db.insert(forms).values(form);
  return result;
}

export async function getAllForms() {
  const db = await getDb();
  if (!db) return demo.list("forms");
  return await db.select().from(forms).orderBy(desc(forms.createdAt));
}

export async function getFormById(id: number) {
  const db = await getDb();
  if (!db) return demo.findById("forms", id);
  const result = await db.select().from(forms).where(eq(forms.id, id)).limit(1);
  return result[0] || null;
}

export async function updateForm(id: number, data: Partial<InsertForm>) {
  const db = await getDb();
  if (!db) return;
  await db.update(forms).set(data).where(eq(forms.id, id));
}

export async function deleteForm(id: number) {
  const db = await getDb();
  if (!db) {
    demo.remove("forms", id);
    demo.write("attachments", demo.list("attachments").filter((a: any) => !(a.entityType === "form" && a.entityId === id)));
    return;
  }
  // Delete related attachments first
  await db.delete(attachments).where(and(eq(attachments.entityType, 'form'), eq(attachments.entityId, id)));
  // Delete form
  await db.delete(forms).where(eq(forms.id, id));
}

// ============= BOQ MANAGEMENT =============

export async function createBOQItem(item: InsertBOQ) {
  const db = await getDb();
  if (!db) return demo.insert("boq", item);
  const result = await db.insert(boq).values(item);
  return result;
}

export async function getProjectBOQ(projectId: number) {
  const db = await getDb();
  if (!db) return demo.filter("boq", (b) => b.projectId === projectId);
  return await db.select().from(boq).where(eq(boq.projectId, projectId));
}

export async function updateBOQItem(id: number, data: Partial<InsertBOQ>) {
  const db = await getDb();
  if (!db) return;
  await db.update(boq).set(data).where(eq(boq.id, id));
}

export async function deleteBOQItem(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(boq).where(eq(boq.id, id));
}

// ============= EXPENSE MANAGEMENT =============

export async function createExpense(expense: InsertExpense) {
  const db = await getDb();
  if (!db) return demo.insert("expenses", expense);
  const result = await db.insert(expenses).values(expense);
  return result;
}

export async function getAllExpenses() {
  const db = await getDb();
  if (!db) return demo.list("expenses");
  return await db.select().from(expenses).orderBy(desc(expenses.expenseDate));
}

export async function getProjectExpenses(projectId: number) {
  const db = await getDb();
  if (!db) return demo.filter("expenses", (e) => e.projectId === projectId);
  return await db.select().from(expenses).where(eq(expenses.projectId, projectId)).orderBy(desc(expenses.expenseDate));
}

export async function updateExpense(id: number, data: Partial<InsertExpense>) {
  const db = await getDb();
  if (!db) return;
  await db.update(expenses).set(data).where(eq(expenses.id, id));
}

export async function deleteExpense(id: number) {
  const db = await getDb();
  if (!db) {
    demo.remove("expenses", id);
    return;
  }
  await db.delete(expenses).where(eq(expenses.id, id));
}

// ============= INSTALLMENT MANAGEMENT =============

export async function createInstallment(installment: InsertInstallment) {
  const db = await getDb();
  if (!db) return demo.insert("installments", installment);
  const result = await db.insert(installments).values(installment);
  return result;
}

export async function getProjectInstallments(projectId: number) {
  const db = await getDb();
  if (!db) return demo.filter("installments", (i) => i.projectId === projectId);
  return await db.select().from(installments).where(eq(installments.projectId, projectId)).orderBy(installments.dueDate);
}

export async function updateInstallment(id: number, data: Partial<InsertInstallment>) {
  const db = await getDb();
  if (!db) return;
  await db.update(installments).set(data).where(eq(installments.id, id));
}

export async function deleteInstallment(id: number) {
  const db = await getDb();
  if (!db) {
    demo.remove("installments", id);
    return;
  }
  await db.delete(installments).where(eq(installments.id, id));
}

// ============= AUDIT LOG =============

export async function createAuditLog(log: InsertAuditLog) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(auditLogs).values(log);
  } catch (error) {
    console.error("[Database] Failed to create audit log:", error);
  }
}

export async function getAuditLogs(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  const logs = await db.select({
    id: auditLogs.id,
    userId: auditLogs.userId,
    action: auditLogs.action,
    entityType: auditLogs.entityType,
    entityId: auditLogs.entityId,
    details: auditLogs.details,
    ipAddress: auditLogs.ipAddress,
    createdAt: auditLogs.createdAt,
    userName: users.name
  })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
  return logs;
}

export async function getEntityAuditLogs(entityType: string, entityId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(auditLogs)
    .where(and(eq(auditLogs.entityType, entityType), eq(auditLogs.entityId, entityId)))
    .orderBy(desc(auditLogs.createdAt));
}

// ============= COMPANY SETTINGS =============

export async function getCompanySetting(key: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(companySettings).where(eq(companySettings.settingKey, key)).limit(1);
  return result[0] || null;
}

export async function setCompanySetting(key: string, value: string, updatedBy: number) {
  const db = await getDb();
  if (!db) {
    const list = demo.list("companySettings").filter((s: any) => s.settingKey !== key);
    list.push({ id: Date.now(), settingKey: key, settingValue: value, updatedBy, updatedAt: new Date() });
    demo.write("companySettings", list);
    return;
  }

  await db.insert(companySettings).values({
    settingKey: key,
    settingValue: value,
    updatedBy
  }).onDuplicateKeyUpdate({
    set: { settingValue: value, updatedBy }
  });
}

export async function getAllCompanySettings() {
  const db = await getDb();
  if (!db) return demo.list("companySettings");
  return await db.select().from(companySettings);
}

// ============= ATTACHMENTS =============

export async function createAttachment(attachment: InsertAttachment) {
  const db = await getDb();
  if (!db) return demo.insert("attachments", attachment);
  const result = await db.insert(attachments).values(attachment);
  return result;
}

export async function getEntityAttachments(entityType: string, entityId: number) {
  const db = await getDb();
  if (!db) return demo.filter("attachments", (a) => a.entityType === entityType && a.entityId === entityId);
  return await db.select().from(attachments)
    .where(and(eq(attachments.entityType, entityType), eq(attachments.entityId, entityId)))
    .orderBy(desc(attachments.createdAt));
}

export async function deleteAttachment(id: number) {
  const db = await getDb();
  if (!db) {
    demo.remove("attachments", id);
    return;
  }
  await db.delete(attachments).where(eq(attachments.id, id));
}

// ============= USER PERMISSIONS =============
import { userPermissions, InsertUserPermissions, projectTasks, InsertProjectTask } from "../drizzle/schema";

export async function getUserPermissions(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(userPermissions).where(eq(userPermissions.userId, userId)).limit(1);
  return result[0] || null;
}

export async function setUserPermissions(userId: number, permissions: Record<string, boolean>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  console.log("[Permissions] Saving for userId:", userId, permissions);
  const json = JSON.stringify(permissions);
  try {
    await db.insert(userPermissions).values({
      userId,
      permissionsJson: json
    } as InsertUserPermissions).onDuplicateKeyUpdate({
      set: { permissionsJson: json }
    });
    console.log("[Permissions] Saved successfully for userId:", userId);
  } catch (error) {
    console.error("[Permissions] Failed to save:", error);
    throw error;
  }
}

// ============= PROJECT TASKS =============
export async function createProjectTask(task: InsertProjectTask) {
  const db = await getDb();
  if (!db) return demo.insert("projectTasks", task);
  const result = await db.insert(projectTasks).values(task);
  return result;
}

export async function getProjectTasks(projectId: number) {
  const db = await getDb();
  if (!db) return demo.filter("projectTasks", (t) => t.projectId === projectId).sort((a, b) => (b.startDate ?? 0) - (a.startDate ?? 0));
  return await db.select().from(projectTasks).where(eq(projectTasks.projectId, projectId)).orderBy(desc(projectTasks.startDate));
}

export async function updateProjectTask(id: number, data: Partial<InsertProjectTask>) {
  const db = await getDb();
  if (!db) return;
  await db.update(projectTasks).set(data).where(eq(projectTasks.id, id));
}

export async function deleteProjectTask(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(projectTasks).where(eq(projectTasks.id, id));
}

// ============= SEARCH =============

export async function globalSearch(query: string) {
  const db = await getDb();
  if (!db) return { clients: [], projects: [], invoices: [], forms: [] };

  const searchPattern = `%${query}%`;

  const [clientResults, projectResults, invoiceResults, formResults] = await Promise.all([
    db.select().from(clients).where(
      or(
        like(clients.name, searchPattern),
        like(clients.email, searchPattern),
        like(clients.phone, searchPattern),
        like(clients.clientNumber, searchPattern)
      )
    ).limit(10),

    db.select().from(projects).where(
      or(
        like(projects.name, searchPattern),
        like(projects.projectNumber, searchPattern),
        like(projects.description, searchPattern)
      )
    ).limit(10),

    db.select().from(invoices).where(
      like(invoices.invoiceNumber, searchPattern)
    ).limit(10),

    db.select().from(forms).where(
      like(forms.formNumber, searchPattern)
    ).limit(10)
  ]);

  return {
    clients: clientResults,
    projects: projectResults,
    invoices: invoiceResults,
    forms: formResults
  };
}

// ============= STATISTICS =============

export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return null;

  const [clientCount, projectCount, invoiceCount, formCount] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(clients),
    db.select({ count: sql<number>`count(*)` }).from(projects),
    db.select({ count: sql<number>`count(*)` }).from(invoices),
    db.select({ count: sql<number>`count(*)` }).from(forms)
  ]);

  return {
    totalClients: clientCount[0]?.count || 0,
    totalProjects: projectCount[0]?.count || 0,
    totalInvoices: invoiceCount[0]?.count || 0,
    totalForms: formCount[0]?.count || 0
  };
}

// ============= CHANGE ORDERS =============
import { changeOrders, InsertChangeOrder } from "../drizzle/schema";

export async function createChangeOrder(co: InsertChangeOrder) {
  const db = await getDb();
  if (!db) return demo.insert("changeOrders", co);
  const result = await db.insert(changeOrders).values(co);
  return result;
}

export async function getProjectChangeOrders(projectId: number) {
  const db = await getDb();
  if (!db) return demo.filter("changeOrders", (c) => c.projectId === projectId).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  return await db.select().from(changeOrders).where(eq(changeOrders.projectId, projectId)).orderBy(desc(changeOrders.createdAt));
}

export async function getChangeOrderById(id: number) {
  const db = await getDb();
  if (!db) return demo.findById("changeOrders", id);
  const result = await db.select().from(changeOrders).where(eq(changeOrders.id, id)).limit(1);
  return result[0] || null;
}

export async function updateChangeOrder(id: number, data: Partial<InsertChangeOrder>) {
  const db = await getDb();
  if (!db) {
    demo.update("changeOrders", id, data);
    return;
  }
  await db.update(changeOrders).set(data).where(eq(changeOrders.id, id));
}

export async function deleteChangeOrder(id: number) {
  const db = await getDb();
  if (!db) {
    demo.remove("changeOrders", id);
    return;
  }
  await db.delete(changeOrders).where(eq(changeOrders.id, id));
}
