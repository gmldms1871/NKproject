import { supabase } from "@/lib/supabase"

// 데이터베이스 조인 결과 타입 정의
interface ReportWithUser {
  id: string
  title: string | null
  content: string
  created_at: string
  updated_at: string | null
  summary: string | null
  reviewed: boolean | null
  users: {
    id: string
    name: string | null
    email: string
  }
}

// 그룹 정보 가져오기
export const getGroup = async (groupId: string) => {
  const { data, error } = await supabase
    .from("groups")
    .select(
      `
      id,
      name,
      description,
      created_at,
      users (
        id,
        name,
        email
      )
    `,
    )
    .eq("id", groupId)
    .single()

  if (error) {
    console.error("Error fetching group:", error)
    return null
  }

  return data
}

interface FormattedReport {
  id: string
  title: string
  content: string
  user_id: string
  user_name: string | null
  user_email: string | null
  group_id: string
  created_at: string
  updated_at: string
  summary: string | null
  reviewed: boolean | null
  auther_id: string
}

// 그룹 보고서 가져오기
export const getGroupReports = async (groupId: string) => {
  const { data: reports, error } = await supabase
    .from("reports")
    .select(`
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
  `)
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching reports:", error)
    return null
  }

  if (!reports) {
    return null
  }

  const formattedReports: FormattedReport[] = reports.map((report) => {
    const typedReport = report as ReportWithUser
    return {
      id: typedReport.id,
      title: typedReport.title || "보고서",
      content: typedReport.content,
      user_id: typedReport.users.id,
      user_name: typedReport.users.name || null,
      user_email: typedReport.users.email || null,
      group_id: groupId,
      created_at: typedReport.created_at,
      updated_at: typedReport.updated_at || typedReport.created_at,
      summary: typedReport.summary || null,
      reviewed: typedReport.reviewed || null,
      auther_id: typedReport.users.id,
    }
  })

  return formattedReports
}
