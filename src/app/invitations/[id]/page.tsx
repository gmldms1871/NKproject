"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, Button, Space, Avatar, Tag, Modal, Descriptions, Spin, Result, App } from "antd";
import {
  TeamOutlined,
  CheckOutlined,
  CloseOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  ArrowLeftOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/contexts/auth-context";
import { usePageHeader } from "@/contexts/page-header-context";
import {
  acceptGroupInvitation,
  rejectGroupInvitation,
  getInvitationDetails,
  InvitationWithDetails,
} from "@/lib/groups";
import { markNotificationAsRead } from "@/lib/notifications";

export default function InvitationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const { setPageHeader } = usePageHeader();
  const { message: messageApi } = App.useApp();
  const invitationId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [invitation, setInvitation] = useState<InvitationWithDetails | null>(null);
  const [notFound, setNotFound] = useState(false);

  // 페이지 헤더 설정
  useEffect(() => {
    setPageHeader({
      title: "초대 상세",
      subtitle: invitation ? `${invitation.groups?.name} 그룹 초대` : "그룹 초대 확인",
      backUrl: "/invitations",
    });

    return () => setPageHeader(null);
  }, [setPageHeader, invitation]);

  const loadInvitationDetail = useCallback(async () => {
    if (!user || !invitationId) return;

    setLoading(true);
    try {
      const result = await getInvitationDetails(invitationId, user.id);

      if (result.success && result.data) {
        setInvitation(result.data);
      } else {
        console.error("초대 정보 조회 실패:", result.error);
        setNotFound(true);
      }
    } catch (error) {
      console.error("초대 정보 조회 중 오류:", error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [invitationId, user]);

  useEffect(() => {
    if (!user) {
      router.push("/auth");
      return;
    }

    loadInvitationDetail();

    // 알림을 읽음으로 표시 (related_id가 초대 ID인 알림)
    if (invitationId) {
      markNotificationAsRead(invitationId, user.id).catch((error) => {
        console.warn("알림 읽음 처리 실패:", error);
      });
    }
  }, [user, invitationId, router, loadInvitationDetail]);

  const handleAcceptInvitation = async () => {
    if (!user || !invitationId) return;

    setActionLoading(true);
    try {
      const result = await acceptGroupInvitation(invitationId, user.id);

      if (result.success) {
        messageApi.success("초대를 수락했습니다! 그룹에 참여되었습니다.");

        // 성공 후 그룹 페이지로 이동
        setTimeout(() => {
          if (invitation?.group_id) {
            router.push(`/groups/${invitation.group_id}`);
          } else {
            router.push("/groups");
          }
        }, 1500);
      } else {
        messageApi.error(result.error || "초대 수락에 실패했습니다.");
      }
    } catch (error) {
      messageApi.error("초대 수락 중 오류가 발생했습니다.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectInvitation = () => {
    Modal.confirm({
      title: "초대를 거절하시겠습니까?",
      content: "이 작업은 되돌릴 수 없습니다.",
      icon: <ExclamationCircleOutlined />,
      okText: "거절",
      okType: "danger",
      cancelText: "취소",
      onOk: async () => {
        if (!user || !invitationId) return;

        setActionLoading(true);
        try {
          const result = await rejectGroupInvitation(invitationId, user.id);

          if (result.success) {
            messageApi.success("초대를 거절했습니다.");

            // 성공 후 초대 목록으로 이동
            setTimeout(() => {
              router.push("/invitations");
            }, 1500);
          } else {
            messageApi.error(result.error || "초대 거절에 실패했습니다.");
          }
        } catch (error) {
          messageApi.error("초대 거절 중 오류가 발생했습니다.");
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const getDaysUntilExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "알 수 없음";
    return new Date(dateString).toLocaleString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <Spin size="large" />
            <p className="mt-4 text-gray-600">초대 정보를 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !invitation) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <Result
            status="404"
            title="초대를 찾을 수 없습니다"
            subTitle="요청하신 초대가 존재하지 않거나 이미 만료되었습니다."
            extra={
              <Space>
                <Button onClick={() => router.push("/invitations")}>초대 목록으로</Button>
                <Button type="primary" onClick={() => router.push("/groups")}>
                  그룹 둘러보기
                </Button>
              </Space>
            }
          />
        </div>
      </div>
    );
  }

  const expired = isExpired(invitation.expires_at);
  const daysUntilExpiry = getDaysUntilExpiry(invitation.expires_at);
  const urgentInvitation = daysUntilExpiry !== null && daysUntilExpiry <= 2 && daysUntilExpiry > 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="shadow-lg">
          <div className="text-center space-y-6">
            {/* 그룹 정보 */}
            <div className="flex justify-center">
              {invitation.groups?.image_url ? (
                <Avatar size={120} src={invitation.groups.image_url} />
              ) : (
                <Avatar size={120} icon={<TeamOutlined />} style={{ backgroundColor: "#1890ff" }} />
              )}
            </div>

            {/* 초대 제목 */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {invitation.groups?.name} 그룹 초대
              </h1>
              <p className="text-lg text-gray-600">그룹에 참여하도록 초대되었습니다!</p>
            </div>

            {/* 상태 표시 */}
            <div className="flex justify-center">
              {expired ? (
                <Tag color="red" icon={<ClockCircleOutlined />} className="text-base px-4 py-2">
                  만료된 초대
                </Tag>
              ) : urgentInvitation ? (
                <Tag color="orange" icon={<ClockCircleOutlined />} className="text-base px-4 py-2">
                  {daysUntilExpiry}일 남음 (긴급)
                </Tag>
              ) : (
                <Tag color="green" icon={<CheckOutlined />} className="text-base px-4 py-2">
                  유효한 초대
                </Tag>
              )}
            </div>

            {/* 초대 정보 */}
            <div className="bg-gray-50 rounded-lg p-6 text-left">
              <Descriptions title="초대 정보" bordered column={1} size="small">
                <Descriptions.Item label="그룹 이름">
                  <div className="flex items-center space-x-2">
                    <TeamOutlined />
                    <span className="font-medium">{invitation.groups?.name}</span>
                  </div>
                </Descriptions.Item>

                <Descriptions.Item label="그룹 설명">
                  {invitation.groups?.description || "설명이 없습니다."}
                </Descriptions.Item>

                <Descriptions.Item label="초대자">
                  <div className="flex items-center space-x-2">
                    <UserOutlined />
                    <span>
                      {invitation.users?.name} (@{invitation.users?.nickname})
                    </span>
                  </div>
                </Descriptions.Item>

                <Descriptions.Item label="부여될 역할">
                  <Tag color="blue">{invitation.group_roles?.name}</Tag>
                </Descriptions.Item>

                <Descriptions.Item label="초대 생성일">
                  <div className="flex items-center space-x-2">
                    <CalendarOutlined />
                    <span>{formatDate(invitation.created_at)}</span>
                  </div>
                </Descriptions.Item>

                {invitation.expires_at && (
                  <Descriptions.Item label="만료일">
                    <div className="flex items-center space-x-2">
                      <ClockCircleOutlined />
                      <span>{formatDate(invitation.expires_at)}</span>
                    </div>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </div>

            {/* 액션 버튼 */}
            {!expired && (
              <div className="flex justify-center space-x-4">
                <Button
                  type="primary"
                  size="large"
                  icon={<CheckOutlined />}
                  loading={actionLoading}
                  onClick={handleAcceptInvitation}
                  className="min-w-[120px]"
                >
                  초대 수락
                </Button>
                <Button
                  size="large"
                  danger
                  icon={<CloseOutlined />}
                  loading={actionLoading}
                  onClick={handleRejectInvitation}
                  className="min-w-[120px]"
                >
                  초대 거절
                </Button>
              </div>
            )}

            {expired && (
              <div className="text-center">
                <p className="text-red-500 mb-4">이 초대는 만료되어 더 이상 유효하지 않습니다.</p>
                <Button onClick={() => router.push("/invitations")}>다른 초대 확인하기</Button>
              </div>
            )}

            {/* 추가 정보 */}
            <div className="text-sm text-gray-500 border-t pt-4">
              <p>초대를 수락하면 해당 그룹의 멤버가 되어 그룹 활동에 참여할 수 있습니다.</p>
              <p>그룹에서 부여받은 역할에 따라 다양한 권한을 가질 수 있습니다.</p>
            </div>
          </div>
        </Card>

        {/* 뒤로 가기 */}
        <div className="text-center mt-6">
          <Button
            type="link"
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/invitations")}
          >
            초대 목록으로 돌아가기
          </Button>
        </div>
      </div>
    </div>
  );
}
