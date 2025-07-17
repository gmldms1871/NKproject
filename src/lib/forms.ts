import { supabaseAdmin } from "./supabase";
import { Database } from "./types/types";

// 데이터베이스 타입 import (실제 스키마에 맞춤)
type Form = Database["public"]["Tables"]["forms"]["Row"];
type FormInsert = Database["public"]["Tables"]["forms"]["Insert"];
type FormUpdate = Database["public"]["Tables"]["forms"]["Update"];

type FormQuestion = Database["public"]["Tables"]["form_questions"]["Row"];
type FormQuestionInsert = Database["public"]["Tables"]["form_questions"]["Insert"];
type FormQuestionUpdate = Database["public"]["Tables"]["form_questions"]["Update"];

type FormResponse = Database["public"]["Tables"]["form_responses"]["Row"];
type FormResponseInsert = Database["public"]["Tables"]["form_responses"]["Insert"];
type FormResponseUpdate = Database["public"]["Tables"]["form_responses"]["Update"];

type FormQuestionResponse = Database["public"]["Tables"]["form_question_responses"]["Row"];
type FormQuestionResponseInsert = Database["public"]["Tables"]["form_question_responses"]["Insert"];

type FormTarget = Database["public"]["Tables"]["form_targets"]["Row"];
type FormTargetInsert = Database["public"]["Tables"]["form_targets"]["Insert"];

type ExamConceptTemplate = Database["public"]["Tables"]["exam_concept_templates"]["Row"];
type ExamQuestion = Database["public"]["Tables"]["exam_questions"]["Row"];
type RatingQuestion = Database["public"]["Tables"]["rating_questions"]["Row"];
type ChoiceQuestion = Database["public"]["Tables"]["choice_questions"]["Row"];
type ChoiceOption = Database["public"]["Tables"]["choice_options"]["Row"];

type User = Database["public"]["Tables"]["users"]["Row"];
type Class = Database["public"]["Tables"]["classes"]["Row"];
type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"];

// API 응답 타입 정의
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ===== 요청 타입 정의 =====

export interface CreateFormRequest {
  title: string; // 실제 DB 컬럼명은 title
  description?: string;
  groupId: string;
  questions: CreateQuestionRequest[];
  tags?: string[];
}

export interface UpdateFormRequest {
  title?: string;
  description?: string;
}

export interface CreateQuestionRequest {
  questionType: string;
  questionText: string;
  isRequired: boolean;
  orderIndex: number;
  groupRolesId?: string;
  // 질문 타입별 추가 데이터
  examConfig?: {
    conceptTemplateId: string;
    totalQuestions: number;
  };
  ratingConfig?: {
    ratingMax: number;
    ratingStep: number;
  };
  choiceConfig?: {
    options: string[];
    isMultiple: boolean;
    etcOptionEnabled?: boolean;
  };
}

export interface UpdateQuestionRequest {
  questionText?: string;
  isRequired?: boolean;
  orderIndex?: number;
}

export interface SendFormRequest {
  formId: string;
  targets: {
    type: "class" | "individual";
    id: string; // class_id or student_id
  }[];
  message?: string;
}

export interface SubmitFormResponseRequest {
  formId: string;
  studentId: string;
  classId?: string;
  responses: {
    questionId: string;
    textResponse?: string;
    numberResponse?: number;
    ratingResponse?: number;
    examResponse?: Record<string, unknown>; // JSON 데이터
  }[];
  status: "draft" | "submitted";
}

export interface FormSearchConditions {
  title?: string;
  creatorId?: string;
  groupId: string;
  status?: string[];
  createdAfter?: string;
  createdBefore?: string;
}

export interface FormTagRequest {
  name: string;
  groupId: string;
  color?: string;
}

// ===== 상세 정보 포함 타입 =====

export interface FormWithDetails {
  id: string;
  title: string;
  description: string | null;
  group_id: string | null;
  creator_id: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  creator: {
    name: string;
    nickname: string;
  };
  questions: FormQuestionWithDetails[];
  responseStats: {
    totalTargets: number;
    completedResponses: number;
    draftResponses: number;
    responseRate: number;
  };
}

export interface FormQuestionWithDetails {
  id: string;
  form_id: string | null;
  question_type: string;
  question_text: string;
  is_required: boolean | null;
  order_index: number;
  group_roles_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  // 질문 타입별 상세 정보
  examConfig?: {
    conceptTemplate: ExamConceptTemplate;
    totalQuestions: number;
  };
  ratingConfig?: {
    ratingMax: number;
    ratingStep: number;
  };
  choiceConfig?: {
    options: ChoiceOption[];
    isMultiple: boolean;
    etcOptionEnabled: boolean;
  };
}

export interface FormTargetWithDetails {
  id: string;
  form_id: string | null;
  target_id: string | null;
  target_type: string | null;
  created_at: string | null;
  targetInfo: {
    type: "class" | "individual";
    name: string;
    memberCount?: number;
  };
}

// ===== 알림 생성 헬퍼 함수 =====
const createNotification = async (notificationData: NotificationInsert) => {
  try {
    await supabaseAdmin.from("notifications").insert(notificationData);
  } catch (error) {
    console.error("알림 생성 실패:", error);
  }
};

// ===== API 함수들 =====

/**
 * 폼 목록 조회 (그룹 내)
 */
export const getForms = async (
  groupId: string,
  userId: string,
  conditions?: FormSearchConditions
): Promise<ApiResponse<FormWithDetails[]>> => {
  try {
    // 그룹 멤버 확인
    const { data: memberCheck } = await supabaseAdmin
      .from("group_member")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .single();

    if (!memberCheck) {
      return { success: false, error: "그룹 멤버만 폼을 조회할 수 있습니다." };
    }

    // 기본 쿼리 구성
    let query = supabaseAdmin
      .from("forms")
      .select(
        `
        *,
        users!forms_creator_id_fkey (name, nickname),
        form_questions (*)
      `
      )
      .eq("group_id", groupId);

    // 검색 조건 적용
    if (conditions) {
      if (conditions.title) {
        query = query.ilike("title", `%${conditions.title}%`);
      }
      if (conditions.creatorId) {
        query = query.eq("creator_id", conditions.creatorId);
      }
      if (conditions.status && conditions.status.length > 0) {
        query = query.in("status", conditions.status);
      }
      if (conditions.createdAfter) {
        query = query.gte("created_at", conditions.createdAfter);
      }
      if (conditions.createdBefore) {
        query = query.lte("created_at", conditions.createdBefore);
      }
    }

    query = query.order("created_at", { ascending: false });

    const { data: forms, error } = await query;

    if (error) {
      console.error("Get forms error:", error);
      return { success: false, error: "폼 목록 조회에 실패했습니다." };
    }

    // 응답 통계 계산을 포함한 상세 정보 구성
    const formsWithDetails: FormWithDetails[] = await Promise.all(
      (forms || []).map(async (form: Form & { users: User; form_questions: FormQuestion[] }) => {
        // 응답 통계 계산
        const { data: responses } = await supabaseAdmin
          .from("form_responses")
          .select("id, status")
          .eq("form_id", form.id);

        const { data: targets } = await supabaseAdmin
          .from("form_targets")
          .select("id")
          .eq("form_id", form.id);

        const totalTargets = targets?.length || 0;
        const completedResponses = responses?.filter((r) => r.status === "submitted")?.length || 0;
        const draftResponses = responses?.filter((r) => r.status === "draft")?.length || 0;
        const responseRate = totalTargets > 0 ? (completedResponses / totalTargets) * 100 : 0;

        // 질문 상세 정보 로드
        const questionsWithDetails = await Promise.all(
          (form.form_questions || []).map(async (question: FormQuestion) => {
            const questionDetails: FormQuestionWithDetails = {
              ...question,
            };

            // 질문 타입별 상세 정보 로드
            switch (question.question_type) {
              case "exam":
                const { data: examData } = await supabaseAdmin
                  .from("exam_questions")
                  .select(
                    `
                    total_questions,
                    exam_concept_templates!exam_questions_concept_template_id_fkey (*)
                  `
                  )
                  .eq("question_id", question.id)
                  .single();

                if (examData?.exam_concept_templates) {
                  questionDetails.examConfig = {
                    conceptTemplate: examData.exam_concept_templates,
                    totalQuestions: examData.total_questions,
                  };
                }
                break;

              case "rating":
                const { data: ratingData } = await supabaseAdmin
                  .from("rating_questions")
                  .select("rating_max, rating_step")
                  .eq("question_id", question.id)
                  .single();

                if (ratingData) {
                  questionDetails.ratingConfig = {
                    ratingMax: ratingData.rating_max || 5,
                    ratingStep: ratingData.rating_step || 1,
                  };
                }
                break;

              case "choice":
                const { data: choiceData } = await supabaseAdmin
                  .from("choice_questions")
                  .select("is_multiple, etc_option_enabled")
                  .eq("question_id", question.id)
                  .single();

                const { data: choiceOptions } = await supabaseAdmin
                  .from("choice_options")
                  .select("*")
                  .eq("question_id", question.id)
                  .order("order_index");

                if (choiceData) {
                  questionDetails.choiceConfig = {
                    options: choiceOptions || [],
                    isMultiple: choiceData.is_multiple || false,
                    etcOptionEnabled: choiceData.etc_option_enabled || false,
                  };
                }
                break;
            }

            return questionDetails;
          })
        );

        return {
          ...form,
          creator: form.users,
          questions: questionsWithDetails,
          responseStats: {
            totalTargets,
            completedResponses,
            draftResponses,
            responseRate: Math.round(responseRate),
          },
        };
      })
    );

    return { success: true, data: formsWithDetails };
  } catch (error) {
    console.error("Get forms error:", error);
    return { success: false, error: "폼 목록 조회 중 오류가 발생했습니다." };
  }
};

/**
 * 폼 상세 조회
 */
export const getFormDetails = async (
  formId: string,
  userId: string
): Promise<ApiResponse<FormWithDetails>> => {
  try {
    const { data: form, error: formError } = await supabaseAdmin
      .from("forms")
      .select(
        `
        *,
        users!forms_creator_id_fkey (name, nickname),
        form_questions (*)
      `
      )
      .eq("id", formId)
      .single();

    if (formError || !form) {
      return { success: false, error: "폼을 찾을 수 없습니다." };
    }

    // 그룹 멤버 확인
    const { data: memberCheck } = await supabaseAdmin
      .from("group_member")
      .select("id")
      .eq("group_id", form.group_id || "")
      .eq("user_id", userId)
      .single();

    if (!memberCheck) {
      return { success: false, error: "접근 권한이 없습니다." };
    }

    // getForms와 동일한 로직으로 상세 정보 구성
    const formsResult = await getForms(form.group_id || "", userId, { title: form.title });

    if (!formsResult.success || !formsResult.data) {
      return { success: false, error: "폼 상세 정보 조회에 실패했습니다." };
    }

    const formDetail = formsResult.data.find((f) => f.id === formId);
    if (!formDetail) {
      return { success: false, error: "폼을 찾을 수 없습니다." };
    }

    return { success: true, data: formDetail };
  } catch (error) {
    console.error("Get form details error:", error);
    return { success: false, error: "폼 상세 조회 중 오류가 발생했습니다." };
  }
};

/**
 * 폼 생성
 */
export const createForm = async (
  userId: string,
  formData: CreateFormRequest
): Promise<ApiResponse<Form>> => {
  try {
    // 그룹 멤버 확인
    const { data: memberCheck } = await supabaseAdmin
      .from("group_member")
      .select("group_roles (can_create_form)")
      .eq("group_id", formData.groupId)
      .eq("user_id", userId)
      .single();

    if (!memberCheck || !memberCheck.group_roles?.can_create_form) {
      return { success: false, error: "폼 생성 권한이 없습니다." };
    }

    // 폼 생성
    const { data: form, error: formError } = await supabaseAdmin
      .from("forms")
      .insert({
        title: formData.title,
        description: formData.description,
        group_id: formData.groupId,
        creator_id: userId,
        status: "draft",
      })
      .select()
      .single();

    if (formError || !form) {
      console.error("Form creation error:", formError);
      return { success: false, error: "폼 생성에 실패했습니다." };
    }

    // 질문 생성
    for (const questionData of formData.questions) {
      // 기본 질문 생성
      const { data: question, error: questionError } = await supabaseAdmin
        .from("form_questions")
        .insert({
          form_id: form.id,
          question_type: questionData.questionType,
          question_text: questionData.questionText,
          is_required: questionData.isRequired,
          order_index: questionData.orderIndex,
          group_roles_id: questionData.groupRolesId,
        })
        .select()
        .single();

      if (questionError || !question) {
        console.error("Question creation error:", questionError);
        continue;
      }

      // 질문 타입별 추가 데이터 생성
      switch (questionData.questionType) {
        case "exam":
          if (questionData.examConfig) {
            await supabaseAdmin.from("exam_questions").insert({
              question_id: question.id,
              concept_template_id: questionData.examConfig.conceptTemplateId,
              total_questions: questionData.examConfig.totalQuestions,
            });
          }
          break;

        case "rating":
          if (questionData.ratingConfig) {
            await supabaseAdmin.from("rating_questions").insert({
              question_id: question.id,
              rating_max: questionData.ratingConfig.ratingMax,
              rating_step: questionData.ratingConfig.ratingStep,
            });
          }
          break;

        case "choice":
          if (questionData.choiceConfig) {
            // 선택형 질문 기본 정보 생성
            await supabaseAdmin.from("choice_questions").insert({
              question_id: question.id,
              is_multiple: questionData.choiceConfig.isMultiple,
              etc_option_enabled: questionData.choiceConfig.etcOptionEnabled || false,
            });

            // 선택지 옵션들 생성
            for (let i = 0; i < questionData.choiceConfig.options.length; i++) {
              await supabaseAdmin.from("choice_options").insert({
                question_id: question.id,
                option_text: questionData.choiceConfig.options[i],
                order_index: i,
              });
            }
          }
          break;
      }
    }

    // 알림 생성
    await createNotification({
      target_id: userId,
      creator_id: userId,
      group_id: formData.groupId,
      related_id: form.id,
      type: "form_created",
      title: "폼이 생성되었습니다",
      content: `"${formData.title}" 폼이 성공적으로 생성되었습니다.`,
      action_url: `/forms/${form.id}`,
    });

    return { success: true, data: form };
  } catch (error) {
    console.error("Create form error:", error);
    return { success: false, error: "폼 생성 중 오류가 발생했습니다." };
  }
};

/**
 * 폼 수정
 */
export const updateForm = async (
  formId: string,
  userId: string,
  updateData: UpdateFormRequest
): Promise<ApiResponse<Form>> => {
  try {
    // 권한 확인 (작성자인지 확인)
    const { data: form, error: fetchError } = await supabaseAdmin
      .from("forms")
      .select("creator_id, group_id, status")
      .eq("id", formId)
      .single();

    if (fetchError || !form) {
      return { success: false, error: "폼을 찾을 수 없습니다." };
    }

    if (form.creator_id !== userId) {
      return { success: false, error: "수정 권한이 없습니다." };
    }

    if (form.status === "published") {
      return { success: false, error: "발행된 폼은 수정할 수 없습니다." };
    }

    // 폼 업데이트
    const { data: updatedForm, error: updateError } = await supabaseAdmin
      .from("forms")
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", formId)
      .select()
      .single();

    if (updateError) {
      console.error("Update form error:", updateError);
      return { success: false, error: "폼 수정에 실패했습니다." };
    }

    return { success: true, data: updatedForm };
  } catch (error) {
    console.error("Update form error:", error);
    return { success: false, error: "폼 수정 중 오류가 발생했습니다." };
  }
};

/**
 * 폼 복제
 */
export const duplicateForm = async (formId: string, userId: string): Promise<ApiResponse<Form>> => {
  try {
    // 원본 폼 조회
    const { data: originalForm, error: fetchError } = await supabaseAdmin
      .from("forms")
      .select(
        `
        *,
        form_questions (*)
      `
      )
      .eq("id", formId)
      .single();

    if (fetchError || !originalForm) {
      return { success: false, error: "원본 폼을 찾을 수 없습니다." };
    }

    // 권한 확인
    const { data: memberCheck } = await supabaseAdmin
      .from("group_member")
      .select("group_roles (can_create_form)")
      .eq("group_id", originalForm.group_id || "")
      .eq("user_id", userId)
      .single();

    if (!memberCheck || !memberCheck.group_roles?.can_create_form) {
      return { success: false, error: "폼 생성 권한이 없습니다." };
    }

    // 새 폼 생성
    const { data: newForm, error: createError } = await supabaseAdmin
      .from("forms")
      .insert({
        title: `${originalForm.title} [복사본]`,
        description: originalForm.description,
        group_id: originalForm.group_id,
        creator_id: userId,
        status: "draft",
      })
      .select()
      .single();

    if (createError || !newForm) {
      console.error("Duplicate form error:", createError);
      return { success: false, error: "폼 복제에 실패했습니다." };
    }

    // 질문 복제
    for (const question of originalForm.form_questions || []) {
      const { data: newQuestion, error: questionError } = await supabaseAdmin
        .from("form_questions")
        .insert({
          form_id: newForm.id,
          question_type: question.question_type,
          question_text: question.question_text,
          is_required: question.is_required,
          order_index: question.order_index,
          group_roles_id: question.group_roles_id,
        })
        .select()
        .single();

      if (questionError || !newQuestion) {
        console.error("Question duplication error:", questionError);
        continue;
      }

      // 질문 타입별 추가 데이터 복제
      switch (question.question_type) {
        case "exam":
          const { data: examData } = await supabaseAdmin
            .from("exam_questions")
            .select("*")
            .eq("question_id", question.id)
            .single();

          if (examData) {
            await supabaseAdmin.from("exam_questions").insert({
              question_id: newQuestion.id,
              concept_template_id: examData.concept_template_id,
              total_questions: examData.total_questions,
            });
          }
          break;

        case "rating":
          const { data: ratingData } = await supabaseAdmin
            .from("rating_questions")
            .select("*")
            .eq("question_id", question.id)
            .single();

          if (ratingData) {
            await supabaseAdmin.from("rating_questions").insert({
              question_id: newQuestion.id,
              rating_max: ratingData.rating_max,
              rating_step: ratingData.rating_step,
            });
          }
          break;

        case "choice":
          const { data: choiceData } = await supabaseAdmin
            .from("choice_questions")
            .select("*")
            .eq("question_id", question.id)
            .single();

          if (choiceData) {
            await supabaseAdmin.from("choice_questions").insert({
              question_id: newQuestion.id,
              is_multiple: choiceData.is_multiple,
              etc_option_enabled: choiceData.etc_option_enabled,
            });
          }

          // 선택지 옵션들 복제
          const { data: choiceOptions } = await supabaseAdmin
            .from("choice_options")
            .select("*")
            .eq("question_id", question.id)
            .order("order_index");

          if (choiceOptions) {
            for (const option of choiceOptions) {
              await supabaseAdmin.from("choice_options").insert({
                question_id: newQuestion.id,
                option_text: option.option_text,
                order_index: option.order_index,
              });
            }
          }
          break;
      }
    }

    return { success: true, data: newForm };
  } catch (error) {
    console.error("Duplicate form error:", error);
    return { success: false, error: "폼 복제 중 오류가 발생했습니다." };
  }
};

/**
 * 폼 전송
 */
export const sendForm = async (
  userId: string,
  sendData: SendFormRequest
): Promise<ApiResponse<void>> => {
  try {
    // 폼 권한 확인
    const { data: form, error: formError } = await supabaseAdmin
      .from("forms")
      .select("creator_id, group_id, status, title")
      .eq("id", sendData.formId)
      .single();

    if (formError || !form) {
      return { success: false, error: "폼을 찾을 수 없습니다." };
    }

    if (form.creator_id !== userId) {
      return { success: false, error: "전송 권한이 없습니다." };
    }

    // 폼 상태 업데이트 (발행됨)
    await supabaseAdmin
      .from("forms")
      .update({
        status: "published",
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", sendData.formId);

    // 타겟 생성 및 보고서 생성
    for (const target of sendData.targets) {
      await supabaseAdmin.from("form_targets").insert({
        form_id: sendData.formId,
        target_id: target.id,
        target_type: target.type,
      });

      // 보고서 생성 (응답 연결 전 상태)
      await supabaseAdmin.from("reports").insert({
        form_id: sendData.formId,
        student_name:
          target.type === "individual"
            ? (
                await supabaseAdmin.from("users").select("name").eq("id", target.id).single()
              )?.data?.name
            : null,
        class_name:
          target.type === "class"
            ? (
                await supabaseAdmin.from("classes").select("name").eq("id", target.id).single()
              )?.data?.name
            : null,
        stage: 1,
      });
    }

    // 알림 생성 (타겟들에게)
    for (const target of sendData.targets) {
      if (target.type === "class") {
        // 반 멤버들에게 알림
        const { data: classMembers } = await supabaseAdmin
          .from("class_members")
          .select("user_id")
          .eq("class_id", target.id);

        for (const member of classMembers || []) {
          await createNotification({
            target_id: member.user_id,
            creator_id: userId,
            group_id: form.group_id,
            related_id: sendData.formId,
            type: "form_sent",
            title: "새 폼이 전송되었습니다",
            content: sendData.message || "새로운 폼이 전송되었습니다. 확인해주세요.",
            action_url: `/forms/${sendData.formId}/respond`,
          });
        }
      } else {
        // 개별 학생에게 알림
        await createNotification({
          target_id: target.id,
          creator_id: userId,
          group_id: form.group_id,
          related_id: sendData.formId,
          type: "form_sent",
          title: "새 폼이 전송되었습니다",
          content: sendData.message || "새로운 폼이 전송되었습니다. 확인해주세요.",
          action_url: `/forms/${sendData.formId}/respond`,
        });
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Send form error:", error);
    return { success: false, error: "폼 전송 중 오류가 발생했습니다." };
  }
};

/**
 * 폼 응답 제출
 */
export const submitFormResponse = async (
  userId: string,
  responseData: SubmitFormResponseRequest
): Promise<ApiResponse<FormResponse>> => {
  try {
    // 타겟 확인 (학생이 해당 폼의 대상인지)
    const { data: target, error: targetError } = await supabaseAdmin
      .from("form_targets")
      .select("*")
      .eq("form_id", responseData.formId)
      .or(`target_id.eq.${responseData.studentId}`)
      .single();

    if (targetError || !target) {
      // 반 멤버인지 확인
      const { data: classMember } = await supabaseAdmin
        .from("class_members")
        .select("class_id")
        .eq("user_id", responseData.studentId);

      const classIds = classMember?.map((cm) => cm.class_id);
      if (!classIds?.length) {
        return { success: false, error: "응답 권한이 없습니다." };
      }

      const { data: classTarget } = await supabaseAdmin
        .from("form_targets")
        .select("*")
        .eq("form_id", responseData.formId)
        .eq("target_type", "class")
        .in("target_id", classIds)
        .single();

      if (!classTarget) {
        return { success: false, error: "응답 권한이 없습니다." };
      }
    }

    // 기존 응답 확인
    const { data: existingResponse } = await supabaseAdmin
      .from("form_responses")
      .select("id")
      .eq("form_id", responseData.formId)
      .eq("student_id", responseData.studentId)
      .single();

    let formResponse: FormResponse;

    if (existingResponse) {
      // 기존 응답 업데이트
      const { data: updatedResponse, error: updateError } = await supabaseAdmin
        .from("form_responses")
        .update({
          status: responseData.status,
          submitted_at: responseData.status === "submitted" ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingResponse.id)
        .select()
        .single();

      if (updateError) {
        console.error("Update response error:", updateError);
        return { success: false, error: "응답 업데이트에 실패했습니다." };
      }

      formResponse = updatedResponse;

      // 기존 질문 응답 삭제
      await supabaseAdmin
        .from("form_question_responses")
        .delete()
        .eq("form_response_id", existingResponse.id);
    } else {
      // 새 응답 생성
      const { data: newResponse, error: createError } = await supabaseAdmin
        .from("form_responses")
        .insert({
          form_id: responseData.formId,
          student_id: responseData.studentId,
          class_id: responseData.classId,
          status: responseData.status,
          submitted_at: responseData.status === "submitted" ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (createError) {
        console.error("Create response error:", createError);
        return { success: false, error: "응답 생성에 실패했습니다." };
      }

      formResponse = newResponse;
    }

    // 질문별 응답 저장
    for (const response of responseData.responses) {
      await supabaseAdmin.from("form_question_responses").insert({
        form_response_id: formResponse.id,
        question_id: response.questionId,
        text_response: response.textResponse,
        number_response: response.numberResponse,
        rating_response: response.ratingResponse,
        exam_response: response.examResponse,
      });
    }

    // 제출 완료 시 보고서 연결
    if (responseData.status === "submitted") {
      await supabaseAdmin
        .from("reports")
        .update({
          form_response_id: formResponse.id,
          updated_at: new Date().toISOString(),
        })
        .eq("form_id", responseData.formId)
        .eq(
          "student_name",
          (
            await supabaseAdmin
              .from("users")
              .select("name")
              .eq("id", responseData.studentId)
              .single()
          )?.data?.name
        );

      // 폼 작성자에게 알림
      const { data: form } = await supabaseAdmin
        .from("forms")
        .select("creator_id, group_id, title")
        .eq("id", responseData.formId)
        .single();

      if (form) {
        await createNotification({
          target_id: form.creator_id,
          creator_id: userId,
          group_id: form.group_id,
          related_id: responseData.formId,
          type: "form_response_submitted",
          title: "폼 응답이 제출되었습니다",
          content: `"${form.title}" 폼에 새로운 응답이 제출되었습니다.`,
          action_url: `/forms/${responseData.formId}/responses`,
        });
      }
    }

    return { success: true, data: formResponse };
  } catch (error) {
    console.error("Submit response error:", error);
    return { success: false, error: "응답 제출 중 오류가 발생했습니다." };
  }
};

/**
 * 폼 삭제
 */
export const deleteForm = async (formId: string, userId: string): Promise<ApiResponse<void>> => {
  try {
    // 권한 확인
    const { data: form, error: fetchError } = await supabaseAdmin
      .from("forms")
      .select("creator_id, group_id, status")
      .eq("id", formId)
      .single();

    if (fetchError || !form) {
      return { success: false, error: "폼을 찾을 수 없습니다." };
    }

    // 삭제 권한 확인 (작성자이거나 삭제 권한이 있는 역할)
    const { data: memberCheck } = await supabaseAdmin
      .from("group_member")
      .select("group_roles (can_delete_form)")
      .eq("group_id", form.group_id || "")
      .eq("user_id", userId)
      .single();

    const canDelete = form.creator_id === userId || memberCheck?.group_roles?.can_delete_form;

    if (!canDelete) {
      return { success: false, error: "삭제 권한이 없습니다." };
    }

    if (form.status === "published") {
      return { success: false, error: "발행된 폼은 삭제할 수 없습니다." };
    }

    // 폼 삭제 (CASCADE로 관련 데이터 자동 삭제됨)
    const { error: deleteError } = await supabaseAdmin.from("forms").delete().eq("id", formId);

    if (deleteError) {
      console.error("Delete form error:", deleteError);
      return { success: false, error: "폼 삭제에 실패했습니다." };
    }

    return { success: true };
  } catch (error) {
    console.error("Delete form error:", error);
    return { success: false, error: "폼 삭제 중 오류가 발생했습니다." };
  }
};

/**
 * 개념 템플릿 목록 조회
 */
export const getConceptTemplates = async (
  groupId: string,
  userId: string
): Promise<ApiResponse<ExamConceptTemplate[]>> => {
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

    const { data: templates, error } = await supabaseAdmin
      .from("exam_concept_templates")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get concept templates error:", error);
      return { success: false, error: "개념 템플릿 조회에 실패했습니다." };
    }

    return { success: true, data: templates || [] };
  } catch (error) {
    console.error("Get concept templates error:", error);
    return { success: false, error: "개념 템플릿 조회 중 오류가 발생했습니다." };
  }
};

/**
 * 질문 수정
 */
export const updateFormQuestion = async (
  questionId: string,
  userId: string,
  updateData: UpdateQuestionRequest
): Promise<ApiResponse<FormQuestion>> => {
  try {
    // 권한 확인
    const { data: question, error: questionError } = await supabaseAdmin
      .from("form_questions")
      .select(
        `
        *,
        forms!form_questions_form_id_fkey (creator_id, status)
      `
      )
      .eq("id", questionId)
      .single();

    if (questionError || !question) {
      return { success: false, error: "질문을 찾을 수 없습니다." };
    }

    // 수정 권한 확인
    if (question.forms?.creator_id !== userId) {
      return { success: false, error: "수정 권한이 없습니다." };
    }

    if (question.forms?.status === "published") {
      return { success: false, error: "발행된 폼의 질문은 수정할 수 없습니다." };
    }

    // 질문 업데이트
    const { data: updatedQuestion, error: updateError } = await supabaseAdmin
      .from("form_questions")
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", questionId)
      .select()
      .single();

    if (updateError) {
      console.error("Update question error:", updateError);
      return { success: false, error: "질문 수정에 실패했습니다." };
    }

    return { success: true, data: updatedQuestion };
  } catch (error) {
    console.error("Update question error:", error);
    return { success: false, error: "질문 수정 중 오류가 발생했습니다." };
  }
};
