import { supabaseAdmin } from "./supabase";
import { Database } from "./types/types";
import { createNotification } from "./notifications";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

// Gemini AI 클라이언트 초기화
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");

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

export interface AdvanceReportStageRequest {
  reportId: string;
  userId: string;
  comment?: string;
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
  tags?: string[]; // 폼 태그 필터링
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

export interface GenerateReportSummaryRequest {
  reportId: string;
  userId: string;
  summaryType?: "individual" | "bulk";
}

export interface BulkGenerateSummaryRequest {
  reportIds: string[];
  userId: string;
  groupId: string;
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
    tags?: Array<{ id: string; name: string }>;
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
    progressRate: number; // 진행률 (%)
  };
  // AI 요약 정보
  hasSummary?: boolean;
  summaryGeneratedAt?: string;
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
  responseRate: number; // 응답률 (%)
  completionRate: number; // 완료율 (%)
}

export interface FinalReportData {
  reportId: string;
  formId: string;
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
  hasSummary: boolean;
  summaryData?: GeneratedSummary;
}

export interface GeneratedSummary {
  id?: string;
  reportId: string;
  studentSummary: string;
  timeTeacherSummary: string;
  teacherSummary: string;
  overallSummary: string;
  insights: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
  generatedAt: string;
  generatedBy: string;
}

export interface FormOverviewSummary {
  formId: string;
  formTitle: string;
  totalReports: number;
  completedReports: number;
  commonStrengths: string[];
  commonWeaknesses: string[];
  overallRecommendations: string[];
  studentPerformanceDistribution: {
    excellent: number;
    good: number;
    average: number;
    needsImprovement: number;
  };
  generatedAt: string;
}

// 임시 메모리 저장소 (실제로는 데이터베이스 테이블로 대체 가능)
const reportSummaries = new Map<string, GeneratedSummary>();
const formOverviews = new Map<string, FormOverviewSummary>();

// ===== 유틸리티 함수들 =====

export async function createReport(request: CreateReportRequest): Promise<ApiResponse<string>> {
  try {
    const { data: report, error } = await supabaseAdmin
      .from("reports")
      .insert({
        form_id: request.formId,
        form_response_id: request.formResponseId || null,
        student_name: request.studentName || "",
        class_name: request.className || "",
        time_teacher_id: request.timeTeacherId || null,
        teacher_id: request.teacherId || null,
        supervision_id: request.supervisionId || null,
        stage: 0,
        draft_status: "waiting_for_response",
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data: report.id };
  } catch (error) {
    console.error("Error creating report:", error);
    return { success: false, error: "보고서 생성 중 오류가 발생했습니다." };
  }
}

/**
 * 보고서 진행 상태 계산
 */
function calculateProgressInfo(report: Report): ReportWithDetails["progressInfo"] {
  const stage = report.stage || 0;
  let status: ReportWithDetails["progressInfo"]["status"];
  let canEdit = false;
  let nextAction: string | undefined;
  const progressRate = Math.round((stage / 3) * 100);

  if (report.rejected_at) {
    status = "rejected";
    nextAction = "반려됨";
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
    progressRate,
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

    const { data: questionResponses, error: qrError } = await supabaseAdmin
      .from("form_question_responses")
      .select(
        `
        *,
        form_questions(
          id, question_type, question_text, is_required, order_index
        )
      `
      )
      .eq("form_response_id", formResponseId)
      .order("form_questions(order_index)");

    if (qrError) throw qrError;

    const responses: QuestionResponseData[] = (questionResponses || []).map((qr) => ({
      questionId: qr.question_id || "",
      questionType: qr.form_questions?.question_type || "unknown",
      questionText: qr.form_questions?.question_text || "",
      isRequired: qr.form_questions?.is_required || false,
      orderIndex: qr.form_questions?.order_index || 0,
      response: {
        textResponse: qr.text_response === null ? undefined : qr.text_response,
        numberResponse: qr.number_response === null ? undefined : qr.number_response,
        ratingResponse: qr.rating_response === null ? undefined : qr.rating_response,
        examResponse: qr.exam_response === null ? undefined : qr.exam_response,
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

/**
 * AI 요약 생성 (Gemini API)
 */
async function generateAISummary(prompt: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error generating AI summary:", error);
    return "AI 요약 생성 중 오류가 발생했습니다.";
  }
}

/**
 * 프롬프트 템플릿 렌더링
 */
function renderPrompt(template: string, variables: Record<string, unknown>): string {
  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(new RegExp(`{{${key}}}`, "g"), String(value));
  }
  return rendered;
}

// 프롬프트 템플릿들
const STUDENT_SUMMARY_PROMPT = `
다음 학생의 폼 응답을 분석하여 요약해주세요:

학생: {{studentName}}
반: {{className}}
제출일: {{submittedAt}}

응답 내용:
{{studentResponses}}

요약 요청사항:
1. 학생의 주요 응답 내용을 간결하게 정리해주세요
2. 학생의 이해도와 참여도를 평가해주세요
3. 특별히 주목할 만한 응답이 있다면 언급해주세요

한국어로 3-4문장으로 요약해주세요.
`;

const TEACHER_COMMENT_SUMMARY_PROMPT = `
다음 교사 코멘트를 요약해주세요:

시간강사 코멘트: {{timeTeacherComment}}
선생님 코멘트: {{teacherComment}}

요약 요청사항:
1. 교사들의 주요 피드백을 정리해주세요
2. 학생에 대한 종합적인 평가를 요약해주세요
3. 개선점이나 권장사항이 있다면 정리해주세요

한국어로 2-3문장으로 요약해주세요.
`;

const OVERALL_SUMMARY_PROMPT = `
다음 보고서 정보를 종합하여 전체 요약을 작성해주세요:

학생 응답 요약: {{studentSummary}}
교사 코멘트 요약: {{teacherSummary}}

요약 요청사항:
1. 학생의 전반적인 성과를 평가해주세요
2. 강점과 개선점을 명확히 제시해주세요
3. 향후 학습 방향을 제안해주세요

한국어로 4-5문장으로 종합 요약해주세요.
`;

// ===== 핵심 보고서 관리 함수들 =====

/**
 * 💾 보고서 단계 올림
 */
export async function advanceReportStage(
  request: AdvanceReportStageRequest
): Promise<ApiResponse<boolean>> {
  try {
    // 현재 보고서 상태 확인
    const { data: currentReport, error: checkError } = await supabaseAdmin
      .from("reports")
      .select("stage, rejected_at")
      .eq("id", request.reportId)
      .single();

    if (checkError) throw checkError;
    if (!currentReport) {
      return { success: false, error: "보고서를 찾을 수 없습니다." };
    }

    if (currentReport.rejected_at) {
      return { success: false, error: "반려된 보고서는 단계를 올릴 수 없습니다." };
    }

    const currentStage = currentReport.stage || 0;
    let newStage = currentStage;
    let newStatus = "";
    const updateData: Partial<ReportUpdate> = {
      updated_at: new Date().toISOString(),
    };

    // 코멘트 타입에 따른 단계 진행
    if (request.commentType === "time_teacher") {
      if (currentStage !== 1) {
        return { success: false, error: "시간강사 검토 단계가 아닙니다." };
      }
      newStage = 2;
      newStatus = "waiting_teacher";
      updateData.time_teacher_comment = request.comment;
      updateData.time_teacher_completed_at = new Date().toISOString();
    } else if (request.commentType === "teacher") {
      if (currentStage !== 2) {
        return { success: false, error: "선생님 검토 단계가 아닙니다." };
      }
      newStage = 3;
      newStatus = "completed";
      updateData.teacher_comment = request.comment;
      updateData.teacher_completed_at = new Date().toISOString();
    }

    updateData.stage = newStage;
    updateData.draft_status = newStatus;

    // 보고서 업데이트
    const { error: updateError } = await supabaseAdmin
      .from("reports")
      .update(updateData)
      .eq("id", request.reportId);

    if (updateError) throw updateError;

    // 다음 담당자에게 알림
    if (newStage === 2) {
      // 선생님에게 알림
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
    } else if (newStage === 3) {
      // 최종 완료 알림
      const { data: report } = await supabaseAdmin
        .from("reports")
        .select("form_responses(student_id), student_name")
        .eq("id", request.reportId)
        .single();

      if (report?.form_responses?.student_id) {
        await createNotification({
          target_id: report.form_responses.student_id,
          creator_id: request.userId,
          type: "report_completed",
          title: "보고서가 완료되었습니다",
          content: `${report.student_name} 학생의 보고서 검토가 완료되었습니다.`,
          action_url: `/reports/${request.reportId}`,
          related_id: request.reportId,
          is_read: false,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }
    }

    return { success: true, data: true };
  } catch (error) {
    console.error("Error advancing report stage:", error);
    return { success: false, error: "보고서 단계 올림 중 오류가 발생했습니다." };
  }
}

/**
 * 💾 보고서 반려
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
 * 💾 보고서를 폼 상태로 리셋 (스테이지만 없어지고 기본 내용은 남음)
 */
export async function resetReportToFormState(
  request: ResetReportRequest
): Promise<ApiResponse<boolean>> {
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

    // 보고서 리셋 알림 (학생에게 다시 작성하라고 알림)
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
        title: "폼 재작성 요청",
        content: `${request.resetReason} - 폼을 다시 작성해주세요.`,
        action_url: `/reports/${request.reportId}`,
        related_id: request.reportId,
        is_read: false,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    return { success: true, data: true };
  } catch (error) {
    console.error("Error resetting report:", error);
    return { success: false, error: "보고서 리셋 중 오류가 발생했습니다." };
  }
}

/**
 * 💾 그룹 내 보고서 전체 조회 (응답률, 진행률 등 종합 정보)
 */
export async function getGroupReports(
  groupId: string,
  conditions?: ReportSearchConditions
): Promise<ApiResponse<ReportWithDetails[]>> {
  try {
    let query = supabaseAdmin
      .from("reports")
      .select(
        `
        *,
        forms!inner(
          id, title, description, created_at, group_id,
          creator:users!forms_creator_id_fkey(name),
          form_tag_links(
            form_tags(id, name)
          )
        ),
        form_responses(
          id, status, submitted_at,
          users:users!form_responses_student_id_fkey(id, name, nickname)
        ),
        time_teacher:users!reports_time_teacher_id_fkey(id, name, nickname),
        teacher:users!reports_teacher_id_fkey(id, name, nickname)
      `
      )
      .eq("forms.group_id", groupId);

    // 필터링 조건 적용
    if (conditions) {
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
    }

    const { data: reports, error } = await query.order("updated_at", { ascending: false });

    if (error) throw error;

    const reportsWithDetails: ReportWithDetails[] = [];

    for (const report of reports || []) {
      let formResponse: FormResponseData | null = null;
      if (report.form_response_id) {
        formResponse = await collectFormResponseData(report.form_response_id);
      }

      const reportDetail: ReportWithDetails = {
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
              tags:
                report.forms.form_tag_links?.map((link) => link.form_tags).filter(Boolean) || [],
            }
          : null,
        student: report.form_responses?.users
          ? {
              id: report.form_responses.users.id,
              name: report.form_responses.users.name,
              nickname: report.form_responses.users.nickname,
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
        hasSummary: reportSummaries.has(report.id),
        summaryGeneratedAt: reportSummaries.get(report.id)?.generatedAt,
      };

      reportsWithDetails.push(reportDetail);
    }

    // 태그 필터링 (클라이언트에서 처리)
    let filteredReports = reportsWithDetails;
    if (conditions?.tags && conditions.tags.length > 0) {
      filteredReports = reportsWithDetails.filter((report) => {
        const formTags = report.form?.tags?.map((tag) => tag.name) || [];
        return conditions.tags!.some((tag) => formTags.includes(tag));
      });
    }

    return { success: true, data: filteredReports };
  } catch (error) {
    console.error("Error fetching group reports:", error);
    return { success: false, error: "그룹 보고서 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 💾 보고서 필터링 조회 (생성자, 날짜, 폼태그 등으로 필터링)
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
          creator:users!forms_creator_id_fkey(name),
          form_tag_links(
            form_tags(id, name)
          )
        ),
        form_responses(
          id, status, submitted_at,
          users:users!form_responses_student_id_fkey(id, name, nickname)
        ),
        time_teacher:users!reports_time_teacher_id_fkey(id, name, nickname),
        teacher:users!reports_teacher_id_fkey(id, name, nickname)
      `
    );

    // 검색 조건 적용
    if (conditions.groupId) {
      // 그룹 조건은 forms를 통해 필터링
      query = query.eq("forms.group_id", conditions.groupId);
    }
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

    const reportsWithDetails: ReportWithDetails[] = (reports || []).map((report) => ({
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
            tags: report.forms.form_tag_links?.map((link) => link.form_tags).filter(Boolean) || [],
          }
        : null,
      student: report.form_responses?.users
        ? {
            id: report.form_responses.users.id,
            name: report.form_responses.users.name,
            nickname: report.form_responses.users.nickname,
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
      hasSummary: reportSummaries.has(report.id),
      summaryGeneratedAt: reportSummaries.get(report.id)?.generatedAt,
    }));

    // 태그 필터링 (클라이언트에서 처리)
    let filteredReports = reportsWithDetails;
    if (conditions.tags && conditions.tags.length > 0) {
      filteredReports = reportsWithDetails.filter((report) => {
        const formTags = report.form?.tags?.map((tag) => tag.name) || [];
        return conditions.tags!.some((tag) => formTags.includes(tag));
      });
    }

    return { success: true, data: filteredReports };
  } catch (error) {
    console.error("Error searching reports:", error);
    return { success: false, error: "보고서 검색 중 오류가 발생했습니다." };
  }
}

/**
 * 💾 최종 보고서 요약 (학생결과, 시간강사 코멘트, 선생님 코멘트 요약)
 */
export async function generateReportSummary(
  request: GenerateReportSummaryRequest
): Promise<ApiResponse<GeneratedSummary>> {
  try {
    // 기존 요약이 있는지 확인
    if (reportSummaries.has(request.reportId)) {
      return { success: true, data: reportSummaries.get(request.reportId)! };
    }

    // 보고서 데이터 수집
    const { data: report, error } = await supabaseAdmin
      .from("reports")
      .select(
        `
        *,
        forms(title),
        form_responses(
          *,
          users(name, nickname)
        )
      `
      )
      .eq("id", request.reportId)
      .eq("stage", 3) // 완료된 보고서만
      .single();

    if (error) throw error;
    if (!report) {
      return { success: false, error: "완료된 보고서를 찾을 수 없습니다." };
    }

    // 폼 응답 데이터 수집
    const formResponseData = report.form_response_id
      ? await collectFormResponseData(report.form_response_id)
      : null;

    if (!formResponseData) {
      return { success: false, error: "폼 응답 데이터를 찾을 수 없습니다." };
    }

    // 학생 응답 포맷팅
    const studentResponsesText = formResponseData.responses
      .map(
        (r) =>
          `${r.questionText}: ${
            r.response.textResponse ||
            r.response.numberResponse ||
            r.response.ratingResponse ||
            "응답없음"
          }`
      )
      .join("\n");

    // 1. 학생 결과 요약
    const studentPrompt = renderPrompt(STUDENT_SUMMARY_PROMPT, {
      studentName: report.student_name || "Unknown",
      className: report.class_name || "",
      submittedAt: formResponseData.submitted_at || "",
      studentResponses: studentResponsesText,
    });
    const studentSummary = await generateAISummary(studentPrompt);

    // 2. 교사 코멘트 요약
    const teacherPrompt = renderPrompt(TEACHER_COMMENT_SUMMARY_PROMPT, {
      timeTeacherComment: report.time_teacher_comment || "코멘트 없음",
      teacherComment: report.teacher_comment || "코멘트 없음",
    });
    const teacherSummary = await generateAISummary(teacherPrompt);

    // 3. 종합 요약
    const overallPrompt = renderPrompt(OVERALL_SUMMARY_PROMPT, {
      studentSummary,
      teacherSummary,
    });
    const overallSummary = await generateAISummary(overallPrompt);

    // 인사이트 추출 (간단한 예시 - 실제로는 더 정교한 분석 필요)
    const insights = {
      strengths: ["적극적인 참여", "창의적 사고"],
      weaknesses: ["세부사항 부족", "시간 관리"],
      recommendations: ["추가 학습 자료 제공", "개별 피드백 강화"],
    };

    const summary: GeneratedSummary = {
      reportId: request.reportId,
      studentSummary,
      timeTeacherSummary: report.time_teacher_comment || "",
      teacherSummary: report.teacher_comment || "",
      overallSummary,
      insights,
      generatedAt: new Date().toISOString(),
      generatedBy: request.userId,
    };

    // 메모리에 저장 (실제로는 데이터베이스에 저장)
    reportSummaries.set(request.reportId, summary);

    // 요약 생성 완료 알림
    await createNotification({
      target_id: request.userId,
      creator_id: null,
      type: "summary_generated",
      title: "AI 요약이 생성되었습니다",
      content: `${report.student_name} 학생의 보고서 요약이 완료되었습니다.`,
      action_url: `/reports/${request.reportId}/summary`,
      related_id: request.reportId,
      is_read: false,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    return { success: true, data: summary };
  } catch (error) {
    console.error("Error generating report summary:", error);
    return { success: false, error: "보고서 요약 생성 중 오류가 발생했습니다." };
  }
}

/**
 * 💾 최종 보고서 조회 (뷰 기반)
 */
export async function getFinalReports(groupId: string): Promise<ApiResponse<FinalReportData[]>> {
  try {
    const { data: reports, error } = await supabaseAdmin
      .from("reports")
      .select(
        `
        *,
        forms!inner(id, title, group_id),
        form_responses(
          *,
          users(name, nickname)
        )
      `
      )
      .eq("forms.group_id", groupId)
      .eq("stage", 3) // 완료된 보고서만
      .order("updated_at", { ascending: false });

    if (error) throw error;

    const finalReports: FinalReportData[] = [];

    for (const report of reports || []) {
      const formResponseData = report.form_response_id
        ? await collectFormResponseData(report.form_response_id)
        : null;

      const finalReport: FinalReportData = {
        reportId: report.id,
        formId: report.form_id || "",
        formTitle: report.forms?.title || "Unknown Form",
        studentName: report.form_responses?.users?.name || report.student_name || "Unknown Student",
        className: report.class_name || undefined,
        submittedAt: report.form_responses?.submitted_at || report.updated_at || "",
        studentResponses: formResponseData?.responses || [],
        timeTeacherComment: report.time_teacher_comment || undefined,
        timeTeacherCompletedAt: report.time_teacher_completed_at || undefined,
        teacherComment: report.teacher_comment || undefined,
        teacherCompletedAt: report.teacher_completed_at || undefined,
        stage: report.stage || 0,
        finalizedAt: report.updated_at || undefined,
        hasSummary: reportSummaries.has(report.id),
        summaryData: reportSummaries.get(report.id),
      };

      finalReports.push(finalReport);
    }

    return { success: true, data: finalReports };
  } catch (error) {
    console.error("Error getting final reports:", error);
    return { success: false, error: "최종 보고서 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 💾 요약된 최종 보고서 조회 (요약된 것들만 모아서)
 */
export async function getSummarizedReports(
  groupId: string
): Promise<ApiResponse<FinalReportData[]>> {
  try {
    const finalReportsResult = await getFinalReports(groupId);
    if (!finalReportsResult.success || !finalReportsResult.data) {
      return finalReportsResult;
    }

    // 요약이 있는 보고서만 필터링
    const summarizedReports = finalReportsResult.data.filter((report) => report.hasSummary);

    return { success: true, data: summarizedReports };
  } catch (error) {
    console.error("Error getting summarized reports:", error);
    return { success: false, error: "요약된 보고서 조회 중 오류가 발생했습니다." };
  }
}

// ===== 추가 유틸리티 함수들 =====

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
          creator:users!forms_creator_id_fkey(name),
          form_tag_links(
            form_tags(id, name)
          )
        ),
        form_responses(
          id, status, submitted_at,
          users:users!form_responses_student_id_fkey(id, name, nickname)
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
            tags: report.forms.form_tag_links?.map((link) => link.form_tags).filter(Boolean) || [],
          }
        : null,
      student: report.form_responses?.users
        ? {
            id: report.form_responses.users.id,
            name: report.form_responses.users.name,
            nickname: report.form_responses.users.nickname,
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
      hasSummary: reportSummaries.has(report.id),
      summaryGeneratedAt: reportSummaries.get(report.id)?.generatedAt,
    };

    return { success: true, data: reportWithDetails };
  } catch (error) {
    console.error("Error fetching report details:", error);
    return { success: false, error: "보고서 상세 조회 중 오류가 발생했습니다." };
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
        id, stage, rejected_at, created_at, updated_at,
        forms!inner(group_id),
        form_responses(submitted_at)
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

    // 응답률 계산
    const submittedReports = reports?.filter((r) => r.form_responses?.submitted_at).length || 0;
    const responseRate = totalReports > 0 ? (submittedReports / totalReports) * 100 : 0;
    const completionRate = totalReports > 0 ? (completedReports / totalReports) * 100 : 0;

    // 최근 활동 데이터 (간단한 예시 - 실제로는 더 정교한 분석 필요)
    const recentActivity = [
      {
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        count: 5,
        type: "submitted" as const,
      },
      {
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        count: 3,
        type: "commented" as const,
      },
      { date: new Date().toISOString().split("T")[0], count: 2, type: "completed" as const },
    ];

    const summary: ReportSummary = {
      totalReports,
      completedReports,
      inProgressReports,
      rejectedReports,
      stageDistribution,
      recentActivity,
      responseRate: Math.round(responseRate),
      completionRate: Math.round(completionRate),
    };

    return { success: true, data: summary };
  } catch (error) {
    console.error("Error fetching report summary:", error);
    return { success: false, error: "보고서 통계 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 일괄 요약 생성
 */
export async function bulkGenerateReportSummaries(
  request: BulkGenerateSummaryRequest
): Promise<ApiResponse<GeneratedSummary[]>> {
  try {
    const summaries: GeneratedSummary[] = [];
    const errors: string[] = [];

    // 병렬 처리로 성능 향상
    const promises = request.reportIds.map(async (reportId) => {
      const result = await generateReportSummary({
        reportId,
        userId: request.userId,
        summaryType: "bulk",
      });

      if (result.success && result.data) {
        summaries.push(result.data);
      } else {
        errors.push(`${reportId}: ${result.error}`);
      }
    });

    await Promise.all(promises);

    // 일괄 생성 완료 알림
    await createNotification({
      target_id: request.userId,
      creator_id: null,
      type: "bulk_summary_completed",
      title: "일괄 요약 생성 완료",
      content: `${summaries.length}개의 보고서 요약이 생성되었습니다.${
        errors.length > 0 ? ` (${errors.length}개 실패)` : ""
      }`,
      action_url: `/reports/summaries`,
      related_id: request.groupId,
      is_read: false,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    return {
      success: true,
      data: summaries,
      error: errors.length > 0 ? `일부 요약 생성 실패: ${errors.join(", ")}` : undefined,
    };
  } catch (error) {
    console.error("Error bulk generating summaries:", error);
    return { success: false, error: "일괄 요약 생성 중 오류가 발생했습니다." };
  }
}

/**
 * 담당자 업데이트
 */
export async function updateReportAssignment(
  request: UpdateReportAssignmentRequest
): Promise<ApiResponse<boolean>> {
  try {
    const updates: Partial<Pick<ReportUpdate, "time_teacher_id" | "teacher_id" | "updated_at">> =
      {};
    if (request.timeTeacherId) updates.time_teacher_id = request.timeTeacherId;
    if (request.teacherId) updates.teacher_id = request.teacherId;

    const { error } = await supabaseAdmin
      .from("reports")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", request.reportId);

    if (error) throw error;

    return { success: true, data: true };
  } catch (error) {
    console.error("Error updating report assignment:", error);
    return { success: false, error: "담당자 업데이트 중 오류가 발생했습니다." };
  }
}

/**
 * 일괄 담당자 업데이트
 */
export async function bulkUpdateReportAssignments(
  request: BulkUpdateReportsRequest
): Promise<ApiResponse<boolean>> {
  try {
    const updates: Partial<Pick<ReportUpdate, "time_teacher_id" | "teacher_id" | "updated_at">> =
      {};
    if (request.timeTeacherId) updates.time_teacher_id = request.timeTeacherId;
    if (request.teacherId) updates.teacher_id = request.teacherId;

    const { error } = await supabaseAdmin
      .from("reports")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .in("id", request.reportIds);

    if (error) throw error;

    return { success: true, data: true };
  } catch (error) {
    console.error("Error bulk updating report assignments:", error);
    return { success: false, error: "일괄 담당자 업데이트 중 오류가 발생했습니다." };
  }
}
