"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Input,
  Select,
  DatePicker,
  Progress,
  Modal,
  message,
  Badge,
  Avatar,
  Tooltip,
  Popconfirm,
  Alert,
  Dropdown,
  Empty,
  Spin,
} from "antd";
import {
  EyeOutlined,
  CommentOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  FilterOutlined,
  UserOutlined,
  BookOutlined,
  CalendarOutlined,
  DownloadOutlined,
  EditOutlined,
  RollbackOutlined,
  CloseOutlined,
  FileTextOutlined,
  MoreOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/contexts/auth-context";
import { usePageHeader } from "@/contexts/page-header-context";
import {
  getAllReportsInGroup,
  searchReports,
  advanceReportStage,
  rejectReport,
  resetReport,
  ReportWithDetails,
  ReportSearchConditions,
} from "@/lib/reports";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;
const { TextArea } = Input;

// 타입 정의
interface ReportFilters {
  formTitle?: string;
  studentName?: string;
  className?: string;
  stage?: number[];
  status?: string[];
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  timeTeacher?: string;
  teacher?: string;
}

interface CommentModalData {
  reportId: string;
  studentName: string;
  commentType: "time_teacher" | "teacher";
}

export default function ReportsListPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const { setPageHeader } = usePageHeader();
  const groupId = params.id as string;

  // 상태 관리
  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [filters, setFilters] = useState<ReportFilters>({});
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  // 모달 상태
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [commentModalData, setCommentModalData] = useState<CommentModalData | null>(null);
  const [commentText, setCommentText] = useState("");
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedReportId, setSelectedReportId] = useState<string>("");

  // 통계 데이터
  const [statistics, setStatistics] = useState({
    total: 0,
    stage0: 0, // 응답 대기
    stage1: 0, // 시간강사 검토 대기
    stage2: 0, // 선생님 검토 대기
    stage3: 0, // 완료
    rejected: 0,
  });

  useEffect(() => {
    if (!user) {
      router.push("/auth");
      return;
    }
    loadReports();
  }, [user, groupId]);

  // 페이지 헤더 설정
  useEffect(() => {
    setPageHeader({
      title: "보고서 관리",
      subtitle: "폼 응답에 대한 검토 과정을 관리하고 진행상황을 확인하세요",
      backUrl: `/groups/${groupId}`,
      breadcrumb: [
        { title: "그룹", href: "/groups" },
        { title: "그룹 상세", href: `/groups/${groupId}` },
        { title: "보고서 관리" },
      ],
      actions: (
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadReports}>
            새로고침
          </Button>
          <Button icon={<FilterOutlined />} onClick={() => setFilterVisible(!filterVisible)}>
            필터
          </Button>
          <Button
            icon={<FileTextOutlined />}
            onClick={() => router.push(`/groups/${groupId}/reports/summary`)}
          >
            최종 보고서 요약
          </Button>
        </Space>
      ),
    });

    return () => setPageHeader(null);
  }, [setPageHeader, groupId, filterVisible]);

  // 보고서 목록 로드
  const loadReports = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // 실제 API 호출 대신 예시 데이터 사용
      const mockReports: ReportWithDetails[] = [
        {
          id: "1",
          form_id: "form1",
          form_response_id: "response1",
          stage: 1,
          student_name: "김민수",
          class_name: "고1-A반",
          teacher_id: null,
          time_teacher_id: null,
          supervision_id: null,
          teacher_comment: null,
          teacher_completed_at: null,
          time_teacher_comment: null,
          time_teacher_completed_at: null,
          rejected_at: null,
          rejected_by: null,
          rejection_reason: null,
          draft_status: null,
          created_at: "2024-01-16T00:00:00Z",
          updated_at: "2024-01-16T00:00:00Z",
          form: {
            id: "form1",
            title: "2025학년도 1학기 중간고사 분석",
            description: "수학 중간고사 분석",
            creator_name: "이선생",
            created_at: "2024-01-15T00:00:00Z",
          },
          student: {
            id: "student1",
            name: "김민수",
            nickname: "민수",
            class_name: "고1-A반",
          },
          timeTeacher: {
            id: "teacher1",
            name: "박시간강사",
            nickname: "박강사",
          },
          teacher: {
            id: "teacher2",
            name: "최부장",
            nickname: "최부장",
          },
          formResponse: {
            id: "response1",
            status: "completed",
            submitted_at: "2024-01-16T10:30:00Z",
            responses: [],
          },
          progressInfo: {
            currentStage: 1,
            status: "waiting_time_teacher",
            canEdit: false,
            nextAction: "시간강사 검토 대기",
          },
        },
        {
          id: "2",
          form_id: "form1",
          form_response_id: "response2",
          stage: 2,
          student_name: "이지은",
          class_name: "고1-A반",
          teacher_id: null,
          time_teacher_id: null,
          supervision_id: null,
          teacher_comment: null,
          teacher_completed_at: null,
          time_teacher_comment: "학생의 수학 이해도가 향상되었습니다.",
          time_teacher_completed_at: "2024-01-17T14:20:00Z",
          rejected_at: null,
          rejected_by: null,
          rejection_reason: null,
          draft_status: null,
          created_at: "2024-01-16T00:00:00Z",
          updated_at: "2024-01-17T14:20:00Z",
          form: {
            id: "form1",
            title: "2025학년도 1학기 중간고사 분석",
            description: "수학 중간고사 분석",
            creator_name: "이선생",
            created_at: "2024-01-15T00:00:00Z",
          },
          student: {
            id: "student2",
            name: "이지은",
            nickname: "지은",
            class_name: "고1-A반",
          },
          timeTeacher: {
            id: "teacher1",
            name: "박시간강사",
            nickname: "박강사",
          },
          teacher: {
            id: "teacher2",
            name: "최부장",
            nickname: "최부장",
          },
          formResponse: {
            id: "response2",
            status: "completed",
            submitted_at: "2024-01-16T11:15:00Z",
            responses: [],
          },
          progressInfo: {
            currentStage: 2,
            status: "waiting_teacher",
            canEdit: false,
            nextAction: "선생님 검토 대기",
          },
        },
      ];

      setReports(mockReports);

      // 통계 계산
      const total = mockReports.length;
      const stage0 = mockReports.filter((r) => r.stage === 0).length;
      const stage1 = mockReports.filter((r) => r.stage === 1).length;
      const stage2 = mockReports.filter((r) => r.stage === 2).length;
      const stage3 = mockReports.filter((r) => r.stage === 3).length;
      const rejected = mockReports.filter((r) => r.rejected_at).length;

      setStatistics({ total, stage0, stage1, stage2, stage3, rejected });
    } catch (error) {
      message.error("보고서 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [user, groupId]);

  // 검색 및 필터링
  const handleSearch = async () => {
    if (!user) return;

    setSearchLoading(true);
    try {
      const conditions: ReportSearchConditions = {
        groupId,
        formId: filters.formTitle,
        studentName: filters.studentName,
        className: filters.className,
        stage: filters.stage,
        status: filters.status,
        createdAfter: filters.dateRange?.[0]?.toISOString(),
        createdBefore: filters.dateRange?.[1]?.toISOString(),
        timeTeacherId: filters.timeTeacher,
        teacherId: filters.teacher,
      };

      const result = await searchReports(conditions);

      if (result.success && result.data) {
        setReports(result.data);
      }
    } catch (error) {
      message.error("검색 중 오류가 발생했습니다.");
    } finally {
      setSearchLoading(false);
    }
  };

  // 코멘트 추가
  const handleAddComment = (
    reportId: string,
    studentName: string,
    commentType: "time_teacher" | "teacher"
  ) => {
    setCommentModalData({ reportId, studentName, commentType });
    setCommentText("");
    setCommentModalVisible(true);
  };

  // 코멘트 저장
  const handleSaveComment = async () => {
    if (!commentModalData || !commentText.trim()) {
      message.error("코멘트를 입력해주세요.");
      return;
    }

    try {
      // 실제 API 호출
      // const result = await advanceReportStage({
      //   reportId: commentModalData.reportId,
      //   userId: user!.id,
      //   comment: commentText,
      //   commentType: commentModalData.commentType,
      // });

      message.success("코멘트가 저장되었습니다.");
      setCommentModalVisible(false);
      setCommentModalData(null);
      setCommentText("");
      loadReports();
    } catch (error) {
      message.error("코멘트 저장 중 오류가 발생했습니다.");
    }
  };

  // 보고서 반려
  const handleRejectReport = async () => {
    if (!selectedReportId || !rejectReason.trim()) {
      message.error("반려 사유를 입력해주세요.");
      return;
    }

    try {
      // const result = await rejectReport({
      //   reportId: selectedReportId,
      //   rejectedBy: user!.id,
      //   rejectionReason: rejectReason,
      // });

      message.success("보고서가 반려되었습니다.");
      setRejectModalVisible(false);
      setSelectedReportId("");
      setRejectReason("");
      loadReports();
    } catch (error) {
      message.error("보고서 반려 중 오류가 발생했습니다.");
    }
  };

  // 보고서 리셋
  const handleResetReport = async (reportId: string) => {
    try {
      // const result = await resetReport({
      //   reportId,
      //   resetBy: user!.id,
      //   resetReason: "다시 작성 요청",
      // });

      message.success("보고서가 리셋되었습니다.");
      loadReports();
    } catch (error) {
      message.error("보고서 리셋 중 오류가 발생했습니다.");
    }
  };

  // 단계별 색상
  const getStageColor = (stage: number) => {
    switch (stage) {
      case 0:
        return "default";
      case 1:
        return "processing";
      case 2:
        return "warning";
      case 3:
        return "success";
      default:
        return "default";
    }
  };

  // 단계별 텍스트
  const getStageText = (stage: number) => {
    switch (stage) {
      case 0:
        return "응답 대기";
      case 1:
        return "시간강사 검토";
      case 2:
        return "선생님 검토";
      case 3:
        return "완료";
      default:
        return `단계 ${stage}`;
    }
  };

  // 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "success";
      case "waiting_time_teacher":
        return "processing";
      case "waiting_teacher":
        return "warning";
      case "rejected":
        return "error";
      case "reset":
        return "default";
      default:
        return "default";
    }
  };

  // 테이블 컬럼 설정
  const columns = [
    {
      title: "학생",
      key: "student",
      render: (record: ReportWithDetails) => (
        <div className="flex items-center space-x-2">
          <Avatar size="small" icon={<UserOutlined />} />
          <div>
            <div className="font-medium">{record.student_name}</div>
            <div className="text-xs text-gray-500">{record.class_name}</div>
          </div>
        </div>
      ),
    },
    {
      title: "폼",
      key: "form",
      render: (record: ReportWithDetails) => (
        <div>
          <div className="font-medium">{record.form?.title}</div>
          <div className="text-xs text-gray-500">
            {dayjs(record.form?.created_at).format("MM/DD")}
          </div>
        </div>
      ),
    },
    {
      title: "현재 단계",
      key: "stage",
      width: 120,
      render: (record: ReportWithDetails) => (
        <div className="text-center">
          <Tag color={getStageColor(record.stage || 0)}>{getStageText(record.stage || 0)}</Tag>
          <div className="text-xs text-gray-500 mt-1">{record.progressInfo?.nextAction}</div>
        </div>
      ),
    },
    {
      title: "진행률",
      key: "progress",
      width: 100,
      render: (record: ReportWithDetails) => {
        const progress = ((record.stage || 0) / 3) * 100;
        return (
          <div>
            <Progress
              percent={progress}
              size="small"
              strokeColor={progress === 100 ? "#52c41a" : "#1890ff"}
            />
            <div className="text-xs text-gray-500 text-center mt-1">{Math.round(progress)}%</div>
          </div>
        );
      },
    },
    {
      title: "제출일",
      key: "submitted",
      width: 100,
      render: (record: ReportWithDetails) => (
        <div className="text-center">
          <div className="text-sm">
            {record.formResponse?.submitted_at
              ? dayjs(record.formResponse.submitted_at).format("MM/DD")
              : "-"}
          </div>
          <div className="text-xs text-gray-500">
            {record.formResponse?.submitted_at
              ? dayjs(record.formResponse.submitted_at).format("HH:mm")
              : "미제출"}
          </div>
        </div>
      ),
    },
    {
      title: "담당자",
      key: "assignee",
      width: 150,
      render: (record: ReportWithDetails) => (
        <div className="space-y-1">
          {record.timeTeacher && (
            <div className="flex items-center space-x-1">
              <UserOutlined className="text-blue-500 text-xs" />
              <span className="text-xs">{record.timeTeacher.name}</span>
            </div>
          )}
          {record.teacher && (
            <div className="flex items-center space-x-1">
              <UserOutlined className="text-green-500 text-xs" />
              <span className="text-xs">{record.teacher.name}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "작업",
      key: "actions",
      width: 120,
      render: (record: ReportWithDetails) => {
        const canComment = (record.stage === 1 || record.stage === 2) && !record.rejected_at;
        const canReject = (record.stage === 1 || record.stage === 2) && !record.rejected_at;
        const canReset = record.stage !== 0 && !record.rejected_at;

        const menuItems = [
          {
            key: "view",
            icon: <EyeOutlined />,
            label: "상세 보기",
            onClick: () => router.push(`/groups/${groupId}/reports/${record.id}`),
          },
          ...(canComment
            ? [
                {
                  key: "comment",
                  icon: <CommentOutlined />,
                  label: record.stage === 1 ? "시간강사 코멘트" : "선생님 코멘트",
                  onClick: () =>
                    handleAddComment(
                      record.id,
                      record.student_name || "",
                      record.stage === 1 ? "time_teacher" : "teacher"
                    ),
                },
              ]
            : []),
          ...(canReject
            ? [
                {
                  key: "reject",
                  icon: <CloseOutlined />,
                  label: "반려",
                  danger: true,
                  onClick: () => {
                    setSelectedReportId(record.id);
                    setRejectModalVisible(true);
                  },
                },
              ]
            : []),
          ...(canReset
            ? [
                {
                  key: "reset",
                  icon: <RollbackOutlined />,
                  label: "리셋",
                  onClick: () => {
                    Modal.confirm({
                      title: "보고서 리셋",
                      content: "학생에게 다시 작성하도록 요청하시겠습니까?",
                      onOk: () => handleResetReport(record.id),
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
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold">{statistics.total}</div>
              <div className="text-sm text-gray-600">전체</div>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-500">{statistics.stage0}</div>
              <div className="text-sm text-gray-600">응답 대기</div>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">{statistics.stage1}</div>
              <div className="text-sm text-gray-600">시간강사 검토</div>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-500">{statistics.stage2}</div>
              <div className="text-sm text-gray-600">선생님 검토</div>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{statistics.stage3}</div>
              <div className="text-sm text-gray-600">완료</div>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">{statistics.rejected}</div>
              <div className="text-sm text-gray-600">반려</div>
            </div>
          </Card>
        </div>

        {/* 필터 패널 */}
        {filterVisible && (
          <Card className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <Input
                placeholder="학생 이름 검색"
                value={filters.studentName}
                onChange={(e) => setFilters({ ...filters, studentName: e.target.value })}
                prefix={<SearchOutlined />}
              />

              <Input
                placeholder="반 이름 검색"
                value={filters.className}
                onChange={(e) => setFilters({ ...filters, className: e.target.value })}
              />

              <Select
                mode="multiple"
                placeholder="단계 선택"
                value={filters.stage}
                onChange={(stage) => setFilters({ ...filters, stage })}
                options={[
                  { value: 0, label: "응답 대기" },
                  { value: 1, label: "시간강사 검토" },
                  { value: 2, label: "선생님 검토" },
                  { value: 3, label: "완료" },
                ]}
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
                <Button onClick={() => setFilters({})}>초기화</Button>
              </div>
            </div>
          </Card>
        )}

        {/* 보고서 목록 테이블 */}
        <Card>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={reports}
            loading={loading}
            pagination={{
              total: reports.length,
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
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="보고서가 없습니다" />
              ),
            }}
          />
        </Card>

        {/* 코멘트 모달 */}
        <Modal
          title={`${
            commentModalData?.commentType === "time_teacher" ? "시간강사" : "선생님"
          } 코멘트 추가`}
          open={commentModalVisible}
          onOk={handleSaveComment}
          onCancel={() => {
            setCommentModalVisible(false);
            setCommentModalData(null);
            setCommentText("");
          }}
          okText="저장"
          cancelText="취소"
        >
          <div className="mb-4">
            <p>
              <strong>학생:</strong> {commentModalData?.studentName}
            </p>
          </div>
          <TextArea
            rows={4}
            placeholder="학생에 대한 코멘트를 입력하세요..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            maxLength={1000}
            showCount
          />
        </Modal>

        {/* 반려 모달 */}
        <Modal
          title="보고서 반려"
          open={rejectModalVisible}
          onOk={handleRejectReport}
          onCancel={() => {
            setRejectModalVisible(false);
            setSelectedReportId("");
            setRejectReason("");
          }}
          okText="반려"
          cancelText="취소"
          okButtonProps={{ danger: true }}
        >
          <div className="mb-4">
            <Alert
              message="보고서를 반려하면 학생이 다시 작성해야 합니다."
              type="warning"
              showIcon
            />
          </div>
          <TextArea
            rows={3}
            placeholder="반려 사유를 입력하세요..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            maxLength={500}
            showCount
          />
        </Modal>
      </div>
    </div>
  );
}
