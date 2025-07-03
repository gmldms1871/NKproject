/**
 * 전화번호 자동 포맷팅 유틸리티
 */

/**
 * 전화번호에 하이픈 자동 추가
 * 3자리-4자리-4자리 형태로 포맷팅
 */
export const formatPhoneNumber = (value: string): string => {
  // 숫자만 추출
  const numbers = value.replace(/[^\d]/g, "");

  // 11자리 숫자로 제한
  const limitedNumbers = numbers.slice(0, 11);

  // 길이에 따라 포맷팅
  if (limitedNumbers.length <= 3) {
    return limitedNumbers;
  } else if (limitedNumbers.length <= 7) {
    return `${limitedNumbers.slice(0, 3)}-${limitedNumbers.slice(3)}`;
  } else {
    return `${limitedNumbers.slice(0, 3)}-${limitedNumbers.slice(3, 7)}-${limitedNumbers.slice(7)}`;
  }
};

/**
 * 전화번호에서 하이픈 제거
 */
export const removePhoneFormat = (value: string): string => {
  return value.replace(/[^\d]/g, "");
};

/**
 * 전화번호 유효성 검증 (포맷팅된 번호)
 */
export const validateFormattedPhone = (phone: string): boolean => {
  const phoneRegex = /^01[0-9]-\d{4}-\d{4}$/;
  return phoneRegex.test(phone);
};

/**
 * 전화번호 마스킹 (뒷자리 일부 숨김)
 */
export const maskPhoneNumber = (phone: string): string => {
  if (!phone || phone.length < 13) return phone;

  // 010-1234-5678 -> 010-****-5678
  const formatted = formatPhoneNumber(phone);
  if (formatted.length === 13) {
    return `${formatted.slice(0, 4)}****${formatted.slice(8)}`;
  }

  return phone;
};

/**
 * 전화번호 입력 이벤트 핸들러
 */
export const handlePhoneInputChange = (value: string, onChange: (value: string) => void) => {
  const formatted = formatPhoneNumber(value);
  onChange(formatted);
};

/**
 * Ant Design Input용 전화번호 포맷팅 핸들러
 */
export const phoneInputProps = {
  maxLength: 13,
  placeholder: "010-1234-5678",
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    // Input의 value를 직접 변경
    e.target.value = formatted;
  },
};
