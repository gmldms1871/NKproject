"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  Form,
  Input,
  Button,
  Radio,
  Checkbox,
  Rate,
  Space,
  Progress,
  Alert,
  Modal,
  message,
  Steps,
  Tag,
  Badge,
  Divider,
  Typography,
  Tooltip,
  Affix,
} from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  SaveOutlined,
  SendOutlined,
  WarningOutlined,
  QuestionCircleOutlined,
  BookOutlined,
  StarOutlined,
  EditOutlined,
  EyeOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/contexts/auth-context";
import { usePageHeader } from "@/contexts/page-header-context";
import {
  getFormForResponse,
  saveDraftResponse,
  submitFormResponse,
  FormWithDetails,
  SubmitFormResponseRequest,
} from "@/lib/forms";
import dayjs from "dayjs";

const { TextArea } = Input;
const { Text, Title, Paragraph } = Typography;

// 타입 정의
interface FormQuestion {
  id: string;
  type: "text" | "rating" | "choice" | "exam";
  text: string;
  required: boolean;
  orderIndex: number;
  config: {
    textConfig?: {
      subtype: "text" | "textarea";
      maxLength?: number;
    };
    ratingConfig?: {
      max: number;
      step: number;
    };
    choiceConfig?: {
      options: string[];
      multiple: boolean;
      allowOther: boolean;
    };
    examConfig?: {
      conceptTemplateId?: string;
      questionCount: number;
      concepts?: ConceptItem[];
    };
  };
}

interface ConceptItem {
  id: string;
  name: string;
  description?: string;
  orderIndex: number;
}

interface ResponseData {
  [questionId: string]: {
    textResponse?: string;
    numberResponse?: number;
    ratingResponse?: number;
    choiceResponse?: string[];
    examResponse?: {
      incorrectQuestions: number[];
      conceptChecks: { [conceptId: string]: boolean };
    };
  };
}

interface FormResponseValues {
  [key: string]: any;
}

export default function FormResponsePage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const { setPageHeader } = usePageHeader();
  const formId = params.formId as string;

  // 상태 관리
  const [form] = Form.useForm();
  const [formDetails, setFormDetails] = useState<FormWithDetails | null>(null);
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [responses, setResponses] = useState<ResponseData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedQuestions, setCompletedQuestions] = useState<Set<string>>(new Set());

  // 진행률 관리
  const [progress, setProgress] = useState(0);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // 모달 상태
  const [submitModalVisible, setSubmitModalVisible] = useState(false);
  const [exitModalVisible, setExitModalVisible] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push("/auth");
      return;
    }
    loadFormData();
  }, [user, formId]);

  // 페이지 헤더 설정
  useEffect(() => {
    if (formDetails) {
      setPageHeader({
        title: formDetails.title,
        subtitle: `${formDetails.description || "폼 응답"} • 진행률 ${progress}%`,
        actions: (
          <Space>
            <Button
              icon={<SaveOutlined />}
              onClick={handleSaveDraft}
              loading={saving}
              disabled={submitting}
            >
              임시저장
            </Button>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={() => setSubmitModalVisible(true)}
              loading={submitting}
              disabled={progress < 100}
            >
              제출
            </Button>
          </Space>
        ),
      });
    }

    return () => setPageHeader(null);
  }, [setPageHeader, formDetails, progress, saving, submitting]);

  // 폼 데이터 로드
  const loadFormData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // 실제 API 호출 대신 예시 데이터 사용
      const mockForm: FormWithDetails = {
        id: formId,
        title: "2025학년도 1학기 중간고사 분석",
        description: "수학 중간고사 결과를 분석하고 학습 방향을 설정하는 폼입니다.",
        status: "sent",
        created_at: "2024-01-15T00:00:00Z",
        updated_at: "2024-01-15T00:00:00Z",
        sent_at: "2024-01-16T00:00:00Z",
        creator_id: "creator1",
        group_id: "group1",
        creator: {
          id: "creator1",
          name: "이선생",
          nickname: "이선생",
        },
        questions: [],
        tags: [],
        targets: [],
        responses: [],
        totalTargets: 0,
        completedResponses: 0,
        progressRate: 0,
      };

      const mockQuestions: FormQuestion[] = [
        {
          id: "q1",
          type: "text",
          text: "이번 시험에서 가장 어려웠던 부분은 무엇인가요?",
          required: true,
          orderIndex: 1,
          config: {
            textConfig: {
              subtype: "textarea",
              maxLength: 500,
            },
          },
        },
        {
          id: "q2",
          type: "rating",
          text: "전반적인 시험 만족도를 평가해주세요.",
          required: true,
          orderIndex: 2,
          config: {
            ratingConfig: {
              max: 5,
              step: 1,
            },
          },
        },
        {
          id: "q3",
          type: "choice",
          text: "다음 중 추가로 학습하고 싶은 영역을 선택해주세요. (복수 선택 가능)",
          required: false,
          orderIndex: 3,
          config: {
            choiceConfig: {
              options: ["미분의 응용", "적분 기초", "삼각함수", "지수함수", "로그함수"],
              multiple: true,
              allowOther: true,
            },
          },
        },
        {
          id: "q4",
          type: "exam",
          text: "틀린 문제에 대한 개념 이해도를 체크해주세요.",
          required: true,
          orderIndex: 4,
          config: {
            examConfig: {
              conceptTemplateId: "template1",
              questionCount: 20,
              concepts: [
                {
                  id: "c1",
                  name: "함수의 정의",
                  description: "함수의 기본 정의와 표현",
                  orderIndex: 1,
                },
                {
                  id: "c2",
                  name: "미분의 정의",
                  description: "미분의 개념과 기본 공식",
                  orderIndex: 2,
                },
                { id: "c3", name: "연쇄법칙", description: "합성함수의 미분", orderIndex: 3 },
                {
                  id: "c4",
                  name: "삼각함수 미분",
                  description: "삼각함수의 미분 공식",
                  orderIndex: 4,
                },
                {
                  id: "c5",
                  name: "지수함수 미분",
                  description: "지수함수의 미분 공식",
                  orderIndex: 5,
                },
              ],
            },
          },
        },
      ];

      setFormDetails(mockForm);
      setQuestions(mockQuestions);

      // 기존 응답 불러오기 (임시저장된 것이 있다면)
      const savedResponses: ResponseData = {};
      setResponses(savedResponses);

      // 초기 폼 값 설정
      form.setFieldsValue(savedResponses);
    } catch (error) {
      message.error("폼 데이터를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [user, formId, form]);

  // 진행률 계산
  useEffect(() => {
    const totalQuestions = questions.length;
    const requiredQuestions = questions.filter((q) => q.required).length;
    const completedCount = completedQuestions.size;

    if (totalQuestions > 0) {
      const newProgress = Math.round((completedCount / totalQuestions) * 100);
      setProgress(newProgress);
    }
  }, [completedQuestions, questions]);

  // 폼 값 변경 시 완료된 질문 추적
  const handleFormChange = (changedFields: any, allFields: any) => {
    const newCompletedQuestions = new Set<string>();

    questions.forEach((question) => {
      const fieldName = `question_${question.id}`;
      const fieldValue = allFields[fieldName];

      if (fieldValue !== undefined && fieldValue !== null && fieldValue !== "") {
        if (question.type === "choice" && Array.isArray(fieldValue) && fieldValue.length > 0) {
          newCompletedQuestions.add(question.id);
        } else if (
          question.type === "exam" &&
          fieldValue &&
          fieldValue.incorrectQuestions &&
          fieldValue.conceptChecks
        ) {
          newCompletedQuestions.add(question.id);
        } else if (question.type !== "choice" && question.type !== "exam") {
          newCompletedQuestions.add(question.id);
        }
      }
    });

    setCompletedQuestions(newCompletedQuestions);
  };

  // 임시저장
  const handleSaveDraft = async () => {
    if (!user || !formDetails) return;

    setSaving(true);
    try {
      const formValues = form.getFieldsValue();
      const responses = convertFormValuesToResponses(formValues);

      // 실제 API 호출
      // const result = await saveDraftResponse({
      //   formId,
      //   studentId: user.id,
      //   responses,
      // });

      message.success("임시저장되었습니다.");
      setLastSaved(new Date());
    } catch (error) {
      message.error("임시저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  // 폼 제출
  const handleSubmit = async () => {
    if (!user || !formDetails) return;

    try {
      await form.validateFields();

      setSubmitting(true);
      const formValues = form.getFieldsValue();
      const responses = convertFormValuesToResponses(formValues);

      const submitRequest: SubmitFormResponseRequest = {
        formId,
        studentId: user.id,
        responses,
      };

      const result = await submitFormResponse(submitRequest);

      if (result.success) {
        message.success("폼이 성공적으로 제출되었습니다!");
        setSubmitModalVisible(false);
        router.push("/dashboard");
      } else {
        message.error(result.error || "폼 제출에 실패했습니다.");
      }
    } catch (error) {
      message.error("폼 제출 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  // 폼 값을 응답 형식으로 변환
  const convertFormValuesToResponses = (formValues: FormResponseValues) => {
    return questions.map((question) => {
      const fieldName = `question_${question.id}`;
      const fieldValue = formValues[fieldName];

      const response: any = {};

      switch (question.type) {
        case "text":
          response.textResponse = fieldValue;
          break;
        case "rating":
          response.ratingResponse = fieldValue;
          break;
        case "choice":
          response.textResponse = Array.isArray(fieldValue) ? fieldValue.join(", ") : fieldValue;
          break;
        case "exam":
          response.examResponse = fieldValue;
          break;
      }

      return {
        questionId: question.id,
        ...response,
      };
    });
  };

  // 질문 렌더링
  const renderQuestion = (question: FormQuestion, index: number) => {
    const fieldName = `question_${question.id}`;
    const isCompleted = completedQuestions.has(question.id);

    return (
      <Card
        key={question.id}
        className={`mb-6 ${isCompleted ? "border-green-300" : ""}`}
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Badge count={index + 1} color={isCompleted ? "green" : "blue"} />
              <span className="text-base font-medium">{question.text}</span>
              {question.required && <Tag color="red">필수</Tag>}
            </div>
            <div className="flex items-center space-x-2">
              {isCompleted && <CheckCircleOutlined className="text-green-500" />}
              <Tooltip title={question.required ? "필수 질문입니다" : "선택 질문입니다"}>
                <QuestionCircleOutlined className="text-gray-400" />
              </Tooltip>
            </div>
          </div>
        }
      >
        {renderQuestionInput(question, fieldName)}
      </Card>
    );
  };

  // 질문 입력 필드 렌더링
  const renderQuestionInput = (question: FormQuestion, fieldName: string) => {
    const rules = question.required ? [{ required: true, message: "이 질문은 필수입니다!" }] : [];

    switch (question.type) {
      case "text":
        const isTextarea = question.config.textConfig?.subtype === "textarea";
        const maxLength = question.config.textConfig?.maxLength;

        return (
          <Form.Item name={fieldName} rules={rules}>
            {isTextarea ? (
              <TextArea
                rows={4}
                placeholder="답변을 입력하세요..."
                maxLength={maxLength}
                showCount={!!maxLength}
              />
            ) : (
              <Input
                placeholder="답변을 입력하세요..."
                maxLength={maxLength}
                showCount={!!maxLength}
              />
            )}
          </Form.Item>
        );

      case "rating":
        const max = question.config.ratingConfig?.max || 5;
        const step = question.config.ratingConfig?.step || 1;

        return (
          <Form.Item name={fieldName} rules={rules}>
            <div className="flex items-center space-x-4">
              <Rate count={max} />
              <span className="text-gray-500">{max}점 만점</span>
            </div>
          </Form.Item>
        );

      case "choice":
        const options = question.config.choiceConfig?.options || [];
        const multiple = question.config.choiceConfig?.multiple || false;
        const allowOther = question.config.choiceConfig?.allowOther || false;

        return (
          <Form.Item name={fieldName} rules={rules}>
            {multiple ? (
              <Checkbox.Group>
                <div className="space-y-2">
                  {options.map((option, idx) => (
                    <div key={idx}>
                      <Checkbox value={option}>{option}</Checkbox>
                    </div>
                  ))}
                  {allowOther && (
                    <div className="flex items-center space-x-2">
                      <Checkbox value="기타">기타:</Checkbox>
                      <Input placeholder="직접 입력" className="flex-1" />
                    </div>
                  )}
                </div>
              </Checkbox.Group>
            ) : (
              <Radio.Group>
                <div className="space-y-2">
                  {options.map((option, idx) => (
                    <div key={idx}>
                      <Radio value={option}>{option}</Radio>
                    </div>
                  ))}
                  {allowOther && (
                    <div className="flex items-center space-x-2">
                      <Radio value="기타">기타:</Radio>
                      <Input placeholder="직접 입력" className="flex-1" />
                    </div>
                  )}
                </div>
              </Radio.Group>
            )}
          </Form.Item>
        );

      case "exam":
        const concepts = question.config.examConfig?.concepts || [];
        const questionCount = question.config.examConfig?.questionCount || 0;

        return (
          <div className="space-y-6">
            <Alert
              message="시험 문제 분석"
              description={`총 ${questionCount}문제 중 틀린 문제 번호를 체크하고, 관련 개념의 이해도를 확인해주세요.`}
              type="info"
              showIcon
            />

            <div>
              <Title level={5}>1. 틀린 문제 번호 선택</Title>
              <Form.Item
                name={[fieldName, "incorrectQuestions"]}
                rules={[{ required: true, message: "틀린 문제를 선택해주세요!" }]}
              >
                <Checkbox.Group>
                  <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: questionCount }, (_, i) => i + 1).map((num) => (
                      <Checkbox key={num} value={num}>
                        {num}번
                      </Checkbox>
                    ))}
                  </div>
                </Checkbox.Group>
              </Form.Item>
            </div>

            <div>
              <Title level={5}>2. 개념 이해도 체크</Title>
              <div className="space-y-3">
                {concepts.map((concept) => (
                  <div
                    key={concept.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{concept.name}</div>
                      {concept.description && (
                        <div className="text-sm text-gray-500">{concept.description}</div>
                      )}
                    </div>
                    <Form.Item name={[fieldName, "conceptChecks", concept.id]} className="mb-0">
                      <Radio.Group>
                        <Radio value={true}>이해함</Radio>
                        <Radio value={false}>모르겠음</Radio>
                      </Radio.Group>
                    </Form.Item>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return <div>지원하지 않는 질문 타입입니다.</div>;
    }
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="text-gray-600">폼을 불러오는 중...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!formDetails) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="text-gray-600">폼을 찾을 수 없습니다.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 진행률 표시 */}
        <Affix offsetTop={80}>
          <Card className="mb-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-sm font-medium">진행률</div>
                <Progress
                  percent={progress}
                  size="small"
                  style={{ width: 200 }}
                  strokeColor={{
                    from: "#108ee9",
                    to: "#87d068",
                  }}
                />
                <div className="text-sm text-gray-600">
                  {completedQuestions.size} / {questions.length} 완료
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {lastSaved && (
                  <div className="text-xs text-gray-500">
                    마지막 저장: {dayjs(lastSaved).format("HH:mm")}
                  </div>
                )}
                <div className="text-xs text-gray-500">
                  <ClockCircleOutlined className="mr-1" />
                  자동 저장됨
                </div>
              </div>
            </div>
          </Card>
        </Affix>

        {/* 폼 기본 정보 */}
        <Card className="mb-6">
          <div className="text-center">
            <Title level={2}>{formDetails.title}</Title>
            {formDetails.description && (
              <Paragraph className="text-gray-600 text-lg">{formDetails.description}</Paragraph>
            )}
            <div className="flex justify-center space-x-6 mt-4">
              <div className="flex items-center space-x-2">
                <QuestionCircleOutlined className="text-blue-500" />
                <span className="text-sm">총 {questions.length}개 질문</span>
              </div>
              <div className="flex items-center space-x-2">
                <WarningOutlined className="text-red-500" />
                <span className="text-sm">필수 {questions.filter((q) => q.required).length}개</span>
              </div>
            </div>
          </div>
        </Card>

        {/* 질문 및 답변 */}
        <Form
          form={form}
          layout="vertical"
          onFieldsChange={handleFormChange}
          onFinish={handleSubmit}
        >
          <div className="space-y-6">
            {questions.map((question, index) => renderQuestion(question, index))}
          </div>

          {/* 하단 버튼 */}
          <Card className="mt-8">
            <div className="flex justify-between items-center">
              <Button onClick={() => setExitModalVisible(true)} size="large">
                나가기
              </Button>

              <Space>
                <Button
                  icon={<SaveOutlined />}
                  onClick={handleSaveDraft}
                  loading={saving}
                  disabled={submitting}
                  size="large"
                >
                  임시저장
                </Button>
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={() => setSubmitModalVisible(true)}
                  loading={submitting}
                  disabled={progress < 100}
                  size="large"
                >
                  제출하기
                </Button>
              </Space>
            </div>
          </Card>
        </Form>

        {/* 제출 확인 모달 */}
        <Modal
          title="폼 제출 확인"
          open={submitModalVisible}
          onOk={handleSubmit}
          onCancel={() => setSubmitModalVisible(false)}
          okText="제출"
          cancelText="취소"
          confirmLoading={submitting}
        >
          <div className="space-y-4">
            <Alert
              message="제출 전 확인사항"
              description="제출한 후에는 수정할 수 없습니다. 모든 답변을 확인해주세요."
              type="warning"
              showIcon
            />

            <div>
              <div className="font-medium mb-2">현재 진행 상황:</div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>전체 진행률:</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <div className="flex justify-between">
                  <span>완료된 질문:</span>
                  <span className="font-medium">
                    {completedQuestions.size} / {questions.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>필수 질문:</span>
                  <span className="font-medium">
                    {questions.filter((q) => q.required && completedQuestions.has(q.id)).length} /{" "}
                    {questions.filter((q) => q.required).length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Modal>

        {/* 나가기 확인 모달 */}
        <Modal
          title="폼 나가기"
          open={exitModalVisible}
          onOk={() => {
            setExitModalVisible(false);
            router.back();
          }}
          onCancel={() => setExitModalVisible(false)}
          okText="나가기"
          cancelText="계속 작성"
          okButtonProps={{ danger: true }}
        >
          <div className="space-y-4">
            <Alert
              message="작성 중인 내용이 있습니다"
              description="나가기 전에 임시저장을 하시겠습니까?"
              type="warning"
              showIcon
            />

            <div className="flex justify-center">
              <Button icon={<SaveOutlined />} onClick={handleSaveDraft} loading={saving}>
                임시저장 후 나가기
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
