import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, timestamp, mysqlEnum, text, index, unique, tinyint } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const attachments = mysqlTable("attachments", {
	id: int().autoincrement().notNull(),
	entityType: varchar({ length: 50 }).notNull(),
	entityId: int().notNull(),
	fileName: varchar({ length: 255 }).notNull(),
	fileKey: varchar({ length: 500 }).notNull(),
	fileUrl: varchar({ length: 1000 }).notNull(),
	fileSize: int().default('NULL'),
	mimeType: varchar({ length: 100 }).default('NULL'),
	uploadedBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('current_timestamp()').notNull(),
});

export const attendance = mysqlTable("attendance", {
	id: int().autoincrement().notNull(),
	employeeId: int().notNull(),
	date: timestamp({ mode: 'string' }).notNull(),
	checkIn: timestamp({ mode: 'string' }).default('NULL'),
	checkOut: timestamp({ mode: 'string' }).default('NULL'),
	hoursWorked: int().default('NULL'),
	status: mysqlEnum(['present', 'absent', 'late', 'half_day']).default('\'present\'').notNull(),
	notes: text().default('NULL'),
	createdAt: timestamp({ mode: 'string' }).default('current_timestamp()').notNull(),
});

export const auditLogs = mysqlTable("auditLogs", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	action: varchar({ length: 100 }).notNull(),
	entityType: varchar({ length: 50 }).default('NULL'),
	entityId: int().default('NULL'),
	details: text().default('NULL'),
	ipAddress: varchar({ length: 45 }).default('NULL'),
	createdAt: timestamp({ mode: 'string' }).default('current_timestamp()').notNull(),
},
	(table) => [
		index("idx_auditLogs_createdAt").on(table.createdAt),
		index("idx_auditLogs_entity").on(table.entityType, table.entityId),
	]);

export const boq = mysqlTable("boq", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	itemName: varchar({ length: 255 }).notNull(),
	description: text().default('NULL'),
	quantity: int().notNull(),
	unit: varchar({ length: 50 }).default('NULL'),
	unitPrice: int().notNull(),
	total: int().notNull(),
	category: varchar({ length: 100 }).default('NULL'),
	createdAt: timestamp({ mode: 'string' }).default('current_timestamp()').notNull(),
	updatedAt: timestamp({ mode: 'string' }).default('current_timestamp()').notNull(),
});

export const changeOrders = mysqlTable("changeOrders", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	code: varchar({ length: 64 }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text().default('NULL'),
	origin: mysqlEnum(['client', 'internal', 'site']).default('\'client\'').notNull(),
	status: mysqlEnum(['draft', 'submitted', 'approved', 'rejected', 'cancelled']).default('\'draft\'').notNull(),
	impactCost: int().notNull(),
	impactDays: int().notNull(),
	submittedBy: int().default('NULL'),
	submittedAt: timestamp({ mode: 'string' }).default('NULL'),
	approvedBy: int().default('NULL'),
	approvedAt: timestamp({ mode: 'string' }).default('NULL'),
	rejectedBy: int().default('NULL'),
	rejectedAt: timestamp({ mode: 'string' }).default('NULL'),
	rejectionReason: text().default('NULL'),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('current_timestamp()').notNull(),
	updatedAt: timestamp({ mode: 'string' }).default('current_timestamp()').notNull(),
},
	(table) => [
		unique("changeOrders_code_unique").on(table.code),
	]);

export const clients = mysqlTable("clients", {
	id: int().autoincrement().notNull(),
	clientNumber: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 320 }).default('NULL'),
	phone: varchar({ length: 50 }).default('NULL'),
	address: text().default('NULL'),
	city: varchar({ length: 100 }).default('NULL'),
	notes: text().default('NULL'),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('current_timestamp()').notNull(),
	updatedAt: timestamp({ mode: 'string' }).default('current_timestamp()').notNull(),
},
	(table) => [
		unique("clients_clientNumber_unique").on(table.clientNumber),
	]);

export const companySettings = mysqlTable("companySettings", {
	id: int().autoincrement().notNull(),
	settingKey: varchar({ length: 100 }).notNull(),
	settingValue: text().default('NULL'),
	updatedBy: int().default('NULL'),
	updatedAt: timestamp({ mode: 'string' }).default('current_timestamp()').notNull(),
},
	(table) => [
		unique("companySettings_settingKey_unique").on(table.settingKey),
	]);

export const drawings = mysqlTable("drawings", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	drawingCode: varchar({ length: 64 }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	discipline: varchar({ length: 64 }).default('NULL'),
	status: mysqlEnum(['draft', 'issued', 'approved']).default('\'draft\'').notNull(),
	currentVersionId: int().default('NULL'),
	createdAt: timestamp({ mode: 'string' }).default('current_timestamp()').notNull(),
},
	(table) => [
		unique("drawings_drawingCode_unique").on(table.drawingCode),
	]);

export const drawingVersions = mysqlTable("drawingVersions", {
	id: int().autoincrement().notNull(),
	drawingId: int().notNull(),
	version: varchar({ length: 32 }).notNull(),
	fileUrl: varchar({ length: 1000 }).notNull(),
	notes: text().default('NULL'),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('current_timestamp()').notNull(),
});

export const employees = mysqlTable("employees", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	employeeNumber: varchar({ length: 50 }).notNull(),
	department: varchar({ length: 100 }).default('NULL'),
	position: varchar({ length: 100 }).default('NULL'),
	hireDate: timestamp({ mode: 'string' }).notNull(),
	salary: int().default('NULL'),
	bankAccount: varchar({ length: 100 }).default('NULL'),
	emergencyContact: text().default('NULL'),
	status: mysqlEnum(['active', 'on_leave', 'terminated']).default('\'active\'').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('current_timestamp()').notNull(),
	updatedAt: timestamp({ mode: 'string' }).default('current_timestamp()').notNull(),
},
	(table) => [
		unique("employees_userId_unique").on(table.userId),
		unique("employees_employeeNumber_unique").on(table.employeeNumber),
	]);

export const expenses = mysqlTable("expenses", {
	id: int().autoincrement().notNull(),
	projectId: int().default('NULL'),
	category: varchar({ length: 100 }).notNull(),
	description: text().notNull(),
	amount: int().notNull(),
	expenseDate: timestamp({ mode: 'string' }).notNull(),
	receipt: varchar({ length: 500 }).default('NULL'),
	status: mysqlEnum(['active', 'cancelled']).default('\'active\'').notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('current_timestamp()').notNull(),
	updatedAt: timestamp({ mode: 'string' }).default('current_timestamp()').notNull(),
},
	(table) => [
		index("idx_expenses_expenseDate").on(table.expenseDate),
		index("idx_expenses_projectId").on(table.projectId),
	]);

export const forms = mysqlTable("forms", {
	id: int().autoincrement().notNull(),
	formNumber: varchar({ length: 50 }).notNull(),
	clientId: int().notNull(),
	projectId: int().default('NULL'),
	formType: varchar({ length: 100 }).notNull(),
	formData: text().notNull(),
	status: mysqlEnum(['pending', 'reviewed', 'approved', 'rejected']).default('\'pending\'').notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('current_timestamp()').notNull(),
	updatedAt: timestamp({ mode: 'string' }).default('current_timestamp()').notNull(),
},
	(table) => [
		unique("forms_formNumber_unique").on(table.formNumber),
	]);

export const installments = mysqlTable("installments", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	invoiceId: int().default('NULL'),
	installmentNumber: int().notNull(),
	amount: int().notNull(),
	dueDate: timestamp({ mode: 'string' }).notNull(),
	paidDate: timestamp({ mode: 'string' }).default('NULL'),
	status: mysqlEnum(['pending', 'paid', 'overdue', 'cancelled']).default('\'pending\'').notNull(),
	paymentMethod: varchar({ length: 50 }).default('NULL'),
	notes: text().default('NULL'),
	createdAt: timestamp({ mode: 'string' }).default('current_timestamp()').notNull(),
	updatedAt: timestamp({ mode: 'string' }).default('current_timestamp()').notNull(),
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
	quantity: int().notNull(),
	unitPrice: int().notNull(),
	total: int().notNull(),
	sortOrder: int().default('NULL'),
});

export const invoices = mysqlTable("invoices", {
	id: int().autoincrement().notNull(),
	invoiceNumber: varchar({ length: 50 }).notNull(),
	type: mysqlEnum(['invoice', 'quote']).notNull(),
	clientId: int().notNull(),
	projectId: int().default('NULL'),
	issueDate: timestamp({ mode: 'string' }).notNull(),
	dueDate: timestamp({ mode: 'string' }).default('NULL'),
	status: mysqlEnum(['draft', 'sent', 'paid', 'cancelled']).default('\'draft\'').notNull(),
	subtotal: int().notNull(),
	tax: int().default('NULL'),
	discount: int().default('NULL'),
	total: int().notNull(),
	notes: text().default('NULL'),
	terms: text().default('NULL'),
	formData: text().default('NULL'),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('current_timestamp()').notNull(),
	updatedAt: timestamp({ mode: 'string' }).default('current_timestamp()').notNull(),
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
	startDate: timestamp({ mode: 'string' }).notNull(),
	endDate: timestamp({ mode: 'string' }).notNull(),
	days: int().notNull(),
	reason: text().default('NULL'),
	status: mysqlEnum(['pending', 'approved', 'rejected']).default('\'pending\'').notNull(),
	approvedBy: int().default('NULL'),
	approvedAt: timestamp({ mode: 'string' }).default('NULL'),
	notes: text().default('NULL'),
	createdAt: timestamp({ mode: 'string' }).default('current_timestamp()').notNull(),
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
	paymentDate: timestamp({ mode: 'string' }).default('NULL'),
	status: mysqlEnum(['pending', 'paid']).default('\'pending\'').notNull(),
	notes: text().default('NULL'),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('current_timestamp()').notNull(),
});

export const performanceReviews = mysqlTable("performanceReviews", {
	id: int().autoincrement().notNull(),
	employeeId: int().notNull(),
	reviewerId: int().notNull(),
	reviewDate: timestamp({ mode: 'string' }).notNull(),
	period: varchar({ length: 50 }).default('NULL'),
	rating: int().default('NULL'),
	strengths: text().default('NULL'),
	weaknesses: text().default('NULL'),
	goals: text().default('NULL'),
	comments: text().default('NULL'),
	createdAt: timestamp({ mode: 'string' }).default('current_timestamp()').notNull(),
});

export const projects = mysqlTable("projects", {
	id: int().autoincrement().notNull(),
	projectNumber: varchar({ length: 50 }).notNull(),
	clientId: int().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text().default('NULL'),
	status: mysqlEnum(['design', 'execution', 'delivery', 'completed', 'cancelled']).default('\'design\'').notNull(),
	startDate: timestamp({ mode: 'string' }).default('NULL'),
	endDate: timestamp({ mode: 'string' }).default('NULL'),
	budget: int().default('NULL'),
	assignedTo: int().default('NULL'),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('current_timestamp()').notNull(),
	updatedAt: timestamp({ mode: 'string' }).default('current_timestamp()').notNull(),
},
	(table) => [
		unique("projects_projectNumber_unique").on(table.projectNumber),
	]);

export const projectTasks = mysqlTable("projectTasks", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text().default('NULL'),
	startDate: timestamp({ mode: 'string' }).default('NULL'),
	endDate: timestamp({ mode: 'string' }).default('NULL'),
	status: mysqlEnum(['planned', 'in_progress', 'done', 'cancelled']).default('\'planned\'').notNull(),
	assignedTo: int().default('NULL'),
	priority: mysqlEnum(['low', 'medium', 'high', 'critical']).default('\'medium\'').notNull(),
	estimateHours: int().default('NULL'),
	progress: int().default(0).notNull(),
	parentId: int().default('NULL'),
	createdAt: timestamp({ mode: 'string' }).default('current_timestamp()').notNull(),
	updatedAt: timestamp({ mode: 'string' }).default('current_timestamp()').notNull(),
},
	(table) => [
		index("idx_projectTasks_projectId").on(table.projectId),
		index("idx_projectTasks_assignedTo").on(table.assignedTo),
		index("idx_projectTasks_parentId").on(table.parentId),
	]);

export const purchases = mysqlTable("purchases", {
	id: int().autoincrement().notNull(),
	purchaseNumber: varchar({ length: 50 }).notNull(),
	supplierId: int().default('NULL'),
	supplierName: varchar({ length: 255 }).notNull(),
	projectId: int().default('NULL'),
	description: text().notNull(),
	amount: int().notNull(),
	paymentMethod: mysqlEnum(['cash', 'bank_transfer', 'check', 'credit']).default('\'cash\'').notNull(),
	purchaseDate: timestamp({ mode: 'string' }).notNull(),
	status: mysqlEnum(['pending', 'completed', 'cancelled']).default('\'pending\'').notNull(),
	category: varchar({ length: 100 }).default('NULL'),
	notes: text().default('NULL'),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('current_timestamp()').notNull(),
	updatedAt: timestamp({ mode: 'string' }).default('current_timestamp()').notNull(),
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
	status: mysqlEnum(['open', 'answered', 'closed']).default('\'open\'').notNull(),
	submittedBy: int().notNull(),
	submittedAt: timestamp({ mode: 'string' }).default('current_timestamp()').notNull(),
	answeredBy: int().default('NULL'),
	answeredAt: timestamp({ mode: 'string' }).default('NULL'),
	answer: text().default('NULL'),
	createdAt: timestamp({ mode: 'string' }).default('current_timestamp()').notNull(),
},
	(table) => [
		unique("rfis_rfiNumber_unique").on(table.rfiNumber),
	]);

export const sales = mysqlTable("sales", {
	id: int().autoincrement().notNull(),
	saleNumber: varchar({ length: 50 }).notNull(),
	clientId: int().notNull(),
	projectId: int().default('NULL'),
	description: text().notNull(),
	amount: int().notNull(),
	paymentMethod: mysqlEnum(['cash', 'bank_transfer', 'check', 'credit']).default('\'cash\'').notNull(),
	saleDate: timestamp({ mode: 'string' }).notNull(),
	status: mysqlEnum(['pending', 'completed', 'cancelled']).default('\'pending\'').notNull(),
	invoiceId: int().default('NULL'),
	notes: text().default('NULL'),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('current_timestamp()').notNull(),
	updatedAt: timestamp({ mode: 'string' }).default('current_timestamp()').notNull(),
},
	(table) => [
		unique("sales_saleNumber_unique").on(table.saleNumber),
	]);

export const submittals = mysqlTable("submittals", {
	id: int().autoincrement().notNull(),
	projectId: int().notNull(),
	submittalCode: varchar({ length: 64 }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	status: mysqlEnum(['submitted', 'approved', 'rejected']).default('\'submitted\'').notNull(),
	submittedBy: int().notNull(),
	submittedAt: timestamp({ mode: 'string' }).default('current_timestamp()').notNull(),
	approvedBy: int().default('NULL'),
	approvedAt: timestamp({ mode: 'string' }).default('NULL'),
	notes: text().default('NULL'),
	createdAt: timestamp({ mode: 'string' }).default('current_timestamp()').notNull(),
},
	(table) => [
		unique("submittals_submittalCode_unique").on(table.submittalCode),
	]);

export const taskComments = mysqlTable("taskComments", {
	id: int().autoincrement().notNull(),
	taskId: int().notNull(),
	content: text().notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('current_timestamp()').notNull(),
});

export const userPermissions = mysqlTable("userPermissions", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	permissionsJson: text().default('NULL'),
	updatedAt: timestamp({ mode: 'string' }).default('current_timestamp()').notNull(),
},
	(table) => [
		unique("userPermissions_userId_unique").on(table.userId),
	]);

export const users = mysqlTable("users", {
	id: int().autoincrement().notNull(),
	openId: varchar({ length: 64 }).notNull(),
	name: text().default('NULL'),
	email: varchar({ length: 320 }).default('NULL'),
	passwordHash: varchar({ length: 255 }).default('NULL'),
	loginMethod: varchar({ length: 64 }).default('NULL'),
	role: mysqlEnum(['admin', 'accountant', 'finance_manager', 'project_manager', 'site_engineer', 'planning_engineer', 'procurement_officer', 'qa_qc', 'document_controller', 'architect', 'interior_designer', 'sales_manager', 'hr_manager', 'storekeeper', 'designer', 'viewer']).default('\'designer\'').notNull(),
	isActive: tinyint().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('current_timestamp()').notNull(),
	updatedAt: timestamp({ mode: 'string' }).default('current_timestamp()').notNull(),
	lastSignedIn: timestamp({ mode: 'string' }).default('current_timestamp()').notNull(),
},
	(table) => [
		unique("users_openId_unique").on(table.openId),
	]);
