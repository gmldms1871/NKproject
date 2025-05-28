import { supabase } from "./supabase";
import { summarizeWithGemini } from "./gemini";
import type {
  StudentReport,
  StudentReportInsert,
  StudentReportUpdate,
  FormattedStudentReport,
  FormInstance,
  Student,
} from "../../types";

// 학생 보고서 생성
export async function createStudentReport(
  report: StudentReportInsert
): Promise<{ success: boolean; report?: StudentReport; error?: string }> {
  try {
    const { data, error } = await supabase.from("student_reports").insert(report).select().single();

    if (error) {
      console.error("Error creating student report:", error);
      return { success: false, error: error.message };
    }

    return { success: true, report: data };
  } catch (error) {
    console.error("Error creating student report:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
}

// 학생 보고서 조회
export async function getStudentReportById(
  reportId: string
): Promise<{ success: boolean; report?: FormattedStudentReport; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("student_reports")
      .select(
        `
        *,
        form_instance:form_instance_id(*),
        student:student_id(*)
      `
      )
      .eq("id", reportId)
      .single();

    if (error) {
      console.error("Error fetching student report:", error);
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: "학생 보고서를 찾을 수 없습니다." };
    }

    const formattedReport: FormattedStudentReport = {
      id: data.id,
      form_instance_id: data.form_instance_id,
      student_id: data.student_id,
      group_id: data.group_id,
      raw_report: data.raw_report,
      ai_report: data.ai_report,
      final_report: data.final_report,
      status: data.status,
      reviewed_by: data.reviewed_by,
      created_at: data.created_at,
      updated_at: data.updated_at,
      form_instance: data.form_instance as FormInstance,
      student: data.student as Student,
    };

    return { success: true, report: formattedReport };
  } catch (error) {
    console.error("Error fetching student report:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
}

// 그룹별 학생 보고서 목록 조회
export async function getStudentReportsByGroupId(
  groupId: string
): Promise<FormattedStudentReport[]> {
  try {
    const { data, error } = await supabase
      .from("student_reports")
      .select(
        `
        *,
        form_instance:form_instance_id(*),
        student:student_id(*)
      `
      )
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching student reports:", error);
      return [];
    }

    const formattedReports: FormattedStudentReport[] = (data || []).map((report) => ({
      id: report.id,
      form_instance_id: report.form_instance_id,
      student_id: report.student_id,
      group_id: report.group_id,
      raw_report: report.raw_report,
      ai_report: report.ai_report,
      final_report: report.final_report,
      status: report.status,
      reviewed_by: report.reviewed_by,
      created_at: report.created_at,
      updated_at: report.updated_at,
      form_instance: report.form_instance as FormInstance,
      student: report.student as Student,
    }));

    return formattedReports;
  } catch (error) {
    console.error("Error fetching student reports:", error);
    return [];
  }
}

// 학생 보고서 업데이트
export async function updateStudentReport(
  reportId: string,
  updates: StudentReportUpdate
): Promise<{ success: boolean; report?: StudentReport; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("student_reports")
      .update(updates)
      .eq("id", reportId)
      .select()
      .single();

    if (error) {
      console.error("Error updating student report:", error);
      return { success: false, error: error.message };
    }

    return { success: true, report: data };
  } catch (error) {
    console.error("Error updating student report:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
}

// 원본 보고서 생성
export async function generateRawReport(
  formInstanceId: string
): Promise<{ success: boolean; rawReport?: string; error?: string }> {
  try {
    // 폼 인스턴스 정보 가져오기
    const { data: instance, error: instanceError } = await supabase
      .from("form_instances")
      .select(
        `
        *,
        form_template:form_template_id(*),
        student:student_id(*),
        form_responses(
          *,
          form_field:form_field_id(*)
        )
      `
      )
      .eq("id", formInstanceId)
      .single();

    if (instanceError || !instance) {
      return { success: false, error: "폼 인스턴스를 찾을 수 없습니다." };
    }

    // 문제 개념 정보 가져오기
    const { data: concepts, error: conceptsError } = await supabase
      .from("question_concepts")
      .select("*")
      .eq("form_template_id", (instance.form_template as any)?.id || "")
      .order("question_number");

    if (conceptsError) {
      console.error("Error fetching question concepts:", conceptsError);
      return { success: false, error: conceptsError.message };
    }

    // 응답 데이터 정리 (null 체크 추가)
    const responses: Record<string, string> = {};
    ((instance.form_responses as any[]) || []).forEach((response: any) => {
      const fieldName = response.form_field?.field_name;
      if (fieldName && response.value) {
        responses[fieldName] = response.value;
      }
    });

    // ABCON 프로그램 섹션 생성
    const wrongNumbers = responses["틀린 문제 번호"]
      ? responses["틀린 문제 번호"].split(",").map((n) => n.trim())
      : [];
    const wrongReasons = responses["틀린 이유"]
      ? responses["틀린 이유"].split(",").map((r) => r.trim())
      : [];

    let abconSection = "";
    for (let i = 0; i < wrongNumbers.length; i++) {
      const number = wrongNumbers[i];
      const reason = wrongReasons[i] || "";
      const concept =
        (concepts || []).find((c) => c.question_number.toString() === number)?.concept ||
        "개념 정보 없음";

      abconSection += `▷ ${number}번: ${concept} / ${reason}\n`;
    }

    // I-M-N-K 프로그램 섹션 생성
    const calculateRate = (correct: string, wrong: string) => {
      const c = Number.parseInt(correct) || 0;
      const w = Number.parseInt(wrong) || 0;
      if (c + w === 0) return "0";
      return ((c / (c + w)) * 100).toFixed(1);
    };

    // 안전한 속성 접근을 위한 헬퍼 함수
    const getStudentInfo = (student: any) => ({
      class_name: student?.class_name || "정보 없음",
      name: student?.name || "정보 없음",
    });

    const getTemplateInfo = (template: any) => ({
      exam_type: template?.exam_type || "정보 없음",
      test_range: template?.test_range || "정보 없음",
      total_questions: template?.total_questions || 0,
      difficulty_level: template?.difficulty_level || "정보 없음",
    });

    const studentInfo = getStudentInfo(instance.student);
    const templateInfo = getTemplateInfo(instance.form_template);

    // 원본 보고서 템플릿
    const rawReport = `
◆ NK 테스트 학생 분석 ◆
> 반명: ${studentInfo.class_name}
> 이름: ${studentInfo.name}
> 날짜: ${new Date(instance.submitted_at || instance.created_at || new Date()).toLocaleDateString(
      "ko-KR"
    )}
> 시험종류: ${templateInfo.exam_type}
> 테스트범위: ${templateInfo.test_range}
> 반평균: ${instance.class_average || "정보 없음"}
> 점수: ${responses["점수"] || "정보 없음"}

▶ I-M-N-K 프로그램
* 총 ${templateInfo.total_questions}문항 / 테스트 난이도: ${templateInfo.difficulty_level}
I(하): ${responses["I(하) 정답 개수"] || "0"}개 정답 / ${
      responses["I(하) 오답 개수"] || "0"
    }개 오답 [정답률: ${calculateRate(
      responses["I(하) 정답 개수"] || "0",
      responses["I(하) 오답 개수"] || "0"
    )}%]
M(중): ${responses["M(중) 정답 개수"] || "0"}개 정답 / ${
      responses["M(중) 오답 개수"] || "0"
    }개 오답 [정답률: ${calculateRate(
      responses["M(중) 정답 개수"] || "0",
      responses["M(중) 오답 개수"] || "0"
    )}%]
N(상): ${responses["N(상) 정답 개수"] || "0"}개 정답 / ${
      responses["N(상) 오답 개수"] || "0"
    }개 오답 [정답률: ${calculateRate(
      responses["N(상) 정답 개수"] || "0",
      responses["N(상) 오답 개수"] || "0"
    )}%]
K(최상): ${responses["K(최상) 정답 개수"] || "0"}개 정답 / ${
      responses["K(최상) 오답 개수"] || "0"
    }개 오답 [정답률: ${calculateRate(
      responses["K(최상) 정답 개수"] || "0",
      responses["K(최상) 오답 개수"] || "0"
    )}%]

■ ABCON 프로그램
${abconSection}

■ 학생 자가 분석
- 시험 난이도: ${responses["시험 난이도"] || "정보 없음"}
- 수업 이해도: ${responses["수업 이해도"] || "정보 없음"}
- 숙제 완성도: ${responses["숙제 완성도"] || "정보 없음"}
- 문제점 분석: ${responses["문제점 분석"] || "정보 없음"}
- 어려웠던 유형: ${responses["어려웠던 유형"] || "정보 없음"}

* 담당강사 의견: ${responses["담당강사 의견"] || "정보 없음"}
`;

    return { success: true, rawReport };
  } catch (error) {
    console.error("Error generating raw report:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
}

// AI 보고서 생성
export async function generateAIReport(
  rawReport: string
): Promise<{ success: boolean; aiReport?: string; error?: string }> {
  try {
    const prompt = `
다음은 학생의 시험 결과 원본 데이터입니다. 
이를 바탕으로 학부모가 이해하기 쉬운 분석 보고서를 작성해주세요.

원본 데이터:
${rawReport}

다음 형식으로 작성해주세요:
[NK학원 분석 결과지]

■ 날짜: 
■ 시험종류: 
■ 이름: (반명: )
■ 점수: (반평균: )
■ 테스트범위: 

■ 학생 통합 분석
▷ 강점
1. 
2. 
3. 

▷ 약점
1. 
2. 
3. 

■ 앞으로의 지도 계획
1. 
   - 
   - 

■ 담임 종합의견

`;

    const aiReport = await summarizeWithGemini(prompt);

    if (!aiReport) {
      return { success: false, error: "AI 보고서 생성에 실패했습니다." };
    }

    return { success: true, aiReport };
  } catch (error) {
    console.error("Error generating AI report:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "AI 보고서 생성 중 오류가 발생했습니다.",
    };
  }
}

// 전체 보고서 생성 프로세스
export async function processStudentReport(
  formInstanceId: string
): Promise<{ success: boolean; report?: StudentReport; error?: string }> {
  try {
    // 1. 원본 보고서 생성
    const {
      success: rawSuccess,
      rawReport,
      error: rawError,
    } = await generateRawReport(formInstanceId);
    if (!rawSuccess || !rawReport) {
      return { success: false, error: rawError || "원본 보고서 생성에 실패했습니다." };
    }

    // 2. AI 보고서 생성
    const { success: aiSuccess, aiReport, error: aiError } = await generateAIReport(rawReport);
    if (!aiSuccess || !aiReport) {
      return { success: false, error: aiError || "AI 보고서 생성에 실패했습니다." };
    }

    // 3. 폼 인스턴스 정보 가져오기
    const { data: instance, error: instanceError } = await supabase
      .from("form_instances")
      .select("student_id, group_id")
      .eq("id", formInstanceId)
      .single();

    if (instanceError || !instance) {
      return { success: false, error: "폼 인스턴스를 찾을 수 없습니다." };
    }

    // 4. 보고서 저장
    const reportData: StudentReportInsert = {
      form_instance_id: formInstanceId,
      student_id: instance.student_id,
      group_id: instance.group_id,
      raw_report: rawReport,
      ai_report: aiReport,
      final_report: aiReport, // 초기에는 AI 보고서를 최종 보고서로 설정
      status: "ai_generated",
    };

    const {
      success: createSuccess,
      report,
      error: createError,
    } = await createStudentReport(reportData);
    if (!createSuccess || !report) {
      return { success: false, error: createError || "보고서 저장에 실패했습니다." };
    }

    // 5. 폼 인스턴스 상태 업데이트
    await supabase.from("form_instances").update({ status: "reviewed" }).eq("id", formInstanceId);

    return { success: true, report };
  } catch (error) {
    console.error("Error processing student report:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "보고서 처리 중 오류가 발생했습니다.",
    };
  }
}
