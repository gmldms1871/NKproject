"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  Tabs,
  Button,
  Table,
  Tag,
  Space,
  Input,
  Select,
  DatePicker,
  Badge,
  Progress,
  Tooltip,
  Modal,
  Form,
  message,
  Spin,
  Empty,
  Row,
  Col,
  Statistic,
} from "antd";
import {
  FileTextOutlined,
  SearchOutlined,
  FilterOutlined,
  EyeOutlined,
  EditOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  TeamOutlined,
  CalendarOutlined,
  BarChartOutlined,
  RobotOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/contexts/auth-context";
import { usePageHeader } from "@/contexts/page-header-context";
import {
  getGroupReports,
  getReportSummary,
  ReportWithDetails,
  ReportSearchConditions,
  ReportSummary,
} from "@/lib/reports";
import { formatDate } from "@/lib/utils";

const { RangePicker } = DatePicker;

export default function ReportsPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;
  const { user } = useAuth();
  const { setTitle, setBreadcrumbs } = usePageHeader();

  // 🔧 핵심 수정 1: message API를 ref로 관리하여 안정화
  const [messageApi, contextHolder] = message.useMessage();
  const messageApiRef = useRef(messageApi);
  messageApiRef.current = messageApi;

  // 상태 관리
  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("in-progress");
  const [filterVisible, setFilterVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filters, setFilters] = useState<ReportSearchConditions>({});

  // 🔧 핵심 수정 2: 초기화 완료 여부 추적
  const [isInitialized, setIsInitialized] = useState(false);

  // 🔧 핵심 수정 3: 페이지 헤더 설정 - 한 번만 실행되도록
  useEffect(() => {
    if (!isInitialized && groupId) {
      setTitle("보고서 관리");
      setBreadcrumbs([
        { title: "그룹", href: `/groups/${groupId}` },
        { title: "보고서", href: `/groups/${groupId}/reports` },
      ]);
      setIsInitialized(true);
    }
  }, [groupId, isInitialized, setTitle, setBreadcrumbs]);

  // 🔧 핵심 수정 4: 데이터 로드 함수 - 의존성 완전 제거
  const loadReports = useCallback(async () => {
    if (!user?.id || !groupId) return;

    try {
      setLoading(true);
      const [reportsResult, summaryResult] = await Promise.all([
        getGroupReports(groupId, {}),
        getReportSummary(groupId),
      ]);

      if (reportsResult.success) {
        setReports(reportsResult.data || []);
      } else {
        messageApiRef.current.error(reportsResult.error || "보고서를 불러오는데 실패했습니다.");
      }

      if (summaryResult.success) {
        setSummary(summaryResult.data || null);
      }
    } catch (error) {
      messageApiRef.current.error("보고서 데이터를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [user?.id, groupId]); // messageApi 의존성 제거

  // 🔧 핵심 수정 5: 로딩 제어를 ref로 관리
  const loadingRef = useRef(false);

  useEffect(() => {
    if (!user) {
      router.push("/auth");
      return;
    }

    // 중복 로딩 방지
    if (loadingRef.current) return;
    loadingRef.current = true;

    loadReports().finally(() => {
      loadingRef.current = false;
    });
  }, [user, router, loadReports]);

  // 필터링된 보고서 계산
  const filteredReports = useMemo(() => {
    let filtered = [...reports];

    // 검색어 필터링
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(
        (report) =>
          report.student_name?.toLowerCase().includes(searchLower) ||
          report.class_name?.toLowerCase().includes(searchLower) ||
          report.form?.title?.toLowerCase().includes(searchLower)
      );
    }

    // 단계별 필터링
    if (activeTab === "in-progress") {
      filtered = filtered.filter((report) => report.stage !== 3);
    } else if (activeTab === "completed") {
      filtered = filtered.filter((report) => report.stage === 3);
    }

    // 추가 필터링
    if (filters.stage && filters.stage.length > 0) {
      filtered = filtered.filter(
        (report) => report.stage !== null && filters.stage!.includes(report.stage)
      );
    }

    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter(
        (report) => report.draft_status && filters.status!.includes(report.draft_status)
      );
    }

    return filtered;
  }, [reports, searchText, activeTab, filters]);

  // 핸들러들
  const handleSearch = useCallback((value: string) => {
    setSearchText(value);
  }, []);

  const handleFilter = useCallback((newFilters: ReportSearchConditions) => {
    setFilters(newFilters);
    setFilterVisible(false);
  }, []);

  const resetFilters = useCallback(() => {
    setSearchText("");
    setFilters({});
  }, []);

  const handleTabChange = useCallback((key: string) => {
    setActiveTab(key);
  }, []);

  // 단계별 색상 및 아이콘
  const getStageInfo = useCallback((stage: number, rejected: boolean) => {
    if (rejected) {
      return {
        color: "red" as const,
        icon: <ExclamationCircleOutlined />,
        text: "반려됨",
      };
    }

    switch (stage) {
      case 0:
        return {
          color: "default" as const,
          icon: <ClockCircleOutlined />,
          text: "응답 대기",
        };
      case 1:
        return {
          color: "processing" as const,
          icon: <UserOutlined />,
          text: "시간강사 검토",
        };
      case 2:
        return {
          color: "warning" as const,
          icon: <TeamOutlined />,
          text: "선생님 검토",
        };
      case 3:
        return {
          color: "success" as const,
          icon: <CheckCircleOutlined />,
          text: "완료",
        };
      default:
        return {
          color: "default" as const,
          icon: <ClockCircleOutlined />,
          text: "대기",
        };
    }
  }, []);

  // AI 정제 버튼 클릭 핸들러
  const handleRefineClick = useCallback(
    (reportId: string, studentName: string) => {
      console.log("🤖 AI 정제 버튼 클릭됨!");
      console.log("📊 보고서 정보:", { reportId, studentName });
      console.log("🎯 이동할 URL:", `/groups/${groupId}/reports/${reportId}/refine`);

      try {
        router.push(`/groups/${groupId}/reports/${reportId}/refine`);
        console.log("✅ 라우터 이동 성공");
      } catch (error) {
        console.error("❌ 라우터 이동 실패:", error);
        messageApiRef.current.error("페이지 이동에 실패했습니다.");
      }
    },
    [router, groupId]
  );

  // 테이블 컬럼 정의
  const columns = useMemo(
    () => [
      {
        title: "학생",
        key: "student",
        render: (_: unknown, record: ReportWithDetails) => (
          <div>
            <div className="font-medium">{record.student_name || "미지정"}</div>
            {record.class_name && <div className="text-xs text-gray-500">{record.class_name}</div>}
          </div>
        ),
      },
      {
        title: "폼",
        key: "form",
        render: (_: unknown, record: ReportWithDetails) => (
          <div>
            <div className="font-medium">{record.form?.title || "알 수 없음"}</div>
            <div className="text-xs text-gray-500">
              {record.form?.creator_name} • {formatDate(record.form?.created_at)}
            </div>
          </div>
        ),
      },
      {
        title: "단계",
        key: "stage",
        render: (_: unknown, record: ReportWithDetails) => {
          const stageInfo = getStageInfo(record.stage || 0, !!record.rejected_at);
          return (
            <div className="flex items-center space-x-2">
              <Tag color={stageInfo.color} icon={stageInfo.icon}>
                {stageInfo.text}
              </Tag>
              <Progress
                percent={record.progressInfo.progressRate}
                size="small"
                showInfo={false}
                strokeColor={stageInfo.color === "success" ? "#52c41a" : "#1890ff"}
              />
            </div>
          );
        },
      },
      {
        title: "담당자",
        key: "assignees",
        render: (_: unknown, record: ReportWithDetails) => (
          <div className="space-y-1">
            {record.timeTeacher && (
              <div className="text-xs">
                <UserOutlined className="mr-1" />
                시간강사: {record.timeTeacher.name}
              </div>
            )}
            {record.teacher && (
              <div className="text-xs">
                <TeamOutlined className="mr-1" />
                선생님: {record.teacher.name}
              </div>
            )}
          </div>
        ),
      },
      {
        title: "생성일",
        key: "created_at",
        render: (_: unknown, record: ReportWithDetails) => (
          <div className="text-xs">
            <div>{formatDate(record.created_at)}</div>
            <div className="text-gray-500">생성</div>
          </div>
        ),
      },
      {
        title: "업데이트",
        key: "updated_at",
        render: (_: unknown, record: ReportWithDetails) => (
          <div className="text-xs">
            <div>{formatDate(record.updated_at)}</div>
            <div className="text-gray-500">수정</div>
          </div>
        ),
      },
      {
        title: "작업",
        key: "actions",
        render: (_: unknown, record: ReportWithDetails) => (
          <Space>
            <Tooltip title="상세 보기">
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => router.push(`/groups/${groupId}/reports/${record.id}`)}
              />
            </Tooltip>
            {(record.progressInfo.canEdit || record.rejected_at) && (
              <Tooltip title="코멘트 작성">
                <Button
                  size="small"
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => router.push(`/groups/${groupId}/reports/${record.id}/comment`)}
                />
              </Tooltip>
            )}
            {record.stage === 3 && (
              <Tooltip title="AI 정제">
                <Button
                  size="small"
                  icon={<RobotOutlined />}
                  onClick={() => handleRefineClick(record.id, record.student_name || "Unknown")}
                />
              </Tooltip>
            )}
          </Space>
        ),
      },
    ],
    [getStageInfo, router, groupId, handleRefineClick]
  );

  // 통계 카드
  const statisticCards = useMemo(() => {
    if (!summary) return null;

    return (
      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card>
            <Statistic
              title="전체 보고서"
              value={summary.totalReports}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="진행중"
              value={summary.inProgressReports}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="완료"
              value={summary.completedReports}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="완료율"
              value={summary.completionRate}
              suffix="%"
              prefix={<BarChartOutlined />}
              valueStyle={{ color: "#722ed1" }}
            />
          </Card>
        </Col>
      </Row>
    );
  }, [summary]);

  // 탭 아이템 계산
  const tabCounts = useMemo(() => {
    const inProgressCount = filteredReports.filter((r) => r.stage !== 3).length;
    const completedCount = filteredReports.filter((r) => r.stage === 3).length;
    return { inProgressCount, completedCount };
  }, [filteredReports]);

  // 테이블 컴포넌트들
  const inProgressTable = useMemo(
    () => (
      <Table
        columns={columns}
        dataSource={filteredReports.filter((r) => r.stage !== 3)}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}개`,
        }}
      />
    ),
    [columns, filteredReports, loading]
  );

  const completedTable = useMemo(
    () => (
      <Table
        columns={columns}
        dataSource={filteredReports.filter((r) => r.stage === 3)}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}개`,
        }}
      />
    ),
    [columns, filteredReports, loading]
  );

  // 검색/필터 컨트롤
  const searchControls = useMemo(
    () => (
      <div className="mb-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Input
            placeholder="학생명, 반명, 폼명으로 검색"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => handleSearch(e.target.value)}
            style={{ width: 300 }}
          />
          <Button icon={<FilterOutlined />} onClick={() => setFilterVisible(true)}>
            필터
          </Button>
          <Button size="small" onClick={resetFilters}>
            초기화
          </Button>
        </div>
      </div>
    ),
    [searchText, handleSearch, resetFilters]
  );

  // 탭 아이템 정의
  const tabItems = useMemo(
    () => [
      {
        key: "in-progress",
        label: (
          <span>
            진행중인 보고서
            <Badge count={tabCounts.inProgressCount} style={{ marginLeft: 8 }} />
          </span>
        ),
        children: (
          <div>
            {searchControls}
            {inProgressTable}
          </div>
        ),
      },
      {
        key: "completed",
        label: (
          <span>
            최종 보고서
            <Badge count={tabCounts.completedCount} style={{ marginLeft: 8 }} />
          </span>
        ),
        children: (
          <div>
            {searchControls}
            {completedTable}
          </div>
        ),
      },
    ],
    [tabCounts, searchControls, inProgressTable, completedTable]
  );

  // 필터 모달
  const filterModal = useMemo(
    () => (
      <Modal
        title="필터 설정"
        open={filterVisible}
        onCancel={() => setFilterVisible(false)}
        footer={null}
      >
        <Form layout="vertical" onFinish={handleFilter}>
          <Form.Item label="단계" name="stage">
            <Select
              mode="multiple"
              placeholder="단계를 선택하세요"
              options={[
                { label: "응답 대기", value: 0 },
                { label: "시간강사 검토", value: 1 },
                { label: "선생님 검토", value: 2 },
                { label: "완료", value: 3 },
              ]}
            />
          </Form.Item>
          <Form.Item label="상태" name="status">
            <Select
              mode="multiple"
              placeholder="상태를 선택하세요"
              options={[
                { label: "응답 대기", value: "waiting_for_response" },
                { label: "시간강사 대기", value: "waiting_for_time_teacher" },
                { label: "선생님 대기", value: "waiting_for_teacher" },
                { label: "완료", value: "completed" },
              ]}
            />
          </Form.Item>
          <Form.Item label="생성일" name="dateRange">
            <RangePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button onClick={() => setFilterVisible(false)}>취소</Button>
              <Button type="primary" htmlType="submit">
                필터 적용
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    ),
    [filterVisible, handleFilter]
  );

  if (!user) {
    return <Spin size="large" />;
  }

  return (
    <div className="p-6">
      {contextHolder}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">보고서 관리</h1>
        <p className="text-gray-600">
          그룹의 모든 보고서를 관리하고 진행 상황을 확인할 수 있습니다.
        </p>
      </div>

      {statisticCards}

      <Card>
        <Tabs activeKey={activeTab} onChange={handleTabChange} items={tabItems} size="large" />
      </Card>

      {filterModal}
    </div>
  );
}
