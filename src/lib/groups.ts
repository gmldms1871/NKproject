import { supabase } from "./supabase"
import type { Group, GroupMember, UserRole } from "@/types"

interface GroupInviteResult {
  success: boolean
  invited?: number
  notFound?: string[]
  error?: string
}

// 그룹 생성
export const createGroup = async (
  name: string,
  ownerId: string,
): Promise<{ success: boolean; group?: Group; error?: string }> => {
  try {
    // 1. 그룹 생성
    const { data: groupData, error: groupError } = await supabase
      .from("groups")
      .insert({
        name,
        owner_id: ownerId,
      })
      .select()
      .single()

    if (groupError) throw groupError

    // 2. 그룹 멤버로 소유자 추가 (CEO 역할)
    const { error: memberError } = await supabase.from("group_members").insert({
      group_id: groupData.id,
      user_id: ownerId,
      role: "ceo",
      invited_at: new Date().toISOString(),
      accepted_at: new Date().toISOString(), // 소유자는 자동으로 수락됨
    })

    if (memberError) throw memberError

    return { success: true, group: groupData as Group }
  } catch (error) {
    console.error("Error creating group:", error instanceof Error ? error.message : String(error))
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 그룹 초대
export const inviteToGroup = async (groupId: string, emails: string[], role: string): Promise<GroupInviteResult> => {
  try {
    // 1. 이메일로 사용자 찾기
    const { data: users, error: userError } = await supabase.from("users").select("id, email").in("email", emails)

    if (userError) throw userError

    // 2. 찾은 사용자들을 그룹에 초대
    const invites = users.map((user) => ({
      group_id: groupId,
      user_id: user.id,
      role,
      invited_at: new Date().toISOString(),
      accepted_at: null, // 초대는 수락 전까지 null
    }))

    if (invites.length > 0) {
      const { error: inviteError } = await supabase.from("group_members").insert(invites)

      if (inviteError) throw inviteError
    }

    // 3. 시스템에 없는 이메일 목록 반환 (실제 구현에서는 이메일 초대 발송 로직 추가)
    const existingEmails = users.map((user) => user.email)
    const notFoundEmails = emails.filter((email) => !existingEmails.includes(email))

    return {
      success: true,
      invited: users.length,
      notFound: notFoundEmails,
    }
  } catch (error) {
    console.error("Error inviting to group:", error instanceof Error ? error.message : String(error))
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 초대 수락
export const acceptInvitation = async (groupMemberId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from("group_members")
      .update({
        accepted_at: new Date().toISOString(),
      })
      .eq("id", groupMemberId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("Error accepting invitation:", error instanceof Error ? error.message : String(error))
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// ��대 거절/취소
export const rejectInvitation = async (groupMemberId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.from("group_members").delete().eq("id", groupMemberId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("Error rejecting invitation:", error instanceof Error ? error.message : String(error))
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 그룹 정보 가져오기
export const getGroupDetails = async (
  groupId: string,
): Promise<{ success: boolean; group?: Group; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from("groups")
      .select(`
        *,
        owner:users!groups_owner_id_fkey(id, name, email)
      `)
      .eq("id", groupId)
      .single()

    if (error) throw error

    return { success: true, group: data as Group }
  } catch (error) {
    console.error("Error getting group details:", error instanceof Error ? error.message : String(error))
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 그룹 멤버 목록 가져오기
export const getGroupMembers = async (
  groupId: string,
): Promise<{ success: boolean; members?: GroupMember[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from("group_members")
      .select(`
        id,
        role,
        invited_at,
        accepted_at,
        user_id,
        users:user_id(id, name, email, nick_name, phone)
      `)
      .eq("group_id", groupId)

    if (error) throw error

    return { success: true, members: data as unknown as GroupMember[] }
  } catch (error) {
    console.error("Error getting group members:", error instanceof Error ? error.message : String(error))
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 사용자의 대기 중인 초대 가져오기
export const getPendingInvitations = async (
  userId: string,
): Promise<{ success: boolean; invitations?: Record<string, unknown>[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from("group_members")
      .select(`
        id,
        role,
        invited_at,
        groups:group_id(id, name, owner_id),
        owner:groups!inner(owner:users!groups_owner_id_fkey(name))
      `)
      .eq("user_id", userId)
      .is("accepted_at", null)

    if (error) throw error

    return { success: true, invitations: data }
  } catch (error) {
    console.error("Error getting pending invitations:", error instanceof Error ? error.message : String(error))
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 그룹 설정 업데이트
export const updateGroup = async (
  groupId: string,
  updates: { name?: string },
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.from("groups").update(updates).eq("id", groupId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("Error updating group:", error instanceof Error ? error.message : String(error))
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 멤버 역할 변경
export const updateMemberRole = async (
  groupMemberId: string,
  newRole: UserRole,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.from("group_members").update({ role: newRole }).eq("id", groupMemberId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("Error updating member role:", error instanceof Error ? error.message : String(error))
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 멤버 제거
export const removeMember = async (groupMemberId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.from("group_members").delete().eq("id", groupMemberId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("Error removing member:", error instanceof Error ? error.message : String(error))
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 기본 입력 설정 생성
export const createDefaultInputSettings = async (groupId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // 기본 입력 설정 정의
    const defaultSettings = [
      // 상태 필드
      { field_name: "숙제·테스트 관리", field_type: "select", is_required: true },
      { field_name: "교재 점검", field_type: "select", is_required: true },
      { field_name: "상담 진행", field_type: "select", is_required: true },
      { field_name: "분석", field_type: "select", is_required: true },

      // 추가 입력 필드
      { field_name: "테스트 입력 상세", field_type: "text", is_required: false },
      { field_name: "숙제 관련 상세", field_type: "text", is_required: false },
      { field_name: "상담 내용", field_type: "text", is_required: false },
      { field_name: "추가 업무", field_type: "text", is_required: false },
    ] as const

    // 설정 데이터 준비
    const inputSettings = defaultSettings.map((setting) => ({
      group_id: groupId,
      field_name: setting.field_name,
      field_type: setting.field_type,
      is_inquired: setting.is_required, // is_required를 is_inquired로 변경
    }))

    // 입력 설정 저장
    const { error } = await supabase.from("input_settings").insert(inputSettings)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("Error creating default input settings:", error instanceof Error ? error.message : String(error))
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
