import { supabase } from "./supabase"
import type { Session } from "@supabase/supabase-js"

export interface FormattedReport {
  id: string
  title: string
  content: string
  user_id: string
  user_name: string | null
  user_email: string | null
  group_id: string | null
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

export const getReportDetails = async (reportId: string) => {
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
    return null
  }

  if (!report) {
    console.warn(`Report with ID ${reportId} not found`)
    return null
  }

  // 타입 안전한 방식으로 데이터 접근
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

  return formattedReport
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

  const formattedReports: FormattedReport[] = reports.map((report) => {
    const typedReport = report as ReportWithUser
    return {
      id: typedReport.id,
      title: typedReport.title || "보고서",
      content: typedReport.content,
      user_id: typedReport.users.id,
      user_name: typedReport.users.name,
      user_email: typedReport.users.email,
      group_id: groupId,
      created_at: typedReport.created_at,
      updated_at: typedReport.updated_at || typedReport.created_at,
      summary: typedReport.summary,
      reviewed: typedReport.reviewed,
      auther_id: typedReport.users.id,
    }
  })

  return formattedReports
}

export const getReportsByUser = async (session: Session) => {
  const currentUser = session?.user

  if (!currentUser) {
    console.error("No current user")
    return []
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

  if (error) {
    console.error(error)
    return []
  }

  if (!reports) {
    return []
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

  return formattedReports
}
