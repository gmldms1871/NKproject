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
  isDraft?: boolean; // 임시저장 여부 (클라이언트에서만 사용)
}

export interface UpdateFormRequest {
  title?: string;
  description?: string;
  status?: "draft" | "active" | "closed";
  isDraft?: boolean; // 임시저장 여부 (클라이언트에서만 사용)
}

export interface CreateQuestionRequest {
  questionType: "text" | "rating" | "choice" | "exam";
  questionText: string;
  isRequired: boolean;
  orderIndex: number;
  textConfig?: {
    subtype: "text" | "textarea"; // 주관식 vs 서술형
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
  newTitle?: string; // 지정하지 않으면 원본 제목 + " [복사본]"
}

export interface CreateConceptTemplateRequest {
  name: string;
  groupId: string;
  creatorId: string;
  conceptCount: number;
  status?: "draft" | "published";
  isDraft?: boolean; // 임시저장 여부 (클라이언트에서만 사용)
  conceptItems?: CreateConceptItemRequest[];
}

export interface UpdateConceptTemplateRequest {
  name?: string;
  conceptCount?: number;
  status?: "draft" | "published";
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
    conceptTemplate?: ConceptTemplateWithItems;
  };
  ratingDetails?: RatingQuestion;
  choiceDetails?: {
    question_id: string;
    is_multiple: boolean | null;
    etc_option_enabled: boolean | null;
    options: ChoiceOption[]; // choice_options 테이블에서 가져온 실제 선택지들
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

export interface ConceptTemplateWithItems {
  id: string;
  name: string;
  group_id: string | null;
  concept_count: number | null;
  status: string | null;
  creator_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  // 연결된 정보
  creator?: {
    id: string;
    name: string;
    nickname: string;
  } | null;
  conceptItems: ConceptTemplateItem[];
  // 사용 통계
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

// ===== 폼 관리 함수들 =====

/**
 * 📄 그룹 내 폼 전체 조회 (응답률 포함)
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

    // 필터링 조건 적용
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

    // 응답률 계산 및 상세 정보 처리
    const formsWithDetails: FormWithDetails[] =
      forms?.map((form) => {
        const totalTargets = form.form_targets?.length || 0;
        const completedResponses =
          form.form_responses?.filter((r) => r.status === "completed")?.length || 0;

        return {
          ...form,
          creator: form.creator || null,
          questions: [], // 기본 질문은 별도 조회로 처리
          tags: form.form_tag_links?.map((link) => link.form_tags).filter(Boolean) || [],
          targets:
            form.form_targets?.map((target) => ({
              ...target,
              targetInfo: {
                id: target.target_id,
                name: "Unknown", // 실제로는 조인으로 가져와야 함
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
 * 📄 해당 폼에 대한 정보 조회 (질문 포함)
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
          const examQuestion = question.exam_questions;
          questionDetail.examDetails = {
            concept_template_id: examQuestion.concept_template_id,
            total_questions: examQuestion.total_questions,
            conceptTemplate: examQuestion.exam_concept_templates
              ? {
                  ...examQuestion.exam_concept_templates,
                  conceptItems:
                    examQuestion.exam_concept_templates.exam_concept_template_items || [],
                  usageCount: 0, // 실제로는 별도 계산
                }
              : undefined,
          };
        } else if (question.question_type === "rating" && question.rating_questions) {
          questionDetail.ratingDetails = question.rating_questions;
        } else if (question.question_type === "choice") {
          // ✅ 수정된 부분: choice_questions와 choice_options를 각각 처리
          const choiceQuestion = question.choice_questions;
          const choiceOptions = question.choice_options || [];

          if (choiceQuestion) {
            questionDetail.choiceDetails = {
              question_id: choiceQuestion.question_id,
              is_multiple: choiceQuestion.is_multiple,
              etc_option_enabled: choiceQuestion.etc_option_enabled,
              options: choiceOptions, // ✅ 직접 사용
            };
          }
        } else if (question.question_type === "text") {
          // 텍스트 타입의 경우 서브타입 처리 (주관식/서술형)
          questionDetail.textDetails = {
            subtype: question.question_text.includes("서술") ? "textarea" : "text",
            maxLength: 1000, // 기본값
          };
        }

        questionsWithDetails.push(questionDetail);
      }
    }

    // 진행률 계산
    const totalTargets = form.form_targets?.length || 0;
    const completedResponses =
      form.form_responses?.filter((r) => r.status === "completed")?.length || 0;

    const formWithDetails: FormWithDetails = {
      ...form,
      creator: form.creator || null,
      questions: questionsWithDetails.sort((a, b) => a.order_index - b.order_index),
      tags: form.form_tag_links?.map((link) => link.form_tags).filter(Boolean) || [],
      targets:
        form.form_targets?.map((target) => ({
          ...target,
          targetInfo: {
            id: target.target_id,
            name: "Unknown", // 실제로는 조인으로 가져와야 함
            type: target.target_type as "class" | "individual",
          },
        })) || [],
      responses: form.form_responses || [],
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
 * 📄 해당 폼에 대한 응답 조회
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
 * 📄 폼 필터링 검색
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

    // 검색 조건 적용
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

    // 태그 필터링 (클라이언트에서 처리)
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
        form.form_responses?.filter((r) => r.status === "completed")?.length || 0;

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
 * 📄 폼 생성
 */
export async function createForm(request: CreateFormRequest): Promise<ApiResponse<string>> {
  try {
    // createForm 함수에서
    const { data: form, error } = await supabaseAdmin
      .from("forms")
      .insert({
        title: request.title,
        description: request.description,
        group_id: request.groupId,
        creator_id: request.creatorId,
        status: request.isDraft ? "draft" : "active", // "draft", "active", "closed"만 허용
      })
      .select()
      .single();

    if (error) throw error;

    // 보고서도 동시에 생성 (사용자 요구사항)
    // 보고서 생성 시
    const { error: reportError } = await supabaseAdmin.from("reports").insert({
      form_id: form.id,
      form_response_id: null,
      student_name: "",
      class_name: "",
      stage: 0,
      draft_status: "waiting_for_response", // status 대신 draft_status 사용
      time_teacher_id: null,
      teacher_id: null,
      supervision_id: null,
    });

    if (reportError) {
      console.warn("Report creation failed:", reportError);
    }

    // 폼 생성 알림
    if (!request.isDraft) {
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
    }

    return { success: true, data: form.id };
  } catch (error) {
    console.error("Error creating form:", error);
    return { success: false, error: "폼 생성 중 오류가 발생했습니다." };
  }
}

/**
 * 📄 폼 정보 수정
 */
export async function updateForm(
  formId: string,
  request: UpdateFormRequest
): Promise<ApiResponse<boolean>> {
  try {
    // 폼이 전송된 상태인지 확인 (전송 후 수정 불가)
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
 * 📄 폼 복제 (제목 끝에 [복사본] 추가, 타겟/선생님 설정 초기화)
 */
export async function duplicateForm(request: DuplicateFormRequest): Promise<ApiResponse<string>> {
  try {
    // 원본 폼 정보 조회
    const originalForm = await getFormDetails(request.formId);
    if (!originalForm.success || !originalForm.data) {
      return { success: false, error: "원본 폼을 찾을 수 없습니다." };
    }

    const original = originalForm.data;
    const newTitle = request.newTitle || `${original.title} [복사본]`;

    // 새 폼 생성
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

    // 질문들 복제
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

      // 타입별 상세 정보 복제
      if (question.question_type === "rating" && question.ratingDetails) {
        await supabaseAdmin.from("rating_questions").insert({
          question_id: newQuestion.id,
          rating_max: question.ratingDetails.rating_max,
          rating_step: question.ratingDetails.rating_step,
        });
      } else if (question.question_type === "choice" && question.choiceDetails) {
        // choice_questions 테이블에 기본 정보 저장
        await supabaseAdmin.from("choice_questions").insert({
          question_id: newQuestion.id,
          is_multiple: question.choiceDetails.is_multiple,
          etc_option_enabled: question.choiceDetails.etc_option_enabled,
        });

        // choice_options 테이블에 선택지들 저장
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

    // 태그들 복제
    for (const tag of original.tags) {
      await supabaseAdmin.from("form_tag_links").insert({
        form_id: newForm.id,
        tag_id: tag.id,
      });
    }

    // 보고서 생성 (타겟과 선생님 설정은 초기화)
    await supabaseAdmin.from("reports").insert({
      form_id: newForm.id,
      form_response_id: null,
      student_name: "",
      class_name: "",
      stage: 0,
      status: "waiting_for_response",
      time_teacher_id: null, // 초기화
      teacher_id: null, // 초기화
      supervision_id: null,
    });

    return { success: true, data: newForm.id };
  } catch (error) {
    console.error("Error duplicating form:", error);
    return { success: false, error: "폼 복제 중 오류가 발생했습니다." };
  }
}

/**
 * 📄 폼 임시저장
 */
export async function saveFormAsDraft(
  formId: string,
  request: UpdateFormRequest
): Promise<ApiResponse<boolean>> {
  return updateForm(formId, { ...request, isDraft: true, status: "draft" });
}

/**
 * 📄 폼 보내기 (개인, 반에 보낼 수 있음)
 */
export async function sendForm(request: SendFormRequest): Promise<ApiResponse<boolean>> {
  try {
    // 폼 상태 업데이트 (전송됨)
    const { error: updateError } = await supabaseAdmin
      .from("forms")
      .update({
        status: "active",
        sent_at: new Date().toISOString(),
      })
      .eq("id", request.formId);

    if (updateError) throw updateError;

    // 타겟 추가
    const targetInserts: FormTargetInsert[] = request.targets.map((target) => ({
      form_id: request.formId,
      target_type: target.type,
      target_id: target.id,
    }));

    const { error: targetError } = await supabaseAdmin.from("form_targets").insert(targetInserts);

    if (targetError) throw targetError;

    // 각 타겟에게 알림 발송
    for (const target of request.targets) {
      if (target.type === "individual") {
        // 개인에게 직접 알림
        await createNotification({
          target_id: target.id,
          creator_id: null,
          type: "form_received",
          title: "새 폼이 도착했습니다",
          content: request.message || "새로운 폼을 작성해주세요.",
          action_url: `/forms/${request.formId}/respond`,
          related_id: request.formId,
          is_read: false,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });
      } else if (target.type === "class") {
        // 반의 모든 학생에게 알림 (실제로는 클래스 멤버 조회 후 발송)
        // TODO: 클래스 멤버 조회 로직 추가
      }
    }

    return { success: true, data: true };
  } catch (error) {
    console.error("Error sending form:", error);
    return { success: false, error: "폼 전송 중 오류가 발생했습니다." };
  }
}

// ===== 폼 태그 관리 =====

/**
 * 📄 폼 태그 생성
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
 * 📄 폼 태그 연결
 */
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

/**
 * 📄 폼 태그 수정
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
 * 📄 폼 태그 삭제
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

// ===== 폼 질문 관리 =====

/**
 * 📄 폼 질문 수정
 */
export async function updateQuestion(
  questionId: string,
  request: UpdateQuestionRequest
): Promise<ApiResponse<boolean>> {
  try {
    // 기본 질문 정보 업데이트
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

    // 타입별 상세 정보 업데이트
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
      // choice_questions 기본 정보 업데이트
      const { error: choiceError } = await supabaseAdmin
        .from("choice_questions")
        .update({
          is_multiple: request.choiceConfig.multiple,
          etc_option_enabled: request.choiceConfig.allowOther || false,
        })
        .eq("question_id", questionId);

      if (choiceError) throw choiceError;

      // 기존 choice_options 삭제 후 새로 생성
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

/**
 * 📄 시험 타입 질문 수정 (question_subtype은 text일때 주관식과 서술형으로 나뉨)
 */
export async function updateExamQuestion(
  questionId: string,
  request: {
    questionText?: string;
    totalQuestions?: number;
    conceptTemplateId?: string;
    questionSubtype?: "text" | "textarea"; // 주관식 vs 서술형
  }
): Promise<ApiResponse<boolean>> {
  try {
    // 폼 내에 시험타입이 이미 있는지 확인 (최대 1개까지만 가능)
    const { data: formQuestion } = await supabaseAdmin
      .from("form_questions")
      .select("form_id")
      .eq("id", questionId)
      .single();

    if (formQuestion) {
      const { data: existingExamQuestions } = await supabaseAdmin
        .from("form_questions")
        .select("id")
        .eq("form_id", formQuestion.form_id || "")
        .eq("question_type", "exam")
        .neq("id", questionId);

      if (existingExamQuestions && existingExamQuestions.length > 0) {
        return {
          success: false,
          error: "폼 내에는 시험 타입 질문을 최대 1개까지만 추가할 수 있습니다.",
        };
      }
    }

    // 기본 질문 업데이트
    const questionUpdates: Partial<FormQuestionUpdate> = {};
    if (request.questionText) questionUpdates.question_text = request.questionText;
    questionUpdates.updated_at = new Date().toISOString();

    const { error: questionError } = await supabaseAdmin
      .from("form_questions")
      .update(questionUpdates)
      .eq("id", questionId);

    if (questionError) throw questionError;

    // 시험 질문 상세 정보 업데이트
    const examUpdates: Partial<{ concept_template_id?: string; total_questions?: number }> = {};
    if (request.totalQuestions) examUpdates.total_questions = request.totalQuestions;
    if (request.conceptTemplateId) examUpdates.concept_template_id = request.conceptTemplateId;

    const { error: examError } = await supabaseAdmin
      .from("exam_questions")
      .update(examUpdates)
      .eq("question_id", questionId);

    if (examError) throw examError;

    return { success: true, data: true };
  } catch (error) {
    console.error("Error updating exam question:", error);
    return { success: false, error: "시험 질문 수정 중 오류가 발생했습니다." };
  }
}

/**
 * 📄 별점 타입 질문 수정
 */
export async function updateRatingQuestion(
  questionId: string,
  request: {
    questionText?: string;
    ratingMax?: number;
    ratingStep?: number;
  }
): Promise<ApiResponse<boolean>> {
  try {
    // 기본 질문 업데이트
    if (request.questionText) {
      const { error: questionError } = await supabaseAdmin
        .from("form_questions")
        .update({
          question_text: request.questionText,
          updated_at: new Date().toISOString(),
        })
        .eq("id", questionId);

      if (questionError) throw questionError;
    }

    // 별점 질문 상세 정보 업데이트
    const ratingUpdates: Partial<{ rating_max?: number; rating_step?: number }> = {};
    if (request.ratingMax) ratingUpdates.rating_max = request.ratingMax;
    if (request.ratingStep) ratingUpdates.rating_step = request.ratingStep;

    if (Object.keys(ratingUpdates).length > 0) {
      const { error: ratingError } = await supabaseAdmin
        .from("rating_questions")
        .update(ratingUpdates)
        .eq("question_id", questionId);

      if (ratingError) throw ratingError;
    }

    return { success: true, data: true };
  } catch (error) {
    console.error("Error updating rating question:", error);
    return { success: false, error: "별점 질문 수정 중 오류가 발생했습니다." };
  }
}

/**
 * 📄 선택형 타입 질문 수정 (복수, 단수)
 */
export async function updateChoiceQuestion(
  questionId: string,
  request: {
    questionText?: string;
    options?: string[];
    multiple?: boolean;
    allowOther?: boolean;
  }
): Promise<ApiResponse<boolean>> {
  try {
    // 기본 질문 업데이트
    if (request.questionText) {
      const { error: questionError } = await supabaseAdmin
        .from("form_questions")
        .update({
          question_text: request.questionText,
          updated_at: new Date().toISOString(),
        })
        .eq("id", questionId);

      if (questionError) throw questionError;
    }

    // 선택형 질문 상세 정보 업데이트
    const choiceUpdates: Partial<{ is_multiple?: boolean; etc_option_enabled?: boolean }> = {};
    if (request.multiple !== undefined) choiceUpdates.is_multiple = request.multiple;
    if (request.allowOther !== undefined) choiceUpdates.etc_option_enabled = request.allowOther;

    if (Object.keys(choiceUpdates).length > 0) {
      const { error: choiceError } = await supabaseAdmin
        .from("choice_questions")
        .update(choiceUpdates)
        .eq("question_id", questionId);

      if (choiceError) throw choiceError;
    }

    // 선택지 업데이트
    if (request.options) {
      // 기존 선택지 삭제
      await supabaseAdmin.from("choice_options").delete().eq("question_id", questionId);

      // 새 선택지 추가
      if (request.options.length > 0) {
        const optionInserts: ChoiceOptionInsert[] = request.options.map((option, index) => ({
          question_id: questionId,
          option_text: option,
          order_index: index,
        }));

        const { error: optionsError } = await supabaseAdmin
          .from("choice_options")
          .insert(optionInserts);

        if (optionsError) throw optionsError;
      }
    }

    return { success: true, data: true };
  } catch (error) {
    console.error("Error updating choice question:", error);
    return { success: false, error: "선택형 질문 수정 중 오류가 발생했습니다." };
  }
}

/**
 * 📄 텍스트 타입 질문 수정
 */
export async function updateTextQuestion(
  questionId: string,
  request: {
    questionText?: string;
    subtype?: "text" | "textarea"; // 주관식 vs 서술형
    maxLength?: number;
  }
): Promise<ApiResponse<boolean>> {
  try {
    const updates: Partial<FormQuestionUpdate> = {};
    if (request.questionText) updates.question_text = request.questionText;
    updates.updated_at = new Date().toISOString();

    const { error } = await supabaseAdmin
      .from("form_questions")
      .update(updates)
      .eq("id", questionId);

    if (error) throw error;

    // 텍스트 타입의 경우 서브타입과 최대 길이는 클라이언트에서 관리
    // 또는 별도의 text_questions 테이블이 필요할 수 있음

    return { success: true, data: true };
  } catch (error) {
    console.error("Error updating text question:", error);
    return { success: false, error: "텍스트 질문 수정 중 오류가 발생했습니다." };
  }
}

/**
 * 질문 순서 변경 (드래그 앤 드롭)
 */
export async function reorderQuestions(
  request: ReorderQuestionsRequest
): Promise<ApiResponse<boolean>> {
  try {
    for (const questionOrder of request.questionOrders) {
      const { error } = await supabaseAdmin
        .from("form_questions")
        .update({
          order_index: questionOrder.newOrderIndex,
          updated_at: new Date().toISOString(),
        })
        .eq("id", questionOrder.questionId);

      if (error) throw error;
    }

    return { success: true, data: true };
  } catch (error) {
    console.error("Error reordering questions:", error);
    return { success: false, error: "질문 순서 변경 중 오류가 발생했습니다." };
  }
}

/**
 * 질문 생성
 */
export async function createQuestion(
  request: CreateQuestionRequest & { formId: string } // formId를 request 객체에 포함
): Promise<ApiResponse<string>> {
  try {
    // 시험 타입인 경우 폼 내에 이미 시험 타입이 있는지 확인
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

    // 기본 질문 생성
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

    // 타입별 추가 정보 저장
    if (request.questionType === "rating" && request.ratingConfig) {
      const { error: ratingError } = await supabaseAdmin.from("rating_questions").insert({
        question_id: question.id,
        rating_max: request.ratingConfig.ratingMax,
        rating_step: request.ratingConfig.ratingStep,
      });

      if (ratingError) throw ratingError;
    } else if (request.questionType === "choice" && request.choiceConfig) {
      // choice_questions 기본 정보 저장
      const { error: choiceError } = await supabaseAdmin.from("choice_questions").insert({
        question_id: question.id,
        is_multiple: request.choiceConfig.multiple,
        etc_option_enabled: request.choiceConfig.allowOther || false,
      });

      if (choiceError) throw choiceError;

      // choice_options 선택지들 저장
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

// ===== 개념 템플릿 관리 =====

/**
 * 📄 개념 템플릿 생성 (시험타입과 연결함. 문제 수 같아야함)
 */
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
        status: request.isDraft ? "draft" : request.status || "draft",
      })
      .select()
      .single();

    if (templateError) throw templateError;

    // 개념 아이템들 생성
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

/**
 * 📄 개념 템플릿 저장 (연결이 되어있지 않아도 가능함)
 */
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

    // 개념 아이템들 업데이트
    if (request.conceptItems) {
      // 기존 아이템들 삭제
      await supabaseAdmin
        .from("exam_concept_template_items")
        .delete()
        .eq("template_id", templateId);

      // 새 아이템들 추가
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

/**
 * 📄 개념 템플릿 임시저장 (남들이 보지 못함)
 */
export async function saveConceptTemplateAsDraft(
  templateId: string,
  request: UpdateConceptTemplateRequest
): Promise<ApiResponse<boolean>> {
  return saveConceptTemplate(templateId, { ...request, isDraft: true, status: "draft" });
}

/**
 * 📄 개념 템플릿 수정
 */
export async function updateConceptTemplate(
  templateId: string,
  request: UpdateConceptTemplateRequest
): Promise<ApiResponse<boolean>> {
  return saveConceptTemplate(templateId, request);
}

/**
 * 📄 개념 템플릿 복제
 */
export async function duplicateConceptTemplate(
  request: DuplicateConceptTemplateRequest
): Promise<ApiResponse<string>> {
  try {
    // 원본 템플릿 조회
    const { data: originalTemplate, error: templateError } = await supabaseAdmin
      .from("exam_concept_templates")
      .select(
        `
        *,
        exam_concept_template_items(*)
      `
      )
      .eq("id", request.templateId)
      .single();

    if (templateError) throw templateError;
    if (!originalTemplate) {
      return { success: false, error: "원본 템플릿을 찾을 수 없습니다." };
    }

    const newName = request.newName || `${originalTemplate.name} [복사본]`;

    // 새 템플릿 생성
    const { data: newTemplate, error: newTemplateError } = await supabaseAdmin
      .from("exam_concept_templates")
      .insert({
        name: newName,
        group_id: originalTemplate.group_id,
        creator_id: request.userId,
        concept_count: originalTemplate.concept_count,
        status: "draft",
      })
      .select()
      .single();

    if (newTemplateError) throw newTemplateError;

    // 개념 아이템들 복제
    if (originalTemplate.exam_concept_template_items) {
      const itemInserts: ExamConceptTemplateItemInsert[] =
        originalTemplate.exam_concept_template_items.map((item) => ({
          template_id: newTemplate.id,
          concept_text: item.concept_text,
          concept_description: item.concept_description,
          order_index: item.order_index,
        }));

      const { error: itemsError } = await supabaseAdmin
        .from("exam_concept_template_items")
        .insert(itemInserts);

      if (itemsError) throw itemsError;
    }

    return { success: true, data: newTemplate.id };
  } catch (error) {
    console.error("Error duplicating concept template:", error);
    return { success: false, error: "개념 템플릿 복제 중 오류가 발생했습니다." };
  }
}

/**
 * 📄 개념 연결 (질문과 개념 템플릿 연결)
 */
export async function linkConceptTemplate(
  request: LinkConceptTemplateRequest
): Promise<ApiResponse<boolean>> {
  try {
    // 개념 템플릿과 질문의 문제 수가 일치하는지 확인
    const { data: template } = await supabaseAdmin
      .from("exam_concept_templates")
      .select("concept_count")
      .eq("id", request.conceptTemplateId)
      .single();

    const { data: examQuestion } = await supabaseAdmin
      .from("exam_questions")
      .select("total_questions")
      .eq("question_id", request.questionId)
      .single();

    if (template && examQuestion && template.concept_count !== examQuestion.total_questions) {
      return {
        success: false,
        error: `개념 템플릿의 개념 수(${template.concept_count})와 시험 문제 수(${examQuestion.total_questions})가 일치하지 않습니다.`,
      };
    }

    // 연결 업데이트
    const { error } = await supabaseAdmin
      .from("exam_questions")
      .update({
        concept_template_id: request.conceptTemplateId,
      })
      .eq("question_id", request.questionId);

    if (error) throw error;

    return { success: true, data: true };
  } catch (error) {
    console.error("Error linking concept template:", error);
    return { success: false, error: "개념 템플릿 연결 중 오류가 발생했습니다." };
  }
}

/**
 * 📄 폼 시험 타입 개념 수정
 */
export async function updateFormExamConcept(
  questionId: string,
  conceptTemplateId: string,
  totalQuestions: number
): Promise<ApiResponse<boolean>> {
  try {
    // 개념 템플릿의 개념 수와 문제 수가 일치하는지 확인
    const { data: template } = await supabaseAdmin
      .from("exam_concept_templates")
      .select("concept_count")
      .eq("id", conceptTemplateId)
      .single();

    if (template && template.concept_count !== totalQuestions) {
      return {
        success: false,
        error: `개념 템플릿의 개념 수(${template.concept_count})와 시험 문제 수(${totalQuestions})가 일치하지 않습니다.`,
      };
    }

    // 시험 질문 업데이트
    const { error } = await supabaseAdmin
      .from("exam_questions")
      .update({
        concept_template_id: conceptTemplateId,
        total_questions: totalQuestions,
      })
      .eq("question_id", questionId);

    if (error) throw error;

    return { success: true, data: true };
  } catch (error) {
    console.error("Error updating form exam concept:", error);
    return { success: false, error: "폼 시험 개념 수정 중 오류가 발생했습니다." };
  }
}

// ===== 폼 응답 =====

/**
 * 📄 폼 응답 (타겟이 보냄, 타겟에게 보낸 순간부터 폼 수정 불가능.)
 */
export async function submitFormResponse(
  request: SubmitFormResponseRequest
): Promise<ApiResponse<string>> {
  try {
    // 폼이 활성 상태인지 확인
    const { data: form, error: formError } = await supabaseAdmin
      .from("forms")
      .select("status, sent_at")
      .eq("id", request.formId)
      .single();

    if (formError) throw formError;
    if (!form || form.status !== "active") {
      return { success: false, error: "응답할 수 없는 폼입니다." };
    }

    // 폼 응답 생성
    const { data: formResponse, error: responseError } = await supabaseAdmin
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

    if (responseError) throw responseError;

    // 질문별 응답 저장
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

    // 보고서 업데이트 (1단계로 진행)
    const { error: reportError } = await supabaseAdmin
      .from("reports")
      .update({
        form_response_id: formResponse.id,
        student_name: request.studentId || "", // null 방지
        class_name: request.classId || "",
        stage: 1, // 응답 제출 단계
        status: "waiting_for_time_teacher",
      })
      .eq("form_id", request.formId);

    if (reportError) {
      console.warn("Report update failed:", reportError);
    }

    // 담당 선생님에게 알림
    // TODO: 실제 담당 선생님 ID 조회 후 알림 발송

    return { success: true, data: formResponse.id };
  } catch (error) {
    console.error("Error submitting form response:", error);
    return { success: false, error: "폼 응답 제출 중 오류가 발생했습니다." };
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
    if (form?.creator_id !== userId) {
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

    // 타겟 권한 확인
    const { data: targets } = await supabaseAdmin
      .from("form_targets")
      .select("*")
      .eq("form_id", formId);

    const hasPermission = targets?.some(
      (target) =>
        (target.target_type === "individual" && target.target_id === userId) ||
        target.target_type === "class" // 클래스 멤버십 확인 필요
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

/**
 * 폼 통계 조회
 */
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
    const activeForms = forms?.filter((f) => f.status === "active").length || 0;
    const draftForms = forms?.filter((f) => f.status === "draft").length || 0;
    const closedForms = forms?.filter((f) => f.status === "closed").length || 0;
    const totalResponses = responses?.length || 0;
    const completedResponses = responses?.filter((r) => r.status === "completed").length || 0;

    // 날짜별 응답 통계
    const responsesByDate: { date: string; count: number }[] = [];
    // TODO: 날짜별 그룹핑 로직 구현

    const statistics: FormStatistics = {
      totalForms,
      activeForms,
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

// lib/forms.ts에 추가할 supervision_mappings 활용 함수들

/**
 * supervision_mappings을 활용한 담당자 배정
 */
export async function createOrUpdateSupervisionMapping(
  groupId: string,
  timeTeacherId?: string,
  teacherId?: string
): Promise<ApiResponse<string>> {
  try {
    // 기존 supervision_mapping 조회 시 null 처리
    const { data: existingMapping } = await supabaseAdmin
      .from("supervision_mappings")
      .select("id")
      .eq("group_id", groupId)
      .eq("time_teacher_id", timeTeacherId ?? "") // 🔧 ?? null 사용
      .eq("teacher_id", teacherId ?? "") // 🔧 ?? null 사용
      .single();

    if (existingMapping) {
      return { success: true, data: existingMapping.id };
    }

    // 새로운 supervision_mapping 생성
    const { data: newMapping, error } = await supabaseAdmin
      .from("supervision_mappings")
      .insert({
        group_id: groupId,
        time_teacher_id: timeTeacherId ?? null, // 🔧 ?? null 사용
        teacher_id: teacherId ?? null, // 🔧 ?? null 사용
      })
      .select("id")
      .single();

    if (error) throw error;

    return { success: true, data: newMapping.id };
  } catch (error) {
    console.error("Error creating supervision mapping:", error);
    return { success: false, error: "담당자 매핑 생성 중 오류가 발생했습니다." };
  }
}

/**
 * 폼의 담당자 정보를 supervision_mappings에 저장
 * (폼 전송 시 reports에서 이 정보를 사용)
 */
export async function saveFormSupervisionMapping(
  formId: string,
  groupId: string,
  timeTeacherId?: string,
  teacherId?: string
): Promise<ApiResponse<boolean>> {
  try {
    // supervision_mapping 생성/조회
    const mappingResult = await createOrUpdateSupervisionMapping(groupId, timeTeacherId, teacherId);

    if (!mappingResult.success) {
      return { success: false, error: mappingResult.error };
    }

    const supervisionId = mappingResult.data;

    // 폼의 description 조회
    const { data: form } = await supabaseAdmin
      .from("forms")
      .select("description")
      .eq("id", formId)
      .single();

    let description = form?.description || "";

    // 기존 supervision 정보 제거
    description = description.replace(/\[SUPERVISION:.*?\]/g, "").trim();

    // 새 supervision 정보 추가
    const supervisionInfo = JSON.stringify({
      supervisionId,
      timeTeacherId: timeTeacherId ?? null, // 🔧 ?? null 사용
      teacherId: teacherId ?? null, // 🔧 ?? null 사용
      updatedAt: new Date().toISOString(),
    });
    description = `${description}\n[SUPERVISION:${supervisionInfo}]`.trim();

    // 폼 업데이트
    const { error: updateError } = await supabaseAdmin
      .from("forms")
      .update({
        description,
        updated_at: new Date().toISOString(),
      })
      .eq("id", formId);

    if (updateError) throw updateError;

    return { success: true, data: true };
  } catch (error) {
    console.error("Error saving form supervision mapping:", error);
    return { success: false, error: "폼 담당자 정보 저장 중 오류가 발생했습니다." };
  }
}

/**
 * 폼에서 supervision 정보 추출
 */
export function extractFormSupervisionInfo(description: string | null): {
  supervisionId?: string;
  timeTeacherId?: string;
  teacherId?: string;
} {
  if (!description) return {};

  try {
    const match = description.match(/\[SUPERVISION:(.*?)\]/);
    if (match && match[1]) {
      const supervisionInfo = JSON.parse(match[1]);
      return {
        supervisionId: supervisionInfo.supervisionId || undefined,
        timeTeacherId: supervisionInfo.timeTeacherId || undefined,
        teacherId: supervisionInfo.teacherId || undefined,
      };
    }
  } catch (error) {
    console.error("Error extracting supervision info:", error);
  }

  return {};
}

/**
 * 폼 전송 시 reports에 supervision 정보 반영
 */
export async function updateReportsWithSupervision(formId: string): Promise<ApiResponse<boolean>> {
  try {
    // 폼의 supervision 정보 조회
    const { data: form } = await supabaseAdmin
      .from("forms")
      .select("description")
      .eq("id", formId)
      .single();

    const supervisionInfo = extractFormSupervisionInfo(form?.description ?? "");

    if (
      supervisionInfo.supervisionId ||
      supervisionInfo.timeTeacherId ||
      supervisionInfo.teacherId
    ) {
      // reports 테이블에 supervision 정보 업데이트
      const { error } = await supabaseAdmin
        .from("reports")
        .update({
          supervision_id: supervisionInfo.supervisionId || null,
          time_teacher_id: supervisionInfo.timeTeacherId || null,
          teacher_id: supervisionInfo.teacherId || null,
        })
        .eq("form_id", formId);

      if (error) {
        console.error("Error updating reports with supervision:", error);
        return { success: false, error: "리포트 담당자 정보 업데이트 실패" };
      }
    }

    return { success: true, data: true };
  } catch (error) {
    console.error("Error updating reports with supervision:", error);
    return { success: false, error: "리포트 담당자 정보 업데이트 중 오류가 발생했습니다." };
  }
}

/**
 * 기존 updateFormAssignment 함수를 supervision_mappings 활용하도록 수정
 */
export async function updateFormAssignment(
  request: UpdateFormAssignmentRequest
): Promise<ApiResponse<boolean>> {
  // 🔧 boolean 타입으로 수정
  try {
    // 폼의 그룹 ID 조회
    const { data: form } = await supabaseAdmin
      .from("forms")
      .select("group_id")
      .eq("id", request.formId)
      .single();

    if (!form?.group_id) {
      return { success: false, error: "폼의 그룹 정보를 찾을 수 없습니다." };
    }

    // supervision_mappings 활용하여 담당자 정보 저장
    const result = await saveFormSupervisionMapping(
      request.formId,
      form.group_id,
      request.timeTeacherId,
      request.teacherId
    );

    // 🔧 boolean 값으로 변환하여 반환
    return {
      success: result.success,
      data: result.success, // boolean 값으로 변환
      error: result.error,
    };
  } catch (error) {
    console.error("Error updating form assignment:", error);
    return { success: false, error: "담당자 배정 업데이트 중 오류가 발생했습니다." };
  }
}

/**
 * sendForm 함수도 수정하여 supervision 정보 reports에 반영
 */
export async function sendFormWithSupervision(
  request: SendFormRequest
): Promise<ApiResponse<boolean>> {
  try {
    // 기본 폼 전송
    const sendResult = await sendForm(request);
    if (!sendResult.success) {
      return sendResult;
    }

    // reports에 supervision 정보 반영
    await updateReportsWithSupervision(request.formId);

    return { success: true, data: true };
  } catch (error) {
    console.error("Error sending form with supervision:", error);
    return { success: false, error: "폼 전송 중 오류가 발생했습니다." };
  }
}

/**
 * 폼 상세 조회 시 supervision 정보 포함
 */
export async function getFormDetailsWithSupervision(formId: string): Promise<
  ApiResponse<
    FormWithDetails & {
      supervisionInfo?: {
        supervisionId?: string;
        timeTeacher?: { id: string; name: string; nickname: string };
        teacher?: { id: string; name: string; nickname: string };
      };
    }
  >
> {
  try {
    // 기본 폼 정보 조회
    const formResult = await getFormDetails(formId);
    if (!formResult.success) {
      return formResult;
    }

    const form = formResult.data!;

    // supervision 정보 추출
    const supervisionInfo = extractFormSupervisionInfo(form.description);

    // 🔧 타입을 명시적으로 정의
    let timeTeacher: { id: string; name: string; nickname: string } | undefined = undefined;
    let teacher: { id: string; name: string; nickname: string } | undefined = undefined;

    // 담당자 상세 정보 조회
    if (supervisionInfo.timeTeacherId) {
      const { data: timeTeacherData } = await supabaseAdmin
        .from("users")
        .select("id, name, nickname")
        .eq("id", supervisionInfo.timeTeacherId)
        .single();

      if (timeTeacherData) {
        timeTeacher = {
          id: timeTeacherData.id,
          name: timeTeacherData.name,
          nickname: timeTeacherData.nickname,
        };
      }
    }

    if (supervisionInfo.teacherId) {
      const { data: teacherData } = await supabaseAdmin
        .from("users")
        .select("id, name, nickname")
        .eq("id", supervisionInfo.teacherId)
        .single();

      if (teacherData) {
        teacher = {
          id: teacherData.id,
          name: teacherData.name,
          nickname: teacherData.nickname,
        };
      }
    }

    return {
      success: true,
      data: {
        ...form,
        supervisionInfo: {
          supervisionId: supervisionInfo.supervisionId,
          timeTeacher,
          teacher,
        },
      },
    };
  } catch (error) {
    console.error("Error fetching form details with supervision:", error);
    return { success: false, error: "폼 상세 정보 조회 중 오류가 발생했습니다." };
  }
}
