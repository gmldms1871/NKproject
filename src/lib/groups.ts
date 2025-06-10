// lib/groups.ts
// 그룹(학원) 관리 관련 함수들 - 생성, 수정, 삭제, 멤버 관리, 통계 등

import { supabase } from "./supabase";
import type {
  Group,
  GroupInsert,
  GroupUpdate,
  GroupWithMembers,
  GroupMember,
  GroupMemberInsert,
  GroupMemberUpdate,
  APIResponse,
  UserRole,
  GroupStatistics,
  PaginatedResponse,
  SearchFilters,
  User,
} from "./types";

/**
 * 새 그룹 생성
 * @param groupData 그룹 정보
 * @param ownerId 소유자 ID
 * @returns 생성된 그룹 정보
 */
export async function createGroup(
  groupData: Omit<GroupInsert, "id" | "created_at" | "updated_at" | "owner_id">,
  ownerId: string
): Promise<APIResponse<Group>> {
  try {
    const { data, error } = await supabase
      .from("groups")
      .insert({
        ...groupData,
        owner_id: ownerId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // 소유자를 관리자로 자동 추가
    const memberResult = await addGroupMember(data.id, ownerId, "admin");
    if (!memberResult.success) {
      // 그룹은 생성되었지만 멤버 추가 실패 - 로그만 남기고 성공 처리
      console.error("그룹 소유자 멤버 추가 실패:", memberResult.error);
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "그룹 생성 중 오류가 발생했습니다." };
  }
}

/**
 * 그룹 정보 조회
 * @param groupId 그룹 ID
 * @returns 그룹 정보
 */
export async function getGroup(groupId: string): Promise<APIResponse<Group>> {
  try {
    const { data, error } = await supabase.from("groups").select("*").eq("id", groupId).single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "그룹 정보 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 그룹 정보를 멤버와 함께 조회
 * @param groupId 그룹 ID
 * @returns 멤버 정보가 포함된 그룹 데이터
 */
export async function getGroupWithMembers(groupId: string): Promise<APIResponse<GroupWithMembers>> {
  try {
    const { data, error } = await supabase
      .from("groups")
      .select(
        `
        *,
        group_members (
          id,
          role,
          invited_at,
          accepted_at,
          users (
            id,
            name,
            email,
            phone,
            birth_date
          )
        ),
        classes (
          id,
          name,
          description,
          created_at
        )
      `
      )
      .eq("id", groupId)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // 수락된 멤버만 필터링
    const acceptedMembers = data.group_members.filter((member) => member.accepted_at);

    const groupWithStats = {
      ...data,
      group_members: acceptedMembers,
      _count: {
        group_members: acceptedMembers.length,
        classes: data.classes?.length || 0,
        form_templates: 0, // 별도 쿼리로 조회 필요
      },
    };

    return { success: true, data: groupWithStats };
  } catch (error) {
    return { success: false, error: "그룹 정보 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 그룹 정보 업데이트
 * @param groupId 그룹 ID
 * @param updates 업데이트할 정보
 * @returns 업데이트된 그룹 정보
 */
export async function updateGroup(
  groupId: string,
  updates: GroupUpdate
): Promise<APIResponse<Group>> {
  try {
    const { data, error } = await supabase
      .from("groups")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", groupId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "그룹 정보 업데이트 중 오류가 발생했습니다." };
  }
}

/**
 * 그룹 삭제
 * @param groupId 그룹 ID
 * @returns 삭제 결과
 */
export async function deleteGroup(groupId: string): Promise<APIResponse> {
  try {
    // 관련 데이터들도 함께 삭제 (CASCADE 설정에 따라)
    const { error } = await supabase.from("groups").delete().eq("id", groupId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, message: "그룹이 성공적으로 삭제되었습니다." };
  } catch (error) {
    return { success: false, error: "그룹 삭제 중 오류가 발생했습니다." };
  }
}

/**
 * 그룹에 멤버 추가
 * @param groupId 그룹 ID
 * @param userId 사용자 ID
 * @param role 역할
 * @returns 추가 결과
 */
export async function addGroupMember(
  groupId: string,
  userId: string,
  role: UserRole
): Promise<APIResponse<GroupMember>> {
  try {
    const { data, error } = await supabase
      .from("group_members")
      .insert({
        group_id: groupId,
        user_id: userId,
        role,
        invited_at: new Date().toISOString(),
        accepted_at: new Date().toISOString(), // 직접 추가 시 바로 수락 상태
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "멤버 추가 중 오류가 발생했습니다." };
  }
}

/**
 * 그룹 멤버 역할 변경
 * @param groupId 그룹 ID
 * @param userId 사용자 ID
 * @param newRole 새 역할
 * @returns 변경 결과
 */
export async function updateGroupMemberRole(
  groupId: string,
  userId: string,
  newRole: UserRole
): Promise<APIResponse<GroupMember>> {
  try {
    const { data, error } = await supabase
      .from("group_members")
      .update({ role: newRole })
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "멤버 역할 변경 중 오류가 발생했습니다." };
  }
}

/**
 * 그룹에서 멤버 제거
 * @param groupId 그룹 ID
 * @param userId 사용자 ID
 * @returns 제거 결과
 */
export async function removeGroupMember(groupId: string, userId: string): Promise<APIResponse> {
  try {
    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, message: "멤버가 성공적으로 제거되었습니다." };
  } catch (error) {
    return { success: false, error: "멤버 제거 중 오류가 발생했습니다." };
  }
}

/**
 * 그룹 멤버 목록 조회
 * @param groupId 그룹 ID
 * @param role 역할 필터 (선택)
 * @returns 멤버 목록
 */
export async function getGroupMembers(
  groupId: string,
  role?: UserRole
): Promise<APIResponse<Array<GroupMember & { users: User }>>> {
  try {
    let query = supabase
      .from("group_members")
      .select(
        `
        *,
        users (
          id,
          name,
          email,
          phone,
          birth_date,
          created_at
        )
      `
      )
      .eq("group_id", groupId)
      .not("accepted_at", "is", null);

    if (role) {
      query = query.eq("role", role);
    }

    const { data, error } = await query.order("accepted_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "멤버 목록 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 사용자가 소유한 그룹 목록 조회
 * @param ownerId 소유자 ID
 * @returns 소유 그룹 목록
 */
export async function getOwnedGroups(ownerId: string): Promise<APIResponse<Group[]>> {
  try {
    const { data, error } = await supabase
      .from("groups")
      .select("*")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "소유 그룹 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 그룹 통계 조회
 * @param groupId 그룹 ID
 * @returns 그룹 통계 정보
 */
export async function getGroupStatistics(groupId: string): Promise<APIResponse<GroupStatistics>> {
  try {
    // 멤버 수 통계
    const { data: memberStats, error: memberError } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", groupId)
      .not("accepted_at", "is", null);

    if (memberError) {
      return { success: false, error: memberError.message };
    }

    const memberCounts = memberStats.reduce((acc, member) => {
      acc[member.role as UserRole] = (acc[member.role as UserRole] || 0) + 1;
      return acc;
    }, {} as Record<UserRole, number>);

    // 반 수 통계
    const { count: classCount, error: classError } = await supabase
      .from("classes")
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId);

    if (classError) {
      return { success: false, error: classError.message };
    }

    // 폼 수 통계
    const { count: formCount, error: formError } = await supabase
      .from("form_templates")
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId);

    if (formError) {
      return { success: false, error: formError.message };
    }

    // 폼 완료 통계
    const { data: formInstances, error: instanceError } = await supabase
      .from("form_instances")
      .select("status")
      .eq("group_id", groupId);

    if (instanceError) {
      return { success: false, error: instanceError.message };
    }

    const completedForms = formInstances.filter(
      (instance) => instance.status === "final_completed"
    ).length;

    const pendingForms = formInstances.filter(
      (instance) => instance.status !== "final_completed"
    ).length;

    const statistics: GroupStatistics = {
      total_students: memberCounts.student || 0,
      total_teachers: memberCounts.teacher || 0,
      total_part_time: memberCounts.part_time || 0,
      total_classes: classCount || 0,
      total_forms: formCount || 0,
      completed_forms: completedForms,
      pending_forms: pendingForms,
      completion_rate:
        formInstances.length > 0 ? Math.round((completedForms / formInstances.length) * 100) : 0,
    };

    return { success: true, data: statistics };
  } catch (error) {
    return { success: false, error: "통계 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 그룹 검색
 * @param filters 검색 필터
 * @param page 페이지 번호
 * @param limit 페이지 크기
 * @returns 검색 결과
 */
export async function searchGroups(
  filters: SearchFilters,
  page: number = 1,
  limit: number = 10
): Promise<PaginatedResponse<Group[]>> {
  try {
    let query = supabase.from("groups").select("*", { count: "exact" });

    // 검색어 필터
    if (filters.query) {
      query = query.or(`name.ilike.%${filters.query}%,description.ilike.%${filters.query}%`);
    }

    // 날짜 필터
    if (filters.date_from) {
      query = query.gte("created_at", filters.date_from);
    }
    if (filters.date_to) {
      query = query.lte("created_at", filters.date_to);
    }

    // 페이지네이션
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query
      .range(from, to)
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
      },
    };
  } catch (error) {
    return { success: false, error: "그룹 검색 중 오류가 발생했습니다." };
  }
}

/**
 * 사용자가 멤버로 속한 그룹 목록 조회
 * @param userId 사용자 ID
 * @returns 멤버 그룹 목록
 */
export async function getUserMemberGroups(userId: string): Promise<
  APIResponse<
    Array<{
      group: Group;
      role: UserRole;
      joined_at: string;
    }>
  >
> {
  try {
    const { data, error } = await supabase
      .from("group_members")
      .select(
        `
        role,
        accepted_at,
        groups (
          id,
          name,
          description,
          created_at,
          updated_at,
          owner_id
        )
      `
      )
      .eq("user_id", userId)
      .not("accepted_at", "is", null)
      .order("accepted_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    const groups = data.map((item) => ({
      group: item.groups,
      role: item.role as UserRole,
      joined_at: item.accepted_at!,
    }));

    return { success: true, data: groups };
  } catch (error) {
    return { success: false, error: "멤버 그룹 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 그룹 내 역할별 사용자 수 조회
 * @param groupId 그룹 ID
 * @returns 역할별 사용자 수
 */
export async function getGroupMemberCounts(
  groupId: string
): Promise<APIResponse<Record<UserRole, number>>> {
  try {
    const { data, error } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", groupId)
      .not("accepted_at", "is", null);

    if (error) {
      return { success: false, error: error.message };
    }

    const counts = data.reduce((acc, member) => {
      const role = member.role as UserRole;
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {} as Record<UserRole, number>);

    // 모든 역할에 대해 기본값 0 설정
    const result: Record<UserRole, number> = {
      admin: counts.admin || 0,
      teacher: counts.teacher || 0,
      part_time: counts.part_time || 0,
      student: counts.student || 0,
    };

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: "멤버 수 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 그룹 소유권 이전
 * @param groupId 그룹 ID
 * @param newOwnerId 새 소유자 ID
 * @param currentOwnerId 현재 소유자 ID (검증용)
 * @returns 이전 결과
 */
export async function transferGroupOwnership(
  groupId: string,
  newOwnerId: string,
  currentOwnerId: string
): Promise<APIResponse<Group>> {
  try {
    // 현재 소유자 검증
    const { data: currentGroup, error: groupError } = await supabase
      .from("groups")
      .select("owner_id")
      .eq("id", groupId)
      .single();

    if (groupError || currentGroup.owner_id !== currentOwnerId) {
      return { success: false, error: "소유권 이전 권한이 없습니다." };
    }

    // 새 소유자가 그룹 멤버인지 확인
    const { data: memberCheck, error: memberError } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", groupId)
      .eq("user_id", newOwnerId)
      .not("accepted_at", "is", null)
      .single();

    if (memberError || !memberCheck) {
      return { success: false, error: "새 소유자는 그룹 멤버여야 합니다." };
    }

    // 소유권 이전
    const { data, error } = await supabase
      .from("groups")
      .update({
        owner_id: newOwnerId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", groupId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // 새 소유자를 관리자로 변경
    await updateGroupMemberRole(groupId, newOwnerId, "admin");

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "소유권 이전 중 오류가 발생했습니다." };
  }
}
