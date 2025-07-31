"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Card,
  Button,
  Empty,
  Spin,
  Modal,
  Form,
  Input,
  Upload,
  Avatar,
  Space,
  Tabs,
  App,
} from "antd";
import {
  PlusOutlined,
  TeamOutlined,
  CrownOutlined,
  UploadOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/contexts/auth-context";
import { usePageHeader } from "@/contexts/page-header-context";
import { getMyGroups, getMyCreatedGroups, createGroup } from "@/lib/groups";
import { Database } from "@/lib/types/types";

// 타입 정의
type Group = Database["public"]["Tables"]["groups"]["Row"];

interface CreateGroupFormValues {
  name: string;
  description?: string;
  image_url?: string;
}

interface GroupCardProps {
  group: Group;
  isOwner?: boolean;
}

export default function GroupsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { setPageHeader } = usePageHeader();
  const { message: messageApi } = App.useApp();
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [myCreatedGroups, setMyCreatedGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [form] = Form.useForm();

  // 페이지 헤더 설정
  useEffect(() => {
    setPageHeader({
      title: "그룹 관리",
      subtitle: "그룹을 만들고 관리하세요",
      actions: (
        <Button
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          onClick={() => setCreateModalVisible(true)}
        >
          새 그룹 만들기
        </Button>
      ),
    });

    return () => setPageHeader(null);
  }, [setPageHeader]);

  const loadGroups = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [myGroupsResult, createdGroupsResult] = await Promise.all([
        getMyGroups(user.id),
        getMyCreatedGroups(user.id),
      ]);

      if (myGroupsResult.success) {
        setMyGroups(
          (myGroupsResult.data || []).map((g: Group) => ({
            ...g,
            name: g.name ?? "",
            description: g.description ?? "",
            image_url: g.image_url ?? "",
            owner_id: g.owner_id ?? "",
            created_at: g.created_at ?? "",
          }))
        );
      }

      if (createdGroupsResult.success) {
        setMyCreatedGroups(
          (createdGroupsResult.data || []).map((g: Group) => ({
            ...g,
            name: g.name ?? "",
            description: g.description ?? "",
            image_url: g.image_url ?? "",
            owner_id: g.owner_id ?? "",
            created_at: g.created_at ?? "",
          }))
        );
      }
    } catch (error) {
      messageApi.error("그룹 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [user, messageApi]);

  // 로그인 확인
  useEffect(() => {
    if (!user) {
      router.push("/auth");
      return;
    }
    loadGroups();
  }, [user, router, loadGroups]);

  const handleCreateGroup = async (values: CreateGroupFormValues) => {
    if (!user) return;

    setCreateLoading(true);
    try {
      const result = await createGroup(user.id, {
        name: values.name,
        description: values.description,
        image_url: values.image_url,
      });

      if (result.success) {
        messageApi.success("그룹이 성공적으로 생성되었습니다!");
        setCreateModalVisible(false);
        form.resetFields();
        loadGroups();
      } else {
        messageApi.error(result.error || "그룹 생성에 실패했습니다.");
      }
    } catch (error) {
      messageApi.error("그룹 생성 중 오류가 발생했습니다.");
    } finally {
      setCreateLoading(false);
    }
  };

  const GroupCard = ({ group, isOwner = false }: GroupCardProps) => (
    <Card
      hoverable
      onClick={() => router.push(`/groups/${group.id}`)}
      cover={
        group.image_url ? (
          <Image
            alt={group.name || "그룹 이미지"}
            src={group.image_url}
            width={400}
            height={200}
            style={{ height: 200, objectFit: "cover", width: "100%" }}
            unoptimized
          />
        ) : (
          <div
            style={{
              height: 200,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#f5f5f5",
            }}
          >
            <TeamOutlined style={{ fontSize: 48, color: "#d9d9d9" }} />
          </div>
        )
      }
      actions={[
        <TeamOutlined key="members" />,
        isOwner && <CrownOutlined key="owner" style={{ color: "#faad14" }} />,
      ].filter(Boolean)}
    >
      <Card.Meta
        title={
          <Space>
            {group.name}
            {isOwner && <CrownOutlined style={{ color: "#faad14", fontSize: 16 }} />}
          </Space>
        }
        description={group.description || "설명이 없습니다."}
      />
    </Card>
  );

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

  const tabItems = [
    {
      key: "my-groups",
      label: (
        <Space>
          <TeamOutlined />내 그룹들 ({myGroups.length})
        </Space>
      ),
      children: (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {myGroups.length > 0 ? (
            myGroups.map((group) => (
              <GroupCard key={group.id} group={group} isOwner={group.owner_id === user.id} />
            ))
          ) : (
            <div className="col-span-full">
              <Empty description="아직 속한 그룹이 없습니다." />
            </div>
          )}
        </div>
      ),
    },
    {
      key: "created-groups",
      label: (
        <Space>
          <CrownOutlined />
          내가 만든 그룹들 ({myCreatedGroups.length})
        </Space>
      ),
      children: (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {myCreatedGroups.length > 0 ? (
            myCreatedGroups.map((group) => (
              <GroupCard key={group.id} group={group} isOwner={true} />
            ))
          ) : (
            <div className="col-span-full">
              <Empty description="아직 만든 그룹이 없습니다." />
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 그룹 목록 */}
        {loading ? (
          <div className="text-center py-12">
            <Spin size="large" />
            <p className="mt-4 text-gray-600">그룹 목록을 불러오는 중...</p>
          </div>
        ) : (
          <Tabs defaultActiveKey="my-groups" items={tabItems} />
        )}

        {/* 그룹 생성 모달 */}
        <Modal
          title="새 그룹 만들기"
          open={createModalVisible}
          onCancel={() => {
            setCreateModalVisible(false);
            form.resetFields();
          }}
          footer={null}
          destroyOnHidden
        >
          <Form form={form} layout="vertical" onFinish={handleCreateGroup} size="large">
            <Form.Item
              name="name"
              label="그룹 이름"
              rules={[
                { required: true, message: "그룹 이름을 입력해주세요!" },
                { max: 50, message: "그룹 이름은 50자 이하여야 합니다!" },
              ]}
            >
              <Input placeholder="예: 개발팀, 스터디 그룹" />
            </Form.Item>

            <Form.Item
              name="description"
              label="그룹 설명"
              rules={[{ max: 200, message: "설명은 200자 이하여야 합니다!" }]}
            >
              <Input.TextArea rows={3} placeholder="그룹에 대한 간단한 설명을 입력하세요" />
            </Form.Item>

            <Form.Item name="image_url" label="그룹 이미지 URL (선택사항)">
              <Input placeholder="https://example.com/image.jpg" />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button
                  onClick={() => {
                    setCreateModalVisible(false);
                    form.resetFields();
                  }}
                >
                  취소
                </Button>
                <Button type="primary" htmlType="submit" loading={createLoading}>
                  그룹 만들기
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </div>
  );
}
