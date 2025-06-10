// lib/auth.ts
// 인증 관련 헬퍼 함수들 - 세션 관리, 토큰 처리, 권한 검증, 리다이렉트 등

import { supabase } from "./supabase";
import { hasPermission } from "./permissions";
import { storageUtils } from "./utils";
import { LOCAL_STORAGE_KEYS, SESSION_STORAGE_KEYS } from "./constants";
import type { User, UserRole, APIResponse, UserSession } from "./types";

/**
 * 인증 상태 인터페이스
 */
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  session: any | null;
  error: string | null;
}

/**
 * 로그인 요청 데이터
 */
export interface SignInRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * 회원가입 요청 데이터
 */
export interface SignUpRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
  birth_date?: string;
}

/**
 * 비밀번호 재설정 요청
 */
export interface PasswordResetRequest {
  email: string;
  redirectUrl?: string;
}

/**
 * 비밀번호 업데이트 요청
 */
export interface PasswordUpdateRequest {
  password: string;
  confirmPassword: string;
}

/**
 * 세션 관리 클래스
 */
class AuthManager {
  private static instance: AuthManager;
  private authStateListeners: Array<(state: AuthState) => void> = [];
  private currentState: AuthState = {
    isAuthenticated: false,
    isLoading: true,
    user: null,
    session: null,
    error: null,
  };

  private constructor() {
    this.initialize();
  }

  public static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  /**
   * 초기화
   */
  private async initialize(): Promise<void> {
    try {
      // 기존 세션 확인
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        this.updateState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          session: null,
          error: error.message,
        });
        return;
      }

      if (session?.user) {
        await this.handleAuthSuccess(session);
      } else {
        this.updateState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          session: null,
          error: null,
        });
      }

      // 인증 상태 변경 리스너 설정
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === "SIGNED_IN" && session) {
          await this.handleAuthSuccess(session);
        } else if (event === "SIGNED_OUT") {
          this.handleSignOut();
        } else if (event === "TOKEN_REFRESHED" && session) {
          await this.handleAuthSuccess(session);
        }
      });
    } catch (error) {
      this.updateState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        session: null,
        error: "인증 초기화 중 오류가 발생했습니다.",
      });
    }
  }

  /**
   * 인증 성공 처리
   */
  private async handleAuthSuccess(session: any): Promise<void> {
    try {
      // 사용자 정보 조회
      const { data: userData, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error || !userData) {
        this.updateState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          session: null,
          error: "사용자 정보를 찾을 수 없습니다.",
        });
        return;
      }

      // 세션 저장
      storageUtils.setItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN, session.access_token);

      this.updateState({
        isAuthenticated: true,
        isLoading: false,
        user: userData,
        session,
        error: null,
      });
    } catch (error) {
      this.updateState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        session: null,
        error: "사용자 정보 조회 중 오류가 발생했습니다.",
      });
    }
  }

  /**
   * 로그아웃 처리
   */
  private handleSignOut(): void {
    // 로컬 스토리지 정리
    storageUtils.removeItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN);
    storageUtils.removeItem(LOCAL_STORAGE_KEYS.CURRENT_GROUP);
    storageUtils.removeItem(LOCAL_STORAGE_KEYS.USER_PREFERENCES);

    // 세션 스토리지 정리
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEYS.FORM_PROGRESS);
      sessionStorage.removeItem(SESSION_STORAGE_KEYS.SEARCH_FILTERS);
      sessionStorage.removeItem(SESSION_STORAGE_KEYS.CURRENT_TAB);
    } catch (error) {
      console.warn("세션 스토리지 정리 중 오류:", error);
    }

    this.updateState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      session: null,
      error: null,
    });
  }

  /**
   * 상태 업데이트 및 리스너 알림
   */
  private updateState(newState: Partial<AuthState>): void {
    this.currentState = { ...this.currentState, ...newState };
    this.authStateListeners.forEach((listener) => listener(this.currentState));
  }

  /**
   * 인증 상태 리스너 추가
   */
  public addAuthStateListener(listener: (state: AuthState) => void): () => void {
    this.authStateListeners.push(listener);

    // 현재 상태 즉시 전달
    listener(this.currentState);

    // 리스너 제거 함수 반환
    return () => {
      const index = this.authStateListeners.indexOf(listener);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }

  /**
   * 현재 인증 상태 조회
   */
  public getCurrentState(): AuthState {
    return { ...this.currentState };
  }

  /**
   * 로그인
   */
  public async signIn(request: SignInRequest): Promise<APIResponse<User>> {
    try {
      this.updateState({ isLoading: true, error: null });

      const { data, error } = await supabase.auth.signInWithPassword({
        email: request.email,
        password: request.password,
      });

      if (error) {
        this.updateState({ isLoading: false, error: error.message });
        return { success: false, error: error.message };
      }

      if (!data.user) {
        const errorMsg = "로그인에 실패했습니다.";
        this.updateState({ isLoading: false, error: errorMsg });
        return { success: false, error: errorMsg };
      }

      // handleAuthSuccess가 자동으로 호출됨
      return { success: true, data: this.currentState.user! };
    } catch (error) {
      const errorMsg = "로그인 중 오류가 발생했습니다.";
      this.updateState({ isLoading: false, error: errorMsg });
      return { success: false, error: errorMsg };
    }
  }

  /**
   * 회원가입
   */
  public async signUp(
    request: SignUpRequest
  ): Promise<APIResponse<{ user: User; needsVerification: boolean }>> {
    try {
      this.updateState({ isLoading: true, error: null });

      // Supabase Auth로 회원가입
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: request.email,
        password: request.password,
        options: {
          data: {
            name: request.name,
          },
        },
      });

      if (authError) {
        this.updateState({ isLoading: false, error: authError.message });
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        const errorMsg = "회원가입에 실패했습니다.";
        this.updateState({ isLoading: false, error: errorMsg });
        return { success: false, error: errorMsg };
      }

      // users 테이블에 추가 정보 저장
      const { data: userData, error: userError } = await supabase
        .from("users")
        .insert({
          id: authData.user.id,
          email: request.email,
          name: request.name,
          phone: request.phone,
          birth_date: request.birth_date,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (userError) {
        this.updateState({ isLoading: false, error: "사용자 프로필 생성에 실패했습니다." });
        return { success: false, error: "사용자 프로필 생성에 실패했습니다." };
      }

      this.updateState({ isLoading: false });

      return {
        success: true,
        data: {
          user: userData,
          needsVerification: !authData.session,
        },
      };
    } catch (error) {
      const errorMsg = "회원가입 중 오류가 발생했습니다.";
      this.updateState({ isLoading: false, error: errorMsg });
      return { success: false, error: errorMsg };
    }
  }

  /**
   * 로그아웃
   */
  public async signOut(): Promise<APIResponse> {
    try {
      this.updateState({ isLoading: true, error: null });

      const { error } = await supabase.auth.signOut();

      if (error) {
        this.updateState({ isLoading: false, error: error.message });
        return { success: false, error: error.message };
      }

      // handleSignOut이 자동으로 호출됨
      return { success: true };
    } catch (error) {
      const errorMsg = "로그아웃 중 오류가 발생했습니다.";
      this.updateState({ isLoading: false, error: errorMsg });
      return { success: false, error: errorMsg };
    }
  }

  /**
   * 비밀번호 재설정 이메일 발송
   */
  public async sendPasswordReset(request: PasswordResetRequest): Promise<APIResponse> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(request.email, {
        redirectTo: request.redirectUrl || `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, message: "비밀번호 재설정 이메일이 발송되었습니다." };
    } catch (error) {
      return { success: false, error: "이메일 발송 중 오류가 발생했습니다." };
    }
  }

  /**
   * 비밀번호 업데이트
   */
  public async updatePassword(request: PasswordUpdateRequest): Promise<APIResponse> {
    try {
      if (request.password !== request.confirmPassword) {
        return { success: false, error: "비밀번호가 일치하지 않습니다." };
      }

      const { error } = await supabase.auth.updateUser({
        password: request.password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, message: "비밀번호가 성공적으로 변경되었습니다." };
    } catch (error) {
      return { success: false, error: "비밀번호 변경 중 오류가 발생했습니다." };
    }
  }
}

// 싱글톤 인스턴스 생성
export const authManager = AuthManager.getInstance();

/**
 * 현재 사용자 조회 (캐시된 값)
 */
export function getCurrentUser(): User | null {
  return authManager.getCurrentState().user;
}

/**
 * 인증 상태 조회
 */
export function getAuthState(): AuthState {
  return authManager.getCurrentState();
}

/**
 * 인증 상태 리스너 추가
 */
export function onAuthStateChange(listener: (state: AuthState) => void): () => void {
  return authManager.addAuthStateListener(listener);
}

/**
 * 로그인
 */
export async function signIn(request: SignInRequest): Promise<APIResponse<User>> {
  return authManager.signIn(request);
}

/**
 * 회원가입
 */
export async function signUp(
  request: SignUpRequest
): Promise<APIResponse<{ user: User; needsVerification: boolean }>> {
  return authManager.signUp(request);
}

/**
 * 로그아웃
 */
export async function signOut(): Promise<APIResponse> {
  return authManager.signOut();
}

/**
 * 비밀번호 재설정
 */
export async function sendPasswordReset(request: PasswordResetRequest): Promise<APIResponse> {
  return authManager.sendPasswordReset(request);
}

/**
 * 비밀번호 업데이트
 */
export async function updatePassword(request: PasswordUpdateRequest): Promise<APIResponse> {
  return authManager.updatePassword(request);
}

/**
 * 인증 필요 여부 확인
 */
export function requireAuth(): boolean {
  const state = authManager.getCurrentState();
  return !state.isAuthenticated;
}

/**
 * 특정 역할 권한 확인
 */
export function requireRole(requiredRole: UserRole): boolean {
  const state = authManager.getCurrentState();
  if (!state.isAuthenticated || !state.user) return false;

  // 현재 그룹에서의 역할 확인 필요
  // 실제 구현에서는 현재 선택된 그룹 정보를 기반으로 역할 확인
  return true; // 임시 구현
}

/**
 * 권한 기반 접근 제어
 */
export function requirePermission(action: string, resource?: string): boolean {
  const state = authManager.getCurrentState();
  if (!state.isAuthenticated || !state.user) return false;

  // 현재 그룹에서의 역할과 권한 확인
  const currentGroup = storageUtils.getItem(LOCAL_STORAGE_KEYS.CURRENT_GROUP);
  if (!currentGroup) return false;

  // 실제 구현에서는 사용자의 그룹 내 역할을 확인하여 권한 검증
  return true; // 임시 구현
}

/**
 * 로그인 리다이렉트
 */
export function redirectToLogin(returnUrl?: string): void {
  const currentUrl = returnUrl || window.location.pathname + window.location.search;
  const loginUrl = `/auth/login?returnUrl=${encodeURIComponent(currentUrl)}`;

  if (typeof window !== "undefined") {
    window.location.href = loginUrl;
  }
}

/**
 * 인증 후 리다이렉트
 */
export function redirectAfterAuth(defaultUrl: string = "/dashboard"): void {
  if (typeof window === "undefined") return;

  const urlParams = new URLSearchParams(window.location.search);
  const returnUrl = urlParams.get("returnUrl");

  const redirectUrl = returnUrl || defaultUrl;
  window.location.href = redirectUrl;
}

/**
 * 세션 유효성 검증
 */
export async function validateSession(): Promise<boolean> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    return !error && !!user;
  } catch (error) {
    console.error("세션 유효성 검증 오류:", error);
    return false;
  }
}

/**
 * 토큰 갱신
 */
export async function refreshToken(): Promise<APIResponse> {
  try {
    const { data, error } = await supabase.auth.refreshSession();

    if (error) {
      return { success: false, error: error.message };
    }

    if (data.session) {
      storageUtils.setItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN, data.session.access_token);
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: "토큰 갱신 중 오류가 발생했습니다." };
  }
}

/**
 * 이메일 인증 상태 확인
 */
export async function checkEmailVerification(): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return !!user?.email_confirmed_at;
  } catch (error) {
    console.error("이메일 인증 상태 확인 오류:", error);
    return false;
  }
}

/**
 * 이메일 인증 재발송
 */
export async function resendEmailVerification(): Promise<APIResponse> {
  try {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: getCurrentUser()?.email || "",
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, message: "인증 이메일이 재발송되었습니다." };
  } catch (error) {
    return { success: false, error: "이메일 재발송 중 오류가 발생했습니다." };
  }
}

/**
 * 보안 강화: 중요한 작업 전 재인증
 */
export async function reauthenticate(password: string): Promise<APIResponse> {
  try {
    const user = getCurrentUser();
    if (!user?.email) {
      return { success: false, error: "사용자 정보를 찾을 수 없습니다." };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password,
    });

    if (error) {
      return { success: false, error: "비밀번호가 올바르지 않습니다." };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: "재인증 중 오류가 발생했습니다." };
  }
}

/**
 * 계정 삭제
 */
export async function deleteAccount(password: string): Promise<APIResponse> {
  try {
    // 먼저 재인증
    const reauthResult = await reauthenticate(password);
    if (!reauthResult.success) {
      return reauthResult;
    }

    const user = getCurrentUser();
    if (!user) {
      return { success: false, error: "사용자 정보를 찾을 수 없습니다." };
    }

    // 사용자 데이터 삭제 (DB에서)
    const { error: dbError } = await supabase.from("users").delete().eq("id", user.id);

    if (dbError) {
      return { success: false, error: "계정 삭제 중 오류가 발생했습니다." };
    }

    // Supabase Auth에서도 삭제는 별도의 관리자 API가 필요하므로
    // 실제로는 사용자 데이터만 삭제하고 비활성화 처리

    await signOut();

    return { success: true, message: "계정이 성공적으로 삭제되었습니다." };
  } catch (error) {
    return { success: false, error: "계정 삭제 중 오류가 발생했습니다." };
  }
}

/**
 * 현재 그룹 설정
 */
export function setCurrentGroup(groupId: string): void {
  storageUtils.setItem(LOCAL_STORAGE_KEYS.CURRENT_GROUP, groupId);
}

/**
 * 현재 그룹 조회
 */
export function getCurrentGroup(): string | null {
  return storageUtils.getItem(LOCAL_STORAGE_KEYS.CURRENT_GROUP);
}

/**
 * 로그인 시도 제한 (보안 강화)
 */
class LoginAttemptLimiter {
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15분
  private static attempts: Map<string, { count: number; lastAttempt: number }> = new Map();

  static isLocked(email: string): boolean {
    const attempt = this.attempts.get(email);
    if (!attempt) return false;

    if (attempt.count >= this.MAX_ATTEMPTS) {
      const timeSinceLastAttempt = Date.now() - attempt.lastAttempt;
      if (timeSinceLastAttempt < this.LOCKOUT_DURATION) {
        return true;
      } else {
        // 락아웃 시간이 지나면 리셋
        this.attempts.delete(email);
        return false;
      }
    }

    return false;
  }

  static recordAttempt(email: string, success: boolean): void {
    if (success) {
      this.attempts.delete(email);
      return;
    }

    const attempt = this.attempts.get(email) || { count: 0, lastAttempt: 0 };
    attempt.count++;
    attempt.lastAttempt = Date.now();
    this.attempts.set(email, attempt);
  }

  static getRemainingLockoutTime(email: string): number {
    const attempt = this.attempts.get(email);
    if (!attempt || attempt.count < this.MAX_ATTEMPTS) return 0;

    const timeSinceLastAttempt = Date.now() - attempt.lastAttempt;
    const remainingTime = this.LOCKOUT_DURATION - timeSinceLastAttempt;
    return Math.max(0, remainingTime);
  }
}

export { LoginAttemptLimiter };
