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
import {
  getAllClasses,
  ClassWithDetails,
  getUserClassesForFormResponse,
  canUserRespondToForm,
} from "@/lib/classes";
import { supabaseAdmin } from "@/lib/supabase";

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
  const [userClasses, setUserClasses] = useState<ClassWithDetails[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | undefined>(undefined);
  const [classesLoading, setClassesLoading] = useState(false);

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

  // 사용자가 속한 클래스 조회 (응답 모드에서만)
  const loadUserClasses = useCallback(async () => {
    if (!user || !groupId || !isRespondMode) return;

    try {
      setClassesLoading(true);

      // ✅ 먼저 사용자가 이 폼에 응답할 권한이 있는지 확인
      const permissionResult = await canUserRespondToForm(formId, user.id);

      if (!permissionResult.success || !permissionResult.data) {
        setError("이 폼에 응답할 권한이 없습니다.");
        return;
      }

      // ✅ 개선된 함수를 사용해서 사용자가 속한 클래스들 조회
      const classesResult = await getUserClassesForFormResponse(user.id, groupId);

      if (classesResult.success && classesResult.data) {
        setUserClasses(classesResult.data);

        // 클래스가 하나뿐이면 자동 선택
        if (classesResult.data.length === 1) {
          setSelectedClass(classesResult.data[0].id);
        }
      } else {
        console.error("사용자 클래스 조회 실패:", classesResult.error);
        // 클래스가 없어도 개인 타겟일 수 있으므로 에러로 처리하지 않음
        setUserClasses([]);
      }
    } catch (error) {
      console.error("사용자 클래스 조회 오류:", error);
      setUserClasses([]);
    } finally {
      setClassesLoading(false);
    }
  }, [user, groupId, isRespondMode, formId]);

  const renderClassSelection = () => {
    if (!isRespondMode) return null;

    if (classesLoading) {
      return (
        <Card>
          <div className="flex items-center justify-center py-4">
            <Spin />
            <Text className="ml-2">클래스 정보를 불러오는 중...</Text>
          </div>
        </Card>
      );
    }

    // 클래스가 없는 경우
    if (userClasses.length === 0) {
      return (
        <Card>
          <div className="flex items-center space-x-2">
            <CheckOutlined className="text-green-500" />
            <Text>개별 대상자로 설정되었습니다.</Text>
          </div>
        </Card>
      );
    }

    // 클래스가 하나인 경우
    if (userClasses.length === 1) {
      return (
        <Card>
          <div className="flex items-center space-x-2">
            <CheckOutlined className="text-green-500" />
            <Text>
              <Text strong>{userClasses[0].name}</Text> 클래스로 자동 선택되었습니다.
            </Text>
          </div>
        </Card>
      );
    }

    // 클래스가 여러 개인 경우
    return (
      <Card>
        <Title level={4}>클래스 선택</Title>
        <Text type="secondary" className="block mb-4">
          소속된 클래스를 선택해주세요.
        </Text>

        <RadioGroup
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="w-full"
        >
          <div className="space-y-2">
            {userClasses.map((classItem) => (
              <Radio key={classItem.id} value={classItem.id} className="block">
                <div className="ml-2">
                  <Text strong>{classItem.name}</Text>
                  {classItem.description && (
                    <Text type="secondary" className="block text-sm">
                      {classItem.description}
                    </Text>
                  )}
                </div>
              </Radio>
            ))}
          </div>
        </RadioGroup>
      </Card>
    );
  };

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

  // 폼 데이터 로드
  useEffect(() => {
    loadFormData();
  }, [loadFormData]);

  // 사용자 클래스 로드 (응답 모드에서만)
  useEffect(() => {
    if (form && isRespondMode) {
      loadUserClasses();
    }
  }, [form, isRespondMode, loadUserClasses]);

  // 응답 데이터 업데이트
  const updateResponse = (questionId: string, value: any) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  // 응답 제출
  // 폼 응답 제출 함수 개선 (page.tsx의 handleSubmitResponse 부분)

  const handleSubmitResponse = async () => {
    if (!form || !user) return;

    try {
      setSubmitting(true);

      // ✅ 응답 모드에서는 클래스 선택이 필수 (클래스가 여러 개인 경우)
      if (isRespondMode && userClasses.length > 1 && !selectedClass) {
        message.warning("클래스를 선택해주세요.");
        return;
      }

      // 필수 질문 체크
      const requiredQuestions = form.questions.filter((q) => q.is_required);
      const missingRequired = requiredQuestions.filter((q) => {
        const response = responses[q.id];

        if (q.question_type === "exam") {
          // 시험형은 배열이어야 하고, undefined가 아니면 유효 (빈 배열도 유효 - 모든 문제를 맞춘 경우)
          return response === undefined || response === null;
        } else {
          // 다른 타입은 기존과 동일
          return !response || (Array.isArray(response) && response.length === 0);
        }
      });

      if (missingRequired.length > 0) {
        message.warning("필수 질문에 모두 응답해주세요.");
        return;
      }

      // ✅ 선택된 클래스 정보 조회 - 클래스가 하나뿐이면 자동으로 그것을 사용
      const selectedClassInfo = selectedClass
        ? userClasses.find((cls) => cls.id === selectedClass)
        : userClasses.length === 1
        ? userClasses[0]
        : undefined;

      // 응답 데이터 변환
      const submitResponses = form.questions
        .map((question) => {
          const response: any = {
            questionId: question.id,
          };

          if (question.question_type === "text") {
            response.textResponse = responses[question.id];
          } else if (question.question_type === "rating") {
            response.numberResponse = responses[question.id];
            response.ratingResponse = responses[question.id];
          } else if (question.question_type === "exam") {
            // 시험 응답은 배열 형태로 저장
            response.examResponse = responses[question.id] || [];
          }

          return response;
        })
        .filter((response) => {
          return (
            response.textResponse !== undefined ||
            response.numberResponse !== undefined ||
            response.ratingResponse !== undefined ||
            (response.examResponse !== undefined && Array.isArray(response.examResponse))
          );
        });

      const submitRequest: SubmitFormResponseRequest = {
        formId: form.id,
        studentId: user.id,
        classId: selectedClassInfo?.id, // ✅ 선택된 클래스 ID 전달
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
        const wrongQuestions = responses[id] || [];

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

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Text strong>틀린 문제 번호를 체크해주세요:</Text>
                <Text type="secondary">
                  틀린 문제: {wrongQuestions.length}개 / 총 {totalQuestions}문제
                </Text>
              </div>

              <CheckboxGroup
                value={wrongQuestions}
                onChange={(checkedValues) => updateResponse(id, checkedValues)}
              >
                <div className="grid grid-cols-5 gap-4">
                  {Array.from({ length: totalQuestions }, (_, index) => {
                    const questionNum = index + 1;
                    return (
                      <div key={questionNum} className="flex items-center">
                        <Checkbox value={questionNum}>{questionNum}번</Checkbox>
                      </div>
                    );
                  })}
                </div>
              </CheckboxGroup>

              <div className="mt-4 p-3 bg-orange-50 rounded-lg">
                <Text type="secondary">💡 틀린 문제만 체크하고, 맞은 문제는 체크하지 마세요.</Text>
              </div>
            </div>
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

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Text strong>틀린 문제 번호 체크 (미리보기):</Text>
                <Text type="secondary">총 {totalQuestions}문제</Text>
              </div>

              <CheckboxGroup disabled>
                <div className="grid grid-cols-5 gap-4">
                  {Array.from({ length: totalQuestions }, (_, index) => {
                    const questionNum = index + 1;
                    return (
                      <div key={questionNum} className="flex items-center">
                        <Checkbox value={questionNum}>{questionNum}번</Checkbox>
                      </div>
                    );
                  })}
                </div>
              </CheckboxGroup>

              <Alert
                message="시험 응답 방식"
                description="실제 응답 시에는 틀린 문제 번호만 체크하면 됩니다. 맞은 문제는 체크하지 않습니다."
                type="info"
                showIcon
              />
            </div>
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

      {/* 클래스 선택 (응답 모드에서 클래스가 여러 개인 경우) */}
      {isRespondMode && userClasses.length > 1 && (
        <Card>
          <Title level={4}>클래스 선택</Title>
          <Text type="secondary" className="block mb-4">
            소속된 클래스를 선택해주세요.
          </Text>

          {classesLoading ? (
            <Spin />
          ) : (
            <RadioGroup
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full"
            >
              <div className="space-y-2">
                {userClasses.map((classItem) => (
                  <Radio key={classItem.id} value={classItem.id} className="block">
                    <div className="ml-2">
                      <Text strong>{classItem.name}</Text>
                      {classItem.description && (
                        <Text type="secondary" className="block text-sm">
                          {classItem.description}
                        </Text>
                      )}
                    </div>
                  </Radio>
                ))}
              </div>
            </RadioGroup>
          )}
        </Card>
      )}

      {/* 클래스 자동 선택 안내 (클래스가 하나인 경우) */}
      {isRespondMode && userClasses.length === 1 && (
        <Card>
          <div className="flex items-center space-x-2">
            <CheckOutlined className="text-green-500" />
            <Text>
              <Text strong>{userClasses[0].name}</Text> 클래스로 자동 선택되었습니다.
            </Text>
          </div>
        </Card>
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
              .filter((question) => question && question.id) // 유효한 질문만 필터링
              .map((question) => {
                try {
                  // 에러 처리와 함께 명시적 반환
                  return isRespondMode
                    ? renderRespondQuestion(question)
                    : renderPreviewQuestion(question);
                } catch (error) {
                  console.error("Question render error:", error);
                  // 에러 발생 시 대체 UI 반환
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
