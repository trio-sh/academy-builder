-- ══════════════════════════════════════════════════════════════════
-- T3A BUILD RULES 9-11 MIGRATION
-- February 2026 — Assessment Integrity & Employer Signal Quality
-- ══════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────
-- RULE 9: Re-Assessment Cooldown
-- Admin-configurable. Default: 14 days.
-- Candidates cannot retake any dimension sooner than this period.
-- ──────────────────────────────────────────────────────────────────

-- Admin settings table (general-purpose key/value store for platform config)
CREATE TABLE IF NOT EXISTS public.admin_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id)
);

-- Seed the default cooldown setting (admin changes this without a code deploy)
INSERT INTO public.admin_settings (key, value, description)
VALUES (
  'reassessment_cooldown_days',
  '14',
  'Minimum days between re-assessments on any single dimension. Build Rule 9. Default: 14.'
)
ON CONFLICT (key) DO NOTHING;

-- Track when each candidate last completed an observation per dimension
CREATE TABLE IF NOT EXISTS public.observation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dimension_id TEXT NOT NULL,             -- T3A dimension ID (e.g., 'integrity_ethics')
  observation_level SMALLINT NOT NULL,    -- 1, 2, 3, or 4
  session_started_at TIMESTAMPTZ DEFAULT now(),
  session_completed_at TIMESTAMPTZ,       -- NULL until candidate completes
  random_seed BIGINT,                     -- Build Rule 10: logged for audit
  scenario_ids TEXT[],                    -- Which scenarios were shown (from the bank)
  is_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_obs_sessions_candidate ON public.observation_sessions(candidate_id);
CREATE INDEX IF NOT EXISTS idx_obs_sessions_dimension ON public.observation_sessions(candidate_id, dimension_id);

-- ──────────────────────────────────────────────────────────────────
-- RULE 10: Scenario Randomization Audit Log
-- Seed is logged for audit. Randomization within each dimension only.
-- ──────────────────────────────────────────────────────────────────

-- This is already handled by the random_seed + scenario_ids columns in observation_sessions above.
-- Additional standalone audit log for traceability:
CREATE TABLE IF NOT EXISTS public.scenario_selection_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.observation_sessions(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dimension_id TEXT NOT NULL,
  random_seed BIGINT NOT NULL,
  scenario_sequence TEXT[] NOT NULL,      -- Ordered list of scenario IDs shown
  generated_at TIMESTAMPTZ DEFAULT now()
);

-- ──────────────────────────────────────────────────────────────────
-- RULE 11: Behavioral Consistency Index
-- INTERNAL ONLY. Never shown to candidates.
-- Visible only to mentors and employer-facing reports.
-- ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.behavioral_consistency_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dimension_id TEXT NOT NULL,
  observation_cycle INTEGER NOT NULL DEFAULT 1,   -- Increments each time candidate completes a full cycle

  -- Consistency tracking: how many scenarios demonstrated the dimension vs total
  scenarios_demonstrated INTEGER DEFAULT 0,
  scenarios_total INTEGER DEFAULT 0,
  consistency_ratio NUMERIC(5, 4),               -- 0.0000 to 1.0000 (e.g. 0.7500 = 3/4 scenarios)

  -- For change tracking across cycles
  previous_consistency_ratio NUMERIC(5, 4),
  consistency_trend TEXT CHECK (consistency_trend IN ('improving', 'declining', 'stable', 'first_cycle')),

  -- Internal notes (mentor only)
  mentor_notes TEXT,
  flagged_for_review BOOLEAN DEFAULT FALSE,

  last_updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (candidate_id, dimension_id, observation_cycle)
);

CREATE INDEX IF NOT EXISTS idx_consistency_candidate ON public.behavioral_consistency_index(candidate_id);
CREATE INDEX IF NOT EXISTS idx_consistency_dimension ON public.behavioral_consistency_index(candidate_id, dimension_id);

-- ──────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ──────────────────────────────────────────────────────────────────

-- admin_settings: readable by all authenticated, writable by admins only
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_settings_read" ON public.admin_settings
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "admin_settings_write" ON public.admin_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- observation_sessions: candidates can read own, mentors/admins read all
ALTER TABLE public.observation_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "obs_sessions_candidate_read" ON public.observation_sessions
  FOR SELECT USING (candidate_id = auth.uid());
CREATE POLICY "obs_sessions_candidate_insert" ON public.observation_sessions
  FOR INSERT WITH CHECK (candidate_id = auth.uid());
CREATE POLICY "obs_sessions_candidate_update" ON public.observation_sessions
  FOR UPDATE USING (candidate_id = auth.uid() AND is_complete = FALSE);
CREATE POLICY "obs_sessions_mentor_read" ON public.observation_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('mentor', 'admin')
    )
  );

-- scenario_selection_audit: write by candidates, read by mentors/admins
ALTER TABLE public.scenario_selection_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scenario_audit_insert" ON public.scenario_selection_audit
  FOR INSERT WITH CHECK (candidate_id = auth.uid());
CREATE POLICY "scenario_audit_mentor_read" ON public.scenario_selection_audit
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('mentor', 'admin')
    )
  );

-- behavioral_consistency_index: NEVER readable by candidates
-- Only mentors, admins, and employer reports
ALTER TABLE public.behavioral_consistency_index ENABLE ROW LEVEL SECURITY;
CREATE POLICY "consistency_mentor_all" ON public.behavioral_consistency_index
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('mentor', 'admin')
    )
  );
-- Employer read-only (for reports — filtered by their connected candidates)
CREATE POLICY "consistency_employer_read" ON public.behavioral_consistency_index
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'employer'
    )
    AND
    EXISTS (
      SELECT 1 FROM public.t3x_connections
      WHERE employer_id = auth.uid()
      AND candidate_id = behavioral_consistency_index.candidate_id
      AND status = 'accepted'
    )
  );

-- Explicitly deny candidates from reading consistency index
CREATE POLICY "consistency_candidate_deny" ON public.behavioral_consistency_index
  AS RESTRICTIVE
  FOR SELECT USING (
    NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND id = behavioral_consistency_index.candidate_id
    )
  );
