"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  Button,
  Table,
  Tag,
  Space,
  Input,
  Select,
  Row,
  Col,
  Statistic,
  Progress,
  Empty,
  Spin,
  App,
  DatePicker,
  Tooltip,
  Badge,
  Avatar,
  Dropdown,
  Modal,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  FormOutlined,
  EyeOutlined,
  EditOutlined,
  CopyOutlined,
  SendOutlined,
  DeleteOutlined,
  MoreOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CalendarOutlined,
  UserOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useAuth } from "@/contexts/auth-context";
import { usePageHeader } from "@/contexts/page-header-context";
import {
  getGroupForms,
  FormWithDetails,
  FormSearchConditions,
  deleteForm,
  duplicateForm,
} from "@/lib/forms";

interface FormListItem extends FormWithDetails {
  progressRate: number;
  totalTargets: number;
  completedResponses: number;
  pendingResponses: number;
  deadlineStatus: "active" | "upcoming" | "overdue";
}

export default function FormsPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const { message, modal } = App.useApp();
  const { setPageHeader } = usePageHeader();

  const groupId = params.id as string;

  // State
  const [forms, setForms] = useState<FormListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [creatorFilter, setCreatorFilter] = useState<string>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  // 페이지 헤더 설정
  useEffect(() => {
    setPageHeader({
      title: "폼 관리",
      subtitle: "그룹 내 모든 폼을 관리하고 진행 상황을 확인하세요",
      backUrl: `/groups/${groupId}`,
    });

    return () => setPageHeader(null);
  }, [setPageHeader, groupId]);

  // 폼 목록 조회
  const loadForms = useCallback(async () => {
    if (!user || !groupId) return;

    try {
      setLoading(true);

      const conditions: FormSearchConditions = {};
      if (searchText) conditions.title = searchText;
      if (statusFilter.length > 0) conditions.status = statusFilter;
      if (creatorFilter) conditions.creatorId = creatorFilter;
      if (dateRange) {
        conditions.createdAfter = dateRange[0].toISOString();
        conditions.createdBefore = dateRange[1].toISOString();
      }

      const result = await getGroupForms(groupId, conditions);

      if (result.success && result.data) {
        const formsWithProgress = result.data.map((form) => {
          const totalTargets = form.totalTargets || 0;
          const completedResponses = form.completedResponses || 0;
          const pendingResponses = totalTargets - completedResponses;
          const progressRate = totalTargets > 0 ? (completedResponses / totalTargets) * 100 : 0;

          return {
            ...form,
            progressRate,
            totalTargets,
            completedResponses,
            pendingResponses,
          } as FormListItem;
        });

        setForms(formsWithProgress);
      } else {
        message.error(result.error || "폼 목록 조회에 실패했습니다.");
      }
    } catch (error) {
      console.error("폼 조회 오류:", error);
      message.error("폼 목록 조회 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [user, groupId, searchText, statusFilter, creatorFilter, dateRange, message]);

  // 검색 처리
  const handleSearch = useCallback(async (value: string) => {
    setSearchText(value);
    setSearchLoading(true);
    // 실제로는 loadForms가 searchText 변경을 감지하여 실행됨
    setTimeout(() => setSearchLoading(false), 500);
  }, []);

  // 폼 삭제
  const handleDeleteForm = useCallback(
    async (formId: string, formTitle: string) => {
      modal.confirm({
        title: "폼 삭제",
        content: `"${formTitle}" 폼을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
        okText: "삭제",
        okType: "danger",
        cancelText: "취소",
        onOk: async () => {
          try {
            const result = await deleteForm(formId, user!.id);
            if (result.success) {
              message.success("폼이 삭제되었습니다.");
              loadForms();
            } else {
              message.error(result.error || "폼 삭제에 실패했습니다.");
            }
          } catch (error) {
            message.error("폼 삭제 중 오류가 발생했습니다.");
          }
        },
      });
    },
    [modal, user, message, loadForms]
  );

  // 폼 복제
  const handleDuplicateForm = useCallback(
    async (formId: string, formTitle: string) => {
      try {
        const result = await duplicateForm({ formId, userId: user!.id });
        if (result.success) {
          message.success(`"${formTitle}" 폼이 복제되었습니다.`);
          loadForms();
        } else {
          message.error(result.error || "폼 복제에 실패했습니다.");
        }
      } catch (error) {
        message.error("폼 복제 중 오류가 발생했습니다.");
      }
    },
    [user, message, loadForms]
  );

  // 초기 데이터 로드
  useEffect(() => {
    loadForms();
  }, [loadForms]);

  // 검색텍스트 변경 시 재조회
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchText !== undefined) {
        loadForms();
      }
    }, 300); // 디바운싱

    return () => clearTimeout(timer);
  }, [searchText, loadForms]);

  // 필터 변경 시 재조회
  useEffect(() => {
    loadForms();
  }, [statusFilter, creatorFilter, dateRange, loadForms]);

  // 통계 계산
  const statistics = {
    totalForms: forms.length,
    activeForms: forms.filter((f) => f.status === "active").length,
    draftForms: forms.filter((f) => f.status === "draft").length,
    closedForms: forms.filter((f) => f.status === "closed").length,
    averageProgress:
      forms.length > 0 ? forms.reduce((sum, form) => sum + form.progressRate, 0) / forms.length : 0,
  };

  // 테이블 컬럼 정의
  const columns: ColumnsType<FormListItem> = [
    {
      title: "폼 제목",
      dataIndex: "title",
      key: "title",
      fixed: "left",
      width: 300,
      render: (title: string, record: FormListItem) => (
        <div className="flex items-center space-x-3">
          <Avatar size="small" icon={<FormOutlined />} />
          <div>
            <div
              className="font-medium cursor-pointer hover:text-blue-600 hover:underline"
              onClick={() => router.push(`/groups/${groupId}/forms/${record.id}`)}
            >
              {title}
            </div>
            {record.description && (
              <div className="text-xs text-gray-500 mt-1 truncate max-w-[200px]">
                {record.description}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      title: "상태",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: string, record: FormListItem) => {
        const statusConfig = {
          active: { color: "green", text: "활성", icon: <CheckCircleOutlined /> },
          draft: { color: "orange", text: "임시저장", icon: <ClockCircleOutlined /> },
          closed: { color: "red", text: "마감", icon: <ExclamationCircleOutlined /> },
        };

        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;

        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: "진행률",
      key: "progress",
      width: 200,
      render: (_, record: FormListItem) => (
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium">{record.progressRate.toFixed(0)}%</span>
            <span className="text-xs text-gray-500">
              {record.completedResponses}/{record.totalTargets}
            </span>
          </div>
          <Progress
            percent={record.progressRate}
            size="small"
            status={record.progressRate === 100 ? "success" : "active"}
            showInfo={false}
          />
          <div className="text-xs text-gray-500 mt-1">
            완료 {record.completedResponses}명 · 대기 {record.pendingResponses}명
          </div>
        </div>
      ),
    },
    {
      title: "대상",
      key: "targets",
      width: 120,
      render: (_, record: FormListItem) => (
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1">
            <TeamOutlined className="text-gray-400" />
            <span className="font-medium">{record.totalTargets}</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">명</div>
        </div>
      ),
    },
    {
      title: "마감일",
      dataIndex: "deadline",
      key: "deadline",
      width: 150,
      render: (deadline: string, record: FormListItem) => {
        if (!deadline) return <span className="text-gray-400">설정 안함</span>;

        const deadlineDate = dayjs(deadline);
        const now = dayjs();
        const isOverdue = deadlineDate.isBefore(now);
        const isUpcoming = deadlineDate.diff(now, "hour") <= 24 && !isOverdue;

        return (
          <div>
            <div
              className={`flex items-center space-x-1 ${
                isOverdue ? "text-red-600" : isUpcoming ? "text-orange-600" : "text-gray-600"
              }`}
            >
              <CalendarOutlined />
              <span className="text-sm">{deadlineDate.format("MM/DD HH:mm")}</span>
            </div>
            {isOverdue && (
              <Tag color="red" className="mt-1">
                마감됨
              </Tag>
            )}
            {isUpcoming && (
              <Tag color="orange" className="mt-1">
                임박
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: "생성자",
      key: "creator",
      width: 120,
      render: (_, record: FormListItem) => (
        <div className="flex items-center space-x-2">
          <Avatar size="small" icon={<UserOutlined />} />
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
        <span className="text-sm text-gray-500">{dayjs(date).format("MM/DD")}</span>
      ),
    },
    {
      title: "작업",
      key: "actions",
      fixed: "right",
      width: 100,
      render: (_, record: FormListItem) => {
        const items = [
          {
            key: "view",
            label: "상세보기",
            icon: <EyeOutlined />,
            onClick: () => router.push(`/groups/${groupId}/forms/${record.id}`),
          },
          {
            key: "edit",
            label: "수정",
            icon: <EditOutlined />,
            onClick: () => router.push(`/groups/${groupId}/forms/${record.id}/edit`),
          },
          {
            key: "duplicate",
            label: "복제",
            icon: <CopyOutlined />,
            onClick: () => handleDuplicateForm(record.id, record.title),
          },
          {
            key: "send",
            label: "전송",
            icon: <SendOutlined />,
            onClick: () => router.push(`/groups/${groupId}/forms/${record.id}/send`),
          },
          {
            type: "divider" as const,
          },
          {
            key: "delete",
            label: "삭제",
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => handleDeleteForm(record.id, record.title),
          },
        ];

        return (
          <Dropdown menu={{ items }} trigger={["click"]}>
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 통계 카드 */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="전체 폼" value={statistics.totalForms} prefix={<FormOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="활성 폼"
              value={statistics.activeForms}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: "#3f8600" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="임시저장"
              value={statistics.draftForms}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: "#cf1322" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="평균 진행률"
              value={statistics.averageProgress}
              precision={1}
              suffix="%"
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 검색 및 필터 */}
      <Card className="mb-6">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="폼 제목으로 검색"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="상태 필터"
              value={statusFilter}
              onChange={setStatusFilter}
              mode="multiple"
              allowClear
              className="w-full"
            >
              <Select.Option value="active">활성</Select.Option>
              <Select.Option value="draft">임시저장</Select.Option>
              <Select.Option value="closed">마감</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <DatePicker.RangePicker
              placeholder={["시작일", "종료일"]}
              value={dateRange}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setDateRange([dates[0], dates[1]]);
                } else {
                  setDateRange(null);
                }
              }}
              className="w-full"
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Button
              icon={<FilterOutlined />}
              onClick={() => {
                setSearchText("");
                setStatusFilter([]);
                setCreatorFilter(undefined);
                setDateRange(null);
              }}
            >
              필터 초기화
            </Button>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => router.push(`/groups/${groupId}/forms/create`)}
              className="w-full"
            >
              새 폼 생성
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 폼 목록 테이블 */}
      <Card>
        <Table
          columns={columns}
          dataSource={forms}
          rowKey="id"
          pagination={{
            total: forms.length,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}개`,
          }}
          scroll={{ x: 1200 }}
          locale={{
            emptyText: (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="등록된 폼이 없습니다">
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => router.push(`/groups/${groupId}/forms/create`)}
                >
                  첫 번째 폼 생성하기
                </Button>
              </Empty>
            ),
          }}
        />
      </Card>
    </div>
  );
}
