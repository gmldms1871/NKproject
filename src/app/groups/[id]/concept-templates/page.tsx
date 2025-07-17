"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Select,
  Modal,
  Form,
  Tag,
  message,
  Popconfirm,
  Badge,
  Tooltip,
  Empty,
  Spin,
  InputNumber,
  Alert,
  Dropdown,
  Switch,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  CopyOutlined,
  DeleteOutlined,
  BookOutlined,
  EyeOutlined,
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  SaveOutlined,
  FileTextOutlined,
  UserOutlined,
  CalendarOutlined,
  MoreOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/contexts/auth-context";
import { usePageHeader } from "@/contexts/page-header-context";
import {
  getAllConceptTemplates,
  createConceptTemplate,
  updateConceptTemplate,
  deleteConceptTemplate,
  duplicateConceptTemplate,
  searchConceptTemplates,
} from "@/lib/concept-templates";
import dayjs from "dayjs";

const { Search } = Input;
const { TextArea } = Input;

// 타입 정의
interface ConceptTemplate {
  id: string;
  name: string;
  description?: string;
  conceptCount: number;
  status: "draft" | "published";
  groupId: string;
  creatorId: string;
  creatorName: string;
  usageCount: number; // 이 템플릿을 사용하는 폼 수
  createdAt: string;
  updatedAt: string;
  concepts?: ConceptItem[];
}

interface ConceptItem {
  id: string;
  name: string;
  description?: string;
  orderIndex: number;
}

interface TemplateFormValues {
  name: string;
  description?: string;
  conceptCount: number;
  status: "draft" | "published";
  concepts: ConceptItem[];
}

interface TemplateFilters {
  name?: string;
  status?: string[];
  creator?: string;
  usageMin?: number;
  usageMax?: number;
}

export default function ConceptTemplatesPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const { setPageHeader } = usePageHeader();
  const groupId = params.id as string;

  // 상태 관리
  const [templates, setTemplates] = useState<ConceptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [filters, setFilters] = useState<TemplateFilters>({});
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  // 모달 상태
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ConceptTemplate | null>(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [viewingTemplate, setViewingTemplate] = useState<ConceptTemplate | null>(null);

  // 폼 관리
  const [form] = Form.useForm();

  // 통계 데이터
  const [statistics, setStatistics] = useState({
    total: 0,
    published: 0,
    draft: 0,
    mostUsed: "",
    averageConcepts: 0,
  });

  useEffect(() => {
    if (!user) {
      router.push("/auth");
      return;
    }
    loadTemplates();
  }, [user, groupId]);

  // 페이지 헤더 설정
  useEffect(() => {
    setPageHeader({
      title: "개념 템플릿 관리",
      subtitle: "시험형 질문에서 사용할 개념 템플릿을 생성하고 관리하세요",
      backUrl: `/groups/${groupId}`,
      breadcrumb: [
        { title: "그룹", href: "/groups" },
        { title: "그룹 상세", href: `/groups/${groupId}` },
        { title: "개념 템플릿" },
      ],
      actions: (
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadTemplates}>
            새로고침
          </Button>
          <Button icon={<FilterOutlined />} onClick={() => setFilterVisible(!filterVisible)}>
            필터
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingTemplate(null);
              form.resetFields();
              setModalVisible(true);
            }}
          >
            템플릿 생성
          </Button>
        </Space>
      ),
    });

    return () => setPageHeader(null);
  }, [setPageHeader, groupId, filterVisible, form]);

  // 템플릿 목록 로드
  const loadTemplates = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // 실제 API 호출 대신 예시 데이터 사용
      const mockTemplates: ConceptTemplate[] = [
        {
          id: "1",
          name: "수학 기본 개념",
          description: "고등학교 1학년 수학 기본 개념 모음",
          conceptCount: 20,
          status: "published",
          groupId,
          creatorId: user.id,
          creatorName: user.name,
          usageCount: 5,
          createdAt: "2024-01-10T00:00:00Z",
          updatedAt: "2024-01-15T00:00:00Z",
          concepts: [
            {
              id: "c1",
              name: "함수의 정의",
              description: "함수의 기본 정의와 표현",
              orderIndex: 1,
            },
            {
              id: "c2",
              name: "미분의 정의",
              description: "미분의 개념과 기본 공식",
              orderIndex: 2,
            },
            { id: "c3", name: "연쇄법칙", description: "합성함수의 미분", orderIndex: 3 },
          ],
        },
        {
          id: "2",
          name: "영어 문법 기초",
          description: "기본 영어 문법 개념들",
          conceptCount: 15,
          status: "published",
          groupId,
          creatorId: user.id,
          creatorName: user.name,
          usageCount: 3,
          createdAt: "2024-01-12T00:00:00Z",
          updatedAt: "2024-01-16T00:00:00Z",
          concepts: [
            { id: "c4", name: "시제", description: "현재, 과거, 미래 시제", orderIndex: 1 },
            { id: "c5", name: "관계사", description: "관계대명사와 관계부사", orderIndex: 2 },
          ],
        },
        {
          id: "3",
          name: "물리 역학",
          description: "고등학교 물리 역학 단원",
          conceptCount: 18,
          status: "draft",
          groupId,
          creatorId: user.id,
          creatorName: user.name,
          usageCount: 0,
          createdAt: "2024-01-17T00:00:00Z",
          updatedAt: "2024-01-17T00:00:00Z",
        },
      ];

      setTemplates(mockTemplates);

      // 통계 계산
      const total = mockTemplates.length;
      const published = mockTemplates.filter((t) => t.status === "published").length;
      const draft = mockTemplates.filter((t) => t.status === "draft").length;
      const mostUsed = mockTemplates.reduce((prev, current) =>
        prev.usageCount > current.usageCount ? prev : current
      ).name;
      const averageConcepts =
        total > 0 ? mockTemplates.reduce((sum, t) => sum + t.conceptCount, 0) / total : 0;

      setStatistics({
        total,
        published,
        draft,
        mostUsed,
        averageConcepts: Math.round(averageConcepts * 10) / 10,
      });
    } catch (error) {
      message.error("템플릿 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [user, groupId]);

  // 검색 및 필터링
  const handleSearch = async () => {
    if (!user) return;

    setSearchLoading(true);
    try {
      // 실제 검색 로직 구현
      message.info("검색 기능이 구현되었습니다.");
    } catch (error) {
      message.error("검색 중 오류가 발생했습니다.");
    } finally {
      setSearchLoading(false);
    }
  };

  // 템플릿 저장
  const handleSaveTemplate = async (values: TemplateFormValues) => {
    if (!user) return;

    try {
      if (editingTemplate) {
        // 수정
        const result = await updateConceptTemplate(editingTemplate.id, {
          name: values.name,
          description: values.description,
          conceptCount: values.conceptCount,
          status: values.status,
        });

        if (result.success) {
          message.success("템플릿이 수정되었습니다.");
        }
      } else {
        // 생성
        const result = await createConceptTemplate({
          name: values.name,
          description: values.description,
          groupId,
          creatorId: user.id,
          conceptCount: values.conceptCount,
          status: values.status,
        });

        if (result.success) {
          message.success("템플릿이 생성되었습니다.");
        }
      }

      setModalVisible(false);
      setEditingTemplate(null);
      form.resetFields();
      loadTemplates();
    } catch (error) {
      message.error("템플릿 저장 중 오류가 발생했습니다.");
    }
  };

  // 템플릿 복제
  const handleDuplicateTemplate = async (templateId: string, name: string) => {
    if (!user) return;

    try {
      const result = await duplicateConceptTemplate({
        templateId,
        userId: user.id,
        newName: `${name} [복사본]`,
      });

      if (result.success) {
        message.success("템플릿이 복제되었습니다.");
        loadTemplates();
      }
    } catch (error) {
      message.error("템플릿 복제 중 오류가 발생했습니다.");
    }
  };

  // 템플릿 삭제
  const handleDeleteTemplate = async (templateId: string) => {
    if (!user) return;

    try {
      const result = await deleteConceptTemplate(templateId, user.id);

      if (result.success) {
        message.success("템플릿이 삭제되었습니다.");
        loadTemplates();
      }
    } catch (error) {
      message.error("템플릿 삭제 중 오류가 발생했습니다.");
    }
  };

  // 템플릿 상세 보기
  const handleViewTemplate = (template: ConceptTemplate) => {
    setViewingTemplate(template);
    setViewModalVisible(true);
  };

  // 템플릿 수정
  const handleEditTemplate = (template: ConceptTemplate) => {
    setEditingTemplate(template);
    form.setFieldsValue({
      name: template.name,
      description: template.description,
      conceptCount: template.conceptCount,
      status: template.status,
    });
    setModalVisible(true);
  };

  // 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "green";
      case "draft":
        return "orange";
      default:
        return "default";
    }
  };

  // 상태별 텍스트
  const getStatusText = (status: string) => {
    switch (status) {
      case "published":
        return "게시됨";
      case "draft":
        return "임시저장";
      default:
        return status;
    }
  };

  // 테이블 컬럼 설정
  const columns = [
    {
      title: "템플릿 이름",
      dataIndex: "name",
      key: "name",
      render: (name: string, record: ConceptTemplate) => (
        <div className="flex flex-col">
          <Button
            type="link"
            className="text-left p-0 h-auto"
            onClick={() => handleViewTemplate(record)}
          >
            <span className="font-medium">{name}</span>
          </Button>
          {record.description && (
            <span className="text-xs text-gray-500 mt-1">{record.description}</span>
          )}
        </div>
      ),
    },
    {
      title: "개념 수",
      dataIndex: "conceptCount",
      key: "conceptCount",
      width: 100,
      render: (count: number) => (
        <div className="text-center">
          <Badge count={count} color="blue" />
        </div>
      ),
    },
    {
      title: "상태",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: string) => (
        <Tag
          color={getStatusColor(status)}
          icon={status === "published" ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
        >
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: "사용 횟수",
      dataIndex: "usageCount",
      key: "usageCount",
      width: 100,
      render: (count: number) => (
        <div className="text-center">
          <div className="text-lg font-bold">{count}</div>
          <div className="text-xs text-gray-500">회</div>
        </div>
      ),
    },
    {
      title: "생성자",
      dataIndex: "creatorName",
      key: "creatorName",
      width: 120,
      render: (name: string) => (
        <div className="flex items-center space-x-1">
          <UserOutlined className="text-gray-400" />
          <span className="text-sm">{name}</span>
        </div>
      ),
    },
    {
      title: "생성일",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 120,
      render: (date: string) => (
        <div className="flex items-center space-x-1">
          <CalendarOutlined className="text-gray-400" />
          <span className="text-sm">{dayjs(date).format("MM/DD")}</span>
        </div>
      ),
    },
    {
      title: "작업",
      key: "actions",
      width: 120,
      render: (record: ConceptTemplate) => {
        const canEdit = record.creatorId === user?.id;
        const canDelete = record.creatorId === user?.id && record.usageCount === 0;

        const menuItems = [
          {
            key: "view",
            icon: <EyeOutlined />,
            label: "상세 보기",
            onClick: () => handleViewTemplate(record),
          },
          ...(canEdit
            ? [
                {
                  key: "edit",
                  icon: <EditOutlined />,
                  label: "수정",
                  onClick: () => handleEditTemplate(record),
                },
              ]
            : []),
          {
            key: "duplicate",
            icon: <CopyOutlined />,
            label: "복제",
            onClick: () => handleDuplicateTemplate(record.id, record.name),
          },
          ...(canDelete
            ? [
                {
                  type: "divider" as const,
                },
                {
                  key: "delete",
                  icon: <DeleteOutlined />,
                  label: "삭제",
                  danger: true,
                  onClick: () => {
                    Modal.confirm({
                      title: "템플릿 삭제",
                      content: `"${record.name}" 템플릿을 삭제하시겠습니까?`,
                      onOk: () => handleDeleteTemplate(record.id),
                    });
                  },
                },
              ]
            : []),
        ];

        return (
          <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        );
      },
    },
  ];

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold">{statistics.total}</div>
              <div className="text-sm text-gray-600">전체 템플릿</div>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{statistics.published}</div>
              <div className="text-sm text-gray-600">게시됨</div>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-500">{statistics.draft}</div>
              <div className="text-sm text-gray-600">임시저장</div>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <div className="text-lg font-bold">{statistics.averageConcepts}</div>
              <div className="text-sm text-gray-600">평균 개념 수</div>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <div className="text-sm font-bold text-blue-500 truncate" title={statistics.mostUsed}>
                {statistics.mostUsed}
              </div>
              <div className="text-sm text-gray-600">최다 사용</div>
            </div>
          </Card>
        </div>

        {/* 안내 메시지 */}
        <Alert
          message="개념 템플릿 안내"
          description="개념 템플릿은 시험형 질문에서 학생의 개념 이해도를 체크할 때 사용됩니다. 템플릿을 생성한 후 폼에서 시험형 질문과 연결할 수 있습니다."
          type="info"
          showIcon
          className="mb-6"
        />

        {/* 필터 패널 */}
        {filterVisible && (
          <Card className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                placeholder="템플릿 이름 검색"
                value={filters.name}
                onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                prefix={<SearchOutlined />}
              />

              <Select
                mode="multiple"
                placeholder="상태 선택"
                value={filters.status}
                onChange={(status) => setFilters({ ...filters, status })}
                options={[
                  { value: "published", label: "게시됨" },
                  { value: "draft", label: "임시저장" },
                ]}
              />

              <div className="flex space-x-2">
                <InputNumber
                  placeholder="최소 사용 횟수"
                  min={0}
                  value={filters.usageMin}
                  onChange={(value) => setFilters({ ...filters, usageMin: value || undefined })}
                  className="flex-1"
                />
                <InputNumber
                  placeholder="최대 사용 횟수"
                  min={0}
                  value={filters.usageMax}
                  onChange={(value) => setFilters({ ...filters, usageMax: value || undefined })}
                  className="flex-1"
                />
              </div>

              <div className="flex space-x-2">
                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  onClick={handleSearch}
                  loading={searchLoading}
                >
                  검색
                </Button>
                <Button onClick={() => setFilters({})}>초기화</Button>
              </div>
            </div>
          </Card>
        )}

        {/* 템플릿 목록 테이블 */}
        <Card>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={templates}
            loading={loading}
            pagination={{
              total: templates.length,
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}개`,
            }}
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
            }}
            locale={{
              emptyText: (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="생성된 템플릿이 없습니다">
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      setEditingTemplate(null);
                      form.resetFields();
                      setModalVisible(true);
                    }}
                  >
                    첫 번째 템플릿 만들기
                  </Button>
                </Empty>
              ),
            }}
          />
        </Card>

        {/* 템플릿 생성/수정 모달 */}
        <Modal
          title={editingTemplate ? "템플릿 수정" : "템플릿 생성"}
          open={modalVisible}
          onCancel={() => {
            setModalVisible(false);
            setEditingTemplate(null);
            form.resetFields();
          }}
          footer={null}
          width={600}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSaveTemplate}
            initialValues={{
              conceptCount: 10,
              status: "draft",
            }}
          >
            <Form.Item
              name="name"
              label="템플릿 이름"
              rules={[{ required: true, message: "템플릿 이름을 입력해주세요!" }]}
            >
              <Input placeholder="예: 수학 기본 개념" />
            </Form.Item>

            <Form.Item name="description" label="설명">
              <TextArea
                rows={3}
                placeholder="템플릿에 대한 설명을 입력하세요"
                maxLength={500}
                showCount
              />
            </Form.Item>

            <Form.Item
              name="conceptCount"
              label="개념 수"
              rules={[{ required: true, message: "개념 수를 입력해주세요!" }]}
            >
              <InputNumber min={1} max={100} placeholder="포함할 개념의 수" className="w-full" />
            </Form.Item>

            <Form.Item
              name="status"
              label="상태"
              tooltip="임시저장: 본인만 사용 가능, 게시됨: 그룹 내 모든 사용자가 사용 가능"
            >
              <Select>
                <Select.Option value="draft">임시저장</Select.Option>
                <Select.Option value="published">게시됨</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item className="mb-0 mt-6">
              <div className="flex justify-end space-x-2">
                <Button
                  onClick={() => {
                    setModalVisible(false);
                    setEditingTemplate(null);
                    form.resetFields();
                  }}
                >
                  취소
                </Button>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                  {editingTemplate ? "수정" : "생성"}
                </Button>
              </div>
            </Form.Item>
          </Form>
        </Modal>

        {/* 템플릿 상세 보기 모달 */}
        <Modal
          title="템플릿 상세 정보"
          open={viewModalVisible}
          onCancel={() => setViewModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setViewModalVisible(false)}>
              닫기
            </Button>,
            ...(viewingTemplate?.creatorId === user?.id
              ? [
                  <Button
                    key="edit"
                    type="primary"
                    icon={<EditOutlined />}
                    onClick={() => {
                      setViewModalVisible(false);
                      handleEditTemplate(viewingTemplate!);
                    }}
                  >
                    수정
                  </Button>,
                ]
              : []),
          ]}
          width={700}
        >
          {viewingTemplate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    템플릿 이름
                  </label>
                  <div className="text-lg font-semibold">{viewingTemplate.name}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
                  <Tag color={getStatusColor(viewingTemplate.status)}>
                    {getStatusText(viewingTemplate.status)}
                  </Tag>
                </div>
              </div>

              {viewingTemplate.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                  <div className="text-gray-600">{viewingTemplate.description}</div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">개념 수</label>
                  <div className="text-xl font-bold text-blue-600">
                    {viewingTemplate.conceptCount}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">사용 횟수</label>
                  <div className="text-xl font-bold text-green-600">
                    {viewingTemplate.usageCount}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">생성자</label>
                  <div className="flex items-center space-x-1">
                    <UserOutlined />
                    <span>{viewingTemplate.creatorName}</span>
                  </div>
                </div>
              </div>

              {viewingTemplate.concepts && viewingTemplate.concepts.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    포함된 개념
                  </label>
                  <div className="border rounded-lg">
                    <div className="max-h-40 overflow-y-auto">
                      {viewingTemplate.concepts.map((concept, index) => (
                        <div
                          key={concept.id}
                          className={`p-3 ${
                            index !== viewingTemplate.concepts!.length - 1 ? "border-b" : ""
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <Badge count={concept.orderIndex} size="small" />
                            <span className="font-medium">{concept.name}</span>
                          </div>
                          {concept.description && (
                            <div className="text-sm text-gray-500 mt-1 ml-6">
                              {concept.description}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-500 pt-4 border-t">
                생성일: {dayjs(viewingTemplate.createdAt).format("YYYY-MM-DD HH:mm")} • 수정일:{" "}
                {dayjs(viewingTemplate.updatedAt).format("YYYY-MM-DD HH:mm")}
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}
