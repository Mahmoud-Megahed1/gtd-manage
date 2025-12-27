CREATE TABLE `aiGeminiPages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`pageUrl` varchar(1000) NOT NULL,
	`apiKeyHash` varchar(255),
	`isHidden` tinyint NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aiGeminiPages_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `approvalRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` enum('expense','sale','purchase','invoice','boq','installment') NOT NULL,
	`entityId` int NOT NULL,
	`action` enum('create','update','delete','cancel','approve') NOT NULL,
	`requestData` text,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`requestedBy` int NOT NULL,
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`reviewNotes` text
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fromUserId` int,
	`type` enum('info','warning','success','action') NOT NULL DEFAULT 'info',
	`title` varchar(255) NOT NULL,
	`message` text,
	`link` varchar(500),
	`entityType` varchar(50),
	`entityId` int,
	`isRead` tinyint NOT NULL DEFAULT 0,
	`groupKey` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now())
);
--> statement-breakpoint
CREATE TABLE `password_reset_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`status` enum('pending','approved_link','approved_temp','completed','rejected') NOT NULL DEFAULT 'pending',
	`adminId` int,
	`adminResponse` text,
	`tempPassword` varchar(255),
	`resetToken` varchar(255),
	`tokenExpiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`token` varchar(100) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`used` tinyint NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now())
);
--> statement-breakpoint
CREATE TABLE `projectTeam` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`role` varchar(100),
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `projectTeam_projectUser_unique` UNIQUE(`projectId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `savedReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`reportType` varchar(50) NOT NULL,
	`filters` json,
	`data` json,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now())
);
--> statement-breakpoint
ALTER TABLE `attachments` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `attendance` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `auditLogs` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `boq` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `changeOrders` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `clients` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `companySettings` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `drawingVersions` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `drawings` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `employees` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `expenses` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `forms` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `installments` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `invoiceItems` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `invoices` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `leaves` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `payroll` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `performanceReviews` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `projectTasks` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `projects` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `purchases` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `rfis` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `sales` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `submittals` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `taskComments` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `userPermissions` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `users` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `boq` MODIFY COLUMN `updatedAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `changeOrders` MODIFY COLUMN `impactCost` int NOT NULL;--> statement-breakpoint
ALTER TABLE `changeOrders` MODIFY COLUMN `impactDays` int NOT NULL;--> statement-breakpoint
ALTER TABLE `changeOrders` MODIFY COLUMN `updatedAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `clients` MODIFY COLUMN `updatedAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `companySettings` MODIFY COLUMN `updatedAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `employees` MODIFY COLUMN `updatedAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `expenses` MODIFY COLUMN `updatedAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `forms` MODIFY COLUMN `updatedAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `installments` MODIFY COLUMN `updatedAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `invoiceItems` MODIFY COLUMN `sortOrder` int;--> statement-breakpoint
ALTER TABLE `invoices` MODIFY COLUMN `clientId` int;--> statement-breakpoint
ALTER TABLE `invoices` MODIFY COLUMN `tax` int;--> statement-breakpoint
ALTER TABLE `invoices` MODIFY COLUMN `discount` int;--> statement-breakpoint
ALTER TABLE `invoices` MODIFY COLUMN `formData` mediumtext;--> statement-breakpoint
ALTER TABLE `invoices` MODIFY COLUMN `updatedAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `projectTasks` MODIFY COLUMN `updatedAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `projects` MODIFY COLUMN `clientId` int;--> statement-breakpoint
ALTER TABLE `projects` MODIFY COLUMN `status` enum('in_progress','delivered','cancelled') NOT NULL DEFAULT 'in_progress';--> statement-breakpoint
ALTER TABLE `projects` MODIFY COLUMN `updatedAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `purchases` MODIFY COLUMN `updatedAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `sales` MODIFY COLUMN `updatedAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `submittals` MODIFY COLUMN `status` enum('submitted','under_review','approved','rejected') NOT NULL DEFAULT 'submitted';--> statement-breakpoint
ALTER TABLE `userPermissions` MODIFY COLUMN `updatedAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','department_manager','project_manager','project_coordinator','architect','interior_designer','site_engineer','planning_engineer','designer','technician','finance_manager','accountant','sales_manager','hr_manager','admin_assistant','procurement_officer','storekeeper','qa_qc','document_controller','viewer') NOT NULL DEFAULT 'designer';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `isActive` tinyint NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `updatedAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `auditLogs` ADD `oldValue` text;--> statement-breakpoint
ALTER TABLE `auditLogs` ADD `newValue` text;--> statement-breakpoint
ALTER TABLE `invoiceItems` ADD `unit` varchar(50);--> statement-breakpoint
ALTER TABLE `leaves` ADD `cancellationRequested` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `leaves` ADD `cancellationReason` text;--> statement-breakpoint
ALTER TABLE `leaves` ADD `cancellationRequestedAt` timestamp;--> statement-breakpoint
ALTER TABLE `leaves` ADD `cancellationResolvedBy` int;--> statement-breakpoint
ALTER TABLE `leaves` ADD `cancellationResolvedAt` timestamp;--> statement-breakpoint
ALTER TABLE `leaves` ADD `cancellationResolvedNotes` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `projectType` enum('design','execution','design_execution','supervision') DEFAULT 'design' NOT NULL;--> statement-breakpoint
ALTER TABLE `rfis` ADD `assignedTo` int;--> statement-breakpoint
ALTER TABLE `rfis` ADD `assignedBy` int;--> statement-breakpoint
ALTER TABLE `submittals` ADD `assignedTo` int;--> statement-breakpoint
ALTER TABLE `submittals` ADD `assignedBy` int;--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `mustChangePassword` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `tempPasswordExpiresAt` timestamp;--> statement-breakpoint
CREATE INDEX `idx_aiGeminiPages_isHidden` ON `aiGeminiPages` (`isHidden`);--> statement-breakpoint
CREATE INDEX `idx_approvalRequests_status` ON `approvalRequests` (`status`);--> statement-breakpoint
CREATE INDEX `idx_approvalRequests_requestedBy` ON `approvalRequests` (`requestedBy`);--> statement-breakpoint
CREATE INDEX `idx_notifications_userId` ON `notifications` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_notifications_isRead` ON `notifications` (`isRead`);--> statement-breakpoint
CREATE INDEX `idx_notifications_createdAt` ON `notifications` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_password_reset_requests_userId` ON `password_reset_requests` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_password_reset_requests_status` ON `password_reset_requests` (`status`);--> statement-breakpoint
CREATE INDEX `idx_password_reset_token` ON `password_reset_tokens` (`token`);--> statement-breakpoint
CREATE INDEX `idx_password_reset_userId` ON `password_reset_tokens` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_projectTeam_projectId` ON `projectTeam` (`projectId`);--> statement-breakpoint
CREATE INDEX `idx_rfis_assignedTo` ON `rfis` (`assignedTo`);--> statement-breakpoint
CREATE INDEX `idx_submittals_assignedTo` ON `submittals` (`assignedTo`);