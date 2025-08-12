import { supabaseAdmin } from "./supabase";
import { Database } from "./types/types";
import { createNotification } from "./notifications";
import { group } from "console";

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

type ExamConceptTemplateItem = Database["public"]["Tables"]["exam_concept_template_items"]["Row"];
type ExamConceptTemplateItemInsert =
  Database["public"]["Tables"]["exam_concept_template_items"]["Insert"];

type ExamQuestion = Database["public"]["Tables"]["exam_questions"]["Row"];
type ExamQuestionInsert = Database["public"]["Tables"]["exam_questions"]["Insert"];

type RatingQuestion = Database["public"]["Tables"]["rating_questions"]["Row"];
type RatingQuestionInsert = Database["public"]["Tables"]["rating_questions"]["Insert"];
type RatingQuestionUpdate = Database["public"]["Tables"]["rating_questions"]["Update"];

type ChoiceQuestion = Database["public"]["Tables"]["choice_questions"]["Row"];
type ChoiceQuestionInsert = Database["public"]["Tables"]["choice_questions"]["Insert"];
type ChoiceQuestionUpdate = Database["public"]["Tables"]["choice_questions"]["Update"];

type ChoiceOption = Database["public"]["Tables"]["choice_options"]["Row"];
type ChoiceOptionInsert = Database["public"]["Tables"]["choice_options"]["Insert"];

type User = Database["public"]["Tables"]["users"]["Row"];
type Class = Database["public"]["Tables"]["classes"]["Row"];
type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"];

type ExamConceptTemplateItemWithRelations = {
  id: string;
  template_id: string | null;
  concept_text: string;
  concept_description: string;
  order_index: number;
  created_at: string | null;
  updated_at: string | null;
};

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
  status?: "draft" | "save";
  isDraft?: boolean;
}

export interface UpdateFormRequest {
  title?: string;
  description?: string;
  status?: "draft" | "save" | "closed";
  isDraft?: boolean;
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

export interface UpdateQuestionRequest {
  questionText?: string;
  isRequired?: boolean;
  orderIndex?: number;
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
    type: "class" | "user";
    id: string;
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
  targetType?: "class" | "individual";
  targetId?: string;
}

export interface UpdateFormAssignmentRequest {
  formId: string;
  timeTeacherId?: string;
  teacherId?: string;
}

export interface DuplicateFormRequest {
  formId: string;
  userId: string;
  newTitle?: string;
}

export interface CreateConceptTemplateRequest {
  name: string;
  groupId: string;
  creatorId: string;
  conceptCount: number;
  status?: "draft" | "completed";
  isDraft?: boolean;
  conceptItems?: CreateConceptItemRequest[];
}

export interface UpdateConceptTemplateRequest {
  name?: string;
  conceptCount?: number;
  status?: "draft" | "completed";
  isDraft?: boolean;
  conceptItems?: UpdateConceptItemRequest[];
}

export interface CreateConceptItemRequest {
  conceptText: string;
  conceptDescription?: string;
  orderIndex: number;
}

export interface UpdateConceptItemRequest {
  id?: string;
  conceptText: string;
  conceptDescription?: string;
  orderIndex: number;
}

export interface LinkConceptTemplateRequest {
  questionId: string;
  conceptTemplateId: string;
}

export interface DuplicateConceptTemplateRequest {
  templateId: string;
  userId: string;
  newName?: string;
}

// ===== 응답 타입 정의 =====

interface FormQuestionWithJoins {
  id: string;
  question_type: string;
  question_text: string;
  is_required: boolean | null;
  order_index: number;
  form_id: string | null;
  group_roles_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  exam_questions?: {
    concept_template_id: string | null;
    total_questions: number;
    exam_concept_templates?: {
      id: string;
      name: string;
      group_id: string | null;
      creator_id: string | null;
      concept_count: number | null;
      status: string | null;
      created_at: string | null;
      updated_at: string | null;
      exam_concept_template_items?: Array<{
        id: string;
        template_id: string | null;
        concept_text: string;
        concept_description: string;
        order_index: number;
        created_at: string | null;
        updated_at: string | null;
      }>;
    };
  };
  rating_questions?: RatingQuestion;
  choice_questions?: ChoiceQuestion;
  choice_options?: ChoiceOption[];
}

export interface SupervisionInfo {
  supervisionId?: string;
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
  creator: {
    id: string;
    name: string;
    nickname: string;
  } | null;
  questions: QuestionWithDetails[];
  tags: FormTag[];
  targets: FormTargetWithDetails[];
  responses: FormResponseSummary[];
  totalTargets: number;
  completedResponses: number;
  progressRate: number;
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
  examDetails?: {
    concept_template_id: string | null;
    total_questions: number;
    conceptTemplate?: ConceptTemplateWithItems;
  };
  ratingDetails?: RatingQuestion;
  choiceDetails?: {
    question_id: string;
    is_multiple: boolean | null;
    etc_option_enabled: boolean | null;
    options: ChoiceOption[];
  };
  textDetails?: {
    subtype: "text" | "textarea";
    maxLength?: number;
  };
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
  saveForms: number;
  draftForms: number;
  closedForms: number;
  totalResponses: number;
  completionRate: number;
  responsesByDate: {
    date: string;
    count: number;
  }[];
}

export interface ConceptTemplateWithItems {
  id: string;
  name: string;
  group_id: string | null;
  concept_count: number | null;
  status: string | null;
  creator_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  creator?: {
    id: string;
    name: string;
    nickname: string;
  } | null;
  conceptItems: ConceptTemplateItem[];
  usageCount: number;
  lastUsedAt?: string | null;
}

export interface ConceptTemplateItem {
  id: string;
  template_id: string | null;
  concept_text: string;
  concept_description: string;
  order_index: number;
  created_at: string | null;
  updated_at: string | null;
}

// ===== 헬퍼 함수들 =====

/**
 * 질문 데이터 처리 헬퍼 함수
 */
function processQuestions(questions: FormQuestionWithJoins[]): QuestionWithDetails[] {
  if (!questions) return [];

  return questions
    .map((question) => {
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
        const examQuestion = question.exam_questions;
        questionDetail.examDetails = {
          concept_template_id: examQuestion.concept_template_id,
          total_questions: examQuestion.total_questions,
          conceptTemplate: examQuestion.exam_concept_templates
            ? {
                id: examQuestion.exam_concept_templates.id,
                name: examQuestion.exam_concept_templates.name,
                group_id: examQuestion.exam_concept_templates.group_id,
                creator_id: examQuestion.exam_concept_templates.creator_id,
                concept_count: examQuestion.exam_concept_templates.concept_count,
                status: examQuestion.exam_concept_templates.status,
                created_at: examQuestion.exam_concept_templates.created_at,
                updated_at: examQuestion.exam_concept_templates.updated_at,
                conceptItems: (
                  examQuestion.exam_concept_templates.exam_concept_template_items || []
                ).map((item: ExamConceptTemplateItemWithRelations) => ({
                  id: item.id,
                  template_id: item.template_id,
                  concept_text: item.concept_text,
                  concept_description: item.concept_description,
                  order_index: item.order_index,
                  created_at: item.created_at,
                  updated_at: item.updated_at,
                })),
                usageCount: 0,
              }
            : undefined,
        };
      } else if (question.question_type === "rating" && question.rating_questions) {
        questionDetail.ratingDetails = question.rating_questions;
      } else if (question.question_type === "choice") {
        const choiceQuestion = question.choice_questions;
        const choiceOptions = question.choice_options || [];

        if (choiceQuestion) {
          questionDetail.choiceDetails = {
            question_id: choiceQuestion.question_id,
            is_multiple: choiceQuestion.is_multiple,
            etc_option_enabled: choiceQuestion.etc_option_enabled,
            options: choiceOptions,
          };
        }
      } else if (question.question_type === "text") {
        questionDetail.textDetails = {
          subtype: question.question_text.includes("서술") ? "textarea" : "text",
          maxLength: 1000,
        };
      }

      return questionDetail;
    })
    .sort((a, b) => a.order_index - b.order_index);
}

// ===== 폼 관리 함수들 =====

/**
 * 그룹 내 폼 전체 조회
 */
export async function getGroupForms(
  groupId: string,
  conditions?: FormSearchConditions
): Promise<ApiResponse<FormWithDetails[]>> {
  try {
    let query = supabaseAdmin
      .from("forms")
      .select(
        `
        *,
        creator:users!forms_creator_id_fkey(id, name, nickname),
        form_questions(*),
        form_tag_links(
          form_tags(*)
        ),
        form_targets(*),
        form_responses(id, status, submitted_at, student_id, student_name, class_id, class_name, responder_type)
      `
      )
      .eq("group_id", groupId);

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

    const { data: forms, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;

    const formsWithDetails: FormWithDetails[] =
      forms?.map((form) => {
        const totalTargets = form.form_targets?.length || 0;
        const completedResponses =
          form.form_responses?.filter((r) => r.status === "submitted")?.length || 0;

        return {
          ...form,
          creator: form.creator || null,
          questions: [],
          tags: form.form_tag_links?.map((link) => link.form_tags).filter(Boolean) || [],
          targets:
            form.form_targets?.map((target) => ({
              ...target,
              targetInfo: {
                id: target.target_id,
                name: "Unknown",
                type: target.target_type as "class" | "individual",
              },
            })) || [],
          responses: form.form_responses || [],
          totalTargets,
          completedResponses,
          progressRate: totalTargets > 0 ? (completedResponses / totalTargets) * 100 : 0,
        };
      }) || [];

    return { success: true, data: formsWithDetails };
  } catch (error) {
    console.error("Error fetching group forms:", error);
    return { success: false, error: "그룹 폼 조회 중 오류가 발생했습니다." };
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
          exam_questions(
            *,
            exam_concept_templates(
              *,
              exam_concept_template_items(*)
            )
          ),
          rating_questions(*),
          choice_questions(*),
          choice_options(*)
        ),
        form_tag_links(
          form_tags(*)
        ),
        form_targets(*),
        form_responses(id, status, submitted_at, student_id, student_name, class_id, class_name, responder_type)
      `
      )
      .eq("id", formId)
      .single();

    if (error) throw error;
    if (!form) {
      return { success: false, error: "폼을 찾을 수 없습니다." };
    }

    const questionsWithDetails = processQuestions(form.form_questions as never);

    const targetsWithInfo: FormTargetWithDetails[] = (form.form_targets || []).map((target) => ({
      id: target.id,
      form_id: target.form_id,
      target_type: target.target_type,
      target_id: target.target_id,
      created_at: target.created_at,
      targetInfo: {
        id: target.target_id,
        name: "Unknown",
        type: target.target_type as "class" | "individual",
      },
    }));

    const totalTargets = targetsWithInfo.length;
    const completedResponses =
      form.form_responses?.filter((r) => r.status === "submitted").length || 0;
    const progressRate = totalTargets > 0 ? (completedResponses / totalTargets) * 100 : 0;

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
      creator: form.creator
        ? {
            id: form.creator.id,
            name: form.creator.name,
            nickname: form.creator.nickname,
          }
        : null,
      questions: questionsWithDetails,
      tags: form.form_tag_links?.map((link) => link.form_tags).filter(Boolean) || [],
      targets: targetsWithInfo,
      responses: form.form_responses || [],
      totalTargets,
      completedResponses,
      progressRate,
    };

    return { success: true, data: formWithDetails };
  } catch (error) {
    console.error("Error fetching form details:", error);
    return { success: false, error: "폼 상세 정보 조회 중 오류가 발생했습니다." };
  }
}

/**
 * Supervision 정보가 포함된 폼 상세 조회
 */
export async function getFormDetailsWithSupervision(
  formId: string
): Promise<ApiResponse<FormWithDetails & { supervisionInfo?: SupervisionInfo }>> {
  try {
    const { data: form, error } = await supabaseAdmin
      .from("forms")
      .select(
        `
        *,
        creator:users!forms_creator_id_fkey(id, name, nickname),
        form_questions(
          *,
          exam_questions(
            *,
            exam_concept_templates(
              *,
              exam_concept_template_items(*)
            )
          ),
          rating_questions(*),
          choice_questions(*),
          choice_options(*)
        ),
        form_tag_links(
          form_tags(*)
        ),
        form_targets(*),
        form_responses(*),
        supervision_mappings(
          id,
          time_teacher:users!supervision_mappings_time_teacher_id_fkey(id, name, nickname),
          teacher:users!supervision_mappings_teacher_id_fkey(id, name, nickname)
        )
      `
      )
      .eq("id", formId)
      .single();

    if (error) throw error;
    if (!form) {
      return { success: false, error: "폼을 찾을 수 없습니다." };
    }

    const questionsWithDetails = processQuestions(form.form_questions as never);

    const targetsWithInfo: FormTargetWithDetails[] = (form.form_targets || []).map((target) => ({
      id: target.id,
      form_id: target.form_id,
      target_type: target.target_type,
      target_id: target.target_id,
      created_at: target.created_at,
      targetInfo: {
        id: target.target_id,
        name: "Unknown",
        type: target.target_type as "class" | "individual",
      },
    }));

    let supervisionInfo: SupervisionInfo | undefined;
    if (form.supervision_mappings) {
      supervisionInfo = {
        supervisionId: form.supervision_mappings.id,
        timeTeacher: form.supervision_mappings.time_teacher
          ? {
              id: form.supervision_mappings.time_teacher.id,
              name: form.supervision_mappings.time_teacher.name,
              nickname: form.supervision_mappings.time_teacher.nickname,
            }
          : undefined,
        teacher: form.supervision_mappings.teacher
          ? {
              id: form.supervision_mappings.teacher.id,
              name: form.supervision_mappings.teacher.name,
              nickname: form.supervision_mappings.teacher.nickname,
            }
          : undefined,
      };
    }

    const totalTargets = targetsWithInfo.length;
    const completedResponses =
      form.form_responses?.filter((r) => r.status === "submitted").length || 0;
    const progressRate = totalTargets > 0 ? (completedResponses / totalTargets) * 100 : 0;

    const formWithDetails: FormWithDetails & { supervisionInfo?: SupervisionInfo } = {
      id: form.id,
      title: form.title,
      description: form.description,
      status: form.status,
      created_at: form.created_at,
      updated_at: form.updated_at,
      sent_at: form.sent_at,
      creator_id: form.creator_id,
      group_id: form.group_id,
      creator: form.creator
        ? {
            id: form.creator.id,
            name: form.creator.name,
            nickname: form.creator.nickname,
          }
        : null,
      questions: questionsWithDetails,
      tags: form.form_tag_links?.map((link) => link.form_tags).filter(Boolean) || [],
      targets: targetsWithInfo,
      responses: form.form_responses || [],
      totalTargets,
      completedResponses,
      progressRate,
      supervisionInfo,
    };

    if (supervisionInfo) {
      if (supervisionInfo.timeTeacher) {
        formWithDetails.timeTeacher = supervisionInfo.timeTeacher;
      }
      if (supervisionInfo.teacher) {
        formWithDetails.teacher = supervisionInfo.teacher;
      }
    }

    return { success: true, data: formWithDetails };
  } catch (error) {
    console.error("Error fetching form details with supervision:", error);
    return { success: false, error: "폼 상세 정보 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 폼 응답 조회
 */
export async function getFormResponses(
  formId: string
): Promise<ApiResponse<FormResponseSummary[]>> {
  try {
    const { data: responses, error } = await supabaseAdmin
      .from("form_responses")
      .select(
        `
        *,
        form_question_responses(
          *,
          form_questions(question_text, question_type)
        )
      `
      )
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
        form_tag_links(
          form_tags(*)
        ),
        form_targets(*),
        form_responses(id, status, submitted_at, student_id, student_name, class_id, class_name, responder_type)
      `
    );

    if (conditions.groupId) {
      query = query.eq("group_id", conditions.groupId);
    }
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

    const { data: forms, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;

    let filteredForms = forms || [];
    if (conditions.tags && conditions.tags.length > 0) {
      filteredForms = filteredForms.filter((form) => {
        const formTags =
          form.form_tag_links?.map((link) => link.form_tags?.name).filter(Boolean) || [];
        return conditions.tags!.some((tag) => formTags.includes(tag));
      });
    }

    const formsWithDetails: FormWithDetails[] = filteredForms.map((form) => {
      const totalTargets = form.form_targets?.length || 0;
      const completedResponses =
        form.form_responses?.filter((r) => r.status === "submitted")?.length || 0;

      return {
        ...form,
        creator: form.creator || null,
        questions: [],
        tags: form.form_tag_links?.map((link) => link.form_tags).filter(Boolean) || [],
        targets:
          form.form_targets?.map((target) => ({
            ...target,
            targetInfo: {
              id: target.target_id,
              name: "Unknown",
              type: target.target_type as "class" | "individual",
            },
          })) || [],
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

    // 폼 생성 알림 (save 상태인 경우만)
    if (request.status === "save") {
      await createNotification({
        target_id: request.creatorId,
        creator_id: null,
        type: "form_created",
        title: "새 폼이 생성되었습니다",
        content: `폼 "${request.title}"이 생성되었습니다.`,
        action_url: `/groups/${request.groupId}/forms/${form.id}`,
        related_id: form.id,
        is_read: false,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

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
    const { data: form, error: checkError } = await supabaseAdmin
      .from("forms")
      .select("sent_at, status")
      .eq("id", formId)
      .single();

    if (checkError) throw checkError;
    if (form.sent_at && !request.isDraft) {
      return { success: false, error: "전송된 폼은 수정할 수 없습니다." };
    }

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
 * 폼 복제
 */
export async function duplicateForm(request: DuplicateFormRequest): Promise<ApiResponse<string>> {
  try {
    const originalForm = await getFormDetails(request.formId);
    if (!originalForm.success || !originalForm.data) {
      return { success: false, error: "원본 폼을 찾을 수 없습니다." };
    }

    const original = originalForm.data;
    const newTitle = request.newTitle || `${original.title} [복사본]`;

    const { data: newForm, error: formError } = await supabaseAdmin
      .from("forms")
      .insert({
        title: newTitle,
        description: original.description,
        group_id: original.group_id,
        creator_id: request.userId,
        status: "draft",
      })
      .select()
      .single();

    if (formError) throw formError;

    for (const question of original.questions) {
      const { data: newQuestion, error: questionError } = await supabaseAdmin
        .from("form_questions")
        .insert({
          form_id: newForm.id,
          question_type: question.question_type,
          question_text: question.question_text,
          is_required: question.is_required,
          order_index: question.order_index,
        })
        .select()
        .single();

      if (questionError) throw questionError;

      if (question.question_type === "rating" && question.ratingDetails) {
        await supabaseAdmin.from("rating_questions").insert({
          question_id: newQuestion.id,
          rating_max: question.ratingDetails.rating_max,
          rating_step: question.ratingDetails.rating_step,
        });
      } else if (question.question_type === "choice" && question.choiceDetails) {
        await supabaseAdmin.from("choice_questions").insert({
          question_id: newQuestion.id,
          is_multiple: question.choiceDetails.is_multiple,
          etc_option_enabled: question.choiceDetails.etc_option_enabled,
        });

        if (question.choiceDetails.options && question.choiceDetails.options.length > 0) {
          const optionInserts: ChoiceOptionInsert[] = question.choiceDetails.options.map(
            (option, index) => ({
              question_id: newQuestion.id,
              option_text: option.option_text,
              order_index: option.order_index,
            })
          );

          await supabaseAdmin.from("choice_options").insert(optionInserts);
        }
      } else if (question.question_type === "exam" && question.examDetails) {
        await supabaseAdmin.from("exam_questions").insert({
          question_id: newQuestion.id,
          concept_template_id: question.examDetails.concept_template_id,
          total_questions: question.examDetails.total_questions,
        });
      }
    }

    for (const tag of original.tags) {
      await supabaseAdmin.from("form_tag_links").insert({
        form_id: newForm.id,
        tag_id: tag.id,
      });
    }

    await supabaseAdmin.from("reports").insert({
      form_id: newForm.id,
      form_response_id: null, // 응답이 없음
      student_name: "", // 빈 값으로 시작
      class_name: "", // 빈 값으로 시작
      stage: 0, // 초기 단계
      draft_status: "waiting_for_response", // 응답 대기 상태
      time_teacher_id: null, // 아직 배정되지 않음
      teacher_id: null, // 아직 배정되지 않음
      supervision_id: null, // 아직 배정되지 않음
      teacher_comment: null,
      teacher_completed_at: null,
      time_teacher_comment: null,
      time_teacher_completed_at: null,
      rejected_at: null,
      rejected_by: null,
      rejection_reason: null,
    });

    return { success: true, data: newForm.id };
  } catch (error) {
    console.error("Error duplicating form:", error);
    return { success: false, error: "폼 복제 중 오류가 발생했습니다." };
  }
}

/**
 * 폼 임시저장
 */
export async function saveFormAsDraft(
  formId: string,
  request: UpdateFormRequest
): Promise<ApiResponse<boolean>> {
  return updateForm(formId, { ...request, isDraft: true, status: "draft" });
}

/**
 * 폼 전송 (supervision 정보 포함)
 */
/**
 * 폼 전송 (supervision 정보 포함) - groupId 포함 수정
 */
export async function sendFormWithSupervision(
  request: SendFormRequest
): Promise<ApiResponse<boolean>> {
  try {
    // ✅ 1단계: 폼 정보 조회 시 group_id도 함께 가져오기
    const { data: formInfo, error: formInfoError } = await supabaseAdmin
      .from("forms")
      .select("group_id, supervision_mapping_id") // ✅ group_id 추가
      .eq("id", request.formId)
      .single();

    if (formInfoError) throw formInfoError;
    if (!formInfo) {
      return { success: false, error: "폼을 찾을 수 없습니다." };
    }

    const groupId = formInfo.group_id; // ✅ groupId 추출

    // 폼 상태 업데이트
    const { error: updateError } = await supabaseAdmin
      .from("forms")
      .update({
        status: "save",
        sent_at: new Date().toISOString(),
      })
      .eq("id", request.formId);

    if (updateError) throw updateError;

    // 타겟 정보 저장
    const targetInserts: FormTargetInsert[] = request.targets.map((target) => ({
      form_id: request.formId,
      target_type: target.type,
      target_id: target.id,
    }));

    const { error: targetError } = await supabaseAdmin.from("form_targets").insert(targetInserts);
    if (targetError) throw targetError;

    // ✅ 2단계: 각 타겟에게 알림 발송 (groupId 포함)
    for (const target of request.targets) {
      if (target.type === "user") {
        await createNotification({
          target_id: target.id,
          creator_id: null,
          type: "form_received",
          title: "새 폼이 도착했습니다",
          content: request.message || "새로운 폼을 작성해주세요.",
          action_url: `/groups/${groupId}/forms/${request.formId}?mode=respond`, // ✅ groupId 포함
          related_id: request.formId,
          is_read: false,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });
      } else if (target.type === "class") {
        const { data: classMembers } = await supabaseAdmin
          .from("class_members")
          .select("user_id")
          .eq("class_id", target.id);

        if (classMembers) {
          for (const member of classMembers) {
            if (member.user_id) {
              await createNotification({
                target_id: member.user_id,
                creator_id: null,
                type: "form_received",
                title: "새 폼이 도착했습니다",
                content: request.message || "새로운 폼을 작성해주세요.",
                action_url: `/groups/${groupId}/forms/${request.formId}?mode=respond`, // ✅ groupId 포함
                related_id: request.formId,
                is_read: false,
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              });
            }
          }
        }
      }
    }

    // ✅ 3단계: reports에 supervision 정보 반영
    if (formInfo.supervision_mapping_id) {
      const { data: supervision } = await supabaseAdmin
        .from("supervision_mappings")
        .select("time_teacher_id, teacher_id")
        .eq("id", formInfo.supervision_mapping_id)
        .single();

      if (supervision) {
        await supabaseAdmin
          .from("reports")
          .update({
            supervision_id: formInfo.supervision_mapping_id,
            time_teacher_id: supervision.time_teacher_id,
            teacher_id: supervision.teacher_id,
          })
          .eq("form_id", request.formId);
      }
    }

    return { success: true, data: true };
  } catch (error) {
    console.error("Error sending form:", error);
    return { success: false, error: "폼 전송 중 오류가 발생했습니다." };
  }
}

/**
 * 폼 전송 (기본)
 */
export async function sendForm(request: SendFormRequest): Promise<ApiResponse<boolean>> {
  try {
    // 폼의 그룹 정보 조회
    const { data: formInfo, error: formInfoError } = await supabaseAdmin
      .from("forms")
      .select("group_id")
      .eq("id", request.formId)
      .single();

    if (formInfoError) throw formInfoError;
    const groupId = formInfo.group_id;

    // 폼 상태 업데이트
    const { error: updateError } = await supabaseAdmin
      .from("forms")
      .update({
        status: "send", // 전송 상태로 변경
        sent_at: new Date().toISOString(),
      })
      .eq("id", request.formId);

    if (updateError) throw updateError;

    // 타겟 정보 저장
    const targetInserts = request.targets.map((target) => ({
      form_id: request.formId,
      target_type: target.type,
      target_id: target.id,
    }));

    const { error: targetError } = await supabaseAdmin.from("form_targets").insert(targetInserts);
    if (targetError) throw targetError;

    // 각 타겟에게 알림 발송
    for (const target of request.targets) {
      if (target.type === "user") {
        await createNotification({
          target_id: target.id,
          creator_id: null,
          type: "form_received",
          title: "새 폼이 도착했습니다",
          content: request.message || "새로운 폼을 작성해주세요.",
          action_url: `/groups/${groupId}/forms/${request.formId}?mode=respond`,
          related_id: request.formId,
          is_read: false,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });
      } else if (target.type === "class") {
        // 🔧 클래스 멤버 조회 및 알림 발송
        const { data: classMembers } = await supabaseAdmin
          .from("class_members")
          .select("user_id")
          .eq("class_id", target.id);

        if (classMembers) {
          for (const member of classMembers) {
            if (member.user_id) {
              await createNotification({
                target_id: member.user_id,
                creator_id: null,
                type: "form_received",
                title: "새 폼이 도착했습니다",
                content: request.message || "새로운 폼을 작성해주세요.",
                action_url: `/groups/${groupId}/forms/${request.formId}?mode=respond`,
                related_id: request.formId,
                is_read: false,
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              });
            }
          }
        }
      }
    }

    return { success: true, data: true };
  } catch (error) {
    console.error("Error sending form:", error);
    return { success: false, error: "폼 전송 중 오류가 발생했습니다." };
  }
}

/**
 * 폼의 supervision mapping 저장
 */
export async function saveFormSupervisionMapping(
  formId: string,
  groupId: string,
  timeTeacherId?: string,
  teacherId?: string
): Promise<ApiResponse<boolean>> {
  try {
    const { data: existingMapping } = await supabaseAdmin
      .from("supervision_mappings")
      .select("id")
      .eq("group_id", groupId)
      .eq("time_teacher_id", timeTeacherId || "")
      .eq("teacher_id", teacherId || "")
      .single();

    let supervisionId: string;

    if (existingMapping) {
      supervisionId = existingMapping.id;
    } else {
      const { data: newMapping, error } = await supabaseAdmin
        .from("supervision_mappings")
        .insert({
          group_id: groupId,
          time_teacher_id: timeTeacherId || null,
          teacher_id: teacherId || null,
        })
        .select("id")
        .single();

      if (error) throw error;
      supervisionId = newMapping.id;
    }

    const { error: updateError } = await supabaseAdmin
      .from("forms")
      .update({
        supervision_mapping_id: supervisionId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", formId);

    if (updateError) throw updateError;

    const { error: reportError } = await supabaseAdmin
      .from("reports")
      .update({
        supervision_id: supervisionId,
        time_teacher_id: timeTeacherId || null,
        teacher_id: teacherId || null,
      })
      .eq("form_id", formId);

    if (reportError) {
      console.warn("Report update failed:", reportError);
    }

    return { success: true, data: true };
  } catch (error) {
    console.error("Error saving form supervision mapping:", error);
    return { success: false, error: "폼 담당자 정보 저장 중 오류가 발생했습니다." };
  }
}

// ===== 폼 태그 관리 =====

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

export async function linkFormTag(formId: string, tagId: string): Promise<ApiResponse<boolean>> {
  try {
    const { error } = await supabaseAdmin.from("form_tag_links").insert({
      form_id: formId,
      tag_id: tagId,
    });

    if (error) throw error;

    return { success: true, data: true };
  } catch (error) {
    console.error("Error linking form tag:", error);
    return { success: false, error: "폼 태그 연결 중 오류가 발생했습니다." };
  }
}

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

export async function deleteFormTag(tagId: string): Promise<ApiResponse<boolean>> {
  try {
    const { error: linkError } = await supabaseAdmin
      .from("form_tag_links")
      .delete()
      .eq("tag_id", tagId);

    if (linkError) throw linkError;

    const { error } = await supabaseAdmin.from("form_tags").delete().eq("id", tagId);

    if (error) throw error;

    return { success: true, data: true };
  } catch (error) {
    console.error("Error deleting form tag:", error);
    return { success: false, error: "폼 태그 삭제 중 오류가 발생했습니다." };
  }
}

// ===== 폼 질문 관리 =====

export async function createQuestion(
  request: CreateQuestionRequest & { formId: string }
): Promise<ApiResponse<string>> {
  try {
    if (request.questionType === "exam") {
      const { data: existingExamQuestions } = await supabaseAdmin
        .from("form_questions")
        .select("id")
        .eq("form_id", request.formId)
        .eq("question_type", "exam");

      if (existingExamQuestions && existingExamQuestions.length > 0) {
        return {
          success: false,
          error: "폼 내에는 시험 타입 질문을 최대 1개까지만 추가할 수 있습니다.",
        };
      }
    }

    const { data: question, error: questionError } = await supabaseAdmin
      .from("form_questions")
      .insert({
        form_id: request.formId,
        question_type: request.questionType,
        question_text: request.questionText,
        is_required: request.isRequired,
        order_index: request.orderIndex,
      })
      .select()
      .single();

    if (questionError) throw questionError;

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
        is_multiple: request.choiceConfig.multiple,
        etc_option_enabled: request.choiceConfig.allowOther || false,
      });

      if (choiceError) throw choiceError;

      if (request.choiceConfig.options && request.choiceConfig.options.length > 0) {
        const optionInserts: ChoiceOptionInsert[] = request.choiceConfig.options.map(
          (option, index) => ({
            question_id: question.id,
            option_text: option,
            order_index: index,
          })
        );

        const { error: optionsError } = await supabaseAdmin
          .from("choice_options")
          .insert(optionInserts);

        if (optionsError) throw optionsError;
      }
    } else if (request.questionType === "exam" && request.examConfig) {
      const { error: examError } = await supabaseAdmin.from("exam_questions").insert({
        question_id: question.id,
        concept_template_id: request.examConfig.conceptTemplateId ?? null,
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

export async function updateQuestion(
  questionId: string,
  request: UpdateQuestionRequest
): Promise<ApiResponse<boolean>> {
  try {
    const updates: Partial<FormQuestionUpdate> = {};
    if (request.questionText) updates.question_text = request.questionText;
    if (request.isRequired !== undefined) updates.is_required = request.isRequired;
    if (request.orderIndex !== undefined) updates.order_index = request.orderIndex;
    updates.updated_at = new Date().toISOString();

    const { error: questionError } = await supabaseAdmin
      .from("form_questions")
      .update(updates)
      .eq("id", questionId);

    if (questionError) throw questionError;

    if (request.ratingConfig) {
      const { error: ratingError } = await supabaseAdmin
        .from("rating_questions")
        .update({
          rating_max: request.ratingConfig.ratingMax,
          rating_step: request.ratingConfig.ratingStep,
        })
        .eq("question_id", questionId);

      if (ratingError) throw ratingError;
    }

    if (request.choiceConfig) {
      const { error: choiceError } = await supabaseAdmin
        .from("choice_questions")
        .update({
          is_multiple: request.choiceConfig.multiple,
          etc_option_enabled: request.choiceConfig.allowOther || false,
        })
        .eq("question_id", questionId);

      if (choiceError) throw choiceError;

      await supabaseAdmin.from("choice_options").delete().eq("question_id", questionId);

      if (request.choiceConfig.options && request.choiceConfig.options.length > 0) {
        const optionInserts: ChoiceOptionInsert[] = request.choiceConfig.options.map(
          (option, index) => ({
            question_id: questionId,
            option_text: option,
            order_index: index,
          })
        );

        const { error: optionsError } = await supabaseAdmin
          .from("choice_options")
          .insert(optionInserts);

        if (optionsError) throw optionsError;
      }
    }

    if (request.examConfig) {
      const { error: examError } = await supabaseAdmin
        .from("exam_questions")
        .update({
          concept_template_id: request.examConfig.conceptTemplateId,
          total_questions: request.examConfig.totalQuestions || 10,
        })
        .eq("question_id", questionId);

      if (examError) throw examError;
    }

    return { success: true, data: true };
  } catch (error) {
    console.error("Error updating question:", error);
    return { success: false, error: "질문 수정 중 오류가 발생했습니다." };
  }
}

export async function reorderFormQuestions(
  request: ReorderQuestionsRequest
): Promise<ApiResponse<boolean>> {
  try {
    for (let i = 0; i < request.questionOrders.length; i++) {
      const { questionId } = request.questionOrders[i];

      const { error } = await supabaseAdmin
        .from("form_questions")
        .update({
          order_index: i,
          updated_at: new Date().toISOString(),
        })
        .eq("id", questionId);

      if (error) throw error;
    }

    return { success: true, data: true };
  } catch (error) {
    console.error("Error reordering questions:", error);
    return { success: false, error: "질문 순서 변경 중 오류가 발생했습니다." };
  }
}

export async function reorderQuestions(
  request: ReorderQuestionsRequest
): Promise<ApiResponse<boolean>> {
  return reorderFormQuestions(request);
}

// ===== 개념 템플릿 관리 =====

export async function createConceptTemplate(
  request: CreateConceptTemplateRequest
): Promise<ApiResponse<string>> {
  try {
    const { data: template, error: templateError } = await supabaseAdmin
      .from("exam_concept_templates")
      .insert({
        name: request.name,
        group_id: request.groupId,
        creator_id: request.creatorId,
        concept_count: request.conceptCount,
        status: request.isDraft ? "draft" : request.status || "completed",
      })
      .select()
      .single();

    if (templateError) throw templateError;

    if (request.conceptItems && request.conceptItems.length > 0) {
      const itemInserts: ExamConceptTemplateItemInsert[] = request.conceptItems.map((item) => ({
        template_id: template.id,
        concept_text: item.conceptText,
        concept_description: item.conceptDescription || "",
        order_index: item.orderIndex,
      }));

      const { error: itemsError } = await supabaseAdmin
        .from("exam_concept_template_items")
        .insert(itemInserts);

      if (itemsError) throw itemsError;
    }

    return { success: true, data: template.id };
  } catch (error) {
    console.error("Error creating concept template:", error);
    return { success: false, error: "개념 템플릿 생성 중 오류가 발생했습니다." };
  }
}

export async function getConceptTemplates(
  groupId: string
): Promise<ApiResponse<ConceptTemplateWithItems[]>> {
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
      .eq("status", "completed")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const templatesWithItems: ConceptTemplateWithItems[] = (templates || []).map((template) => ({
      id: template.id,
      name: template.name,
      group_id: template.group_id,
      creator_id: template.creator_id,
      concept_count: template.concept_count,
      status: template.status,
      created_at: template.created_at,
      updated_at: template.updated_at,
      conceptItems: (template.exam_concept_template_items || [])
        .map((item) => ({
          id: item.id,
          template_id: item.template_id,
          concept_text: item.concept_text,
          concept_description: item.concept_description,
          order_index: item.order_index,
          created_at: item.created_at,
          updated_at: item.updated_at,
        }))
        .sort((a, b) => a.order_index - b.order_index),
      usageCount: 0,
    }));

    return { success: true, data: templatesWithItems };
  } catch (error) {
    console.error("Error fetching concept templates:", error);
    return { success: false, error: "개념 템플릿 조회 중 오류가 발생했습니다." };
  }
}

// ===== 폼 응답 =====

// forms.ts에서 submitFormResponse 함수 개선

export async function submitFormResponse(
  request: SubmitFormResponseRequest
): Promise<ApiResponse<string>> {
  try {
    const { data: form, error: formError } = await supabaseAdmin
      .from("forms")
      .select("status, sent_at")
      .eq("id", request.formId)
      .single();

    if (formError) throw formError;
    if (!form || (form.status !== "save" && form.status !== "send")) {
      return { success: false, error: "응답할 수 없는 폼입니다." };
    }

    // 학생 이름 조회
    const { data: student, error: studentError } = await supabaseAdmin
      .from("users")
      .select("name")
      .eq("id", request.studentId)
      .single();

    if (studentError) throw studentError;

    // 클래스 이름 조회 (classId가 있는 경우만)
    let className: string | null = null;
    if (request.classId) {
      const { data: classData, error: classError } = await supabaseAdmin
        .from("classes")
        .select("name")
        .eq("id", request.classId)
        .single();

      if (!classError && classData) {
        className = classData.name;
      }
    }

    const { data: formResponse, error: responseError } = await supabaseAdmin
      .from("form_responses")
      .insert({
        form_id: request.formId,
        student_id: request.studentId,
        student_name: student.name, // ✅ 실제 학생 이름 저장
        class_id: request.classId,
        class_name: className, // ✅ 실제 클래스 이름 저장
        status: "submitted",
        submitted_at: new Date().toISOString(),
        responder_type: "student",
      })
      .select()
      .single();

    if (responseError) throw responseError;

    const questionResponseInserts: FormQuestionResponseInsert[] = request.responses.map(
      (response) => ({
        form_response_id: formResponse.id,
        question_id: response.questionId,
        text_response: response.textResponse,
        number_response: response.numberResponse,
        rating_response: response.ratingResponse,
        exam_response: response.examResponse,
      })
    );

    const { error: questionResponsesError } = await supabaseAdmin
      .from("form_question_responses")
      .insert(questionResponseInserts);

    if (questionResponsesError) throw questionResponsesError;

    // ✅ reports 테이블 업데이트 - 응답 제출 시 stage 1로 변경
    const { error: reportError } = await supabaseAdmin
      .from("reports")
      .update({
        form_response_id: formResponse.id,
        student_name: student.name, // ✅ 실제 학생 이름 저장
        class_name: className || "", // ✅ 실제 클래스 이름 저장
        stage: 1, // ✅ 응답 제출 시 stage 1로 변경
        draft_status: "draft", // ✅ draft 상태 유지
        updated_at: new Date().toISOString(), // ✅ 업데이트 시간 기록
      })
      .eq("form_id", request.formId);

    if (reportError) {
      console.warn("Report update failed:", reportError);
    }

    return { success: true, data: formResponse.id };
  } catch (error) {
    console.error("Error submitting form response:", error);
    return { success: false, error: "폼 응답 제출 중 오류가 발생했습니다." };
  }
}

export async function deleteForm(formId: string, userId: string): Promise<ApiResponse<boolean>> {
  try {
    const { data: form, error: checkError } = await supabaseAdmin
      .from("forms")
      .select("creator_id")
      .eq("id", formId)
      .single();

    if (checkError) throw checkError;
    if (form?.creator_id !== userId) {
      return { success: false, error: "폼을 삭제할 권한이 없습니다." };
    }

    const { error } = await supabaseAdmin.from("forms").delete().eq("id", formId);

    if (error) throw error;

    return { success: true, data: true };
  } catch (error) {
    console.error("Error deleting form:", error);
    return { success: false, error: "폼 삭제 중 오류가 발생했습니다." };
  }
}

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

    const { data: targets } = await supabaseAdmin
      .from("form_targets")
      .select("*")
      .eq("form_id", formId);

    const hasPermission = targets?.some(
      (target) =>
        (target.target_type === "user" && target.target_id === userId) ||
        target.target_type === "class"
    );

    if (!hasPermission) {
      return { success: false, error: "이 폼에 응답할 권한이 없습니다." };
    }

    const formWithDetails = await getFormDetails(formId);
    return formWithDetails;
  } catch (error) {
    console.error("Error fetching form for response:", error);
    return { success: false, error: "폼 조회 중 오류가 발생했습니다." };
  }
}

export async function getFormStatistics(groupId: string): Promise<ApiResponse<FormStatistics>> {
  try {
    const { data: forms, error: formsError } = await supabaseAdmin
      .from("forms")
      .select("id, status, created_at")
      .eq("group_id", groupId);

    if (formsError) throw formsError;

    const { data: responses, error: responsesError } = await supabaseAdmin
      .from("form_responses")
      .select("submitted_at, status")
      .in("form_id", forms?.map((f) => f.id) || []);

    if (responsesError) throw responsesError;

    const totalForms = forms?.length || 0;
    const saveForms = forms?.filter((f) => f.status === "save").length || 0;
    const draftForms = forms?.filter((f) => f.status === "draft").length || 0;
    const closedForms = forms?.filter((f) => f.status === "closed").length || 0;
    const totalResponses = responses?.length || 0;
    const completedResponses = responses?.filter((r) => r.status === "submitted").length || 0;

    const responsesByDate: { date: string; count: number }[] = [];

    const statistics: FormStatistics = {
      totalForms,
      saveForms,
      draftForms,
      closedForms,
      totalResponses,
      completionRate: totalResponses > 0 ? (completedResponses / totalResponses) * 100 : 0,
      responsesByDate,
    };

    return { success: true, data: statistics };
  } catch (error) {
    console.error("Error fetching form statistics:", error);
    return { success: false, error: "폼 통계 조회 중 오류가 발생했습니다." };
  }
}

// 나머지 함수들 (기존 코드 유지)...
export async function saveConceptTemplate(
  templateId: string,
  request: UpdateConceptTemplateRequest
): Promise<ApiResponse<boolean>> {
  try {
    const updates: Partial<ExamConceptTemplateUpdate> = {};
    if (request.name) updates.name = request.name;
    if (request.conceptCount) updates.concept_count = request.conceptCount;
    if (request.status) updates.status = request.status;
    updates.updated_at = new Date().toISOString();

    const { error: templateError } = await supabaseAdmin
      .from("exam_concept_templates")
      .update(updates)
      .eq("id", templateId);

    if (templateError) throw templateError;

    if (request.conceptItems) {
      await supabaseAdmin
        .from("exam_concept_template_items")
        .delete()
        .eq("template_id", templateId);

      const itemInserts: ExamConceptTemplateItemInsert[] = request.conceptItems.map((item) => ({
        template_id: templateId,
        concept_text: item.conceptText,
        concept_description: item.conceptDescription || "",
        order_index: item.orderIndex,
      }));

      const { error: itemsError } = await supabaseAdmin
        .from("exam_concept_template_items")
        .insert(itemInserts);

      if (itemsError) throw itemsError;
    }

    return { success: true, data: true };
  } catch (error) {
    console.error("Error saving concept template:", error);
    return { success: false, error: "개념 템플릿 저장 중 오류가 발생했습니다." };
  }
}

export async function updateFormAssignment(
  request: UpdateFormAssignmentRequest
): Promise<ApiResponse<boolean>> {
  try {
    const { data: form } = await supabaseAdmin
      .from("forms")
      .select("group_id")
      .eq("id", request.formId)
      .single();

    if (!form?.group_id) {
      return { success: false, error: "폼의 그룹 정보를 찾을 수 없습니다." };
    }

    const result = await saveFormSupervisionMapping(
      request.formId,
      form.group_id,
      request.timeTeacherId,
      request.teacherId
    );

    return {
      success: result.success,
      data: result.success,
      error: result.error,
    };
  } catch (error) {
    console.error("Error updating form assignment:", error);
    return { success: false, error: "담당자 배정 업데이트 중 오류가 발생했습니다." };
  }
}

export async function updateReportsWithSupervision(formId: string): Promise<ApiResponse<boolean>> {
  try {
    // 폼의 supervision 정보 조회
    const { data: form } = await supabaseAdmin
      .from("forms")
      .select("description, supervision_mapping_id")
      .eq("id", formId)
      .single();

    if (!form) {
      return { success: false, error: "폼을 찾을 수 없습니다." };
    }

    // supervision_mapping_id가 있는 경우 reports 테이블 업데이트
    if (form.supervision_mapping_id) {
      const { data: supervision } = await supabaseAdmin
        .from("supervision_mappings")
        .select("time_teacher_id, teacher_id")
        .eq("id", form.supervision_mapping_id)
        .single();

      if (supervision) {
        const { error } = await supabaseAdmin
          .from("reports")
          .update({
            supervision_id: form.supervision_mapping_id,
            time_teacher_id: supervision.time_teacher_id,
            teacher_id: supervision.teacher_id,
          })
          .eq("form_id", formId);

        if (error) {
          console.error("Error updating reports with supervision:", error);
          return { success: false, error: "리포트 담당자 정보 업데이트 실패" };
        }
      }
    }

    return { success: true, data: true };
  } catch (error) {
    console.error("Error updating reports with supervision:", error);
    return { success: false, error: "리포트 담당자 정보 업데이트 중 오류가 발생했습니다." };
  }
}
