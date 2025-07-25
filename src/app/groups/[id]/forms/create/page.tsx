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
  examConceptItems?: { text: string; description?: string }[];
}

interface QuestionCardProps {
  question: QuestionFormData;
  index: number;
  onUpdate: (updates: Partial<QuestionFormData>) => void;
  onDelete: () => void;
  onEdit: () => void;
  isEditing?: boolean;
}

// 질문 카드 컴포넌트
function QuestionCard({
  question,
  index,
  onUpdate,
  onDelete,
  onEdit,
  isEditing,
}: QuestionCardProps) {
  const [localQuestion, setLocalQuestion] = useState(question);

  useEffect(() => {
    setLocalQuestion(question);
  }, [question]);

  const handleLocalUpdate = (updates: Partial<QuestionFormData>) => {
    const updated = { ...localQuestion, ...updates };
    setLocalQuestion(updated);
    onUpdate(updates);
  };

  const addChoiceOption = () => {
    const options = [...(localQuestion.choiceOptions || []), ""];
    handleLocalUpdate({ choiceOptions: options });
  };

  const updateChoiceOption = (index: number, value: string) => {
    const options = [...(localQuestion.choiceOptions || [])];
    options[index] = value;
    handleLocalUpdate({ choiceOptions: options });
  };

  const removeChoiceOption = (index: number) => {
    const options = [...(localQuestion.choiceOptions || [])];
    options.splice(index, 1);
    handleLocalUpdate({ choiceOptions: options });
  };

  const addConceptItem = () => {
    const items = [...(localQuestion.examConceptItems || []), { text: "", description: "" }];
    handleLocalUpdate({ examConceptItems: items });
  };

  const updateConceptItem = (index: number, field: "text" | "description", value: string) => {
    const items = [...(localQuestion.examConceptItems || [])];
    items[index] = { ...items[index], [field]: value };
    handleLocalUpdate({ examConceptItems: items });
  };

  const removeConceptItem = (index: number) => {
    const items = [...(localQuestion.examConceptItems || [])];
    items.splice(index, 1);
    handleLocalUpdate({ examConceptItems: items });
  };

  const questionTypeIcons = {
    text: <FileTextOutlined />,
    rating: <StarOutlined />,
    choice: <CheckSquareOutlined />,
    exam: <FormOutlined />,
  };

  const questionTypeLabels = {
    text: "텍스트",
    rating: "별점",
    choice: "객관식",
    exam: "시험",
  };

  return (
    <Card
      className={`mb-4 ${isEditing ? "border-blue-500 shadow-lg" : ""}`}
      title={
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <DragOutlined className="text-gray-400 cursor-move" />
            <Badge count={index + 1} color="blue" />
            <div className="flex items-center space-x-2">
              {questionTypeIcons[localQuestion.questionType]}
              <span>{questionTypeLabels[localQuestion.questionType]} 질문</span>
              {localQuestion.isRequired && <Tag color="red">필수</Tag>}
            </div>
          </div>
          <Space>
            <Button size="small" icon={<EditOutlined />} onClick={onEdit}>
              {isEditing ? "완료" : "편집"}
            </Button>
            <Button size="small" danger icon={<DeleteOutlined />} onClick={onDelete} />
          </Space>
        </div>
      }
    >
      {isEditing ? (
        <div className="space-y-4">
          {/* 기본 설정 */}
          <div>
            <Text strong>질문 내용 *</Text>
            <Input
              value={localQuestion.questionText}
              onChange={(e) => handleLocalUpdate({ questionText: e.target.value })}
              placeholder="질문을 입력하세요"
              className="mt-1"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={localQuestion.isRequired}
              onChange={(checked) => handleLocalUpdate({ isRequired: checked })}
            />
            <Text>필수 응답</Text>
          </div>

          {/* 타입별 설정 */}
          {localQuestion.questionType === "text" && (
            <div className="space-y-3">
              <div>
                <Text strong>입력 형태</Text>
                <Radio.Group
                  value={localQuestion.textSubtype || "text"}
                  onChange={(e) => handleLocalUpdate({ textSubtype: e.target.value })}
                  className="block mt-1"
                >
                  <Radio value="text">주관식 (한 줄)</Radio>
                  <Radio value="textarea">서술형 (여러 줄)</Radio>
                </Radio.Group>
              </div>
              <div>
                <Text strong>최대 글자 수</Text>
                <InputNumber
                  value={localQuestion.textMaxLength || 500}
                  onChange={(value) => handleLocalUpdate({ textMaxLength: value || 500 })}
                  min={10}
                  max={2000}
                  className="block mt-1 w-full"
                />
              </div>
            </div>
          )}

          {localQuestion.questionType === "rating" && (
            <div className="space-y-3">
              <div>
                <Text strong>최대 별점</Text>
                <InputNumber
                  value={localQuestion.ratingMax || 5}
                  onChange={(value) => handleLocalUpdate({ ratingMax: value || 5 })}
                  min={3}
                  max={10}
                  className="block mt-1"
                />
              </div>
              <div>
                <Text strong>별점 단위</Text>
                <InputNumber
                  value={localQuestion.ratingStep || 1}
                  onChange={(value) => handleLocalUpdate({ ratingStep: value || 1 })}
                  min={0.5}
                  max={1}
                  step={0.5}
                  className="block mt-1"
                />
              </div>
            </div>
          )}

          {localQuestion.questionType === "choice" && (
            <div className="space-y-3">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={localQuestion.choiceMultiple || false}
                    onChange={(checked) => handleLocalUpdate({ choiceMultiple: checked })}
                  />
                  <Text>복수 선택 허용</Text>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={localQuestion.choiceAllowOther || false}
                    onChange={(checked) => handleLocalUpdate({ choiceAllowOther: checked })}
                  />
                  <Text>기타 옵션 허용</Text>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Text strong>선택지</Text>
                  <Button size="small" icon={<PlusOutlined />} onClick={addChoiceOption}>
                    선택지 추가
                  </Button>
                </div>
                {(localQuestion.choiceOptions || []).map((option, optionIndex) => (
                  <div key={optionIndex} className="flex items-center space-x-2 mb-2">
                    <Text>{optionIndex + 1}.</Text>
                    <Input
                      value={option}
                      onChange={(e) => updateChoiceOption(optionIndex, e.target.value)}
                      placeholder={`선택지 ${optionIndex + 1}`}
                    />
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => removeChoiceOption(optionIndex)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {localQuestion.questionType === "exam" && (
            <div className="space-y-3">
              <div>
                <Text strong>총 문제 수</Text>
                <InputNumber
                  value={localQuestion.examTotalQuestions || 10}
                  onChange={(value) => handleLocalUpdate({ examTotalQuestions: value || 10 })}
                  min={1}
                  max={50}
                  className="block mt-1"
                />
              </div>

              <div>
                <Text strong>개념 템플릿</Text>
                <Radio.Group
                  value={localQuestion.examUseExisting ? "existing" : "new"}
                  onChange={(e) =>
                    handleLocalUpdate({ examUseExisting: e.target.value === "existing" })
                  }
                  className="block mt-1"
                >
                  <Radio value="existing">기존 템플릿 사용</Radio>
                  <Radio value="new">새 템플릿 생성</Radio>
                </Radio.Group>
              </div>

              {!localQuestion.examUseExisting && (
                <>
                  <div>
                    <Text strong>템플릿 이름</Text>
                    <Input
                      value={localQuestion.examNewTemplateName || ""}
                      onChange={(e) => handleLocalUpdate({ examNewTemplateName: e.target.value })}
                      placeholder="개념 템플릿 이름을 입력하세요"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Text strong>개념 목록</Text>
                      <Button size="small" icon={<PlusOutlined />} onClick={addConceptItem}>
                        개념 추가
                      </Button>
                    </div>
                    {(localQuestion.examConceptItems || []).map((item, itemIndex) => (
                      <div key={itemIndex} className="border p-3 rounded mb-2">
                        <div className="flex items-center justify-between mb-2">
                          <Text strong>개념 {itemIndex + 1}</Text>
                          <Button
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => removeConceptItem(itemIndex)}
                          />
                        </div>
                        <Input
                          value={item.text}
                          onChange={(e) => updateConceptItem(itemIndex, "text", e.target.value)}
                          placeholder="개념 이름"
                          className="mb-2"
                        />
                        <Input
                          value={item.description || ""}
                          onChange={(e) =>
                            updateConceptItem(itemIndex, "description", e.target.value)
                          }
                          placeholder="개념 설명 (선택사항)"
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        <div>
          <Text className="text-lg">{localQuestion.questionText || "질문 내용을 입력하세요"}</Text>
          <div className="mt-2 text-gray-500">
            {localQuestion.questionType === "text" && (
              <Text>
                {localQuestion.textSubtype === "textarea" ? "서술형" : "주관식"} 응답 (최대{" "}
                {localQuestion.textMaxLength || 500}자)
              </Text>
            )}
            {localQuestion.questionType === "rating" && (
              <Text>별점 {localQuestion.ratingMax || 5}점 만점</Text>
            )}
            {localQuestion.questionType === "choice" && (
              <Text>
                {localQuestion.choiceMultiple ? "복수 선택" : "단일 선택"}(
                {(localQuestion.choiceOptions || []).length}개 선택지)
              </Text>
            )}
            {localQuestion.questionType === "exam" && (
              <Text>시험 문제 {localQuestion.examTotalQuestions || 10}개</Text>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

export default function CreateFormPage() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const groupId = params.id as string;

  // URL 파라미터로 수정/복제 모드 판단
  const editId = searchParams.get("edit");
  const duplicateId = searchParams.get("duplicate");
  const isEditing = !!editId;
  const isDuplicating = !!duplicateId;

  const [form] = Form.useForm();
  const [questions, setQuestions] = useState<QuestionFormData[]>([]);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState<GroupMemberWithDetails[]>([]);

  const { setPageHeader } = usePageHeader();

  // 페이지 헤더 설정
  useEffect(() => {
    setPageHeader({
      title: isEditing ? "폼 수정" : isDuplicating ? "폼 복제" : "새 폼 만들기",
      subtitle: isEditing
        ? "기존 폼 내용을 수정합니다"
        : isDuplicating
        ? "기존 폼을 복제하여 새로 만듭니다"
        : "새로운 폼을 생성합니다",
      backUrl: `/groups/${groupId}/forms`,
      actions: (
        <Space>
          <Button onClick={() => handleSave(true)}>임시저장</Button>
          <Button type="primary" onClick={() => handleSave(false)}>
            {isEditing ? "수정 완료" : "생성 완료"}
          </Button>
        </Space>
      ),
    });
  }, [setPageHeader, groupId, isEditing, isDuplicating]);

  // 선생님 목록 로드
  const loadTeachers = useCallback(async () => {
    if (!user?.id) return;

    try {
      const result = await getGroupMembers(groupId, user.id);
      if (result.success && result.data) {
        const teacherMembers = result.data.filter(
          (member) => member.group_roles?.name === "teacher" || member.group_roles?.name === "admin"
        );
        setTeachers(teacherMembers);
      }
    } catch (error) {
      console.error("선생님 목록 로드 오류:", error);
    }
  }, [groupId, user?.id]);

  // 폼 데이터 로딩
  const loadFormData = useCallback(async () => {
    const targetId = editId || duplicateId;
    if (!targetId || !user) return;

    setLoading(true);
    try {
      const result = await getFormDetails(targetId);
      if (result.success && result.data) {
        const formData = result.data;

        // 폼 기본 정보 설정
        form.setFieldsValue({
          title: isDuplicating ? `${formData.title} [복사본]` : formData.title,
          description: formData.description || "",
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

          // 타입별 상세 정보 설정
          if (q.question_type === "text") {
            base.textSubtype = q.textDetails?.subtype || "text";
            base.textMaxLength = q.textDetails?.maxLength || 500;
          } else if (q.question_type === "rating" && q.ratingDetails) {
            base.ratingMax = q.ratingDetails.rating_max;
            base.ratingStep = q.ratingDetails.rating_step;
          } else if (q.question_type === "choice" && q.choiceDetails) {
            base.choiceOptions = q.choiceDetails.options?.map((opt) => opt.option_text) || [];
            base.choiceMultiple = q.choiceDetails.is_multiple || false;
            base.choiceAllowOther = q.choiceDetails.etc_option_enabled || false;
          } else if (q.question_type === "exam" && q.examDetails) {
            base.examTotalQuestions = q.examDetails.total_questions;
            base.examConceptTemplateId = q.examDetails.concept_template_id || undefined;
            base.examUseExisting = !!q.examDetails.concept_template_id;
          }

          return base;
        });

        setQuestions(questionFormData);
      } else {
        message.error(result.error || "폼 데이터를 불러올 수 없습니다.");
        router.push(`/groups/${groupId}/forms`);
      }
    } catch (error) {
      console.error("폼 데이터 로드 오류:", error);
      message.error("폼 데이터 로딩 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [editId, duplicateId, isDuplicating, user, message, router, groupId, form]);

  // 초기 데이터 로드
  useEffect(() => {
    loadTeachers();
    if (editId || duplicateId) {
      loadFormData();
    }
  }, [loadTeachers, loadFormData]);

  // 시험형 질문이 이미 있는지 확인
  const hasExamQuestion = questions.some((q) => q.questionType === "exam");

  // 질문 추가
  const addQuestion = (questionType: QuestionFormData["questionType"]) => {
    // 시험형 질문은 최대 1개까지만
    if (questionType === "exam" && hasExamQuestion) {
      message.warning("시험형 질문은 폼당 최대 1개까지만 추가할 수 있습니다.");
      return;
    }

    const newQuestion: QuestionFormData = {
      questionType,
      questionText: "",
      isRequired: false,
      orderIndex: questions.length,
      // 타입별 기본값 설정
      ...(questionType === "text" && {
        textSubtype: "text",
        textMaxLength: 500,
      }),
      ...(questionType === "rating" && {
        ratingMax: 5,
        ratingStep: 1,
      }),
      ...(questionType === "choice" && {
        choiceOptions: ["", ""],
        choiceMultiple: false,
        choiceAllowOther: false,
      }),
      ...(questionType === "exam" && {
        examTotalQuestions: 10,
        examUseExisting: false,
        examNewTemplateName: "",
        examConceptItems: [],
      }),
    };

    setQuestions([...questions, newQuestion]);
    setEditingQuestionIndex(questions.length);
  };

  // 질문 수정
  const updateQuestionState = (index: number, updates: Partial<QuestionFormData>) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], ...updates };
    setQuestions(newQuestions);
  };

  // 질문 삭제
  const deleteQuestion = (index: number) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    // 순서 재정렬
    const reorderedQuestions = newQuestions.map((q, i) => ({ ...q, orderIndex: i }));
    setQuestions(reorderedQuestions);

    // 편집 중이던 질문이 삭제되면 편집 모드 해제
    if (editingQuestionIndex === index) {
      setEditingQuestionIndex(-1);
    } else if (editingQuestionIndex > index) {
      setEditingQuestionIndex(editingQuestionIndex - 1);
    }
  };

  // 드래그 앤 드롭 핸들러
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const newQuestions = Array.from(questions);
    const [reorderedItem] = newQuestions.splice(result.source.index, 1);
    newQuestions.splice(result.destination.index, 0, reorderedItem);

    // 순서 인덱스 업데이트
    const reorderedQuestions = newQuestions.map((q, index) => ({
      ...q,
      orderIndex: index,
    }));

    setQuestions(reorderedQuestions);
  };

  // 폼 저장
  const handleSave = useCallback(
    async (isDraft: boolean = false) => {
      try {
        const values = await form.validateFields();

        if (!values.title?.trim()) {
          message.warning("폼 제목을 입력해주세요.");
          return;
        }

        if (questions.length === 0) {
          message.warning("최소 1개 이상의 질문을 추가해주세요.");
          return;
        }

        // 질문 검증
        for (const question of questions) {
          if (!question.questionText.trim()) {
            message.warning("모든 질문의 내용을 입력해주세요.");
            return;
          }

          if (question.questionType === "choice") {
            const validOptions = (question.choiceOptions || []).filter((opt) => opt.trim());
            if (validOptions.length < 2) {
              message.warning("객관식 질문은 최소 2개의 선택지가 필요합니다.");
              return;
            }
          }

          if (question.questionType === "exam" && !question.examUseExisting) {
            if (!question.examNewTemplateName?.trim()) {
              message.warning("시험형 질문의 개념 템플릿 이름을 입력해주세요.");
              return;
            }

            const validConcepts = (question.examConceptItems || []).filter((item) =>
              item.text.trim()
            );
            if (validConcepts.length === 0) {
              message.warning("시험형 질문의 개념을 최소 1개 이상 입력해주세요.");
              return;
            }

            if (validConcepts.length !== question.examTotalQuestions) {
              message.warning("시험 문제 수와 개념 수가 일치해야 합니다.");
              return;
            }
          }
        }

        let formId: string;

        if (isEditing && editId) {
          // 폼 수정
          const updateRequest: UpdateFormRequest = {
            title: values.title,
            description: values.description,
            status: isDraft ? "draft" : "active",
            isDraft,
          };

          const result = await updateForm(editId, updateRequest);
          if (!result.success) {
            throw new Error(result.error);
          }
          formId = editId;
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
          formId = result.data!;
        }

        // 질문 저장 (수정의 경우 기존 질문들은 업데이트, 새 질문들은 생성)
        for (const question of questions) {
          if (question.questionType === "exam" && !question.examUseExisting) {
            // 개념 템플릿 먼저 생성
            const conceptRequest: CreateConceptTemplateRequest = {
              name: question.examNewTemplateName!,
              groupId,
              creatorId: user!.id,
              conceptCount: question.examTotalQuestions!,
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
            }
          }

          const questionRequest: CreateQuestionRequest = {
            questionType: question.questionType,
            questionText: question.questionText,
            isRequired: question.isRequired,
            orderIndex: question.orderIndex,
          };

          // 타입별 설정 추가
          if (question.questionType === "text") {
            questionRequest.textConfig = {
              subtype: question.textSubtype!,
              maxLength: question.textMaxLength,
            };
          } else if (question.questionType === "rating") {
            questionRequest.ratingConfig = {
              ratingMax: question.ratingMax!,
              ratingStep: question.ratingStep!,
            };
          } else if (question.questionType === "choice") {
            questionRequest.choiceConfig = {
              options: (question.choiceOptions || []).filter((opt) => opt.trim()),
              multiple: question.choiceMultiple!,
              allowOther: question.choiceAllowOther,
            };
          } else if (question.questionType === "exam") {
            questionRequest.examConfig = {
              totalQuestions: question.examTotalQuestions!,
              conceptTemplateId: question.examConceptTemplateId,
            };
          }

          if (question.id && isEditing) {
            // 기존 질문 업데이트
            await updateQuestion(question.id, questionRequest as UpdateQuestionRequest);
          } else {
            // 새 질문 생성
            await createQuestion(formId, questionRequest);
          }
        }

        message.success(
          isEditing
            ? isDraft
              ? "폼이 수정되고 임시저장되었습니다."
              : "폼이 성공적으로 수정되었습니다."
            : isDraft
            ? "폼이 임시저장되었습니다."
            : "폼이 성공적으로 생성되었습니다."
        );

        if (!isDraft) {
          router.push(`/groups/${groupId}/forms`);
        }
      } catch (error) {
        console.error("폼 저장 오류:", error);
        message.error(error instanceof Error ? error.message : "폼 저장 중 오류가 발생했습니다.");
      }
    },
    [form, message, questions, isEditing, editId, groupId, user, router]
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* 폼 기본 정보 */}
      <Card title="기본 정보" className="mb-6">
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label="폼 제목"
                name="title"
                rules={[{ required: true, message: "폼 제목을 입력해주세요." }]}
                extra={
                  <Tag color={isEditing ? "orange" : isDuplicating ? "green" : "blue"}>
                    {isEditing ? "수정 중" : isDuplicating ? "복제 중" : "새 폼"}
                  </Tag>
                }
              >
                <Input placeholder="폼 제목을 입력하세요" size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="폼 설명" name="description">
            <TextArea placeholder="폼에 대한 설명을 입력하세요 (선택사항)" rows={3} />
          </Form.Item>
        </Form>
      </Card>

      {/* 질문 구역 */}
      <Card
        title="질문 구성"
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
                  disabled: hasExamQuestion,
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
        {questions.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="아직 추가된 질문이 없습니다">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => addQuestion("text")}>
              첫 번째 질문 추가하기
            </Button>
          </Empty>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable
              droppableId="questions"
              type="DEFAULT"
              isDropDisabled={false}
              isCombineEnabled={false}
              ignoreContainerClipping={false}
            >
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef}>
                  {questions.map((question, index) => (
                    <Draggable key={index} draggableId={index.toString()} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                        >
                          <QuestionCard
                            question={question}
                            index={index}
                            onUpdate={(updates) => updateQuestionState(index, updates)}
                            onDelete={() => deleteQuestion(index)}
                            onEdit={() =>
                              setEditingQuestionIndex(editingQuestionIndex === index ? -1 : index)
                            }
                            isEditing={editingQuestionIndex === index}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </Card>

      {/* 하단 버튼 */}
      <div className="mt-6 text-center">
        <Space size="large">
          <Button size="large" onClick={() => router.push(`/groups/${groupId}/forms`)}>
            취소
          </Button>
          <Button size="large" onClick={() => handleSave(true)}>
            임시저장
          </Button>
          <Button type="primary" size="large" onClick={() => handleSave(false)}>
            {isEditing ? "수정 완료" : "생성 완료"}
          </Button>
        </Space>
      </div>
    </div>
  );
}
