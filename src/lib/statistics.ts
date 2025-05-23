import { supabase } from "@/lib/supabase"
import { getCurrentUser } from "@/lib/supabase"
import type { ReportStatistics } from "../../types"

// 보고서 통계 가져오기
export const getReportStatistics = async (
  options: { timeRange?: string } = {},
): Promise<{ success: boolean; statistics: ReportStatistics; error?: string }> => {
  try {
    // 현재 사용자 가져오기
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return {
        success: false,
        statistics: {
          total: 0,
          byUser: [],
          monthlyTrend: [],
        },
        error: "인증되지 않은 사용자입니다.",
      }
    }

    // 사용자가 속한 그룹 ID 목록 가져오기
    const { data: memberships, error: membershipError } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", currentUser.id)

    if (membershipError) {
      console.error("그룹 멤버십 가져오기 오류:", membershipError.message || String(membershipError))
      return {
        success: false,
        statistics: {
          total: 0,
          byUser: [],
          monthlyTrend: [],
        },
        error: `그룹 멤버십 가져오기 오류: ${membershipError.message || "알 수 없는 오류"}`,
      }
    }

    const groupIds = (memberships?.map((m) => m.group_id).filter(Boolean) as string[]) || []

    if (groupIds.length === 0) {
      return {
        success: true,
        statistics: {
          total: 0,
          byUser: [],
          monthlyTrend: [],
        },
      }
    }

    // 시간 범위에 따른 필터 설정
    let fromDate: Date | null = null
    const now = new Date()

    if (options.timeRange === "month") {
      fromDate = new Date(now)
      fromDate.setMonth(now.getMonth() - 1)
    } else if (options.timeRange === "quarter") {
      fromDate = new Date(now)
      fromDate.setMonth(now.getMonth() - 3)
    } else if (options.timeRange === "year") {
      fromDate = new Date(now)
      fromDate.setFullYear(now.getFullYear() - 1)
    }

    // 총 보고서 수 가져오기
    let countQuery = supabase.from("reports").select("*", { count: "exact", head: true }).in("group_id", groupIds)

    if (fromDate) {
      countQuery = countQuery.gte("created_at", fromDate.toISOString())
    }

    const { count: totalReports, error: countError } = await countQuery

    if (countError) {
      console.error("보고서 수 가져오기 오류:", countError.message || String(countError))
      return {
        success: false,
        statistics: {
          total: 0,
          byUser: [],
          monthlyTrend: [],
        },
        error: `보고서 수 가져오기 오류: ${countError.message || "알 수 없는 오류"}`,
      }
    }

    // 월별 추이 가져오기
    // 최근 6개월 데이터 또는 시간 범위에 맞는 데이터
    const monthsToFetch = 6
    const months: { [key: string]: { month: string; count: number } } = {}

    // 최근 6개월(또는 지정된 범위) 초기화
    for (let i = 0; i < monthsToFetch; i++) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      const monthLabel = `${date.getFullYear()}.${date.getMonth() + 1}`

      months[monthKey] = {
        month: monthLabel,
        count: 0,
      }
    }

    // 월별 데이터 쿼리
    let monthlyQuery = supabase.from("reports").select("created_at").in("group_id", groupIds)

    if (fromDate) {
      monthlyQuery = monthlyQuery.gte("created_at", fromDate.toISOString())
    } else {
      // 기본적으로 최근 6개월 데이터만 가져오기
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      monthlyQuery = monthlyQuery.gte("created_at", sixMonthsAgo.toISOString())
    }

    const { data: monthlyData, error: monthlyError } = await monthlyQuery

    if (monthlyError) {
      console.error("월별 데이터 가져오기 오류:", monthlyError.message || String(monthlyError))
      return {
        success: false,
        statistics: {
          total: 0,
          byUser: [],
          monthlyTrend: [],
        },
        error: `월별 데이터 가져오기 오류: ${monthlyError.message || "알 수 없는 오류"}`,
      }
    }

    // 월별 데이터 계산
    if (monthlyData) {
      monthlyData.forEach((report) => {
        if (report.created_at) {
          const date = new Date(report.created_at)
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

          if (months[monthKey]) {
            months[monthKey].count++
          }
        }
      })
    }

    // 사용자별 보고서 수 가져오기 - 데이터베이스 스키마에 맞게 수정
    const userStats: { [key: string]: { userId: string; userName: string; count: number } } = {}

    try {
      // 각 그룹별로 쿼리 실행
      for (const groupId of groupIds) {
        // 실제 데이터베이스 스키마에 맞게 쿼리 수정
        const { data: reports, error: reportsError } = await supabase
          .from("reports")
          .select("auther_id, created_at")
          .eq("group_id", groupId)

        if (reportsError) {
          console.error(`그룹 ${groupId}의 보고서 가져오기 오류:`, reportsError.message || String(reportsError))
          continue // 오류가 있어도 다음 그룹으로 계속 진행
        }

        // 각 보고서의 사용자 정보 가져오기
        if (reports) {
          for (const report of reports) {
            if (!report.auther_id) continue

            // 이미 처리한 사용자인지 확인
            if (!userStats[report.auther_id]) {
              // 사용자 정보 가져오기
              const { data: userData, error: userError } = await supabase
                .from("users")
                .select("name")
                .eq("id", report.auther_id)
                .single()

              if (userError) {
                console.error(`사용자 ${report.auther_id} 정보 가져오기 오류:`, userError.message || String(userError))
                userStats[report.auther_id] = {
                  userId: report.auther_id,
                  userName: "사용자",
                  count: 0,
                }
              } else if (userData) {
                userStats[report.auther_id] = {
                  userId: report.auther_id,
                  userName: userData.name || "사용자",
                  count: 0,
                }
              } else {
                userStats[report.auther_id] = {
                  userId: report.auther_id,
                  userName: "사용자",
                  count: 0,
                }
              }
            }

            // 시간 필터 적용
            if (fromDate && report.created_at && new Date(report.created_at) < fromDate) {
              continue
            }

            // 카운트 증가
            userStats[report.auther_id].count++
          }
        }
      }
    } catch (error) {
      console.error("사용자별 보고서 처리 중 오류:", error instanceof Error ? error.message : String(error))
      // 오류가 있어도 계속 진행, 일부 데이터라도 보여주기 위함
    }

    // 결과 형식화
    const statistics: ReportStatistics = {
      total: totalReports || 0,
      byUser: Object.values(userStats).sort((a, b) => b.count - a.count),
      monthlyTrend: Object.values(months)
        .sort((a, b) => {
          const [aYear, aMonth] = a.month.split(".")
          const [bYear, bMonth] = b.month.split(".")
          return Number.parseInt(bYear) - Number.parseInt(aYear) || Number.parseInt(bMonth) - Number.parseInt(aMonth)
        })
        .reverse(),
    }

    return { success: true, statistics }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("보고서 통계 가져오기 오류:", errorMessage)
    return {
      success: false,
      statistics: {
        total: 0,
        byUser: [],
        monthlyTrend: [],
      },
      error: `보고서 통계 가져오기 오류: ${errorMessage}`,
    }
  }
}
