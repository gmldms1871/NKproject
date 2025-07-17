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
type RatingQuestionUpdate = Database["public"]["Tables"]["rating_questions"]["Update"];

type ChoiceQuestion = Database["public"]["Tables"]["choice_questions"]["Row"];
type ChoiceQuestionInsert = Database["public"]["Tables"]["choice_questions"]["Insert"];
type ChoiceQuestionUpdate = Database["public"]["Tables"]["choice_questions"]["Update"];

type ChoiceOption = Database["public"]["Tables"]["choice_options"]["Row"];
type ChoiceOptionInsert = Database["public"]["Tables"]["choice_options"]["Insert"];

type Report = Database["public"]["Tables"]["reports"]["Row"];
type ReportInsert = Database["public"]["Tables"]["reports"]["Insert"];

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
  questions?: CreateQuestionRequest[];
  tags?: string[];
  timeTeacherId?: string;
  teacherId?: string;
}

export interface UpdateFormRequest {
  title?: string;
  description?: string;
  tags?: string[];
}

export interface CreateQuestionRequest {
  questionType: "text" | "rating" | "choice" | "exam";
  questionText: string;
  isRequired: boolean;
  orderIndex: number;
  groupRolesId?: string;
  // 질문 타입별 추가 설정
  textConfig?: {
    questionSubtype?: "text" | "textarea"; // 주관식/서술형
    maxLength?: number;
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
  examConfig?: {
    conceptTemplateId?: string;
    totalQuestions: number;
  };
}

export interface UpdateQuestionRequest {
  questionText?: string;
  isRequired?: boolean;
  orderIndex?: number;
  // 타입별 설정도 업데이트 가능
  textConfig?: {
    questionSubtype?: "text" | "textarea";
    maxLength?: number;
  };
  ratingConfig?: {
    ratingMax?: number;
    ratingStep?: number;
  };
  choiceConfig?: {
    options?: string[];
    isMultiple?: boolean;
    etcOptionEnabled?: boolean;
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
  choiceDetails?: {
    choice_question: ChoiceQuestion;
    options: ChoiceOption[];
  };
}

export interface FormTargetWithDetails {
  id: string;
  target_type: string;
  target_id: string;
  form_id: string | null;
  created_at: string | null;
  // 타겟 상세 정보
  targetInfo: {
    id: string;
    name: string;
    type: "class" | "individual";
    memberCount?: number; // 반인 경우 구성원 수
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
  created_at: string | null;
}

export interface FormStatistics {
  formId: string;
  totalTargets: number;
  totalResponses: number;
  completedResponses: number;
  inProgressResponses: number;
  progressRate: number;
  averageCompletionTime?: number; // 분 단위
  responsesByDate: {
    date: string;
    count: number;
  }[];
}

// ===== 유틸리티 함수들 =====

/**
 * 폼 전송 알림 생성
 */
async function createFormSentNotification(
  recipientId: string,
  formId: string,
  message?: string
): Promise<void> {
  await createNotification({
    target_id: recipientId,
    creator_id: null,
    type: "form_sent",
    title: "새로운 폼이 도착했습니다",
    content: message || "폼을 작성해주세요.",
    action_url: `/forms/${formId}`,
    related_id: formId,
    is_read: false,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30일 후 만료
  });
}

/**
 * 폼 할당 알림 생성
 */
async function createFormAssignedNotification(
  recipientId: string,
  formId: string,
  title: string,
  message: string
): Promise<void> {
  await createNotification({
    target_id: recipientId,
    creator_id: null,
    type: "form_assigned",
    title,
    content: message,
    action_url: `/forms/${formId}`,
    related_id: formId,
    is_read: false,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });
}

// ===== 폼 관리 함수들 =====

/**
 * 그룹 내 모든 폼 조회 (응답률 포함)
 */
export async function getAllFormsInGroup(groupId: string): Promise<ApiResponse<FormWithDetails[]>> {
  try {
    const { data: forms, error } = await supabaseAdmin
      .from("forms")
      .select(
        `
        *,
        creator:users!forms_creator_id_fkey(id, name, nickname),
        form_questions(
          *,
          exam_questions(*, exam_concept_templates(*)),
          rating_questions(*),
          choice_questions(*)
        ),
        form_tag_links(form_tags(*)),
        form_targets(*),
        form_responses(*)
      `
      )
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const formsWithDetails: FormWithDetails[] = [];

    for (const form of forms) {
      const totalTargets = form.form_targets?.length || 0;
      const completedResponses =
        form.form_responses?.filter((r: FormResponse) => r.status === "completed").length || 0;

      // 선택형 질문의 옵션들을 별도로 조회
      const questionsWithDetails: QuestionWithDetails[] = [];
      if (form.form_questions) {
        for (const question of form.form_questions) {
          const questionDetail: QuestionWithDetails = {
            ...question,
            examDetails: question.exam_questions
              ? {
                  concept_template_id: question.exam_questions.concept_template_id,
                  total_questions: question.exam_questions.total_questions,
                  conceptTemplate: question.exam_questions.exam_concept_templates || undefined,
                }
              : undefined,
            ratingDetails: question.rating_questions || undefined,
          };

          // 선택형 질문의 경우 옵션들 조회
          if (question.choice_questions && question.question_type === "choice") {
            const { data: options } = await supabaseAdmin
              .from("choice_options")
              .select("*")
              .eq("question_id", question.id)
              .order("order_index");

            questionDetail.choiceDetails = {
              choice_question: question.choice_questions,
              options: options || [],
            };
          }

          questionsWithDetails.push(questionDetail);
        }
      }

      formsWithDetails.push({
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
        targets:
          form.form_targets?.map((target: FormTarget) => ({
            ...target,
            targetInfo: {
              id: target.target_id,
              name: "이름 조회 필요", // 별도 조회 필요
              type: target.target_type as "class" | "individual",
            },
          })) || [],
        responses: form.form_responses || [],
        totalTargets,
        completedResponses,
        progressRate: totalTargets > 0 ? (completedResponses / totalTargets) * 100 : 0,
      });
    }

    return { success: true, data: formsWithDetails };
  } catch (error) {
    console.error("Error fetching forms:", error);
    return { success: false, error: "폼 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 특정 폼에 대한 응답 조회
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

    return { success: true, data: responses };
  } catch (error) {
    console.error("Error fetching form responses:", error);
    return { success: false, error: "폼 응답 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 특정 폼의 타겟 조회
 */
export async function getFormTargets(
  formId: string
): Promise<ApiResponse<FormTargetWithDetails[]>> {
  try {
    const { data: targets, error } = await supabaseAdmin
      .from("form_targets")
      .select("*")
      .eq("form_id", formId);

    if (error) throw error;

    // 타겟 상세 정보 조회
    const targetsWithDetails: FormTargetWithDetails[] = [];

    for (const target of targets) {
      let targetInfo;

      if (target.target_type === "class") {
        const { data: classData } = await supabaseAdmin
          .from("classes")
          .select("id, name")
          .eq("id", target.target_id)
          .single();

        // 반 구성원 수 조회
        const { data: memberCount } = await supabaseAdmin
          .from("class_members")
          .select("id", { count: "exact" })
          .eq("class_id", target.target_id);

        targetInfo = {
          id: classData?.id || target.target_id,
          name: classData?.name || "Unknown Class",
          type: "class" as const,
          memberCount: memberCount?.length || 0,
        };
      } else {
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

    return { success: true, data: targetsWithDetails };
  } catch (error) {
    console.error("Error fetching form targets:", error);
    return { success: false, error: "폼 타겟 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 폼에 시간강사 및 부장선생님 연결
 */
export async function updateFormAssignment(
  request: UpdateFormAssignmentRequest
): Promise<ApiResponse<boolean>> {
  try {
    // 폼에 연결된 보고서들 조회
    const { data: reports, error: reportsError } = await supabaseAdmin
      .from("reports")
      .select("id")
      .eq("form_id", request.formId);

    if (reportsError) throw reportsError;

    // 각 보고서에 시간강사/선생님 할당
    if (reports && reports.length > 0) {
      const updates: Partial<ReportInsert> = {};
      if (request.timeTeacherId) updates.time_teacher_id = request.timeTeacherId;
      if (request.teacherId) updates.teacher_id = request.teacherId;

      const { error: updateError } = await supabaseAdmin
        .from("reports")
        .update(updates)
        .in(
          "id",
          reports.map((r) => r.id)
        );

      if (updateError) throw updateError;

      // 할당 알림 생성
      for (const report of reports) {
        if (request.timeTeacherId) {
          await createFormAssignedNotification(
            request.timeTeacherId,
            request.formId,
            "폼 검토 요청",
            "새로운 폼이 검토를 위해 할당되었습니다."
          );
        }

        if (request.teacherId) {
          await createFormAssignedNotification(
            request.teacherId,
            request.formId,
            "폼 최종 검토 요청",
            "최종 검토를 위한 폼이 할당되었습니다."
          );
        }
      }
    }

    return { success: true, data: true };
  } catch (error) {
    console.error("Error updating form assignment:", error);
    return { success: false, error: "폼 담당자 설정 중 오류가 발생했습니다." };
  }
}

/**
 * 폼 상세 정보 조회 (질문 포함)
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
          exam_questions(*, exam_concept_templates(*)),
          rating_questions(*),
          choice_questions(*)
        ),
        form_tag_links(form_tags(*)),
        form_targets(*),
        form_responses(*)
      `
      )
      .eq("id", formId)
      .single();

    if (error) throw error;

    const totalTargets = form.form_targets?.length || 0;
    const completedResponses =
      form.form_responses?.filter((r: FormResponse) => r.status === "completed").length || 0;

    // 선택형 질문의 옵션들을 별도로 조회
    const questionsWithDetails: QuestionWithDetails[] = [];
    if (form.form_questions) {
      for (const question of form.form_questions) {
        const questionDetail: QuestionWithDetails = {
          ...question,
          examDetails: question.exam_questions
            ? {
                concept_template_id: question.exam_questions.concept_template_id,
                total_questions: question.exam_questions.total_questions,
                conceptTemplate: question.exam_questions.exam_concept_templates || undefined,
              }
            : undefined,
          ratingDetails: question.rating_questions || undefined,
        };

        // 선택형 질문의 경우 옵션들 조회
        if (question.choice_questions && question.question_type === "choice") {
          const { data: options } = await supabaseAdmin
            .from("choice_options")
            .select("*")
            .eq("question_id", question.id)
            .order("order_index");

          questionDetail.choiceDetails = {
            choice_question: question.choice_questions,
            options: options || [],
          };
        }

        questionsWithDetails.push(questionDetail);
      }
    }

    // 타겟 상세 정보 조회
    const targetsWithDetails: FormTargetWithDetails[] = [];
    if (form.form_targets) {
      for (const target of form.form_targets) {
        let targetInfo;

        if (target.target_type === "class") {
          const { data: classData } = await supabaseAdmin
            .from("classes")
            .select("id, name")
            .eq("id", target.target_id)
            .single();

          // 반 구성원 수 조회
          const { data: memberCount } = await supabaseAdmin
            .from("class_members")
            .select("id", { count: "exact" })
            .eq("class_id", target.target_id);

          targetInfo = {
            id: classData?.id || target.target_id,
            name: classData?.name || "Unknown Class",
            type: "class" as const,
            memberCount: memberCount?.length || 0,
          };
        } else {
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
 * 폼 필터링 검색
 */
export async function searchForms(
  conditions: FormSearchConditions
): Promise<ApiResponse<FormWithDetails[]>> {
  try {
    let query = supabaseAdmin.from("forms").select(`
        *,
        creator:users!forms_creator_id_fkey(id, name, nickname),
        form_questions(*),
        form_tag_links(form_tags(*)),
        form_targets(*),
        form_responses(*)
      `);

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

    let filteredForms = forms;

    // 태그 필터링 (별도 처리)
    if (conditions.tags && conditions.tags.length > 0) {
      filteredForms = forms.filter((form) =>
        form.form_tag_links?.some(
          (link: { form_tags: FormTag | null }) =>
            link.form_tags && conditions.tags!.includes(link.form_tags.name)
        )
      );
    }

    const formsWithDetails: FormWithDetails[] = filteredForms.map((form) => {
      const totalTargets = form.form_targets?.length || 0;
      const completedResponses =
        form.form_responses?.filter((r: FormResponse) => r.status === "completed").length || 0;

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
        questions:
          form.form_questions?.sort(
            (a: FormQuestion, b: FormQuestion) => a.order_index - b.order_index
          ) || [],
        tags:
          form.form_tag_links
            ?.map((link: { form_tags: FormTag }) => link.form_tags)
            .filter(Boolean) || [],
        targets:
          form.form_targets?.map((target: FormTarget) => ({
            ...target,
            targetInfo: {
              id: target.target_id,
              name: "이름 조회 필요",
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
    // 폼 생성
    const { data: form, error: formError } = await supabaseAdmin
      .from("forms")
      .insert({
        title: request.title,
        description: request.description,
        group_id: request.groupId,
        creator_id: request.creatorId,
        status: "draft",
      })
      .select()
      .single();

    if (formError) throw formError;

    // 질문 생성
    if (request.questions && request.questions.length > 0) {
      for (const questionReq of request.questions) {
        const questionResult = await createQuestion(form.id, questionReq);
        if (!questionResult.success) {
          throw new Error(questionResult.error);
        }
      }
    }

    // 태그 연결
    if (request.tags && request.tags.length > 0) {
      await linkFormTags(form.id, request.tags);
    }

    // 보고서 생성 (폼 생성과 동시에)
    const { error: reportError } = await supabaseAdmin.from("reports").insert({
      form_id: form.id,
      stage: 0, // 아직 응답 없음
      time_teacher_id: request.timeTeacherId,
      teacher_id: request.teacherId,
      draft_status: "waiting_response",
    });

    if (reportError) console.warn("Report creation warning:", reportError);

    return { success: true, data: form.id };
  } catch (error) {
    console.error("Error creating form:", error);
    return { success: false, error: "폼 생성 중 오류가 발생했습니다." };
  }
}

/**
 * 폼 임시저장
 */
export async function saveDraftForm(request: CreateFormRequest): Promise<ApiResponse<string>> {
  try {
    return await createForm({
      ...request,
      // 임시저장은 status를 draft로 유지
    });
  } catch (error) {
    console.error("Error saving draft form:", error);
    return { success: false, error: "폼 임시저장 중 오류가 발생했습니다." };
  }
}

/**
 * 폼 정보 수정
 */
export async function updateForm(
  formId: string,
  request: UpdateFormRequest
): Promise<ApiResponse<boolean>> {
  try {
    // 폼이 전송된 상태인지 확인
    const { data: form, error: formError } = await supabaseAdmin
      .from("forms")
      .select("status, sent_at")
      .eq("id", formId)
      .single();

    if (formError) throw formError;

    if (form.sent_at) {
      return { success: false, error: "전송된 폼은 수정할 수 없습니다." };
    }

    const updates: Partial<FormUpdate> = {};
    if (request.title) updates.title = request.title;
    if (request.description !== undefined) updates.description = request.description;
    updates.updated_at = new Date().toISOString();

    const { error: updateError } = await supabaseAdmin
      .from("forms")
      .update(updates)
      .eq("id", formId);

    if (updateError) throw updateError;

    // 태그 업데이트
    if (request.tags !== undefined) {
      await updateFormTags(formId, request.tags);
    }

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
    // 원본 폼 조회
    const originalFormResult = await getFormDetails(request.formId);
    if (!originalFormResult.success || !originalFormResult.data) {
      throw new Error("원본 폼을 찾을 수 없습니다.");
    }

    const originalForm = originalFormResult.data;

    // 새 폼 제목 생성
    const newTitle = request.newTitle || `${originalForm.title} [복사본]`;

    // 새 폼 생성
    const { data: newForm, error: formError } = await supabaseAdmin
      .from("forms")
      .insert({
        title: newTitle,
        description: originalForm.description,
        group_id: originalForm.group_id,
        creator_id: request.userId,
        status: "draft",
      })
      .select()
      .single();

    if (formError) throw formError;

    // 질문 복제
    for (const question of originalForm.questions) {
      const questionRequest: CreateQuestionRequest = {
        questionType: question.question_type as "text" | "rating" | "choice" | "exam",
        questionText: question.question_text,
        isRequired: question.is_required || false,
        orderIndex: question.order_index,
        groupRolesId: question.group_roles_id || undefined,
      };

      // 타입별 설정 복제
      if (question.examDetails) {
        questionRequest.examConfig = {
          conceptTemplateId: question.examDetails.concept_template_id || undefined,
          totalQuestions: question.examDetails.total_questions,
        };
      }

      if (question.ratingDetails) {
        questionRequest.ratingConfig = {
          ratingMax: question.ratingDetails.rating_max,
          ratingStep: question.ratingDetails.rating_step || 1,
        };
      }

      if (question.choiceDetails) {
        questionRequest.choiceConfig = {
          options: question.choiceDetails.options.map((opt) => opt.option_text),
          isMultiple: question.choiceDetails.choice_question.is_multiple || false,
          etcOptionEnabled: question.choiceDetails.choice_question.etc_option_enabled || false,
        };
      }

      await createQuestion(newForm.id, questionRequest);
    }

    // 태그 복제
    if (originalForm.tags.length > 0) {
      await linkFormTags(
        newForm.id,
        originalForm.tags.map((tag) => tag.name)
      );
    }

    // 타겟과 선생님 설정은 초기화 (복제하지 않음)

    return { success: true, data: newForm.id };
  } catch (error) {
    console.error("Error duplicating form:", error);
    return { success: false, error: "폼 복제 중 오류가 발생했습니다." };
  }
}

/**
 * 폼 보내기
 */
export async function sendForm(request: SendFormRequest): Promise<ApiResponse<boolean>> {
  try {
    // 폼 상태 업데이트
    const { error: formError } = await supabaseAdmin
      .from("forms")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", request.formId);

    if (formError) throw formError;

    // 타겟 설정
    const targets: FormTargetInsert[] = request.targets.map((target) => ({
      form_id: request.formId,
      target_type: target.type,
      target_id: target.id,
    }));

    const { error: targetsError } = await supabaseAdmin.from("form_targets").insert(targets);

    if (targetsError) throw targetsError;

    // 각 타겟에게 폼 응답 엔트리 생성
    for (const target of request.targets) {
      if (target.type === "class") {
        // 반 구성원들에게 응답 엔트리 생성
        const { data: classMembers, error: membersError } = await supabaseAdmin
          .from("class_members")
          .select("user_id, classes(name)")
          .eq("class_id", target.id);

        if (membersError) throw membersError;

        for (const member of classMembers) {
          const { error: responseError } = await supabaseAdmin.from("form_responses").insert({
            form_id: request.formId,
            student_id: member.user_id,
            class_id: target.id,
            class_name: member.classes?.name,
            status: "pending",
            responder_type: "student",
          });

          if (responseError) console.warn("Response entry creation warning:", responseError);

          // 학생에게 알림 전송
          if (member.user_id) {
            await createFormSentNotification(member.user_id, request.formId, request.message);
          }
        }
      } else {
        // 개별 사용자에게 응답 엔트리 생성
        const { error: responseError } = await supabaseAdmin.from("form_responses").insert({
          form_id: request.formId,
          student_id: target.id,
          status: "pending",
          responder_type: "student",
        });

        if (responseError) console.warn("Response entry creation warning:", responseError);

        // 개별 사용자에게 알림 전송
        await createFormSentNotification(target.id, request.formId, request.message);
      }
    }

    return { success: true, data: true };
  } catch (error) {
    console.error("Error sending form:", error);
    return { success: false, error: "폼 전송 중 오류가 발생했습니다." };
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

    // 보고서 단계를 1로 업데이트
    const { error: reportError } = await supabaseAdmin
      .from("reports")
      .update({
        stage: 1,
        draft_status: "waiting_time_teacher",
      })
      .eq("form_id", request.formId)
      .eq("form_response_id", formResponse.id);

    if (reportError) console.warn("Report stage update warning:", reportError);

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
 * 폼에 태그 연결
 */
export async function linkFormTags(
  formId: string,
  tagNames: string[]
): Promise<ApiResponse<boolean>> {
  try {
    // 기존 태그 링크 삭제
    const { error: deleteError } = await supabaseAdmin
      .from("form_tag_links")
      .delete()
      .eq("form_id", formId);

    if (deleteError) throw deleteError;

    if (tagNames.length === 0) {
      return { success: true, data: true };
    }

    // 태그 ID 조회/생성
    const tagIds: string[] = [];
    for (const tagName of tagNames) {
      const { data: tag, error } = await supabaseAdmin
        .from("form_tags")
        .select("id")
        .eq("name", tagName)
        .single();

      if (error && error.code === "PGRST116") {
        // 태그가 없으면 생성
        const createResult = await createFormTag(tagName);
        if (createResult.success && createResult.data) {
          tagIds.push(createResult.data);
        }
      } else if (tag) {
        tagIds.push(tag.id);
      }
    }

    // 태그 링크 생성
    const links: FormTagLinkInsert[] = tagIds.map((tagId) => ({
      form_id: formId,
      tag_id: tagId,
    }));

    const { error: linkError } = await supabaseAdmin.from("form_tag_links").insert(links);

    if (linkError) throw linkError;

    return { success: true, data: true };
  } catch (error) {
    console.error("Error linking form tags:", error);
    return { success: false, error: "폼 태그 연결 중 오류가 발생했습니다." };
  }
}

/**
 * 폼 태그 업데이트
 */
export async function updateFormTags(
  formId: string,
  tagNames: string[]
): Promise<ApiResponse<boolean>> {
  return await linkFormTags(formId, tagNames);
}

// ===== 질문 관리 =====

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
        group_roles_id: request.groupRolesId,
      })
      .select()
      .single();

    if (questionError) throw questionError;

    // 타입별 세부 설정 생성
    if (request.questionType === "exam" && request.examConfig) {
      const { error: examError } = await supabaseAdmin.from("exam_questions").insert({
        question_id: question.id,
        concept_template_id: request.examConfig.conceptTemplateId,
        total_questions: request.examConfig.totalQuestions,
      });

      if (examError) throw examError;
    }

    if (request.questionType === "rating" && request.ratingConfig) {
      const { error: ratingError } = await supabaseAdmin.from("rating_questions").insert({
        question_id: question.id,
        rating_max: request.ratingConfig.ratingMax,
        rating_step: request.ratingConfig.ratingStep,
      });

      if (ratingError) throw ratingError;
    }

    if (request.questionType === "choice" && request.choiceConfig) {
      // 선택형 질문 생성
      const { error: choiceError } = await supabaseAdmin.from("choice_questions").insert({
        question_id: question.id,
        is_multiple: request.choiceConfig.isMultiple,
        etc_option_enabled: request.choiceConfig.etcOptionEnabled || false,
      });

      if (choiceError) throw choiceError;

      // 선택지 생성
      const options: ChoiceOptionInsert[] = request.choiceConfig.options.map(
        (optionText, index) => ({
          question_id: question.id,
          option_text: optionText,
          order_index: index,
        })
      );

      const { error: optionsError } = await supabaseAdmin.from("choice_options").insert(options);

      if (optionsError) throw optionsError;
    }

    return { success: true, data: question.id };
  } catch (error) {
    console.error("Error creating question:", error);
    return { success: false, error: "질문 생성 중 오류가 발생했습니다." };
  }
}

/**
 * 질문 수정
 */
export async function updateQuestion(
  questionId: string,
  request: UpdateQuestionRequest
): Promise<ApiResponse<boolean>> {
  try {
    // 기본 질문 정보 수정
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

    // 타입별 세부 설정 수정
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
      // 기존 선택지 삭제 후 재생성
      const { error: deleteOptionsError } = await supabaseAdmin
        .from("choice_options")
        .delete()
        .eq("question_id", questionId);

      if (deleteOptionsError) throw deleteOptionsError;

      // 선택형 질문 설정 업데이트
      const { error: updateChoiceError } = await supabaseAdmin
        .from("choice_questions")
        .update({
          is_multiple: request.choiceConfig.isMultiple,
          etc_option_enabled: request.choiceConfig.etcOptionEnabled,
        })
        .eq("question_id", questionId);

      if (updateChoiceError) throw updateChoiceError;

      // 새 선택지 생성
      if (request.choiceConfig.options) {
        const options: ChoiceOptionInsert[] = request.choiceConfig.options.map(
          (optionText, index) => ({
            question_id: questionId,
            option_text: optionText,
            order_index: index,
          })
        );

        const { error: insertOptionsError } = await supabaseAdmin
          .from("choice_options")
          .insert(options);

        if (insertOptionsError) throw insertOptionsError;
      }
    }

    if (request.examConfig) {
      const { error: examError } = await supabaseAdmin
        .from("exam_questions")
        .update({
          concept_template_id: request.examConfig.conceptTemplateId,
          total_questions: request.examConfig.totalQuestions,
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
 * 질문 순서 변경
 */
export async function reorderQuestions(
  request: ReorderQuestionsRequest
): Promise<ApiResponse<boolean>> {
  try {
    for (const questionOrder of request.questionOrders) {
      const { error } = await supabaseAdmin
        .from("form_questions")
        .update({ order_index: questionOrder.newOrderIndex })
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
 * 질문 삭제
 */
export async function deleteQuestion(questionId: string): Promise<ApiResponse<boolean>> {
  try {
    // 관련 데이터 삭제 (cascading으로 처리되지 않는 경우)
    await supabaseAdmin.from("choice_options").delete().eq("question_id", questionId);
    await supabaseAdmin.from("choice_questions").delete().eq("question_id", questionId);
    await supabaseAdmin.from("rating_questions").delete().eq("question_id", questionId);
    await supabaseAdmin.from("exam_questions").delete().eq("question_id", questionId);
    await supabaseAdmin.from("form_question_responses").delete().eq("question_id", questionId);

    // 질문 삭제
    const { error } = await supabaseAdmin.from("form_questions").delete().eq("id", questionId);

    if (error) throw error;

    return { success: true, data: true };
  } catch (error) {
    console.error("Error deleting question:", error);
    return { success: false, error: "질문 삭제 중 오류가 발생했습니다." };
  }
}

// ===== 개념 템플릿 관리 =====

/**
 * 개념 템플릿 생성
 */
export async function createConceptTemplate(
  request: CreateConceptTemplateRequest
): Promise<ApiResponse<string>> {
  try {
    const { data: template, error } = await supabaseAdmin
      .from("exam_concept_templates")
      .insert({
        name: request.name,
        group_id: request.groupId,
        concept_count: request.conceptCount,
        status: request.status || "draft",
        creator_id: request.creatorId,
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data: template.id };
  } catch (error) {
    console.error("Error creating concept template:", error);
    return { success: false, error: "개념 템플릿 생성 중 오류가 발생했습니다." };
  }
}

/**
 * 개념 템플릿 수정
 */
export async function updateConceptTemplate(
  templateId: string,
  request: UpdateConceptTemplateRequest
): Promise<ApiResponse<boolean>> {
  try {
    const updates: Partial<ExamConceptTemplateUpdate> = {};
    if (request.name) updates.name = request.name;
    if (request.conceptCount) updates.concept_count = request.conceptCount;
    if (request.status) updates.status = request.status;
    updates.updated_at = new Date().toISOString();

    const { error } = await supabaseAdmin
      .from("exam_concept_templates")
      .update(updates)
      .eq("id", templateId);

    if (error) throw error;

    return { success: true, data: true };
  } catch (error) {
    console.error("Error updating concept template:", error);
    return { success: false, error: "개념 템플릿 수정 중 오류가 발생했습니다." };
  }
}

/**
 * 개념 템플릿 복제 (기존 함수 수정)
 */
export async function duplicateConceptTemplate(request: {
  templateId: string;
  userId: string;
  newName?: string;
}): Promise<ApiResponse<string>> {
  try {
    // 원본 템플릿 조회
    const { data: original, error: getError } = await supabaseAdmin
      .from("exam_concept_templates")
      .select(
        `
        *,
        exam_concept_template_items(*)
      `
      )
      .eq("id", request.templateId)
      .single();

    if (getError) throw getError;

    // 새 템플릿 생성
    const { data: newTemplate, error: createError } = await supabaseAdmin
      .from("exam_concept_templates")
      .insert({
        name: request.newName || `${original.name} [복사본]`,
        group_id: original.group_id,
        concept_count: original.concept_count,
        status: "draft", // 복제본은 항상 임시저장으로
        creator_id: request.userId,
      })
      .select()
      .single();

    if (createError) throw createError;

    // 개념 아이템들도 복제
    if (original.exam_concept_template_items && original.exam_concept_template_items.length > 0) {
      const itemsToInsert = original.exam_concept_template_items.map((item) => ({
        template_id: newTemplate.id,
        concept_text: item.concept_text,
        concept_description: item.concept_description,
        order_index: item.order_index,
      }));

      const { error: itemsError } = await supabaseAdmin
        .from("exam_concept_template_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }

    return { success: true, data: newTemplate.id };
  } catch (error) {
    console.error("Error duplicating concept template:", error);
    return { success: false, error: "개념 템플릿 복제 중 오류가 발생했습니다." };
  }
}

/**
 * 개념 템플릿 연결
 */
export async function linkConceptTemplate(
  request: LinkConceptTemplateRequest
): Promise<ApiResponse<boolean>> {
  try {
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
 * 폼 통계 조회
 */
export async function getFormStatistics(formId: string): Promise<ApiResponse<FormStatistics>> {
  try {
    // 폼 기본 정보 조회
    const { data: form, error: formError } = await supabaseAdmin
      .from("forms")
      .select("id")
      .eq("id", formId)
      .single();

    if (formError) throw formError;

    // 타겟 수 조회
    const { data: targets, error: targetsError } = await supabaseAdmin
      .from("form_targets")
      .select("id", { count: "exact" })
      .eq("form_id", formId);

    if (targetsError) throw targetsError;

    // 응답 조회
    const { data: responses, error: responsesError } = await supabaseAdmin
      .from("form_responses")
      .select("status, submitted_at, created_at")
      .eq("form_id", formId);

    if (responsesError) throw responsesError;

    const totalTargets = targets?.length || 0;
    const totalResponses = responses?.length || 0;
    const completedResponses = responses?.filter((r) => r.status === "completed").length || 0;
    const inProgressResponses = responses?.filter((r) => r.status === "pending").length || 0;

    // 날짜별 응답 수 계산
    const responsesByDate: { [date: string]: number } = {};
    responses?.forEach((response) => {
      if (response.submitted_at) {
        const date = response.submitted_at.split("T")[0];
        responsesByDate[date] = (responsesByDate[date] || 0) + 1;
      }
    });

    const statistics: FormStatistics = {
      formId,
      totalTargets,
      totalResponses,
      completedResponses,
      inProgressResponses,
      progressRate: totalTargets > 0 ? (completedResponses / totalTargets) * 100 : 0,
      responsesByDate: Object.entries(responsesByDate).map(([date, count]) => ({
        date,
        count,
      })),
    };

    return { success: true, data: statistics };
  } catch (error) {
    console.error("Error fetching form statistics:", error);
    return { success: false, error: "폼 통계 조회 중 오류가 발생했습니다." };
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

/**
 * 개념 템플릿 검색
 */
export async function searchConceptTemplates(conditions: {
  groupId: string;
  name?: string;
  status?: string[];
  creatorId?: string;
}): Promise<ApiResponse<ExamConceptTemplate[]>> {
  try {
    let query = supabaseAdmin
      .from("exam_concept_templates")
      .select(
        `
        *,
        exam_concept_template_items(*)
      `
      )
      .eq("group_id", conditions.groupId);

    if (conditions.name) {
      query = query.ilike("name", `%${conditions.name}%`);
    }

    if (conditions.status && conditions.status.length > 0) {
      query = query.in("status", conditions.status);
    }

    if (conditions.creatorId) {
      query = query.eq("creator_id", conditions.creatorId);
    }

    const { data: templates, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;

    return { success: true, data: templates || [] };
  } catch (error) {
    console.error("Error searching concept templates:", error);
    return { success: false, error: "개념 템플릿 검색 중 오류가 발생했습니다." };
  }
}

/**
 * 개념 템플릿 삭제
 */
export async function deleteConceptTemplate(
  templateId: string,
  userId: string
): Promise<ApiResponse<boolean>> {
  try {
    // 권한 확인
    const { data: template, error: checkError } = await supabaseAdmin
      .from("exam_concept_templates")
      .select("creator_id")
      .eq("id", templateId)
      .single();

    if (checkError) throw checkError;

    if (template.creator_id !== userId) {
      return { success: false, error: "템플릿을 삭제할 권한이 없습니다." };
    }

    // 사용중인지 확인
    const { data: usageCheck, error: usageError } = await supabaseAdmin
      .from("exam_questions")
      .select("id")
      .eq("concept_template_id", templateId)
      .limit(1);

    if (usageError) throw usageError;

    if (usageCheck && usageCheck.length > 0) {
      return { success: false, error: "사용 중인 템플릿은 삭제할 수 없습니다." };
    }

    // 템플릿 삭제 (cascade로 template_items도 함께 삭제됨)
    const { error } = await supabaseAdmin
      .from("exam_concept_templates")
      .delete()
      .eq("id", templateId);

    if (error) throw error;

    return { success: true, data: true };
  } catch (error) {
    console.error("Error deleting concept template:", error);
    return { success: false, error: "개념 템플릿 삭제 중 오류가 발생했습니다." };
  }
}
