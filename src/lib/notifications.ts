import { supabaseAdmin } from "./supabase";
import { Database } from "./types/types";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

// API 응답 타입 정의
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 사용자의 모든 알림 조회
 */
export const getUserNotifications = async (
  userId: string
): Promise<ApiResponse<Notification[]>> => {
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

    return { success: true, data: notifications || [] };
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
): Promise<ApiResponse> => {
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
export const markAllNotificationsAsRead = async (userId: string): Promise<ApiResponse> => {
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
): Promise<ApiResponse> => {
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
export const cleanupExpiredNotifications = async (userId: string): Promise<ApiResponse> => {
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
