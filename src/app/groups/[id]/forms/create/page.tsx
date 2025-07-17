"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  Form,
  Input,
  Button,
  Select,
  Space,
  Divider,
  Modal,
  Tag,
  Switch,
  InputNumber,
  Radio,
  Alert,
  message,
  Popconfirm,
  Tooltip,
  Badge,
  Collapse,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  DragOutlined,
  EditOutlined,
  SaveOutlined,
  SendOutlined,
  QuestionCircleOutlined,
  UserOutlined,
  TeamOutlined,
  BookOutlined,
  CheckSquareOutlined,
  StarOutlined,
  FileTextOutlined,
  MenuOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/contexts/auth-context";
import { usePageHeader } from "@/contexts/page-header-context";
import { createForm, saveDraftForm, CreateFormRequest, CreateQuestionRequest } from "@/lib/forms";
import { getGroupMembers } from "@/lib/groups";
import { getAllClasses } from "@/lib/classes";
import { Database } from "@/lib/types/types";

const { TextArea } = Input;
const { Panel } = Collapse;

// 타입 정의
type User = Database["public"]["Tables"]["users"]["Row"];
type Class = Database["public"]["Tables"]["classes"]["Row"];

interface QuestionTemplate {
  id: string;
  type: "text" | "rating" | "choice" | "exam";
  text: string;
  required: boolean;
  config: QuestionConfig;
}

interface QuestionConfig {
  // Text 질문 설정
  textConfig?: {
    subtype: "text" | "textarea";
    maxLength?: number;
  };
  // Rating 질문 설정
  ratingConfig?: {
    max: number;
    step: number;
  };
  // Choice 질문 설정
  choiceConfig?: {
    options: string[];
    multiple: boolean;
    allowOther: boolean;
  };
  // Exam 질문 설정
  examConfig?: {
    conceptTemplateId?: string;
    questionCount: number;
  };
}

interface ConceptTemplate {
  id: string;
  name: string;
  conceptCount: number;
  status: "draft" | "published";
  creator: string;
}

interface FormCreateValues {
  title: string;
  description?: string;
  examType?: string;
  examScope?: string;
  timeTeacherId?: string;
  teacherId?: string;
  tags?: string[];
}

export default function FormCreatePage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const { setPageHeader } = usePageHeader();
  const groupId = params.id as string;

  // 폼 상태
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<QuestionTemplate[]>([]);
  const [draggedQuestion, setDraggedQuestion] = useState<string | null>(null);

  // 선택 데이터
  const [groupMembers, setGroupMembers] = useState<User[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [conceptTemplates, setConceptTemplates] = useState<ConceptTemplate[]>([]);
  const [formTags, setFormTags] = useState<string[]>([]);

  // 모달 상태
  const [questionModalVisible, setQuestionModalVisible] = useState(false);
  const [conceptModalVisible, setConceptModalVisible] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionTemplate | null>(null);
  const [newConceptTemplate, setNewConceptTemplate] = useState({
    name: "",
    conceptCount: 1,
  });

  // 질문 추가 타입 선택
  const [selectedQuestionType, setSelectedQuestionType] = useState<string>("");

  useEffect(() => {
    if (!user) {
      router.push("/auth");
      return;
    }
    loadInitialData();
  }, [user, groupId]);

  // 페이지 헤더 설정
  useEffect(() => {
    setPageHeader({
      title: "폼 생성",
      subtitle: "학생과 강사가 작성할 폼을 만들어보세요",
      backUrl: `/groups/${groupId}`,
      breadcrumb: [
        { title: "그룹", href: "/groups" },
        { title: "그룹 상세", href: `/groups/${groupId}` },
        { title: "폼 생성" },
      ],
    });

    return () => setPageHeader(null);
  }, [setPageHeader, groupId]);

  const loadInitialData = async () => {
    if (!user) return;

    try {
      // 그룹 멤버 및 반 정보 로드
      const [membersResult, classesResult] = await Promise.all([
        getGroupMembers(groupId, user.id),
        getAllClasses(groupId, user.id),
      ]);

      if (membersResult.success) {
        setGroupMembers(membersResult.data || []);
      }

      if (classesResult.success) {
        setClasses(classesResult.data || []);
      }

      // 개념 템플릿 로드 (예시 데이터)
      setConceptTemplates([
        {
          id: "1",
          name: "수학 기본 개념",
          conceptCount: 20,
          status: "published",
          creator: "홍길동",
        },
        {
          id: "2",
          name: "영어 문법 기초",
          conceptCount: 15,
          status: "published",
          creator: "김영희",
        },
      ]);

      // 폼 태그 로드 (예시)
      setFormTags(["중간고사", "기말고사", "단원평가", "진단평가"]);
    } catch (error) {
      message.error("초기 데이터 로드 중 오류가 발생했습니다.");
    }
  };

  // 질문 추가
  const handleAddQuestion = (type: string) => {
    setSelectedQuestionType(type);
    setEditingQuestion(null);
    setQuestionModalVisible(true);
  };

  // 질문 수정
  const handleEditQuestion = (question: QuestionTemplate) => {
    setEditingQuestion(question);
    setSelectedQuestionType(question.type);
    setQuestionModalVisible(true);
  };

  // 질문 저장
  const handleSaveQuestion = (questionData: any) => {
    const newQuestion: QuestionTemplate = {
      id: editingQuestion?.id || Date.now().toString(),
      type: selectedQuestionType as any,
      text: questionData.text,
      required: questionData.required || false,
      config: questionData.config || {},
    };

    if (editingQuestion) {
      setQuestions(questions.map((q) => (q.id === editingQuestion.id ? newQuestion : q)));
    } else {
      setQuestions([...questions, newQuestion]);
    }

    setQuestionModalVisible(false);
    setEditingQuestion(null);
  };

  // 질문 삭제
  const handleDeleteQuestion = (questionId: string) => {
    setQuestions(questions.filter((q) => q.id !== questionId));
  };

  // 질문 순서 변경
  const handleMoveQuestion = (fromIndex: number, toIndex: number) => {
    const newQuestions = [...questions];
    const [movedQuestion] = newQuestions.splice(fromIndex, 1);
    newQuestions.splice(toIndex, 0, movedQuestion);
    setQuestions(newQuestions);
  };

  // 폼 저장/임시저장
  const handleSave = async (isDraft = false) => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const questionsRequest: CreateQuestionRequest[] = questions.map((q, index) => ({
        questionType: q.type,
        questionText: q.text,
        isRequired: q.required,
        orderIndex: index,
        textConfig: q.config.textConfig,
        ratingConfig: q.config.ratingConfig,
        choiceConfig: q.config.choiceConfig,
        examConfig: q.config.examConfig,
      }));

      const formRequest: CreateFormRequest = {
        title: values.title,
        description: values.description,
        groupId,
        creatorId: user!.id,
        questions: questionsRequest,
        tags: values.tags,
        timeTeacherId: values.timeTeacherId,
        teacherId: values.teacherId,
      };

      const result = isDraft ? await saveDraftForm(formRequest) : await createForm(formRequest);

      if (result.success) {
        message.success(isDraft ? "폼이 임시저장되었습니다." : "폼이 생성되었습니다.");
        router.push(`/groups/${groupId}/forms/${result.data}`);
      } else {
        message.error(result.error || "폼 저장에 실패했습니다.");
      }
    } catch (error) {
      message.error("폼 저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 개념 템플릿 생성
  const handleCreateConceptTemplate = () => {
    if (!newConceptTemplate.name || newConceptTemplate.conceptCount < 1) {
      message.error("템플릿 이름과 올바른 개념 수를 입력해주세요.");
      return;
    }

    const template: ConceptTemplate = {
      id: Date.now().toString(),
      name: newConceptTemplate.name,
      conceptCount: newConceptTemplate.conceptCount,
      status: "draft",
      creator: user?.name || "현재 사용자",
    };

    setConceptTemplates([...conceptTemplates, template]);
    setConceptModalVisible(false);
    setNewConceptTemplate({ name: "", conceptCount: 1 });
    message.success("개념 템플릿이 생성되었습니다.");
  };

  // 질문 타입별 아이콘
  const getQuestionIcon = (type: string) => {
    switch (type) {
      case "text":
        return <FileTextOutlined />;
      case "rating":
        return <StarOutlined />;
      case "choice":
        return <CheckSquareOutlined />;
      case "exam":
        return <BookOutlined />;
      default:
        return <QuestionCircleOutlined />;
    }
  };

  // 질문 타입별 이름
  const getQuestionTypeName = (type: string) => {
    switch (type) {
      case "text":
        return "텍스트";
      case "rating":
        return "별점";
      case "choice":
        return "선택형";
      case "exam":
        return "시험";
      default:
        return "알 수 없음";
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Form form={form} layout="vertical" className="space-y-6">
          {/* 폼 기본 정보 */}
          <Card title="기본 정보" className="shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Form.Item
                name="title"
                label="폼 제목"
                rules={[{ required: true, message: "제목을 입력해주세요!" }]}
              >
                <Input placeholder="예: 2025학년도 1학기 중간고사 분석" size="large" />
              </Form.Item>

              <Form.Item name="examType" label="시험 종류">
                <Select placeholder="시험 종류를 선택하세요" size="large">
                  <Select.Option value="midterm">중간고사</Select.Option>
                  <Select.Option value="final">기말고사</Select.Option>
                  <Select.Option value="quiz">단원평가</Select.Option>
                  <Select.Option value="diagnostic">진단평가</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item name="description" label="설명" className="md:col-span-2">
                <TextArea placeholder="폼에 대한 설명을 입력하세요" rows={3} />
              </Form.Item>

              <Form.Item name="examScope" label="시험 범위">
                <Input placeholder="예: 1-5단원" />
              </Form.Item>

              <Form.Item name="tags" label="폼 태그">
                <Select
                  mode="tags"
                  placeholder="태그를 선택하거나 새로 입력하세요"
                  options={formTags.map((tag) => ({ value: tag, label: tag }))}
                />
              </Form.Item>
            </div>
          </Card>

          {/* 질문 섹션 */}
          <Card
            title={
              <div className="flex items-center justify-between">
                <span>질문 설정</span>
                <Badge count={questions.length} showZero color="blue">
                  <span className="text-sm text-gray-500 mr-2">총 {questions.length}개 질문</span>
                </Badge>
              </div>
            }
            className="shadow-sm"
          >
            {/* 질문 추가 버튼들 */}
            <div className="mb-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button
                  type="dashed"
                  icon={<FileTextOutlined />}
                  onClick={() => handleAddQuestion("text")}
                  className="h-20 flex flex-col items-center justify-center"
                >
                  <span className="text-xs mt-1">텍스트</span>
                </Button>
                <Button
                  type="dashed"
                  icon={<StarOutlined />}
                  onClick={() => handleAddQuestion("rating")}
                  className="h-20 flex flex-col items-center justify-center"
                >
                  <span className="text-xs mt-1">별점</span>
                </Button>
                <Button
                  type="dashed"
                  icon={<CheckSquareOutlined />}
                  onClick={() => handleAddQuestion("choice")}
                  className="h-20 flex flex-col items-center justify-center"
                >
                  <span className="text-xs mt-1">선택형</span>
                </Button>
                <Button
                  type="dashed"
                  icon={<BookOutlined />}
                  onClick={() => handleAddQuestion("exam")}
                  className="h-20 flex flex-col items-center justify-center"
                >
                  <span className="text-xs mt-1">시험</span>
                </Button>
              </div>
            </div>

            {/* 질문 목록 */}
            <div className="space-y-3">
              {questions.map((question, index) => (
                <Card
                  key={question.id}
                  size="small"
                  className="border border-gray-200 hover:border-blue-300 transition-colors cursor-move"
                  title={
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <DragOutlined className="text-gray-400" />
                        <Badge count={index + 1} size="small" />
                        {getQuestionIcon(question.type)}
                        <span className="font-medium">{getQuestionTypeName(question.type)}</span>
                        {question.required && <Tag color="red">필수</Tag>}
                      </div>
                      <Space>
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => handleEditQuestion(question)}
                        />
                        <Popconfirm
                          title="질문을 삭제하시겠습니까?"
                          onConfirm={() => handleDeleteQuestion(question.id)}
                        >
                          <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                      </Space>
                    </div>
                  }
                >
                  <p className="text-gray-700">{question.text}</p>
                  {question.type === "choice" && question.config.choiceConfig && (
                    <div className="mt-2">
                      <div className="text-xs text-gray-500 mb-1">선택지:</div>
                      {question.config.choiceConfig.options.map((option, idx) => (
                        <Tag key={idx} className="mb-1">
                          {option}
                        </Tag>
                      ))}
                    </div>
                  )}
                  {question.type === "exam" && question.config.examConfig && (
                    <div className="mt-2 text-xs text-gray-500">
                      문제 수: {question.config.examConfig.questionCount}개
                    </div>
                  )}
                </Card>
              ))}
            </div>

            {questions.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                <QuestionCircleOutlined className="text-4xl text-gray-300 mb-4" />
                <p className="text-gray-500">위의 버튼을 클릭하여 질문을 추가해보세요</p>
              </div>
            )}
          </Card>

          {/* 담당자 연결 */}
          <Card title="담당자 연결" className="shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Form.Item name="timeTeacherId" label="시간강사">
                <Select
                  placeholder="시간강사를 선택하세요"
                  size="large"
                  showSearch
                  filterOption={(input, option) =>
                    (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {groupMembers
                    .filter((member) => member.education === "teacher")
                    .map((member) => (
                      <Select.Option key={member.id} value={member.id}>
                        <div className="flex items-center space-x-2">
                          <UserOutlined />
                          <span>
                            {member.name} ({member.nickname})
                          </span>
                        </div>
                      </Select.Option>
                    ))}
                </Select>
              </Form.Item>

              <Form.Item name="teacherId" label="부장선생님">
                <Select
                  placeholder="부장선생님을 선택하세요"
                  size="large"
                  showSearch
                  filterOption={(input, option) =>
                    (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {groupMembers
                    .filter(
                      (member) =>
                        member.education === "principal" || member.education === "head_teacher"
                    )
                    .map((member) => (
                      <Select.Option key={member.id} value={member.id}>
                        <div className="flex items-center space-x-2">
                          <UserOutlined />
                          <span>
                            {member.name} ({member.nickname})
                          </span>
                        </div>
                      </Select.Option>
                    ))}
                </Select>
              </Form.Item>
            </div>

            <Alert
              message="담당자 연결 안내"
              description="시간강사와 부장선생님을 연결하면 폼 응답 후 보고서 검토 과정이 자동으로 진행됩니다."
              type="info"
              showIcon
              className="mt-4"
            />
          </Card>

          {/* 하단 버튼들 */}
          <Card className="shadow-sm">
            <div className="flex justify-between">
              <Button onClick={() => router.back()}>취소</Button>
              <Space>
                <Button icon={<SaveOutlined />} onClick={() => handleSave(true)} loading={loading}>
                  임시저장
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => handleSave(false)}
                  loading={loading}
                >
                  폼 생성
                </Button>
              </Space>
            </div>
          </Card>
        </Form>

        {/* 질문 추가/수정 모달 */}
        <QuestionModal
          visible={questionModalVisible}
          onCancel={() => setQuestionModalVisible(false)}
          onSave={handleSaveQuestion}
          questionType={selectedQuestionType}
          editingQuestion={editingQuestion}
          conceptTemplates={conceptTemplates}
          onCreateConceptTemplate={() => setConceptModalVisible(true)}
        />

        {/* 개념 템플릿 생성 모달 */}
        <Modal
          title="개념 템플릿 생성"
          open={conceptModalVisible}
          onOk={handleCreateConceptTemplate}
          onCancel={() => setConceptModalVisible(false)}
          okText="생성"
          cancelText="취소"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">템플릿 이름</label>
              <Input
                placeholder="예: 수학 2단원 기본 개념"
                value={newConceptTemplate.name}
                onChange={(e) =>
                  setNewConceptTemplate({
                    ...newConceptTemplate,
                    name: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">개념 수</label>
              <InputNumber
                min={1}
                max={100}
                value={newConceptTemplate.conceptCount}
                onChange={(value) =>
                  setNewConceptTemplate({
                    ...newConceptTemplate,
                    conceptCount: value || 1,
                  })
                }
                className="w-full"
              />
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}

// 질문 모달 컴포넌트
interface QuestionModalProps {
  visible: boolean;
  onCancel: () => void;
  onSave: (questionData: any) => void;
  questionType: string;
  editingQuestion: QuestionTemplate | null;
  conceptTemplates: ConceptTemplate[];
  onCreateConceptTemplate: () => void;
}

function QuestionModal({
  visible,
  onCancel,
  onSave,
  questionType,
  editingQuestion,
  conceptTemplates,
  onCreateConceptTemplate,
}: QuestionModalProps) {
  const [form] = Form.useForm();
  const [choiceOptions, setChoiceOptions] = useState<string[]>([""]);

  useEffect(() => {
    if (visible) {
      if (editingQuestion) {
        form.setFieldsValue({
          text: editingQuestion.text,
          required: editingQuestion.required,
          ...editingQuestion.config,
        });

        if (editingQuestion.config.choiceConfig) {
          setChoiceOptions(editingQuestion.config.choiceConfig.options);
        }
      } else {
        form.resetFields();
        setChoiceOptions([""]);
      }
    }
  }, [visible, editingQuestion, form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      const config: QuestionConfig = {};

      switch (questionType) {
        case "text":
          config.textConfig = {
            subtype: values.subtype || "text",
            maxLength: values.maxLength,
          };
          break;
        case "rating":
          config.ratingConfig = {
            max: values.max || 5,
            step: values.step || 1,
          };
          break;
        case "choice":
          config.choiceConfig = {
            options: choiceOptions.filter((opt) => opt.trim()),
            multiple: values.multiple || false,
            allowOther: values.allowOther || false,
          };
          break;
        case "exam":
          config.examConfig = {
            conceptTemplateId: values.conceptTemplateId,
            questionCount: values.questionCount || 1,
          };
          break;
      }

      onSave({
        text: values.text,
        required: values.required || false,
        config,
      });
    } catch (error) {
      // 폼 검증 실패
    }
  };

  const addChoiceOption = () => {
    setChoiceOptions([...choiceOptions, ""]);
  };

  const updateChoiceOption = (index: number, value: string) => {
    const newOptions = [...choiceOptions];
    newOptions[index] = value;
    setChoiceOptions(newOptions);
  };

  const removeChoiceOption = (index: number) => {
    if (choiceOptions.length > 1) {
      setChoiceOptions(choiceOptions.filter((_, i) => i !== index));
    }
  };

  const getModalTitle = () => {
    const typeNames = {
      text: "텍스트 질문",
      rating: "별점 질문",
      choice: "선택형 질문",
      exam: "시험 질문",
    };
    return `${typeNames[questionType as keyof typeof typeNames]} ${
      editingQuestion ? "수정" : "추가"
    }`;
  };

  return (
    <Modal
      title={getModalTitle()}
      open={visible}
      onOk={handleSave}
      onCancel={onCancel}
      width={600}
      okText="저장"
      cancelText="취소"
    >
      <Form form={form} layout="vertical" className="mt-4">
        <Form.Item
          name="text"
          label="질문 내용"
          rules={[{ required: true, message: "질문 내용을 입력해주세요!" }]}
        >
          <TextArea rows={3} placeholder="질문 내용을 입력하세요" />
        </Form.Item>

        <Form.Item name="required" valuePropName="checked" label="필수 질문">
          <Switch />
        </Form.Item>

        {/* 질문 타입별 설정 */}
        {questionType === "text" && (
          <>
            <Form.Item name="subtype" label="입력 형태">
              <Radio.Group>
                <Radio value="text">주관식 (한 줄)</Radio>
                <Radio value="textarea">서술형 (여러 줄)</Radio>
              </Radio.Group>
            </Form.Item>
            <Form.Item name="maxLength" label="최대 글자 수">
              <InputNumber min={1} max={1000} placeholder="제한 없음" />
            </Form.Item>
          </>
        )}

        {questionType === "rating" && (
          <>
            <Form.Item name="max" label="최대 점수" initialValue={5}>
              <InputNumber min={1} max={10} />
            </Form.Item>
            <Form.Item name="step" label="단계" initialValue={1}>
              <InputNumber min={0.1} max={1} step={0.1} />
            </Form.Item>
          </>
        )}

        {questionType === "choice" && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">선택지</label>
              {choiceOptions.map((option, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <Input
                    placeholder={`선택지 ${index + 1}`}
                    value={option}
                    onChange={(e) => updateChoiceOption(index, e.target.value)}
                  />
                  {choiceOptions.length > 1 && (
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => removeChoiceOption(index)}
                    />
                  )}
                </div>
              ))}
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={addChoiceOption}
                className="w-full"
              >
                선택지 추가
              </Button>
            </div>

            <Form.Item name="multiple" valuePropName="checked" label="복수 선택 허용">
              <Switch />
            </Form.Item>

            <Form.Item name="allowOther" valuePropName="checked" label="기타 의견 입력 허용">
              <Switch />
            </Form.Item>
          </>
        )}

        {questionType === "exam" && (
          <>
            <Form.Item name="questionCount" label="문제 수" rules={[{ required: true }]}>
              <InputNumber min={1} max={100} placeholder="문제 수를 입력하세요" />
            </Form.Item>

            <Form.Item name="conceptTemplateId" label="개념 템플릿">
              <div className="space-y-2">
                <Select placeholder="기존 템플릿을 선택하거나 새로 생성하세요" allowClear>
                  {conceptTemplates.map((template) => (
                    <Select.Option key={template.id} value={template.id}>
                      <div className="flex items-center justify-between">
                        <span>{template.name}</span>
                        <Tag color={template.status === "published" ? "green" : "orange"}>
                          {template.conceptCount}개 개념
                        </Tag>
                      </div>
                    </Select.Option>
                  ))}
                </Select>
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={onCreateConceptTemplate}
                  className="w-full"
                >
                  새 개념 템플릿 생성
                </Button>
              </div>
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
}
