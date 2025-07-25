import { supabaseAdmin, EDUCATION_LEVELS, EducationLevel } from "./supabase";
import { Database } from "./types/types";
import { createClassAddedNotification, createClassRemovedNotification } from "./notifications";
type Class = Database["public"]["Tables"]["classes"]["Row"];
type ClassInsert = Database["public"]["Tables"]["classes"]["Insert"];
type ClassUpdate = Database["public"]["Tables"]["classes"]["Update"];
type ClassMember = Database["public"]["Tables"]["class_members"]["Row"];
type ClassMemberInsert = Database["public"]["Tables"]["class_members"]["Insert"];
type ClassTag = Database["public"]["Tables"]["class_tags"]["Row"];
type ClassTagInsert = Database["public"]["Tables"]["class_tags"]["Insert"];
type ClassTagUpdate = Database["public"]["Tables"]["class_tags"]["Update"];
type ClassTagLink = Database["public"]["Tables"]["class_tag_links"]["Row"];
type ClassTagLinkInsert = Database["public"]["Tables"]["class_tag_links"]["Insert"];
type User = Database["public"]["Tables"]["users"]["Row"];
type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"];

interface TagLinkWithClassTag {
  class_tags: ClassTag;
}

// API 응답 타입 정의
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// 반 생성 요청 타입
export interface CreateClassRequest {
  name: string;
  description?: string;
  groupId: string;
  tags?: string[];
}

// 반 수정 요청 타입
export interface UpdateClassRequest {
  name?: string;
  description?: string;
  tags?: string[];
}

// 반 검색 조건 타입
export interface ClassSearchConditions {
  name?: string;
  userId?: string;
  tagId?: string;
  tagName?: string;
  groupId?: string;
}

// 반 필터링 조건 타입
export interface ClassFilterConditions {
  education?: EducationLevel[];
  groupId?: string;
  tagNames?: string[];
  createdAfter?: string;
  createdBefore?: string;
}

// 반 구성원 검색 조건 타입
export interface ClassMemberSearchConditions {
  name?: string;
  education?: EducationLevel[];
  classId: string;
}

// 반 구성원 상세 정보 타입
export interface ClassMemberWithDetails {
  id: string;
  class_id: string | null;
  user_id: string | null;
  assigned_at: string | null;
  users: {
    id: string;
    name: string;
    nickname: string;
    email: string;
    education: string | null;
    birth_date: string;
  } | null;
}

// 반 상세 정보 타입 (연결된 태그 포함)
export interface ClassWithDetails {
  id: string;
  name: string;
  description: string | null;
  group_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  groups: {
    name: string | null;
    description: string | null;
  } | null;
  class_tags: ClassTag[];
  memberCount: number;
}

// 반태그 생성 요청 타입
export interface CreateClassTagRequest {
  name: string;
  groupId: string;
}

// 반태그 수정 요청 타입
export interface UpdateClassTagRequest {
  name: string;
}

// 반태그 연결 요청 타입
export interface LinkClassTagRequest {
  tagId: string;
}

/**
 * 알림 생성 헬퍼 함수
 */
const createNotification = async (notificationData: NotificationInsert) => {
  try {
    await supabaseAdmin.from("notifications").insert(notificationData);
  } catch (error) {
    console.error("알림 생성 실패:", error);
  }
};

/**
 * 태그 이름 정규화 (공백 제거)
 */
const normalizeTagName = (tagName: string): string => {
  return tagName.trim().replace(/\s+/g, " ");
};

/**
 * 반 생성
 * 그룹 멤버만 가능, 이름 중복 검사, 태그 자동 생성 및 연결
 */
export const createClass = async (
  userId: string,
  classData: CreateClassRequest
): Promise<ApiResponse<Class>> => {
  try {
    if (!classData.name || classData.name.trim() === "") {
      return { success: false, error: "반 이름을 입력해주세요." };
    }

    // 그룹 멤버인지 확인
    const { data: memberCheck } = await supabaseAdmin
      .from("group_member")
      .select("id")
      .eq("group_id", classData.groupId)
      .eq("user_id", userId)
      .single();

    if (!memberCheck) {
      return { success: false, error: "그룹 멤버만 반을 생성할 수 있습니다." };
    }

    // 같은 그룹 내에서 반 이름 중복 검사
    const { data: existingClass } = await supabaseAdmin
      .from("classes")
      .select("id")
      .eq("group_id", classData.groupId)
      .eq("name", classData.name.trim())
      .single();

    if (existingClass) {
      return { success: false, error: "이미 존재하는 반 이름입니다." };
    }

    // 반 생성
    const { data: newClass, error: classError } = await supabaseAdmin
      .from("classes")
      .insert({
        name: classData.name.trim(),
        description: classData.description || null,
        group_id: classData.groupId,
      })
      .select()
      .single();

    if (classError || !newClass) {
      return { success: false, error: "반 생성에 실패했습니다." };
    }

    // 태그 생성 및 연결
    if (classData.tags && classData.tags.length > 0) {
      try {
        for (const tagName of classData.tags) {
          const normalizedName = normalizeTagName(tagName);
          if (!normalizedName) continue;

          // 같은 그룹 내에서 태그 이름 중복 확인
          const { data: existingTag } = await supabaseAdmin
            .from("class_tags")
            .select("id")
            .eq("name", normalizedName)
            .single();

          let tagId: string;

          if (existingTag) {
            // 기존 태그 사용
            tagId = existingTag.id;
          } else {
            // 새 태그 생성
            const { data: newTag, error: tagError } = await supabaseAdmin
              .from("class_tags")
              .insert({ name: normalizedName })
              .select()
              .single();

            if (tagError || !newTag) {
              console.error("Tag creation error:", tagError);
              continue;
            }
            tagId = newTag.id;
          }

          // 반과 태그 연결
          await supabaseAdmin.from("class_tag_links").insert({
            class_id: newClass.id,
            tag_id: tagId,
          });
        }
      } catch (tagError) {
        // 태그 처리 실패 시 반은 유지하고 경고만 출력
        console.error("Tag processing error:", tagError);
      }
    }

    return { success: true, data: newClass };
  } catch (error) {
    console.error("Create class error:", error);
    return { success: false, error: "반 생성 중 오류가 발생했습니다." };
  }
};

/**
 * 반 삭제
 * 그룹 멤버만 가능, 관련 데이터 순차적 삭제 후 반 삭제
 */
export const deleteClass = async (classId: string, userId: string): Promise<ApiResponse<void>> => {
  try {
    // 반 정보 조회
    const { data: classInfo } = await supabaseAdmin
      .from("classes")
      .select("group_id")
      .eq("id", classId)
      .single();

    if (!classInfo || !classInfo.group_id) {
      return { success: false, error: "반을 찾을 수 없습니다." };
    }

    // 그룹 멤버인지 확인
    const { data: memberCheck } = await supabaseAdmin
      .from("group_member")
      .select("id")
      .eq("group_id", classInfo.group_id)
      .eq("user_id", userId)
      .single();

    if (!memberCheck) {
      return { success: false, error: "그룹 멤버만 반을 삭제할 수 있습니다." };
    }

    // 순차적으로 관련 데이터 삭제

    // 1. 반 구성원 삭제
    const { error: membersError } = await supabaseAdmin
      .from("class_members")
      .delete()
      .eq("class_id", classId);

    if (membersError) {
      console.error("Delete class members error:", membersError);
      return { success: false, error: "반 구성원 삭제에 실패했습니다." };
    }

    // 2. 반-태그 연결 삭제
    const { error: tagLinksError } = await supabaseAdmin
      .from("class_tag_links")
      .delete()
      .eq("class_id", classId);

    if (tagLinksError) {
      console.error("Delete class tag links error:", tagLinksError);
      return { success: false, error: "반 태그 연결 삭제에 실패했습니다." };
    }

    // 3. form_responses 삭제 (class_id가 있는 경우)
    const { error: formResponsesError } = await supabaseAdmin
      .from("form_responses")
      .delete()
      .eq("class_id", classId);

    if (formResponsesError) {
      console.error("Delete form responses error:", formResponsesError);
      // form_responses 삭제 실패는 치명적이지 않으므로 계속 진행
    }

    // 4. 마지막으로 반 삭제
    const { error: classError } = await supabaseAdmin.from("classes").delete().eq("id", classId);

    if (classError) {
      console.error("Delete class error:", classError);
      return { success: false, error: "반 삭제에 실패했습니다." };
    }

    return { success: true };
  } catch (error) {
    console.error("Delete class error:", error);
    return { success: false, error: "반 삭제 중 오류가 발생했습니다." };
  }
};

/**
 * 반 검색 (이름, 사용자ID, 태그ID/이름으로 검색)
 */
export const searchClasses = async (
  searchConditions: ClassSearchConditions,
  userId: string
): Promise<ApiResponse<ClassWithDetails[]>> => {
  try {
    if (!searchConditions.groupId) {
      return { success: false, error: "그룹 ID가 필요합니다." };
    }

    // 그룹 멤버인지 확인
    const { data: memberCheck } = await supabaseAdmin
      .from("group_member")
      .select("id")
      .eq("group_id", searchConditions.groupId)
      .eq("user_id", userId)
      .single();

    if (!memberCheck) {
      return { success: false, error: "그룹 멤버만 반을 검색할 수 있습니다." };
    }

    let query = supabaseAdmin
      .from("classes")
      .select(
        `
        *,
        groups (name, description)
      `
      )
      .eq("group_id", searchConditions.groupId);

    // 이름으로 검색
    if (searchConditions.name) {
      query = query.ilike("name", `%${searchConditions.name}%`);
    }

    // 사용자 ID로 검색 (해당 사용자가 속한 반)
    if (searchConditions.userId) {
      const { data: userClasses } = await supabaseAdmin
        .from("class_members")
        .select("class_id")
        .eq("user_id", searchConditions.userId);

      if (userClasses && userClasses.length > 0) {
        const classIds = userClasses
          .map((c) => c.class_id)
          .filter((id): id is string => id !== null);
        if (classIds.length > 0) {
          query = query.in("id", classIds);
        } else {
          return { success: true, data: [] };
        }
      } else {
        return { success: true, data: [] };
      }
    }

    // 태그 ID로 검색
    if (searchConditions.tagId) {
      const { data: taggedClasses } = await supabaseAdmin
        .from("class_tag_links")
        .select("class_id")
        .eq("tag_id", searchConditions.tagId);

      if (taggedClasses && taggedClasses.length > 0) {
        const classIds = taggedClasses.map((t) => t.class_id);
        if (classIds.length > 0) {
          query = query.in("id", classIds);
        } else {
          return { success: true, data: [] };
        }
      } else {
        return { success: true, data: [] };
      }
    }

    // 태그 이름으로 검색
    if (searchConditions.tagName) {
      const { data: tagData } = await supabaseAdmin
        .from("class_tags")
        .select("id")
        .eq("name", searchConditions.tagName)
        .single();

      if (tagData) {
        const { data: taggedClasses } = await supabaseAdmin
          .from("class_tag_links")
          .select("class_id")
          .eq("tag_id", tagData.id);

        if (taggedClasses && taggedClasses.length > 0) {
          const classIds = taggedClasses.map((t) => t.class_id);
          query = query.in("id", classIds);
        } else {
          return { success: true, data: [] };
        }
      } else {
        return { success: true, data: [] };
      }
    }

    const { data: classes, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("Search classes error:", error);
      return { success: false, error: "반 검색에 실패했습니다." };
    }

    // 각 반의 구성원 수와 태그 조회
    const classesWithDetails: ClassWithDetails[] = await Promise.all(
      (classes || []).map(async (classItem) => {
        const [memberCountResult, tagsResult] = await Promise.all([
          supabaseAdmin
            .from("class_members")
            .select("*", { count: "exact", head: true })
            .eq("class_id", classItem.id),
          supabaseAdmin
            .from("class_tag_links")
            .select(
              `
              class_tags (*)
            `
            )
            .eq("class_id", classItem.id),
        ]);

        const tags = (tagsResult.data || [])
          .map((link: TagLinkWithClassTag) => link.class_tags)
          .filter(Boolean);

        return {
          ...classItem,
          memberCount: memberCountResult.count || 0,
          groups: classItem.groups || null,
          class_tags: tags || [],
        };
      })
    );

    return { success: true, data: classesWithDetails };
  } catch (error) {
    console.error("Search classes error:", error);
    return { success: false, error: "반 검색 중 오류가 발생했습니다." };
  }
};

/**
 * 반 필터링 (교육 수준, 생성일, 태그 이름 등으로 필터링)
 */
export const filterClasses = async (
  filterConditions: ClassFilterConditions,
  userId: string
): Promise<ApiResponse<ClassWithDetails[]>> => {
  try {
    if (!filterConditions.groupId) {
      return { success: false, error: "그룹 ID가 필요합니다." };
    }

    // 그룹 멤버인지 확인
    const { data: memberCheck } = await supabaseAdmin
      .from("group_member")
      .select("id")
      .eq("group_id", filterConditions.groupId)
      .eq("user_id", userId)
      .single();

    if (!memberCheck) {
      return { success: false, error: "그룹 멤버만 반을 조회할 수 있습니다." };
    }

    let query = supabaseAdmin
      .from("classes")
      .select(
        `
        *,
        groups (name, description)
      `
      )
      .eq("group_id", filterConditions.groupId);

    // 생성일 필터링
    if (filterConditions.createdAfter) {
      query = query.gte("created_at", filterConditions.createdAfter);
    }

    if (filterConditions.createdBefore) {
      query = query.lte("created_at", filterConditions.createdBefore);
    }

    // 태그 이름으로 필터링
    if (filterConditions.tagNames && filterConditions.tagNames.length > 0) {
      const { data: tagsData } = await supabaseAdmin
        .from("class_tags")
        .select("id")
        .in("name", filterConditions.tagNames);

      if (tagsData && tagsData.length > 0) {
        const tagIds = tagsData.map((tag) => tag.id);
        const { data: taggedClasses } = await supabaseAdmin
          .from("class_tag_links")
          .select("class_id")
          .in("tag_id", tagIds);

        if (taggedClasses && taggedClasses.length > 0) {
          const classIds = [...new Set(taggedClasses.map((t) => t.class_id))];
          query = query.in("id", classIds);
        } else {
          return { success: true, data: [] };
        }
      } else {
        return { success: true, data: [] };
      }
    }

    const { data: classes, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("Filter classes error:", error);
      return { success: false, error: "반 필터링에 실패했습니다." };
    }

    let filteredClasses = classes || [];

    // 교육 수준으로 필터링 (반 구성원들의 교육 수준 기준)
    if (filterConditions.education && filterConditions.education.length > 0) {
      const classesWithEducationFilter = await Promise.all(
        filteredClasses.map(async (classItem) => {
          const { data: members } = await supabaseAdmin
            .from("class_members")
            .select(
              `
              users (education)
            `
            )
            .eq("class_id", classItem.id);

          interface MemberWithUser {
            users: {
              education: string | null;
            } | null;
          }

          const hasMatchingEducation = members?.some(
            (member: MemberWithUser) =>
              member.users?.education &&
              filterConditions.education!.includes(member.users.education as EducationLevel)
          );

          return hasMatchingEducation ? classItem : null;
        })
      );

      filteredClasses = classesWithEducationFilter.filter(Boolean) as typeof filteredClasses;
    }

    // 각 반의 구성원 수와 태그 조회
    const classesWithDetails: ClassWithDetails[] = await Promise.all(
      filteredClasses.map(async (classItem) => {
        const [memberCountResult, tagsResult] = await Promise.all([
          supabaseAdmin
            .from("class_members")
            .select("*", { count: "exact", head: true })
            .eq("class_id", classItem.id),
          supabaseAdmin
            .from("class_tag_links")
            .select(
              `
              class_tags (*)
            `
            )
            .eq("class_id", classItem.id),
        ]);
        interface TagLinkWithClassTag {
          class_tags: ClassTag;
        }
        const tags = (tagsResult.data || [])
          .map((link: TagLinkWithClassTag) => link.class_tags)
          .filter(Boolean);

        return {
          ...classItem,
          memberCount: memberCountResult.count || 0,
          groups: classItem.groups || null,
          class_tags: tags || [],
        };
      })
    );

    return { success: true, data: classesWithDetails };
  } catch (error) {
    console.error("Filter classes error:", error);
    return { success: false, error: "반 필터링 중 오류가 발생했습니다." };
  }
};

/**
 * 반 전체 조회 (그룹 내 모든 반)
 */
export const getAllClasses = async (
  groupId: string,
  userId: string
): Promise<ApiResponse<ClassWithDetails[]>> => {
  try {
    // 그룹 멤버인지 확인
    const { data: memberCheck } = await supabaseAdmin
      .from("group_member")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .single();

    if (!memberCheck) {
      return { success: false, error: "그룹 멤버만 반을 조회할 수 있습니다." };
    }

    const { data: classes, error } = await supabaseAdmin
      .from("classes")
      .select(
        `
        *,
        groups (name, description)
      `
      )
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get all classes error:", error);
      return { success: false, error: "반 조회에 실패했습니다." };
    }

    // 각 반의 구성원 수와 태그 조회
    const classesWithDetails: ClassWithDetails[] = await Promise.all(
      (classes || []).map(async (classItem) => {
        const [memberCountResult, tagsResult] = await Promise.all([
          supabaseAdmin
            .from("class_members")
            .select("*", { count: "exact", head: true })
            .eq("class_id", classItem.id),
          supabaseAdmin
            .from("class_tag_links")
            .select(
              `
              class_tags (*)
            `
            )
            .eq("class_id", classItem.id),
        ]);

        const tags = (tagsResult.data || [])
          .map((link: TagLinkWithClassTag) => link.class_tags)
          .filter(Boolean);

        return {
          ...classItem,
          memberCount: memberCountResult.count || 0,
          groups: classItem.groups || null,
          class_tags: tags || [],
        };
      })
    );

    return { success: true, data: classesWithDetails };
  } catch (error) {
    console.error("Get all classes error:", error);
    return { success: false, error: "반 조회 중 오류가 발생했습니다." };
  }
};

/**
 * 반 정보 수정
 */
export const updateClass = async (
  classId: string,
  userId: string,
  updateData: UpdateClassRequest
): Promise<ApiResponse<Class>> => {
  try {
    // 반 정보 조회
    const { data: classInfo } = await supabaseAdmin
      .from("classes")
      .select("group_id, name")
      .eq("id", classId)
      .single();

    if (!classInfo || !classInfo.group_id) {
      return { success: false, error: "반을 찾을 수 없습니다." };
    }

    // 그룹 멤버인지 확인
    const { data: memberCheck } = await supabaseAdmin
      .from("group_member")
      .select("id")
      .eq("group_id", classInfo.group_id)
      .eq("user_id", userId)
      .single();

    if (!memberCheck) {
      return { success: false, error: "그룹 멤버만 반을 수정할 수 있습니다." };
    }

    // 이름 변경 시 중복 검사
    if (updateData.name && updateData.name !== classInfo.name) {
      const { data: existingClass } = await supabaseAdmin
        .from("classes")
        .select("id")
        .eq("group_id", classInfo.group_id)
        .eq("name", updateData.name.trim())
        .neq("id", classId)
        .single();

      if (existingClass) {
        return { success: false, error: "이미 존재하는 반 이름입니다." };
      }
    }

    // 반 정보 업데이트
    const updateFields: Partial<ClassUpdate> = {};
    if (updateData.name) updateFields.name = updateData.name.trim();
    if (updateData.description !== undefined) updateFields.description = updateData.description;

    const { data: updatedClass, error: updateError } = await supabaseAdmin
      .from("classes")
      .update(updateFields)
      .eq("id", classId)
      .select()
      .single();

    if (updateError) {
      return { success: false, error: "반 정보 수정에 실패했습니다." };
    }

    // 태그 업데이트
    if (updateData.tags !== undefined) {
      // 기존 태그 연결 삭제
      await supabaseAdmin.from("class_tag_links").delete().eq("class_id", classId);

      // 새 태그 추가 및 연결
      if (updateData.tags.length > 0) {
        for (const tagName of updateData.tags) {
          const normalizedName = normalizeTagName(tagName);
          if (!normalizedName) continue;

          // 태그 존재 확인
          const { data: existingTag } = await supabaseAdmin
            .from("class_tags")
            .select("id")
            .eq("name", normalizedName)
            .single();

          let tagId: string;

          if (existingTag) {
            tagId = existingTag.id;
          } else {
            // 새 태그 생성
            const { data: newTag, error: tagError } = await supabaseAdmin
              .from("class_tags")
              .insert({ name: normalizedName })
              .select()
              .single();

            if (tagError || !newTag) {
              console.error("Tag creation error:", tagError);
              continue;
            }
            tagId = newTag.id;
          }

          // 반과 태그 연결
          await supabaseAdmin.from("class_tag_links").insert({
            class_id: classId,
            tag_id: tagId,
          });
        }
      }
    }

    return { success: true, data: updatedClass };
  } catch (error) {
    console.error("Update class error:", error);
    return { success: false, error: "반 정보 수정 중 오류가 발생했습니다." };
  }
};

/**
 * 반 구성원 추가 (알림 추가)
 */
export const addClassMember = async (
  classId: string,
  memberUserId: string,
  userId: string
): Promise<ApiResponse<ClassMember>> => {
  try {
    // 반 정보 조회
    const { data: classInfo } = await supabaseAdmin
      .from("classes")
      .select("group_id, name")
      .eq("id", classId)
      .single();

    if (!classInfo || !classInfo.group_id) {
      return { success: false, error: "반을 찾을 수 없습니다." };
    }

    // 그룹 멤버인지 확인 (요청자)
    const { data: memberCheck } = await supabaseAdmin
      .from("group_member")
      .select("id")
      .eq("group_id", classInfo.group_id)
      .eq("user_id", userId)
      .single();

    if (!memberCheck) {
      return { success: false, error: "그룹 멤버만 반 구성원을 추가할 수 있습니다." };
    }

    // 추가할 사용자도 그룹 멤버인지 확인
    const { data: targetMemberCheck } = await supabaseAdmin
      .from("group_member")
      .select("id")
      .eq("group_id", classInfo.group_id)
      .eq("user_id", memberUserId)
      .single();

    if (!targetMemberCheck) {
      return { success: false, error: "그룹 멤버만 반에 추가할 수 있습니다." };
    }

    // 이미 반 구성원인지 확인
    const { data: existingMember } = await supabaseAdmin
      .from("class_members")
      .select("id")
      .eq("class_id", classId)
      .eq("user_id", memberUserId)
      .single();

    if (existingMember) {
      return { success: false, error: "이미 반 구성원입니다." };
    }

    // 반 구성원 추가
    const { data: newMember, error } = await supabaseAdmin
      .from("class_members")
      .insert({
        class_id: classId,
        user_id: memberUserId,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: "반 구성원 추가에 실패했습니다." };
    }

    // 그룹 정보 조회
    const { data: groupInfo } = await supabaseAdmin
      .from("groups")
      .select("name")
      .eq("id", classInfo.group_id)
      .single();

    // 반 추가 알림 생성
    if (groupInfo && classInfo.name) {
      await createClassAddedNotification(
        classId,
        classInfo.name,
        classInfo.group_id,
        groupInfo.name || "알 수 없는 그룹",
        memberUserId,
        userId
      );
    }

    return { success: true, data: newMember };
  } catch (error) {
    console.error("Add class member error:", error);
    return { success: false, error: "반 구성원 추가 중 오류가 발생했습니다." };
  }
};

/**
 * 반 구성원 제거 (알림 추가)
 */
export const removeClassMember = async (
  classId: string,
  memberUserId: string,
  userId: string
): Promise<ApiResponse<void>> => {
  try {
    // 반 정보 조회
    const { data: classInfo } = await supabaseAdmin
      .from("classes")
      .select("group_id, name")
      .eq("id", classId)
      .single();

    if (!classInfo || !classInfo.group_id) {
      return { success: false, error: "반을 찾을 수 없습니다." };
    }

    // 그룹 멤버인지 확인
    const { data: memberCheck } = await supabaseAdmin
      .from("group_member")
      .select("id")
      .eq("group_id", classInfo.group_id)
      .eq("user_id", userId)
      .single();

    if (!memberCheck) {
      return { success: false, error: "그룹 멤버만 반 구성원을 제거할 수 있습니다." };
    }

    // 반 구성원 제거
    const { error } = await supabaseAdmin
      .from("class_members")
      .delete()
      .eq("class_id", classId)
      .eq("user_id", memberUserId);

    if (error) {
      return { success: false, error: "반 구성원 제거에 실패했습니다." };
    }

    // 그룹 정보 조회
    const { data: groupInfo } = await supabaseAdmin
      .from("groups")
      .select("name")
      .eq("id", classInfo.group_id)
      .single();

    // 반 제거 알림 생성
    if (groupInfo && memberUserId !== userId && classInfo.name) {
      await createClassRemovedNotification(
        classId,
        classInfo.name,
        classInfo.group_id,
        groupInfo.name || "알 수 없는 그룹",
        memberUserId,
        userId
      );
    }

    return { success: true };
  } catch (error) {
    console.error("Remove class member error:", error);
    return { success: false, error: "반 구성원 제거 중 오류가 발생했습니다." };
  }
};

/**
 * 반 나가기 (본인만 가능)
 */
export const leaveClass = async (classId: string, userId: string): Promise<ApiResponse<void>> => {
  try {
    // 반 정보 조회
    const { data: classInfo } = await supabaseAdmin
      .from("classes")
      .select("group_id, name")
      .eq("id", classId)
      .single();

    if (!classInfo || !classInfo.group_id) {
      return { success: false, error: "반을 찾을 수 없습니다." };
    }

    // 반 구성원인지 확인
    const { data: memberCheck } = await supabaseAdmin
      .from("class_members")
      .select("id")
      .eq("class_id", classId)
      .eq("user_id", userId)
      .single();

    if (!memberCheck) {
      return { success: false, error: "반 구성원이 아닙니다." };
    }

    // 그룹 정보 조회
    const { data: groupInfo } = await supabaseAdmin
      .from("groups")
      .select("name")
      .eq("id", classInfo.group_id)
      .single();

    // 반에서 나가기
    const { error } = await supabaseAdmin
      .from("class_members")
      .delete()
      .eq("class_id", classId)
      .eq("user_id", userId);
    // 반 나가기 알림 생성 (자기 자신에게)
    if (groupInfo && classInfo.name) {
      await createClassRemovedNotification(
        classId,
        classInfo.name,
        classInfo.group_id,
        groupInfo.name || "알 수 없는 그룹",
        userId,
        userId
      );
    }
    // 반 나가기 알림 생성 (자기 자신에게)
    if (groupInfo && classInfo.name) {
      await createClassRemovedNotification(
        classId,
        classInfo.name,
        classInfo.group_id,
        groupInfo.name || "알 수 없는 그룹",
        userId,
        userId
      );
    }
    if (error) {
      return { success: false, error: "반 나가기에 실패했습니다." };
    }
    return { success: true };
  } catch (error) {
    console.error("Leave class error:", error);
    return { success: false, error: "반 나가기 중 오류가 발생했습니다." };
  }
};

/**
 * 반 구성원 검색 (이름, 교육 수준으로 검색)
 */
export const searchClassMembers = async (
  searchConditions: ClassMemberSearchConditions,
  userId: string
): Promise<ApiResponse<ClassMemberWithDetails[]>> => {
  try {
    // 반 정보 조회
    const { data: classInfo } = await supabaseAdmin
      .from("classes")
      .select("group_id")
      .eq("id", searchConditions.classId)
      .single();

    if (!classInfo || !classInfo.group_id) {
      return { success: false, error: "반을 찾을 수 없습니다." };
    }

    // 그룹 멤버인지 확인
    const { data: memberCheck } = await supabaseAdmin
      .from("group_member")
      .select("id")
      .eq("group_id", classInfo.group_id)
      .eq("user_id", userId)
      .single();

    if (!memberCheck) {
      return { success: false, error: "그룹 멤버만 반 구성원을 검색할 수 있습니다." };
    }

    const query = supabaseAdmin
      .from("class_members")
      .select(
        `
        *,
        users (id, name, nickname, email, education, birth_date)
      `
      )
      .eq("class_id", searchConditions.classId);

    const { data: members, error } = await query.order("assigned_at", { ascending: true });

    if (error) {
      console.error("Search class members error:", error);
      return { success: false, error: "반 구성원 검색에 실패했습니다." };
    }

    let filteredMembers = members || [];

    interface MemberWithUser {
      id: string;
      class_id: string | null;
      user_id: string | null;
      assigned_at: string | null;
      users: {
        id: string;
        name: string;
        nickname: string;
        email: string;
        education: string | null;
        birth_date: string;
      } | null;
    }

    // 이름으로 필터링
    if (searchConditions.name) {
      filteredMembers = filteredMembers.filter(
        (member: MemberWithUser) =>
          member.users?.name?.includes(searchConditions.name!) ||
          member.users?.nickname?.includes(searchConditions.name!)
      );
    }

    // 교육 수준으로 필터링
    if (searchConditions.education && searchConditions.education.length > 0) {
      filteredMembers = filteredMembers.filter(
        (member: MemberWithUser) =>
          member.users?.education &&
          searchConditions.education!.includes(member.users.education as EducationLevel)
      );
    }

    // 필수 필드가 null이 아닌 경우만 반환
    const validMembers = filteredMembers.filter(
      (member: MemberWithUser) => member && member.class_id && member.user_id && member.users
    ) as ClassMemberWithDetails[];

    return { success: true, data: validMembers };
  } catch (error) {
    console.error("Search class members error:", error);
    return { success: false, error: "반 구성원 검색 중 오류가 발생했습니다." };
  }
};

/**
 * 반 구성원 조회
 */
export const getClassMembers = async (
  classId: string,
  userId: string
): Promise<ApiResponse<ClassMemberWithDetails[]>> => {
  try {
    // 반 정보 조회
    const { data: classInfo } = await supabaseAdmin
      .from("classes")
      .select("group_id")
      .eq("id", classId)
      .single();

    if (!classInfo || !classInfo.group_id) {
      return { success: false, error: "반을 찾을 수 없습니다." };
    }

    // 그룹 멤버인지 확인
    const { data: memberCheck } = await supabaseAdmin
      .from("group_member")
      .select("id")
      .eq("group_id", classInfo.group_id)
      .eq("user_id", userId)
      .single();

    if (!memberCheck) {
      return { success: false, error: "그룹 멤버만 반 구성원을 조회할 수 있습니다." };
    }

    const { data: members, error } = await supabaseAdmin
      .from("class_members")
      .select(
        `
        *,
        users (id, name, nickname, email, education, birth_date)
      `
      )
      .eq("class_id", classId)
      .order("assigned_at", { ascending: true });

    if (error) {
      console.error("Get class members error:", error);
      return { success: false, error: "반 구성원 조회에 실패했습니다." };
    }

    interface MemberWithUser {
      id: string;
      class_id: string | null;
      user_id: string | null;
      assigned_at: string | null;
      users: {
        id: string;
        name: string;
        nickname: string;
        email: string;
        education: string | null;
        birth_date: string;
      } | null;
    }

    // 필수 필드가 null이 아닌 경우만 반환
    const validMembers = (members || []).filter(
      (member: MemberWithUser) => member && member.class_id && member.user_id && member.users
    ) as ClassMemberWithDetails[];

    return { success: true, data: validMembers };
  } catch (error) {
    console.error("Get class members error:", error);
    return { success: false, error: "반 구성원 조회 중 오류가 발생했습니다." };
  }
};

/**
 * 반 상세 정보 조회
 */
export const getClassDetails = async (
  classId: string,
  userId: string
): Promise<ApiResponse<ClassWithDetails>> => {
  try {
    const { data: classData, error } = await supabaseAdmin
      .from("classes")
      .select(
        `
        *,
        groups (name, description)
      `
      )
      .eq("id", classId)
      .single();

    if (error || !classData) {
      return { success: false, error: "반을 찾을 수 없습니다." };
    }

    // 그룹 멤버인지 확인
    const { data: memberCheck } = await supabaseAdmin
      .from("group_member")
      .select("id")
      .eq("group_id", classData.group_id || "")
      .eq("user_id", userId)
      .single();

    if (!memberCheck) {
      return { success: false, error: "그룹 멤버만 반을 조회할 수 있습니다." };
    }

    // 구성원 수와 태그 조회
    const [memberCountResult, tagsResult] = await Promise.all([
      supabaseAdmin
        .from("class_members")
        .select("*", { count: "exact", head: true })
        .eq("class_id", classId),
      supabaseAdmin
        .from("class_tag_links")
        .select(
          `
          class_tags (*)
        `
        )
        .eq("class_id", classId),
    ]);

    const tags = (tagsResult.data || [])
      .map((link: TagLinkWithClassTag) => link.class_tags)
      .filter(Boolean);

    const classWithDetails: ClassWithDetails = {
      ...classData,
      memberCount: memberCountResult.count || 0,
      groups: classData.groups || null,
      class_tags: tags || [],
    };

    return { success: true, data: classWithDetails };
  } catch (error) {
    console.error("Get class details error:", error);
    return { success: false, error: "반 상세 정보 조회 중 오류가 발생했습니다." };
  }
};

/**
 * 반 태그 조회 (특정 반의 태그들)
 */
export const getClassTags = async (
  classId: string,
  userId: string
): Promise<ApiResponse<ClassTag[]>> => {
  try {
    // 반 정보 조회
    const { data: classInfo } = await supabaseAdmin
      .from("classes")
      .select("group_id")
      .eq("id", classId)
      .single();

    if (!classInfo || !classInfo.group_id) {
      return { success: false, error: "반을 찾을 수 없습니다." };
    }

    // 그룹 멤버인지 확인
    const { data: memberCheck } = await supabaseAdmin
      .from("group_member")
      .select("id")
      .eq("group_id", classInfo.group_id)
      .eq("user_id", userId)
      .single();

    if (!memberCheck) {
      return { success: false, error: "그룹 멤버만 반 태그를 조회할 수 있습니다." };
    }

    const { data: tagLinks, error } = await supabaseAdmin
      .from("class_tag_links")
      .select(
        `
        class_tags (*)
      `
      )
      .eq("class_id", classId);

    if (error) {
      console.error("Get class tags error:", error);
      return { success: false, error: "반 태그 조회에 실패했습니다." };
    }

    const tags = (tagLinks || [])
      .map((link: TagLinkWithClassTag) => link.class_tags)
      .filter(Boolean);

    return { success: true, data: tags };
  } catch (error) {
    console.error("Get class tags error:", error);
    return { success: false, error: "반 태그 조회 중 오류가 발생했습니다." };
  }
};

/**
 * 그룹의 모든 반태그 조회
 */
export const getGroupClassTags = async (
  groupId: string,
  userId: string
): Promise<ApiResponse<ClassTag[]>> => {
  try {
    // 그룹 멤버인지 확인
    const { data: memberCheck } = await supabaseAdmin
      .from("group_member")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .single();

    if (!memberCheck) {
      return { success: false, error: "그룹 멤버만 반태그를 조회할 수 있습니다." };
    }

    // 그룹의 모든 반 조회
    const { data: groupClasses } = await supabaseAdmin
      .from("classes")
      .select("id")
      .eq("group_id", groupId);

    if (!groupClasses || groupClasses.length === 0) {
      return { success: true, data: [] };
    }

    const classIds = groupClasses.map((cls) => cls.id);

    // 그룹의 반들에 연결된 모든 태그들 조회
    const { data: tagLinks, error } = await supabaseAdmin
      .from("class_tag_links")
      .select(
        `
        class_tags (*)
      `
      )
      .in("class_id", classIds);

    if (error) {
      console.error("Get group class tags error:", error);
      return { success: false, error: "반태그 조회에 실패했습니다." };
    }

    // 중복 제거
    const allTags = (tagLinks || [])
      .map((link: TagLinkWithClassTag) => link.class_tags)
      .filter(Boolean);

    const uniqueTags = Array.from(new Map(allTags.map((tag) => [tag.id, tag])).values());

    return { success: true, data: uniqueTags };
  } catch (error) {
    console.error("Get group class tags error:", error);
    return { success: false, error: "반태그 조회 중 오류가 발생했습니다." };
  }
};

/**
 * 반태그 생성
 */
export const createClassTag = async (
  tagData: CreateClassTagRequest,
  userId: string
): Promise<ApiResponse<ClassTag>> => {
  try {
    const normalizedName = normalizeTagName(tagData.name);
    if (!normalizedName) {
      return { success: false, error: "태그 이름을 입력해주세요." };
    }

    // 그룹 멤버인지 확인
    const { data: memberCheck } = await supabaseAdmin
      .from("group_member")
      .select("id")
      .eq("group_id", tagData.groupId)
      .eq("user_id", userId)
      .single();

    if (!memberCheck) {
      return { success: false, error: "그룹 멤버만 반태그를 생성할 수 있습니다." };
    }

    // 태그 이름 중복 검사
    const { data: existingTag } = await supabaseAdmin
      .from("class_tags")
      .select("id")
      .eq("name", normalizedName)
      .single();

    if (existingTag) {
      return { success: false, error: "이미 존재하는 태그 이름입니다." };
    }

    // 새 태그 생성
    const { data: newTag, error } = await supabaseAdmin
      .from("class_tags")
      .insert({ name: normalizedName })
      .select()
      .single();

    if (error) {
      return { success: false, error: "태그 생성에 실패했습니다." };
    }

    return { success: true, data: newTag };
  } catch (error) {
    console.error("Create class tag error:", error);
    return { success: false, error: "반태그 생성 중 오류가 발생했습니다." };
  }
};

/**
 * 반태그 수정
 */
export const updateClassTag = async (
  tagId: string,
  updateData: UpdateClassTagRequest,
  userId: string
): Promise<ApiResponse<ClassTag>> => {
  try {
    const normalizedName = normalizeTagName(updateData.name);
    if (!normalizedName) {
      return { success: false, error: "태그 이름을 입력해주세요." };
    }

    // 태그를 사용하는 반이 있는지 확인 (그룹 멤버 권한 확인용)
    const { data: tagLinks } = await supabaseAdmin
      .from("class_tag_links")
      .select(
        `
        classes!inner (group_id)
      `
      )
      .eq("tag_id", tagId)
      .limit(1);

    if (!tagLinks || tagLinks.length === 0) {
      return { success: false, error: "태그를 찾을 수 없습니다." };
    }

    const groupId = tagLinks[0].classes.group_id;

    // 그룹 멤버인지 확인
    const { data: memberCheck } = await supabaseAdmin
      .from("group_member")
      .select("id")
      .eq("group_id", groupId!)
      .eq("user_id", userId)
      .single();

    if (!memberCheck) {
      return { success: false, error: "그룹 멤버만 반태그를 수정할 수 있습니다." };
    }

    // 새 이름이 중복되는지 확인
    const { data: existingTag } = await supabaseAdmin
      .from("class_tags")
      .select("id")
      .eq("name", normalizedName)
      .neq("id", tagId)
      .single();

    if (existingTag) {
      return { success: false, error: "이미 존재하는 태그 이름입니다." };
    }

    // 태그 이름 수정
    const { data: updatedTag, error } = await supabaseAdmin
      .from("class_tags")
      .update({ name: normalizedName })
      .eq("id", tagId)
      .select()
      .single();

    if (error) {
      return { success: false, error: "태그 수정에 실패했습니다." };
    }

    return { success: true, data: updatedTag };
  } catch (error) {
    console.error("Update class tag error:", error);
    return { success: false, error: "반태그 수정 중 오류가 발생했습니다." };
  }
};

/**
 * 반에 기존 태그 연결
 */
export const linkTagToClass = async (
  classId: string,
  linkData: LinkClassTagRequest,
  userId: string
): Promise<ApiResponse<ClassTagLink>> => {
  try {
    // 반 정보 조회
    const { data: classInfo } = await supabaseAdmin
      .from("classes")
      .select("group_id")
      .eq("id", classId)
      .single();

    if (!classInfo || !classInfo.group_id) {
      return { success: false, error: "반을 찾을 수 없습니다." };
    }

    // 그룹 멤버인지 확인
    const { data: memberCheck } = await supabaseAdmin
      .from("group_member")
      .select("id")
      .eq("group_id", classInfo.group_id)
      .eq("user_id", userId)
      .single();

    if (!memberCheck) {
      return { success: false, error: "그룹 멤버만 반태그를 연결할 수 있습니다." };
    }

    // 태그가 존재하는지 확인
    const { data: tag } = await supabaseAdmin
      .from("class_tags")
      .select("id, name")
      .eq("id", linkData.tagId)
      .single();

    if (!tag) {
      return { success: false, error: "연결할 태그를 찾을 수 없습니다." };
    }

    // 이미 연결되어 있는지 확인
    const { data: existingLink } = await supabaseAdmin
      .from("class_tag_links")
      .select("class_id, tag_id")
      .eq("class_id", classId)
      .eq("tag_id", linkData.tagId)
      .single();

    if (existingLink) {
      return { success: false, error: "이미 연결된 태그입니다." };
    }

    // 반과 태그 연결
    const { data: newLink, error } = await supabaseAdmin
      .from("class_tag_links")
      .insert({
        class_id: classId,
        tag_id: linkData.tagId,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: "태그 연결에 실패했습니다." };
    }

    return { success: true, data: newLink };
  } catch (error) {
    console.error("Link tag to class error:", error);
    return { success: false, error: "반태그 연결 중 오류가 발생했습니다." };
  }
};

/**
 * 반태그별 반 검색
 */
export const searchClassesByTag = async (
  groupId: string,
  tagName: string,
  userId: string
): Promise<ApiResponse<ClassWithDetails[]>> => {
  try {
    // 그룹 멤버인지 확인
    const { data: memberCheck } = await supabaseAdmin
      .from("group_member")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .single();

    if (!memberCheck) {
      return { success: false, error: "그룹 멤버만 반을 검색할 수 있습니다." };
    }

    // 태그 조회
    const { data: tag } = await supabaseAdmin
      .from("class_tags")
      .select("id")
      .eq("name", tagName)
      .single();

    if (!tag) {
      return { success: true, data: [] };
    }

    // 해당 태그를 가진 반들 조회
    const { data: taggedClasses, error } = await supabaseAdmin
      .from("class_tag_links")
      .select(
        `
        classes!inner (
          *,
          groups (name, description)
        )
      `
      )
      .eq("tag_id", tag.id)
      .eq("classes.group_id", groupId);

    if (error) {
      console.error("Search classes by tag error:", error);
      return { success: false, error: "태그별 반 검색에 실패했습니다." };
    }

    if (!taggedClasses || taggedClasses.length === 0) {
      return { success: true, data: [] };
    }

    // 각 반의 구성원 수와 태그 조회
    const classesWithDetails: ClassWithDetails[] = await Promise.all(
      taggedClasses.map(async (taggedClass) => {
        const classData = taggedClass.classes;

        const [memberCountResult, tagsResult] = await Promise.all([
          supabaseAdmin
            .from("class_members")
            .select("*", { count: "exact", head: true })
            .eq("class_id", classData.id),
          supabaseAdmin
            .from("class_tag_links")
            .select(
              `
              class_tags (*)
            `
            )
            .eq("class_id", classData.id),
        ]);

        const tags = (tagsResult.data || [])
          .map((link: TagLinkWithClassTag) => link.class_tags)
          .filter(Boolean);

        return {
          ...classData,
          memberCount: memberCountResult.count || 0,
          groups: classData.groups || null,
          class_tags: tags || [],
        };
      })
    );

    return { success: true, data: classesWithDetails };
  } catch (error) {
    console.error("Search classes by tag error:", error);
    return { success: false, error: "태그별 반 검색 중 오류가 발생했습니다." };
  }
};

/**
 * 반태그 삭제
 */
export const deleteClassTag = async (tagId: string, userId: string): Promise<ApiResponse<void>> => {
  try {
    // 태그를 사용하는 반이 있는지 확인
    const { data: tagLinks } = await supabaseAdmin
      .from("class_tag_links")
      .select(
        `
        classes!inner (group_id)
      `
      )
      .eq("tag_id", tagId)
      .limit(1);

    if (!tagLinks || tagLinks.length === 0) {
      return { success: false, error: "태그를 찾을 수 없습니다." };
    }

    const groupId = tagLinks[0].classes.group_id;

    // 그룹 멤버인지 확인
    const { data: memberCheck } = await supabaseAdmin
      .from("group_member")
      .select("id")
      .eq("group_id", groupId!)
      .eq("user_id", userId)
      .single();

    if (!memberCheck) {
      return { success: false, error: "그룹 멤버만 반태그를 삭제할 수 있습니다." };
    }

    // 연결 삭제 후 태그 삭제
    await supabaseAdmin.from("class_tag_links").delete().eq("tag_id", tagId);

    const { error } = await supabaseAdmin.from("class_tags").delete().eq("id", tagId);

    if (error) {
      return { success: false, error: "태그 삭제에 실패했습니다." };
    }

    return { success: true };
  } catch (error) {
    console.error("Delete class tag error:", error);
    return { success: false, error: "반태그 삭제 중 오류가 발생했습니다." };
  }
};

/**
 * 사용자가 특정 반의 멤버인지 확인
 */
export const isClassMember = async (
  classId: string,
  userId: string
): Promise<ApiResponse<boolean>> => {
  try {
    const { data: member } = await supabaseAdmin
      .from("class_members")
      .select("id")
      .eq("class_id", classId)
      .eq("user_id", userId)
      .single();

    return { success: true, data: !!member };
  } catch (error) {
    return { success: true, data: false };
  }
};

/**
 * 태그 검색 (이름으로 검색)
 */
export const searchClassTags = async (
  groupId: string,
  searchTerm: string,
  userId: string
): Promise<ApiResponse<ClassTag[]>> => {
  try {
    // 그룹 멤버인지 확인
    const { data: memberCheck } = await supabaseAdmin
      .from("group_member")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .single();

    if (!memberCheck) {
      return { success: false, error: "그룹 멤버만 태그를 검색할 수 있습니다." };
    }

    // 그룹의 모든 반 조회
    const { data: groupClasses } = await supabaseAdmin
      .from("classes")
      .select("id")
      .eq("group_id", groupId);

    if (!groupClasses || groupClasses.length === 0) {
      return { success: true, data: [] };
    }

    const classIds = groupClasses.map((cls) => cls.id);

    // 그룹의 반들에 연결된 태그들 중 검색어와 일치하는 것들 조회
    const { data: tagLinks, error } = await supabaseAdmin
      .from("class_tag_links")
      .select(
        `
        class_tags (*)
      `
      )
      .in("class_id", classIds)
      .ilike("class_tags.name", `%${searchTerm}%`);

    if (error) {
      console.error("Search class tags error:", error);
      return { success: false, error: "태그 검색에 실패했습니다." };
    }

    // 중복 제거
    const allTags = (tagLinks || [])
      .map((link: TagLinkWithClassTag) => link.class_tags)
      .filter(Boolean);

    const uniqueTags = Array.from(new Map(allTags.map((tag) => [tag.id, tag])).values());

    return { success: true, data: uniqueTags };
  } catch (error) {
    console.error("Search class tags error:", error);
    return { success: false, error: "태그 검색 중 오류가 발생했습니다." };
  }
};

/**
 * 그룹 내 모든 태그 조회 (연결된 태그 + 연결되지 않은 태그)
 */
export const getAllAvailableTags = async (
  groupId: string,
  userId: string
): Promise<ApiResponse<ClassTag[]>> => {
  try {
    // 그룹 멤버인지 확인
    const { data: memberCheck } = await supabaseAdmin
      .from("group_member")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .single();

    if (!memberCheck) {
      return { success: false, error: "그룹 멤버만 태그를 조회할 수 있습니다." };
    }

    // 그룹의 모든 반 조회
    const { data: groupClasses } = await supabaseAdmin
      .from("classes")
      .select("id")
      .eq("group_id", groupId);

    if (!groupClasses || groupClasses.length === 0) {
      // 그룹에 반이 없으면 모든 태그 반환
      const { data: allTags, error } = await supabaseAdmin
        .from("class_tags")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        console.error("Get all available tags error:", error);
        return { success: false, error: "태그 조회에 실패했습니다." };
      }

      return { success: true, data: allTags || [] };
    }

    const classIds = groupClasses.map((cls) => cls.id);

    // 그룹의 반들에 연결된 태그들 조회
    const { data: connectedTagLinks, error: connectedError } = await supabaseAdmin
      .from("class_tag_links")
      .select(
        `
        class_tags (*)
      `
      )
      .in("class_id", classIds);

    if (connectedError) {
      console.error("Get connected tags error:", connectedError);
      return { success: false, error: "연결된 태그 조회에 실패했습니다." };
    }

    // 연결된 태그 ID들
    const connectedTagIds = (connectedTagLinks || [])
      .map((link: TagLinkWithClassTag) => link.class_tags?.id)
      .filter(Boolean);

    // 모든 태그 조회
    const { data: allTags, error: allTagsError } = await supabaseAdmin
      .from("class_tags")
      .select("*")
      .order("name", { ascending: true });

    if (allTagsError) {
      console.error("Get all tags error:", allTagsError);
      return { success: false, error: "태그 조회에 실패했습니다." };
    }

    // 연결된 태그와 연결되지 않은 태그 모두 반환
    return { success: true, data: allTags || [] };
  } catch (error) {
    console.error("Get all available tags error:", error);
    return { success: false, error: "태그 조회 중 오류가 발생했습니다." };
  }
};
