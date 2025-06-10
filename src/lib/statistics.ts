// lib/statistics.ts
// 통계 관리 관련 함수들 - 그룹별, 폼별, 학생별, 성과 통계 등

import { supabase } from "./supabase";
import type {
  APIResponse,
  GroupStatistics,
  FormStatistics,
  ClassStatistics,
  StudentProgress,
  FormInstanceStatus,
  ReportStatus,
  UserRole,
} from "./types";

/**
 * 대시보드 종합 통계 조회
 * @param groupId 그룹 ID
 * @returns 대시보드 통계 정보
 */
export async function getDashboardStatistics(groupId: string): Promise<
  APIResponse<{
    overview: {
      total_students: number;
      total_forms: number;
      completion_rate: number;
      pending_reports: number;
    };
    recent_activity: Array<{
      type: string;
      description: string;
      timestamp: string;
    }>;
    form_progress: Array<{
      form_title: string;
      total_assigned: number;
      completed: number;
      completion_rate: number;
    }>;
    class_performance: Array<{
      class_name: string;
      student_count: number;
      avg_completion_rate: number;
      avg_score?: number;
    }>;
  }>
> {
  try {
    // 기본 개요 통계
    const [studentsResult, formsResult, formInstancesResult, reportsResult] = await Promise.all([
      // 학생 수
      supabase
        .from("group_members")
        .select("*", { count: "exact", head: true })
        .eq("group_id", groupId)
        .eq("role", "student")
        .not("accepted_at", "is", null),

      // 폼 수
      supabase
        .from("form_templates")
        .select("*", { count: "exact", head: true })
        .eq("group_id", groupId),

      // 폼 인스턴스
      supabase.from("form_instances").select("status").eq("group_id", groupId),

      // 보고서
      supabase
        .from("reports")
        .select("stage, form_instance:form_instances!inner(group_id)")
        .eq("form_instance.group_id", groupId),
    ]);

    const totalStudents = studentsResult.count || 0;
    const totalForms = formsResult.count || 0;

    const formInstances = formInstancesResult.data || [];
    const completedInstances = formInstances.filter(
      (instance) => instance.status === "final_completed"
    ).length;
    const completionRate =
      formInstances.length > 0 ? Math.round((completedInstances / formInstances.length) * 100) : 0;

    const reports = reportsResult.data || [];
    const pendingReports = reports.filter((report) => report.stage !== "completed").length;

    // 폼별 진행률
    const { data: formProgress, error: formProgressError } = await supabase
      .from("form_templates")
      .select(
        `
        id,
        title,
        form_instances (
          id,
          status
        )
      `
      )
      .eq("group_id", groupId);

    if (formProgressError) {
      return { success: false, error: formProgressError.message };
    }

    const formProgressStats = formProgress.map((form) => {
      const instances = form.form_instances || [];
      const completed = instances.filter((i) => i.status === "final_completed").length;
      return {
        form_title: form.title,
        total_assigned: instances.length,
        completed,
        completion_rate:
          instances.length > 0 ? Math.round((completed / instances.length) * 100) : 0,
      };
    });

    // 반별 성과
    const { data: classPerformance, error: classError } = await supabase
      .from("classes")
      .select(
        `
        id,
        name,
        class_members (
          id,
          role,
          user_id
        )
      `
      )
      .eq("group_id", groupId);

    if (classError) {
      return { success: false, error: classError.message };
    }

    const classStats = await Promise.all(
      classPerformance.map(async (classData) => {
        const students = classData.class_members.filter((m) => m.role === "student");
        const studentIds = students.map((s) => s.user_id);

        if (studentIds.length === 0) {
          return {
            class_name: classData.name,
            student_count: 0,
            avg_completion_rate: 0,
          };
        }

        // 해당 반 학생들의 폼 인스턴스 조회
        const { data: classInstances } = await supabase
          .from("form_instances")
          .select("status")
          .eq("group_id", groupId)
          .in("student_id", studentIds);

        const totalInstances = classInstances?.length || 0;
        const completedInstances =
          classInstances?.filter((i) => i.status === "final_completed").length || 0;

        const avgCompletionRate =
          totalInstances > 0 ? Math.round((completedInstances / totalInstances) * 100) : 0;

        return {
          class_name: classData.name,
          student_count: students.length,
          avg_completion_rate: avgCompletionRate,
        };
      })
    );

    // 최근 활동 (간단한 예시)
    const recentActivity = [
      {
        type: "form_completed",
        description: "새로운 폼이 완료되었습니다",
        timestamp: new Date().toISOString(),
      },
    ];

    const statistics = {
      overview: {
        total_students: totalStudents,
        total_forms: totalForms,
        completion_rate: completionRate,
        pending_reports: pendingReports,
      },
      recent_activity: recentActivity,
      form_progress: formProgressStats,
      class_performance: classStats,
    };

    return { success: true, data: statistics };
  } catch (error) {
    return { success: false, error: "대시보드 통계 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 그룹별 상세 통계 조회
 * @param groupId 그룹 ID
 * @returns 그룹 통계 정보
 */
export async function getGroupDetailedStatistics(groupId: string): Promise<
  APIResponse<
    GroupStatistics & {
      monthly_trends: Array<{
        month: string;
        forms_created: number;
        forms_completed: number;
        students_joined: number;
      }>;
      role_distribution: Record<UserRole, number>;
      form_types_distribution: Record<string, number>;
    }
  >
> {
  try {
    // 기본 그룹 통계
    const basicStats = await getGroupStatistics(groupId);
    if (!basicStats.success) {
      return basicStats;
    }

    // 월별 트렌드 (최근 6개월)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [formsCreatedData, formsCompletedData, studentsJoinedData] = await Promise.all([
      // 생성된 폼
      supabase
        .from("form_templates")
        .select("created_at")
        .eq("group_id", groupId)
        .gte("created_at", sixMonthsAgo.toISOString()),

      // 완료된 폼
      supabase
        .from("form_instances")
        .select("submitted_at")
        .eq("group_id", groupId)
        .eq("status", "final_completed")
        .gte("submitted_at", sixMonthsAgo.toISOString()),

      // 가입한 학생
      supabase
        .from("group_members")
        .select("accepted_at, role")
        .eq("group_id", groupId)
        .gte("accepted_at", sixMonthsAgo.toISOString()),
    ]);

    // 월별 데이터 집계
    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toISOString().slice(0, 7); // YYYY-MM

      const formsCreated =
        formsCreatedData.data?.filter((f) => f.created_at?.startsWith(monthKey)).length || 0;

      const formsCompleted =
        formsCompletedData.data?.filter((f) => f.submitted_at?.startsWith(monthKey)).length || 0;

      const studentsJoined =
        studentsJoinedData.data?.filter(
          (s) => s.accepted_at?.startsWith(monthKey) && s.role === "student"
        ).length || 0;

      monthlyTrends.push({
        month: monthKey,
        forms_created: formsCreated,
        forms_completed: formsCompleted,
        students_joined: studentsJoined,
      });
    }

    // 역할별 분포
    const roleDistribution =
      studentsJoinedData.data?.reduce((acc, member) => {
        const role = member.role as UserRole;
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, {} as Record<UserRole, number>) || ({} as Record<UserRole, number>);

    // 폼 타입별 분포 (필드 타입 기준)
    const { data: formTypes } = await supabase
      .from("form_fields")
      .select("field_type, form_template:form_templates!inner(group_id)")
      .eq("form_template.group_id", groupId);

    const formTypesDistribution =
      formTypes?.reduce((acc, field) => {
        acc[field.field_type] = (acc[field.field_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

    const detailedStats = {
      ...basicStats.data!,
      monthly_trends: monthlyTrends,
      role_distribution: roleDistribution,
      form_types_distribution: formTypesDistribution,
    };

    return { success: true, data: detailedStats };
  } catch (error) {
    return { success: false, error: "그룹 상세 통계 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 폼별 상세 통계 조회
 * @param formTemplateId 폼 템플릿 ID
 * @returns 폼 상세 통계
 */
export async function getFormDetailedStatistics(formTemplateId: string): Promise<
  APIResponse<{
    basic_stats: FormStatistics;
    response_analysis: Array<{
      field_name: string;
      field_type: string;
      response_count: number;
      completion_rate: number;
      common_values?: Array<{ value: string; count: number }>;
    }>;
    timeline: Array<{
      date: string;
      submissions: number;
      completions: number;
    }>;
    class_breakdown: Array<{
      class_name: string;
      assigned: number;
      completed: number;
      avg_score?: number;
    }>;
  }>
> {
  try {
    // 기본 폼 통계
    const basicStats = await getFormStatistics(formTemplateId);
    if (!basicStats.success) {
      return { success: false, error: basicStats.error };
    }

    // 폼 필드 및 응답 분석
    const { data: formData, error: formError } = await supabase
      .from("form_templates")
      .select(
        `
        *,
        form_fields (*),
        form_instances (
          id,
          status,
          submitted_at,
          class_id,
          form_responses (*)
        )
      `
      )
      .eq("id", formTemplateId)
      .single();

    if (formError) {
      return { success: false, error: formError.message };
    }

    // 필드별 응답 분석
    const responseAnalysis = formData.form_fields.map((field) => {
      const fieldResponses = formData.form_instances
        .flatMap((instance) => instance.form_responses)
        .filter((response) => response.field_id === field.id);

      const responseCount = fieldResponses.length;
      const totalInstances = formData.form_instances.length;
      const completionRate =
        totalInstances > 0 ? Math.round((responseCount / totalInstances) * 100) : 0;

      // 공통 값 분석 (텍스트 필드 제외)
      let commonValues: Array<{ value: string; count: number }> = [];
      if (["select", "radio", "rating"].includes(field.field_type)) {
        const valueCounts = fieldResponses.reduce((acc, response) => {
          const value = String(response.value);
          acc[value] = (acc[value] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        commonValues = Object.entries(valueCounts)
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
      }

      return {
        field_name: field.field_name,
        field_type: field.field_type,
        response_count: responseCount,
        completion_rate: completionRate,
        common_values: commonValues.length > 0 ? commonValues : undefined,
      };
    });

    // 타임라인 분석 (최근 30일)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const timeline = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().slice(0, 10); // YYYY-MM-DD

      const submissions = formData.form_instances.filter((instance) =>
        instance.submitted_at?.startsWith(dateStr)
      ).length;

      const completions = formData.form_instances.filter(
        (instance) =>
          instance.status === "final_completed" && instance.submitted_at?.startsWith(dateStr)
      ).length;

      timeline.push({
        date: dateStr,
        submissions,
        completions,
      });
    }

    // 반별 분석
    const { data: classes } = await supabase
      .from("classes")
      .select("id, name")
      .eq("group_id", formData.group_id);

    const classBreakdown = await Promise.all(
      (classes || []).map(async (classData) => {
        const classInstances = formData.form_instances.filter(
          (instance) => instance.class_id === classData.id
        );

        const assigned = classInstances.length;
        const completed = classInstances.filter(
          (instance) => instance.status === "final_completed"
        ).length;

        return {
          class_name: classData.name,
          assigned,
          completed,
          avg_score: undefined, // TODO: 점수 계산 로직
        };
      })
    );

    const detailedStats = {
      basic_stats: basicStats.data!,
      response_analysis: responseAnalysis,
      timeline,
      class_breakdown: classBreakdown,
    };

    return { success: true, data: detailedStats };
  } catch (error) {
    return { success: false, error: "폼 상세 통계 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 학생별 성과 통계 조회
 * @param studentId 학생 ID
 * @param groupId 그룹 ID
 * @returns 학생 성과 통계
 */
export async function getStudentPerformanceStatistics(
  studentId: string,
  groupId: string
): Promise<
  APIResponse<{
    overview: {
      total_forms_assigned: number;
      completed_forms: number;
      completion_rate: number;
      avg_completion_time?: number;
    };
    form_history: Array<{
      form_title: string;
      assigned_date: string;
      completed_date?: string;
      status: FormInstanceStatus;
      score?: number;
    }>;
    monthly_progress: Array<{
      month: string;
      forms_completed: number;
      avg_score?: number;
    }>;
    strengths_weaknesses: {
      strong_areas: string[];
      improvement_areas: string[];
    };
  }>
> {
  try {
    // 학생의 폼 인스턴스 조회
    const { data: formInstances, error: instancesError } = await supabase
      .from("form_instances")
      .select(
        `
        *,
        form_template:form_templates (
          id,
          title
        ),
        form_responses (*),
        reports (*)
      `
      )
      .eq("student_id", studentId)
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });

    if (instancesError) {
      return { success: false, error: instancesError.message };
    }

    // 개요 통계
    const totalAssigned = formInstances.length;
    const completed = formInstances.filter(
      (instance) => instance.status === "final_completed"
    ).length;
    const completionRate = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;

    // 완료 시간 계산
    const completedInstances = formInstances.filter(
      (instance) =>
        instance.status === "final_completed" && instance.created_at && instance.submitted_at
    );

    let avgCompletionTime: number | undefined;
    if (completedInstances.length > 0) {
      const totalTime = completedInstances.reduce((sum, instance) => {
        const start = new Date(instance.created_at!).getTime();
        const end = new Date(instance.submitted_at!).getTime();
        return sum + (end - start);
      }, 0);
      avgCompletionTime = Math.round(totalTime / completedInstances.length / (1000 * 60 * 60)); // 시간 단위
    }

    // 폼 히스토리
    const formHistory = formInstances.map((instance) => ({
      form_title: instance.form_template?.title || "제목 없음",
      assigned_date: instance.created_at!,
      completed_date: instance.submitted_at || undefined,
      status: instance.status as FormInstanceStatus,
      score: undefined, // TODO: 점수 계산 로직
    }));

    // 월별 진행률 (최근 6개월)
    const monthlyProgress = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toISOString().slice(0, 7);

      const monthCompleted = formInstances.filter(
        (instance) =>
          instance.status === "final_completed" && instance.submitted_at?.startsWith(monthKey)
      ).length;

      monthlyProgress.push({
        month: monthKey,
        forms_completed: monthCompleted,
        avg_score: undefined, // TODO: 점수 계산
      });
    }

    // 강점/약점 분석 (임시)
    const strengthsWeaknesses = {
      strong_areas: ["문제 해결", "창의적 사고"],
      improvement_areas: ["시간 관리", "세부 사항 주의"],
    };

    const statistics = {
      overview: {
        total_forms_assigned: totalAssigned,
        completed_forms: completed,
        completion_rate: completionRate,
        avg_completion_time: avgCompletionTime,
      },
      form_history: formHistory,
      monthly_progress: monthlyProgress,
      strengths_weaknesses: strengthsWeaknesses,
    };

    return { success: true, data: statistics };
  } catch (error) {
    return { success: false, error: "학생 성과 통계 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 반별 비교 통계 조회
 * @param groupId 그룹 ID
 * @returns 반별 비교 통계
 */
export async function getClassComparisonStatistics(groupId: string): Promise<
  APIResponse<
    Array<{
      class_name: string;
      student_count: number;
      avg_completion_rate: number;
      avg_response_time: number;
      top_performers: Array<{ name: string; completion_rate: number }>;
      common_challenges: string[];
    }>
  >
> {
  try {
    const { data: classes, error: classError } = await supabase
      .from("classes")
      .select(
        `
        id,
        name,
        class_members (
          id,
          role,
          users (id, name)
        )
      `
      )
      .eq("group_id", groupId);

    if (classError) {
      return { success: false, error: classError.message };
    }

    const classStats = await Promise.all(
      classes.map(async (classData) => {
        const students = classData.class_members.filter((m) => m.role === "student");
        const studentIds = students.map((s) => s.users.id);

        if (studentIds.length === 0) {
          return {
            class_name: classData.name,
            student_count: 0,
            avg_completion_rate: 0,
            avg_response_time: 0,
            top_performers: [],
            common_challenges: [],
          };
        }

        // 해당 반 학생들의 폼 인스턴스 조회
        const { data: instances } = await supabase
          .from("form_instances")
          .select("*")
          .eq("group_id", groupId)
          .in("student_id", studentIds);

        const totalInstances = instances?.length || 0;
        const completedInstances =
          instances?.filter((i) => i.status === "final_completed").length || 0;

        const avgCompletionRate =
          totalInstances > 0 ? Math.round((completedInstances / totalInstances) * 100) : 0;

        // 학생별 성과 계산
        const studentPerformances = await Promise.all(
          students.map(async (student) => {
            const studentInstances =
              instances?.filter((i) => i.student_id === student.users.id) || [];

            const studentCompleted = studentInstances.filter(
              (i) => i.status === "final_completed"
            ).length;

            const studentCompletionRate =
              studentInstances.length > 0
                ? Math.round((studentCompleted / studentInstances.length) * 100)
                : 0;

            return {
              name: student.users.name || "이름 없음",
              completion_rate: studentCompletionRate,
            };
          })
        );

        const topPerformers = studentPerformances
          .sort((a, b) => b.completion_rate - a.completion_rate)
          .slice(0, 3);

        return {
          class_name: classData.name,
          student_count: students.length,
          avg_completion_rate: avgCompletionRate,
          avg_response_time: 0, // TODO: 응답 시간 계산
          top_performers: topPerformers,
          common_challenges: ["시간 관리", "문제 이해"], // TODO: 실제 분석
        };
      })
    );

    return { success: true, data: classStats };
  } catch (error) {
    return { success: false, error: "반별 비교 통계 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 보고서 생성 통계 조회
 * @param groupId 그룹 ID
 * @returns 보고서 통계
 */
export async function getReportGenerationStatistics(groupId: string): Promise<
  APIResponse<{
    total_reports: number;
    reports_by_stage: Record<ReportStatus, number>;
    avg_processing_time: {
      stage_1: number; // 시간 단위
      stage_2: number;
      final: number;
    };
    monthly_report_count: Array<{
      month: string;
      generated: number;
      completed: number;
    }>;
    teacher_productivity: Array<{
      teacher_name: string;
      reports_reviewed: number;
      avg_review_time: number;
    }>;
  }>
> {
  try {
    // 기본 보고서 통계
    const { data: reports, error: reportsError } = await supabase
      .from("reports")
      .select(
        `
        *,
        form_instance:form_instances!inner (
          group_id,
          created_at,
          submitted_at
        ),
        reviewer:users!reports_reviewed_by_fkey (
          id,
          name
        )
      `
      )
      .eq("form_instance.group_id", groupId);

    if (reportsError) {
      return { success: false, error: reportsError.message };
    }

    const totalReports = reports.length;

    // 단계별 보고서 수
    const reportsByStage = reports.reduce((acc, report) => {
      const stage = report.stage as ReportStatus;
      acc[stage] = (acc[stage] || 0) + 1;
      return acc;
    }, {} as Record<ReportStatus, number>);

    // 처리 시간 계산 (임시)
    const avgProcessingTime = {
      stage_1: 2, // 평균 2시간
      stage_2: 1, // 평균 1시간
      final: 0.5, // 평균 30분
    };

    // 월별 보고서 수 (최근 6개월)
    const monthlyReportCount = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toISOString().slice(0, 7);

      const generated = reports.filter((report) => report.created_at?.startsWith(monthKey)).length;

      const completed = reports.filter(
        (report) => report.stage === "completed" && report.updated_at?.startsWith(monthKey)
      ).length;

      monthlyReportCount.push({
        month: monthKey,
        generated,
        completed,
      });
    }

    // 교사 생산성
    const teacherProductivity = Object.values(
      reports.reduce((acc, report) => {
        if (report.reviewer?.id && report.reviewer?.name) {
          const teacherId = report.reviewer.id;
          if (!acc[teacherId]) {
            acc[teacherId] = {
              teacher_name: report.reviewer.name,
              reports_reviewed: 0,
              avg_review_time: 0,
            };
          }
          acc[teacherId].reports_reviewed++;
        }
        return acc;
      }, {} as Record<string, any>)
    );

    const statistics = {
      total_reports: totalReports,
      reports_by_stage: reportsByStage,
      avg_processing_time: avgProcessingTime,
      monthly_report_count: monthlyReportCount,
      teacher_productivity: teacherProductivity,
    };

    return { success: true, data: statistics };
  } catch (error) {
    return { success: false, error: "보고서 생성 통계 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 그룹 통계 조회 (기존 함수 - 다른 파일에서 이미 구현되었지만 여기서도 참조)
 */
export async function getGroupStatistics(groupId: string): Promise<APIResponse<GroupStatistics>> {
  // groups.ts에서 구현된 함수와 동일
  // 여기서는 간단한 버전만 구현
  try {
    const [membersResult, classesResult, formsResult, instancesResult] = await Promise.all([
      supabase
        .from("group_members")
        .select("role")
        .eq("group_id", groupId)
        .not("accepted_at", "is", null),

      supabase.from("classes").select("*", { count: "exact", head: true }).eq("group_id", groupId),

      supabase
        .from("form_templates")
        .select("*", { count: "exact", head: true })
        .eq("group_id", groupId),

      supabase.from("form_instances").select("status").eq("group_id", groupId),
    ]);

    const members = membersResult.data || [];
    const memberCounts = members.reduce(
      (acc, member) => {
        const role = member.role as keyof typeof acc;
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      },
      { student: 0, teacher: 0, part_time: 0, admin: 0 }
    );

    const instances = instancesResult.data || [];
    const completed = instances.filter((i) => i.status === "final_completed").length;
    const pending = instances.filter((i) => i.status !== "final_completed").length;

    const statistics: GroupStatistics = {
      total_students: memberCounts.student,
      total_teachers: memberCounts.teacher,
      total_part_time: memberCounts.part_time,
      total_classes: classesResult.count || 0,
      total_forms: formsResult.count || 0,
      completed_forms: completed,
      pending_forms: pending,
      completion_rate: instances.length > 0 ? Math.round((completed / instances.length) * 100) : 0,
    };

    return { success: true, data: statistics };
  } catch (error) {
    return { success: false, error: "그룹 통계 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 폼 통계 조회 (기존 함수 참조)
 */
export async function getFormStatistics(templateId: string): Promise<APIResponse<FormStatistics>> {
  // forms.ts에서 구현된 함수와 동일한 로직
  try {
    const { data: template, error: templateError } = await supabase
      .from("form_templates")
      .select("*")
      .eq("id", templateId)
      .single();

    if (templateError) {
      return { success: false, error: templateError.message };
    }

    const { data: instances, error: instancesError } = await supabase
      .from("form_instances")
      .select("status")
      .eq("form_template_id", templateId);

    if (instancesError) {
      return { success: false, error: instancesError.message };
    }

    const totalAssigned = instances.length;
    const completed = instances.filter((i) => i.status === "final_completed").length;
    const inProgress = instances.filter((i) =>
      ["student_completed", "part_time_completed", "teacher_completed"].includes(i.status || "")
    ).length;
    const notStarted = instances.filter((i) => i.status === "not_started").length;

    const statistics: FormStatistics = {
      form_id: templateId,
      form_title: template.title,
      total_assigned: totalAssigned,
      completed,
      in_progress: inProgress,
      not_started: notStarted,
      completion_rate: totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0,
      class_stats: [], // 별도 구현 필요
    };

    return { success: true, data: statistics };
  } catch (error) {
    return { success: false, error: "폼 통계 조회 중 오류가 발생했습니다." };
  }
}
