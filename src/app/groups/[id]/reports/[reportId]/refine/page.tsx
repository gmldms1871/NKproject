"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  Button,
  Space,
  Typography,
  Alert,
  Spin,
  message,
  Tag,
  Row,
  Col,
  Descriptions,
  Divider,
  Collapse,
  List,
} from "antd";
import {
  ArrowLeftOutlined,
  RobotOutlined,
  FileTextOutlined,
  UserOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  DownloadOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/contexts/auth-context";
import { usePageHeader } from "@/contexts/page-header-context";
import {
  getReportDetails,
  generateReportSummary,
  GeneratedSummary,
  ReportWithDetails,
  FormResponseData,
} from "@/lib/reports";
import { formatDate } from "@/lib/utils";

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

export default function RefinePage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;
  const reportId = params.reportId as string;
  const { user } = useAuth();
  const { setTitle, setBreadcrumbs } = usePageHeader();

  // 상태 관리
  const [report, setReport] = useState<ReportWithDetails | null>(null);
  const [summary, setSummary] = useState<GeneratedSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // 페이지 헤더 설정
  useEffect(() => {
    setTitle("AI 정제");
    setBreadcrumbs([
      { title: "그룹", href: `/groups/${groupId}` },
      { title: "보고서", href: `/groups/${groupId}/reports` },
      { title: "상세", href: `/groups/${groupId}/reports/${reportId}` },
      { title: "AI 정제", href: `/groups/${groupId}/reports/${reportId}/refine` },
    ]);
  }, [groupId, reportId, setTitle, setBreadcrumbs]);

  // 데이터 로드
  const loadReport = useCallback(async () => {
    if (!user || !reportId) return;

    try {
      setLoading(true);
      const result = await getReportDetails(reportId);

      if (result.success) {
        const reportData = result.data;
        setReport(reportData || null);

        // 이미 생성된 요약이 있는지 확인
        if (reportData?.hasSummary) {
          // 실제로는 API에서 요약 데이터를 가져와야 함
          // 여기서는 임시로 빈 객체를 설정
          setSummary({
            reportId: reportId,
            studentSummary: "학생 응답 요약",
            timeTeacherSummary: reportData.time_teacher_comment || "",
            teacherSummary: reportData.teacher_comment || "",
            overallSummary: "전체 요약",
            insights: {
              strengths: ["적극적인 참여", "창의적 사고"],
              weaknesses: ["세부사항 부족", "시간 관리"],
              recommendations: ["추가 학습 자료 제공", "개별 피드백 강화"],
            },
            generatedAt: new Date().toISOString(),
            generatedBy: user.id,
          });
        }
      } else {
        message.error(result.error || "보고서를 불러오는데 실패했습니다.");
        router.push(`/groups/${groupId}/reports`);
      }
    } catch (error) {
      message.error("보고서 데이터를 불러오는데 실패했습니다.");
      router.push(`/groups/${groupId}/reports`);
    } finally {
      setLoading(false);
    }
  }, [user, reportId, groupId, router]);

  useEffect(() => {
    if (!user) {
      router.push("/auth");
      return;
    }
    if (reportId) {
      loadReport();
    }
  }, [user, reportId, loadReport, router]);

  // 권한 확인
  const canRefine = () => {
    if (!report || !user) return false;
    return report.stage === 3;
  };

  // AI 요약 생성
  const handleGenerateSummary = async () => {
    if (!user || !report) return;

    try {
      setGenerating(true);
      const result = await generateReportSummary({
        reportId: report.id,
        userId: user.id,
        summaryType: "individual",
      });

      if (result.success) {
        setSummary(result.data || null);
        message.success("AI 요약이 성공적으로 생성되었습니다.");
      } else {
        message.error(result.error || "AI 요약 생성에 실패했습니다.");
      }
    } catch (error) {
      message.error("AI 요약 생성 중 오류가 발생했습니다.");
    } finally {
      setGenerating(false);
    }
  };

  // 텍스트 복사
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success("클립보드에 복사되었습니다.");
    });
  };

  // 최종 보고서 다운로드 (실제로는 PDF 생성 로직 필요)
  const handleDownload = () => {
    message.info("PDF 다운로드 기능은 준비 중입니다.");
  };

  // 학생 응답 렌더링
  const renderStudentResponse = (response: FormResponseData) => {
    if (!response) return null;

    return (
      <div className="space-y-4">
        {response.responses?.map((resp, index: number) => (
          <Card key={index} size="small" className="bg-gray-50">
            <div className="mb-2">
              <Text strong>{resp.questionText}</Text>
            </div>
            <div className="bg-white p-3 rounded border">
              {resp.response.textResponse && (
                <Paragraph className="mb-0">{resp.response.textResponse}</Paragraph>
              )}
              {resp.response.numberResponse !== undefined && (
                <Text>{resp.response.numberResponse}</Text>
              )}
              {resp.response.ratingResponse !== undefined && (
                <div className="flex items-center space-x-2">
                  <Text>평점: {resp.response.ratingResponse}/5</Text>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-6">
        <Alert
          message="보고서를 찾을 수 없습니다"
          description="요청하신 보고서가 존재하지 않거나 접근 권한이 없습니다."
          type="error"
          showIcon
        />
      </div>
    );
  }

  if (!canRefine()) {
    return (
      <div className="p-6">
        <Alert
          message="AI 정제를 할 수 없습니다"
          description="완료된 보고서만 AI 정제가 가능합니다."
          type="error"
          showIcon
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => router.push(`/groups/${groupId}/reports/${reportId}`)}
            >
              상세보기로
            </Button>
            <Title level={2} className="mb-0">
              AI 정제
            </Title>
          </div>
          <Space>
            {summary && (
              <Button icon={<DownloadOutlined />} onClick={handleDownload}>
                PDF 다운로드
              </Button>
            )}
          </Space>
        </div>

        <Alert
          message={`${report.student_name} 학생의 최종 보고서`}
          description={`${report.form?.title} - ${report.class_name || "미지정 반"}`}
          type="success"
          showIcon
        />
      </div>

      <Row gutter={16}>
        {/* 왼쪽 컬럼 - AI 요약 */}
        <Col span={12}>
          <Card
            title={
              <div className="flex items-center space-x-2">
                <RobotOutlined />
                <span>학원 분석 결과지</span>
                {summary && <Tag color="green">생성됨</Tag>}
              </div>
            }
            className="mb-6"
          >
            {!report.result && !summary && report.draft_status !== "completed" ? (
              <div className="text-center py-8">
                <RobotOutlined style={{ fontSize: 48, color: "#d9d9d9", marginBottom: 16 }} />
                <p className="text-gray-500 mb-4">
                  AI를 통해 학생 응답과 교사 코멘트를 종합하여 학원 분석 결과지를 생성할 수
                  있습니다.
                </p>
                <Button
                  type="primary"
                  icon={generating ? <LoadingOutlined /> : <RobotOutlined />}
                  onClick={handleGenerateSummary}
                  loading={generating}
                >
                  학원 분석 결과지 생성
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 재생성 버튼 - 완료된 상태에서만 표시 */}
                {report.draft_status === "completed" && (
                  <div className="flex justify-end mb-4">
                    <Button
                      type="primary"
                      icon={generating ? <LoadingOutlined /> : <RobotOutlined />}
                      onClick={handleGenerateSummary}
                      loading={generating}
                    >
                      재생성
                    </Button>
                  </div>
                )}

                {/* 학원 분석 결과지 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Text strong>NK학원 분석 결과지</Text>
                    {(report.result || summary?.overallSummary) && (
                      <Button
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() =>
                          copyToClipboard(report.result || summary?.overallSummary || "")
                        }
                      >
                        복사
                      </Button>
                    )}
                  </div>
                  <Card size="small" className="bg-white border-2">
                    <div className="whitespace-pre-line font-mono text-sm">
                      {report.result || summary?.overallSummary || "AI 분석 결과가 없습니다."}
                    </div>
                  </Card>
                </div>

                {/* 생성일 표시 */}
                <div className="text-center text-gray-500 text-sm">
                  <Text>
                    생성일:{" "}
                    {report.result
                      ? formatDate(report.updated_at || "")
                      : summary?.generatedAt
                        ? formatDate(summary.generatedAt)
                        : "생성되지 않음"}
                  </Text>
                </div>
              </div>
            )}
          </Card>
        </Col>

        {/* 오른쪽 컬럼 - 원본 데이터 */}
        <Col span={12}>
          {/* 기본 정보 */}
          <Card title="기본 정보" className="mb-6">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="학생명">
                {report.student_name || "미지정"}
              </Descriptions.Item>
              <Descriptions.Item label="반">{report.class_name || "미지정"}</Descriptions.Item>
              <Descriptions.Item label="폼 제목">
                {report.form?.title || "알 수 없음"}
              </Descriptions.Item>
              <Descriptions.Item label="응답 제출일">
                {report.formResponse ? formatDate(report.formResponse.submitted_at) : "미제출"}
              </Descriptions.Item>
              <Descriptions.Item label="완료일">
                {formatDate(report.teacher_completed_at)}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* 원본 코멘트 */}
          <Card title="원본 코멘트" className="mb-6">
            {report.time_teacher_comment && (
              <div className="mb-4">
                <div className="flex items-center space-x-2 mb-2">
                  <UserOutlined />
                  <Text strong>시간강사 코멘트</Text>
                  <Text type="secondary">({formatDate(report.time_teacher_completed_at)})</Text>
                </div>
                <Card size="small" className="bg-blue-50">
                  <Paragraph className="mb-0">{report.time_teacher_comment}</Paragraph>
                </Card>
              </div>
            )}

            {report.teacher_comment && (
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <TeamOutlined />
                  <Text strong>선생님 코멘트</Text>
                  <Text type="secondary">({formatDate(report.teacher_completed_at)})</Text>
                </div>
                <Card size="small" className="bg-green-50">
                  <Paragraph className="mb-0">{report.teacher_comment}</Paragraph>
                </Card>
              </div>
            )}
          </Card>

          {/* 학생 응답 */}
          {report.formResponse && (
            <Card title="학생 응답">
              <div className="mb-4">
                <Text type="secondary">제출일: {formatDate(report.formResponse.submitted_at)}</Text>
              </div>
              {renderStudentResponse(report.formResponse)}
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}
