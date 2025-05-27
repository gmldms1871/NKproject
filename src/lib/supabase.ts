import { createClient } from "@supabase/supabase-js"
import type { Database } from "../../types/supabase"
import type { User } from "@supabase/supabase-js"
import type { GroupMemberWithUser } from "../../types"

// 환경 변수에서 Supabase URL과 API 키를 가져옵니다
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

// Supabase 클라이언트 생성
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// 사용자 세션 가져오기
export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession()
  if (error) {
    console.error("Error getting session:", error.message)
    return null
  }
  return data.session
}

// 현재 사용자 가져오기
export const getCurrentUser = async (): Promise<User | null> => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error) {
    console.error("Error getting user:", error.message)
    return null
  }
  return user
}

// 사용자 프로필 가져오기
export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase.from("users").select("*").eq("id", userId).single()

  if (error) {
    console.error("Error getting user profile:", error.message)
    return null
  }

  return data
}

// 사용자 프로필 업데이트
export const updateUserProfile = async (
  userId: string,
  updates: { name?: string; nick_name?: string; phone?: string },
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.from("users").update(updates).eq("id", userId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("Error updating user profile:", error instanceof Error ? error.message : String(error))
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 사용자의 그룹 멤버십 가져오기
export const getUserGroups = async (): Promise<GroupMemberWithUser[]> => {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return []
    }

    const { data, error } = await supabase
      .from("group_members")
      .select(
        `
        id,
        role,
        invited_at,
        accepted_at,
        users (
          id,
          name,
          email
        ),
        groups (
          id,
          name,
          created_at,
          owner_id
        )
      `,
      )
      .eq("user_id", currentUser.id)

    if (error) {
      throw error
    }

    return (data as GroupMemberWithUser[]) || []
  } catch (error) {
    console.error("Error getting user groups:", error instanceof Error ? error.message : String(error))
    return []
  }
}

// 사용자 역할 가져오기
export const getUserRole = async (userId: string, groupId: string) => {
  const { data, error } = await supabase
    .from("group_members")
    .select("role")
    .eq("user_id", userId)
    .eq("group_id", groupId)
    .single()

  if (error) {
    console.error("Error getting user role:", error.message)
    return null
  }

  return data.role
}

// 사용자의 대기 중인 초대 가져오기
export const getPendingInvitations = async (userId: string) => {
  const { data, error } = await supabase
    .from("group_members")
    .select(
      `
      id,
      role,
      invited_at,
      groups:group_id(id, name, owner_id),
      owner:groups!inner(owner:users!groups_owner_id_fkey(name))
    `,
    )
    .eq("user_id", userId)
    .is("accepted_at", null)

  if (error) {
    console.error("Error getting pending invitations:", error.message)
    return []
  }

  return data || []
}
