import { supabase } from "./supabase";
import type {
  FormTemplate,
  FormTemplateInsert,
  FormTemplateUpdate,
  FormattedFormTemplate,
} from "../../types";

// 폼 템플릿 생성
export async function createFormTemplate(
  template: FormTemplateInsert
): Promise<{ success: boolean; template?: FormTemplate; error?: string }> {
  try {
    console.log("Creating form template with data:", template);

    // 필수 필드 검증
    if (!template.title) {
      return { success: false, error: "제목은 필수 항목입니다." };
    }

    if (!template.group_id) {
      return { success: false, error: "그룹 ID는 필수 항목입니다." };
    }

    const { data, error } = await supabase
      .from("form_templates")
      .insert(template)
      .select()
      .single();

    if (error) {
      console.error("Supabase error creating form template:", error);
      return { success: false, error: error.message };
    }

    console.log("Form template created successfully:", data);
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
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching form templates:", error);
      return [];
    }

    const formattedTemplates: FormattedFormTemplate[] = (data || []).map((template) => ({
      id: template.id,
      title: template.title,
      description: template.description,
      exam_type: template.exam_type,
      test_range: template.test_range,
      difficulty_level: template.difficulty_level,
      total_questions: template.total_questions,
      is_active: template.is_active,
      group_id: template.group_id,
      created_by: template.created_by,
      created_at: template.created_at,
      updated_at: template.updated_at,
      form_fields: [],
      question_concepts: [],
    }));

    return formattedTemplates;
  } catch (error) {
    console.error("Error fetching form templates:", error);
    return [];
  }
}

// 폼 템플릿 상세 정보 조회
export async function getFormTemplateById(
  templateId: string
): Promise<{ success: boolean; template?: FormattedFormTemplate; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("form_templates")
      .select("*")
      .eq("id", templateId)
      .single();

    if (error) {
      console.error("Error fetching form template:", error);
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: "폼 템플릿을 찾을 수 없습니다." };
    }

    const formattedTemplate: FormattedFormTemplate = {
      id: data.id,
      title: data.title,
      description: data.description,
      exam_type: data.exam_type,
      test_range: data.test_range,
      difficulty_level: data.difficulty_level,
      total_questions: data.total_questions,
      is_active: data.is_active,
      group_id: data.group_id,
      created_by: data.created_by,
      created_at: data.created_at,
      updated_at: data.updated_at,
      form_fields: [],
      question_concepts: [],
    };

    return { success: true, template: formattedTemplate };
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

// 폼 템플릿 삭제
export async function deleteFormTemplate(
  templateId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from("form_templates").delete().eq("id", templateId);

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
