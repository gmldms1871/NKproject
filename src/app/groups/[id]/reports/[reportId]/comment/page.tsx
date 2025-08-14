"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  Button,
  Form,
  Input,
  Space,
  Typography,
  Alert,
  Spin,
  message,
  Divider,
  Tag,
  Row,
  Col,
  Descriptions,
} from "antd";
import {
  ArrowLeftOutlined,
  SaveOutlined,
  UserOutlined,
  TeamOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/contexts/auth-context";
import { usePageHeader } from "@/contexts/page-header-context";
import {
  getReportDetails,
  advanceReportStage,
  rejectReport,
  ReportWithDetails,
} from "@/lib/reports";
import { formatDate } from "@/lib/utils";

// 타입 정의
interface FormResponse {
  responses?: Array<{
    questionText: string;
    isRequired: boolean;
    response: {
      textResponse?: string;
      numberResponse?: number;
      ratingResponse?: number;
    };
  }>;
}

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function CommentPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;
  const reportId = params.reportId as string;
  const { user } = useAuth();
  const { setTitle, setBreadcrumbs } = usePageHeader();
  const [form] = Form.useForm();

  // 상태 관리
  const [report, setReport] = useState<ReportWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [commentType, setCommentType] = useState<"time_teacher" | "teacher" | null>(null);

  // 페이지 헤더 설정
  useEffect(() => {
    setTitle("코멘트 작성");
    setBreadcrumbs([
      { title: "그룹", href: `/groups/${groupId}` },
      { title: "보고서", href: `/groups/${groupId}/reports` },
      { title: "상세", href: `/groups/${groupId}/reports/${reportId}` },
      { title: "코멘트", href: `/groups/${groupId}/reports/${reportId}/comment` },
    ]);
  }, [groupId, reportId]);

  // 데이터 로드
  const loadReport = useCallback(async () => {
    if (!user || !reportId) return;

    try {
      setLoading(true);
      const result = await getReportDetails(reportId);

      if (result.success) {
        const reportData = result.data;
        setReport(reportData || null);

        // 권한 확인 및 코멘트 타입 설정
        if (reportData) {
          // 반려된 보고서의 경우, 이전 단계로 돌아가서 다시 코멘트를 쓸 수 있음
          if (reportData.rejected_at) {
            // 반려된 보고서는 이전 단계로 돌아감
            if (reportData.teacher_id === user.id) {
              setCommentType("teacher");
            } else if (reportData.time_teacher_id === user.id) {
              setCommentType("time_teacher");
            }
          } else {
            // 정상 진행 중인 보고서
            if (reportData.stage === 1 && reportData.time_teacher_id === user.id) {
              setCommentType("time_teacher");
            } else if (reportData.stage === 2 && reportData.teacher_id === user.id) {
              setCommentType("teacher");
            }
          }
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
  }, [user, reportId, loadReport]);

  // 권한 확인
  const hasPermission = () => {
    if (!report || !user) return false;

    // 반려된 보고서의 경우, 담당자라면 코멘트를 다시 쓸 수 있음
    if (report.rejected_at) {
      return report.time_teacher_id === user.id || report.teacher_id === user.id;
    }

    // 정상 진행 중인 보고서
    if (report.stage === 1 && report.time_teacher_id === user.id) {
      return true;
    }

    if (report.stage === 2 && report.teacher_id === user.id) {
      return true;
    }

    return false;
  };

  // 코멘트 제출
  const handleSubmit = async (values: { comment: string }) => {
    if (!user || !report || !commentType) return;

    try {
      setSubmitting(true);
      const result = await advanceReportStage({
        reportId: report.id,
        userId: user.id,
        comment: values.comment,
        commentType,
      });

      if (result.success) {
        message.success("코멘트가 성공적으로 제출되었습니다.");
        router.push(`/groups/${groupId}/reports/${reportId}`);
      } else {
        message.error(result.error || "코멘트 제출에 실패했습니다.");
      }
    } catch (error) {
      message.error("코멘트 제출 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  // 반려
  const handleReject = async (values: { rejectionReason: string }) => {
    if (!user || !report) return;

    try {
      setSubmitting(true);
      const result = await rejectReport({
        reportId: report.id,
        rejectedBy: user.id,
        rejectionReason: values.rejectionReason,
      });

      if (result.success) {
        message.success("보고서가 반려되었습니다.");
        router.push(`/groups/${groupId}/reports/${reportId}`);
      } else {
        message.error(result.error || "반려 처리에 실패했습니다.");
      }
    } catch (error) {
      message.error("반려 처리 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  // 학생 응답 렌더링
  const renderStudentResponse = (response: FormResponse) => {
    if (!response) return null;

    return (
      <div className="space-y-4">
        {response.responses?.slice(0, 3).map((resp, index: number) => (
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
                  <Text>평점: {resp.response.ratingResponse}/5</Text>
                </div>
              )}
            </div>
          </Card>
        ))}
        {response.responses && response.responses.length > 3 && (
          <div className="text-center text-gray-500">
            <Text>... 외 {response.responses.length - 3}개 응답</Text>
          </div>
        )}
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

  if (!hasPermission()) {
    return (
      <div className="p-6">
        <Alert
          message="접근 권한이 없습니다"
          description="이 보고서에 코멘트를 작성할 권한이 없습니다."
          type="error"
          showIcon
        />
      </div>
    );
  }

  const isTimeTeacher = commentType === "time_teacher";
  const isTeacher = commentType === "teacher";

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push(`/groups/${groupId}/reports/${reportId}`)}
          >
            상세보기로
          </Button>
          <Title level={2} className="mb-0">
            {isTimeTeacher ? "시간강사" : "선생님"} 코멘트 작성
          </Title>
        </div>

        <Alert
          message={`${report.student_name} 학생의 보고서`}
          description={`${report.form?.title} - ${report.class_name || "미지정 반"}`}
          type="info"
          showIcon
        />
      </div>

      <Row gutter={16}>
        {/* 왼쪽 컬럼 - 코멘트 작성 */}
        <Col span={12}>
          <Card title={`${isTimeTeacher ? "시간강사" : "선생님"} 코멘트 작성`}>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              initialValues={{
                comment: isTimeTeacher ? report.time_teacher_comment : report.teacher_comment,
              }}
            >
              <Form.Item
                name="comment"
                label="코멘트"
                rules={[
                  { required: true, message: "코멘트를 입력해주세요." },
                  { min: 10, message: "코멘트는 최소 10자 이상 입력해주세요." },
                ]}
              >
                <TextArea
                  rows={8}
                  placeholder={`${
                    isTimeTeacher ? "시간강사" : "선생님"
                  }로서 학생의 응답에 대한 코멘트를 작성해주세요.`}
                />
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SaveOutlined />}
                    loading={submitting}
                  >
                    코멘트 제출
                  </Button>
                  <Button onClick={() => router.push(`/groups/${groupId}/reports/${reportId}`)}>
                    취소
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>

          {/* 반려 기능 */}
          <Card title="반려" className="mt-6">
            <Form layout="vertical" onFinish={handleReject}>
              <Form.Item
                name="rejectionReason"
                label="반려 사유"
                rules={[
                  { required: true, message: "반려 사유를 입력해주세요." },
                  { min: 5, message: "반려 사유는 최소 5자 이상 입력해주세요." },
                ]}
              >
                <TextArea rows={4} placeholder="반려 사유를 구체적으로 작성해주세요." />
              </Form.Item>

              <Form.Item>
                <Button
                  danger
                  htmlType="submit"
                  icon={<ExclamationCircleOutlined />}
                  loading={submitting}
                >
                  보고서 반려
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* 오른쪽 컬럼 - 보고서 정보 및 이전 코멘트 */}
        <Col span={12}>
          {/* 기본 정보 */}
          <Card title="보고서 정보" className="mb-6">
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
            </Descriptions>
          </Card>

          {/* 학생 응답 미리보기 */}
          {report.formResponse && (
            <Card title="학생 응답 미리보기" className="mb-6">
              <div className="mb-4">
                <Text type="secondary">제출일: {formatDate(report.formResponse.submitted_at)}</Text>
              </div>
              {renderStudentResponse(report.formResponse)}
            </Card>
          )}

          {/* 이전 코멘트 */}
          <Card title="이전 코멘트">
            {isTeacher && report.time_teacher_comment && (
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

            {isTimeTeacher && report.teacher_comment && (
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
      </Row>
    </div>
  );
}
