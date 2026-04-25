-- Add subscription and daily limit columns to profiles table
ALTER TABLE profiles ADD COLUMN is_pro BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN daily_applications INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN last_reset_date DATE;