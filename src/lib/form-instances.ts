import { supabase, getCurrentUser } from "./supabase";
import type {
  FormInstance,
  FormInstanceInsert,
  FormInstanceUpdate,
  FormResponse,
  FormResponseInsert,
  FormattedFormInstance,
  FormInstanceWithDetails,
  FormTemplate,
  Student,
} from "../../types";

// 폼 인스턴스 생성
export async function createFormInstance(
  instance: FormInstanceInsert
): Promise<{ success: boolean; instance?: FormInstance; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("form_instances")
      .insert(instance)
      .select()
      .single();

    if (error) {
      console.error("Error creating form instance:", error);
      return { success: false, error: error.message };
    }

    return { success: true, instance: data };
  } catch (error) {
    console.error("Error creating form instance:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
}

// 학생별 폼 인스턴스 조회
export async function getFormInstancesByStudent(
  studentId: string
): Promise<{ success: boolean; instances?: FormattedFormInstance[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("form_instances")
      .select(
        `
        *,
        form_template:form_template_id(*),
        student:student_id(*),
        form_responses(*)
      `
      )
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching form instances:", error);
      return { success: false, error: error.message };
    }

    const formattedInstances: FormattedFormInstance[] = (data || []).map((instance) => ({
      id: instance.id,
      form_template_id: instance.form_template_id,
      student_id: instance.student_id,
      group_id: instance.group_id,
      status: instance.status,
      class_average: instance.class_average,
      submitted_at: instance.submitted_at,
      reviewed_at: instance.reviewed_at,
      created_at: instance.created_at,
      form_template: instance.form_template as FormTemplate,
      student: instance.student as Student,
      form_responses: (instance.form_responses as FormResponse[]) || [],
    }));

    return { success: true, instances: formattedInstances };
  } catch (error) {
    console.error("Error fetching form instances:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
}

// 그룹별 폼 인스턴스 조회
export async function getFormInstancesByGroupId(groupId: string): Promise<FormattedFormInstance[]> {
  try {
    const { data, error } = await supabase
      .from("form_instances")
      .select(
        `
        *,
        form_template:form_template_id(*),
        student:student_id(*),
        form_responses(*)
      `
      )
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching form instances:", error);
      return [];
    }

    const formattedInstances: FormattedFormInstance[] = (data || []).map((instance) => ({
      id: instance.id,
      form_template_id: instance.form_template_id,
      student_id: instance.student_id,
      group_id: instance.group_id,
      status: instance.status,
      class_average: instance.class_average,
      submitted_at: instance.submitted_at,
      reviewed_at: instance.reviewed_at,
      created_at: instance.created_at,
      form_template: instance.form_template as FormTemplate,
      student: instance.student as Student,
      form_responses: (instance.form_responses as FormResponse[]) || [],
    }));

    return formattedInstances;
  } catch (error) {
    console.error("Error fetching form instances:", error);
    return [];
  }
}

// 폼 인스턴스 상세 조회
export async function getFormInstanceById(
  instanceId: string
): Promise<{ success: boolean; instance?: FormInstanceWithDetails; error?: string }> {
  try {
    const { data, error } = await supabase
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
      .eq("id", instanceId)
      .single();

    if (error) {
      console.error("Error fetching form instance:", error);
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: "폼 인스턴스를 찾을 수 없습니다." };
    }

    return {
      success: true,
      instance: {
        ...data,
        form_template: data.form_template as FormTemplate,
        student: data.student as Student,
        form_responses: data.form_responses as FormResponse[],
      } as FormInstanceWithDetails,
    };
  } catch (error) {
    console.error("Error fetching form instance:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
}

// 폼 인스턴스 업데이트
export async function updateFormInstance(
  instanceId: string,
  updates: FormInstanceUpdate
): Promise<{ success: boolean; instance?: FormInstance; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("form_instances")
      .update(updates)
      .eq("id", instanceId)
      .select()
      .single();

    if (error) {
      console.error("Error updating form instance:", error);
      return { success: false, error: error.message };
    }

    return { success: true, instance: data };
  } catch (error) {
    console.error("Error updating form instance:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
}

// 폼 응답 제출
export async function submitFormResponse(
  response: FormResponseInsert
): Promise<{ success: boolean; response?: FormResponse; error?: string }> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "인증되지 않은 사용자입니다." };
    }

    const responseWithUser = {
      ...response,
      submitted_by: currentUser.id,
    };

    const { data, error } = await supabase
      .from("form_responses")
      .insert(responseWithUser)
      .select()
      .single();

    if (error) {
      console.error("Error submitting form response:", error);
      return { success: false, error: error.message };
    }

    return { success: true, response: data };
  } catch (error) {
    console.error("Error submitting form response:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
}

// 폼 응답 일괄 제출
export async function submitFormResponses(
  responses: FormResponseInsert[]
): Promise<{ success: boolean; responses?: FormResponse[]; error?: string }> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "인증되지 않은 사용자입니다." };
    }

    const responsesWithUser = responses.map((response) => ({
      ...response,
      submitted_by: currentUser.id,
    }));

    const { data, error } = await supabase
      .from("form_responses")
      .insert(responsesWithUser)
      .select();

    if (error) {
      console.error("Error submitting form responses:", error);
      return { success: false, error: error.message };
    }

    return { success: true, responses: data };
  } catch (error) {
    console.error("Error submitting form responses:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
}

// 반평균 계산 및 업데이트
export async function calculateAndUpdateClassAverage(
  instanceId: string
): Promise<{ success: boolean; average?: number; error?: string }> {
  try {
    // 폼 인스턴스 정보 가져오기
    const { data: instance, error: instanceError } = await supabase
      .from("form_instances")
      .select("form_template_id, student_id, group_id, student:student_id(class_name)")
      .eq("id", instanceId)
      .single();

    if (instanceError || !instance) {
      return { success: false, error: "폼 인스턴스를 찾을 수 없습니다." };
    }

    const student = instance.student as any;
    const className = student?.class_name;
    if (!className) {
      return { success: false, error: "학생의 반 정보를 찾을 수 없습니다." };
    }

    // form_template_id와 group_id가 null이 아닌지 확인
    if (!instance.form_template_id || !instance.group_id) {
      return { success: false, error: "폼 템플릿 ID 또는 그룹 ID가 없습니다." };
    }

    // 같은 반, 같은 폼 템플릿의 점수들 가져오기
    const { data: classInstances, error: classError } = await supabase
      .from("form_instances")
      .select(
        `
        id,
        form_responses!inner(value, form_field:form_field_id(field_name)),
        student:student_id!inner(class_name)
      `
      )
      .eq("form_template_id", instance.form_template_id)
      .eq("group_id", instance.group_id)
      .eq("student.class_name", className)
      .eq("status", "completed");

    if (classError) {
      console.error("Error fetching class instances:", classError);
      return { success: false, error: classError.message };
    }

    // 점수 필드에서 점수들 추출 (점수 필드명은 "점수"라고 가정)
    const scores: number[] = [];
    for (const classInstance of classInstances || []) {
      const responses = classInstance.form_responses as any[];
      const scoreResponse = responses?.find(
        (response) => response.form_field?.field_name === "점수"
      );
      if (scoreResponse && scoreResponse.value) {
        const score = Number.parseFloat(scoreResponse.value);
        if (!isNaN(score)) {
          scores.push(score);
        }
      }
    }

    if (scores.length === 0) {
      return { success: false, error: "반평균을 계산할 점수가 없습니다." };
    }

    // 평균 계산
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    // 폼 인스턴스에 반평균 업데이트
    const { error: updateError } = await supabase
      .from("form_instances")
      .update({ class_average: average })
      .eq("id", instanceId);

    if (updateError) {
      console.error("Error updating class average:", updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true, average };
  } catch (error) {
    console.error("Error calculating class average:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
}
