// lib/reports.ts
// 보고서 관리 관련 함수들 - 생성, 수정, 단계 관리, AI 업그레이드 등

import { supabase } from "./supabase";
import type {
  Report,
  ReportInsert,
  ReportUpdate,
  ReportWithDetails,
  FormInstanceWithDetails,
  APIResponse,
  ReportStatus,
  CreateReportData,
  UpdateReportData,
} from "./types";

/**
 * 새 보고서 생성
 * @param reportData 보고서 생성 데이터
 * @returns 생성된 보고서 정보
 */
export async function createReport(reportData: CreateReportData): Promise<APIResponse<Report>> {
  try {
    const { data, error } = await supabase
      .from("reports")
      .insert({
        ...reportData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // 폼 인스턴스 상태 업데이트
    await updateFormInstanceReportStatus(reportData.form_instance_id, reportData.stage);

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "보고서 생성 중 오류가 발생했습니다." };
  }
}

/**
 * 보고서 조회 (상세 정보 포함)
 * @param reportId 보고서 ID
 * @returns 보고서 정보
 */
export async function getReport(reportId: string): Promise<APIResponse<ReportWithDetails>> {
  try {
    const { data, error } = await supabase
      .from("reports")
      .select(
        `
        *,
        form_instance:form_instances (
          *,
          form_template:form_templates (
            *,
            form_fields (*),
            question_concepts (*)
          ),
          student:users!form_instances_student_id_fkey (
            id,
            name,
            email
          ),
          form_responses (*)
        ),
        reviewer:users!reports_reviewed_by_fkey (
          id,
          name,
          email
        )
      `
      )
      .eq("id", reportId)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "보고서 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 보고서 업데이트
 * @param reportId 보고서 ID
 * @param updateData 업데이트 데이터
 * @returns 업데이트된 보고서
 */
export async function updateReport(
  reportId: string,
  updateData: UpdateReportData
): Promise<APIResponse<Report>> {
  try {
    const { data, error } = await supabase
      .from("reports")
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reportId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // 단계가 변경되었다면 폼 인스턴스도 업데이트
    if (updateData.stage) {
      await updateFormInstanceReportStatus(data.form_instance_id, updateData.stage);
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "보고서 업데이트 중 오류가 발생했습니다." };
  }
}

/**
 * 폼 인스턴스 ID로 보고서 조회
 * @param formInstanceId 폼 인스턴스 ID
 * @returns 보고서 정보
 */
export async function getReportByFormInstance(
  formInstanceId: string
): Promise<APIResponse<Report | null>> {
  try {
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("form_instance_id", formInstanceId)
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "보고서 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 시간제 강사의 1단계 보고서 작성
 * @param formInstanceId 폼 인스턴스 ID
 * @param content 보고서 내용
 * @param reviewedBy 검토자 ID
 * @returns 작성된 보고서
 */
export async function createStage1Report(
  formInstanceId: string,
  content: string,
  reviewedBy: string
): Promise<APIResponse<Report>> {
  try {
    // 기존 보고서가 있는지 확인
    const existingResult = await getReportByFormInstance(formInstanceId);
    if (!existingResult.success) {
      return existingResult;
    }

    if (existingResult.data) {
      // 기존 보고서 업데이트
      return await updateReport(existingResult.data.id, {
        content,
        stage: "stage_1",
        reviewed_by: reviewedBy,
      });
    } else {
      // 새 보고서 생성
      return await createReport({
        form_instance_id: formInstanceId,
        content,
        stage: "stage_1",
        reviewed_by: reviewedBy,
      });
    }
  } catch (error) {
    return { success: false, error: "1단계 보고서 작성 중 오류가 발생했습니다." };
  }
}

/**
 * 선생님의 2단계 보고서 작성
 * @param formInstanceId 폼 인스턴스 ID
 * @param content 보고서 내용 (1단계 내용에 추가)
 * @param reviewedBy 검토자 ID
 * @returns 작성된 보고서
 */
export async function createStage2Report(
  formInstanceId: string,
  content: string,
  reviewedBy: string
): Promise<APIResponse<Report>> {
  try {
    const existingResult = await getReportByFormInstance(formInstanceId);
    if (!existingResult.success || !existingResult.data) {
      return { success: false, error: "1단계 보고서가 존재하지 않습니다." };
    }

    // 기존 내용에 추가
    const combinedContent = `${existingResult.data.content}\n\n--- 선생님 의견 ---\n${content}`;

    return await updateReport(existingResult.data.id, {
      content: combinedContent,
      stage: "stage_2",
      reviewed_by: reviewedBy,
    });
  } catch (error) {
    return { success: false, error: "2단계 보고서 작성 중 오류가 발생했습니다." };
  }
}

/**
 * 최종 보고서 업로드 (AI 처리 후)
 * @param formInstanceId 폼 인스턴스 ID
 * @param finalReportUrl 최종 보고서 파일 URL
 * @param reviewedBy 검토자 ID
 * @returns 업데이트된 보고서
 */
export async function uploadFinalReport(
  formInstanceId: string,
  finalReportUrl: string,
  reviewedBy: string
): Promise<APIResponse<Report>> {
  try {
    const existingResult = await getReportByFormInstance(formInstanceId);
    if (!existingResult.success || !existingResult.data) {
      return { success: false, error: "보고서가 존재하지 않습니다." };
    }

    return await updateReport(existingResult.data.id, {
      stage: "completed",
      final_report_url: finalReportUrl,
      reviewed_by: reviewedBy,
    });
  } catch (error) {
    return { success: false, error: "최종 보고서 업로드 중 오류가 발생했습니다." };
  }
}

/**
 * 보고서 반려 (이전 단계로 되돌리기)
 * @param reportId 보고서 ID
 * @param reason 반려 사유
 * @param rejectedBy 반려자 ID
 * @returns 반려 결과
 */
export async function rejectReport(
  reportId: string,
  reason: string,
  rejectedBy: string
): Promise<APIResponse<Report>> {
  try {
    const reportResult = await getReport(reportId);
    if (!reportResult.success || !reportResult.data) {
      return { success: false, error: "보고서를 찾을 수 없습니다." };
    }

    const currentStage = reportResult.data.stage;
    let previousStage: ReportStatus;

    // 이전 단계 결정
    switch (currentStage) {
      case "stage_1":
        previousStage = "stage_0";
        break;
      case "stage_2":
        previousStage = "stage_1";
        break;
      case "completed":
        previousStage = "stage_2";
        break;
      default:
        return { success: false, error: "반려할 수 없는 단계입니다." };
    }

    // 보고서 단계 되돌리기
    const updateResult = await updateReport(reportId, {
      stage: previousStage,
      reviewed_by: rejectedBy,
    });

    if (!updateResult.success) {
      return updateResult;
    }

    // 반려 알림 전송
    // TODO: 반려 알림 로직 구현

    return {
      success: true,
      data: updateResult.data!,
      message: `보고서가 ${previousStage} 단계로 반려되었습니다.`,
    };
  } catch (error) {
    return { success: false, error: "보고서 반려 중 오류가 발생했습니다." };
  }
}

/**
 * 그룹 내 모든 보고서 조회
 * @param groupId 그룹 ID
 * @param stage 단계 필터 (선택)
 * @returns 보고서 목록
 */
export async function getGroupReports(
  groupId: string,
  stage?: ReportStatus
): Promise<APIResponse<ReportWithDetails[]>> {
  try {
    let query = supabase
      .from("reports")
      .select(
        `
        *,
        form_instance:form_instances (
          *,
          form_template:form_templates (title),
          student:users!form_instances_student_id_fkey (name, email)
        ),
        reviewer:users!reports_reviewed_by_fkey (name)
      `
      )
      .eq("form_instance.group_id", groupId);

    if (stage) {
      query = query.eq("stage", stage);
    }

    const { data, error } = await query.order("updated_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "그룹 보고서 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 학생별 보고서 조회
 * @param studentId 학생 ID
 * @param groupId 그룹 ID (선택)
 * @returns 학생의 보고서 목록
 */
export async function getStudentReports(
  studentId: string,
  groupId?: string
): Promise<APIResponse<ReportWithDetails[]>> {
  try {
    let query = supabase
      .from("reports")
      .select(
        `
        *,
        form_instance:form_instances (
          *,
          form_template:form_templates (title),
          student:users!form_instances_student_id_fkey (name, email)
        ),
        reviewer:users!reports_reviewed_by_fkey (name)
      `
      )
      .eq("form_instance.student_id", studentId);

    if (groupId) {
      query = query.eq("form_instance.group_id", groupId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "학생 보고서 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 검토자별 보고서 조회
 * @param reviewerId 검토자 ID
 * @param stage 단계 필터 (선택)
 * @returns 검토자의 보고서 목록
 */
export async function getReviewerReports(
  reviewerId: string,
  stage?: ReportStatus
): Promise<APIResponse<ReportWithDetails[]>> {
  try {
    let query = supabase
      .from("reports")
      .select(
        `
        *,
        form_instance:form_instances (
          *,
          form_template:form_templates (title),
          student:users!form_instances_student_id_fkey (name, email)
        )
      `
      )
      .eq("reviewed_by", reviewerId);

    if (stage) {
      query = query.eq("stage", stage);
    }

    const { data, error } = await query.order("updated_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "검토자 보고서 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 시간제 강사가 검토해야 할 보고서 목록 (1단계 대기)
 * @param partTimeTeacherId 시간제 강사 ID
 * @param groupId 그룹 ID
 * @returns 검토 대기 보고서 목록
 */
export async function getPartTimeReportQueue(
  partTimeTeacherId: string,
  groupId: string
): Promise<APIResponse<FormInstanceWithDetails[]>> {
  try {
    // 시간제 강사가 담당하는 반의 학생들 조회
    const { data: assignedClasses, error: classError } = await supabase
      .from("class_members")
      .select("class_id")
      .eq("user_id", partTimeTeacherId)
      .eq("role", "part_time");

    if (classError) {
      return { success: false, error: classError.message };
    }

    const classIds = assignedClasses.map((c) => c.class_id);

    if (classIds.length === 0) {
      return { success: true, data: [] };
    }

    // 해당 반 학생들의 학생 완료 상태 폼 인스턴스 조회 (보고서 1단계 대기)
    const { data, error } = await supabase
      .from("form_instances")
      .select(
        `
        *,
        form_template:form_templates (
          *,
          form_fields (*),
          question_concepts (*)
        ),
        student:users!form_instances_student_id_fkey (
          id,
          name,
          email
        ),
        form_responses (*)
      `
      )
      .eq("group_id", groupId)
      .eq("status", "student_completed")
      .in("class_id", classIds)
      .order("submitted_at", { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "시간제 강사 검토 대기 목록 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 선생님이 검토해야 할 보고서 목록 (2단계 대기)
 * @param groupId 그룹 ID
 * @returns 검토 대기 보고서 목록
 */
export async function getTeacherReportQueue(
  groupId: string
): Promise<APIResponse<ReportWithDetails[]>> {
  try {
    const { data, error } = await supabase
      .from("reports")
      .select(
        `
        *,
        form_instance:form_instances (
          *,
          form_template:form_templates (title),
          student:users!form_instances_student_id_fkey (name, email)
        ),
        reviewer:users!reports_reviewed_by_fkey (name)
      `
      )
      .eq("stage", "stage_1")
      .eq("form_instance.group_id", groupId)
      .order("updated_at", { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "선생님 검토 대기 목록 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 보고서 통계 조회
 * @param groupId 그룹 ID
 * @returns 보고서 통계 정보
 */
export async function getReportStatistics(groupId: string): Promise<
  APIResponse<{
    total_reports: number;
    stage_0: number;
    stage_1: number;
    stage_2: number;
    completed: number;
    completion_rate: number;
  }>
> {
  try {
    const { data, error } = await supabase
      .from("reports")
      .select("stage, form_instance:form_instances!inner(group_id)")
      .eq("form_instance.group_id", groupId);

    if (error) {
      return { success: false, error: error.message };
    }

    const totalReports = data.length;
    const stageCounts = data.reduce((acc, report) => {
      acc[report.stage] = (acc[report.stage] || 0) + 1;
      return acc;
    }, {} as Record<ReportStatus, number>);

    const completionRate =
      totalReports > 0 ? Math.round(((stageCounts.completed || 0) / totalReports) * 100) : 0;

    const statistics = {
      total_reports: totalReports,
      stage_0: stageCounts.stage_0 || 0,
      stage_1: stageCounts.stage_1 || 0,
      stage_2: stageCounts.stage_2 || 0,
      completed: stageCounts.completed || 0,
      completion_rate: completionRate,
    };

    return { success: true, data: statistics };
  } catch (error) {
    return { success: false, error: "보고서 통계 조회 중 오류가 발생했습니다." };
  }
}

/**
 * AI를 통한 보고서 업그레이드 (Gemini 연동)
 * @param reportId 보고서 ID
 * @param apiKey Gemini API 키
 * @returns 업그레이드된 보고서
 */
export async function upgradeReportWithAI(
  reportId: string,
  apiKey: string
): Promise<APIResponse<Report>> {
  try {
    const reportResult = await getReport(reportId);
    if (!reportResult.success || !reportResult.data) {
      return { success: false, error: "보고서를 찾을 수 없습니다." };
    }

    const report = reportResult.data;
    if (report.stage !== "stage_2") {
      return { success: false, error: "2단계 완료된 보고서만 AI 업그레이드가 가능합니다." };
    }

    // Gemini API 호출 (별도 유틸리티 함수 구현 필요)
    // const aiReport = await generateAIReport(report.content, report.form_instance, apiKey);

    // 임시로 기본 처리
    const aiEnhancedContent = `${report.content}\n\n--- AI 분석 결과 ---\n[AI 분석 내용이 여기에 들어갑니다]`;

    return await updateReport(reportId, {
      content: aiEnhancedContent,
      ai_enhanced: true,
    });
  } catch (error) {
    return { success: false, error: "AI 보고서 업그레이드 중 오류가 발생했습니다." };
  }
}

/**
 * 폼 인스턴스의 보고서 상태 업데이트 (내부 헬퍼 함수)
 * @param formInstanceId 폼 인스턴스 ID
 * @param reportStage 보고서 단계
 */
async function updateFormInstanceReportStatus(
  formInstanceId: string,
  reportStage: ReportStatus
): Promise<void> {
  let formStatus: string;

  switch (reportStage) {
    case "stage_0":
      formStatus = "student_completed";
      break;
    case "stage_1":
      formStatus = "part_time_completed";
      break;
    case "stage_2":
      formStatus = "teacher_completed";
      break;
    case "completed":
      formStatus = "final_completed";
      break;
    default:
      formStatus = "student_completed";
  }

  await supabase.from("form_instances").update({ status: formStatus }).eq("id", formInstanceId);
}

/**
 * 보고서 내역 기록 (히스토리 관리)
 * @param reportId 보고서 ID
 * @param action 수행된 액션
 * @param performedBy 수행자 ID
 * @param details 상세 내용
 * @returns 기록 결과
 */
export async function logReportHistory(
  reportId: string,
  action: string,
  performedBy: string,
  details?: string
): Promise<APIResponse> {
  try {
    // 별도 history 테이블이 있다면 여기에 로그 저장
    // 현재는 기본 로깅만 수행
    console.log(`Report ${reportId}: ${action} by ${performedBy}`, details);

    return { success: true, message: "보고서 히스토리가 기록되었습니다." };
  } catch (error) {
    return { success: false, error: "보고서 히스토리 기록 중 오류가 발생했습니다." };
  }
}
