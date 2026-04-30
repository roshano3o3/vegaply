-- Add subscription and daily limit columns to profiles table
ALTER TABLE profiles ADD COLUMN is_pro BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN daily_applications INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN last_reset_date DATE;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarded BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;