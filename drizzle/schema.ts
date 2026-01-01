import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, timestamp, mysqlEnum, text, mediumtext, index, unique, tinyint, json } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const attachments = mysqlTable("attachments", {
	id: int().autoincrement().notNull(),
	entityType: varchar({ length: 50 }).notNull(),
	entityId: int().notNull(),
	fileName: varchar({ length: 255 }).notNull(),
	fileKey: varchar({ length: 500 }).notNull(),
	fileUrl: varchar({ length: 1000 }).notNull(),
	fileSize: int(),
	mimeType: varchar({ length: 100 }),
	uploadedBy: int().notNull(),
	createdAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
});

export const attendance = mysqlTable("attendance", {
	id: int().autoincrement().notNull(),
	employeeId: int().notNull(),
	date: timestamp({ mode: 'date' }).notNull(),
	checkIn: timestamp({ mode: 'date' }),
	checkOut: timestamp({ mode: 'date' }),
	hoursWorked: int(),
	status: mysqlEnum(['present', 'absent', 'late', 'half_day']).default('present').notNull(),
	notes: text(),
	createdAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
});

export const auditLogs = mysqlTable("auditLogs", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	action: varchar({ length: 100 }).notNull(),
	entityType: varchar({ length: 50 }),
	entityId: int(),
	details: text(),
	oldValue: text(), // JSON of previous value
	newValue: text(), // JSON of new value
	ipAddress: varchar({ length: 45 }),
	createdAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
},
	(table) => [
		index("idx_auditLogs_createdAt").on(table.createdAt),
		index("idx_auditLogs_entity").on(table.entityType, table.entityId),
	]);

export const boq = mysqlTable("boq", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	itemName: varchar({ length: 255 }).notNull(),
	description: text(),
	quantity: int().notNull(),
	unit: varchar({ length: 50 }),
	unitPrice: int().notNull(),
	total: int().notNull(),
	category: varchar({ length: 100 }),
	createdAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
});

export const changeOrders = mysqlTable("changeOrders", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	code: varchar({ length: 64 }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	origin: mysqlEnum(['client', 'internal', 'site']).default('client').notNull(),
	status: mysqlEnum(['draft', 'submitted', 'approved', 'rejected', 'cancelled']).default('draft').notNull(),
	impactCost: int().notNull(),
	impactDays: int().notNull(),
	submittedBy: int(),
	submittedAt: timestamp({ mode: 'date' }),
	approvedBy: int(),
	approvedAt: timestamp({ mode: 'date' }),
	rejectedBy: int(),
	rejectedAt: timestamp({ mode: 'date' }),
	rejectionReason: text(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
},
	(table) => [
		unique("changeOrders_code_unique").on(table.code),
	]);

export const clients = mysqlTable("clients", {
	id: int().autoincrement().notNull(),
	clientNumber: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 320 }),
	phone: varchar({ length: 50 }),
	address: text(),
	city: varchar({ length: 100 }),
	notes: text(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
},
	(table) => [
		unique("clients_clientNumber_unique").on(table.clientNumber),
	]);

export const companySettings = mysqlTable("companySettings", {
	id: int().autoincrement().notNull(),
	settingKey: varchar({ length: 100 }).notNull(),
	settingValue: text(),
	updatedBy: int(),
	updatedAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
},
	(table) => [
		unique("companySettings_settingKey_unique").on(table.settingKey),
	]);

export const drawings = mysqlTable("drawings", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	drawingCode: varchar({ length: 64 }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	discipline: varchar({ length: 64 }),
	status: mysqlEnum(['draft', 'issued', 'approved']).default('draft').notNull(),
	currentVersionId: int(),
	createdAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
},
	(table) => [
		unique("drawings_drawingCode_unique").on(table.drawingCode),
	]);

export const drawingVersions = mysqlTable("drawingVersions", {
	id: int().autoincrement().notNull(),
	drawingId: int().notNull(),
	version: varchar({ length: 32 }).notNull(),
	fileUrl: varchar({ length: 1000 }).notNull(),
	notes: text(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
});

export const employees = mysqlTable("employees", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	employeeNumber: varchar({ length: 50 }).notNull(),
	department: varchar({ length: 100 }),
	position: varchar({ length: 100 }),
	hireDate: timestamp({ mode: 'date' }).notNull(),
	salary: int(),
	bankAccount: varchar({ length: 100 }),
	emergencyContact: text(),
	status: mysqlEnum(['active', 'on_leave', 'terminated']).default('active').notNull(),
	createdAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
},
	(table) => [
		unique("employees_userId_unique").on(table.userId),
		unique("employees_employeeNumber_unique").on(table.employeeNumber),
	]);

export const expenses = mysqlTable("expenses", {
	id: int().autoincrement().notNull(),
	projectId: int(),
	category: varchar({ length: 100 }).notNull(),
	description: text().notNull(),
	amount: int().notNull(),
	expenseDate: timestamp({ mode: 'date' }).notNull(),
	receipt: varchar({ length: 500 }),
	status: mysqlEnum(['active', 'processing', 'completed', 'cancelled']).default('active').notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
},
	(table) => [
		index("idx_expenses_expenseDate").on(table.expenseDate),
		index("idx_expenses_projectId").on(table.projectId),
	]);

export const forms = mysqlTable("forms", {
	id: int().autoincrement().notNull(),
	formNumber: varchar({ length: 50 }).notNull(),
	clientId: int().notNull(),
	projectId: int(),
	formType: varchar({ length: 100 }).notNull(),
	formData: text().notNull(),
	status: mysqlEnum(['pending', 'reviewed', 'approved', 'rejected']).default('pending').notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
},
	(table) => [
		unique("forms_formNumber_unique").on(table.formNumber),
	]);

export const installments = mysqlTable("installments", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	invoiceId: int(),
	installmentNumber: int().notNull(),
	amount: int().notNull(),
	dueDate: timestamp({ mode: 'date' }).notNull(),
	paidDate: timestamp({ mode: 'date' }),
	status: mysqlEnum(['pending', 'paid', 'overdue', 'cancelled']).default('pending').notNull(),
	paymentMethod: varchar({ length: 50 }),
	notes: text(),
	createdAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
},
	(table) => [
		index("idx_installments_createdAt").on(table.createdAt),
		index("idx_installments_projectId").on(table.projectId),
		index("idx_installments_invoiceId").on(table.invoiceId),
	]);

export const invoiceItems = mysqlTable("invoiceItems", {
	id: int().autoincrement().notNull(),
	invoiceId: int().notNull(),
	description: text().notNull(),
	unit: varchar({ length: 50 }),
	quantity: int().notNull(),
	unitPrice: int().notNull(),
	total: int().notNull(),
	sortOrder: int(),
});

export const invoices = mysqlTable("invoices", {
	id: int().autoincrement().notNull(),
	invoiceNumber: varchar({ length: 50 }).notNull(),
	type: mysqlEnum(['invoice', 'quote']).notNull(),
	clientId: int(),
	projectId: int(),
	issueDate: timestamp({ mode: 'date' }).notNull(),
	dueDate: timestamp({ mode: 'date' }),
	status: mysqlEnum(['draft', 'sent', 'paid', 'cancelled']).default('draft').notNull(),
	subtotal: int().notNull(),
	tax: int(),
	discount: int(),
	total: int().notNull(),
	notes: text(),
	terms: text(),
	formData: mediumtext(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
},
	(table) => [
		index("idx_invoices_issueDate").on(table.issueDate),
		index("idx_invoices_clientId").on(table.clientId),
		index("idx_invoices_projectId").on(table.projectId),
		unique("invoices_invoiceNumber_unique").on(table.invoiceNumber),
	]);

export const leaves = mysqlTable("leaves", {
	id: int().autoincrement().notNull(),
	employeeId: int().notNull(),
	leaveType: mysqlEnum(['annual', 'sick', 'emergency', 'unpaid']).notNull(),
	startDate: timestamp({ mode: 'date' }).notNull(),
	endDate: timestamp({ mode: 'date' }).notNull(),
	days: int().notNull(),
	reason: text(),
	status: mysqlEnum(['pending', 'approved', 'rejected']).default('pending').notNull(),
	approvedBy: int(),
	approvedAt: timestamp({ mode: 'date' }),
	notes: text(),
	// Cancellation request fields
	cancellationRequested: int().default(0), // 0=no, 1=pending, 2=approved, 3=rejected
	cancellationReason: text(),
	cancellationRequestedAt: timestamp({ mode: 'date' }),
	cancellationResolvedBy: int(),
	cancellationResolvedAt: timestamp({ mode: 'date' }),
	cancellationResolvedNotes: text(),
	createdAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
});

export const payroll = mysqlTable("payroll", {
	id: int().autoincrement().notNull(),
	employeeId: int().notNull(),
	month: int().notNull(),
	year: int().notNull(),
	baseSalary: int().notNull(),
	bonuses: int().default(0),
	deductions: int().default(0),
	netSalary: int().notNull(),
	paymentDate: timestamp({ mode: 'date' }),
	status: mysqlEnum(['pending', 'paid']).default('pending').notNull(),
	notes: text(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
});

export const performanceReviews = mysqlTable("performanceReviews", {
	id: int().autoincrement().notNull(),
	employeeId: int().notNull(),
	reviewerId: int().notNull(),
	reviewDate: timestamp({ mode: 'date' }).notNull(),
	period: varchar({ length: 50 }),
	rating: int(),
	strengths: text(),
	weaknesses: text(),
	goals: text(),
	comments: text(),
	createdAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
});

export const projects = mysqlTable("projects", {
	id: int().autoincrement().notNull(),
	projectNumber: varchar({ length: 50 }).notNull(),
	clientId: int(), // Optional - project can exist without a client initially
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	// projectType is IMMUTABLE after creation - defines what kind of project this is
	// - design: تصميم فقط - لا يوجد قسم مالي
	// - execution: تنفيذ فقط - يوجد قسم مالي
	// - design_execution: تصميم وتنفيذ - يوجد قسم مالي
	// - supervision: إشراف - يوجد ملفات ومراحل، لا يوجد قسم مالي (مثل التصميم)
	projectType: mysqlEnum(['design', 'execution', 'design_execution', 'supervision']).default('design').notNull(),
	// status represents lifecycle state, NOT project type
	// TODO: Future expansion may need: 'on_hold', 'archived', 'paused'
	// TODO: Consider adding statusChangedAt, deliveredAt for reporting
	// NOTE: delivered = read-only except notes/files, cancelled = read-only completely
	status: mysqlEnum(['in_progress', 'delivered', 'cancelled']).default('in_progress').notNull(),


	startDate: timestamp({ mode: 'date' }),
	endDate: timestamp({ mode: 'date' }),
	budget: int(),
	assignedTo: int(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
},
	(table) => [
		unique("projects_projectNumber_unique").on(table.projectNumber),
	]);

export const projectTasks = mysqlTable("projectTasks", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	name: varchar({ length: 255 }).notNull(),
	taskType: mysqlEnum(['task', 'phase']).default('task').notNull(),
	description: text(),
	startDate: timestamp({ mode: 'date' }),
	endDate: timestamp({ mode: 'date' }),
	status: mysqlEnum(['planned', 'in_progress', 'done', 'cancelled']).default('planned').notNull(),
	assignedTo: int(),
	priority: mysqlEnum(['low', 'medium', 'high', 'critical']).default('medium').notNull(),
	estimateHours: int(),
	progress: int().default(0).notNull(),
	parentId: int(),
	createdAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
},
	(table) => [
		index("idx_projectTasks_projectId").on(table.projectId),
		index("idx_projectTasks_assignedTo").on(table.assignedTo),
		index("idx_projectTasks_parentId").on(table.parentId),
	]);

// Project Team Members - for assigning multiple team members to projects
export const projectTeam = mysqlTable("projectTeam", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	userId: int().notNull(),
	role: varchar({ length: 100 }), // e.g., 'manager', 'engineer', 'designer'
	joinedAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
},
	(table) => [
		index("idx_projectTeam_projectId").on(table.projectId),
		unique("projectTeam_projectUser_unique").on(table.projectId, table.userId),
	]);

export const purchases = mysqlTable("purchases", {
	id: int().autoincrement().notNull(),
	purchaseNumber: varchar({ length: 50 }).notNull(),
	supplierId: int(),
	supplierName: varchar({ length: 255 }).notNull(),
	projectId: int(),
	description: text().notNull(),
	amount: int().notNull(),
	paymentMethod: mysqlEnum(['cash', 'bank_transfer', 'check', 'credit', 'tamara', 'mispay', 'visa', 'mada', 'stcpay', 'pos']).default('cash').notNull(),
	purchaseDate: timestamp({ mode: 'date' }).notNull(),
	status: mysqlEnum(['pending', 'completed', 'cancelled']).default('pending').notNull(),
	category: varchar({ length: 100 }),
	notes: text(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
},
	(table) => [
		index("idx_purchases_purchaseDate").on(table.purchaseDate),
		index("idx_purchases_projectId").on(table.projectId),
		unique("purchases_purchaseNumber_unique").on(table.purchaseNumber),
	]);

export const rfis = mysqlTable("rfis", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	rfiNumber: varchar({ length: 64 }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	question: text().notNull(),
	status: mysqlEnum(['open', 'answered', 'closed']).default('open').notNull(),
	assignedTo: int(),
	assignedBy: int(),
	submittedBy: int().notNull(),
	submittedAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
	answeredBy: int(),
	answeredAt: timestamp({ mode: 'date' }),
	answer: text(),
	createdAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
},
	(table) => [
		unique("rfis_rfiNumber_unique").on(table.rfiNumber),
		index("idx_rfis_assignedTo").on(table.assignedTo),
	]);

export const sales = mysqlTable("sales", {
	id: int().autoincrement().notNull(),
	saleNumber: varchar({ length: 50 }).notNull(),
	clientId: int().notNull(),
	projectId: int(),
	description: text().notNull(),
	amount: int().notNull(),
	paymentMethod: mysqlEnum(['cash', 'bank_transfer', 'check', 'credit']).default('cash').notNull(),
	saleDate: timestamp({ mode: 'date' }).notNull(),
	status: mysqlEnum(['pending', 'completed', 'cancelled']).default('pending').notNull(),
	invoiceId: int(),
	notes: text(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
},
	(table) => [
		unique("sales_saleNumber_unique").on(table.saleNumber),
	]);

export const submittals = mysqlTable("submittals", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	submittalCode: varchar({ length: 64 }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	status: mysqlEnum(['submitted', 'under_review', 'approved', 'rejected']).default('submitted').notNull(),
	assignedTo: int(),
	assignedBy: int(),
	submittedBy: int().notNull(),
	submittedAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
	approvedBy: int(),
	approvedAt: timestamp({ mode: 'date' }),
	notes: text(),
	createdAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
},
	(table) => [
		unique("submittals_submittalCode_unique").on(table.submittalCode),
		index("idx_submittals_assignedTo").on(table.assignedTo),
	]);

export const taskComments = mysqlTable("taskComments", {
	id: int().autoincrement().notNull(),
	taskId: int().notNull(),
	content: text().notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
});

export const userPermissions = mysqlTable("userPermissions", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	permissionsJson: text(),
	updatedAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
},
	(table) => [
		unique("userPermissions_userId_unique").on(table.userId),
	]);

export const users = mysqlTable("users", {
	id: int().autoincrement().notNull(),
	openId: varchar({ length: 64 }).notNull(),
	name: text(),
	email: varchar({ length: 320 }),
	passwordHash: varchar({ length: 255 }),
	loginMethod: varchar({ length: 64 }),
	role: mysqlEnum(['admin', 'department_manager', 'project_manager', 'project_coordinator', 'architect', 'interior_designer', 'site_engineer', 'planning_engineer', 'designer', 'technician', 'finance_manager', 'accountant', 'sales_manager', 'hr_manager', 'admin_assistant', 'procurement_officer', 'storekeeper', 'qa_qc', 'document_controller', 'viewer']).default('designer').notNull(),
	isActive: tinyint().default(1).notNull(),
	mustChangePassword: tinyint().default(0).notNull(), // Force password change on next login
	tempPasswordExpiresAt: timestamp({ mode: 'date' }), // Temp password expiry (24h)
	createdAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
	lastSignedIn: timestamp({ mode: 'date' }).defaultNow().notNull(),
},
	(table) => [
		unique("users_openId_unique").on(table.openId),
	]);

// Type exports for all tables
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

export type UserPermission = typeof userPermissions.$inferSelect;
export type InsertUserPermissions = typeof userPermissions.$inferInsert;

export type ProjectTask = typeof projectTasks.$inferSelect;
export type InsertProjectTask = typeof projectTasks.$inferInsert;

export type ChangeOrder = typeof changeOrders.$inferSelect;
export type InsertChangeOrder = typeof changeOrders.$inferInsert;

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

export type Sale = typeof sales.$inferSelect;
export type InsertSale = typeof sales.$inferInsert;

export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = typeof purchases.$inferInsert;

export type ProjectTeamMember = typeof projectTeam.$inferSelect;
export type InsertProjectTeamMember = typeof projectTeam.$inferInsert;

// Approval Requests table for approval workflow
export const approvalRequests = mysqlTable("approvalRequests", {
	id: int().autoincrement().notNull(),
	entityType: mysqlEnum(['expense', 'sale', 'purchase', 'invoice', 'boq', 'installment']).notNull(),
	entityId: int().notNull(),
	action: mysqlEnum(['create', 'update', 'delete', 'cancel', 'approve']).notNull(),
	requestData: text(), // JSON of the requested changes
	status: mysqlEnum(['pending', 'approved', 'rejected']).default('pending').notNull(),
	requestedBy: int().notNull(),
	requestedAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
	reviewedBy: int(),
	reviewedAt: timestamp({ mode: 'date' }),
	reviewNotes: text(),
},
	(table) => [
		index("idx_approvalRequests_status").on(table.status),
		index("idx_approvalRequests_requestedBy").on(table.requestedBy),
	]);

export type ApprovalRequest = typeof approvalRequests.$inferSelect;
export type InsertApprovalRequest = typeof approvalRequests.$inferInsert;

// Notifications table for in-app notifications
export const notifications = mysqlTable("notifications", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(), // المستقبل
	fromUserId: int(), // المرسل (null = نظام)
	type: mysqlEnum(['info', 'warning', 'success', 'action']).default('info').notNull(),
	title: varchar({ length: 255 }).notNull(),
	message: text(),
	link: varchar({ length: 500 }), // رابط للصفحة المتعلقة
	entityType: varchar({ length: 50 }), // نوع الكيان (leave, task, project, etc.)
	entityId: int(), // ID الكيان
	isRead: tinyint().default(0).notNull(),
	groupKey: varchar({ length: 100 }), // لتجميع الإشعارات المتشابهة
	createdAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
},
	(table) => [
		index("idx_notifications_userId").on(table.userId),
		index("idx_notifications_isRead").on(table.isRead),
		index("idx_notifications_createdAt").on(table.createdAt),
	]);

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// Password reset tokens for forgot password feature
export const passwordResetTokens = mysqlTable("password_reset_tokens", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	token: varchar({ length: 100 }).notNull(),
	expiresAt: timestamp({ mode: 'date' }).notNull(),
	used: tinyint().default(0).notNull(),
	createdAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
},
	(table) => [
		index("idx_password_reset_token").on(table.token),
		index("idx_password_reset_userId").on(table.userId),
	]);

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

// Password reset requests for admin approval workflow
export const passwordResetRequests = mysqlTable("password_reset_requests", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	status: mysqlEnum(['pending', 'approved_link', 'approved_temp', 'completed', 'rejected']).default('pending').notNull(),
	adminId: int(),
	adminResponse: text(),
	tempPassword: varchar({ length: 255 }),
	resetToken: varchar({ length: 255 }),
	tokenExpiresAt: timestamp({ mode: 'date' }),
	createdAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
	completedAt: timestamp({ mode: 'date' }),
},
	(table) => [
		index("idx_password_reset_requests_userId").on(table.userId),
		index("idx_password_reset_requests_status").on(table.status),
	]);

export type PasswordResetRequest = typeof passwordResetRequests.$inferSelect;
export type InsertPasswordResetRequest = typeof passwordResetRequests.$inferInsert;

// AI Gemini Pages for storing user's Gemini iframe settings
export const aiGeminiPages = mysqlTable("aiGeminiPages", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	pageUrl: varchar({ length: 1000 }).notNull(),    // رابط صفحة Gemini
	apiKeyHash: varchar({ length: 255 }),             // hash لمفتاح API للتحقق
	isHidden: tinyint().default(0).notNull(),        // حالة الإخفاء
	createdAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
},
	(table) => [
		unique("aiGeminiPages_userId_unique").on(table.userId),
		index("idx_aiGeminiPages_isHidden").on(table.isHidden),
	]);

export type AiGeminiPage = typeof aiGeminiPages.$inferSelect;
export type InsertAiGeminiPage = typeof aiGeminiPages.$inferInsert;

export const savedReports = mysqlTable("savedReports", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	reportType: varchar({ length: 50 }).notNull(),
	filters: json(),
	data: json(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
});

export type SavedReport = typeof savedReports.$inferSelect;
export type InsertSavedReport = typeof savedReports.$inferInsert;

export const appSettings = mysqlTable("appSettings", {
	key: varchar({ length: 100 }).primaryKey(),
	value: text().notNull(), // Encrypted value
	updatedBy: int(),
	updatedAt: timestamp({ mode: 'date' }).defaultNow().notNull(),
});

export type AppSetting = typeof appSettings.$inferSelect;
export type InsertAppSetting = typeof appSettings.$inferInsert;
