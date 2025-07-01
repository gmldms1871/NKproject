"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, Button, Space, Avatar, Tag, message, Modal } from "antd";
import {
  TeamOutlined,
  CheckOutlined,
  CloseOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/contexts/auth-context";
import { acceptGroupInvitation, rejectGroupInvitation } from "@/lib/groups";
import { markNotificationAsRead } from "@/lib/notifications";

export default function InvitationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const invitationId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      router.push("/auth");
      return;
    }

    // 알림을 읽음으로 표시 (related_id가 초대 ID인 알림)
    markNotificationAsRead(invitationId, user.id);
  }, [user, invitationId, router]);

  const handleAcceptInvitation = async () => {
    if (!user || !invitationId) return;

    setLoading(true);
    try {
      const result = await acceptGroupInvitation(invitationId, user.id);

      if (result.success) {
        message.success("초대를 수락했습니다!");
        router.push("/groups");
      } else {
        message.error(result.error || "초대 수락에 실패했습니다.");
      }
    } catch (error) {
      message.error("초대 수락 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectInvitation = () => {
    Modal.confirm({
      title: "초대를 거절하시겠습니까?",
      content: "이 작업은 되돌릴 수 없습니다.",
      icon: <ExclamationCircleOutlined />,
      onOk: async () => {
        if (!user || !invitationId) return;

        setLoading(true);
        try {
          const result = await rejectGroupInvitation(invitationId, user.id);

          if (result.success) {
            message.success("초대를 거절했습니다.");
            router.push("/invitations");
          } else {
            message.error(result.error || "초대 거절에 실패했습니다.");
          }
        } catch (error) {
          message.error("초대 거절 중 오류가 발생했습니다.");
        } finally {
          setLoading(false);
        }
      },
    });
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="shadow-lg">
          <div className="text-center space-y-6">
            {/* 그룹 아이콘 */}
            <div className="flex justify-center">
              <Avatar size={80} icon={<TeamOutlined />} style={{ backgroundColor: "#1890ff" }} />
            </div>

            {/* 초대 제목 */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">그룹 초대</h1>
              <p className="text-gray-600">그룹에 참여하도록 초대되었습니다!</p>
            </div>

            {/* 초대 정보 (실제로는 API에서 가져와야 함) */}
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">테스트 그룹</h3>
                <p className="text-sm text-gray-600 mt-1">개발팀 프로젝트 관리 그룹입니다.</p>
              </div>

              <div className="flex justify-center space-x-4">
                <Tag color="blue">매니저</Tag>
                <Tag color="green" icon={<ClockCircleOutlined />}>
                  유효한 초대
                </Tag>
              </div>

              <div className="text-xs text-gray-500">
                <p>초대자: 홍길동님</p>
                <p>초대일: 2024년 12월 29일</p>
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className="flex justify-center space-x-4">
              <Button
                type="primary"
                size="large"
                icon={<CheckOutlined />}
                loading={loading}
                onClick={handleAcceptInvitation}
              >
                초대 수락
              </Button>
              <Button
                size="large"
                danger
                icon={<CloseOutlined />}
                loading={loading}
                onClick={handleRejectInvitation}
              >
                초대 거절
              </Button>
            </div>

            {/* 추가 정보 */}
            <div className="text-xs text-gray-500 border-t pt-4">
              <p>초대를 수락하면 해당 그룹의 멤버가 되어 그룹 활동에 참여할 수 있습니다.</p>
            </div>
          </div>
        </Card>

        {/* 뒤로 가기 */}
        <div className="text-center mt-6">
          <Button type="link" onClick={() => router.push("/invitations")}>
            ← 초대 목록으로 돌아가기
          </Button>
        </div>
      </div>
    </div>
  );
}
