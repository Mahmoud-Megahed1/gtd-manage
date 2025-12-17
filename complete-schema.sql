-- GTD Manage - Complete Database Schema
-- Run this script to create all required tables

-- Drop existing tables if needed (optional - comment out if you want to keep data)
-- SET FOREIGN_KEY_CHECKS = 0;
-- ... drop statements ...
-- SET FOREIGN_KEY_CHECKS = 1;

-- 1. Users (already exists but recreating for completeness)
CREATE TABLE IF NOT EXISTS `users` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `openId` varchar(64) NOT NULL UNIQUE,
  `name` text,
  `email` varchar(320),
  `passwordHash` varchar(255),
  `loginMethod` varchar(64),
  `role` enum('admin','accountant','finance_manager','project_manager','site_engineer','planning_engineer','procurement_officer','qa_qc','document_controller','architect','interior_designer','sales_manager','hr_manager','storekeeper','designer','viewer') NOT NULL DEFAULT 'designer',
  `isActive` tinyint NOT NULL DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `lastSignedIn` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. User Permissions
CREATE TABLE IF NOT EXISTS `userPermissions` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL UNIQUE,
  `permissionsJson` text,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. Audit Logs
CREATE TABLE IF NOT EXISTS `auditLogs` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int,
  `action` varchar(100) NOT NULL,
  `entityType` varchar(50),
  `entityId` int,
  `details` text,
  `ipAddress` varchar(45),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_auditLogs_createdAt` (`createdAt`),
  INDEX `idx_auditLogs_entity` (`entityType`, `entityId`)
);

-- 4. Clients
CREATE TABLE IF NOT EXISTS `clients` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `clientNumber` varchar(50) NOT NULL UNIQUE,
  `name` varchar(255) NOT NULL,
  `email` varchar(320),
  `phone` varchar(50),
  `address` text,
  `city` varchar(100),
  `notes` text,
  `createdBy` int,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 5. Projects
CREATE TABLE IF NOT EXISTS `projects` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `projectNumber` varchar(50) NOT NULL UNIQUE,
  `clientId` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `status` enum('design','execution','delivery','completed','cancelled') NOT NULL DEFAULT 'design',
  `startDate` timestamp NULL,
  `endDate` timestamp NULL,
  `budget` int,
  `assignedTo` int,
  `createdBy` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 6. Project Tasks
CREATE TABLE IF NOT EXISTS `projectTasks` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `projectId` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `startDate` timestamp NULL,
  `endDate` timestamp NULL,
  `status` enum('planned','in_progress','done','cancelled') NOT NULL DEFAULT 'planned',
  `assignedTo` int,
  `priority` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  `estimateHours` int,
  `progress` int NOT NULL DEFAULT 0,
  `parentId` int,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_projectTasks_projectId` (`projectId`),
  INDEX `idx_projectTasks_assignedTo` (`assignedTo`),
  INDEX `idx_projectTasks_parentId` (`parentId`)
);

-- 7. Task Comments
CREATE TABLE IF NOT EXISTS `taskComments` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `taskId` int NOT NULL,
  `content` text NOT NULL,
  `createdBy` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. Invoices
CREATE TABLE IF NOT EXISTS `invoices` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `invoiceNumber` varchar(50) NOT NULL UNIQUE,
  `type` enum('invoice','quote') NOT NULL,
  `clientId` int NOT NULL,
  `projectId` int,
  `issueDate` timestamp NOT NULL,
  `dueDate` timestamp NULL,
  `status` enum('draft','sent','paid','cancelled') NOT NULL DEFAULT 'draft',
  `subtotal` int NOT NULL,
  `tax` int,
  `discount` int,
  `total` int NOT NULL,
  `notes` text,
  `terms` text,
  `formData` text,
  `createdBy` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_invoices_issueDate` (`issueDate`),
  INDEX `idx_invoices_clientId` (`clientId`),
  INDEX `idx_invoices_projectId` (`projectId`)
);

-- 9. Invoice Items
CREATE TABLE IF NOT EXISTS `invoiceItems` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `invoiceId` int NOT NULL,
  `description` text NOT NULL,
  `quantity` int NOT NULL,
  `unitPrice` int NOT NULL,
  `total` int NOT NULL,
  `sortOrder` int
);

-- 10. Forms
CREATE TABLE IF NOT EXISTS `forms` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `formNumber` varchar(50) NOT NULL UNIQUE,
  `clientId` int NOT NULL,
  `projectId` int,
  `formType` varchar(100) NOT NULL,
  `formData` text NOT NULL,
  `status` enum('pending','reviewed','approved','rejected') NOT NULL DEFAULT 'pending',
  `createdBy` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 11. BOQ (Bill of Quantities)
CREATE TABLE IF NOT EXISTS `boq` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `projectId` int NOT NULL,
  `itemName` varchar(255) NOT NULL,
  `description` text,
  `quantity` int NOT NULL,
  `unit` varchar(50),
  `unitPrice` int NOT NULL,
  `total` int NOT NULL,
  `category` varchar(100),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 12. Expenses
CREATE TABLE IF NOT EXISTS `expenses` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `projectId` int,
  `category` varchar(100) NOT NULL,
  `description` text NOT NULL,
  `amount` int NOT NULL,
  `expenseDate` timestamp NOT NULL,
  `receipt` varchar(500),
  `status` enum('active','cancelled') NOT NULL DEFAULT 'active',
  `createdBy` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_expenses_expenseDate` (`expenseDate`),
  INDEX `idx_expenses_projectId` (`projectId`)
);

-- 13. Installments
CREATE TABLE IF NOT EXISTS `installments` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `projectId` int NOT NULL,
  `invoiceId` int,
  `installmentNumber` int NOT NULL,
  `amount` int NOT NULL,
  `dueDate` timestamp NOT NULL,
  `paidDate` timestamp NULL,
  `status` enum('pending','paid','overdue','cancelled') NOT NULL DEFAULT 'pending',
  `paymentMethod` varchar(50),
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_installments_createdAt` (`createdAt`),
  INDEX `idx_installments_projectId` (`projectId`),
  INDEX `idx_installments_invoiceId` (`invoiceId`)
);

-- 14. Company Settings
CREATE TABLE IF NOT EXISTS `companySettings` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `settingKey` varchar(100) NOT NULL UNIQUE,
  `settingValue` text,
  `updatedBy` int,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 15. Attachments
CREATE TABLE IF NOT EXISTS `attachments` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `entityType` varchar(50) NOT NULL,
  `entityId` int NOT NULL,
  `fileName` varchar(255) NOT NULL,
  `fileKey` varchar(500) NOT NULL,
  `fileUrl` varchar(1000) NOT NULL,
  `fileSize` int,
  `mimeType` varchar(100),
  `uploadedBy` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 16. Change Orders
CREATE TABLE IF NOT EXISTS `changeOrders` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `projectId` int NOT NULL,
  `code` varchar(64) NOT NULL UNIQUE,
  `title` varchar(255) NOT NULL,
  `description` text,
  `origin` enum('client','internal','site') NOT NULL DEFAULT 'client',
  `status` enum('draft','submitted','approved','rejected','cancelled') NOT NULL DEFAULT 'draft',
  `impactCost` int NOT NULL,
  `impactDays` int NOT NULL,
  `submittedBy` int,
  `submittedAt` timestamp NULL,
  `approvedBy` int,
  `approvedAt` timestamp NULL,
  `rejectedBy` int,
  `rejectedAt` timestamp NULL,
  `rejectionReason` text,
  `createdBy` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 17. Employees
CREATE TABLE IF NOT EXISTS `employees` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL UNIQUE,
  `employeeNumber` varchar(50) NOT NULL UNIQUE,
  `department` varchar(100),
  `position` varchar(100),
  `hireDate` timestamp NOT NULL,
  `salary` int,
  `bankAccount` varchar(100),
  `emergencyContact` text,
  `status` enum('active','on_leave','terminated') NOT NULL DEFAULT 'active',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 18. Attendance
CREATE TABLE IF NOT EXISTS `attendance` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `employeeId` int NOT NULL,
  `date` timestamp NOT NULL,
  `checkIn` timestamp NULL,
  `checkOut` timestamp NULL,
  `hoursWorked` int,
  `status` enum('present','absent','late','half_day') NOT NULL DEFAULT 'present',
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 19. Leaves
CREATE TABLE IF NOT EXISTS `leaves` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `employeeId` int NOT NULL,
  `leaveType` enum('annual','sick','emergency','unpaid') NOT NULL,
  `startDate` timestamp NOT NULL,
  `endDate` timestamp NOT NULL,
  `days` int NOT NULL,
  `reason` text,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `approvedBy` int,
  `approvedAt` timestamp NULL,
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 20. Payroll
CREATE TABLE IF NOT EXISTS `payroll` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `employeeId` int NOT NULL,
  `month` int NOT NULL,
  `year` int NOT NULL,
  `baseSalary` int NOT NULL,
  `bonuses` int DEFAULT 0,
  `deductions` int DEFAULT 0,
  `netSalary` int NOT NULL,
  `paymentDate` timestamp NULL,
  `status` enum('pending','paid') NOT NULL DEFAULT 'pending',
  `notes` text,
  `createdBy` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 21. Performance Reviews
CREATE TABLE IF NOT EXISTS `performanceReviews` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `employeeId` int NOT NULL,
  `reviewerId` int NOT NULL,
  `reviewDate` timestamp NOT NULL,
  `period` varchar(50),
  `rating` int,
  `strengths` text,
  `weaknesses` text,
  `goals` text,
  `comments` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 22. Sales
CREATE TABLE IF NOT EXISTS `sales` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `saleNumber` varchar(50) NOT NULL UNIQUE,
  `clientId` int NOT NULL,
  `projectId` int,
  `description` text NOT NULL,
  `amount` int NOT NULL,
  `paymentMethod` enum('cash','bank_transfer','check','credit') NOT NULL DEFAULT 'cash',
  `saleDate` timestamp NOT NULL,
  `status` enum('pending','completed','cancelled') NOT NULL DEFAULT 'pending',
  `invoiceId` int,
  `notes` text,
  `createdBy` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 23. Purchases
CREATE TABLE IF NOT EXISTS `purchases` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `purchaseNumber` varchar(50) NOT NULL UNIQUE,
  `supplierId` int,
  `supplierName` varchar(255) NOT NULL,
  `projectId` int,
  `description` text NOT NULL,
  `amount` int NOT NULL,
  `paymentMethod` enum('cash','bank_transfer','check','credit') NOT NULL DEFAULT 'cash',
  `purchaseDate` timestamp NOT NULL,
  `status` enum('pending','completed','cancelled') NOT NULL DEFAULT 'pending',
  `category` varchar(100),
  `notes` text,
  `createdBy` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_purchases_purchaseDate` (`purchaseDate`),
  INDEX `idx_purchases_projectId` (`projectId`)
);

-- 24. Drawings
CREATE TABLE IF NOT EXISTS `drawings` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `projectId` int NOT NULL,
  `drawingCode` varchar(64) NOT NULL UNIQUE,
  `title` varchar(255) NOT NULL,
  `discipline` varchar(64),
  `status` enum('draft','issued','approved') NOT NULL DEFAULT 'draft',
  `currentVersionId` int,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 25. Drawing Versions
CREATE TABLE IF NOT EXISTS `drawingVersions` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `drawingId` int NOT NULL,
  `version` varchar(32) NOT NULL,
  `fileUrl` varchar(1000) NOT NULL,
  `notes` text,
  `createdBy` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 26. RFIs
CREATE TABLE IF NOT EXISTS `rfis` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `projectId` int NOT NULL,
  `rfiNumber` varchar(64) NOT NULL UNIQUE,
  `title` varchar(255) NOT NULL,
  `question` text NOT NULL,
  `status` enum('open','answered','closed') NOT NULL DEFAULT 'open',
  `submittedBy` int NOT NULL,
  `submittedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `answeredBy` int,
  `answeredAt` timestamp NULL,
  `answer` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 27. Submittals
CREATE TABLE IF NOT EXISTS `submittals` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `projectId` int NOT NULL,
  `submittalCode` varchar(64) NOT NULL UNIQUE,
  `title` varchar(255) NOT NULL,
  `status` enum('submitted','approved','rejected') NOT NULL DEFAULT 'submitted',
  `submittedBy` int NOT NULL,
  `submittedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `approvedBy` int,
  `approvedAt` timestamp NULL,
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Done! All tables created.
SELECT 'All tables created successfully!' AS status;
