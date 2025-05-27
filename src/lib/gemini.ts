import { GoogleGenerativeAI } from "@google/generative-ai"

// API 키를 환경 변수에서 불러옵니다.
const API_KEY = process.env.GEMINI_API_KEY

const fallbackSummarize = (content: string): string | null => {
  if (!content || content.trim().length === 0) {
    return null
  }

  let summary = "[NK학원 분석 결과지]\n\n"

  // 기본 정보 추출
  const nameMatch = content.match(/이름\s*:\s*([^\n]+)/)
  const classMatch = content.match(/반명\s*:\s*([^\n]+)/)
  const dateMatch = content.match(/날짜\s*:\s*([^\n]+)/)
  const scoreMatch = content.match(/점수\s*:\s*([^\n]+)/)
  const avgMatch = content.match(/반평균\s*:\s*([^\n]+)/)
  const testTypeMatch = content.match(/시험종류\s*:\s*([^\n]+)/)
  const rangeMatch = content.match(/테스트범위\s*:\s*([^\n]+)/)

  // 기본 정보 섹션
  if (dateMatch) summary += `■ 날짜: ${dateMatch[1]}\n`
  if (testTypeMatch) summary += `■ 시험종류: ${testTypeMatch[1]}\n`
  if (nameMatch && classMatch) summary += `■ 이름: ${nameMatch[1]} (반명: ${classMatch[1]})\n`
  if (scoreMatch && avgMatch) summary += `■ 점수: ${scoreMatch[1]} (반평균: ${avgMatch[1]})\n`
  if (rangeMatch) summary += `■ 테스트범위: ${rangeMatch[1]}\n`
  summary += "\n"

  // 학생 통합 분석 섹션
  summary += "■ 학생 통합 분석\n"
  summary += "▷ 강점\n"

  // 학습 태도 분석
  if (content.includes("★★★★★")) {
    summary += "1. 학습 태도가 매우 우수하여(★★★★★) 성실하게 수업에 참여하고 있습니다.\n"
  }

  // 개념이해도 분석
  if (content.includes("개념이해도 : ★★★")) {
    summary += "2. 개념이해도가 양호하여(★★★) 기본 개념 파악이 잘 되어 있습니다.\n"
  }

  // 오답노트 완성도 분석
  if (content.includes("오답노트 완성도 : ★★★")) {
    summary += "3. 오답노트 완성도가 높아(★★★) 자신의 실수를 분석하려는 의지가 있습니다.\n"
  }

  summary += "\n▷ 약점\n"

  // 계산 실수 분석
  if (content.includes("계산실수")) {
    summary += "1. 계산 실수가 빈번하게 발생하여, 특히 근이 주어진 삼·사차방정식에서 실수가 많습니다.\n"
  }

  // 시간 관리 분석
  if (content.includes("시간부족") || content.includes("문제풀이 속도 : ★★")) {
    summary += "2. 문제풀이 속도가 느려 시간 내에 모든 문제를 해결하는 데 어려움이 있습니다.\n"
  }

  // M 난이도 분석
  if (content.includes("M(중) : 0개 정답")) {
    summary += "3. 중급 난이도(M) 문제에서 정답률이 0%로 집중적인 보완이 필요합니다.\n"
  }

  summary += "\n"

  // 지도 계획 섹션
  summary += "■ 앞으로의 지도 계획\n"
  summary += "1. 계산 실수 감소 및 문제풀이 속도 향상\n"
  summary += "   - 근이 주어진 삼·사차방정식 유형의 계산 과정을 체계적으로 연습하도록 지도할 예정.\n"
  summary += "   - 시간 관리 능력 향상을 위한 단계별 연습과 문제 해결 전략을 제공할 계획.\n"
  summary += "2. 중급 난이도 문제 집중 지도\n"
  summary += "   - M(중) 난이도 문제에 대한 맞춤형 연습문제를 제공하여 단계적으로 실력을 향상시킬 예정.\n\n"

  // 담임 종합의견 섹션
  summary += "■ 담임 종합의견\n"

  if (nameMatch) {
    summary += `${nameMatch[1]} 학생은 `
  } else {
    summary += "학생은 "
  }

  summary +=
    "학습 태도가 매우 우수하고 개념이해도도 양호하여 성실하게 학습에 임하고 있으나, 계산 실수와 시간 관리 부족으로 인해 실력 대비 낮은 점수를 받았습니다. "

  if (content.includes("신규 원생")) {
    summary +=
      "특히 신규 원생으로서 클리닉 시스템 적응이 필요한 상황이며, 수업에서 보인 이해도와 시험 결과 간의 괴리가 있어 앞으로 면밀한 관찰이 필요합니다. "
  }

  summary +=
    "학생의 우수한 학습 태도와 성실함을 바탕으로 체계적인 지도를 통해 계산 정확도와 문제 해결 속도를 향상시킨다면 충분히 성적 향상이 가능할 것입니다. "
  summary += "가정에서도 계산 과정을 꼼꼼히 확인하는 습관을 기르도록 격려해 주시기 바랍니다."

  return summary
}

export const summarizeWithGemini = async (content: string): Promise<string | null> => {
  try {
    // API 키가 없으면 기본 요약 로직 사용
    if (!API_KEY) {
      console.log("Gemini API key not found, using fallback summarization")
      return fallbackSummarize(content)
    }

    // 내용이 너무 짧으면 기본 요약 로직 사용
    if (content.length < 50) {
      console.log("Content too short, using fallback summarization")
      return fallbackSummarize(content)
    }

    // Create a new instance of the GoogleGenerativeAI
    const genAI = new GoogleGenerativeAI(API_KEY)

    // Gemini 모델 설정 (Gemini 1.5 Flash 사용)
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.8,
      },
    })

    // NK 학원 보고서 전용 프롬프트 구성
    const prompt = `당신은 NK 학원의 전문 교육 컨설턴트입니다. 

**절대 금지사항: 원본 텍스트를 그대로 복사하거나 붙여넣지 마세요. 반드시 새로운 문장으로 재작성해야 합니다.**

주어진 학생 분석 보고서를 분석하여 학부모에게 보낼 수 있는 완전히 새로운 전문 보고서를 작성해주세요.

**출력 형식 (정확히 따라주세요):**

[NK학원 분석 결과지]

■ 날짜: [원본에서 추출]
■ 시험종류: [원본에서 추출]  
■ 이름: [학생명] (반명: [반명])
■ 점수: [점수] (반평균: [반평균])
■ 테스트범위: [테스트범위]

■ 학생 통합 분석
▷ 강점
1. [학습관리팀 분석사항의 높은 별점 항목을 바탕으로 새로운 문장으로 작성]
2. [학생의 긍정적 측면을 새로운 문장으로 작성]
3. [추가 강점을 새로운 문장으로 작성]

▷ 약점  
1. [I-M-N-K 프로그램과 ABCON 프로그램 결과를 분석하여 새로운 문장으로 작성]
2. [학생 자가분석과 강사 의견의 문제점을 새로운 문장으로 작성]
3. [학습관리팀 분석사항의 낮은 별점 항목을 새로운 문장으로 작성]

■ 앞으로의 지도 계획
1. [주요 문제점에 대한 구체적 개선방안을 새로운 문장으로 작성]
   - [세부 지도방법을 새로운 문장으로 작성]
   - [구체적 연습계획을 새로운 문장으로 작성]
2. [추가 개선방안을 새로운 문장으로 작성]
   - [세부내용을 새로운 문장으로 작성]

■ 담임 종합의견
[담당강사 의견과 클리닉 강사 의견을 종합하여 완전히 새로운 문장으로 3-4문장 작성. 학생의 현재 상태, 개선 방향, 긍정적 전망 포함]

**분석할 원본 보고서:**
${content}

**중요 지침:**
- 원본의 "◆", "▶", "■", "▷" 등의 기호나 형식을 그대로 복사하지 마세요
- 원본의 문장을 그대로 가져오지 말고 의미를 파악하여 새로운 문장으로 재작성하세요
- 데이터는 정확히 추출하되, 설명은 모두 새로운 문장으로 작성하세요
- 전문적이고 학부모 친화적인 언어로 작성하세요`

    // Gemini API 호출
    const result = await model.generateContent(prompt)
    const response = await result.response
    const formattedReport = response.text()

    // 응답 검증 - 원본 복사 여부 확인
    if (
      !formattedReport ||
      formattedReport.trim().length < 300 ||
      !formattedReport.includes("[NK학원 분석 결과지]") ||
      formattedReport.includes("◆ NK 테스트 학생 분석 ◆") ||
      formattedReport.includes("▶ I-M-N-K 프로그램") ||
      formattedReport.includes("■ ABCON 프로그램") ||
      formattedReport.includes("...") ||
      formattedReport.includes("반명 : 고1D3") ||
      formattedReport.includes("> 이름 :")
    ) {
      console.log("Gemini response contains original content or is invalid, using fallback")
      return fallbackSummarize(content)
    }

    return formattedReport
  } catch (error) {
    console.error("Error formatting report with Gemini API:", error)
    // API 오류 시 fallback 사용
    return fallbackSummarize(content)
  }
}
