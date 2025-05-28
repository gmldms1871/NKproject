// types/index.ts
import type { Database } from "./supabase";

// 기본 테이블 타입 추출
export type Group = Database["public"]["Tables"]["groups"]["Row"];
export type GroupInsert = Database["public"]["Tables"]["groups"]["Insert"];
export type GroupUpdate = Database["public"]["Tables"]["groups"]["Update"];

export type GroupMember = Database["public"]["Tables"]["group_members"]["Row"];
export type GroupMemberInsert = Database["public"]["Tables"]["group_members"]["Insert"];
export type GroupMemberUpdate = Database["public"]["Tables"]["group_members"]["Update"];

export type Report = Database["public"]["Tables"]["reports"]["Row"];
export type ReportInsert = Database["public"]["Tables"]["reports"]["Insert"];
export type ReportUpdate = Database["public"]["Tables"]["reports"]["Update"];

export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
export type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];

export type User = Database["public"]["Tables"]["users"]["Row"];
export type UserInsert = Database["public"]["Tables"]["users"]["Insert"];
export type UserUpdate = Database["public"]["Tables"]["users"]["Update"];

export type InputSetting = Database["public"]["Tables"]["input_settings"]["Row"];
export type InputSettingInsert = Database["public"]["Tables"]["input_settings"]["Insert"];
export type InputSettingUpdate = Database["public"]["Tables"]["input_settings"]["Update"];

export type UndefinedInput = Database["public"]["Tables"]["undefined_inputs"]["Row"];
export type UndefinedInputInsert = Database["public"]["Tables"]["undefined_inputs"]["Insert"];
export type UndefinedInputUpdate = Database["public"]["Tables"]["undefined_inputs"]["Update"];

// 새로 추가된 학생 평가 시스템 테이블 타입들
export type Student = Database["public"]["Tables"]["students"]["Row"];
export type StudentInsert = Database["public"]["Tables"]["students"]["Insert"];
export type StudentUpdate = Database["public"]["Tables"]["students"]["Update"];

export type FormTemplate = Database["public"]["Tables"]["form_templates"]["Row"];
export type FormTemplateInsert = Database["public"]["Tables"]["form_templates"]["Insert"];
export type FormTemplateUpdate = Database["public"]["Tables"]["form_templates"]["Update"];

export type FormField = Database["public"]["Tables"]["form_fields"]["Row"];
export type FormFieldInsert = Database["public"]["Tables"]["form_fields"]["Insert"];
export type FormFieldUpdate = Database["public"]["Tables"]["form_fields"]["Update"];

export type QuestionConcept = Database["public"]["Tables"]["question_concepts"]["Row"];
export type QuestionConceptInsert = Database["public"]["Tables"]["question_concepts"]["Insert"];
export type QuestionConceptUpdate = Database["public"]["Tables"]["question_concepts"]["Update"];

export type FormInstance = Database["public"]["Tables"]["form_instances"]["Row"];
export type FormInstanceInsert = Database["public"]["Tables"]["form_instances"]["Insert"];
export type FormInstanceUpdate = Database["public"]["Tables"]["form_instances"]["Update"];

export type FormResponse = Database["public"]["Tables"]["form_responses"]["Row"];
export type FormResponseInsert = Database["public"]["Tables"]["form_responses"]["Insert"];
export type FormResponseUpdate = Database["public"]["Tables"]["form_responses"]["Update"];

export type StudentReport = Database["public"]["Tables"]["student_reports"]["Row"];
export type StudentReportInsert = Database["public"]["Tables"]["student_reports"]["Insert"];
export type StudentReportUpdate = Database["public"]["Tables"]["student_reports"]["Update"];

// 확장된 타입 정의
export interface FormattedGroupMember {
  id: string;
  group_id: string;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  role: string | null;
  invited_at: string | null;
  accepted_at: string | null;
}

// 확장된 Report 타입 (프론트엔드에서 필요한 추가 필드 포함)
export interface FormattedReport {
  id: string;
  content: string;
  group_id: string | null;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  created_at: string;
  summary: string | null;
  reviewed: boolean | null;
  auther_id: string;
  title: string;
  updated_at: string;
}

export interface ReportStatistics {
  total: number;
  byUser: Array<{
    userId: string;
    userName: string;
    count: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    count: number;
  }>;
}

// 확장된 InputSetting 타입
export interface ExtendedInputSetting {
  id: string;
  group_id: string;
  field_name: string;
  field_type: string;
  is_inquired: boolean | null;
  created_at: string;
  // Frontend-specific fields
  options?: string[];
  is_required?: boolean | null;
}

// 학생 평가 시스템 확장 타입들
export interface FormattedStudent {
  id: string;
  name: string;
  student_number: string | null;
  class_name: string | null;
  group_id: string | null;
  phone: string | null;
  parent_phone: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface FormattedFormTemplate {
  id: string;
  group_id: string | null;
  title: string;
  description: string | null;
  exam_type: string | null;
  test_range: string | null;
  total_questions: number | null;
  difficulty_level: number | null;
  created_by: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  form_fields?: FormField[];
  question_concepts?: QuestionConcept[];
}

export interface FormattedFormField {
  id: string;
  form_template_id: string | null;
  field_name: string;
  field_type: string;
  is_required: boolean | null;
  options: any | null;
  filled_by_role: string;
  order_index: number;
  placeholder: string | null;
  help_text: string | null;
  created_at: string | null;
}

export interface FormattedFormInstance {
  id: string;
  form_template_id: string | null;
  student_id: string | null;
  group_id: string | null;
  status: string | null;
  class_average: number | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string | null;
  form_template?: FormTemplate;
  student?: Student;
  form_responses?: FormResponse[];
}

export interface FormattedStudentReport {
  id: string;
  form_instance_id: string | null;
  student_id: string | null;
  group_id: string | null;
  raw_report: string | null;
  ai_report: string | null;
  final_report: string | null;
  status: string | null;
  reviewed_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  form_instance?: FormInstance;
  student?: Student;
}

// 열거형 타입들
export type FormFieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "rating"
  | "checkbox"
  | "radio";

export type UserRole = "student" | "teacher" | "part_time" | "admin";

export type FormInstanceStatus = "pending" | "in_progress" | "completed" | "reviewed";

export type StudentReportStatus = "draft" | "ai_generated" | "reviewed" | "published";

// 사용자 정의 타입
export interface UserWithEmail {
  id: string;
  email: string;
}

export interface GroupMemberWithUser {
  id: string;
  role: string | null;
  invited_at: string | null;
  accepted_at: string | null;
  users: {
    id: string;
    name: string | null;
    email: string;
  };
  groups?: {
    id: string;
    name: string;
    created_at: string;
    owner_id: string;
  };
}

export interface ReportWithUser {
  id: string;
  content: string;
  created_at: string;
  summary: string | null;
  reviewed: boolean | null;
  users: {
    id: string;
    name: string | null;
    email: string;
  };
}

// 폼 관련 확장 타입들
export interface FormWithFields extends FormTemplate {
  form_fields: FormField[];
  question_concepts: QuestionConcept[];
}

export interface FormInstanceWithDetails extends FormInstance {
  form_template: FormTemplate;
  student: Student;
  form_responses: FormResponse[];
}

export interface StudentWithReports extends Student {
  student_reports: StudentReport[];
  form_instances: FormInstance[];
}

// 통계 관련 타입들
export interface StudentEvaluationStatistics {
  totalStudents: number;
  totalForms: number;
  completedEvaluations: number;
  pendingEvaluations: number;
  averageScore: number | null;
  byClass: Array<{
    className: string;
    studentCount: number;
    averageScore: number | null;
  }>;
  monthlyTrend: Array<{
    month: string;
    evaluationCount: number;
  }>;
}
