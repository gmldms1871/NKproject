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
  Divider,
} from "antd";
import {
  PlusOutlined,
  TeamOutlined,
  SearchOutlined,
  FilterOutlined,
  UserOutlined,
  CalendarOutlined,
  TagOutlined,
  ClearOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/contexts/auth-context";
import { usePageHeader } from "@/contexts/page-header-context";
import {
  getAllClasses,
  searchClasses,
  filterClasses,
  searchClassesByTag,
  createClass,
  getGroupClassTags,
  getAllAvailableTags,
  ClassWithDetails,
  ClassSearchConditions,
  ClassFilterConditions,
} from "@/lib/classes";
import { EDUCATION_LEVELS, EducationLevel } from "@/lib/supabase";
import { Database } from "@/lib/types/types";

// 타입 정의
type ClassTag = Database["public"]["Tables"]["class_tags"]["Row"];

interface CreateClassFormValues {
  name: string;
  description?: string;
  tags: (string | { label: string; value: string })[];
  existingTags?: string[];
}

interface SearchFilterFormValues {
  searchName?: string;
  searchUserId?: string;
  searchTagName?: string;
  filterEducation?: EducationLevel[];
  filterCreatedAfter?: string;
  filterCreatedBefore?: string;
  filterByTag?: string;
}

export default function ClassesListPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const { setPageHeader } = usePageHeader();
  const { message: messageApi } = App.useApp();
  const groupId = params.id as string;

  const [classes, setClasses] = useState<ClassWithDetails[]>([]);
  const [tags, setTags] = useState<ClassTag[]>([]);
  const [allAvailableTags, setAllAvailableTags] = useState<ClassTag[]>([]);
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

  // 반 목록과 태그 로드
  const loadClassesAndTags = useCallback(async () => {
    if (!user || !groupId) return;

    setLoading(true);
    try {
      const [classesResult, tagsResult, allTagsResult] = await Promise.all([
        getAllClasses(groupId, user.id),
        getGroupClassTags(groupId, user.id),
        getAllAvailableTags(groupId, user.id),
      ]);

      if (classesResult.success) {
        setClasses(classesResult.data || []);
      } else {
        messageApi.error(classesResult.error || "반 목록을 불러오는데 실패했습니다.");
      }

      if (tagsResult.success) {
        setTags(tagsResult.data || []);
      } else {
        messageApi.error(tagsResult.error || "반 태그를 불러오는데 실패했습니다.");
      }

      if (allTagsResult.success) {
        setAllAvailableTags(allTagsResult.data || []);
      } else {
        messageApi.error(allTagsResult.error || "전체 태그를 불러오는데 실패했습니다.");
      }
    } catch (error) {
      messageApi.error("데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [user, groupId, messageApi]);

  useEffect(() => {
    if (!user) {
      router.push("/auth");
      return;
    }
    loadClassesAndTags();
  }, [user, groupId, loadClassesAndTags, router]);

  // 반 생성
  const handleCreateClass = async (values: CreateClassFormValues) => {
    if (!user) return;

    setCreateLoading(true);
    try {
      // 태그 처리 - 공백 제거 및 필터링
      const tags = Array.isArray(values.tags)
        ? values.tags
            .map((tag) => {
              if (typeof tag === "string") return tag.trim();
              if (typeof tag === "object" && tag.label) return tag.label.trim();
              if (typeof tag === "object" && tag.value) return tag.value.trim();
              return String(tag).trim();
            })
            .filter((tag) => tag && tag.length > 0) // 빈 문자열 제거
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
        loadClassesAndTags();
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

      // 태그별 검색이 선택된 경우
      if (values.filterByTag) {
        const selectedTag = tags.find((tag) => tag.id === values.filterByTag);
        if (selectedTag) {
          result = await searchClassesByTag(groupId, selectedTag.name, user.id);
        } else {
          messageApi.error("선택한 태그를 찾을 수 없습니다.");
          setLoading(false);
          return;
        }
      }
      // 일반 검색 조건이 있으면 검색 API 사용
      else if (values.searchName || values.searchUserId || values.searchTagName) {
        const searchConditions: ClassSearchConditions = {
          groupId,
          name: values.searchName,
          userId: values.searchUserId,
          tagName: values.searchTagName,
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
    loadClassesAndTags();
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
  const allClassTags = classes.flatMap((cls) => cls.class_tags);
  const uniqueTags = new Set(allClassTags.map((tag) => tag.name)).size;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 통계 카드 */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} sm={6}>
            <Card>
              <Statistic title="총 반 수" value={classes.length} prefix={<TeamOutlined />} />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic title="총 구성원" value={totalMembers} prefix={<UserOutlined />} />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="평균 구성원"
                value={avgMembersPerClass}
                suffix="명/반"
                prefix={<UserOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic title="반 태그 수" value={tags.length} prefix={<TagOutlined />} />
            </Card>
          </Col>
        </Row>

        {/* 검색/필터 영역 */}
        {searchFilterVisible && (
          <Card className="mb-6" title="검색 및 필터">
            <Form form={searchFilterForm} layout="vertical" onFinish={handleSearchFilter}>
              <Row gutter={[16, 16]}>
                {/* 검색 조건 */}
                <Col xs={24} md={8}>
                  <Form.Item name="searchName" label="반 이름 검색">
                    <Input placeholder="반 이름으로 검색" prefix={<SearchOutlined />} />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item name="searchTagName" label="태그 이름 검색">
                    <Input placeholder="태그 이름으로 검색" prefix={<TagOutlined />} />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item name="filterByTag" label="특정 태그로 필터링">
                    <Select placeholder="태그 선택" allowClear showSearch>
                      {tags.map((tag) => (
                        <Select.Option key={tag.id} value={tag.id}>
                          <Tag color="blue">{tag.name}</Tag>
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Divider />

              <Row gutter={[16, 16]}>
                {/* 고급 필터 */}
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
                  <Form.Item name="filterCreatedAfter" label="생성일 이후">
                    <Input type="date" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item name="filterCreatedBefore" label="생성일 이전">
                    <Input type="date" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 16]}>
                <Col xs={24}>
                  <Space>
                    <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                      검색/필터 적용
                    </Button>
                    <Button onClick={handleResetSearch} icon={<ClearOutlined />}>
                      초기화
                    </Button>
                  </Space>
                </Col>
              </Row>
            </Form>
          </Card>
        )}

        {/* 태그 빠른 필터 */}
        {tags.length > 0 && (
          <Card className="mb-6" size="small">
            <div className="flex items-center space-x-2 mb-2">
              <TagOutlined />
              <span className="font-medium">빠른 태그 필터:</span>
            </div>
            <Space wrap>
              <Button size="small" onClick={() => loadClassesAndTags()}>
                전체
              </Button>
              {tags.map((tag) => (
                <Button
                  key={tag.id}
                  size="small"
                  type="dashed"
                  onClick={() => {
                    searchFilterForm.setFieldValue("filterByTag", tag.id);
                    handleSearchFilter({ filterByTag: tag.id });
                  }}
                >
                  {tag.name}
                </Button>
              ))}
            </Space>
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
          width={600}
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

            <Divider>태그 설정</Divider>

            <Form.Item name="tags" label="태그">
              <Select
                mode="tags"
                placeholder="태그를 입력하거나 선택하세요 (Enter로 새 태그 추가)"
                style={{ width: "100%" }}
                tokenSeparators={[","]}
                filterOption={(input, option) => {
                  if (option?.label && typeof option.label === "string") {
                    return option.label.toLowerCase().includes(input.toLowerCase());
                  }
                  return false;
                }}
                onInputKeyDown={(e) => {
                  if (e.key === "Enter" && e.currentTarget.value.trim() === "") {
                    e.preventDefault();
                  }
                }}
              >
                {allAvailableTags.map((tag) => (
                  <Select.Option key={tag.id} value={tag.name} label={tag.name}>
                    <Tag color="blue">{tag.name}</Tag>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <div className="text-xs text-gray-500 mb-4">
              * 기존 태그를 선택하거나 새 태그를 입력할 수 있습니다.
              <br />* 공백만으로는 태그를 생성할 수 없습니다.
              <br />* 동일한 이름의 태그가 있으면 기존 태그를 사용합니다.
            </div>

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
