import { supabaseAdmin } from "./supabase";
import { Database } from "./types/types";

type FormResponse = Database["public"]["Tables"]["form_responses"]["Row"];
type Form = Database["public"]["Tables"]["forms"]["Row"];
type Class = Database["public"]["Tables"]["classes"]["Row"];
type GroupMember = Database["public"]["Tables"]["group_member"]["Row"];
type Report = Database["public"]["Tables"]["reports"]["Row"];

// API 응답 타입 정의
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// 통계 데이터 타입 정의
export interface GroupStatistics {
  // 기본 정보
  totalMembers: number;
  totalClasses: number;
  totalForms: number;
  totalReports: number;

  // 폼 응답 통계
  formResponseStats: {
    totalResponses: number;
    completedResponses: number;
    pendingResponses: number;
    completionRate: number;
  };

  // 보고서 통계
  reportStats: {
    totalReports: number;
    completedReports: number;
    pendingReports: number;
    rejectedReports: number;
    completionRate: number;
  };

  // 월별 통계
  monthlyStats: {
    month: string;
    formsCreated: number;
    responsesReceived: number;
    reportsCompleted: number;
  }[];

  // 클래스별 통계
  classStats: {
    classId: string;
    className: string;
    memberCount: number;
    responseCount: number;
    completionRate: number;
  }[];

  // 폼별 응답 통계
  formStats: {
    formId: string;
    formTitle: string;
    totalResponses: number;
    completionRate: number;
    averageRating?: number;
  }[];

  // 역할별 멤버 통계
  roleStats: {
    roleName: string;
    memberCount: number;
  }[];
}

// 그룹 통계 조회
export async function getGroupStatistics(
  groupId: string,
  userId: string
): Promise<ApiResponse<GroupStatistics>> {
  try {
    // 사용자가 그룹의 오너인지 확인
    const { data: group, error: groupError } = await supabaseAdmin
      .from("groups")
      .select("owner_id")
      .eq("id", groupId)
      .single();

    if (groupError || !group) {
      return { success: false, error: "그룹을 찾을 수 없습니다." };
    }

    if (group.owner_id !== userId) {
      return { success: false, error: "통계를 볼 권한이 없습니다." };
    }

    // 먼저 그룹의 폼 ID들을 가져옴
    const { data: groupForms, error: formsError } = await supabaseAdmin
      .from("forms")
      .select("id")
      .eq("group_id", groupId);

    if (formsError) {
      return { success: false, error: "폼 데이터를 불러오는데 실패했습니다." };
    }

    const formIds = groupForms?.map((f) => f.id) || [];

    // 기본 통계 데이터 조회
    const [membersResult, classesResult, formsResult, formResponsesResult, reportsResult] =
      await Promise.all([
        // 멤버 수
        supabaseAdmin.from("group_member").select("id").eq("group_id", groupId),

        // 클래스 수
        supabaseAdmin.from("classes").select("id").eq("group_id", groupId),

        // 폼 수
        supabaseAdmin.from("forms").select("id").eq("group_id", groupId),

        // 폼 응답 수 (폼이 있는 경우에만)
        formIds.length > 0
          ? supabaseAdmin
              .from("form_responses")
              .select("id, status, submitted_at")
              .in("form_id", formIds)
          : Promise.resolve({ data: [], error: null }),

        // 보고서 수 (폼이 있는 경우에만)
        formIds.length > 0
          ? supabaseAdmin
              .from("reports")
              .select("id, stage, teacher_completed_at, time_teacher_completed_at")
              .in("form_id", formIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

    if (
      membersResult.error ||
      classesResult.error ||
      formsResult.error ||
      formResponsesResult.error ||
      reportsResult.error
    ) {
      return { success: false, error: "통계 데이터를 불러오는데 실패했습니다." };
    }

    const totalMembers = membersResult.data?.length || 0;
    const totalClasses = classesResult.data?.length || 0;
    const totalForms = formsResult.data?.length || 0;
    const totalReports = reportsResult.data?.length || 0;

    // 폼 응답 통계 계산
    const responses = formResponsesResult.data || [];
    const completedResponses = responses.filter((r) => r.status === "completed").length;
    const pendingResponses = responses.filter((r) => r.status === "pending").length;
    const completionRate = responses.length > 0 ? (completedResponses / responses.length) * 100 : 0;

    // 보고서 통계 계산
    const reports = reportsResult.data || [];
    const completedReports = reports.filter(
      (r) => r.teacher_completed_at && r.time_teacher_completed_at
    ).length;
    const pendingReports = reports.filter(
      (r) => !r.teacher_completed_at || !r.time_teacher_completed_at
    ).length;
    const rejectedReports = reports.filter((r) => r.stage === -1).length;
    const reportCompletionRate = reports.length > 0 ? (completedReports / reports.length) * 100 : 0;

    // 월별 통계 계산 (최근 6개월)
    const monthlyStats = await getMonthlyStats(groupId);

    // 클래스별 통계 계산
    const classStats = await getClassStats(groupId);

    // 폼별 통계 계산
    const formStats = await getFormStats(groupId);

    // 역할별 통계 계산
    const roleStats = await getRoleStats(groupId);

    const statistics: GroupStatistics = {
      totalMembers,
      totalClasses,
      totalForms,
      totalReports,
      formResponseStats: {
        totalResponses: responses.length,
        completedResponses,
        pendingResponses,
        completionRate: Math.round(completionRate * 100) / 100,
      },
      reportStats: {
        totalReports: reports.length,
        completedReports,
        pendingReports,
        rejectedReports,
        completionRate: Math.round(reportCompletionRate * 100) / 100,
      },
      monthlyStats,
      classStats,
      formStats,
      roleStats,
    };

    return { success: true, data: statistics };
  } catch (error) {
    console.error("통계 조회 중 오류:", error);
    return { success: false, error: "통계 조회 중 오류가 발생했습니다." };
  }
}

// 월별 통계 조회
async function getMonthlyStats(groupId: string) {
  const months = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(date.toISOString().slice(0, 7)); // YYYY-MM 형식
  }

  // 그룹의 폼 ID들을 미리 가져옴
  const { data: groupForms } = await supabaseAdmin
    .from("forms")
    .select("id")
    .eq("group_id", groupId);

  const formIds = groupForms?.map((f) => f.id) || [];

  const monthlyStats = [];

  for (const month of months) {
    const startDate = `${month}-01`;
    const endDate = new Date(
      new Date(startDate).getFullYear(),
      new Date(startDate).getMonth() + 1,
      0
    )
      .toISOString()
      .slice(0, 10);

    const [formsResult, responsesResult, reportsResult] = await Promise.all([
      // 해당 월에 생성된 폼 수
      supabaseAdmin
        .from("forms")
        .select("id")
        .eq("group_id", groupId)
        .gte("created_at", startDate)
        .lt("created_at", `${endDate}T23:59:59`),

      // 해당 월에 받은 응답 수 (폼이 있는 경우에만)
      formIds.length > 0
        ? supabaseAdmin
            .from("form_responses")
            .select("id")
            .in("form_id", formIds)
            .gte("created_at", startDate)
            .lt("created_at", `${endDate}T23:59:59`)
        : Promise.resolve({ data: [], error: null }),

      // 해당 월에 완료된 보고서 수 (폼이 있는 경우에만)
      formIds.length > 0
        ? supabaseAdmin
            .from("reports")
            .select("id")
            .in("form_id", formIds)
            .not("teacher_completed_at", "is", null)
            .not("time_teacher_completed_at", "is", null)
            .gte("teacher_completed_at", startDate)
            .lt("teacher_completed_at", `${endDate}T23:59:59`)
        : Promise.resolve({ data: [], error: null }),
    ]);

    monthlyStats.push({
      month: month,
      formsCreated: formsResult.data?.length || 0,
      responsesReceived: responsesResult.data?.length || 0,
      reportsCompleted: reportsResult.data?.length || 0,
    });
  }

  return monthlyStats;
}

// 클래스별 통계 조회
async function getClassStats(groupId: string) {
  const { data: classes, error } = await supabaseAdmin
    .from("classes")
    .select("id, name")
    .eq("group_id", groupId);

  if (error || !classes) return [];

  const classStats = [];

  for (const classItem of classes) {
    // 해당 클래스의 멤버 수 조회
    const { data: members } = await supabaseAdmin
      .from("class_members")
      .select("id")
      .eq("class_id", classItem.id);

    // 해당 클래스의 폼 응답 수 조회
    const { data: responses } = await supabaseAdmin
      .from("form_responses")
      .select("id, status")
      .eq("class_id", classItem.id);

    const totalResponses = responses?.length || 0;
    const completedResponses = responses?.filter((r) => r.status === "completed").length || 0;
    const completionRate = totalResponses > 0 ? (completedResponses / totalResponses) * 100 : 0;

    classStats.push({
      classId: classItem.id,
      className: classItem.name,
      memberCount: members?.length || 0,
      responseCount: totalResponses,
      completionRate: Math.round(completionRate * 100) / 100,
    });
  }

  return classStats;
}

// 폼별 통계 조회
async function getFormStats(groupId: string) {
  const { data: forms, error } = await supabaseAdmin
    .from("forms")
    .select("id, title")
    .eq("group_id", groupId);

  if (error || !forms) return [];

  const formStats = [];

  for (const form of forms) {
    // 해당 폼의 응답 수 조회
    const { data: responses } = await supabaseAdmin
      .from("form_responses")
      .select("id, status")
      .eq("form_id", form.id);

    const totalResponses = responses?.length || 0;
    const completedResponses = responses?.filter((r) => r.status === "completed").length || 0;
    const completionRate = totalResponses > 0 ? (completedResponses / totalResponses) * 100 : 0;

    // 평균 평점 계산 (rating_questions가 있는 경우)
    let averageRating = undefined;
    if (responses && responses.length > 0) {
      const responseIds = responses.map((r) => r.id);
      const { data: ratingResponses } = await supabaseAdmin
        .from("form_question_responses")
        .select("rating_response")
        .in("form_response_id", responseIds)
        .not("rating_response", "is", null);

      if (ratingResponses && ratingResponses.length > 0) {
        const totalRating = ratingResponses.reduce((sum, r) => sum + (r.rating_response || 0), 0);
        averageRating = Math.round((totalRating / ratingResponses.length) * 100) / 100;
      }
    }

    formStats.push({
      formId: form.id,
      formTitle: form.title,
      totalResponses,
      completionRate: Math.round(completionRate * 100) / 100,
      averageRating,
    });
  }

  return formStats;
}

// 역할별 통계 조회
async function getRoleStats(groupId: string) {
  const { data: members, error } = await supabaseAdmin
    .from("group_member")
    .select(
      `
      group_roles(name)
    `
    )
    .eq("group_id", groupId);

  if (error || !members) return [];

  const roleCounts: { [key: string]: number } = {};

  members.forEach((member) => {
    const roleName = member.group_roles?.name || "Unknown";
    roleCounts[roleName] = (roleCounts[roleName] || 0) + 1;
  });

  return Object.entries(roleCounts).map(([roleName, memberCount]) => ({
    roleName,
    memberCount,
  }));
}
