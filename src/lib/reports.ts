import { supabaseAdmin } from "./supabase";
import { Database } from "./types/types";
import { createNotification } from "./notifications";

// 데이터베이스 타입 import
type Report = Database["public"]["Tables"]["reports"]["Row"];
type ReportInsert = Database["public"]["Tables"]["reports"]["Insert"];
type ReportUpdate = Database["public"]["Tables"]["reports"]["Update"];

type FormResponse = Database["public"]["Tables"]["form_responses"]["Row"];
type FormQuestionResponse = Database["public"]["Tables"]["form_question_responses"]["Row"];
type Form = Database["public"]["Tables"]["forms"]["Row"];
type FormQuestion = Database["public"]["Tables"]["form_questions"]["Row"];
type FormTarget = Database["public"]["Tables"]["form_targets"]["Row"];
type User = Database["public"]["Tables"]["users"]["Row"];
type Class = Database["public"]["Tables"]["classes"]["Row"];
type SupervisionMapping = Database["public"]["Tables"]["supervision_mappings"]["Row"];
type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"];

// API 응답 타입 정의
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ===== 요청 타입 정의 =====

export interface AddCommentRequest {
  reportId: string;
  userId: string;
  comment: string;
  commentType: "time_teacher" | "teacher"; // 시간강사 또는 부장선생님
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

export interface ReportSearchConditions {
  formId?: string;
  studentName?: string;
  className?: string;
  stage?: number[];
  status?: string[]; // 'completed', 'in_progress', 'rejected', 'reset'
  createdAfter?: string;
  createdBefore?: string;
  groupId: string;
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
 * 보고서 관련 알림 생성
 */
async function createReportNotification(
  recipientId: string,
  type: string,
  title: string,
  message: string,
  reportId: string
): Promise<void> {
  await createNotification({
    target_id: recipientId,
    creator_id: null,
    type,
    title,
    content: message,
    action_url: `/reports/${reportId}`,
    related_id: reportId,
    is_read: false,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30일 후 만료
  });
}

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
    canEdit = false;
    nextAction = "학생이 폼을 다시 작성해야 합니다";
  } else if (report.draft_status === "reset") {
    status = "reset";
    canEdit = true;
    nextAction = "학생이 폼을 수정하여 재제출할 수 있습니다";
  } else {
    switch (stage) {
      case 0:
        status = "waiting_response";
        canEdit = true;
        nextAction = "학생 응답 대기 중";
        break;
      case 1:
        status = "waiting_time_teacher";
        canEdit = false;
        nextAction = "시간강사 검토 대기 중";
        break;
      case 2:
        status = "waiting_teacher";
        canEdit = false;
        nextAction = "부장선생님 검토 대기 중";
        break;
      case 3:
        status = "completed";
        canEdit = false;
        nextAction = "최종 완료";
        break;
      default:
        status = "waiting_response";
        canEdit = true;
        nextAction = "학생 응답 대기 중";
    }
  }

  return {
    currentStage: stage,
    status,
    canEdit,
    nextAction,
  };
}

// ===== 보고서 조회 함수들 =====

/**
 * 그룹 내 모든 보고서 조회
 */
export async function getAllReportsInGroup(
  groupId: string,
  userId: string
): Promise<ApiResponse<ReportWithDetails[]>> {
  try {
    // 사용자가 그룹 멤버인지 확인
    const { data: memberCheck } = await supabaseAdmin
      .from("group_member")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .single();

    if (!memberCheck) {
      return { success: false, error: "그룹 멤버만 보고서를 조회할 수 있습니다." };
    }

    // 그룹의 폼들과 연결된 보고서 조회
    const { data: reports, error } = await supabaseAdmin
      .from("reports")
      .select(
        `
        *,
        forms!reports_form_id_fkey (
          id, title, description, created_at,
          creator:users!forms_creator_id_fkey (name, nickname)
        ),
        form_responses!reports_form_response_id_fkey (
          id, status, submitted_at,
          student:users!form_responses_student_id_fkey (id, name, nickname)
        ),
        time_teacher:users!reports_time_teacher_id_fkey (id, name, nickname),
        teacher:users!reports_teacher_id_fkey (id, name, nickname)
      `
      )
      .eq("forms.group_id", groupId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // 상세 정보 포함하여 변환
    const reportsWithDetails: ReportWithDetails[] = [];

    for (const report of reports) {
      let formResponse: FormResponseData | null = null;
      if (report.form_responses && report.form_response_id) {
        // 질문 응답 데이터 조회
        const { data: questionResponses } = await supabaseAdmin
          .from("form_question_responses")
          .select(
            `
            *,
            form_questions!form_question_responses_question_id_fkey (
              id, question_text, question_type, is_required, order_index
            )
          `
          )
          .eq("form_response_id", report.form_response_id);

        const responses: QuestionResponseData[] = (questionResponses || []).map((qr) => ({
          questionId: qr.question_id || "",
          questionType: qr.form_questions?.question_type || "",
          questionText: qr.form_questions?.question_text || "",
          isRequired: qr.form_questions?.is_required || false,
          orderIndex: qr.form_questions?.order_index || 0,
          response: {
            textResponse: qr.text_response || undefined,
            numberResponse: qr.number_response || undefined,
            ratingResponse: qr.rating_response || undefined,
            examResponse: qr.exam_response || undefined,
          },
        }));

        formResponse = {
          id: report.form_responses.id,
          status: report.form_responses.status,
          submitted_at: report.form_responses.submitted_at,
          responses,
        };
      }

      reportsWithDetails.push({
        ...report,
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
 * 보고서 필터링 조회
 */
export async function searchReports(
  conditions: ReportSearchConditions
): Promise<ApiResponse<ReportWithDetails[]>> {
  try {
    let query = supabaseAdmin.from("reports").select(`
        *,
        forms!reports_form_id_fkey (
          id, title, description, created_at, group_id,
          creator:users!forms_creator_id_fkey (name, nickname)
        ),
        form_responses!reports_form_response_id_fkey (
          id, status, submitted_at,
          student:users!form_responses_student_id_fkey (id, name, nickname)
        ),
        time_teacher:users!reports_time_teacher_id_fkey (id, name, nickname),
        teacher:users!reports_teacher_id_fkey (id, name, nickname)
      `);

    // 그룹 ID로 필터링 (필수)
    query = query.eq("forms.group_id", conditions.groupId);

    // 폼 ID 필터링
    if (conditions.formId) {
      query = query.eq("form_id", conditions.formId);
    }

    // 학생 이름 필터링
    if (conditions.studentName) {
      query = query.ilike("student_name", `%${conditions.studentName}%`);
    }

    // 반 이름 필터링
    if (conditions.className) {
      query = query.ilike("class_name", `%${conditions.className}%`);
    }

    // 단계 필터링
    if (conditions.stage && conditions.stage.length > 0) {
      query = query.in("stage", conditions.stage);
    }

    // 시간강사 필터링
    if (conditions.timeTeacherId) {
      query = query.eq("time_teacher_id", conditions.timeTeacherId);
    }

    // 선생님 필터링
    if (conditions.teacherId) {
      query = query.eq("teacher_id", conditions.teacherId);
    }

    // 생성일 필터링
    if (conditions.createdAfter) {
      query = query.gte("created_at", conditions.createdAfter);
    }

    if (conditions.createdBefore) {
      query = query.lte("created_at", conditions.createdBefore);
    }

    const { data: reports, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;

    // 상태 필터링 (클라이언트 사이드)
    let filteredReports = reports;
    if (conditions.status && conditions.status.length > 0) {
      filteredReports = reports.filter((report) => {
        const progressInfo = calculateProgressInfo(report);
        return conditions.status!.includes(progressInfo.status);
      });
    }

    // 상세 정보 변환은 getAllReportsInGroup과 동일한 로직 사용
    const reportsWithDetails: ReportWithDetails[] = filteredReports.map((report) => ({
      ...report,
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
 * 특정 보고서 상세 조회
 */
export async function getReportDetails(reportId: string): Promise<ApiResponse<ReportWithDetails>> {
  try {
    const { data: report, error } = await supabaseAdmin
      .from("reports")
      .select(
        `
        *,
        forms!reports_form_id_fkey (
          id, title, description, created_at,
          creator:users!forms_creator_id_fkey (name, nickname)
        ),
        form_responses!reports_form_response_id_fkey (
          id, status, submitted_at,
          student:users!form_responses_student_id_fkey (id, name, nickname)
        ),
        time_teacher:users!reports_time_teacher_id_fkey (id, name, nickname),
        teacher:users!reports_teacher_id_fkey (id, name, nickname)
      `
      )
      .eq("id", reportId)
      .single();

    if (error) throw error;

    // 질문 응답 데이터 조회
    let formResponse: FormResponseData | null = null;
    if (report.form_response_id) {
      const { data: questionResponses } = await supabaseAdmin
        .from("form_question_responses")
        .select(
          `
          *,
          form_questions!form_question_responses_question_id_fkey (
            id, question_text, question_type, is_required, order_index
          )
        `
        )
        .eq("form_response_id", report.form_response_id);

      const responses: QuestionResponseData[] = (questionResponses || []).map((qr) => ({
        questionId: qr.question_id || "",
        questionType: qr.form_questions?.question_type || "",
        questionText: qr.form_questions?.question_text || "",
        isRequired: qr.form_questions?.is_required || false,
        orderIndex: qr.form_questions?.order_index || 0,
        response: {
          textResponse: qr.text_response || undefined,
          numberResponse: qr.number_response || undefined,
          ratingResponse: qr.rating_response || undefined,
          examResponse: qr.exam_response || undefined,
        },
      }));

      formResponse = {
        id: report.form_responses?.id || "",
        status: report.form_responses?.status || "",
        submitted_at: report.form_responses?.submitted_at || null,
        responses: responses.sort((a, b) => a.orderIndex - b.orderIndex),
      };
    }

    const reportWithDetails: ReportWithDetails = {
      ...report,
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

// ===== 보고서 단계 관리 함수들 =====

/**
 * 보고서 단계 올림 (코멘트 추가)
 */
export async function advanceReportStage(
  request: AddCommentRequest
): Promise<ApiResponse<boolean>> {
  try {
    // 현재 보고서 상태 확인
    const { data: report, error: reportError } = await supabaseAdmin
      .from("reports")
      .select("*")
      .eq("id", request.reportId)
      .single();

    if (reportError) throw reportError;

    const currentStage = report.stage || 0;
    let nextStage = currentStage;
    const now = new Date().toISOString();

    // 코멘트 타입에 따른 단계 진행
    if (request.commentType === "time_teacher") {
      if (currentStage === 1) {
        nextStage = 2;
        // 시간강사 코멘트 추가
        const { error: updateError } = await supabaseAdmin
          .from("reports")
          .update({
            time_teacher_comment: request.comment,
            time_teacher_completed_at: now,
            stage: nextStage,
            draft_status: "waiting_teacher",
            updated_at: now,
          })
          .eq("id", request.reportId);

        if (updateError) throw updateError;

        // 담당 선생님에게 알림
        if (report.teacher_id) {
          await createReportNotification(
            report.teacher_id,
            "report_ready_for_review",
            "보고서 검토 요청",
            `시간강사가 검토를 완료했습니다. 최종 검토를 진행해주세요.`,
            request.reportId
          );
        }
      } else {
        return { success: false, error: "현재 단계에서는 시간강사 코멘트를 추가할 수 없습니다." };
      }
    } else if (request.commentType === "teacher") {
      if (currentStage === 2) {
        nextStage = 3;
        // 선생님 코멘트 추가 (최종 완료)
        const { error: updateError } = await supabaseAdmin
          .from("reports")
          .update({
            teacher_comment: request.comment,
            teacher_completed_at: now,
            stage: nextStage,
            draft_status: "completed",
            updated_at: now,
          })
          .eq("id", request.reportId);

        if (updateError) throw updateError;

        // 학생에게 완료 알림
        if (report.form_response_id) {
          const { data: formResponse } = await supabaseAdmin
            .from("form_responses")
            .select("student_id")
            .eq("id", report.form_response_id)
            .single();

          if (formResponse?.student_id) {
            await createReportNotification(
              formResponse.student_id,
              "report_completed",
              "보고서 완료",
              `제출하신 폼에 대한 최종 보고서가 완료되었습니다.`,
              request.reportId
            );
          }
        }
      } else {
        return { success: false, error: "현재 단계에서는 선생님 코멘트를 추가할 수 없습니다." };
      }
    }

    return { success: true, data: true };
  } catch (error) {
    console.error("Error advancing report stage:", error);
    return { success: false, error: "보고서 단계 진행 중 오류가 발생했습니다." };
  }
}

/**
 * 보고서 반려
 */
export async function rejectReport(request: RejectReportRequest): Promise<ApiResponse<boolean>> {
  try {
    const now = new Date().toISOString();

    const { error } = await supabaseAdmin
      .from("reports")
      .update({
        rejected_at: now,
        rejected_by: request.rejectedBy,
        rejection_reason: request.rejectionReason,
        draft_status: "rejected",
        updated_at: now,
      })
      .eq("id", request.reportId);

    if (error) throw error;

    // 학생에게 반려 알림
    const { data: report } = await supabaseAdmin
      .from("reports")
      .select("form_response_id")
      .eq("id", request.reportId)
      .single();

    if (report?.form_response_id) {
      const { data: formResponse } = await supabaseAdmin
        .from("form_responses")
        .select("student_id")
        .eq("id", report.form_response_id)
        .single();

      if (formResponse?.student_id) {
        await createReportNotification(
          formResponse.student_id,
          "report_rejected",
          "보고서 반려",
          `제출하신 응답이 반려되었습니다. 사유: ${request.rejectionReason}`,
          request.reportId
        );
      }
    }

    return { success: true, data: true };
  } catch (error) {
    console.error("Error rejecting report:", error);
    return { success: false, error: "보고서 반려 중 오류가 발생했습니다." };
  }
}

/**
 * 보고서를 폼 상태로 리셋
 */
export async function resetReportToForm(
  request: ResetReportRequest
): Promise<ApiResponse<boolean>> {
  try {
    const now = new Date().toISOString();

    // 보고서 상태를 리셋으로 변경
    const { error: reportError } = await supabaseAdmin
      .from("reports")
      .update({
        stage: 1, // 학생 응답 단계로 되돌림
        draft_status: "reset",
        rejected_at: null,
        rejected_by: null,
        rejection_reason: request.resetReason,
        time_teacher_comment: null,
        time_teacher_completed_at: null,
        teacher_comment: null,
        teacher_completed_at: null,
        updated_at: now,
      })
      .eq("id", request.reportId);

    if (reportError) throw reportError;

    // 해당 폼 응답을 수정 가능 상태로 변경
    const { data: report } = await supabaseAdmin
      .from("reports")
      .select("form_response_id")
      .eq("id", request.reportId)
      .single();

    if (report?.form_response_id) {
      const { error: responseError } = await supabaseAdmin
        .from("form_responses")
        .update({
          status: "pending",
          updated_at: now,
        })
        .eq("id", report.form_response_id);

      if (responseError) throw responseError;

      // 학생에게 재작성 요청 알림
      const { data: formResponse } = await supabaseAdmin
        .from("form_responses")
        .select("student_id")
        .eq("id", report.form_response_id)
        .single();

      if (formResponse?.student_id) {
        await createReportNotification(
          formResponse.student_id,
          "form_reset",
          "폼 재작성 요청",
          `선생님이 폼을 다시 작성하도록 요청했습니다. 사유: ${request.resetReason}`,
          request.reportId
        );
      }
    }

    return { success: true, data: true };
  } catch (error) {
    console.error("Error resetting report:", error);
    return { success: false, error: "보고서 리셋 중 오류가 발생했습니다." };
  }
}

/**
 * 보고서 담당자 업데이트
 */
export async function updateReportAssignment(
  request: UpdateReportAssignmentRequest
): Promise<ApiResponse<boolean>> {
  try {
    const updates: Partial<ReportUpdate> = {
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

    // 새로 할당된 담당자들에게 알림
    if (request.timeTeacherId) {
      await createReportNotification(
        request.timeTeacherId,
        "report_assigned",
        "보고서 할당",
        "새로운 보고서가 검토를 위해 할당되었습니다.",
        request.reportId
      );
    }

    if (request.teacherId) {
      await createReportNotification(
        request.teacherId,
        "report_assigned",
        "보고서 할당",
        "새로운 보고서가 최종 검토를 위해 할당되었습니다.",
        request.reportId
      );
    }

    return { success: true, data: true };
  } catch (error) {
    console.error("Error updating report assignment:", error);
    return { success: false, error: "보고서 담당자 업데이트 중 오류가 발생했습니다." };
  }
}

/**
 * 보고서 일괄 담당자 업데이트
 */
export async function bulkUpdateReportAssignments(
  request: BulkUpdateReportsRequest
): Promise<ApiResponse<number>> {
  try {
    const updates: Partial<ReportUpdate> = {
      updated_at: new Date().toISOString(),
    };

    if (request.timeTeacherId !== undefined) {
      updates.time_teacher_id = request.timeTeacherId;
    }

    if (request.teacherId !== undefined) {
      updates.teacher_id = request.teacherId;
    }

    const { error, count } = await supabaseAdmin
      .from("reports")
      .update(updates)
      .in("id", request.reportIds);

    if (error) throw error;

    // 할당된 담당자들에게 일괄 알림
    const notificationPromises: Promise<void>[] = [];

    if (request.timeTeacherId) {
      notificationPromises.push(
        createReportNotification(
          request.timeTeacherId,
          "reports_bulk_assigned",
          "보고서 일괄 할당",
          `${request.reportIds.length}개의 보고서가 검토를 위해 할당되었습니다.`,
          request.reportIds[0] // 첫 번째 보고서 ID를 대표로 사용
        )
      );
    }

    if (request.teacherId) {
      notificationPromises.push(
        createReportNotification(
          request.teacherId,
          "reports_bulk_assigned",
          "보고서 일괄 할당",
          `${request.reportIds.length}개의 보고서가 최종 검토를 위해 할당되었습니다.`,
          request.reportIds[0]
        )
      );
    }

    if (notificationPromises.length > 0) {
      await Promise.all(notificationPromises);
    }

    return { success: true, data: count || 0 };
  } catch (error) {
    console.error("Error bulk updating report assignments:", error);
    return { success: false, error: "보고서 일괄 담당자 업데이트 중 오류가 발생했습니다." };
  }
}

// ===== 최종 보고서 조회 함수들 =====

/**
 * 최종 보고서 조회 (stage 3인 보고서들)
 */
export async function getFinalReports(groupId: string): Promise<ApiResponse<FinalReportData[]>> {
  try {
    const { data: reports, error } = await supabaseAdmin
      .from("reports")
      .select(
        `
        *,
        forms!reports_form_id_fkey (id, title, group_id),
        form_responses!reports_form_response_id_fkey (
          id, status, submitted_at,
          student:users!form_responses_student_id_fkey (id, name, nickname)
        )
      `
      )
      .eq("stage", 3)
      .eq("forms.group_id", groupId)
      .order("teacher_completed_at", { ascending: false });

    if (error) throw error;

    const finalReports: FinalReportData[] = [];

    for (const report of reports) {
      if (!report.form_responses || !report.forms) continue;

      // 질문 응답 데이터 조회
      const { data: questionResponses } = await supabaseAdmin
        .from("form_question_responses")
        .select(
          `
          *,
          form_questions!form_question_responses_question_id_fkey (
            id, question_text, question_type, is_required, order_index
          )
        `
        )
        .eq("form_response_id", report.form_response_id || "");

      const responses: QuestionResponseData[] = (questionResponses || []).map((qr) => ({
        questionId: qr.question_id || "",
        questionType: qr.form_questions?.question_type || "",
        questionText: qr.form_questions?.question_text || "",
        isRequired: qr.form_questions?.is_required || false,
        orderIndex: qr.form_questions?.order_index || 0,
        response: {
          textResponse: qr.text_response || undefined,
          numberResponse: qr.number_response || undefined,
          ratingResponse: qr.rating_response || undefined,
          examResponse: qr.exam_response || undefined,
        },
      }));

      finalReports.push({
        reportId: report.id,
        formTitle: report.forms.title,
        studentName: report.form_responses.student?.name || "Unknown",
        className: report.class_name || undefined,
        submittedAt: report.form_responses.submitted_at || "",
        studentResponses: responses.sort((a, b) => a.orderIndex - b.orderIndex),
        timeTeacherComment: report.time_teacher_comment || undefined,
        timeTeacherCompletedAt: report.time_teacher_completed_at || undefined,
        teacherComment: report.teacher_comment || undefined,
        teacherCompletedAt: report.teacher_completed_at || undefined,
        stage: report.stage || 0,
        finalizedAt: report.teacher_completed_at || undefined,
      });
    }

    return { success: true, data: finalReports };
  } catch (error) {
    console.error("Error fetching final reports:", error);
    return { success: false, error: "최종 보고서 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 보고서 요약 통계 조회
 */
export async function getReportSummary(groupId: string): Promise<ApiResponse<ReportSummary>> {
  try {
    // 그룹의 모든 보고서 조회
    const { data: reports, error } = await supabaseAdmin
      .from("reports")
      .select(
        `
        stage, draft_status, created_at, teacher_completed_at,
        forms!reports_form_id_fkey (group_id)
      `
      )
      .eq("forms.group_id", groupId);

    if (error) throw error;

    const totalReports = reports.length;
    let completedReports = 0;
    let inProgressReports = 0;
    let rejectedReports = 0;

    const stageDistribution = {
      stage0: 0,
      stage1: 0,
      stage2: 0,
      stage3: 0,
    };

    const completionTimes: number[] = [];
    const activityMap: {
      [date: string]: { submitted: number; commented: number; completed: number };
    } = {};

    reports.forEach((report) => {
      const stage = report.stage || 0;
      const status = report.draft_status;

      // 단계별 분포
      switch (stage) {
        case 0:
          stageDistribution.stage0++;
          break;
        case 1:
          stageDistribution.stage1++;
          break;
        case 2:
          stageDistribution.stage2++;
          break;
        case 3:
          stageDistribution.stage3++;
          break;
      }

      // 상태별 분류
      if (stage === 3) {
        completedReports++;
      } else if (status === "rejected") {
        rejectedReports++;
      } else {
        inProgressReports++;
      }

      // 완료 시간 계산
      if (report.created_at && report.teacher_completed_at) {
        const startTime = new Date(report.created_at).getTime();
        const endTime = new Date(report.teacher_completed_at).getTime();
        const diffMinutes = (endTime - startTime) / (1000 * 60);
        completionTimes.push(diffMinutes);
      }

      // 활동 통계
      if (report.created_at) {
        const date = report.created_at.split("T")[0];
        if (!activityMap[date]) {
          activityMap[date] = { submitted: 0, commented: 0, completed: 0 };
        }
        activityMap[date].submitted++;
      }

      if (report.teacher_completed_at) {
        const date = report.teacher_completed_at.split("T")[0];
        if (!activityMap[date]) {
          activityMap[date] = { submitted: 0, commented: 0, completed: 0 };
        }
        activityMap[date].completed++;
      }
    });

    const averageCompletionTime =
      completionTimes.length > 0
        ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length
        : undefined;

    const recentActivity = Object.entries(activityMap)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 30) // 최근 30일
      .flatMap(([date, activity]) => [
        { date, count: activity.submitted, type: "submitted" as const },
        { date, count: activity.commented, type: "commented" as const },
        { date, count: activity.completed, type: "completed" as const },
      ])
      .filter((item) => item.count > 0);

    const summary: ReportSummary = {
      totalReports,
      completedReports,
      inProgressReports,
      rejectedReports,
      stageDistribution,
      averageCompletionTime,
      recentActivity,
    };

    return { success: true, data: summary };
  } catch (error) {
    console.error("Error fetching report summary:", error);
    return { success: false, error: "보고서 요약 통계 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 특정 폼의 모든 최종 보고서 조회
 */
export async function getFinalReportsByForm(
  formId: string
): Promise<ApiResponse<FinalReportData[]>> {
  try {
    const { data: reports, error } = await supabaseAdmin
      .from("reports")
      .select(
        `
        *,
        forms!reports_form_id_fkey (id, title),
        form_responses!reports_form_response_id_fkey (
          id, status, submitted_at,
          student:users!form_responses_student_id_fkey (id, name, nickname)
        )
      `
      )
      .eq("form_id", formId)
      .eq("stage", 3)
      .order("teacher_completed_at", { ascending: false });

    if (error) throw error;

    const finalReports: FinalReportData[] = [];

    for (const report of reports) {
      if (!report.form_responses || !report.forms) continue;

      // 질문 응답 데이터 조회
      const { data: questionResponses } = await supabaseAdmin
        .from("form_question_responses")
        .select(
          `
          *,
          form_questions!form_question_responses_question_id_fkey (
            id, question_text, question_type, is_required, order_index
          )
        `
        )
        .eq("form_response_id", report.form_response_id || "");

      const responses: QuestionResponseData[] = (questionResponses || []).map((qr) => ({
        questionId: qr.question_id || "",
        questionType: qr.form_questions?.question_type || "",
        questionText: qr.form_questions?.question_text || "",
        isRequired: qr.form_questions?.is_required || false,
        orderIndex: qr.form_questions?.order_index || 0,
        response: {
          textResponse: qr.text_response || undefined,
          numberResponse: qr.number_response || undefined,
          ratingResponse: qr.rating_response || undefined,
          examResponse: qr.exam_response || undefined,
        },
      }));

      finalReports.push({
        reportId: report.id,
        formTitle: report.forms.title,
        studentName: report.form_responses.student?.name || "Unknown",
        className: report.class_name || undefined,
        submittedAt: report.form_responses.submitted_at || "",
        studentResponses: responses.sort((a, b) => a.orderIndex - b.orderIndex),
        timeTeacherComment: report.time_teacher_comment || undefined,
        timeTeacherCompletedAt: report.time_teacher_completed_at || undefined,
        teacherComment: report.teacher_comment || undefined,
        teacherCompletedAt: report.teacher_completed_at || undefined,
        stage: report.stage || 0,
        finalizedAt: report.teacher_completed_at || undefined,
      });
    }

    return { success: true, data: finalReports };
  } catch (error) {
    console.error("Error fetching final reports by form:", error);
    return { success: false, error: "폼별 최종 보고서 조회 중 오류가 발생했습니다." };
  }
}
