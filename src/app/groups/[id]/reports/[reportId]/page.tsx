"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  Button,
  Tag,
  Space,
  Descriptions,
  Divider,
  Typography,
  Progress,
  Alert,
  Spin,
  message,
  Row,
  Col,
  Timeline,
  Avatar,
  Tooltip,
} from "antd";
import {
  ArrowLeftOutlined,
  EditOutlined,
  UserOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  RobotOutlined,
  FileTextOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/contexts/auth-context";
import { usePageHeader } from "@/contexts/page-header-context";
import { getReportDetails, ReportWithDetails } from "@/lib/reports";
import { formatDate } from "@/lib/utils";

const { Title, Text, Paragraph } = Typography;

export default function ReportDetailPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;
  const reportId = params.reportId as string;
  const { user } = useAuth();
  const { setTitle, setBreadcrumbs } = usePageHeader();

  // 상태 관리
  const [report, setReport] = useState<ReportWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // 페이지 헤더 설정
  useEffect(() => {
    setTitle("보고서 상세");
    setBreadcrumbs([
      { title: "그룹", href: `/groups/${groupId}` },
      { title: "보고서", href: `/groups/${groupId}/reports` },
      { title: "상세", href: `/groups/${groupId}/reports/${reportId}` },
    ]);
  }, [groupId, reportId]);

  // 데이터 로드
  const loadReport = useCallback(async () => {
    if (!user || !reportId) return;

    try {
      setLoading(true);
      const result = await getReportDetails(reportId);

      if (result.success) {
        setReport(result.data || null);
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
  }, [user, reportId, loadReport]);

  // 단계별 색상 및 아이콘
  const getStageInfo = (stage: number, rejected: boolean) => {
    if (rejected) {
      return {
        color: "red",
        icon: <ExclamationCircleOutlined />,
        text: "반려됨",
      };
    }

    switch (stage) {
      case 0:
        return {
          color: "default",
          icon: <ClockCircleOutlined />,
          text: "응답 대기",
        };
      case 1:
        return {
          color: "processing",
          icon: <UserOutlined />,
          text: "시간강사 검토",
        };
      case 2:
        return {
          color: "warning",
          icon: <TeamOutlined />,
          text: "선생님 검토",
        };
      case 3:
        return {
          color: "success",
          icon: <CheckCircleOutlined />,
          text: "완료",
        };
      default:
        return {
          color: "default",
          icon: <ClockCircleOutlined />,
          text: "대기",
        };
    }
  };

  // 권한 확인
  const canEditTimeTeacher = () => {
    if (!report || !user) return false;
    return report.stage === 1 && report.time_teacher_id === user.id && !report.rejected_at;
  };

  const canEditTeacher = () => {
    if (!report || !user) return false;
    return report.stage === 2 && report.teacher_id === user.id && !report.rejected_at;
  };

  const canRefine = () => {
    if (!report || !user) return false;
    return report.stage === 3;
  };

  // 학생 응답 렌더링
  const renderStudentResponse = (response: any) => {
    if (!response) return null;

    return (
      <div className="space-y-4">
        {response.responses?.map((resp, index: number) => (
          <Card key={index} size="small" className="bg-gray-50">
            <div className="mb-2">
              <Text strong>{resp.questionText}</Text>
              {resp.isRequired && <Tag color="red">필수</Tag>}
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
                  <Text>평점: </Text>
                  <Progress
                    percent={(resp.response.ratingResponse / 5) * 100}
                    size="small"
                    showInfo={false}
                    strokeColor="#1890ff"
                  />
                  <Text>{resp.response.ratingResponse}/5</Text>
                </div>
              )}
              {resp.response.examResponse && (
                <div>
                  <Text strong>시험 응답:</Text>
                  <pre className="bg-gray-100 p-2 rounded text-sm mt-1">
                    {JSON.stringify(resp.response.examResponse, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    );
  };

  // 진행 타임라인
  const renderTimeline = () => {
    if (!report) return null;

    const timelineItems: Array<{ color: string; children: JSX.Element }> = [];

    // 생성
    timelineItems.push({
      color: "blue",
      children: (
        <div>
          <Text strong>보고서 생성</Text>
          <br />
          <Text type="secondary">{formatDate(report.created_at)}</Text>
        </div>
      ),
    });

    // 응답 제출
    if (report.formResponse) {
      timelineItems.push({
        color: "green",
        children: (
          <div>
            <Text strong>학생 응답 제출</Text>
            <br />
            <Text type="secondary">{formatDate(report.formResponse.submitted_at)}</Text>
          </div>
        ),
      });
    }

    // 시간강사 코멘트
    if (report.time_teacher_comment) {
      timelineItems.push({
        color: "orange",
        children: (
          <div>
            <Text strong>시간강사 코멘트 완료</Text>
            <br />
            <Text type="secondary">{formatDate(report.time_teacher_completed_at)}</Text>
            <br />
            <Text type="secondary">담당: {report.timeTeacher?.name}</Text>
          </div>
        ),
      });
    }

    // 선생님 코멘트
    if (report.teacher_comment) {
      timelineItems.push({
        color: "purple",
        children: (
          <div>
            <Text strong>선생님 코멘트 완료</Text>
            <br />
            <Text type="secondary">{formatDate(report.teacher_completed_at)}</Text>
            <br />
            <Text type="secondary">담당: {report.teacher?.name}</Text>
          </div>
        ),
      });
    }

    // 반려
    if (report.rejected_at) {
      timelineItems.push({
        color: "red",
        children: (
          <div>
            <Text strong>반려됨</Text>
            <br />
            <Text type="secondary">{formatDate(report.rejected_at)}</Text>
            <br />
            <Text type="secondary">사유: {report.rejection_reason}</Text>
          </div>
        ),
      });
    }

    return <Timeline items={timelineItems} />;
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

  const stageInfo = getStageInfo(report.stage || 0, !!report.rejected_at);

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => router.push(`/groups/${groupId}/reports`)}
            >
              목록으로
            </Button>
            <Title level={2} className="mb-0">
              {report.student_name} 학생 보고서
            </Title>
          </div>
          <Space>
            {canEditTimeTeacher() && (
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => router.push(`/groups/${groupId}/reports/${reportId}/comment`)}
              >
                시간강사 코멘트 작성
              </Button>
            )}
            {canEditTeacher() && (
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => router.push(`/groups/${groupId}/reports/${reportId}/comment`)}
              >
                선생님 코멘트 작성
              </Button>
            )}
            {canRefine() && (
              <Button
                icon={<RobotOutlined />}
                onClick={() => router.push(`/groups/${groupId}/reports/${reportId}/refine`)}
              >
                AI 정제
              </Button>
            )}
          </Space>
        </div>

        {/* 진행 상태 */}
        <Card className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Tag color={stageInfo.color} icon={stageInfo.icon}>
                {stageInfo.text}
              </Tag>
              <Progress
                percent={report.progressInfo.progressRate}
                size="small"
                strokeColor={stageInfo.color === "success" ? "#52c41a" : "#1890ff"}
              />
            </div>
            <Text type="secondary">{report.progressInfo.nextAction}</Text>
          </div>
        </Card>
      </div>

      <Row gutter={16}>
        {/* 왼쪽 컬럼 - 기본 정보 및 학생 응답 */}
        <Col span={16}>
          {/* 기본 정보 */}
          <Card title="기본 정보" className="mb-6">
            <Descriptions column={2}>
              <Descriptions.Item label="학생명">
                {report.student_name || "미지정"}
              </Descriptions.Item>
              <Descriptions.Item label="반">{report.class_name || "미지정"}</Descriptions.Item>
              <Descriptions.Item label="폼 제목">
                {report.form?.title || "알 수 없음"}
              </Descriptions.Item>
              <Descriptions.Item label="폼 생성자">
                {report.form?.creator_name || "알 수 없음"}
              </Descriptions.Item>
              <Descriptions.Item label="생성일">{formatDate(report.created_at)}</Descriptions.Item>
              <Descriptions.Item label="최종 수정일">
                {formatDate(report.updated_at)}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* 담당자 정보 */}
          <Card title="담당자 정보" className="mb-6">
            <Row gutter={16}>
              <Col span={12}>
                <div className="text-center p-4 border rounded">
                  <Avatar size={64} icon={<UserOutlined />} className="mb-2" />
                  <div>
                    <Text strong>시간강사</Text>
                    <br />
                    <Text>{report.timeTeacher?.name || "미배정"}</Text>
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div className="text-center p-4 border rounded">
                  <Avatar size={64} icon={<TeamOutlined />} className="mb-2" />
                  <div>
                    <Text strong>선생님</Text>
                    <br />
                    <Text>{report.teacher?.name || "미배정"}</Text>
                  </div>
                </div>
              </Col>
            </Row>
          </Card>

          {/* 학생 응답 */}
          {report.formResponse && (
            <Card title="학생 응답" className="mb-6">
              <div className="mb-4">
                <Text type="secondary">제출일: {formatDate(report.formResponse.submitted_at)}</Text>
              </div>
              {renderStudentResponse(report.formResponse)}
            </Card>
          )}

          {/* 코멘트 */}
          <Card title="코멘트" className="mb-6">
            {report.time_teacher_comment && (
              <div className="mb-6">
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

            {!report.time_teacher_comment && !report.teacher_comment && (
              <div className="text-center py-8 text-gray-500">아직 작성된 코멘트가 없습니다.</div>
            )}
          </Card>
        </Col>

        {/* 오른쪽 컬럼 - 진행 상황 */}
        <Col span={8}>
          <Card title="진행 상황" className="mb-6">
            {renderTimeline()}
          </Card>

          {/* 반려 정보 */}
          {report.rejected_at && (
            <Card title="반려 정보" className="mb-6">
              <Alert
                message="반려됨"
                description={
                  <div>
                    <Text>반려 사유: {report.rejection_reason}</Text>
                    <br />
                    <Text type="secondary">반려일: {formatDate(report.rejected_at)}</Text>
                  </div>
                }
                type="error"
                showIcon
              />
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}
