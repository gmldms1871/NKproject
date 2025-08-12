"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  message,
  Dropdown,
  Tooltip,
  Alert,
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

import { useAuth } from "@/contexts/auth-context";
import { usePageHeader } from "@/contexts/page-header-context";
import {
  createForm,
  updateForm,
  getFormDetails,
  getFormDetailsWithSupervision,
  duplicateForm,
  createQuestion,
  updateQuestion as updateFormQuestion,
  reorderFormQuestions,
  sendFormWithSupervision,
  saveFormAsDraft,
  saveFormSupervisionMapping,
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
  getConceptTemplates,
} from "@/lib/forms";
import { getGroupMembers, GroupMemberWithDetails } from "@/lib/groups";
import { getAllClasses, ClassWithDetails } from "@/lib/classes";
import { createReport } from "@/lib/reports";
import { supabaseAdmin } from "@/lib/supabase";

const { Title, Text } = Typography;
const { TextArea } = Input;

// 드래그 가능한 질문 컴포넌트
interface SortableQuestionProps {
  question: QuestionFormData;
  index: number;
  isExpanded: boolean;
  formStatus: string | null;
  conceptTemplates: ConceptTemplateWithItems[];
  onUpdateQuestion: (index: number, updates: Partial<QuestionFormData>) => void;
  onDeleteQuestion: (index: number) => void;
  onToggleExpand: (index: number) => void;
}

const SortableQuestion = ({
  question,
  index,
  isExpanded,
  formStatus,
  conceptTemplates,
  onUpdateQuestion,
  onDeleteQuestion,
  onToggleExpand,
}: SortableQuestionProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `question-${index}`,
    animateLayoutChanges: () => false,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? "none" : transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1000 : 1,
    position: isDragging ? ("relative" as const) : ("static" as const),
    pointerEvents: isDragging ? ("none" as const) : ("auto" as const),
    transformOrigin: "0 0",
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-4">
      <Card
        className="mb-4"
        style={{
          transform: isDragging ? "rotate(2deg)" : "none",
          transition: isDragging ? "none" : "all 0.2s ease",
        }}
        title={
          <div className="flex items-center justify-between">
            <Space>
              <Badge count={index + 1} style={{ backgroundColor: "#1890ff" }} />
              <Text strong>{question.questionText || "새 질문"}</Text>
              {question.questionType === "text" && <FileTextOutlined className="text-blue-500" />}
              {question.questionType === "rating" && <StarOutlined className="text-yellow-500" />}
              {question.questionType === "choice" && (
                <CheckSquareOutlined className="text-green-500" />
              )}
              {question.questionType === "exam" && <FormOutlined className="text-purple-500" />}
            </Space>
            <Space>
              <Button
                type="text"
                icon={isExpanded ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                onClick={() => onToggleExpand(index)}
              />
              <Popconfirm
                title="질문을 삭제하시겠습니까?"
                onConfirm={() => onDeleteQuestion(index)}
                okText="삭제"
                cancelText="취소"
              >
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Popconfirm>
              <div
                {...attributes}
                {...listeners}
                style={{
                  cursor: "grab",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  border: "1px solid #d9d9d9",
                  backgroundColor: "#fafafa",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                title="드래그하여 순서 변경"
              >
                <DragOutlined />
              </div>
            </Space>
          </div>
        }
      >
        {isExpanded && (
          <div className="space-y-4">
            {formStatus === "send" && (
              <Alert message="전송된 폼의 질문은 수정할 수 없습니다" type="warning" showIcon />
            )}
            <Row gutter={16}>
              <Col span={16}>
                <Input
                  placeholder="질문을 입력하세요"
                  value={question.questionText}
                  onChange={(e) => onUpdateQuestion(index, { questionText: e.target.value })}
                  disabled={formStatus === "send"}
                />
              </Col>
              <Col span={8}>
                <Switch
                  checked={question.isRequired}
                  onChange={(checked) => onUpdateQuestion(index, { isRequired: checked })}
                  checkedChildren="필수"
                  unCheckedChildren="선택"
                  disabled={formStatus === "send"}
                />
              </Col>
            </Row>

            {/* 타입별 세부 설정 */}
            {question.questionType === "text" && (
              <div className="space-y-3">
                <Radio.Group
                  value={question.textSubtype}
                  onChange={(e) => onUpdateQuestion(index, { textSubtype: e.target.value })}
                  disabled={formStatus === "send"}
                >
                  <Radio value="text">단답형</Radio>
                  <Radio value="textarea">서술형</Radio>
                </Radio.Group>
                <InputNumber
                  min={1}
                  max={1000}
                  value={question.textMaxLength}
                  onChange={(value) => onUpdateQuestion(index, { textMaxLength: value || 100 })}
                  addonBefore="최대 글자수"
                  style={{ width: 200 }}
                  disabled={formStatus === "send"}
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
                      onChange={(value) => onUpdateQuestion(index, { ratingMax: value || 5 })}
                      addonBefore="최대 점수"
                      style={{ width: "100%" }}
                    />
                  </Col>
                  <Col span={12}>
                    <InputNumber
                      min={1}
                      max={5}
                      step={1}
                      value={question.ratingStep}
                      onChange={(value) => onUpdateQuestion(index, { ratingStep: value || 1 })}
                      addonBefore="단계"
                      style={{ width: "100%" }}
                    />
                  </Col>
                </Row>
              </div>
            )}

            {question.questionType === "choice" && (
              <div className="space-y-3">
                <Space>
                  <Switch
                    checked={question.choiceMultiple}
                    onChange={(checked) => onUpdateQuestion(index, { choiceMultiple: checked })}
                    checkedChildren="다중선택"
                    unCheckedChildren="단일선택"
                  />
                  <Switch
                    checked={question.choiceAllowOther}
                    onChange={(checked) => onUpdateQuestion(index, { choiceAllowOther: checked })}
                    checkedChildren="기타 옵션 허용"
                    unCheckedChildren="기타 옵션 비허용"
                  />
                </Space>
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
                          onUpdateQuestion(index, { choiceOptions: newOptions });
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
                          onUpdateQuestion(index, { choiceOptions: newOptions });
                        }}
                      />
                    </div>
                  ))}
                  <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      const newOptions = [...(question.choiceOptions || []), ""];
                      onUpdateQuestion(index, { choiceOptions: newOptions });
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
                  onChange={(value) => onUpdateQuestion(index, { examTotalQuestions: value || 10 })}
                  addonBefore="문제 수"
                  style={{ width: 200 }}
                />

                <Radio.Group
                  value={question.examUseExisting}
                  onChange={(e) => onUpdateQuestion(index, { examUseExisting: e.target.value })}
                >
                  <Radio value={true}>기존 개념템플릿 사용</Radio>
                  <Radio value={false}>새 개념템플릿 생성</Radio>
                </Radio.Group>

                {question.examUseExisting ? (
                  <Select
                    placeholder="개념템플릿을 선택하세요"
                    value={question.examConceptTemplateId}
                    onChange={(value) => onUpdateQuestion(index, { examConceptTemplateId: value })}
                    style={{ width: "100%" }}
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
                        onUpdateQuestion(index, { examNewTemplateName: e.target.value })
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
                              onUpdateQuestion(index, { examConceptItems: newItems });
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
                              onUpdateQuestion(index, { examConceptItems: newItems });
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
                              onUpdateQuestion(index, { examConceptItems: newItems });
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
                          onUpdateQuestion(index, { examConceptItems: newItems });
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
    </div>
  );
};

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
  const [conceptTemplates, setConceptTemplates] = useState<ConceptTemplateWithItems[]>([]);
  const [currentFormId, setCurrentFormId] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassWithDetails[]>([]);
  const [sendTargets, setSendTargets] = useState<Array<{ type: "class" | "user"; id: string }>>([]);
  const [formStatus, setFormStatus] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  // 드래그 앤 드롭 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 드래그 시작 핸들러
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // 드래그 오버 핸들러 (시각적 피드백만 제공)
  const handleDragOver = (event: DragOverEvent) => {
    // 실시간 순서 변경은 제거하고 시각적 피드백만 제공
    // 실제 순서 변경은 handleDragEnd에서 처리
  };

  // 드래그 종료 핸들러
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (active.id !== over?.id && over) {
      const oldIndex = parseInt(active.id.toString().replace("question-", ""));
      const newIndex = parseInt(over.id.toString().replace("question-", ""));

      if (!isNaN(oldIndex) && !isNaN(newIndex) && oldIndex !== newIndex) {
        setQuestions((prevQuestions) => {
          const reorderedQuestions = arrayMove(prevQuestions, oldIndex, newIndex);
          return reorderedQuestions.map((item, index) => ({
            ...item,
            orderIndex: index,
          }));
        });
        console.log(`Question moved from index ${oldIndex} to ${newIndex}`);
      }
    }
  };

  // 질문 순서 조정 핸들러 (버튼용)
  const moveQuestion = (fromIndex: number, toIndex: number) => {
    if (
      fromIndex < 0 ||
      fromIndex >= questions.length ||
      toIndex < 0 ||
      toIndex >= questions.length
    ) {
      return;
    }

    const reorderedQuestions = Array.from(questions);
    const [removed] = reorderedQuestions.splice(fromIndex, 1);
    reorderedQuestions.splice(toIndex, 0, removed);

    // orderIndex 재정렬
    const updatedQuestions = reorderedQuestions.map((item, index) => ({
      ...item,
      orderIndex: index,
    }));

    setQuestions(updatedQuestions);
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

  // 개념템플릿 로드
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

  // 클래스 로드
  const loadClasses = useCallback(async () => {
    try {
      const result = await getAllClasses(groupId, user?.id || "");
      if (result.success && result.data) {
        setClasses(result.data);
      }
    } catch (error) {
      console.error("클래스 로드 오류:", error);
    }
  }, [groupId, user?.id]);

  // 폼 데이터 로드 (수정/복제 시)
  const loadFormData = useCallback(async () => {
    if (!editId && !duplicateId) return;

    const targetId = editId || duplicateId;
    if (!targetId) return;

    try {
      setLoading(true);

      // supervision 정보가 포함된 폼 상세 정보 조회
      const result = await getFormDetailsWithSupervision(targetId);

      if (result.success && result.data) {
        const formDetail = result.data;

        // 담당자 정보 추출
        const timeTeacherId = formDetail.supervisionInfo?.timeTeacher?.id;
        const teacherId = formDetail.supervisionInfo?.teacher?.id;

        setFormData({
          title: isDuplicating ? `${formDetail.title} [복사본]` : formDetail.title,
          description: formDetail.description || "",
          timeTeacherId,
          teacherId,
        });

        setCurrentFormId(isEditing ? formDetail.id : null);
        setFormStatus(formDetail.status);

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

            // 개념템플릿이 있으면 로드
            if (q.examDetails.conceptTemplate) {
              baseQuestion.examConceptItems = q.examDetails.conceptTemplate.conceptItems.map(
                (item) => ({
                  text: item.concept_text,
                  description: item.concept_description || "",
                })
              );
            }
          }

          return baseQuestion;
        });

        setQuestions(questionsData);

        // 폼 필드 설정
        form.setFieldsValue({
          title: isDuplicating ? `${formDetail.title} [복사본]` : formDetail.title,
          description: formDetail.description || "",
          timeTeacherId,
          teacherId,
        });
      }
    } catch (error) {
      console.error("폼 데이터 로드 오류:", error);
      message.error("폼 데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [editId, duplicateId, isEditing, isDuplicating, form]);

  // 초기 데이터 로드
  useEffect(() => {
    loadGroupMembers();
    loadConceptTemplates();
    loadClasses();
    loadFormData();
  }, [loadGroupMembers, loadConceptTemplates, loadClasses, loadFormData]);

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

  // 폼 저장
  const handleSave = async (asDraft = true) => {
    try {
      setSaving(true);

      // send 상태인 폼은 수정 불가
      if (formStatus === "send") {
        message.error("전송된 폼은 수정할 수 없습니다.");
        return;
      }

      const values = await form.validateFields();

      if (questions.length === 0) {
        message.warning("최소 하나 이상의 질문을 추가해주세요.");
        return;
      }

      let formId = currentFormId;

      // 1. 폼 생성/업데이트
      if (isEditing && currentFormId) {
        const updateRequest: UpdateFormRequest = {
          title: values.title,
          description: values.description,
          status: asDraft ? "draft" : "save",
        };

        const result = await updateForm(currentFormId, updateRequest);
        if (!result.success) {
          throw new Error(result.error);
        }
      } else {
        const createRequest: CreateFormRequest = {
          title: values.title,
          description: values.description,
          groupId,
          creatorId: user!.id,
          status: asDraft ? "draft" : "save",
        };

        const result = await createForm(createRequest);
        if (!result.success) {
          throw new Error(result.error);
        }

        formId = result.data!;
        setCurrentFormId(formId);
      }

      // 2. supervision_mappings에 담당자 정보 저장
      let supervisionId = "";
      if (formId && (values.timeTeacherId || values.teacherId)) {
        const supervisionResult = await saveFormSupervisionMapping(
          formId,
          groupId,
          values.timeTeacherId,
          values.teacherId
        );

        if (!supervisionResult.success) {
          console.error("Supervision mapping 저장 실패:", supervisionResult.error);
        } else {
          // supervision ID를 직접 조회
          const { data: supervision } = await supabaseAdmin
            .from("supervision_mappings")
            .select("id")
            .eq("group_id", groupId)
            .eq("time_teacher_id", values.timeTeacherId || "")
            .eq("teacher_id", values.teacherId || "")
            .single();

          if (supervision) {
            supervisionId = supervision.id;
          }
        }
      }

      // 3. 새 폼 생성 시 보고서도 생성
      if (!isEditing && formId) {
        const reportResult = await createReport({
          formId,
          formResponseId: "",
          studentName: "",
          className: "",
          timeTeacherId: values.timeTeacherId,
          teacherId: values.teacherId,
          supervisionId,
        });

        if (!reportResult.success) {
          console.error("보고서 생성 실패:", reportResult.error);
        }
      }

      // 3. 질문 저장/업데이트
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];

        // 시험형 질문의 새 개념 템플릿 생성
        if (
          question.questionType === "exam" &&
          !question.examUseExisting &&
          question.examNewTemplateName &&
          question.examConceptItems &&
          question.examConceptItems.length > 0
        ) {
          const conceptRequest: CreateConceptTemplateRequest = {
            name: question.examNewTemplateName,
            groupId,
            creatorId: user!.id,
            conceptCount: question.examTotalQuestions || 10,
            status: "completed",
            conceptItems: question.examConceptItems
              .filter((item) => item.text.trim())
              .map((item, index) => ({
                conceptText: item.text,
                conceptDescription: item.description || "",
                orderIndex: index,
              })),
          };

          const templateResult = await createConceptTemplate(conceptRequest);
          if (templateResult.success && templateResult.data) {
            question.examConceptTemplateId = templateResult.data;
            question.examUseExisting = true;
          }
        }

        if (question.id && !question.isNew) {
          // 기존 질문 업데이트
          const updateRequest: UpdateQuestionRequest = {
            questionText: question.questionText,
            isRequired: question.isRequired,
            orderIndex: question.orderIndex,
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
            orderIndex: question.orderIndex,
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

          if (result.success && result.data) {
            questions[i].id = result.data;
            questions[i].isNew = false;
          }
        }
      }

      // 질문 순서가 변경된 경우 순서 업데이트
      if (questions.some((q, index) => q.orderIndex !== index)) {
        const reorderRequest: ReorderQuestionsRequest = {
          questionOrders: questions.map((q, index) => ({
            questionId: q.id!,
            newOrderIndex: index,
          })),
        };

        await reorderFormQuestions(reorderRequest);
      }

      message.success(asDraft ? "임시저장되었습니다." : "저장되었습니다.");

      // 개념템플릿 목록 새로고침
      loadConceptTemplates();

      // 미리보기 페이지로 이동
      setTimeout(() => {
        router.push(`/groups/${groupId}/forms/${formId}`);
      }, 1000);
    } catch (error) {
      console.error("폼 저장 오류:", error);
      message.error("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  // 폼 전송
  const handleSend = () => {
    if (!currentFormId) {
      message.warning("먼저 폼을 저장해주세요.");
      return;
    }
    setSendModalOpen(true);
  };

  // 폼 전송 확인
  const handleConfirmSend = async () => {
    if (!currentFormId || sendTargets.length === 0) return;

    try {
      setSending(true);

      const sendRequest: SendFormRequest = {
        formId: currentFormId,
        targets: sendTargets,
        message: "새로운 폼을 작성해주세요.",
      };

      const result = await sendFormWithSupervision(sendRequest);

      if (result.success) {
        message.success("폼이 전송되었습니다.");
        setSendModalOpen(false);
        router.push(`/groups/${groupId}/forms`);
      } else {
        message.error(result.error || "폼 전송에 실패했습니다.");
      }
    } catch (error) {
      console.error("폼 전송 오류:", error);
      message.error("폼 전송 중 오류가 발생했습니다.");
    } finally {
      setSending(false);
    }
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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              modifiers={[]}
            >
              <SortableContext
                items={questions.map((question, index) => `question-${index}`)}
                strategy={verticalListSortingStrategy}
              >
                <div>
                  {questions.map((question, index) => (
                    <SortableQuestion
                      key={`question-${index}`}
                      question={question}
                      index={index}
                      isExpanded={expandedQuestionIndex === index}
                      formStatus={formStatus}
                      conceptTemplates={conceptTemplates}
                      onUpdateQuestion={updateQuestion}
                      onDeleteQuestion={deleteQuestion}
                      onToggleExpand={(index) =>
                        setExpandedQuestionIndex(expandedQuestionIndex === index ? null : index)
                      }
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </Card>

        {/* 액션 버튼 */}
        <div className="flex justify-between">
          <Button onClick={() => router.push(`/groups/${groupId}/forms`)}>취소</Button>
          <Space>
            {formStatus === "send" ? (
              <Alert
                message="전송된 폼은 수정할 수 없습니다"
                type="warning"
                showIcon
                style={{ marginBottom: 0 }}
              />
            ) : (
              <>
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
              </>
            )}
          </Space>
        </div>
      </Form>

      {/* 전송 모달 */}
      <Modal
        title="폼 전송"
        open={sendModalOpen}
        onCancel={() => setSendModalOpen(false)}
        onOk={handleConfirmSend}
        confirmLoading={sending}
        okText="전송"
        cancelText="취소"
      >
        <div className="space-y-4">
          <Alert message="폼을 전송하면 수정이 불가능합니다." type="warning" showIcon />

          <div>
            <Text strong>전송 대상 선택:</Text>
            <Select
              mode="multiple"
              placeholder="반 또는 개인을 선택하세요"
              style={{ width: "100%", marginTop: 8 }}
              onChange={(values) => {
                setSendTargets(
                  values.map((v) => {
                    const [type, id] = v.split(":");
                    return { type: type as "class" | "user", id };
                  })
                );
              }}
            >
              <Select.OptGroup label="반">
                {classes.map((cls) => (
                  <Select.Option key={`class:${cls.id}`} value={`class:${cls.id}`}>
                    <TeamOutlined /> {cls.name} ({cls.memberCount || 0}명)
                  </Select.Option>
                ))}
              </Select.OptGroup>
              <Select.OptGroup label="개인">
                {teachers.map((teacher) => (
                  <Select.Option
                    key={`user:${teacher.users.id}`}
                    value={`user:${teacher.users.id}`}
                  >
                    <UserOutlined /> {teacher.users.name} ({teacher.users.nickname})
                  </Select.Option>
                ))}
              </Select.OptGroup>
            </Select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
