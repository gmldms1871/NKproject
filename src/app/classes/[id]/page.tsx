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
  Empty,
  Spin,
  App,
  Switch,
} from "antd";
import {
  UserAddOutlined,
  UserDeleteOutlined,
  SettingOutlined,
  SearchOutlined,
  TeamOutlined,
  FilterOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/contexts/auth-context";
import { usePageHeader } from "@/contexts/page-header-context";
import {
  getClassDetails,
  getClassMembers,
  searchClassMembers,
  addClassMember,
  removeClassMember,
  updateClass,
  deleteClass,
  getClassTags,
  ClassWithDetails,
  ClassMemberWithDetails,
  ClassMemberSearchConditions,
} from "@/lib/classes";
import { getGroupMembers, GroupMemberWithDetails } from "@/lib/groups";
import { EDUCATION_LEVELS, EducationLevel } from "@/lib/supabase";
import { Database } from "@/lib/types/types";

// 타입 정의
type ClassTag = Database["public"]["Tables"]["class_tags"]["Row"];

interface UpdateClassFormValues {
  name: string;
  description?: string;
  tags: (string | { label: string; value: string })[];
}

interface AddMemberFormValues {
  userId: string;
}

interface SearchFormValues {
  name?: string;
  education?: EducationLevel[];
}

export default function ClassDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const { setPageHeader } = usePageHeader();
  const { message: messageApi } = App.useApp();
  const classId = params.id as string;

  const [classDetails, setClassDetails] = useState<ClassWithDetails | null>(null);
  const [classMembers, setClassMembers] = useState<ClassMemberWithDetails[]>([]);
  const [classTags, setClassTags] = useState<ClassTag[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMemberWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [addMemberModalVisible, setAddMemberModalVisible] = useState(false);
  const [editClassModalVisible, setEditClassModalVisible] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);

  const [addMemberForm] = Form.useForm();
  const [editClassForm] = Form.useForm();
  const [searchForm] = Form.useForm();

  // 페이지 헤더 설정
  useEffect(() => {
    if (classDetails) {
      setPageHeader({
        title: classDetails.name,
        subtitle: `${classDetails.description || "반 설명"} • 구성원 ${classDetails.memberCount}명`,
        backUrl: "/groups",
        breadcrumb: [
          { title: "그룹", href: "/groups" },
          { title: classDetails.groups?.name || "그룹", href: `/groups/${classDetails.group_id}` },
          { title: classDetails.name },
        ],
        actions: (
          <Space>
            <Button icon={<SearchOutlined />} onClick={() => setSearchVisible(!searchVisible)}>
              검색/필터
            </Button>
            <Button icon={<UserAddOutlined />} onClick={() => setAddMemberModalVisible(true)}>
              구성원 추가
            </Button>
            <Button icon={<SettingOutlined />} onClick={() => setEditClassModalVisible(true)}>
              반 설정
            </Button>
          </Space>
        ),
      });
    }

    return () => setPageHeader(null);
  }, [classDetails, setPageHeader, searchVisible]);

  // 반 데이터 로드
  const loadClassData = useCallback(async () => {
    if (!user || !classId) return;

    setLoading(true);
    try {
      const [detailsResult, membersResult, tagsResult] = await Promise.all([
        getClassDetails(classId, user.id),
        getClassMembers(classId, user.id),
        getClassTags(classId, user.id),
      ]);

      if (detailsResult.success) {
        setClassDetails(detailsResult.data || null);

        // 그룹 멤버 조회 (구성원 추가용)
        if (detailsResult.data?.group_id) {
          const groupMembersResult = await getGroupMembers(detailsResult.data.group_id, user.id);
          if (groupMembersResult.success) {
            setGroupMembers(groupMembersResult.data || []);
          }
        }
      }

      if (membersResult.success) {
        setClassMembers(membersResult.data || []);
      }

      if (tagsResult.success) {
        setClassTags(tagsResult.data || []);
      }

      // 편집 폼 초기값 설정
      if (detailsResult.success && detailsResult.data) {
        editClassForm.setFieldsValue({
          name: detailsResult.data.name,
          description: detailsResult.data.description,
          tags: (tagsResult.data || []).map((tag) => tag.name),
        });
      }
    } catch (error) {
      messageApi.error("반 정보를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [user, classId, messageApi, editClassForm]);

  // 구성원 검색
  const handleSearchMembers = async (values: SearchFormValues) => {
    if (!user || !classId) return;

    setMembersLoading(true);
    try {
      const searchConditions: ClassMemberSearchConditions = {
        classId,
        name: values.name,
        education: values.education,
      };

      const result = await searchClassMembers(searchConditions, user.id);

      if (result.success) {
        setClassMembers(result.data || []);
        messageApi.success(`${result.data?.length || 0}명의 구성원을 찾았습니다.`);
      } else {
        messageApi.error(result.error || "구성원 검색에 실패했습니다.");
      }
    } catch (error) {
      messageApi.error("구성원 검색 중 오류가 발생했습니다.");
    } finally {
      setMembersLoading(false);
    }
  };

  // 검색 초기화
  const handleResetSearch = async () => {
    searchForm.resetFields();
    await loadClassMembers();
  };

  // 구성원 목록만 다시 로드
  const loadClassMembers = async () => {
    if (!user || !classId) return;

    setMembersLoading(true);
    try {
      const result = await getClassMembers(classId, user.id);
      if (result.success) {
        setClassMembers(result.data || []);
      }
    } catch (error) {
      messageApi.error("구성원 목록을 불러오는데 실패했습니다.");
    } finally {
      setMembersLoading(false);
    }
  };

  // 구성원 추가
  const handleAddMember = async (values: AddMemberFormValues) => {
    if (!user) return;

    try {
      const result = await addClassMember(classId, values.userId, user.id);

      if (result.success) {
        messageApi.success("구성원이 성공적으로 추가되었습니다!");
        setAddMemberModalVisible(false);
        addMemberForm.resetFields();
        loadClassData(); // 전체 데이터 다시 로드
      } else {
        messageApi.error(result.error || "구성원 추가에 실패했습니다.");
      }
    } catch (error) {
      messageApi.error("구성원 추가 중 오류가 발생했습니다.");
    }
  };

  // 구성원 제거
  const handleRemoveMember = async (memberUserId: string, memberName: string) => {
    if (!user) return;

    try {
      const result = await removeClassMember(classId, memberUserId, user.id);

      if (result.success) {
        messageApi.success(`${memberName}님이 반에서 제거되었습니다.`);
        loadClassData(); // 전체 데이터 다시 로드
      } else {
        messageApi.error(result.error || "구성원 제거에 실패했습니다.");
      }
    } catch (error) {
      messageApi.error("구성원 제거 중 오류가 발생했습니다.");
    }
  };

  // 반 정보 수정
  const handleUpdateClass = async (values: UpdateClassFormValues) => {
    if (!user) return;

    try {
      // tags 값을 안전하게 문자열 배열로 변환
      const tags = Array.isArray(values.tags)
        ? values.tags.map((tag) => {
            if (typeof tag === "string") return tag;
            if (typeof tag === "object" && tag.label) return tag.label;
            if (typeof tag === "object" && tag.value) return tag.value;
            return String(tag);
          })
        : [];

      const result = await updateClass(classId, user.id, {
        name: values.name,
        description: values.description,
        tags: tags,
      });

      if (result.success) {
        messageApi.success("반 정보가 성공적으로 수정되었습니다!");
        setEditClassModalVisible(false);
        loadClassData();
      } else {
        messageApi.error(result.error || "반 정보 수정에 실패했습니다.");
      }
    } catch (error) {
      messageApi.error("반 정보 수정 중 오류가 발생했습니다.");
    }
  };

  // 반 삭제
  const handleDeleteClass = async () => {
    if (!user || !classDetails) return;

    try {
      const result = await deleteClass(classId, user.id);

      if (result.success) {
        messageApi.success("반이 성공적으로 삭제되었습니다.");
        router.push(`/groups/${classDetails.group_id}`);
      } else {
        messageApi.error(result.error || "반 삭제에 실패했습니다.");
      }
    } catch (error) {
      messageApi.error("반 삭제 중 오류가 발생했습니다.");
    }
  };

  useEffect(() => {
    if (!user) {
      router.push("/auth");
      return;
    }
    loadClassData();
  }, [user, classId, loadClassData, router]);

  // 테이블 컬럼 정의
  const membersColumns = [
    {
      title: "구성원",
      dataIndex: "users",
      key: "user",
      render: (user: ClassMemberWithDetails["users"]) => (
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
      title: "이메일",
      dataIndex: "users",
      key: "email",
      render: (user: ClassMemberWithDetails["users"]) => user?.email,
    },
    {
      title: "교육 수준",
      dataIndex: "users",
      key: "education",
      render: (user: ClassMemberWithDetails["users"]) => <Tag color="blue">{user?.education}</Tag>,
    },
    {
      title: "생년월일",
      dataIndex: "users",
      key: "birth_date",
      render: (user: ClassMemberWithDetails["users"]) =>
        user?.birth_date ? new Date(user.birth_date).toLocaleDateString() : "-",
    },
    {
      title: "추가일",
      dataIndex: "assigned_at",
      key: "assigned_at",
      render: (date: string | null) => (date ? new Date(date).toLocaleDateString() : "-"),
    },
    {
      title: "작업",
      key: "actions",
      render: (_: unknown, record: ClassMemberWithDetails) => (
        <Popconfirm
          title={`${record.users?.name}님을 반에서 제거하시겠습니까?`}
          onConfirm={() => handleRemoveMember(record.user_id || "", record.users?.name || "")}
        >
          <Button size="small" danger icon={<UserDeleteOutlined />}>
            제거
          </Button>
        </Popconfirm>
      ),
    },
  ];

  // 추가할 수 있는 그룹 멤버 (이미 반에 속하지 않은 멤버들)
  const availableMembers = groupMembers.filter(
    (groupMember) =>
      !classMembers.some((classMember) => classMember.user_id === groupMember.user_id)
  );

  const tabItems = [
    {
      key: "members",
      label: `구성원 (${classMembers.length})`,
      children: (
        <div>
          {/* 검색/필터 영역 */}
          {searchVisible && (
            <Card className="mb-4" size="small">
              <Form
                form={searchForm}
                layout="inline"
                onFinish={handleSearchMembers}
                className="w-full"
              >
                <Form.Item name="name" className="flex-1">
                  <Input placeholder="이름 또는 닉네임으로 검색" prefix={<SearchOutlined />} />
                </Form.Item>

                <Form.Item name="education">
                  <Select
                    mode="multiple"
                    placeholder="교육 수준 선택"
                    style={{ minWidth: 200 }}
                    allowClear
                  >
                    {Object.entries(EDUCATION_LEVELS).map(([key, value]) => (
                      <Select.Option key={key} value={value}>
                        {value}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                      검색
                    </Button>
                    <Button onClick={handleResetSearch}>초기화</Button>
                  </Space>
                </Form.Item>
              </Form>
            </Card>
          )}

          <Table
            columns={membersColumns}
            dataSource={classMembers}
            rowKey="id"
            loading={membersLoading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `총 ${total}명`,
            }}
          />
        </div>
      ),
    },
    {
      key: "info",
      label: "반 정보",
      children: (
        <Card>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">기본 정보</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">반 이름</label>
                  <p className="mt-1">{classDetails?.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">구성원 수</label>
                  <p className="mt-1">{classDetails?.memberCount}명</p>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">설명</label>
                  <p className="mt-1">{classDetails?.description || "설명이 없습니다."}</p>
                </div>
              </div>
            </div>

            {classTags.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-2">태그</h3>
                <Space wrap>
                  {classTags.map((tag) => (
                    <Tag key={tag.id} color="blue">
                      {tag.name}
                    </Tag>
                  ))}
                </Space>
              </div>
            )}

            <div>
              <h3 className="text-lg font-medium mb-2">생성일</h3>
              <p>
                {classDetails?.created_at
                  ? new Date(classDetails.created_at).toLocaleString()
                  : "-"}
              </p>
            </div>
          </div>
        </Card>
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <Spin size="large" />
            <p className="mt-4 text-gray-600">반 정보를 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!classDetails) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Empty description="반을 찾을 수 없습니다." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card>
          <Tabs defaultActiveKey="members" items={tabItems} />
        </Card>

        {/* 구성원 추가 모달 */}
        <Modal
          title="구성원 추가"
          open={addMemberModalVisible}
          onCancel={() => {
            setAddMemberModalVisible(false);
            addMemberForm.resetFields();
          }}
          footer={null}
          destroyOnClose
        >
          <Form form={addMemberForm} layout="vertical" onFinish={handleAddMember}>
            <Form.Item
              name="userId"
              label="추가할 그룹 멤버"
              rules={[{ required: true, message: "구성원을 선택해주세요!" }]}
            >
              <Select
                placeholder="그룹 멤버를 선택하세요"
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? option?.children ?? "")
                    .toString()
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
              >
                {availableMembers.map((member) => (
                  <Select.Option key={member.user_id} value={member.user_id}>
                    <Space>
                      <Avatar size="small" icon={<UserAddOutlined />} />
                      {member.users?.name} (@{member.users?.nickname})
                    </Space>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item>
              <Space>
                <Button onClick={() => setAddMemberModalVisible(false)}>취소</Button>
                <Button type="primary" htmlType="submit">
                  추가
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* 반 편집 모달 */}
        <Modal
          title="반 설정"
          open={editClassModalVisible}
          onCancel={() => {
            setEditClassModalVisible(false);
            editClassForm.resetFields();
          }}
          footer={null}
          width={600}
          destroyOnClose
        >
          <Form form={editClassForm} layout="vertical" onFinish={handleUpdateClass}>
            <Form.Item
              name="name"
              label="반 이름"
              rules={[{ required: true, message: "반 이름을 입력해주세요!" }]}
            >
              <Input placeholder="반 이름" />
            </Form.Item>

            <Form.Item name="description" label="설명">
              <Input.TextArea rows={3} placeholder="반에 대한 설명" />
            </Form.Item>

            <Form.Item name="tags" label="태그">
              <Select
                mode="tags"
                placeholder="태그를 입력하거나 선택하세요"
                style={{ width: "100%" }}
              >
                {classTags.map((tag) => (
                  <Select.Option key={tag.id} value={tag.name}>
                    {tag.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item>
              <Space className="w-full justify-between">
                <Popconfirm
                  title="정말 이 반을 삭제하시겠습니까?"
                  description="이 작업은 되돌릴 수 없습니다."
                  onConfirm={handleDeleteClass}
                >
                  <Button danger icon={<DeleteOutlined />}>
                    반 삭제
                  </Button>
                </Popconfirm>

                <Space>
                  <Button onClick={() => setEditClassModalVisible(false)}>취소</Button>
                  <Button type="primary" htmlType="submit">
                    저장
                  </Button>
                </Space>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </div>
  );
}
