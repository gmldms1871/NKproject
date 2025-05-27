import { supabase, getCurrentUser } from "./supabase"

export interface FormattedReport {
  id: string
  title: string
  content: string
  user_id: string
  user_name: string | null
  user_email: string | null
  group_id: string | null // Changed from string to string | null
  created_at: string
  updated_at: string
  summary: string | null
  reviewed: boolean | null
  auther_id: string
}

// 데이터베이스 조인 결과 타입 정의
interface ReportWithUser {
  id: string
  title: string | null
  content: string
  created_at: string
  updated_at: string | null
  summary: string | null
  reviewed: boolean | null
  auther_id: string
  group_id: string
  users: {
    id: string
    name: string | null
    email: string
  }
}

interface ReportWithGroup {
  id: string
  title: string | null
  content: string
  created_at: string
  updated_at: string | null
  summary: string | null
  reviewed: boolean | null
  group_id: string
  groups: {
    id: string
    name: string
  } | null
}

export const getReportDetails = async (
  reportId: string,
): Promise<{ success: boolean; report?: FormattedReport; error?: string }> => {
  try {
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
      console.error(error)
      return { success: false, error: error.message }
    }

    if (!report) {
      return { success: false, error: "보고서를 찾을 수 없습니다." }
    }

    const typedReport = report as ReportWithUser
    const formattedReport: FormattedReport = {
      id: typedReport.id,
      content: typedReport.content,
      user_id: typedReport.users.id,
      user_name: typedReport.users.name,
      user_email: typedReport.users.email,
      group_id: typedReport.group_id,
      created_at: typedReport.created_at,
      summary: typedReport.summary,
      reviewed: typedReport.reviewed,
      auther_id: typedReport.auther_id,
      title: typedReport.title || "보고서",
      updated_at: typedReport.updated_at || typedReport.created_at,
    }

    return { success: true, report: formattedReport }
  } catch (error) {
    console.error("보고서 상세 정보 가져오기 오류:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    }
  }
}

export const getReportsByGroup = async (groupId: string) => {
  const { data: reports, error } = await supabase
    .from("reports")
    .select(
      `
  id,
  title,
  content,
  created_at,
  updated_at,
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

  if (error) {
    console.error(error)
    return []
  }

  if (!reports) {
    return []
  }

  // Update the formattedReport creation in getGroupReports to handle null group_id:
  const formattedReports: FormattedReport[] = reports.map((report) => {
    const typedReport = report as ReportWithUser
    return {
      id: typedReport.id,
      title: typedReport.title || "보고서",
      content: typedReport.content,
      user_id: typedReport.users.id,
      user_name: typedReport.users.name,
      user_email: typedReport.users.email,
      group_id: groupId || null, // Ensure it's string | null
      created_at: typedReport.created_at,
      updated_at: typedReport.updated_at || typedReport.created_at,
      summary: typedReport.summary,
      reviewed: typedReport.reviewed,
      auther_id: typedReport.users.id,
    }
  })

  return formattedReports
}

export const getReportsByUser = async (): Promise<{
  success: boolean
  reports?: FormattedReport[]
  error?: string
}> => {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return { success: false, error: "인증되지 않은 사용자입니다." }
    }

    const { data: reports, error } = await supabase
      .from("reports")
      .select(
        `
        id,
        title,
        content,
        created_at,
        updated_at,
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
      console.error(error)
      return { success: false, error: error.message }
    }

    if (!reports) {
      return { success: true, reports: [] }
    }

    const formattedReports: FormattedReport[] = reports.map((report) => {
      const typedReport = report as ReportWithGroup
      return {
        id: typedReport.id,
        title: typedReport.title || "보고서",
        content: typedReport.content,
        user_id: currentUser.id,
        user_name: currentUser.user_metadata?.name || null,
        user_email: currentUser.email || null,
        group_id: typedReport.group_id,
        created_at: typedReport.created_at,
        updated_at: typedReport.updated_at || typedReport.created_at,
        summary: typedReport.summary,
        reviewed: typedReport.reviewed,
        auther_id: currentUser.id,
      }
    })

    return { success: true, reports: formattedReports }
  } catch (error) {
    console.error("사용자 보고서 가져오기 오류:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    }
  }
}

export const updateReport = async (
  reportId: string,
  updates: { content?: string; title?: string; summary?: string },
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.from("reports").update(updates).eq("id", reportId)

    if (error) {
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error("보고서 업데이트 오류:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    }
  }
}

export const deleteReport = async (reportId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.from("reports").delete().eq("id", reportId)

    if (error) {
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error("보고서 삭제 오류:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    }
  }
}

export const summarizeReport = async (
  reportId: string,
): Promise<{ success: boolean; summary?: string; error?: string }> => {
  try {
    // 보고서 내용 가져오기
    const { data: report, error: fetchError } = await supabase
      .from("reports")
      .select("content")
      .eq("id", reportId)
      .single()

    if (fetchError || !report) {
      throw new Error("보고서를 찾을 수 없습니다.")
    }

    // Gemini API를 사용한 요약 생성 (실제 구현 필요)
    const summary = `${report.content.substring(0, 100)}...` // 임시 요약

    // 요약 저장
    const { error: updateError } = await supabase.from("reports").update({ summary, reviewed: true }).eq("id", reportId)

    if (updateError) {
      throw updateError
    }

    return { success: true, summary }
  } catch (error) {
    console.error("보고서 요약 생성 오류:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    }
  }
}
