// lib/users.ts
// 사용자 관리 관련 함수들 - 회원가입, 로그인, 프로필 관리, 그룹 멤버십 등

import { supabase } from "./supabase";
import type {
  User,
  UserInsert,
  UserUpdate,
  UserWithGroups,
  APIResponse,
  UserRole,
  AuthUser,
  UserSession,
} from "./types";

/**
 * 현재 로그인된 사용자 정보 조회
 * @returns 현재 사용자 정보 또는 null
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: userData, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("사용자 정보 조회 오류:", error);
      return null;
    }

    return userData;
  } catch (error) {
    console.error("getCurrentUser 오류:", error);
    return null;
  }
}

/**
 * 사용자 정보를 그룹 멤버십과 함께 조회
 * @param userId 사용자 ID
 * @returns 그룹 정보가 포함된 사용자 데이터
 */
export async function getUserWithGroups(userId: string): Promise<APIResponse<UserWithGroups>> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select(
        `
        *,
        group_members (
          id,
          role,
          invited_at,
          accepted_at,
          groups (
            id,
            name,
            description,
            created_at,
            owner_id
          )
        )
      `
      )
      .eq("id", userId)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "사용자 정보 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 사용자 세션 정보 구성 (현재 그룹 포함)
 * @param userId 사용자 ID
 * @param currentGroupId 현재 선택된 그룹 ID
 * @returns 완전한 사용자 세션 정보
 */
export async function getUserSession(
  userId: string,
  currentGroupId?: string
): Promise<APIResponse<UserSession>> {
  try {
    const userResult = await getUserWithGroups(userId);
    if (!userResult.success || !userResult.data) {
      return { success: false, error: "사용자 정보를 찾을 수 없습니다." };
    }

    const user = userResult.data;
    const groups = user.group_members
      .filter((membership) => membership.accepted_at)
      .map((membership) => ({
        ...membership.groups,
        group_members: [],
      }));

    let currentGroup = null;
    let userRole: UserRole | undefined = undefined;

    if (currentGroupId) {
      const membership = user.group_members.find(
        (m) => m.groups.id === currentGroupId && m.accepted_at
      );
      if (membership) {
        currentGroup = membership.groups;
        userRole = membership.role as UserRole;
      }
    }

    const permissions = userRole ? await getUserPermissions(userRole) : [];

    const session: UserSession = {
      user: {
        id: user.id,
        email: user.email,
        role: userRole,
        current_group_id: currentGroupId,
      },
      groups,
      current_group: currentGroup,
      permissions,
    };

    return { success: true, data: session };
  } catch (error) {
    return { success: false, error: "세션 정보 구성 중 오류가 발생했습니다." };
  }
}

/**
 * 사용자 프로필 업데이트
 * @param userId 사용자 ID
 * @param updates 업데이트할 필드들
 * @returns 업데이트 결과
 */
export async function updateUserProfile(
  userId: string,
  updates: UserUpdate
): Promise<APIResponse<User>> {
  try {
    // 이메일 변경 방지
    const { email, ...allowedUpdates } = updates;

    const { data, error } = await supabase
      .from("users")
      .update({
        ...allowedUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "프로필 업데이트 중 오류가 발생했습니다." };
  }
}

/**
 * 사용자 회원가입 (Supabase Auth와 연동)
 * @param email 이메일
 * @param password 비밀번호
 * @param userData 추가 사용자 정보
 * @returns 회원가입 결과
 */
export async function signUpUser(
  email: string,
  password: string,
  userData: Omit<UserInsert, "id" | "email" | "created_at" | "updated_at">
): Promise<APIResponse<{ user: User; needsVerification: boolean }>> {
  try {
    // Supabase Auth로 회원가입
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: userData.name,
        },
      },
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: "회원가입에 실패했습니다." };
    }

    // users 테이블에 추가 정보 저장
    const { data: user, error: userError } = await supabase
      .from("users")
      .insert({
        id: authData.user.id,
        email,
        ...userData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (userError) {
      // Auth 사용자 삭제 (실제로는 어려우므로 로그만 남김)
      console.error("사용자 프로필 생성 실패:", userError);
      return { success: false, error: "사용자 프로필 생성에 실패했습니다." };
    }

    return {
      success: true,
      data: {
        user,
        needsVerification: !authData.session,
      },
    };
  } catch (error) {
    return { success: false, error: "회원가입 중 오류가 발생했습니다." };
  }
}

/**
 * 사용자 로그인
 * @param email 이메일
 * @param password 비밀번호
 * @returns 로그인 결과
 */
export async function signInUser(email: string, password: string): Promise<APIResponse<User>> {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: "로그인에 실패했습니다." };
    }

    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "사용자 정보를 찾을 수 없습니다." };
    }

    return { success: true, data: user };
  } catch (error) {
    return { success: false, error: "로그인 중 오류가 발생했습니다." };
  }
}

/**
 * 사용자 로그아웃
 * @returns 로그아웃 결과
 */
export async function signOutUser(): Promise<APIResponse> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: "로그아웃 중 오류가 발생했습니다." };
  }
}

/**
 * 비밀번호 재설정 이메일 발송
 * @param email 이메일 주소
 * @returns 발송 결과
 */
export async function sendPasswordReset(email: string): Promise<APIResponse> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, message: "비밀번호 재설정 이메일이 발송되었습니다." };
  } catch (error) {
    return { success: false, error: "이메일 발송 중 오류가 발생했습니다." };
  }
}

/**
 * 비밀번호 업데이트
 * @param newPassword 새 비밀번호
 * @returns 업데이트 결과
 */
export async function updatePassword(newPassword: string): Promise<APIResponse> {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, message: "비밀번호가 성공적으로 변경되었습니다." };
  } catch (error) {
    return { success: false, error: "비밀번호 변경 중 오류가 발생했습니다." };
  }
}

/**
 * 사용자가 특정 그룹에서 가진 역할 조회
 * @param userId 사용자 ID
 * @param groupId 그룹 ID
 * @returns 사용자 역할 또는 null
 */
export async function getUserRoleInGroup(
  userId: string,
  groupId: string
): Promise<UserRole | null> {
  try {
    const { data, error } = await supabase
      .from("group_members")
      .select("role")
      .eq("user_id", userId)
      .eq("group_id", groupId)
      .not("accepted_at", "is", null)
      .single();

    if (error || !data) {
      return null;
    }

    return data.role as UserRole;
  } catch (error) {
    console.error("getUserRoleInGroup 오류:", error);
    return null;
  }
}

/**
 * 역할별 권한 목록 조회
 * @param role 사용자 역할
 * @returns 권한 목록
 */
export async function getUserPermissions(role: UserRole): Promise<string[]> {
  const permissions: Record<UserRole, string[]> = {
    admin: [
      "group.create",
      "group.update",
      "group.delete",
      "group.manage_members",
      "class.create",
      "class.update",
      "class.delete",
      "class.manage_members",
      "form.create",
      "form.update",
      "form.delete",
      "form.send",
      "form.view_all",
      "report.create",
      "report.update",
      "report.view_all",
      "statistics.view_all",
      "notification.send",
      "invitation.send",
    ],
    teacher: [
      "group.view",
      "group.invite_members",
      "class.create",
      "class.update",
      "class.manage_members",
      "form.create",
      "form.update",
      "form.send",
      "form.view_all",
      "report.create",
      "report.update",
      "report.view_all",
      "statistics.view_all",
      "notification.send",
      "invitation.send",
    ],
    part_time: [
      "group.view",
      "class.view_assigned",
      "form.view_assigned",
      "form.respond",
      "report.update_stage1",
      "student.view_assigned",
    ],
    student: [
      "group.view",
      "class.view_own",
      "form.view_assigned",
      "form.respond",
      "notification.view_own",
    ],
  };

  return permissions[role] || [];
}

/**
 * 사용자 권한 확인
 * @param userId 사용자 ID
 * @param groupId 그룹 ID
 * @param permission 확인할 권한
 * @returns 권한 보유 여부
 */
export async function checkUserPermission(
  userId: string,
  groupId: string,
  permission: string
): Promise<boolean> {
  try {
    const role = await getUserRoleInGroup(userId, groupId);
    if (!role) return false;

    const permissions = await getUserPermissions(role);
    return permissions.includes(permission);
  } catch (error) {
    console.error("checkUserPermission 오류:", error);
    return false;
  }
}

/**
 * 사용자별 그룹 목록 조회 (역할 포함)
 * @param userId 사용자 ID
 * @returns 그룹 목록
 */
export async function getUserGroups(userId: string): Promise<
  APIResponse<
    Array<{
      group: any;
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
    return { success: false, error: "그룹 목록 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 이메일 중복 확인
 * @param email 확인할 이메일
 * @returns 중복 여부
 */
export async function checkEmailExists(email: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.from("users").select("id").eq("email", email).single();

    // 데이터가 있으면 중복, 없으면 사용 가능
    return !!data;
  } catch (error) {
    // 에러가 발생하면 안전을 위해 중복으로 간주
    return true;
  }
}

/**
 * 사용자 검색 (그룹 내에서)
 * @param groupId 그룹 ID
 * @param query 검색어
 * @param role 역할 필터 (선택)
 * @returns 검색 결과
 */
export async function searchUsersInGroup(
  groupId: string,
  query: string,
  role?: UserRole
): Promise<APIResponse<User[]>> {
  try {
    let queryBuilder = supabase
      .from("group_members")
      .select(
        `
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
      queryBuilder = queryBuilder.eq("role", role);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      return { success: false, error: error.message };
    }

    // 검색어로 필터링
    const users = data
      .map((item) => item.users)
      .filter(
        (user) =>
          user &&
          (user.name?.toLowerCase().includes(query.toLowerCase()) ||
            user.email.toLowerCase().includes(query.toLowerCase()))
      ) as User[];

    return { success: true, data: users };
  } catch (error) {
    return { success: false, error: "사용자 검색 중 오류가 발생했습니다." };
  }
}
