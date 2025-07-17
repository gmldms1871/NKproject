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
  Tabs,
  Tag,
  Modal,
  message,
  Badge,
  Avatar,
  Tooltip,
  Alert,
  Progress,
  Spin,
  Empty,
  Divider,
  Typography,
} from "antd";
import {
  FileTextOutlined,
  RobotOutlined,
  EyeOutlined,
  DownloadOutlined,
  ReloadOutlined,
  BulbOutlined,
  TrophyOutlined,
  WarningOutlined,
  BookOutlined,
  UserOutlined,
  CalendarOutlined,
  SearchOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/contexts/auth-context";
import { usePageHeader } from "@/contexts/page-header-context";
import {
  getAllFinalReports,
  generateReportSummary,
  bulkGenerateSummary,
  getFinalReportSummary,
} from "@/lib/geminis";
import dayjs from "dayjs";

const { Text, Paragraph, Title } = Typography;
const { Search } = Input;

// 타입 정의
interface FinalReport {
  id: string;
  formId: string;
  formTitle: string;
  studentId: string;
  studentName: string;
  className?: string;
  submittedAt: string;
  timeTeacherComment?: string;
  teacherComment?: string;
  stage: number;
  hasSummary: boolean;
  summaryGeneratedAt?: string;
  summaryData?: GeneratedSummary;
}

interface GeneratedSummary {
  id: string;
  reportId: string;
  studentSummary: string;
  timeTeacherSummary: string;
  teacherSummary: string;
  overallSummary: string;
  insights: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
  generatedAt: string;
  generatedBy: string;
}

interface FormOverviewSummary {
  formId: string;
  formTitle: string;
  totalReports: number;
  completedReports: number;
  averageScore?: number;
  commonStrengths: string[];
  commonWeaknesses: string[];
  generalRecommendations: string[];
  generatedAt: string;
}

export default function FinalReportsSummaryPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const { setPageHeader } = usePageHeader();
  const groupId = params.id as string;

  // 상태 관리
  const [activeTab, setActiveTab] = useState("individual");
  const [reports, setReports] = useState<FinalReport[]>([]);
  const [formOverviews, setFormOverviews] = useState<FormOverviewSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [formFilter, setFormFilter] = useState<string>("all");
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  // 모달 상태
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState<GeneratedSummary | null>(null);
  const [overviewModalVisible, setOverviewModalVisible] = useState(false);
  const [selectedOverview, setSelectedOverview] = useState<FormOverviewSummary | null>(null);

  // 통계 데이터
  const [statistics, setStatistics] = useState({
    totalReports: 0,
    summarizedReports: 0,
    pendingSummaries: 0,
    averageInsights: 0,
  });

  useEffect(() => {
    if (!user) {
      router.push("/auth");
      return;
    }
    loadData();
  }, [user, groupId]);

  // 페이지 헤더 설정
  useEffect(() => {
    setPageHeader({
      title: "최종 보고서 요약",
      subtitle: "AI를 활용한 보고서 분석 및 인사이트 생성",
      backUrl: `/groups/${groupId}/reports`,
      breadcrumb: [
        { title: "그룹", href: "/groups" },
        { title: "그룹 상세", href: `/groups/${groupId}` },
        { title: "보고서 관리", href: `/groups/${groupId}/reports` },
        { title: "최종 보고서 요약" },
      ],
      actions: (
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadData}>
            새로고침
          </Button>
          <Button
            type="primary"
            icon={<RobotOutlined />}
            onClick={handleBulkGenerate}
            loading={generating}
            disabled={selectedRowKeys.length === 0}
          >
            선택된 보고서 일괄 요약
          </Button>
        </Space>
      ),
    });

    return () => setPageHeader(null);
  }, [setPageHeader, groupId, generating, selectedRowKeys]);

  // 데이터 로드
  const loadData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // 실제 API 호출 대신 예시 데이터 사용
      const mockReports: FinalReport[] = [
        {
          id: "1",
          formId: "form1",
          formTitle: "2025학년도 1학기 중간고사 분석",
          studentId: "student1",
          studentName: "김민수",
          className: "고1-A반",
          submittedAt: "2024-01-16T10:30:00Z",
          timeTeacherComment:
            "학생이 기본 개념은 잘 이해하고 있으나 응용 문제에서 어려움을 보입니다.",
          teacherComment:
            "전반적으로 성실한 학습 태도를 보이며, 추가 학습이 필요한 영역이 명확합니다.",
          stage: 3,
          hasSummary: true,
          summaryGeneratedAt: "2024-01-17T15:00:00Z",
          summaryData: {
            id: "summary1",
            reportId: "1",
            studentSummary: "김민수 학생은 기본 개념 이해도는 우수하나 응용력 향상이 필요합니다.",
            timeTeacherSummary:
              "기초 실력은 탄탄하지만 문제 해결 과정에서 논리적 사고력 보완이 요구됩니다.",
            teacherSummary: "성실한 학습 태도를 바탕으로 체계적인 응용 학습이 필요한 상황입니다.",
            overallSummary:
              "기본기가 탄탄한 학생으로, 응용 문제 해결 능력 향상을 위한 단계적 학습이 권장됩니다.",
            insights: {
              strengths: ["기본 개념 이해 우수", "성실한 학습 태도", "계산 능력 정확"],
              weaknesses: ["응용 문제 해결력 부족", "논리적 사고 과정 미흡"],
              recommendations: [
                "단계별 응용 문제 연습",
                "논리적 사고력 향상 프로그램",
                "개별 맞춤 학습",
              ],
            },
            generatedAt: "2024-01-17T15:00:00Z",
            generatedBy: user?.id || "",
          },
        },
        {
          id: "2",
          formId: "form1",
          formTitle: "2025학년도 1학기 중간고사 분석",
          studentId: "student2",
          studentName: "이지은",
          className: "고1-A반",
          submittedAt: "2024-01-16T11:15:00Z",
          timeTeacherComment: "전체적으로 우수한 이해도를 보이며 창의적 사고력이 돋보입니다.",
          teacherComment: "수학적 사고력이 뛰어나며 향후 심화 학습을 권장합니다.",
          stage: 3,
          hasSummary: false,
        },
      ];

      const mockOverviews: FormOverviewSummary[] = [
        {
          formId: "form1",
          formTitle: "2025학년도 1학기 중간고사 분석",
          totalReports: 25,
          completedReports: 23,
          averageScore: 75.5,
          commonStrengths: ["기본 개념 이해", "계산 정확도", "학습 태도"],
          commonWeaknesses: ["응용 문제 해결", "문제 해석 능력", "시간 관리"],
          generalRecommendations: ["단계적 응용 문제 연습", "독해력 향상", "시간 관리 훈련"],
          generatedAt: "2024-01-17T16:00:00Z",
        },
      ];

      setReports(mockReports);
      setFormOverviews(mockOverviews);

      // 통계 계산
      const total = mockReports.length;
      const summarized = mockReports.filter((r) => r.hasSummary).length;
      const pending = total - summarized;
      const avgInsights =
        summarized > 0
          ? mockReports
              .filter((r) => r.summaryData)
              .reduce((sum, r) => sum + (r.summaryData?.insights.recommendations.length || 0), 0) /
            summarized
          : 0;

      setStatistics({
        totalReports: total,
        summarizedReports: summarized,
        pendingSummaries: pending,
        averageInsights: Math.round(avgInsights * 10) / 10,
      });
    } catch (error) {
      message.error("데이터를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [user, groupId]);

  // 개별 요약 생성
  const handleGenerateSummary = async (reportId: string) => {
    if (!user) return;

    setGenerating(true);
    try {
      const result = await generateReportSummary({
        reportId,
        userId: user.id,
      });

      if (result.success) {
        message.success("보고서 요약이 생성되었습니다.");
        loadData();
      } else {
        message.error(result.error || "요약 생성에 실패했습니다.");
      }
    } catch (error) {
      message.error("요약 생성 중 오류가 발생했습니다.");
    } finally {
      setGenerating(false);
    }
  };

  // 일괄 요약 생성
  const handleBulkGenerate = async () => {
    if (!user || selectedRowKeys.length === 0) return;

    setGenerating(true);
    try {
      const result = await bulkGenerateSummary({
        reportIds: selectedRowKeys,
        userId: user.id,
        groupId,
      });

      if (result.success) {
        message.success(`${selectedRowKeys.length}개 보고서의 요약이 생성되었습니다.`);
        setSelectedRowKeys([]);
        loadData();
      } else {
        message.error(result.error || "일괄 요약 생성에 실패했습니다.");
      }
    } catch (error) {
      message.error("일괄 요약 생성 중 오류가 발생했습니다.");
    } finally {
      setGenerating(false);
    }
  };

  // 요약 상세 보기
  const handleViewSummary = (summary: GeneratedSummary) => {
    setSelectedSummary(summary);
    setSummaryModalVisible(true);
  };

  // 폼 개요 보기
  const handleViewOverview = (overview: FormOverviewSummary) => {
    setSelectedOverview(overview);
    setOverviewModalVisible(true);
  };

  // 필터링된 보고서 목록
  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      report.studentName.toLowerCase().includes(searchText.toLowerCase()) ||
      report.formTitle.toLowerCase().includes(searchText.toLowerCase());
    const matchesForm = formFilter === "all" || report.formId === formFilter;

    return matchesSearch && matchesForm;
  });

  // 개별 보고서 요약 테이블 컬럼
  const reportColumns = [
    {
      title: "학생",
      key: "student",
      render: (record: FinalReport) => (
        <div className="flex items-center space-x-2">
          <Avatar size="small" icon={<UserOutlined />} />
          <div>
            <div className="font-medium">{record.studentName}</div>
            <div className="text-xs text-gray-500">{record.className}</div>
          </div>
        </div>
      ),
    },
    {
      title: "폼",
      key: "form",
      render: (record: FinalReport) => (
        <div>
          <div className="font-medium">{record.formTitle}</div>
          <div className="text-xs text-gray-500">
            {dayjs(record.submittedAt).format("MM/DD HH:mm")}
          </div>
        </div>
      ),
    },
    {
      title: "AI 요약",
      key: "summary",
      width: 120,
      render: (record: FinalReport) => (
        <div className="text-center">
          {record.hasSummary ? (
            <div>
              <Tag color="green" icon={<RobotOutlined />}>
                완료
              </Tag>
              <div className="text-xs text-gray-500 mt-1">
                {record.summaryGeneratedAt ? dayjs(record.summaryGeneratedAt).format("MM/DD") : "-"}
              </div>
            </div>
          ) : (
            <Tag color="orange">대기중</Tag>
          )}
        </div>
      ),
    },
    {
      title: "인사이트",
      key: "insights",
      width: 100,
      render: (record: FinalReport) => (
        <div className="text-center">
          {record.summaryData ? (
            <div>
              <Badge count={record.summaryData.insights.recommendations.length} color="blue" />
              <div className="text-xs text-gray-500 mt-1">권장사항</div>
            </div>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      ),
    },
    {
      title: "작업",
      key: "actions",
      width: 150,
      render: (record: FinalReport) => (
        <Space>
          {record.hasSummary && record.summaryData ? (
            <Button
              type="primary"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewSummary(record.summaryData!)}
            >
              요약 보기
            </Button>
          ) : (
            <Button
              size="small"
              icon={<RobotOutlined />}
              onClick={() => handleGenerateSummary(record.id)}
              loading={generating}
            >
              요약 생성
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // 폼별 개요 테이블 컬럼
  const overviewColumns = [
    {
      title: "폼",
      dataIndex: "formTitle",
      key: "formTitle",
      render: (title: string) => <div className="font-medium">{title}</div>,
    },
    {
      title: "완료율",
      key: "completion",
      width: 150,
      render: (record: FormOverviewSummary) => {
        const rate = (record.completedReports / record.totalReports) * 100;
        return (
          <div>
            <Progress percent={rate} size="small" />
            <div className="text-xs text-gray-500 mt-1">
              {record.completedReports}/{record.totalReports}
            </div>
          </div>
        );
      },
    },
    {
      title: "평균 점수",
      dataIndex: "averageScore",
      key: "averageScore",
      width: 100,
      render: (score: number) => (
        <div className="text-center">
          <div className="text-lg font-bold">{score?.toFixed(1) || "-"}</div>
          <div className="text-xs text-gray-500">점</div>
        </div>
      ),
    },
    {
      title: "공통 강점",
      key: "strengths",
      width: 200,
      render: (record: FormOverviewSummary) => (
        <div>
          {record.commonStrengths.slice(0, 2).map((strength, idx) => (
            <Tag key={idx} color="green" size="small" className="mb-1">
              {strength}
            </Tag>
          ))}
          {record.commonStrengths.length > 2 && (
            <Tag size="small">+{record.commonStrengths.length - 2}</Tag>
          )}
        </div>
      ),
    },
    {
      title: "개선점",
      key: "weaknesses",
      width: 200,
      render: (record: FormOverviewSummary) => (
        <div>
          {record.commonWeaknesses.slice(0, 2).map((weakness, idx) => (
            <Tag key={idx} color="orange" size="small" className="mb-1">
              {weakness}
            </Tag>
          ))}
          {record.commonWeaknesses.length > 2 && (
            <Tag size="small">+{record.commonWeaknesses.length - 2}</Tag>
          )}
        </div>
      ),
    },
    {
      title: "작업",
      key: "actions",
      width: 100,
      render: (record: FormOverviewSummary) => (
        <Button
          type="primary"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewOverview(record)}
        >
          상세 보기
        </Button>
      ),
    },
  ];

  const uniqueForms = [...new Set(reports.map((r) => ({ id: r.formId, title: r.formTitle })))];

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <Spin size="large" />
            <p className="mt-4 text-gray-600">데이터를 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">전체 보고서</p>
                <p className="text-2xl font-bold">{statistics.totalReports}</p>
              </div>
              <FileTextOutlined style={{ fontSize: 24, color: "#1890ff" }} />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">AI 요약 완료</p>
                <p className="text-2xl font-bold">{statistics.summarizedReports}</p>
              </div>
              <RobotOutlined style={{ fontSize: 24, color: "#52c41a" }} />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">요약 대기</p>
                <p className="text-2xl font-bold">{statistics.pendingSummaries}</p>
              </div>
              <BulbOutlined style={{ fontSize: 24, color: "#faad14" }} />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">평균 인사이트</p>
                <p className="text-2xl font-bold">{statistics.averageInsights}</p>
              </div>
              <TrophyOutlined style={{ fontSize: 24, color: "#722ed1" }} />
            </div>
          </Card>
        </div>

        {/* AI 요약 안내 */}
        <Alert
          message="AI 보고서 요약 기능"
          description="Gemini AI를 활용하여 학생 응답, 시간강사 코멘트, 선생님 코멘트를 종합 분석하고 인사이트를 제공합니다."
          type="info"
          showIcon
          icon={<RobotOutlined />}
          className="mb-6"
        />

        {/* 탭 메뉴 */}
        <Card>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: "individual",
                label: (
                  <span>
                    <UserOutlined />
                    개별 보고서 요약
                  </span>
                ),
                children: (
                  <div>
                    {/* 필터 */}
                    <div className="flex items-center justify-between mb-4">
                      <Space>
                        <Search
                          placeholder="학생 이름 또는 폼 제목 검색..."
                          allowClear
                          style={{ width: 300 }}
                          value={searchText}
                          onChange={(e) => setSearchText(e.target.value)}
                        />
                        <Select
                          placeholder="폼 선택"
                          style={{ width: 200 }}
                          value={formFilter}
                          onChange={setFormFilter}
                        >
                          <Select.Option value="all">전체 폼</Select.Option>
                          {uniqueForms.map((form) => (
                            <Select.Option key={form.id} value={form.id}>
                              {form.title}
                            </Select.Option>
                          ))}
                        </Select>
                      </Space>

                      {selectedRowKeys.length > 0 && (
                        <Alert
                          message={`${selectedRowKeys.length}개 보고서가 선택되었습니다`}
                          type="info"
                          showIcon
                          closable
                          onClose={() => setSelectedRowKeys([])}
                        />
                      )}
                    </div>

                    {/* 개별 보고서 테이블 */}
                    <Table
                      rowKey="id"
                      columns={reportColumns}
                      dataSource={filteredReports}
                      pagination={{
                        total: filteredReports.length,
                        pageSize: 10,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}개`,
                      }}
                      rowSelection={{
                        selectedRowKeys,
                        onChange: setSelectedRowKeys,
                        getCheckboxProps: (record) => ({
                          disabled: record.hasSummary, // 이미 요약된 것은 선택 불가
                        }),
                      }}
                      locale={{
                        emptyText: (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="완료된 보고서가 없습니다"
                          />
                        ),
                      }}
                    />
                  </div>
                ),
              },
              {
                key: "overview",
                label: (
                  <span>
                    <BookOutlined />
                    폼별 종합 분석
                  </span>
                ),
                children: (
                  <div>
                    {/* 폼별 개요 테이블 */}
                    <Table
                      rowKey="formId"
                      columns={overviewColumns}
                      dataSource={formOverviews}
                      pagination={false}
                      locale={{
                        emptyText: (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="폼별 분석 데이터가 없습니다"
                          />
                        ),
                      }}
                    />
                  </div>
                ),
              },
            ]}
          />
        </Card>

        {/* 개별 요약 상세 모달 */}
        <Modal
          title={`AI 요약 보고서`}
          open={summaryModalVisible}
          onCancel={() => setSummaryModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setSummaryModalVisible(false)}>
              닫기
            </Button>,
            <Button key="download" icon={<DownloadOutlined />}>
              PDF 다운로드
            </Button>,
          ]}
          width={800}
        >
          {selectedSummary && (
            <div className="space-y-6">
              <div>
                <Title level={4}>
                  <RobotOutlined className="mr-2" />
                  종합 요약
                </Title>
                <Paragraph>{selectedSummary.overallSummary}</Paragraph>
              </div>

              <Divider />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card size="small" title="학생 결과 요약">
                  <Paragraph>{selectedSummary.studentSummary}</Paragraph>
                </Card>

                <Card size="small" title="시간강사 코멘트 요약">
                  <Paragraph>{selectedSummary.timeTeacherSummary}</Paragraph>
                </Card>

                <Card size="small" title="선생님 코멘트 요약">
                  <Paragraph>{selectedSummary.teacherSummary}</Paragraph>
                </Card>
              </div>

              <Divider />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Title level={5}>
                    <TrophyOutlined className="mr-2 text-green-500" />
                    강점
                  </Title>
                  <ul className="space-y-1">
                    {selectedSummary.insights.strengths.map((strength, idx) => (
                      <li key={idx} className="flex items-center space-x-2">
                        <Tag color="green" size="small">
                          ✓
                        </Tag>
                        <span className="text-sm">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <Title level={5}>
                    <WarningOutlined className="mr-2 text-orange-500" />
                    개선점
                  </Title>
                  <ul className="space-y-1">
                    {selectedSummary.insights.weaknesses.map((weakness, idx) => (
                      <li key={idx} className="flex items-center space-x-2">
                        <Tag color="orange" size="small">
                          !
                        </Tag>
                        <span className="text-sm">{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <Title level={5}>
                    <BulbOutlined className="mr-2 text-blue-500" />
                    권장사항
                  </Title>
                  <ul className="space-y-1">
                    {selectedSummary.insights.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-center space-x-2">
                        <Tag color="blue" size="small">
                          →
                        </Tag>
                        <span className="text-sm">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="text-xs text-gray-500 pt-4 border-t">
                생성일시: {dayjs(selectedSummary.generatedAt).format("YYYY-MM-DD HH:mm:ss")}
              </div>
            </div>
          )}
        </Modal>

        {/* 폼별 종합 분석 모달 */}
        <Modal
          title={`폼별 종합 분석`}
          open={overviewModalVisible}
          onCancel={() => setOverviewModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setOverviewModalVisible(false)}>
              닫기
            </Button>,
            <Button key="download" icon={<DownloadOutlined />}>
              보고서 다운로드
            </Button>,
          ]}
          width={900}
        >
          {selectedOverview && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card size="small">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{selectedOverview.totalReports}</div>
                    <div className="text-sm text-gray-600">총 보고서</div>
                  </div>
                </Card>
                <Card size="small">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{selectedOverview.completedReports}</div>
                    <div className="text-sm text-gray-600">완료</div>
                  </div>
                </Card>
                <Card size="small">
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {selectedOverview.averageScore?.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-600">평균 점수</div>
                  </div>
                </Card>
              </div>

              <Divider />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Title level={4}>
                    <TrophyOutlined className="mr-2 text-green-500" />
                    공통 강점
                  </Title>
                  <div className="space-y-2">
                    {selectedOverview.commonStrengths.map((strength, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <Tag color="green">✓</Tag>
                        <span>{strength}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Title level={4}>
                    <WarningOutlined className="mr-2 text-orange-500" />
                    공통 개선점
                  </Title>
                  <div className="space-y-2">
                    {selectedOverview.commonWeaknesses.map((weakness, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <Tag color="orange">!</Tag>
                        <span>{weakness}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Title level={4}>
                    <BulbOutlined className="mr-2 text-blue-500" />
                    전체 권장사항
                  </Title>
                  <div className="space-y-2">
                    {selectedOverview.generalRecommendations.map((rec, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <Tag color="blue">→</Tag>
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="text-xs text-gray-500 pt-4 border-t">
                분석 생성일시: {dayjs(selectedOverview.generatedAt).format("YYYY-MM-DD HH:mm:ss")}
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}
