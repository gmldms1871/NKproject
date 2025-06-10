// lib/invitations.ts
// 초대 관리 관련 함수들 - 초대 전송, 수락/거절, 만료 처리 등

import { supabase } from "./supabase";
import type {
  Invitation,
  InvitationInsert,
  InvitationUpdate,
  InvitationWithDetails,
  APIResponse,
  InvitationStatus,
  UserRole,
  CreateInvitationData,
  User,
  Group,
} from "./types";

/**
 * 새 초대 생성 및 전송
 * @param invitationData 초대 정보
 * @param inviterId 초대자 ID
 * @returns 생성된 초대 정보
 */
export async function createInvitation(
  invitationData: CreateInvitationData,
  inviterId: string
): Promise<APIResponse<Invitation>> {
  try {
    // 이메일로 사용자 확인
    const { data: existingUser, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", invitationData.email)
      .maybeSingle();

    if (userError) {
      return { success: false, error: userError.message };
    }

    if (!existingUser) {
      return {
        success: false,
        error: "해당 이메일의 사용자를 찾을 수 없습니다. 먼저 회원가입이 필요합니다.",
      };
    }

    // 이미 그룹 멤버인지 확인
    const { data: existingMember, error: memberError } = await supabase
      .from("group_members")
      .select("id")
      .eq("group_id", invitationData.group_id)
      .eq("user_id", existingUser.id)
      .maybeSingle();

    if (memberError) {
      return { success: false, error: memberError.message };
    }

    if (existingMember) {
      return { success: false, error: "이미 해당 그룹의 멤버입니다." };
    }

    // 기존 대기 중인 초대가 있는지 확인
    const { data: existingInvitation, error: invitationError } = await supabase
      .from("invitations")
      .select("id, status")
      .eq("group_id", invitationData.group_id)
      .eq("email", invitationData.email)
      .eq("status", "pending")
      .maybeSingle();

    if (invitationError) {
      return { success: false, error: invitationError.message };
    }

    if (existingInvitation) {
      return { success: false, error: "이미 대기 중인 초대가 있습니다." };
    }

    // 만료일 설정 (1일 후)
    const expiresAt =
      invitationData.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // 초대 생성
    const { data, error } = await supabase
      .from("invitations")
      .insert({
        group_id: invitationData.group_id,
        inviter_id: inviterId,
        invitee_id: existingUser.id,
        email: invitationData.email,
        role: invitationData.role,
        status: "pending",
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // 초대 알림 전송
    // TODO: 알림 전송 로직 구현

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "초대 생성 중 오류가 발생했습니다." };
  }
}

/**
 * 초대 조회 (상세 정보 포함)
 * @param invitationId 초대 ID
 * @returns 초대 정보
 */
export async function getInvitation(
  invitationId: string
): Promise<APIResponse<InvitationWithDetails>> {
  try {
    const { data, error } = await supabase
      .from("invitations")
      .select(
        `
        *,
        group:groups (
          id,
          name,
          description,
          owner_id
        ),
        inviter:users!invitations_inviter_id_fkey (
          id,
          name,
          email
        ),
        invitee:users!invitations_invitee_id_fkey (
          id,
          name,
          email
        )
      `
      )
      .eq("id", invitationId)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "초대 정보 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 초대 수락
 * @param invitationId 초대 ID
 * @param inviteeId 초대받은 사용자 ID
 * @returns 수락 결과
 */
export async function acceptInvitation(
  invitationId: string,
  inviteeId: string
): Promise<APIResponse<{ invitation: Invitation; membership: any }>> {
  try {
    // 초대 정보 조회 및 검증
    const invitationResult = await getInvitation(invitationId);
    if (!invitationResult.success || !invitationResult.data) {
      return { success: false, error: "초대를 찾을 수 없습니다." };
    }

    const invitation = invitationResult.data;

    // 권한 검증
    if (invitation.invitee_id !== inviteeId) {
      return { success: false, error: "초대를 수락할 권한이 없습니다." };
    }

    // 상태 및 만료 검증
    if (invitation.status !== "pending") {
      return { success: false, error: "이미 처리된 초대입니다." };
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return { success: false, error: "만료된 초대입니다." };
    }

    // 초대 수락 처리
    const { data: updatedInvitation, error: updateError } = await supabase
      .from("invitations")
      .update({
        status: "accepted",
        responded_at: new Date().toISOString(),
      })
      .eq("id", invitationId)
      .select()
      .single();

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // 그룹 멤버로 추가
    const { data: membership, error: memberError } = await supabase
      .from("group_members")
      .insert({
        group_id: invitation.group_id,
        user_id: inviteeId,
        role: invitation.role,
        invited_at: invitation.created_at,
        accepted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (memberError) {
      // 초대 상태 되돌리기
      await supabase
        .from("invitations")
        .update({
          status: "pending",
          responded_at: null,
        })
        .eq("id", invitationId);

      return { success: false, error: memberError.message };
    }

    return {
      success: true,
      data: { invitation: updatedInvitation, membership },
      message: "초대가 성공적으로 수락되었습니다.",
    };
  } catch (error) {
    return { success: false, error: "초대 수락 중 오류가 발생했습니다." };
  }
}

/**
 * 초대 거절
 * @param invitationId 초대 ID
 * @param inviteeId 초대받은 사용자 ID
 * @returns 거절 결과
 */
export async function rejectInvitation(
  invitationId: string,
  inviteeId: string
): Promise<APIResponse<Invitation>> {
  try {
    // 초대 정보 조회 및 검증
    const invitationResult = await getInvitation(invitationId);
    if (!invitationResult.success || !invitationResult.data) {
      return { success: false, error: "초대를 찾을 수 없습니다." };
    }

    const invitation = invitationResult.data;

    // 권한 검증
    if (invitation.invitee_id !== inviteeId) {
      return { success: false, error: "초대를 거절할 권한이 없습니다." };
    }

    // 상태 검증
    if (invitation.status !== "pending") {
      return { success: false, error: "이미 처리된 초대입니다." };
    }

    // 초대 거절 처리
    const { data, error } = await supabase
      .from("invitations")
      .update({
        status: "rejected",
        responded_at: new Date().toISOString(),
      })
      .eq("id", invitationId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data,
      message: "초대가 거절되었습니다.",
    };
  } catch (error) {
    return { success: false, error: "초대 거절 중 오류가 발생했습니다." };
  }
}

/**
 * 초대 취소
 * @param invitationId 초대 ID
 * @param inviterId 초대자 ID
 * @returns 취소 결과
 */
export async function cancelInvitation(
  invitationId: string,
  inviterId: string
): Promise<APIResponse> {
  try {
    // 초대 정보 조회 및 검증
    const invitationResult = await getInvitation(invitationId);
    if (!invitationResult.success || !invitationResult.data) {
      return { success: false, error: "초대를 찾을 수 없습니다." };
    }

    const invitation = invitationResult.data;

    // 권한 검증 (초대자 또는 그룹 관리자만)
    if (invitation.inviter_id !== inviterId && invitation.group.owner_id !== inviterId) {
      return { success: false, error: "초대를 취소할 권한이 없습니다." };
    }

    // 상태 검증
    if (invitation.status !== "pending") {
      return { success: false, error: "대기 중인 초대만 취소할 수 있습니다." };
    }

    // 초대 삭제
    const { error } = await supabase.from("invitations").delete().eq("id", invitationId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, message: "초대가 취소되었습니다." };
  } catch (error) {
    return { success: false, error: "초대 취소 중 오류가 발생했습니다." };
  }
}

/**
 * 사용자가 받은 초대 목록 조회
 * @param userId 사용자 ID
 * @param status 상태 필터 (선택)
 * @returns 받은 초대 목록
 */
export async function getUserInvitations(
  userId: string,
  status?: InvitationStatus
): Promise<APIResponse<InvitationWithDetails[]>> {
  try {
    let query = supabase
      .from("invitations")
      .select(
        `
        *,
        group:groups (
          id,
          name,
          description,
          owner_id
        ),
        inviter:users!invitations_inviter_id_fkey (
          id,
          name,
          email
        )
      `
      )
      .eq("invitee_id", userId);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "사용자 초대 목록 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 그룹의 모든 초대 조회
 * @param groupId 그룹 ID
 * @param status 상태 필터 (선택)
 * @returns 그룹 초대 목록
 */
export async function getGroupInvitations(
  groupId: string,
  status?: InvitationStatus
): Promise<APIResponse<InvitationWithDetails[]>> {
  try {
    let query = supabase
      .from("invitations")
      .select(
        `
        *,
        inviter:users!invitations_inviter_id_fkey (
          id,
          name,
          email
        ),
        invitee:users!invitations_invitee_id_fkey (
          id,
          name,
          email
        )
      `
      )
      .eq("group_id", groupId);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "그룹 초대 목록 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 초대자가 보낸 초대 목록 조회
 * @param inviterId 초대자 ID
 * @param status 상태 필터 (선택)
 * @returns 보낸 초대 목록
 */
export async function getSentInvitations(
  inviterId: string,
  status?: InvitationStatus
): Promise<APIResponse<InvitationWithDetails[]>> {
  try {
    let query = supabase
      .from("invitations")
      .select(
        `
        *,
        group:groups (
          id,
          name,
          description
        ),
        invitee:users!invitations_invitee_id_fkey (
          id,
          name,
          email
        )
      `
      )
      .eq("inviter_id", inviterId);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "보낸 초대 목록 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 만료된 초대 처리 (배치 작업)
 * @returns 처리된 초대 수
 */
export async function expireOldInvitations(): Promise<APIResponse<{ count: number }>> {
  try {
    const { data, error } = await supabase
      .from("invitations")
      .update({ status: "expired" })
      .eq("status", "pending")
      .lt("expires_at", new Date().toISOString())
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: { count: data.length },
      message: `${data.length}개의 만료된 초대가 처리되었습니다.`,
    };
  } catch (error) {
    return { success: false, error: "만료된 초대 처리 중 오류가 발생했습니다." };
  }
}

/**
 * 이메일로 초대 조회 (토큰 기반 처리용)
 * @param email 이메일 주소
 * @param groupId 그룹 ID
 * @returns 초대 정보
 */
export async function getInvitationByEmail(
  email: string,
  groupId: string
): Promise<APIResponse<InvitationWithDetails | null>> {
  try {
    const { data, error } = await supabase
      .from("invitations")
      .select(
        `
        *,
        group:groups (
          id,
          name,
          description,
          owner_id
        ),
        inviter:users!invitations_inviter_id_fkey (
          id,
          name,
          email
        )
      `
      )
      .eq("email", email)
      .eq("group_id", groupId)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "초대 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 대량 초대 전송
 * @param groupId 그룹 ID
 * @param emails 이메일 배열
 * @param role 역할
 * @param inviterId 초대자 ID
 * @returns 전송 결과
 */
export async function sendBulkInvitations(
  groupId: string,
  emails: string[],
  role: UserRole,
  inviterId: string
): Promise<
  APIResponse<{
    successful: string[];
    failed: Array<{ email: string; error: string }>;
  }>
> {
  try {
    const successful: string[] = [];
    const failed: Array<{ email: string; error: string }> = [];

    for (const email of emails) {
      const result = await createInvitation({ group_id: groupId, email, role }, inviterId);

      if (result.success) {
        successful.push(email);
      } else {
        failed.push({ email, error: result.error || "알 수 없는 오류" });
      }
    }

    return {
      success: true,
      data: { successful, failed },
      message: `${successful.length}개의 초대가 전송되었습니다. ${failed.length}개 실패.`,
    };
  } catch (error) {
    return { success: false, error: "대량 초대 전송 중 오류가 발생했습니다." };
  }
}

/**
 * 초대 재전송
 * @param invitationId 초대 ID
 * @param inviterId 초대자 ID
 * @returns 재전송 결과
 */
export async function resendInvitation(
  invitationId: string,
  inviterId: string
): Promise<APIResponse<Invitation>> {
  try {
    // 초대 정보 조회 및 검증
    const invitationResult = await getInvitation(invitationId);
    if (!invitationResult.success || !invitationResult.data) {
      return { success: false, error: "초대를 찾을 수 없습니다." };
    }

    const invitation = invitationResult.data;

    // 권한 검증
    if (invitation.inviter_id !== inviterId) {
      return { success: false, error: "초대를 재전송할 권한이 없습니다." };
    }

    // 상태 검증
    if (invitation.status !== "pending") {
      return { success: false, error: "대기 중인 초대만 재전송할 수 있습니다." };
    }

    // 만료일 연장 (1일 후)
    const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("invitations")
      .update({
        expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invitationId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // 재전송 알림
    // TODO: 알림 전송 로직 구현

    return {
      success: true,
      data,
      message: "초대가 재전송되었습니다.",
    };
  } catch (error) {
    return { success: false, error: "초대 재전송 중 오류가 발생했습니다." };
  }
}

/**
 * 초대 통계 조회
 * @param groupId 그룹 ID
 * @returns 초대 통계
 */
export async function getInvitationStatistics(groupId: string): Promise<
  APIResponse<{
    total_invitations: number;
    pending: number;
    accepted: number;
    rejected: number;
    expired: number;
    acceptance_rate: number;
  }>
> {
  try {
    const { data, error } = await supabase
      .from("invitations")
      .select("status")
      .eq("group_id", groupId);

    if (error) {
      return { success: false, error: error.message };
    }

    const total = data.length;
    const statusCounts = data.reduce((acc, invitation) => {
      acc[invitation.status] = (acc[invitation.status] || 0) + 1;
      return acc;
    }, {} as Record<InvitationStatus, number>);

    const accepted = statusCounts.accepted || 0;
    const responded = accepted + (statusCounts.rejected || 0);
    const acceptanceRate = responded > 0 ? Math.round((accepted / responded) * 100) : 0;

    const statistics = {
      total_invitations: total,
      pending: statusCounts.pending || 0,
      accepted,
      rejected: statusCounts.rejected || 0,
      expired: statusCounts.expired || 0,
      acceptance_rate: acceptanceRate,
    };

    return { success: true, data: statistics };
  } catch (error) {
    return { success: false, error: "초대 통계 조회 중 오류가 발생했습니다." };
  }
}
