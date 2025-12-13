import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, index } from "drizzle-orm/mysql-core";

/**
 * Core user table with role-based access control
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", [
    "admin",
    "accountant",
    "finance_manager",
    "project_manager",
    "site_engineer",
    "planning_engineer",
    "procurement_officer",
    "qa_qc",
    "document_controller",
    "architect",
    "interior_designer",
    "sales_manager",
    "hr_manager",
    "storekeeper",
    "designer",
    "viewer"
  ]).default("designer").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/**
 * Clients table - stores customer information
 */
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  clientNumber: varchar("clientNumber", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  notes: text("notes"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Projects table - stores project information
 */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  projectNumber: varchar("projectNumber", { length: 50 }).notNull().unique(),
  clientId: int("clientId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["design", "execution", "delivery", "completed", "cancelled"]).default("design").notNull(),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  budget: int("budget"),
  assignedTo: int("assignedTo"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Invoices and Quotes table
 */
export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  invoiceNumber: varchar("invoiceNumber", { length: 50 }).notNull().unique(),
  type: mysqlEnum("type", ["invoice", "quote"]).notNull(),
  clientId: int("clientId").notNull(),
  projectId: int("projectId"),
  issueDate: timestamp("issueDate").notNull(),
  dueDate: timestamp("dueDate"),
  status: mysqlEnum("status", ["draft", "sent", "paid", "cancelled"]).default("draft").notNull(),
  subtotal: int("subtotal").notNull(),
  tax: int("tax").default(0),
  discount: int("discount").default(0),
  total: int("total").notNull(),
  notes: text("notes"),
  terms: text("terms"),
  formData: text("formData"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  idx_issueDate: index("idx_invoices_issueDate").on(t.issueDate),
  idx_client: index("idx_invoices_clientId").on(t.clientId),
  idx_project: index("idx_invoices_projectId").on(t.projectId)
}));

/**
 * Invoice items
 */
export const invoiceItems = mysqlTable("invoiceItems", {
  id: int("id").autoincrement().primaryKey(),
  invoiceId: int("invoiceId").notNull(),
  description: text("description").notNull(),
  quantity: int("quantity").notNull(),
  unitPrice: int("unitPrice").notNull(),
  total: int("total").notNull(),
  sortOrder: int("sortOrder").default(0),
});

/**
 * Forms table - stores client request forms
 */
export const forms = mysqlTable("forms", {
  id: int("id").autoincrement().primaryKey(),
  formNumber: varchar("formNumber", { length: 50 }).notNull().unique(),
  clientId: int("clientId").notNull(),
  projectId: int("projectId"),
  formType: varchar("formType", { length: 100 }).notNull(),
  formData: text("formData").notNull(),
  status: mysqlEnum("status", ["pending", "reviewed", "approved", "rejected"]).default("pending").notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * BOQ (Bill of Quantities) table
 */
export const boq = mysqlTable("boq", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  itemName: varchar("itemName", { length: 255 }).notNull(),
  description: text("description"),
  quantity: int("quantity").notNull(),
  unit: varchar("unit", { length: 50 }),
  unitPrice: int("unitPrice").notNull(),
  total: int("total").notNull(),
  category: varchar("category", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Expenses table - operating costs
 */
export const expenses = mysqlTable("expenses", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId"),
  category: varchar("category", { length: 100 }).notNull(),
  description: text("description").notNull(),
  amount: int("amount").notNull(),
  expenseDate: timestamp("expenseDate").notNull(),
  receipt: varchar("receipt", { length: 500 }),
  status: mysqlEnum("status", ["active", "cancelled"]).default("active").notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  idx_expenseDate: index("idx_expenses_expenseDate").on(t.expenseDate),
  idx_project: index("idx_expenses_projectId").on(t.projectId)
}));

/**
 * Installments table - project payment installments
 */
export const installments = mysqlTable("installments", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  invoiceId: int("invoiceId"),
  installmentNumber: int("installmentNumber").notNull(),
  amount: int("amount").notNull(),
  dueDate: timestamp("dueDate").notNull(),
  paidDate: timestamp("paidDate"),
  status: mysqlEnum("status", ["pending", "paid", "overdue", "cancelled"]).default("pending").notNull(),
  paymentMethod: varchar("paymentMethod", { length: 50 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  idx_createdAt: index("idx_installments_createdAt").on(t.createdAt),
  idx_project: index("idx_installments_projectId").on(t.projectId),
  idx_invoice: index("idx_installments_invoiceId").on(t.invoiceId)
}));

/**
 * Audit logs - track all user actions
 */
export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entityType", { length: 50 }),
  entityId: int("entityId"),
  details: text("details"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  idx_createdAt: index("idx_auditLogs_createdAt").on(t.createdAt),
  idx_entity: index("idx_auditLogs_entity").on(t.entityType, t.entityId)
}));

/**
 * Company settings
 */
export const companySettings = mysqlTable("companySettings", {
  id: int("id").autoincrement().primaryKey(),
  settingKey: varchar("settingKey", { length: 100 }).notNull().unique(),
  settingValue: text("settingValue"),
  updatedBy: int("updatedBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * File attachments
 */
export const attachments = mysqlTable("attachments", {
  id: int("id").autoincrement().primaryKey(),
  entityType: varchar("entityType", { length: 50 }).notNull(),
  entityId: int("entityId").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 1000 }).notNull(),
  fileSize: int("fileSize"),
  mimeType: varchar("mimeType", { length: 100 }),
  uploadedBy: int("uploadedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * User permissions - manual section access control
 */
export const userPermissions = mysqlTable("userPermissions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  permissionsJson: text("permissionsJson"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Project tasks timeline
 */
export const projectTasks = mysqlTable("projectTasks", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  status: mysqlEnum("status", ["planned", "in_progress", "done", "cancelled"]).default("planned").notNull(),
  assignedTo: int("assignedTo"),
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  estimateHours: int("estimateHours"),
  progress: int("progress").default(0).notNull(),
  parentId: int("parentId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  idx_project: index("idx_projectTasks_projectId").on(t.projectId),
  idx_assignedTo: index("idx_projectTasks_assignedTo").on(t.assignedTo),
  idx_parentId: index("idx_projectTasks_parentId").on(t.parentId)
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type InsertInvoiceItem = typeof invoiceItems.$inferInsert;
export type Form = typeof forms.$inferSelect;
export type InsertForm = typeof forms.$inferInsert;
export type BOQ = typeof boq.$inferSelect;
export type InsertBOQ = typeof boq.$inferInsert;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;
export type Installment = typeof installments.$inferSelect;
export type InsertInstallment = typeof installments.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
export type CompanySetting = typeof companySettings.$inferSelect;
export type InsertCompanySetting = typeof companySettings.$inferInsert;
export type Attachment = typeof attachments.$inferSelect;
export type InsertAttachment = typeof attachments.$inferInsert;
export type UserPermissions = typeof userPermissions.$inferSelect;
export type InsertUserPermissions = typeof userPermissions.$inferInsert;
export type ProjectTask = typeof projectTasks.$inferSelect;
export type InsertProjectTask = typeof projectTasks.$inferInsert;

/**
 * Task comments
 */
export const taskComments = mysqlTable("taskComments", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  content: text("content").notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type TaskComment = typeof taskComments.$inferSelect;
export type InsertTaskComment = typeof taskComments.$inferInsert;

/**
 * Employees table - HR management
 */
export const employees = mysqlTable("employees", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  employeeNumber: varchar("employeeNumber", { length: 50 }).notNull().unique(),
  department: varchar("department", { length: 100 }),
  position: varchar("position", { length: 100 }),
  hireDate: timestamp("hireDate").notNull(),
  salary: int("salary"),
  bankAccount: varchar("bankAccount", { length: 100 }),
  emergencyContact: text("emergencyContact"),
  status: mysqlEnum("status", ["active", "on_leave", "terminated"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Attendance records
 */
export const attendance = mysqlTable("attendance", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  date: timestamp("date").notNull(),
  checkIn: timestamp("checkIn"),
  checkOut: timestamp("checkOut"),
  hoursWorked: int("hoursWorked"),
  status: mysqlEnum("status", ["present", "absent", "late", "half_day"]).default("present").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Payroll records
 */
export const payroll = mysqlTable("payroll", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  month: int("month").notNull(),
  year: int("year").notNull(),
  baseSalary: int("baseSalary").notNull(),
  bonuses: int("bonuses").default(0),
  deductions: int("deductions").default(0),
  netSalary: int("netSalary").notNull(),
  paymentDate: timestamp("paymentDate"),
  status: mysqlEnum("status", ["pending", "paid"]).default("pending").notNull(),
  notes: text("notes"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Leave requests
 */
export const leaves = mysqlTable("leaves", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  leaveType: mysqlEnum("leaveType", ["annual", "sick", "emergency", "unpaid"]).notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  days: int("days").notNull(),
  reason: text("reason"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Performance reviews
 */
export const performanceReviews = mysqlTable("performanceReviews", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  reviewerId: int("reviewerId").notNull(),
  reviewDate: timestamp("reviewDate").notNull(),
  period: varchar("period", { length: 50 }),
  rating: int("rating"),
  strengths: text("strengths"),
  weaknesses: text("weaknesses"),
  goals: text("goals"),
  comments: text("comments"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;
export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = typeof attendance.$inferInsert;
export type Payroll = typeof payroll.$inferSelect;
export type InsertPayroll = typeof payroll.$inferInsert;
export type Leave = typeof leaves.$inferSelect;
export type InsertLeave = typeof leaves.$inferInsert;
export type PerformanceReview = typeof performanceReviews.$inferSelect;
  export type InsertPerformanceReview = typeof performanceReviews.$inferInsert;
  /**
   * Sales table - stores sales transactions
   */
  export const sales = mysqlTable("sales", {
  id: int("id").autoincrement().primaryKey(),
  saleNumber: varchar("saleNumber", { length: 50 }).notNull().unique(),
  clientId: int("clientId").notNull(),
  projectId: int("projectId"),
  description: text("description").notNull(),
  amount: int("amount").notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "bank_transfer", "check", "credit"]).default("cash").notNull(),
  saleDate: timestamp("saleDate").notNull(),
  status: mysqlEnum("status", ["pending", "completed", "cancelled"]).default("pending").notNull(),
  invoiceId: int("invoiceId"),
  notes: text("notes"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Purchases table - stores purchase transactions
 */
export const purchases = mysqlTable("purchases", {
  id: int("id").autoincrement().primaryKey(),
  purchaseNumber: varchar("purchaseNumber", { length: 50 }).notNull().unique(),
  supplierId: int("supplierId"),
  supplierName: varchar("supplierName", { length: 255 }).notNull(),
  projectId: int("projectId"),
  description: text("description").notNull(),
  amount: int("amount").notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "bank_transfer", "check", "credit"]).default("cash").notNull(),
  purchaseDate: timestamp("purchaseDate").notNull(),
  status: mysqlEnum("status", ["pending", "completed", "cancelled"]).default("pending").notNull(),
  category: varchar("category", { length: 100 }),
  notes: text("notes"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  idx_purchaseDate: index("idx_purchases_purchaseDate").on(t.purchaseDate),
  idx_project: index("idx_purchases_projectId").on(t.projectId)
}));

  export type Sale = typeof sales.$inferSelect;
  export type InsertSale = typeof sales.$inferInsert;
  export type Purchase = typeof purchases.$inferSelect;
  export type InsertPurchase = typeof purchases.$inferInsert;

/**
 * Change Orders - project scope changes with approval and impact
 */
export const changeOrders = mysqlTable("changeOrders", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  origin: mysqlEnum("origin", ["client", "internal", "site"]).default("client").notNull(),
  status: mysqlEnum("status", ["draft", "submitted", "approved", "rejected", "cancelled"]).default("draft").notNull(),
  impactCost: int("impactCost").default(0).notNull(),
  impactDays: int("impactDays").default(0).notNull(),
  submittedBy: int("submittedBy"),
  submittedAt: timestamp("submittedAt"),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  rejectedBy: int("rejectedBy"),
  rejectedAt: timestamp("rejectedAt"),
  rejectionReason: text("rejectionReason"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChangeOrder = typeof changeOrders.$inferSelect;
export type InsertChangeOrder = typeof changeOrders.$inferInsert;

export const rfis = mysqlTable("rfis", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  rfiNumber: varchar("rfiNumber", { length: 64 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  question: text("question").notNull(),
  status: mysqlEnum("status", ["open", "answered", "closed"]).default("open").notNull(),
  submittedBy: int("submittedBy").notNull(),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  answeredBy: int("answeredBy"),
  answeredAt: timestamp("answeredAt"),
  answer: text("answer"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type RFI = typeof rfis.$inferSelect;
export type InsertRFI = typeof rfis.$inferInsert;

export const submittals = mysqlTable("submittals", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  submittalCode: varchar("submittalCode", { length: 64 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["submitted", "approved", "rejected"]).default("submitted").notNull(),
  submittedBy: int("submittedBy").notNull(),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Submittal = typeof submittals.$inferSelect;
export type InsertSubmittal = typeof submittals.$inferInsert;

export const drawings = mysqlTable("drawings", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  drawingCode: varchar("drawingCode", { length: 64 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  discipline: varchar("discipline", { length: 64 }),
  status: mysqlEnum("status", ["draft", "issued", "approved"]).default("draft").notNull(),
  currentVersionId: int("currentVersionId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export const drawingVersions = mysqlTable("drawingVersions", {
  id: int("id").autoincrement().primaryKey(),
  drawingId: int("drawingId").notNull(),
  version: varchar("version", { length: 32 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 1000 }).notNull(),
  notes: text("notes"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Drawing = typeof drawings.$inferSelect;
export type InsertDrawing = typeof drawings.$inferInsert;
export type DrawingVersion = typeof drawingVersions.$inferSelect;
export type InsertDrawingVersion = typeof drawingVersions.$inferInsert;
