"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  Button,
  Space,
  Alert,
  Spin,
  message,
  Tag,
  Row,
  Col,
  Descriptions,
  Divider,
} from "antd";
import {
  ArrowLeftOutlined,
  RobotOutlined,
  LoadingOutlined,
  DownloadOutlined,
  CopyOutlined,
  UserOutlined,
  TeamOutlined,
  CheckCircleOutlined,
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
import { downloadReportAsPDF, extractPDFDataFromReport, PdfReportData } from "@/lib/pdf-generator";

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
  const [downloading, setDownloading] = useState(false);

  // 페이지 헤더 설정
  useEffect(() => {
    if (groupId && reportId) {
      setTitle("AI 정제");
      setBreadcrumbs([
        { title: "그룹", href: `/groups/${groupId}` },
        { title: "보고서", href: `/groups/${groupId}/reports` },
        { title: "상세", href: `/groups/${groupId}/reports/${reportId}` },
        { title: "AI 정제", href: `/groups/${groupId}/reports/${reportId}/refine` },
      ]);
    }
  }, [groupId, reportId, setTitle, setBreadcrumbs]);

  // 데이터 로드
  const loadReport = useCallback(async () => {
    if (!user?.id || !reportId) return;

    try {
      setLoading(true);
      const result = await getReportDetails(reportId);

      if (result.success && result.data) {
        const reportData = result.data;
        setReport(reportData);

        // 기존에 AI 정제가 완료되었다면 결과를 표시
        if (reportData.result) {
          const mockSummary: GeneratedSummary = {
            reportId: reportData.id,
            studentSummary: reportData.result,
            timeTeacherSummary: reportData.time_teacher_comment || "",
            teacherSummary: reportData.teacher_comment || "",
            overallSummary: reportData.result,
            insights: {
              strengths: ["적극적인 참여", "창의적 사고"],
              weaknesses: ["세부사항 부족", "시간 관리"],
              recommendations: ["추가 학습 자료 제공", "개별 피드백 강화"],
            },
            generatedAt: reportData.updated_at || new Date().toISOString(),
            generatedBy: user.id,
          };
          setSummary(mockSummary);
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
  }, [user?.id, reportId, groupId, router]);

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

      if (result.success && result.data) {
        setSummary(result.data);
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

  // PDF 다운로드
  const handleDownload = async () => {
    if (!report || !summary) {
      message.error("AI 요약이 생성되어야 PDF 다운로드가 가능합니다.");
      return;
    }

    try {
      setDownloading(true);

      const pdfData: PdfReportData = {
        ...extractPDFDataFromReport(report),
        summary: summary,
      };

      await downloadReportAsPDF(pdfData);
      message.success("PDF 다운로드가 완료되었습니다.");
    } catch (error) {
      console.error("PDF 다운로드 오류:", error);
      message.error("PDF 다운로드에 실패했습니다.");
    } finally {
      setDownloading(false);
    }
  };

  // 안전한 텍스트 렌더링 함수
  const safeText = (text: string | null | undefined, fallback = "정보 없음") => {
    return text?.trim() || fallback;
  };

  // 학생 응답 렌더링
  const renderStudentResponse = (response: FormResponseData) => {
    if (!response || !response.responses) return <div>응답 데이터가 없습니다.</div>;

    return (
      <div className="space-y-4">
        {response.responses.map((resp, index) => (
          <Card key={`response-${index}`} size="small" className="bg-gray-50">
            <div className="mb-2">
              <strong>{safeText(resp.questionText, `질문 ${index + 1}`)}</strong>
            </div>
            <div className="bg-white p-3 rounded border">
              {resp.response.textResponse && <div>{safeText(resp.response.textResponse)}</div>}
              {resp.response.numberResponse !== undefined && (
                <div>{resp.response.numberResponse}</div>
              )}
              {resp.response.ratingResponse !== undefined && (
                <div className="flex items-center space-x-2">
                  <span>평점: {resp.response.ratingResponse}/5</span>
                </div>
              )}
              {!resp.response.textResponse &&
                resp.response.numberResponse === undefined &&
                resp.response.ratingResponse === undefined && (
                  <div className="text-gray-500">응답 없음</div>
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
            <h1 className="text-2xl font-bold mb-0">AI 정제</h1>
          </div>
          <Space>
            {summary && (
              <Button
                icon={downloading ? <LoadingOutlined /> : <DownloadOutlined />}
                onClick={handleDownload}
                loading={downloading}
                type="primary"
              >
                PDF 다운로드
              </Button>
            )}
          </Space>
        </div>

        <Alert
          message={`${safeText(report.student_name)} 학생의 최종 보고서`}
          description={`${safeText(report.form?.title)} - ${safeText(
            report.class_name,
            "미지정 반"
          )}`}
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
            extra={
              summary && (
                <Button
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => copyToClipboard(summary.overallSummary)}
                >
                  복사
                </Button>
              )
            }
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
                {/* 재생성 버튼 */}
                {report.draft_status === "completed" && (
                  <div className="flex justify-end mb-4">
                    <Button
                      type="primary"
                      icon={generating ? <LoadingOutlined /> : <RobotOutlined />}
                      onClick={handleGenerateSummary}
                      loading={generating}
                      size="small"
                    >
                      재생성
                    </Button>
                  </div>
                )}

                {/* AI 생성 결과 */}
                <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                  <div className="whitespace-pre-line text-sm leading-relaxed">
                    {safeText(summary?.overallSummary || report.result)}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </Col>

        {/* 오른쪽 컬럼 - 원본 데이터 */}
        <Col span={12}>
          <div className="space-y-6">
            {/* 학생 응답 */}
            <Card
              title={
                <div className="flex items-center space-x-2">
                  <span>학생 응답</span>
                </div>
              }
              size="small"
            >
              {report.formResponse ? (
                renderStudentResponse(report.formResponse)
              ) : (
                <div className="text-gray-500">응답 데이터가 없습니다.</div>
              )}
            </Card>

            {/* 교사 코멘트 */}
            {(report.time_teacher_comment || report.teacher_comment) && (
              <Card title="교사 코멘트" size="small">
                <div className="space-y-4">
                  {report.time_teacher_comment && (
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <UserOutlined className="text-blue-600" />
                        <strong className="text-blue-600">시간강사 코멘트:</strong>
                      </div>
                      <div className="p-3 bg-blue-50 rounded">
                        {safeText(report.time_teacher_comment)}
                      </div>
                    </div>
                  )}

                  {report.teacher_comment && (
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <TeamOutlined className="text-purple-600" />
                        <strong className="text-purple-600">담임교사 코멘트:</strong>
                      </div>
                      <div className="p-3 bg-purple-50 rounded">
                        {safeText(report.teacher_comment)}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* 보고서 정보 */}
            <Card title="보고서 정보" size="small">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="학생명">
                  {safeText(report.student_name)}
                </Descriptions.Item>
                <Descriptions.Item label="반명">
                  {safeText(report.class_name, "미지정")}
                </Descriptions.Item>
                <Descriptions.Item label="폼 제목">
                  {safeText(report.form?.title)}
                </Descriptions.Item>
                <Descriptions.Item label="생성일">
                  {formatDate(report.created_at)}
                </Descriptions.Item>
                <Descriptions.Item label="완료일">
                  {formatDate(report.updated_at)}
                </Descriptions.Item>
                <Descriptions.Item label="상태">
                  <Tag color="success" icon={<CheckCircleOutlined />}>
                    완료됨
                  </Tag>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </div>
        </Col>
      </Row>
    </div>
  );
}
