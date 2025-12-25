-- Migration: Add projectType field and update status values
-- This migration separates project type from project lifecycle status

-- Step 1: Add projectType column with default value
ALTER TABLE projects ADD COLUMN projectType ENUM('design', 'execution', 'design_execution', 'supervision') DEFAULT 'design';

-- Step 2: Migrate existing data
-- Map old 'design' status to projectType='design'
UPDATE projects SET projectType = 'design' WHERE status = 'design';
-- Map old 'execution' status to projectType='execution'
UPDATE projects SET projectType = 'execution' WHERE status = 'execution';

-- Step 3: Update status values to new lifecycle values
-- 'design' and 'execution' were project types, convert to 'in_progress'
UPDATE projects SET status = 'in_progress' WHERE status IN ('design', 'execution');
-- 'delivery' maps to 'delivered'
UPDATE projects SET status = 'delivered' WHERE status = 'delivery';
-- 'completed' maps to 'delivered'
UPDATE projects SET status = 'delivered' WHERE status = 'completed';
-- 'cancelled' stays as 'cancelled'

-- Step 4: Modify status column to new enum values
ALTER TABLE projects MODIFY COLUMN status ENUM('in_progress', 'delivered', 'cancelled') DEFAULT 'in_progress' NOT NULL;

-- Step 5: Make projectType NOT NULL
ALTER TABLE projects MODIFY COLUMN projectType ENUM('design', 'execution', 'design_execution', 'supervision') NOT NULL DEFAULT 'design';
