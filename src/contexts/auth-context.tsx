"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { validateSession } from "@/lib/users";
import { Database } from "@/lib/types/types";

type User = Database["public"]["Tables"]["users"]["Row"];

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 세션 검증 및 사용자 정보 복원
  const refreshSession = async () => {
    try {
      const result = await validateSession();

      if (result.success && result.data) {
        setUser(result.data);
      } else {
        // 세션이 유효하지 않으면 사용자 정보 삭제
        setUser(null);

        // 로컬스토리지 정리
        if (typeof window !== "undefined") {
          localStorage.removeItem("user");
          localStorage.removeItem("user_session");
        }
      }
    } catch (error) {
      console.error("세션 검증 실패:", error);
      setUser(null);

      // 에러 발생 시에도 로컬스토리지 정리
      if (typeof window !== "undefined") {
        localStorage.removeItem("user");
        localStorage.removeItem("user_session");
      }
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      // 클라이언트 사이드에서만 localStorage 접근
      if (typeof window !== "undefined") {
        try {
          // 먼저 로컬스토리지에서 사용자 정보 확인
          const savedUser = localStorage.getItem("user");
          const savedSession = localStorage.getItem("user_session");

          if (savedUser && savedSession) {
            try {
              const parsedUser = JSON.parse(savedUser);
              const parsedSession = JSON.parse(savedSession);

              // 세션 만료 시간 확인
              const expiresAt = new Date(parsedSession.expiresAt);
              const now = new Date();

              if (now < expiresAt) {
                // 세션이 유효하면 서버에서 재검증
                await refreshSession();
              } else {
                // 세션이 만료되었으면 정리
                localStorage.removeItem("user");
                localStorage.removeItem("user_session");
                setUser(null);
              }
            } catch (parseError) {
              console.error("저장된 사용자 정보 파싱 실패:", parseError);
              // 손상된 데이터 제거
              localStorage.removeItem("user");
              localStorage.removeItem("user_session");
              setUser(null);
            }
          } else {
            // 저장된 정보가 없으면 사용자 없음
            setUser(null);
          }
        } catch (error) {
          console.error("인증 초기화 실패:", error);
          setUser(null);
        }
      }

      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  // 주기적 세션 검증 (30분마다)
  useEffect(() => {
    if (user) {
      const interval = setInterval(async () => {
        await refreshSession();
      }, 30 * 60 * 1000); // 30분

      return () => clearInterval(interval);
    }
  }, [user]);

  // 페이지 포커스 시 세션 검증
  useEffect(() => {
    if (typeof window !== "undefined" && user) {
      const handleFocus = async () => {
        // 페이지가 포커스될 때 세션 상태 확인
        await refreshSession();
      };

      const handleVisibilityChange = async () => {
        if (!document.hidden && user) {
          await refreshSession();
        }
      };

      window.addEventListener("focus", handleFocus);
      document.addEventListener("visibilitychange", handleVisibilityChange);

      return () => {
        window.removeEventListener("focus", handleFocus);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      };
    }
  }, [user]);

  const updateUser = (newUser: User | null) => {
    setUser(newUser);

    // 클라이언트 사이드에서만 localStorage 접근
    if (typeof window !== "undefined") {
      try {
        if (newUser) {
          // 사용자 정보와 세션 정보 모두 저장
          localStorage.setItem("user", JSON.stringify(newUser));

          const sessionInfo = {
            userId: newUser.id,
            email: newUser.email,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24시간 후 만료
          };

          localStorage.setItem("user_session", JSON.stringify(sessionInfo));
        } else {
          // 사용자 정보 삭제
          localStorage.removeItem("user");
          localStorage.removeItem("user_session");

          // 기타 관련 캐시 데이터도 삭제
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith("group_") || key.startsWith("notification_"))) {
              keysToRemove.push(key);
            }
          }

          keysToRemove.forEach((key: string) => localStorage.removeItem(key));
        }
      } catch (error) {
        console.error("사용자 정보 저장/삭제 실패:", error);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser: updateUser,
        isLoading,
        setIsLoading,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
