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
  };
  averageGenerationTime: number; // 초 단위
  popularPromptTypes: {
    type: string;
    count: number;
  }[];
  recentActivity: {
    date: string;
    count: number;
  }[];
}

// ===== 임시 저장소 (실제로는 DB 테이블 사용) =====
const reportSummaries = new Map<string, GeneratedSummary>();
const formOverviews = new Map<string, FormOverviewSummary>();
const summaryAnalytics: SummaryAnalytics = {
  totalSummariesGenerated: 0,
  summariesByType: { individual: 0, bulk: 0, overview: 0 },
  averageGenerationTime: 0,
  popularPromptTypes: [],
  recentActivity: [],
};

// ===== Gemini AI 프롬프트 템플릿 =====

const STUDENT_SUMMARY_PROMPT = `
다음 학생의 폼 응답을 분석하여 간결하고 유용한 요약을 생성해주세요.

학생 정보:
- 이름: {studentName}
- 반: {className}
- 제출일: {submittedAt}

폼 제목: {formTitle}

학생 응답:
{studentResponses}

다음 형식으로 요약해주세요:
1. 핵심 내용 요약 (2-3문장)
2. 주요 특징 및 패턴
3. 주목할 점

한국어로 작성하고, 교육적이고 건설적인 톤을 유지해주세요.
`;

const TIME_TEACHER_SUMMARY_PROMPT = `
다음 시간강사의 코멘트를 분석하여 핵심 내용을 요약해주세요.

시간강사 코멘트:
{timeTeacherComment}

학생 응답 맥락:
{studentContext}

다음 관점에서 요약해주세요:
1. 주요 피드백 내용
2. 제안된 개선사항
3. 긍정적 평가 요소

간결하고 실용적인 한국어로 작성해주세요.
`;

const TEACHER_SUMMARY_PROMPT = `
다음 부장선생님의 최종 코멘트를 분석하여 요약해주세요.

부장선생님 코멘트:
{teacherComment}

이전 시간강사 피드백:
{timeTeacherContext}

학생 응답 맥락:
{studentContext}

다음 관점에서 요약해주세요:
1. 최종 평가 및 판단
2. 향후 방향성 제시
3. 종합적 의견

교육적 가치가 있는 한국어로 작성해주세요.
`;

const OVERALL_SUMMARY_PROMPT = `
다음 정보를 종합하여 완전한 보고서 요약을 생성해주세요.

학생 응답 요약: {studentSummary}
시간강사 코멘트 요약: {timeTeacherSummary}
부장선생님 코멘트 요약: {teacherSummary}

다음 구조로 종합 요약을 작성해주세요:

1. 전체 개요 (3-4문장)
2. 주요 강점 (3-5개 항목)
3. 개선 필요 영역 (3-5개 항목)
4. 구체적 권장사항 (3-5개 항목)

교육적이고 실행 가능한 내용으로 한국어로 작성해주세요.
`;

const FORM_OVERVIEW_PROMPT = `
다음 폼의 모든 보고서를 분석하여 전체적인 인사이트를 제공해주세요.

폼 정보:
- 제목: {formTitle}
- 총 응답 수: {totalReports}
- 완료된 보고서 수: {completedReports}

개별 보고서 요약들:
{individualSummaries}

다음 분석을 제공해주세요:

1. 전체 학생들의 공통 강점 (5개 이하)
2. 주요 개선 필요 영역 (5개 이하)  
3. 전체적인 권장사항 (5개 이하)
4. 성과 분포 분석
   - 우수: 상위 25%
   - 양호: 상위 25-50%
   - 보통: 하위 25-50%
   - 개선필요: 하위 25%

교육적 가치가 있고 실행 가능한 한국어로 작성해주세요.
`;

// ===== 유틸리티 함수들 =====

/**
 * 보고서 데이터 수집
 */
async function collectReportData(reportId: string): Promise<ReportSummaryData | null> {
  try {
    const { data: report, error: reportError } = await supabaseAdmin
      .from("reports")
      .select("*")
      .eq("id", reportId)
      .single();

    if (reportError || !report) {
      console.error("Report not found:", reportError);
      return null;
    }

    // 폼 정보 조회
    const { data: form } = await supabaseAdmin
      .from("forms")
      .select("title")
      .eq("id", report.form_id || "")
      .single();

    // 질문 응답 데이터 수집
    if (!report.form_response_id) {
      console.error("No form response found for report:", reportId);
      return null;
    }

    const { data: formResponse } = await supabaseAdmin
      .from("form_responses")
      .select(
        `
        status, submitted_at, student_id,
        users!form_responses_student_id_fkey (name, nickname)
      `
      )
      .eq("id", report.form_response_id)
      .single();

    const { data: questionResponses } = await supabaseAdmin
      .from("form_question_responses")
      .select(
        `
        *,
        form_questions!form_question_responses_question_id_fkey (
          question_text, question_type, is_required, order_index
        )
      `
      )
      .eq("form_response_id", report.form_response_id);

    // 안전한 타입 변환
    const responses: QuestionResponseData[] = (questionResponses || [])
      .filter((qr) => qr.form_questions) // null 체크
      .map((qr) => ({
        questionId: qr.question_id || "",
        questionType: qr.form_questions!.question_type,
        questionText: qr.form_questions!.question_text,
        isRequired: qr.form_questions!.is_required || false,
        orderIndex: qr.form_questions!.order_index,
        response: {
          textResponse: qr.text_response || undefined,
          numberResponse: qr.number_response || undefined,
          ratingResponse: qr.rating_response || undefined,
          examResponse: qr.exam_response
            ? (qr.exam_response as Record<string, unknown>)
            : undefined,
        },
      }));

    return {
      reportId,
      formTitle: form?.title || "Unknown Form",
      studentName: formResponse?.users?.name || "Unknown Student",
      className: report.class_name || undefined,
      studentResponses: responses.sort((a, b) => a.orderIndex - b.orderIndex),
      timeTeacherComment: report.time_teacher_comment || undefined,
      teacherComment: report.teacher_comment || undefined,
      submittedAt: formResponse?.submitted_at || undefined,
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
        timeTeacherContext: reportData.timeTeacherComment || "시간강사 코멘트 없음",
        studentContext: formatStudentResponses(reportData.studentResponses),
      });
      teacherSummary = await generateAISummary(teacherPrompt);
    }

    // 4. 종합 요약 생성
    const overallPrompt = renderPrompt(OVERALL_SUMMARY_PROMPT, {
      studentSummary,
      timeTeacherSummary,
      teacherSummary,
    });
    const overallSummary = await generateAISummary(overallPrompt);

    // 5. 인사이트 추출
    const insights = extractInsights(overallSummary);

    // 6. 최종 요약 객체 생성
    const summary: GeneratedSummary = {
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
    const generationTime = (Date.now() - startTime) / 1000;
    summaryAnalytics.totalSummariesGenerated++;
    summaryAnalytics.summariesByType.individual++;
    summaryAnalytics.averageGenerationTime =
      (summaryAnalytics.averageGenerationTime + generationTime) / 2;

    // 생성 완료 알림
    await createNotification({
      target_id: request.userId,
      creator_id: null,
      type: "summary_generated",
      title: "보고서 요약 생성 완료",
      content: `"${reportData.formTitle}" 보고서의 AI 요약이 생성되었습니다.`,
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
 * 여러 보고서 일괄 요약 생성
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
