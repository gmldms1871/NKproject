import { supabaseAdmin } from "./supabase";
import { Database } from "./types/types";
import { createNotification } from "./notifications";

// 데이터베이스 타입 import
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

type FormTag = Database["public"]["Tables"]["form_tags"]["Row"];
type FormTagInsert = Database["public"]["Tables"]["form_tags"]["Insert"];
type FormTagUpdate = Database["public"]["Tables"]["form_tags"]["Update"];

type FormTagLink = Database["public"]["Tables"]["form_tag_links"]["Row"];
type FormTagLinkInsert = Database["public"]["Tables"]["form_tag_links"]["Insert"];

type ExamConceptTemplate = Database["public"]["Tables"]["exam_concept_templates"]["Row"];
type ExamConceptTemplateInsert = Database["public"]["Tables"]["exam_concept_templates"]["Insert"];
type ExamConceptTemplateUpdate = Database["public"]["Tables"]["exam_concept_templates"]["Update"];

type ExamQuestion = Database["public"]["Tables"]["exam_questions"]["Row"];
type ExamQuestionInsert = Database["public"]["Tables"]["exam_questions"]["Insert"];

type RatingQuestion = Database["public"]["Tables"]["rating_questions"]["Row"];
type RatingQuestionInsert = Database["public"]["Tables"]["rating_questions"]["Insert"];

type ChoiceQuestion = Database["public"]["Tables"]["choice_questions"]["Row"];
type ChoiceQuestionInsert = Database["public"]["Tables"]["choice_questions"]["Insert"];

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
  title: string;
  description?: string;
  groupId: string;
  creatorId: string;
  status?: "draft" | "active";
}

export interface UpdateFormRequest {
  title?: string;
  description?: string;
  status?: "draft" | "active" | "closed";
}

export interface CreateQuestionRequest {
  questionType: "text" | "rating" | "choice" | "exam";
  questionText: string;
  isRequired: boolean;
  orderIndex: number;
  textConfig?: {
    subtype: "text" | "textarea";
    maxLength?: number;
  };
  ratingConfig?: {
    ratingMax: number;
    ratingStep: number;
  };
  choiceConfig?: {
    options: string[];
    multiple: boolean;
    allowOther?: boolean;
  };
  examConfig?: {
    conceptTemplateId?: string;
    totalQuestions?: number;
  };
}

export interface ReorderQuestionsRequest {
  questionOrders: {
    questionId: string;
    newOrderIndex: number;
  }[];
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
    examResponse?: Database["public"]["Tables"]["form_question_responses"]["Row"]["exam_response"];
  }[];
}

export interface FormSearchConditions {
  title?: string;
  creatorId?: string;
  groupId?: string;
  tags?: string[];
  status?: string[];
  createdAfter?: string;
  createdBefore?: string;
}

export interface UpdateFormAssignmentRequest {
  formId: string;
  timeTeacherId?: string;
  teacherId?: string;
}

export interface DuplicateFormRequest {
  formId: string;
  userId: string;
  newTitle?: string; // 지정하지 않으면 원본 제목 + " [복사본]"
}

export interface CreateConceptTemplateRequest {
  name: string;
  groupId: string;
  creatorId: string;
  conceptCount: number;
  status?: "draft" | "published";
}

export interface UpdateConceptTemplateRequest {
  name?: string;
  conceptCount?: number;
  status?: "draft" | "published";
}

export interface LinkConceptTemplateRequest {
  questionId: string;
  conceptTemplateId: string;
}

// ===== 응답 타입 정의 =====

export interface FormWithDetails {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
  sent_at: string | null;
  creator_id: string | null;
  group_id: string | null;
  // 연결된 정보
  creator: {
    id: string;
    name: string;
    nickname: string;
  } | null;
  questions: QuestionWithDetails[];
  tags: FormTag[];
  targets: FormTargetWithDetails[];
  responses: FormResponseSummary[];
  // 진행률 정보
  totalTargets: number;
  completedResponses: number;
  progressRate: number;
  // 담당자 정보
  timeTeacher?: {
    id: string;
    name: string;
    nickname: string;
  };
  teacher?: {
    id: string;
    name: string;
    nickname: string;
  };
}

export interface QuestionWithDetails {
  id: string;
  question_type: string;
  question_text: string;
  is_required: boolean | null;
  order_index: number;
  form_id: string | null;
  group_roles_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  // 타입별 상세 정보
  examDetails?: {
    concept_template_id: string | null;
    total_questions: number;
    conceptTemplate?: ExamConceptTemplate;
  };
  ratingDetails?: RatingQuestion;
  choiceDetails?: ChoiceQuestion;
}

export interface FormTargetWithDetails {
  id: string;
  form_id: string | null;
  target_type: string;
  target_id: string;
  created_at: string | null;
  targetInfo: {
    id: string;
    name: string;
    type: "class" | "individual";
    memberCount?: number;
  };
}

export interface FormResponseSummary {
  id: string;
  student_id: string | null;
  student_name: string | null;
  class_id: string | null;
  class_name: string | null;
  status: string;
  submitted_at: string | null;
  responder_type: string | null;
}

export interface FormStatistics {
  totalForms: number;
  activeForms: number;
  draftForms: number;
  closedForms: number;
  totalResponses: number;
  completionRate: number;
  responsesByDate: {
    date: string;
    count: number;
  }[];
}

// ===== 폼 관리 함수들 =====

/**
 * 폼 생성
 */
export async function createForm(request: CreateFormRequest): Promise<ApiResponse<string>> {
  try {
    const { data: form, error } = await supabaseAdmin
      .from("forms")
      .insert({
        title: request.title,
        description: request.description,
        group_id: request.groupId,
        creator_id: request.creatorId,
        status: request.status || "draft",
      })
      .select()
      .single();

    if (error) throw error;

    // 폼 생성 알림
    await createNotification({
      target_id: request.creatorId,
      creator_id: null,
      type: "form_created",
      title: "새 폼이 생성되었습니다",
      content: `폼 "${request.title}"이 생성되었습니다.`,
      action_url: `/forms/${form.id}`,
      related_id: form.id,
      is_read: false,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    return { success: true, data: form.id };
  } catch (error) {
    console.error("Error creating form:", error);
    return { success: false, error: "폼 생성 중 오류가 발생했습니다." };
  }
}

/**
 * 폼 수정
 */
export async function updateForm(
  formId: string,
  request: UpdateFormRequest
): Promise<ApiResponse<boolean>> {
  try {
    const updates: Partial<FormUpdate> = {};
    if (request.title) updates.title = request.title;
    if (request.description !== undefined) updates.description = request.description;
    if (request.status) updates.status = request.status;
    updates.updated_at = new Date().toISOString();

    const { error } = await supabaseAdmin.from("forms").update(updates).eq("id", formId);

    if (error) throw error;

    return { success: true, data: true };
  } catch (error) {
    console.error("Error updating form:", error);
    return { success: false, error: "폼 수정 중 오류가 발생했습니다." };
  }
}

/**
 * 폼 삭제
 */
export async function deleteForm(formId: string, userId: string): Promise<ApiResponse<boolean>> {
  try {
    // 권한 확인
    const { data: form, error: checkError } = await supabaseAdmin
      .from("forms")
      .select("creator_id")
      .eq("id", formId)
      .single();

    if (checkError) throw checkError;
    if (form.creator_id !== userId) {
      return { success: false, error: "폼을 삭제할 권한이 없습니다." };
    }

    // 폼 삭제 (cascade로 연관 데이터도 삭제)
    const { error } = await supabaseAdmin.from("forms").delete().eq("id", formId);

    if (error) throw error;

    return { success: true, data: true };
  } catch (error) {
    console.error("Error deleting form:", error);
    return { success: false, error: "폼 삭제 중 오류가 발생했습니다." };
  }
}

/**
 * 폼 응답을 위한 폼 정보 조회
 */
export async function getFormForResponse(
  formId: string,
  userId: string
): Promise<ApiResponse<FormWithDetails>> {
  try {
    const { data: form, error } = await supabaseAdmin
      .from("forms")
      .select(
        `
        *,
        form_questions(*),
        creator:users!forms_creator_id_fkey(id, name, nickname)
      `
      )
      .eq("id", formId)
      .single();

    if (error) throw error;
    if (!form) return { success: false, error: "폼을 찾을 수 없습니다." };

    // 간단한 형태로 변환
    const formWithDetails: FormWithDetails = {
      id: form.id,
      title: form.title,
      description: form.description,
      status: form.status,
      created_at: form.created_at,
      updated_at: form.updated_at,
      sent_at: form.sent_at,
      creator_id: form.creator_id,
      group_id: form.group_id,
      creator: form.creator,
      questions:
        form.form_questions?.map((q: any) => ({
          id: q.id,
          question_type: q.question_type,
          question_text: q.question_text,
          is_required: q.is_required,
          order_index: q.order_index,
          form_id: q.form_id,
          group_roles_id: q.group_roles_id,
          created_at: q.created_at,
          updated_at: q.updated_at,
        })) || [],
      tags: [],
      targets: [],
      responses: [],
      totalTargets: 0,
      completedResponses: 0,
      progressRate: 0,
    };

    return { success: true, data: formWithDetails };
  } catch (error) {
    console.error("Error getting form for response:", error);
    return { success: false, error: "폼 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 임시저장 응답 저장
 */
export async function saveDraftResponse(
  formId: string,
  userId: string,
  responses: Record<string, any>
): Promise<ApiResponse<boolean>> {
  try {
    // 기존 임시저장 확인
    const { data: existing } = await supabaseAdmin
      .from("form_responses")
      .select("id")
      .eq("form_id", formId)
      .eq("student_id", userId)
      .eq("status", "draft")
      .single();

    if (existing) {
      // 업데이트
      const { error } = await supabaseAdmin
        .from("form_responses")
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) throw error;
    } else {
      // 새로 생성
      const { error } = await supabaseAdmin.from("form_responses").insert({
        form_id: formId,
        student_id: userId,
        status: "draft",
      });

      if (error) throw error;
    }

    return { success: true, data: true };
  } catch (error) {
    console.error("Error saving draft response:", error);
    return { success: false, error: "임시저장 중 오류가 발생했습니다." };
  }
}

/**
 * 폼 상세 정보 조회
 */
export async function getFormDetails(formId: string): Promise<ApiResponse<FormWithDetails>> {
  try {
    const { data: form, error } = await supabaseAdmin
      .from("forms")
      .select(
        `
        *,
        creator:users!forms_creator_id_fkey(id, name, nickname),
        form_questions(
          *,
          exam_questions(*,
            exam_concept_templates(*)
          ),
          rating_questions(*),
          choice_questions(*)
        ),
        form_tag_links(
          form_tags(*)
        ),
        form_targets(*),
        form_responses(id, status, submitted_at, student_id, student_name, class_id, class_name)
      `
      )
      .eq("id", formId)
      .single();

    if (error) throw error;
    if (!form) {
      return { success: false, error: "폼을 찾을 수 없습니다." };
    }

    // 질문 상세 정보 처리
    const questionsWithDetails: QuestionWithDetails[] = [];
    if (form.form_questions) {
      for (const question of form.form_questions) {
        const questionDetail: QuestionWithDetails = {
          id: question.id,
          question_type: question.question_type,
          question_text: question.question_text,
          is_required: question.is_required,
          order_index: question.order_index,
          form_id: question.form_id,
          group_roles_id: question.group_roles_id,
          created_at: question.created_at,
          updated_at: question.updated_at,
        };

        // 타입별 상세 정보 추가
        if (question.question_type === "exam" && question.exam_questions) {
          questionDetail.examDetails = {
            concept_template_id: question.exam_questions[0]?.concept_template_id || null,
            total_questions: question.exam_questions[0]?.total_questions || 0,
            conceptTemplate: question.exam_questions[0]?.exam_concept_templates || undefined,
          };
        } else if (question.question_type === "rating" && question.rating_questions) {
          questionDetail.ratingDetails = question.rating_questions[0];
        } else if (question.question_type === "choice" && question.choice_questions) {
          questionDetail.choiceDetails = question.choice_questions[0];
        }

        questionsWithDetails.push(questionDetail);
      }
    }

    // 타겟 상세 정보 처리
    const targetsWithDetails: FormTargetWithDetails[] = [];
    if (form.form_targets) {
      for (const target of form.form_targets) {
        let targetInfo;

        if (target.target_type === "class") {
          // 클래스 정보 조회
          const { data: classData } = await supabaseAdmin
            .from("classes")
            .select("id, name, class_members(count)")
            .eq("id", target.target_id)
            .single();

          targetInfo = {
            id: classData?.id || target.target_id,
            name: classData?.name || "Unknown Class",
            type: "class" as const,
            memberCount: classData?.class_members?.length || 0,
          };
        } else {
          // 개별 사용자 정보 조회
          const { data: userData } = await supabaseAdmin
            .from("users")
            .select("id, name, nickname")
            .eq("id", target.target_id)
            .single();

          targetInfo = {
            id: userData?.id || target.target_id,
            name: userData?.name || userData?.nickname || "Unknown User",
            type: "individual" as const,
          };
        }

        targetsWithDetails.push({
          ...target,
          targetInfo,
        });
      }
    }

    // 응답 통계 계산
    const totalTargets = targetsWithDetails.reduce((sum, target) => {
      return sum + (target.targetInfo.memberCount || 1);
    }, 0);

    const completedResponses =
      form.form_responses?.filter((response: any) => response.status === "completed").length || 0;

    const formWithDetails: FormWithDetails = {
      id: form.id,
      title: form.title,
      description: form.description,
      status: form.status,
      created_at: form.created_at,
      updated_at: form.updated_at,
      sent_at: form.sent_at,
      creator_id: form.creator_id,
      group_id: form.group_id,
      creator: form.creator,
      questions: questionsWithDetails.sort((a, b) => a.order_index - b.order_index),
      tags:
        form.form_tag_links
          ?.map((link: { form_tags: FormTag }) => link.form_tags)
          .filter(Boolean) || [],
      targets: targetsWithDetails,
      responses: (form.form_responses || []).map((response: any) => ({
        ...response,
        responder_type: response.responder_type ?? null,
      })),
      totalTargets,
      completedResponses,
      progressRate: totalTargets > 0 ? (completedResponses / totalTargets) * 100 : 0,
    };

    return { success: true, data: formWithDetails };
  } catch (error) {
    console.error("Error fetching form details:", error);
    return { success: false, error: "폼 상세 정보 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 폼 응답 조회 (기존 getFormResponses 함수)
 */
export async function getFormResponses(
  formId: string
): Promise<ApiResponse<FormResponseSummary[]>> {
  try {
    const { data: responses, error } = await supabaseAdmin
      .from("form_responses")
      .select("*")
      .eq("form_id", formId)
      .order("submitted_at", { ascending: false });

    if (error) throw error;

    return { success: true, data: responses || [] };
  } catch (error) {
    console.error("Error fetching form responses:", error);
    return { success: false, error: "폼 응답 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 질문 생성
 */
export async function createQuestion(
  formId: string,
  request: CreateQuestionRequest
): Promise<ApiResponse<string>> {
  try {
    // 기본 질문 생성
    const { data: question, error: questionError } = await supabaseAdmin
      .from("form_questions")
      .insert({
        form_id: formId,
        question_type: request.questionType,
        question_text: request.questionText,
        is_required: request.isRequired,
        order_index: request.orderIndex,
      })
      .select()
      .single();

    if (questionError) throw questionError;

    // 타입별 추가 정보 저장
    if (request.questionType === "rating" && request.ratingConfig) {
      const { error: ratingError } = await supabaseAdmin.from("rating_questions").insert({
        question_id: question.id,
        rating_max: request.ratingConfig.ratingMax,
        rating_step: request.ratingConfig.ratingStep,
      });

      if (ratingError) throw ratingError;
    } else if (request.questionType === "choice" && request.choiceConfig) {
      const { error: choiceError } = await supabaseAdmin.from("choice_questions").insert({
        question_id: question.id,
        options: request.choiceConfig.options,
        multiple_choice: request.choiceConfig.multiple,
        allow_other: request.choiceConfig.allowOther || false,
      });

      if (choiceError) throw choiceError;
    } else if (request.questionType === "exam" && request.examConfig) {
      const { error: examError } = await supabaseAdmin.from("exam_questions").insert({
        question_id: question.id,
        concept_template_id: request.examConfig.conceptTemplateId,
        total_questions: request.examConfig.totalQuestions || 10,
      });

      if (examError) throw examError;
    }

    return { success: true, data: question.id };
  } catch (error) {
    console.error("Error creating question:", error);
    return { success: false, error: "질문 생성 중 오류가 발생했습니다." };
  }
}

/**
 * 폼 응답 제출
 */
export async function submitFormResponse(
  request: SubmitFormResponseRequest
): Promise<ApiResponse<boolean>> {
  try {
    // 기존 응답 조회 또는 생성
    let formResponse;
    const { data: responseData, error: responseError } = await supabaseAdmin
      .from("form_responses")
      .select("*")
      .eq("form_id", request.formId)
      .eq("student_id", request.studentId)
      .single();

    if (responseError && responseError.code !== "PGRST116") {
      throw responseError;
    }

    formResponse = responseData;

    if (!formResponse) {
      // 새 응답 생성
      const { data: newResponse, error: newResponseError } = await supabaseAdmin
        .from("form_responses")
        .insert({
          form_id: request.formId,
          student_id: request.studentId,
          class_id: request.classId,
          status: "completed",
          submitted_at: new Date().toISOString(),
          responder_type: "student",
        })
        .select()
        .single();

      if (newResponseError) throw newResponseError;
      formResponse = newResponse;
    } else {
      // 기존 응답 업데이트
      const { error: updateError } = await supabaseAdmin
        .from("form_responses")
        .update({
          status: "completed",
          submitted_at: new Date().toISOString(),
        })
        .eq("id", formResponse.id);

      if (updateError) throw updateError;
    }

    // 기존 질문 응답 삭제
    const { error: deleteError } = await supabaseAdmin
      .from("form_question_responses")
      .delete()
      .eq("form_response_id", formResponse.id);

    if (deleteError) throw deleteError;

    // 새 질문 응답 삽입
    const questionResponses: FormQuestionResponseInsert[] = request.responses.map((response) => ({
      form_response_id: formResponse.id,
      question_id: response.questionId,
      text_response: response.textResponse,
      number_response: response.numberResponse,
      rating_response: response.ratingResponse,
      exam_response: response.examResponse,
    }));

    const { error: insertError } = await supabaseAdmin
      .from("form_question_responses")
      .insert(questionResponses);

    if (insertError) throw insertError;

    return { success: true, data: true };
  } catch (error) {
    console.error("Error submitting form response:", error);
    return { success: false, error: "폼 응답 제출 중 오류가 발생했습니다." };
  }
}

// ===== 폼 태그 관리 =====

/**
 * 폼 태그 생성
 */
export async function createFormTag(name: string): Promise<ApiResponse<string>> {
  try {
    const { data: tag, error } = await supabaseAdmin
      .from("form_tags")
      .insert({ name })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data: tag.id };
  } catch (error) {
    console.error("Error creating form tag:", error);
    return { success: false, error: "폼 태그 생성 중 오류가 발생했습니다." };
  }
}

/**
 * 폼 태그 수정
 */
export async function updateFormTag(tagId: string, name: string): Promise<ApiResponse<boolean>> {
  try {
    const { error } = await supabaseAdmin.from("form_tags").update({ name }).eq("id", tagId);

    if (error) throw error;

    return { success: true, data: true };
  } catch (error) {
    console.error("Error updating form tag:", error);
    return { success: false, error: "폼 태그 수정 중 오류가 발생했습니다." };
  }
}

/**
 * 폼 태그 삭제
 */
export async function deleteFormTag(tagId: string): Promise<ApiResponse<boolean>> {
  try {
    // 연결된 링크 먼저 삭제
    const { error: linkError } = await supabaseAdmin
      .from("form_tag_links")
      .delete()
      .eq("tag_id", tagId);

    if (linkError) throw linkError;

    // 태그 삭제
    const { error } = await supabaseAdmin.from("form_tags").delete().eq("id", tagId);

    if (error) throw error;

    return { success: true, data: true };
  } catch (error) {
    console.error("Error deleting form tag:", error);
    return { success: false, error: "폼 태그 삭제 중 오류가 발생했습니다." };
  }
}

/**
 * 폼 검색
 */
export async function searchForms(
  conditions: FormSearchConditions
): Promise<ApiResponse<FormWithDetails[]>> {
  try {
    let query = supabaseAdmin.from("forms").select(
      `
        *,
        creator:users!forms_creator_id_fkey(id, name, nickname),
        form_tag_links(form_tags(*)),
        form_targets(*),
        form_responses(id, status, submitted_at)
      `
    );

    if (conditions.title) {
      query = query.ilike("title", `%${conditions.title}%`);
    }

    if (conditions.creatorId) {
      query = query.eq("creator_id", conditions.creatorId);
    }

    if (conditions.groupId) {
      query = query.eq("group_id", conditions.groupId);
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

    const { data: forms, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;

    // 폼 상세 정보로 변환
    const formsWithDetails: FormWithDetails[] = (forms || []).map((form: any) => {
      const totalTargets = form.form_targets?.length || 0;
      const completedResponses =
        form.form_responses?.filter((response: any) => response.status === "completed").length || 0;

      return {
        id: form.id,
        title: form.title,
        description: form.description,
        status: form.status,
        created_at: form.created_at,
        updated_at: form.updated_at,
        sent_at: form.sent_at,
        creator_id: form.creator_id,
        group_id: form.group_id,
        creator: form.creator,
        questions: [],
        tags: form.form_tag_links?.map((link: any) => link.form_tags).filter(Boolean) || [],
        targets: form.form_targets || [],
        responses: form.form_responses || [],
        totalTargets,
        completedResponses,
        progressRate: totalTargets > 0 ? (completedResponses / totalTargets) * 100 : 0,
      };
    });

    return { success: true, data: formsWithDetails };
  } catch (error) {
    console.error("Error searching forms:", error);
    return { success: false, error: "폼 검색 중 오류가 발생했습니다." };
  }
}

/**
 * 모든 개념 템플릿 조회 (기존 exam_concept_templates 사용)
 */
export async function getAllConceptTemplates(
  groupId: string
): Promise<ApiResponse<ExamConceptTemplate[]>> {
  try {
    const { data: templates, error } = await supabaseAdmin
      .from("exam_concept_templates")
      .select(
        `
        *,
        exam_concept_template_items(*)
      `
      )
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return { success: true, data: templates || [] };
  } catch (error) {
    console.error("Error getting concept templates:", error);
    return { success: false, error: "개념 템플릿 조회 중 오류가 발생했습니다." };
  }
}
