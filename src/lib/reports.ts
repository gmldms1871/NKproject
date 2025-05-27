import { supabase } from "./supabase"
import { getCurrentUser } from "./supabase"
import type { FormattedReport, ReportUpdate } from "../../types"

// 보고서 상세 정보 가져오기
export const getReportDetails = async (
  reportId: string,
): Promise<{ success: boolean; report?: FormattedReport; error?: string }> => {
  try {
    // 현재 사용자 가져오기
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: "인증되지 않은 사용자입니다." }
    }

    // 보고서 정보 가져오기
    const { data: report, error } = await supabase
      .from("reports")
      .select(
        `
        *,
        users:auther_id (
          id,
          name,
          email
        )
      `,
      )
      .eq("id", reportId)
      .single()

    if (error) {
      throw error
    }

    if (!report) {
      return { success: false, error: "보고서를 찾을 수 없습니다." }
    }

    // 그룹 멤버십 확인
    const { data: membership, error: membershipError } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", report.group_id)
      .eq("user_id", currentUser.id)
      .single()

    if (membershipError && membershipError.code !== "PGRST116") {
      throw membershipError
    }

    // 그룹 정보 가져오기
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("owner_id")
      .eq("id", report.group_id)
      .single()

    if (groupError) {
      throw groupError
    }

    // 소유자나 멤버가 아니면 접근 거부
    const isOwner = group.owner_id === currentUser.id
    if (!isOwner && !membership) {
      return { success: false, error: "이 보고서에 접근할 권한이 없습니다." }
    }

    // 보고서 데이터 형식 변환
    const formattedReport: FormattedReport = {
      id: report.id,
      content: report.content,
      user_id: report.users.id,
      user_name: report.users.name,
      user_email: report.users.email,
      group_id: report.group_id,
      created_at: report.created_at,
      summary: report.summary,
      reviewed: report.reviewed,
      auther_id: report.auther_id,
      title: "보고서", // 기본값 설정
      updated_at: report.created_at, // 기본값으로 created_at 사용
    }

    return { success: true, report: formattedReport }
  } catch (error) {
    console.error("보고서 상세 정보 가져오기 오류:", error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 보고서 업데이트
export const updateReport = async (
  reportId: string,
  updates: Partial<ReportUpdate>,
): Promise<{ success: boolean; error?: string }> => {
  try {
    // 현재 사용자 가져오기
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: "인증되지 않은 사용자입니다." }
    }

    // 보고서 정보 가져오기
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .select("group_id, auther_id")
      .eq("id", reportId)
      .single()

    if (reportError) {
      throw reportError
    }

    // 작성자가 아니면 접근 거부
    if (report.auther_id !== currentUser.id) {
      // 그룹 소유자 또는 관리자인지 확인
      const { data: group, error: groupError } = await supabase
        .from("groups")
        .select("owner_id")
        .eq("id", report.group_id)
        .single()

      if (groupError) {
        throw groupError
      }

      const { data: membership, error: membershipError } = await supabase
        .from("group_members")
        .select("role")
        .eq("group_id", report.group_id)
        .eq("user_id", currentUser.id)
        .single()

      if (membershipError && membershipError.code !== "PGRST116") {
        throw membershipError
      }

      const isOwner = group.owner_id === currentUser.id
      const isManager = membership?.role === "manager"

      if (!isOwner && !isManager) {
        return { success: false, error: "이 보고서를 수정할 권한이 없습니다." }
      }
    }

    // 보고서 업데이트
    const { error } = await supabase.from("reports").update(updates).eq("id", reportId)

    if (error) {
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error("보고서 업데이트 오류:", error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 보고서 삭제
export const deleteReport = async (reportId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // 현재 사용자 가져오기
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: "인증되지 않은 사용자입니다." }
    }

    // 보고서 정보 가져오기
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .select("group_id, auther_id")
      .eq("id", reportId)
      .single()

    if (reportError) {
      throw reportError
    }

    // 작성자가 아니면 접근 거부
    if (report.auther_id !== currentUser.id) {
      // 그룹 소유자 또는 관리자인지 확인
      const { data: group, error: groupError } = await supabase
        .from("groups")
        .select("owner_id")
        .eq("id", report.group_id)
        .single()

      if (groupError) {
        throw groupError
      }

      const { data: membership, error: membershipError } = await supabase
        .from("group_members")
        .select("role")
        .eq("group_id", report.group_id)
        .eq("user_id", currentUser.id)
        .single()

      if (membershipError && membershipError.code !== "PGRST116") {
        throw membershipError
      }

      const isOwner = group.owner_id === currentUser.id
      const isManager = membership?.role === "manager"

      if (!isOwner && !isManager) {
        return { success: false, error: "이 보고서를 삭제할 권한이 없습니다." }
      }
    }

    // 보고서 삭제
    const { error } = await supabase.from("reports").delete().eq("id", reportId)

    if (error) {
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error("보고서 삭제 오류:", error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 보고서 요약 생성
export const summarizeReport = async (
  reportId: string,
): Promise<{ success: boolean; summary?: string; error?: string }> => {
  try {
    // 현재 사용자 가져오기
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: "인증되지 않은 사용자입니다." }
    }

    // 보고서 정보 가져오기
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .select("content, group_id")
      .eq("id", reportId)
      .single()

    if (reportError) {
      throw reportError
    }

    // 그룹 멤버십 확인
    const { data: membership, error: membershipError } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", report.group_id)
      .eq("user_id", currentUser.id)
      .single()

    if (membershipError && membershipError.code !== "PGRST116") {
      throw membershipError
    }

    // 그룹 정보 가져오기
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("owner_id")
      .eq("id", report.group_id)
      .single()

    if (groupError) {
      throw groupError
    }

    // 소유자나 멤버가 아니면 접근 거부
    const isOwner = group.owner_id === currentUser.id
    if (!isOwner && !membership) {
      return { success: false, error: "이 보고서에 접근할 권한이 없습니다." }
    }

    // 여기서 AI 요약 로직을 구현하거나 외부 API를 호출할 수 있습니다.
    // 예시로 간단한 요약을 생성합니다.
    const summary = `${report.content.substring(0, 100)}...`

    // 요약 업데이트
    const { error } = await supabase.from("reports").update({ summary, reviewed: true }).eq("id", reportId)

    if (error) {
      throw error
    }

    return { success: true, summary }
  } catch (error) {
    console.error("보고서 요약 생성 오류:", error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 그룹의 보고서 목록 가져오기
export const getReportsByGroup = async (
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
      .select(
        `
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
      `,
      )
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })

    if (error) {
      throw error
    }

    // 보고서 데이터 형식 변환
    const reports = data || []
    const formattedReports: FormattedReport[] = reports.map((report: any) => ({
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

// 사용자의 보고서 목록 가져오기
export const getReportsByUser = async (): Promise<{
  success: boolean
  reports?: FormattedReport[]
  error?: string
}> => {
  try {
    // 현재 사용자 가져오기
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: "인증되지 않은 사용자입니다." }
    }

    // 사용자 보고서 가져오기
    const { data, error } = await supabase
      .from("reports")
      .select(
        `
        id,
        content,
        created_at,
        group_id,
        summary,
        reviewed,
        groups:group_id (
          id,
          name
        )
      `,
      )
      .eq("auther_id", currentUser.id)
      .order("created_at", { ascending: false })

    if (error) {
      throw error
    }

    // 보고서 데이터 형식 변환
    const reports = data || []
    const formattedReports: FormattedReport[] = reports.map((report: any) => ({
      id: report.id,
      content: report.content,
      user_id: currentUser.id,
      user_name: currentUser.user_metadata?.name || null,
      user_email: currentUser.email || null,
      group_id: report.group_id,
      created_at: report.created_at,
      summary: report.summary,
      reviewed: report.reviewed,
      auther_id: currentUser.id,
      title: "보고서", // 기본값 설정
      updated_at: report.created_at, // 기본값으로 created_at 사용
    }))

    return { success: true, reports: formattedReports }
  } catch (error) {
    console.error("사용자 보고서 가져오기 오류:", error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
