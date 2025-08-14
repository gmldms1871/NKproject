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
  result: string | null;
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
        draft_status: "draft",
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
    nextAction = `반려됨 - ${report.rejection_reason}`;
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
        nextAction = "완료됨 - AI 정제 가능";
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
    // 최신 모델 사용 (gemini-1.5-pro 또는 gemini-1.5-flash)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error generating AI summary:", error);
    // 에러 발생 시 대체 모델 시도
    try {
      const fallbackModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      const result = await fallbackModel.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (fallbackError) {
      console.error("Fallback model also failed:", fallbackError);
      return "AI 요약 생성 중 오류가 발생했습니다.";
    }
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

// 학원 분석 결과지 프롬프트 템플릿
const ACADEMY_ANALYSIS_REPORT_PROMPT = `
당신은 학원 성적 분석 전문 보고서 작성자이며, 독자가 읽었을 때 구체적이고 설득력 있는 내용을 작성하는 것이 목표입니다.

당신의 보고서는 부모님과 학생 모두가 이해할 수 있도록 **객관적인 수치, 구체적인 예시, 행동 계획**을 포함해야 합니다.

[작성 절차]
1단계: 입력된 학생 데이터를 분석하고, 강점과 약점을 각각 최소 3개씩 도출
2단계: 강점은 칭찬과 근거를 함께 작성, 약점은 원인·사례·영향을 함께 작성
3단계: 각 강점/약점에 별점 척도(★~★★★★★) 부여
4단계: 약점을 개선하기 위한 지도 계획을 3개 이상 작성
5단계: 종합의견에서는 '현재 상태 → 원인 분석 → 개선 방향 → 기대 효과' 순서로 하나의 문단 작성
6단계: 모든 내용이 구체적이고 실천 가능하도록 보완

[입력 데이터]
■ 기본 정보
학생명: {{studentName}}
반명: {{className}}
폼 제목: {{formTitle}}
제출일: {{submittedAt}}

■ 학생 응답 내용
{{studentResponses}}

■ 교사 코멘트
시간강사 코멘트: {{timeTeacherComment}}
선생님 코멘트: {{teacherComment}}

[형식]
[NK학원 분석 결과지]

■ 날짜: {{formattedDate}}
■ 시험종류: {{formTitle}}
■ 이름: {{studentName}} (반명: {{className}})
■ 제출일: {{submittedAt}}

■ 학생 통합 분석
▷ 강점
1. [강점 제목] ★★★★☆
   (구체적인 칭찬과 근거를 포함하여 작성)

2. [강점 제목] ★★★★☆
   (구체적인 칭찬과 근거를 포함하여 작성)

3. [강점 제목] ★★★★☆
   (구체적인 칭찬과 근거를 포함하여 작성)

▷ 약점
1. [약점 제목] ★★☆☆☆
   (원인·구체적 사례·영향을 포함하여 작성)

2. [약점 제목] ★★☆☆☆
   (원인·구체적 사례·영향을 포함하여 작성)

3. [약점 제목] ★★☆☆☆
   (원인·구체적 사례·영향을 포함하여 작성)

■ 앞으로의 지도 계획
1. [구체적인 지도 방향]
   - 실행 방법: (구체적인 방법 제시)
   - 예상 소요 기간: (기간 명시)
   - 기대 효과: (개선될 것으로 예상되는 부분)

2. [구체적인 지도 방향]
   - 실행 방법: (구체적인 방법 제시)
   - 예상 소요 기간: (기간 명시)
   - 기대 효과: (개선될 것으로 예상되는 부분)

3. [구체적인 지도 방향]
   - 실행 방법: (구체적인 방법 제시)
   - 예상 소요 기간: (기간 명시)
   - 기대 효과: (개선될 것으로 예상되는 부분)

■ 담임 종합의견
(현재 상태 → 원인 분석 → 개선 방향 → 기대 효과 순서로 하나의 문단으로 작성)

[검증 기준]
- 수치와 분석 내용이 일치하는가?
- 강점/약점에 구체적 사례가 있는가?
- 지도 계획이 실제로 실행 가능한가?
- 종합의견이 논리적 흐름을 갖췄는가?

주의사항:
- 모든 내용은 학생 응답과 교사 코멘트를 바탕으로 작성
- 객관적이고 구체적인 내용으로 작성
- 학부모가 이해하기 쉽도록 명확하게 작성
- 긍정적인 면과 개선점을 균형있게 제시
- 수치나 구체적인 예시가 있다면 반드시 포함
- 실천 가능한 행동 계획을 제시
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
      .select("stage, rejected_at, time_teacher_id, teacher_id")
      .eq("id", request.reportId)
      .single();

    if (checkError) throw checkError;
    if (!currentReport) {
      return { success: false, error: "보고서를 찾을 수 없습니다." };
    }

    const currentStage = currentReport.stage || 0;
    let newStage = currentStage;
    const updateData: Partial<ReportUpdate> = {
      updated_at: new Date().toISOString(),
    };

    // 반려된 보고서의 경우 rejected_at을 null로 설정하여 다시 진행할 수 있도록 함
    if (currentReport.rejected_at) {
      updateData.rejected_at = null;
      updateData.rejection_reason = null;
    }

    // 코멘트 타입에 따른 단계 진행
    if (request.commentType === "time_teacher") {
      // 반려된 보고서의 경우 단계 검증을 완화
      if (!currentReport.rejected_at && currentStage !== 1) {
        return { success: false, error: "시간강사 검토 단계가 아닙니다." };
      }

      // 시간강사 권한 확인
      if (currentReport.time_teacher_id !== request.userId) {
        return { success: false, error: "해당 보고서의 시간강사만 코멘트를 작성할 수 있습니다." };
      }

      newStage = 2;
      updateData.time_teacher_comment = request.comment;
      updateData.time_teacher_completed_at = new Date().toISOString();
      updateData.time_teacher_id = request.userId; // 시간강사 ID 설정
    } else if (request.commentType === "teacher") {
      // 반려된 보고서의 경우 단계 검증을 완화
      if (!currentReport.rejected_at && currentStage !== 2) {
        return { success: false, error: "선생님 검토 단계가 아닙니다." };
      }

      // 선생님 권한 확인
      if (currentReport.teacher_id !== request.userId) {
        return { success: false, error: "해당 보고서의 선생님만 코멘트를 작성할 수 있습니다." };
      }

      newStage = 3;
      updateData.teacher_comment = request.comment;
      updateData.teacher_completed_at = new Date().toISOString();
      updateData.teacher_id = request.userId; // 선생님 ID 설정
    }

    updateData.stage = newStage;
    // draft_status는 draft로 유지 (AI 정제 시에만 completed로 변경)
    updateData.draft_status = "draft";

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
        .select("teacher_id, student_name, forms(group_id)")
        .eq("id", request.reportId)
        .single();

      if (report?.teacher_id) {
        const groupId = report.forms?.group_id;
        await createNotification({
          target_id: report.teacher_id,
          creator_id: request.userId,
          type: "report_stage_advanced",
          title: "보고서 검토 요청",
          content: `${report.student_name} 학생의 보고서 검토가 요청되었습니다.`,
          action_url: groupId
            ? `/groups/${groupId}/reports/${request.reportId}`
            : `/reports/${request.reportId}`,
          related_id: request.reportId,
          is_read: false,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }
    } else if (newStage === 3) {
      // 최종 완료 알림
      const { data: report } = await supabaseAdmin
        .from("reports")
        .select("form_responses(student_id), student_name, forms(group_id)")
        .eq("id", request.reportId)
        .single();

      if (report?.form_responses?.student_id) {
        const groupId = report.forms?.group_id;
        await createNotification({
          target_id: report.form_responses.student_id,
          creator_id: request.userId,
          type: "report_completed",
          title: "보고서가 완료되었습니다",
          content: `${report.student_name} 학생의 보고서 검토가 완료되었습니다.`,
          action_url: groupId
            ? `/groups/${groupId}/reports/${request.reportId}`
            : `/reports/${request.reportId}`,
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
 * 💾 보고서 반려 (stage를 낮춤)
 */
export async function rejectReport(request: RejectReportRequest): Promise<ApiResponse<boolean>> {
  try {
    // 반려 이유가 필수
    if (!request.rejectionReason || request.rejectionReason.trim() === "") {
      return { success: false, error: "반려 사유를 입력해주세요." };
    }

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
      return { success: false, error: "이미 반려된 보고서입니다." };
    }

    const currentStage = currentReport.stage || 0;
    let newStage = currentStage;

    // 현재 단계에 따라 stage를 낮춤
    if (currentStage === 3) {
      // 완료된 보고서는 선생님 검토 단계로
      newStage = 2;
    } else if (currentStage === 2) {
      // 선생님 검토 단계는 시간강사 검토 단계로
      newStage = 1;
    } else if (currentStage === 1) {
      // 시간강사 검토 단계는 응답 대기 단계로
      newStage = 0;
    } else {
      return { success: false, error: "더 이상 단계를 낮출 수 없습니다." };
    }

    const { error } = await supabaseAdmin
      .from("reports")
      .update({
        stage: newStage,
        draft_status: "draft", // 반려 시에도 draft 상태 유지
        rejected_at: new Date().toISOString(),
        rejected_by: request.rejectedBy,
        rejection_reason: request.rejectionReason.trim(),
        updated_at: new Date().toISOString(),
        // 반려 시 코멘트 초기화
        time_teacher_comment: null,
        time_teacher_completed_at: null,
        teacher_comment: null,
        teacher_completed_at: null,
      })
      .eq("id", request.reportId);

    if (error) throw error;

    // 보고서 반려 알림
    const { data: report } = await supabaseAdmin
      .from("reports")
      .select("form_responses(student_id), student_name, forms(group_id)")
      .eq("id", request.reportId)
      .single();

    if (report?.form_responses?.student_id) {
      const groupId = report.forms?.group_id;
      await createNotification({
        target_id: report.form_responses.student_id,
        creator_id: request.rejectedBy,
        type: "report_rejected",
        title: "보고서가 반려되었습니다",
        content: `반려 사유: ${request.rejectionReason}`,
        action_url: groupId
          ? `/groups/${groupId}/reports/${request.reportId}`
          : `/reports/${request.reportId}`,
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
      .select("form_responses(student_id), student_name, forms(group_id)")
      .eq("id", request.reportId)
      .single();

    if (report?.form_responses?.student_id) {
      const groupId = report.forms?.group_id;
      await createNotification({
        target_id: report.form_responses.student_id,
        creator_id: request.resetBy,
        type: "report_reset",
        title: "폼 재작성 요청",
        content: `${request.resetReason} - 폼을 다시 작성해주세요.`,
        action_url: groupId
          ? `/groups/${groupId}/reports/${request.reportId}`
          : `/reports/${request.reportId}`,
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
      // draft_status 필터링 추가
      if (conditions.status && conditions.status.length > 0) {
        query = query.in("draft_status", conditions.status);
      }
    }

    // 기본 정렬: 업데이트 시간 내림차순, 단계별 정렬
    const { data: reports, error } = await query
      .order("updated_at", { ascending: false })
      .order("stage", { ascending: true });

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
        result: report.result,
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

    // 학원 분석 결과지 생성
    const formattedDate = new Date().toLocaleDateString("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    });

    const analysisPrompt = renderPrompt(ACADEMY_ANALYSIS_REPORT_PROMPT, {
      studentName: report.student_name || "Unknown",
      className: report.class_name || "",
      formTitle: report.forms?.title || "폼",
      submittedAt: formResponseData.submitted_at || "",
      formattedDate,
      studentResponses: studentResponsesText,
      timeTeacherComment: report.time_teacher_comment || "코멘트 없음",
      teacherComment: report.teacher_comment || "코멘트 없음",
    });
    const academyAnalysisReport = await generateAISummary(analysisPrompt);

    // 인사이트 추출 (간단한 예시 - 실제로는 더 정교한 분석 필요)
    const insights = {
      strengths: ["적극적인 참여", "창의적 사고"],
      weaknesses: ["세부사항 부족", "시간 관리"],
      recommendations: ["추가 학습 자료 제공", "개별 피드백 강화"],
    };

    const summary: GeneratedSummary = {
      reportId: request.reportId,
      studentSummary: academyAnalysisReport,
      timeTeacherSummary: report.time_teacher_comment || "",
      teacherSummary: report.teacher_comment || "",
      overallSummary: academyAnalysisReport,
      insights,
      generatedAt: new Date().toISOString(),
      generatedBy: request.userId,
    };

    // 메모리에 저장 (실제로는 데이터베이스에 저장)
    reportSummaries.set(request.reportId, summary);

    // AI 정제 완료 시 result 필드에 저장하고 draft_status를 completed로 변경
    const { error: updateError } = await supabaseAdmin
      .from("reports")
      .update({
        result: academyAnalysisReport,
        draft_status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", request.reportId);

    if (updateError) {
      console.warn("Report draft_status update failed:", updateError);
    }

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
      result: report.result,
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
        id, stage, rejected_at, created_at, updated_at, draft_status, form_response_id,
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

    // 응답률 계산 (form_response_id가 있는 경우)
    const submittedReports = reports?.filter((r) => r.form_response_id).length || 0;
    const responseRate = totalReports > 0 ? (submittedReports / totalReports) * 100 : 0;
    const completionRate = totalReports > 0 ? (completedReports / totalReports) * 100 : 0;

    // 최근 활동 데이터 (실제 데이터 기반으로 계산)
    const now = new Date();
    const recentActivity = [
      {
        date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        count:
          reports?.filter((r) => {
            const reportDate = r.updated_at ? new Date(r.updated_at) : new Date(r.created_at || "");
            const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
            return (
              reportDate >= twoDaysAgo &&
              reportDate < new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)
            );
          }).length || 0,
        type: "submitted" as const,
      },
      {
        date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        count:
          reports?.filter((r) => {
            const reportDate = r.updated_at ? new Date(r.updated_at) : new Date(r.created_at || "");
            const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
            return reportDate >= oneDayAgo && reportDate < now;
          }).length || 0,
        type: "commented" as const,
      },
      {
        date: now.toISOString().split("T")[0],
        count:
          reports?.filter((r) => {
            const reportDate = r.updated_at ? new Date(r.updated_at) : new Date(r.created_at || "");
            return reportDate >= now;
          }).length || 0,
        type: "completed" as const,
      },
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
