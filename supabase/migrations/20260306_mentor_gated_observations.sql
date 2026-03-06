-- ══════════════════════════════════════════════════════════════════
-- T3A MENTOR-GATED OBSERVATIONS MIGRATION
-- March 2026 — Observation Pathway Integrity
-- ══════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────
-- Mentor-Assigned Dimensions
-- Mentors assign specific behavioral dimensions to candidates
-- before any observation activity (L1–L4) can begin.
-- ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.mentor_assigned_dimensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.mentor_assignments(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dimension_id TEXT NOT NULL,                -- T3A dimension ID (e.g., 'integrity_ethics')
  assigned_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,                                -- Mentor notes on why this dimension was assigned
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (assignment_id, dimension_id)
);

CREATE INDEX IF NOT EXISTS idx_assigned_dims_candidate ON public.mentor_assigned_dimensions(candidate_id);
CREATE INDEX IF NOT EXISTS idx_assigned_dims_assignment ON public.mentor_assigned_dimensions(assignment_id);

-- ──────────────────────────────────────────────────────────────────
-- Update observation_sessions to require mentor assignment
-- ──────────────────────────────────────────────────────────────────

ALTER TABLE public.observation_sessions
  ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES public.mentor_assignments(id),
  ADD COLUMN IF NOT EXISTS mentor_id UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS feedback_level SMALLINT CHECK (feedback_level IN (1, 2, 3, 4)),
  ADD COLUMN IF NOT EXISTS mentor_approved BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS mentor_approved_at TIMESTAMPTZ;

-- ──────────────────────────────────────────────────────────────────
-- L1–L4 Feedback Model
-- L1: AI auto-delivers after scenario completion
-- L2: Mentor enters directly (no AI)
-- L3: AI drafts, mentor approves before candidate sees
-- L4: Mentor enters directly (no AI)
-- ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.observation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.observation_sessions(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES public.mentor_assignments(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mentor_id UUID REFERENCES public.profiles(id),
  dimension_id TEXT NOT NULL,
  feedback_level SMALLINT NOT NULL CHECK (feedback_level IN (1, 2, 3, 4)),

  -- BARS scoring (4-point scale: 1=Developing, 2=Competent, 3=Proficient, 4=Exemplary)
  bars_score SMALLINT CHECK (bars_score BETWEEN 1 AND 4),

  -- Feedback content
  ai_draft_feedback TEXT,                    -- AI-generated draft (L1 auto, L3 draft)
  mentor_feedback TEXT,                      -- Mentor-written or mentor-edited feedback
  final_feedback TEXT,                       -- What candidate sees

  -- Approval flow
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ai_delivered', 'draft', 'mentor_review', 'approved', 'rejected')),
  mentor_approved BOOLEAN DEFAULT FALSE,
  mentor_approved_at TIMESTAMPTZ,
  mentor_rejected_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_candidate ON public.observation_feedback(candidate_id);
CREATE INDEX IF NOT EXISTS idx_feedback_session ON public.observation_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_feedback_assignment ON public.observation_feedback(assignment_id);

-- ──────────────────────────────────────────────────────────────────
-- Final Synthesis (AI synthesizes L1–L4, mentor approves)
-- ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.observation_synthesis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.mentor_assignments(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES public.profiles(id),
  dimension_id TEXT NOT NULL,

  ai_synthesis TEXT,                         -- AI-generated synthesis of all 4 levels
  mentor_edited_synthesis TEXT,              -- Mentor's edited version
  final_synthesis TEXT,                      -- What candidate sees

  overall_bars_score SMALLINT CHECK (overall_bars_score BETWEEN 1 AND 4),

  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'mentor_review', 'approved')),
  mentor_approved BOOLEAN DEFAULT FALSE,
  mentor_approved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (assignment_id, dimension_id)
);

-- ──────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ──────────────────────────────────────────────────────────────────

-- mentor_assigned_dimensions
ALTER TABLE public.mentor_assigned_dimensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assigned_dims_mentor_all" ON public.mentor_assigned_dimensions
  FOR ALL USING (
    mentor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "assigned_dims_candidate_read" ON public.mentor_assigned_dimensions
  FOR SELECT USING (candidate_id = auth.uid());

-- observation_feedback: candidates can only see approved feedback
ALTER TABLE public.observation_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feedback_mentor_all" ON public.observation_feedback
  FOR ALL USING (
    mentor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "feedback_candidate_read_approved" ON public.observation_feedback
  FOR SELECT USING (
    candidate_id = auth.uid()
    AND (
      status = 'ai_delivered'   -- L1: auto-delivered
      OR status = 'approved'     -- L2/L3/L4: mentor-approved
    )
  );

-- L1 feedback: system can insert (via candidate's own session)
CREATE POLICY "feedback_l1_auto_insert" ON public.observation_feedback
  FOR INSERT WITH CHECK (
    candidate_id = auth.uid()
    AND feedback_level = 1
  );

-- observation_synthesis: candidates only see approved
ALTER TABLE public.observation_synthesis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "synthesis_mentor_all" ON public.observation_synthesis
  FOR ALL USING (
    mentor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "synthesis_candidate_read_approved" ON public.observation_synthesis
  FOR SELECT USING (
    candidate_id = auth.uid()
    AND status = 'approved'
  );
