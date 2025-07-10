import { supabaseAdmin } from "./supabase";
import { Database } from "./types/types";
import {
  FormStatus,
  FormTag,
  FormTarget,
  FormTeacher,
  FormQuestion,
  FormSummary,
  FormDetail,
  ConceptTemplate,
  Paging,
  FormFilters,
  FormResponse,
  ChoiceQuestion,
  FormAnswer,
} from "./types/forms";

/**
 * 그룹 내 폼 전체 조회 (페이징/필터/검색)
 * @param groupId 그룹 ID
 * @param filters 태그/이름/타겟/상태 등 필터
 * @param paging page/limit
 * @param userId 조회자(권한 체크용)
 */
export async function getFormsByGroup(
  groupId: string,
  userId: string,
  filters?: FormFilters,
  paging?: Paging
): Promise<FormSummary[]> {
  // 1. 그룹 멤버인지 확인
  const { data: memberCheck } = await supabaseAdmin
    .from("group_member")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .single();
  if (!memberCheck) return [];

  // 2. 타겟 필터용 form_id 리스트 미리 구하기
  let targetFormIds: string[] | undefined = undefined;
  if (filters?.target_id) {
    const { data: targetLinks } = await supabaseAdmin
      .from("form_targets")
      .select("form_id")
      .eq("target_id", filters.target_id);
    if (targetLinks) {
      targetFormIds = targetLinks
        .map((t: { form_id: string | null }) => t.form_id)
        .filter((id): id is string => !!id);
      if (targetFormIds.length === 0) return [];
    }
  }

  // 3. 폼 기본 쿼리
  let query = supabaseAdmin
    .from("forms")
    .select(
      `*,
        form_tag_links:form_tag_links!inner(form_tags(*))
      `
    )
    .eq("group_id", groupId);

  // 4. 필터 적용
  if (filters) {
    if (filters.title) {
      query = query.ilike("title", `%${filters.title}%`);
    }
    if (filters.status) {
      query = query.eq("status", filters.status);
    }
    // 태그 필터 (여러개면 or)
    if (filters.tag_ids && filters.tag_ids.length > 0) {
      query = query.in("form_tag_links.tag_id", filters.tag_ids);
    }
    // 타겟 필터 (form_id in targetFormIds)
    if (targetFormIds) {
      query = query.in("id", targetFormIds);
    }
  }

  // 5. 페이징
  if (paging) {
    const from = (paging.page - 1) * paging.limit;
    const to = from + paging.limit - 1;
    query = query.range(from, to);
  }

  // 6. 정렬(최신순)
  query = query.order("created_at", { ascending: false });

  // 7. 쿼리 실행
  const { data, error } = await query;
  if (error || !data) return [];

  // 8. 반환 데이터 구조화
  return data.map(
    (form: {
      id: string;
      title: string;
      status: string;
      group_id: string | null;
      creator_id: string | null;
      created_at: string | null;
      updated_at: string | null;
      form_tag_links?: { form_tags: FormTag }[];
    }) => ({
      id: form.id,
      title: form.title,
      status: form.status as FormStatus,
      group_id: form.group_id || "",
      creator_id: form.creator_id || "",
      created_at: form.created_at || "",
      updated_at: form.updated_at || "",
      tags: (form.form_tag_links || []).map((link) => link.form_tags),
    })
  );
}

/**
 * 폼 상세 조회 (질문/타겟/선생님 포함)
 * @param formId 폼 ID
 * @param userId 조회자(권한 체크용)
 */
export async function getFormDetail(formId: string, userId: string): Promise<FormDetail | null> {
  // 1. 폼 정보 조회 (group_id 포함)
  const { data: form, error: formError } = await supabaseAdmin
    .from("forms")
    .select("*")
    .eq("id", formId)
    .single();
  if (formError || !form) return null;

  // 2. 그룹 멤버인지 확인
  if (!form.group_id) return null;
  const { data: memberCheck } = await supabaseAdmin
    .from("group_member")
    .select("id")
    .eq("group_id", form.group_id)
    .eq("user_id", userId)
    .single();
  if (!memberCheck) return null;

  // 3. 태그 조회
  const { data: tagLinks } = await supabaseAdmin
    .from("form_tag_links")
    .select("form_tags(*)")
    .eq("form_id", formId);
  const tags = (tagLinks || []).map((link: { form_tags: FormTag }) => link.form_tags);

  // 4. 질문 조회 (order_index 순)
  const { data: questionsRaw } = await supabaseAdmin
    .from("form_questions")
    .select("*")
    .eq("form_id", formId)
    .order("order_index", { ascending: true });
  const questions: FormQuestion[] = (questionsRaw || []).map(
    (q: {
      id: string;
      form_id: string | null;
      order_index: number;
      question_text: string;
      question_type: string;
      is_required: boolean | null;
      concept_template_id?: string | null;
      total_questions?: number | null;
      rating_max?: number | null;
      rating_step?: number | null;
      is_multiple?: boolean | null;
      etc_option_enabled?: boolean | null;
      question_subtype?: string | null;
      char_limit?: number | null;
    }) => {
      if (q.question_type === "exam") {
        return {
          ...q,
          form_id: q.form_id || "",
          is_required: !!q.is_required,
          question_type: "exam",
          concept_template_id: q.concept_template_id || "",
          total_questions: q.total_questions || 0,
        };
      } else if (q.question_type === "rating") {
        return {
          ...q,
          form_id: q.form_id || "",
          is_required: !!q.is_required,
          question_type: "rating",
          rating_max: q.rating_max || 5,
          rating_step: q.rating_step === 0.5 ? 0.5 : 1,
        };
      } else if (q.question_type === "choice") {
        return {
          ...q,
          form_id: q.form_id || "",
          is_required: !!q.is_required,
          question_type: "choice",
          is_multiple: !!q.is_multiple,
          etc_option_enabled: !!q.etc_option_enabled,
          options: [],
        };
      } else if (q.question_type === "text") {
        return {
          ...q,
          form_id: q.form_id || "",
          is_required: !!q.is_required,
          question_type: "text",
          question_subtype: (q.question_subtype || "short") as "short" | "long",
          char_limit: q.char_limit || 100,
        };
      }
      return q as FormQuestion;
    }
  );

  // 5. 선택형 질문 옵션 join
  const choiceQuestionIds = questions.filter((q) => q.question_type === "choice").map((q) => q.id);
  const choiceOptionsMap: Record<
    string,
    { id: string; option_text: string; order_index: number }[]
  > = {};
  if (choiceQuestionIds.length > 0) {
    const { data: optionsRaw } = await supabaseAdmin
      .from("choice_options")
      .select("*")
      .in("question_id", choiceQuestionIds);
    if (optionsRaw) {
      for (const opt of optionsRaw as {
        id: string;
        option_text: string;
        order_index: number;
        question_id: string | null;
      }[]) {
        if (!opt.question_id) continue;
        if (!choiceOptionsMap[opt.question_id]) choiceOptionsMap[opt.question_id] = [];
        choiceOptionsMap[opt.question_id].push({
          id: opt.id,
          option_text: opt.option_text,
          order_index: opt.order_index,
        });
      }
    }
  }
  // 옵션을 질문에 할당
  for (const q of questions) {
    if (q.question_type === "choice") {
      (q as ChoiceQuestion).options = choiceOptionsMap[q.id] || [];
    }
  }

  // 6. 타겟 조회
  const { data: targetLinks } = await supabaseAdmin
    .from("form_targets")
    .select("id, target_id, target_type")
    .eq("form_id", formId);
  const targets: FormTarget[] = (targetLinks || []).map(
    (t: { id: string; target_id: string; target_type: string }) => ({
      id: t.id,
      target_id: t.target_id,
      target_type: t.target_type as "user" | "class",
    })
  );

  // 7. 선생님(부장/시간강사) 조회 (현재 미구현, supervision_mappings 등 별도 쿼리 없음)
  const teachers: FormTeacher[] = [];

  // 8. 반환
  return {
    id: form.id,
    title: form.title,
    status: form.status as FormStatus,
    group_id: form.group_id || "",
    creator_id: form.creator_id || "",
    created_at: form.created_at || "",
    updated_at: form.updated_at || "",
    description: form.description || "",
    sent_at: form.sent_at || "",
    tags,
    questions,
    targets,
    teachers,
  };
}

/**
 * 폼 응답 조회 (페이징)
 * @param formId 폼 ID
 * @param userId 조회자(권한 체크용)
 * @param paging page/limit
 */
export async function getFormResponses(
  formId: string,
  userId: string,
  paging?: Paging
): Promise<FormResponse[]> {
  // 1. 폼 정보 조회 (group_id 포함)
  const { data: form } = await supabaseAdmin
    .from("forms")
    .select("group_id")
    .eq("id", formId)
    .single();
  if (!form || !form.group_id) return [];

  // 2. 그룹 멤버인지 확인
  const { data: memberCheck } = await supabaseAdmin
    .from("group_member")
    .select("id")
    .eq("group_id", form.group_id)
    .eq("user_id", userId)
    .single();
  if (!memberCheck) return [];

  // 3. 응답 쿼리
  let query = supabaseAdmin.from("form_responses").select("*").eq("form_id", formId);
  if (paging) {
    const from = (paging.page - 1) * paging.limit;
    const to = from + paging.limit - 1;
    query = query.range(from, to);
  }
  query = query.order("created_at", { ascending: false });
  const { data: responsesRaw } = await query;
  if (!responsesRaw) return [];

  // 4. 응답별 답변 join
  type FormAnswerRaw = {
    form_response_id: string | null;
    question_id: string | null;
    text_response?: string | null;
    number_response?: number | null;
    rating_response?: number | null;
    exam_response?: unknown | null;
  };
  const responseIds = responsesRaw.map((r: { id: string }) => r.id);
  const answersMap: Record<string, FormAnswer[]> = {};
  if (responseIds.length > 0) {
    const { data: answersRaw } = await supabaseAdmin
      .from("form_question_responses")
      .select("*")
      .in("form_response_id", responseIds);
    if (answersRaw) {
      for (const ans of answersRaw as FormAnswerRaw[]) {
        if (!ans.form_response_id || !ans.question_id) continue;
        if (!answersMap[ans.form_response_id]) answersMap[ans.form_response_id] = [];
        let answer: string | number | string[] | number[] | null = null;
        if (ans.text_response !== undefined && ans.text_response !== null) {
          answer = ans.text_response;
        } else if (ans.number_response !== undefined && ans.number_response !== null) {
          answer = ans.number_response;
        } else if (ans.rating_response !== undefined && ans.rating_response !== null) {
          answer = ans.rating_response;
        } else if (ans.exam_response !== undefined && ans.exam_response !== null) {
          if (typeof ans.exam_response === "object") {
            answer = JSON.stringify(ans.exam_response);
          } else {
            answer = ans.exam_response as string | number;
          }
        }
        answersMap[ans.form_response_id].push({
          question_id: ans.question_id,
          answer,
        });
      }
    }
  }

  // 5. 반환 데이터 구조화
  return responsesRaw.map(
    (r: {
      id: string;
      form_id: string | null;
      student_id: string | null;
      responder_type: string | null;
      status: string;
      submitted_at: string | null;
    }) => ({
      id: r.id,
      form_id: r.form_id || "",
      responder_id: r.student_id || "",
      responder_type: (r.responder_type || "user") as "user" | "class",
      status: r.status === "draft" ? "draft" : "submitted",
      submitted_at: r.submitted_at || "",
      answers: answersMap[r.id] || [],
    })
  );
}

/**
 * 폼 타겟 조회
 * @param formId 폼 ID
 * @param userId 조회자(권한 체크용)
 */
export async function getFormTargets(formId: string, userId: string): Promise<FormTarget[]> {
  // 1. 폼 정보 조회 (group_id 포함)
  const { data: form } = await supabaseAdmin
    .from("forms")
    .select("group_id")
    .eq("id", formId)
    .single();
  if (!form || !form.group_id) return [];

  // 2. 그룹 멤버인지 확인
  const { data: memberCheck } = await supabaseAdmin
    .from("group_member")
    .select("id")
    .eq("group_id", form.group_id)
    .eq("user_id", userId)
    .single();
  if (!memberCheck) return [];

  // 3. 타겟 쿼리
  const { data: targetsRaw } = await supabaseAdmin
    .from("form_targets")
    .select("id, target_id, target_type")
    .eq("form_id", formId);
  if (!targetsRaw) return [];
  return targetsRaw.map((t: { id: string; target_id: string; target_type: string }) => ({
    id: t.id,
    target_id: t.target_id,
    target_type: t.target_type as "user" | "class",
  }));
}

/**
 * 폼-선생님 연결 조회
 */
export async function getFormTeachers(formId: string): Promise<FormTeacher[]> {
  // TODO: 구현
  return [];
}

/**
 * 폼 생성 (임시저장 포함)
 * @param input 폼 정보(questions, tags, targets 등 포함)
 * @param userId 생성자(권한 체크)
 * @param isDraft draft 여부
 */
export async function createForm(
  input: Partial<FormDetail>,
  userId: string,
  isDraft = false
): Promise<FormDetail> {
  // 1. 권한 체크(그룹 멤버 + can_create_form)
  if (!input.group_id) throw new Error("group_id required");
  if (!input.title) throw new Error("title required");
  const groupId = input.group_id as string;
  const { data: member } = await supabaseAdmin
    .from("group_member")
    .select("group_roles(can_create_form)")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .single();
  if (!member || !member.group_roles?.can_create_form) throw new Error("권한 없음");

  // 2. 폼 생성
  const { data: form, error: formError } = await supabaseAdmin
    .from("forms")
    .insert({
      title: input.title,
      description: input.description || "",
      group_id: groupId,
      creator_id: userId,
      status: isDraft ? "draft" : "save",
    })
    .select()
    .single();
  if (formError || !form) throw new Error("폼 생성 실패");

  // 3. 태그 연결
  if (input.tags && input.tags.length > 0) {
    for (const tag of input.tags) {
      await supabaseAdmin.from("form_tag_links").insert({
        form_id: form.id,
        tag_id: tag.id as string,
      });
    }
  }

  // 4. 타겟 연결
  if (input.targets && input.targets.length > 0) {
    for (const target of input.targets) {
      await supabaseAdmin.from("form_targets").insert({
        form_id: form.id,
        target_id: target.target_id as string,
        target_type: target.target_type,
      });
    }
  }

  // 5. 질문 생성
  if (input.questions && input.questions.length > 0) {
    for (const q of input.questions) {
      const { id, ...qInsert } = q;
      const { data: question } = await supabaseAdmin
        .from("form_questions")
        .insert({
          ...qInsert,
          form_id: form.id,
        })
        .select()
        .single();
      if (!question) throw new Error("질문 생성 실패");
      // 선택형 옵션
      if (q.question_type === "choice" && (q as ChoiceQuestion).options) {
        for (const opt of (q as ChoiceQuestion).options) {
          await supabaseAdmin.from("choice_options").insert({
            question_id: question.id,
            option_text: opt.option_text,
            order_index: opt.order_index,
          });
        }
      }
    }
  }

  // 6. 반환(상세 조회)
  return (await getFormDetail(form.id, userId)) as FormDetail;
}

/**
 * 폼 임시저장 (draft)
 */
export async function saveFormDraft(
  input: Partial<FormDetail>,
  userId: string
): Promise<FormDetail> {
  return createForm(input, userId, true);
}

/**
 * 폼 정보 수정 (질문/태그/타겟 등)
 */
export async function updateForm(
  formId: string,
  input: Partial<FormDetail>,
  userId: string
): Promise<FormDetail> {
  // 1. 권한 체크(생성자 or can_create_form)
  const { data: form } = await supabaseAdmin
    .from("forms")
    .select("group_id, creator_id")
    .eq("id", formId)
    .single();
  if (!form) throw new Error("폼 없음");
  const groupId = form.group_id as string;
  const { data: member } = await supabaseAdmin
    .from("group_member")
    .select("group_roles(can_create_form)")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .single();
  if (!(form.creator_id === userId || member?.group_roles?.can_create_form))
    throw new Error("권한 없음");

  // 2. 폼 정보 수정
  await supabaseAdmin
    .from("forms")
    .update({
      title: input.title,
      description: input.description,
      status: input.status,
    })
    .eq("id", formId);

  // 3. 태그 수정(전체 삭제 후 재삽입)
  if (input.tags) {
    await supabaseAdmin.from("form_tag_links").delete().eq("form_id", formId);
    for (const tag of input.tags) {
      await supabaseAdmin.from("form_tag_links").insert({
        form_id: formId,
        tag_id: tag.id as string,
      });
    }
  }

  // 4. 타겟 수정(전체 삭제 후 재삽입)
  if (input.targets) {
    await supabaseAdmin.from("form_targets").delete().eq("form_id", formId);
    for (const target of input.targets) {
      await supabaseAdmin.from("form_targets").insert({
        form_id: formId,
        target_id: target.target_id as string,
        target_type: target.target_type,
      });
    }
  }

  // 5. 질문 수정(전체 삭제 후 재삽입)
  if (input.questions) {
    // 기존 질문/옵션 삭제
    const { data: oldQuestions } = await supabaseAdmin
      .from("form_questions")
      .select("id")
      .eq("form_id", formId);
    if (oldQuestions) {
      const oldIds = oldQuestions.map((q: { id: string }) => q.id);
      if (oldIds.length > 0) {
        await supabaseAdmin.from("choice_options").delete().in("question_id", oldIds);
      }
    }
    await supabaseAdmin.from("form_questions").delete().eq("form_id", formId);
    // 새 질문/옵션 삽입
    for (const q of input.questions) {
      const { id, ...qInsert } = q;
      const { data: question } = await supabaseAdmin
        .from("form_questions")
        .insert({
          ...qInsert,
          form_id: formId,
        })
        .select()
        .single();
      if (!question) throw new Error("질문 생성 실패");
      if (q.question_type === "choice" && (q as ChoiceQuestion).options) {
        for (const opt of (q as ChoiceQuestion).options) {
          await supabaseAdmin.from("choice_options").insert({
            question_id: question.id,
            option_text: opt.option_text,
            order_index: opt.order_index,
          });
        }
      }
    }
  }

  // 6. 반환(상세 조회)
  return (await getFormDetail(formId, userId)) as FormDetail;
}

/**
 * 폼 복제 (타겟/선생님 초기화, 제목 [복사본] 추가)
 */
export async function duplicateForm(formId: string, creatorId: string): Promise<FormDetail> {
  // 1. 원본 폼 상세 조회
  const orig = await getFormDetail(formId, creatorId);
  if (!orig) throw new Error("원본 폼 없음");
  // 2. 복제 데이터 준비(타겟/teachers 초기화, 제목 [복사본] 추가)
  const clone: Partial<FormDetail> = {
    ...orig,
    id: undefined,
    title: orig.title + " [복사본]",
    status: "draft",
    tags: orig.tags,
    questions: orig.questions,
    targets: [],
    teachers: [],
  };
  // 3. 생성자 변경
  return await createForm(clone, creatorId, true);
}

/**
 * 폼 보내기 (타겟에게 발송, 알림 포함)
 * @param formId 폼 ID
 * @param targetIds 타겟 ID 배열
 * @param targetType 'user' | 'class'
 * @param userId 발송자(권한 체크)
 */
export async function sendForm(
  formId: string,
  targetIds: string[],
  targetType: "user" | "class",
  userId: string
): Promise<void> {
  // 1. 폼 정보/권한 체크
  const { data: form } = await supabaseAdmin
    .from("forms")
    .select("group_id, creator_id, status")
    .eq("id", formId)
    .single();
  if (!form) throw new Error("폼 없음");
  const groupId = form.group_id as string;
  const { data: member } = await supabaseAdmin
    .from("group_member")
    .select("group_roles(can_create_form)")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .single();
  if (!(form.creator_id === userId || member?.group_roles?.can_create_form))
    throw new Error("권한 없음");
  if (form.status === "send") throw new Error("이미 발송된 폼");

  // 2. 타겟 연결(중복 방지)
  await supabaseAdmin.from("form_targets").delete().eq("form_id", formId);
  for (const tid of targetIds) {
    await supabaseAdmin.from("form_targets").insert({
      form_id: formId,
      target_id: tid,
      target_type: targetType,
    });
  }

  // 3. 폼 상태 변경
  await supabaseAdmin.from("forms").update({ status: "send" }).eq("id", formId);

  // 4. 알림 생성(타겟별)
  for (const tid of targetIds) {
    await supabaseAdmin.from("notifications").insert({
      target_id: tid,
      creator_id: userId,
      group_id: groupId,
      related_id: formId,
      type: "폼 발송",
      title: "새 폼이 도착했습니다",
      content: "",
      action_url: `/forms/${formId}/response`,
      is_read: false,
    });
  }
}

/**
 * 폼 태그 생성
 * @param name 태그명
 * @param groupId 그룹 ID
 * @param userId 생성자(권한 체크)
 */
export async function createFormTag(
  name: string,
  groupId: string,
  userId: string
): Promise<FormTag> {
  // 1. 권한 체크(그룹 멤버)
  const { data: member } = await supabaseAdmin
    .from("group_member")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .single();
  if (!member) throw new Error("권한 없음");
  // 2. 중복 검사
  const { data: existing } = await supabaseAdmin
    .from("form_tags")
    .select("id")
    .eq("name", name)
    .single();
  if (existing) throw new Error("이미 존재하는 태그");
  // 3. 생성
  const { data: tag, error } = await supabaseAdmin
    .from("form_tags")
    .insert({ name })
    .select()
    .single();
  if (error || !tag) throw new Error("태그 생성 실패");
  return tag;
}

/**
 * 폼 태그 수정
 * @param tagId 태그 ID
 * @param name 새 이름
 * @param userId 수정자(권한 체크)
 */
export async function updateFormTag(tagId: string, name: string, userId: string): Promise<FormTag> {
  // 1. 태그 연결된 폼 조회(그룹 확인)
  const { data: tagLinks } = await supabaseAdmin
    .from("form_tag_links")
    .select("form_id")
    .eq("tag_id", tagId)
    .limit(1);
  if (!tagLinks || tagLinks.length === 0) throw new Error("태그 없음");
  const { data: form } = await supabaseAdmin
    .from("forms")
    .select("group_id")
    .eq("id", tagLinks[0].form_id)
    .single();
  if (!form || !form.group_id) throw new Error("폼/그룹 없음");
  // 2. 권한 체크(그룹 멤버)
  const { data: member } = await supabaseAdmin
    .from("group_member")
    .select("id")
    .eq("group_id", form.group_id)
    .eq("user_id", userId)
    .single();
  if (!member) throw new Error("권한 없음");
  // 3. 중복 검사
  const { data: existing } = await supabaseAdmin
    .from("form_tags")
    .select("id")
    .eq("name", name)
    .neq("id", tagId)
    .single();
  if (existing) throw new Error("이미 존재하는 태그");
  // 4. 수정
  const { data: tag, error } = await supabaseAdmin
    .from("form_tags")
    .update({ name })
    .eq("id", tagId)
    .select()
    .single();
  if (error || !tag) throw new Error("태그 수정 실패");
  return tag;
}

/**
 * 폼 태그 삭제
 * @param tagId 태그 ID
 * @param userId 삭제자(권한 체크)
 */
export async function deleteFormTag(tagId: string, userId: string): Promise<void> {
  // 1. 태그 연결된 폼 조회(그룹 확인)
  const { data: tagLinks } = await supabaseAdmin
    .from("form_tag_links")
    .select("form_id")
    .eq("tag_id", tagId)
    .limit(1);
  if (!tagLinks || tagLinks.length === 0) throw new Error("태그 없음");
  const { data: form } = await supabaseAdmin
    .from("forms")
    .select("group_id")
    .eq("id", tagLinks[0].form_id)
    .single();
  if (!form || !form.group_id) throw new Error("폼/그룹 없음");
  // 2. 권한 체크(그룹 멤버)
  const { data: member } = await supabaseAdmin
    .from("group_member")
    .select("id")
    .eq("group_id", form.group_id)
    .eq("user_id", userId)
    .single();
  if (!member) throw new Error("권한 없음");
  // 3. 삭제(연결 먼저 삭제)
  await supabaseAdmin.from("form_tag_links").delete().eq("tag_id", tagId);
  await supabaseAdmin.from("form_tags").delete().eq("id", tagId);
}

/**
 * 폼-태그 연결
 * @param formId 폼 ID
 * @param tagId 태그 ID
 * @param userId 연결자(권한 체크)
 */
export async function linkFormTag(formId: string, tagId: string, userId: string): Promise<void> {
  // 1. 폼 정보 조회(그룹 확인)
  const { data: form } = await supabaseAdmin
    .from("forms")
    .select("group_id")
    .eq("id", formId)
    .single();
  if (!form || !form.group_id) throw new Error("폼/그룹 없음");
  // 2. 권한 체크(그룹 멤버)
  const { data: member } = await supabaseAdmin
    .from("group_member")
    .select("id")
    .eq("group_id", form.group_id)
    .eq("user_id", userId)
    .single();
  if (!member) throw new Error("권한 없음");
  // 3. 이미 연결된 경우 방지
  const { data: existing } = await supabaseAdmin
    .from("form_tag_links")
    .select("form_id")
    .eq("form_id", formId)
    .eq("tag_id", tagId)
    .single();
  if (existing) throw new Error("이미 연결된 태그");
  // 4. 연결
  await supabaseAdmin.from("form_tag_links").insert({ form_id: formId, tag_id: tagId });
}

/**
 * 폼 질문 수정 (타입별로 분기)
 * @param questionId 질문 ID
 * @param input 수정 데이터
 * @param userId 수정자(권한 체크)
 */
export async function updateFormQuestion(
  questionId: string,
  input: Partial<FormQuestion>,
  userId: string
): Promise<FormQuestion> {
  // 1. 질문/폼/권한 체크
  const { data: question } = await supabaseAdmin
    .from("form_questions")
    .select("form_id")
    .eq("id", questionId)
    .single();
  if (!question || !question.form_id) throw new Error("질문/폼 없음");
  const { data: form } = await supabaseAdmin
    .from("forms")
    .select("group_id, creator_id")
    .eq("id", question.form_id)
    .single();
  if (!form) throw new Error("폼 없음");
  const groupId = form.group_id as string;
  const { data: member } = await supabaseAdmin
    .from("group_member")
    .select("group_roles(can_create_form)")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .single();
  if (!(form.creator_id === userId || member?.group_roles?.can_create_form))
    throw new Error("권한 없음");

  // 2. 질문 수정 (타입별로 안전하게 처리)
  let updateData: Record<string, unknown> = {
    question_text: input.question_text,
    is_required: input.is_required,
    order_index: input.order_index,
    question_type: input.question_type,
  };
  if (input.question_type === "exam") {
    const exam = input as Partial<import("./types/forms").ExamQuestion>;
    updateData = {
      ...updateData,
      concept_template_id: exam.concept_template_id,
      total_questions: exam.total_questions,
    };
  } else if (input.question_type === "rating") {
    const rating = input as Partial<import("./types/forms").RatingQuestion>;
    updateData = {
      ...updateData,
      rating_max: rating.rating_max,
      rating_step: rating.rating_step,
    };
  } else if (input.question_type === "choice") {
    const choice = input as Partial<import("./types/forms").ChoiceQuestion>;
    updateData = {
      ...updateData,
      is_multiple: choice.is_multiple,
      etc_option_enabled: choice.etc_option_enabled,
    };
  } else if (input.question_type === "text") {
    const text = input as Partial<import("./types/forms").TextQuestion>;
    updateData = {
      ...updateData,
      question_subtype: text.question_subtype,
      char_limit: text.char_limit,
    };
  }
  await supabaseAdmin.from("form_questions").update(updateData).eq("id", questionId);

  // 3. 선택형 옵션 수정(전체 삭제 후 재삽입)
  if (
    input.question_type === "choice" &&
    (input as Partial<import("./types/forms").ChoiceQuestion>).options
  ) {
    await supabaseAdmin.from("choice_options").delete().eq("question_id", questionId);
    for (const opt of (input as Partial<import("./types/forms").ChoiceQuestion>).options!) {
      await supabaseAdmin.from("choice_options").insert({
        question_id: questionId,
        option_text: opt.option_text,
        order_index: opt.order_index,
      });
    }
  }

  // 4. 반환(질문 상세, 타입별로 shape 맞춤, type-specific fields join)
  const { data: updated } = await supabaseAdmin
    .from("form_questions")
    .select("*")
    .eq("id", questionId)
    .single();
  if (!updated) throw new Error("질문 수정 실패");

  // Join type-specific fields if not present (for linter safety)
  if (updated.question_type === "choice") {
    // Join choice_questions for is_multiple, etc_option_enabled
    const { data: choiceRow } = await supabaseAdmin
      .from("choice_questions")
      .select("*")
      .eq("question_id", questionId)
      .single();
    const { data: options } = await supabaseAdmin
      .from("choice_options")
      .select("*")
      .eq("question_id", questionId);
    return {
      ...updated,
      is_multiple: choiceRow?.is_multiple ?? false,
      etc_option_enabled: choiceRow?.etc_option_enabled ?? false,
      options: options || [],
    } as import("./types/forms").ChoiceQuestion;
  } else if (updated.question_type === "exam") {
    // Join exam_questions for concept_template_id, total_questions
    const { data: examRow } = await supabaseAdmin
      .from("exam_questions")
      .select("*")
      .eq("question_id", questionId)
      .single();
    return {
      ...updated,
      concept_template_id: examRow?.concept_template_id ?? "",
      total_questions: examRow?.total_questions ?? 0,
    } as import("./types/forms").ExamQuestion;
  } else if (updated.question_type === "rating") {
    // Join rating_questions for rating_max, rating_step
    const { data: ratingRow } = await supabaseAdmin
      .from("rating_questions")
      .select("*")
      .eq("question_id", questionId)
      .single();
    return {
      ...updated,
      rating_max: ratingRow?.rating_max ?? 5,
      rating_step: ratingRow?.rating_step === 0.5 ? 0.5 : 1,
    } as import("./types/forms").RatingQuestion;
  } else if (updated.question_type === "text") {
    // Try to join text_questions for question_subtype, char_limit (if such a table exists)
    const question_subtype: import("./types/forms").TextSubtype = "short";
    const char_limit = 100;
    // If you have a text_questions table, join here. Otherwise, use defaults.
    // Example (uncomment if table exists):
    // const { data: textRow } = await supabaseAdmin.from('text_questions').select('*').eq('question_id', questionId).single();
    // if (textRow) {
    //   question_subtype = textRow.question_subtype ?? 'short';
    //   char_limit = textRow.char_limit ?? 100;
    // }
    return {
      ...updated,
      question_subtype,
      char_limit,
    } as import("./types/forms").TextQuestion;
  }
  throw new Error("Unknown question_type");
}

/**
 * 시험 타입 개념 템플릿 CRUD/복제
 */
export async function createConceptTemplate(
  input: Partial<ConceptTemplate>,
  userId: string
): Promise<ConceptTemplate> {
  if (!input.name || !input.group_id) throw new Error("필수값 누락");
  const { data: template, error } = await supabaseAdmin
    .from("exam_concept_templates")
    .insert({
      name: input.name,
      group_id: input.group_id,
      creator_id: userId,
      concept_count: input.concept_count,
      status: input.status || "draft",
    })
    .select()
    .single();
  if (error || !template) throw new Error("템플릿 생성 실패");
  // 개념 항목 생성
  if (input.concepts && input.concepts.length > 0) {
    for (const c of input.concepts) {
      await supabaseAdmin.from("exam_concept_template_items").insert({
        template_id: template.id,
        concept_text: c.concept_text,
        concept_description: c.concept_description,
        order_index: c.order_index,
      });
    }
  }
  return await getConceptTemplateDetail(template.id);
}

export async function updateConceptTemplate(
  templateId: string,
  input: Partial<ConceptTemplate>,
  userId: string
): Promise<ConceptTemplate> {
  // 권한 체크(생성자)
  const { data: template } = await supabaseAdmin
    .from("exam_concept_templates")
    .select("creator_id")
    .eq("id", templateId)
    .single();
  if (!template || template.creator_id !== userId) throw new Error("권한 없음");
  await supabaseAdmin
    .from("exam_concept_templates")
    .update({
      name: input.name,
      concept_count: input.concept_count,
      status: input.status,
    })
    .eq("id", templateId);
  // 개념 항목 수정(전체 삭제 후 재삽입)
  if (input.concepts) {
    await supabaseAdmin.from("exam_concept_template_items").delete().eq("template_id", templateId);
    for (const c of input.concepts) {
      await supabaseAdmin.from("exam_concept_template_items").insert({
        template_id: templateId,
        concept_text: c.concept_text,
        concept_description: c.concept_description,
        order_index: c.order_index,
      });
    }
  }
  return await getConceptTemplateDetail(templateId);
}

export async function duplicateConceptTemplate(
  templateId: string,
  userId: string
): Promise<ConceptTemplate> {
  // 원본 조회
  const orig = await getConceptTemplateDetail(templateId);
  if (!orig) throw new Error("원본 없음");
  // 복제 데이터 준비
  const clone: Partial<ConceptTemplate> = {
    ...orig,
    id: undefined,
    name: orig.name + " [복사본]",
    status: "draft",
    creator_id: userId,
    concepts: orig.concepts,
  };
  return await createConceptTemplate(clone, userId);
}

export async function getConceptTemplateDetail(templateId: string): Promise<ConceptTemplate> {
  const { data: template } = await supabaseAdmin
    .from("exam_concept_templates")
    .select("*")
    .eq("id", templateId)
    .single();
  if (!template) throw new Error("템플릿 없음");
  const { data: items } = await supabaseAdmin
    .from("exam_concept_template_items")
    .select("*")
    .eq("template_id", templateId)
    .order("order_index", { ascending: true });
  return {
    ...template,
    concepts: items || [],
  } as ConceptTemplate;
}

/**
 * 폼 응답 제출/임시저장
 * @param formId 폼 ID
 * @param input 응답 데이터
 * @param userId 응답자(권한 체크)
 * @param isDraft draft 여부
 */
export async function submitFormResponse(
  formId: string,
  input: Partial<FormResponse>,
  userId: string,
  isDraft = false
): Promise<void> {
  // 1. 폼/타겟 체크
  const { data: form } = await supabaseAdmin
    .from("forms")
    .select("status")
    .eq("id", formId)
    .single();
  if (!form || form.status !== "send") throw new Error("응답 불가");
  const { data: target } = await supabaseAdmin
    .from("form_targets")
    .select("id")
    .eq("form_id", formId)
    .eq("target_id", userId)
    .single();
  if (!target) throw new Error("타겟 아님");

  // 2. 응답 row 생성/업데이트
  let responseId = input.id;
  if (!responseId) {
    const { data: resp } = await supabaseAdmin
      .from("form_responses")
      .insert({
        form_id: formId,
        student_id: userId,
        status: isDraft ? "draft" : "submitted",
        submitted_at: isDraft ? null : new Date().toISOString(),
      })
      .select()
      .single();
    if (!resp) throw new Error("응답 생성 실패");
    responseId = resp.id;
  } else {
    await supabaseAdmin
      .from("form_responses")
      .update({
        status: isDraft ? "draft" : "submitted",
        submitted_at: isDraft ? null : new Date().toISOString(),
      })
      .eq("id", responseId);
  }

  // 3. 답변 전체 삭제 후 재삽입
  await supabaseAdmin.from("form_question_responses").delete().eq("form_response_id", responseId);
  if (input.answers && input.answers.length > 0) {
    for (const ans of input.answers) {
      await supabaseAdmin.from("form_question_responses").insert({
        form_response_id: responseId,
        question_id: ans.question_id,
        text_response: typeof ans.answer === "string" ? ans.answer : null,
        number_response: typeof ans.answer === "number" ? ans.answer : null,
        rating_response: typeof ans.answer === "number" ? ans.answer : null,
        exam_response: typeof ans.answer === "object" ? ans.answer : null,
      });
    }
  }

  // 4. 알림(제출시만)
  if (!isDraft) {
    // 폼 만든이에게 알림
    const { data: formInfo } = await supabaseAdmin
      .from("forms")
      .select("creator_id, group_id")
      .eq("id", formId)
      .single();
    if (formInfo && formInfo.creator_id) {
      await supabaseAdmin.from("notifications").insert({
        target_id: formInfo.creator_id,
        creator_id: userId,
        group_id: formInfo.group_id,
        related_id: formId,
        type: "폼 응답",
        title: "새 폼 응답이 도착했습니다",
        content: "",
        action_url: `/forms/${formId}/responses`,
        is_read: false,
      });
    }
  }
}

/**
 * 폼 응답 임시저장
 * @param formId 폼 ID
 * @param input 응답 데이터
 * @param userId 응답자(권한 체크)
 */
export async function saveFormResponseDraft(
  formId: string,
  input: Partial<FormResponse>,
  userId: string
): Promise<void> {
  // 1. 폼/타겟 체크
  const { data: form } = await supabaseAdmin
    .from("forms")
    .select("status")
    .eq("id", formId)
    .single();
  if (!form || form.status !== "send") throw new Error("응답 불가");
  const { data: target } = await supabaseAdmin
    .from("form_targets")
    .select("id")
    .eq("form_id", formId)
    .eq("target_id", userId)
    .single();
  if (!target) throw new Error("타겟 아님");

  // 2. 응답 row 생성/업데이트
  let responseId = input.id;
  if (!responseId) {
    const { data: resp } = await supabaseAdmin
      .from("form_responses")
      .insert({
        form_id: formId,
        student_id: userId,
        status: "draft",
        submitted_at: null,
      })
      .select()
      .single();
    if (!resp) throw new Error("응답 생성 실패");
    responseId = resp.id;
  } else {
    await supabaseAdmin
      .from("form_responses")
      .update({
        status: "draft",
        submitted_at: null,
      })
      .eq("id", responseId);
  }

  // 3. 답변 전체 삭제 후 재삽입
  await supabaseAdmin.from("form_question_responses").delete().eq("form_response_id", responseId);
  if (input.answers && input.answers.length > 0) {
    for (const ans of input.answers) {
      await supabaseAdmin.from("form_question_responses").insert({
        form_response_id: responseId,
        question_id: ans.question_id,
        text_response: typeof ans.answer === "string" ? ans.answer : null,
        number_response: typeof ans.answer === "number" ? ans.answer : null,
        rating_response: typeof ans.answer === "number" ? ans.answer : null,
        exam_response: typeof ans.answer === "object" ? ans.answer : null,
      });
    }
  }
}
