-- SQL Schema Upgrades for UP Bikeshare Honesty Policy
-- Database: upbs

USE upbs;

-- 1. Upgrades for the members table
ALTER TABLE members ADD COLUMN IF NOT EXISTS trust_points INT DEFAULT 100;
ALTER TABLE members ADD COLUMN IF NOT EXISTS points_frozen TINYINT(1) DEFAULT 0;

-- 2. Upgrades for the bicycle_codes table
ALTER TABLE bicycle_codes ADD COLUMN IF NOT EXISTS condition_status VARCHAR(50) DEFAULT 'Good';
ALTER TABLE bicycle_codes ADD COLUMN IF NOT EXISTS broken_reported_at DATETIME DEFAULT NULL;
ALTER TABLE bicycle_codes ADD COLUMN IF NOT EXISTS penalty_applied TINYINT(1) DEFAULT 0;

-- 3. Upgrades for the bicycle_history table
ALTER TABLE bicycle_history ADD COLUMN IF NOT EXISTS reminder_1h_sent TINYINT(1) DEFAULT 0;
ALTER TABLE bicycle_history ADD COLUMN IF NOT EXISTS reminder_4h_sent TINYINT(1) DEFAULT 0;
ALTER TABLE bicycle_history ADD COLUMN IF NOT EXISTS done_text_received TINYINT(1) DEFAULT 0;
ALTER TABLE bicycle_history ADD COLUMN IF NOT EXISTS condition_confirmed TINYINT(1) DEFAULT 0;
ALTER TABLE bicycle_history ADD COLUMN IF NOT EXISTS pending_status_time DATETIME DEFAULT NULL;
ALTER TABLE bicycle_history ADD COLUMN IF NOT EXISTS reminder_pending_sent TINYINT(1) DEFAULT 0;
