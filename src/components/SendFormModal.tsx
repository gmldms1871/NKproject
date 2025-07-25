"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import {
  Card,
  Button,
  Form,
  Input,
  Select,
  Space,
  Modal,
  Row,
  Col,
  Typography,
  Divider,
  InputNumber,
  Radio,
  Switch,
  Tag,
  Badge,
  Empty,
  Spin,
  App,
  Dropdown,
  Tooltip,
  Alert,
  Checkbox,
  List,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  SaveOutlined,
  SendOutlined,
  DragOutlined,
  QuestionCircleOutlined,
  FormOutlined,
  StarOutlined,
  CheckSquareOutlined,
  FileTextOutlined,
  MoreOutlined,
  CopyOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  CloseOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import type { DropResult } from "react-beautiful-dnd";
import { useAuth } from "@/contexts/auth-context";
import { usePageHeader } from "@/contexts/page-header-context";
import {
  createForm,
  updateForm,
  getFormDetails,
  duplicateForm,
  createQuestion,
  updateQuestion,
  reorderQuestions,
  sendForm,
  saveFormAsDraft,
  FormWithDetails,
  QuestionWithDetails,
  CreateFormRequest,
  UpdateFormRequest,
  CreateQuestionRequest,
  UpdateQuestionRequest,
  ReorderQuestionsRequest,
  SendFormRequest,
  createConceptTemplate,
  CreateConceptTemplateRequest,
  ConceptTemplateWithItems,
} from "@/lib/forms";
import { getGroupMembers, GroupMemberWithDetails } from "@/lib/groups";
import { getAllClasses, ClassWithDetails } from "@/lib/classes";

const { Title, Text } = Typography;
const { TextArea } = Input;

// 타입 정의
interface SendTarget {
  type: "individual" | "class";
  id: string;
  name: string;
}

// 타입 정의
interface QuestionFormData {
  id?: string;
  questionType: "text" | "rating" | "choice" | "exam";
  questionText: string;
  isRequired: boolean;
  orderIndex: number;
  // 텍스트형
  textSubtype?: "text" | "textarea";
  textMaxLength?: number;
  // 별점형
  ratingMax?: number;
  ratingStep?: number;
  // 객관식
  choiceOptions?: string[];
  choiceMultiple?: boolean;
  choiceAllowOther?: boolean;
  // 시험형
  examTotalQuestions?: number;
  examConceptTemplateId?: string;
  examUseExisting?: boolean;
  examNewTemplateName?: string;
  examConceptItems?: Array<{ text: string; description?: string }>;
}

export default function FormCreatePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { setPageHeader } = usePageHeader();
  const { message } = App.useApp();

  const groupId = params.id as string;
  const editId = searchParams.get("editId");
  const duplicateId = searchParams.get("duplicateId");

  const isEditing = !!editId;
  const isDuplicating = !!duplicateId;

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  // 현재 폼 ID 상태 (새로 생성된 경우 여기에 저장)
  const [currentFormId, setCurrentFormId] = useState<string | null>(editId);

  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    timeTeacherId?: string;
    teacherId?: string;
  }>({
    title: "",
    description: "",
  });
  const [questions, setQuestions] = useState<QuestionFormData[]>([]);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [teachers, setTeachers] = useState<GroupMemberWithDetails[]>([]);

  // 페이지 헤더 설정
  useEffect(() => {
    const title = isEditing ? "폼 수정" : isDuplicating ? "폼 복제" : "새 폼 생성";
    const subtitle = isEditing
      ? "기존 폼을 수정합니다"
      : isDuplicating
      ? "기존 폼을 복제하여 새 폼을 만듭니다"
      : "새로운 폼을 생성합니다";

    setPageHeader({
      title,
      subtitle,
      backUrl: `/groups/${groupId}/forms`,
    });

    return () => setPageHeader(null);
  }, [setPageHeader, groupId, isEditing, isDuplicating]);

  // 선생님 목록 로드
  const loadTeachers = useCallback(async () => {
    if (!user || !groupId) return;

    try {
      const result = await getGroupMembers(groupId, user.id);
      if (result.success) {
        const teacherMembers = (result.data || []).filter(
          (member) =>
            member.group_roles?.can_create_form ||
            member.group_roles?.name === "owner" ||
            member.group_roles?.name === "teacher" ||
            member.group_roles?.name === "time_teacher"
        );
        setTeachers(teacherMembers);
      }
    } catch (error) {
      console.error("선생님 목록 로드 오류:", error);
    }
  }, [user, groupId]);

  // 폼 데이터 로드 (수정/복제 시)
  const loadFormData = useCallback(async () => {
    const targetId = editId || duplicateId;
    if (!targetId || !user) return;

    try {
      setLoading(true);
      const result = await getFormDetails(targetId);

      if (result.success && result.data) {
        const formData = result.data;

        setFormData({
          title: isDuplicating ? `${formData.title} [복사본]` : formData.title,
          description: formData.description || "",
          timeTeacherId: isDuplicating ? undefined : formData.timeTeacher?.id,
          teacherId: isDuplicating ? undefined : formData.teacher?.id,
        });

        // Form 컴포넌트에 값 설정
        form.setFieldsValue({
          title: isDuplicating ? `${formData.title} [복사본]` : formData.title,
          description: formData.description || "",
          timeTeacherId: isDuplicating ? undefined : formData.timeTeacher?.id,
          teacherId: isDuplicating ? undefined : formData.teacher?.id,
        });

        // 질문 데이터 변환
        const questionFormData: QuestionFormData[] = formData.questions.map((q, index) => {
          const base: QuestionFormData = {
            id: isDuplicating ? undefined : q.id,
            questionType: q.question_type as QuestionFormData["questionType"],
            questionText: q.question_text,
            isRequired: q.is_required || false,
            orderIndex: index,
          };

          // 타입별 상세 정보 매핑
          if (q.question_type === "choice" && q.choiceDetails) {
            base.choiceOptions = q.choiceDetails.options.map((opt) =>
              typeof opt === "string" ? opt : opt.option_text || ""
            );
            base.choiceMultiple = q.choiceDetails.is_multiple || false;
            base.choiceAllowOther = q.choiceDetails.etc_option_enabled || false;
          } else if (q.question_type === "rating" && q.ratingDetails) {
            base.ratingMax = q.ratingDetails.rating_max || 5;
            base.ratingStep = q.ratingDetails.rating_step || 1;
          } else if (q.question_type === "exam" && q.examDetails) {
            base.examTotalQuestions = q.examDetails.total_questions || 1;
            base.examConceptTemplateId = q.examDetails.concept_template_id || undefined;
            base.examUseExisting = !!q.examDetails.concept_template_id;
            if (q.examDetails.conceptTemplate) {
              base.examNewTemplateName = q.examDetails.conceptTemplate.name;
              base.examConceptItems = q.examDetails.conceptTemplate.conceptItems.map((item) => ({
                text: item.concept_text,
                description: item.concept_description,
              }));
            }
          } else if (q.question_type === "text" && q.textDetails) {
            base.textSubtype = q.textDetails.subtype || "text";
            base.textMaxLength = q.textDetails.maxLength || 1000;
          }

          return base;
        });

        setQuestions(questionFormData);
      } else {
        message.error(result.error || "폼 데이터를 불러올 수 없습니다.");
      }
    } catch (error) {
      console.error("폼 데이터 로드 오류:", error);
      message.error("폼 데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [editId, duplicateId, user, isDuplicating, form, message]);

  // 초기 데이터 로드
  useEffect(() => {
    loadTeachers();
    if (editId || duplicateId) {
      loadFormData();
    }
  }, [loadTeachers, loadFormData, editId, duplicateId]);

  // 폼 저장 (생성/수정)
  const saveForm = async (isDraft: boolean = false): Promise<string | null> => {
    try {
      setSaving(true);

      // 폼 validation
      const values = await form.validateFields();

      if (!values.title?.trim()) {
        message.warning("폼 제목을 입력해주세요.");
        return null;
      }

      // 질문 검증
      for (const question of questions) {
        if (!question.questionText.trim()) {
          message.warning("모든 질문의 내용을 입력해주세요.");
          return null;
        }

        if (question.questionType === "choice") {
          const validOptions = (question.choiceOptions || []).filter((opt) => opt.trim());
          if (validOptions.length < 2) {
            message.warning("객관식 질문은 최소 2개의 선택지가 필요합니다.");
            return null;
          }
        }

        if (question.questionType === "exam" && !question.examUseExisting) {
          if (!question.examNewTemplateName?.trim()) {
            message.warning("시험형 질문의 개념 템플릿 이름을 입력해주세요.");
            return null;
          }

          const validConcepts = (question.examConceptItems || []).filter((item) =>
            item.text.trim()
          );
          if (validConcepts.length === 0) {
            message.warning("시험형 질문의 개념을 최소 1개 이상 입력해주세요.");
            return null;
          }

          if (validConcepts.length !== question.examTotalQuestions) {
            message.warning("시험 문제 수와 개념 수가 일치해야 합니다.");
            return null;
          }
        }
      }

      let resultFormId: string;

      if (isEditing && currentFormId) {
        // 폼 수정
        const updateRequest: UpdateFormRequest = {
          title: values.title,
          description: values.description,
          status: isDraft ? "draft" : "active",
          isDraft,
        };

        const result = await updateForm(currentFormId, updateRequest);
        if (!result.success) {
          throw new Error(result.error);
        }
        resultFormId = currentFormId;
      } else {
        // 폼 생성
        const createRequest: CreateFormRequest = {
          title: values.title,
          description: values.description,
          groupId,
          creatorId: user!.id,
          status: isDraft ? "draft" : "active",
          isDraft,
        };

        const result = await createForm(createRequest);
        if (!result.success) {
          throw new Error(result.error);
        }
        resultFormId = result.data!;

        // 새로 생성된 폼 ID 저장
        setCurrentFormId(resultFormId);
      }

      // 질문 저장/업데이트
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];

        if (question.id && isEditing) {
          // 기존 질문 업데이트
          const updateRequest: UpdateQuestionRequest = {
            questionText: question.questionText,
            isRequired: question.isRequired,
            orderIndex: i,
          };

          // 타입별 설정 추가
          if (question.questionType === "rating") {
            updateRequest.ratingConfig = {
              ratingMax: question.ratingMax!,
              ratingStep: question.ratingStep!,
            };
          } else if (question.questionType === "choice") {
            updateRequest.choiceConfig = {
              options: (question.choiceOptions || []).filter((opt) => opt.trim()),
              multiple: question.choiceMultiple!,
              allowOther: question.choiceAllowOther,
            };
          } else if (question.questionType === "exam") {
            updateRequest.examConfig = {
              totalQuestions: question.examTotalQuestions!,
              conceptTemplateId: question.examConceptTemplateId,
            };
          }

          await updateQuestion(question.id, updateRequest);
        } else {
          // 새 질문 생성
          const createRequest: CreateQuestionRequest = {
            questionType: question.questionType,
            questionText: question.questionText,
            isRequired: question.isRequired,
            orderIndex: i,
          };

          // 타입별 설정 추가
          if (question.questionType === "text") {
            createRequest.textConfig = {
              subtype: question.textSubtype!,
              maxLength: question.textMaxLength,
            };
          } else if (question.questionType === "rating") {
            createRequest.ratingConfig = {
              ratingMax: question.ratingMax!,
              ratingStep: question.ratingStep!,
            };
          } else if (question.questionType === "choice") {
            createRequest.choiceConfig = {
              options: (question.choiceOptions || []).filter((opt) => opt.trim()),
              multiple: question.choiceMultiple!,
              allowOther: question.choiceAllowOther,
            };
          } else if (question.questionType === "exam") {
            createRequest.examConfig = {
              totalQuestions: question.examTotalQuestions!,
              conceptTemplateId: question.examConceptTemplateId,
            };
          }

          const result = await createQuestion(resultFormId, createRequest);
          if (result.success && result.data) {
            // 생성된 질문 ID를 로컬 상태에 반영
            setQuestions((prev) =>
              prev.map((q, index) => (index === i ? { ...q, id: result.data } : q))
            );
          }
        }
      }

      message.success(isDraft ? "폼이 임시저장되었습니다." : "폼이 저장되었습니다.");

      return resultFormId;
    } catch (error) {
      console.error("폼 저장 오류:", error);
      message.error(error instanceof Error ? error.message : "폼 저장 중 오류가 발생했습니다.");
      return null;
    } finally {
      setSaving(false);
    }
  };

  // 폼 전송
  const sendFormHandler = async (
    targets: { type: "individual" | "class"; id: string; name: string }[]
  ) => {
    try {
      setSending(true);

      // 먼저 폼 저장
      const savedFormId = await saveForm(false);
      if (!savedFormId) {
        return;
      }

      // 전송 요청 생성
      const sendRequest: SendFormRequest = {
        formId: savedFormId,
        targets: targets.map((t) => ({ type: t.type, id: t.id })),
        message: `새로운 폼 "${formData.title}"이 전송되었습니다.`,
      };

      const result = await sendForm(sendRequest);

      if (result.success) {
        message.success(`폼이 ${targets.length}개 대상에게 전송되었습니다.`);
        setSendModalOpen(false);
        router.push(`/groups/${groupId}/forms`);
      } else {
        message.error(result.error || "폼 전송에 실패했습니다.");
      }
    } catch (error) {
      message.error("폼 전송 중 오류가 발생했습니다.");
    } finally {
      setSending(false);
    }
  };

  // 질문 추가
  const addQuestion = (type: QuestionFormData["questionType"]) => {
    const newQuestion: QuestionFormData = {
      questionType: type,
      questionText: "",
      isRequired: false,
      orderIndex: questions.length,
    };

    // 타입별 기본값 설정
    switch (type) {
      case "rating":
        newQuestion.ratingMax = 5;
        newQuestion.ratingStep = 1;
        break;
      case "choice":
        newQuestion.choiceOptions = [""];
        newQuestion.choiceMultiple = false;
        newQuestion.choiceAllowOther = false;
        break;
      case "exam":
        newQuestion.examTotalQuestions = 1;
        newQuestion.examUseExisting = false;
        newQuestion.examConceptItems = [{ text: "" }];
        break;
      case "text":
        newQuestion.textSubtype = "text";
        newQuestion.textMaxLength = 1000;
        break;
    }

    setQuestions([...questions, newQuestion]);
    setEditingQuestionIndex(questions.length);
  };

  // 질문 삭제
  const deleteQuestion = (index: number) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    setQuestions(newQuestions.map((q, i) => ({ ...q, orderIndex: i })));
    if (editingQuestionIndex === index) {
      setEditingQuestionIndex(null);
    }
  };

  // 질문 순서 변경
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(questions);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedQuestions = items.map((item, index) => ({
      ...item,
      orderIndex: index,
    }));

    setQuestions(updatedQuestions);
  };

  // 질문 수정 모달
  const QuestionEditModal = () => {
    const [questionForm] = Form.useForm();
    const question = editingQuestionIndex !== null ? questions[editingQuestionIndex] : null;

    useEffect(() => {
      if (question) {
        questionForm.setFieldsValue(question);
      }
    }, [question, questionForm]);

    const handleSave = async () => {
      try {
        const values = await questionForm.validateFields();
        const updatedQuestions = [...questions];
        updatedQuestions[editingQuestionIndex!] = {
          ...question!,
          ...values,
        };
        setQuestions(updatedQuestions);
        setEditingQuestionIndex(null);
      } catch (error) {
        console.error("질문 수정 오류:", error);
      }
    };

    if (!question) return null;

    return (
      <Modal
        title="질문 수정"
        open={editingQuestionIndex !== null}
        onCancel={() => setEditingQuestionIndex(null)}
        onOk={handleSave}
        width={600}
      >
        <Form form={questionForm} layout="vertical">
          <Form.Item
            name="questionText"
            label="질문 내용"
            rules={[{ required: true, message: "질문 내용을 입력해주세요" }]}
          >
            <TextArea placeholder="질문을 입력하세요" rows={3} />
          </Form.Item>

          <Form.Item name="isRequired" valuePropName="checked">
            <Switch checkedChildren="필수" unCheckedChildren="선택" />
          </Form.Item>

          {/* 타입별 추가 옵션들 */}
          {question.questionType === "rating" && (
            <>
              <Form.Item name="ratingMax" label="최대 별점">
                <InputNumber min={1} max={10} />
              </Form.Item>
              <Form.Item name="ratingStep" label="별점 단위">
                <InputNumber min={0.1} max={1} step={0.1} />
              </Form.Item>
            </>
          )}

          {question.questionType === "choice" && (
            <>
              <Form.Item name="choiceMultiple" valuePropName="checked">
                <Switch checkedChildren="다중선택" unCheckedChildren="단일선택" />
              </Form.Item>
              <Form.Item name="choiceAllowOther" valuePropName="checked">
                <Switch checkedChildren="기타 허용" unCheckedChildren="기타 비허용" />
              </Form.Item>
              {/* 선택지 목록은 별도로 구현 필요 */}
            </>
          )}

          {question.questionType === "exam" && (
            <>
              <Form.Item name="examTotalQuestions" label="총 문제 수">
                <InputNumber min={1} max={50} />
              </Form.Item>
              <Form.Item name="examUseExisting" valuePropName="checked">
                <Switch checkedChildren="기존 템플릿 사용" unCheckedChildren="새 템플릿 생성" />
              </Form.Item>
              {/* 개념 템플릿 관련 필드들은 별도로 구현 필요 */}
            </>
          )}

          {question.questionType === "text" && (
            <>
              <Form.Item name="textSubtype" label="입력 형태">
                <Radio.Group>
                  <Radio value="text">한 줄 텍스트</Radio>
                  <Radio value="textarea">여러 줄 텍스트</Radio>
                </Radio.Group>
              </Form.Item>
              <Form.Item name="textMaxLength" label="최대 글자수">
                <InputNumber min={1} max={5000} />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    );
  };

  const hasExamQuestion = questions.some((q) => q.questionType === "exam");

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* 폼 기본 정보 */}
      <Card title="폼 기본 정보">
        <Form
          form={form}
          layout="vertical"
          onValuesChange={(_, values) => setFormData({ ...formData, ...values })}
        >
          <Row gutter={16}>
            <Col xs={24} md={16}>
              <Form.Item
                label="폼 제목"
                name="title"
                rules={[{ required: true, message: "폼 제목을 입력해주세요" }]}
              >
                <Input placeholder="폼 제목을 입력하세요" size="large" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="상태">
                <Tag color="blue" className="px-4 py-2">
                  {isEditing ? "수정 중" : isDuplicating ? "복제 중" : "새 폼"}
                </Tag>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="폼 설명" name="description">
            <TextArea placeholder="폼에 대한 설명을 입력하세요" rows={3} />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="시간강사" name="timeTeacherId">
                <Select placeholder="시간강사를 선택하세요" allowClear>
                  {teachers.map((teacher) => (
                    <Select.Option key={teacher.id} value={teacher.users?.id}>
                      {teacher.users?.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="담당 선생님" name="teacherId">
                <Select placeholder="담당 선생님을 선택하세요" allowClear>
                  {teachers.map((teacher) => (
                    <Select.Option key={teacher.id} value={teacher.users?.id}>
                      {teacher.users?.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* 질문 관리 */}
      <Card
        title={`질문 관리 (${questions.length}개)`}
        extra={
          <Dropdown
            menu={{
              items: [
                {
                  key: "text",
                  icon: <FileTextOutlined />,
                  label: "주관식/서술형",
                  onClick: () => addQuestion("text"),
                },
                {
                  key: "choice",
                  icon: <CheckSquareOutlined />,
                  label: "객관식",
                  onClick: () => addQuestion("choice"),
                },
                {
                  key: "rating",
                  icon: <StarOutlined />,
                  label: "별점평가",
                  onClick: () => addQuestion("rating"),
                },
                {
                  key: "exam",
                  icon: <ExclamationCircleOutlined />,
                  label: "시험형",
                  onClick: () => addQuestion("exam"),
                },
              ],
            }}
            trigger={["click"]}
          >
            <Button type="primary" icon={<PlusOutlined />}>
              질문 추가
            </Button>
          </Dropdown>
        }
      >
        {questions.length > 0 ? (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="questions">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                  {questions.map((question, index) => (
                    <Draggable key={index} draggableId={`question-${index}`} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-sm"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 flex-1">
                              <div {...provided.dragHandleProps} className="cursor-move">
                                <DragOutlined className="text-gray-400" />
                              </div>
                              <Badge count={index + 1} />
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  {question.questionType === "text" && (
                                    <FileTextOutlined className="text-blue-500" />
                                  )}
                                  {question.questionType === "choice" && (
                                    <CheckSquareOutlined className="text-green-500" />
                                  )}
                                  {question.questionType === "rating" && (
                                    <StarOutlined className="text-yellow-500" />
                                  )}
                                  {question.questionType === "exam" && (
                                    <ExclamationCircleOutlined className="text-red-500" />
                                  )}
                                  <Tag>
                                    {question.questionType === "text"
                                      ? "주관식/서술형"
                                      : question.questionType === "choice"
                                      ? "객관식"
                                      : question.questionType === "rating"
                                      ? "별점평가"
                                      : "시험형"}
                                  </Tag>
                                  {question.isRequired && <Tag color="red">필수</Tag>}
                                </div>
                                <Text className="text-base">
                                  {question.questionText || "질문 내용을 입력하세요"}
                                </Text>
                              </div>
                            </div>
                            <Space>
                              <Button
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => setEditingQuestionIndex(index)}
                              >
                                수정
                              </Button>
                              <Button
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => deleteQuestion(index)}
                              >
                                삭제
                              </Button>
                            </Space>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        ) : (
          <Empty description="아직 질문이 추가되지 않았습니다. 위의 '질문 추가' 버튼을 클릭하여 질문을 추가해보세요." />
        )}
      </Card>

      {/* 시험형 질문 안내 */}
      {hasExamQuestion && (
        <Alert
          message="시험형 질문 안내"
          description="시험형 질문이 포함된 폼은 개념 템플릿을 기반으로 자동으로 문제가 생성됩니다."
          type="info"
          showIcon
        />
      )}

      {/* 하단 액션 버튼 */}
      <Card>
        <div className="flex justify-between items-center">
          <Button size="large" onClick={() => router.back()}>
            취소
          </Button>

          <Space>
            <Button
              size="large"
              icon={<SaveOutlined />}
              onClick={() => saveForm(true)}
              loading={saving}
            >
              임시저장
            </Button>
            <Button
              size="large"
              type="primary"
              icon={<SaveOutlined />}
              onClick={() => saveForm(false)}
              loading={saving}
            >
              저장
            </Button>
            <Button
              size="large"
              type="primary"
              icon={<SendOutlined />}
              onClick={() => setSendModalOpen(true)}
              loading={sending}
              disabled={questions.length === 0}
            >
              저장 후 전송
            </Button>
          </Space>
        </div>
      </Card>

      {/* 질문 수정 모달 */}
      <QuestionEditModal />

      {/* 전송 모달 */}
      <SendFormModal
        open={sendModalOpen}
        onCancel={() => setSendModalOpen(false)}
        onConfirm={sendFormHandler}
        formTitle={formData.title}
        loading={sending}
        groupId={groupId}
      />
    </div>
  );
}

// SendFormModal 컴포넌트 (인라인)
function SendFormModal({
  open,
  onCancel,
  onConfirm,
  formTitle,
  loading,
  groupId,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: (targets: SendTarget[]) => void;
  formTitle: string;
  loading: boolean;
  groupId: string;
}) {
  const { user } = useAuth();

  const [targetType, setTargetType] = useState<"individual" | "class">("class");
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [classes, setClasses] = useState<ClassWithDetails[]>([]);
  const [individuals, setIndividuals] = useState<GroupMemberWithDetails[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // 데이터 로드 함수
  const loadData = useCallback(async () => {
    if (!user || !groupId) return;

    try {
      setLoadingData(true);

      const [classesResult, membersResult] = await Promise.all([
        getAllClasses(groupId, user.id),
        getGroupMembers(groupId, user.id),
      ]);

      if (classesResult.success) {
        setClasses(classesResult.data || []);
      }

      if (membersResult.success) {
        setIndividuals(membersResult.data || []);
      }
    } catch (error) {
      console.error("데이터 로드 오류:", error);
    } finally {
      setLoadingData(false);
    }
  }, [user, groupId]);

  // 데이터 로드
  useEffect(() => {
    if (open) {
      loadData();
      setSelectedTargets([]);
      setSearchTerm("");
      setTargetType("class");
    }
  }, [open, groupId, loadData]);

  const getFilteredTargets = () => {
    const term = searchTerm.toLowerCase();

    if (targetType === "class") {
      return classes.filter(
        (cls) =>
          cls.name.toLowerCase().includes(term) || cls.description?.toLowerCase().includes(term)
      );
    } else {
      return individuals.filter(
        (individual) =>
          individual.users?.name.toLowerCase().includes(term) ||
          individual.users?.email.toLowerCase().includes(term)
      );
    }
  };

  const handleTargetChange = (targetIds: string[]) => {
    setSelectedTargets(targetIds);
  };

  const handleConfirm = () => {
    const targets: SendTarget[] = selectedTargets.map((id) => {
      if (targetType === "class") {
        const cls = classes.find((c) => c.id === id);
        return {
          type: "class",
          id,
          name: cls?.name || "알 수 없는 클래스",
        };
      } else {
        const individual = individuals.find((i) => i.users?.id === id);
        return {
          type: "individual",
          id,
          name: individual?.users?.name || "알 수 없는 사용자",
        };
      }
    });

    onConfirm(targets);
  };

  const handleCancel = () => {
    setSelectedTargets([]);
    setSearchTerm("");
    setTargetType("class");
    onCancel();
  };

  const filteredTargets = getFilteredTargets();

  return (
    <Modal
      title={`폼 전송 - ${formTitle}`}
      open={open}
      onCancel={handleCancel}
      width={600}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          취소
        </Button>,
        <Button
          key="confirm"
          type="primary"
          onClick={handleConfirm}
          loading={loading}
          disabled={selectedTargets.length === 0}
        >
          {selectedTargets.length}개 대상에게 전송
        </Button>,
      ]}
    >
      <div className="space-y-4">
        <Card size="small" title="전송 방식 선택">
          <Radio.Group
            value={targetType}
            onChange={(e) => {
              setTargetType(e.target.value);
              setSelectedTargets([]);
            }}
            className="w-full"
          >
            <Row gutter={16}>
              <Col span={12}>
                <Radio value="class" className="w-full">
                  <Space>
                    <TeamOutlined />
                    <div>
                      <div className="font-medium">클래스별 전송</div>
                      <div className="text-xs text-gray-500">클래스 전체에게 일괄 전송</div>
                    </div>
                  </Space>
                </Radio>
              </Col>
              <Col span={12}>
                <Radio value="individual" className="w-full">
                  <Space>
                    <UserOutlined />
                    <div>
                      <div className="font-medium">개별 전송</div>
                      <div className="text-xs text-gray-500">개별 선택하여 전송</div>
                    </div>
                  </Space>
                </Radio>
              </Col>
            </Row>
          </Radio.Group>
        </Card>

        <Input.Search
          placeholder={
            targetType === "class" ? "클래스 이름으로 검색..." : "이름 또는 이메일로 검색..."
          }
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          allowClear
        />

        <Card
          size="small"
          title={
            <Space>
              {targetType === "class" ? <TeamOutlined /> : <UserOutlined />}
              <span>
                {targetType === "class" ? "클래스 목록" : "개별 대상 목록"}({filteredTargets.length}
                개)
              </span>
            </Space>
          }
          className="max-h-80"
          bodyStyle={{ padding: 0, maxHeight: 280, overflowY: "auto" }}
        >
          {loadingData ? (
            <div className="flex justify-center items-center py-8">
              <Spin />
            </div>
          ) : filteredTargets.length > 0 ? (
            <Checkbox.Group
              value={selectedTargets}
              onChange={handleTargetChange}
              className="w-full"
            >
              <div className="space-y-2 p-4">
                {filteredTargets.map((item) => {
                  const isClass = targetType === "class";
                  const id = isClass ? item.id : (item as GroupMemberWithDetails).users?.id;
                  const name = isClass ? item.name : (item as GroupMemberWithDetails).users?.name;

                  return (
                    <div
                      key={id}
                      className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded"
                    >
                      <Checkbox value={id} />
                      <div className="flex-1">
                        <div className="font-medium">{name}</div>
                        {isClass && (
                          <div className="text-sm text-gray-500">
                            {(item as ClassWithDetails).description ||
                              `멤버 ${(item as ClassWithDetails).memberCount || 0}명`}
                          </div>
                        )}
                        {!isClass && (item as GroupMemberWithDetails).users?.email && (
                          <div className="text-sm text-gray-500">
                            {(item as GroupMemberWithDetails).users?.email}
                          </div>
                        )}
                      </div>
                      {isClass && (
                        <Tag color="blue">{(item as ClassWithDetails).memberCount || 0}명</Tag>
                      )}
                    </div>
                  );
                })}
              </div>
            </Checkbox.Group>
          ) : (
            <div className="p-4">
              <Empty
                description={
                  searchTerm
                    ? "검색 결과가 없습니다"
                    : targetType === "class"
                    ? "등록된 클래스가 없습니다"
                    : "그룹 멤버가 없습니다"
                }
              />
            </div>
          )}
        </Card>

        {selectedTargets.length > 0 && (
          <Alert
            message={`${selectedTargets.length}개 대상이 선택되었습니다`}
            description={
              targetType === "class"
                ? "선택된 클래스의 모든 멤버에게 폼이 전송됩니다."
                : "선택된 개별 사용자에게 폼이 전송됩니다."
            }
            type="info"
            showIcon
          />
        )}
      </div>
    </Modal>
  );
}
