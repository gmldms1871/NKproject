// 폼 상태
export type FormStatus = "draft" | "save" | "send";

// 폼 태그
export interface FormTag {
  id: string;
  name: string;
}

// 폼 타겟
export type FormTargetType = "user" | "class";
export interface FormTarget {
  id: string;
  target_id: string;
  target_type: FormTargetType;
}

// 폼 선생님 셋팅
export interface FormTeacher {
  user_id: string;
  role: "manager" | "assistant"; // 부장/시간강사
}

// 폼 질문 타입
export type QuestionType = "exam" | "rating" | "choice" | "text";
export type TextSubtype = "short" | "long"; // 주관식/서술형

// 폼 질문
export interface FormQuestionBase {
  id: string;
  form_id: string;
  order_index: number;
  question_text: string;
  question_type: QuestionType;
  is_required: boolean;
}

export interface ExamQuestion extends FormQuestionBase {
  question_type: "exam";
  concept_template_id: string;
  total_questions: number;
}

export interface RatingQuestion extends FormQuestionBase {
  question_type: "rating";
  rating_max: number;
  rating_step: 0.5 | 1;
}

export interface ChoiceOption {
  id: string;
  option_text: string;
  order_index: number;
}
export interface ChoiceQuestion extends FormQuestionBase {
  question_type: "choice";
  is_multiple: boolean;
  etc_option_enabled: boolean;
  options: ChoiceOption[];
}

export interface TextQuestion extends FormQuestionBase {
  question_type: "text";
  question_subtype: TextSubtype;
  char_limit: number;
}

export type FormQuestion = ExamQuestion | RatingQuestion | ChoiceQuestion | TextQuestion;

// 폼
export interface FormSummary {
  id: string;
  title: string;
  status: FormStatus;
  group_id: string;
  creator_id: string;
  created_at: string;
  updated_at: string;
  tags: FormTag[];
}

export interface FormDetail extends FormSummary {
  description?: string;
  sent_at?: string;
  questions: FormQuestion[];
  targets: FormTarget[];
  teachers: FormTeacher[];
}

// 개념 템플릿 (시험 타입)
export interface ConceptTemplate {
  id: string;
  name: string;
  concept_count: number;
  concepts: ConceptItem[];
  status: "draft" | "save";
  creator_id: string;
  group_id: string;
  created_at: string;
  updated_at: string;
}
export interface ConceptItem {
  id: string;
  concept_text: string;
  concept_description: string;
  order_index: number;
}

// 폼 응답
export interface FormResponse {
  id: string;
  form_id: string;
  responder_id: string;
  responder_type: FormTargetType;
  status: "draft" | "submitted";
  submitted_at?: string;
  answers: FormAnswer[];
}
export interface FormAnswer {
  question_id: string;
  answer: string | number | string[] | number[] | null;
  // 첨부파일 등 확장 가능
}

// 페이징/필터링
export interface Paging {
  page: number;
  limit: number;
}
export interface FormFilters {
  tag_ids?: string[];
  title?: string;
  target_id?: string;
  status?: FormStatus;
}
