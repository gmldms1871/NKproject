import { supabaseAdmin } from "./supabase";
import { Database } from "./types/types";
import { createNotification } from "./notifications";

// 데이터베이스 타입 import
type ExamConceptTemplate = Database["public"]["Tables"]["exam_concept_templates"]["Row"];
type ExamConceptTemplateInsert = Database["public"]["Tables"]["exam_concept_templates"]["Insert"];
type ExamConceptTemplateUpdate = Database["public"]["Tables"]["exam_concept_templates"]["Update"];

type ExamConceptTemplateItem = Database["public"]["Tables"]["exam_concept_template_items"]["Row"];
type ExamConceptTemplateItemInsert =
  Database["public"]["Tables"]["exam_concept_template_items"]["Insert"];
type ExamConceptTemplateItemUpdate =
  Database["public"]["Tables"]["exam_concept_template_items"]["Update"];

type User = Database["public"]["Tables"]["users"]["Row"];
type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"];

// API 응답 타입 정의
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ===== 요청 타입 정의 =====

export interface CreateConceptTemplateRequest {
  name: string;
  groupId: string;
  creatorId: string;
  conceptCount: number;
  status?: "draft" | "published";
  conceptItems?: CreateConceptItemRequest[];
}

export interface UpdateConceptTemplateRequest {
  name?: string;
  conceptCount?: number;
  status?: "draft" | "published";
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

export interface DuplicateConceptTemplateRequest {
  templateId: string;
  userId: string;
  newName?: string;
}

export interface ConceptTemplateSearchConditions {
  groupId: string;
  name?: string;
  status?: string[];
  creatorId?: string;
  createdAfter?: string;
  createdBefore?: string;
}

// ===== 응답 타입 정의 =====

export interface ConceptTemplate {
  id: string;
  name: string;
  group_id: string | null;
  concept_count: number;
  status: string;
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
  concept_description: string | null;
  order_index: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface ConceptTemplateStatistics {
  totalTemplates: number;
  publishedTemplates: number;
  draftTemplates: number;
  totalConceptItems: number;
  averageItemsPerTemplate: number;
  mostUsedTemplates: {
    id: string;
    name: string;
    usageCount: number;
  }[];
  recentActivity: {
    date: string;
    count: number;
    type: "created" | "updated" | "used";
  }[];
}

// ===== 메인 API 함수들 =====

/**
 * 개념 템플릿 생성
 */
export async function createConceptTemplate(
  request: CreateConceptTemplateRequest
): Promise<ApiResponse<string>> {
  try {
    // 기본 템플릿 생성
    const { data: template, error: templateError } = await supabaseAdmin
      .from("exam_concept_templates")
      .insert({
        name: request.name,
        group_id: request.groupId,
        creator_id: request.creatorId,
        concept_count: request.conceptCount,
        status: request.status || "draft",
      })
      .select()
      .single();

    if (templateError) throw templateError;

    // 개념 아이템들 생성
    if (request.conceptItems && request.conceptItems.length > 0) {
      const itemsToInsert: ExamConceptTemplateItemInsert[] = request.conceptItems.map((item) => ({
        template_id: template.id,
        concept_text: item.conceptText,
        concept_description: item.conceptDescription || "",
        order_index: item.orderIndex,
      }));

      const { error: itemsError } = await supabaseAdmin
        .from("exam_concept_template_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }

    // 템플릿 생성 알림
    await createNotification({
      target_id: request.creatorId,
      creator_id: null,
      type: "template_created",
      title: "새 개념 템플릿이 생성되었습니다",
      content: `템플릿 "${request.name}"이 생성되었습니다.`,
      action_url: `/concept-templates/${template.id}`,
      related_id: template.id,
      is_read: false,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    return { success: true, data: template.id };
  } catch (error) {
    console.error("Error creating concept template:", error);
    return { success: false, error: "개념 템플릿 생성 중 오류가 발생했습니다." };
  }
}

/**
 * 개념 템플릿 상세 조회
 */
export async function getConceptTemplateDetails(
  templateId: string
): Promise<ApiResponse<ConceptTemplate>> {
  try {
    const { data: template, error } = await supabaseAdmin
      .from("exam_concept_templates")
      .select(
        `
        *,
        creator:users!exam_concept_templates_creator_id_fkey(id, name, nickname),
        exam_concept_template_items(*)
      `
      )
      .eq("id", templateId)
      .single();

    if (error) throw error;
    if (!template) {
      return { success: false, error: "개념 템플릿을 찾을 수 없습니다." };
    }

    // 사용 횟수 계산 (exam_questions와 연결된 수)
    const { data: usageData, error: usageError } = await supabaseAdmin
      .from("exam_questions")
      .select("id")
      .eq("concept_template_id", templateId);

    if (usageError) console.warn("Usage count error:", usageError);

    const usageCount = usageData?.length || 0;

    // 마지막 사용 시간 계산 (exam_questions 테이블에 created_at이 없으므로 건너뜀)
    const lastUsedAt = null;

    const conceptTemplate: ConceptTemplate = {
      id: template.id,
      name: template.name,
      group_id: template.group_id,
      concept_count: template.concept_count || 0,
      status: template.status || "draft",
      creator_id: template.creator_id,
      created_at: template.created_at,
      updated_at: template.updated_at,
      creator: template.creator || null,
      conceptItems: (template.exam_concept_template_items || [])
        .map((item: ExamConceptTemplateItem) => ({
          id: item.id,
          template_id: item.template_id,
          concept_text: item.concept_text,
          concept_description: item.concept_description,
          order_index: item.order_index,
          created_at: item.created_at,
          updated_at: item.updated_at,
        }))
        .sort((a: ConceptTemplateItem, b: ConceptTemplateItem) => a.order_index - b.order_index),
      usageCount,
      lastUsedAt: lastUsedAt,
    };

    return { success: true, data: conceptTemplate };
  } catch (error) {
    console.error("Error fetching concept template details:", error);
    return { success: false, error: "개념 템플릿 상세 조회 중 오류가 발생했습니다." };
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
    // 기본 템플릿 정보 업데이트
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

    // 개념 아이템들 업데이트 (있는 경우)
    if (request.conceptItems) {
      // 기존 아이템들 삭제
      const { error: deleteError } = await supabaseAdmin
        .from("exam_concept_template_items")
        .delete()
        .eq("template_id", templateId);

      if (deleteError) throw deleteError;

      // 새 아이템들 삽입
      if (request.conceptItems.length > 0) {
        const itemsToInsert: ExamConceptTemplateItemInsert[] = request.conceptItems.map((item) => ({
          template_id: templateId,
          concept_text: item.conceptText,
          concept_description: item.conceptDescription || "",
          order_index: item.orderIndex,
        }));

        const { error: insertError } = await supabaseAdmin
          .from("exam_concept_template_items")
          .insert(itemsToInsert);

        if (insertError) throw insertError;
      }
    }

    return { success: true, data: true };
  } catch (error) {
    console.error("Error updating concept template:", error);
    return { success: false, error: "개념 템플릿 수정 중 오류가 발생했습니다." };
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

/**
 * 개념 템플릿 복제
 */
export async function duplicateConceptTemplate(
  request: DuplicateConceptTemplateRequest
): Promise<ApiResponse<string>> {
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
      const itemsToInsert = original.exam_concept_template_items.map(
        (item: ExamConceptTemplateItem) => ({
          template_id: newTemplate.id,
          concept_text: item.concept_text,
          concept_description: item.concept_description || "",
          order_index: item.order_index,
        })
      );

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
 * 개념 템플릿 검색
 */
export async function searchConceptTemplates(
  conditions: ConceptTemplateSearchConditions
): Promise<ApiResponse<ConceptTemplate[]>> {
  try {
    let query = supabaseAdmin
      .from("exam_concept_templates")
      .select(
        `
        *,
        creator:users!exam_concept_templates_creator_id_fkey(id, name, nickname),
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

    if (conditions.createdAfter) {
      query = query.gte("created_at", conditions.createdAfter);
    }

    if (conditions.createdBefore) {
      query = query.lte("created_at", conditions.createdBefore);
    }

    const { data: templates, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;

    // 사용 통계와 함께 변환
    const templatesWithDetails: ConceptTemplate[] = [];

    for (const template of templates || []) {
      // 사용 횟수 계산
      const { data: usageData } = await supabaseAdmin
        .from("exam_questions")
        .select("id")
        .eq("concept_template_id", template.id);

      const usageCount = usageData?.length || 0;
      const lastUsedAt = null; // exam_questions 테이블에 created_at이 없으므로 null로 설정

      templatesWithDetails.push({
        id: template.id,
        name: template.name,
        group_id: template.group_id,
        concept_count: template.concept_count || 0,
        status: template.status || "draft",
        creator_id: template.creator_id,
        created_at: template.created_at,
        updated_at: template.updated_at,
        creator: template.creator || null,
        conceptItems: (template.exam_concept_template_items || [])
          .map((item: ExamConceptTemplateItem) => ({
            id: item.id,
            template_id: item.template_id,
            concept_text: item.concept_text,
            concept_description: item.concept_description,
            order_index: item.order_index,
            created_at: item.created_at,
            updated_at: item.updated_at,
          }))
          .sort((a: ConceptTemplateItem, b: ConceptTemplateItem) => a.order_index - b.order_index),
        usageCount,
        lastUsedAt,
      });
    }

    return { success: true, data: templatesWithDetails };
  } catch (error) {
    console.error("Error searching concept templates:", error);
    return { success: false, error: "개념 템플릿 검색 중 오류가 발생했습니다." };
  }
}

/**
 * 그룹별 모든 개념 템플릿 조회
 */
export async function getAllConceptTemplates(
  groupId: string
): Promise<ApiResponse<ConceptTemplate[]>> {
  try {
    return await searchConceptTemplates({ groupId });
  } catch (error) {
    console.error("Error getting all concept templates:", error);
    return { success: false, error: "개념 템플릿 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 개념 템플릿 통계 조회
 */
export async function getConceptTemplateStatistics(
  groupId: string
): Promise<ApiResponse<ConceptTemplateStatistics>> {
  try {
    const { data: templates, error } = await supabaseAdmin
      .from("exam_concept_templates")
      .select(
        `
        id, name, status, created_at,
        exam_concept_template_items(id)
      `
      )
      .eq("group_id", groupId);

    if (error) throw error;

    const totalTemplates = templates?.length || 0;
    const publishedTemplates = templates?.filter((t) => t.status === "published").length || 0;
    const draftTemplates = templates?.filter((t) => t.status === "draft").length || 0;
    const totalConceptItems =
      templates?.reduce((sum, t) => sum + (t.exam_concept_template_items?.length || 0), 0) || 0;
    const averageItemsPerTemplate = totalTemplates > 0 ? totalConceptItems / totalTemplates : 0;

    // 가장 많이 사용된 템플릿들 조회
    const mostUsedTemplates: ConceptTemplateStatistics["mostUsedTemplates"] = [];
    for (const template of templates?.slice(0, 5) || []) {
      const { data: usageData } = await supabaseAdmin
        .from("exam_questions")
        .select("id")
        .eq("concept_template_id", template.id);

      mostUsedTemplates.push({
        id: template.id,
        name: template.name,
        usageCount: usageData?.length || 0,
      });
    }

    // 사용량 순으로 정렬
    mostUsedTemplates.sort((a, b) => b.usageCount - a.usageCount);

    // 최근 활동 데이터 (간단한 예시)
    const recentActivity = [
      { date: "2024-01-01", count: 3, type: "created" as const },
      { date: "2024-01-02", count: 5, type: "used" as const },
      { date: "2024-01-03", count: 2, type: "updated" as const },
    ];

    const statistics: ConceptTemplateStatistics = {
      totalTemplates,
      publishedTemplates,
      draftTemplates,
      totalConceptItems,
      averageItemsPerTemplate,
      mostUsedTemplates: mostUsedTemplates.slice(0, 5),
      recentActivity,
    };

    return { success: true, data: statistics };
  } catch (error) {
    console.error("Error fetching concept template statistics:", error);
    return { success: false, error: "개념 템플릿 통계 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 개념 템플릿 상태 변경 (draft ↔ published)
 */
export async function toggleConceptTemplateStatus(
  templateId: string,
  userId: string
): Promise<ApiResponse<string>> {
  try {
    // 현재 상태 조회
    const { data: template, error: getError } = await supabaseAdmin
      .from("exam_concept_templates")
      .select("status, creator_id")
      .eq("id", templateId)
      .single();

    if (getError) throw getError;

    // 권한 확인
    if (template.creator_id !== userId) {
      return { success: false, error: "템플릿 상태를 변경할 권한이 없습니다." };
    }

    // 상태 토글
    const newStatus = template.status === "published" ? "draft" : "published";

    const { error: updateError } = await supabaseAdmin
      .from("exam_concept_templates")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", templateId);

    if (updateError) throw updateError;

    return { success: true, data: newStatus };
  } catch (error) {
    console.error("Error toggling concept template status:", error);
    return { success: false, error: "개념 템플릿 상태 변경 중 오류가 발생했습니다." };
  }
}

/**
 * 개념 아이템 일괄 업데이트
 */
export async function bulkUpdateConceptItems(
  templateId: string,
  items: UpdateConceptItemRequest[]
): Promise<ApiResponse<boolean>> {
  try {
    // 기존 아이템들 삭제
    const { error: deleteError } = await supabaseAdmin
      .from("exam_concept_template_items")
      .delete()
      .eq("template_id", templateId);

    if (deleteError) throw deleteError;

    // 새 아이템들 삽입
    if (items.length > 0) {
      const itemsToInsert: ExamConceptTemplateItemInsert[] = items.map((item) => ({
        template_id: templateId,
        concept_text: item.conceptText,
        concept_description: item.conceptDescription || "",
        order_index: item.orderIndex,
      }));

      const { error: insertError } = await supabaseAdmin
        .from("exam_concept_template_items")
        .insert(itemsToInsert);

      if (insertError) throw insertError;
    }

    // 템플릿의 concept_count 업데이트
    const { error: updateError } = await supabaseAdmin
      .from("exam_concept_templates")
      .update({
        concept_count: items.length,
        updated_at: new Date().toISOString(),
      })
      .eq("id", templateId);

    if (updateError) throw updateError;

    return { success: true, data: true };
  } catch (error) {
    console.error("Error bulk updating concept items:", error);
    return { success: false, error: "개념 아이템 일괄 업데이트 중 오류가 발생했습니다." };
  }
}
