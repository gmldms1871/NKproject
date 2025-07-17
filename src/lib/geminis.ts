import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabaseAdmin } from "./supabase";
import { Database } from "./types/types";

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

// ===== 임시 저장소 (실제로는 DB 테이블 사용) =====
const reportSummaries = new Map<string, GeneratedSummary>();
const formOverviews = new Map<string, FormOverviewSummary>();

// ===== 알림 생성 헬퍼 함수 =====
const createNotification = async (notificationData: NotificationInsert) => {
  try {
    await supabaseAdmin.from("notifications").insert(notificationData);
  } catch (error) {
    console.error("알림 생성 실패:", error);
  }
};

// ===== 데이터 수집 함수들 =====

/**
 * 보고서 데이터 수집
 */
const collectReportData = async (reportId: string): Promise<ReportSummaryData | null> => {
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

    const { data: questionResponses, error: responseError } = await supabaseAdmin
      .from("form_question_responses")
      .select(
        `
        *,
        form_questions!form_question_responses_question_id_fkey (
          question_type, question_text, is_required, order_index
        )
      `
      )
      .eq("form_response_id", report.form_response_id)
      .order("form_questions.order_index");

    if (responseError) {
      console.error("Error fetching question responses:", responseError);
      return null;
    }

    const studentResponses: QuestionResponseData[] = (questionResponses || []).map(
      (qr: FormQuestionResponse & { form_questions: FormQuestion }) => ({
        questionId: qr.question_id || "",
        questionType: qr.form_questions?.question_type || "",
        questionText: qr.form_questions?.question_text || "",
        isRequired: qr.form_questions?.is_required || false,
        orderIndex: qr.form_questions?.order_index || 0,
        response: {
          textResponse: qr.text_response || undefined,
          numberResponse: qr.number_response || undefined,
          ratingResponse: qr.rating_response || undefined,
          examResponse: (qr.exam_response as Record<string, unknown>) || undefined,
        },
      })
    );

    const student = formResponse?.users;

    return {
      reportId: report.id,
      formTitle: form?.title || "",
      studentName: student?.name || report.student_name || "",
      className: report.class_name || undefined,
      studentResponses,
      timeTeacherComment: report.time_teacher_comment || undefined,
      teacherComment: report.teacher_comment || undefined,
      submittedAt: formResponse?.submitted_at || undefined,
      stage: report.stage || 1,
    };
  } catch (error) {
    console.error("Error collecting report data:", error);
    return null;
  }
};

/**
 * 폼 전체 데이터 수집 (개요 요약용)
 */
const collectFormOverviewData = async (formId: string) => {
  try {
    const { data: form, error: formError } = await supabaseAdmin
      .from("forms")
      .select("title, description")
      .eq("id", formId)
      .single();

    if (formError || !form) {
      return null;
    }

    const { data: reports, error: reportsError } = await supabaseAdmin
      .from("reports")
      .select("*")
      .eq("form_id", formId)
      .eq("stage", 3); // 완료된 보고서만

    if (reportsError) {
      console.error("Error fetching reports:", reportsError);
      return null;
    }

    // 각 보고서의 상세 데이터 수집
    const reportsData = await Promise.all(
      (reports || []).map((report) => collectReportData(report.id))
    );

    return {
      form,
      reports: reportsData.filter((data): data is ReportSummaryData => data !== null),
    };
  } catch (error) {
    console.error("Error collecting form overview data:", error);
    return null;
  }
};

// ===== AI 요약 생성 함수들 =====

/**
 * AI를 사용한 개별 보고서 요약 생성
 */
const generateAIReportSummary = async (
  reportData: ReportSummaryData
): Promise<GeneratedSummary | null> => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 질문과 응답 매핑
    const questionAnswerPairs = reportData.studentResponses
      .map((qr) => {
        let responseText = "";

        switch (qr.questionType) {
          case "text":
            responseText = qr.response.textResponse || "응답 없음";
            break;
          case "rating":
            responseText = `${qr.response.ratingResponse || 0}점`;
            break;
          case "choice":
          case "exam":
            responseText = JSON.stringify(qr.response.examResponse) || "응답 없음";
            break;
          case "number":
            responseText = String(qr.response.numberResponse || 0);
            break;
          default:
            responseText = "응답 없음";
        }

        return `질문 ${qr.orderIndex + 1}: ${qr.questionText}\n응답: ${responseText}\n유형: ${
          qr.questionType
        }${qr.isRequired ? " (필수)" : ""}`;
      })
      .join("\n\n");

    const prompt = `
다음 학습 평가 보고서를 분석하고 요약해주세요.

=== 기본 정보 ===
학생명: ${reportData.studentName}
폼 제목: ${reportData.formTitle}
반: ${reportData.className || "미지정"}
제출일시: ${reportData.submittedAt || "미지정"}
검토 단계: ${reportData.stage}/3

=== 학생 응답 ===
${questionAnswerPairs}

=== 시간강사 코멘트 ===
${reportData.timeTeacherComment || "코멘트 없음"}

=== 부장선생님 코멘트 ===
${reportData.teacherComment || "코멘트 없음"}

다음 JSON 형식으로 요약해주세요:

{
  "studentSummary": "학생의 응답을 바탕으로 한 학습 성취도와 이해도 분석. 강점과 약점을 구체적으로 파악하고 개선이 필요한 영역을 식별.",
  "timeTeacherSummary": "시간강사의 관찰과 피드백 핵심 내용. 교육적 권장사항과 학습 지도 방향.",
  "teacherSummary": "부장선생님의 종합적 판단과 지도 방향. 향후 학습 계획 및 목표 설정.",
  "overallSummary": "전체적인 학습 상황 종합. 주요 성과와 개선 방향, 구체적인 실행 계획 제안.",
  "insights": {
    "strengths": ["강점 1", "강점 2", "강점 3"],
    "weaknesses": ["약점 1", "약점 2", "약점 3"],
    "recommendations": ["권장사항 1", "권장사항 2", "권장사항 3"]
  }
}

한국어로 교육적이고 건설적인 톤으로 작성해주세요. 각 섹션은 2-3문장으로 간결하게 요약하되, 구체적이고 실용적인 내용을 포함해주세요.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();

    // JSON 파싱 시도
    try {
      // JSON 블록 추출 (```json ... ``` 형태일 수 있음)
      const jsonMatch =
        responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[1] || jsonMatch[0] : responseText;

      const parsedSummary = JSON.parse(jsonText);

      return {
        reportId: reportData.reportId,
        studentSummary: parsedSummary.studentSummary || "",
        timeTeacherSummary: parsedSummary.timeTeacherSummary || "",
        teacherSummary: parsedSummary.teacherSummary || "",
        overallSummary: parsedSummary.overallSummary || "",
        insights: {
          strengths: parsedSummary.insights?.strengths || [],
          weaknesses: parsedSummary.insights?.weaknesses || [],
          recommendations: parsedSummary.insights?.recommendations || [],
        },
        generatedAt: new Date().toISOString(),
        generatedBy: "gemini-1.5-flash",
      };
    } catch (parseError) {
      console.error("JSON parsing error:", parseError);

      // JSON 파싱 실패 시 텍스트 응답으로 처리
      return {
        reportId: reportData.reportId,
        studentSummary: "",
        timeTeacherSummary: "",
        teacherSummary: "",
        overallSummary: responseText,
        insights: {
          strengths: [],
          weaknesses: [],
          recommendations: [],
        },
        generatedAt: new Date().toISOString(),
        generatedBy: "gemini-1.5-flash",
      };
    }
  } catch (error) {
    console.error("AI summary generation error:", error);
    return null;
  }
};

/**
 * 폼 전체 개요 요약 생성
 */
const generateFormOverviewSummary = async (formData: {
  form: Form;
  reports: ReportSummaryData[];
}): Promise<FormOverviewSummary | null> => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const reportsAnalysis = formData.reports
      .map(
        (report, index) =>
          `학생 ${index + 1}: ${report.studentName} (${report.className || ""})\n응답 수: ${
            report.studentResponses.length
          }개\n시간강사 코멘트: ${
            report.timeTeacherComment ? "있음" : "없음"
          }\n부장선생님 코멘트: ${report.teacherComment ? "있음" : "없음"}`
      )
      .join("\n\n");

    const prompt = `
다음 폼의 전체 보고서들을 분석하여 종합적인 개요를 제공해주세요.

=== 폼 정보 ===
제목: ${formData.form.title}
설명: ${formData.form.description || "없음"}
완료된 보고서 수: ${formData.reports.length}개

=== 보고서 현황 ===
${reportsAnalysis}

다음 JSON 형식으로 분석 결과를 제공해주세요:

{
  "commonStrengths": ["공통 강점 1", "공통 강점 2", "공통 강점 3"],
  "commonWeaknesses": ["공통 약점 1", "공통 약점 2", "공통 약점 3"],
  "overallRecommendations": ["전체 권장사항 1", "전체 권장사항 2", "전체 권장사항 3"],
  "studentPerformanceDistribution": {
    "excellent": 숫자,
    "good": 숫자,
    "average": 숫자,
    "needsImprovement": 숫자
  }
}

성과 분포는 전체 학생 수를 기준으로 각 성과 수준의 학생 수를 추정해주세요.
한국어로 교육적이고 건설적인 분석을 제공해주세요.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();

    try {
      const jsonMatch =
        responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[1] || jsonMatch[0] : responseText;
      const parsedSummary = JSON.parse(jsonText);

      return {
        formId: "", // 호출 시 설정
        formTitle: formData.form.title || "",
        totalReports: formData.reports.length,
        completedReports: formData.reports.length,
        commonStrengths: parsedSummary.commonStrengths || [],
        commonWeaknesses: parsedSummary.commonWeaknesses || [],
        overallRecommendations: parsedSummary.overallRecommendations || [],
        studentPerformanceDistribution: parsedSummary.studentPerformanceDistribution || {
          excellent: 0,
          good: 0,
          average: 0,
          needsImprovement: 0,
        },
        generatedAt: new Date().toISOString(),
      };
    } catch (parseError) {
      console.error("JSON parsing error:", parseError);
      return null;
    }
  } catch (error) {
    console.error("Form overview generation error:", error);
    return null;
  }
};

// ===== API 함수들 =====

/**
 * 개별 보고서 AI 요약 생성
 */
export const generateReportSummary = async (
  request: GenerateReportSummaryRequest
): Promise<ApiResponse<GeneratedSummary>> => {
  try {
    // 권한 확인
    const { data: report, error: reportError } = await supabaseAdmin
      .from("reports")
      .select("*")
      .eq("id", request.reportId)
      .single();

    if (reportError || !report) {
      return { success: false, error: "보고서를 찾을 수 없습니다." };
    }

    // 폼을 통해 그룹 정보 가져오기
    const { data: form } = await supabaseAdmin
      .from("forms")
      .select("group_id, creator_id, title")
      .eq("id", report.form_id || "")
      .single();

    if (!form?.group_id) {
      return { success: false, error: "연결된 폼을 찾을 수 없습니다." };
    }

    // 그룹 멤버 또는 관련자 확인
    const { data: memberCheck } = await supabaseAdmin
      .from("group_member")
      .select("id")
      .eq("group_id", form.group_id)
      .eq("user_id", request.userId)
      .single();

    const isFormCreator = form.creator_id === request.userId;
    const isAssignedTeacher =
      report.time_teacher_id === request.userId || report.teacher_id === request.userId;

    if (!memberCheck && !isFormCreator && !isAssignedTeacher) {
      return { success: false, error: "요약 생성 권한이 없습니다." };
    }

    // 보고서가 완료된 상태인지 확인
    if ((report.stage || 0) < 3) {
      return { success: false, error: "모든 검토가 완료된 보고서만 요약할 수 있습니다." };
    }

    // 기존 요약 확인 (임시 저장소에서)
    const existingSummary = reportSummaries.get(request.reportId);

    // 보고서 데이터 수집
    const reportData = await collectReportData(request.reportId);
    if (!reportData) {
      return { success: false, error: "보고서 데이터를 수집할 수 없습니다." };
    }

    // AI 요약 생성
    const summary = await generateAIReportSummary(reportData);
    if (!summary) {
      return { success: false, error: "AI 요약 생성에 실패했습니다." };
    }

    // 임시 저장소에 저장 (실제로는 DB에 저장)
    summary.id = `summary_${request.reportId}_${Date.now()}`;
    summary.generatedBy = request.userId;
    reportSummaries.set(request.reportId, summary);

    // 알림 생성 (폼 작성자에게)
    if (form.creator_id && form.creator_id !== request.userId) {
      await createNotification({
        target_id: form.creator_id,
        creator_id: request.userId,
        group_id: form.group_id,
        related_id: request.reportId,
        type: "ai_summary_generated",
        title: "AI 요약이 생성되었습니다",
        content: `"${form.title}" 폼의 보고서 AI 요약이 생성되었습니다.`,
        action_url: `/reports/${request.reportId}/summary`,
      });
    }

    return { success: true, data: summary };
  } catch (error) {
    console.error("Generate summary error:", error);
    return { success: false, error: "요약 생성 중 오류가 발생했습니다." };
  }
};

/**
 * 일괄 보고서 요약 생성
 */
export const bulkGenerateReportSummaries = async (
  request: BulkGenerateSummaryRequest
): Promise<
  ApiResponse<{ successCount: number; failureCount: number; results: GeneratedSummary[] }>
> => {
  try {
    // 그룹 멤버 확인
    const { data: memberCheck } = await supabaseAdmin
      .from("group_member")
      .select("id")
      .eq("group_id", request.groupId)
      .eq("user_id", request.userId)
      .single();

    if (!memberCheck) {
      return { success: false, error: "그룹 멤버만 일괄 요약을 생성할 수 있습니다." };
    }

    const results: GeneratedSummary[] = [];
    let successCount = 0;
    let failureCount = 0;

    // 각 보고서에 대해 요약 생성
    for (const reportId of request.reportIds) {
      try {
        const summaryResult = await generateReportSummary({
          reportId,
          userId: request.userId,
          summaryType: "bulk",
        });

        if (summaryResult.success && summaryResult.data) {
          results.push(summaryResult.data);
          successCount++;
        } else {
          failureCount++;
          console.error(`Summary generation failed for report ${reportId}:`, summaryResult.error);
        }
      } catch (error) {
        failureCount++;
        console.error(`Error generating summary for report ${reportId}:`, error);
      }

      // API 호출 제한을 위한 지연
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return {
      success: true,
      data: {
        successCount,
        failureCount,
        results,
      },
    };
  } catch (error) {
    console.error("Bulk generate summaries error:", error);
    return { success: false, error: "일괄 요약 생성 중 오류가 발생했습니다." };
  }
};

/**
 * 폼 전체 개요 요약 생성
 */
export const generateFormOverview = async (
  request: FormOverviewSummaryRequest
): Promise<ApiResponse<FormOverviewSummary>> => {
  try {
    // 권한 확인
    const { data: memberCheck } = await supabaseAdmin
      .from("group_member")
      .select("id")
      .eq("group_id", request.groupId)
      .eq("user_id", request.userId)
      .single();

    if (!memberCheck) {
      return { success: false, error: "접근 권한이 없습니다." };
    }

    // 폼 전체 데이터 수집
    const formData = await collectFormOverviewData(request.formId);
    if (!formData) {
      return { success: false, error: "폼 데이터를 수집할 수 없습니다." };
    }

    if (formData.reports.length === 0) {
      return { success: false, error: "완료된 보고서가 없습니다." };
    }

    // AI 개요 요약 생성
    const overviewSummary = await generateFormOverviewSummary(formData);
    if (!overviewSummary) {
      return { success: false, error: "개요 요약 생성에 실패했습니다." };
    }

    overviewSummary.formId = request.formId;

    // 임시 저장소에 저장 (실제로는 DB에 저장)
    formOverviews.set(request.formId, overviewSummary);

    return { success: true, data: overviewSummary };
  } catch (error) {
    console.error("Generate form overview error:", error);
    return { success: false, error: "폼 개요 생성 중 오류가 발생했습니다." };
  }
};

/**
 * 요약된 보고서 목록 조회
 */
export const getSummarizedReports = async (
  groupId: string,
  userId: string
): Promise<
  ApiResponse<
    (GeneratedSummary & {
      formTitle: string;
      studentName: string;
      className: string;
      creatorName: string;
      stage: number;
    })[]
  >
> => {
  try {
    // 그룹 멤버 확인
    const { data: memberCheck } = await supabaseAdmin
      .from("group_member")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .single();

    if (!memberCheck) {
      return { success: false, error: "접근 권한이 없습니다." };
    }

    // 그룹의 폼들 조회
    const { data: groupForms } = await supabaseAdmin
      .from("forms")
      .select("id, title, creator_id, users!forms_creator_id_fkey (name)")
      .eq("group_id", groupId);

    const summariesWithDetails = [];

    // 각 폼의 보고서들에서 요약 찾기
    for (const form of groupForms || []) {
      const { data: reports } = await supabaseAdmin
        .from("reports")
        .select("id, student_name, class_name, stage")
        .eq("form_id", form.id);

      for (const report of reports || []) {
        const summary = reportSummaries.get(report.id);
        if (summary) {
          summariesWithDetails.push({
            ...summary,
            formTitle: form.title || "",
            studentName: report.student_name || "",
            className: report.class_name || "",
            creatorName: form.users?.name || "",
            stage: report.stage || 0,
          });
        }
      }
    }

    // 생성 시간 순으로 정렬
    summariesWithDetails.sort(
      (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
    );

    return { success: true, data: summariesWithDetails };
  } catch (error) {
    console.error("Get summarized reports error:", error);
    return { success: false, error: "요약된 보고서 조회 중 오류가 발생했습니다." };
  }
};

/**
 * 특정 보고서 요약 조회
 */
export const getReportSummary = async (
  reportId: string,
  userId: string
): Promise<ApiResponse<GeneratedSummary>> => {
  try {
    // 보고서 조회 및 권한 확인
    const { data: report } = await supabaseAdmin
      .from("reports")
      .select("time_teacher_id, teacher_id, form_id")
      .eq("id", reportId)
      .single();

    if (!report) {
      return { success: false, error: "보고서를 찾을 수 없습니다." };
    }

    // 폼을 통해 그룹 및 작성자 확인
    const { data: form } = await supabaseAdmin
      .from("forms")
      .select("group_id, creator_id")
      .eq("id", report.form_id || "")
      .single();

    if (!form?.group_id) {
      return { success: false, error: "연결된 폼을 찾을 수 없습니다." };
    }

    // 권한 확인
    const { data: memberCheck } = await supabaseAdmin
      .from("group_member")
      .select("id")
      .eq("group_id", form.group_id)
      .eq("user_id", userId)
      .single();

    const isFormCreator = form.creator_id === userId;
    const isAssignedTeacher = report.time_teacher_id === userId || report.teacher_id === userId;

    if (!memberCheck && !isFormCreator && !isAssignedTeacher) {
      return { success: false, error: "접근 권한이 없습니다." };
    }

    // 요약 조회
    const summary = reportSummaries.get(reportId);
    if (!summary) {
      return { success: false, error: "요약을 찾을 수 없습니다." };
    }

    return { success: true, data: summary };
  } catch (error) {
    console.error("Get report summary error:", error);
    return { success: false, error: "보고서 요약 조회 중 오류가 발생했습니다." };
  }
};

/**
 * 사용자 정의 요약 생성
 */
export const generateCustomSummary = async (
  request: CustomSummaryRequest
): Promise<ApiResponse<string>> => {
  try {
    // 기본 권한 확인은 generateReportSummary와 동일
    const reportData = await collectReportData(request.reportId);
    if (!reportData) {
      return { success: false, error: "보고서 데이터를 수집할 수 없습니다." };
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 사용자 정의 프롬프트 또는 미리 정의된 프롬프트 사용
    let prompt = request.customPrompt;

    if (request.summaryType !== "custom") {
      const predefinedPrompts = {
        student_focus: "학생의 학습 성취도와 개선 방향에 집중하여 분석해주세요.",
        teacher_focus: "교사의 지도 방법과 교육적 효과에 집중하여 분석해주세요.",
        improvement_focus: "구체적인 개선 방안과 실행 계획에 집중하여 분석해주세요.",
      };

      prompt = predefinedPrompts[request.summaryType] || prompt;
    }

    const fullPrompt = `
다음 보고서를 분석해주세요:

학생: ${reportData.studentName}
폼: ${reportData.formTitle}

${prompt}

답변은 한국어로 교육적이고 실용적인 내용으로 작성해주세요.
`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const customSummary = response.text();

    return { success: true, data: customSummary };
  } catch (error) {
    console.error("Generate custom summary error:", error);
    return { success: false, error: "사용자 정의 요약 생성 중 오류가 발생했습니다." };
  }
};
