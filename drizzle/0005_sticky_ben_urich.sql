CREATE TABLE `changeOrders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`code` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`origin` enum('client','internal','site') NOT NULL DEFAULT 'client',
	`status` enum('draft','submitted','approved','rejected','cancelled') NOT NULL DEFAULT 'draft',
	`impactCost` int NOT NULL DEFAULT 0,
	`impactDays` int NOT NULL DEFAULT 0,
	`submittedBy` int,
	`submittedAt` timestamp,
	`approvedBy` int,
	`approvedAt` timestamp,
	`rejectedBy` int,
	`rejectedAt` timestamp,
	`rejectionReason` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `changeOrders_id` PRIMARY KEY(`id`),
	CONSTRAINT `changeOrders_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `drawingVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`drawingId` int NOT NULL,
	`version` varchar(32) NOT NULL,
	`fileUrl` varchar(1000) NOT NULL,
	`notes` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `drawingVersions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `drawings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`drawingCode` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`discipline` varchar(64),
	`status` enum('draft','issued','approved') NOT NULL DEFAULT 'draft',
	`currentVersionId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `drawings_id` PRIMARY KEY(`id`),
	CONSTRAINT `drawings_drawingCode_unique` UNIQUE(`drawingCode`)
);
--> statement-breakpoint
CREATE TABLE `projectTasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`startDate` timestamp,
	`endDate` timestamp,
	`status` enum('planned','in_progress','done','cancelled') NOT NULL DEFAULT 'planned',
	`assignedTo` int,
	`priority` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`estimateHours` int,
	`progress` int NOT NULL DEFAULT 0,
	`parentId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projectTasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rfis` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`rfiNumber` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`question` text NOT NULL,
	`status` enum('open','answered','closed') NOT NULL DEFAULT 'open',
	`submittedBy` int NOT NULL,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`answeredBy` int,
	`answeredAt` timestamp,
	`answer` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rfis_id` PRIMARY KEY(`id`),
	CONSTRAINT `rfis_rfiNumber_unique` UNIQUE(`rfiNumber`)
);
--> statement-breakpoint
CREATE TABLE `submittals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`submittalCode` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`status` enum('submitted','approved','rejected') NOT NULL DEFAULT 'submitted',
	`submittedBy` int NOT NULL,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`approvedBy` int,
	`approvedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `submittals_id` PRIMARY KEY(`id`),
	CONSTRAINT `submittals_submittalCode_unique` UNIQUE(`submittalCode`)
);
--> statement-breakpoint
CREATE TABLE `taskComments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`content` text NOT NULL,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `taskComments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userPermissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`permissionsJson` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userPermissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `userPermissions_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `installments` MODIFY COLUMN `status` enum('pending','paid','overdue','cancelled') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','accountant','finance_manager','project_manager','site_engineer','planning_engineer','procurement_officer','qa_qc','document_controller','architect','interior_designer','sales_manager','hr_manager','storekeeper','designer','viewer') NOT NULL DEFAULT 'designer';--> statement-breakpoint
ALTER TABLE `expenses` ADD `status` enum('active','cancelled') DEFAULT 'active' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_projectTasks_projectId` ON `projectTasks` (`projectId`);--> statement-breakpoint
CREATE INDEX `idx_projectTasks_assignedTo` ON `projectTasks` (`assignedTo`);--> statement-breakpoint
CREATE INDEX `idx_projectTasks_parentId` ON `projectTasks` (`parentId`);--> statement-breakpoint
CREATE INDEX `idx_auditLogs_createdAt` ON `auditLogs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_auditLogs_entity` ON `auditLogs` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `idx_expenses_expenseDate` ON `expenses` (`expenseDate`);--> statement-breakpoint
CREATE INDEX `idx_expenses_projectId` ON `expenses` (`projectId`);--> statement-breakpoint
CREATE INDEX `idx_installments_createdAt` ON `installments` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_installments_projectId` ON `installments` (`projectId`);--> statement-breakpoint
CREATE INDEX `idx_installments_invoiceId` ON `installments` (`invoiceId`);--> statement-breakpoint
CREATE INDEX `idx_invoices_issueDate` ON `invoices` (`issueDate`);--> statement-breakpoint
CREATE INDEX `idx_invoices_clientId` ON `invoices` (`clientId`);--> statement-breakpoint
CREATE INDEX `idx_invoices_projectId` ON `invoices` (`projectId`);--> statement-breakpoint
CREATE INDEX `idx_purchases_purchaseDate` ON `purchases` (`purchaseDate`);--> statement-breakpoint
CREATE INDEX `idx_purchases_projectId` ON `purchases` (`projectId`);