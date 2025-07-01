import { createClient } from "@supabase/supabase-js";
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

// 클라이언트용 Supabase 인스턴스
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// 서버용 Supabase 인스턴스 (Row Level Security 우회)
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

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
