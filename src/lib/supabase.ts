// lib/supabase.ts
// Supabase 클라이언트 설정 및 초기화

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/database.types";

// 환경 변수에서 Supabase URL과 API 키 가져오기
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL과 API 키가 환경 변수에 설정되어 있지 않습니다.");
}

// Supabase 클라이언트 생성
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // 자동 리프레시 설정
    autoRefreshToken: true,
    // 세션 지속성 설정
    persistSession: true,
    // 스토리지 키 설정
    storageKey: "group-platform-auth",
    // 리다이렉트 URL 감지 비활성화 (필요에 따라 조정)
    detectSessionInUrl: false,
  },
  realtime: {
    // 실시간 기능 설정
    params: {
      eventsPerSecond: 10,
    },
  },
  db: {
    // 데이터베이스 설정
    schema: "public",
  },
});

/**
 * 현재 인증된 사용자 가져오기
 * @returns 현재 사용자 또는 null
 */
export async function getCurrentUser() {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) {
      console.error("사용자 인증 오류:", error);
      return null;
    }
    return user;
  } catch (error) {
    console.error("getCurrentUser 오류:", error);
    return null;
  }
}

/**
 * 사용자 세션 가져오기
 * @returns 현재 세션 또는 null
 */
export async function getCurrentSession() {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error) {
      console.error("세션 조회 오류:", error);
      return null;
    }
    return session;
  } catch (error) {
    console.error("getCurrentSession 오류:", error);
    return null;
  }
}

/**
 * 인증 상태 변경 리스너 설정
 * @param callback 인증 상태 변경 시 호출될 콜백 함수
 * @returns 구독 해제 함수
 */
export function onAuthStateChange(callback: (event: string, session: any) => void) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(callback);

  return () => {
    subscription.unsubscribe();
  };
}

/**
 * 실시간 구독 설정 (테이블별)
 * @param table 테이블 명
 * @param callback 변경 사항 콜백
 * @param filter 필터 조건 (선택)
 * @returns 구독 해제 함수
 */
export function subscribeToTable(table: string, callback: (payload: any) => void, filter?: string) {
  let channel = supabase.channel(`${table}-changes`).on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table,
      filter,
    },
    callback
  );

  const subscription = channel.subscribe();

  return () => {
    subscription.unsubscribe();
  };
}

/**
 * 그룹별 실시간 구독 설정
 * @param groupId 그룹 ID
 * @param callbacks 테이블별 콜백 함수들
 * @returns 모든 구독 해제 함수
 */
export function subscribeToGroupChanges(
  groupId: string,
  callbacks: {
    onFormInstanceChange?: (payload: any) => void;
    onReportChange?: (payload: any) => void;
    onNotificationChange?: (payload: any) => void;
    onMemberChange?: (payload: any) => void;
  }
) {
  const unsubscribeFunctions: Array<() => void> = [];

  // 폼 인스턴스 변경 구독
  if (callbacks.onFormInstanceChange) {
    const unsubscribe1 = subscribeToTable(
      "form_instances",
      callbacks.onFormInstanceChange,
      `group_id=eq.${groupId}`
    );
    unsubscribeFunctions.push(unsubscribe1);
  }

  // 보고서 변경 구독
  if (callbacks.onReportChange) {
    const unsubscribe2 = subscribeToTable("reports", callbacks.onReportChange);
    unsubscribeFunctions.push(unsubscribe2);
  }

  // 알림 변경 구독
  if (callbacks.onNotificationChange) {
    const unsubscribe3 = subscribeToTable("notifications", callbacks.onNotificationChange);
    unsubscribeFunctions.push(unsubscribe3);
  }

  // 그룹 멤버 변경 구독
  if (callbacks.onMemberChange) {
    const unsubscribe4 = subscribeToTable(
      "group_members",
      callbacks.onMemberChange,
      `group_id=eq.${groupId}`
    );
    unsubscribeFunctions.push(unsubscribe4);
  }

  // 모든 구독 해제 함수 반환
  return () => {
    unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
  };
}

/**
 * 배치 작업용 트랜잭션 실행
 * @param operations 실행할 작업들
 * @returns 트랜잭션 결과
 */
export async function executeTransaction(
  operations: Array<() => Promise<any>>
): Promise<{ success: boolean; results?: any[]; error?: string }> {
  try {
    // Supabase는 네이티브 트랜잭션을 지원하지 않으므로
    // 순차적으로 실행하고 실패 시 롤백 시도
    const results = [];
    const rollbackOperations = [];

    for (const operation of operations) {
      try {
        const result = await operation();
        results.push(result);
        // 각 작업에 대한 롤백 정보 저장 (구현에 따라 다름)
      } catch (error) {
        // 실패 시 이전 작업들 롤백 시도
        console.error("트랜잭션 중 오류 발생:", error);

        // 롤백 로직 (실제 구현에서는 더 정교하게 구현 필요)
        for (const rollback of rollbackOperations.reverse()) {
          try {
            // await rollback();
          } catch (rollbackError) {
            console.error("롤백 중 오류:", rollbackError);
          }
        }

        return {
          success: false,
          error: error instanceof Error ? error.message : "트랜잭션 실행 중 오류가 발생했습니다.",
        };
      }
    }

    return { success: true, results };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "트랜잭션 설정 중 오류가 발생했습니다.",
    };
  }
}

/**
 * RLS (Row Level Security) 정책 확인
 * @param table 테이블 명
 * @param operation 작업 유형
 * @returns 정책 확인 결과
 */
export async function checkRLSPolicy(
  table: string,
  operation: "SELECT" | "INSERT" | "UPDATE" | "DELETE"
): Promise<boolean> {
  try {
    // 실제로는 더 복잡한 정책 확인 로직이 필요
    // 현재는 기본적인 확인만 수행
    const user = await getCurrentUser();
    return !!user;
  } catch (error) {
    console.error("RLS 정책 확인 오류:", error);
    return false;
  }
}

/**
 * 데이터베이스 연결 상태 확인
 * @returns 연결 상태
 */
export async function checkDatabaseConnection(): Promise<{
  connected: boolean;
  latency?: number;
  error?: string;
}> {
  try {
    const startTime = Date.now();

    // 간단한 쿼리로 연결 상태 확인
    const { data, error } = await supabase.from("users").select("id").limit(1).single();

    const latency = Date.now() - startTime;

    if (error && error.code === "PGRST116") {
      // 데이터가 없어도 연결은 정상
      return { connected: true, latency };
    }

    if (error) {
      return {
        connected: false,
        error: error.message,
      };
    }

    return { connected: true, latency };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : "연결 확인 중 오류 발생",
    };
  }
}

/**
 * 스토리지 버킷 설정
 */
export const STORAGE_BUCKETS = {
  REPORTS: "reports",
  FORM_ATTACHMENTS: "form-attachments",
  PROFILE_IMAGES: "profile-images",
  GROUP_ASSETS: "group-assets",
} as const;

/**
 * 파일 업로드 (스토리지)
 * @param bucket 버킷 명
 * @param path 파일 경로
 * @param file 업로드할 파일
 * @returns 업로드 결과
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // 공개 URL 생성
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);

    return { success: true, url: urlData.publicUrl };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "파일 업로드 중 오류 발생",
    };
  }
}

/**
 * 파일 삭제 (스토리지)
 * @param bucket 버킷 명
 * @param path 파일 경로
 * @returns 삭제 결과
 */
export async function deleteFile(
  bucket: string,
  path: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "파일 삭제 중 오류 발생",
    };
  }
}

/**
 * 환경별 설정
 */
export const ENVIRONMENT = {
  isDevelopment: process.env.NODE_ENV === "development",
  isProduction: process.env.NODE_ENV === "production",
  isTest: process.env.NODE_ENV === "test",
} as const;

/**
 * 로깅 유틸리티
 */
export const logger = {
  info: (message: string, data?: any) => {
    if (ENVIRONMENT.isDevelopment) {
      console.log(`[INFO] ${message}`, data);
    }
  },
  warn: (message: string, data?: any) => {
    if (ENVIRONMENT.isDevelopment) {
      console.warn(`[WARN] ${message}`, data);
    }
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error);
  },
};

/**
 * 에러 처리 유틸리티
 */
export function handleSupabaseError(error: any): {
  message: string;
  code?: string;
  details?: any;
} {
  if (error?.code) {
    // Supabase 에러 코드별 처리
    switch (error.code) {
      case "23505": // unique_violation
        return {
          message: "이미 존재하는 데이터입니다.",
          code: error.code,
          details: error.details,
        };
      case "23503": // foreign_key_violation
        return {
          message: "참조된 데이터가 존재하지 않습니다.",
          code: error.code,
          details: error.details,
        };
      case "42501": // insufficient_privilege
        return {
          message: "권한이 부족합니다.",
          code: error.code,
          details: error.details,
        };
      case "PGRST301": // JWT expired
        return {
          message: "세션이 만료되었습니다. 다시 로그인해 주세요.",
          code: error.code,
        };
      default:
        return {
          message: error.message || "데이터베이스 오류가 발생했습니다.",
          code: error.code,
          details: error.details,
        };
    }
  }

  return {
    message: error?.message || "알 수 없는 오류가 발생했습니다.",
  };
}

/**
 * 페이지네이션 헬퍼
 */
export function getPaginationRange(page: number, limit: number) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  return { from, to };
}

/**
 * 정렬 헬퍼
 */
export function buildOrderBy(
  sortField: string,
  sortDirection: "asc" | "desc"
): { column: string; ascending: boolean } {
  return {
    column: sortField,
    ascending: sortDirection === "asc",
  };
}

// 기본 내보내기
export default supabase;
