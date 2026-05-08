-- =============================================================
-- Vegaply — Auto-Apply Feature: Schema Migration
-- Tables: daily_queue, subscriptions
-- Run this in: Supabase Dashboard → SQL Editor → Run
-- =============================================================


-- ── 1. daily_queue ────────────────────────────────────────────
-- One row per (user_id, job_id, date).
-- job_description truncation enforced at insert time in the API route.

CREATE TABLE IF NOT EXISTS daily_queue (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Job identity (denormalized from external JSearch API — no local jobs table)
  job_id                TEXT        NOT NULL,
  job_title             TEXT,
  employer_name         TEXT,
  job_apply_link        TEXT,
  job_description       TEXT,        -- truncated to 3000 chars at insert time in API

  -- Processing status
  status                TEXT        NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'applied', 'failed', 'skipped')),

  -- AI output (text — matches existing pattern, no Storage dependency)
  tailored_resume_text  TEXT,
  cover_letter_text     TEXT,
  match_score           INTEGER,

  -- Timestamps
  queue_date            DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_at            TIMESTAMPTZ,

  -- Error capture for retries / debugging
  error_message         TEXT,

  -- One entry per user per job per day
  CONSTRAINT daily_queue_unique UNIQUE (user_id, job_id, queue_date)
);

-- Index 1: primary query — "get today's queue for this user"
CREATE INDEX IF NOT EXISTS idx_daily_queue_user_date
  ON daily_queue (user_id, queue_date);

-- Index 2: background processor — "find all pending items for today"
CREATE INDEX IF NOT EXISTS idx_daily_queue_date_status
  ON daily_queue (queue_date, status);

-- Index 3: user-facing status filter — "show user their applied/failed jobs"
CREATE INDEX IF NOT EXISTS idx_daily_queue_user_status
  ON daily_queue (user_id, status);

-- RLS
ALTER TABLE daily_queue ENABLE ROW LEVEL SECURITY;

-- Users can read their own queue rows
CREATE POLICY "users_select_own_queue"
  ON daily_queue FOR SELECT
  USING (auth.uid() = user_id);

-- Service role (used in API routes with service key) can do everything
CREATE POLICY "service_role_all_queue"
  ON daily_queue FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ── 2. subscriptions ──────────────────────────────────────────
-- One row per user. Source of truth for plan, daily_limit, expiry.
-- profiles.is_pro remains as a fast denormalized read cache.

CREATE TABLE IF NOT EXISTS subscriptions (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Plan config
  plan                      TEXT        NOT NULL DEFAULT 'free'
                            CHECK (plan IN ('free', 'pro')),
  daily_limit               INTEGER     NOT NULL DEFAULT 15,
  active                    BOOLEAN     NOT NULL DEFAULT false,

  -- Stripe linkage (mirrors what's in profiles.stripe_customer_id — kept in sync)
  stripe_customer_id        TEXT,
  stripe_subscription_id    TEXT,

  -- Lifecycle
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at                TIMESTAMPTZ
);

-- Index: Stripe webhook lookup by customer ID
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer
  ON subscriptions (stripe_customer_id);

-- RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription row
CREATE POLICY "users_select_own_subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "service_role_all_subscriptions"
  ON subscriptions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- =============================================================
-- Verification queries — run these after the above to confirm:
--
-- \d daily_queue
-- \d subscriptions
--
-- Or in the SQL editor:
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--  WHERE table_name IN ('daily_queue', 'subscriptions')
--  ORDER BY table_name, ordinal_position;
-- =============================================================
