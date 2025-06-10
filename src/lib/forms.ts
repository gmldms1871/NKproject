// lib/forms.ts
// 폼 관리 관련 함수들 - 템플릿 생성, 필드 관리, 전송, 응답 처리, 통계 등

import { supabase } from "./supabase";
import type {
  FormTemplate,
  FormTemplateInsert,
  FormTemplateUpdate,
  FormTemplateWithFields,
  FormField,
  FormFieldInsert,
  FormFieldUpdate,
  FormInstance,
  FormInstanceInsert,
  FormInstanceUpdate,
  FormInstanceWithDetails,
  FormResponse,
  FormResponseInsert,
  FormResponseUpdate,
  QuestionConcept,
  QuestionConceptInsert,
  APIResponse,
  FormStatistics,
  CreateFormData,
  UpdateFormData,
  FormResponseValue,
  FormFieldType,
  FormInstanceStatus,
  User,
} from "./types";

/**
 * 새 폼 템플릿 생성
 * @param formData 폼 생성 데이터
 * @returns 생성된 폼 템플릿 정보
 */
export async function createFormTemplate(
  formData: CreateFormData
): Promise<APIResponse<FormTemplateWithFields>> {
  try {
    // 트랜잭션 시뮬레이션 - 폼 템플릿 먼저 생성
    const { data: template, error: templateError } = await supabase
      .from("form_templates")
      .insert({
        title: formData.title,
        description: formData.description,
        group_id: formData.group_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (templateError) {
      return { success: false, error: templateError.message };
    }

    // 폼 필드들 추가
    const fieldsToInsert = formData.fields.map((field, index) => ({
      ...field,
      form_template_id: template.id,
      order_index: field.order_index ?? index,
    }));

    const { data: fields, error: fieldsError } = await supabase
      .from("form_fields")
      .insert(fieldsToInsert)
      .select();

    if (fieldsError) {
      // 폼 템플릿 삭제 (롤백)
      await supabase.from("form_templates").delete().eq("id", template.id);
      return { success: false, error: fieldsError.message };
    }

    // 시험번호 개념들 추가 (있다면)
    let questionConcepts: QuestionConcept[] = [];
    if (formData.question_concepts && formData.question_concepts.length > 0) {
      const conceptsToInsert = formData.question_concepts.map((concept) => ({
        ...concept,
        form_template_id: template.id,
      }));

      const { data: concepts, error: conceptsError } = await supabase
        .from("question_concepts")
        .insert(conceptsToInsert)
        .select();

      if (conceptsError) {
        // 롤백
        await supabase.from("form_fields").delete().eq("form_template_id", template.id);
        await supabase.from("form_templates").delete().eq("id", template.id);
        return { success: false, error: conceptsError.message };
      }

      questionConcepts = concepts;
    }

    const result: FormTemplateWithFields = {
      ...template,
      form_fields: fields,
      question_concepts: questionConcepts,
    };

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: "폼 템플릿 생성 중 오류가 발생했습니다." };
  }
}

/**
 * 폼 템플릿 조회 (필드 포함)
 * @param templateId 템플릿 ID
 * @returns 폼 템플릿 정보
 */
export async function getFormTemplate(
  templateId: string
): Promise<APIResponse<FormTemplateWithFields>> {
  try {
    const { data, error } = await supabase
      .from("form_templates")
      .select(
        `
        *,
        form_fields (*),
        question_concepts (*)
      `
      )
      .eq("id", templateId)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // 필드들을 order_index 순으로 정렬
    data.form_fields.sort((a, b) => a.order_index - b.order_index);

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "폼 템플릿 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 폼 템플릿 업데이트
 * @param templateId 템플릿 ID
 * @param updateData 업데이트 데이터
 * @returns 업데이트된 폼 템플릿
 */
export async function updateFormTemplate(
  templateId: string,
  updateData: UpdateFormData
): Promise<APIResponse<FormTemplateWithFields>> {
  try {
    // 기본 정보 업데이트
    if (updateData.title || updateData.description) {
      const { error: templateError } = await supabase
        .from("form_templates")
        .update({
          title: updateData.title,
          description: updateData.description,
          updated_at: new Date().toISOString(),
        })
        .eq("id", templateId);

      if (templateError) {
        return { success: false, error: templateError.message };
      }
    }

    // 필드 업데이트 (복잡한 로직이므로 별도 함수로 분리 가능)
    if (updateData.fields) {
      // 구현 복잡도를 위해 기존 필드 삭제 후 재생성
      await supabase.from("form_fields").delete().eq("form_template_id", templateId);

      const fieldsToInsert = updateData.fields.map((field, index) => ({
        ...field,
        form_template_id: templateId,
        order_index: field.order_index ?? index,
      }));

      const { error: fieldsError } = await supabase.from("form_fields").insert(fieldsToInsert);

      if (fieldsError) {
        return { success: false, error: fieldsError.message };
      }
    }

    // 시험번호 개념 업데이트
    if (updateData.question_concepts) {
      await supabase.from("question_concepts").delete().eq("form_template_id", templateId);

      if (updateData.question_concepts.length > 0) {
        const conceptsToInsert = updateData.question_concepts.map((concept) => ({
          ...concept,
          form_template_id: templateId,
        }));

        const { error: conceptsError } = await supabase
          .from("question_concepts")
          .insert(conceptsToInsert);

        if (conceptsError) {
          return { success: false, error: conceptsError.message };
        }
      }
    }

    // 업데이트된 폼 템플릿 조회
    return await getFormTemplate(templateId);
  } catch (error) {
    return { success: false, error: "폼 템플릿 업데이트 중 오류가 발생했습니다." };
  }
}

/**
 * 폼 템플릿 복제
 * @param templateId 원본 템플릿 ID
 * @param newTitle 새 폼 제목
 * @param groupId 대상 그룹 ID
 * @returns 복제된 폼 템플릿
 */
export async function duplicateFormTemplate(
  templateId: string,
  newTitle: string,
  groupId: string
): Promise<APIResponse<FormTemplateWithFields>> {
  try {
    // 원본 폼 템플릿 조회
    const originalResult = await getFormTemplate(templateId);
    if (!originalResult.success || !originalResult.data) {
      return { success: false, error: "원본 폼 템플릿을 찾을 수 없습니다." };
    }

    const original = originalResult.data;

    // 새 폼 데이터 구성
    const newFormData: CreateFormData = {
      title: newTitle,
      description: original.description,
      group_id: groupId,
      fields: original.form_fields.map((field) => ({
        field_name: field.field_name,
        field_type: field.field_type,
        filled_by_role: field.filled_by_role,
        is_required: field.is_required,
        options: field.options,
        placeholder: field.placeholder,
        help_text: field.help_text,
        order_index: field.order_index,
      })),
      question_concepts: original.question_concepts.map((concept) => ({
        question_number: concept.question_number,
        concept_name: concept.concept_name,
      })),
    };

    return await createFormTemplate(newFormData);
  } catch (error) {
    return { success: false, error: "폼 템플릿 복제 중 오류가 발생했습니다." };
  }
}

/**
 * 폼 템플릿 삭제
 * @param templateId 템플릿 ID
 * @returns 삭제 결과
 */
export async function deleteFormTemplate(templateId: string): Promise<APIResponse> {
  try {
    const { error } = await supabase.from("form_templates").delete().eq("id", templateId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, message: "폼 템플릿이 성공적으로 삭제되었습니다." };
  } catch (error) {
    return { success: false, error: "폼 템플릿 삭제 중 오류가 발생했습니다." };
  }
}

/**
 * 폼을 학생들에게 전송 (인스턴스 생성)
 * @param templateId 템플릿 ID
 * @param studentIds 학생 ID 배열
 * @param classId 반 ID (선택)
 * @returns 전송 결과
 */
export async function sendFormToStudents(
  templateId: string,
  studentIds: string[],
  classId?: string
): Promise<APIResponse<FormInstance[]>> {
  try {
    // 폼 템플릿 확인
    const templateResult = await getFormTemplate(templateId);
    if (!templateResult.success) {
      return { success: false, error: "폼 템플릿을 찾을 수 없습니다." };
    }

    const groupId = templateResult.data!.group_id;

    // 폼 인스턴스들 생성
    const instancesToInsert = studentIds.map((studentId) => ({
      form_template_id: templateId,
      student_id: studentId,
      group_id: groupId,
      class_id: classId,
      status: "not_started" as FormInstanceStatus,
      created_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from("form_instances")
      .insert(instancesToInsert)
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    // 학생들에게 알림 전송
    // TODO: 알림 전송 로직 구현

    return {
      success: true,
      data,
      message: `${studentIds.length}명의 학생에게 폼이 전송되었습니다.`,
    };
  } catch (error) {
    return { success: false, error: "폼 전송 중 오류가 발생했습니다." };
  }
}

/**
 * 폼 인스턴스 조회 (상세 정보 포함)
 * @param instanceId 인스턴스 ID
 * @returns 폼 인스턴스 정보
 */
export async function getFormInstance(
  instanceId: string
): Promise<APIResponse<FormInstanceWithDetails>> {
  try {
    const { data, error } = await supabase
      .from("form_instances")
      .select(
        `
        *,
        form_template:form_templates (
          *,
          form_fields (*),
          question_concepts (*)
        ),
        student:users!form_instances_student_id_fkey (
          id,
          name,
          email
        ),
        form_responses (*)
      `
      )
      .eq("id", instanceId)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // form_fields 정렬
    if (data.form_template?.form_fields) {
      data.form_template.form_fields.sort((a, b) => a.order_index - b.order_index);
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "폼 인스턴스 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 학생 폼 응답 제출
 * @param instanceId 인스턴스 ID
 * @param responses 응답 데이터 배열
 * @returns 제출 결과
 */
export async function submitStudentResponse(
  instanceId: string,
  responses: FormResponseValue[]
): Promise<APIResponse<FormResponse[]>> {
  try {
    // 기존 응답 삭제
    await supabase.from("form_responses").delete().eq("form_instance_id", instanceId);

    // 새 응답 삽입
    const responsesToInsert = responses.map((response) => ({
      form_instance_id: instanceId,
      field_id: response.field_id,
      value:
        typeof response.value === "object"
          ? JSON.stringify(response.value)
          : String(response.value),
      submitted_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from("form_responses")
      .insert(responsesToInsert)
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    // 폼 인스턴스 상태 업데이트
    const { error: updateError } = await supabase
      .from("form_instances")
      .update({
        status: "student_completed",
        submitted_at: new Date().toISOString(),
      })
      .eq("id", instanceId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "폼 응답 제출 중 오류가 발생했습니다." };
  }
}

/**
 * 시간제 강사 검토 완료
 * @param instanceId 인스턴스 ID
 * @param reviewNotes 검토 의견 (선택)
 * @returns 검토 결과
 */
export async function completePartTimeReview(
  instanceId: string,
  reviewNotes?: string
): Promise<APIResponse<FormInstance>> {
  try {
    const { data, error } = await supabase
      .from("form_instances")
      .update({
        status: "part_time_completed",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", instanceId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // 검토 의견이 있다면 별도 저장 (reports 테이블 등에)
    // TODO: 검토 의견 저장 로직

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "시간제 강사 검토 중 오류가 발생했습니다." };
  }
}

/**
 * 폼 반려 (재작성 요청)
 * @param instanceId 인스턴스 ID
 * @param reason 반려 사유
 * @param rejectedBy 반려자 ID
 * @returns 반려 결과
 */
export async function rejectFormInstance(
  instanceId: string,
  reason: string,
  rejectedBy: string
): Promise<APIResponse<FormInstance>> {
  try {
    const { data, error } = await supabase
      .from("form_instances")
      .update({
        status: "not_started", // 다시 미시작 상태로
        submitted_at: null,
        reviewed_at: null,
      })
      .eq("id", instanceId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // 반려 알림 전송
    // TODO: 반려 알림 로직 구현

    return { success: true, data, message: "폼이 반려되었습니다." };
  } catch (error) {
    return { success: false, error: "폼 반려 중 오류가 발생했습니다." };
  }
}

/**
 * 그룹 내 모든 폼 템플릿 조회
 * @param groupId 그룹 ID
 * @returns 폼 템플릿 목록
 */
export async function getGroupFormTemplates(groupId: string): Promise<APIResponse<FormTemplate[]>> {
  try {
    const { data, error } = await supabase
      .from("form_templates")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "폼 템플릿 목록 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 학생별 폼 인스턴스 조회
 * @param studentId 학생 ID
 * @param groupId 그룹 ID (선택)
 * @returns 학생의 폼 인스턴스 목록
 */
export async function getStudentFormInstances(
  studentId: string,
  groupId?: string
): Promise<APIResponse<FormInstanceWithDetails[]>> {
  try {
    let query = supabase
      .from("form_instances")
      .select(
        `
        *,
        form_template:form_templates (
          *,
          form_fields (*),
          question_concepts (*)
        ),
        form_responses (*)
      `
      )
      .eq("student_id", studentId);

    if (groupId) {
      query = query.eq("group_id", groupId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "학생 폼 인스턴스 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 폼 통계 조회
 * @param templateId 템플릿 ID
 * @returns 폼 통계 정보
 */
export async function getFormStatistics(templateId: string): Promise<APIResponse<FormStatistics>> {
  try {
    // 폼 템플릿 정보 조회
    const { data: template, error: templateError } = await supabase
      .from("form_templates")
      .select("*")
      .eq("id", templateId)
      .single();

    if (templateError) {
      return { success: false, error: templateError.message };
    }

    // 폼 인스턴스들 조회
    const { data: instances, error: instancesError } = await supabase
      .from("form_instances")
      .select(
        `
        *,
        student:users!form_instances_student_id_fkey (name),
        class:classes (name)
      `
      )
      .eq("form_template_id", templateId);

    if (instancesError) {
      return { success: false, error: instancesError.message };
    }

    const totalAssigned = instances.length;
    const completed = instances.filter((i) => i.status === "final_completed").length;
    const inProgress = instances.filter((i) =>
      ["student_completed", "part_time_completed", "teacher_completed"].includes(i.status || "")
    ).length;
    const notStarted = instances.filter((i) => i.status === "not_started").length;

    const completionRate = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;

    // 반별 통계 (있다면)
    const classStats: any[] = []; // 복잡한 계산이므로 기본 구조만

    const statistics: FormStatistics = {
      form_id: templateId,
      form_title: template.title,
      total_assigned: totalAssigned,
      completed,
      in_progress: inProgress,
      not_started: notStarted,
      completion_rate: completionRate,
      class_stats: classStats,
    };

    return { success: true, data: statistics };
  } catch (error) {
    return { success: false, error: "폼 통계 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 시간제 강사가 검토해야 할 폼 목록 조회
 * @param partTimeTeacherId 시간제 강사 ID
 * @param groupId 그룹 ID
 * @returns 검토 대기 폼 목록
 */
export async function getPartTimeReviewQueue(
  partTimeTeacherId: string,
  groupId: string
): Promise<APIResponse<FormInstanceWithDetails[]>> {
  try {
    // 시간제 강사가 담당하는 반의 학생들 조회
    const { data: assignedClasses, error: classError } = await supabase
      .from("class_members")
      .select("class_id")
      .eq("user_id", partTimeTeacherId)
      .eq("role", "part_time");

    if (classError) {
      return { success: false, error: classError.message };
    }

    const classIds = assignedClasses.map((c) => c.class_id);

    if (classIds.length === 0) {
      return { success: true, data: [] };
    }

    // 해당 반 학생들의 완료된 폼 인스턴스 조회
    const { data, error } = await supabase
      .from("form_instances")
      .select(
        `
        *,
        form_template:form_templates (
          *,
          form_fields (*),
          question_concepts (*)
        ),
        student:users!form_instances_student_id_fkey (
          id,
          name,
          email
        ),
        form_responses (*)
      `
      )
      .eq("group_id", groupId)
      .eq("status", "student_completed")
      .in("class_id", classIds)
      .order("submitted_at", { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "검토 대기 목록 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 선생님이 관리하는 모든 폼 인스턴스 조회
 * @param groupId 그룹 ID
 * @param status 상태 필터 (선택)
 * @returns 폼 인스턴스 목록
 */
export async function getTeacherFormInstances(
  groupId: string,
  status?: FormInstanceStatus
): Promise<APIResponse<FormInstanceWithDetails[]>> {
  try {
    let query = supabase
      .from("form_instances")
      .select(
        `
        *,
        form_template:form_templates (
          *,
          form_fields (*),
          question_concepts (*)
        ),
        student:users!form_instances_student_id_fkey (
          id,
          name,
          email
        ),
        form_responses (*)
      `
      )
      .eq("group_id", groupId);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "폼 인스턴스 목록 조회 중 오류가 발생했습니다." };
  }
}
