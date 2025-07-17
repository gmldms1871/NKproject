"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Input,
  Select,
  DatePicker,
  Progress,
  Modal,
  message,
  Popconfirm,
  Tooltip,
  Badge,
  Empty,
  Spin,
  Dropdown,
  Alert,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  EditOutlined,
  CopyOutlined,
  DeleteOutlined,
  SendOutlined,
  EyeOutlined,
  BarChartOutlined,
  UserOutlined,
  CalendarOutlined,
  TagOutlined,
  MoreOutlined,
  ReloadOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/contexts/auth-context";
import { usePageHeader } from "@/contexts/page-header-context";
import {
  getAllFormsInGroup,
  searchForms,
  duplicateForm,
  deleteForm,
  FormWithDetails,
  FormSearchConditions,
} from "@/lib/forms";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

// 타입 정의
interface FormFilters {
  title?: string;
  status?: string[];
  tags?: string[];
  creator?: string;
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
}

export default function FormsListPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const { setPageHeader } = usePageHeader();
  const groupId = params.id as string;

  // 상태 관리
  const [forms, setForms] = useState<FormWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [filters, setFilters] = useState<FormFilters>({});
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  // 통계 데이터
  const [statistics, setStatistics] = useState({
    total: 0,
    draft: 0,
    sent: 0,
    completed: 0,
    averageProgress: 0,
  });

  useEffect(() => {
    if (!user) {
      router.push("/auth");
      return;
    }
    loadForms();
  }, [user, groupId]);

  // 페이지 헤더 설정
  useEffect(() => {
    setPageHeader({
      title: "폼 관리",
      subtitle: "그룹 내 생성된 폼들을 관리하고 진행상황을 확인하세요",
      backUrl: `/groups/${groupId}`,
      breadcrumb: [
        { title: "그룹", href: "/groups" },
        { title: "그룹 상세", href: `/groups/${groupId}` },
        { title: "폼 관리" },
      ],
      actions: (
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadForms}>
            새로고침
          </Button>
          <Button icon={<FilterOutlined />} onClick={() => setFilterVisible(!filterVisible)}>
            필터
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push(`/groups/${groupId}/forms/create`)}
          >
            폼 생성
          </Button>
        </Space>
      ),
    });

    return () => setPageHeader(null);
  }, [setPageHeader, groupId, filterVisible]);

  // 폼 목록 로드
  const loadForms = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const result = await getAllFormsInGroup(groupId);

      if (result.success && result.data) {
        setForms(result.data);

        // 통계 계산
        const total = result.data.length;
        const draft = result.data.filter((f) => f.status === "draft").length;
        const sent = result.data.filter((f) => f.status === "sent").length;
        const completed = result.data.filter((f) => f.progressRate === 100).length;
        const averageProgress =
          total > 0 ? result.data.reduce((sum, f) => sum + f.progressRate, 0) / total : 0;

        setStatistics({ total, draft, sent, completed, averageProgress });
      }
    } catch (error) {
      message.error("폼 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [user, groupId]);

  // 검색 및 필터링
  const handleSearch = async () => {
    if (!user) return;

    setSearchLoading(true);
    try {
      const conditions: FormSearchConditions = {
        groupId,
        title: filters.title,
        status: filters.status,
        tags: filters.tags,
        creatorId: filters.creator,
        createdAfter: filters.dateRange?.[0]?.toISOString(),
        createdBefore: filters.dateRange?.[1]?.toISOString(),
      };

      const result = await searchForms(conditions);

      if (result.success && result.data) {
        setForms(result.data);
      }
    } catch (error) {
      message.error("검색 중 오류가 발생했습니다.");
    } finally {
      setSearchLoading(false);
    }
  };

  // 필터 초기화
  const handleResetFilters = () => {
    setFilters({});
    loadForms();
  };

  // 폼 복제
  const handleDuplicateForm = async (formId: string, title: string) => {
    if (!user) return;

    try {
      const result = await duplicateForm({
        formId,
        userId: user.id,
        newTitle: `${title} [복사본]`,
      });

      if (result.success) {
        message.success("폼이 복제되었습니다.");
        loadForms();
      } else {
        message.error(result.error || "폼 복제에 실패했습니다.");
      }
    } catch (error) {
      message.error("폼 복제 중 오류가 발생했습니다.");
    }
  };

  // 폼 삭제
  const handleDeleteForm = async (formId: string) => {
    if (!user) return;

    try {
      const result = await deleteForm(formId, user.id);

      if (result.success) {
        message.success("폼이 삭제되었습니다.");
        loadForms();
      } else {
        message.error(result.error || "폼 삭제에 실패했습니다.");
      }
    } catch (error) {
      message.error("폼 삭제 중 오류가 발생했습니다.");
    }
  };

  // 진행률 색상
  const getProgressColor = (progress: number) => {
    if (progress === 100) return "#52c41a";
    if (progress >= 70) return "#1890ff";
    if (progress >= 30) return "#faad14";
    return "#ff4d4f";
  };

  // 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "default";
      case "sent":
        return "processing";
      case "completed":
        return "success";
      default:
        return "default";
    }
  };

  // 상태별 텍스트
  const getStatusText = (status: string) => {
    switch (status) {
      case "draft":
        return "임시저장";
      case "sent":
        return "전송됨";
      case "completed":
        return "완료";
      default:
        return status;
    }
  };

  // 테이블 컬럼 설정
  const columns = [
    {
      title: "폼 제목",
      dataIndex: "title",
      key: "title",
      render: (title: string, record: FormWithDetails) => (
        <div className="flex flex-col">
          <Button
            type="link"
            className="text-left p-0 h-auto"
            onClick={() => router.push(`/groups/${groupId}/forms/${record.id}`)}
          >
            <span className="font-medium">{title}</span>
          </Button>
          {record.description && (
            <span className="text-xs text-gray-500 mt-1">{record.description}</span>
          )}
        </div>
      ),
    },
    {
      title: "상태",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: string) => <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>,
    },
    {
      title: "진행률",
      key: "progress",
      width: 150,
      render: (record: FormWithDetails) => (
        <div className="space-y-1">
          <Progress
            percent={record.progressRate}
            size="small"
            strokeColor={getProgressColor(record.progressRate)}
          />
          <div className="text-xs text-gray-500">
            {record.completedResponses}/{record.totalTargets} 완료
          </div>
        </div>
      ),
    },
    {
      title: "질문 수",
      key: "questions",
      width: 80,
      render: (record: FormWithDetails) => <Badge count={record.questions.length} color="blue" />,
    },
    {
      title: "태그",
      dataIndex: "tags",
      key: "tags",
      width: 150,
      render: (tags: any[]) => (
        <div>
          {tags.slice(0, 2).map((tag) => (
            <Tag key={tag.id}>{tag.name}</Tag>
          ))}
          {tags.length > 2 && (
            <Tooltip
              title={tags
                .slice(2)
                .map((t) => t.name)
                .join(", ")}
            >
              <Tag>+{tags.length - 2}</Tag>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: "생성자",
      key: "creator",
      width: 120,
      render: (record: FormWithDetails) => (
        <div className="flex items-center space-x-1">
          <UserOutlined className="text-gray-400" />
          <span className="text-sm">{record.creator?.name}</span>
        </div>
      ),
    },
    {
      title: "생성일",
      dataIndex: "created_at",
      key: "created_at",
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
      render: (record: FormWithDetails) => {
        const menuItems = [
          {
            key: "view",
            icon: <EyeOutlined />,
            label: "상세 보기",
          },
          {
            key: "responses",
            icon: <BarChartOutlined />,
            label: "응답 조회",
          },
          ...(record.status === "draft"
            ? [
                {
                  key: "edit",
                  icon: <EditOutlined />,
                  label: "수정",
                },
              ]
            : []),
          ...(record.status === "draft"
            ? [
                {
                  key: "send",
                  icon: <SendOutlined />,
                  label: "전송",
                },
              ]
            : []),
          {
            key: "duplicate",
            icon: <CopyOutlined />,
            label: "복제",
          },
          {
            type: "divider" as const,
          },
          {
            key: "delete",
            icon: <DeleteOutlined />,
            label: "삭제",
            danger: true,
          },
        ];

        const handleMenuClick = ({ key }: { key: string }) => {
          switch (key) {
            case "view":
              router.push(`/groups/${groupId}/forms/${record.id}`);
              break;
            case "responses":
              router.push(`/groups/${groupId}/forms/${record.id}/responses`);
              break;
            case "edit":
              router.push(`/groups/${groupId}/forms/${record.id}/edit`);
              break;
            case "send":
              router.push(`/groups/${groupId}/forms/${record.id}/send`);
              break;
            case "duplicate":
              handleDuplicateForm(record.id, record.title);
              break;
            case "delete":
              Modal.confirm({
                title: "폼 삭제",
                content: `"${record.title}" 폼을 삭제하시겠습니까?`,
                onOk: () => handleDeleteForm(record.id),
              });
              break;
            default:
              break;
          }
        };

        return (
          <Dropdown menu={{ items: menuItems, onClick: handleMenuClick }} trigger={["click"]}>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">전체 폼</p>
                <p className="text-2xl font-bold">{statistics.total}</p>
              </div>
              <div className="text-blue-500">
                <BarChartOutlined style={{ fontSize: 24 }} />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">임시저장</p>
                <p className="text-2xl font-bold">{statistics.draft}</p>
              </div>
              <div className="text-gray-500">
                <EditOutlined style={{ fontSize: 24 }} />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">전송됨</p>
                <p className="text-2xl font-bold">{statistics.sent}</p>
              </div>
              <div className="text-orange-500">
                <SendOutlined style={{ fontSize: 24 }} />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">평균 진행률</p>
                <p className="text-2xl font-bold">{statistics.averageProgress.toFixed(1)}%</p>
              </div>
              <div className="text-green-500">
                <BarChartOutlined style={{ fontSize: 24 }} />
              </div>
            </div>
          </Card>
        </div>

        {/* 필터 패널 */}
        {filterVisible && (
          <Card className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <Input
                placeholder="폼 제목 검색"
                value={filters.title}
                onChange={(e) => setFilters({ ...filters, title: e.target.value })}
                prefix={<SearchOutlined />}
              />

              <Select
                mode="multiple"
                placeholder="상태 선택"
                value={filters.status}
                onChange={(status) => setFilters({ ...filters, status })}
                options={[
                  { value: "draft", label: "임시저장" },
                  { value: "sent", label: "전송됨" },
                  { value: "completed", label: "완료" },
                ]}
              />

              <Select
                mode="tags"
                placeholder="태그 선택"
                value={filters.tags}
                onChange={(tags) => setFilters({ ...filters, tags })}
              />

              <RangePicker
                placeholder={["시작일", "종료일"]}
                value={filters.dateRange}
                onChange={(dates) => setFilters({ ...filters, dateRange: dates as any })}
              />

              <div className="flex space-x-2">
                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  onClick={handleSearch}
                  loading={searchLoading}
                >
                  검색
                </Button>
                <Button onClick={handleResetFilters}>초기화</Button>
              </div>
            </div>
          </Card>
        )}

        {/* 폼 목록 테이블 */}
        <Card>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={forms}
            loading={loading}
            pagination={{
              total: forms.length,
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}개`,
            }}
            rowSelection={{
              selectedRowKeys,
              onChange: (selectedRowKeys) => setSelectedRowKeys(selectedRowKeys as string[]),
            }}
            locale={{
              emptyText: (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="생성된 폼이 없습니다">
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => router.push(`/groups/${groupId}/forms/create`)}
                  >
                    첫 번째 폼 만들기
                  </Button>
                </Empty>
              ),
            }}
          />

          {/* 일괄 작업 버튼 */}
          {selectedRowKeys.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-blue-600">
                  {selectedRowKeys.length}개 폼이 선택되었습니다
                </span>
                <Space>
                  <Button icon={<DownloadOutlined />}>일괄 내보내기</Button>
                  <Popconfirm
                    title="선택된 폼들을 삭제하시겠습니까?"
                    onConfirm={() => {
                      // 일괄 삭제 로직
                      setSelectedRowKeys([]);
                    }}
                  >
                    <Button danger icon={<DeleteOutlined />}>
                      일괄 삭제
                    </Button>
                  </Popconfirm>
                </Space>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
