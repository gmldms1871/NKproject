"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Empty, message, Avatar, Space, Tag, Modal } from "antd";
import {
  TeamOutlined,
  CheckOutlined,
  CloseOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/contexts/auth-context";
import { getReceivedInvitations, acceptGroupInvitation, rejectGroupInvitation } from "@/lib/groups";

interface Invitation {
  id: string;
  group_id: string | null;
  inviter_id: string | null;
  invitee_email: string | null;
  invitee_phone: string | null;
  group_roles_id: string | null;
  expires_at: string | null;
  created_at: string | null;
  groups: {
    name: string;
    description: string | null;
    image_url: string | null;
  } | null;
  group_roles: {
    name: string;
  } | null;
  users: {
    nickname: string;
  } | null;
}

export default function InvitationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push("/auth");
      return;
    }
    loadInvitations();
  }, [user, router]);

  const loadInvitations = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const result = await getReceivedInvitations(user.id);

      if (result.success) {
        setInvitations(result.data || []);
      } else {
        message.error(result.error || "초대 목록을 불러오는데 실패했습니다.");
      }
    } catch (error) {
      message.error("초대 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    if (!user) return;

    setActionLoading(invitationId);
    try {
      const result = await acceptGroupInvitation(invitationId, user.id);

      if (result.success) {
        message.success("초대를 수락했습니다!");
        loadInvitations(); // 목록 새로고침
      } else {
        message.error(result.error || "초대 수락에 실패했습니다.");
      }
    } catch (error) {
      message.error("초대 수락 중 오류가 발생했습니다.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectInvitation = (invitationId: string) => {
    Modal.confirm({
      title: "초대를 거절하시겠습니까?",
      content: "이 작업은 되돌릴 수 없습니다.",
      icon: <ExclamationCircleOutlined />,
      onOk: async () => {
        if (!user) return;

        setActionLoading(invitationId);
        try {
          const result = await rejectGroupInvitation(invitationId, user.id);

          if (result.success) {
            message.success("초대를 거절했습니다.");
            loadInvitations(); // 목록 새로고침
          } else {
            message.error(result.error || "초대 거절에 실패했습니다.");
          }
        } catch (error) {
          message.error("초대 거절 중 오류가 발생했습니다.");
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "알 수 없음";
    return new Date(dateString).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const InvitationCard = ({ invitation }: { invitation: Invitation }) => {
    const expired = isExpired(invitation.expires_at);

    return (
      <Card hoverable={!expired} className={expired ? "opacity-60" : ""}>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              {invitation.groups?.image_url ? (
                <Avatar size={64} src={invitation.groups.image_url} />
              ) : (
                <Avatar size={64} icon={<TeamOutlined />} style={{ backgroundColor: "#1890ff" }} />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {invitation.groups?.name || "알 수 없는 그룹"}
              </h3>

              <div className="mt-1 space-y-1">
                <p className="text-sm text-gray-600">
                  <strong>{invitation.users?.nickname || "알 수 없는 사용자"}</strong>님이
                  초대했습니다
                </p>

                <p className="text-sm text-gray-500">
                  {invitation.groups?.description || "설명이 없습니다."}
                </p>

                <div className="flex items-center space-x-2 mt-2">
                  <Tag color="blue">{invitation.group_roles?.name || "알 수 없는 역할"}</Tag>

                  {expired ? (
                    <Tag color="red" icon={<ClockCircleOutlined />}>
                      만료됨
                    </Tag>
                  ) : (
                    <Tag color="green" icon={<ClockCircleOutlined />}>
                      유효함
                    </Tag>
                  )}
                </div>

                <p className="text-xs text-gray-400">
                  초대일: {formatDate(invitation.created_at)}
                  {invitation.expires_at && (
                    <span className="ml-2">만료일: {formatDate(invitation.expires_at)}</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {!expired && (
            <div className="flex-shrink-0">
              <Space direction="vertical" size="small">
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  loading={actionLoading === invitation.id}
                  onClick={() => handleAcceptInvitation(invitation.id)}
                  block
                >
                  수락
                </Button>
                <Button
                  danger
                  icon={<CloseOutlined />}
                  loading={actionLoading === invitation.id}
                  onClick={() => handleRejectInvitation(invitation.id)}
                  block
                >
                  거절
                </Button>
              </Space>
            </div>
          )}
        </div>
      </Card>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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

  const validInvitations = invitations.filter((inv) => !isExpired(inv.expires_at));
  const expiredInvitations = invitations.filter((inv) => isExpired(inv.expires_at));

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">받은 초대</h1>
          <p className="text-gray-600 mt-2">그룹 초대를 확인하고 참여하세요</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">초대 목록을 불러오는 중...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 유효한 초대들 */}
            {validInvitations.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  새로운 초대 ({validInvitations.length})
                </h2>
                <div className="space-y-4">
                  {validInvitations.map((invitation) => (
                    <InvitationCard key={invitation.id} invitation={invitation} />
                  ))}
                </div>
              </div>
            )}

            {/* 만료된 초대들 */}
            {expiredInvitations.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-500 mb-4">
                  만료된 초대 ({expiredInvitations.length})
                </h2>
                <div className="space-y-4">
                  {expiredInvitations.map((invitation) => (
                    <InvitationCard key={invitation.id} invitation={invitation} />
                  ))}
                </div>
              </div>
            )}

            {/* 초대가 없는 경우 */}
            {invitations.length === 0 && (
              <div className="text-center py-12">
                <Empty description="받은 초대가 없습니다" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                <Button type="primary" className="mt-4" onClick={() => router.push("/groups")}>
                  그룹 둘러보기
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
