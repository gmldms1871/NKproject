// lib/gemini.ts
// Gemini AI 연동 관련 함수들 - 보고서 생성, 텍스트 분석, 요약 등

import type { APIResponse, FormInstanceWithDetails, ReportWithDetails } from "./types";

/**
 * Gemini API 설정
 */
const GEMINI_CONFIG = {
  BASE_URL: "https://generativelanguage.googleapis.com/v1beta",
  MODEL: "gemini-pro",
  MAX_TOKENS: 4096,
  TEMPERATURE: 0.7,
  TOP_P: 0.9,
  TOP_K: 40,
} as const;

/**
 * Gemini 요청 옵션
 */
export interface GeminiRequestOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  systemInstruction?: string;
}

/**
 * Gemini 응답 인터페이스
 */
export interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    finishReason?: string;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  promptFeedback?: {
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  };
}

/**
 * 보고서 생성 옵션
 */
export interface ReportGenerationOptions {
  includeFormResponses?: boolean;
  includeStatistics?: boolean;
  reportType?: "summary" | "detailed" | "analysis";
  focusAreas?: string[];
  language?: "korean" | "english";
}

/**
 * Gemini API 호출
 * @param apiKey Gemini API 키
 * @param prompt 프롬프트
 * @param options 요청 옵션
 * @returns AI 응답
 */
export async function callGeminiAPI(
  apiKey: string,
  prompt: string,
  options: GeminiRequestOptions = {}
): Promise<APIResponse<string>> {
  try {
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: options.temperature || GEMINI_CONFIG.TEMPERATURE,
        maxOutputTokens: options.maxTokens || GEMINI_CONFIG.MAX_TOKENS,
        topP: options.topP || GEMINI_CONFIG.TOP_P,
        topK: options.topK || GEMINI_CONFIG.TOP_K,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_ONLY_HIGH",
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_ONLY_HIGH",
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_ONLY_HIGH",
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_ONLY_HIGH",
        },
      ],
    };

    const response = await fetch(
      `${GEMINI_CONFIG.BASE_URL}/models/${GEMINI_CONFIG.MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: `Gemini API 오류: ${response.status} ${response.statusText} - ${
          errorData.error?.message || "알 수 없는 오류"
        }`,
      };
    }

    const data: GeminiResponse = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      return {
        success: false,
        error: "AI 응답을 생성할 수 없습니다.",
      };
    }

    const candidate = data.candidates[0];
    if (!candidate.content?.parts || candidate.content.parts.length === 0) {
      return {
        success: false,
        error: "AI 응답 내용이 비어있습니다.",
      };
    }

    const generatedText = candidate.content.parts[0].text;
    if (!generatedText) {
      return {
        success: false,
        error: "AI 응답 텍스트가 없습니다.",
      };
    }

    return {
      success: true,
      data: generatedText,
    };
  } catch (error) {
    return {
      success: false,
      error: `Gemini API 호출 중 오류: ${
        error instanceof Error ? error.message : "알 수 없는 오류"
      }`,
    };
  }
}

/**
 * 학생 평가 보고서 생성
 * @param apiKey Gemini API 키
 * @param formInstance 폼 인스턴스 데이터
 * @param existingReport 기존 보고서 (있다면)
 * @param options 생성 옵션
 * @returns 생성된 보고서
 */
export async function generateStudentReport(
  apiKey: string,
  formInstance: FormInstanceWithDetails,
  existingReport?: ReportWithDetails,
  options: ReportGenerationOptions = {}
): Promise<APIResponse<string>> {
  try {
    const prompt = buildStudentReportPrompt(formInstance, existingReport, options);

    const result = await callGeminiAPI(apiKey, prompt, {
      temperature: 0.6, // 보고서는 더 일관성 있게
      maxTokens: 3000,
    });

    if (!result.success) {
      return result;
    }

    // 생성된 보고서 후처리
    const processedReport = postProcessReport(result.data!);

    return {
      success: true,
      data: processedReport,
    };
  } catch (error) {
    return {
      success: false,
      error: `보고서 생성 중 오류: ${error instanceof Error ? error.message : "알 수 없는 오류"}`,
    };
  }
}

/**
 * 폼 응답 분석
 * @param apiKey Gemini API 키
 * @param formResponses 폼 응답 데이터
 * @param analysisType 분석 유형
 * @returns 분석 결과
 */
export async function analyzeFormResponses(
  apiKey: string,
  formResponses: any[],
  analysisType: "summary" | "insights" | "recommendations" = "summary"
): Promise<APIResponse<string>> {
  try {
    const prompt = buildFormAnalysisPrompt(formResponses, analysisType);

    return await callGeminiAPI(apiKey, prompt, {
      temperature: 0.5,
      maxTokens: 2000,
    });
  } catch (error) {
    return {
      success: false,
      error: `폼 응답 분석 중 오류: ${error instanceof Error ? error.message : "알 수 없는 오류"}`,
    };
  }
}

/**
 * 텍스트 요약
 * @param apiKey Gemini API 키
 * @param text 요약할 텍스트
 * @param maxLength 최대 길이
 * @returns 요약된 텍스트
 */
export async function summarizeText(
  apiKey: string,
  text: string,
  maxLength: number = 500
): Promise<APIResponse<string>> {
  try {
    const prompt = `다음 텍스트를 ${maxLength}자 내외로 요약해 주세요. 핵심 내용을 놓치지 않고 간결하게 정리해 주세요.

텍스트:
${text}

요약:`;

    return await callGeminiAPI(apiKey, prompt, {
      temperature: 0.3,
      maxTokens: Math.min(maxLength * 2, 1000),
    });
  } catch (error) {
    return {
      success: false,
      error: `텍스트 요약 중 오류: ${error instanceof Error ? error.message : "알 수 없는 오류"}`,
    };
  }
}

/**
 * 학습 추천 생성
 * @param apiKey Gemini API 키
 * @param studentData 학생 데이터
 * @param performanceData 성과 데이터
 * @returns 학습 추천사항
 */
export async function generateLearningRecommendations(
  apiKey: string,
  studentData: any,
  performanceData: any
): Promise<APIResponse<string>> {
  try {
    const prompt = `다음 학생의 데이터를 바탕으로 개인화된 학습 추천사항을 제공해 주세요.

학생 정보:
- 이름: ${studentData.name || "학생"}
- 반: ${studentData.class_name || "미배정"}

성과 데이터:
${JSON.stringify(performanceData, null, 2)}

다음 형식으로 추천사항을 작성해 주세요:
1. 강점 분야
2. 개선 필요 분야
3. 구체적인 학습 방법 제안
4. 추천 학습 자료 또는 활동

추천사항:`;

    return await callGeminiAPI(apiKey, prompt, {
      temperature: 0.7,
      maxTokens: 2000,
    });
  } catch (error) {
    return {
      success: false,
      error: `학습 추천 생성 중 오류: ${
        error instanceof Error ? error.message : "알 수 없는 오류"
      }`,
    };
  }
}

/**
 * 피드백 개선 제안
 * @param apiKey Gemini API 키
 * @param originalFeedback 원본 피드백
 * @param improvementAreas 개선 영역
 * @returns 개선된 피드백
 */
export async function improveFeedback(
  apiKey: string,
  originalFeedback: string,
  improvementAreas: string[] = []
): Promise<APIResponse<string>> {
  try {
    const areasText =
      improvementAreas.length > 0
        ? `특히 다음 영역에 초점을 맞춰 주세요: ${improvementAreas.join(", ")}`
        : "";

    const prompt = `다음 피드백을 더 구체적이고 건설적으로 개선해 주세요. ${areasText}

원본 피드백:
${originalFeedback}

개선된 피드백:`;

    return await callGeminiAPI(apiKey, prompt, {
      temperature: 0.6,
      maxTokens: 1500,
    });
  } catch (error) {
    return {
      success: false,
      error: `피드백 개선 중 오류: ${error instanceof Error ? error.message : "알 수 없는 오류"}`,
    };
  }
}

/**
 * 질문 자동 생성
 * @param apiKey Gemini API 키
 * @param topic 주제
 * @param difficulty 난이도
 * @param questionCount 생성할 질문 수
 * @returns 생성된 질문들
 */
export async function generateQuestions(
  apiKey: string,
  topic: string,
  difficulty: "basic" | "intermediate" | "advanced",
  questionCount: number = 5
): Promise<APIResponse<string[]>> {
  try {
    const difficultyMap = {
      basic: "기초",
      intermediate: "중급",
      advanced: "고급",
    };

    const prompt = `"${topic}" 주제에 대해 ${difficultyMap[difficulty]} 수준의 질문을 ${questionCount}개 생성해 주세요.

요구사항:
- 각 질문은 명확하고 구체적이어야 합니다
- 학습 목표 달성에 도움이 되는 질문이어야 합니다
- 다양한 유형의 질문을 포함해 주세요 (이해, 적용, 분석 등)

질문들:`;

    const result = await callGeminiAPI(apiKey, prompt, {
      temperature: 0.8,
      maxTokens: 1500,
    });

    if (!result.success) {
      return result;
    }

    // 생성된 텍스트에서 질문들 추출
    const questions = result
      .data!.split("\n")
      .filter((line) => line.trim().length > 0)
      .filter((line) => /^\d+\./.test(line.trim()))
      .map((line) => line.replace(/^\d+\.\s*/, "").trim());

    return {
      success: true,
      data: questions,
    };
  } catch (error) {
    return {
      success: false,
      error: `질문 생성 중 오류: ${error instanceof Error ? error.message : "알 수 없는 오류"}`,
    };
  }
}

/**
 * 학생 보고서 프롬프트 생성
 */
function buildStudentReportPrompt(
  formInstance: FormInstanceWithDetails,
  existingReport?: ReportWithDetails,
  options: ReportGenerationOptions = {}
): string {
  const student = formInstance.student;
  const formTemplate = formInstance.form_template;
  const responses = formInstance.form_responses;

  let prompt = `다음 학생의 평가 결과를 바탕으로 상세한 보고서를 작성해 주세요.

학생 정보:
- 이름: ${student.name}
- 이메일: ${student.email}

평가 폼: ${formTemplate.title}
${formTemplate.description ? `설명: ${formTemplate.description}` : ""}

학생 응답:`;

  // 폼 응답 추가
  if (options.includeFormResponses !== false && responses.length > 0) {
    responses.forEach((response, index) => {
      const field = formTemplate.form_fields.find((f) => f.id === response.field_id);
      if (field) {
        prompt += `\n${index + 1}. ${field.field_name}: ${response.value}`;
      }
    });
  }

  // 기존 보고서가 있다면 추가
  if (existingReport) {
    prompt += `\n\n기존 평가 내용:\n${existingReport.content}`;
  }

  // 보고서 타입에 따른 요구사항
  const reportTypeInstructions = {
    summary: "간결하고 핵심적인 요약 보고서를 작성해 주세요.",
    detailed: "상세하고 구체적인 분석 보고서를 작성해 주세요.",
    analysis: "심층적인 분석과 개선 방안을 포함한 보고서를 작성해 주세요.",
  };

  prompt += `\n\n${reportTypeInstructions[options.reportType || "detailed"]}

다음 형식으로 보고서를 작성해 주세요:

## 학생 평가 보고서

### 1. 전반적인 평가
[학생의 전반적인 수행 능력과 태도에 대한 평가]

### 2. 강점 분석
[학생이 잘한 부분들과 장점]

### 3. 개선 영역
[보완이 필요한 부분들]

### 4. 구체적인 피드백
[각 문항별 상세한 피드백]

### 5. 학습 제안사항
[향후 학습 방향과 구체적인 개선 방법]

보고서:`;

  return prompt;
}

/**
 * 폼 분석 프롬프트 생성
 */
function buildFormAnalysisPrompt(
  formResponses: any[],
  analysisType: "summary" | "insights" | "recommendations"
): string {
  const analysisInstructions = {
    summary: "전체 응답 데이터의 주요 특징과 패턴을 요약해 주세요.",
    insights: "응답 데이터에서 발견할 수 있는 통찰과 의미있는 발견사항을 분석해 주세요.",
    recommendations: "분석 결과를 바탕으로 구체적인 개선 방안과 추천사항을 제시해 주세요.",
  };

  let prompt = `다음 폼 응답 데이터를 분석해 주세요.

응답 데이터:
${JSON.stringify(formResponses, null, 2)}

${analysisInstructions[analysisType]}

분석 결과:`;

  return prompt;
}

/**
 * 보고서 후처리
 */
function postProcessReport(report: string): string {
  // 불필요한 공백 제거
  let processed = report.trim();

  // 연속된 공백 줄 정리
  processed = processed.replace(/\n\s*\n\s*\n/g, "\n\n");

  // 마크다운 헤더 정리
  processed = processed.replace(/^#+\s*/gm, "### ");

  // 특수 문자 정리
  processed = processed.replace(/[""]/g, '"');
  processed = processed.replace(/['']/g, "'");

  return processed;
}

/**
 * API 키 유효성 검증
 * @param apiKey Gemini API 키
 * @returns 유효성 검사 결과
 */
export async function validateGeminiApiKey(apiKey: string): Promise<APIResponse<boolean>> {
  try {
    const testPrompt = "Hello";
    const result = await callGeminiAPI(apiKey, testPrompt, { maxTokens: 10 });

    return {
      success: result.success,
      data: result.success,
      error: result.success ? undefined : "API 키가 유효하지 않습니다.",
    };
  } catch (error) {
    return {
      success: false,
      data: false,
      error: "API 키 검증 중 오류가 발생했습니다.",
    };
  }
}

/**
 * 텍스트 안전성 검사
 * @param text 검사할 텍스트
 * @returns 안전성 검사 결과
 */
export function checkTextSafety(text: string): { safe: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // 개인정보 패턴 검사
  const personalInfoPatterns = [
    /\d{6}-[1-4]\d{6}/, // 주민등록번호
    /\d{3}-\d{2}-\d{5}/, // 사업자등록번호
    /01[0-9]-\d{4}-\d{4}/, // 전화번호
  ];

  personalInfoPatterns.forEach((pattern) => {
    if (pattern.test(text)) {
      warnings.push("개인정보가 포함되어 있을 수 있습니다.");
    }
  });

  // 부적절한 내용 검사
  const inappropriateKeywords = ["욕설", "비하", "차별", "혐오"];

  inappropriateKeywords.forEach((keyword) => {
    if (text.includes(keyword)) {
      warnings.push("부적절한 내용이 포함되어 있을 수 있습니다.");
    }
  });

  return {
    safe: warnings.length === 0,
    warnings,
  };
}

/**
 * 토큰 수 추정
 * @param text 텍스트
 * @returns 추정 토큰 수
 */
export function estimateTokenCount(text: string): number {
  // 한국어는 보통 글자당 1.5~2토큰 정도
  // 영어는 단어당 1~1.3토큰 정도
  const koreanChars = (text.match(/[가-힣]/g) || []).length;
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
  const numbers = (text.match(/\d+/g) || []).length;
  const symbols = text.length - koreanChars - text.match(/[a-zA-Z\d\s]/g)?.length || 0;

  return Math.ceil(koreanChars * 1.8 + englishWords * 1.2 + numbers * 0.5 + symbols * 0.5);
}
