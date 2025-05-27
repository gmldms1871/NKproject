import { supabase, getCurrentUser } from "@/lib/supabase"
import type { Group, GroupMember, Report } from "../../types"

export const getGroupDetails = async (
  groupId: string,
): Promise<{
  success: boolean
  group?: Group
  isOwner?: boolean
  isManager?: boolean
  error?: string
}> => {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: "인증되지 않은 사용자입니다." }
    }

    const { data: group, error } = await supabase.from("groups").select("*").eq("id", groupId).single()

    if (error) {
      throw error
    }

    if (!group) {
      return { success: false, error: "그룹을 찾을 수 없습니다." }
    }

    // 사용자 권한 확인
    const { data: membership } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", groupId)
      .eq("user_id", currentUser.id)
      .single()

    const isOwner = group.owner_id === currentUser.id
    const isManager = isOwner || membership?.role === "manager"

    return {
      success: true,
      group,
      isOwner,
      isManager,
    }
  } catch (error) {
    console.error("그룹 상세 정보 가져오기 오류:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    }
  }
}

export const getGroupMembers = async (
  groupId: string,
): Promise<{ success: boolean; members?: GroupMember[]; error?: string }> => {
  try {
    const { data: members, error } = await supabase
      .from("group_members")
      .select("*")
      .eq("group_id", groupId)
      .not("accepted_at", "is", null)

    if (error) {
      throw error
    }

    return { success: true, members: members || [] }
  } catch (error) {
    console.error("그룹 멤버 가져오기 오류:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    }
  }
}

export const getGroupReports = async (
  groupId: string,
): Promise<{ success: boolean; reports?: Report[]; error?: string }> => {
  try {
    const { data: reports, error } = await supabase
      .from("reports")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })

    if (error) {
      throw error
    }

    return { success: true, reports: reports || [] }
  } catch (error) {
    console.error("그룹 보고서 가져오기 오류:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    }
  }
}

export const updateGroup = async (
  groupId: string,
  updates: { name?: string },
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.from("groups").update(updates).eq("id", groupId)

    if (error) {
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error("그룹 업데이트 오류:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    }
  }
}

export const inviteToGroup = async (
  groupId: string,
  emails: string[],
  role: string,
): Promise<{
  success: boolean
  invited?: number
  notFound?: string[]
  error?: string
}> => {
  try {
    let invited = 0
    const notFound: string[] = []

    for (const email of emails) {
      // 사용자 존재 확인
      const { data: user } = await supabase.from("users").select("id").eq("email", email).single()

      if (!user) {
        notFound.push(email)
        continue
      }

      // 이미 멤버인지 확인
      const { data: existingMember } = await supabase
        .from("group_members")
        .select("id")
        .eq("group_id", groupId)
        .eq("user_id", user.id)
        .single()

      if (existingMember) {
        continue // 이미 멤버인 경우 스킵
      }

      // 초대 생성
      const { error } = await supabase.from("group_members").insert({
        group_id: groupId,
        user_id: user.id,
        role,
        invited_at: new Date().toISOString(),
        accepted_at: new Date().toISOString(), // 자동 수락
      })

      if (!error) {
        invited++
      }
    }

    return { success: true, invited, notFound }
  } catch (error) {
    console.error("그룹 초대 오류:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    }
  }
}
