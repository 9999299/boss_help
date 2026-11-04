CREATE TABLE IF NOT EXISTS career_experiences (
  id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('employment', 'project', 'education', 'skill', 'achievement')),
  organization TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  start_date TEXT NOT NULL DEFAULT '',
  end_date TEXT NOT NULL DEFAULT '',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  source TEXT NOT NULL DEFAULT 'user',
  user_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id, id)
);
CREATE INDEX IF NOT EXISTS career_experiences_tenant_user_idx
  ON career_experiences (tenant_id, user_id, deleted_at);

CREATE TABLE IF NOT EXISTS job_snapshots (
  id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'boss',
  external_url TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  analysis_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id, id)
);
CREATE INDEX IF NOT EXISTS job_snapshots_tenant_user_idx
  ON job_snapshots (tenant_id, user_id);

CREATE TABLE IF NOT EXISTS agent_runs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  current_step TEXT,
  steps_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  input_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agent_runs_tenant_user_job_idx
  ON agent_runs (tenant_id, user_id, job_id);
CREATE INDEX IF NOT EXISTS agent_runs_idempotency_idx
  ON agent_runs (tenant_id, user_id, job_id, idempotency_key, status);
CREATE UNIQUE INDEX IF NOT EXISTS agent_runs_active_idempotency_idx
  ON agent_runs (tenant_id, user_id, job_id, idempotency_key)
  WHERE status IN ('pending', 'running');

CREATE TABLE IF NOT EXISTS experience_generations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  agent_run_id TEXT NOT NULL,
  version_no INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'edited', 'confirmed')),
  result_json JSONB NOT NULL,
  source_snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id, job_id, version_no)
);
CREATE INDEX IF NOT EXISTS experience_generations_tenant_user_job_idx
  ON experience_generations (tenant_id, user_id, job_id, version_no DESC);

CREATE TABLE IF NOT EXISTS experience_generation_bullets (
  id TEXT PRIMARY KEY,
  generation_id TEXT NOT NULL REFERENCES experience_generations(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  section TEXT NOT NULL CHECK (section IN ('work', 'project')),
  source_experience_id TEXT NOT NULL,
  claim_id TEXT NOT NULL,
  text TEXT NOT NULL,
  evidence_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  verification_status TEXT NOT NULL DEFAULT 'supported'
    CHECK (verification_status IN ('supported', 'needs_confirmation', 'user_edited')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (generation_id, claim_id)
);
CREATE INDEX IF NOT EXISTS experience_generation_bullets_owner_idx
  ON experience_generation_bullets (tenant_id, user_id, generation_id);
