export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'candidate' | 'mentor' | 'employer' | 'school_admin' | 'admin';
export type EndorsementDecision = 'proceed' | 'redirect' | 'pause';
export type ReadinessTier = 'tier_1' | 'tier_2' | 'tier_3';
export type GrowthLogEventType = 'assessment' | 'training' | 'project' | 'observation' | 'tier_change' | 'endorsement' | 'signup' | 'resume_upload';
export type ProjectStatus = 'draft' | 'open' | 'in_progress' | 'completed' | 'cancelled';
export type MilestoneStatus = 'pending' | 'in_progress' | 'submitted' | 'approved' | 'revision_requested';
export type ConnectionStatus = 'pending' | 'accepted' | 'declined' | 'expired';

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
          linkedin_url: string | null;
          is_active: boolean;
          onboarding_completed: boolean;
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
          linkedin_url?: string | null;
          is_active?: boolean;
          onboarding_completed?: boolean;
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
          linkedin_url?: string | null;
          is_active?: boolean;
          onboarding_completed?: boolean;
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
          status: 'active' | 'completed' | 'transferred';
          loop_number: number;
          assigned_by: string | null;
        };
        Insert: {
          id?: string;
          mentor_id: string;
          candidate_id: string;
          created_at?: string;
          updated_at?: string;
          status?: 'active' | 'completed' | 'transferred';
          loop_number?: number;
          assigned_by?: string | null;
        };
        Update: {
          id?: string;
          mentor_id?: string;
          candidate_id?: string;
          created_at?: string;
          updated_at?: string;
          status?: 'active' | 'completed' | 'transferred';
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
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
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
  };
}
