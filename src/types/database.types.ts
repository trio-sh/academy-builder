export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'candidate' | 'mentor' | 'employer' | 'school_admin' | 'admin';
export type EntryPath = 'resume_upload' | 'liveworks' | 'civic_access';
export type EndorsementDecision = 'proceed' | 'redirect' | 'pause' | 'escalate';
export type ReadinessTier = 'platinum' | 'gold' | 'silver';
export type GrowthLogEventType = 'assessment' | 'training' | 'project' | 'observation' | 'tier_change' | 'endorsement' | 'signup' | 'resume_upload';
export type ProjectStatus = 'draft' | 'open' | 'in_progress' | 'completed' | 'cancelled';
export type MilestoneStatus = 'pending' | 'in_progress' | 'submitted' | 'approved' | 'revision_requested';
export type ConnectionStatus = 'pending' | 'accepted' | 'declined' | 'expired';
export type EscrowStatus = 'pending' | 'funded' | 'released' | 'refunded' | 'disputed';
export type TalentVisaTier = 'gold' | 'silver' | 'bronze';
export type BarsScore = 1 | 2 | 3 | 4; // 1=Developing, 2=Competent, 3=Proficient, 4=Exemplary
export type FeedbackLevel = 1 | 2 | 3 | 4; // L1=AI auto, L2=Mentor, L3=AI draft+mentor, L4=Mentor

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          email: string;
          first_name: string;
          last_name: string;
          role: UserRole;
          avatar_url: string | null;
          headline: string | null;
          bio: string | null;
          location: string | null;
          is_active: boolean;
          onboarding_completed: boolean;
          last_seen: string | null;
        };
        Insert: {
          id: string;
          created_at?: string;
          updated_at?: string;
          email: string;
          first_name: string;
          last_name: string;
          role: UserRole;
          avatar_url?: string | null;
          headline?: string | null;
          bio?: string | null;
          location?: string | null;
          is_active?: boolean;
          onboarding_completed?: boolean;
          last_seen?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          email?: string;
          first_name?: string;
          last_name?: string;
          role?: UserRole;
          avatar_url?: string | null;
          headline?: string | null;
          bio?: string | null;
          location?: string | null;
          is_active?: boolean;
          onboarding_completed?: boolean;
          last_seen?: string | null;
        };
      };
      candidate_profiles: {
        Row: {
          id: string;
          profile_id: string;
          created_at: string;
          updated_at: string;
          resume_url: string | null;
          skills: string[];
          experience_years: number | null;
          education: Json | null;
          work_history: Json | null;
          entry_path: 'resume_upload' | 'liveworks' | 'civic_access';
          current_tier: ReadinessTier | null;
          mentor_loops: number;
          has_skill_passport: boolean;
          has_talentvisa: boolean;
          is_listed_on_t3x: boolean;
          has_basic_profile?: boolean | null;
          observation_areas?: string[] | null;
        };
        Insert: {
          id?: string;
          profile_id: string;
          created_at?: string;
          updated_at?: string;
          resume_url?: string | null;
          skills?: string[];
          experience_years?: number | null;
          education?: Json | null;
          work_history?: Json | null;
          entry_path: 'resume_upload' | 'liveworks' | 'civic_access';
          current_tier?: ReadinessTier | null;
          mentor_loops?: number;
          has_skill_passport?: boolean;
          has_talentvisa?: boolean;
          is_listed_on_t3x?: boolean;
          has_basic_profile?: boolean | null;
          observation_areas?: string[] | null;
        };
        Update: {
          id?: string;
          profile_id?: string;
          created_at?: string;
          updated_at?: string;
          resume_url?: string | null;
          skills?: string[];
          experience_years?: number | null;
          education?: Json | null;
          work_history?: Json | null;
          entry_path?: 'resume_upload' | 'liveworks' | 'civic_access';
          current_tier?: ReadinessTier | null;
          mentor_loops?: number;
          has_skill_passport?: boolean;
          has_talentvisa?: boolean;
          is_listed_on_t3x?: boolean;
          has_basic_profile?: boolean | null;
          observation_areas?: string[] | null;
        };
      };
      mentor_profiles: {
        Row: {
          id: string;
          profile_id: string;
          created_at: string;
          updated_at: string;
          industry: string;
          specializations: string[];
          years_experience: number;
          company: string | null;
          job_title: string | null;
          max_mentees: number;
          current_mentees: number;
          is_accepting: boolean;
          total_observations: number;
          total_endorsements: number;
          avg_rating: number | null;
        };
        Insert: {
          id?: string;
          profile_id: string;
          created_at?: string;
          updated_at?: string;
          industry: string;
          specializations?: string[];
          years_experience: number;
          company?: string | null;
          job_title?: string | null;
          max_mentees?: number;
          current_mentees?: number;
          is_accepting?: boolean;
          total_observations?: number;
          total_endorsements?: number;
          avg_rating?: number | null;
        };
        Update: {
          id?: string;
          profile_id?: string;
          created_at?: string;
          updated_at?: string;
          industry?: string;
          specializations?: string[];
          years_experience?: number;
          company?: string | null;
          job_title?: string | null;
          max_mentees?: number;
          current_mentees?: number;
          is_accepting?: boolean;
          total_observations?: number;
          total_endorsements?: number;
          avg_rating?: number | null;
        };
      };
      employer_profiles: {
        Row: {
          id: string;
          profile_id: string;
          created_at: string;
          updated_at: string;
          company_name: string;
          company_size: string | null;
          industry: string;
          company_website: string | null;
          company_logo_url: string | null;
          is_verified: boolean;
          subscription_tier: 'standard' | 'premium';
          total_hires: number;
          total_connections: number;
        };
        Insert: {
          id?: string;
          profile_id: string;
          created_at?: string;
          updated_at?: string;
          company_name: string;
          company_size?: string | null;
          industry: string;
          company_website?: string | null;
          company_logo_url?: string | null;
          is_verified?: boolean;
          subscription_tier?: 'standard' | 'premium';
          total_hires?: number;
          total_connections?: number;
        };
        Update: {
          id?: string;
          profile_id?: string;
          created_at?: string;
          updated_at?: string;
          company_name?: string;
          company_size?: string | null;
          industry?: string;
          company_website?: string | null;
          company_logo_url?: string | null;
          is_verified?: boolean;
          subscription_tier?: 'standard' | 'premium';
          total_hires?: number;
          total_connections?: number;
        };
      };
      skill_passports: {
        Row: {
          id: string;
          candidate_id: string;
          created_at: string;
          updated_at: string;
          verification_code: string;
          readiness_tier: ReadinessTier;
          behavioral_scores: Json;
          is_active: boolean;
          issued_at: string;
          expires_at: string | null;
          pdf_url: string | null;
          qr_code_url: string | null;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          created_at?: string;
          updated_at?: string;
          verification_code?: string;
          readiness_tier: ReadinessTier;
          behavioral_scores: Json;
          is_active?: boolean;
          issued_at?: string;
          expires_at?: string | null;
          pdf_url?: string | null;
          qr_code_url?: string | null;
        };
        Update: {
          id?: string;
          candidate_id?: string;
          created_at?: string;
          updated_at?: string;
          verification_code?: string;
          readiness_tier?: ReadinessTier;
          behavioral_scores?: Json;
          is_active?: boolean;
          issued_at?: string;
          expires_at?: string | null;
          pdf_url?: string | null;
          qr_code_url?: string | null;
        };
      };
      growth_log_entries: {
        Row: {
          id: string;
          candidate_id: string;
          created_at: string;
          event_type: GrowthLogEventType;
          title: string;
          description: string | null;
          metadata: Json | null;
          source_component: string | null;
          source_id: string | null;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          created_at?: string;
          event_type: GrowthLogEventType;
          title: string;
          description?: string | null;
          metadata?: Json | null;
          source_component?: string | null;
          source_id?: string | null;
        };
        Update: {
          id?: string;
          candidate_id?: string;
          created_at?: string;
          event_type?: GrowthLogEventType;
          title?: string;
          description?: string | null;
          metadata?: Json | null;
          source_component?: string | null;
          source_id?: string | null;
        };
      };
      mentor_assignments: {
        Row: {
          id: string;
          mentor_id: string;
          candidate_id: string;
          created_at: string;
          updated_at: string;
          status: 'pending' | 'active' | 'completed' | 'transferred';
          loop_number: number;
          assigned_by: string | null;
        };
        Insert: {
          id?: string;
          mentor_id: string;
          candidate_id: string;
          created_at?: string;
          updated_at?: string;
          status?: 'pending' | 'active' | 'completed' | 'transferred';
          loop_number?: number;
          assigned_by?: string | null;
        };
        Update: {
          id?: string;
          mentor_id?: string;
          candidate_id?: string;
          created_at?: string;
          updated_at?: string;
          status?: 'pending' | 'active' | 'completed' | 'transferred';
          loop_number?: number;
          assigned_by?: string | null;
        };
      };
      mentor_observations: {
        Row: {
          id: string;
          assignment_id: string;
          mentor_id: string;
          candidate_id: string;
          created_at: string;
          updated_at: string;
          session_date: string;
          behavioral_scores: Json;
          strengths: string[];
          areas_for_improvement: string[];
          notes: string | null;
          is_locked: boolean;
        };
        Insert: {
          id?: string;
          assignment_id: string;
          mentor_id: string;
          candidate_id: string;
          created_at?: string;
          updated_at?: string;
          session_date: string;
          behavioral_scores: Json;
          strengths?: string[];
          areas_for_improvement?: string[];
          notes?: string | null;
          is_locked?: boolean;
        };
        Update: {
          id?: string;
          assignment_id?: string;
          mentor_id?: string;
          candidate_id?: string;
          created_at?: string;
          updated_at?: string;
          session_date?: string;
          behavioral_scores?: Json;
          strengths?: string[];
          areas_for_improvement?: string[];
          notes?: string | null;
          is_locked?: boolean;
        };
      };
      endorsements: {
        Row: {
          id: string;
          assignment_id: string;
          mentor_id: string;
          candidate_id: string;
          created_at: string;
          decision: EndorsementDecision;
          justification: string;
          redirect_to: 'bridgefast' | 'liveworks' | null;
          redirect_module_id: string | null;
        };
        Insert: {
          id?: string;
          assignment_id: string;
          mentor_id: string;
          candidate_id: string;
          created_at?: string;
          decision: EndorsementDecision;
          justification: string;
          redirect_to?: 'bridgefast' | 'liveworks' | null;
          redirect_module_id?: string | null;
        };
        Update: {
          id?: string;
          assignment_id?: string;
          mentor_id?: string;
          candidate_id?: string;
          created_at?: string;
          decision?: EndorsementDecision;
          justification?: string;
          redirect_to?: 'bridgefast' | 'liveworks' | null;
          redirect_module_id?: string | null;
        };
      };
      bridgefast_modules: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          title: string;
          description: string;
          behavioral_dimension: string;
          duration_hours: number;
          content_url: string | null;
          is_active: boolean;
          order_index: number;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          title: string;
          description: string;
          behavioral_dimension: string;
          duration_hours: number;
          content_url?: string | null;
          is_active?: boolean;
          order_index?: number;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          title?: string;
          description?: string;
          behavioral_dimension?: string;
          duration_hours?: number;
          content_url?: string | null;
          is_active?: boolean;
          order_index?: number;
        };
      };
      bridgefast_progress: {
        Row: {
          id: string;
          candidate_id: string;
          module_id: string;
          created_at: string;
          updated_at: string;
          started_at: string | null;
          completed_at: string | null;
          progress_percent: number;
          final_score: number | null;
          status: 'not_started' | 'in_progress' | 'completed' | 'failed';
          deadline: string | null;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          module_id: string;
          created_at?: string;
          updated_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
          progress_percent?: number;
          final_score?: number | null;
          status?: 'not_started' | 'in_progress' | 'completed' | 'failed';
          deadline?: string | null;
        };
        Update: {
          id?: string;
          candidate_id?: string;
          module_id?: string;
          created_at?: string;
          updated_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
          progress_percent?: number;
          final_score?: number | null;
          status?: 'not_started' | 'in_progress' | 'completed' | 'failed';
          deadline?: string | null;
        };
      };
      liveworks_projects: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          employer_id: string;
          mentor_id: string | null;
          title: string;
          description: string;
          category: string;
          skill_level: 'beginner' | 'intermediate' | 'advanced';
          budget_min: number | null;
          budget_max: number | null;
          duration_days: number;
          status: ProjectStatus;
          max_candidates: number;
          selected_candidate_id: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          employer_id: string;
          mentor_id?: string | null;
          title: string;
          description: string;
          category: string;
          skill_level?: 'beginner' | 'intermediate' | 'advanced';
          budget_min?: number | null;
          budget_max?: number | null;
          duration_days: number;
          status?: ProjectStatus;
          max_candidates?: number;
          selected_candidate_id?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          employer_id?: string;
          mentor_id?: string | null;
          title?: string;
          description?: string;
          category?: string;
          skill_level?: 'beginner' | 'intermediate' | 'advanced';
          budget_min?: number | null;
          budget_max?: number | null;
          duration_days?: number;
          status?: ProjectStatus;
          max_candidates?: number;
          selected_candidate_id?: string | null;
        };
      };
      liveworks_milestones: {
        Row: {
          id: string;
          project_id: string;
          created_at: string;
          updated_at: string;
          title: string;
          description: string | null;
          order_index: number;
          status: MilestoneStatus;
          due_date: string | null;
          payment_amount: number | null;
          submitted_at: string | null;
          approved_at: string | null;
          escrow_status: EscrowStatus | null;
          escrow_funded_at: string | null;
          escrow_released_at: string | null;
          payment_method: string | null;
          payment_credentials: string | null;
          payment_proof_url: string | null;
          payment_verified_at: string | null;
          payment_notes: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          created_at?: string;
          updated_at?: string;
          title: string;
          description?: string | null;
          order_index: number;
          status?: MilestoneStatus;
          due_date?: string | null;
          payment_amount?: number | null;
          submitted_at?: string | null;
          approved_at?: string | null;
          escrow_status?: EscrowStatus | null;
          escrow_funded_at?: string | null;
          escrow_released_at?: string | null;
          payment_method?: string | null;
          payment_credentials?: string | null;
          payment_proof_url?: string | null;
          payment_verified_at?: string | null;
          payment_notes?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          created_at?: string;
          updated_at?: string;
          title?: string;
          description?: string | null;
          order_index?: number;
          status?: MilestoneStatus;
          due_date?: string | null;
          payment_amount?: number | null;
          submitted_at?: string | null;
          approved_at?: string | null;
          escrow_status?: EscrowStatus | null;
          escrow_funded_at?: string | null;
          escrow_released_at?: string | null;
          payment_method?: string | null;
          payment_credentials?: string | null;
          payment_proof_url?: string | null;
          payment_verified_at?: string | null;
          payment_notes?: string | null;
        };
      };
      // Manual payment tracking (no in-app payments)
      escrow_transactions: {
        Row: {
          id: string;
          created_at: string;
          project_id: string;
          milestone_id: string | null;
          employer_id: string;
          candidate_id: string | null;
          amount: number;
          status: EscrowStatus;
          funded_at: string | null;
          released_at: string | null;
          refunded_at: string | null;
          payment_method: string | null;
          payment_credentials: string | null;
          payment_proof_url: string | null;
          verified_by: string | null;
          verified_at: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          project_id: string;
          milestone_id?: string | null;
          employer_id: string;
          candidate_id?: string | null;
          amount: number;
          status?: EscrowStatus;
          funded_at?: string | null;
          released_at?: string | null;
          refunded_at?: string | null;
          payment_method?: string | null;
          payment_credentials?: string | null;
          payment_proof_url?: string | null;
          verified_by?: string | null;
          verified_at?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          project_id?: string;
          milestone_id?: string | null;
          employer_id?: string;
          candidate_id?: string | null;
          amount?: number;
          status?: EscrowStatus;
          funded_at?: string | null;
          released_at?: string | null;
          refunded_at?: string | null;
          payment_method?: string | null;
          payment_credentials?: string | null;
          payment_proof_url?: string | null;
          verified_by?: string | null;
          verified_at?: string | null;
          notes?: string | null;
        };
      };
      liveworks_applications: {
        Row: {
          id: string;
          project_id: string;
          candidate_id: string;
          created_at: string;
          cover_letter: string | null;
          status: 'pending' | 'accepted' | 'rejected';
        };
        Insert: {
          id?: string;
          project_id: string;
          candidate_id: string;
          created_at?: string;
          cover_letter?: string | null;
          status?: 'pending' | 'accepted' | 'rejected';
        };
        Update: {
          id?: string;
          project_id?: string;
          candidate_id?: string;
          created_at?: string;
          cover_letter?: string | null;
          status?: 'pending' | 'accepted' | 'rejected';
        };
      };
      t3x_connections: {
        Row: {
          id: string;
          employer_id: string;
          candidate_id: string;
          created_at: string;
          updated_at: string;
          status: ConnectionStatus;
          message: string | null;
          responded_at: string | null;
          expires_at: string;
        };
        Insert: {
          id?: string;
          employer_id: string;
          candidate_id: string;
          created_at?: string;
          updated_at?: string;
          status?: ConnectionStatus;
          message?: string | null;
          responded_at?: string | null;
          expires_at?: string;
        };
        Update: {
          id?: string;
          employer_id?: string;
          candidate_id?: string;
          created_at?: string;
          updated_at?: string;
          status?: ConnectionStatus;
          message?: string | null;
          responded_at?: string | null;
          expires_at?: string;
        };
      };
      employer_feedback: {
        Row: {
          id: string;
          employer_id: string;
          candidate_id: string;
          hire_date: string;
          created_at: string;
          feedback_type: '30_day' | '60_day' | '90_day';
          performance_rating: number;
          readiness_accuracy: number;
          behavioral_alignment: Json | null;
          comments: string | null;
          would_hire_again: boolean;
        };
        Insert: {
          id?: string;
          employer_id: string;
          candidate_id: string;
          hire_date: string;
          created_at?: string;
          feedback_type: '30_day' | '60_day' | '90_day';
          performance_rating: number;
          readiness_accuracy: number;
          behavioral_alignment?: Json | null;
          comments?: string | null;
          would_hire_again: boolean;
        };
        Update: {
          id?: string;
          employer_id?: string;
          candidate_id?: string;
          hire_date?: string;
          created_at?: string;
          feedback_type?: '30_day' | '60_day' | '90_day';
          performance_rating?: number;
          readiness_accuracy?: number;
          behavioral_alignment?: Json | null;
          comments?: string | null;
          would_hire_again?: boolean;
        };
      };
      talentvisa_nominations: {
        Row: {
          id: string;
          candidate_id: string;
          nominating_mentor_id: string;
          created_at: string;
          updated_at: string;
          status: 'pending' | 'approved' | 'rejected';
          justification: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
          expires_at: string | null;
          tier: TalentVisaTier | null;
          behavioral_score: number | null;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          nominating_mentor_id: string;
          created_at?: string;
          updated_at?: string;
          status?: 'pending' | 'approved' | 'rejected';
          justification: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          expires_at?: string | null;
          tier?: TalentVisaTier | null;
          behavioral_score?: number | null;
        };
        Update: {
          id?: string;
          candidate_id?: string;
          nominating_mentor_id?: string;
          created_at?: string;
          updated_at?: string;
          status?: 'pending' | 'approved' | 'rejected';
          justification?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          expires_at?: string | null;
          tier?: TalentVisaTier | null;
          behavioral_score?: number | null;
        };
      };
      // TalentVisa quota settings
      talentvisa_quotas: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          period: 'monthly' | 'quarterly' | 'yearly';
          tier: TalentVisaTier;
          max_approvals: number;
          current_approvals: number;
          period_start: string;
          period_end: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          period: 'monthly' | 'quarterly' | 'yearly';
          tier: TalentVisaTier;
          max_approvals: number;
          current_approvals?: number;
          period_start: string;
          period_end: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          period?: 'monthly' | 'quarterly' | 'yearly';
          tier?: TalentVisaTier;
          max_approvals?: number;
          current_approvals?: number;
          period_start?: string;
          period_end?: string;
        };
      };
      // Email queue for notifications
      email_queue: {
        Row: {
          id: string;
          created_at: string;
          to_email: string;
          to_name: string;
          template: string;
          template_data: Json;
          status: 'pending' | 'sent' | 'failed';
          sent_at: string | null;
          error_message: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          to_email: string;
          to_name: string;
          template: string;
          template_data: Json;
          status?: 'pending' | 'sent' | 'failed';
          sent_at?: string | null;
          error_message?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          to_email?: string;
          to_name?: string;
          template?: string;
          template_data?: Json;
          status?: 'pending' | 'sent' | 'failed';
          sent_at?: string | null;
          error_message?: string | null;
        };
      };
      candidate_self_assessments: {
        Row: {
          id: string;
          candidate_id: string;
          created_at: string;
          updated_at: string;
          behavioral_scores: Json;
          notes: string | null;
          goals: string | null;
          strengths: string[];
          areas_for_improvement: string[];
          completed: boolean;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          created_at?: string;
          updated_at?: string;
          behavioral_scores: Json;
          notes?: string | null;
          goals?: string | null;
          strengths?: string[];
          areas_for_improvement?: string[];
          completed?: boolean;
        };
        Update: {
          id?: string;
          candidate_id?: string;
          created_at?: string;
          updated_at?: string;
          behavioral_scores?: Json;
          notes?: string | null;
          goals?: string | null;
          strengths?: string[];
          areas_for_improvement?: string[];
          completed?: boolean;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
          type: string;
          title: string;
          message: string;
          is_read: boolean;
          action_url: string | null;
          metadata: Json | null;
          priority: 'low' | 'normal' | 'high';
          action_type: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          created_at?: string;
          type: string;
          title: string;
          message: string;
          is_read?: boolean;
          action_url?: string | null;
          metadata?: Json | null;
          priority?: 'low' | 'normal' | 'high';
          action_type?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          created_at?: string;
          type?: string;
          title?: string;
          message?: string;
          is_read?: boolean;
          action_url?: string | null;
          metadata?: Json | null;
          priority?: 'low' | 'normal' | 'high';
          action_type?: string | null;
        };
      };
      school_profiles: {
        Row: {
          id: string;
          profile_id: string;
          created_at: string;
          updated_at: string;
          school_name: string;
          school_type: 'high_school' | 'community_college' | 'university' | 'vocational';
          district: string | null;
          address: string | null;
          total_students: number;
          active_cohorts: number;
          is_verified: boolean;
        };
        Insert: {
          id?: string;
          profile_id: string;
          created_at?: string;
          updated_at?: string;
          school_name: string;
          school_type: 'high_school' | 'community_college' | 'university' | 'vocational';
          district?: string | null;
          address?: string | null;
          total_students?: number;
          active_cohorts?: number;
          is_verified?: boolean;
        };
        Update: {
          id?: string;
          profile_id?: string;
          created_at?: string;
          updated_at?: string;
          school_name?: string;
          school_type?: 'high_school' | 'community_college' | 'university' | 'vocational';
          district?: string | null;
          address?: string | null;
          total_students?: number;
          active_cohorts?: number;
          is_verified?: boolean;
        };
      };
      school_cohorts: {
        Row: {
          id: string;
          school_id: string;
          created_at: string;
          updated_at: string;
          name: string;
          program: string;
          start_date: string;
          end_date: string | null;
          status: 'active' | 'completed' | 'upcoming';
          total_students: number;
          teacher_id: string | null;
        };
        Insert: {
          id?: string;
          school_id: string;
          created_at?: string;
          updated_at?: string;
          name: string;
          program: string;
          start_date: string;
          end_date?: string | null;
          status?: 'active' | 'completed' | 'upcoming';
          total_students?: number;
          teacher_id?: string | null;
        };
        Update: {
          id?: string;
          school_id?: string;
          created_at?: string;
          updated_at?: string;
          name?: string;
          program?: string;
          start_date?: string;
          end_date?: string | null;
          status?: 'active' | 'completed' | 'upcoming';
          total_students?: number;
          teacher_id?: string | null;
        };
      };
      students: {
        Row: {
          id: string;
          profile_id: string;
          school_id: string;
          cohort_id: string | null;
          created_at: string;
          updated_at: string;
          student_id_number: string | null;
          grade_level: string | null;
          graduation_year: number | null;
          status: 'active' | 'graduated' | 'transferred' | 'inactive';
          total_observations: number;
          avg_behavioral_score: number | null;
        };
        Insert: {
          id?: string;
          profile_id: string;
          school_id: string;
          cohort_id?: string | null;
          created_at?: string;
          updated_at?: string;
          student_id_number?: string | null;
          grade_level?: string | null;
          graduation_year?: number | null;
          status?: 'active' | 'graduated' | 'transferred' | 'inactive';
          total_observations?: number;
          avg_behavioral_score?: number | null;
        };
        Update: {
          id?: string;
          profile_id?: string;
          school_id?: string;
          cohort_id?: string | null;
          created_at?: string;
          updated_at?: string;
          student_id_number?: string | null;
          grade_level?: string | null;
          graduation_year?: number | null;
          status?: 'active' | 'graduated' | 'transferred' | 'inactive';
          total_observations?: number;
          avg_behavioral_score?: number | null;
        };
      };
      teacher_observations: {
        Row: {
          id: string;
          teacher_id: string;
          student_id: string;
          cohort_id: string | null;
          created_at: string;
          updated_at: string;
          observation_date: string;
          context: string;
          behavioral_scores: Json;
          strengths: string[];
          areas_for_growth: string[];
          notes: string | null;
        };
        Insert: {
          id?: string;
          teacher_id: string;
          student_id: string;
          cohort_id?: string | null;
          created_at?: string;
          updated_at?: string;
          observation_date: string;
          context: string;
          behavioral_scores: Json;
          strengths?: string[];
          areas_for_growth?: string[];
          notes?: string | null;
        };
        Update: {
          id?: string;
          teacher_id?: string;
          student_id?: string;
          cohort_id?: string | null;
          created_at?: string;
          updated_at?: string;
          observation_date?: string;
          context?: string;
          behavioral_scores?: Json;
          strengths?: string[];
          areas_for_growth?: string[];
          notes?: string | null;
        };
      };
      growth_logs: {
        Row: {
          id: string;
          candidate_id: string;
          created_at: string;
          log_type: string;
          title: string;
          description: string | null;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          created_at?: string;
          log_type: string;
          title: string;
          description?: string | null;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          candidate_id?: string;
          created_at?: string;
          log_type?: string;
          title?: string;
          description?: string | null;
          metadata?: Json | null;
        };
      };
      // Messaging System
      conversations: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          type: 'direct' | 'group';
          title: string | null;
          last_message_at: string | null;
          last_message_preview: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          type?: 'direct' | 'group';
          title?: string | null;
          last_message_at?: string | null;
          last_message_preview?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          type?: 'direct' | 'group';
          title?: string | null;
          last_message_at?: string | null;
          last_message_preview?: string | null;
        };
      };
      conversation_participants: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          joined_at: string;
          last_read_at: string | null;
          is_muted: boolean;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          user_id: string;
          joined_at?: string;
          last_read_at?: string | null;
          is_muted?: boolean;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          user_id?: string;
          joined_at?: string;
          last_read_at?: string | null;
          is_muted?: boolean;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          created_at: string;
          updated_at: string;
          content: string;
          message_type: 'text' | 'file' | 'image' | 'system';
          file_url: string | null;
          is_edited: boolean;
          is_deleted: boolean;
          reply_to_id: string | null;
          metadata: Json;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          created_at?: string;
          updated_at?: string;
          content: string;
          message_type?: 'text' | 'file' | 'image' | 'system';
          file_url?: string | null;
          is_edited?: boolean;
          is_deleted?: boolean;
          reply_to_id?: string | null;
          metadata?: Json;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          created_at?: string;
          updated_at?: string;
          content?: string;
          message_type?: 'text' | 'file' | 'image' | 'system';
          file_url?: string | null;
          is_edited?: boolean;
          is_deleted?: boolean;
          reply_to_id?: string | null;
          metadata?: Json;
        };
      };
      // Mentor Scheduling System
      mentor_availability: {
        Row: {
          id: string;
          mentor_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          mentor_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          mentor_id?: string;
          day_of_week?: number;
          start_time?: string;
          end_time?: string;
          is_active?: boolean;
          created_at?: string;
        };
      };
      mentor_sessions: {
        Row: {
          id: string;
          mentor_id: string;
          candidate_id: string;
          assignment_id: string | null;
          created_at: string;
          updated_at: string;
          scheduled_at: string;
          duration_minutes: number;
          status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
          session_type: 'observation' | 'feedback' | 'check_in' | 'other';
          notes: string | null;
          meeting_url: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          cancellation_reason: string | null;
        };
        Insert: {
          id?: string;
          mentor_id: string;
          candidate_id: string;
          assignment_id?: string | null;
          created_at?: string;
          updated_at?: string;
          scheduled_at: string;
          duration_minutes?: number;
          status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
          session_type?: 'observation' | 'feedback' | 'check_in' | 'other';
          notes?: string | null;
          meeting_url?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          cancellation_reason?: string | null;
        };
        Update: {
          id?: string;
          mentor_id?: string;
          candidate_id?: string;
          assignment_id?: string | null;
          created_at?: string;
          updated_at?: string;
          scheduled_at?: string;
          duration_minutes?: number;
          status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
          session_type?: 'observation' | 'feedback' | 'check_in' | 'other';
          notes?: string | null;
          meeting_url?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          cancellation_reason?: string | null;
        };
      };
      session_reminders: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          remind_at: string;
          reminder_type: 'email' | 'in_app' | 'both';
          sent: boolean;
          sent_at: string | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          remind_at: string;
          reminder_type?: 'email' | 'in_app' | 'both';
          sent?: boolean;
          sent_at?: string | null;
        };
        Update: {
          id?: string;
          session_id?: string;
          user_id?: string;
          remind_at?: string;
          reminder_type?: 'email' | 'in_app' | 'both';
          sent?: boolean;
          sent_at?: string | null;
        };
      };
      // Training Content (Videos, Quizzes)
      bridgefast_content: {
        Row: {
          id: string;
          module_id: string;
          created_at: string;
          content_type: 'video' | 'document' | 'link' | 'quiz';
          title: string;
          description: string | null;
          content_url: string | null;
          duration_minutes: number | null;
          order_index: number;
          is_required: boolean;
        };
        Insert: {
          id?: string;
          module_id: string;
          created_at?: string;
          content_type: 'video' | 'document' | 'link' | 'quiz';
          title: string;
          description?: string | null;
          content_url?: string | null;
          duration_minutes?: number | null;
          order_index?: number;
          is_required?: boolean;
        };
        Update: {
          id?: string;
          module_id?: string;
          created_at?: string;
          content_type?: 'video' | 'document' | 'link' | 'quiz';
          title?: string;
          description?: string | null;
          content_url?: string | null;
          duration_minutes?: number | null;
          order_index?: number;
          is_required?: boolean;
        };
      };
      bridgefast_quiz_questions: {
        Row: {
          id: string;
          module_id: string;
          created_at: string;
          question: string;
          question_type: 'multiple_choice' | 'true_false' | 'short_answer';
          options: Json;
          correct_answer: string;
          explanation: string | null;
          points: number;
          order_index: number;
        };
        Insert: {
          id?: string;
          module_id: string;
          created_at?: string;
          question: string;
          question_type?: 'multiple_choice' | 'true_false' | 'short_answer';
          options?: Json;
          correct_answer: string;
          explanation?: string | null;
          points?: number;
          order_index?: number;
        };
        Update: {
          id?: string;
          module_id?: string;
          created_at?: string;
          question?: string;
          question_type?: 'multiple_choice' | 'true_false' | 'short_answer';
          options?: Json;
          correct_answer?: string;
          explanation?: string | null;
          points?: number;
          order_index?: number;
        };
      };
      bridgefast_quiz_attempts: {
        Row: {
          id: string;
          candidate_id: string;
          module_id: string;
          created_at: string;
          completed_at: string | null;
          score: number | null;
          max_score: number | null;
          answers: Json;
          passed: boolean | null;
          attempt_number: number;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          module_id: string;
          created_at?: string;
          completed_at?: string | null;
          score?: number | null;
          max_score?: number | null;
          answers?: Json;
          passed?: boolean | null;
          attempt_number?: number;
        };
        Update: {
          id?: string;
          candidate_id?: string;
          module_id?: string;
          created_at?: string;
          completed_at?: string | null;
          score?: number | null;
          max_score?: number | null;
          answers?: Json;
          passed?: boolean | null;
          attempt_number?: number;
        };
      };
      // Mentor-assigned dimensions for observation gating
      mentor_assigned_dimensions: {
        Row: {
          id: string;
          assignment_id: string;
          mentor_id: string;
          candidate_id: string;
          dimension_id: string;
          assigned_at: string;
          is_active: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          assignment_id: string;
          mentor_id: string;
          candidate_id: string;
          dimension_id: string;
          assigned_at?: string;
          is_active?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          assignment_id?: string;
          mentor_id?: string;
          candidate_id?: string;
          dimension_id?: string;
          assigned_at?: string;
          is_active?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      // L1-L4 Observation Feedback
      observation_feedback: {
        Row: {
          id: string;
          session_id: string | null;
          assignment_id: string;
          candidate_id: string;
          mentor_id: string | null;
          dimension_id: string;
          feedback_level: number;
          bars_score: number | null;
          ai_draft_feedback: string | null;
          mentor_feedback: string | null;
          final_feedback: string | null;
          status: 'pending' | 'ai_delivered' | 'draft' | 'mentor_review' | 'approved' | 'rejected';
          mentor_approved: boolean;
          mentor_approved_at: string | null;
          mentor_rejected_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id?: string | null;
          assignment_id: string;
          candidate_id: string;
          mentor_id?: string | null;
          dimension_id: string;
          feedback_level: number;
          bars_score?: number | null;
          ai_draft_feedback?: string | null;
          mentor_feedback?: string | null;
          final_feedback?: string | null;
          status?: 'pending' | 'ai_delivered' | 'draft' | 'mentor_review' | 'approved' | 'rejected';
          mentor_approved?: boolean;
          mentor_approved_at?: string | null;
          mentor_rejected_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string | null;
          assignment_id?: string;
          candidate_id?: string;
          mentor_id?: string | null;
          dimension_id?: string;
          feedback_level?: number;
          bars_score?: number | null;
          ai_draft_feedback?: string | null;
          mentor_feedback?: string | null;
          final_feedback?: string | null;
          status?: 'pending' | 'ai_delivered' | 'draft' | 'mentor_review' | 'approved' | 'rejected';
          mentor_approved?: boolean;
          mentor_approved_at?: string | null;
          mentor_rejected_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      // Final synthesis across L1-L4
      observation_synthesis: {
        Row: {
          id: string;
          assignment_id: string;
          candidate_id: string;
          mentor_id: string;
          dimension_id: string;
          ai_synthesis: string | null;
          mentor_edited_synthesis: string | null;
          final_synthesis: string | null;
          overall_bars_score: number | null;
          status: 'draft' | 'mentor_review' | 'approved';
          mentor_approved: boolean;
          mentor_approved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          assignment_id: string;
          candidate_id: string;
          mentor_id: string;
          dimension_id: string;
          ai_synthesis?: string | null;
          mentor_edited_synthesis?: string | null;
          final_synthesis?: string | null;
          overall_bars_score?: number | null;
          status?: 'draft' | 'mentor_review' | 'approved';
          mentor_approved?: boolean;
          mentor_approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          assignment_id?: string;
          candidate_id?: string;
          mentor_id?: string;
          dimension_id?: string;
          ai_synthesis?: string | null;
          mentor_edited_synthesis?: string | null;
          final_synthesis?: string | null;
          overall_bars_score?: number | null;
          status?: 'draft' | 'mentor_review' | 'approved';
          mentor_approved?: boolean;
          mentor_approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      observation_sessions: {
        Row: {
          id: string;
          assignment_id: string | null;
          candidate_id: string;
          created_at: string;
          updated_at: string;
          session_type: string | null;
          status: string;
          assignment_id_ref: string | null;
          mentor_id: string | null;
          feedback_level: number | null;
          mentor_approved: boolean;
          mentor_approved_at: string | null;
        };
        Insert: {
          id?: string;
          assignment_id?: string | null;
          candidate_id: string;
          created_at?: string;
          updated_at?: string;
          session_type?: string | null;
          status?: string;
          assignment_id_ref?: string | null;
          mentor_id?: string | null;
          feedback_level?: number | null;
          mentor_approved?: boolean;
          mentor_approved_at?: string | null;
        };
        Update: {
          id?: string;
          assignment_id?: string | null;
          candidate_id?: string;
          created_at?: string;
          updated_at?: string;
          session_type?: string | null;
          status?: string;
          assignment_id_ref?: string | null;
          mentor_id?: string | null;
          feedback_level?: number | null;
          mentor_approved?: boolean;
          mentor_approved_at?: string | null;
        };
      };
      training_certificates: {
        Row: {
          id: string;
          candidate_id: string;
          module_id: string;
          created_at: string;
          certificate_number: string;
          score: number | null;
          issued_at: string;
          expires_at: string | null;
          pdf_url: string | null;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          module_id: string;
          created_at?: string;
          certificate_number: string;
          score?: number | null;
          issued_at?: string;
          expires_at?: string | null;
          pdf_url?: string | null;
        };
        Update: {
          id?: string;
          candidate_id?: string;
          module_id?: string;
          created_at?: string;
          certificate_number?: string;
          score?: number | null;
          issued_at?: string;
          expires_at?: string | null;
          pdf_url?: string | null;
        };
      };
      admin_settings: {
        Row: { key: string; value: string; description: string | null; updated_at: string; updated_by: string | null };
        Insert: { key: string; value: string; description?: string | null; updated_at?: string; updated_by?: string | null };
        Update: { key?: string; value?: string; description?: string | null; updated_at?: string; updated_by?: string | null };
      };
      observation_loops: {
        Row: {
          id: string; candidate_id: string; assignment_id: string | null; dimension_id: string;
          observation_level: number; loop_number: number; status: string; bars_score: number | null;
          endorsement_decision: string | null; scenario_variant: number; mentor_id: string | null;
          started_at: string; completed_at: string | null; cooldown_ends_at: string | null;
          cooldown_days: number | null; is_locked: boolean; mentor_override: boolean;
          override_reason: string | null; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; candidate_id: string; assignment_id?: string | null; dimension_id: string;
          observation_level?: number; loop_number?: number; status?: string; bars_score?: number | null;
          endorsement_decision?: string | null; scenario_variant?: number; mentor_id?: string | null;
          started_at?: string; completed_at?: string | null; cooldown_ends_at?: string | null;
          cooldown_days?: number | null; is_locked?: boolean; mentor_override?: boolean;
          override_reason?: string | null; created_at?: string; updated_at?: string;
        };
        Update: {
          id?: string; candidate_id?: string; assignment_id?: string | null; dimension_id?: string;
          observation_level?: number; loop_number?: number; status?: string; bars_score?: number | null;
          endorsement_decision?: string | null; scenario_variant?: number; mentor_id?: string | null;
          started_at?: string; completed_at?: string | null; cooldown_ends_at?: string | null;
          cooldown_days?: number | null; is_locked?: boolean; mentor_override?: boolean;
          override_reason?: string | null; created_at?: string; updated_at?: string;
        };
      };
      self_assessments: {
        Row: {
          id: string; candidate_id: string; behavioral_scores: Json; notes: string | null;
          attempt_number: number; completed: boolean; completed_at: string | null;
          created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; candidate_id: string; behavioral_scores?: Json; notes?: string | null;
          attempt_number?: number; completed?: boolean; completed_at?: string | null;
          created_at?: string; updated_at?: string;
        };
        Update: {
          id?: string; candidate_id?: string; behavioral_scores?: Json; notes?: string | null;
          attempt_number?: number; completed?: boolean; completed_at?: string | null;
          created_at?: string; updated_at?: string;
        };
      };
      behavioral_consistency_index: {
        Row: {
          id: string; candidate_id: string; dimension_id: string; observation_cycle: number;
          scenarios_demonstrated: number; scenarios_total: number; consistency_ratio: number | null;
          previous_consistency_ratio: number | null; consistency_trend: string | null;
          mentor_notes: string | null; flagged_for_review: boolean; last_updated_at: string; created_at: string;
        };
        Insert: {
          id?: string; candidate_id: string; dimension_id: string; observation_cycle?: number;
          scenarios_demonstrated?: number; scenarios_total?: number; consistency_ratio?: number | null;
          previous_consistency_ratio?: number | null; consistency_trend?: string | null;
          mentor_notes?: string | null; flagged_for_review?: boolean; last_updated_at?: string; created_at?: string;
        };
        Update: {
          id?: string; candidate_id?: string; dimension_id?: string; observation_cycle?: number;
          scenarios_demonstrated?: number; scenarios_total?: number; consistency_ratio?: number | null;
          previous_consistency_ratio?: number | null; consistency_trend?: string | null;
          mentor_notes?: string | null; flagged_for_review?: boolean; last_updated_at?: string; created_at?: string;
        };
      };
      scenario_selection_audit: {
        Row: {
          id: string; session_id: string | null; candidate_id: string; dimension_id: string;
          random_seed: number | null; scenario_sequence: string[]; generated_at: string;
        };
        Insert: {
          id?: string; session_id?: string | null; candidate_id: string; dimension_id: string;
          random_seed?: number | null; scenario_sequence?: string[]; generated_at?: string;
        };
        Update: {
          id?: string; session_id?: string | null; candidate_id?: string; dimension_id?: string;
          random_seed?: number | null; scenario_sequence?: string[]; generated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_notification: { Args: Record<string, unknown>; Returns: Json };
      get_notifications: { Args: Record<string, unknown>; Returns: Json };
      mark_notification_read: { Args: Record<string, unknown>; Returns: Json };
      mark_all_notifications_read: { Args: Record<string, unknown>; Returns: Json };
      poll_updates: { Args: Record<string, unknown>; Returns: Json };
      get_my_profile_bundle: { Args: Record<string, unknown>; Returns: Json };
      log_growth_event: { Args: Record<string, unknown>; Returns: Json };
      get_growth_log: { Args: Record<string, unknown>; Returns: Json };
      issue_behavioral_evidence_report: { Args: Record<string, unknown>; Returns: Json };
      verify_behavioral_evidence: { Args: Record<string, unknown>; Returns: Json };
      record_observation: { Args: Record<string, unknown>; Returns: Json };
      submit_endorsement: { Args: Record<string, unknown>; Returns: Json };
      assign_mentor: { Args: Record<string, unknown>; Returns: Json };
      start_observation_loop: { Args: Record<string, unknown>; Returns: Json };
      complete_observation_loop: { Args: Record<string, unknown>; Returns: Json };
      start_training_module: { Args: Record<string, unknown>; Returns: Json };
      complete_training_module: { Args: Record<string, unknown>; Returns: Json };
      apply_to_project: { Args: Record<string, unknown>; Returns: Json };
      request_connection: { Args: Record<string, unknown>; Returns: Json };
      respond_to_connection: { Args: Record<string, unknown>; Returns: Json };
      get_or_create_direct_conversation: { Args: Record<string, unknown>; Returns: Json };
      send_message: { Args: Record<string, unknown>; Returns: Json };
      mark_conversation_read: { Args: Record<string, unknown>; Returns: Json };
      get_conversation_messages: { Args: Record<string, unknown>; Returns: Json };
      get_candidate_dashboard_stats: { Args: Record<string, unknown>; Returns: Json };
      get_mentor_dashboard_stats: { Args: Record<string, unknown>; Returns: Json };
      get_employer_dashboard_stats: { Args: Record<string, unknown>; Returns: Json };
      set_talentvisa_visibility: { Args: Record<string, unknown>; Returns: Json };
      queue_email: { Args: Record<string, unknown>; Returns: Json };
      is_admin: { Args: Record<string, unknown>; Returns: Json };
      my_candidate_id: { Args: Record<string, unknown>; Returns: Json };
      my_mentor_id: { Args: Record<string, unknown>; Returns: Json };
      my_employer_id: { Args: Record<string, unknown>; Returns: Json };
    };
    Enums: {
      user_role: UserRole;
      endorsement_decision: EndorsementDecision;
      readiness_tier: ReadinessTier;
      growth_log_event_type: GrowthLogEventType;
      project_status: ProjectStatus;
      milestone_status: MilestoneStatus;
      connection_status: ConnectionStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
