import { supabase } from "./supabase"
import { getCurrentUser } from "./supabase"
import type {
  Group,
  FormattedGroupMember,
  FormattedReport,
  GroupMemberWithUser,
  ReportWithUser,
  UserWithEmail,
} from "../../types"

// 그룹 상세 정보 가져오기
export const getGroupDetails = async (
  groupId: string,
): Promise<{ success: boolean; group?: Group; isOwner?: boolean; isManager?: boolean; error?: string }> => {
  try {
    // 현재 사용자 가져오기
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: "인증되지 않은 사용자입니다." }
    }

    // 그룹 정보 가져오기
    const { data: group, error } = await supabase.from("groups").select("*").eq("id", groupId).single()

    if (error) {
      throw error
    }

    if (!group) {
      return { success: false, error: "그룹을 찾을 수 없습니다." }
    }

    // 사용자의 그룹 멤버십 확인
    const { data: membership, error: membershipError } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", groupId)
      .eq("user_id", currentUser.id)
      .single()

    if (membershipError && membershipError.code !== "PGRST116") {
      // PGRST116는 결과가 없을 때 발생하는 에러 코드
      throw membershipError
    }

    // 그룹 소유자 또는 멤버십이 있는지 확인
    const isOwner = group.owner_id === currentUser.id
    const isManager = membership?.role === "manager" || isOwner

    // 소유자나 멤버가 아니면 접근 거부
    if (!isOwner && !membership) {
      return { success: false, error: "이 그룹에 접근할 권한이 없습니다." }
    }

    return { success: true, group, isOwner, isManager }
  } catch (error) {
    console.error("그룹 상세 정보 가져오기 오류:", error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 그룹 멤버 목록 가져오기
export const getGroupMembers = async (
  groupId: string,
): Promise<{ success: boolean; members?: FormattedGroupMember[]; error?: string }> => {
  try {
    // 현재 사용자 가져오기
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: "인증되지 않은 사용자입니다." }
    }

    // 그룹 멤버십 확인
    const { data: membership, error: membershipError } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", groupId)
      .eq("user_id", currentUser.id)
      .single()

    if (membershipError && membershipError.code !== "PGRST116") {
      throw membershipError
    }

    // 그룹 정보 가져오기
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("owner_id")
      .eq("id", groupId)
      .single()

    if (groupError) {
      throw groupError
    }

    // 소유자나 멤버가 아니면 접근 거부
    const isOwner = group.owner_id === currentUser.id
    if (!isOwner && !membership) {
      return { success: false, error: "이 그룹에 접근할 권한이 없습니다." }
    }

    // 그룹 멤버 가져오기
    const { data, error } = await supabase
      .from("group_members")
      .select(`
        id,
        role,
        invited_at,
        accepted_at,
        users:user_id (
          id,
          name,
          email
        )
      `)
      .eq("group_id", groupId)

    if (error) {
      throw error
    }

    // 멤버 데이터 형식 변환
    const members = data as GroupMemberWithUser[]
    const formattedMembers: FormattedGroupMember[] = members.map((member) => ({
      id: member.id,
      group_id: groupId,
      user_id: member.users.id,
      user_name: member.users.name,
      user_email: member.users.email,
      role: member.role,
      invited_at: member.invited_at,
      accepted_at: member.accepted_at,
    }))

    return { success: true, members: formattedMembers }
  } catch (error) {
    console.error("그룹 멤버 가져오기 오류:", error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 그룹 보고서 목록 가져오기
export const getGroupReports = async (
  groupId: string,
): Promise<{ success: boolean; reports?: FormattedReport[]; error?: string }> => {
  try {
    // 현재 사용자 가져오기
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: "인증되지 않은 사용자입니다." }
    }

    // 그룹 멤버십 확인
    const { data: membership, error: membershipError } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", groupId)
      .eq("user_id", currentUser.id)
      .single()

    if (membershipError && membershipError.code !== "PGRST116") {
      throw membershipError
    }

    // 그룹 정보 가져오기
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("owner_id")
      .eq("id", groupId)
      .single()

    if (groupError) {
      throw groupError
    }

    // 소유자나 멤버가 아니면 접근 거부
    const isOwner = group.owner_id === currentUser.id
    if (!isOwner && !membership) {
      return { success: false, error: "이 그룹에 접근할 권한이 없습니다." }
    }

    // 그룹 보고서 가져오기
    const { data, error } = await supabase
      .from("reports")
      .select(`
        id,
        content,
        created_at,
        summary,
        reviewed,
        users:auther_id (
          id,
          name,
          email
        )
      `)
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })

    if (error) {
      throw error
    }

    // 보고서 데이터 형식 변환
    const reports = data as ReportWithUser[]
    const formattedReports: FormattedReport[] = reports.map((report) => ({
      id: report.id,
      content: report.content,
      user_id: report.users.id,
      user_name: report.users.name,
      user_email: report.users.email,
      group_id: groupId,
      created_at: report.created_at,
      summary: report.summary,
      reviewed: report.reviewed,
      auther_id: report.users.id,
      title: "보고서", // 기본값 설정
      updated_at: report.created_at, // 기본값으로 created_at 사용
    }))

    return { success: true, reports: formattedReports }
  } catch (error) {
    console.error("그룹 보고서 가져오기 오류:", error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 그룹 업데이트
export const updateGroup = async (
  groupId: string,
  updates: { name?: string },
): Promise<{ success: boolean; error?: string }> => {
  try {
    // 현재 사용자 가져오기
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: "인증되지 않은 사용자입니다." }
    }

    // 그룹 정보 가져오기
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("owner_id")
      .eq("id", groupId)
      .single()

    if (groupError) {
      throw groupError
    }

    // 그룹 멤버십 확인
    const { data: membership, error: membershipError } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", groupId)
      .eq("user_id", currentUser.id)
      .single()

    if (membershipError && membershipError.code !== "PGRST116") {
      throw membershipError
    }

    // 소유자나 관리자가 아니면 접근 거부
    const isOwner = group.owner_id === currentUser.id
    const isManager = membership?.role === "manager"
    if (!isOwner && !isManager) {
      return { success: false, error: "그룹을 수정할 권한이 없습니다." }
    }

    // 그룹 업데이트
    const { error } = await supabase.from("groups").update(updates).eq("id", groupId)

    if (error) {
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error("그룹 업데이트 오류:", error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 그룹에 멤버 초대
export const inviteToGroup = async (
  groupId: string,
  emails: string[],
  role: string,
): Promise<{ success: boolean; invited?: number; notFound?: string[]; error?: string }> => {
  try {
    // 현재 사용자 가져오기
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: "인증되지 않은 사용자입니다." }
    }

    // 그룹 정보 가져오기
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("owner_id")
      .eq("id", groupId)
      .single()

    if (groupError) {
      throw groupError
    }

    // 그룹 멤버십 확인
    const { data: membership, error: membershipError } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", groupId)
      .eq("user_id", currentUser.id)
      .single()

    if (membershipError && membershipError.code !== "PGRST116") {
      throw membershipError
    }

    // 소유자나 관리자가 아니면 접근 거부
    const isOwner = group.owner_id === currentUser.id
    const isManager = membership?.role === "manager"
    if (!isOwner && !isManager) {
      return { success: false, error: "멤버를 초대할 권한이 없습니다." }
    }

    // 이메일로 사용자 찾기
    const { data, error: usersError } = await supabase.from("users").select("id, email").in("email", emails)

    if (usersError) {
      throw usersError
    }

    // 찾은 사용자와 찾지 못한 이메일 구분
    const foundUsers = (data as UserWithEmail[]) || []
    const foundEmails = foundUsers.map((user) => user.email.toLowerCase())
    const notFoundEmails = emails.filter((email) => !foundEmails.includes(email.toLowerCase()))

    // 이미 그룹에 속한 사용자 필터링
    const { data: existingMembers, error: existingError } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId)
      .in(
        "user_id",
        foundUsers.map((user) => user.id),
      )

    if (existingError) {
      throw existingError
    }

    const existingUserIds = (existingMembers || []).map((member) => member.user_id)
    const newUsers = foundUsers.filter((user) => !existingUserIds.includes(user.id))

    // 새 멤버 초대
    if (newUsers.length > 0) {
      const invitations = newUsers.map((user) => ({
        group_id: groupId,
        user_id: user.id,
        role,
        invited_at: new Date().toISOString(),
      }))

      const { error: inviteError } = await supabase.from("group_members").insert(invitations)

      if (inviteError) {
        throw inviteError
      }
    }

    return {
      success: true,
      invited: newUsers.length,
      notFound: notFoundEmails.length > 0 ? notFoundEmails : undefined,
    }
  } catch (error) {
    console.error("그룹 초대 오류:", error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
