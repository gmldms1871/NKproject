"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import {
  Card,
  Button,
  Typography,
  Space,
  Tag,
  Divider,
  Input,
  Radio,
  Checkbox,
  Rate,
  Spin,
  Alert,
  Avatar,
  Badge,
  Tooltip,
  Empty,
  Row,
  Col,
  Form,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  FormOutlined,
  UserOutlined,
  CalendarOutlined,
  EyeOutlined,
  EditOutlined,
  StarOutlined,
  CheckSquareOutlined,
  FileTextOutlined,
  ExclamationCircleOutlined,
  SendOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "@/contexts/auth-context";
import { usePageHeader } from "@/contexts/page-header-context";
import {
  getFormDetails,
  FormWithDetails,
  QuestionWithDetails,
  submitFormResponse,
  SubmitFormResponseRequest,
} from "@/lib/forms";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Group: RadioGroup } = Radio;
const { Group: CheckboxGroup } = Checkbox;

export default function FormDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { setPageHeader } = usePageHeader();

  const formId = params.formId as string;
  const groupId = params.id as string;
  const mode = searchParams.get("mode");
  const isRespondMode = mode === "respond";

  const [form, setForm] = useState<FormWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [responses, setResponses] = useState<Record<string, any>>({});

  // 폼 데이터 로드
  const loadFormData = useCallback(async () => {
    if (!formId) return;

    try {
      setLoading(true);
      setError(null);

      const result = await getFormDetails(formId);

      if (result.success && result.data) {
        setForm(result.data);
      } else {
        setError(result.error || "폼을 불러올 수 없습니다.");
      }
    } catch (err) {
      console.error("폼 데이터 로드 오류:", err);
      setError("폼 데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [formId]);

  // 페이지 헤더 설정
  useEffect(() => {
    setPageHeader({
      title: isRespondMode ? "폼 응답하기" : "폼 상세보기",
      subtitle: isRespondMode
        ? "아래 질문들에 응답해주세요"
        : "폼을 받는 입장에서 어떻게 보이는지 확인할 수 있습니다",
      backUrl: `/groups/${groupId}/forms`,
    });

    return () => setPageHeader(null);
  }, [setPageHeader, groupId, isRespondMode]);

  // 응답 데이터 업데이트
  const updateResponse = (questionId: string, value: any) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  // 응답 제출
  const handleSubmitResponse = async () => {
    if (!form || !user) return;

    try {
      setSubmitting(true);

      // 필수 질문 체크
      const requiredQuestions = form.questions.filter((q) => q.is_required);
      const missingRequired = requiredQuestions.filter((q) => !responses[q.id]);

      if (missingRequired.length > 0) {
        message.warning("필수 질문에 모두 응답해주세요.");
        return;
      }

      // 응답 데이터 변환
      const submitResponses = form.questions
        .map((question) => ({
          questionId: question.id,
          textResponse: question.question_type === "text" ? responses[question.id] : undefined,
          numberResponse: question.question_type === "rating" ? responses[question.id] : undefined,
          ratingResponse: question.question_type === "rating" ? responses[question.id] : undefined,
          examResponse: question.question_type === "exam" ? responses[question.id] : undefined,
        }))
        .filter(
          (response) =>
            response.textResponse !== undefined ||
            response.numberResponse !== undefined ||
            response.ratingResponse !== undefined ||
            response.examResponse !== undefined
        );

      const submitRequest: SubmitFormResponseRequest = {
        formId: form.id,
        studentId: user.id,
        classId: undefined, // TODO: 사용자의 클래스 정보 가져오기
        responses: submitResponses,
      };

      const result = await submitFormResponse(submitRequest);

      if (result.success) {
        message.success("응답이 성공적으로 제출되었습니다!");
        router.push(`/groups/${groupId}/forms`);
      } else {
        message.error(result.error || "응답 제출에 실패했습니다.");
      }
    } catch (error) {
      console.error("응답 제출 오류:", error);
      message.error("응답 제출 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  // 응답 모드 질문 렌더링
  const renderRespondQuestion = (question: QuestionWithDetails): JSX.Element => {
    const { question_type, question_text, is_required, id } = question;

    const questionHeader = (
      <div className="mb-4">
        <Space>
          <Text strong className="text-base">
            {question_text}
          </Text>
          {is_required && (
            <Text type="danger" className="text-sm">
              *
            </Text>
          )}
        </Space>
      </div>
    );

    switch (question_type) {
      case "text":
        const isTextarea = question.textDetails?.subtype === "textarea";
        return (
          <Card key={id} className="mb-4">
            <Space className="mb-2">
              <FileTextOutlined className="text-blue-500" />
              <Text type="secondary" className="text-sm">
                {isTextarea ? "서술형" : "주관식"}
              </Text>
            </Space>
            {questionHeader}
            {isTextarea ? (
              <TextArea
                placeholder="답변을 입력하세요..."
                rows={4}
                value={responses[id] || ""}
                onChange={(e) => updateResponse(id, e.target.value)}
                maxLength={question.textDetails?.maxLength || 1000}
                showCount
              />
            ) : (
              <Input
                placeholder="답변을 입력하세요..."
                value={responses[id] || ""}
                onChange={(e) => updateResponse(id, e.target.value)}
                maxLength={question.textDetails?.maxLength || 100}
              />
            )}
          </Card>
        );

      case "choice":
        const options = question.choiceDetails?.options || [];
        const isMultiple = question.choiceDetails?.is_multiple || false;
        const allowOther = question.choiceDetails?.etc_option_enabled || false;

        return (
          <Card key={id} className="mb-4">
            <Space className="mb-2">
              <CheckSquareOutlined className="text-green-500" />
              <Text type="secondary" className="text-sm">
                {isMultiple ? "다중선택" : "단일선택"}
              </Text>
            </Space>
            {questionHeader}
            {isMultiple ? (
              <CheckboxGroup
                value={responses[id] || []}
                onChange={(value) => updateResponse(id, value)}
                className="w-full"
              >
                <div className="space-y-2">
                  {options.map((option, index) => {
                    const optionText = typeof option === "string" ? option : option.option_text;
                    return (
                      <div key={index}>
                        <Checkbox value={optionText}>{optionText}</Checkbox>
                      </div>
                    );
                  })}
                  {allowOther && (
                    <div className="flex items-center space-x-2">
                      <Checkbox value="other">기타:</Checkbox>
                      <Input
                        placeholder="기타 의견을 입력하세요..."
                        className="flex-1"
                        disabled={!responses[id]?.includes("other")}
                      />
                    </div>
                  )}
                </div>
              </CheckboxGroup>
            ) : (
              <RadioGroup
                value={responses[id]}
                onChange={(e) => updateResponse(id, e.target.value)}
                className="w-full"
              >
                <div className="space-y-2">
                  {options.map((option, index) => {
                    const optionText = typeof option === "string" ? option : option.option_text;
                    return (
                      <div key={index}>
                        <Radio value={optionText}>{optionText}</Radio>
                      </div>
                    );
                  })}
                  {allowOther && (
                    <div className="flex items-center space-x-2">
                      <Radio value="other">기타:</Radio>
                      <Input
                        placeholder="기타 의견을 입력하세요..."
                        className="flex-1"
                        disabled={responses[id] !== "other"}
                      />
                    </div>
                  )}
                </div>
              </RadioGroup>
            )}
          </Card>
        );

      case "rating":
        const maxRating = question.ratingDetails?.rating_max || 5;
        return (
          <Card key={id} className="mb-4">
            <Space className="mb-2">
              <StarOutlined className="text-yellow-500" />
              <Text type="secondary" className="text-sm">
                별점평가 (최대 {maxRating}점)
              </Text>
            </Space>
            {questionHeader}
            <div className="flex items-center space-x-4">
              <Rate
                count={maxRating}
                value={responses[id] || 0}
                onChange={(value) => updateResponse(id, value)}
              />
              <Text type="secondary" className="text-sm">
                {responses[id] ? `${responses[id]}점` : "별점을 선택해주세요"}
              </Text>
            </div>
          </Card>
        );

      case "exam":
        const totalQuestions = question.examDetails?.total_questions || 0;
        const conceptTemplate = question.examDetails?.conceptTemplate;

        return (
          <Card key={id} className="mb-4">
            <Space className="mb-2">
              <ExclamationCircleOutlined className="text-red-500" />
              <Text type="secondary" className="text-sm">
                시험형 (총 {totalQuestions}문제)
              </Text>
            </Space>
            {questionHeader}

            {conceptTemplate && (
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <Text strong className="text-blue-700">
                  개념 템플릿: {conceptTemplate.name}
                </Text>
                {conceptTemplate.conceptItems && conceptTemplate.conceptItems.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {conceptTemplate.conceptItems.map((item, index) => (
                      <div key={item.id || index} className="text-sm text-blue-600">
                        {index + 1}. {item.concept_text}
                        {item.concept_description && (
                          <span className="text-gray-500 ml-2">- {item.concept_description}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Alert
              message="시험 응답"
              description={
                <div>
                  <p>{totalQuestions}개의 시험 문제에 대한 응답을 입력해주세요.</p>
                  <TextArea
                    placeholder="시험 응답을 입력해주세요..."
                    rows={6}
                    value={responses[id] || ""}
                    onChange={(e) => updateResponse(id, e.target.value)}
                    className="mt-2"
                  />
                </div>
              }
              type="info"
              showIcon
            />
          </Card>
        );

      default:
        return (
          <Card key={id} className="mb-4">
            {questionHeader}
            <Text type="secondary">알 수 없는 질문 유형</Text>
          </Card>
        );
    }
  };

  // 미리보기 모드 질문 렌더링
  const renderPreviewQuestion = (question: QuestionWithDetails): JSX.Element => {
    const { question_type, question_text, is_required } = question;

    const questionHeader = (
      <div className="mb-4">
        <Space>
          <Text strong className="text-base">
            {question_text}
          </Text>
          {is_required && (
            <Text type="danger" className="text-sm">
              *
            </Text>
          )}
        </Space>
      </div>
    );

    switch (question_type) {
      case "text":
        const isTextarea = question.textDetails?.subtype === "textarea";
        return (
          <Card key={question.id} className="mb-4">
            <Space className="mb-2">
              <FileTextOutlined className="text-blue-500" />
              <Text type="secondary" className="text-sm">
                {isTextarea ? "서술형" : "주관식"}
              </Text>
            </Space>
            {questionHeader}
            {isTextarea ? (
              <TextArea
                placeholder="답변을 입력하세요..."
                rows={4}
                disabled
                className="bg-gray-50"
              />
            ) : (
              <Input placeholder="답변을 입력하세요..." disabled className="bg-gray-50" />
            )}
          </Card>
        );

      case "choice":
        const options = question.choiceDetails?.options || [];
        const isMultiple = question.choiceDetails?.is_multiple || false;
        const allowOther = question.choiceDetails?.etc_option_enabled || false;

        return (
          <Card key={question.id} className="mb-4">
            <Space className="mb-2">
              <CheckSquareOutlined className="text-green-500" />
              <Text type="secondary" className="text-sm">
                {isMultiple ? "다중선택" : "단일선택"}
              </Text>
            </Space>
            {questionHeader}
            {isMultiple ? (
              <CheckboxGroup disabled className="w-full">
                <div className="space-y-2">
                  {options.map((option, index) => (
                    <div key={index}>
                      <Checkbox value={typeof option === "string" ? option : option.option_text}>
                        {typeof option === "string" ? option : option.option_text}
                      </Checkbox>
                    </div>
                  ))}
                  {allowOther && (
                    <div className="flex items-center space-x-2">
                      <Checkbox value="other">기타:</Checkbox>
                      <Input
                        placeholder="기타 의견을 입력하세요..."
                        disabled
                        className="bg-gray-50 flex-1"
                      />
                    </div>
                  )}
                </div>
              </CheckboxGroup>
            ) : (
              <RadioGroup disabled className="w-full">
                <div className="space-y-2">
                  {options.map((option, index) => (
                    <div key={index}>
                      <Radio value={typeof option === "string" ? option : option.option_text}>
                        {typeof option === "string" ? option : option.option_text}
                      </Radio>
                    </div>
                  ))}
                  {allowOther && (
                    <div className="flex items-center space-x-2">
                      <Radio value="other">기타:</Radio>
                      <Input
                        placeholder="기타 의견을 입력하세요..."
                        disabled
                        className="bg-gray-50 flex-1"
                      />
                    </div>
                  )}
                </div>
              </RadioGroup>
            )}
          </Card>
        );

      case "rating":
        const maxRating = question.ratingDetails?.rating_max || 5;
        return (
          <Card key={question.id} className="mb-4">
            <Space className="mb-2">
              <StarOutlined className="text-yellow-500" />
              <Text type="secondary" className="text-sm">
                별점평가 (최대 {maxRating}점)
              </Text>
            </Space>
            {questionHeader}
            <div className="flex items-center space-x-4">
              <Rate disabled count={maxRating} />
              <Text type="secondary" className="text-sm">
                별점을 선택해주세요
              </Text>
            </div>
          </Card>
        );

      case "exam":
        const totalQuestions = question.examDetails?.total_questions || 0;
        const conceptTemplate = question.examDetails?.conceptTemplate;

        return (
          <Card key={question.id} className="mb-4">
            <Space className="mb-2">
              <ExclamationCircleOutlined className="text-red-500" />
              <Text type="secondary" className="text-sm">
                시험형 (총 {totalQuestions}문제)
              </Text>
            </Space>
            {questionHeader}

            {conceptTemplate && (
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <Text strong className="text-blue-700">
                  개념 템플릿: {conceptTemplate.name}
                </Text>
                {conceptTemplate.conceptItems && conceptTemplate.conceptItems.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {conceptTemplate.conceptItems.map((item, index) => (
                      <div key={item.id || index} className="text-sm text-blue-600">
                        {index + 1}. {item.concept_text}
                        {item.concept_description && (
                          <span className="text-gray-500 ml-2">- {item.concept_description}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Alert
              message="시험 문제 미리보기"
              description={`이 폼에서는 ${totalQuestions}개의 시험 문제가 출제됩니다. 실제 문제는 응답 시 자동으로 생성됩니다.`}
              type="info"
              showIcon
            />
          </Card>
        );

      default:
        return (
          <Card key={question.id} className="mb-4">
            {questionHeader}
            <Text type="secondary">알 수 없는 질문 유형</Text>
          </Card>
        );
    }
  };

  // 로딩, 에러, 빈 상태 처리
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert
          message="오류"
          description={error}
          type="error"
          showIcon
          action={
            <Space>
              <Button size="small" onClick={() => router.back()}>
                돌아가기
              </Button>
              <Button size="small" type="primary" onClick={loadFormData}>
                다시 시도
              </Button>
            </Space>
          }
        />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Empty description="폼을 찾을 수 없습니다." />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* 폼 헤더 정보 */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Avatar
              size="large"
              icon={isRespondMode ? <SendOutlined /> : <FormOutlined />}
              className={isRespondMode ? "bg-green-500" : "bg-blue-500"}
            />
            <div>
              <Title level={2} className="mb-0">
                {form.title}
              </Title>
              <Space className="mt-1">
                {isRespondMode ? (
                  <Tag color="green">응답 모드</Tag>
                ) : (
                  <Tag color="blue">미리보기 모드</Tag>
                )}
                {form.sent_at && (
                  <Tag color="blue" icon={<CalendarOutlined />}>
                    전송됨: {dayjs(form.sent_at).format("YYYY-MM-DD HH:mm")}
                  </Tag>
                )}
              </Space>
            </div>
          </div>

          {!isRespondMode && (
            <Space>
              <Button
                icon={<EditOutlined />}
                onClick={() => router.push(`/groups/${groupId}/forms/create?edit=${form.id}`)}
              >
                수정하기
              </Button>
            </Space>
          )}
        </div>

        {form.description && (
          <div className="mb-4">
            <Text type="secondary" className="text-base">
              {form.description}
            </Text>
          </div>
        )}

        <Row gutter={24}>
          <Col span={8}>
            <div className="text-center">
              <Text type="secondary" className="text-sm block">
                생성자
              </Text>
              <Space className="mt-1">
                <Avatar size="small" icon={<UserOutlined />} />
                <Text strong>{form.creator?.name || "알 수 없음"}</Text>
              </Space>
            </div>
          </Col>
          <Col span={8}>
            <div className="text-center">
              <Text type="secondary" className="text-sm block">
                질문 수
              </Text>
              <Text strong className="text-lg mt-1">
                {form.questions.length}개
              </Text>
            </div>
          </Col>
          <Col span={8}>
            <div className="text-center">
              <Text type="secondary" className="text-sm block">
                응답률
              </Text>
              <Text strong className="text-lg mt-1">
                {form.completedResponses} / {form.totalTargets}
              </Text>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 안내 메시지 */}
      {isRespondMode ? (
        <Alert
          message="폼 응답하기"
          description="아래 질문들에 응답한 후 제출 버튼을 클릭해주세요. 필수 질문에는 반드시 응답해야 합니다."
          type="success"
          showIcon
          icon={<SendOutlined />}
        />
      ) : (
        <Alert
          message="미리보기 모드"
          description="이 페이지는 폼을 받는 사람이 보게 될 화면을 미리보기로 보여줍니다. 실제로 응답할 수는 없습니다."
          type="info"
          showIcon
          icon={<EyeOutlined />}
        />
      )}

      {/* 질문 목록 */}
      <div className="space-y-0">
        <Title level={3} className="mb-4">
          질문 목록 ({form.questions.length}개)
        </Title>

        {form.questions.length > 0 ? (
          <div>
            {form.questions
              .sort((a, b) => a.order_index - b.order_index)
              .filter((question) => question && question.id) // ✅ 유효한 질문만 필터링
              .map((question) => {
                try {
                  // ✅ 에러 처리와 함께 명시적 반환
                  return isRespondMode
                    ? renderRespondQuestion(question)
                    : renderPreviewQuestion(question);
                } catch (error) {
                  console.error("Question render error:", error);
                  // ✅ 에러 발생 시 대체 UI 반환
                  return (
                    <Card key={question.id || Math.random()} className="mb-4">
                      <Alert
                        message="질문 렌더링 오류"
                        description="이 질문을 표시하는 중 오류가 발생했습니다."
                        type="error"
                        showIcon
                      />
                    </Card>
                  );
                }
              })}
          </div>
        ) : (
          <Card>
            <Empty description="아직 질문이 추가되지 않았습니다." />
          </Card>
        )}
      </div>

      {/* 하단 액션 버튼 */}
      <Card>
        <div className="flex justify-center space-x-4">
          <Button size="large" onClick={() => router.back()}>
            돌아가기
          </Button>
          {isRespondMode ? (
            <Button
              type="primary"
              size="large"
              icon={<CheckOutlined />}
              loading={submitting}
              onClick={handleSubmitResponse}
            >
              응답 제출하기
            </Button>
          ) : (
            <Button
              type="primary"
              size="large"
              icon={<EditOutlined />}
              onClick={() => router.push(`/groups/${groupId}/forms/create?edit=${form.id}`)}
            >
              폼 수정하기
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
