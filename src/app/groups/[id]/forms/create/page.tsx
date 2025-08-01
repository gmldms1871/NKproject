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
  updateQuestion,
  reorderQuestions,
  sendForm,
  saveFormAsDraft,
  updateFormAssignment, // 담당자 배정 함수 사용
  FormWithDetails,
  QuestionWithDetails,
  CreateFormRequest,
  UpdateFormRequest,
  CreateQuestionRequest,
  UpdateQuestionRequest,
  ReorderQuestionsRequest,
  SendFormRequest,
  UpdateFormAssignmentRequest, // 담당자 배정 요청 타입 사용
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
  isNew?: boolean; // 새로 생성된 질문인지 구분
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
  examConceptItems?: { text: string; description: string }[];
}

interface SendFormModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: (targets: { type: "individual" | "class"; id: string; name: string }[]) => void;
  loading: boolean;
}

// 질문 타입별 설정 컴포넌트 (개선된 버전)
function QuestionConfigForm({
  question,
  onChange,
}: {
  question: QuestionFormData;
  onChange: (updates: Partial<QuestionFormData>) => void;
}) {
  const renderTextConfig = () => (
    <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <div>
        <Text strong className="text-blue-700">
          응답 형식
        </Text>
        <Radio.Group
          value={question.textSubtype || "text"}
          onChange={(e) => onChange({ textSubtype: e.target.value })}
          className="w-full mt-2"
        >
          <Radio value="text">주관식 (한 줄)</Radio>
          <Radio value="textarea">서술형 (여러 줄)</Radio>
        </Radio.Group>
      </div>
      <div>
        <Text strong className="text-blue-700">
          최대 글자 수
        </Text>
        <InputNumber
          min={1}
          max={10000}
          value={question.textMaxLength || 500}
          onChange={(value) => onChange({ textMaxLength: value || 500 })}
          className="w-full mt-2"
        />
      </div>
    </div>
  );

  const renderRatingConfig = () => (
    <div className="space-y-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
      <div>
        <Text strong className="text-orange-700">
          최대 점수
        </Text>
        <InputNumber
          min={2}
          max={10}
          value={question.ratingMax || 5}
          onChange={(value) => onChange({ ratingMax: value || 5 })}
          className="w-full mt-2"
        />
      </div>
      <div>
        <Text strong className="text-orange-700">
          점수 단계
        </Text>
        <InputNumber
          min={0.1}
          max={1}
          step={0.1}
          value={question.ratingStep || 1}
          onChange={(value) => onChange({ ratingStep: value || 1 })}
          className="w-full mt-2"
        />
      </div>
    </div>
  );

  const renderChoiceConfig = () => (
    <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
      <div>
        <Text strong className="text-green-700">
          선택 방식
        </Text>
        <Radio.Group
          value={question.choiceMultiple ? "multiple" : "single"}
          onChange={(e) => onChange({ choiceMultiple: e.target.value === "multiple" })}
          className="w-full mt-2"
        >
          <Radio value="single">단일 선택</Radio>
          <Radio value="multiple">복수 선택</Radio>
        </Radio.Group>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Text strong className="text-green-700">
            선택지
          </Text>
          <Button
            type="dashed"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => {
              const options = question.choiceOptions || [];
              onChange({ choiceOptions: [...options, ""] });
            }}
          >
            선택지 추가
          </Button>
        </div>

        <div className="space-y-2">
          {(question.choiceOptions || [""]).map((option, index) => (
            <div key={index} className="flex items-center space-x-2">
              <span className="text-sm text-gray-500 w-8">{index + 1}.</span>
              <Input
                placeholder={`선택지 ${index + 1}`}
                value={option}
                onChange={(e) => {
                  const options = [...(question.choiceOptions || [])];
                  options[index] = e.target.value;
                  onChange({ choiceOptions: options });
                }}
                className="flex-1"
              />
              {(question.choiceOptions || []).length > 1 && (
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    const options = [...(question.choiceOptions || [])];
                    options.splice(index, 1);
                    onChange({ choiceOptions: options });
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center space-x-2">
          <Switch
            checked={question.choiceAllowOther || false}
            onChange={(checked) => onChange({ choiceAllowOther: checked })}
          />
          <Text className="text-green-700">기타 옵션 허용</Text>
        </div>
      </div>
    </div>
  );

  const renderExamConfig = () => (
    <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
      <div>
        <Text strong className="text-purple-700">
          시험 문제 수
        </Text>
        <InputNumber
          min={1}
          max={100}
          value={question.examTotalQuestions || 10}
          onChange={(value) => onChange({ examTotalQuestions: value || 10 })}
          className="w-full mt-2"
        />
      </div>

      <div>
        <Text strong className="text-purple-700">
          개념 템플릿
        </Text>
        <Radio.Group
          value={question.examUseExisting ? "existing" : "new"}
          onChange={(e) => onChange({ examUseExisting: e.target.value === "existing" })}
          className="w-full mt-2"
        >
          <Radio value="existing">기존 템플릿 사용</Radio>
          <Radio value="new">신규 템플릿 생성</Radio>
        </Radio.Group>
      </div>

      {question.examUseExisting ? (
        <div>
          <Text strong className="text-purple-700">
            템플릿 선택
          </Text>
          <Select
            placeholder="개념 템플릿을 선택하세요"
            value={question.examConceptTemplateId}
            onChange={(value) => onChange({ examConceptTemplateId: value })}
            className="w-full mt-2"
          >
            <Select.Option value="template1">수학 기본 개념</Select.Option>
            <Select.Option value="template2">국어 문법</Select.Option>
          </Select>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <Text strong className="text-purple-700">
              템플릿 이름
            </Text>
            <Input
              placeholder="개념 템플릿 이름을 입력하세요"
              value={question.examNewTemplateName || ""}
              onChange={(e) => onChange({ examNewTemplateName: e.target.value })}
              className="mt-2"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Text strong className="text-purple-700">
                개념 목록
              </Text>
              <Button
                type="dashed"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => {
                  const items = question.examConceptItems || [];
                  onChange({ examConceptItems: [...items, { text: "", description: "" }] });
                }}
              >
                개념 추가
              </Button>
            </div>

            <div className="space-y-2">
              {(question.examConceptItems || []).map((item, index) => (
                <Card key={index} size="small" className="border-purple-200">
                  <div className="space-y-2">
                    <Input
                      placeholder={`개념 ${index + 1}`}
                      value={item.text}
                      onChange={(e) => {
                        const items = [...(question.examConceptItems || [])];
                        items[index] = { ...items[index], text: e.target.value };
                        onChange({ examConceptItems: items });
                      }}
                    />
                    <TextArea
                      placeholder="개념 설명 (선택사항)"
                      value={item.description}
                      rows={2}
                      onChange={(e) => {
                        const items = [...(question.examConceptItems || [])];
                        items[index] = { ...items[index], description: e.target.value };
                        onChange({ examConceptItems: items });
                      }}
                    />
                    <div className="flex justify-end">
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => {
                          const items = [...(question.examConceptItems || [])];
                          items.splice(index, 1);
                          onChange({ examConceptItems: items });
                        }}
                      >
                        삭제
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  switch (question.questionType) {
    case "text":
      return renderTextConfig();
    case "rating":
      return renderRatingConfig();
    case "choice":
      return renderChoiceConfig();
    case "exam":
      return renderExamConfig();
    default:
      return null;
  }
}

// 개선된 질문 카드 컴포넌트
function QuestionCard({
  question,
  index,
  onUpdate,
  onDelete,
  isExpanded,
  onToggleExpand,
  hasExamQuestion,
}: {
  question: QuestionFormData;
  index: number;
  onUpdate: (updates: Partial<QuestionFormData>) => void;
  onDelete: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  hasExamQuestion: boolean;
}) {
  const questionTypeNames = {
    text: "텍스트",
    rating: "별점",
    choice: "객관식",
    exam: "시험",
  };

  const questionTypeIcons = {
    text: <FileTextOutlined />,
    rating: <StarOutlined />,
    choice: <CheckSquareOutlined />,
    exam: <FormOutlined />,
  };

  const questionTypeColors = {
    text: "blue",
    rating: "orange",
    choice: "green",
    exam: "purple",
  };

  return (
    <div
      className={`mb-4 transition-all duration-300 ease-in-out ${
        isExpanded ? "transform scale-105" : "transform scale-100"
      }`}
    >
      <Card
        className={`transition-all duration-300 ${
          isExpanded
            ? "border-2 border-blue-400 shadow-xl bg-blue-50/30"
            : "border hover:shadow-md hover:border-gray-300"
        }`}
        bodyStyle={{ padding: isExpanded ? "24px" : "16px" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <DragOutlined className="cursor-move text-gray-400 hover:text-gray-600 transition-colors" />
            <Badge count={index + 1} className="bg-blue-100" />
            <Tag
              color={questionTypeColors[question.questionType]}
              icon={questionTypeIcons[question.questionType]}
              className="px-3 py-1 text-sm font-medium"
            >
              {questionTypeNames[question.questionType]}
            </Tag>
            {question.isRequired && <Tag color="red">필수</Tag>}
            {question.isNew && <Tag color="cyan">신규</Tag>}
          </div>

          <div className="flex items-center space-x-1">
            <Tooltip title={isExpanded ? "저장하고 접기" : "편집하기"}>
              <Button
                type="text"
                size="small"
                icon={isExpanded ? <CheckOutlined /> : <EditOutlined />}
                onClick={onToggleExpand}
                className={`transition-colors ${
                  isExpanded
                    ? "text-green-600 hover:text-green-700 bg-green-50"
                    : "hover:text-blue-600"
                }`}
              />
            </Tooltip>
            <Tooltip title="삭제">
              <Popconfirm
                title="질문 삭제"
                description="이 질문을 삭제하시겠습니까?"
                onConfirm={onDelete}
                okText="삭제"
                cancelText="취소"
                okType="danger"
              >
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  className="hover:bg-red-50"
                />
              </Popconfirm>
            </Tooltip>
          </div>
        </div>

        {isExpanded ? (
          <div className="space-y-5 animate-fadeIn">
            <div>
              <Text strong>질문 내용</Text>
              <TextArea
                value={question.questionText}
                onChange={(e) => onUpdate({ questionText: e.target.value })}
                placeholder="질문을 입력하세요"
                rows={2}
                className="mt-2"
                autoSize={{ minRows: 2, maxRows: 4 }}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={question.isRequired}
                onChange={(checked) => onUpdate({ isRequired: checked })}
              />
              <Text>필수 응답</Text>
            </div>

            <Divider style={{ margin: "16px 0" }} />

            <QuestionConfigForm question={question} onChange={onUpdate} />
          </div>
        ) : (
          <div className="cursor-pointer" onClick={onToggleExpand}>
            <div className="font-medium mb-2 text-lg leading-relaxed">
              {question.questionText || (
                <span className="text-gray-400">질문 내용을 입력하세요</span>
              )}
            </div>

            <div className="text-sm text-gray-500 space-y-1">
              {question.questionType === "text" && (
                <div>
                  {question.textSubtype === "textarea" ? "서술형" : "주관식"} 응답 (최대{" "}
                  {question.textMaxLength || 500}자)
                </div>
              )}

              {question.questionType === "rating" && (
                <div>
                  {question.ratingMax || 5}점 만점 (단계: {question.ratingStep || 1})
                </div>
              )}

              {question.questionType === "choice" && (
                <div className="space-y-1">
                  <div>
                    {question.choiceMultiple ? "복수 선택" : "단일 선택"}
                    {question.choiceAllowOther && " (기타 옵션 포함)"}
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {(question.choiceOptions || []).slice(0, 3).map((option, i) => (
                      <div key={i} className="flex items-center space-x-1">
                        <span className="text-xs">•</span>
                        <span>{option || `선택지 ${i + 1}`}</span>
                      </div>
                    ))}
                    {(question.choiceOptions || []).length > 3 && (
                      <div className="text-xs text-gray-400">
                        ... 외 {(question.choiceOptions || []).length - 3}개
                      </div>
                    )}
                  </div>
                </div>
              )}

              {question.questionType === "exam" && (
                <div>
                  시험 문제 {question.examTotalQuestions || 10}개
                  {question.examUseExisting ? " (기존 템플릿)" : " (신규 템플릿)"}
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// 전송 모달 컴포넌트 (개선된 버전)
function SendFormModal({ open, onCancel, onConfirm, loading }: SendFormModalProps) {
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [classes, setClasses] = useState<ClassWithDetails[]>([]);
  const [individuals, setIndividuals] = useState<GroupMemberWithDetails[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const { user } = useAuth();
  const { message } = App.useApp();
  const params = useParams();
  const groupId = params.id as string;

  const loadTargets = useCallback(async () => {
    if (!user || !groupId) return;

    try {
      setLoadingData(true);
      const [classResult, memberResult] = await Promise.all([
        getAllClasses(groupId, user.id),
        getGroupMembers(groupId, user.id),
      ]);

      if (classResult.success) setClasses(classResult.data || []);
      if (memberResult.success) setIndividuals(memberResult.data || []);
    } catch (error) {
      message.error("대상 목록 로딩 중 오류가 발생했습니다.");
    } finally {
      setLoadingData(false);
    }
  }, [user, groupId, message]);

  useEffect(() => {
    if (open) {
      loadTargets();
      setSelectedTargets([]); // 모달 열릴 때 선택 초기화
    }
  }, [open, loadTargets]);

  const handleConfirm = () => {
    if (selectedTargets.length === 0) {
      message.warning("전송할 대상을 선택해주세요.");
      return;
    }

    const targets = selectedTargets.map((target) => {
      if (target.startsWith("class_")) {
        const classId = target.replace("class_", "");
        const cls = classes.find((c) => c.id === classId);
        return { type: "class" as const, id: classId, name: cls?.name || "" };
      } else {
        const userId = target.replace("user_", "");
        const user = individuals.find((i) => i.user_id === userId);
        return { type: "individual" as const, id: userId, name: user?.users?.name || "" };
      }
    });

    onConfirm(targets);
  };

  const toggleTarget = (target: string) => {
    if (selectedTargets.includes(target)) {
      setSelectedTargets(selectedTargets.filter((t) => t !== target));
    } else {
      setSelectedTargets([...selectedTargets, target]);
    }
  };

  return (
    <Modal
      title="폼 전송"
      open={open}
      onCancel={onCancel}
      onOk={handleConfirm}
      confirmLoading={loading}
      okText={`${selectedTargets.length}개 대상에게 전송`}
      okButtonProps={{ disabled: selectedTargets.length === 0 }}
      cancelText="취소"
      width={600}
      destroyOnClose={true}
    >
      {loadingData ? (
        <div className="flex justify-center py-8">
          <Spin size="large" />
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <Title level={5}>반 선택</Title>
            <div className="space-y-2">
              {classes.map((cls) => (
                <div
                  key={cls.id}
                  className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedTargets.includes(`class_${cls.id}`)
                      ? "bg-blue-50 border-blue-300"
                      : "hover:bg-gray-50 border-gray-200"
                  }`}
                  onClick={() => toggleTarget(`class_${cls.id}`)}
                >
                  <input
                    type="checkbox"
                    checked={selectedTargets.includes(`class_${cls.id}`)}
                    onChange={() => {}}
                    className="w-4 h-4"
                  />
                  <TeamOutlined className="text-blue-600" />
                  <div className="flex-1">
                    <div className="font-medium">{cls.name}</div>
                    <div className="text-sm text-gray-500">구성원 {cls.memberCount}명</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Divider />

          <div>
            <Title level={5}>개별 선택</Title>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {individuals.map((individual) => (
                <div
                  key={individual.user_id}
                  className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedTargets.includes(`user_${individual.user_id}`)
                      ? "bg-blue-50 border-blue-300"
                      : "hover:bg-gray-50 border-gray-200"
                  }`}
                  onClick={() => toggleTarget(`user_${individual.user_id}`)}
                >
                  <input
                    type="checkbox"
                    checked={selectedTargets.includes(`user_${individual.user_id}`)}
                    onChange={() => {}}
                    className="w-4 h-4"
                  />
                  <UserOutlined className="text-green-600" />
                  <div className="flex-1">
                    <div className="font-medium">{individual.users?.name}</div>
                    <div className="text-sm text-gray-500">@{individual.users?.nickname}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Alert
            message="주의사항"
            description="폼을 전송하면 수정이 불가능합니다. 신중히 검토 후 전송해주세요."
            type="warning"
            showIcon
          />
        </div>
      )}
    </Modal>
  );
}

export default function FormCreatePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { message, modal } = App.useApp();
  const { setPageHeader } = usePageHeader();

  const groupId = params.id as string;
  const editId = searchParams.get("edit"); // "editId" → "edit"로 변경
  const duplicateId = searchParams.get("duplicate"); // "duplicateId" → "duplicate"로 변경
  const isEditing = !!editId;
  const isDuplicating = !!duplicateId;

  // URL 파라미터 디버깅
  useEffect(() => {
    console.log("=== URL Parameters Debug ===");
    console.log("Current URL:", window.location.href);
    console.log("Search params:", searchParams.toString());
    console.log("All search params:");
    for (const [key, value] of searchParams.entries()) {
      console.log(`  ${key}: ${value}`);
    }
    console.log("editId:", editId);
    console.log("duplicateId:", duplicateId);
    console.log("groupId:", groupId);
    console.log("params object:", params);
    console.log("=== End URL Debug ===");
  }, [searchParams, editId, duplicateId, groupId, params]);

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
  const [currentFormId, setCurrentFormId] = useState<string | null>(null);

  // 페이지 헤더 설정
  useEffect(() => {
    console.log(
      "Setting page header - isEditing:",
      isEditing,
      "isDuplicating:",
      isDuplicating,
      "editId:",
      editId,
      "duplicateId:",
      duplicateId
    ); // 디버그 로그

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
  }, [setPageHeader, groupId, isEditing, isDuplicating, editId, duplicateId]);

  // 선생님 목록 로드
  const loadTeachers = useCallback(async () => {
    if (!user || !groupId) return;

    try {
      const result = await getGroupMembers(groupId, user.id);
      if (result.success) {
        // 폼 생성 권한이 있는 멤버들만 필터링
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
      console.log("Loading form data for ID:", targetId); // 디버그 로그
      const result = await getFormDetails(targetId);

      console.log("Form details result:", result); // 디버그 로그

      if (result.success && result.data) {
        const formDetail = result.data;
        console.log("Form detail data:", formDetail); // 디버그 로그
        console.log("timeTeacher info:", formDetail.timeTeacher); // 담당자 정보 디버그
        console.log("teacher info:", formDetail.teacher); // 담당자 정보 디버그

        const newFormData = {
          title: isDuplicating ? `${formDetail.title} [복사본]` : formDetail.title,
          description: formDetail.description || "",
          timeTeacherId: isDuplicating ? undefined : formDetail.timeTeacher?.id,
          teacherId: isDuplicating ? undefined : formDetail.teacher?.id,
        };

        console.log("Setting form data:", newFormData); // 디버그 로그
        setFormData(newFormData);

        // 질문 데이터 변환
        const questionFormData: QuestionFormData[] = (formDetail.questions || []).map(
          (q, index) => {
            const base: QuestionFormData = {
              id: isDuplicating ? undefined : q.id,
              questionType: q.question_type as QuestionFormData["questionType"],
              questionText: q.question_text,
              isRequired: q.is_required || false,
              orderIndex: index,
              isNew: isDuplicating, // 복제 시에는 모든 질문이 새 질문으로 처리
            };

            // 타입별 상세 정보 설정
            if (q.question_type === "text" && q.textDetails) {
              base.textSubtype = (q.textDetails.subtype as "text" | "textarea") || "text";
              base.textMaxLength = q.textDetails.maxLength || 500;
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
          }
        );

        console.log("Converted questions:", questionFormData); // 디버그 로그
        setQuestions(questionFormData);
        setCurrentFormId(isDuplicating ? null : targetId);

        // 폼 필드 설정 - 약간의 지연을 두고 설정
        setTimeout(() => {
          const formValues = {
            title: newFormData.title,
            description: newFormData.description,
            timeTeacherId: newFormData.timeTeacherId,
            teacherId: newFormData.teacherId,
          };
          console.log("Setting form values:", formValues); // 디버그 로그
          form.setFieldsValue(formValues);
        }, 100);
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
  }, [loadTeachers, loadFormData, editId, duplicateId]);

  // 질문 추가
  const addQuestion = (questionType: QuestionFormData["questionType"]) => {
    // 시험형 질문은 최대 1개까지만
    if (questionType === "exam" && questions.some((q) => q.questionType === "exam")) {
      message.warning("시험형 질문은 폼당 최대 1개까지만 추가할 수 있습니다.");
      return;
    }

    const newQuestion: QuestionFormData = {
      questionType,
      questionText: "",
      isRequired: false,
      orderIndex: questions.length,
      isNew: true, // 새로 추가된 질문으로 표시
    };

    // 타입별 기본값 설정
    if (questionType === "text") {
      newQuestion.textSubtype = "text";
      newQuestion.textMaxLength = 500;
    } else if (questionType === "rating") {
      newQuestion.ratingMax = 5;
      newQuestion.ratingStep = 1;
    } else if (questionType === "choice") {
      newQuestion.choiceOptions = [""];
      newQuestion.choiceMultiple = false;
      newQuestion.choiceAllowOther = false;
    } else if (questionType === "exam") {
      newQuestion.examTotalQuestions = 10;
      newQuestion.examUseExisting = false;
      newQuestion.examConceptItems = [{ text: "", description: "" }];
    }

    setQuestions([...questions, newQuestion]);
    setExpandedQuestionIndex(questions.length); // 새 질문을 바로 편집 모드로
  };

  // 질문 업데이트
  const updateQuestion = (index: number, updates: Partial<QuestionFormData>) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = { ...updatedQuestions[index], ...updates };
    setQuestions(updatedQuestions);
  };

  // 질문 삭제
  const deleteQuestion = async (index: number) => {
    const question = questions[index];

    try {
      // 기존 질문이고 서버에 저장된 질문이면 서버에서도 삭제
      if (question.id && !question.isNew && isEditing) {
        // 실제 API 호출은 forms.ts의 deleteQuestion 함수가 없으므로
        // updateQuestion으로 deleted 플래그를 설정하거나
        // 여기서는 로컬에서만 삭제하고 저장 시 처리
      }

      const updatedQuestions = questions.filter((_, i) => i !== index);
      // 순서 재정렬
      updatedQuestions.forEach((q, i) => (q.orderIndex = i));
      setQuestions(updatedQuestions);

      // 삭제된 질문이 현재 편집 중인 질문이면 편집 모드 해제
      if (expandedQuestionIndex === index) {
        setExpandedQuestionIndex(null);
      } else if (expandedQuestionIndex !== null && expandedQuestionIndex > index) {
        setExpandedQuestionIndex(expandedQuestionIndex - 1);
      }

      message.success("질문이 삭제되었습니다.");
    } catch (error) {
      message.error("질문 삭제 중 오류가 발생했습니다.");
    }
  };

  // 드래그 앤 드롭 처리 (부드러운 애니메이션)
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) return;

    const reorderedQuestions = Array.from(questions);
    const [removed] = reorderedQuestions.splice(sourceIndex, 1);
    reorderedQuestions.splice(destinationIndex, 0, removed);

    // 순서 재정렬
    reorderedQuestions.forEach((q, index) => (q.orderIndex = index));
    setQuestions(reorderedQuestions);

    // 확장된 질문 인덱스 업데이트
    if (expandedQuestionIndex === sourceIndex) {
      setExpandedQuestionIndex(destinationIndex);
    } else if (expandedQuestionIndex !== null) {
      if (sourceIndex < expandedQuestionIndex && destinationIndex >= expandedQuestionIndex) {
        setExpandedQuestionIndex(expandedQuestionIndex - 1);
      } else if (sourceIndex > expandedQuestionIndex && destinationIndex <= expandedQuestionIndex) {
        setExpandedQuestionIndex(expandedQuestionIndex + 1);
      }
    }
  };

  // 폼 저장 (개선된 버전)
  const saveForm = async (isDraft = false) => {
    try {
      setSaving(true);
      console.log("Starting form save, isDraft:", isDraft); // 디버그 로그

      // 폼 기본 정보 검증
      const values = await form.validateFields();
      console.log("Form values:", values); // 디버그 로그

      if (questions.length === 0) {
        message.warning("최소 1개의 질문을 추가해주세요.");
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

      let resultFormId: string = currentFormId || "";

      if (isEditing && editId) {
        // 폼 수정
        const updateRequest: UpdateFormRequest = {
          title: values.title,
          description: values.description,
          // status는 기존 값 유지하거나 명시적으로 설정하지 않음
          isDraft,
        };

        const result = await updateForm(editId, updateRequest);
        if (!result.success) {
          throw new Error(result.error);
        }
        resultFormId = editId;
      } else {
        // 폼 생성
        const createRequest: CreateFormRequest = {
          title: values.title,
          description: values.description,
          groupId,
          creatorId: user!.id,
          // status 대신 isDraft만 사용
          isDraft,
        };

        const result = await createForm(createRequest);
        if (!result.success) {
          throw new Error(result.error);
        }
        resultFormId = result.data!;
        setCurrentFormId(resultFormId);
      }

      // 담당자 배정 (개선된 버전)
      if (values.timeTeacherId || values.teacherId) {
        try {
          console.log("Assigning teachers:", {
            timeTeacherId: values.timeTeacherId,
            teacherId: values.teacherId,
          }); // 디버그 로그

          const assignmentRequest: UpdateFormAssignmentRequest = {
            formId: resultFormId,
            timeTeacherId: values.timeTeacherId || undefined,
            teacherId: values.teacherId || undefined,
          };

          const assignmentResult = await updateFormAssignment(assignmentRequest);

          if (assignmentResult && assignmentResult.success) {
            console.log("Teacher assignment successful"); // 디버그 로그
          } else {
            console.warn("담당자 배정 실패:", assignmentResult?.error);
            message.warning(
              "담당자 배정에 실패했습니다. 폼은 저장되었지만 담당자 정보를 다시 확인해주세요."
            );
          }
        } catch (assignmentError) {
          console.error("담당자 배정 중 오류:", assignmentError);
          message.warning(
            "담당자 배정 중 오류가 발생했습니다. 폼은 저장되었지만 담당자 정보를 다시 확인해주세요."
          );
        }
      }

      // 질문 저장/업데이트
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];

        // 시험형 질문의 개념 템플릿 먼저 생성
        if (question.questionType === "exam" && !question.examUseExisting) {
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

        if (question.id && !question.isNew) {
          // 기존 질문은 저장 시점에 일괄 업데이트
          // 여기서는 로컬 상태만 관리
          setQuestions((prev) =>
            prev.map((q, index) => (index === i ? { ...q, isNew: false } : q))
          );
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

          const createResult = await createQuestion(resultFormId, createRequest);
          if (createResult && createResult.success && createResult.data) {
            // 생성된 질문 ID를 로컬 상태에 반영
            setQuestions((prev) =>
              prev.map((q, index) =>
                index === i ? { ...q, id: createResult.data, isNew: false } : q
              )
            );
          }
        }
      }

      console.log("Form save completed successfully"); // 디버그 로그
      message.success(isDraft ? "폼이 임시저장되었습니다." : "폼이 저장되었습니다.");

      if (!isDraft) {
        router.push(`/groups/${groupId}/forms`);
      }
    } catch (error) {
      console.error("폼 저장 전체 오류:", error);

      if (error instanceof Error) {
        if (error.message.includes("질문")) {
          message.error(error.message);
        } else {
          message.error(`폼 저장 중 오류가 발생했습니다: ${error.message}`);
        }
      } else {
        message.error("폼 저장 중 알 수 없는 오류가 발생했습니다.");
      }
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
      await saveForm(false);

      // 전송 요청
      const sendRequest: SendFormRequest = {
        formId: currentFormId || editId || "",
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
      <Card title="폼 기본 정보" className="shadow-sm">
        <Form
          form={form}
          layout="vertical"
          onValuesChange={(changedValues, allValues) => {
            console.log("Form values changed:", changedValues, allValues); // 디버그 로그
            setFormData((prev) => ({ ...prev, ...allValues }));
          }}
          preserve={false}
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
                <Tag color="blue" className="px-4 py-2 text-lg">
                  {isEditing ? "수정 중" : isDuplicating ? "복제 중" : "새 폼"}
                  {(isEditing || isDuplicating) && ` (ID: ${editId || duplicateId})`}
                </Tag>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="폼 설명" name="description">
            <TextArea placeholder="폼에 대한 설명을 입력하세요 (선택사항)" rows={3} />
          </Form.Item>
        </Form>
      </Card>

      {/* 담당자 연결 */}
      <Card title="담당자 연결" className="shadow-sm">
        <Alert
          message="담당자 안내"
          description="시간강사와 부장선생님을 지정하시면 폼 응답 후 자동으로 해당 담당자에게 알림이 발송됩니다."
          type="info"
          showIcon
          className="mb-4"
        />
        <Form
          form={form}
          preserve={false}
          onValuesChange={(changedValues, allValues) => {
            console.log("Teacher form values changed:", changedValues, allValues); // 디버그 로그
            setFormData((prev) => ({ ...prev, ...allValues }));
          }}
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="시간강사" name="timeTeacherId">
                <Select placeholder="시간강사를 선택하세요" allowClear size="large">
                  {teachers
                    .filter(
                      (t) =>
                        t.group_roles?.name === "time_teacher" || t.group_roles?.can_create_form
                    )
                    .map((teacher) => (
                      <Select.Option key={teacher.user_id} value={teacher.user_id}>
                        {teacher.users?.name} ({teacher.users?.nickname})
                      </Select.Option>
                    ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="부장선생님" name="teacherId">
                <Select placeholder="부장선생님을 선택하세요" allowClear size="large">
                  {teachers
                    .filter(
                      (t) =>
                        t.group_roles?.name === "teacher" ||
                        t.group_roles?.name === "owner" ||
                        t.group_roles?.can_create_form
                    )
                    .map((teacher) => (
                      <Select.Option key={teacher.user_id} value={teacher.user_id}>
                        {teacher.users?.name} ({teacher.users?.nickname})
                      </Select.Option>
                    ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* 질문 구역 */}
      <Card
        title={
          <div className="flex items-center justify-between">
            <span>질문 구성</span>
            <Text type="secondary">총 {questions.length}개 질문</Text>
          </div>
        }
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
            <Button type="primary" icon={<PlusOutlined />} size="large">
              질문 추가
            </Button>
          </Dropdown>
        }
        className="shadow-sm"
      >
        {questions.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="아직 추가된 질문이 없습니다"
            className="py-8"
          >
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => addQuestion("text")}
              size="large"
            >
              첫 번째 질문 추가하기
            </Button>
          </Empty>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="questions" isDropDisabled={false}>
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  style={{ minHeight: "200px" }}
                >
                  {questions.map((question, index) => (
                    <Draggable
                      key={question.id || `question-${index}`}
                      draggableId={question.id || `question-${index}`}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={{
                            ...provided.draggableProps.style,
                            opacity: snapshot.isDragging ? 0.8 : 1,
                          }}
                        >
                          <QuestionCard
                            question={question}
                            index={index}
                            onUpdate={(updates) => updateQuestion(index, updates)}
                            onDelete={() => deleteQuestion(index)}
                            isExpanded={expandedQuestionIndex === index}
                            onToggleExpand={() =>
                              setExpandedQuestionIndex(
                                expandedQuestionIndex === index ? null : index
                              )
                            }
                            hasExamQuestion={hasExamQuestion}
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

      {/* 액션 버튼 */}
      <Card className="shadow-sm">
        <Flex justify="space-between" align="center">
          <Button onClick={() => router.push(`/groups/${groupId}/forms`)} size="large">
            취소
          </Button>

          <Space size="middle">
            <Button
              icon={<SaveOutlined />}
              onClick={() => saveForm(true)}
              loading={saving}
              size="large"
            >
              임시저장
            </Button>
            <Button
              type="default"
              icon={<SaveOutlined />}
              onClick={() => saveForm(false)}
              loading={saving}
              size="large"
            >
              저장
            </Button>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={() => setSendModalOpen(true)}
              loading={sending}
              disabled={questions.length === 0}
              size="large"
            >
              저장 및 전송
            </Button>
          </Space>
        </Flex>
      </Card>

      {/* 전송 모달 */}
      <SendFormModal
        open={sendModalOpen}
        onCancel={() => setSendModalOpen(false)}
        onConfirm={sendFormHandler}
        loading={sending}
      />

      {/* CSS 애니메이션 추가 */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
