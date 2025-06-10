// lib/validation.ts
// 데이터 검증 관련 함수들 - 이메일, 전화번호, 폼 데이터, 권한 검증 등

import type { UserRole, FormFieldType, CreateFormData } from "./types";

/**
 * 검증 결과 타입
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * 필드별 검증 결과 타입
 */
export interface FieldValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * 이메일 주소 검증
 * @param email 이메일 주소
 * @returns 검증 결과
 */
export function validateEmail(email: string): FieldValidationResult {
  if (!email || email.trim() === "") {
    return { isValid: false, error: "이메일을 입력해 주세요." };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: "유효한 이메일 주소를 입력해 주세요." };
  }

  if (email.length > 254) {
    return { isValid: false, error: "이메일 주소가 너무 깁니다." };
  }

  return { isValid: true };
}

/**
 * 비밀번호 검증
 * @param password 비밀번호
 * @param options 검증 옵션
 * @returns 검증 결과
 */
export function validatePassword(
  password: string,
  options: {
    minLength?: number;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
    requireNumbers?: boolean;
    requireSpecialChars?: boolean;
  } = {}
): FieldValidationResult {
  const {
    minLength = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSpecialChars = false,
  } = options;

  if (!password || password.trim() === "") {
    return { isValid: false, error: "비밀번호를 입력해 주세요." };
  }

  if (password.length < minLength) {
    return { isValid: false, error: `비밀번호는 최소 ${minLength}자 이상이어야 합니다.` };
  }

  if (requireUppercase && !/[A-Z]/.test(password)) {
    return { isValid: false, error: "비밀번호에 대문자가 포함되어야 합니다." };
  }

  if (requireLowercase && !/[a-z]/.test(password)) {
    return { isValid: false, error: "비밀번호에 소문자가 포함되어야 합니다." };
  }

  if (requireNumbers && !/\d/.test(password)) {
    return { isValid: false, error: "비밀번호에 숫자가 포함되어야 합니다." };
  }

  if (requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { isValid: false, error: "비밀번호에 특수문자가 포함되어야 합니다." };
  }

  return { isValid: true };
}

/**
 * 한국 전화번호 검증
 * @param phone 전화번호
 * @returns 검증 결과
 */
export function validateKoreanPhone(phone: string): FieldValidationResult {
  if (!phone || phone.trim() === "") {
    return { isValid: false, error: "전화번호를 입력해 주세요." };
  }

  // 숫자만 추출
  const cleanedPhone = phone.replace(/\D/g, "");

  // 한국 전화번호 패턴 (010, 011, 016, 017, 018, 019로 시작하는 11자리 또는 지역번호)
  const mobileRegex = /^01[0-9]\d{8}$/;
  const landlineRegex = /^0(2|3[1-3]|4[1-4]|5[1-5]|6[1-4])\d{7,8}$/;

  if (!mobileRegex.test(cleanedPhone) && !landlineRegex.test(cleanedPhone)) {
    return { isValid: false, error: "유효한 전화번호를 입력해 주세요." };
  }

  return { isValid: true };
}

/**
 * 이름 검증
 * @param name 이름
 * @param options 검증 옵션
 * @returns 검증 결과
 */
export function validateName(
  name: string,
  options: {
    minLength?: number;
    maxLength?: number;
    allowEnglish?: boolean;
    allowNumbers?: boolean;
  } = {}
): FieldValidationResult {
  const { minLength = 2, maxLength = 50, allowEnglish = true, allowNumbers = false } = options;

  if (!name || name.trim() === "") {
    return { isValid: false, error: "이름을 입력해 주세요." };
  }

  const trimmedName = name.trim();

  if (trimmedName.length < minLength) {
    return { isValid: false, error: `이름은 최소 ${minLength}자 이상이어야 합니다.` };
  }

  if (trimmedName.length > maxLength) {
    return { isValid: false, error: `이름은 최대 ${maxLength}자까지 입력 가능합니다.` };
  }

  // 한글, 영문, 숫자, 공백만 허용
  let allowedPattern = /^[가-힣\s]+$/;
  if (allowEnglish && allowNumbers) {
    allowedPattern = /^[가-힣a-zA-Z0-9\s]+$/;
  } else if (allowEnglish) {
    allowedPattern = /^[가-힣a-zA-Z\s]+$/;
  } else if (allowNumbers) {
    allowedPattern = /^[가-힣0-9\s]+$/;
  }

  if (!allowedPattern.test(trimmedName)) {
    return { isValid: false, error: "이름에 허용되지 않은 문자가 포함되어 있습니다." };
  }

  return { isValid: true };
}

/**
 * 생년월일 검증
 * @param birthDate 생년월일 (YYYY-MM-DD 형식)
 * @returns 검증 결과
 */
export function validateBirthDate(birthDate: string): FieldValidationResult {
  if (!birthDate || birthDate.trim() === "") {
    return { isValid: false, error: "생년월일을 입력해 주세요." };
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(birthDate)) {
    return { isValid: false, error: "YYYY-MM-DD 형식으로 입력해 주세요." };
  }

  const date = new Date(birthDate);
  const today = new Date();

  if (isNaN(date.getTime())) {
    return { isValid: false, error: "유효한 날짜를 입력해 주세요." };
  }

  if (date > today) {
    return { isValid: false, error: "미래 날짜는 입력할 수 없습니다." };
  }

  // 너무 오래된 날짜 체크 (120년 전)
  const minDate = new Date();
  minDate.setFullYear(today.getFullYear() - 120);
  if (date < minDate) {
    return { isValid: false, error: "유효한 생년월일을 입력해 주세요." };
  }

  return { isValid: true };
}

/**
 * 사용자 역할 검증
 * @param role 사용자 역할
 * @returns 검증 결과
 */
export function validateUserRole(role: string): FieldValidationResult {
  const validRoles: UserRole[] = ["admin", "teacher", "part_time", "student"];

  if (!validRoles.includes(role as UserRole)) {
    return { isValid: false, error: "유효하지 않은 사용자 역할입니다." };
  }

  return { isValid: true };
}

/**
 * 폼 필드 값 검증
 * @param fieldType 필드 타입
 * @param value 값
 * @param isRequired 필수 여부
 * @param options 필드별 옵션
 * @returns 검증 결과
 */
export function validateFormFieldValue(
  fieldType: FormFieldType,
  value: any,
  isRequired: boolean = false,
  options?: any
): FieldValidationResult {
  // 필수 필드 검증
  if (isRequired && (value === null || value === undefined || value === "")) {
    return { isValid: false, error: "필수 입력 항목입니다." };
  }

  // 빈 값이고 필수가 아니면 통과
  if (!isRequired && (value === null || value === undefined || value === "")) {
    return { isValid: true };
  }

  switch (fieldType) {
    case "text":
    case "textarea":
      return validateTextValue(value, options);

    case "number":
      return validateNumberValue(value, options);

    case "phone":
      return validateKoreanPhone(value);

    case "word":
      return validateWordValue(value, options);

    case "money":
      return validateMoneyValue(value, options);

    case "rating":
      return validateRatingValue(value, options);

    case "exam_number":
      return validateExamNumberValue(value, options);

    default:
      return { isValid: true };
  }
}

/**
 * 텍스트 값 검증
 */
function validateTextValue(
  value: string,
  options?: {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
  }
): FieldValidationResult {
  const { minLength = 0, maxLength = 1000, pattern } = options || {};

  if (typeof value !== "string") {
    return { isValid: false, error: "텍스트 형식이 아닙니다." };
  }

  if (value.length < minLength) {
    return { isValid: false, error: `최소 ${minLength}자 이상 입력해 주세요.` };
  }

  if (value.length > maxLength) {
    return { isValid: false, error: `최대 ${maxLength}자까지 입력 가능합니다.` };
  }

  if (pattern && !pattern.test(value)) {
    return { isValid: false, error: "입력 형식이 올바르지 않습니다." };
  }

  return { isValid: true };
}

/**
 * 숫자 값 검증
 */
function validateNumberValue(
  value: any,
  options?: {
    min?: number;
    max?: number;
    integer?: boolean;
  }
): FieldValidationResult {
  const { min, max, integer = false } = options || {};

  const num = Number(value);
  if (isNaN(num)) {
    return { isValid: false, error: "숫자를 입력해 주세요." };
  }

  if (integer && !Number.isInteger(num)) {
    return { isValid: false, error: "정수를 입력해 주세요." };
  }

  if (min !== undefined && num < min) {
    return { isValid: false, error: `${min} 이상의 값을 입력해 주세요.` };
  }

  if (max !== undefined && num > max) {
    return { isValid: false, error: `${max} 이하의 값을 입력해 주세요.` };
  }

  return { isValid: true };
}

/**
 * 단어 값 검증
 */
function validateWordValue(
  value: string,
  options?: {
    maxWords?: number;
    allowedChars?: RegExp;
  }
): FieldValidationResult {
  const { maxWords = 10, allowedChars = /^[가-힣a-zA-Z0-9\s]+$/ } = options || {};

  if (!allowedChars.test(value)) {
    return { isValid: false, error: "허용되지 않은 문자가 포함되어 있습니다." };
  }

  const words = value
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);
  if (words.length > maxWords) {
    return { isValid: false, error: `최대 ${maxWords}개의 단어까지 입력 가능합니다.` };
  }

  return { isValid: true };
}

/**
 * 금액 값 검증
 */
function validateMoneyValue(
  value: any,
  options?: {
    min?: number;
    max?: number;
    currency?: string;
  }
): FieldValidationResult {
  const { min = 0, max = 999999999, currency = "KRW" } = options || {};

  const amount = Number(value);
  if (isNaN(amount)) {
    return { isValid: false, error: "유효한 금액을 입력해 주세요." };
  }

  if (amount < 0) {
    return { isValid: false, error: "음수는 입력할 수 없습니다." };
  }

  if (amount < min) {
    return { isValid: false, error: `최소 ${min}원 이상 입력해 주세요.` };
  }

  if (amount > max) {
    return { isValid: false, error: `최대 ${max}원까지 입력 가능합니다.` };
  }

  return { isValid: true };
}

/**
 * 별점 값 검증
 */
function validateRatingValue(
  value: any,
  options?: {
    min?: number;
    max?: number;
    step?: number;
  }
): FieldValidationResult {
  const { min = 0, max = 5, step = 0.5 } = options || {};

  const rating = Number(value);
  if (isNaN(rating)) {
    return { isValid: false, error: "유효한 평점을 선택해 주세요." };
  }

  if (rating < min || rating > max) {
    return { isValid: false, error: `${min}점에서 ${max}점 사이의 값을 선택해 주세요.` };
  }

  // step 단위 검증
  if ((rating - min) % step !== 0) {
    return { isValid: false, error: `${step}점 단위로 선택해 주세요.` };
  }

  return { isValid: true };
}

/**
 * 시험번호 값 검증
 */
function validateExamNumberValue(
  value: any,
  options?: {
    totalQuestions?: number;
    requireExplanation?: boolean;
  }
): FieldValidationResult {
  const { totalQuestions = 100, requireExplanation = false } = options || {};

  if (typeof value === "object" && value !== null) {
    const { answer, explanation } = value;

    // 답안 번호 검증
    const answerNum = Number(answer);
    if (isNaN(answerNum) || !Number.isInteger(answerNum)) {
      return { isValid: false, error: "문제 번호는 정수여야 합니다." };
    }

    if (answerNum < 1 || answerNum > totalQuestions) {
      return {
        isValid: false,
        error: `1번부터 ${totalQuestions}번까지의 문제 번호를 입력해 주세요.`,
      };
    }

    // 설명 검증 (필요한 경우)
    if (requireExplanation && (!explanation || explanation.trim() === "")) {
      return { isValid: false, error: "설명을 입력해 주세요." };
    }

    return { isValid: true };
  } else {
    // 단순 번호만 입력한 경우
    const answerNum = Number(value);
    if (isNaN(answerNum) || !Number.isInteger(answerNum)) {
      return { isValid: false, error: "문제 번호는 정수여야 합니다." };
    }

    if (answerNum < 1 || answerNum > totalQuestions) {
      return {
        isValid: false,
        error: `1번부터 ${totalQuestions}번까지의 문제 번호를 입력해 주세요.`,
      };
    }

    return { isValid: true };
  }
}

/**
 * 폼 템플릿 생성 데이터 검증
 * @param formData 폼 생성 데이터
 * @returns 검증 결과
 */
export function validateCreateFormData(formData: CreateFormData): ValidationResult {
  const errors: string[] = [];

  // 제목 검증
  if (!formData.title || formData.title.trim() === "") {
    errors.push("폼 제목을 입력해 주세요.");
  } else if (formData.title.length > 100) {
    errors.push("폼 제목은 100자 이하로 입력해 주세요.");
  }

  // 그룹 ID 검증
  if (!formData.group_id || formData.group_id.trim() === "") {
    errors.push("그룹 ID가 필요합니다.");
  }

  // 필드 검증
  if (!formData.fields || formData.fields.length === 0) {
    errors.push("최소 하나 이상의 필드가 필요합니다.");
  } else {
    formData.fields.forEach((field, index) => {
      if (!field.field_name || field.field_name.trim() === "") {
        errors.push(`${index + 1}번째 필드의 이름을 입력해 주세요.`);
      }

      if (!field.field_type) {
        errors.push(`${index + 1}번째 필드의 타입을 선택해 주세요.`);
      }

      if (!field.filled_by_role) {
        errors.push(`${index + 1}번째 필드의 작성자 역할을 선택해 주세요.`);
      }

      // 시험번호 필드의 경우 추가 검증
      if (field.field_type === "exam_number") {
        const examFields = formData.fields.filter((f) => f.field_type === "exam_number");
        if (examFields.length > 1) {
          errors.push("시험번호 필드는 폼당 하나만 허용됩니다.");
        }
      }
    });
  }

  // 시험번호 개념 검증 (시험번호 필드가 있는 경우)
  const hasExamField = formData.fields.some((field) => field.field_type === "exam_number");
  if (hasExamField) {
    if (!formData.question_concepts || formData.question_concepts.length === 0) {
      errors.push("시험번호 필드가 있는 경우 문제 개념을 입력해야 합니다.");
    } else {
      formData.question_concepts.forEach((concept, index) => {
        if (!concept.concept_name || concept.concept_name.trim() === "") {
          errors.push(`${index + 1}번째 문제 개념 이름을 입력해 주세요.`);
        }

        if (concept.question_number < 1) {
          errors.push(`${index + 1}번째 문제 번호는 1 이상이어야 합니다.`);
        }
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 그룹 초대 데이터 검증
 * @param email 이메일
 * @param role 역할
 * @returns 검증 결과
 */
export function validateInvitationData(email: string, role: UserRole): ValidationResult {
  const errors: string[] = [];

  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    errors.push(emailValidation.error!);
  }

  const roleValidation = validateUserRole(role);
  if (!roleValidation.isValid) {
    errors.push(roleValidation.error!);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 비밀번호 확인 검증
 * @param password 비밀번호
 * @param confirmPassword 비밀번호 확인
 * @returns 검증 결과
 */
export function validatePasswordConfirmation(
  password: string,
  confirmPassword: string
): FieldValidationResult {
  if (password !== confirmPassword) {
    return { isValid: false, error: "비밀번호가 일치하지 않습니다." };
  }

  return { isValid: true };
}

/**
 * 파일 업로드 검증
 * @param file 파일
 * @param options 옵션
 * @returns 검증 결과
 */
export function validateFileUpload(
  file: File,
  options: {
    maxSize?: number; // bytes
    allowedTypes?: string[];
    maxNameLength?: number;
  } = {}
): FieldValidationResult {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB
    allowedTypes = ["image/jpeg", "image/png", "image/gif", "application/pdf"],
    maxNameLength = 100,
  } = options;

  if (!file) {
    return { isValid: false, error: "파일을 선택해 주세요." };
  }

  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return { isValid: false, error: `파일 크기는 ${maxSizeMB}MB 이하여야 합니다.` };
  }

  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: "허용되지 않은 파일 형식입니다." };
  }

  if (file.name.length > maxNameLength) {
    return { isValid: false, error: `파일명은 ${maxNameLength}자 이하여야 합니다.` };
  }

  return { isValid: true };
}

/**
 * URL 검증
 * @param url URL 문자열
 * @returns 검증 결과
 */
export function validateUrl(url: string): FieldValidationResult {
  if (!url || url.trim() === "") {
    return { isValid: false, error: "URL을 입력해 주세요." };
  }

  try {
    new URL(url);
    return { isValid: true };
  } catch {
    return { isValid: false, error: "유효한 URL을 입력해 주세요." };
  }
}

/**
 * JSON 문자열 검증
 * @param jsonString JSON 문자열
 * @returns 검증 결과
 */
export function validateJsonString(jsonString: string): FieldValidationResult {
  if (!jsonString || jsonString.trim() === "") {
    return { isValid: false, error: "JSON 데이터를 입력해 주세요." };
  }

  try {
    JSON.parse(jsonString);
    return { isValid: true };
  } catch {
    return { isValid: false, error: "유효한 JSON 형식이 아닙니다." };
  }
}

/**
 * 여러 필드의 종합 검증
 * @param validations 검증 함수 배열
 * @returns 종합 검증 결과
 */
export function validateMultipleFields(
  validations: Array<() => FieldValidationResult>
): ValidationResult {
  const errors: string[] = [];

  validations.forEach((validation) => {
    const result = validation();
    if (!result.isValid && result.error) {
      errors.push(result.error);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}
