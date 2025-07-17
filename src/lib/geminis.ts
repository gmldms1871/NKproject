import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabaseAdmin } from "./supabase";
import { Database } from "./types/types";
import { createNotification } from "./notifications";

// 데이터베이스 타입 import
type Report = Database["public"]["Tables"]["reports"]["Row"];
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

export interface GenerateReportSummaryRequest {
  reportId: string;
  userId: string;
  summaryType?: "individual" | "bulk"; // 개별 또는 일괄 생성
}

export interface BulkGenerateSummaryRequest {
  reportIds: string[];
  userId: string;
  groupId: string;
}

export interface FormOverviewSummaryRequest {
  formId: string;
  userId: string;
  groupId: string;
}

export interface CustomSummaryRequest {
  reportId: string;
  userId: string;
  customPrompt: string; // 사용자 정의 프롬프트
  summaryType: "student_focus" | "teacher_focus" | "improvement_focus" | "custom";
}

// ===== 응답 타입 정의 =====

export interface ReportSummaryData {
  reportId: string;
  formTitle: string;
  studentName: string;
  className?: string;
  studentResponses: QuestionResponseData[];
  timeTeacherComment?: string;
  teacherComment?: string;
  submittedAt?: string;
  stage: number;
}

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
    examResponse?: Record<string, unknown>;
  };
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
  averageScore?: number;
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

export interface SummaryAnalytics {
  totalSummariesGenerated: number;
  summariesByType: {
    individual: number;
    bulk: number;
    overview: number;
    custom: number;
  };
  averageGenerationTime: number; // 초
  mostActiveUsers: {
    userId: string;
    userName: string;
    summaryCount: number;
  }[];
  recentActivity: {
    date: string;
    count: number;
  }[];
}

export interface FinalReport {
  id: string;
  formId: string;
  formTitle: string;
  studentId: string;
  studentName: string;
  className?: string;
  submittedAt: string;
  timeTeacherComment?: string;
  teacherComment?: string;
  stage: number;
  hasSummary: boolean;
  summaryGeneratedAt?: string;
  summaryData?: GeneratedSummary;
}

// ===== 프롬프트 템플릿 =====

const STUDENT_SUMMARY_PROMPT = `
다음은 학생의 폼 응답 내용입니다. 학생의 학습 상태와 성과를 간결하게 요약해주세요.

학생명: {studentName}
반: {className}
제출일: {submittedAt}
폼 제목: {formTitle}

학생 응답:
{studentResponses}

다음 관점에서 요약해주세요:
1. 응답의 완성도와 성실성
2. 학습 내용 이해도
3. 특별한 강점이나 개선점
4. 전반적인 학습 태도

요약은 3-4문장으로 작성해주세요.
`;

const TIME_TEACHER_SUMMARY_PROMPT = `
다음은 시간강사의 코멘트입니다. 핵심 내용을 요약해주세요.

시간강사 코멘트:
{timeTeacherComment}

학생 응답 맥락:
{studentContext}

시간강사의 관찰 내용과 지도 의견을 2-3문장으로 요약해주세요.
`;

const TEACHER_SUMMARY_PROMPT = `
다음은 부장선생님의 코멘트입니다. 핵심 내용을 요약해주세요.

부장선생님 코멘트:
{teacherComment}

학생 응답 맥락:
{studentContext}

부장선생님의 평가와 향후 지도 방향을 2-3문장으로 요약해주세요.
`;

const OVERALL_SUMMARY_PROMPT = `
다음 정보를 종합하여 학생에 대한 전체적인 평가와 향후 지도 방안을 제시해주세요.

학생 응답 요약:
{studentSummary}

시간강사 코멘트 요약:
{timeTeacherSummary}

부장선생님 코멘트 요약:
{teacherSummary}

다음 형식으로 작성해주세요:

**주요 강점:**
- 강점 1
- 강점 2

**개선 필요 사항:**
- 개선점 1
- 개선점 2

**권장사항:**
- 권장사항 1
- 권장사항 2

**종합 평가:**
학생의 전반적인 상태와 향후 지도 방향을 2-3문장으로 요약.
`;

const FORM_OVERVIEW_PROMPT = `
다음은 폼의 전체 응답 데이터입니다. 전체적인 경향과 패턴을 분석해주세요.

폼 제목: {formTitle}
총 응답 수: {totalReports}
완료된 응답 수: {completedReports}

개별 응답 요약:
{individualSummaries}

다음 관점에서 분석해주세요:
1. 전체적인 학습 성취도
2. 공통적으로 나타나는 강점
3. 공통적으로 나타나는 약점
4. 개선을 위한 전체적인 권장사항

분석 결과를 체계적으로 정리해주세요.
`;

// ===== 임시 저장소 (실제로는 데이터베이스 사용) =====

const reportSummaries = new Map<string, GeneratedSummary>();
const formOverviews = new Map<string, FormOverviewSummary>();
const summaryAnalytics: SummaryAnalytics = {
  totalSummariesGenerated: 0,
  summariesByType: {
    individual: 0,
    bulk: 0,
    overview: 0,
    custom: 0,
  },
  averageGenerationTime: 0,
  mostActiveUsers: [],
  recentActivity: [],
};

// ===== 유틸리티 함수들 =====

/**
 * 보고서 데이터 수집
 */
async function collectReportData(reportId: string): Promise<ReportSummaryData | null> {
  try {
    const { data: report, error: reportError } = await supabaseAdmin
      .from("reports")
      .select(
        `
        *,
        forms(title),
        form_responses(
          *,
          users(name)
        )
      `
      )
      .eq("id", reportId)
      .single();

    if (reportError) throw reportError;

    const { data: questionResponses, error: responsesError } = await supabaseAdmin
      .from("form_question_responses")
      .select(
        `
        *,
        form_questions(*)
      `
      )
      .eq("form_response_id", report.form_response_id || "")
      .order("form_questions.order_index", { ascending: true });

    if (responsesError) throw responsesError;

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
        examResponse: qr.exam_response ? (qr.exam_response as Record<string, unknown>) : undefined,
      },
    }));

    return {
      reportId,
      formTitle: report.forms?.title || "Unknown Form",
      studentName: report.form_responses?.users?.name || "Unknown Student",
      className: report.class_name || undefined,
      studentResponses: responses.sort((a, b) => a.orderIndex - b.orderIndex),
      timeTeacherComment: report.time_teacher_comment || undefined,
      teacherComment: report.teacher_comment || undefined,
      submittedAt: report.form_responses?.submitted_at || undefined,
      stage: report.stage || 0,
    };
  } catch (error) {
    console.error("Error collecting report data:", error);
    return null;
  }
}

/**
 * 프롬프트 템플릿 렌더링
 */
function renderPrompt(
  template: string,
  variables: Record<string, string | number | boolean | undefined | null>
): string {
  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{${key}}`;
    rendered = rendered.replace(new RegExp(placeholder, "g"), String(value || ""));
  }
  return rendered;
}

/**
 * 학생 응답을 텍스트로 변환
 */
function formatStudentResponses(responses: QuestionResponseData[]): string {
  return responses
    .map((r) => {
      let answer = "";
      if (r.response.textResponse) answer = r.response.textResponse;
      else if (r.response.numberResponse) answer = r.response.numberResponse.toString();
      else if (r.response.ratingResponse) answer = `${r.response.ratingResponse}점`;
      else if (r.response.examResponse) answer = "시험 응답 (상세 분석 필요)";
      else answer = "응답 없음";

      return `질문: ${r.questionText}\n답변: ${answer}\n`;
    })
    .join("\n");
}

/**
 * Gemini AI 요약 생성
 */
async function generateAISummary(prompt: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text() || "요약 생성에 실패했습니다.";
  } catch (error) {
    console.error("Error generating AI summary:", error);
    return "AI 요약 생성 중 오류가 발생했습니다.";
  }
}

/**
 * 인사이트 추출 (AI 응답에서 구조화된 데이터 추출)
 */
function extractInsights(overallSummary: string): GeneratedSummary["insights"] {
  // 간단한 패턴 매칭으로 인사이트 추출
  // 실제로는 더 정교한 NLP 또는 구조화된 AI 응답 활용

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  // "강점", "장점" 섹션 찾기
  const strengthsMatch = overallSummary.match(/(?:주요 강점|강점)[:\s]*\n?((?:[-•*]\s*.*\n?)*)/i);
  if (strengthsMatch) {
    const items = strengthsMatch[1].match(/[-•*]\s*([^\n]+)/g);
    if (items) {
      strengths.push(...items.map((item) => item.replace(/[-•*]\s*/, "").trim()));
    }
  }

  // "개선", "약점" 섹션 찾기
  const weaknessesMatch = overallSummary.match(
    /(?:개선 필요|약점|개선사항)[:\s]*\n?((?:[-•*]\s*.*\n?)*)/i
  );
  if (weaknessesMatch) {
    const items = weaknessesMatch[1].match(/[-•*]\s*([^\n]+)/g);
    if (items) {
      weaknesses.push(...items.map((item) => item.replace(/[-•*]\s*/, "").trim()));
    }
  }

  // "권장사항", "추천" 섹션 찾기
  const recommendationsMatch = overallSummary.match(
    /(?:권장사항|추천|제안)[:\s]*\n?((?:[-•*]\s*.*\n?)*)/i
  );
  if (recommendationsMatch) {
    const items = recommendationsMatch[1].match(/[-•*]\s*([^\n]+)/g);
    if (items) {
      recommendations.push(...items.map((item) => item.replace(/[-•*]\s*/, "").trim()));
    }
  }

  // 기본값 제공
  return {
    strengths: strengths.length > 0 ? strengths : ["분석된 강점이 없습니다."],
    weaknesses: weaknesses.length > 0 ? weaknesses : ["개선점이 명확하지 않습니다."],
    recommendations:
      recommendations.length > 0 ? recommendations : ["구체적인 권장사항을 확인하세요."],
  };
}

// ===== 메인 API 함수들 =====

/**
 * 개별 보고서 요약 생성
 */
export async function generateReportSummary(
  request: GenerateReportSummaryRequest
): Promise<ApiResponse<GeneratedSummary>> {
  try {
    const startTime = Date.now();

    // 기존 요약이 있는지 확인
    if (reportSummaries.has(request.reportId)) {
      return { success: true, data: reportSummaries.get(request.reportId)! };
    }

    // 보고서 데이터 수집
    const reportData = await collectReportData(request.reportId);
    if (!reportData) {
      return { success: false, error: "보고서 데이터를 찾을 수 없습니다." };
    }

    // 1. 학생 응답 요약
    const studentPrompt = renderPrompt(STUDENT_SUMMARY_PROMPT, {
      studentName: reportData.studentName,
      className: reportData.className || "미지정",
      submittedAt: reportData.submittedAt || "미지정",
      formTitle: reportData.formTitle,
      studentResponses: formatStudentResponses(reportData.studentResponses),
    });
    const studentSummary = await generateAISummary(studentPrompt);

    // 2. 시간강사 코멘트 요약
    let timeTeacherSummary = "시간강사 코멘트가 없습니다.";
    if (reportData.timeTeacherComment) {
      const timeTeacherPrompt = renderPrompt(TIME_TEACHER_SUMMARY_PROMPT, {
        timeTeacherComment: reportData.timeTeacherComment,
        studentContext: formatStudentResponses(reportData.studentResponses),
      });
      timeTeacherSummary = await generateAISummary(timeTeacherPrompt);
    }

    // 3. 선생님 코멘트 요약
    let teacherSummary = "부장선생님 코멘트가 없습니다.";
    if (reportData.teacherComment) {
      const teacherPrompt = renderPrompt(TEACHER_SUMMARY_PROMPT, {
        teacherComment: reportData.teacherComment,
        studentContext: formatStudentResponses(reportData.studentResponses),
      });
      teacherSummary = await generateAISummary(teacherPrompt);
    }

    // 4. 전체 요약 생성
    const overallPrompt = renderPrompt(OVERALL_SUMMARY_PROMPT, {
      studentSummary,
      timeTeacherSummary,
      teacherSummary,
    });
    const overallSummary = await generateAISummary(overallPrompt);

    // 5. 인사이트 추출
    const insights = extractInsights(overallSummary);

    const summary: GeneratedSummary = {
      id: `summary_${request.reportId}_${Date.now()}`,
      reportId: request.reportId,
      studentSummary,
      timeTeacherSummary,
      teacherSummary,
      overallSummary,
      insights,
      generatedAt: new Date().toISOString(),
      generatedBy: request.userId,
    };

    // 임시 저장
    reportSummaries.set(request.reportId, summary);

    // 통계 업데이트
    summaryAnalytics.totalSummariesGenerated++;
    summaryAnalytics.summariesByType.individual++;

    const endTime = Date.now();
    const generationTime = (endTime - startTime) / 1000;
    summaryAnalytics.averageGenerationTime =
      (summaryAnalytics.averageGenerationTime + generationTime) / 2;

    // 요약 생성 완료 알림
    await createNotification({
      target_id: request.userId,
      creator_id: null,
      type: "summary_generated",
      title: "보고서 요약 생성 완료",
      content: `${reportData.studentName} 학생의 보고서 요약이 생성되었습니다.`,
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
 * 모든 최종 보고서 조회
 */
export async function getAllFinalReports(groupId: string): Promise<ApiResponse<FinalReport[]>> {
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

    const finalReports: FinalReport[] = (reports || []).map((report: any) => ({
      id: report.id,
      formId: report.form_id,
      formTitle: report.forms?.title || "Unknown Form",
      studentId: report.form_responses?.student_id || "unknown",
      studentName: report.form_responses?.users?.name || report.student_name || "Unknown Student",
      className: report.class_name || undefined,
      submittedAt: report.form_responses?.submitted_at || report.updated_at,
      timeTeacherComment: report.time_teacher_comment || undefined,
      teacherComment: report.teacher_comment || undefined,
      stage: report.stage,
      hasSummary: reportSummaries.has(report.id),
      summaryGeneratedAt: reportSummaries.get(report.id)?.generatedAt,
      summaryData: reportSummaries.get(report.id),
    }));

    return { success: true, data: finalReports };
  } catch (error) {
    console.error("Error getting final reports:", error);
    return { success: false, error: "최종 보고서 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 일괄 요약 생성
 */
export async function bulkGenerateSummary(request: {
  reportIds: string[];
  userId: string;
  groupId: string;
}): Promise<ApiResponse<GeneratedSummary[]>> {
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

    // 통계 업데이트
    summaryAnalytics.summariesByType.bulk += summaries.length;

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
 * 최종 보고서 요약 조회 (generateReportSummary의 별칭)
 */
export const getFinalReportSummary = generateReportSummary;

/**
 * 폼 전체 개요 요약 생성
 */
export async function generateFormOverviewSummary(
  request: FormOverviewSummaryRequest
): Promise<ApiResponse<FormOverviewSummary>> {
  try {
    // 기존 개요가 있는지 확인
    if (formOverviews.has(request.formId)) {
      return { success: true, data: formOverviews.get(request.formId)! };
    }

    // 폼의 모든 완료된 보고서 조회
    const { data: reports, error } = await supabaseAdmin
      .from("reports")
      .select(
        `
        id, stage,
        forms!reports_form_id_fkey (title, description)
      `
      )
      .eq("form_id", request.formId)
      .eq("stage", 3); // 완료된 보고서만

    if (error) throw error;

    if (!reports || reports.length === 0) {
      return { success: false, error: "완료된 보고서가 없습니다." };
    }

    // 각 보고서의 요약 생성 또는 조회
    const reportSummaries: ReportSummaryData[] = [];
    for (const report of reports) {
      const summaryData = await collectReportData(report.id);
      if (summaryData) {
        reportSummaries.push(summaryData);
      }
    }

    // 개별 요약들을 문자열로 포맷
    const individualSummaries = reportSummaries
      .map(
        (summary) =>
          `학생: ${summary.studentName}\n${formatStudentResponses(summary.studentResponses)}\n---`
      )
      .join("\n\n");

    // 폼 개요 요약 생성
    const overviewPrompt = renderPrompt(FORM_OVERVIEW_PROMPT, {
      formTitle: reports[0].forms?.title || "Unknown Form",
      totalReports: reportSummaries.length,
      completedReports: reports.length,
      individualSummaries,
    });

    const overviewText = await generateAISummary(overviewPrompt);

    // 성과 분포 계산 (간단한 예시 - 실제로는 더 정교한 분석 필요)
    const total = reportSummaries.length;
    const distribution = {
      excellent: Math.floor(total * 0.25),
      good: Math.floor(total * 0.25),
      average: Math.floor(total * 0.25),
      needsImprovement: total - Math.floor(total * 0.75),
    };

    // 공통 패턴 추출 (간단한 예시)
    const commonStrengths = ["적극적인 참여도", "창의적 사고", "논리적 구성"];
    const commonWeaknesses = ["세부사항 부족", "시간 관리", "자기 성찰"];
    const overallRecommendations = ["개별 피드백 강화", "추가 학습 자료 제공", "지속적 모니터링"];

    const overview: FormOverviewSummary = {
      formId: request.formId,
      formTitle: reports[0].forms?.title || "Unknown Form",
      totalReports: reportSummaries.length,
      completedReports: reports.length,
      commonStrengths,
      commonWeaknesses,
      overallRecommendations,
      studentPerformanceDistribution: distribution,
      generatedAt: new Date().toISOString(),
    };

    // 임시 저장
    formOverviews.set(request.formId, overview);

    // 통계 업데이트
    summaryAnalytics.summariesByType.overview++;

    return { success: true, data: overview };
  } catch (error) {
    console.error("Error generating form overview:", error);
    return { success: false, error: "폼 개요 요약 생성 중 오류가 발생했습니다." };
  }
}

/**
 * 사용자 정의 프롬프트로 요약 생성
 */
export async function generateCustomSummary(
  request: CustomSummaryRequest
): Promise<ApiResponse<string>> {
  try {
    // 보고서 데이터 수집
    const reportData = await collectReportData(request.reportId);
    if (!reportData) {
      return { success: false, error: "보고서 데이터를 찾을 수 없습니다." };
    }

    // 사전 정의된 프롬프트 또는 사용자 정의 프롬프트 사용
    let prompt = request.customPrompt;

    if (request.summaryType !== "custom") {
      const baseContext = `
학생: ${reportData.studentName}
폼: ${reportData.formTitle}
응답: ${formatStudentResponses(reportData.studentResponses)}
시간강사 코멘트: ${reportData.timeTeacherComment || "없음"}
선생님 코멘트: ${reportData.teacherComment || "없음"}
      `;

      switch (request.summaryType) {
        case "student_focus":
          prompt = `다음 정보를 바탕으로 학생의 관점에서 학습 성과와 개선점을 분석해주세요:\n${baseContext}`;
          break;
        case "teacher_focus":
          prompt = `다음 정보를 바탕으로 교사의 관점에서 지도 방향과 교육 전략을 제안해주세요:\n${baseContext}`;
          break;
        case "improvement_focus":
          prompt = `다음 정보를 바탕으로 구체적이고 실행 가능한 개선 계획을 수립해주세요:\n${baseContext}`;
          break;
      }
    }

    // 변수 치환
    prompt = renderPrompt(prompt, {
      studentName: reportData.studentName,
      formTitle: reportData.formTitle,
      className: reportData.className || "미지정",
      studentResponses: formatStudentResponses(reportData.studentResponses),
      timeTeacherComment: reportData.timeTeacherComment || "없음",
      teacherComment: reportData.teacherComment || "없음",
    });

    const customSummary = await generateAISummary(prompt);

    // 통계 업데이트
    summaryAnalytics.summariesByType.custom++;

    return { success: true, data: customSummary };
  } catch (error) {
    console.error("Error generating custom summary:", error);
    return { success: false, error: "사용자 정의 요약 생성 중 오류가 발생했습니다." };
  }
}

/**
 * 저장된 요약 조회
 */
export async function getSavedSummary(reportId: string): Promise<ApiResponse<GeneratedSummary>> {
  try {
    const summary = reportSummaries.get(reportId);
    if (!summary) {
      return { success: false, error: "저장된 요약을 찾을 수 없습니다." };
    }

    return { success: true, data: summary };
  } catch (error) {
    console.error("Error getting saved summary:", error);
    return { success: false, error: "요약 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 요약된 최종 보고서들 조회
 */
export async function getSummarizedReports(
  groupId: string
): Promise<ApiResponse<GeneratedSummary[]>> {
  try {
    // 그룹의 모든 요약 조회 (실제로는 DB에서)
    const summaries = Array.from(reportSummaries.values());

    // 그룹 필터링 (실제로는 DB 쿼리에서)
    // 여기서는 간단히 모든 요약을 반환

    return { success: true, data: summaries };
  } catch (error) {
    console.error("Error getting summarized reports:", error);
    return { success: false, error: "요약된 보고서 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 요약 통계 조회
 */
export async function getSummaryAnalytics(): Promise<ApiResponse<SummaryAnalytics>> {
  try {
    return { success: true, data: summaryAnalytics };
  } catch (error) {
    console.error("Error getting summary analytics:", error);
    return { success: false, error: "요약 통계 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 요약 삭제
 */
export async function deleteSummary(reportId: string): Promise<ApiResponse<boolean>> {
  try {
    const deleted = reportSummaries.delete(reportId);
    return { success: true, data: deleted };
  } catch (error) {
    console.error("Error deleting summary:", error);
    return { success: false, error: "요약 삭제 중 오류가 발생했습니다." };
  }
}

/**
 * 폼 개요 요약 조회
 */
export async function getFormOverview(formId: string): Promise<ApiResponse<FormOverviewSummary>> {
  try {
    const overview = formOverviews.get(formId);
    if (!overview) {
      return { success: false, error: "폼 개요 요약을 찾을 수 없습니다." };
    }

    return { success: true, data: overview };
  } catch (error) {
    console.error("Error getting form overview:", error);
    return { success: false, error: "폼 개요 조회 중 오류가 발생했습니다." };
  }
}
