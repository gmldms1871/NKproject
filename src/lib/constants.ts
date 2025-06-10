// lib/constants.ts
// 애플리케이션 전체에서 사용되는 상수들 정의

/**
 * 애플리케이션 메타데이터
 */
export const APP_CONFIG = {
  NAME: "그룹 기반 학원 플랫폼",
  VERSION: "1.0.0",
  DESCRIPTION: "그룹 기반 학원 관리 및 폼 시스템",
  AUTHOR: "Academy Platform Team",
  CONTACT_EMAIL: "support@academy-platform.com",
  WEBSITE: "https://academy-platform.com",
} as const;

/**
 * 환경 설정
 */
export const ENVIRONMENT = {
  DEVELOPMENT: "development",
  PRODUCTION: "production",
  TEST: "test",
} as const;

/**
 * 사용자 역할 상수
 */
export const USER_ROLES = {
  ADMIN: "admin",
  TEACHER: "teacher",
  PART_TIME: "part_time",
  STUDENT: "student",
} as const;

/**
 * 사용자 역할 한글명
 */
export const USER_ROLE_LABELS = {
  [USER_ROLES.ADMIN]: "관리자",
  [USER_ROLES.TEACHER]: "선생님",
  [USER_ROLES.PART_TIME]: "시간제 강사",
  [USER_ROLES.STUDENT]: "학생",
} as const;

/**
 * 폼 인스턴스 상태
 */
export const FORM_INSTANCE_STATUS = {
  NOT_STARTED: "not_started",
  STUDENT_COMPLETED: "student_completed",
  PART_TIME_COMPLETED: "part_time_completed",
  TEACHER_COMPLETED: "teacher_completed",
  FINAL_COMPLETED: "final_completed",
} as const;

/**
 * 폼 인스턴스 상태 한글명
 */
export const FORM_INSTANCE_STATUS_LABELS = {
  [FORM_INSTANCE_STATUS.NOT_STARTED]: "미시작",
  [FORM_INSTANCE_STATUS.STUDENT_COMPLETED]: "학생 완료",
  [FORM_INSTANCE_STATUS.PART_TIME_COMPLETED]: "시간제 강사 완료",
  [FORM_INSTANCE_STATUS.TEACHER_COMPLETED]: "선생님 완료",
  [FORM_INSTANCE_STATUS.FINAL_COMPLETED]: "최종 완료",
} as const;

/**
 * 보고서 상태
 */
export const REPORT_STATUS = {
  STAGE_0: "stage_0",
  STAGE_1: "stage_1",
  STAGE_2: "stage_2",
  COMPLETED: "completed",
} as const;

/**
 * 보고서 상태 한글명
 */
export const REPORT_STATUS_LABELS = {
  [REPORT_STATUS.STAGE_0]: "0단계 (학생 미완료)",
  [REPORT_STATUS.STAGE_1]: "1단계 (시간제 강사 검토)",
  [REPORT_STATUS.STAGE_2]: "2단계 (선생님 검토)",
  [REPORT_STATUS.COMPLETED]: "최종 완료",
} as const;

/**
 * 초대 상태
 */
export const INVITATION_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  EXPIRED: "expired",
} as const;

/**
 * 초대 상태 한글명
 */
export const INVITATION_STATUS_LABELS = {
  [INVITATION_STATUS.PENDING]: "대기 중",
  [INVITATION_STATUS.ACCEPTED]: "수락됨",
  [INVITATION_STATUS.REJECTED]: "거절됨",
  [INVITATION_STATUS.EXPIRED]: "만료됨",
} as const;

/**
 * 알림 타입
 */
export const NOTIFICATION_TYPES = {
  INVITATION: "invitation",
  FORM_ASSIGNED: "form_assigned",
  FORM_REJECTED: "form_rejected",
  REPORT_READY: "report_ready",
  SYSTEM_ANNOUNCEMENT: "system_announcement",
} as const;

/**
 * 알림 타입 한글명
 */
export const NOTIFICATION_TYPE_LABELS = {
  [NOTIFICATION_TYPES.INVITATION]: "초대 알림",
  [NOTIFICATION_TYPES.FORM_ASSIGNED]: "폼 배정",
  [NOTIFICATION_TYPES.FORM_REJECTED]: "폼 반려",
  [NOTIFICATION_TYPES.REPORT_READY]: "보고서 완성",
  [NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT]: "시스템 공지",
} as const;

/**
 * 폼 필드 타입
 */
export const FORM_FIELD_TYPES = {
  TEXT: "text",
  TEXTAREA: "textarea",
  NUMBER: "number",
  PHONE: "phone",
  WORD: "word",
  MONEY: "money",
  RATING: "rating",
  EXAM_NUMBER: "exam_number",
} as const;

/**
 * 폼 필드 타입 한글명
 */
export const FORM_FIELD_TYPE_LABELS = {
  [FORM_FIELD_TYPES.TEXT]: "단일행 텍스트",
  [FORM_FIELD_TYPES.TEXTAREA]: "여러행 텍스트",
  [FORM_FIELD_TYPES.NUMBER]: "숫자",
  [FORM_FIELD_TYPES.PHONE]: "전화번호",
  [FORM_FIELD_TYPES.WORD]: "단어",
  [FORM_FIELD_TYPES.MONEY]: "금액",
  [FORM_FIELD_TYPES.RATING]: "별점",
  [FORM_FIELD_TYPES.EXAM_NUMBER]: "시험번호",
} as const;

/**
 * 폼 필드 작성자 역할
 */
export const FORM_FIELD_FILLED_BY = {
  STUDENT: "student",
  PART_TIME: "part_time",
  TEACHER: "teacher",
} as const;

/**
 * 상태별 색상 클래스
 */
export const STATUS_COLORS = {
  // 폼 인스턴스 상태
  [FORM_INSTANCE_STATUS.NOT_STARTED]: "bg-gray-100 text-gray-800",
  [FORM_INSTANCE_STATUS.STUDENT_COMPLETED]: "bg-blue-100 text-blue-800",
  [FORM_INSTANCE_STATUS.PART_TIME_COMPLETED]: "bg-yellow-100 text-yellow-800",
  [FORM_INSTANCE_STATUS.TEACHER_COMPLETED]: "bg-orange-100 text-orange-800",
  [FORM_INSTANCE_STATUS.FINAL_COMPLETED]: "bg-green-100 text-green-800",

  // 보고서 상태
  [REPORT_STATUS.STAGE_0]: "bg-gray-100 text-gray-800",
  [REPORT_STATUS.STAGE_1]: "bg-blue-100 text-blue-800",
  [REPORT_STATUS.STAGE_2]: "bg-yellow-100 text-yellow-800",
  [REPORT_STATUS.COMPLETED]: "bg-green-100 text-green-800",

  // 초대 상태
  [INVITATION_STATUS.PENDING]: "bg-yellow-100 text-yellow-800",
  [INVITATION_STATUS.ACCEPTED]: "bg-green-100 text-green-800",
  [INVITATION_STATUS.REJECTED]: "bg-red-100 text-red-800",
  [INVITATION_STATUS.EXPIRED]: "bg-gray-100 text-gray-800",

  // 사용자 역할
  [USER_ROLES.ADMIN]: "bg-purple-100 text-purple-800",
  [USER_ROLES.TEACHER]: "bg-indigo-100 text-indigo-800",
  [USER_ROLES.PART_TIME]: "bg-cyan-100 text-cyan-800",
  [USER_ROLES.STUDENT]: "bg-green-100 text-green-800",
} as const;

/**
 * 기본 페이지네이션 설정
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const;

/**
 * API 응답 코드
 */
export const API_RESPONSE_CODES = {
  SUCCESS: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * 로컬 스토리지 키
 */
export const LOCAL_STORAGE_KEYS = {
  AUTH_TOKEN: "academy_auth_token",
  USER_PREFERENCES: "academy_user_preferences",
  CURRENT_GROUP: "academy_current_group",
  THEME: "academy_theme",
  LANGUAGE: "academy_language",
  FORM_DRAFT: "academy_form_draft",
  NOTIFICATION_SETTINGS: "academy_notification_settings",
} as const;

/**
 * 세션 스토리지 키
 */
export const SESSION_STORAGE_KEYS = {
  FORM_PROGRESS: "academy_form_progress",
  SEARCH_FILTERS: "academy_search_filters",
  CURRENT_TAB: "academy_current_tab",
} as const;

/**
 * 날짜 형식
 */
export const DATE_FORMATS = {
  FULL: "YYYY년 MM월 DD일 HH:mm:ss",
  DATE_ONLY: "YYYY년 MM월 DD일",
  TIME_ONLY: "HH:mm:ss",
  SHORT: "MM/DD",
  ISO: "YYYY-MM-DDTHH:mm:ss.sssZ",
  FILENAME: "YYYYMMDD_HHmmss",
} as const;

/**
 * 정규 표현식 패턴
 */
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_KR: /^01[0-9]\d{8}$/,
  PASSWORD_STRONG: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  KOREAN_NAME: /^[가-힣]{2,10}$/,
  ENGLISH_NAME: /^[a-zA-Z\s]{2,50}$/,
  STUDENT_NUMBER: /^\d{4,10}$/,
  MONEY: /^\d{1,3}(,\d{3})*$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
} as const;

/**
 * 파일 관련 상수
 */
export const FILE_CONSTANTS = {
  MAX_UPLOAD_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  ALLOWED_DOCUMENT_TYPES: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
  UPLOAD_TIMEOUT: 30000, // 30초
  CHUNK_SIZE: 1024 * 1024, // 1MB
} as const;

/**
 * 에러 메시지
 */
export const ERROR_MESSAGES = {
  GENERIC: "오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
  NETWORK: "네트워크 연결을 확인해 주세요.",
  UNAUTHORIZED: "로그인이 필요합니다.",
  FORBIDDEN: "접근 권한이 없습니다.",
  NOT_FOUND: "요청한 리소스를 찾을 수 없습니다.",
  VALIDATION: "입력 정보를 확인해 주세요.",
  FILE_TOO_LARGE: "파일 크기가 너무 큽니다.",
  INVALID_FILE_TYPE: "지원하지 않는 파일 형식입니다.",
  EMAIL_REQUIRED: "이메일을 입력해 주세요.",
  PASSWORD_REQUIRED: "비밀번호를 입력해 주세요.",
  NAME_REQUIRED: "이름을 입력해 주세요.",
  PHONE_INVALID: "올바른 전화번호를 입력해 주세요.",
  EMAIL_INVALID: "올바른 이메일 주소를 입력해 주세요.",
  PASSWORD_WEAK: "비밀번호는 8자 이상이며 대소문자, 숫자, 특수문자를 포함해야 합니다.",
  FORM_SUBMISSION_FAILED: "폼 제출에 실패했습니다.",
  REPORT_GENERATION_FAILED: "보고서 생성에 실패했습니다.",
  INVITATION_SEND_FAILED: "초대 전송에 실패했습니다.",
  GROUP_CREATE_FAILED: "그룹 생성에 실패했습니다.",
  CLASS_CREATE_FAILED: "반 생성에 실패했습니다.",
} as const;

/**
 * 성공 메시지
 */
export const SUCCESS_MESSAGES = {
  FORM_SUBMITTED: "폼이 성공적으로 제출되었습니다.",
  REPORT_GENERATED: "보고서가 성공적으로 생성되었습니다.",
  INVITATION_SENT: "초대가 성공적으로 전송되었습니다.",
  GROUP_CREATED: "그룹이 성공적으로 생성되었습니다.",
  CLASS_CREATED: "반이 성공적으로 생성되었습니다.",
  USER_UPDATED: "사용자 정보가 업데이트되었습니다.",
  PASSWORD_CHANGED: "비밀번호가 변경되었습니다.",
  EMAIL_VERIFIED: "이메일 인증이 완료되었습니다.",
  FILE_UPLOADED: "파일이 성공적으로 업로드되었습니다.",
  DATA_EXPORTED: "데이터가 성공적으로 내보내기되었습니다.",
  SETTINGS_SAVED: "설정이 저장되었습니다.",
} as const;

/**
 * 확인 메시지
 */
export const CONFIRMATION_MESSAGES = {
  DELETE_GROUP: "정말로 이 그룹을 삭제하시겠습니까?",
  DELETE_CLASS: "정말로 이 반을 삭제하시겠습니까?",
  DELETE_FORM: "정말로 이 폼을 삭제하시겠습니까?",
  DELETE_USER: "정말로 이 사용자를 삭제하시겠습니까?",
  REMOVE_MEMBER: "정말로 이 멤버를 제거하시겠습니까?",
  SEND_FORM: "정말로 이 폼을 전송하시겠습니까?",
  FINALIZE_REPORT: "보고서를 최종 완료하시겠습니까? 완료 후에는 수정할 수 없습니다.",
  REJECT_FORM: "정말로 이 폼을 반려하시겠습니까?",
  LEAVE_GROUP: "정말로 이 그룹을 나가시겠습니까?",
  CANCEL_INVITATION: "정말로 이 초대를 취소하시겠습니까?",
} as const;

/**
 * 폼 관련 상수
 */
export const FORM_CONSTANTS = {
  MAX_TITLE_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_FIELD_NAME_LENGTH: 50,
  MAX_HELP_TEXT_LENGTH: 200,
  MAX_PLACEHOLDER_LENGTH: 100,
  MAX_FIELDS_PER_FORM: 50,
  MAX_OPTIONS_PER_FIELD: 20,
  MAX_QUESTION_CONCEPTS: 100,
  MIN_RATING: 0,
  MAX_RATING: 5,
  RATING_STEP: 0.5,
} as const;

/**
 * 통계 관련 상수
 */
export const STATISTICS_CONSTANTS = {
  DEFAULT_PERIOD_DAYS: 30,
  MAX_PERIOD_DAYS: 365,
  CHART_COLORS: [
    "#3B82F6",
    "#EF4444",
    "#10B981",
    "#F59E0B",
    "#8B5CF6",
    "#06B6D4",
    "#84CC16",
    "#F97316",
  ],
  COMPLETION_RATE_COLORS: {
    LOW: "#EF4444", // 빨강 (30% 이하)
    MEDIUM: "#F59E0B", // 주황 (30-70%)
    HIGH: "#10B981", // 초록 (70% 이상)
  },
} as const;

/**
 * 보고서 관련 상수
 */
export const REPORT_CONSTANTS = {
  MAX_CONTENT_LENGTH: 5000,
  MAX_STAGE1_CONTENT: 2000,
  MAX_STAGE2_CONTENT: 3000,
  AI_PROCESSING_TIMEOUT: 60000, // 1분
  EXPORT_FORMATS: ["pdf", "docx", "html"],
  TEMPLATE_TYPES: ["standard", "detailed", "summary"],
} as const;

/**
 * 알림 관련 상수
 */
export const NOTIFICATION_CONSTANTS = {
  MAX_TITLE_LENGTH: 100,
  MAX_MESSAGE_LENGTH: 500,
  RETENTION_DAYS: 30,
  BATCH_SIZE: 50,
  REAL_TIME_EVENTS: ["new_notification", "notification_read", "notification_deleted"],
} as const;

/**
 * 이메일 관련 상수
 */
export const EMAIL_CONSTANTS = {
  FROM_ADDRESS: "noreply@academy-platform.com",
  REPLY_TO: "support@academy-platform.com",
  TEMPLATES: {
    INVITATION: "invitation",
    FORM_ASSIGNED: "form_assigned",
    REPORT_READY: "report_ready",
    PASSWORD_RESET: "password_reset",
    WELCOME: "welcome",
  },
  RETRY_COUNT: 3,
  TIMEOUT: 10000, // 10초
} as const;

/**
 * 캐시 관련 상수
 */
export const CACHE_CONSTANTS = {
  TTL: {
    SHORT: 5 * 60 * 1000, // 5분
    MEDIUM: 30 * 60 * 1000, // 30분
    LONG: 2 * 60 * 60 * 1000, // 2시간
    VERY_LONG: 24 * 60 * 60 * 1000, // 24시간
  },
  KEYS: {
    USER_PROFILE: "user_profile",
    GROUP_STATS: "group_stats",
    FORM_TEMPLATES: "form_templates",
    NOTIFICATIONS: "notifications",
  },
} as const;

/**
 * 테마 관련 상수
 */
export const THEME_CONSTANTS = {
  LIGHT: "light",
  DARK: "dark",
  SYSTEM: "system",
  COLORS: {
    PRIMARY: "#3B82F6",
    SECONDARY: "#6B7280",
    SUCCESS: "#10B981",
    WARNING: "#F59E0B",
    ERROR: "#EF4444",
    INFO: "#06B6D4",
  },
} as const;

/**
 * 언어 관련 상수
 */
export const LANGUAGE_CONSTANTS = {
  KOREAN: "ko",
  ENGLISH: "en",
  DEFAULT: "ko",
  SUPPORTED: ["ko", "en"],
} as const;

/**
 * 브라우저 지원 관련 상수
 */
export const BROWSER_SUPPORT = {
  MIN_VERSIONS: {
    CHROME: 90,
    FIREFOX: 88,
    SAFARI: 14,
    EDGE: 90,
  },
  FEATURES: {
    WEB_CRYPTO: "crypto" in window,
    LOCAL_STORAGE: "localStorage" in window,
    SESSION_STORAGE: "sessionStorage" in window,
    WEBSOCKETS: "WebSocket" in window,
    FILE_API: "File" in window,
  },
} as const;

/**
 * 개발 관련 상수
 */
export const DEV_CONSTANTS = {
  LOG_LEVELS: ["debug", "info", "warn", "error"],
  DEBUG_MODE: process.env.NODE_ENV === "development",
  API_DELAY: process.env.NODE_ENV === "development" ? 500 : 0,
  MOCK_DATA: process.env.NODE_ENV === "development",
} as const;

/**
 * 외부 서비스 상수
 */
export const EXTERNAL_SERVICES = {
  GEMINI_API: {
    BASE_URL: "https://generativelanguage.googleapis.com/v1beta",
    MODEL: "gemini-pro",
    MAX_TOKENS: 4096,
    TEMPERATURE: 0.7,
  },
  ANALYTICS: {
    GA_ID: process.env.NEXT_PUBLIC_GA_ID,
    HOTJAR_ID: process.env.NEXT_PUBLIC_HOTJAR_ID,
  },
} as const;

/**
 * 메타 정보
 */
export const META = {
  CHARSET: "utf-8",
  VIEWPORT: "width=device-width, initial-scale=1",
  THEME_COLOR: "#3B82F6",
  DESCRIPTION: "효율적인 그룹 기반 학원 관리 및 평가 시스템",
  KEYWORDS: "학원관리, 평가시스템, 교육플랫폼, 온라인학습",
  AUTHOR: "Academy Platform Team",
  ROBOTS: "index, follow",
  OG_TYPE: "website",
  OG_SITE_NAME: "그룹 기반 학원 플랫폼",
} as const;

/**
 * 기본 내보내기
 */
export default {
  APP_CONFIG,
  USER_ROLES,
  USER_ROLE_LABELS,
  FORM_INSTANCE_STATUS,
  FORM_INSTANCE_STATUS_LABELS,
  REPORT_STATUS,
  REPORT_STATUS_LABELS,
  INVITATION_STATUS,
  INVITATION_STATUS_LABELS,
  NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_LABELS,
  FORM_FIELD_TYPES,
  FORM_FIELD_TYPE_LABELS,
  STATUS_COLORS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  CONFIRMATION_MESSAGES,
} as const;
