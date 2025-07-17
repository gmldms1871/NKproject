"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  Table,
  Progress,
  Tag,
  Button,
  Space,
  Input,
  Select,
  Badge,
  Avatar,
  Tooltip,
  Modal,
  message,
  Alert,
  Tabs,
  Statistic,
  Empty,
  Spin,
} from "antd";
import {
  SearchOutlined,
  EyeOutlined,
  MessageOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  TeamOutlined,
  FilterOutlined,
  ReloadOutlined,
  DownloadOutlined,
  WarningOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/contexts/auth-context";
import { usePageHeader } from "@/contexts/page-header-context";
import { getFormDetails, getFormResponses, FormWithDetails } from "@/lib/forms";
import dayjs from "dayjs";

const { Search } = Input;

// 타입 정의
interface ResponseProgress {
  id: string;
  studentId: string;
  studentName: string;
  className?: string;
  progress: number;
  status: "pending" | "in_progress" | "completed" | "overdue";
  submittedAt?: string;
  lastActivity?: string;
}

interface ProgressStats {
  totalTargets: number;
  completed: number;
  inProgress: number;
  pending: number;
  overallProgress: number;
  deadline?: string;
}

export default function FormProgressPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const { setPageHeader } = usePageHeader();
  const groupId = params.id as string;
  const formId = params.formId as string;

  // 상태 관리
  const [form, setForm] = useState<FormWithDetails | null>(null);
  const [responses, setResponses] = useState<ResponseProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");

  // 통계 데이터
  const [stats, setStats] = useState<ProgressStats>({
    totalTargets: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
    overallProgress: 0,
  });

  useEffect(() => {
    if (!user) {
      router.push("/auth");
      return;
    }
    loadFormData();
  }, [user, groupId, formId]);

  // 페이지 헤더 설정
  useEffect(() => {
    if (form) {
      setPageHeader({
        title: form.title,
        subtitle: `${form.description || "폼 진행상황"} • 전체 진행률 ${stats.overallProgress}%`,
        backUrl: `/groups/${groupId}/forms`,
        breadcrumb: [
          { title: "그룹", href: "/groups" },
          { title: "그룹 상세", href: `/groups/${groupId}` },
          { title: "폼 관리", href: `/groups/${groupId}/forms` },
          { title: "진행상황" },
        ],
        actions: (
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadFormData}>
              새로고침
            </Button>
            <Button icon={<DownloadOutlined />}>진행상황 내보내기</Button>
            <Button
              type="primary"
              icon={<EyeOutlined />}
              onClick={() => router.push(`/groups/${groupId}/forms/${formId}`)}
            >
              폼 상세보기
            </Button>
          </Space>
        ),
      });
    }

    return () => setPageHeader(null);
  }, [setPageHeader, groupId, formId, form, stats, router]);

  // 폼 데이터 로드
  const loadFormData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [formResult, responsesResult] = await Promise.all([
        getFormDetails(formId),
        getFormResponses(formId),
      ]);

      if (formResult.success && formResult.data) {
        setForm(formResult.data);
      }

      if (responsesResult.success && responsesResult.data) {
        // 실제 데이터 대신 예시 데이터 사용
        const mockResponses: ResponseProgress[] = [
          {
            id: "1",
            studentId: "student1",
            studentName: "김민수",
            className: "고1-A반",
            progress: 100,
            status: "completed",
            submittedAt: "2024. 1. 16.",
            lastActivity: "2024. 1. 16. 14:30",
          },
          {
            id: "2",
            studentId: "student2",
            studentName: "이지은",
            className: "고1-A반",
            progress: 75,
            status: "in_progress",
            lastActivity: "2024. 1. 17. 10:15",
          },
          {
            id: "3",
            studentId: "student3",
            studentName: "박준호",
            className: "고1-B반",
            progress: 0,
            status: "pending",
            lastActivity: "2024. 1. 15. 16:45",
          },
          {
            id: "4",
            studentId: "student4",
            studentName: "최서연",
            className: "고1-A반",
            progress: 100,
            status: "completed",
            submittedAt: "2024. 1. 17.",
            lastActivity: "2024. 1. 17. 09:20",
          },
          {
            id: "5",
            studentId: "student5",
            studentName: "정태현",
            className: "고2-A반",
            progress: 30,
            status: "in_progress",
            lastActivity: "2024. 1. 17. 11:10",
          },
        ];

        setResponses(mockResponses);

        // 통계 계산
        const total = mockResponses.length;
        const completed = mockResponses.filter((r) => r.status === "completed").length;
        const inProgress = mockResponses.filter((r) => r.status === "in_progress").length;
        const pending = mockResponses.filter((r) => r.status === "pending").length;
        const overallProgress =
          total > 0 ? Math.round(mockResponses.reduce((sum, r) => sum + r.progress, 0) / total) : 0;

        setStats({
          totalTargets: total,
          completed,
          inProgress,
          pending,
          overallProgress,
          deadline: "2024. 1. 20.",
        });
      }
    } catch (error) {
      message.error("폼 진행상황을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [user, formId]);

  // 필터링된 응답 목록
  const filteredResponses = responses.filter((response) => {
    const matchesSearch =
      response.studentName.toLowerCase().includes(searchText.toLowerCase()) ||
      response.className?.toLowerCase().includes(searchText.toLowerCase());
    const matchesStatus = statusFilter === "all" || response.status === statusFilter;
    const matchesClass = classFilter === "all" || response.className === classFilter;

    return matchesSearch && matchesStatus && matchesClass;
  });

  // 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "success";
      case "in_progress":
        return "processing";
      case "pending":
        return "default";
      case "overdue":
        return "error";
      default:
        return "default";
    }
  };

  // 상태별 텍스트
  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "제출 완료";
      case "in_progress":
        return "미제출 작성중";
      case "pending":
        return "미제출 접속";
      case "overdue":
        return "마감됨";
      default:
        return status;
    }
  };

  // 상태별 아이콘
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircleOutlined />;
      case "in_progress":
        return <ClockCircleOutlined />;
      case "pending":
        return <ExclamationCircleOutlined />;
      case "overdue":
        return <WarningOutlined />;
      default:
        return <QuestionCircleOutlined />;
    }
  };

  // 고유 클래스 목록
  const uniqueClasses = [...new Set(responses.map((r) => r.className).filter(Boolean))];

  // 테이블 컬럼 설정
  const columns = [
    {
      title: "학생",
      key: "student",
      render: (record: ResponseProgress) => (
        <div className="flex items-center space-x-3">
          <Avatar size="small" icon={<UserOutlined />} />
          <div>
            <div className="font-medium">{record.studentName}</div>
            {record.className && <div className="text-xs text-gray-500">{record.className}</div>}
          </div>
        </div>
      ),
    },
    {
      title: "완료",
      key: "progress",
      width: 100,
      render: (record: ResponseProgress) => (
        <div className="text-center">
          <div className="text-lg font-bold">
            {record.progress === 100 ? (
              <CheckCircleOutlined className="text-green-500" />
            ) : (
              <ClockCircleOutlined className="text-orange-500" />
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1">{record.progress}%</div>
        </div>
      ),
    },
    {
      title: "진행중",
      key: "status",
      width: 120,
      render: (record: ResponseProgress) => (
        <div className="text-center">
          <Tag color={getStatusColor(record.status)} icon={getStatusIcon(record.status)}>
            {getStatusText(record.status)}
          </Tag>
          {record.submittedAt && (
            <div className="text-xs text-gray-500 mt-1">{record.submittedAt}</div>
          )}
        </div>
      ),
    },
    {
      title: "마감까지",
      key: "deadline",
      width: 100,
      render: (record: ResponseProgress) => {
        if (record.status === "completed") {
          return <div className="text-center text-green-600 font-medium">제출 완료</div>;
        }

        return (
          <div className="text-center">
            <div className="text-red-600 font-medium">마감됨</div>
            <div className="text-xs text-gray-500">2024. 1. 20.</div>
          </div>
        );
      },
    },
    {
      title: "작업",
      key: "actions",
      width: 100,
      render: (record: ResponseProgress) => (
        <Space>
          <Tooltip title="응답 상세보기">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                if (record.status === "completed") {
                  router.push(`/groups/${groupId}/forms/${formId}/responses/${record.id}`);
                } else {
                  message.info("아직 응답이 완료되지 않았습니다.");
                }
              }}
            />
          </Tooltip>
          <Tooltip title="메시지 보내기">
            <Button
              type="text"
              size="small"
              icon={<MessageOutlined />}
              onClick={() => {
                Modal.info({
                  title: "알림 전송",
                  content: `${record.studentName}님에게 폼 작성 알림을 보내시겠습니까?`,
                });
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <Spin size="large" />
            <p className="mt-4 text-gray-600">진행상황을 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 전체 진행률 표시 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <Statistic
              title="전체 진행률"
              value={stats.overallProgress}
              suffix="%"
              valueStyle={{ color: stats.overallProgress >= 70 ? "#3f8600" : "#cf1322" }}
            />
            <Progress
              percent={stats.overallProgress}
              strokeColor={{
                from: "#108ee9",
                to: "#87d068",
              }}
              className="mt-2"
            />
          </Card>

          <Card>
            <Statistic
              title="완료"
              value={stats.completed}
              suffix={`건 / 전체 ${stats.totalTargets}건 중`}
              valueStyle={{ color: "#3f8600" }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>

          <Card>
            <Statistic
              title="진행중"
              value={stats.inProgress}
              suffix="건"
              valueStyle={{ color: "#1890ff" }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>

          <Card>
            <Statistic
              title="마감까지"
              value="마감됨"
              valueStyle={{ color: "#cf1322" }}
              prefix={<WarningOutlined />}
            />
            {stats.deadline && <div className="text-xs text-gray-500 mt-1">{stats.deadline}</div>}
          </Card>
        </div>

        {/* 마감 알림 */}
        <Alert
          message="마감된 폼입니다"
          description="이 폼은 2024년 1월 20일에 마감되었습니다. 추가 응답은 받을 수 없습니다."
          type="warning"
          showIcon
          className="mb-6"
        />

        {/* 학생별 현황 */}
        <Card
          title={
            <div className="flex items-center justify-between">
              <span>학생별 현황</span>
              <div className="flex items-center space-x-2">
                <Search
                  placeholder="학생 이름 또는 반 검색..."
                  allowClear
                  style={{ width: 200 }}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
                <Select
                  placeholder="상태"
                  style={{ width: 120 }}
                  value={statusFilter}
                  onChange={setStatusFilter}
                >
                  <Select.Option value="all">전체</Select.Option>
                  <Select.Option value="completed">완료</Select.Option>
                  <Select.Option value="in_progress">진행중</Select.Option>
                  <Select.Option value="pending">대기</Select.Option>
                </Select>
                <Select
                  placeholder="반"
                  style={{ width: 120 }}
                  value={classFilter}
                  onChange={setClassFilter}
                >
                  <Select.Option value="all">전체 반</Select.Option>
                  {uniqueClasses.map((className) => (
                    <Select.Option key={className} value={className}>
                      {className}
                    </Select.Option>
                  ))}
                </Select>
              </div>
            </div>
          }
        >
          <Table
            rowKey="id"
            columns={columns}
            dataSource={filteredResponses}
            pagination={{
              total: filteredResponses.length,
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}명`,
            }}
            locale={{
              emptyText: (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="검색 결과가 없습니다" />
              ),
            }}
          />
        </Card>

        {/* 반별 현황 요약 */}
        <Card title="반별 진행 요약" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {uniqueClasses.map((className) => {
              const classResponses = responses.filter((r) => r.className === className);
              const classCompleted = classResponses.filter((r) => r.status === "completed").length;
              const classProgress =
                classResponses.length > 0
                  ? Math.round((classCompleted / classResponses.length) * 100)
                  : 0;

              return (
                <Card key={className} size="small">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{className}</span>
                    <Tag color="blue">{classResponses.length}명</Tag>
                  </div>
                  <Progress
                    percent={classProgress}
                    size="small"
                    strokeColor={classProgress >= 70 ? "#52c41a" : "#faad14"}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {classCompleted}/{classResponses.length} 완료
                  </div>
                </Card>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
