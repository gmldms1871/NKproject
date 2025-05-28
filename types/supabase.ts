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
      form_fields: {
        Row: {
          created_at: string | null
          field_name: string
          field_type: string
          filled_by_role: string
          form_template_id: string | null
          help_text: string | null
          id: string
          is_required: boolean | null
          options: Json | null
          order_index: number
          placeholder: string | null
        }
        Insert: {
          created_at?: string | null
          field_name: string
          field_type: string
          filled_by_role: string
          form_template_id?: string | null
          help_text?: string | null
          id?: string
          is_required?: boolean | null
          options?: Json | null
          order_index: number
          placeholder?: string | null
        }
        Update: {
          created_at?: string | null
          field_name?: string
          field_type?: string
          filled_by_role?: string
          form_template_id?: string | null
          help_text?: string | null
          id?: string
          is_required?: boolean | null
          options?: Json | null
          order_index?: number
          placeholder?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_fields_form_template_id_fkey"
            columns: ["form_template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      form_instances: {
        Row: {
          class_average: number | null
          created_at: string | null
          form_template_id: string | null
          group_id: string | null
          id: string
          reviewed_at: string | null
          status: string | null
          student_id: string | null
          submitted_at: string | null
        }
        Insert: {
          class_average?: number | null
          created_at?: string | null
          form_template_id?: string | null
          group_id?: string | null
          id?: string
          reviewed_at?: string | null
          status?: string | null
          student_id?: string | null
          submitted_at?: string | null
        }
        Update: {
          class_average?: number | null
          created_at?: string | null
          form_template_id?: string | null
          group_id?: string | null
          id?: string
          reviewed_at?: string | null
          status?: string | null
          student_id?: string | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_instances_form_template_id_fkey"
            columns: ["form_template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_instances_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_instances_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      form_responses: {
        Row: {
          form_field_id: string | null
          form_instance_id: string | null
          id: string
          submitted_at: string | null
          submitted_by: string | null
          submitted_by_role: string | null
          value: string | null
        }
        Insert: {
          form_field_id?: string | null
          form_instance_id?: string | null
          id?: string
          submitted_at?: string | null
          submitted_by?: string | null
          submitted_by_role?: string | null
          value?: string | null
        }
        Update: {
          form_field_id?: string | null
          form_instance_id?: string | null
          id?: string
          submitted_at?: string | null
          submitted_by?: string | null
          submitted_by_role?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_responses_form_field_id_fkey"
            columns: ["form_field_id"]
            isOneToOne: false
            referencedRelation: "form_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_responses_form_instance_id_fkey"
            columns: ["form_instance_id"]
            isOneToOne: false
            referencedRelation: "form_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      form_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          difficulty_level: number | null
          exam_type: string | null
          group_id: string | null
          id: string
          is_active: boolean | null
          test_range: string | null
          title: string
          total_questions: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty_level?: number | null
          exam_type?: string | null
          group_id?: string | null
          id?: string
          is_active?: boolean | null
          test_range?: string | null
          title: string
          total_questions?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty_level?: number | null
          exam_type?: string | null
          group_id?: string | null
          id?: string
          is_active?: boolean | null
          test_range?: string | null
          title?: string
          total_questions?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_templates_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          accepted_at: string | null
          group_id: string | null
          id: string
          invited_at: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          group_id?: string | null
          id?: string
          invited_at?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          group_id?: string | null
          id?: string
          invited_at?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
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
      input_settings: {
        Row: {
          created_at: string
          field_name: string
          field_type: string
          group_id: string
          id: string
          is_inquired: boolean | null
        }
        Insert: {
          created_at?: string
          field_name: string
          field_type: string
          group_id: string
          id?: string
          is_inquired?: boolean | null
        }
        Update: {
          created_at?: string
          field_name?: string
          field_type?: string
          group_id?: string
          id?: string
          is_inquired?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      question_concepts: {
        Row: {
          concept: string
          created_at: string | null
          difficulty_level: string | null
          form_template_id: string | null
          id: string
          question_number: number
        }
        Insert: {
          concept: string
          created_at?: string | null
          difficulty_level?: string | null
          form_template_id?: string | null
          id?: string
          question_number: number
        }
        Update: {
          concept?: string
          created_at?: string | null
          difficulty_level?: string | null
          form_template_id?: string | null
          id?: string
          question_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "question_concepts_form_template_id_fkey"
            columns: ["form_template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          auther_id: string
          content: string
          created_at: string
          group_id: string
          id: string
          reviewed: boolean | null
          summary: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          auther_id: string
          content: string
          created_at?: string
          group_id: string
          id?: string
          reviewed?: boolean | null
          summary?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          auther_id?: string
          content?: string
          created_at?: string
          group_id?: string
          id?: string
          reviewed?: boolean | null
          summary?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "input_settings_auther_id_fkey"
            columns: ["auther_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "input_settings_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      student_reports: {
        Row: {
          ai_report: string | null
          created_at: string | null
          final_report: string | null
          form_instance_id: string | null
          group_id: string | null
          id: string
          raw_report: string | null
          reviewed_by: string | null
          status: string | null
          student_id: string | null
          updated_at: string | null
        }
        Insert: {
          ai_report?: string | null
          created_at?: string | null
          final_report?: string | null
          form_instance_id?: string | null
          group_id?: string | null
          id?: string
          raw_report?: string | null
          reviewed_by?: string | null
          status?: string | null
          student_id?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_report?: string | null
          created_at?: string | null
          final_report?: string | null
          form_instance_id?: string | null
          group_id?: string | null
          id?: string
          raw_report?: string | null
          reviewed_by?: string | null
          status?: string | null
          student_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_reports_form_instance_id_fkey"
            columns: ["form_instance_id"]
            isOneToOne: false
            referencedRelation: "form_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_reports_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_reports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          class_name: string | null
          created_at: string | null
          group_id: string | null
          id: string
          name: string
          parent_phone: string | null
          phone: string | null
          student_number: string | null
          updated_at: string | null
        }
        Insert: {
          class_name?: string | null
          created_at?: string | null
          group_id?: string | null
          id?: string
          name: string
          parent_phone?: string | null
          phone?: string | null
          student_number?: string | null
          updated_at?: string | null
        }
        Update: {
          class_name?: string | null
          created_at?: string | null
          group_id?: string | null
          id?: string
          name?: string
          parent_phone?: string | null
          phone?: string | null
          student_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string | null
          description: string | null
          due_date: string | null
          group_id: string | null
          id: string
          status: string
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          group_id?: string | null
          id?: string
          status: string
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          group_id?: string | null
          id?: string
          status?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      undefined_inputs: {
        Row: {
          created_at: string
          field_id: string
          group_id: string
          id: string
          report_id: string | null
          value: string
        }
        Insert: {
          created_at?: string
          field_id: string
          group_id: string
          id?: string
          report_id?: string | null
          value: string
        }
        Update: {
          created_at?: string
          field_id?: string
          group_id?: string
          id?: string
          report_id?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "undefined_inputs_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "input_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "undefined_inputs_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "undefined_inputs_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string | null
          nick_name: string | null
          phone: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name?: string | null
          nick_name?: string | null
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          nick_name?: string | null
          phone?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
