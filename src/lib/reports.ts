import { createClient } from "@supabase/supabase-js"
import type { Database } from "../../types/supabase"
import type { User } from "@supabase/supabase-js"

// 타입 별칭 정의
type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]
type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"]
type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"]

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
export const getUserProfile = async (userId: string): Promise<Tables<"users"> | null> => {
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
  updates: TablesUpdate<"users">,
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

// 사용자의 그룹 멤버십 가져오기 (조인 포함)
export const getUserGroups = async (): Promise<(Tables<"group_members"> & { groups: Tables<"groups"> | null })[]> => {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return []
    }

    const { data, error } = await supabase
      .from("group_members")
      .select(`
        *,
        groups (*)
      `)
      .eq("user_id", currentUser.id)

    if (error) {
      throw error
    }

    return data || []
  } catch (error) {
    console.error("Error getting user groups:", error instanceof Error ? error.message : String(error))
    return []
  }
}

// 사용자 역할 가져오기
export const getUserRole = async (userId: string, groupId: string): Promise<string | null> => {
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
    .select(`
      *,
      groups (*)
    `)
    .eq("user_id", userId)
    .is("accepted_at", null)

  if (error) {
    console.error("Error getting pending invitations:", error.message)
    return []
  }

  return data || []
}

// 그룹 생성
export const createGroup = async (
  groupData: TablesInsert<"groups">,
): Promise<{ success: boolean; data?: Tables<"groups">; error?: string }> => {
  try {
    const { data, error } = await supabase.from("groups").insert(groupData).select().single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error("Error creating group:", error instanceof Error ? error.message : String(error))
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 그룹 멤버 초대
export const inviteGroupMember = async (
  memberData: TablesInsert<"group_members">,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.from("group_members").insert(memberData)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("Error inviting group member:", error instanceof Error ? error.message : String(error))
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 초대 수락
export const acceptInvitation = async (membershipId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from("group_members")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", membershipId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("Error accepting invitation:", error instanceof Error ? error.message : String(error))
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 리포트 생성
export const createReport = async (
  reportData: TablesInsert<"reports">,
): Promise<{ success: boolean; data?: Tables<"reports">; error?: string }> => {
  try {
    const { data, error } = await supabase.from("reports").insert(reportData).select().single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error("Error creating report:", error instanceof Error ? error.message : String(error))
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 그룹의 리포트 가져오기
export const getGroupReports = async (groupId: string): Promise<Tables<"reports">[]> => {
  try {
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error("Error getting group reports:", error instanceof Error ? error.message : String(error))
    return []
  }
}

// 태스크 생성
export const createTask = async (
  taskData: TablesInsert<"tasks">,
): Promise<{ success: boolean; data?: Tables<"tasks">; error?: string }> => {
  try {
    const { data, error } = await supabase.from("tasks").insert(taskData).select().single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error("Error creating task:", error instanceof Error ? error.message : String(error))
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 그룹의 태스크 가져오기
export const getGroupTasks = async (groupId: string): Promise<Tables<"tasks">[]> => {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error("Error getting group tasks:", error instanceof Error ? error.message : String(error))
    return []
  }
}
