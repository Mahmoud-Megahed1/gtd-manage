-- Add Approval Requests table for approval workflow
CREATE TABLE IF NOT EXISTS `approvalRequests` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `entityType` ENUM('expense', 'sale', 'purchase', 'invoice', 'boq', 'installment') NOT NULL,
  `entityId` INT NOT NULL,
  `action` ENUM('create', 'update', 'delete', 'cancel', 'approve') NOT NULL,
  `requestData` TEXT,
  `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `requestedBy` INT NOT NULL,
  `requestedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewedBy` INT,
  `reviewedAt` TIMESTAMP,
  `reviewNotes` TEXT,
  PRIMARY KEY (`id`),
  INDEX `idx_approvalRequests_status` (`status`),
  INDEX `idx_approvalRequests_requestedBy` (`requestedBy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
