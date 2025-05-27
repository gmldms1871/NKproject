import { GoogleGenerativeAI } from "@google/generative-ai"

// 환경 변수에서 API 키 가져오기
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || ""

// API 키가 없으면 경고 로그 출력
if (!API_KEY) {
  console.warn("Gemini API 키가 설정되지 않았습니다. 환경 변수 NEXT_PUBLIC_GEMINI_API_KEY를 확인하세요.")
}

// Fallback summarize function for when API is not available
const fallbackSummarize = (content: string): string | null => {
  if (!content || content.trim().length === 0) {
    return null
  }

  const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0)

  // 첫 문장과 마지막 문장을 조합하여 간단한 요약 생성
  let summary = ""

  if (sentences.length > 0) {
    summary += sentences[0].trim()

    if (sentences.length > 2) {
      summary += ". " + sentences[Math.floor(sentences.length / 2)].trim()
    }

    if (sentences.length > 1) {
      summary += ". " + sentences[sentences.length - 1].trim()
    }
  } else {
    summary = content.substring(0, 100) + (content.length > 100 ? "..." : "")
  }

  return summary || null
}

export const summarizeWithGemini = async (content: string): Promise<string | null> => {
  try {
    // API 키가 없거나 내용이 너무 짧으면 기본 요약 로직 사용
    if (!API_KEY || content.length < 100) {
      console.log("Using fallback summarization due to missing API key or short content")
      return fallbackSummarize(content)
    }

    // Create a new instance of the GoogleGenerativeAI
    const genAI = new GoogleGenerativeAI(API_KEY)

    // Gemini 모델 설정 (Gemini 1.5 Flash 사용)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    // 프롬프트 구성
    const prompt = `다음 텍스트를 3-4문장으로 간결하게 요약해주세요. 핵심 내용만 포함하고 불필요한 세부 사항은 제외하세요:

${content}`

    // Gemini API 호출
    const result = await model.generateContent(prompt)
    const response = await result.response
    const summary = response.text()

    // 요약이 없거나 오류가 있는 경우 기본 요약 로직 사용
    if (!summary || summary.trim().length === 0) {
      return fallbackSummarize(content)
    }

    return summary
  } catch (error) {
    console.error("Error summarizing with Gemini API:", error)
    // API 오류 시 fallback 사용
    return fallbackSummarize(content)
  }
}
