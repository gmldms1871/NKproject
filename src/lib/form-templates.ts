import { supabase, getCurrentUser } from "./supabase";
import type {
  FormTemplate,
  FormTemplateInsert,
  FormTemplateUpdate,
  FormField,
  FormFieldInsert,
  QuestionConcept,
  QuestionConceptInsert,
  FormattedFormTemplate,
  FormWithFields,
} from "../../types";

// 폼 템플릿 생성
export async function createFormTemplate(
  template: FormTemplateInsert
): Promise<{ success: boolean; template?: FormTemplate; error?: string }> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "인증되지 않은 사용자입니다." };
    }

    const templateWithUser = {
      ...template,
      created_by: currentUser.id,
    };

    const { data, error } = await supabase
      .from("form_templates")
      .insert(templateWithUser)
      .select()
      .single();

    if (error) {
      console.error("Error creating form template:", error);
      return { success: false, error: error.message };
    }

    return { success: true, template: data };
  } catch (error) {
    console.error("Error creating form template:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
}

// 그룹별 폼 템플릿 목록 조회
export async function getFormTemplatesByGroupId(groupId: string): Promise<FormattedFormTemplate[]> {
  try {
    const { data, error } = await supabase
      .from("form_templates")
      .select(
        `
        *,
        form_fields(*),
        question_concepts(*)
      `
      )
      .eq("group_id", groupId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching form templates:", error);
      return [];
    }

    const formattedTemplates: FormattedFormTemplate[] = (data || []).map((template) => ({
      id: template.id,
      group_id: template.group_id,
      title: template.title,
      description: template.description,
      exam_type: template.exam_type,
      test_range: template.test_range,
      total_questions: template.total_questions,
      difficulty_level: template.difficulty_level,
      created_by: template.created_by,
      is_active: template.is_active,
      created_at: template.created_at,
      updated_at: template.updated_at,
      form_fields: template.form_fields || [],
      question_concepts: template.question_concepts || [],
    }));

    return formattedTemplates;
  } catch (error) {
    console.error("Error fetching form templates:", error);
    return [];
  }
}

// 폼 템플릿 상세 조회
export async function getFormTemplateById(
  templateId: string
): Promise<{ success: boolean; template?: FormWithFields; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("form_templates")
      .select(
        `
        *,
        form_fields(*),
        question_concepts(*)
      `
      )
      .eq("id", templateId)
      .single();

    if (error) {
      console.error("Error fetching form template:", error);
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: "폼 템플릿을 찾을 수 없습니다." };
    }

    return { success: true, template: data as FormWithFields };
  } catch (error) {
    console.error("Error fetching form template:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
}

// 폼 템플릿 업데이트
export async function updateFormTemplate(
  templateId: string,
  updates: FormTemplateUpdate
): Promise<{ success: boolean; template?: FormTemplate; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("form_templates")
      .update(updates)
      .eq("id", templateId)
      .select()
      .single();

    if (error) {
      console.error("Error updating form template:", error);
      return { success: false, error: error.message };
    }

    return { success: true, template: data };
  } catch (error) {
    console.error("Error updating form template:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
}

// 폼 템플릿 삭제 (비활성화)
export async function deleteFormTemplate(
  templateId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("form_templates")
      .update({ is_active: false })
      .eq("id", templateId);

    if (error) {
      console.error("Error deleting form template:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting form template:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
}

// 폼 필드 추가
export async function addFormField(
  field: FormFieldInsert
): Promise<{ success: boolean; field?: FormField; error?: string }> {
  try {
    const { data, error } = await supabase.from("form_fields").insert(field).select().single();

    if (error) {
      console.error("Error adding form field:", error);
      return { success: false, error: error.message };
    }

    return { success: true, field: data };
  } catch (error) {
    console.error("Error adding form field:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
}

// 문제 개념 추가
export async function addQuestionConcept(
  concept: QuestionConceptInsert
): Promise<{ success: boolean; concept?: QuestionConcept; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("question_concepts")
      .insert(concept)
      .select()
      .single();

    if (error) {
      console.error("Error adding question concept:", error);
      return { success: false, error: error.message };
    }

    return { success: true, concept: data };
  } catch (error) {
    console.error("Error adding question concept:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
}

// 폼 필드 일괄 업데이트
export async function updateFormFields(
  templateId: string,
  fields: FormFieldInsert[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // 기존 필드 삭제
    await supabase.from("form_fields").delete().eq("form_template_id", templateId);

    // 새 필드 추가
    if (fields.length > 0) {
      const { error } = await supabase.from("form_fields").insert(fields);

      if (error) {
        console.error("Error updating form fields:", error);
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating form fields:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
}

// 문제 개념 일괄 업데이트
export async function updateQuestionConcepts(
  templateId: string,
  concepts: QuestionConceptInsert[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // 기존 개념 삭제
    await supabase.from("question_concepts").delete().eq("form_template_id", templateId);

    // 새 개념 추가
    if (concepts.length > 0) {
      const { error } = await supabase.from("question_concepts").insert(concepts);

      if (error) {
        console.error("Error updating question concepts:", error);
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating question concepts:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
}
