ALTER TABLE `expenses` ADD COLUMN `status` ENUM('active','cancelled') NOT NULL DEFAULT 'active';
ALTER TABLE `installments` MODIFY COLUMN `status` ENUM('pending','paid','overdue','cancelled') NOT NULL DEFAULT 'pending';
