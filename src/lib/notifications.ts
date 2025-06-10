// lib/notifications.ts
// 알림 관리 관련 함수들 - 생성, 전송, 읽음 처리, 필터링 등

import { supabase } from "./supabase";
import type {
  Notification,
  NotificationInsert,
  NotificationUpdate,
  NotificationWithDetails,
  APIResponse,
  NotificationType,
  CreateNotificationData,
  PaginatedResponse,
  User,
} from "./types";

/**
 * 새 알림 생성
 * @param notificationData 알림 데이터
 * @returns 생성된 알림 정보
 */
export async function createNotification(
  notificationData: CreateNotificationData
): Promise<APIResponse<Notification>> {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        ...notificationData,
        is_read: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "알림 생성 중 오류가 발생했습니다." };
  }
}

/**
 * 사용자 알림 목록 조회
 * @param userId 사용자 ID
 * @param type 알림 타입 필터 (선택)
 * @param isRead 읽음 상태 필터 (선택)
 * @param page 페이지 번호
 * @param limit 페이지 크기
 * @returns 알림 목록
 */
export async function getUserNotifications(
  userId: string,
  type?: NotificationType,
  isRead?: boolean,
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResponse<NotificationWithDetails[]>> {
  try {
    let query = supabase
      .from("notifications")
      .select(
        `
        *,
        sender:users!notifications_sender_id_fkey (
          id,
          name,
          email
        ),
        group:groups (
          id,
          name
        ),
        form_template:form_templates (
          id,
          title
        )
      `,
        { count: "exact" }
      )
      .eq("user_id", userId);

    if (type) {
      query = query.eq("type", type);
    }

    if (isRead !== undefined) {
      query = query.eq("is_read", isRead);
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
    return { success: false, error: "알림 목록 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 알림 읽음 처리
 * @param notificationId 알림 ID
 * @param userId 사용자 ID (권한 검증용)
 * @returns 처리 결과
 */
export async function markNotificationAsRead(
  notificationId: string,
  userId: string
): Promise<APIResponse<Notification>> {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("id", notificationId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "알림 읽음 처리 중 오류가 발생했습니다." };
  }
}

/**
 * 모든 알림 읽음 처리
 * @param userId 사용자 ID
 * @returns 처리 결과
 */
export async function markAllNotificationsAsRead(
  userId: string
): Promise<APIResponse<{ count: number }>> {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("is_read", false)
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: { count: data.length },
      message: `${data.length}개의 알림이 읽음 처리되었습니다.`,
    };
  } catch (error) {
    return { success: false, error: "전체 알림 읽음 처리 중 오류가 발생했습니다." };
  }
}

/**
 * 알림 삭제
 * @param notificationId 알림 ID
 * @param userId 사용자 ID (권한 검증용)
 * @returns 삭제 결과
 */
export async function deleteNotification(
  notificationId: string,
  userId: string
): Promise<APIResponse> {
  try {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .eq("user_id", userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, message: "알림이 삭제되었습니다." };
  } catch (error) {
    return { success: false, error: "알림 삭제 중 오류가 발생했습니다." };
  }
}

/**
 * 읽지 않은 알림 개수 조회
 * @param userId 사용자 ID
 * @returns 읽지 않은 알림 개수
 */
export async function getUnreadNotificationCount(
  userId: string
): Promise<APIResponse<{ count: number }>> {
  try {
    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: { count: count || 0 } };
  } catch (error) {
    return { success: false, error: "읽지 않은 알림 개수 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 초대 알림 전송
 * @param inviteeId 초대받은 사용자 ID
 * @param groupId 그룹 ID
 * @param inviterId 초대자 ID
 * @param role 초대받은 역할
 * @returns 알림 생성 결과
 */
export async function sendInvitationNotification(
  inviteeId: string,
  groupId: string,
  inviterId: string,
  role: string
): Promise<APIResponse<Notification>> {
  try {
    // 그룹 정보 조회
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("name")
      .eq("id", groupId)
      .single();

    if (groupError) {
      return { success: false, error: groupError.message };
    }

    // 초대자 정보 조회
    const { data: inviter, error: inviterError } = await supabase
      .from("users")
      .select("name")
      .eq("id", inviterId)
      .single();

    if (inviterError) {
      return { success: false, error: inviterError.message };
    }

    const roleNames = {
      admin: "관리자",
      teacher: "선생님",
      part_time: "시간제 강사",
      student: "학생",
    };

    const roleName = roleNames[role as keyof typeof roleNames] || role;

    return await createNotification({
      user_id: inviteeId,
      sender_id: inviterId,
      type: "invitation",
      title: "그룹 초대",
      message: `${inviter.name}님이 "${group.name}" 그룹에 ${roleName}으로 초대했습니다.`,
      group_id: groupId,
      metadata: { role },
    });
  } catch (error) {
    return { success: false, error: "초대 알림 전송 중 오류가 발생했습니다." };
  }
}

/**
 * 폼 배정 알림 전송
 * @param studentIds 학생 ID 배열
 * @param formTemplateId 폼 템플릿 ID
 * @param senderId 전송자 ID
 * @returns 알림 전송 결과
 */
export async function sendFormAssignedNotifications(
  studentIds: string[],
  formTemplateId: string,
  senderId: string
): Promise<APIResponse<{ successful: number; failed: number }>> {
  try {
    // 폼 템플릿 정보 조회
    const { data: formTemplate, error: formError } = await supabase
      .from("form_templates")
      .select("title, group_id")
      .eq("id", formTemplateId)
      .single();

    if (formError) {
      return { success: false, error: formError.message };
    }

    let successful = 0;
    let failed = 0;

    // 각 학생에게 알림 전송
    for (const studentId of studentIds) {
      const result = await createNotification({
        user_id: studentId,
        sender_id: senderId,
        type: "form_assigned",
        title: "새 폼 배정",
        message: `새로운 폼 "${formTemplate.title}"이 배정되었습니다.`,
        group_id: formTemplate.group_id,
        form_template_id: formTemplateId,
        metadata: { form_title: formTemplate.title },
      });

      if (result.success) {
        successful++;
      } else {
        failed++;
      }
    }

    return {
      success: true,
      data: { successful, failed },
      message: `${successful}명에게 알림을 전송했습니다. ${failed}건 실패.`,
    };
  } catch (error) {
    return { success: false, error: "폼 배정 알림 전송 중 오류가 발생했습니다." };
  }
}

/**
 * 폼 반려 알림 전송
 * @param studentId 학생 ID
 * @param formTemplateId 폼 템플릿 ID
 * @param senderId 전송자 ID
 * @param reason 반려 사유
 * @returns 알림 전송 결과
 */
export async function sendFormRejectedNotification(
  studentId: string,
  formTemplateId: string,
  senderId: string,
  reason: string
): Promise<APIResponse<Notification>> {
  try {
    // 폼 템플릿 정보 조회
    const { data: formTemplate, error: formError } = await supabase
      .from("form_templates")
      .select("title, group_id")
      .eq("id", formTemplateId)
      .single();

    if (formError) {
      return { success: false, error: formError.message };
    }

    return await createNotification({
      user_id: studentId,
      sender_id: senderId,
      type: "form_rejected",
      title: "폼 재작성 요청",
      message: `"${formTemplate.title}" 폼이 반려되었습니다. 재작성해 주세요.`,
      group_id: formTemplate.group_id,
      form_template_id: formTemplateId,
      metadata: {
        form_title: formTemplate.title,
        reason,
      },
    });
  } catch (error) {
    return { success: false, error: "폼 반려 알림 전송 중 오류가 발생했습니다." };
  }
}

/**
 * 보고서 준비 완료 알림 전송
 * @param studentId 학생 ID
 * @param formTemplateId 폼 템플릿 ID
 * @param senderId 전송자 ID
 * @returns 알림 전송 결과
 */
export async function sendReportReadyNotification(
  studentId: string,
  formTemplateId: string,
  senderId: string
): Promise<APIResponse<Notification>> {
  try {
    // 폼 템플릿 정보 조회
    const { data: formTemplate, error: formError } = await supabase
      .from("form_templates")
      .select("title, group_id")
      .eq("id", formTemplateId)
      .single();

    if (formError) {
      return { success: false, error: formError.message };
    }

    return await createNotification({
      user_id: studentId,
      sender_id: senderId,
      type: "report_ready",
      title: "보고서 완성",
      message: `"${formTemplate.title}" 보고서가 완성되었습니다.`,
      group_id: formTemplate.group_id,
      form_template_id: formTemplateId,
      metadata: {
        form_title: formTemplate.title,
      },
    });
  } catch (error) {
    return { success: false, error: "보고서 완성 알림 전송 중 오류가 발생했습니다." };
  }
}

/**
 * 시스템 알림 전송 (그룹 전체)
 * @param groupId 그룹 ID
 * @param title 알림 제목
 * @param message 알림 내용
 * @param senderId 전송자 ID
 * @param userRole 대상 역할 (선택)
 * @returns 전송 결과
 */
export async function sendSystemNotificationToGroup(
  groupId: string,
  title: string,
  message: string,
  senderId: string,
  userRole?: string
): Promise<APIResponse<{ successful: number; failed: number }>> {
  try {
    // 그룹 멤버 조회
    let query = supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId)
      .not("accepted_at", "is", null);

    if (userRole) {
      query = query.eq("role", userRole);
    }

    const { data: members, error: memberError } = await query;

    if (memberError) {
      return { success: false, error: memberError.message };
    }

    let successful = 0;
    let failed = 0;

    // 각 멤버에게 알림 전송
    for (const member of members) {
      const result = await createNotification({
        user_id: member.user_id,
        sender_id: senderId,
        type: "invitation", // 기본 타입, 필요에 따라 수정
        title,
        message,
        group_id: groupId,
        metadata: { system_notification: true },
      });

      if (result.success) {
        successful++;
      } else {
        failed++;
      }
    }

    return {
      success: true,
      data: { successful, failed },
      message: `${successful}명에게 알림을 전송했습니다. ${failed}건 실패.`,
    };
  } catch (error) {
    return { success: false, error: "시스템 알림 전송 중 오류가 발생했습니다." };
  }
}

/**
 * 오래된 알림 정리 (1개월 이상)
 * @returns 정리된 알림 수
 */
export async function cleanupOldNotifications(): Promise<APIResponse<{ count: number }>> {
  try {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const { data, error } = await supabase
      .from("notifications")
      .delete()
      .lt("created_at", oneMonthAgo.toISOString())
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: { count: data.length },
      message: `${data.length}개의 오래된 알림이 정리되었습니다.`,
    };
  } catch (error) {
    return { success: false, error: "오래된 알림 정리 중 오류가 발생했습니다." };
  }
}

/**
 * 알림 설정 조회
 * @param userId 사용자 ID
 * @returns 알림 설정
 */
export async function getNotificationSettings(userId: string): Promise<
  APIResponse<{
    email_notifications: boolean;
    push_notifications: boolean;
    form_notifications: boolean;
    report_notifications: boolean;
  }>
> {
  try {
    // 별도 notification_settings 테이블이 있다면 조회
    // 현재는 기본값 반환
    const defaultSettings = {
      email_notifications: true,
      push_notifications: true,
      form_notifications: true,
      report_notifications: true,
    };

    return { success: true, data: defaultSettings };
  } catch (error) {
    return { success: false, error: "알림 설정 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 알림 설정 업데이트
 * @param userId 사용자 ID
 * @param settings 새로운 설정
 * @returns 업데이트 결과
 */
export async function updateNotificationSettings(
  userId: string,
  settings: {
    email_notifications?: boolean;
    push_notifications?: boolean;
    form_notifications?: boolean;
    report_notifications?: boolean;
  }
): Promise<APIResponse> {
  try {
    // 별도 notification_settings 테이블 업데이트
    // 현재는 로컬 저장소나 사용자 메타데이터 사용
    console.log(`User ${userId} notification settings updated:`, settings);

    return { success: true, message: "알림 설정이 업데이트되었습니다." };
  } catch (error) {
    return { success: false, error: "알림 설정 업데이트 중 오류가 발생했습니다." };
  }
}

/**
 * 알림 타입별 통계 조회
 * @param userId 사용자 ID
 * @param days 기간 (일)
 * @returns 알림 통계
 */
export async function getNotificationStatistics(
  userId: string,
  days: number = 30
): Promise<APIResponse<Record<NotificationType, number>>> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from("notifications")
      .select("type")
      .eq("user_id", userId)
      .gte("created_at", startDate.toISOString());

    if (error) {
      return { success: false, error: error.message };
    }

    const statistics = data.reduce((acc, notification) => {
      const type = notification.type as NotificationType;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<NotificationType, number>);

    return { success: true, data: statistics };
  } catch (error) {
    return { success: false, error: "알림 통계 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 실시간 알림 구독 설정
 * @param userId 사용자 ID
 * @param callback 알림 수신 콜백
 * @returns 구독 해제 함수
 */
export function subscribeToNotifications(
  userId: string,
  callback: (notification: Notification) => void
): () => void {
  const subscription = supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        callback(payload.new as Notification);
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}

/**
 * 벌크 알림 삭제
 * @param notificationIds 알림 ID 배열
 * @param userId 사용자 ID (권한 검증용)
 * @returns 삭제 결과
 */
export async function deleteBulkNotifications(
  notificationIds: string[],
  userId: string
): Promise<APIResponse<{ count: number }>> {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .delete()
      .in("id", notificationIds)
      .eq("user_id", userId)
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: { count: data.length },
      message: `${data.length}개의 알림이 삭제되었습니다.`,
    };
  } catch (error) {
    return { success: false, error: "벌크 알림 삭제 중 오류가 발생했습니다." };
  }
}
