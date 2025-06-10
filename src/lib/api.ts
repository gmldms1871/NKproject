// lib/api.ts
// API 호출 관련 헬퍼 함수들 - HTTP 클라이언트, 에러 처리, 재시도 로직 등

import { supabase } from "./supabase";
import { handleSupabaseError } from "./supabase";
import type { APIResponse, PaginatedResponse } from "./types";

/**
 * HTTP 메서드 타입
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * API 요청 옵션
 */
export interface ApiRequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  signal?: AbortSignal;
}

/**
 * 페이지네이션 옵션
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
}

/**
 * 필터 옵션
 */
export interface FilterOptions {
  where?: Record<string, any>;
  search?: string;
  searchFields?: string[];
}

/**
 * API 에러 클래스
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly details?: any;

  constructor(message: string, status: number = 500, code?: string, details?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * 네트워크 에러 확인
 */
function isNetworkError(error: any): boolean {
  return (
    error instanceof TypeError ||
    error.code === "NETWORK_ERROR" ||
    error.message === "Failed to fetch" ||
    error.message.includes("network")
  );
}

/**
 * 재시도 가능한 상태 코드 확인
 */
function isRetryableStatus(status: number): boolean {
  return status >= 500 || status === 408 || status === 429;
}

/**
 * 지연 함수
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 기본 API 클라이언트 클래스
 */
class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;

  constructor(baseURL: string = "", timeout: number = 30000) {
    this.baseURL = baseURL;
    this.timeout = timeout;
    this.defaultHeaders = {
      "Content-Type": "application/json",
    };
  }

  /**
   * 기본 헤더 설정
   */
  setDefaultHeaders(headers: Record<string, string>): void {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers };
  }

  /**
   * 인증 토큰 설정
   */
  setAuthToken(token: string): void {
    this.setDefaultHeaders({ Authorization: `Bearer ${token}` });
  }

  /**
   * HTTP 요청 실행
   */
  async request<T = any>(url: string, options: ApiRequestOptions = {}): Promise<T> {
    const {
      method = "GET",
      headers = {},
      params,
      timeout = this.timeout,
      retries = 3,
      retryDelay = 1000,
      signal,
    } = options;

    // URL 파라미터 처리
    let fullUrl = this.baseURL + url;
    if (params && method === "GET") {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
          searchParams.append(key, String(value));
        }
      });
      if (searchParams.toString()) {
        fullUrl += "?" + searchParams.toString();
      }
    }

    // 요청 헤더 구성
    const requestHeaders = {
      ...this.defaultHeaders,
      ...headers,
    };

    // 요청 body 구성
    let body: string | undefined;
    if (method !== "GET" && params) {
      body = JSON.stringify(params);
    }

    // 타임아웃 처리를 위한 AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // 신호가 이미 제공된 경우 연결
    if (signal) {
      signal.addEventListener("abort", () => controller.abort());
    }

    let lastError: Error;

    // 재시도 로직
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(fullUrl, {
          method,
          headers: requestHeaders,
          body,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const apiError = new ApiError(
            errorData.message || `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            errorData.code,
            errorData.details
          );

          // 재시도 가능한 에러인지 확인
          if (attempt < retries && isRetryableStatus(response.status)) {
            await delay(retryDelay * (attempt + 1));
            continue;
          }

          throw apiError;
        }

        const data = await response.json();
        return data;
      } catch (error) {
        clearTimeout(timeoutId);
        lastError = error as Error;

        // 네트워크 에러이고 재시도 가능한 경우
        if (attempt < retries && isNetworkError(error)) {
          await delay(retryDelay * (attempt + 1));
          continue;
        }

        // 타임아웃 에러
        if (error instanceof Error && error.name === "AbortError") {
          throw new ApiError("요청 시간이 초과되었습니다.", 408);
        }

        throw error;
      }
    }

    throw lastError!;
  }

  /**
   * GET 요청
   */
  async get<T = any>(
    url: string,
    params?: Record<string, any>,
    options?: Omit<ApiRequestOptions, "method" | "params">
  ): Promise<T> {
    return this.request<T>(url, { ...options, method: "GET", params });
  }

  /**
   * POST 요청
   */
  async post<T = any>(
    url: string,
    data?: any,
    options?: Omit<ApiRequestOptions, "method" | "params">
  ): Promise<T> {
    return this.request<T>(url, { ...options, method: "POST", params: data });
  }

  /**
   * PUT 요청
   */
  async put<T = any>(
    url: string,
    data?: any,
    options?: Omit<ApiRequestOptions, "method" | "params">
  ): Promise<T> {
    return this.request<T>(url, { ...options, method: "PUT", params: data });
  }

  /**
   * PATCH 요청
   */
  async patch<T = any>(
    url: string,
    data?: any,
    options?: Omit<ApiRequestOptions, "method" | "params">
  ): Promise<T> {
    return this.request<T>(url, { ...options, method: "PATCH", params: data });
  }

  /**
   * DELETE 요청
   */
  async delete<T = any>(url: string, options?: Omit<ApiRequestOptions, "method">): Promise<T> {
    return this.request<T>(url, { ...options, method: "DELETE" });
  }
}

// 기본 API 클라이언트 인스턴스
export const apiClient = new ApiClient();

/**
 * Supabase 쿼리 빌더 헬퍼
 */
export class SupabaseQueryBuilder<T = any> {
  private query: any;
  private tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
    this.query = supabase.from(tableName);
  }

  /**
   * 컬럼 선택
   */
  select(columns: string = "*"): this {
    this.query = this.query.select(columns);
    return this;
  }

  /**
   * 조건 필터
   */
  where(conditions: Record<string, any>): this {
    Object.entries(conditions).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        this.query = this.query.eq(key, value);
      }
    });
    return this;
  }

  /**
   * IN 필터
   */
  whereIn(column: string, values: any[]): this {
    this.query = this.query.in(column, values);
    return this;
  }

  /**
   * NULL이 아닌 값 필터
   */
  whereNotNull(column: string): this {
    this.query = this.query.not(column, "is", null);
    return this;
  }

  /**
   * 텍스트 검색
   */
  search(searchTerm: string, columns: string[]): this {
    if (searchTerm && columns.length > 0) {
      const searchConditions = columns.map((col) => `${col}.ilike.%${searchTerm}%`).join(",");
      this.query = this.query.or(searchConditions);
    }
    return this;
  }

  /**
   * 정렬
   */
  orderBy(column: string, direction: "asc" | "desc" = "asc"): this {
    this.query = this.query.order(column, { ascending: direction === "asc" });
    return this;
  }

  /**
   * 페이지네이션
   */
  paginate(page: number, limit: number): this {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    this.query = this.query.range(from, to);
    return this;
  }

  /**
   * 카운트 포함
   */
  withCount(): this {
    this.query = this.query.select("*", { count: "exact" });
    return this;
  }

  /**
   * 실행
   */
  async execute(): Promise<APIResponse<T[]>> {
    try {
      const { data, error } = await this.query;

      if (error) {
        const errorInfo = handleSupabaseError(error);
        return { success: false, error: errorInfo.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "쿼리 실행 중 오류가 발생했습니다.",
      };
    }
  }

  /**
   * 페이지네이션 실행
   */
  async executePaginated(): Promise<PaginatedResponse<T[]>> {
    try {
      const { data, error, count } = await this.query;

      if (error) {
        const errorInfo = handleSupabaseError(error);
        return { success: false, error: errorInfo.message };
      }

      return {
        success: true,
        data: data || [],
        pagination:
          count !== null
            ? {
                page: 1, // 현재 페이지는 별도로 관리 필요
                limit: 10, // 현재 limit은 별도로 관리 필요
                total: count,
                total_pages: Math.ceil(count / 10),
              }
            : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "쿼리 실행 중 오류가 발생했습니다.",
      };
    }
  }

  /**
   * 단일 레코드 실행
   */
  async executeSingle(): Promise<APIResponse<T>> {
    try {
      const { data, error } = await this.query.single();

      if (error) {
        const errorInfo = handleSupabaseError(error);
        return { success: false, error: errorInfo.message };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "쿼리 실행 중 오류가 발생했습니다.",
      };
    }
  }
}

/**
 * Supabase 쿼리 빌더 생성
 */
export function createQuery<T = any>(tableName: string): SupabaseQueryBuilder<T> {
  return new SupabaseQueryBuilder<T>(tableName);
}

/**
 * CRUD 헬퍼 함수들
 */

/**
 * 레코드 조회
 */
export async function findById<T = any>(
  tableName: string,
  id: string,
  columns?: string
): Promise<APIResponse<T>> {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select(columns || "*")
      .eq("id", id)
      .single();

    if (error) {
      const errorInfo = handleSupabaseError(error);
      return { success: false, error: errorInfo.message };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "데이터 조회 중 오류가 발생했습니다.",
    };
  }
}

/**
 * 레코드 목록 조회
 */
export async function findMany<T = any>(
  tableName: string,
  options: {
    columns?: string;
    filters?: FilterOptions;
    pagination?: PaginationOptions;
  } = {}
): Promise<PaginatedResponse<T[]>> {
  try {
    const { columns = "*", filters = {}, pagination = {} } = options;

    const { page = 1, limit = 10, orderBy = "created_at", orderDirection = "desc" } = pagination;

    let query = supabase.from(tableName).select(columns, { count: "exact" });

    // 필터 적용
    if (filters.where) {
      Object.entries(filters.where).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          query = query.eq(key, value);
        }
      });
    }

    // 검색 적용
    if (filters.search && filters.searchFields) {
      const searchConditions = filters.searchFields
        .map((field) => `${field}.ilike.%${filters.search}%`)
        .join(",");
      query = query.or(searchConditions);
    }

    // 정렬 적용
    query = query.order(orderBy, { ascending: orderDirection === "asc" });

    // 페이지네이션 적용
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      const errorInfo = handleSupabaseError(error);
      return { success: false, error: errorInfo.message };
    }

    return {
      success: true,
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "데이터 조회 중 오류가 발생했습니다.",
    };
  }
}

/**
 * 레코드 생성
 */
export async function create<T = any>(
  tableName: string,
  data: any,
  columns?: string
): Promise<APIResponse<T>> {
  try {
    const { data: result, error } = await supabase
      .from(tableName)
      .insert(data)
      .select(columns || "*")
      .single();

    if (error) {
      const errorInfo = handleSupabaseError(error);
      return { success: false, error: errorInfo.message };
    }

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "데이터 생성 중 오류가 발생했습니다.",
    };
  }
}

/**
 * 레코드 업데이트
 */
export async function updateById<T = any>(
  tableName: string,
  id: string,
  data: any,
  columns?: string
): Promise<APIResponse<T>> {
  try {
    const { data: result, error } = await supabase
      .from(tableName)
      .update(data)
      .eq("id", id)
      .select(columns || "*")
      .single();

    if (error) {
      const errorInfo = handleSupabaseError(error);
      return { success: false, error: errorInfo.message };
    }

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "데이터 수정 중 오류가 발생했습니다.",
    };
  }
}

/**
 * 레코드 삭제
 */
export async function deleteById(tableName: string, id: string): Promise<APIResponse> {
  try {
    const { error } = await supabase.from(tableName).delete().eq("id", id);

    if (error) {
      const errorInfo = handleSupabaseError(error);
      return { success: false, error: errorInfo.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "데이터 삭제 중 오류가 발생했습니다.",
    };
  }
}

/**
 * 벌크 생성
 */
export async function createMany<T = any>(
  tableName: string,
  data: any[],
  columns?: string
): Promise<APIResponse<T[]>> {
  try {
    const { data: result, error } = await supabase
      .from(tableName)
      .insert(data)
      .select(columns || "*");

    if (error) {
      const errorInfo = handleSupabaseError(error);
      return { success: false, error: errorInfo.message };
    }

    return { success: true, data: result || [] };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "벌크 생성 중 오류가 발생했습니다.",
    };
  }
}

/**
 * 벌크 업데이트
 */
export async function updateMany<T = any>(
  tableName: string,
  data: any,
  conditions: Record<string, any>,
  columns?: string
): Promise<APIResponse<T[]>> {
  try {
    let query = supabase.from(tableName).update(data);

    // 조건 적용
    Object.entries(conditions).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { data: result, error } = await query.select(columns || "*");

    if (error) {
      const errorInfo = handleSupabaseError(error);
      return { success: false, error: errorInfo.message };
    }

    return { success: true, data: result || [] };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "벌크 업데이트 중 오류가 발생했습니다.",
    };
  }
}

/**
 * 벌크 삭제
 */
export async function deleteMany(
  tableName: string,
  conditions: Record<string, any>
): Promise<APIResponse<{ count: number }>> {
  try {
    let query = supabase.from(tableName).delete();

    // 조건 적용
    Object.entries(conditions).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { data, error } = await query.select("id");

    if (error) {
      const errorInfo = handleSupabaseError(error);
      return { success: false, error: errorInfo.message };
    }

    return { success: true, data: { count: data?.length || 0 } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "벌크 삭제 중 오류가 발생했습니다.",
    };
  }
}

/**
 * 레코드 개수 조회
 */
export async function count(
  tableName: string,
  conditions?: Record<string, any>
): Promise<APIResponse<{ count: number }>> {
  try {
    let query = supabase.from(tableName).select("*", { count: "exact", head: true });

    // 조건 적용
    if (conditions) {
      Object.entries(conditions).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          query = query.eq(key, value);
        }
      });
    }

    const { count: result, error } = await query;

    if (error) {
      const errorInfo = handleSupabaseError(error);
      return { success: false, error: errorInfo.message };
    }

    return { success: true, data: { count: result || 0 } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "카운트 조회 중 오류가 발생했습니다.",
    };
  }
}

/**
 * 레코드 존재 여부 확인
 */
export async function exists(
  tableName: string,
  conditions: Record<string, any>
): Promise<APIResponse<{ exists: boolean }>> {
  try {
    const result = await count(tableName, conditions);

    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: { exists: result.data!.count > 0 },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "존재 여부 확인 중 오류가 발생했습니다.",
    };
  }
}

// 기본 내보내기
export default {
  apiClient,
  createQuery,
  findById,
  findMany,
  create,
  updateById,
  deleteById,
  createMany,
  updateMany,
  deleteMany,
  count,
  exists,
  ApiError,
};
