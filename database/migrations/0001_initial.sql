-- IG Social AI initial schema
-- Run this against your Neon Postgres database before using database-backed MCP tools.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/Montevideo',
  niche TEXT,
  audience_description TEXT,
  content_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS instagram_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  instagram_user_id TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  account_type TEXT,
  access_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  format TEXT NOT NULL CHECK (format IN ('reel', 'story', 'carousel')),
  title TEXT NOT NULL,
  hook TEXT NOT NULL,
  summary TEXT NOT NULL,
  audience TEXT,
  script TEXT,
  storyboard JSONB,
  caption TEXT,
  cta TEXT,
  keyword TEXT,
  rationale TEXT,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'selected', 'in_production', 'ready_for_review', 'approved', 'published', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS content_ideas_status_created_idx ON content_ideas(status, created_at DESC);

CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_idea_id UUID REFERENCES content_ideas(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('voiceover', 'video', 'cover', 'thumbnail', 'source_image')),
  storage_url TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_idea_id UUID REFERENCES content_ideas(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('publish_post', 'publish_reel', 'publish_story', 'send_dm', 'reply_comment')),
  content_hash TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL,
  keyword TEXT,
  response_template TEXT,
  resource_url TEXT,
  requires_follow BOOLEAN NOT NULL DEFAULT TRUE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  account_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  niche_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (creator_id, report_date)
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  event_id TEXT,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, event_id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES creators(id) ON DELETE SET NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Binary media payloads are kept separate from asset metadata.
CREATE TABLE IF NOT EXISTS media_asset_blobs (
  asset_id UUID PRIMARY KEY REFERENCES media_assets(id) ON DELETE CASCADE,
  mime_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  content_base64 TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Track Meta publishing container state and idempotent publish results.
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS provider_container_id TEXT;
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS published_media_id TEXT;
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Add per-content lead-magnet settings and link automation rules to published media.
ALTER TABLE content_ideas ADD COLUMN IF NOT EXISTS resource_url TEXT;
ALTER TABLE content_ideas ADD COLUMN IF NOT EXISTS dm_message TEXT;
ALTER TABLE content_ideas ADD COLUMN IF NOT EXISTS requires_follow BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE automation_rules ADD COLUMN IF NOT EXISTS instagram_media_id TEXT;
ALTER TABLE automation_rules ADD COLUMN IF NOT EXISTS content_idea_id UUID REFERENCES content_ideas(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS automation_rules_media_keyword_idx ON automation_rules(instagram_media_id, keyword) WHERE enabled = TRUE;

-- Track a commenter through the opt-in / follow-check / resource-delivery flow.
CREATE TABLE IF NOT EXISTS automation_contact_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_rule_id UUID NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
  contact_igsid TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'awaiting_user_action' CHECK (status IN ('awaiting_user_action', 'awaiting_follow', 'delivered', 'failed')),
  last_interaction_at TIMESTAMPTZ,
  last_follow_check BOOLEAN,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (automation_rule_id, contact_igsid)
);
CREATE INDEX IF NOT EXISTS automation_contact_states_contact_idx ON automation_contact_states(contact_igsid, updated_at DESC);

-- Local workstation render queue. The user's PC consumes queued jobs without a paid cloud renderer.
CREATE TABLE IF NOT EXISTS render_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_idea_id UUID NOT NULL REFERENCES content_ideas(id) ON DELETE CASCADE,
  voiceover_asset_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  video_asset_id UUID REFERENCES media_assets(id) ON DELETE SET NULL,
  cover_asset_id UUID REFERENCES media_assets(id) ON DELETE SET NULL,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS render_jobs_queue_idx ON render_jobs(status, created_at) WHERE status = 'queued';
