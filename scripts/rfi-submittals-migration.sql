-- SQL Migration for RFI/Submittals Workflow
-- Run this on production database after deploying new code

-- Add assignedTo and assignedBy to RFIs table
ALTER TABLE rfis ADD COLUMN assignedTo INT NULL;
ALTER TABLE rfis ADD COLUMN assignedBy INT NULL;
CREATE INDEX idx_rfis_assignedTo ON rfis(assignedTo);

-- Add assignedTo and assignedBy to submittals table
ALTER TABLE submittals ADD COLUMN assignedTo INT NULL;
ALTER TABLE submittals ADD COLUMN assignedBy INT NULL;
CREATE INDEX idx_submittals_assignedTo ON submittals(assignedTo);

-- Update submittals status enum to include under_review
ALTER TABLE submittals MODIFY COLUMN status ENUM('submitted', 'under_review', 'approved', 'rejected') DEFAULT 'submitted';

-- Verify changes
DESCRIBE rfis;
DESCRIBE submittals;
