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
  Flex,
  Popconfirm,
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
  CheckOutlined,
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
  updateQuestion as updateFormQuestion, // 🔧 다른 이름으로 import
  reorderQuestions,
  sendForm,
  saveFormAsDraft,
  saveFormSupervisionMapping, // 🔧 supervision mapping 함수 추가
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
  getConceptTemplates, // 🔧 개념템플릿 조회 함수 추가
} from "@/lib/forms";
import { getGroupMembers, GroupMemberWithDetails } from "@/lib/groups";
import { getAllClasses, ClassWithDetails } from "@/lib/classes";

const { Title, Text } = Typography;
const { TextArea } = Input;

// 타입 정의
interface QuestionFormData {
  id?: string;
  questionType: "text" | "rating" | "choice" | "exam";
  questionText: string;
  isRequired: boolean;
  orderIndex: number;
  isNew?: boolean;
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
  const { message, modal } = App.useApp();
  const { setPageHeader } = usePageHeader();

  const groupId = params.id as string;
  const editId = searchParams.get("edit");
  const duplicateId = searchParams.get("duplicate");
  const isEditing = !!editId;
  const isDuplicating = !!duplicateId;

  // State
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
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
  const [expandedQuestionIndex, setExpandedQuestionIndex] = useState<number | null>(null);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [teachers, setTeachers] = useState<GroupMemberWithDetails[]>([]);
  const [conceptTemplates, setConceptTemplates] = useState<ConceptTemplateWithItems[]>([]); // 🔧 개념템플릿 상태 추가
  const [currentFormId, setCurrentFormId] = useState<string | null>(null);

  // 🔧 DragDropContext를 위한 reorder 함수
  const reorderQuestions = (
    list: QuestionFormData[],
    startIndex: number,
    endIndex: number
  ): QuestionFormData[] => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);

    // orderIndex 재정렬
    return result.map((item, index) => ({
      ...item,
      orderIndex: index,
    }));
  };

  // 🔧 드래그 앤 드롭 핸들러
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }

    const reorderedQuestions = reorderQuestions(
      questions,
      result.source.index,
      result.destination.index
    );

    setQuestions(reorderedQuestions);
  };

  // 페이지 헤더 설정
  useEffect(() => {
    const title = isEditing ? "폼 수정" : isDuplicating ? "폼 복제" : "새 폼 생성";
    const subtitle = isEditing
      ? "기존 폼을 수정합니다"
      : isDuplicating
      ? "기존 폼을 복제하여 새로운 폼을 생성합니다"
      : "새로운 폼을 생성합니다";

    setPageHeader({
      title,
      subtitle,
      backUrl: `/groups/${groupId}/forms`,
    });

    return () => setPageHeader(null);
  }, [setPageHeader, groupId, isEditing, isDuplicating]);

  // 🔧 개념템플릿 로드
  const loadConceptTemplates = useCallback(async () => {
    try {
      const result = await getConceptTemplates(groupId);
      if (result.success && result.data) {
        setConceptTemplates(result.data);
      }
    } catch (error) {
      console.error("개념템플릿 로드 오류:", error);
    }
  }, [groupId]);

  // 그룹 멤버 로드
  const loadGroupMembers = useCallback(async () => {
    try {
      const result = await getGroupMembers(groupId, user?.id || "");
      if (result.success && result.data) {
        setTeachers(result.data);
      }
    } catch (error) {
      console.error("그룹 멤버 로드 오류:", error);
    }
  }, [groupId, user?.id]);

  // 폼 데이터 로드 (수정/복제 시)
  const loadFormData = useCallback(async () => {
    if (!editId && !duplicateId) return;

    const targetId = editId || duplicateId;
    if (!targetId) return;

    try {
      setLoading(true);
      const result = await getFormDetails(targetId);

      if (result.success && result.data) {
        const formDetail = result.data;

        setFormData({
          title: isDuplicating ? `${formDetail.title} [복사본]` : formDetail.title,
          description: formDetail.description || "",
          timeTeacherId: formDetail.timeTeacher?.id,
          teacherId: formDetail.teacher?.id,
        });

        setCurrentFormId(isEditing ? formDetail.id : null);

        // 질문 데이터 변환
        const questionsData: QuestionFormData[] = (formDetail.questions || []).map((q) => {
          const baseQuestion: QuestionFormData = {
            id: isDuplicating ? undefined : q.id,
            questionType: q.question_type as QuestionFormData["questionType"],
            questionText: q.question_text,
            isRequired: q.is_required ?? true,
            orderIndex: q.order_index,
            isNew: isDuplicating,
          };

          // 타입별 추가 정보
          if (q.question_type === "text" && q.textDetails) {
            baseQuestion.textSubtype = q.textDetails.subtype as "text" | "textarea";
            baseQuestion.textMaxLength = q.textDetails.maxLength;
          } else if (q.question_type === "rating" && q.ratingDetails) {
            baseQuestion.ratingMax = q.ratingDetails.rating_max;
            baseQuestion.ratingStep = q.ratingDetails.rating_step;
          } else if (q.question_type === "choice" && q.choiceDetails) {
            baseQuestion.choiceOptions =
              q.choiceDetails.options?.map((opt) => opt.option_text) || [];
            baseQuestion.choiceMultiple = q.choiceDetails.is_multiple ?? false;
            baseQuestion.choiceAllowOther = q.choiceDetails.etc_option_enabled ?? false;
          } else if (q.question_type === "exam" && q.examDetails) {
            baseQuestion.examTotalQuestions = q.examDetails.total_questions;
            baseQuestion.examConceptTemplateId = q.examDetails.concept_template_id || undefined;
            baseQuestion.examUseExisting = !!q.examDetails.concept_template_id;
          }

          return baseQuestion;
        });

        setQuestions(questionsData);

        // 폼 필드 설정
        form.setFieldsValue({
          title: isDuplicating ? `${formDetail.title} [복사본]` : formDetail.title,
          description: formDetail.description || "",
          timeTeacherId: formDetail.timeTeacher?.id,
          teacherId: formDetail.teacher?.id,
        });
      }
    } catch (error) {
      console.error("폼 데이터 로드 오류:", error);
      message.error("폼 데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [editId, duplicateId, isEditing, isDuplicating, form, message]);

  // 초기 데이터 로드
  useEffect(() => {
    loadGroupMembers();
    loadConceptTemplates(); // 🔧 개념템플릿 로드 추가
    loadFormData();
  }, [loadGroupMembers, loadConceptTemplates, loadFormData]);

  // 질문 추가
  const addQuestion = (type: QuestionFormData["questionType"]) => {
    const newQuestion: QuestionFormData = {
      questionType: type,
      questionText: "",
      isRequired: true,
      orderIndex: questions.length,
      isNew: true,
    };

    // 타입별 기본값 설정
    if (type === "text") {
      newQuestion.textSubtype = "text";
      newQuestion.textMaxLength = 100;
    } else if (type === "rating") {
      newQuestion.ratingMax = 5;
      newQuestion.ratingStep = 1;
    } else if (type === "choice") {
      newQuestion.choiceOptions = [""];
      newQuestion.choiceMultiple = false;
      newQuestion.choiceAllowOther = false;
    } else if (type === "exam") {
      newQuestion.examTotalQuestions = 10;
      newQuestion.examUseExisting = false;
      newQuestion.examNewTemplateName = "";
      newQuestion.examConceptItems = [];
    }

    setQuestions([...questions, newQuestion]);
    setExpandedQuestionIndex(questions.length);
  };

  // 질문 삭제
  const deleteQuestion = (index: number) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    // orderIndex 재정렬
    const reorderedQuestions = newQuestions.map((q, i) => ({ ...q, orderIndex: i }));
    setQuestions(reorderedQuestions);

    if (expandedQuestionIndex === index) {
      setExpandedQuestionIndex(null);
    } else if (expandedQuestionIndex !== null && expandedQuestionIndex > index) {
      setExpandedQuestionIndex(expandedQuestionIndex - 1);
    }
  };

  // 질문 업데이트
  const updateQuestion = (index: number, updates: Partial<QuestionFormData>) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...updates } : q)));
  };

  // 🔧 폼 저장 (supervision_mappings 활용)
  const handleSave = async (asDraft = true) => {
    try {
      setSaving(true);

      const values = await form.validateFields();

      if (questions.length === 0) {
        message.warning("최소 하나 이상의 질문을 추가해주세요.");
        return;
      }

      // 폼 생성/업데이트
      let formId = currentFormId;

      if (isEditing && currentFormId) {
        // 기존 폼 업데이트
        const updateRequest: UpdateFormRequest = {
          title: values.title,
          description: values.description,
          status: asDraft ? "draft" : "draft",
        };

        const result = await updateForm(currentFormId, updateRequest);
        if (!result.success) {
          throw new Error(result.error);
        }
      } else {
        // 새 폼 생성
        const createRequest: CreateFormRequest = {
          title: values.title,
          description: values.description,
          groupId,
          creatorId: user!.id,
          status: asDraft ? "draft" : "draft",
        };

        const result = await createForm(createRequest);
        if (!result.success) {
          throw new Error(result.error);
        }

        formId = result.data!;
        setCurrentFormId(formId);
      }

      // 🔧 supervision_mappings에 담당자 정보 저장
      if (formId && (values.timeTeacherId || values.teacherId)) {
        try {
          const supervisionResult = await saveFormSupervisionMapping(
            formId,
            groupId,
            values.timeTeacherId,
            values.teacherId
          );

          if (!supervisionResult.success) {
            console.error("Supervision mapping 저장 실패:", supervisionResult.error);
            message.warning("담당자 정보 저장 중 오류가 발생했습니다.");
          }
        } catch (supervisionError) {
          console.error("Supervision mapping 오류:", supervisionError);
          message.warning("담당자 정보 저장 중 오류가 발생했습니다.");
        }
      }

      // 질문 저장/업데이트
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];

        // 🔧 시험형 질문의 개념 템플릿 먼저 생성
        if (
          question.questionType === "exam" &&
          !question.examUseExisting &&
          question.examNewTemplateName
        ) {
          const conceptRequest: CreateConceptTemplateRequest = {
            name: question.examNewTemplateName,
            groupId,
            creatorId: user!.id,
            conceptCount: Number(question.examTotalQuestions) || 10, // number로 변환
            status: "published",
            conceptItems: (question.examConceptItems || [])
              .filter((item) => item.text.trim())
              .map((item, index) => ({
                conceptText: item.text,
                conceptDescription: item.description || "",
                orderIndex: index,
              })),
          };

          const templateResult = await createConceptTemplate(conceptRequest);
          if (templateResult.success) {
            question.examConceptTemplateId = templateResult.data!;
            question.examUseExisting = true; // 생성 후 기존 템플릿 사용으로 변경
          }
        }

        if (question.id && !question.isNew) {
          // 기존 질문 업데이트
          const updateRequest: UpdateQuestionRequest = {
            questionText: question.questionText,
            isRequired: question.isRequired,
            orderIndex: Number(question.orderIndex), // number로 변환
          };

          // 타입별 추가 정보
          if (question.questionType === "text") {
            updateRequest.textConfig = {
              subtype: question.textSubtype || "text",
              maxLength: question.textMaxLength || 100,
            };
          } else if (question.questionType === "rating") {
            updateRequest.ratingConfig = {
              ratingMax: question.ratingMax || 5,
              ratingStep: question.ratingStep || 1,
            };
          } else if (question.questionType === "choice") {
            updateRequest.choiceConfig = {
              options: question.choiceOptions || [],
              multiple: question.choiceMultiple || false,
              allowOther: question.choiceAllowOther || false,
            };
          } else if (question.questionType === "exam") {
            updateRequest.examConfig = {
              totalQuestions: question.examTotalQuestions || 10,
              conceptTemplateId: question.examConceptTemplateId,
            };
          }

          await updateFormQuestion(question.id, updateRequest);
        } else {
          // 새 질문 생성
          const createRequest: CreateQuestionRequest = {
            questionType: question.questionType,
            questionText: question.questionText,
            isRequired: question.isRequired,
            orderIndex: Number(question.orderIndex), // number로 변환
          };

          // 타입별 추가 정보
          if (question.questionType === "text") {
            createRequest.textConfig = {
              subtype: question.textSubtype || "text",
              maxLength: question.textMaxLength || 100,
            };
          } else if (question.questionType === "rating") {
            createRequest.ratingConfig = {
              ratingMax: question.ratingMax || 5,
              ratingStep: question.ratingStep || 1,
            };
          } else if (question.questionType === "choice") {
            createRequest.choiceConfig = {
              options: question.choiceOptions || [],
              multiple: question.choiceMultiple || false,
              allowOther: question.choiceAllowOther || false,
            };
          } else if (question.questionType === "exam") {
            createRequest.examConfig = {
              totalQuestions: question.examTotalQuestions || 10,
              conceptTemplateId: question.examConceptTemplateId,
            };
          }

          const result = await createQuestion({
            ...createRequest,
            formId: formId!,
          });
          if (result.success) {
            // 생성된 질문 ID로 업데이트
            setQuestions((prev) =>
              prev.map((q, index) => (index === i ? { ...q, id: result.data!, isNew: false } : q))
            );
          }
        }
      }

      message.success(asDraft ? "임시저장되었습니다." : "폼이 저장되었습니다.");

      // 개념템플릿 목록 새로고침
      loadConceptTemplates();
    } catch (error) {
      console.error("폼 저장 오류:", error);
      message.error("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  // 폼 전송
  const handleSend = () => {
    setSendModalOpen(true);
  };

  // 질문 렌더링
  const renderQuestion = (question: QuestionFormData, index: number) => {
    const isExpanded = expandedQuestionIndex === index;

    return (
      <Draggable key={`question-${index}`} draggableId={`question-${index}`} index={index}>
        {(provided, snapshot) => (
          <Card
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={`mb-4 ${snapshot.isDragging ? "shadow-lg" : ""}`}
            title={
              <div className="flex items-center justify-between">
                <Space>
                  <div {...provided.dragHandleProps}>
                    <DragOutlined className="cursor-move text-gray-400" />
                  </div>
                  <Badge count={index + 1} color="blue" />
                  <Text strong>{question.questionText || "새 질문"}</Text>
                  {question.questionType === "text" && (
                    <FileTextOutlined className="text-blue-500" />
                  )}
                  {question.questionType === "rating" && (
                    <StarOutlined className="text-yellow-500" />
                  )}
                  {question.questionType === "choice" && (
                    <CheckSquareOutlined className="text-green-500" />
                  )}
                  {question.questionType === "exam" && <FormOutlined className="text-purple-500" />}
                </Space>
                <Space>
                  <Button
                    type="text"
                    icon={isExpanded ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                    onClick={() => setExpandedQuestionIndex(isExpanded ? null : index)}
                  />
                  <Popconfirm
                    title="질문을 삭제하시겠습니까?"
                    onConfirm={() => deleteQuestion(index)}
                    okText="삭제"
                    cancelText="취소"
                  >
                    <Button type="text" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              </div>
            }
          >
            {isExpanded && (
              <div className="space-y-4">
                <Row gutter={16}>
                  <Col span={16}>
                    <Input
                      placeholder="질문을 입력하세요"
                      value={question.questionText}
                      onChange={(e) => updateQuestion(index, { questionText: e.target.value })}
                    />
                  </Col>
                  <Col span={8}>
                    <Switch
                      checked={question.isRequired}
                      onChange={(checked) => updateQuestion(index, { isRequired: checked })}
                      checkedChildren="필수"
                      unCheckedChildren="선택"
                    />
                  </Col>
                </Row>

                {/* 타입별 세부 설정 */}
                {question.questionType === "text" && (
                  <div className="space-y-3">
                    <Radio.Group
                      value={question.textSubtype}
                      onChange={(e) => updateQuestion(index, { textSubtype: e.target.value })}
                    >
                      <Radio value="text">단답형</Radio>
                      <Radio value="textarea">서술형</Radio>
                    </Radio.Group>
                    <InputNumber
                      min={1}
                      max={1000}
                      value={question.textMaxLength}
                      onChange={(value) => updateQuestion(index, { textMaxLength: value || 100 })}
                      addonBefore="최대 글자수"
                    />
                  </div>
                )}

                {question.questionType === "rating" && (
                  <div className="space-y-3">
                    <Row gutter={16}>
                      <Col span={12}>
                        <InputNumber
                          min={3}
                          max={10}
                          value={question.ratingMax}
                          onChange={(value) => updateQuestion(index, { ratingMax: value || 5 })}
                          addonBefore="최대 점수"
                        />
                      </Col>
                      <Col span={12}>
                        <InputNumber
                          min={0.5}
                          max={2}
                          step={0.5}
                          value={question.ratingStep}
                          onChange={(value) => updateQuestion(index, { ratingStep: value || 1 })}
                          addonBefore="단계"
                        />
                      </Col>
                    </Row>
                  </div>
                )}

                {question.questionType === "choice" && (
                  <div className="space-y-3">
                    <Switch
                      checked={question.choiceMultiple}
                      onChange={(checked) => updateQuestion(index, { choiceMultiple: checked })}
                      checkedChildren="다중선택"
                      unCheckedChildren="단일선택"
                    />
                    <Switch
                      checked={question.choiceAllowOther}
                      onChange={(checked) => updateQuestion(index, { choiceAllowOther: checked })}
                      checkedChildren="기타 옵션 허용"
                      unCheckedChildren="기타 옵션 비허용"
                    />
                    <div>
                      <Text strong>선택지:</Text>
                      {(question.choiceOptions || []).map((option, optionIndex) => (
                        <div key={optionIndex} className="flex gap-2 mt-2">
                          <Input
                            placeholder={`선택지 ${optionIndex + 1}`}
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...(question.choiceOptions || [])];
                              newOptions[optionIndex] = e.target.value;
                              updateQuestion(index, { choiceOptions: newOptions });
                            }}
                          />
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => {
                              const newOptions = (question.choiceOptions || []).filter(
                                (_, i) => i !== optionIndex
                              );
                              updateQuestion(index, { choiceOptions: newOptions });
                            }}
                          />
                        </div>
                      ))}
                      <Button
                        type="dashed"
                        icon={<PlusOutlined />}
                        onClick={() => {
                          const newOptions = [...(question.choiceOptions || []), ""];
                          updateQuestion(index, { choiceOptions: newOptions });
                        }}
                        className="mt-2"
                      >
                        선택지 추가
                      </Button>
                    </div>
                  </div>
                )}

                {question.questionType === "exam" && (
                  <div className="space-y-3">
                    <InputNumber
                      min={1}
                      max={50}
                      value={question.examTotalQuestions}
                      onChange={(value) =>
                        updateQuestion(index, { examTotalQuestions: value || 10 })
                      }
                      addonBefore="문제 수"
                    />

                    <Radio.Group
                      value={question.examUseExisting}
                      onChange={(e) => updateQuestion(index, { examUseExisting: e.target.value })}
                    >
                      <Radio value={true}>기존 개념템플릿 사용</Radio>
                      <Radio value={false}>새 개념템플릿 생성</Radio>
                    </Radio.Group>

                    {question.examUseExisting ? (
                      <Select
                        placeholder="개념템플릿을 선택하세요"
                        value={question.examConceptTemplateId}
                        onChange={(value) =>
                          updateQuestion(index, { examConceptTemplateId: value })
                        }
                        className="w-full"
                      >
                        {conceptTemplates.map((template) => (
                          <Select.Option key={template.id} value={template.id}>
                            {template.name} ({template.concept_count || 0}개 개념)
                          </Select.Option>
                        ))}
                      </Select>
                    ) : (
                      <div className="space-y-3">
                        <Input
                          placeholder="새 템플릿 이름"
                          value={question.examNewTemplateName}
                          onChange={(e) =>
                            updateQuestion(index, { examNewTemplateName: e.target.value })
                          }
                        />
                        <div>
                          <Text strong>개념 항목들:</Text>
                          {(question.examConceptItems || []).map((item, itemIndex) => (
                            <div key={itemIndex} className="flex gap-2 mt-2">
                              <Input
                                placeholder={`개념 ${itemIndex + 1}`}
                                value={item.text}
                                onChange={(e) => {
                                  const newItems = [...(question.examConceptItems || [])];
                                  newItems[itemIndex] = {
                                    ...newItems[itemIndex],
                                    text: e.target.value,
                                  };
                                  updateQuestion(index, { examConceptItems: newItems });
                                }}
                              />
                              <Input
                                placeholder="설명 (선택사항)"
                                value={item.description || ""}
                                onChange={(e) => {
                                  const newItems = [...(question.examConceptItems || [])];
                                  newItems[itemIndex] = {
                                    ...newItems[itemIndex],
                                    description: e.target.value,
                                  };
                                  updateQuestion(index, { examConceptItems: newItems });
                                }}
                              />
                              <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => {
                                  const newItems = (question.examConceptItems || []).filter(
                                    (_, i) => i !== itemIndex
                                  );
                                  updateQuestion(index, { examConceptItems: newItems });
                                }}
                              />
                            </div>
                          ))}
                          <Button
                            type="dashed"
                            icon={<PlusOutlined />}
                            onClick={() => {
                              const newItems = [
                                ...(question.examConceptItems || []),
                                { text: "", description: "" },
                              ];
                              updateQuestion(index, { examConceptItems: newItems });
                            }}
                            className="mt-2"
                          >
                            개념 추가
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>
        )}
      </Draggable>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Form
        form={form}
        layout="vertical"
        initialValues={formData}
        onValuesChange={(changedValues) => {
          setFormData((prev) => ({ ...prev, ...changedValues }));
        }}
      >
        {/* 기본 정보 섹션 */}
        <Card title="기본 정보" className="mb-6">
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="title"
                label="폼 제목"
                rules={[{ required: true, message: "폼 제목을 입력해주세요" }]}
              >
                <Input placeholder="폼 제목을 입력하세요" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="description" label="폼 설명">
                <TextArea rows={3} placeholder="폼에 대한 설명을 입력하세요" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 담당자 배정 섹션 */}
        <Card title="담당자 배정" className="mb-6">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="timeTeacherId" label="시간강사">
                <Select placeholder="시간강사를 선택하세요" allowClear>
                  {teachers.map((teacher) => (
                    <Select.Option key={teacher.users.id} value={teacher.users.id}>
                      {teacher.users.name} ({teacher.users.nickname})
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="teacherId" label="선생님">
                <Select placeholder="선생님을 선택하세요" allowClear>
                  {teachers.map((teacher) => (
                    <Select.Option key={teacher.users.id} value={teacher.users.id}>
                      {teacher.users.name} ({teacher.users.nickname})
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 질문 섹션 */}
        <Card
          title="질문"
          extra={
            <Dropdown
              menu={{
                items: [
                  {
                    key: "text",
                    label: "텍스트 질문",
                    icon: <FileTextOutlined />,
                    onClick: () => addQuestion("text"),
                  },
                  {
                    key: "rating",
                    label: "별점 질문",
                    icon: <StarOutlined />,
                    onClick: () => addQuestion("rating"),
                  },
                  {
                    key: "choice",
                    label: "객관식 질문",
                    icon: <CheckSquareOutlined />,
                    onClick: () => addQuestion("choice"),
                  },
                  {
                    key: "exam",
                    label: "시험 질문",
                    icon: <FormOutlined />,
                    onClick: () => addQuestion("exam"),
                  },
                ],
              }}
              placement="bottomRight"
            >
              <Button type="primary" icon={<PlusOutlined />}>
                질문 추가
              </Button>
            </Dropdown>
          }
          className="mb-6"
        >
          {questions.length === 0 ? (
            <Empty description="질문을 추가해주세요" />
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="questions">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef}>
                    {questions.map((question, index) => renderQuestion(question, index))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </Card>

        {/* 액션 버튼 */}
        <div className="flex justify-between">
          <Button onClick={() => router.push(`/groups/${groupId}/forms`)}>취소</Button>
          <Space>
            <Button icon={<SaveOutlined />} loading={saving} onClick={() => handleSave(true)}>
              임시저장
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={() => handleSave(false)}
            >
              저장
            </Button>
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={sending}
              onClick={handleSend}
              disabled={!currentFormId}
            >
              전송
            </Button>
          </Space>
        </div>
      </Form>
    </div>
  );
}
