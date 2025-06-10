// lib/hooks.ts
// React 커스텀 훅들 - useAuth, usePermissions, useNotifications, useRealtime 등

import { useState, useEffect, useCallback, useRef } from "react";
import { onAuthStateChange, type AuthState, getCurrentGroup } from "./auth";
import { hasPermission, type UserRole } from "./permissions";
import {
  getUserNotifications,
  markNotificationAsRead,
  getUnreadNotificationCount,
} from "./notifications";
import { subscribeToGroupChanges } from "./supabase";
import { storageUtils } from "./utils";
import { LOCAL_STORAGE_KEYS } from "./constants";
import type {
  NotificationWithDetails,
  FormInstanceWithDetails,
  ReportWithDetails,
  APIResponse,
  UserWithGroups,
} from "./types";

/**
 * 인증 상태 관리 훅
 */
export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    session: null,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChange((state) => {
      setAuthState(state);
    });

    return unsubscribe;
  }, []);

  return authState;
}

/**
 * 권한 확인 훅
 */
export function usePermissions(userRole?: UserRole, groupId?: string) {
  const { user, isAuthenticated } = useAuth();
  const currentGroupId = groupId || getCurrentGroup();

  const checkPermission = useCallback(
    (action: string, resource?: string) => {
      if (!isAuthenticated || !user || !userRole) return false;
      return hasPermission(userRole, action, resource);
    },
    [isAuthenticated, user, userRole]
  );

  const hasAnyPermission = useCallback(
    (actions: string[]) => {
      return actions.some((action) => checkPermission(action));
    },
    [checkPermission]
  );

  const hasAllPermissions = useCallback(
    (actions: string[]) => {
      return actions.every((action) => checkPermission(action));
    },
    [checkPermission]
  );

  return {
    checkPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAuthenticated,
    user,
    currentGroupId,
  };
}

/**
 * 알림 관리 훅
 */
export function useNotifications(userId?: string, autoRefresh: boolean = true) {
  const [notifications, setNotifications] = useState<NotificationWithDetails[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const result = await getUserNotifications(userId);

      if (result.success && result.data) {
        setNotifications(result.data);
        setError(null);
      } else {
        setError(result.error || "알림 조회에 실패했습니다.");
      }
    } catch (err) {
      setError("알림 조회 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchUnreadCount = useCallback(async () => {
    if (!userId) return;

    try {
      const result = await getUnreadNotificationCount(userId);
      if (result.success && result.data) {
        setUnreadCount(result.data.count);
      }
    } catch (err) {
      console.error("읽지 않은 알림 수 조회 오류:", err);
    }
  }, [userId]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!userId) return;

      try {
        const result = await markNotificationAsRead(notificationId, userId);
        if (result.success) {
          setNotifications((prev) =>
            prev.map((notif) =>
              notif.id === notificationId
                ? { ...notif, is_read: true, read_at: new Date().toISOString() }
                : notif
            )
          );
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      } catch (err) {
        console.error("알림 읽음 처리 오류:", err);
      }
    },
    [userId]
  );

  // 초기 데이터 로드
  useEffect(() => {
    if (userId) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [userId, fetchNotifications, fetchUnreadCount]);

  // 자동 새로고침
  useEffect(() => {
    if (!autoRefresh || !userId) return;

    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000); // 30초마다 읽지 않은 알림 수 확인

    return () => clearInterval(interval);
  }, [autoRefresh, userId, fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refresh: fetchNotifications,
    markAsRead,
  };
}

/**
 * 로컬 스토리지 상태 관리 훅
 */
export function useLocalStorage<T>(key: string, defaultValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      return storageUtils.getItem(key, defaultValue);
    } catch (error) {
      console.error(`로컬 스토리지 조회 오류 (${key}):`, error);
      return defaultValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        storageUtils.setItem(key, valueToStore);
      } catch (error) {
        console.error(`로컬 스토리지 저장 오류 (${key}):`, error);
      }
    },
    [key, storedValue]
  );

  const removeValue = useCallback(() => {
    try {
      setStoredValue(defaultValue);
      storageUtils.removeItem(key);
    } catch (error) {
      console.error(`로컬 스토리지 제거 오류 (${key}):`, error);
    }
  }, [key, defaultValue]);

  return [storedValue, setValue, removeValue] as const;
}

/**
 * 현재 그룹 관리 훅
 */
export function useCurrentGroup() {
  const [currentGroupId, setCurrentGroupId] = useLocalStorage<string | null>(
    LOCAL_STORAGE_KEYS.CURRENT_GROUP,
    null
  );

  const switchGroup = useCallback(
    (groupId: string) => {
      setCurrentGroupId(groupId);
      // 그룹 변경 시 관련 캐시 정리
      storageUtils.removeItem("group_stats");
      storageUtils.removeItem("form_templates");
    },
    [setCurrentGroupId]
  );

  const clearGroup = useCallback(() => {
    setCurrentGroupId(null);
  }, [setCurrentGroupId]);

  return {
    currentGroupId,
    switchGroup,
    clearGroup,
  };
}

/**
 * 실시간 업데이트 훅
 */
export function useRealtime(groupId?: string, enabled: boolean = true) {
  const [formUpdates, setFormUpdates] = useState<FormInstanceWithDetails[]>([]);
  const [reportUpdates, setReportUpdates] = useState<ReportWithDetails[]>([]);
  const [memberUpdates, setMemberUpdates] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    if (!enabled || !groupId) return;

    setIsConnected(true);

    const unsubscribe = subscribeToGroupChanges(groupId, {
      onFormInstanceChange: (payload) => {
        console.log("폼 인스턴스 변경:", payload);
        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
          setFormUpdates((prev) => {
            const filtered = prev.filter((item) => item.id !== payload.new.id);
            return [...filtered, payload.new];
          });
        } else if (payload.eventType === "DELETE") {
          setFormUpdates((prev) => prev.filter((item) => item.id !== payload.old.id));
        }
      },

      onReportChange: (payload) => {
        console.log("보고서 변경:", payload);
        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
          setReportUpdates((prev) => {
            const filtered = prev.filter((item) => item.id !== payload.new.id);
            return [...filtered, payload.new];
          });
        } else if (payload.eventType === "DELETE") {
          setReportUpdates((prev) => prev.filter((item) => item.id !== payload.old.id));
        }
      },

      onMemberChange: (payload) => {
        console.log("멤버 변경:", payload);
        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
          setMemberUpdates((prev) => {
            const filtered = prev.filter((item) => item.id !== payload.new.id);
            return [...filtered, payload.new];
          });
        } else if (payload.eventType === "DELETE") {
          setMemberUpdates((prev) => prev.filter((item) => item.id !== payload.old.id));
        }
      },
    });

    return () => {
      setIsConnected(false);
      unsubscribe();
    };
  }, [groupId, enabled]);

  const clearUpdates = useCallback(() => {
    setFormUpdates([]);
    setReportUpdates([]);
    setMemberUpdates([]);
  }, []);

  return {
    formUpdates,
    reportUpdates,
    memberUpdates,
    isConnected,
    clearUpdates,
  };
}

/**
 * 비동기 작업 상태 관리 훅
 */
export function useAsync<T, P extends any[]>(
  asyncFunction: (...args: P) => Promise<APIResponse<T>>,
  deps: React.DependencyList = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (...args: P) => {
    try {
      setLoading(true);
      setError(null);

      const result = await asyncFunction(...args);

      if (result.success && result.data !== undefined) {
        setData(result.data);
      } else {
        setError(result.error || "작업 실행에 실패했습니다.");
        setData(null);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
      setError(errorMessage);
      setData(null);
      return { success: false, error: errorMessage } as APIResponse<T>;
    } finally {
      setLoading(false);
    }
  }, deps);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset,
  };
}

/**
 * 디바운스 값 훅
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 페이지네이션 훅
 */
export function usePagination(initialPage: number = 1, initialPageSize: number = 10) {
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [total, setTotal] = useState(0);

  const totalPages = Math.ceil(total / pageSize);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  const goToPage = useCallback(
    (newPage: number) => {
      setPage(Math.max(1, Math.min(newPage, totalPages)));
    },
    [totalPages]
  );

  const goToNextPage = useCallback(() => {
    if (hasNextPage) goToPage(page + 1);
  }, [hasNextPage, page, goToPage]);

  const goToPreviousPage = useCallback(() => {
    if (hasPreviousPage) goToPage(page - 1);
  }, [hasPreviousPage, page, goToPage]);

  const goToFirstPage = useCallback(() => {
    goToPage(1);
  }, [goToPage]);

  const goToLastPage = useCallback(() => {
    goToPage(totalPages);
  }, [goToPage, totalPages]);

  const setPageSizeAndReset = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  }, []);

  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    setPage: goToPage,
    setPageSize: setPageSizeAndReset,
    setTotal,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
  };
}

/**
 * 검색 필터 훅
 */
export function useSearchFilters<T extends Record<string, any>>(initialFilters: T) {
  const [filters, setFilters] = useState<T>(initialFilters);
  const debouncedFilters = useDebounce(filters, 300);

  const updateFilter = useCallback((key: keyof T, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const updateFilters = useCallback((newFilters: Partial<T>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const clearFilter = useCallback(
    (key: keyof T) => {
      setFilters((prev) => ({
        ...prev,
        [key]: initialFilters[key],
      }));
    },
    [initialFilters]
  );

  return {
    filters,
    debouncedFilters,
    updateFilter,
    updateFilters,
    resetFilters,
    clearFilter,
  };
}

/**
 * 폼 상태 관리 훅
 */
export function useFormState<T extends Record<string, any>>(
  initialValues: T,
  onSubmit?: (values: T) => Promise<void> | void
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setValue = useCallback((field: keyof T, value: any) => {
    setValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const setError = useCallback((field: keyof T, error: string) => {
    setErrors((prev) => ({
      ...prev,
      [field]: error,
    }));
  }, []);

  const clearError = useCallback((field: keyof T) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const setTouched = useCallback((field: keyof T) => {
    setTouched((prev) => ({
      ...prev,
      [field]: true,
    }));
  }, []);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();

      if (!onSubmit) return;

      try {
        setIsSubmitting(true);
        await onSubmit(values);
      } catch (error) {
        console.error("폼 제출 오류:", error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, onSubmit]
  );

  const isValid = Object.keys(errors).length === 0;
  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    isDirty,
    setValue,
    setError,
    clearError,
    setTouched,
    reset,
    handleSubmit,
  };
}

/**
 * 외부 클릭 감지 훅
 */
export function useClickOutside<T extends HTMLElement>(callback: () => void): React.RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [callback]);

  return ref;
}

/**
 * 키보드 단축키 훅
 */
export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  deps: React.DependencyList = []
) {
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === key) {
        event.preventDefault();
        callback();
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [key, ...deps]);
}

/**
 * 윈도우 크기 훅
 */
export function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return windowSize;
}

/**
 * 스크롤 위치 훅
 */
export function useScrollPosition() {
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleScroll = () => {
      setScrollPosition(window.pageYOffset);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return scrollPosition;
}

/**
 * 이전 값 추적 훅
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  });

  return ref.current;
}

/**
 * 간격 실행 훅
 */
export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef<() => void>();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const tick = () => {
      savedCallback.current?.();
    };

    const id = setInterval(tick, delay);
    return () => clearInterval(id);
  }, [delay]);
}

/**
 * 복사하기 훅
 */
export function useCopyToClipboard() {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copy = useCallback(async (text: string) => {
    if (!navigator?.clipboard) {
      console.warn("Clipboard API를 사용할 수 없습니다.");
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      return true;
    } catch (error) {
      console.error("클립보드 복사 실패:", error);
      setCopiedText(null);
      return false;
    }
  }, []);

  const reset = useCallback(() => {
    setCopiedText(null);
  }, []);

  return {
    copiedText,
    copy,
    reset,
  };
}
