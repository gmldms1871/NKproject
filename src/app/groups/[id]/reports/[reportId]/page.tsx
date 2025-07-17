"use client";

import { useState, useEffect, useCallback } from "react";
import type { StepProps } from "antd/es/steps";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  Steps,
  Button,
  Form,
  Input,
  Space,
  Tag,
  Avatar,
  Divider,
  Timeline,
  Modal,
  message,
  Alert,
  Descriptions,
  Rate,
  Tooltip,
  Badge,
  Typography,
  Collapse,
} from "antd";
import {
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  EditOutlined,
  RollbackOutlined,
  CloseOutlined,
  CommentOutlined,
  BookOutlined,
  StarOutlined,
  FileTextOutlined,
  CalendarOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/contexts/auth-context";
import { usePageHeader } from "@/contexts/page-header-context";
import {
  getReportDetails,
  addReportComment,
  rejectReport,
  resetReport,
  ReportWithDetails,
} from "@/lib/reports";
import dayjs from "dayjs";

const { TextArea } = Input;
const { Text, Paragraph, Title } = Typography;
const { Panel } = Collapse;

// 타입 정의
interface QuestionResponse {
  id: string;
  questionId: string;
  questionType: string;
  questionText: string;
  isRequired: boolean;
  orderIndex: number;
  response: {
    textResponse?: string;
    numberResponse?: number;
    ratingResponse?: number;
    examResponse?: Record<string, any>;
  };
}

interface CommentFormValues {
  comment: string;
}

export default function ReportDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const { setPageHeader } = usePageHeader();
  const groupId = params.id as string;
  const reportId = params.reportId as string;

  // 상태 관리
  const [report, setReport] = useState<ReportWithDetails | null>(null);
  const [responses, setResponses] = useState<QuestionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [commenting, setCommenting] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // 폼 관리
  const [commentForm] = Form.useForm();

  useEffect(() => {
    if (!user) {
      router.push("/auth");
      return;
    }
    loadReportData();
  }, [user, groupId, reportId]);

  // 페이지 헤더 설정
  useEffect(() => {
    if (report) {
      setPageHeader({
        title: `보고서 상세`,
        subtitle: `${report.student_name} • ${report.form?.title}`,
        backUrl: `/groups/${groupId}/reports`,
        breadcrumb: [
          { title: "그룹", href: "/groups" },
          { title: "그룹 상세", href: `/groups/${groupId}` },
          { title: "보고서 관리", href: `/groups/${groupId}/reports` },
          { title: "상세 보기" },
        ],
      });
    }

    return () => setPageHeader(null);
  }, [setPageHeader, groupId, report]);

  // 보고서 데이터 로드
  const loadReportData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // 실제 API 호출 대신 예시 데이터 사용
      const mockReport: ReportWithDetails = {
        id: reportId,
        form_id: "form1",
        form_response_id: "response1",
        stage: 2,
        student_name: "김민수",
        class_name: "고1-A반",
        teacher_id: "teacher2",
        time_teacher_id: "teacher1",
        supervision_id: null,
        teacher_comment: null,
        teacher_completed_at: null,
        time_teacher_comment:
          "학생이 기본 개념은 잘 이해하고 있으나 응용 문제에서 어려움을 보입니다. 추가 연습이 필요할 것 같습니다.",
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
          description: "수학 중간고사 결과 분석 및 학습 방향 설정",
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
          currentStage: 2,
          status: "waiting_teacher",
          canEdit: false,
          nextAction: "선생님 검토 대기",
        },
      };

      const mockResponses: QuestionResponse[] = [
        {
          id: "1",
          questionId: "q1",
          questionType: "text",
          questionText: "이번 시험에서 가장 어려웠던 부분은 무엇인가요?",
          isRequired: true,
          orderIndex: 1,
          response: {
            textResponse:
              "미분 계산 문제에서 복잡한 함수의 미분을 구하는 것이 가장 어려웠습니다. 특히 삼각함수와 지수함수가 합성된 문제에서 실수를 많이 했습니다.",
          },
        },
        {
          id: "2",
          questionId: "q2",
          questionType: "rating",
          questionText: "전반적인 시험 만족도를 평가해주세요.",
          isRequired: true,
          orderIndex: 2,
          response: {
            ratingResponse: 4,
          },
        },
        {
          id: "3",
          questionId: "q3",
          questionType: "choice",
          questionText: "다음 중 추가로 학습하고 싶은 영역을 선택해주세요.",
          isRequired: false,
          orderIndex: 3,
          response: {
            textResponse: "미분의 응용, 적분 기초",
          },
        },
        {
          id: "4",
          questionId: "q4",
          questionType: "exam",
          questionText: "틀린 문제에 대한 개념 이해도를 체크해주세요.",
          isRequired: true,
          orderIndex: 4,
          response: {
            examResponse: {
              incorrectQuestions: [2, 5, 8, 12],
              conceptChecks: {
                "미분의 정의": false,
                연쇄법칙: true,
                "삼각함수 미분": false,
                "지수함수 미분": true,
              },
            },
          },
        },
      ];

      setReport(mockReport);
      setResponses(mockResponses);
    } catch (error) {
      message.error("보고서 데이터를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [user, reportId]);

  // 코멘트 추가
  const handleAddComment = async (values: CommentFormValues) => {
    if (!user || !report) return;

    setCommenting(true);
    try {
      const commentType = report.stage === 1 ? "time_teacher" : "teacher";

      const result = await addReportComment({
        reportId: report.id,
        userId: user.id,
        comment: values.comment,
        commentType,
      });

      if (result.success) {
        message.success("코멘트가 저장되었습니다.");
        commentForm.resetFields();
        loadReportData();
      } else {
        message.error(result.error || "코멘트 저장에 실패했습니다.");
      }
    } catch (error) {
      message.error("코멘트 저장 중 오류가 발생했습니다.");
    } finally {
      setCommenting(false);
    }
  };

  // 보고서 반려
  const handleRejectReport = async () => {
    if (!user || !report || !rejectReason.trim()) {
      message.error("반려 사유를 입력해주세요.");
      return;
    }

    try {
      const result = await rejectReport({
        reportId: report.id,
        rejectedBy: user.id,
        rejectionReason: rejectReason,
      });

      if (result.success) {
        message.success("보고서가 반려되었습니다.");
        setRejectModalVisible(false);
        setRejectReason("");
        loadReportData();
      } else {
        message.error(result.error || "보고서 반려에 실패했습니다.");
      }
    } catch (error) {
      message.error("보고서 반려 중 오류가 발생했습니다.");
    }
  };

  // 보고서 리셋
  const handleResetReport = async () => {
    if (!user || !report) return;

    try {
      const result = await resetReport({
        reportId: report.id,
        resetBy: user.id,
        resetReason: "다시 작성 요청",
      });

      if (result.success) {
        message.success("보고서가 리셋되었습니다.");
        loadReportData();
      } else {
        message.error(result.error || "보고서 리셋에 실패했습니다.");
      }
    } catch (error) {
      message.error("보고서 리셋 중 오류가 발생했습니다.");
    }
  };

  // 질문 응답 렌더링
  const renderResponse = (response: QuestionResponse) => {
    switch (response.questionType) {
      case "text":
        return (
          <div className="p-4 bg-gray-50 rounded-lg">
            <Paragraph>{response.response.textResponse}</Paragraph>
          </div>
        );

      case "rating":
        return (
          <div className="p-4 bg-gray-50 rounded-lg">
            <Rate disabled value={response.response.ratingResponse} />
            <span className="ml-2 text-gray-600">({response.response.ratingResponse}/5)</span>
          </div>
        );

      case "choice":
        return (
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex flex-wrap gap-2">
              {response.response.textResponse?.split(", ").map((choice, idx) => (
                <Tag key={idx} color="blue">
                  {choice}
                </Tag>
              ))}
            </div>
          </div>
        );

      case "exam":
        const examData = response.response.examResponse;
        return (
          <div className="p-4 bg-gray-50 rounded-lg space-y-3">
            <div>
              <Text strong>틀린 문제: </Text>
              <div className="flex flex-wrap gap-1 mt-1">
                {examData?.incorrectQuestions?.map((num: number) => (
                  <Badge key={num} count={num} color="red" />
                ))}
              </div>
            </div>
            <div>
              <Text strong>개념 이해도:</Text>
              <div className="mt-2 space-y-1">
                {examData?.conceptChecks &&
                  Object.entries(examData.conceptChecks).map(([concept, understood]) => (
                    <div key={concept} className="flex items-center space-x-2">
                      <Tag color={understood ? "green" : "red"}>
                        {understood ? "이해" : "미이해"}
                      </Tag>
                      <span>{concept}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        );

      default:
        return <div className="p-4 bg-gray-50 rounded-lg">응답 데이터를 표시할 수 없습니다.</div>;
    }
  };

  const getSteps = (): StepProps[] => {
    const steps: StepProps[] = [
      {
        title: "응답 완료",
        status: "finish",
        icon: <CheckCircleOutlined />,
        description: report?.formResponse?.submitted_at
          ? dayjs(report.formResponse.submitted_at).format("MM/DD HH:mm")
          : "",
      },
      {
        title: "시간강사 검토",
        status: (report?.stage || 0) > 1 ? "finish" : report?.stage === 1 ? "process" : "wait",
        icon: report?.stage === 1 ? <ClockCircleOutlined /> : <CheckCircleOutlined />,
        description: report?.time_teacher_completed_at
          ? dayjs(report.time_teacher_completed_at).format("MM/DD HH:mm")
          : "검토 대기중",
      },
      {
        title: "선생님 검토",
        status: (report?.stage || 0) > 2 ? "finish" : report?.stage === 2 ? "process" : "wait",
        icon: report?.stage === 2 ? <ClockCircleOutlined /> : <CheckCircleOutlined />,
        description: report?.teacher_completed_at
          ? dayjs(report.teacher_completed_at).format("MM/DD HH:mm")
          : "검토 대기중",
      },
      {
        title: "완료",
        status: (report?.stage || 0) === 3 ? "finish" : "wait",
        icon: <CheckCircleOutlined />,
        description: (report?.stage || 0) === 3 ? "검토 완료" : "",
      },
    ];

    return steps;
  };

  if (!user) {
    return null;
  }

  if (loading || !report) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="text-gray-600">보고서를 불러오는 중...</div>
          </div>
        </div>
      </div>
    );
  }

  const canComment = (report.stage === 1 || report.stage === 2) && !report.rejected_at;
  const canReject = (report.stage === 1 || report.stage === 2) && !report.rejected_at;
  const canReset = report.stage !== 0 && !report.rejected_at;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 진행 상태 */}
        <Card className="mb-6">
          <Steps current={report.stage ?? undefined} items={getSteps()} />

          {report.rejected_at && (
            <Alert
              message="반려된 보고서"
              description={`반려 사유: ${report.rejection_reason}`}
              type="error"
              showIcon
              className="mt-4"
            />
          )}
        </Card>

        {/* 기본 정보 */}
        <Card title="기본 정보" className="mb-6">
          <Descriptions column={2}>
            <Descriptions.Item label="학생">
              <div className="flex items-center space-x-2">
                <Avatar size="small" icon={<UserOutlined />} />
                <span>{report.student_name}</span>
                <Tag>{report.class_name}</Tag>
              </div>
            </Descriptions.Item>
            <Descriptions.Item label="폼">{report.form?.title}</Descriptions.Item>
            <Descriptions.Item label="제출일">
              {report.formResponse?.submitted_at
                ? dayjs(report.formResponse.submitted_at).format("YYYY-MM-DD HH:mm")
                : "미제출"}
            </Descriptions.Item>
            <Descriptions.Item label="현재 단계">
              <Tag color={report.stage === 3 ? "green" : "processing"}>
                {report.progressInfo?.nextAction}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="시간강사">
              {report.timeTeacher?.name || "미배정"}
            </Descriptions.Item>
            <Descriptions.Item label="담당 선생님">
              {report.teacher?.name || "미배정"}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 학생 응답 */}
        <Card title="학생 응답" className="mb-6">
          <div className="space-y-6">
            {responses.map((response, index) => (
              <div key={response.id}>
                <div className="flex items-start space-x-3">
                  <Badge count={index + 1} color="blue" />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Text strong>{response.questionText}</Text>
                      {response.isRequired && <Tag color="red">필수</Tag>}
                    </div>
                    {renderResponse(response)}
                  </div>
                </div>
                {index < responses.length - 1 && <Divider />}
              </div>
            ))}
          </div>
        </Card>

        {/* 검토 과정 */}
        <Card title="검토 과정" className="mb-6">
          <Timeline
            items={[
              {
                color: "green",
                dot: <CheckCircleOutlined />,
                children: (
                  <div>
                    <div className="font-medium">학생 응답 완료</div>
                    <div className="text-sm text-gray-500">
                      {dayjs(report.formResponse?.submitted_at).format("YYYY-MM-DD HH:mm")}
                    </div>
                  </div>
                ),
              },
              ...(report.time_teacher_comment
                ? [
                    {
                      color: "blue",
                      dot: <CommentOutlined />,
                      children: (
                        <div>
                          <div className="font-medium">시간강사 코멘트</div>
                          <div className="text-sm text-gray-500 mb-2">
                            {report.timeTeacher?.name} •{" "}
                            {dayjs(report.time_teacher_completed_at).format("YYYY-MM-DD HH:mm")}
                          </div>
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <Paragraph>{report.time_teacher_comment}</Paragraph>
                          </div>
                        </div>
                      ),
                    },
                  ]
                : []),
              ...(report.teacher_comment
                ? [
                    {
                      color: "green",
                      dot: <CheckCircleOutlined />,
                      children: (
                        <div>
                          <div className="font-medium">선생님 코멘트</div>
                          <div className="text-sm text-gray-500 mb-2">
                            {report.teacher?.name} •{" "}
                            {dayjs(report.teacher_completed_at).format("YYYY-MM-DD HH:mm")}
                          </div>
                          <div className="p-3 bg-green-50 rounded-lg">
                            <Paragraph>{report.teacher_comment}</Paragraph>
                          </div>
                        </div>
                      ),
                    },
                  ]
                : []),
              ...(report.stage === 1 && !report.time_teacher_comment
                ? [
                    {
                      color: "orange",
                      dot: <ClockCircleOutlined />,
                      children: (
                        <div>
                          <div className="font-medium">시간강사 검토 대기중</div>
                          <div className="text-sm text-gray-500">
                            {report.timeTeacher?.name}님의 검토를 기다리고 있습니다.
                          </div>
                        </div>
                      ),
                    },
                  ]
                : []),
              ...(report.stage === 2 && !report.teacher_comment
                ? [
                    {
                      color: "orange",
                      dot: <ClockCircleOutlined />,
                      children: (
                        <div>
                          <div className="font-medium">선생님 검토 대기중</div>
                          <div className="text-sm text-gray-500">
                            {report.teacher?.name}님의 검토를 기다리고 있습니다.
                          </div>
                        </div>
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </Card>

        {/* 코멘트 추가 */}
        {canComment && (
          <Card
            title={`${report.stage === 1 ? "시간강사" : "선생님"} 코멘트 추가`}
            className="mb-6"
          >
            <Form form={commentForm} layout="vertical" onFinish={handleAddComment}>
              <Form.Item
                name="comment"
                label="코멘트"
                rules={[
                  { required: true, message: "코멘트를 입력해주세요!" },
                  { min: 10, message: "10자 이상 입력해주세요!" },
                ]}
              >
                <TextArea
                  rows={4}
                  placeholder="학생에 대한 코멘트를 입력하세요..."
                  maxLength={1000}
                  showCount
                />
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SaveOutlined />}
                    loading={commenting}
                  >
                    코멘트 저장
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        )}

        {/* 작업 버튼 */}
        <Card>
          <div className="flex justify-between">
            <Button onClick={() => router.back()}>뒤로 가기</Button>

            <Space>
              {canReject && (
                <Button danger icon={<CloseOutlined />} onClick={() => setRejectModalVisible(true)}>
                  반려
                </Button>
              )}
              {canReset && (
                <Button
                  icon={<RollbackOutlined />}
                  onClick={() => {
                    Modal.confirm({
                      title: "보고서 리셋",
                      content: "학생에게 다시 작성하도록 요청하시겠습니까?",
                      onOk: handleResetReport,
                    });
                  }}
                >
                  리셋
                </Button>
              )}
            </Space>
          </div>
        </Card>

        {/* 반려 모달 */}
        <Modal
          title="보고서 반려"
          open={rejectModalVisible}
          onOk={handleRejectReport}
          onCancel={() => {
            setRejectModalVisible(false);
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
