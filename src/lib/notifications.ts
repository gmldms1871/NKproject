import { supabaseAdmin } from "./supabase";
import { Database } from "./types/types";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];
type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"];
type NotificationUpdate = Database["public"]["Tables"]["notifications"]["Update"];

// API 응답 타입 정의
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// 알림 상세 정보 타입 (조인된 정보 포함)
export interface NotificationWithDetails {
  id: string;
  target_id: string | null;
  creator_id: string | null;
  group_id: string | null;
  related_id: string;
  type: string | null;
  title: string | null;
  content: string | null;
  action_url: string | null;
  is_read: boolean | null;
  created_at: string | null;
  expires_at: string | null;
  users: {
    nickname: string;
  } | null;
  groups: {
    name: string;
  } | null;
}

/**
 * 사용자의 모든 알림 조회
 */
export const getUserNotifications = async (
  userId: string
): Promise<ApiResponse<NotificationWithDetails[]>> => {
  try {
    const { data: notifications, error } = await supabaseAdmin
      .from("notifications")
      .select(
        `
        *,
        users!notifications_creator_id_fkey (nickname),
        groups (name)
      `
      )
      .eq("target_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get notifications error:", error);
      return { success: false, error: "알림 조회에 실패했습니다." };
    }

    return {
      success: true,
      data:
        notifications?.map((n) => ({
          ...n,
          groups: n.groups ? { name: n.groups.name ?? "" } : null,
        })) || [],
    };
  } catch (error) {
    console.error("Get notifications error:", error);
    return { success: false, error: "알림 조회 중 오류가 발생했습니다." };
  }
};

/**
 * 읽지 않은 알림 개수 조회
 */
export const getUnreadNotificationCount = async (userId: string): Promise<ApiResponse<number>> => {
  try {
    const { count, error } = await supabaseAdmin
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("target_id", userId)
      .eq("is_read", false);

    if (error) {
      console.error("Get unread count error:", error);
      return { success: false, error: "알림 개수 조회에 실패했습니다." };
    }

    return { success: true, data: count || 0 };
  } catch (error) {
    console.error("Get unread count error:", error);
    return { success: false, error: "알림 개수 조회 중 오류가 발생했습니다." };
  }
};

/**
 * 알림을 읽음으로 표시
 */
export const markNotificationAsRead = async (
  notificationId: string,
  userId: string
): Promise<ApiResponse<void>> => {
  try {
    const { error } = await supabaseAdmin
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("target_id", userId);

    if (error) {
      console.error("Mark as read error:", error);
      return { success: false, error: "알림 읽음 처리에 실패했습니다." };
    }

    return { success: true };
  } catch (error) {
    console.error("Mark as read error:", error);
    return { success: false, error: "알림 읽음 처리 중 오류가 발생했습니다." };
  }
};

/**
 * 모든 알림을 읽음으로 표시
 */
export const markAllNotificationsAsRead = async (userId: string): Promise<ApiResponse<void>> => {
  try {
    const { error } = await supabaseAdmin
      .from("notifications")
      .update({ is_read: true })
      .eq("target_id", userId)
      .eq("is_read", false);

    if (error) {
      console.error("Mark all as read error:", error);
      return { success: false, error: "전체 알림 읽음 처리에 실패했습니다." };
    }

    return { success: true };
  } catch (error) {
    console.error("Mark all as read error:", error);
    return { success: false, error: "전체 알림 읽음 처리 중 오류가 발생했습니다." };
  }
};

/**
 * 알림 삭제
 */
export const deleteNotification = async (
  notificationId: string,
  userId: string
): Promise<ApiResponse<void>> => {
  try {
    const { error } = await supabaseAdmin
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .eq("target_id", userId);

    if (error) {
      console.error("Delete notification error:", error);
      return { success: false, error: "알림 삭제에 실패했습니다." };
    }

    return { success: true };
  } catch (error) {
    console.error("Delete notification error:", error);
    return { success: false, error: "알림 삭제 중 오류가 발생했습니다." };
  }
};

/**
 * 만료된 알림 정리
 */
export const cleanupExpiredNotifications = async (userId: string): Promise<ApiResponse<void>> => {
  try {
    const { error } = await supabaseAdmin
      .from("notifications")
      .delete()
      .eq("target_id", userId)
      .lt("expires_at", new Date().toISOString());

    if (error) {
      console.error("Cleanup expired notifications error:", error);
      return { success: false, error: "만료된 알림 정리에 실패했습니다." };
    }

    return { success: true };
  } catch (error) {
    console.error("Cleanup expired notifications error:", error);
    return { success: false, error: "만료된 알림 정리 중 오류가 발생했습니다." };
  }
};

/**
 * 알림 생성
 */
export const createNotification = async (
  notificationData: NotificationInsert
): Promise<ApiResponse<Notification>> => {
  try {
    const { data: notification, error } = await supabaseAdmin
      .from("notifications")
      .insert(notificationData)
      .select()
      .single();

    if (error) {
      console.error("Create notification error:", error);
      return { success: false, error: "알림 생성에 실패했습니다." };
    }

    return { success: true, data: notification };
  } catch (error) {
    console.error("Create notification error:", error);
    return { success: false, error: "알림 생성 중 오류가 발생했습니다." };
  }
};

/**
 * 특정 조건의 알림들 일괄 삭제
 */
export const deleteBulkNotifications = async (
  userId: string,
  conditions: {
    type?: string;
    groupId?: string;
    relatedId?: string;
    creatorId?: string;
  }
): Promise<ApiResponse<void>> => {
  try {
    let query = supabaseAdmin.from("notifications").delete().eq("target_id", userId);

    if (conditions.type) {
      query = query.eq("type", conditions.type);
    }

    if (conditions.groupId) {
      query = query.eq("group_id", conditions.groupId);
    }

    if (conditions.relatedId) {
      query = query.eq("related_id", conditions.relatedId);
    }

    if (conditions.creatorId) {
      query = query.eq("creator_id", conditions.creatorId);
    }

    const { error } = await query;

    if (error) {
      console.error("Delete bulk notifications error:", error);
      return { success: false, error: "알림 일괄 삭제에 실패했습니다." };
    }

    return { success: true };
  } catch (error) {
    console.error("Delete bulk notifications error:", error);
    return { success: false, error: "알림 일괄 삭제 중 오류가 발생했습니다." };
  }
};

/**
 * 알림 수정
 */
export const updateNotification = async (
  notificationId: string,
  userId: string,
  updateData: Partial<NotificationUpdate>
): Promise<ApiResponse<Notification>> => {
  try {
    const { data: notification, error } = await supabaseAdmin
      .from("notifications")
      .update(updateData)
      .eq("id", notificationId)
      .eq("target_id", userId)
      .select()
      .single();

    if (error) {
      console.error("Update notification error:", error);
      return { success: false, error: "알림 수정에 실패했습니다." };
    }

    return { success: true, data: notification };
  } catch (error) {
    console.error("Update notification error:", error);
    return { success: false, error: "알림 수정 중 오류가 발생했습니다." };
  }
};

/**
 * 특정 그룹의 알림들 조회
 */
export const getGroupNotifications = async (
  userId: string,
  groupId: string
): Promise<ApiResponse<NotificationWithDetails[]>> => {
  try {
    const { data: notifications, error } = await supabaseAdmin
      .from("notifications")
      .select(
        `
        *,
        users!notifications_creator_id_fkey (nickname),
        groups (name)
      `
      )
      .eq("target_id", userId)
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get group notifications error:", error);
      return { success: false, error: "그룹 알림 조회에 실패했습니다." };
    }

    return {
      success: true,
      data:
        notifications?.map((n) => ({
          ...n,
          groups: n.groups ? { name: n.groups.name ?? "" } : null,
        })) || [],
    };
  } catch (error) {
    console.error("Get group notifications error:", error);
    return { success: false, error: "그룹 알림 조회 중 오류가 발생했습니다." };
  }
};

/**
 * 특정 타입의 알림들 조회
 */
export const getNotificationsByType = async (
  userId: string,
  type: string
): Promise<ApiResponse<NotificationWithDetails[]>> => {
  try {
    const { data: notifications, error } = await supabaseAdmin
      .from("notifications")
      .select(
        `
        *,
        users!notifications_creator_id_fkey (nickname),
        groups (name)
      `
      )
      .eq("target_id", userId)
      .eq("type", type)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get notifications by type error:", error);
      return { success: false, error: "타입별 알림 조회에 실패했습니다." };
    }

    return {
      success: true,
      data:
        notifications?.map((n) => ({
          ...n,
          groups: n.groups ? { name: n.groups.name ?? "" } : null,
        })) || [],
    };
  } catch (error) {
    console.error("Get notifications by type error:", error);
    return { success: false, error: "타입별 알림 조회 중 오류가 발생했습니다." };
  }
};
