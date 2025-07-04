"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  Tabs,
  Button,
  Table,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Avatar,
  Popconfirm,
  Switch,
  Empty,
  App,
} from "antd";
import {
  UserAddOutlined,
  SettingOutlined,
  CrownOutlined,
  DeleteOutlined,
  EditOutlined,
  TeamOutlined,
  CalendarOutlined,
  TagOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/contexts/auth-context";
import { usePageHeader } from "@/contexts/page-header-context";
import InviteModal from "@/components/InviteModal";
import {
  getGroupMembers,
  getGroupRoles,
  updateMemberRole,
  createGroupRole,
  updateGroupRole,
  deleteGroupRole,
  GroupMemberWithDetails,
} from "@/lib/groups";
import { getAllClasses, ClassWithDetails } from "@/lib/classes";
import { Database } from "@/lib/types/types";

// 타입 정의
type GroupRole = Database["public"]["Tables"]["group_roles"]["Row"];
type Group = Database["public"]["Tables"]["groups"]["Row"];

interface CreateRoleFormValues {
  name: string;
  can_invite: boolean;
  can_manage_roles: boolean;
  can_create_form: boolean;
  can_delete_form: boolean;
}

interface UpdateRoleFormValues {
  can_invite: boolean;
  can_manage_roles: boolean;
  can_create_form: boolean;
  can_delete_form: boolean;
}

export default function GroupDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const { setPageHeader } = usePageHeader();
  const { message: messageApi } = App.useApp();
  const groupId = params.id as string;

  const [members, setMembers] = useState<GroupMemberWithDetails[]>([]);
  const [roles, setRoles] = useState<GroupRole[]>([]);
  const [classes, setClasses] = useState<ClassWithDetails[]>([]);
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<GroupRole | null>(null);

  const [inviteForm] = Form.useForm();
  const [roleForm] = Form.useForm();
  const [settingsForm] = Form.useForm();

  const userRole = members.find((m) => m.users?.id === user?.id)?.group_roles;

  // 페이지 헤더 설정
  useEffect(() => {
    if (group) {
      setPageHeader({
        title: group.name || "그룹 이름",
        subtitle: group.description || "그룹 설명",
        backUrl: "/groups",
        actions: (
          <Button icon={<SettingOutlined />} onClick={() => setSettingsModalVisible(true)}>
            그룹 설정
          </Button>
        ),
      });
    }

    return () => setPageHeader(null);
  }, [group, setPageHeader]);

  const loadGroupData = useCallback(async () => {
    if (!user || !groupId) return;

    setLoading(true);
    try {
      const [membersResult, rolesResult, classesResult] = await Promise.all([
        getGroupMembers(groupId, user.id),
        getGroupRoles(groupId, user.id),
        getAllClasses(groupId, user.id),
      ]);

      if (membersResult.success) {
        setMembers(membersResult.data || []);
        // 그룹 정보는 멤버 정보에서 추출
        const groupInfo = membersResult.data?.[0];
        if (groupInfo) {
          // 실제로는 별도 API가 필요하지만, 임시로 멤버 데이터에서 추출
          setGroup({
            id: groupId,
            name: "Group Name", // 실제로는 API에서 가져와야 함
            description: "Group Description",
            image_url: null,
            owner_id: null,
            created_at: null,
            updated_at: null,
          });
        }
      }

      if (rolesResult.success) {
        setRoles(rolesResult.data || []);
      }

      if (classesResult.success) {
        setClasses(classesResult.data || []);
      }
    } catch (error) {
      messageApi.error("그룹 정보를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [user, groupId, messageApi]);

  useEffect(() => {
    if (!user) {
      router.push("/auth");
      return;
    }
    loadGroupData();
  }, [user, groupId, loadGroupData, router]);

  const handleCreateRole = async (values: CreateRoleFormValues) => {
    if (!user) return;

    try {
      const result = await createGroupRole(user.id, {
        groupId,
        name: values.name,
        can_invite: values.can_invite || false,
        can_manage_roles: values.can_manage_roles || false,
        can_create_form: values.can_create_form || false,
        can_delete_form: values.can_delete_form || false,
      });

      if (result.success) {
        messageApi.success("역할이 성공적으로 생성되었습니다!");
        setRoleModalVisible(false);
        roleForm.resetFields();
        loadGroupData();
      } else {
        messageApi.error(result.error || "역할 생성에 실패했습니다.");
      }
    } catch (error) {
      messageApi.error("역할 생성 중 오류가 발생했습니다.");
    }
  };

  const handleUpdateRole = async (roleId: string, values: UpdateRoleFormValues) => {
    if (!user) return;

    try {
      const result = await updateGroupRole(roleId, user.id, values);

      if (result.success) {
        messageApi.success("역할이 성공적으로 수정되었습니다!");
        setEditingRole(null);
        loadGroupData();
      } else {
        messageApi.error(result.error || "역할 수정에 실패했습니다.");
      }
    } catch (error) {
      messageApi.error("역할 수정 중 오류가 발생했습니다.");
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!user) return;

    try {
      const result = await deleteGroupRole(roleId, user.id);

      if (result.success) {
        messageApi.success("역할이 성공적으로 삭제되었습니다!");
        loadGroupData();
      } else {
        messageApi.error(result.error || "역할 삭제에 실패했습니다.");
      }
    } catch (error) {
      messageApi.error("역할 삭제 중 오류가 발생했습니다.");
    }
  };

  const handleChangeRole = async (memberId: string, newRoleId: string) => {
    if (!user) return;

    try {
      const result = await updateMemberRole(groupId, { memberId, newRoleId }, user.id);

      if (result.success) {
        messageApi.success("멤버 역할이 성공적으로 변경되었습니다!");
        loadGroupData();
      } else {
        messageApi.error(result.error || "멤버 역할 변경에 실패했습니다.");
      }
    } catch (error) {
      messageApi.error("멤버 역할 변경 중 오류가 발생했습니다.");
    }
  };

  const membersColumns = [
    {
      title: "멤버",
      dataIndex: "users",
      key: "user",
      render: (user: GroupMemberWithDetails["users"]) => (
        <Space>
          <Avatar icon={<UserAddOutlined />} />
          <div>
            <div className="font-medium">{user?.name}</div>
            <div className="text-sm text-gray-500">@{user?.nickname}</div>
          </div>
        </Space>
      ),
    },
    {
      title: "역할",
      dataIndex: "group_roles",
      key: "role",
      render: (role: GroupMemberWithDetails["group_roles"], record: GroupMemberWithDetails) => {
        const isOwner = role?.name === "owner";
        return (
          <Space>
            <Tag color={isOwner ? "gold" : "blue"}>
              {isOwner && <CrownOutlined />} {role?.name}
            </Tag>
            {userRole?.can_manage_roles && !isOwner && (
              <Select
                size="small"
                value={role?.id}
                style={{ width: 120 }}
                onChange={(value: string) => handleChangeRole(record.id, value)}
              >
                {roles.map((r) => (
                  <Select.Option key={r.id} value={r.id}>
                    {r.name}
                  </Select.Option>
                ))}
              </Select>
            )}
          </Space>
        );
      },
    },
    {
      title: "가입일",
      dataIndex: "joined_at",
      key: "joined_at",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  const rolesColumns = [
    {
      title: "역할 이름",
      dataIndex: "name",
      key: "name",
      render: (name: string) => (
        <Tag color={name === "owner" ? "gold" : name === "member" ? "blue" : "green"}>
          {name === "owner" && <CrownOutlined />} {name}
        </Tag>
      ),
    },
    {
      title: "초대 권한",
      dataIndex: "can_invite",
      key: "can_invite",
      render: (value: boolean) => (
        <Tag color={value ? "green" : "red"}>{value ? "가능" : "불가능"}</Tag>
      ),
    },
    {
      title: "역할 관리",
      dataIndex: "can_manage_roles",
      key: "can_manage_roles",
      render: (value: boolean) => (
        <Tag color={value ? "green" : "red"}>{value ? "가능" : "불가능"}</Tag>
      ),
    },
    {
      title: "양식 생성",
      dataIndex: "can_create_form",
      key: "can_create_form",
      render: (value: boolean) => (
        <Tag color={value ? "green" : "red"}>{value ? "가능" : "불가능"}</Tag>
      ),
    },
    {
      title: "양식 삭제",
      dataIndex: "can_delete_form",
      key: "can_delete_form",
      render: (value: boolean) => (
        <Tag color={value ? "green" : "red"}>{value ? "가능" : "불가능"}</Tag>
      ),
    },
    {
      title: "작업",
      key: "actions",
      render: (_: unknown, record: GroupRole) => {
        if (record.name === "owner" || record.name === "member") {
          return <span className="text-gray-400">기본 역할</span>;
        }

        if (!userRole?.can_manage_roles) {
          return null;
        }

        return (
          <Space>
            <Button size="small" icon={<EditOutlined />} onClick={() => setEditingRole(record)}>
              수정
            </Button>
            <Popconfirm
              title="정말 이 역할을 삭제하시겠습니까?"
              onConfirm={() => handleDeleteRole(record.id)}
            >
              <Button size="small" danger icon={<DeleteOutlined />}>
                삭제
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const tabItems = [
    {
      key: "members",
      label: `멤버 (${members.length})`,
      children: (
        <div>
          <div className="mb-4 flex justify-between">
            <h3 className="text-lg font-medium">그룹 멤버</h3>
            {userRole?.can_invite && (
              <Button
                type="primary"
                icon={<UserAddOutlined />}
                onClick={() => setInviteModalVisible(true)}
              >
                멤버 초대
              </Button>
            )}
          </div>
          <Table columns={membersColumns} dataSource={members} rowKey="id" pagination={false} />
        </div>
      ),
    },
    {
      key: "classes",
      label: `반 (${classes.length})`,
      children: (
        <div>
          <div className="mb-4 flex justify-between">
            <h3 className="text-lg font-medium">그룹 반</h3>
            <Space>
              <Button onClick={() => router.push(`/groups/${groupId}/classes`)}>전체 보기</Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => router.push(`/groups/${groupId}/classes`)}
              >
                반 관리
              </Button>
            </Space>
          </div>

          {classes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.slice(0, 6).map((classItem) => (
                <Card
                  key={classItem.id}
                  hoverable
                  onClick={() => router.push(`/classes/${classItem.id}`)}
                  className="h-full"
                  cover={
                    <div
                      style={{
                        height: 80,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "#f5f5f5",
                        position: "relative",
                      }}
                    >
                      <TeamOutlined style={{ fontSize: 24, color: "#d9d9d9" }} />
                      <div
                        style={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          backgroundColor: "rgba(0,0,0,0.6)",
                          color: "white",
                          padding: "2px 6px",
                          borderRadius: 3,
                          fontSize: 10,
                        }}
                      >
                        {classItem.memberCount}명
                      </div>
                    </div>
                  }
                >
                  <Card.Meta
                    title={<span className="text-sm font-medium truncate">{classItem.name}</span>}
                    description={
                      <div className="space-y-1">
                        <p className="text-xs text-gray-600 line-clamp-1">
                          {classItem.description || "설명이 없습니다."}
                        </p>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>구성원 {classItem.memberCount}명</span>
                          <span>태그 {classItem.class_tags.length}개</span>
                        </div>
                      </div>
                    }
                  />
                </Card>
              ))}
            </div>
          ) : (
            <Empty description="아직 생성된 반이 없습니다.">
              <Button type="primary" onClick={() => router.push(`/groups/${groupId}/classes`)}>
                첫 번째 반 만들기
              </Button>
            </Empty>
          )}

          {classes.length > 6 && (
            <div className="text-center mt-4">
              <Button onClick={() => router.push(`/groups/${groupId}/classes`)}>
                모든 반 보기 ({classes.length}개)
              </Button>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "roles",
      label: `역할 (${roles.length})`,
      children: (
        <div>
          <div className="mb-4 flex justify-between">
            <h3 className="text-lg font-medium">그룹 역할</h3>
            {userRole?.can_manage_roles && (
              <Button
                type="primary"
                icon={<SettingOutlined />}
                onClick={() => setRoleModalVisible(true)}
              >
                새 역할 만들기
              </Button>
            )}
          </div>
          <Table columns={rolesColumns} dataSource={roles} rowKey="id" pagination={false} />
        </div>
      ),
    },
  ];

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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 탭 컨텐츠 */}
        <Card>
          <Tabs defaultActiveKey="members" items={tabItems} />
        </Card>

        {/* 새로운 초대 모달 */}
        <InviteModal
          open={inviteModalVisible}
          onCancel={() => setInviteModalVisible(false)}
          groupId={groupId}
          roles={roles}
          inviterId={user.id}
          onSuccess={loadGroupData}
        />

        {/* 역할 생성 모달 */}
        <Modal
          title="새 역할 만들기"
          open={roleModalVisible}
          onCancel={() => {
            setRoleModalVisible(false);
            roleForm.resetFields();
          }}
          footer={null}
          destroyOnHidden
        >
          <Form form={roleForm} layout="vertical" onFinish={handleCreateRole}>
            <Form.Item
              name="name"
              label="역할 이름"
              rules={[{ required: true, message: "역할 이름을 입력해주세요!" }]}
            >
              <Input placeholder="예: 매니저, 에디터" />
            </Form.Item>

            <Form.Item name="can_invite" valuePropName="checked" label="멤버 초대 권한">
              <Switch />
            </Form.Item>

            <Form.Item name="can_manage_roles" valuePropName="checked" label="역할 관리 권한">
              <Switch />
            </Form.Item>

            <Form.Item name="can_create_form" valuePropName="checked" label="양식 생성 권한">
              <Switch />
            </Form.Item>

            <Form.Item name="can_delete_form" valuePropName="checked" label="양식 삭제 권한">
              <Switch />
            </Form.Item>

            <Form.Item className="mb-0 mt-6">
              <Space>
                <Button onClick={() => setRoleModalVisible(false)}>취소</Button>
                <Button type="primary" htmlType="submit">
                  역할 만들기
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* 역할 수정 모달 */}
        <Modal
          title={`역할 수정: ${editingRole?.name}`}
          open={!!editingRole}
          onCancel={() => setEditingRole(null)}
          footer={null}
          destroyOnHidden
        >
          {editingRole && (
            <Form
              layout="vertical"
              initialValues={{
                can_invite: editingRole.can_invite,
                can_manage_roles: editingRole.can_manage_roles,
                can_create_form: editingRole.can_create_form,
                can_delete_form: editingRole.can_delete_form,
              }}
              onFinish={(values: UpdateRoleFormValues) => handleUpdateRole(editingRole.id, values)}
            >
              <Form.Item name="can_invite" valuePropName="checked" label="멤버 초대 권한">
                <Switch />
              </Form.Item>

              <Form.Item name="can_manage_roles" valuePropName="checked" label="역할 관리 권한">
                <Switch />
              </Form.Item>

              <Form.Item name="can_create_form" valuePropName="checked" label="양식 생성 권한">
                <Switch />
              </Form.Item>

              <Form.Item name="can_delete_form" valuePropName="checked" label="양식 삭제 권한">
                <Switch />
              </Form.Item>

              <Form.Item className="mb-0 mt-6">
                <Space>
                  <Button onClick={() => setEditingRole(null)}>취소</Button>
                  <Button type="primary" htmlType="submit">
                    수정 완료
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          )}
        </Modal>
      </div>
    </div>
  );
}
