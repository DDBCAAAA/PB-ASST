CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table stores core profile information and authentication metadata.
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  gender TEXT,
  birthdate DATE,
  height_cm INTEGER,
  weight_kg INTEGER,
  weekly_training_days INTEGER,
  best_race_distance TEXT,
  best_race_time_seconds INTEGER,
  timezone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  UNIQUE (provider, provider_user_id)
);

-- Training plans capture high level goal context for a user.
CREATE TABLE IF NOT EXISTS training_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_race_distance TEXT NOT NULL,
  goal_race_date DATE NOT NULL,
  goal_finish_time INTERVAL,
  goal_target_time_seconds INTEGER,
  goal_notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  ai_model TEXT,
  prompt_context JSONB,
  plan_payload JSONB,
  generation_notes TEXT,
  confidence_score NUMERIC(5,2),
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (status IN ('draft', 'pending', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_training_plans_user ON training_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_training_plans_user_status ON training_plans(user_id, status);

-- Workouts represent daily prescription items tied to a plan.
CREATE TABLE IF NOT EXISTS workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_plan_id UUID NOT NULL REFERENCES training_plans(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  workout_type TEXT NOT NULL,
  distance_km NUMERIC(6,2),
  target_pace TEXT,
  status TEXT DEFAULT 'scheduled',
  pre_run_sleep_quality INTEGER,
  pre_run_body_feel INTEGER,
  user_feedback_difficulty INTEGER,
  user_feedback_notes TEXT,
  additional_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workouts_plan_date ON workouts(training_plan_id, scheduled_date);

-- Trigger updates updated_at timestamps automatically.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_training_plans_updated_at
BEFORE UPDATE ON training_plans
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_workouts_updated_at
BEFORE UPDATE ON workouts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
