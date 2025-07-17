import { supabaseAdmin } from "./supabase";
import { Database } from "./types/types";
import { createNotification } from "./notifications";

// 데이터베이스 타입 import
type Report = Database["public"]["Tables"]["reports"]["Row"];
type ReportInsert = Database["public"]["Tables"]["reports"]["Insert"];
type ReportUpdate = Database["public"]["Tables"]["reports"]["Update"];

type Form = Database["public"]["Tables"]["forms"]["Row"];
type FormResponse = Database["public"]["Tables"]["form_responses"]["Row"];
type FormQuestion = Database["public"]["Tables"]["form_questions"]["Row"];
type FormQuestionResponse = Database["public"]["Tables"]["form_question_responses"]["Row"];
type User = Database["public"]["Tables"]["users"]["Row"];
type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"];

// API 응답 타입 정의
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ===== 요청 타입 정의 =====

export interface CreateReportRequest {
  formId: string;
  formResponseId: string;
  studentName: string;
  className?: string;
  timeTeacherId?: string;
  teacherId?: string;
  supervisionId?: string;
}

export interface AddCommentRequest {
  reportId: string;
  userId: string;
  comment: string;
  commentType: "time_teacher" | "teacher";
}

export interface RejectReportRequest {
  reportId: string;
  rejectedBy: string;
  rejectionReason: string;
}

export interface ResetReportRequest {
  reportId: string;
  resetBy: string;
  resetReason: string;
}

export interface AdvanceReportStageRequest {
  reportId: string;
  userId: string;
  comment?: string;
  commentType: "time_teacher" | "teacher";
}

export interface ReportSearchConditions {
  groupId?: string;
  formId?: string;
  studentName?: string;
  className?: string;
  stage?: number[];
  status?: string[];
  createdAfter?: string;
  createdBefore?: string;
  timeTeacherId?: string;
  teacherId?: string;
}

export interface UpdateReportAssignmentRequest {
  reportId: string;
  timeTeacherId?: string;
  teacherId?: string;
  updatedBy: string;
}

export interface BulkUpdateReportsRequest {
  reportIds: string[];
  timeTeacherId?: string;
  teacherId?: string;
  updatedBy: string;
}

// ===== 응답 타입 정의 =====

export interface QuestionResponseData {
  questionId: string;
  questionType: string;
  questionText: string;
  isRequired: boolean;
  orderIndex: number;
  response: {
    textResponse?: string;
    numberResponse?: number;
    ratingResponse?: number;
    examResponse?: Database["public"]["Tables"]["form_question_responses"]["Row"]["exam_response"];
  };
}

export interface FormResponseData {
  id: string;
  status: string;
  submitted_at: string | null;
  responses: QuestionResponseData[];
}

export interface ReportWithDetails {
  id: string;
  form_id: string | null;
  form_response_id: string | null;
  stage: number | null;
  student_name: string | null;
  class_name: string | null;
  teacher_id: string | null;
  time_teacher_id: string | null;
  supervision_id: string | null;
  teacher_comment: string | null;
  teacher_completed_at: string | null;
  time_teacher_comment: string | null;
  time_teacher_completed_at: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  rejection_reason: string | null;
  draft_status: string | null;
  created_at: string | null;
  updated_at: string | null;
  // 연결된 정보
  form: {
    id: string;
    title: string;
    description: string | null;
    creator_name: string;
    created_at: string | null;
  } | null;
  student: {
    id: string;
    name: string;
    nickname: string;
    class_name?: string;
  } | null;
  timeTeacher?: {
    id: string;
    name: string;
    nickname: string;
  } | null;
  teacher?: {
    id: string;
    name: string;
    nickname: string;
  } | null;
  formResponse: FormResponseData | null;
  // 진행 상태
  progressInfo: {
    currentStage: number;
    status:
      | "waiting_response"
      | "waiting_time_teacher"
      | "waiting_teacher"
      | "completed"
      | "rejected"
      | "reset";
    canEdit: boolean;
    nextAction?: string;
  };
}

export interface ReportSummary {
  totalReports: number;
  completedReports: number;
  inProgressReports: number;
  rejectedReports: number;
  stageDistribution: {
    stage0: number; // 응답 대기
    stage1: number; // 시간강사 검토 대기
    stage2: number; // 선생님 검토 대기
    stage3: number; // 완료
  };
  averageCompletionTime?: number; // 시간 (분)
  recentActivity: {
    date: string;
    count: number;
    type: "submitted" | "commented" | "completed";
  }[];
}

export interface FinalReportData {
  reportId: string;
  formTitle: string;
  studentName: string;
  className?: string;
  submittedAt: string;
  studentResponses: QuestionResponseData[];
  timeTeacherComment?: string;
  timeTeacherCompletedAt?: string;
  teacherComment?: string;
  teacherCompletedAt?: string;
  stage: number;
  finalizedAt?: string;
}

// ===== 유틸리티 함수들 =====

/**
 * 보고서 진행 상태 계산
 */
function calculateProgressInfo(report: Report): ReportWithDetails["progressInfo"] {
  const stage = report.stage || 0;
  let status: ReportWithDetails["progressInfo"]["status"];
  let canEdit = false;
  let nextAction: string | undefined;

  if (report.rejected_at) {
    status = "rejected";
  } else {
    switch (stage) {
      case 0:
        status = "waiting_response";
        nextAction = "학생 응답 대기 중";
        break;
      case 1:
        status = "waiting_time_teacher";
        canEdit = true;
        nextAction = "시간강사 검토 필요";
        break;
      case 2:
        status = "waiting_teacher";
        canEdit = true;
        nextAction = "선생님 검토 필요";
        break;
      case 3:
        status = "completed";
        nextAction = "완료됨";
        break;
      default:
        status = "waiting_response";
    }
  }

  return {
    currentStage: stage,
    status,
    canEdit,
    nextAction,
  };
}

/**
 * 폼 응답 데이터 수집
 */
async function collectFormResponseData(formResponseId: string): Promise<FormResponseData | null> {
  try {
    const { data: formResponse, error: responseError } = await supabaseAdmin
      .from("form_responses")
      .select("*")
      .eq("id", formResponseId)
      .single();

    if (responseError) throw responseError;

    const { data: questionResponses, error: questionsError } = await supabaseAdmin
      .from("form_question_responses")
      .select(
        `
        *,
        form_questions(*)
      `
      )
      .eq("form_response_id", formResponseId)
      .order("form_questions.order_index", { ascending: true });

    if (questionsError) throw questionsError;

    const responses: QuestionResponseData[] = (questionResponses || []).map((qr: any) => ({
      questionId: qr.question_id,
      questionType: qr.form_questions.question_type,
      questionText: qr.form_questions.question_text,
      isRequired: qr.form_questions.is_required,
      orderIndex: qr.form_questions.order_index,
      response: {
        textResponse: qr.text_response,
        numberResponse: qr.number_response,
        ratingResponse: qr.rating_response,
        examResponse: qr.exam_response,
      },
    }));

    return {
      id: formResponse.id,
      status: formResponse.status,
      submitted_at: formResponse.submitted_at,
      responses,
    };
  } catch (error) {
    console.error("Error collecting form response data:", error);
    return null;
  }
}

// ===== 메인 API 함수들 =====

/**
 * 보고서 생성
 */
export async function createReport(request: CreateReportRequest): Promise<ApiResponse<string>> {
  try {
    const { data: report, error } = await supabaseAdmin
      .from("reports")
      .insert({
        form_id: request.formId,
        form_response_id: request.formResponseId,
        student_name: request.studentName,
        class_name: request.className,
        time_teacher_id: request.timeTeacherId,
        teacher_id: request.teacherId,
        supervision_id: request.supervisionId,
        stage: 1, // 시간강사 검토 대기
        draft_status: "waiting_time_teacher",
      })
      .select()
      .single();

    if (error) throw error;

    // 시간강사에게 알림
    if (request.timeTeacherId) {
      await createNotification({
        target_id: request.timeTeacherId,
        creator_id: null,
        type: "report_assigned",
        title: "새로운 보고서 검토 요청",
        content: `학생 ${request.studentName}의 보고서 검토가 요청되었습니다.`,
        action_url: `/reports/${report.id}`,
        related_id: report.id,
        is_read: false,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    return { success: true, data: report.id };
  } catch (error) {
    console.error("Error creating report:", error);
    return { success: false, error: "보고서 생성 중 오류가 발생했습니다." };
  }
}

/**
 * 보고서 상세 조회
 */
export async function getReportDetails(reportId: string): Promise<ApiResponse<ReportWithDetails>> {
  try {
    const { data: report, error } = await supabaseAdmin
      .from("reports")
      .select(
        `
        *,
        forms(
          id, title, description, created_at,
          creator:users!forms_creator_id_fkey(name)
        ),
        form_responses(
          *,
          student:users!form_responses_student_id_fkey(id, name, nickname)
        ),
        time_teacher:users!reports_time_teacher_id_fkey(id, name, nickname),
        teacher:users!reports_teacher_id_fkey(id, name, nickname)
      `
      )
      .eq("id", reportId)
      .single();

    if (error) throw error;
    if (!report) {
      return { success: false, error: "보고서를 찾을 수 없습니다." };
    }

    // 폼 응답 데이터 수집
    let formResponse: FormResponseData | null = null;
    if (report.form_response_id) {
      formResponse = await collectFormResponseData(report.form_response_id);
    }

    const reportWithDetails: ReportWithDetails = {
      id: report.id,
      form_id: report.form_id,
      form_response_id: report.form_response_id,
      stage: report.stage,
      student_name: report.student_name,
      class_name: report.class_name,
      teacher_id: report.teacher_id,
      time_teacher_id: report.time_teacher_id,
      supervision_id: report.supervision_id,
      teacher_comment: report.teacher_comment,
      teacher_completed_at: report.teacher_completed_at,
      time_teacher_comment: report.time_teacher_comment,
      time_teacher_completed_at: report.time_teacher_completed_at,
      rejected_at: report.rejected_at,
      rejected_by: report.rejected_by,
      rejection_reason: report.rejection_reason,
      draft_status: report.draft_status,
      created_at: report.created_at,
      updated_at: report.updated_at,
      form: report.forms
        ? {
            id: report.forms.id,
            title: report.forms.title,
            description: report.forms.description,
            creator_name: report.forms.creator?.name || "Unknown",
            created_at: report.forms.created_at,
          }
        : null,
      student: report.form_responses?.student
        ? {
            id: report.form_responses.student.id,
            name: report.form_responses.student.name,
            nickname: report.form_responses.student.nickname,
            class_name: report.class_name || undefined,
          }
        : null,
      timeTeacher: report.time_teacher
        ? {
            id: report.time_teacher.id,
            name: report.time_teacher.name,
            nickname: report.time_teacher.nickname,
          }
        : undefined,
      teacher: report.teacher
        ? {
            id: report.teacher.id,
            name: report.teacher.name,
            nickname: report.teacher.nickname,
          }
        : undefined,
      formResponse,
      progressInfo: calculateProgressInfo(report),
    };

    return { success: true, data: reportWithDetails };
  } catch (error) {
    console.error("Error fetching report details:", error);
    return { success: false, error: "보고서 상세 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 보고서 코멘트 추가
 */
export async function addReportComment(request: AddCommentRequest): Promise<ApiResponse<boolean>> {
  try {
    const updateData: any = {};

    if (request.commentType === "time_teacher") {
      updateData.time_teacher_comment = request.comment;
      updateData.time_teacher_completed_at = new Date().toISOString();
      updateData.stage = 2; // 다음 단계로 진행
      updateData.draft_status = "waiting_teacher";
    } else {
      updateData.teacher_comment = request.comment;
      updateData.teacher_completed_at = new Date().toISOString();
      updateData.stage = 3; // 완료 단계로 진행
      updateData.draft_status = "completed";
    }

    updateData.updated_at = new Date().toISOString();

    const { error } = await supabaseAdmin
      .from("reports")
      .update(updateData)
      .eq("id", request.reportId);

    if (error) throw error;

    // 다음 담당자에게 알림
    if (request.commentType === "time_teacher") {
      const { data: report } = await supabaseAdmin
        .from("reports")
        .select("teacher_id, student_name")
        .eq("id", request.reportId)
        .single();

      if (report?.teacher_id) {
        await createNotification({
          target_id: report.teacher_id,
          creator_id: request.userId,
          type: "report_stage_advanced",
          title: "보고서 검토 요청",
          content: `${report.student_name} 학생의 보고서 검토가 요청되었습니다.`,
          action_url: `/reports/${request.reportId}`,
          related_id: request.reportId,
          is_read: false,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }
    }

    return { success: true, data: true };
  } catch (error) {
    console.error("Error adding report comment:", error);
    return { success: false, error: "코멘트 추가 중 오류가 발생했습니다." };
  }
}

/**
 * 보고서 반려
 */
export async function rejectReport(request: RejectReportRequest): Promise<ApiResponse<boolean>> {
  try {
    const { error } = await supabaseAdmin
      .from("reports")
      .update({
        rejected_at: new Date().toISOString(),
        rejected_by: request.rejectedBy,
        rejection_reason: request.rejectionReason,
        draft_status: "rejected",
        updated_at: new Date().toISOString(),
      })
      .eq("id", request.reportId);

    if (error) throw error;

    // 보고서 반려 알림
    const { data: report } = await supabaseAdmin
      .from("reports")
      .select("form_responses(student_id), student_name")
      .eq("id", request.reportId)
      .single();

    if (report?.form_responses?.student_id) {
      await createNotification({
        target_id: report.form_responses.student_id,
        creator_id: request.rejectedBy,
        type: "report_rejected",
        title: "보고서가 반려되었습니다",
        content: `반려 사유: ${request.rejectionReason}`,
        action_url: `/reports/${request.reportId}`,
        related_id: request.reportId,
        is_read: false,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    return { success: true, data: true };
  } catch (error) {
    console.error("Error rejecting report:", error);
    return { success: false, error: "보고서 반려 중 오류가 발생했습니다." };
  }
}

/**
 * 보고서 리셋
 */
export async function resetReport(request: ResetReportRequest): Promise<ApiResponse<boolean>> {
  try {
    const { error } = await supabaseAdmin
      .from("reports")
      .update({
        stage: 0, // 첫 번째 단계로 되돌림
        time_teacher_comment: null,
        teacher_comment: null,
        time_teacher_completed_at: null,
        teacher_completed_at: null,
        rejected_at: null,
        rejected_by: null,
        rejection_reason: null,
        draft_status: "waiting_response",
        updated_at: new Date().toISOString(),
      })
      .eq("id", request.reportId);

    if (error) throw error;

    // 보고서 리셋 알림
    const { data: report } = await supabaseAdmin
      .from("reports")
      .select("form_responses(student_id), student_name")
      .eq("id", request.reportId)
      .single();

    if (report?.form_responses?.student_id) {
      await createNotification({
        target_id: report.form_responses.student_id,
        creator_id: request.resetBy,
        type: "report_reset",
        title: "보고서가 리셋되었습니다",
        content: `사유: ${request.resetReason}`,
        action_url: `/reports/${request.reportId}`,
        related_id: request.reportId,
        is_read: false,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    return { success: true, data: true };
  } catch (error) {
    console.error("Error resetting report:", error);
    return { success: false, error: "보고서 리셋 중 오류가 발생했습니다." };
  }
}

/**
 * 보고서 검색
 */
export async function searchReports(
  conditions: ReportSearchConditions
): Promise<ApiResponse<ReportWithDetails[]>> {
  try {
    let query = supabaseAdmin.from("reports").select(
      `
        *,
        forms(
          id, title, description, created_at,
          creator:users!forms_creator_id_fkey(name)
        ),
        form_responses(
          student:users!form_responses_student_id_fkey(id, name, nickname)
        ),
        time_teacher:users!reports_time_teacher_id_fkey(id, name, nickname),
        teacher:users!reports_teacher_id_fkey(id, name, nickname)
      `
    );

    if (conditions.formId) {
      query = query.eq("form_id", conditions.formId);
    }

    if (conditions.studentName) {
      query = query.ilike("student_name", `%${conditions.studentName}%`);
    }

    if (conditions.className) {
      query = query.ilike("class_name", `%${conditions.className}%`);
    }

    if (conditions.stage && conditions.stage.length > 0) {
      query = query.in("stage", conditions.stage);
    }

    if (conditions.timeTeacherId) {
      query = query.eq("time_teacher_id", conditions.timeTeacherId);
    }

    if (conditions.teacherId) {
      query = query.eq("teacher_id", conditions.teacherId);
    }

    if (conditions.createdAfter) {
      query = query.gte("created_at", conditions.createdAfter);
    }

    if (conditions.createdBefore) {
      query = query.lte("created_at", conditions.createdBefore);
    }

    const { data: reports, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;

    const reportsWithDetails: ReportWithDetails[] = (reports || []).map((report: any) => ({
      id: report.id,
      form_id: report.form_id,
      form_response_id: report.form_response_id,
      stage: report.stage,
      student_name: report.student_name,
      class_name: report.class_name,
      teacher_id: report.teacher_id,
      time_teacher_id: report.time_teacher_id,
      supervision_id: report.supervision_id,
      teacher_comment: report.teacher_comment,
      teacher_completed_at: report.teacher_completed_at,
      time_teacher_comment: report.time_teacher_comment,
      time_teacher_completed_at: report.time_teacher_completed_at,
      rejected_at: report.rejected_at,
      rejected_by: report.rejected_by,
      rejection_reason: report.rejection_reason,
      draft_status: report.draft_status,
      created_at: report.created_at,
      updated_at: report.updated_at,
      form: report.forms
        ? {
            id: report.forms.id,
            title: report.forms.title,
            description: report.forms.description,
            creator_name: report.forms.creator?.name || "Unknown",
            created_at: report.forms.created_at,
          }
        : null,
      student: report.form_responses?.student
        ? {
            id: report.form_responses.student.id,
            name: report.form_responses.student.name,
            nickname: report.form_responses.student.nickname,
            class_name: report.class_name || undefined,
          }
        : null,
      timeTeacher: report.time_teacher
        ? {
            id: report.time_teacher.id,
            name: report.time_teacher.name,
            nickname: report.time_teacher.nickname,
          }
        : undefined,
      teacher: report.teacher
        ? {
            id: report.teacher.id,
            name: report.teacher.name,
            nickname: report.teacher.nickname,
          }
        : undefined,
      formResponse: null, // 상세 조회시에만 로드
      progressInfo: calculateProgressInfo(report),
    }));

    return { success: true, data: reportsWithDetails };
  } catch (error) {
    console.error("Error searching reports:", error);
    return { success: false, error: "보고서 검색 중 오류가 발생했습니다." };
  }
}

/**
 * 그룹별 보고서 조회
 */
export async function getReportsByGroup(
  groupId: string
): Promise<ApiResponse<ReportWithDetails[]>> {
  try {
    const { data: reports, error } = await supabaseAdmin
      .from("reports")
      .select(
        `
        *,
        forms!inner(
          id, title, description, created_at, group_id,
          creator:users!forms_creator_id_fkey(name)
        ),
        form_responses(
          student:users!form_responses_student_id_fkey(id, name, nickname)
        ),
        time_teacher:users!reports_time_teacher_id_fkey(id, name, nickname),
        teacher:users!reports_teacher_id_fkey(id, name, nickname)
      `
      )
      .eq("forms.group_id", groupId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const reportsWithDetails: ReportWithDetails[] = [];

    for (const report of reports || []) {
      let formResponse: FormResponseData | null = null;
      if (report.form_response_id) {
        formResponse = await collectFormResponseData(report.form_response_id);
      }

      reportsWithDetails.push({
        id: report.id,
        form_id: report.form_id,
        form_response_id: report.form_response_id,
        stage: report.stage,
        student_name: report.student_name,
        class_name: report.class_name,
        teacher_id: report.teacher_id,
        time_teacher_id: report.time_teacher_id,
        supervision_id: report.supervision_id,
        teacher_comment: report.teacher_comment,
        teacher_completed_at: report.teacher_completed_at,
        time_teacher_comment: report.time_teacher_comment,
        time_teacher_completed_at: report.time_teacher_completed_at,
        rejected_at: report.rejected_at,
        rejected_by: report.rejected_by,
        rejection_reason: report.rejection_reason,
        draft_status: report.draft_status,
        created_at: report.created_at,
        updated_at: report.updated_at,
        form: report.forms
          ? {
              id: report.forms.id,
              title: report.forms.title,
              description: report.forms.description,
              creator_name: report.forms.creator?.name || "Unknown",
              created_at: report.forms.created_at,
            }
          : null,
        student: report.form_responses?.student
          ? {
              id: report.form_responses.student.id,
              name: report.form_responses.student.name,
              nickname: report.form_responses.student.nickname,
              class_name: report.class_name || undefined,
            }
          : null,
        timeTeacher: report.time_teacher
          ? {
              id: report.time_teacher.id,
              name: report.time_teacher.name,
              nickname: report.time_teacher.nickname,
            }
          : undefined,
        teacher: report.teacher
          ? {
              id: report.teacher.id,
              name: report.teacher.name,
              nickname: report.teacher.nickname,
            }
          : undefined,
        formResponse,
        progressInfo: calculateProgressInfo(report),
      });
    }

    return { success: true, data: reportsWithDetails };
  } catch (error) {
    console.error("Error fetching reports:", error);
    return { success: false, error: "보고서 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 보고서 통계 조회
 */
export async function getReportSummary(groupId: string): Promise<ApiResponse<ReportSummary>> {
  try {
    const { data: reports, error } = await supabaseAdmin
      .from("reports")
      .select(
        `
        stage, rejected_at, created_at,
        forms!inner(group_id)
      `
      )
      .eq("forms.group_id", groupId);

    if (error) throw error;

    const totalReports = reports?.length || 0;
    const completedReports = reports?.filter((r) => r.stage === 3).length || 0;
    const rejectedReports = reports?.filter((r) => r.rejected_at).length || 0;
    const inProgressReports = totalReports - completedReports - rejectedReports;

    const stageDistribution = {
      stage0: reports?.filter((r) => r.stage === 0).length || 0,
      stage1: reports?.filter((r) => r.stage === 1).length || 0,
      stage2: reports?.filter((r) => r.stage === 2).length || 0,
      stage3: completedReports,
    };

    // 최근 활동 데이터 (간단한 예시)
    const recentActivity = [
      { date: "2024-01-01", count: 5, type: "submitted" as const },
      { date: "2024-01-02", count: 3, type: "commented" as const },
      { date: "2024-01-03", count: 2, type: "completed" as const },
    ];

    const summary: ReportSummary = {
      totalReports,
      completedReports,
      inProgressReports,
      rejectedReports,
      stageDistribution,
      recentActivity,
    };

    return { success: true, data: summary };
  } catch (error) {
    console.error("Error fetching report summary:", error);
    return { success: false, error: "보고서 통계 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 보고서 담당자 업데이트
 */
export async function updateReportAssignment(
  request: UpdateReportAssignmentRequest
): Promise<ApiResponse<boolean>> {
  try {
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (request.timeTeacherId !== undefined) {
      updates.time_teacher_id = request.timeTeacherId;
    }

    if (request.teacherId !== undefined) {
      updates.teacher_id = request.teacherId;
    }

    const { error } = await supabaseAdmin
      .from("reports")
      .update(updates)
      .eq("id", request.reportId);

    if (error) throw error;

    return { success: true, data: true };
  } catch (error) {
    console.error("Error updating report assignment:", error);
    return { success: false, error: "보고서 담당자 업데이트 중 오류가 발생했습니다." };
  }
}

/**
 * 보고서 일괄 업데이트
 */
export async function bulkUpdateReports(
  request: BulkUpdateReportsRequest
): Promise<ApiResponse<boolean>> {
  try {
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (request.timeTeacherId !== undefined) {
      updates.time_teacher_id = request.timeTeacherId;
    }

    if (request.teacherId !== undefined) {
      updates.teacher_id = request.teacherId;
    }

    const { error } = await supabaseAdmin
      .from("reports")
      .update(updates)
      .in("id", request.reportIds);

    if (error) throw error;

    return { success: true, data: true };
  } catch (error) {
    console.error("Error bulk updating reports:", error);
    return { success: false, error: "보고서 일괄 업데이트 중 오류가 발생했습니다." };
  }
}
