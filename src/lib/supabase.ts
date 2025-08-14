import { createClient, PostgrestError } from "@supabase/supabase-js";
import { Database } from "./types/types";

// 환경 변수 체크
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL 환경 변수가 설정되지 않았습니다. .env.local 파일을 확인해주세요."
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY 환경 변수가 설정되지 않았습니다. .env.local 파일을 확인해주세요."
  );
}

if (!supabaseServiceRoleKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY 환경 변수가 설정되지 않았습니다. .env.local 파일을 확인해주세요."
  );
}

// 싱글톤 패턴으로 클라이언트 인스턴스 관리
let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;
let supabaseAdminInstance: ReturnType<typeof createClient<Database>> | null = null;

// 클라이언트용 Supabase 인스턴스
export const supabase = (() => {
  if (!supabaseInstance) {
    supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  }
  return supabaseInstance;
})();

// 서버용 Supabase 인스턴스 (Row Level Security 우회)
export const supabaseAdmin = (() => {
  if (!supabaseAdminInstance) {
    supabaseAdminInstance = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return supabaseAdminInstance;
})();

// 교육 수준 enum 정의
export const EDUCATION_LEVELS = {
  ELEM_1: "초1",
  ELEM_2: "초2",
  ELEM_3: "초3",
  ELEM_4: "초4",
  ELEM_5: "초5",
  ELEM_6: "초6",
  MIDDLE_1: "중1",
  MIDDLE_2: "중2",
  MIDDLE_3: "중3",
  HIGH_1: "고1",
  HIGH_2: "고2",
  HIGH_3: "고3",
  ADULT: "성인",
} as const;

export type EducationLevel = (typeof EDUCATION_LEVELS)[keyof typeof EDUCATION_LEVELS];

// 비밀번호 검증 함수
export const validatePassword = (password: string): boolean => {
  // 8자리 이상, 영어와 숫자 포함
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const isLongEnough = password.length >= 8;

  return hasLetter && hasNumber && isLongEnough;
};

// 이메일 검증 함수
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// 전화번호 검증 함수 (한국 전화번호 형식)
export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^01[0-9]-\d{4}-\d{4}$/;
  return phoneRegex.test(phone);
};

// 데이터베이스 타입 다시 export (편의성을 위해)
export type User = Database["public"]["Tables"]["users"]["Row"];
export type UserInsert = Database["public"]["Tables"]["users"]["Insert"];
export type UserUpdate = Database["public"]["Tables"]["users"]["Update"];

export type Group = Database["public"]["Tables"]["groups"]["Row"];
export type GroupInsert = Database["public"]["Tables"]["groups"]["Insert"];
export type GroupUpdate = Database["public"]["Tables"]["groups"]["Update"];

export type GroupMember = Database["public"]["Tables"]["group_member"]["Row"];
export type GroupMemberInsert = Database["public"]["Tables"]["group_member"]["Insert"];
export type GroupMemberUpdate = Database["public"]["Tables"]["group_member"]["Update"];

export type GroupRole = Database["public"]["Tables"]["group_roles"]["Row"];
export type GroupRoleInsert = Database["public"]["Tables"]["group_roles"]["Insert"];
export type GroupRoleUpdate = Database["public"]["Tables"]["group_roles"]["Update"];

export type Invitation = Database["public"]["Tables"]["invitations"]["Row"];
export type InvitationInsert = Database["public"]["Tables"]["invitations"]["Insert"];
export type InvitationUpdate = Database["public"]["Tables"]["invitations"]["Update"];

export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"];
export type NotificationUpdate = Database["public"]["Tables"]["notifications"]["Update"];

export type FormTarget = Database["public"]["Tables"]["form_targets"]["Row"];
export type FormTargetInsert = Database["public"]["Tables"]["form_targets"]["Insert"];
export type FormTargetUpdate = Database["public"]["Tables"]["form_targets"]["Update"];

export type Form = Database["public"]["Tables"]["forms"]["Row"];
export type FormInsert = Database["public"]["Tables"]["forms"]["Insert"];
export type FormUpdate = Database["public"]["Tables"]["forms"]["Update"];

export type FormQuestion = Database["public"]["Tables"]["form_questions"]["Row"];
export type FormQuestionInsert = Database["public"]["Tables"]["form_questions"]["Insert"];
export type FormQuestionUpdate = Database["public"]["Tables"]["form_questions"]["Update"];

export type FormResponse = Database["public"]["Tables"]["form_responses"]["Row"];
export type FormResponseInsert = Database["public"]["Tables"]["form_responses"]["Insert"];
export type FormResponseUpdate = Database["public"]["Tables"]["form_responses"]["Update"];

export type FormQuestionResponse = Database["public"]["Tables"]["form_question_responses"]["Row"];
export type FormQuestionResponseInsert =
  Database["public"]["Tables"]["form_question_responses"]["Insert"];
export type FormQuestionResponseUpdate =
  Database["public"]["Tables"]["form_question_responses"]["Update"];

export type Report = Database["public"]["Tables"]["reports"]["Row"];
export type ReportInsert = Database["public"]["Tables"]["reports"]["Insert"];
export type ReportUpdate = Database["public"]["Tables"]["reports"]["Update"];

export type Class = Database["public"]["Tables"]["classes"]["Row"];
export type ClassInsert = Database["public"]["Tables"]["classes"]["Insert"];
export type ClassUpdate = Database["public"]["Tables"]["classes"]["Update"];

export type ClassMember = Database["public"]["Tables"]["class_members"]["Row"];
export type ClassMemberInsert = Database["public"]["Tables"]["class_members"]["Insert"];
export type ClassMemberUpdate = Database["public"]["Tables"]["class_members"]["Update"];

// 통계 및 분석을 위한 유틸리티 타입들
export interface DatabaseStats {
  totalUsers: number;
  totalGroups: number;
  totalForms: number;
  totalReports: number;
}

export interface UserStats {
  groupCount: number;
  formCount: number;
  reportCount: number;
  invitationCount: number;
}

export interface GroupStats {
  memberCount: number;
  formCount: number;
  roleCount: number;
  invitationCount: number;
}

// 권한 검사를 위한 유틸리티 함수들
export const hasPermission = (
  userRole: GroupRole | null,
  permission: keyof Pick<
    GroupRole,
    "can_invite" | "can_manage_roles" | "can_create_form" | "can_delete_form"
  >
): boolean => {
  if (!userRole) return false;
  return Boolean(userRole[permission]);
};

export const isGroupOwner = (group: Group, userId: string): boolean => {
  return group.owner_id === userId;
};

export const isGroupMember = (members: GroupMember[], userId: string): boolean => {
  return members.some((member) => member.user_id === userId);
};

// 날짜 유틸리티 함수들
export const isExpired = (expiresAt: string | null): boolean => {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
};

export const getDaysUntilExpiry = (expiresAt: string | null): number | null => {
  if (!expiresAt) return null;
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export const formatDate = (
  dateString: string | null,
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!dateString) return "알 수 없음";

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };

  return new Date(dateString).toLocaleDateString("ko-KR", options || defaultOptions);
};

export const sortByField = <T>(
  items: T[],
  field: keyof T,
  direction: "asc" | "desc" = "asc"
): T[] => {
  return [...items].sort((a, b) => {
    const aValue = a[field];
    const bValue = b[field];

    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;

    if (aValue < bValue) return direction === "asc" ? -1 : 1;
    if (aValue > bValue) return direction === "asc" ? 1 : -1;
    return 0;
  });
};

// 타입 가드 함수들
export const isValidEducationLevel = (value: string): value is EducationLevel => {
  return Object.values(EDUCATION_LEVELS).includes(value as EducationLevel);
};

export const isUser = (obj: User): obj is User => {
  return obj && typeof obj.id === "string" && typeof obj.email === "string";
};

export const isGroup = (obj: Group): obj is Group => {
  return obj && typeof obj.id === "string" && typeof obj.name === "string";
};

// 에러 처리를 위한 유틸리티
export const getErrorMessage = (
  error: string | Error | PostgrestError | null | undefined
): string => {
  if (!error) return "알 수 없는 오류가 발생했습니다.";
  if (typeof error === "string") return error;
  if ("message" in error && typeof error.message === "string") {
    return error.message;
  }
  if ("details" in error && typeof error.details === "string") {
    return error.details;
  }
  return "알 수 없는 오류가 발생했습니다.";
};
