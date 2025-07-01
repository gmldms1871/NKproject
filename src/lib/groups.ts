import { supabase, supabaseAdmin } from "./supabase";
import { Database } from "./types/types";

type Group = Database["public"]["Tables"]["groups"]["Row"];
type GroupInsert = Database["public"]["Tables"]["groups"]["Insert"];
type GroupUpdate = Database["public"]["Tables"]["groups"]["Update"];
type GroupMember = Database["public"]["Tables"]["group_member"]["Row"];
type GroupRole = Database["public"]["Tables"]["group_roles"]["Row"];
type GroupRoleInsert = Database["public"]["Tables"]["group_roles"]["Insert"];
type GroupRoleUpdate = Database["public"]["Tables"]["group_roles"]["Update"];
type Invitation = Database["public"]["Tables"]["invitations"]["Row"];
type Notification = Database["public"]["Tables"]["notifications"]["Row"];

// API 응답 타입 정의
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// 그룹 생성 요청 타입
export interface CreateGroupRequest {
  name: string;
  description?: string;
  image_url?: string;
}

// 그룹 수정 요청 타입
export interface UpdateGroupRequest {
  name?: string;
  description?: string;
  image_url?: string;
}

// 그룹 초대 요청 타입
export interface InviteToGroupRequest {
  groupId: string;
  inviteeEmail?: string;
  inviteePhone?: string;
  roleId: string;
  inviterId: string;
}

// 역할 생성/수정 요청 타입
export interface CreateRoleRequest {
  groupId: string;
  name: string;
  can_invite?: boolean;
  can_manage_roles?: boolean;
  can_create_form?: boolean;
  can_delete_form?: boolean;
}

export interface UpdateRoleRequest {
  name?: string;
  can_invite?: boolean;
  can_manage_roles?: boolean;
  can_create_form?: boolean;
  can_delete_form?: boolean;
}

// 멤버 역할 변경 요청 타입
export interface UpdateMemberRoleRequest {
  memberId: string;
  newRoleId: string;
}

/**
 * 그룹 생성
 * 이름 중복 검사, owner 역할 및 기본 역할 자동 생성, 생성자를 owner로 추가
 */
export const createGroup = async (
  userId: string,
  groupData: CreateGroupRequest
): Promise<ApiResponse<Group>> => {
  try {
    if (!groupData.name || groupData.name.trim() === "") {
      return { success: false, error: "그룹 이름을 입력해주세요." };
    }

    // 그룹 이름 중복 검사
    const { data: existingGroup } = await supabase
      .from("groups")
      .select("id")
      .eq("name", groupData.name.trim())
      .single();

    if (existingGroup) {
      return { success: false, error: "이미 존재하는 그룹 이름입니다." };
    }

    // 그룹 생성
    const { data: newGroup, error: groupError } = await supabase
      .from("groups")
      .insert({
        name: groupData.name.trim(),
        description: groupData.description || null,
        image_url: groupData.image_url || null,
        owner_id: userId,
      })
      .select()
      .single();

    if (groupError || !newGroup) {
      return { success: false, error: "그룹 생성에 실패했습니다." };
    }

    // Owner 역할 생성 (모든 권한 true)
    const { data: ownerRole, error: ownerRoleError } = await supabase
      .from("group_roles")
      .insert({
        group_id: newGroup.id,
        name: "owner",
        can_invite: true,
        can_manage_roles: true,
        can_create_form: true,
        can_delete_form: true,
      })
      .select()
      .single();

    if (ownerRoleError || !ownerRole) {
      // 그룹 생성 롤백
      await supabase.from("groups").delete().eq("id", newGroup.id);
      return { success: false, error: "Owner 역할 생성에 실패했습니다." };
    }

    // 기본 역할 생성 (모든 권한 false)
    const { error: defaultRoleError } = await supabase.from("group_roles").insert({
      group_id: newGroup.id,
      name: "member",
      can_invite: false,
      can_manage_roles: false,
      can_create_form: false,
      can_delete_form: false,
    });

    if (defaultRoleError) {
      // 그룹 및 owner 역할 롤백
      await supabase.from("group_roles").delete().eq("id", ownerRole.id);
      await supabase.from("groups").delete().eq("id", newGroup.id);
      return { success: false, error: "기본 역할 생성에 실패했습니다." };
    }

    // 생성자를 그룹 멤버로 추가 (owner 역할)
    const { error: memberError } = await supabase.from("group_member").insert({
      user_id: userId,
      group_id: newGroup.id,
      group_role_id: ownerRole.id,
    });

    if (memberError) {
      // 모든 것 롤백
      await supabase.from("group_roles").delete().eq("group_id", newGroup.id);
      await supabase.from("groups").delete().eq("id", newGroup.id);
      return { success: false, error: "그룹 멤버 추가에 실패했습니다." };
    }

    return { success: true, data: newGroup };
  } catch (error) {
    console.error("Create group error:", error);
    return { success: false, error: "그룹 생성 중 오류가 발생했습니다." };
  }
};

/**
 * 내가 속한 그룹 조회
 */
export const getMyGroups = async (userId: string): Promise<ApiResponse<Group[]>> => {
  try {
    const { data: groups, error } = await supabase
      .from("group_member")
      .select(
        `
        groups (*)
      `
      )
      .eq("user_id", userId);

    if (error) {
      return { success: false, error: "그룹 조회에 실패했습니다." };
    }

    const groupList = groups?.map((item) => item.groups).filter(Boolean) as Group[];
    return { success: true, data: groupList || [] };
  } catch (error) {
    console.error("Get my groups error:", error);
    return { success: false, error: "그룹 조회 중 오류가 발생했습니다." };
  }
};

/**
 * 내가 만든 그룹 조회
 */
export const getMyCreatedGroups = async (userId: string): Promise<ApiResponse<Group[]>> => {
  try {
    const { data: groups, error } = await supabase
      .from("groups")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: "생성한 그룹 조회에 실패했습니다." };
    }

    return { success: true, data: groups || [] };
  } catch (error) {
    console.error("Get my created groups error:", error);
    return { success: false, error: "생성한 그룹 조회 중 오류가 발생했습니다." };
  }
};

/**
 * 그룹 정보 수정
 */
export const updateGroup = async (
  groupId: string,
  userId: string,
  updateData: UpdateGroupRequest
): Promise<ApiResponse<Group>> => {
  try {
    // 권한 확인 (owner만 가능)
    const { data: group } = await supabase
      .from("groups")
      .select("owner_id")
      .eq("id", groupId)
      .single();

    if (!group || group.owner_id !== userId) {
      return { success: false, error: "그룹 수정 권한이 없습니다." };
    }

    // 이름 변경 시 중복 검사
    if (updateData.name) {
      const { data: existingGroup } = await supabase
        .from("groups")
        .select("id")
        .eq("name", updateData.name.trim())
        .neq("id", groupId)
        .single();

      if (existingGroup) {
        return { success: false, error: "이미 존재하는 그룹 이름입니다." };
      }
    }

    const { data: updatedGroup, error } = await supabase
      .from("groups")
      .update({
        name: updateData.name?.trim(),
        description: updateData.description,
        image_url: updateData.image_url,
      })
      .eq("id", groupId)
      .select()
      .single();

    if (error) {
      return { success: false, error: "그룹 정보 수정에 실패했습니다." };
    }

    return { success: true, data: updatedGroup };
  } catch (error) {
    console.error("Update group error:", error);
    return { success: false, error: "그룹 정보 수정 중 오류가 발생했습니다." };
  }
};

/**
 * 그룹 삭제
 */
export const deleteGroup = async (groupId: string, userId: string): Promise<ApiResponse> => {
  try {
    // 권한 확인 (owner만 가능)
    const { data: group } = await supabase
      .from("groups")
      .select("owner_id")
      .eq("id", groupId)
      .single();

    if (!group || group.owner_id !== userId) {
      return { success: false, error: "그룹 삭제 권한이 없습니다." };
    }

    // 관련 데이터 삭제 (cascade)
    const { error } = await supabase.from("groups").delete().eq("id", groupId);

    if (error) {
      return { success: false, error: "그룹 삭제에 실패했습니다." };
    }

    return { success: true };
  } catch (error) {
    console.error("Delete group error:", error);
    return { success: false, error: "그룹 삭제 중 오류가 발생했습니다." };
  }
};

/**
 * 그룹 나가기
 */
export const leaveGroup = async (groupId: string, userId: string): Promise<ApiResponse> => {
  try {
    // Owner는 나갈 수 없음
    const { data: group } = await supabase
      .from("groups")
      .select("owner_id")
      .eq("id", groupId)
      .single();

    if (group?.owner_id === userId) {
      return {
        success: false,
        error: "그룹 소유자는 그룹을 나갈 수 없습니다. 소유권을 이전하거나 그룹을 삭제하세요.",
      };
    }

    const { error } = await supabase
      .from("group_member")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", userId);

    if (error) {
      return { success: false, error: "그룹 나가기에 실패했습니다." };
    }

    return { success: true };
  } catch (error) {
    console.error("Leave group error:", error);
    return { success: false, error: "그룹 나가기 중 오류가 발생했습니다." };
  }
};

/**
 * 그룹 소유권 이전
 */
export const transferGroupOwnership = async (
  groupId: string,
  currentOwnerId: string,
  newOwnerId: string
): Promise<ApiResponse> => {
  try {
    // 현재 소유자인지 확인
    const { data: group } = await supabase
      .from("groups")
      .select("owner_id")
      .eq("id", groupId)
      .single();

    if (!group || group.owner_id !== currentOwnerId) {
      return { success: false, error: "그룹 소유권 이전 권한이 없습니다." };
    }

    // 새 소유자가 그룹 멤버인지 확인
    const { data: newOwnerMember } = await supabase
      .from("group_member")
      .select("*")
      .eq("group_id", groupId)
      .eq("user_id", newOwnerId)
      .single();

    if (!newOwnerMember) {
      return { success: false, error: "새 소유자가 그룹 멤버가 아닙니다." };
    }

    // 역할 조회
    const { data: roles } = await supabase.from("group_roles").select("*").eq("group_id", groupId);

    const ownerRole = roles?.find((role) => role.name === "owner");
    const memberRole = roles?.find((role) => role.name === "member");

    if (!ownerRole || !memberRole) {
      return { success: false, error: "필수 역할을 찾을 수 없습니다." };
    }

    // 트랜잭션: 소유권 이전
    // 1. 그룹 소유자 변경
    const { error: groupError } = await supabase
      .from("groups")
      .update({ owner_id: newOwnerId })
      .eq("id", groupId);

    if (groupError) {
      return { success: false, error: "소유권 이전에 실패했습니다." };
    }

    // 2. 새 소유자 역할을 owner로 변경
    const { error: newOwnerError } = await supabase
      .from("group_member")
      .update({ group_role_id: ownerRole.id })
      .eq("group_id", groupId)
      .eq("user_id", newOwnerId);

    if (newOwnerError) {
      // 롤백
      await supabase.from("groups").update({ owner_id: currentOwnerId }).eq("id", groupId);
      return { success: false, error: "새 소유자 역할 변경에 실패했습니다." };
    }

    // 3. 기존 소유자 역할을 member로 변경
    const { error: oldOwnerError } = await supabase
      .from("group_member")
      .update({ group_role_id: memberRole.id })
      .eq("group_id", groupId)
      .eq("user_id", currentOwnerId);

    if (oldOwnerError) {
      // 롤백
      await supabase
        .from("group_member")
        .update({ group_role_id: ownerRole.id })
        .eq("group_id", groupId)
        .eq("user_id", newOwnerId);
      await supabase.from("groups").update({ owner_id: currentOwnerId }).eq("id", groupId);
      return { success: false, error: "기존 소유자 역할 변경에 실패했습니다." };
    }

    return { success: true };
  } catch (error) {
    console.error("Transfer ownership error:", error);
    return { success: false, error: "소유권 이전 중 오류가 발생했습니다." };
  }
};

/**
 * 그룹 초대
 */
export const inviteToGroup = async (inviteData: InviteToGroupRequest): Promise<ApiResponse> => {
  try {
    if (!inviteData.inviteeEmail && !inviteData.inviteePhone) {
      return { success: false, error: "초대할 이메일 또는 전화번호를 입력해주세요." };
    }

    // 초대권한 확인
    const { data: member } = await supabase
      .from("group_member")
      .select(
        `
        group_roles (can_invite)
      `
      )
      .eq("group_id", inviteData.groupId)
      .eq("user_id", inviteData.inviterId)
      .single();

    if (!member?.group_roles?.can_invite) {
      return { success: false, error: "그룹 초대 권한이 없습니다." };
    }

    // 그룹 정보 조회
    const { data: group } = await supabase
      .from("groups")
      .select("name, description")
      .eq("id", inviteData.groupId)
      .single();

    if (!group) {
      return { success: false, error: "그룹을 찾을 수 없습니다." };
    }

    // 초대자 정보 조회
    const { data: inviter } = await supabase
      .from("users")
      .select("nickname")
      .eq("id", inviteData.inviterId)
      .single();

    // 초대 생성
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7일 후 만료

    const { data: invitation, error: inviteError } = await supabase
      .from("invitations")
      .insert({
        group_id: inviteData.groupId,
        inviter_id: inviteData.inviterId,
        invitee_email: inviteData.inviteeEmail || null,
        invitee_phone: inviteData.inviteePhone || null,
        group_roles_id: inviteData.roleId,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (inviteError || !invitation) {
      return { success: false, error: "초대 생성에 실패했습니다." };
    }

    // 초대받을 사용자 찾기
    let query = supabase.from("users").select("id, nickname");

    if (inviteData.inviteeEmail) {
      query = query.eq("email", inviteData.inviteeEmail);
    } else if (inviteData.inviteePhone) {
      query = query.eq("phone", inviteData.inviteePhone);
    }

    const { data: invitee } = await query.single();

    // 사용자가 존재하면 알림 생성
    if (invitee) {
      await supabase.from("notifications").insert({
        target_id: invitee.id,
        creator_id: inviteData.inviterId,
        group_id: inviteData.groupId,
        related_id: invitation.id,
        type: "그룹 초대",
        title: `${group.name}에서 ${inviter?.nickname || "사용자"}님을 초대합니다!`,
        content: group.description || "그룹에 참여해보세요.",
        action_url: `/invitations/${invitation.id}`,
        is_read: false,
      });
    }

    return { success: true, data: invitation };
  } catch (error) {
    console.error("Invite to group error:", error);
    return { success: false, error: "그룹 초대 중 오류가 발생했습니다." };
  }
};

/**
 * 그룹 초대 수락
 */
export const acceptGroupInvitation = async (
  invitationId: string,
  userId: string
): Promise<ApiResponse> => {
  try {
    // 초대 정보 조회
    const { data: invitation } = await supabase
      .from("invitations")
      .select("*")
      .eq("id", invitationId)
      .single();

    if (!invitation) {
      return { success: false, error: "초대를 찾을 수 없습니다." };
    }

    // 만료 확인
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return { success: false, error: "만료된 초대입니다." };
    }

    // 이미 그룹 멤버인지 확인
    if (!invitation.group_id) {
      return { success: false, error: "초대의 그룹 정보가 올바르지 않습니다." };
    }

    const { data: existingMember } = await supabase
      .from("group_member")
      .select("id")
      .eq("group_id", invitation.group_id)
      .eq("user_id", userId)
      .single();

    if (existingMember) {
      return { success: false, error: "이미 그룹 멤버입니다." };
    }

    // 그룹 멤버로 추가
    if (!invitation.group_roles_id) {
      return { success: false, error: "초대의 역할 정보가 올바르지 않습니다." };
    }

    const { error } = await supabase.from("group_member").insert({
      user_id: userId,
      group_id: invitation.group_id,
      group_role_id: invitation.group_roles_id,
    });

    if (error) {
      return { success: false, error: "그룹 가입에 실패했습니다." };
    }

    // 초대 삭제
    await supabase.from("invitations").delete().eq("id", invitationId);

    // 관련 알림을 읽음 처리
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("related_id", invitationId)
      .eq("target_id", userId);

    return { success: true };
  } catch (error) {
    console.error("Accept invitation error:", error);
    return { success: false, error: "초대 수락 중 오류가 발생했습니다." };
  }
};

/**
 * 그룹 초대 거절
 */
export const rejectGroupInvitation = async (
  invitationId: string,
  userId: string
): Promise<ApiResponse> => {
  try {
    // 초대 삭제
    const { error } = await supabase.from("invitations").delete().eq("id", invitationId);

    if (error) {
      return { success: false, error: "초대 거절에 실패했습니다." };
    }

    // 관련 알림을 읽음 처리
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("related_id", invitationId)
      .eq("target_id", userId);

    return { success: true };
  } catch (error) {
    console.error("Reject invitation error:", error);
    return { success: false, error: "초대 거절 중 오류가 발생했습니다." };
  }
};

/**
 * 받은 그룹 초대 조회
 */
export const getReceivedInvitations = async (userId: string): Promise<ApiResponse<any[]>> => {
  try {
    const { data: user } = await supabase
      .from("users")
      .select("email, phone")
      .eq("id", userId)
      .single();

    if (!user) {
      return { success: false, error: "사용자 정보를 찾을 수 없습니다." };
    }

    // 이메일 또는 전화번호로 받은 초대
    const conditions: string[] = [];

    if (user.email) {
      conditions.push(`invitee_email.eq.${user.email}`);
    }

    if (user.phone) {
      conditions.push(`invitee_phone.eq.${user.phone}`);
    }

    if (conditions.length === 0) {
      return { success: false, error: "이메일 또는 전화번호가 등록되지 않았습니다." };
    }

    const { data: invitations, error } = await supabase
      .from("invitations")
      .select(
        `
        *,
        groups (name, description, image_url),
        group_roles (name),
        users!invitations_inviter_id_fkey (nickname)
      `
      )
      .or(conditions.join(","))
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: "초대 조회에 실패했습니다." };
    }

    return { success: true, data: invitations || [] };
  } catch (error) {
    console.error("Get received invitations error:", error);
    return { success: false, error: "초대 조회 중 오류가 발생했습니다." };
  }
};

/**
 * 역할 생성
 */
export const createGroupRole = async (
  userId: string,
  roleData: CreateRoleRequest
): Promise<ApiResponse<GroupRole>> => {
  try {
    // 권한 확인 (can_manage_roles)
    const { data: member } = await supabase
      .from("group_member")
      .select(
        `
        group_roles (can_manage_roles)
      `
      )
      .eq("group_id", roleData.groupId)
      .eq("user_id", userId)
      .single();

    if (!member?.group_roles?.can_manage_roles) {
      return { success: false, error: "역할 관리 권한이 없습니다." };
    }

    // 역할명 중복 확인
    const { data: existingRole } = await supabase
      .from("group_roles")
      .select("id")
      .eq("group_id", roleData.groupId)
      .eq("name", roleData.name)
      .single();

    if (existingRole) {
      return { success: false, error: "이미 존재하는 역할명입니다." };
    }

    const { data: newRole, error } = await supabase
      .from("group_roles")
      .insert({
        group_id: roleData.groupId,
        name: roleData.name,
        can_invite: roleData.can_invite || false,
        can_manage_roles: roleData.can_manage_roles || false,
        can_create_form: roleData.can_create_form || false,
        can_delete_form: roleData.can_delete_form || false,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: "역할 생성에 실패했습니다." };
    }

    return { success: true, data: newRole };
  } catch (error) {
    console.error("Create role error:", error);
    return { success: false, error: "역할 생성 중 오류가 발생했습니다." };
  }
};

/**
 * 역할 수정
 */
export const updateGroupRole = async (
  roleId: string,
  userId: string,
  updateData: UpdateRoleRequest
): Promise<ApiResponse<GroupRole>> => {
  try {
    // 역할 정보 조회
    const { data: role } = await supabase
      .from("group_roles")
      .select("group_id, name")
      .eq("id", roleId)
      .single();

    if (!role || !role.group_id) {
      return { success: false, error: "역할을 찾을 수 없습니다." };
    }

    // 기본 역할 수정 방지
    if (role.name === "owner" || role.name === "member") {
      return { success: false, error: "기본 역할은 수정할 수 없습니다." };
    }

    // 권한 확인
    const { data: member } = await supabase
      .from("group_member")
      .select(
        `
        group_roles (can_manage_roles)
      `
      )
      .eq("group_id", role.group_id)
      .eq("user_id", userId)
      .single();

    if (!member?.group_roles?.can_manage_roles) {
      return { success: false, error: "역할 관리 권한이 없습니다." };
    }

    const { data: updatedRole, error } = await supabase
      .from("group_roles")
      .update(updateData)
      .eq("id", roleId)
      .select()
      .single();

    if (error) {
      return { success: false, error: "역할 수정에 실패했습니다." };
    }

    return { success: true, data: updatedRole };
  } catch (error) {
    console.error("Update role error:", error);
    return { success: false, error: "역할 수정 중 오류가 발생했습니다." };
  }
};

/**
 * 역할 삭제
 */
export const deleteGroupRole = async (roleId: string, userId: string): Promise<ApiResponse> => {
  try {
    // 역할 정보 조회
    const { data: role } = await supabase
      .from("group_roles")
      .select("group_id, name")
      .eq("id", roleId)
      .single();

    if (!role || !role.group_id) {
      return { success: false, error: "역할을 찾을 수 없습니다." };
    }

    // 기본 역할 삭제 방지
    if (role.name === "owner" || role.name === "member") {
      return { success: false, error: "기본 역할은 삭제할 수 없습니다." };
    }

    // 권한 확인
    const { data: member } = await supabase
      .from("group_member")
      .select(
        `
        group_roles (can_manage_roles)
      `
      )
      .eq("group_id", role.group_id)
      .eq("user_id", userId)
      .single();

    if (!member?.group_roles?.can_manage_roles) {
      return { success: false, error: "역할 관리 권한이 없습니다." };
    }

    // 해당 역할을 사용하는 멤버가 있는지 확인
    const { data: members } = await supabase
      .from("group_member")
      .select("id")
      .eq("group_role_id", roleId);

    if (members && members.length > 0) {
      return { success: false, error: "해당 역할을 사용하는 멤버가 있어 삭제할 수 없습니다." };
    }

    const { error } = await supabase.from("group_roles").delete().eq("id", roleId);

    if (error) {
      return { success: false, error: "역할 삭제에 실패했습니다." };
    }

    return { success: true };
  } catch (error) {
    console.error("Delete role error:", error);
    return { success: false, error: "역할 삭제 중 오류가 발생했습니다." };
  }
};

/**
 * 멤버 역할 변경
 */
export const updateMemberRole = async (
  groupId: string,
  updateData: UpdateMemberRoleRequest,
  userId: string
): Promise<ApiResponse> => {
  try {
    // 권한 확인
    const { data: member } = await supabase
      .from("group_member")
      .select(
        `
        group_roles (can_manage_roles)
      `
      )
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .single();

    if (!member?.group_roles?.can_manage_roles) {
      return { success: false, error: "역할 관리 권한이 없습니다." };
    }

    const { error } = await supabase
      .from("group_member")
      .update({ group_role_id: updateData.newRoleId })
      .eq("id", updateData.memberId);

    if (error) {
      return { success: false, error: "멤버 역할 변경에 실패했습니다." };
    }

    return { success: true };
  } catch (error) {
    console.error("Update member role error:", error);
    return { success: false, error: "멤버 역할 변경 중 오류가 발생했습니다." };
  }
};

/**
 * 그룹 멤버 조회
 */
export const getGroupMembers = async (
  groupId: string,
  userId: string
): Promise<ApiResponse<any[]>> => {
  try {
    // 그룹 멤버인지 확인
    const { data: memberCheck } = await supabase
      .from("group_member")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .single();

    if (!memberCheck) {
      return { success: false, error: "그룹 멤버만 조회할 수 있습니다." };
    }

    const { data: members, error } = await supabase
      .from("group_member")
      .select(
        `
        *,
        users (id, name, nickname, email),
        group_roles (id, name, can_invite, can_manage_roles, can_create_form, can_delete_form)
      `
      )
      .eq("group_id", groupId)
      .order("joined_at", { ascending: true });

    if (error) {
      return { success: false, error: "멤버 조회에 실패했습니다." };
    }

    return { success: true, data: members || [] };
  } catch (error) {
    console.error("Get group members error:", error);
    return { success: false, error: "멤버 조회 중 오류가 발생했습니다." };
  }
};

/**
 * 그룹 역할 조회
 */
export const getGroupRoles = async (
  groupId: string,
  userId: string
): Promise<ApiResponse<GroupRole[]>> => {
  try {
    // 그룹 멤버인지 확인
    const { data: memberCheck } = await supabase
      .from("group_member")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .single();

    if (!memberCheck) {
      return { success: false, error: "그룹 멤버만 조회할 수 있습니다." };
    }

    const { data: roles, error } = await supabase
      .from("group_roles")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true });

    if (error) {
      return { success: false, error: "역할 조회에 실패했습니다." };
    }

    return { success: true, data: roles || [] };
  } catch (error) {
    console.error("Get group roles error:", error);
    return { success: false, error: "역할 조회 중 오류가 발생했습니다." };
  }
};
