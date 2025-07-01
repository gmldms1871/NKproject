export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      choice_options: {
        Row: {
          id: string
          option_text: string
          order_index: number
          question_id: string | null
        }
        Insert: {
          id?: string
          option_text: string
          order_index: number
          question_id?: string | null
        }
        Update: {
          id?: string
          option_text?: string
          order_index?: number
          question_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "choice_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "form_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "choice_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "full_form_response_view"
            referencedColumns: ["question_id"]
          },
        ]
      }
      choice_questions: {
        Row: {
          etc_option_enabled: boolean | null
          is_multiple: boolean | null
          question_id: string
        }
        Insert: {
          etc_option_enabled?: boolean | null
          is_multiple?: boolean | null
          question_id: string
        }
        Update: {
          etc_option_enabled?: boolean | null
          is_multiple?: boolean | null
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "choice_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: true
            referencedRelation: "form_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "choice_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: true
            referencedRelation: "full_form_response_view"
            referencedColumns: ["question_id"]
          },
        ]
      }
      class_members: {
        Row: {
          assigned_at: string | null
          class_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          class_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          class_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_members_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      class_tags: {
        Row: {
          class_id: string | null
          id: string
          name: string
        }
        Insert: {
          class_id?: string | null
          id?: string
          name: string
        }
        Update: {
          class_id?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_tags_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string | null
          description: string | null
          group_id: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          group_id?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          group_id?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_concept_template_items: {
        Row: {
          concept_description: string
          concept_text: string
          created_at: string | null
          id: string
          order_index: number
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          concept_description: string
          concept_text: string
          created_at?: string | null
          id?: string
          order_index: number
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          concept_description?: string
          concept_text?: string
          created_at?: string | null
          id?: string
          order_index?: number
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_concept_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "exam_concept_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_concept_templates: {
        Row: {
          concept_count: number | null
          created_at: string | null
          creator_id: string | null
          group_id: string | null
          id: string
          name: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          concept_count?: number | null
          created_at?: string | null
          creator_id?: string | null
          group_id?: string | null
          id?: string
          name: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          concept_count?: number | null
          created_at?: string | null
          creator_id?: string | null
          group_id?: string | null
          id?: string
          name?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_concept_templates_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_concept_templates_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_questions: {
        Row: {
          concept_template_id: string | null
          question_id: string
          total_questions: number
        }
        Insert: {
          concept_template_id?: string | null
          question_id: string
          total_questions: number
        }
        Update: {
          concept_template_id?: string | null
          question_id?: string
          total_questions?: number
        }
        Relationships: [
          {
            foreignKeyName: "exam_questions_concept_template_id_fkey"
            columns: ["concept_template_id"]
            isOneToOne: false
            referencedRelation: "exam_concept_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: true
            referencedRelation: "form_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: true
            referencedRelation: "full_form_response_view"
            referencedColumns: ["question_id"]
          },
        ]
      }
      form_question_responses: {
        Row: {
          created_at: string | null
          exam_response: Json | null
          form_response_id: string | null
          id: string
          number_response: number | null
          question_id: string | null
          rating_response: number | null
          text_response: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          exam_response?: Json | null
          form_response_id?: string | null
          id?: string
          number_response?: number | null
          question_id?: string | null
          rating_response?: number | null
          text_response?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          exam_response?: Json | null
          form_response_id?: string | null
          id?: string
          number_response?: number | null
          question_id?: string | null
          rating_response?: number | null
          text_response?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_question_responses_form_response_id_fkey"
            columns: ["form_response_id"]
            isOneToOne: false
            referencedRelation: "form_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_question_responses_form_response_id_fkey"
            columns: ["form_response_id"]
            isOneToOne: false
            referencedRelation: "full_form_response_view"
            referencedColumns: ["form_response_id"]
          },
          {
            foreignKeyName: "form_question_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "form_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_question_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "full_form_response_view"
            referencedColumns: ["question_id"]
          },
        ]
      }
      form_questions: {
        Row: {
          created_at: string | null
          form_id: string | null
          group_roles_id: string | null
          id: string
          is_required: boolean | null
          order_index: number
          question_text: string
          question_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          form_id?: string | null
          group_roles_id?: string | null
          id?: string
          is_required?: boolean | null
          order_index: number
          question_text: string
          question_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          form_id?: string | null
          group_roles_id?: string | null
          id?: string
          is_required?: boolean | null
          order_index?: number
          question_text?: string
          question_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_questions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_questions_group_roles_id_fkey"
            columns: ["group_roles_id"]
            isOneToOne: false
            referencedRelation: "group_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      form_responses: {
        Row: {
          class_id: string | null
          class_name: string | null
          created_at: string | null
          form_id: string | null
          id: string
          responder_type: string | null
          status: string
          student_id: string | null
          student_name: string | null
          submitted_at: string | null
          updated_at: string | null
        }
        Insert: {
          class_id?: string | null
          class_name?: string | null
          created_at?: string | null
          form_id?: string | null
          id?: string
          responder_type?: string | null
          status: string
          student_id?: string | null
          student_name?: string | null
          submitted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          class_id?: string | null
          class_name?: string | null
          created_at?: string | null
          form_id?: string | null
          id?: string
          responder_type?: string | null
          status?: string
          student_id?: string | null
          student_name?: string | null
          submitted_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_responses_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_responses_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      form_tag_links: {
        Row: {
          form_id: string
          tag_id: string
        }
        Insert: {
          form_id: string
          tag_id: string
        }
        Update: {
          form_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_tag_links_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_tag_links_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "form_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      form_tags: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      form_targets: {
        Row: {
          created_at: string | null
          form_id: string | null
          id: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string | null
          form_id?: string | null
          id?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string | null
          form_id?: string | null
          id?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_targets_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          created_at: string | null
          creator_id: string | null
          description: string | null
          group_id: string | null
          id: string
          sent_at: string | null
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          group_id?: string | null
          id?: string
          sent_at?: string | null
          status: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          group_id?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forms_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forms_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_member: {
        Row: {
          group_id: string | null
          group_role_id: string | null
          id: string
          joined_at: string | null
          user_id: string | null
        }
        Insert: {
          group_id?: string | null
          group_role_id?: string | null
          id?: string
          joined_at?: string | null
          user_id?: string | null
        }
        Update: {
          group_id?: string | null
          group_role_id?: string | null
          id?: string
          joined_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_member_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_member_group_role_id_fkey"
            columns: ["group_role_id"]
            isOneToOne: false
            referencedRelation: "group_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_member_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      group_roles: {
        Row: {
          can_create_form: boolean | null
          can_delete_form: boolean | null
          can_invite: boolean | null
          can_manage_roles: boolean | null
          created_at: string | null
          group_id: string | null
          id: string
          name: string | null
        }
        Insert: {
          can_create_form?: boolean | null
          can_delete_form?: boolean | null
          can_invite?: boolean | null
          can_manage_roles?: boolean | null
          created_at?: string | null
          group_id?: string | null
          id?: string
          name?: string | null
        }
        Update: {
          can_create_form?: boolean | null
          can_delete_form?: boolean | null
          can_invite?: boolean | null
          can_manage_roles?: boolean | null
          created_at?: string | null
          group_id?: string | null
          id?: string
          name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_roles_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string | null
          owner_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string | null
          owner_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string | null
          owner_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string | null
          expires_at: string | null
          group_id: string | null
          group_roles_id: string | null
          id: string
          invitee_email: string | null
          invitee_id: string | null
          invitee_phone: string | null
          inviter_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          group_id?: string | null
          group_roles_id?: string | null
          id?: string
          invitee_email?: string | null
          invitee_id?: string | null
          invitee_phone?: string | null
          inviter_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          group_id?: string | null
          group_roles_id?: string | null
          id?: string
          invitee_email?: string | null
          invitee_id?: string | null
          invitee_phone?: string | null
          inviter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_group_roles_id_fkey"
            columns: ["group_roles_id"]
            isOneToOne: false
            referencedRelation: "group_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          content: string | null
          created_at: string | null
          creator_id: string | null
          expires_at: string | null
          group_id: string | null
          id: string
          is_read: boolean | null
          related_id: string
          target_id: string | null
          title: string | null
          type: string | null
        }
        Insert: {
          action_url?: string | null
          content?: string | null
          created_at?: string | null
          creator_id?: string | null
          expires_at?: string | null
          group_id?: string | null
          id?: string
          is_read?: boolean | null
          related_id: string
          target_id?: string | null
          title?: string | null
          type?: string | null
        }
        Update: {
          action_url?: string | null
          content?: string | null
          created_at?: string | null
          creator_id?: string | null
          expires_at?: string | null
          group_id?: string | null
          id?: string
          is_read?: boolean | null
          related_id?: string
          target_id?: string | null
          title?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rating_questions: {
        Row: {
          question_id: string
          rating_max: number
          rating_step: number
        }
        Insert: {
          question_id: string
          rating_max: number
          rating_step: number
        }
        Update: {
          question_id?: string
          rating_max?: number
          rating_step?: number
        }
        Relationships: [
          {
            foreignKeyName: "rating_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: true
            referencedRelation: "form_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rating_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: true
            referencedRelation: "full_form_response_view"
            referencedColumns: ["question_id"]
          },
        ]
      }
      reports: {
        Row: {
          class_name: string | null
          created_at: string | null
          draft_status: string | null
          form_id: string | null
          form_response_id: string | null
          id: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          stage: number | null
          student_name: string | null
          supervision_id: string | null
          teacher_comment: string | null
          teacher_completed_at: string | null
          teacher_id: string | null
          time_teacher_comment: string | null
          time_teacher_completed_at: string | null
          time_teacher_id: string | null
          updated_at: string | null
        }
        Insert: {
          class_name?: string | null
          created_at?: string | null
          draft_status?: string | null
          form_id?: string | null
          form_response_id?: string | null
          id?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          stage?: number | null
          student_name?: string | null
          supervision_id?: string | null
          teacher_comment?: string | null
          teacher_completed_at?: string | null
          teacher_id?: string | null
          time_teacher_comment?: string | null
          time_teacher_completed_at?: string | null
          time_teacher_id?: string | null
          updated_at?: string | null
        }
        Update: {
          class_name?: string | null
          created_at?: string | null
          draft_status?: string | null
          form_id?: string | null
          form_response_id?: string | null
          id?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          stage?: number | null
          student_name?: string | null
          supervision_id?: string | null
          teacher_comment?: string | null
          teacher_completed_at?: string | null
          teacher_id?: string | null
          time_teacher_comment?: string | null
          time_teacher_completed_at?: string | null
          time_teacher_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_form_response_id_fkey"
            columns: ["form_response_id"]
            isOneToOne: false
            referencedRelation: "form_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_form_response_id_fkey"
            columns: ["form_response_id"]
            isOneToOne: false
            referencedRelation: "full_form_response_view"
            referencedColumns: ["form_response_id"]
          },
          {
            foreignKeyName: "reports_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_supervision_id_fkey"
            columns: ["supervision_id"]
            isOneToOne: false
            referencedRelation: "supervision_mappings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_time_teacher_id_fkey"
            columns: ["time_teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      supervision_mappings: {
        Row: {
          created_at: string | null
          group_id: string | null
          id: string
          teacher_id: string | null
          time_teacher_id: string | null
        }
        Insert: {
          created_at?: string | null
          group_id?: string | null
          id?: string
          teacher_id?: string | null
          time_teacher_id?: string | null
        }
        Update: {
          created_at?: string | null
          group_id?: string | null
          id?: string
          teacher_id?: string | null
          time_teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supervision_mappings_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supervision_mappings_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supervision_mappings_time_teacher_id_fkey"
            columns: ["time_teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          birth_date: string
          created_at: string | null
          deleted_at: string | null
          education: string | null
          email: string
          id: string
          name: string
          nickname: string
          password: string
          phone: string
          updated_at: string | null
        }
        Insert: {
          birth_date: string
          created_at?: string | null
          deleted_at?: string | null
          education?: string | null
          email: string
          id?: string
          name: string
          nickname: string
          password: string
          phone: string
          updated_at?: string | null
        }
        Update: {
          birth_date?: string
          created_at?: string | null
          deleted_at?: string | null
          education?: string | null
          email?: string
          id?: string
          name?: string
          nickname?: string
          password?: string
          phone?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      full_form_response_view: {
        Row: {
          class_id: string | null
          class_name: string | null
          exam_response: Json | null
          form_id: string | null
          form_response_id: string | null
          is_required: boolean | null
          number_response: number | null
          question_id: string | null
          question_text: string | null
          question_type: string | null
          rating_response: number | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          report_created_at: string | null
          report_draft_status: string | null
          report_id: string | null
          report_updated_at: string | null
          stage: number | null
          student_form_status: string | null
          student_id: string | null
          student_name: string | null
          student_submitted_at: string | null
          teacher_comment: string | null
          teacher_completed_at: string | null
          teacher_id: string | null
          text_response: string | null
          time_teacher_comment: string | null
          time_teacher_completed_at: string | null
          time_teacher_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_responses_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_responses_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_time_teacher_id_fkey"
            columns: ["time_teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      cleanup_old_notifications: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      expire_old_invitations: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
