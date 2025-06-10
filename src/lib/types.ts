// lib/types.ts
// 데이터베이스 기본 타입을 확장한 비즈니스 로직용 타입들

import type { Database } from "../../types/supabase";

// 기본 테이블 타입들
export type User = Database["public"]["Tables"]["users"]["Row"];
export type Group = Database["public"]["Tables"]["groups"]["Row"];
export type GroupMember = Database["public"]["Tables"]["group_members"]["Row"];
export type Class = Database["public"]["Tables"]["classes"]["Row"];
export type ClassMember = Database["public"]["Tables"]["class_members"]["Row"];
export type FormTemplate = Database["public"]["Tables"]["form_templates"]["Row"];
export type FormField = Database["public"]["Tables"]["form_fields"]["Row"];
export type FormInstance = Database["public"]["Tables"]["form_instances"]["Row"];
export type FormResponse = Database["public"]["Tables"]["form_responses"]["Row"];
export type Invitation = Database["public"]["Tables"]["invitations"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type Report = Database["public"]["Tables"]["reports"]["Row"];
export type QuestionConcept = Database["public"]["Tables"]["question_concepts"]["Row"];

// Insert 타입들
export type UserInsert = Database["public"]["Tables"]["users"]["Insert"];
export type GroupInsert = Database["public"]["Tables"]["groups"]["Insert"];
export type GroupMemberInsert = Database["public"]["Tables"]["group_members"]["Insert"];
export type ClassInsert = Database["public"]["Tables"]["classes"]["Insert"];
export type ClassMemberInsert = Database["public"]["Tables"]["class_members"]["Insert"];
export type FormTemplateInsert = Database["public"]["Tables"]["form_templates"]["Insert"];
export type FormFieldInsert = Database["public"]["Tables"]["form_fields"]["Insert"];
export type FormInstanceInsert = Database["public"]["Tables"]["form_instances"]["Insert"];
export type FormResponseInsert = Database["public"]["Tables"]["form_responses"]["Insert"];
export type InvitationInsert = Database["public"]["Tables"]["invitations"]["Insert"];
export type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"];
export type ReportInsert = Database["public"]["Tables"]["reports"]["Insert"];
export type QuestionConceptInsert = Database["public"]["Tables"]["question_concepts"]["Insert"];

// Update 타입들
export type UserUpdate = Database["public"]["Tables"]["users"]["Update"];
export type GroupUpdate = Database["public"]["Tables"]["groups"]["Update"];
export type GroupMemberUpdate = Database["public"]["Tables"]["group_members"]["Update"];
export type ClassUpdate = Database["public"]["Tables"]["classes"]["Update"];
export type ClassMemberUpdate = Database["public"]["Tables"]["class_members"]["Update"];
export type FormTemplateUpdate = Database["public"]["Tables"]["form_templates"]["Update"];
export type FormFieldUpdate = Database["public"]["Tables"]["form_fields"]["Update"];
export type FormInstanceUpdate = Database["public"]["Tables"]["form_instances"]["Update"];
export type FormResponseUpdate = Database["public"]["Tables"]["form_responses"]["Update"];
export type InvitationUpdate = Database["public"]["Tables"]["invitations"]["Update"];
export type NotificationUpdate = Database["public"]["Tables"]["notifications"]["Update"];
export type ReportUpdate = Database["public"]["Tables"]["reports"]["Update"];
export type QuestionConceptUpdate = Database["public"]["Tables"]["question_concepts"]["Update"];

// 열거형 타입들 (DB에서 string으로 정의된 것들)
export type UserRole = "admin" | "teacher" | "part_time" | "student";
export type InvitationStatus = "pending" | "accepted" | "rejected" | "expired";
export type FormInstanceStatus =
  | "not_started"
  | "student_completed"
  | "part_time_completed"
  | "teacher_completed"
  | "final_completed";
export type ReportStatus = "stage_0" | "stage_1" | "stage_2" | "completed";
export type NotificationType = "invitation" | "form_assigned" | "form_rejected" | "report_ready";
export type FormFieldType =
  | "text"
  | "phone"
  | "number"
  | "word"
  | "money"
  | "rating"
  | "exam_number"
  | "textarea";
export type FormFieldFilledBy = "student" | "part_time" | "teacher";

// 확장된 타입들 (관계 데이터 포함)
export interface UserWithGroups extends User {
  group_members: (GroupMember & {
    groups: Group;
  })[];
}

export interface GroupWithMembers extends Group {
  group_members: (GroupMember & {
    users: User;
  })[];
  classes: Class[];
  _count?: {
    group_members: number;
    classes: number;
    form_templates: number;
  };
}

export interface ClassWithMembers extends Class {
  class_members: (ClassMember & {
    users: User;
  })[];
  _count?: {
    students: number;
    part_time_teachers: number;
  };
}

export interface FormTemplateWithFields extends FormTemplate {
  form_fields: FormField[];
  question_concepts: QuestionConcept[];
  _count?: {
    form_instances: number;
  };
}

export interface FormInstanceWithDetails extends FormInstance {
  form_template: FormTemplateWithFields;
  student: User;
  form_responses: FormResponse[];
  reports?: Report[];
}

export interface ReportWithDetails extends Report {
  form_instance: FormInstanceWithDetails;
  reviewer?: User;
}

export interface InvitationWithDetails extends Invitation {
  group: Group;
  inviter: User;
  invitee: User;
}

export interface NotificationWithDetails extends Notification {
  sender?: User;
  group?: Group;
  form_template?: FormTemplate;
}

// 폼 관련 특화 타입들
export interface FormFieldOption {
  label: string;
  value: string | number;
}

export interface ExamNumberFieldData {
  total_questions: number;
  concepts: string[];
}

export interface FormFieldWithOptions extends FormField {
  options?: FormFieldOption[] | ExamNumberFieldData;
}

export interface FormResponseValue {
  field_id: string;
  value:
    | string
    | number
    | string[]
    | {
        answer: number | string;
        explanation?: string;
      }; // exam_number의 경우 객체 형태
}

// 통계 관련 타입들
export interface GroupStatistics {
  total_students: number;
  total_teachers: number;
  total_part_time: number;
  total_classes: number;
  total_forms: number;
  completed_forms: number;
  pending_forms: number;
  completion_rate: number;
}

export interface ClassStatistics {
  class_id: string;
  class_name: string;
  student_count: number;
  teacher_count: number;
  completion_rate: number;
  average_score?: number;
}

export interface FormStatistics {
  form_id: string;
  form_title: string;
  total_assigned: number;
  completed: number;
  in_progress: number;
  not_started: number;
  completion_rate: number;
  average_score?: number;
  class_stats: ClassStatistics[];
}

export interface StudentProgress {
  student_id: string;
  student_name: string;
  class_name: string;
  total_forms: number;
  completed_forms: number;
  pending_forms: number;
  completion_rate: number;
  recent_activity?: Date;
}

// API 응답 타입들
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> extends APIResponse<T> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// 폼 생성/수정을 위한 타입들
export interface CreateFormData {
  title: string;
  description?: string;
  group_id: string;
  fields: Omit<FormFieldInsert, "form_template_id" | "id">[];
  question_concepts?: Omit<QuestionConceptInsert, "form_template_id" | "id">[];
}

export interface UpdateFormData {
  title?: string;
  description?: string;
  fields?: FormFieldUpdate[];
  question_concepts?: QuestionConceptUpdate[];
}

// 보고서 관련 타입들
export interface CreateReportData {
  form_instance_id: string;
  content: string;
  stage: ReportStatus;
  reviewed_by?: string;
}

export interface UpdateReportData {
  content?: string;
  stage?: ReportStatus;
  reviewed_by?: string;
  final_report_url?: string;
}

// 알림 관련 타입들
export interface CreateNotificationData {
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  group_id?: string;
  form_template_id?: string;
  metadata?: Record<string, any>;
}

// 초대 관련 타입들
export interface CreateInvitationData {
  group_id: string;
  email: string;
  role: UserRole;
  expires_at?: string;
}

// 검색/필터 관련 타입들
export interface SearchFilters {
  query?: string;
  role?: UserRole;
  status?: string;
  class_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface SortOptions {
  field: string;
  direction: "asc" | "desc";
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

// 사용자 인증 관련 타입들
export interface AuthUser {
  id: string;
  email: string;
  role?: UserRole;
  current_group_id?: string;
}

export interface UserSession {
  user: AuthUser;
  groups: GroupWithMembers[];
  current_group?: GroupWithMembers;
  permissions: string[];
}

// 권한 관련 타입들
export interface Permission {
  action: string;
  resource: string;
  conditions?: Record<string, any>;
}

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
}

// 실시간 업데이트 관련 타입들
export interface RealtimeEvent<T = any> {
  event: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: T;
  old_record?: T;
}

// 에러 타입들
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface APIError {
  message: string;
  code?: string;
  status?: number;
  details?: ValidationError[];
}

// 유틸리티 타입들
export type OptionalExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;
export type RequiredExcept<T, K extends keyof T> = Required<T> & Partial<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
