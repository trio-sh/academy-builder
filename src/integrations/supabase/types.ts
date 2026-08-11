export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      behavioral_consistency_index: {
        Row: {
          candidate_id: string
          consistency_ratio: number | null
          consistency_trend: string | null
          created_at: string
          dimension_id: string
          flagged_for_review: boolean
          id: string
          last_updated_at: string
          mentor_notes: string | null
          observation_cycle: number
          previous_consistency_ratio: number | null
          scenarios_demonstrated: number
          scenarios_total: number
        }
        Insert: {
          candidate_id: string
          consistency_ratio?: number | null
          consistency_trend?: string | null
          created_at?: string
          dimension_id: string
          flagged_for_review?: boolean
          id?: string
          last_updated_at?: string
          mentor_notes?: string | null
          observation_cycle?: number
          previous_consistency_ratio?: number | null
          scenarios_demonstrated?: number
          scenarios_total?: number
        }
        Update: {
          candidate_id?: string
          consistency_ratio?: number | null
          consistency_trend?: string | null
          created_at?: string
          dimension_id?: string
          flagged_for_review?: boolean
          id?: string
          last_updated_at?: string
          mentor_notes?: string | null
          observation_cycle?: number
          previous_consistency_ratio?: number | null
          scenarios_demonstrated?: number
          scenarios_total?: number
        }
        Relationships: []
      }
      bridgefast_content: {
        Row: {
          content_type: string | null
          content_url: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          is_required: boolean
          module_id: string | null
          order_index: number
          title: string | null
        }
        Insert: {
          content_type?: string | null
          content_url?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_required?: boolean
          module_id?: string | null
          order_index?: number
          title?: string | null
        }
        Update: {
          content_type?: string | null
          content_url?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_required?: boolean
          module_id?: string | null
          order_index?: number
          title?: string | null
        }
        Relationships: []
      }
      bridgefast_modules: {
        Row: {
          behavioral_dimension: string | null
          content_url: string | null
          created_at: string
          description: string | null
          duration_hours: number
          id: string
          is_active: boolean
          order_index: number
          title: string | null
          updated_at: string
        }
        Insert: {
          behavioral_dimension?: string | null
          content_url?: string | null
          created_at?: string
          description?: string | null
          duration_hours?: number
          id?: string
          is_active?: boolean
          order_index?: number
          title?: string | null
          updated_at?: string
        }
        Update: {
          behavioral_dimension?: string | null
          content_url?: string | null
          created_at?: string
          description?: string | null
          duration_hours?: number
          id?: string
          is_active?: boolean
          order_index?: number
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      bridgefast_progress: {
        Row: {
          candidate_id: string | null
          completed_at: string | null
          created_at: string
          deadline: string | null
          final_score: number | null
          id: string
          module_id: string | null
          progress_percent: number
          started_at: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          candidate_id?: string | null
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          final_score?: number | null
          id?: string
          module_id?: string | null
          progress_percent?: number
          started_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          candidate_id?: string | null
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          final_score?: number | null
          id?: string
          module_id?: string | null
          progress_percent?: number
          started_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      bridgefast_quiz_attempts: {
        Row: {
          answers: Json
          attempt_number: number
          candidate_id: string | null
          completed_at: string | null
          created_at: string
          id: string
          max_score: number | null
          module_id: string | null
          passed: boolean | null
          score: number | null
        }
        Insert: {
          answers?: Json
          attempt_number?: number
          candidate_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          max_score?: number | null
          module_id?: string | null
          passed?: boolean | null
          score?: number | null
        }
        Update: {
          answers?: Json
          attempt_number?: number
          candidate_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          max_score?: number | null
          module_id?: string | null
          passed?: boolean | null
          score?: number | null
        }
        Relationships: []
      }
      bridgefast_quiz_questions: {
        Row: {
          correct_answer: string | null
          created_at: string
          explanation: string | null
          id: string
          module_id: string | null
          options: Json
          order_index: number
          points: number
          question: string | null
          question_type: string | null
        }
        Insert: {
          correct_answer?: string | null
          created_at?: string
          explanation?: string | null
          id?: string
          module_id?: string | null
          options?: Json
          order_index?: number
          points?: number
          question?: string | null
          question_type?: string | null
        }
        Update: {
          correct_answer?: string | null
          created_at?: string
          explanation?: string | null
          id?: string
          module_id?: string | null
          options?: Json
          order_index?: number
          points?: number
          question?: string | null
          question_type?: string | null
        }
        Relationships: []
      }
      candidate_profiles: {
        Row: {
          created_at: string
          current_tier: string | null
          education: Json | null
          entry_path: string | null
          experience_years: number | null
          has_skill_passport: boolean
          has_talentvisa: boolean
          id: string
          is_listed_on_t3x: boolean
          mentor_loops: number
          profile_id: string | null
          resume_url: string | null
          skills: string[]
          updated_at: string
          work_history: Json | null
        }
        Insert: {
          created_at?: string
          current_tier?: string | null
          education?: Json | null
          entry_path?: string | null
          experience_years?: number | null
          has_skill_passport?: boolean
          has_talentvisa?: boolean
          id?: string
          is_listed_on_t3x?: boolean
          mentor_loops?: number
          profile_id?: string | null
          resume_url?: string | null
          skills?: string[]
          updated_at?: string
          work_history?: Json | null
        }
        Update: {
          created_at?: string
          current_tier?: string | null
          education?: Json | null
          entry_path?: string | null
          experience_years?: number | null
          has_skill_passport?: boolean
          has_talentvisa?: boolean
          id?: string
          is_listed_on_t3x?: boolean
          mentor_loops?: number
          profile_id?: string | null
          resume_url?: string | null
          skills?: string[]
          updated_at?: string
          work_history?: Json | null
        }
        Relationships: []
      }
      candidate_self_assessments: {
        Row: {
          areas_for_improvement: string[]
          behavioral_scores: Json
          candidate_id: string | null
          completed: boolean
          created_at: string
          goals: string | null
          id: string
          notes: string | null
          strengths: string[]
          updated_at: string
        }
        Insert: {
          areas_for_improvement?: string[]
          behavioral_scores?: Json
          candidate_id?: string | null
          completed?: boolean
          created_at?: string
          goals?: string | null
          id?: string
          notes?: string | null
          strengths?: string[]
          updated_at?: string
        }
        Update: {
          areas_for_improvement?: string[]
          behavioral_scores?: Json
          candidate_id?: string | null
          completed?: boolean
          created_at?: string
          goals?: string | null
          id?: string
          notes?: string | null
          strengths?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          conversation_id: string | null
          id: string
          is_muted: boolean
          joined_at: string | null
          last_read_at: string | null
          user_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          id?: string
          is_muted?: boolean
          joined_at?: string | null
          last_read_at?: string | null
          user_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          id?: string
          is_muted?: boolean
          joined_at?: string | null
          last_read_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          last_message_preview: string | null
          title: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_queue: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          sent_at: string | null
          status: string | null
          template: string | null
          template_data: Json
          to_email: string | null
          to_name: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string | null
          template?: string | null
          template_data?: Json
          to_email?: string | null
          to_name?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string | null
          template?: string | null
          template_data?: Json
          to_email?: string | null
          to_name?: string | null
        }
        Relationships: []
      }
      employer_feedback: {
        Row: {
          behavioral_alignment: Json | null
          candidate_id: string | null
          comments: string | null
          created_at: string
          employer_id: string | null
          feedback_type: string | null
          hire_date: string
          id: string
          performance_rating: number
          readiness_accuracy: number
          would_hire_again: boolean
        }
        Insert: {
          behavioral_alignment?: Json | null
          candidate_id?: string | null
          comments?: string | null
          created_at?: string
          employer_id?: string | null
          feedback_type?: string | null
          hire_date?: string
          id?: string
          performance_rating?: number
          readiness_accuracy?: number
          would_hire_again?: boolean
        }
        Update: {
          behavioral_alignment?: Json | null
          candidate_id?: string | null
          comments?: string | null
          created_at?: string
          employer_id?: string | null
          feedback_type?: string | null
          hire_date?: string
          id?: string
          performance_rating?: number
          readiness_accuracy?: number
          would_hire_again?: boolean
        }
        Relationships: []
      }
      employer_profiles: {
        Row: {
          company_logo_url: string | null
          company_name: string | null
          company_size: string | null
          company_website: string | null
          created_at: string
          id: string
          industry: string | null
          is_verified: boolean
          profile_id: string | null
          subscription_tier: string | null
          total_connections: number
          total_hires: number
          updated_at: string
        }
        Insert: {
          company_logo_url?: string | null
          company_name?: string | null
          company_size?: string | null
          company_website?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          is_verified?: boolean
          profile_id?: string | null
          subscription_tier?: string | null
          total_connections?: number
          total_hires?: number
          updated_at?: string
        }
        Update: {
          company_logo_url?: string | null
          company_name?: string | null
          company_size?: string | null
          company_website?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          is_verified?: boolean
          profile_id?: string | null
          subscription_tier?: string | null
          total_connections?: number
          total_hires?: number
          updated_at?: string
        }
        Relationships: []
      }
      endorsements: {
        Row: {
          assignment_id: string | null
          candidate_id: string | null
          created_at: string
          decision: string | null
          id: string
          justification: string | null
          mentor_id: string | null
          redirect_module_id: string | null
          redirect_to: string | null
        }
        Insert: {
          assignment_id?: string | null
          candidate_id?: string | null
          created_at?: string
          decision?: string | null
          id?: string
          justification?: string | null
          mentor_id?: string | null
          redirect_module_id?: string | null
          redirect_to?: string | null
        }
        Update: {
          assignment_id?: string | null
          candidate_id?: string | null
          created_at?: string
          decision?: string | null
          id?: string
          justification?: string | null
          mentor_id?: string | null
          redirect_module_id?: string | null
          redirect_to?: string | null
        }
        Relationships: []
      }
      escrow_transactions: {
        Row: {
          amount: number
          candidate_id: string | null
          created_at: string
          employer_id: string | null
          funded_at: string | null
          id: string
          milestone_id: string | null
          notes: string | null
          payment_credentials: string | null
          payment_method: string | null
          payment_proof_url: string | null
          project_id: string | null
          refunded_at: string | null
          released_at: string | null
          status: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount?: number
          candidate_id?: string | null
          created_at?: string
          employer_id?: string | null
          funded_at?: string | null
          id?: string
          milestone_id?: string | null
          notes?: string | null
          payment_credentials?: string | null
          payment_method?: string | null
          payment_proof_url?: string | null
          project_id?: string | null
          refunded_at?: string | null
          released_at?: string | null
          status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          candidate_id?: string | null
          created_at?: string
          employer_id?: string | null
          funded_at?: string | null
          id?: string
          milestone_id?: string | null
          notes?: string | null
          payment_credentials?: string | null
          payment_method?: string | null
          payment_proof_url?: string | null
          project_id?: string | null
          refunded_at?: string | null
          released_at?: string | null
          status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      growth_log_entries: {
        Row: {
          candidate_id: string | null
          created_at: string
          description: string | null
          event_type: string | null
          id: string
          metadata: Json | null
          source_component: string | null
          source_id: string | null
          title: string | null
        }
        Insert: {
          candidate_id?: string | null
          created_at?: string
          description?: string | null
          event_type?: string | null
          id?: string
          metadata?: Json | null
          source_component?: string | null
          source_id?: string | null
          title?: string | null
        }
        Update: {
          candidate_id?: string | null
          created_at?: string
          description?: string | null
          event_type?: string | null
          id?: string
          metadata?: Json | null
          source_component?: string | null
          source_id?: string | null
          title?: string | null
        }
        Relationships: []
      }
      growth_logs: {
        Row: {
          candidate_id: string | null
          created_at: string
          description: string | null
          id: string
          log_type: string | null
          metadata: Json | null
          title: string | null
        }
        Insert: {
          candidate_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          log_type?: string | null
          metadata?: Json | null
          title?: string | null
        }
        Update: {
          candidate_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          log_type?: string | null
          metadata?: Json | null
          title?: string | null
        }
        Relationships: []
      }
      liveworks_applications: {
        Row: {
          candidate_id: string | null
          cover_letter: string | null
          created_at: string
          id: string
          project_id: string | null
          status: string | null
        }
        Insert: {
          candidate_id?: string | null
          cover_letter?: string | null
          created_at?: string
          id?: string
          project_id?: string | null
          status?: string | null
        }
        Update: {
          candidate_id?: string | null
          cover_letter?: string | null
          created_at?: string
          id?: string
          project_id?: string | null
          status?: string | null
        }
        Relationships: []
      }
      liveworks_milestones: {
        Row: {
          approved_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          escrow_funded_at: string | null
          escrow_released_at: string | null
          escrow_status: string | null
          id: string
          order_index: number
          payment_amount: number | null
          payment_credentials: string | null
          payment_method: string | null
          payment_notes: string | null
          payment_proof_url: string | null
          payment_verified_at: string | null
          project_id: string | null
          status: string | null
          submitted_at: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          escrow_funded_at?: string | null
          escrow_released_at?: string | null
          escrow_status?: string | null
          id?: string
          order_index?: number
          payment_amount?: number | null
          payment_credentials?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          payment_proof_url?: string | null
          payment_verified_at?: string | null
          project_id?: string | null
          status?: string | null
          submitted_at?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          escrow_funded_at?: string | null
          escrow_released_at?: string | null
          escrow_status?: string | null
          id?: string
          order_index?: number
          payment_amount?: number | null
          payment_credentials?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          payment_proof_url?: string | null
          payment_verified_at?: string | null
          project_id?: string | null
          status?: string | null
          submitted_at?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      liveworks_projects: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          category: string | null
          created_at: string
          description: string | null
          duration_days: number
          employer_id: string | null
          id: string
          max_candidates: number
          mentor_id: string | null
          selected_candidate_id: string | null
          skill_level: string | null
          status: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          category?: string | null
          created_at?: string
          description?: string | null
          duration_days?: number
          employer_id?: string | null
          id?: string
          max_candidates?: number
          mentor_id?: string | null
          selected_candidate_id?: string | null
          skill_level?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          category?: string | null
          created_at?: string
          description?: string | null
          duration_days?: number
          employer_id?: string | null
          id?: string
          max_candidates?: number
          mentor_id?: string | null
          selected_candidate_id?: string | null
          skill_level?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      mentor_assigned_dimensions: {
        Row: {
          assigned_at: string | null
          assignment_id: string | null
          candidate_id: string | null
          created_at: string
          dimension_id: string | null
          id: string
          is_active: boolean
          mentor_id: string | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          assigned_at?: string | null
          assignment_id?: string | null
          candidate_id?: string | null
          created_at?: string
          dimension_id?: string | null
          id?: string
          is_active?: boolean
          mentor_id?: string | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          assigned_at?: string | null
          assignment_id?: string | null
          candidate_id?: string | null
          created_at?: string
          dimension_id?: string | null
          id?: string
          is_active?: boolean
          mentor_id?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      mentor_assignments: {
        Row: {
          assigned_by: string | null
          candidate_id: string | null
          created_at: string
          id: string
          loop_number: number
          mentor_id: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          candidate_id?: string | null
          created_at?: string
          id?: string
          loop_number?: number
          mentor_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          candidate_id?: string | null
          created_at?: string
          id?: string
          loop_number?: number
          mentor_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      mentor_availability: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string | null
          id: string
          is_active: boolean
          mentor_id: string | null
          start_time: string | null
        }
        Insert: {
          created_at?: string
          day_of_week?: number
          end_time?: string | null
          id?: string
          is_active?: boolean
          mentor_id?: string | null
          start_time?: string | null
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string | null
          id?: string
          is_active?: boolean
          mentor_id?: string | null
          start_time?: string | null
        }
        Relationships: []
      }
      mentor_observations: {
        Row: {
          areas_for_improvement: string[]
          assignment_id: string | null
          behavioral_scores: Json
          candidate_id: string | null
          created_at: string
          id: string
          is_locked: boolean
          mentor_id: string | null
          notes: string | null
          session_date: string
          strengths: string[]
          updated_at: string
        }
        Insert: {
          areas_for_improvement?: string[]
          assignment_id?: string | null
          behavioral_scores?: Json
          candidate_id?: string | null
          created_at?: string
          id?: string
          is_locked?: boolean
          mentor_id?: string | null
          notes?: string | null
          session_date?: string
          strengths?: string[]
          updated_at?: string
        }
        Update: {
          areas_for_improvement?: string[]
          assignment_id?: string | null
          behavioral_scores?: Json
          candidate_id?: string | null
          created_at?: string
          id?: string
          is_locked?: boolean
          mentor_id?: string | null
          notes?: string | null
          session_date?: string
          strengths?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      mentor_profiles: {
        Row: {
          avg_rating: number | null
          company: string | null
          created_at: string
          current_mentees: number
          id: string
          industry: string | null
          is_accepting: boolean
          job_title: string | null
          max_mentees: number
          profile_id: string | null
          specializations: string[]
          total_endorsements: number
          total_observations: number
          updated_at: string
          years_experience: number
        }
        Insert: {
          avg_rating?: number | null
          company?: string | null
          created_at?: string
          current_mentees?: number
          id?: string
          industry?: string | null
          is_accepting?: boolean
          job_title?: string | null
          max_mentees?: number
          profile_id?: string | null
          specializations?: string[]
          total_endorsements?: number
          total_observations?: number
          updated_at?: string
          years_experience?: number
        }
        Update: {
          avg_rating?: number | null
          company?: string | null
          created_at?: string
          current_mentees?: number
          id?: string
          industry?: string | null
          is_accepting?: boolean
          job_title?: string | null
          max_mentees?: number
          profile_id?: string | null
          specializations?: string[]
          total_endorsements?: number
          total_observations?: number
          updated_at?: string
          years_experience?: number
        }
        Relationships: []
      }
      mentor_sessions: {
        Row: {
          assignment_id: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          candidate_id: string | null
          created_at: string
          duration_minutes: number
          id: string
          meeting_url: string | null
          mentor_id: string | null
          notes: string | null
          scheduled_at: string | null
          session_type: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          assignment_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          candidate_id?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          meeting_url?: string | null
          mentor_id?: string | null
          notes?: string | null
          scheduled_at?: string | null
          session_type?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          assignment_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          candidate_id?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          meeting_url?: string | null
          mentor_id?: string | null
          notes?: string | null
          scheduled_at?: string | null
          session_type?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string | null
          conversation_id: string | null
          created_at: string
          file_url: string | null
          id: string
          is_deleted: boolean
          is_edited: boolean
          message_type: string | null
          metadata: Json
          reply_to_id: string | null
          sender_id: string | null
          updated_at: string
        }
        Insert: {
          content?: string | null
          conversation_id?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          is_deleted?: boolean
          is_edited?: boolean
          message_type?: string | null
          metadata?: Json
          reply_to_id?: string | null
          sender_id?: string | null
          updated_at?: string
        }
        Update: {
          content?: string | null
          conversation_id?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          is_deleted?: boolean
          is_edited?: boolean
          message_type?: string | null
          metadata?: Json
          reply_to_id?: string | null
          sender_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_type: string | null
          action_url: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          metadata: Json | null
          priority: string | null
          title: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          action_type?: string | null
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          metadata?: Json | null
          priority?: string | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string | null
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          metadata?: Json | null
          priority?: string | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      observation_feedback: {
        Row: {
          ai_draft_feedback: string | null
          assignment_id: string | null
          bars_score: number | null
          candidate_id: string | null
          created_at: string
          dimension_id: string | null
          feedback_level: number
          final_feedback: string | null
          id: string
          mentor_approved: boolean
          mentor_approved_at: string | null
          mentor_feedback: string | null
          mentor_id: string | null
          mentor_rejected_reason: string | null
          session_id: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          ai_draft_feedback?: string | null
          assignment_id?: string | null
          bars_score?: number | null
          candidate_id?: string | null
          created_at?: string
          dimension_id?: string | null
          feedback_level?: number
          final_feedback?: string | null
          id?: string
          mentor_approved?: boolean
          mentor_approved_at?: string | null
          mentor_feedback?: string | null
          mentor_id?: string | null
          mentor_rejected_reason?: string | null
          session_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          ai_draft_feedback?: string | null
          assignment_id?: string | null
          bars_score?: number | null
          candidate_id?: string | null
          created_at?: string
          dimension_id?: string | null
          feedback_level?: number
          final_feedback?: string | null
          id?: string
          mentor_approved?: boolean
          mentor_approved_at?: string | null
          mentor_feedback?: string | null
          mentor_id?: string | null
          mentor_rejected_reason?: string | null
          session_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      observation_loops: {
        Row: {
          assignment_id: string | null
          bars_score: number | null
          candidate_id: string
          completed_at: string | null
          cooldown_days: number | null
          cooldown_ends_at: string | null
          created_at: string
          dimension_id: string
          endorsement_decision: string | null
          id: string
          is_locked: boolean
          loop_number: number
          mentor_id: string | null
          mentor_override: boolean
          observation_level: number
          override_reason: string | null
          scenario_variant: number
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          assignment_id?: string | null
          bars_score?: number | null
          candidate_id: string
          completed_at?: string | null
          cooldown_days?: number | null
          cooldown_ends_at?: string | null
          created_at?: string
          dimension_id: string
          endorsement_decision?: string | null
          id?: string
          is_locked?: boolean
          loop_number?: number
          mentor_id?: string | null
          mentor_override?: boolean
          observation_level?: number
          override_reason?: string | null
          scenario_variant?: number
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          assignment_id?: string | null
          bars_score?: number | null
          candidate_id?: string
          completed_at?: string | null
          cooldown_days?: number | null
          cooldown_ends_at?: string | null
          created_at?: string
          dimension_id?: string
          endorsement_decision?: string | null
          id?: string
          is_locked?: boolean
          loop_number?: number
          mentor_id?: string | null
          mentor_override?: boolean
          observation_level?: number
          override_reason?: string | null
          scenario_variant?: number
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      observation_sessions: {
        Row: {
          assignment_id: string | null
          assignment_id_ref: string | null
          candidate_id: string | null
          created_at: string
          feedback_level: number | null
          id: string
          mentor_approved: boolean
          mentor_approved_at: string | null
          mentor_id: string | null
          session_type: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          assignment_id?: string | null
          assignment_id_ref?: string | null
          candidate_id?: string | null
          created_at?: string
          feedback_level?: number | null
          id?: string
          mentor_approved?: boolean
          mentor_approved_at?: string | null
          mentor_id?: string | null
          session_type?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          assignment_id?: string | null
          assignment_id_ref?: string | null
          candidate_id?: string | null
          created_at?: string
          feedback_level?: number | null
          id?: string
          mentor_approved?: boolean
          mentor_approved_at?: string | null
          mentor_id?: string | null
          session_type?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      observation_synthesis: {
        Row: {
          ai_synthesis: string | null
          assignment_id: string | null
          candidate_id: string | null
          created_at: string
          dimension_id: string | null
          final_synthesis: string | null
          id: string
          mentor_approved: boolean
          mentor_approved_at: string | null
          mentor_edited_synthesis: string | null
          mentor_id: string | null
          overall_bars_score: number | null
          status: string | null
          updated_at: string
        }
        Insert: {
          ai_synthesis?: string | null
          assignment_id?: string | null
          candidate_id?: string | null
          created_at?: string
          dimension_id?: string | null
          final_synthesis?: string | null
          id?: string
          mentor_approved?: boolean
          mentor_approved_at?: string | null
          mentor_edited_synthesis?: string | null
          mentor_id?: string | null
          overall_bars_score?: number | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          ai_synthesis?: string | null
          assignment_id?: string | null
          candidate_id?: string | null
          created_at?: string
          dimension_id?: string | null
          final_synthesis?: string | null
          id?: string
          mentor_approved?: boolean
          mentor_approved_at?: string | null
          mentor_edited_synthesis?: string | null
          mentor_id?: string | null
          overall_bars_score?: number | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string | null
          first_name: string | null
          headline: string | null
          id: string
          is_active: boolean
          last_name: string | null
          location: string | null
          onboarding_completed: boolean
          role: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          headline?: string | null
          id: string
          is_active?: boolean
          last_name?: string | null
          location?: string | null
          onboarding_completed?: boolean
          role?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          headline?: string | null
          id?: string
          is_active?: boolean
          last_name?: string | null
          location?: string | null
          onboarding_completed?: boolean
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      scenario_selection_audit: {
        Row: {
          candidate_id: string
          dimension_id: string
          generated_at: string
          id: string
          random_seed: number | null
          scenario_sequence: string[]
          session_id: string | null
        }
        Insert: {
          candidate_id: string
          dimension_id: string
          generated_at?: string
          id?: string
          random_seed?: number | null
          scenario_sequence?: string[]
          session_id?: string | null
        }
        Update: {
          candidate_id?: string
          dimension_id?: string
          generated_at?: string
          id?: string
          random_seed?: number | null
          scenario_sequence?: string[]
          session_id?: string | null
        }
        Relationships: []
      }
      school_cohorts: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          name: string | null
          program: string | null
          school_id: string | null
          start_date: string
          status: string | null
          teacher_id: string | null
          total_students: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          name?: string | null
          program?: string | null
          school_id?: string | null
          start_date?: string
          status?: string | null
          teacher_id?: string | null
          total_students?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          name?: string | null
          program?: string | null
          school_id?: string | null
          start_date?: string
          status?: string | null
          teacher_id?: string | null
          total_students?: number
          updated_at?: string
        }
        Relationships: []
      }
      school_profiles: {
        Row: {
          active_cohorts: number
          address: string | null
          created_at: string
          district: string | null
          id: string
          is_verified: boolean
          profile_id: string | null
          school_name: string | null
          school_type: string | null
          total_students: number
          updated_at: string
        }
        Insert: {
          active_cohorts?: number
          address?: string | null
          created_at?: string
          district?: string | null
          id?: string
          is_verified?: boolean
          profile_id?: string | null
          school_name?: string | null
          school_type?: string | null
          total_students?: number
          updated_at?: string
        }
        Update: {
          active_cohorts?: number
          address?: string | null
          created_at?: string
          district?: string | null
          id?: string
          is_verified?: boolean
          profile_id?: string | null
          school_name?: string | null
          school_type?: string | null
          total_students?: number
          updated_at?: string
        }
        Relationships: []
      }
      self_assessments: {
        Row: {
          attempt_number: number
          behavioral_scores: Json
          candidate_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          attempt_number?: number
          behavioral_scores?: Json
          candidate_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          attempt_number?: number
          behavioral_scores?: Json
          candidate_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      session_reminders: {
        Row: {
          id: string
          remind_at: string | null
          reminder_type: string | null
          sent: boolean
          sent_at: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          remind_at?: string | null
          reminder_type?: string | null
          sent?: boolean
          sent_at?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          remind_at?: string | null
          reminder_type?: string | null
          sent?: boolean
          sent_at?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      skill_passports: {
        Row: {
          behavioral_scores: Json
          candidate_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          issued_at: string | null
          pdf_url: string | null
          qr_code_url: string | null
          readiness_tier: string | null
          updated_at: string
          verification_code: string | null
        }
        Insert: {
          behavioral_scores?: Json
          candidate_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          issued_at?: string | null
          pdf_url?: string | null
          qr_code_url?: string | null
          readiness_tier?: string | null
          updated_at?: string
          verification_code?: string | null
        }
        Update: {
          behavioral_scores?: Json
          candidate_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          issued_at?: string | null
          pdf_url?: string | null
          qr_code_url?: string | null
          readiness_tier?: string | null
          updated_at?: string
          verification_code?: string | null
        }
        Relationships: []
      }
      students: {
        Row: {
          avg_behavioral_score: number | null
          cohort_id: string | null
          created_at: string
          grade_level: string | null
          graduation_year: number | null
          id: string
          profile_id: string | null
          school_id: string | null
          status: string | null
          student_id_number: string | null
          total_observations: number
          updated_at: string
        }
        Insert: {
          avg_behavioral_score?: number | null
          cohort_id?: string | null
          created_at?: string
          grade_level?: string | null
          graduation_year?: number | null
          id?: string
          profile_id?: string | null
          school_id?: string | null
          status?: string | null
          student_id_number?: string | null
          total_observations?: number
          updated_at?: string
        }
        Update: {
          avg_behavioral_score?: number | null
          cohort_id?: string | null
          created_at?: string
          grade_level?: string | null
          graduation_year?: number | null
          id?: string
          profile_id?: string | null
          school_id?: string | null
          status?: string | null
          student_id_number?: string | null
          total_observations?: number
          updated_at?: string
        }
        Relationships: []
      }
      t3x_connections: {
        Row: {
          candidate_id: string | null
          created_at: string
          employer_id: string | null
          expires_at: string | null
          id: string
          message: string | null
          responded_at: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          candidate_id?: string | null
          created_at?: string
          employer_id?: string | null
          expires_at?: string | null
          id?: string
          message?: string | null
          responded_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          candidate_id?: string | null
          created_at?: string
          employer_id?: string | null
          expires_at?: string | null
          id?: string
          message?: string | null
          responded_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      talentvisa_nominations: {
        Row: {
          behavioral_score: number | null
          candidate_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          justification: string | null
          nominating_mentor_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          tier: string | null
          updated_at: string
        }
        Insert: {
          behavioral_score?: number | null
          candidate_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          justification?: string | null
          nominating_mentor_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          tier?: string | null
          updated_at?: string
        }
        Update: {
          behavioral_score?: number | null
          candidate_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          justification?: string | null
          nominating_mentor_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          tier?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      talentvisa_quotas: {
        Row: {
          created_at: string
          current_approvals: number
          id: string
          max_approvals: number
          period: string | null
          period_end: string | null
          period_start: string | null
          tier: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_approvals?: number
          id?: string
          max_approvals?: number
          period?: string | null
          period_end?: string | null
          period_start?: string | null
          tier?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_approvals?: number
          id?: string
          max_approvals?: number
          period?: string | null
          period_end?: string | null
          period_start?: string | null
          tier?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      teacher_observations: {
        Row: {
          areas_for_growth: string[]
          behavioral_scores: Json
          cohort_id: string | null
          context: string | null
          created_at: string
          id: string
          notes: string | null
          observation_date: string
          strengths: string[]
          student_id: string | null
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          areas_for_growth?: string[]
          behavioral_scores?: Json
          cohort_id?: string | null
          context?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          observation_date?: string
          strengths?: string[]
          student_id?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          areas_for_growth?: string[]
          behavioral_scores?: Json
          cohort_id?: string | null
          context?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          observation_date?: string
          strengths?: string[]
          student_id?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      training_certificates: {
        Row: {
          candidate_id: string | null
          certificate_number: string | null
          created_at: string
          expires_at: string | null
          id: string
          issued_at: string | null
          module_id: string | null
          pdf_url: string | null
          score: number | null
        }
        Insert: {
          candidate_id?: string | null
          certificate_number?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          module_id?: string | null
          pdf_url?: string | null
          score?: number | null
        }
        Update: {
          candidate_id?: string | null
          certificate_number?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          module_id?: string | null
          pdf_url?: string | null
          score?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_growth_log_entry: {
        Args: {
          p_candidate_id: string
          p_description?: string
          p_event_type: string
          p_metadata?: Json
          p_source_component?: string
          p_source_id?: string
          p_title: string
        }
        Returns: string
      }
      apply_to_project: {
        Args: { p_cover_letter?: string; p_project_id: string }
        Returns: string
      }
      complete_observation_loop: {
        Args: {
          p_bars_score?: number
          p_endorsement_decision?: string
          p_loop_id: string
        }
        Returns: boolean
      }
      create_notification: {
        Args: {
          p_action_url?: string
          p_message: string
          p_metadata?: Json
          p_priority?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      get_dashboard_stats: { Args: never; Returns: Json }
      get_or_create_direct_conversation: {
        Args: { p_other_user_id: string }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
      issue_behavioral_evidence_report: {
        Args: {
          p_behavioral_scores?: Json
          p_candidate_id: string
          p_readiness_tier?: string
        }
        Returns: Json
      }
      list_conversations: { Args: never; Returns: Json }
      mark_all_notifications_read: { Args: never; Returns: number }
      mark_conversation_read: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      mark_notification_read: { Args: { p_id: string }; Returns: boolean }
      my_candidate_id: { Args: never; Returns: string }
      my_employer_id: { Args: never; Returns: string }
      my_mentor_id: { Args: never; Returns: string }
      poll_updates: { Args: { since?: string }; Returns: Json }
      queue_email: {
        Args: {
          p_template: string
          p_template_data?: Json
          p_to_email: string
          p_to_name: string
        }
        Returns: string
      }
      record_observation: {
        Args: {
          p_areas_for_improvement?: string[]
          p_assignment_id: string
          p_behavioral_scores: Json
          p_candidate_id: string
          p_notes?: string
          p_session_date: string
          p_strengths?: string[]
        }
        Returns: string
      }
      request_connection: {
        Args: { p_candidate_id: string; p_message?: string }
        Returns: string
      }
      respond_to_connection: {
        Args: { p_accept: boolean; p_connection_id: string }
        Returns: boolean
      }
      send_message: {
        Args: {
          p_content: string
          p_conversation_id: string
          p_file_url?: string
          p_message_type?: string
          p_reply_to_id?: string
        }
        Returns: string
      }
      start_observation_loop: {
        Args: {
          p_assignment_id?: string
          p_candidate_id: string
          p_dimension_id: string
          p_observation_level: number
        }
        Returns: Json
      }
      submit_endorsement: {
        Args: {
          p_assignment_id: string
          p_candidate_id: string
          p_decision: string
          p_justification?: string
          p_redirect_module_id?: string
          p_redirect_to?: string
        }
        Returns: string
      }
      verify_behavioral_evidence: { Args: { p_code: string }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
