// lib/utils.ts
// 공통 유틸리티 함수들 - 날짜, 문자열, 포맷팅, 검증 등

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { UserRole, FormInstanceStatus, ReportStatus } from "./types";

/**
 * Tailwind CSS 클래스 병합 유틸리티
 * @param inputs 클래스 값들
 * @returns 병합된 클래스 문자열
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 날짜 포맷팅 유틸리티
 */
export const dateUtils = {
  /**
   * 날짜를 한국어 형식으로 포맷
   * @param date 날짜
   * @param options 포맷 옵션
   * @returns 포맷된 날짜 문자열
   */
  formatKorean(
    date: string | Date,
    options?: {
      includeTime?: boolean;
      includeWeekday?: boolean;
      short?: boolean;
    }
  ): string {
    const d = new Date(date);
    const { includeTime = false, includeWeekday = false, short = false } = options || {};

    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
    const weekday = weekdays[d.getDay()];

    let formatted = short ? `${month}/${day}` : `${year}년 ${month}월 ${day}일`;

    if (includeWeekday) {
      formatted += ` (${weekday})`;
    }

    if (includeTime) {
      const hours = d.getHours();
      const minutes = d.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "오후" : "오전";
      const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
      formatted += ` ${ampm} ${displayHours}:${minutes}`;
    }

    return formatted;
  },

  /**
   * 상대적 시간 표시 (예: "2시간 전", "3일 전")
   * @param date 날짜
   * @returns 상대적 시간 문자열
   */
  formatRelative(date: string | Date): string {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return "방금 전";
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}개월 전`;
    return `${Math.floor(diffDays / 365)}년 전`;
  },

  /**
   * 날짜 범위 검증
   * @param startDate 시작 날짜
   * @param endDate 종료 날짜
   * @returns 유효성 여부
   */
  isValidDateRange(startDate: string | Date, endDate: string | Date): boolean {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return start <= end;
  },

  /**
   * 오늘 날짜인지 확인
   * @param date 날짜
   * @returns 오늘인지 여부
   */
  isToday(date: string | Date): boolean {
    const d = new Date(date);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  },

  /**
   * 이번 주 날짜인지 확인
   * @param date 날짜
   * @returns 이번 주인지 여부
   */
  isThisWeek(date: string | Date): boolean {
    const d = new Date(date);
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    return d >= startOfWeek && d <= endOfWeek;
  },
};

/**
 * 문자열 유틸리티
 */
export const stringUtils = {
  /**
   * 문자열 자르기 (말줄임)
   * @param text 원본 텍스트
   * @param maxLength 최대 길이
   * @param suffix 접미사
   * @returns 자른 문자열
   */
  truncate(text: string, maxLength: number, suffix: string = "..."): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - suffix.length) + suffix;
  },

  /**
   * 이름 마스킹 (개인정보 보호)
   * @param name 이름
   * @returns 마스킹된 이름
   */
  maskName(name: string): string {
    if (name.length <= 1) return name;
    if (name.length === 2) return name[0] + "*";
    return name[0] + "*".repeat(name.length - 2) + name[name.length - 1];
  },

  /**
   * 이메일 마스킹
   * @param email 이메일
   * @returns 마스킹된 이메일
   */
  maskEmail(email: string): string {
    const [local, domain] = email.split("@");
    if (!domain) return email;

    const maskedLocal =
      local.length > 2
        ? local[0] + "*".repeat(local.length - 2) + local[local.length - 1]
        : local[0] + "*";

    return `${maskedLocal}@${domain}`;
  },

  /**
   * 전화번호 포맷팅
   * @param phone 전화번호
   * @returns 포맷된 전화번호
   */
  formatPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, "");

    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3");
    }
    if (cleaned.length === 10) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
    }

    return phone;
  },

  /**
   * 텍스트에서 키워드 하이라이트
   * @param text 원본 텍스트
   * @param keyword 키워드
   * @returns 하이라이트된 텍스트 (HTML)
   */
  highlightKeyword(text: string, keyword: string): string {
    if (!keyword) return text;

    const regex = new RegExp(`(${keyword})`, "gi");
    return text.replace(regex, "<mark>$1</mark>");
  },

  /**
   * 파일 크기 포맷팅
   * @param bytes 바이트 크기
   * @returns 포맷된 크기 문자열
   */
  formatFileSize(bytes: number): string {
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Bytes";

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, i);

    return `${Math.round(size * 100) / 100} ${sizes[i]}`;
  },
};

/**
 * 숫자 유틸리티
 */
export const numberUtils = {
  /**
   * 숫자를 한국어 단위로 포맷
   * @param num 숫자
   * @returns 포맷된 문자열
   */
  formatKorean(num: number): string {
    if (num >= 100000000) {
      return `${Math.floor(num / 100000000)}억${
        num % 100000000 >= 10000 ? Math.floor((num % 100000000) / 10000) + "만" : ""
      }`;
    }
    if (num >= 10000) {
      return `${Math.floor(num / 10000)}만${num % 10000 > 0 ? num % 10000 : ""}`;
    }
    return num.toString();
  },

  /**
   * 퍼센티지 포맷팅
   * @param value 값
   * @param total 전체
   * @param decimals 소수점 자리수
   * @returns 퍼센티지 문자열
   */
  formatPercentage(value: number, total: number, decimals: number = 1): string {
    if (total === 0) return "0%";
    const percentage = (value / total) * 100;
    return `${percentage.toFixed(decimals)}%`;
  },

  /**
   * 숫자에 천 단위 구분자 추가
   * @param num 숫자
   * @returns 포맷된 문자열
   */
  addCommas(num: number): string {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  },

  /**
   * 안전한 나눗셈 (0으로 나누기 방지)
   * @param numerator 분자
   * @param denominator 분모
   * @param defaultValue 기본값
   * @returns 나눗셈 결과
   */
  safeDivide(numerator: number, denominator: number, defaultValue: number = 0): number {
    return denominator === 0 ? defaultValue : numerator / denominator;
  },
};

/**
 * 배열 유틸리티
 */
export const arrayUtils = {
  /**
   * 배열을 청크로 나누기
   * @param array 배열
   * @param size 청크 크기
   * @returns 청크 배열
   */
  chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  },

  /**
   * 배열에서 중복 제거
   * @param array 배열
   * @param keyFn 키 추출 함수
   * @returns 중복 제거된 배열
   */
  uniqueBy<T>(array: T[], keyFn: (item: T) => any): T[] {
    const seen = new Set();
    return array.filter((item) => {
      const key = keyFn(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  },

  /**
   * 배열 그룹화
   * @param array 배열
   * @param keyFn 키 추출 함수
   * @returns 그룹화된 객체
   */
  groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const key = keyFn(item);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  },

  /**
   * 배열 셔플
   * @param array 배열
   * @returns 셔플된 배열
   */
  shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  },
};

/**
 * 상태 유틸리티
 */
export const statusUtils = {
  /**
   * 사용자 역할 한글명 가져오기
   * @param role 사용자 역할
   * @returns 한글 역할명
   */
  getUserRoleLabel(role: UserRole): string {
    const labels: Record<UserRole, string> = {
      admin: "관리자",
      teacher: "선생님",
      part_time: "시간제 강사",
      student: "학생",
    };
    return labels[role] || role;
  },

  /**
   * 폼 인스턴스 상태 한글명 가져오기
   * @param status 폼 상태
   * @returns 한글 상태명
   */
  getFormInstanceStatusLabel(status: FormInstanceStatus): string {
    const labels: Record<FormInstanceStatus, string> = {
      not_started: "미시작",
      student_completed: "학생 완료",
      part_time_completed: "시간제 강사 완료",
      teacher_completed: "선생님 완료",
      final_completed: "최종 완료",
    };
    return labels[status] || status;
  },

  /**
   * 보고서 상태 한글명 가져오기
   * @param status 보고서 상태
   * @returns 한글 상태명
   */
  getReportStatusLabel(status: ReportStatus): string {
    const labels: Record<ReportStatus, string> = {
      stage_0: "0단계 (학생 미완료)",
      stage_1: "1단계 (시간제 강사 검토)",
      stage_2: "2단계 (선생님 검토)",
      completed: "최종 완료",
    };
    return labels[status] || status;
  },

  /**
   * 상태별 색상 클래스 가져오기
   * @param status 상태
   * @returns Tailwind CSS 클래스
   */
  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      // 폼 인스턴스 상태
      not_started: "bg-gray-100 text-gray-800",
      student_completed: "bg-blue-100 text-blue-800",
      part_time_completed: "bg-yellow-100 text-yellow-800",
      teacher_completed: "bg-orange-100 text-orange-800",
      final_completed: "bg-green-100 text-green-800",

      // 보고서 상태
      stage_0: "bg-gray-100 text-gray-800",
      stage_1: "bg-blue-100 text-blue-800",
      stage_2: "bg-yellow-100 text-yellow-800",
      completed: "bg-green-100 text-green-800",

      // 초대 상태
      pending: "bg-yellow-100 text-yellow-800",
      accepted: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      expired: "bg-gray-100 text-gray-800",

      // 사용자 역할
      admin: "bg-purple-100 text-purple-800",
      teacher: "bg-indigo-100 text-indigo-800",
      part_time: "bg-cyan-100 text-cyan-800",
      student: "bg-green-100 text-green-800",
    };

    return colors[status] || "bg-gray-100 text-gray-800";
  },
};

/**
 * URL 및 라우팅 유틸리티
 */
export const urlUtils = {
  /**
   * URL 파라미터를 객체로 변환
   * @param searchParams URLSearchParams
   * @returns 파라미터 객체
   */
  paramsToObject(searchParams: URLSearchParams): Record<string, string> {
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  },

  /**
   * 객체를 URL 파라미터로 변환
   * @param params 파라미터 객체
   * @returns URLSearchParams
   */
  objectToParams(params: Record<string, any>): URLSearchParams {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        searchParams.set(key, String(value));
      }
    });
    return searchParams;
  },

  /**
   * 현재 URL에 파라미터 추가
   * @param params 추가할 파라미터
   * @param currentUrl 현재 URL
   * @returns 새 URL
   */
  addParams(params: Record<string, any>, currentUrl?: string): string {
    const url = new URL(currentUrl || window.location.href);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      } else {
        url.searchParams.delete(key);
      }
    });
    return url.toString();
  },
};

/**
 * 로컬 스토리지 유틸리티
 */
export const storageUtils = {
  /**
   * 로컬 스토리지에 객체 저장
   * @param key 키
   * @param value 값
   */
  setItem(key: string, value: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error("로컬 스토리지 저장 오류:", error);
    }
  },

  /**
   * 로컬 스토리지에서 객체 조회
   * @param key 키
   * @param defaultValue 기본값
   * @returns 저장된 값 또는 기본값
   */
  getItem<T>(key: string, defaultValue?: T): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue || null;
    } catch (error) {
      console.error("로컬 스토리지 조회 오류:", error);
      return defaultValue || null;
    }
  },

  /**
   * 로컬 스토리지에서 항목 제거
   * @param key 키
   */
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error("로컬 스토리지 제거 오류:", error);
    }
  },

  /**
   * 로컬 스토리지 전체 정리
   */
  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error("로컬 스토리지 정리 오류:", error);
    }
  },
};

/**
 * 클립보드 유틸리티
 */
export const clipboardUtils = {
  /**
   * 텍스트를 클립보드에 복사
   * @param text 복사할 텍스트
   * @returns 성공 여부
   */
  async copyText(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        // 폴백 방법
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);
        return successful;
      }
    } catch (error) {
      console.error("클립보드 복사 오류:", error);
      return false;
    }
  },
};

/**
 * 디바운스 함수
 * @param func 실행할 함수
 * @param wait 대기 시간 (ms)
 * @returns 디바운스된 함수
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * 스로틀 함수
 * @param func 실행할 함수
 * @param limit 제한 시간 (ms)
 * @returns 스로틀된 함수
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * 랜덤 ID 생성
 * @param length 길이
 * @returns 랜덤 ID
 */
export function generateId(length: number = 8): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 에러 메시지 정리
 * @param error 에러 객체
 * @returns 정리된 메시지
 */
export function getErrorMessage(error: any): string {
  if (typeof error === "string") return error;
  if (error?.message) return error.message;
  if (error?.error) return error.error;
  return "알 수 없는 오류가 발생했습니다.";
}

/**
 * 객체 깊은 복사
 * @param obj 복사할 객체
 * @returns 복사된 객체
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as T;
  if (obj instanceof Array) return obj.map((item) => deepClone(item)) as T;
  if (typeof obj === "object") {
    const cloned = {} as T;
    Object.keys(obj).forEach((key) => {
      (cloned as any)[key] = deepClone((obj as any)[key]);
    });
    return cloned;
  }
  return obj;
}
