import { supabase } from "./supabase"
import type { ReportStatistics, MonthlyTrend } from "@/types"

// 보고서 통계 가져오기
export const getReportStatistics = async (
  groupId: string,
  period: "day" | "week" | "month" | "year" = "week",
): Promise<{ success: boolean; statistics?: ReportStatistics; error?: string }> => {
  try {
    // 기간에 따른 시작일 계산
    const now = new Date()
    const startDate = new Date()

    switch (period) {
      case "day":
        startDate.setDate(now.getDate() - 1)
        break
      case "week":
        startDate.setDate(now.getDate() - 7)
        break
      case "month":
        startDate.setMonth(now.getMonth() - 1)
        break
      case "year":
        startDate.setFullYear(now.getFullYear() - 1)
        break
    }

    // 보고서 데이터 가져오기
    const { data: reports, error: reportsError } = await supabase
      .from("reports")
      .select(`
        id,
        created_at,
        auther_id,
        content,
        summary,
        users:auther_id(id, name)
      `)
      .eq("group_id", groupId)
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true })

    if (reportsError) throw reportsError

    // 입력 데이터 가져오기
    const { data: inputData, error: inputError } = await supabase
      .from("undefined_inputs")
      .select(`
        id,
        field_id,
        value,
        report_id
      `)
      .eq("group_id", groupId)
      .not("report_id", "is", null)

    if (inputError) throw inputError

    // 입력 설정 가져오기
    const { data: inputSettings, error: settingsError } = await supabase
      .from("input_settings")
      .select("id, field_name, field_type")
      .eq("group_id", groupId)

    if (settingsError) throw settingsError

    // 통계 계산
    const totalReports = reports.length

    // 상태별 통계
    const statusCounts: Record<string, number> = {
      완료: 0,
      진행중: 0,
      미완료: 0,
      연장: 0,
      없음: 0,
    }

    // 필드별 통계
    const fieldStats: Record<string, Record<string, number>> = {}

    // 교사별 통계
    const teacherStats: Record<
      string,
      {
        total: number
        completed: number
        inProgress: number
        incomplete: number
      }
    > = {}

    // 날짜별 통계
    const dateStats: Record<string, number> = {}

    // 통계 데이터 처리
    reports.forEach((report) => {
      // 교사 통계
      const users = report.users as { id: string; name: string } | null
      const teacherId = users?.id
      const teacherName = users?.name || "알 수 없음"

      if (!teacherStats[teacherName]) {
        teacherStats[teacherName] = {
          total: 0,
          completed: 0,
          inProgress: 0,
          incomplete: 0,
        }
      }
      teacherStats[teacherName].total++

      // 날짜 통계 (YYYY-MM-DD 형식)
      const reportDate = new Date(report.created_at).toISOString().split("T")[0]
      dateStats[reportDate] = (dateStats[reportDate] || 0) + 1

      // 해당 보고서의 입력 데이터 찾기
      const reportInputs = inputData.filter((input) => input.report_id === report.id)

      // 입력 데이터 처리
      reportInputs.forEach((input) => {
        // 입력 설정 찾기
        const setting = inputSettings.find((s) => s.id === input.field_id)
        if (!setting) return

        // 상태 필드인 경우
        if (setting.field_type === "select" || setting.field_name.includes("상태")) {
          if (statusCounts.hasOwnProperty(input.value)) {
            statusCounts[input.value]++
          }

          // 교사별 상태 통계
          if (teacherId) {
            if (input.value === "완료") teacherStats[teacherName].completed++
            else if (input.value === "진행중") teacherStats[teacherName].inProgress++
            else if (input.value === "미완료") teacherStats[teacherName].incomplete++
          }
        }

        // 필드별 통계
        if (!fieldStats[setting.field_name]) {
          fieldStats[setting.field_name] = {}
        }

        fieldStats[setting.field_name][input.value] = (fieldStats[setting.field_name][input.value] || 0) + 1
      })
    })

    return {
      success: true,
      statistics: {
        totalReports,
        statusCounts,
        fieldStats,
        teacherStats,
        dateStats,
      },
    }
  } catch (error) {
    console.error("Error getting report statistics:", error instanceof Error ? error.message : String(error))
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 월별 추이 통계
export const getMonthlyTrends = async (
  groupId: string,
  months = 6,
): Promise<{ success: boolean; trends?: MonthlyTrend[]; error?: string }> => {
  try {
    // 시작 월 계산
    const now = new Date()
    const startDate = new Date()
    startDate.setMonth(now.getMonth() - months + 1)
    startDate.setDate(1)
    startDate.setHours(0, 0, 0, 0)

    // 보고서 데이터 가져오기
    const { data: reports, error: reportsError } = await supabase
      .from("reports")
      .select(`
        id,
        created_at
      `)
      .eq("group_id", groupId)
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true })

    if (reportsError) throw reportsError

    // 입력 데이터 가져오기
    const { data: inputData, error: inputError } = await supabase
      .from("undefined_inputs")
      .select(`
        id,
        field_id,
        value,
        report_id
      `)
      .eq("group_id", groupId)
      .not("report_id", "is", null)

    if (inputError) throw inputError

    // 월별 통계 초기화
    const monthlyStats: Record<
      string,
      {
        month: string
        reports: number
        completed: number
        inProgress: number
        incomplete: number
      }
    > = {}

    // 모든 월에 대한 초기 데이터 설정
    for (let i = 0; i < months; i++) {
      const monthDate = new Date(startDate)
      monthDate.setMonth(startDate.getMonth() + i)

      const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`
      const monthName = monthDate.toLocaleString("ko-KR", { month: "long" })

      monthlyStats[monthKey] = {
        month: monthName,
        reports: 0,
        completed: 0,
        inProgress: 0,
        incomplete: 0,
      }
    }

    // 보고서 데이터 처리
    reports.forEach((report) => {
      const reportDate = new Date(report.created_at)
      const monthKey = `${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, "0")}`

      if (monthlyStats[monthKey]) {
        monthlyStats[monthKey].reports++

        // 해당 보고서의 입력 데이터 찾기
        const reportInputs = inputData.filter((input) => input.report_id === report.id)

        // 상태 카운트
        let hasStatusInput = false
        reportInputs.forEach((input) => {
          if (input.value === "완료") {
            monthlyStats[monthKey].completed++
            hasStatusInput = true
          } else if (input.value === "진행중") {
            monthlyStats[monthKey].inProgress++
            hasStatusInput = true
          } else if (input.value === "미완료") {
            monthlyStats[monthKey].incomplete++
            hasStatusInput = true
          }
        })

        // 상태 입력이 없는 경우 기본값으로 처리
        if (!hasStatusInput) {
          monthlyStats[monthKey].completed++
        }
      }
    })

    // 배열로 변환
    const trends = Object.values(monthlyStats)

    return {
      success: true,
      trends,
    }
  } catch (error) {
    console.error("Error getting monthly trends:", error instanceof Error ? error.message : String(error))
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
