-- Add cancellation request fields to leaves table
ALTER TABLE `leaves` 
ADD COLUMN `cancellationRequested` INT DEFAULT 0,
ADD COLUMN `cancellationReason` TEXT,
ADD COLUMN `cancellationRequestedAt` TIMESTAMP NULL,
ADD COLUMN `cancellationResolvedBy` INT,
ADD COLUMN `cancellationResolvedAt` TIMESTAMP NULL,
ADD COLUMN `cancellationResolvedNotes` TEXT;
