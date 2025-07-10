"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  Button,
  Empty,
  Badge,
  Space,
  Avatar,
  Popconfirm,
  Tabs,
  Spin,
  message,
  Input,
  Select,
  Form,
  Tag,
} from "antd";
import {
  BellOutlined,
  TeamOutlined,
  DeleteOutlined,
  CheckOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  MailOutlined,
  SearchOutlined,
  FilterOutlined,
  UserOutlined,
  ExclamationCircleOutlined,
  CrownOutlined,
  LogoutOutlined,
  UserAddOutlined,
  UserDeleteOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/contexts/auth-context";
import { usePageHeader } from "@/contexts/page-header-context";
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadNotificationCount,
  getGroupNotifications,
  getNotificationsByType,
  NotificationWithDetails,
} from "@/lib/notifications";
import { getMyGroups } from "@/lib/groups";
import { useCallback } from "react";
import { Group } from "@/lib/supabase";

interface SearchFilterFormValues {
  searchTitle?: string;
  groupId?: string;
  type?: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { setPageHeader } = usePageHeader();
  const [notifications, setNotifications] = useState<NotificationWithDetails[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<NotificationWithDetails[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchFilterVisible, setSearchFilterVisible] = useState(false);

  const [searchForm] = Form.useForm();

  const loadNotifications = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [notificationsResult, groupsResult] = await Promise.all([
        getUserNotifications(user.id),
        getMyGroups(user.id),
      ]);

      if (notificationsResult.success) {
        const notifs = (notificationsResult.data || []).map((notif: NotificationWithDetails) => ({
          ...notif,
        }));
        setNotifications(notifs);
        setFilteredNotifications(notifs);
      } else {
        message.error(notificationsResult.error || "알림을 불러오는데 실패했습니다.");
      }

      if (groupsResult.success) {
        setGroups(groupsResult.data || []);
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

  // 검색 및 필터링
  const handleSearchFilter = async (values: SearchFilterFormValues) => {
    if (!user) return;

    try {
      let result;

      // 그룹별 필터링
      if (values.groupId) {
        result = await getGroupNotifications(user.id, values.groupId);
      }
      // 타입별 필터링
      else if (values.type) {
        result = await getNotificationsByType(user.id, values.type);
      }
      // 전체 조회
      else {
        result = await getUserNotifications(user.id);
      }

      if (result.success) {
        let filteredNotifs = (result.data || []).map((notif: NotificationWithDetails) => ({
          ...notif,
        }));

        // 제목으로 검색
        if (values.searchTitle) {
          filteredNotifs = filteredNotifs.filter(
            (notif) =>
              notif.title?.toLowerCase().includes(values.searchTitle!.toLowerCase()) ||
              notif.content?.toLowerCase().includes(values.searchTitle!.toLowerCase())
          );
        }

        setFilteredNotifications(filteredNotifs);
        message.success(`${filteredNotifs.length}개의 알림을 찾았습니다.`);
      } else {
        message.error(result.error || "알림 검색에 실패했습니다.");
      }
    } catch (error) {
      message.error("알림 검색 중 오류가 발생했습니다.");
    }
  };

  // 검색 초기화
  const handleResetSearch = () => {
    searchForm.resetFields();
    setFilteredNotifications(notifications);
  };

  const handleMarkAllAsRead = useCallback(async () => {
    if (!user) return;

    try {
      const result = await markAllNotificationsAsRead(user.id);

      if (result.success) {
        setNotifications((prev) => prev.map((notif) => ({ ...notif, is_read: true })));
        setFilteredNotifications((prev) => prev.map((notif) => ({ ...notif, is_read: true })));
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
    const expiredNotifications = filteredNotifications.filter((notif) =>
      isExpired(notif.expires_at)
    );

    setPageHeader({
      title: "알림",
      subtitle: `받은 알림을 확인하고 관리하세요 (읽지 않음: ${unreadCount}개, 만료: ${expiredNotifications.length}개)`,
      actions: (
        <Space>
          <Button
            icon={<SearchOutlined />}
            onClick={() => setSearchFilterVisible(!searchFilterVisible)}
          >
            검색/필터
          </Button>
          {unreadCount > 0 && (
            <Button type="primary" icon={<CheckOutlined />} onClick={handleMarkAllAsRead}>
              모두 읽음
            </Button>
          )}
        </Space>
      ),
    });

    return () => setPageHeader(null);
  }, [handleMarkAllAsRead, setPageHeader, unreadCount, searchFilterVisible, filteredNotifications]);

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
        setFilteredNotifications((prev) =>
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
        setFilteredNotifications((prev) => prev.filter((notif) => notif.id !== notificationId));
        message.success("알림이 삭제되었습니다.");
      } else {
        message.error(result.error || "알림 삭제에 실패했습니다.");
      }
    } catch (error) {
      message.error("알림 삭제 중 오류가 발생했습니다.");
    }
  };

  const handleNotificationClick = async (notification: NotificationWithDetails) => {
    // 읽지 않은 알림이면 읽음으로 표시
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id);
    }

    // 액션 URL이 있으면 이동
    if (notification.action_url) {
      router.push(notification.action_url);
    }
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const getNotificationIcon = (type: string | null) => {
    switch (type) {
      case "그룹 초대":
      case "초대":
        return <MailOutlined style={{ color: "#52c41a" }} />;
      case "역할 변경":
        return <CrownOutlined style={{ color: "#faad14" }} />;
      case "반 참여":
        return <UserAddOutlined style={{ color: "#1890ff" }} />;
      case "반 탈퇴":
        return <UserDeleteOutlined style={{ color: "#ff4d4f" }} />;
      case "그룹 탈퇴":
        return <LogoutOutlined style={{ color: "#ff4d4f" }} />;
      case "소유권 이전":
        return <CrownOutlined style={{ color: "#722ed1" }} />;
      case "시스템":
        return <BellOutlined style={{ color: "#faad14" }} />;
      default:
        return <BellOutlined style={{ color: "#1890ff" }} />;
    }
  };

  const getNotificationTypeColor = (type: string | null) => {
    switch (type) {
      case "그룹 초대":
      case "초대":
        return "green";
      case "역할 변경":
      case "소유권 이전":
        return "gold";
      case "반 참여":
        return "blue";
      case "반 탈퇴":
      case "그룹 탈퇴":
        return "red";
      case "시스템":
        return "orange";
      default:
        return "default";
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

  const NotificationCard = ({ notification }: { notification: NotificationWithDetails }) => {
    const expired = isExpired(notification.expires_at);
    const unread = !notification.is_read;

    return (
      <Card
        hoverable={!expired}
        className={`
          ${expired ? "opacity-60 bg-gray-50" : ""}
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
                  <Tag color={getNotificationTypeColor(notification.type)}>{notification.type}</Tag>
                )}
                {expired && (
                  <Tag color="red" icon={<WarningOutlined />}>
                    만료됨
                  </Tag>
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
                {notification.expires_at && (
                  <span className={`text-xs ${expired ? "text-red-500" : "text-gray-400"}`}>
                    • 만료: {formatDate(notification.expires_at)}
                  </span>
                )}
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

  const unreadNotifications = filteredNotifications.filter((n) => !n.is_read);
  const readNotifications = filteredNotifications.filter((n) => n.is_read);
  const expiredNotifications = filteredNotifications.filter((n) => isExpired(n.expires_at));
  const validNotifications = filteredNotifications.filter((n) => !isExpired(n.expires_at));
  const allNotificationTypes = Array.from(
    new Set(notifications.map((n) => n.type).filter(Boolean))
  );

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
      key: "valid",
      label: (
        <Space>
          <CheckOutlined style={{ color: "#52c41a" }} />
          유효한 알림 ({validNotifications.length})
        </Space>
      ),
      children: (
        <div className="space-y-3">
          {validNotifications.length > 0 ? (
            validNotifications.map((notification) => (
              <NotificationCard key={notification.id} notification={notification} />
            ))
          ) : (
            <Empty description="유효한 알림이 없습니다." image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </div>
      ),
    },
    {
      key: "expired",
      label: (
        <Space>
          <ExclamationCircleOutlined style={{ color: "#ff4d4f" }} />
          만료된 알림 ({expiredNotifications.length})
        </Space>
      ),
      children: (
        <div className="space-y-3">
          {expiredNotifications.length > 0 ? (
            expiredNotifications.map((notification) => (
              <NotificationCard key={notification.id} notification={notification} />
            ))
          ) : (
            <Empty description="만료된 알림이 없습니다." image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}

          {expiredNotifications.length > 10 && (
            <Card size="small" className="bg-yellow-50 border-yellow-200">
              <div className="text-sm text-yellow-700">
                💡 <strong>정리 팁:</strong> 만료된 알림이 많이 쌓였습니다. 필요없는 알림들을
                삭제하여 목록을 정리해보세요.
              </div>
            </Card>
          )}
        </div>
      ),
    },
    {
      key: "all",
      label: (
        <Space>
          <BellOutlined />
          전체 ({filteredNotifications.length})
        </Space>
      ),
      children: (
        <div className="space-y-3">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => (
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
        {/* 검색/필터 영역 */}
        {searchFilterVisible && (
          <Card className="mb-6" title="검색 및 필터">
            <Form form={searchForm} layout="vertical" onFinish={handleSearchFilter}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Form.Item name="searchTitle" label="알림 제목/내용 검색">
                  <Input placeholder="검색어를 입력하세요" prefix={<SearchOutlined />} allowClear />
                </Form.Item>

                <Form.Item name="groupId" label="그룹 필터">
                  <Select
                    placeholder="그룹을 선택하세요"
                    allowClear
                    showSearch
                    filterOption={(input, option) =>
                      (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {groups.map((group) => (
                      <Select.Option key={group.id} value={group.id}>
                        {group.name}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item name="type" label="알림 타입 필터">
                  <Select placeholder="알림 타입을 선택하세요" allowClear>
                    {allNotificationTypes.map((type) => (
                      <Select.Option key={type} value={type}>
                        <Tag color={getNotificationTypeColor(type)}>{type}</Tag>
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </div>

              <div className="flex justify-end space-x-2">
                <Button onClick={handleResetSearch}>초기화</Button>
                <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                  검색
                </Button>
              </div>
            </Form>
          </Card>
        )}

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
