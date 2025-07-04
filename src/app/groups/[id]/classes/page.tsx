"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  Button,
  Empty,
  Spin,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Tag,
  Avatar,
  Row,
  Col,
  Statistic,
  App,
} from "antd";
import {
  PlusOutlined,
  TeamOutlined,
  SearchOutlined,
  FilterOutlined,
  UserOutlined,
  CalendarOutlined,
  TagOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/contexts/auth-context";
import { usePageHeader } from "@/contexts/page-header-context";
import {
  getAllClasses,
  searchClasses,
  filterClasses,
  createClass,
  ClassWithDetails,
  ClassSearchConditions,
  ClassFilterConditions,
} from "@/lib/classes";
import { EDUCATION_LEVELS, EducationLevel } from "@/lib/supabase";

interface CreateClassFormValues {
  name: string;
  description?: string;
  tags: (string | { label: string; value: string })[];
}

interface SearchFilterFormValues {
  searchName?: string;
  searchUserId?: string;
  searchTagId?: string;
  filterEducation?: EducationLevel[];
  filterCreatedAfter?: string;
  filterCreatedBefore?: string;
}

export default function ClassesListPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const { setPageHeader } = usePageHeader();
  const { message: messageApi } = App.useApp();
  const groupId = params.id as string;

  const [classes, setClasses] = useState<ClassWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [searchFilterVisible, setSearchFilterVisible] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  const [createForm] = Form.useForm();
  const [searchFilterForm] = Form.useForm();

  // 페이지 헤더 설정
  useEffect(() => {
    setPageHeader({
      title: "반 관리",
      subtitle: `그룹의 반을 관리하고 구성원을 조직하세요`,
      backUrl: `/groups/${groupId}`,
      breadcrumb: [
        { title: "그룹", href: "/groups" },
        { title: "그룹 상세", href: `/groups/${groupId}` },
        { title: "반 관리" },
      ],
      actions: (
        <Space>
          <Button
            icon={<SearchOutlined />}
            onClick={() => setSearchFilterVisible(!searchFilterVisible)}
          >
            검색/필터
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            새 반 만들기
          </Button>
        </Space>
      ),
    });

    return () => setPageHeader(null);
  }, [setPageHeader, groupId, searchFilterVisible]);

  // 반 목록 로드
  const loadClasses = useCallback(async () => {
    if (!user || !groupId) return;

    setLoading(true);
    try {
      const result = await getAllClasses(groupId, user.id);

      if (result.success) {
        setClasses(result.data || []);
      } else {
        messageApi.error(result.error || "반 목록을 불러오는데 실패했습니다.");
      }
    } catch (error) {
      messageApi.error("반 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [user, groupId, messageApi]);

  useEffect(() => {
    if (!user) {
      router.push("/auth");
      return;
    }
    loadClasses();
  }, [user, groupId, loadClasses, router]);

  // 반 생성
  const handleCreateClass = async (values: CreateClassFormValues) => {
    if (!user) return;

    setCreateLoading(true);
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

      const result = await createClass(user.id, {
        name: values.name,
        description: values.description,
        groupId,
        tags: tags,
      });

      if (result.success) {
        messageApi.success("반이 성공적으로 생성되었습니다!");
        setCreateModalVisible(false);
        createForm.resetFields();
        loadClasses();
      } else {
        messageApi.error(result.error || "반 생성에 실패했습니다.");
      }
    } catch (error) {
      messageApi.error("반 생성 중 오류가 발생했습니다.");
    } finally {
      setCreateLoading(false);
    }
  };

  // 검색 및 필터
  const handleSearchFilter = async (values: SearchFilterFormValues) => {
    if (!user || !groupId) return;

    setLoading(true);
    try {
      let result;

      // 검색 조건이 있으면 검색 API 사용
      if (values.searchName || values.searchUserId || values.searchTagId) {
        const searchConditions: ClassSearchConditions = {
          groupId,
          name: values.searchName,
          userId: values.searchUserId,
          tagId: values.searchTagId,
        };
        result = await searchClasses(searchConditions, user.id);
      }
      // 필터 조건이 있으면 필터 API 사용
      else if (values.filterEducation || values.filterCreatedAfter || values.filterCreatedBefore) {
        const filterConditions: ClassFilterConditions = {
          groupId,
          education: values.filterEducation,
          createdAfter: values.filterCreatedAfter,
          createdBefore: values.filterCreatedBefore,
        };
        result = await filterClasses(filterConditions, user.id);
      }
      // 조건이 없으면 전체 조회
      else {
        result = await getAllClasses(groupId, user.id);
      }

      if (result.success) {
        setClasses(result.data || []);
        messageApi.success(`${result.data?.length || 0}개의 반을 찾았습니다.`);
      } else {
        messageApi.error(result.error || "검색/필터링에 실패했습니다.");
      }
    } catch (error) {
      messageApi.error("검색/필터링 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 검색/필터 초기화
  const handleResetSearch = () => {
    searchFilterForm.resetFields();
    loadClasses();
  };

  // 반 카드 컴포넌트
  const ClassCard = ({ classItem }: { classItem: ClassWithDetails }) => (
    <Card
      hoverable
      onClick={() => router.push(`/classes/${classItem.id}`)}
      className="h-full"
      cover={
        <div
          style={{
            height: 120,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f5f5f5",
            position: "relative",
          }}
        >
          <TeamOutlined style={{ fontSize: 32, color: "#d9d9d9" }} />
          <div
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              backgroundColor: "rgba(0,0,0,0.6)",
              color: "white",
              padding: "2px 8px",
              borderRadius: 4,
              fontSize: 12,
            }}
          >
            {classItem.memberCount}명
          </div>
        </div>
      }
      actions={[
        <UserOutlined key="members" title={`구성원 ${classItem.memberCount}명`} />,
        <CalendarOutlined
          key="created"
          title={`생성일: ${new Date(classItem.created_at || "").toLocaleDateString()}`}
        />,
        <TagOutlined key="tags" title={`태그 ${classItem.class_tags.length}개`} />,
      ]}
    >
      <Card.Meta
        title={
          <div className="flex items-center justify-between">
            <span className="truncate">{classItem.name}</span>
          </div>
        }
        description={
          <div className="space-y-2">
            <p className="text-sm text-gray-600 line-clamp-2">
              {classItem.description || "설명이 없습니다."}
            </p>

            {classItem.class_tags.length > 0 && (
              <div>
                <Space wrap size="small">
                  {classItem.class_tags.slice(0, 3).map((tag) => (
                    <Tag key={tag.id} color="blue">
                      {tag.name}
                    </Tag>
                  ))}
                  {classItem.class_tags.length > 3 && (
                    <Tag color="default">+{classItem.class_tags.length - 3}</Tag>
                  )}
                </Space>
              </div>
            )}

            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>구성원 {classItem.memberCount}명</span>
              <span>{new Date(classItem.created_at || "").toLocaleDateString()}</span>
            </div>
          </div>
        }
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

  // 통계 정보
  const totalMembers = classes.reduce((sum, cls) => sum + cls.memberCount, 0);
  const avgMembersPerClass = classes.length > 0 ? Math.round(totalMembers / classes.length) : 0;
  const allTags = classes.flatMap((cls) => cls.class_tags);
  const uniqueTags = new Set(allTags.map((tag) => tag.name)).size;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 통계 카드 */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} sm={8}>
            <Card>
              <Statistic title="총 반 수" value={classes.length} prefix={<TeamOutlined />} />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic title="총 구성원" value={totalMembers} prefix={<UserOutlined />} />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="평균 구성원"
                value={avgMembersPerClass}
                suffix="명/반"
                prefix={<UserOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* 검색/필터 영역 */}
        {searchFilterVisible && (
          <Card className="mb-6" title="검색 및 필터">
            <Form form={searchFilterForm} layout="vertical" onFinish={handleSearchFilter}>
              <Row gutter={[16, 16]}>
                <Col xs={24} md={8}>
                  <Form.Item name="searchName" label="반 이름 검색">
                    <Input placeholder="반 이름으로 검색" prefix={<SearchOutlined />} />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item name="filterEducation" label="교육 수준 필터">
                    <Select mode="multiple" placeholder="교육 수준 선택" allowClear>
                      {Object.entries(EDUCATION_LEVELS).map(([key, value]) => (
                        <Select.Option key={key} value={value}>
                          {value}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item label="작업">
                    <Space>
                      <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                        적용
                      </Button>
                      <Button onClick={handleResetSearch}>초기화</Button>
                    </Space>
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>
        )}

        {/* 반 목록 */}
        {loading ? (
          <div className="text-center py-12">
            <Spin size="large" />
            <p className="mt-4 text-gray-600">반 목록을 불러오는 중...</p>
          </div>
        ) : classes.length > 0 ? (
          <Row gutter={[16, 16]}>
            {classes.map((classItem) => (
              <Col key={classItem.id} xs={24} sm={12} lg={8} xl={6}>
                <ClassCard classItem={classItem} />
              </Col>
            ))}
          </Row>
        ) : (
          <Empty description="반이 없습니다." image={Empty.PRESENTED_IMAGE_SIMPLE}>
            <Button type="primary" onClick={() => setCreateModalVisible(true)}>
              첫 번째 반 만들기
            </Button>
          </Empty>
        )}

        {/* 반 생성 모달 */}
        <Modal
          title="새 반 만들기"
          open={createModalVisible}
          onCancel={() => {
            setCreateModalVisible(false);
            createForm.resetFields();
          }}
          footer={null}
          destroyOnClose
        >
          <Form form={createForm} layout="vertical" onFinish={handleCreateClass}>
            <Form.Item
              name="name"
              label="반 이름"
              rules={[
                { required: true, message: "반 이름을 입력해주세요!" },
                { max: 50, message: "반 이름은 50자 이하여야 합니다!" },
              ]}
            >
              <Input placeholder="예: 1학년 A반, 초급반" />
            </Form.Item>

            <Form.Item
              name="description"
              label="설명"
              rules={[{ max: 200, message: "설명은 200자 이하여야 합니다!" }]}
            >
              <Input.TextArea rows={3} placeholder="반에 대한 설명을 입력하세요" />
            </Form.Item>

            <Form.Item name="tags" label="태그 (선택사항)">
              <Select
                mode="tags"
                placeholder="태그를 입력하세요 (Enter로 추가)"
                style={{ width: "100%" }}
              />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button onClick={() => setCreateModalVisible(false)}>취소</Button>
                <Button type="primary" htmlType="submit" loading={createLoading}>
                  반 만들기
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </div>
  );
}
