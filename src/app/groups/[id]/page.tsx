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
  Spin,
  App,
  Badge,
  Col,
  Row,
} from "antd";
import {
  UserAddOutlined,
  UserDeleteOutlined,
  SettingOutlined,
  CrownOutlined,
  DeleteOutlined,
  EditOutlined,
  TeamOutlined,
  CalendarOutlined,
  TagOutlined,
  PlusOutlined,
  MailOutlined,
  PhoneOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  ExclamationCircleOutlined,
  LogoutOutlined,
  FileTextOutlined,
  FormOutlined,
  UserOutlined,
  BarChartOutlined,
  DashboardOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/contexts/auth-context";
import { usePageHeader } from "@/contexts/page-header-context";
import InviteModal from "@/components/InviteModal";
import Dashboard from "@/components/Dashboard";
import {
  getGroupMembers,
  getGroupRoles,
  getSentInvitations,
  cancelInvitation,
  updateMemberRole,
  createGroupRole,
  updateGroupRole,
  deleteGroupRole,
  updateGroup,
  deleteGroup,
  leaveGroup,
  transferGroupOwnership,
  getGroupDetails,
  removeGroupMember,
  GroupMemberWithDetails,
  InvitationWithDetails,
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
  name?: string;
  can_invite: boolean;
  can_manage_roles: boolean;
  can_create_form: boolean;
  can_delete_form: boolean;
}

interface UpdateGroupFormValues {
  name: string;
  description?: string;
  image_url?: string;
}

interface TransferOwnershipFormValues {
  newOwnerId: string;
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
  const [sentInvitations, setSentInvitations] = useState<InvitationWithDetails[]>([]);
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<GroupRole | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");

  const [roleForm] = Form.useForm();
  const [settingsForm] = Form.useForm();
  const [transferForm] = Form.useForm();
  const userRole = members.find((m) => m.users?.id === user?.id)?.group_roles;
  const isOwner = group?.owner_id === user?.id;

  // handleLeaveGroup를 useCallback으로 선언
  const handleLeaveGroup = useCallback(async () => {
    if (!user || !group) return;
    try {
      const result = await leaveGroup(groupId, user.id);
      if (result.success) {
        messageApi.success("그룹에서 나갔습니다.");
        router.push("/groups");
      } else {
        messageApi.error(result.error || "그룹 나가기에 실패했습니다.");
      }
    } catch (error) {
      messageApi.error("그룹 나가기 중 오류가 발생했습니다.");
    }
  }, [user, group, groupId, messageApi, router]);

  // 페이지 헤더 설정
  useEffect(() => {
    if (group) {
      setPageHeader({
        title: group.name || "그룹 이름",
        subtitle: group.description || "그룹 설명",
        backUrl: "/groups",
        actions: (
          <Space>
            <Button icon={<SettingOutlined />} onClick={() => setSettingsModalVisible(true)}>
              그룹 설정
            </Button>
            {!isOwner && (
              <Button danger icon={<LogoutOutlined />} onClick={handleLeaveGroup}>
                나가기
              </Button>
            )}
          </Space>
        ),
      });
    }

    return () => setPageHeader(null);
  }, [group, setPageHeader, handleLeaveGroup, isOwner]);

  const loadGroupData = useCallback(async () => {
    if (!user || !groupId) return;

    setLoading(true);
    try {
      const [groupResult, membersResult, rolesResult, classesResult, invitationsResult] =
        await Promise.all([
          getGroupDetails(groupId, user.id),
          getGroupMembers(groupId, user.id),
          getGroupRoles(groupId, user.id),
          getAllClasses(groupId, user.id),
          getSentInvitations(groupId, user.id),
        ]);

      if (groupResult.success && groupResult.data) {
        setGroup(groupResult.data);

        // 설정 폼 초기값 설정
        settingsForm.setFieldsValue({
          name: groupResult.data.name,
          description: groupResult.data.description,
          image_url: groupResult.data.image_url,
        });
      }

      if (membersResult.success) {
        setMembers(membersResult.data || []);
      }

      if (rolesResult.success) {
        setRoles(rolesResult.data || []);
      }

      if (classesResult.success) {
        setClasses(classesResult.data || []);
      }

      if (invitationsResult.success) {
        setSentInvitations(invitationsResult.data || []);
      }
    } catch (error) {
      messageApi.error("그룹 정보를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [user, groupId, settingsForm, messageApi]);

  useEffect(() => {
    if (!user) {
      router.push("/auth");
      return;
    }
    loadGroupData();
  }, [user, groupId, loadGroupData, router]);

  // 멤버 제거 (owner만 가능)
  const handleRemoveMember = async (memberUserId: string, memberName: string) => {
    if (!user || !isOwner) return;

    try {
      const result = await removeGroupMember(groupId, memberUserId, user.id);

      if (result.success) {
        messageApi.success(`${memberName}님이 그룹에서 제거되었습니다.`);
        loadGroupData();
      } else {
        messageApi.error(result.error || "멤버 제거에 실패했습니다.");
      }
    } catch (error) {
      messageApi.error("멤버 제거 중 오류가 발생했습니다.");
    }
  };

  // 초대 취소
  const handleCancelInvitation = async (invitationId: string, inviteeInfo: string) => {
    if (!user) return;

    try {
      const result = await cancelInvitation(invitationId, user.id);

      if (result.success) {
        messageApi.success(`${inviteeInfo}님에 대한 초대가 취소되었습니다.`);
        loadGroupData();
      } else {
        messageApi.error(result.error || "초대 취소에 실패했습니다.");
      }
    } catch (error) {
      messageApi.error("초대 취소 중 오류가 발생했습니다.");
    }
  };

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

  // 그룹 정보 수정
  const handleUpdateGroup = async (values: UpdateGroupFormValues) => {
    if (!user || !group) return;

    try {
      const result = await updateGroup(groupId, user.id, {
        name: values.name,
        description: values.description,
        image_url: values.image_url,
      });

      if (result.success) {
        messageApi.success("그룹 정보가 성공적으로 수정되었습니다!");
        setSettingsModalVisible(false);
        loadGroupData();
      } else {
        messageApi.error(result.error || "그룹 정보 수정에 실패했습니다.");
      }
    } catch (error) {
      messageApi.error("그룹 정보 수정 중 오류가 발생했습니다.");
    }
  };

  // 그룹 삭제
  const handleDeleteGroup = async () => {
    if (!user || !group) return;

    try {
      const result = await deleteGroup(groupId, user.id);

      if (result.success) {
        messageApi.success("그룹이 성공적으로 삭제되었습니다.");
        router.push("/groups");
      } else {
        messageApi.error(result.error || "그룹 삭제에 실패했습니다.");
      }
    } catch (error) {
      messageApi.error("그룹 삭제 중 오류가 발생했습니다.");
    }
  };

  // 소유권 이전
  const handleTransferOwnership = async (values: TransferOwnershipFormValues) => {
    if (!user || !group) return;

    try {
      const result = await transferGroupOwnership(groupId, user.id, values.newOwnerId);

      if (result.success) {
        messageApi.success("그룹 소유권이 성공적으로 이전되었습니다!");
        setTransferModalVisible(false);
        transferForm.resetFields();
        await loadGroupData();
        setSettingsModalVisible(false);
      } else {
        messageApi.error(result.error || "소유권 이전에 실패했습니다.");
      }
    } catch (error) {
      messageApi.error("소유권 이전 중 오류가 발생했습니다.");
    }
  };

  // 날짜 포맷팅
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

  // 만료 확인
  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  // 만료까지 남은 일수
  const getDaysUntilExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
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
        const isOwnerRole = role?.name === "owner";
        const isCurrentUser = record.users?.id === user?.id;

        return (
          <Space>
            <Tag color={isOwnerRole ? "gold" : "blue"}>
              {isOwnerRole && <CrownOutlined />} {role?.name}
            </Tag>
            {userRole?.can_manage_roles && !isOwnerRole && !isCurrentUser && (
              <Select
                size="small"
                value={role?.id}
                style={{ width: 120 }}
                onChange={(value: string) => handleChangeRole(record.id, value)}
              >
                {roles
                  .filter((r) => r.name !== "owner")
                  .map((r) => (
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
    {
      title: "작업",
      key: "actions",
      render: (_: unknown, record: GroupMemberWithDetails) => {
        const isOwnerRole = record.group_roles?.name === "owner";
        const isCurrentUser = record.users?.id === user?.id;

        if (isOwnerRole || isCurrentUser) {
          return null;
        }

        return (
          isOwner && (
            <Popconfirm
              title={`${record.users?.name}님을 그룹에서 제거하시겠습니까?`}
              description="이 작업은 되돌릴 수 없습니다."
              onConfirm={() => handleRemoveMember(record.users?.id || "", record.users?.name || "")}
              icon={<ExclamationCircleOutlined style={{ color: "red" }} />}
            >
              <Button size="small" danger icon={<UserDeleteOutlined />}>
                제거
              </Button>
            </Popconfirm>
          )
        );
      },
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
          return (
            <Space>
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => {
                  setEditingRole(record);
                }}
                disabled={!userRole?.can_manage_roles}
              >
                이름 수정
              </Button>
              <span className="text-gray-400">기본 역할</span>
            </Space>
          );
        }

        if (!userRole?.can_manage_roles) {
          return null;
        }

        const currentUserRole = members.find((m) => m.users?.id === user?.id)?.group_roles;
        const isEditingOwnRole = currentUserRole?.id === record.id;

        return (
          <Space>
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => setEditingRole(record)}
              disabled={isEditingOwnRole}
              title={isEditingOwnRole ? "자신의 역할은 수정할 수 없습니다" : ""}
            >
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

  // 초대 목록 컬럼
  const invitationsColumns = [
    {
      title: "초대 대상",
      key: "invitee",
      render: (_: unknown, record: InvitationWithDetails) => (
        <div>
          <div className="font-medium">
            {record.invitee_email ? (
              <Space>
                <MailOutlined />
                {record.invitee_email}
              </Space>
            ) : (
              <Space>
                <PhoneOutlined />
                {record.invitee_phone}
              </Space>
            )}
          </div>
        </div>
      ),
    },
    {
      title: "역할",
      dataIndex: "group_roles",
      key: "role",
      render: (role: InvitationWithDetails["group_roles"]) => <Tag color="blue">{role?.name}</Tag>,
    },
    {
      title: "상태",
      key: "status",
      render: (_: unknown, record: InvitationWithDetails) => {
        const expired = isExpired(record.expires_at);
        const daysUntilExpiry = getDaysUntilExpiry(record.expires_at);
        const urgent = daysUntilExpiry !== null && daysUntilExpiry <= 2 && daysUntilExpiry > 0;

        if (expired) {
          return <Tag color="red">만료됨</Tag>;
        } else if (urgent) {
          return <Tag color="orange">긴급 ({daysUntilExpiry}일 남음)</Tag>;
        } else {
          return <Tag color="green">대기 중</Tag>;
        }
      },
    },
    {
      title: "초대일",
      dataIndex: "created_at",
      key: "created_at",
      render: (date: string) => formatDate(date),
    },
    {
      title: "만료일",
      dataIndex: "expires_at",
      key: "expires_at",
      render: (date: string) => formatDate(date),
    },
    {
      title: "작업",
      key: "actions",
      render: (_: unknown, record: InvitationWithDetails) => {
        if (userRole?.can_invite || record.inviter_id === user?.id) {
          return (
            <Popconfirm
              title="이 초대를 취소하시겠습니까?"
              onConfirm={() =>
                handleCancelInvitation(record.id, record.invitee_email || record.invitee_phone)
              }
            >
              <Button size="small" danger icon={<CloseOutlined />}>
                취소
              </Button>
            </Popconfirm>
          );
        }
        return null;
      },
    },
  ];

  // 활성 초대와 만료된 초대 분류
  const activeInvitations = sentInvitations.filter((inv) => !isExpired(inv.expires_at));
  const expiredInvitations = sentInvitations.filter((inv) => isExpired(inv.expires_at));

  const tabItems = [
    {
      key: "dashboard",
      label: (
        <span>
          <DashboardOutlined />
          대시보드
        </span>
      ),
      children: (
        <Dashboard
          groupId={groupId}
          userId={user?.id || ""}
          isOwner={isOwner}
          activeTab={activeTab}
        />
      ),
    },
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
    {
      key: "invitations",
      label: (
        <Space>
          <MailOutlined />
          초대
          {activeInvitations.length > 0 && <Badge count={activeInvitations.length} size="small" />}
        </Space>
      ),
      children: (
        <div>
          <div className="mb-4 flex justify-between">
            <h3 className="text-lg font-medium">보낸 초대</h3>
            {userRole?.can_invite && (
              <Button
                type="primary"
                icon={<UserAddOutlined />}
                onClick={() => setInviteModalVisible(true)}
              >
                새 초대 보내기
              </Button>
            )}
          </div>

          {/* 활성 초대 */}
          {activeInvitations.length > 0 && (
            <div className="mb-6">
              <h4 className="text-md font-medium mb-3 text-green-600">
                <ClockCircleOutlined className="mr-2" />
                대기 중인 초대 ({activeInvitations.length})
              </h4>
              <Table
                columns={invitationsColumns}
                dataSource={activeInvitations}
                rowKey="id"
                pagination={false}
                size="small"
              />
            </div>
          )}

          {/* 만료된 초대 */}
          {expiredInvitations.length > 0 && (
            <div>
              <h4 className="text-md font-medium mb-3 text-red-500">
                <ClockCircleOutlined className="mr-2" />
                만료된 초대 ({expiredInvitations.length})
              </h4>
              <Table
                columns={invitationsColumns.filter((col) => col.key !== "actions")}
                dataSource={expiredInvitations}
                rowKey="id"
                pagination={false}
                size="small"
                className="opacity-60"
              />
            </div>
          )}

          {sentInvitations.length === 0 && (
            <Empty description="보낸 초대가 없습니다.">
              {userRole?.can_invite && (
                <Button
                  type="primary"
                  icon={<UserAddOutlined />}
                  onClick={() => setInviteModalVisible(true)}
                >
                  첫 번째 초대 보내기
                </Button>
              )}
            </Empty>
          )}
        </div>
      ),
    },
    {
      key: "overview",
      label: (
        <span>
          <TeamOutlined />
          개요
        </span>
      ),
      children: (
        <div className="space-y-6">
          {/* 기존 개요 내용 */}

          {/* 빠른 액세스 카드 추가 */}
          <Card title="빠른 액세스" className="mb-6">
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={8}>
                <Card
                  hoverable
                  className="h-full cursor-pointer"
                  onClick={() => router.push(`/groups/${groupId}/forms`)}
                >
                  <div className="text-center">
                    <FormOutlined className="text-3xl text-blue-500 mb-2" />
                    <h3 className="font-medium">폼 관리</h3>
                    <p className="text-sm text-gray-600 mt-1">폼 생성, 전송, 응답 관리</p>
                  </div>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Card
                  hoverable
                  className="h-full cursor-pointer"
                  onClick={() => router.push(`/groups/${groupId}/reports`)}
                >
                  <div className="text-center">
                    <FileTextOutlined className="text-3xl text-green-500 mb-2" />
                    <h3 className="font-medium">보고서</h3>
                    <p className="text-sm text-gray-600 mt-1">보고서 진행 상황 및 관리</p>
                  </div>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Card
                  hoverable
                  className="h-full cursor-pointer"
                  onClick={() => router.push(`/groups/${groupId}/concept-template`)}
                >
                  <div className="text-center">
                    <BarChartOutlined
                      className="text-purple-500 mb-2"
                      style={{ fontSize: "24px" }}
                    />
                    <h3 className="font-medium">개념 템플릿</h3>
                    <p className="text-sm text-gray-600 mt-1">시험 개념 템플릿 관리</p>
                  </div>
                </Card>
              </Col>
            </Row>
          </Card>
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
          <Tabs
            defaultActiveKey="dashboard"
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
          />
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
                name: editingRole.name,
                can_invite: editingRole.can_invite,
                can_manage_roles: editingRole.can_manage_roles,
                can_create_form: editingRole.can_create_form,
                can_delete_form: editingRole.can_delete_form,
              }}
              onFinish={(values: UpdateRoleFormValues) => handleUpdateRole(editingRole.id, values)}
            >
              <Form.Item
                name="name"
                label="역할 이름"
                rules={[{ required: true, message: "역할 이름을 입력해주세요!" }]}
              >
                <Input placeholder="역할 이름" />
              </Form.Item>

              {/* 기본 역할(owner, member)은 권한 수정 불가 */}
              {editingRole.name !== "owner" && editingRole.name !== "member" && (
                <>
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
                </>
              )}

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

        {/* 그룹 설정 모달 */}
        <Modal
          title="그룹 설정"
          open={settingsModalVisible}
          onCancel={() => setSettingsModalVisible(false)}
          footer={null}
          width={600}
          destroyOnHidden
        >
          {isOwner ? (
            <Tabs
              items={[
                {
                  key: "info",
                  label: "그룹 정보",
                  children: (
                    <Form form={settingsForm} layout="vertical" onFinish={handleUpdateGroup}>
                      <Form.Item
                        name="name"
                        label="그룹 이름"
                        rules={[{ required: true, message: "그룹 이름을 입력해주세요!" }]}
                      >
                        <Input placeholder="그룹 이름" />
                      </Form.Item>

                      <Form.Item name="description" label="설명">
                        <Input.TextArea rows={3} placeholder="그룹 설명" />
                      </Form.Item>

                      <Form.Item name="image_url" label="이미지 URL">
                        <Input placeholder="https://example.com/image.jpg" />
                      </Form.Item>

                      <Form.Item>
                        <Button type="primary" htmlType="submit">
                          정보 수정
                        </Button>
                      </Form.Item>
                    </Form>
                  ),
                },
                {
                  key: "transfer",
                  label: "소유권 이전",
                  children: (
                    <div>
                      <p className="text-gray-600 mb-4">
                        그룹의 소유권을 다른 멤버에게 이전할 수 있습니다.
                      </p>
                      <Form
                        form={transferForm}
                        layout="vertical"
                        onFinish={handleTransferOwnership}
                      >
                        <Form.Item
                          name="newOwnerId"
                          label="새 소유자"
                          rules={[{ required: true, message: "새 소유자를 선택해주세요!" }]}
                        >
                          <Select placeholder="새 소유자를 선택하세요">
                            {members
                              .filter((member) => member.users?.id !== user?.id)
                              .map((member) => (
                                <Select.Option key={member.users?.id} value={member.users?.id}>
                                  {member.users?.name} (@{member.users?.nickname})
                                </Select.Option>
                              ))}
                          </Select>
                        </Form.Item>

                        <Form.Item>
                          <Button type="primary" danger htmlType="submit">
                            소유권 이전
                          </Button>
                        </Form.Item>
                      </Form>
                    </div>
                  ),
                },
                {
                  key: "danger",
                  label: "위험 구역",
                  children: (
                    <div className="space-y-4">
                      <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                        <h3 className="text-lg font-semibold text-red-600 mb-2">그룹 삭제</h3>
                        <p className="text-sm text-red-600 mb-4">
                          이 작업은 되돌릴 수 없습니다. 모든 데이터가 삭제됩니다.
                        </p>
                        <Popconfirm
                          title="정말 이 그룹을 삭제하시겠습니까?"
                          description="이 작업은 되돌릴 수 없습니다."
                          onConfirm={handleDeleteGroup}
                        >
                          <Button danger>그룹 삭제</Button>
                        </Popconfirm>
                      </div>
                    </div>
                  ),
                },
              ]}
            />
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">그룹 정보</h3>
                <div className="bg-gray-50 p-4 rounded">
                  <p>
                    <strong>이름:</strong> {group?.name}
                  </p>
                  <p>
                    <strong>설명:</strong> {group?.description || "설명이 없습니다."}
                  </p>
                </div>
              </div>

              <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                <h3 className="text-lg font-semibold text-orange-600 mb-2">그룹 나가기</h3>
                <p className="text-sm text-orange-600 mb-4">
                  그룹에서 나가면 다시 초대를 받아야 참여할 수 있습니다.
                </p>
                <Popconfirm
                  title="정말 그룹에서 나가시겠습니까?"
                  description="다시 참여하려면 초대를 받아야 합니다."
                  onConfirm={handleLeaveGroup}
                >
                  <Button danger>그룹 나가기</Button>
                </Popconfirm>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}
