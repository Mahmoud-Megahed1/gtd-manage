-- Enhanced Audit Logs: Add old_value and new_value columns
ALTER TABLE `auditLogs` 
ADD COLUMN `oldValue` TEXT NULL AFTER `details`,
ADD COLUMN `newValue` TEXT NULL AFTER `oldValue`;
