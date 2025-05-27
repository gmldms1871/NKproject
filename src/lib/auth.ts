import { supabase } from "./supabase"
import type { User } from "@supabase/supabase-js"

interface UserData {
  name: string
  nick_name: string
  phone: string
}

interface AuthResult {
  success: boolean
  user?: User | null
  error?: string
}

interface SignInResult extends AuthResult {
  session?: unknown
}

// 회원가입
export const signUp = async (email: string, password: string, userData: UserData): Promise<AuthResult> => {
  try {
    // 1. Supabase Auth로 사용자 생성
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) throw authError

    if (authData.user) {
      // 2. 추가 사용자 정보를 users 테이블에 저장
      const { error: profileError } = await supabase.from("users").insert({
        id: authData.user.id,
        email,
        name: userData.name,
        nick_name: userData.nick_name,
        phone: userData.phone,
      })

      if (profileError) throw profileError
    }

    return { success: true, user: authData.user }
  } catch (error) {
    console.error("Error signing up:", error instanceof Error ? error.message : String(error))
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 로그인
export const signIn = async (email: string, password: string): Promise<SignInResult> => {
  try {
    // 기존 세션 정리
    await supabase.auth.signOut()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error

    return { success: true, session: data.session, user: data.user }
  } catch (error) {
    console.error("Error signing in:", error instanceof Error ? error.message : String(error))
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 로그아웃
export const signOut = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error("Error signing out:", error instanceof Error ? error.message : String(error))
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 비밀번호 재설정 이메일 발송
export const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("Error resetting password:", error instanceof Error ? error.message : String(error))
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 비밀번호 변경
export const updatePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("Error updating password:", error instanceof Error ? error.message : String(error))
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
