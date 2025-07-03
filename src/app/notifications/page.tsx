"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Empty, Badge, Space, Avatar, Popconfirm, Tabs, Spin, message } from "antd";
import {
  BellOutlined,
  TeamOutlined,
  DeleteOutlined,
  CheckOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  MailOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/contexts/auth-context";
import { usePageHeader } from "@/contexts/page-header-context";
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadNotificationCount,
} from "@/lib/notifications";
import { useCallback } from "react";

interface Notification {
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

export default function NotificationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { setPageHeader } = usePageHeader();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const result = await getUserNotifications(user.id);

      if (result.success) {
        setNotifications(
          (result.data || []).map((notif: any) => ({
            users: null,
            groups: null,
            ...notif,
          }))
        );
      } else {
        message.error(result.error || "알림을 불러오는데 실패했습니다.");
      }
    } catch (error) {
      message.error("알림을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadUnreadCount = useCallback(async () => {
    if (!user) return;

    try {
      const result = await getUnreadNotificationCount(user.id);
      if (result.success) {
        setUnreadCount(result.data || 0);
      }
    } catch (error) {
      console.error("읽지 않은 알림 개수 조회 실패:", error);
    }
  }, [user]);

  const handleMarkAllAsRead = useCallback(async () => {
    if (!user) return;

    try {
      const result = await markAllNotificationsAsRead(user.id);

      if (result.success) {
        setNotifications((prev) => prev.map((notif) => ({ ...notif, is_read: true })));
        setUnreadCount(0);
        message.success("모든 알림을 읽음으로 처리했습니다.");
      } else {
        message.error(result.error || "전체 읽음 처리에 실패했습니다.");
      }
    } catch (error) {
      message.error("전체 읽음 처리 중 오류가 발생했습니다.");
    }
  }, [user]);

  // 페이지 헤더 설정
  useEffect(() => {
    setPageHeader({
      title: "알림",
      subtitle: "받은 알림을 확인하고 관리하세요",
      actions:
        unreadCount > 0 ? (
          <Button type="primary" icon={<CheckOutlined />} onClick={handleMarkAllAsRead}>
            모두 읽음
          </Button>
        ) : undefined,
    });

    return () => setPageHeader(null);
  }, [handleMarkAllAsRead, setPageHeader, unreadCount]);

  useEffect(() => {
    if (!user) {
      router.push("/auth");
      return;
    }
    loadNotifications();
    loadUnreadCount();
  }, [user, router, loadNotifications, loadUnreadCount]);

  const handleMarkAsRead = async (notificationId: string) => {
    if (!user) return;

    try {
      const result = await markNotificationAsRead(notificationId, user.id);

      if (result.success) {
        setNotifications((prev) =>
          prev.map((notif) => (notif.id === notificationId ? { ...notif, is_read: true } : notif))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        message.success("알림을 읽음으로 처리했습니다.");
      } else {
        message.error(result.error || "알림 읽음 처리에 실패했습니다.");
      }
    } catch (error) {
      message.error("알림 읽음 처리 중 오류가 발생했습니다.");
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    if (!user) return;

    try {
      const result = await deleteNotification(notificationId, user.id);

      if (result.success) {
        setNotifications((prev) => prev.filter((notif) => notif.id !== notificationId));
        message.success("알림이 삭제되었습니다.");
      } else {
        message.error(result.error || "알림 삭제에 실패했습니다.");
      }
    } catch (error) {
      message.error("알림 삭제 중 오류가 발생했습니다.");
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // 읽지 않은 알림이면 읽음으로 표시
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id);
    }

    // 액션 URL이 있으면 이동
    if (notification.action_url) {
      router.push(notification.action_url);
    }
  };

  const getNotificationIcon = (type: string | null) => {
    switch (type) {
      case "그룹 초대":
        return <TeamOutlined style={{ color: "#1890ff" }} />;
      case "초대":
        return <MailOutlined style={{ color: "#52c41a" }} />;
      case "시스템":
        return <BellOutlined style={{ color: "#faad14" }} />;
      default:
        return <BellOutlined style={{ color: "#1890ff" }} />;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "알 수 없음";

    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "방금 전";
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;

    return date.toLocaleDateString("ko-KR");
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const NotificationCard = ({ notification }: { notification: Notification }) => {
    const expired = isExpired(notification.expires_at);
    const unread = !notification.is_read;

    return (
      <Card
        hoverable={!expired}
        className={`
          ${expired ? "opacity-60" : ""}
          ${unread ? "border-l-4 border-l-blue-500 bg-blue-50" : ""}
          transition-all duration-200
        `}
        size="small"
      >
        <div className="flex items-start justify-between">
          <div
            className="flex items-start space-x-3 flex-1 cursor-pointer"
            onClick={() => handleNotificationClick(notification)}
          >
            <Avatar size={40} icon={getNotificationIcon(notification.type)} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h4
                  className={`text-sm font-medium truncate ${
                    unread ? "text-gray-900" : "text-gray-600"
                  }`}
                >
                  {notification.title || "알림"}
                </h4>
                {unread && <Badge dot />}
                {notification.type && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    {notification.type}
                  </span>
                )}
              </div>

              <p className={`text-xs mt-1 ${unread ? "text-gray-700" : "text-gray-500"}`}>
                {notification.content || "내용 없음"}
              </p>

              <div className="flex items-center space-x-2 mt-2">
                {notification.groups && (
                  <span className="text-xs text-blue-600">그룹: {notification.groups.name}</span>
                )}
                {notification.users && (
                  <span className="text-xs text-gray-500">from {notification.users.nickname}</span>
                )}
              </div>

              <div className="flex items-center space-x-2 mt-1">
                <ClockCircleOutlined className="text-xs text-gray-400" />
                <span className="text-xs text-gray-400">{formatDate(notification.created_at)}</span>
                {expired && <span className="text-xs text-red-500">(만료됨)</span>}
              </div>
            </div>
          </div>

          <div className="flex-shrink-0">
            <Space direction="vertical" size="small">
              {unread && (
                <Button
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkAsRead(notification.id);
                  }}
                >
                  읽음
                </Button>
              )}
              <Popconfirm
                title="이 알림을 삭제하시겠습니까?"
                onConfirm={(e) => {
                  e?.stopPropagation();
                  handleDeleteNotification(notification.id);
                }}
                onCancel={(e) => e?.stopPropagation()}
              >
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={(e) => e.stopPropagation()}
                >
                  삭제
                </Button>
              </Popconfirm>
            </Space>
          </div>
        </div>
      </Card>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8">
        <Card>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">로그인이 필요합니다</h2>
            <Button type="primary" onClick={() => router.push("/auth")}>
              로그인 하러 가기
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const unreadNotifications = notifications.filter((n) => !n.is_read);
  const readNotifications = notifications.filter((n) => n.is_read);

  const tabItems = [
    {
      key: "unread",
      label: (
        <Space>
          <Badge count={unreadNotifications.length} showZero={false}>
            <BellOutlined />
          </Badge>
          읽지 않음 ({unreadNotifications.length})
        </Space>
      ),
      children: (
        <div className="space-y-3">
          {unreadNotifications.length > 0 ? (
            unreadNotifications.map((notification) => (
              <NotificationCard key={notification.id} notification={notification} />
            ))
          ) : (
            <Empty description="읽지 않은 알림이 없습니다." image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </div>
      ),
    },
    {
      key: "read",
      label: (
        <Space>
          <CheckOutlined />
          읽음 ({readNotifications.length})
        </Space>
      ),
      children: (
        <div className="space-y-3">
          {readNotifications.length > 0 ? (
            readNotifications.map((notification) => (
              <NotificationCard key={notification.id} notification={notification} />
            ))
          ) : (
            <Empty description="읽은 알림이 없습니다." image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </div>
      ),
    },
    {
      key: "all",
      label: (
        <Space>
          <BellOutlined />
          전체 ({notifications.length})
        </Space>
      ),
      children: (
        <div className="space-y-3">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <NotificationCard key={notification.id} notification={notification} />
            ))
          ) : (
            <Empty description="알림이 없습니다." image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="text-center py-12">
            <Spin size="large" />
            <p className="mt-4 text-gray-600">알림을 불러오는 중...</p>
          </div>
        ) : (
          <Tabs defaultActiveKey="unread" items={tabItems} />
        )}
      </div>
    </div>
  );
}
