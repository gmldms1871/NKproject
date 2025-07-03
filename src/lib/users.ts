import bcrypt from "bcryptjs";
import {
  supabase,
  supabaseAdmin,
  EDUCATION_LEVELS,
  validatePassword,
  validateEmail,
  validatePhone,
  EducationLevel,
} from "./supabase";
import { Database } from "./types/types";

// Export EDUCATION_LEVELS for use in components
export { EDUCATION_LEVELS } from "./supabase";

type User = Database["public"]["Tables"]["users"]["Row"];
type UserInsert = Database["public"]["Tables"]["users"]["Insert"];
type UserUpdate = Database["public"]["Tables"]["users"]["Update"];

// API 응답 타입 정의
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// 회원가입 요청 타입
export interface SignUpRequest {
  email: string;
  password: string;
  name: string;
  nickname: string;
  phone: string;
  birth_date: string;
  education: EducationLevel;
}

// 로그인 요청 타입
export interface SignInRequest {
  identifier: string; // 이메일 또는 전화번호
  password: string;
}

// 정보 수정 요청 타입
export interface UpdateProfileRequest {
  nickname?: string;
  birth_date?: string;
  education?: EducationLevel;
}

// 비밀번호 재설정 요청 타입
export interface ResetPasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * 회원가입
 * 모든 항목 필수 입력, 비밀번호는 해시 처리
 */
export const signUp = async (userData: SignUpRequest): Promise<ApiResponse<User>> => {
  try {
    // 입력 데이터 검증
    if (
      !userData.email ||
      !userData.password ||
      !userData.name ||
      !userData.nickname ||
      !userData.phone ||
      !userData.birth_date ||
      !userData.education
    ) {
      return { success: false, error: "모든 항목을 입력해주세요." };
    }

    // 이메일 형식 검증
    if (!validateEmail(userData.email)) {
      return { success: false, error: "올바른 이메일 형식이 아닙니다." };
    }

    // 전화번호 형식 검증
    if (!validatePhone(userData.phone)) {
      return { success: false, error: "전화번호는 010-1234-5678 형식으로 입력해주세요." };
    }

    // 비밀번호 검증
    if (!validatePassword(userData.password)) {
      return { success: false, error: "비밀번호는 8자리 이상이며 영어와 숫자를 포함해야 합니다." };
    }

    // 교육 수준 검증
    if (!Object.values(EDUCATION_LEVELS).includes(userData.education)) {
      return { success: false, error: "올바른 교육 수준을 선택해주세요." };
    }

    // Admin 클라이언트로 중복 확인 (RLS 우회)
    const { data: existingUserByEmail } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", userData.email)
      .is("deleted_at", null)
      .single();

    if (existingUserByEmail) {
      return { success: false, error: "이미 사용 중인 이메일입니다." };
    }

    // 전화번호 중복 확인
    const { data: existingUserByPhone } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("phone", userData.phone)
      .is("deleted_at", null)
      .single();

    if (existingUserByPhone) {
      return { success: false, error: "이미 사용 중인 전화번호입니다." };
    }

    // 닉네임 중복 확인
    const { data: existingUserByNickname } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("nickname", userData.nickname)
      .is("deleted_at", null)
      .single();

    if (existingUserByNickname) {
      return { success: false, error: "이미 사용 중인 닉네임입니다." };
    }

    // 비밀번호 해시화
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

    // Admin 클라이언트로 사용자 생성 (RLS 우회)
    const { data: newUser, error } = await supabaseAdmin
      .from("users")
      .insert({
        email: userData.email,
        password: hashedPassword,
        name: userData.name,
        nickname: userData.nickname,
        phone: userData.phone,
        birth_date: userData.birth_date,
        education: userData.education,
      })
      .select()
      .single();

    if (error) {
      console.error("Sign up error:", error);
      return { success: false, error: "회원가입 중 오류가 발생했습니다." };
    }

    // 비밀번호 제외하고 반환
    const { password, ...userWithoutPassword } = newUser;
    return { success: true, data: userWithoutPassword as User };
  } catch (error) {
    console.error("Sign up error:", error);
    return { success: false, error: "서버 오류가 발생했습니다." };
  }
};

/**
 * 로그인
 * 이메일 또는 전화번호와 비밀번호로 로그인
 */
export const signIn = async (credentials: SignInRequest): Promise<ApiResponse<User>> => {
  try {
    if (!credentials.identifier || !credentials.password) {
      return { success: false, error: "이메일/전화번호와 비밀번호를 입력해주세요." };
    }

    // 이메일 또는 전화번호로 사용자 찾기
    const isEmail = validateEmail(credentials.identifier);

    let query = supabaseAdmin.from("users").select("*").is("deleted_at", null);

    if (isEmail) {
      query = query.eq("email", credentials.identifier);
    } else {
      query = query.eq("phone", credentials.identifier);
    }

    const { data: user, error } = await query.single();

    if (error || !user) {
      return { success: false, error: "사용자를 찾을 수 없습니다." };
    }

    // 비밀번호 확인
    const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

    if (!isPasswordValid) {
      return { success: false, error: "비밀번호가 일치하지 않습니다." };
    }

    // 비밀번호 제외하고 반환
    const { password, ...userWithoutPassword } = user;
    return { success: true, data: userWithoutPassword as User };
  } catch (error) {
    console.error("Sign in error:", error);
    return { success: false, error: "로그인 중 오류가 발생했습니다." };
  }
};

/**
 * 로그아웃
 * 클라이언트에서 세션 정리
 */
export const signOut = async (): Promise<ApiResponse> => {
  try {
    // 실제 구현에서는 JWT 토큰을 무효화하거나 세션을 정리
    // 여기서는 성공 응답만 반환
    return { success: true };
  } catch (error) {
    console.error("Sign out error:", error);
    return { success: false, error: "로그아웃 중 오류가 발생했습니다." };
  }
};

/**
 * 비밀번호 재설정
 * 로그인된 사용자만 가능
 */
export const resetPassword = async (
  userId: string,
  passwordData: ResetPasswordRequest
): Promise<ApiResponse> => {
  try {
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      return { success: false, error: "현재 비밀번호와 새 비밀번호를 입력해주세요." };
    }

    // 새 비밀번호 검증
    if (!validatePassword(passwordData.newPassword)) {
      return {
        success: false,
        error: "새 비밀번호는 8자리 이상이며 영어와 숫자를 포함해야 합니다.",
      };
    }

    // 현재 사용자 정보 조회
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("password")
      .eq("id", userId)
      .is("deleted_at", null)
      .single();

    if (error || !user) {
      return { success: false, error: "사용자를 찾을 수 없습니다." };
    }

    // 현재 비밀번호 확인
    const isCurrentPasswordValid = await bcrypt.compare(
      passwordData.currentPassword,
      user.password
    );

    if (!isCurrentPasswordValid) {
      return { success: false, error: "현재 비밀번호가 일치하지 않습니다." };
    }

    // 새 비밀번호 해시화
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(passwordData.newPassword, saltRounds);

    // 비밀번호 업데이트
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ password: hashedNewPassword })
      .eq("id", userId);

    if (updateError) {
      return { success: false, error: "비밀번호 변경 중 오류가 발생했습니다." };
    }

    return { success: true };
  } catch (error) {
    console.error("Reset password error:", error);
    return { success: false, error: "서버 오류가 발생했습니다." };
  }
};

/**
 * 계정 탈퇴
 * deleted_at 설정 및 정보 마스킹, 재가입 방지
 */
export const deleteAccount = async (userId: string, password: string): Promise<ApiResponse> => {
  try {
    if (!password) {
      return { success: false, error: "비밀번호를 입력해주세요." };
    }

    // 현재 사용자 정보 조회
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", userId)
      .is("deleted_at", null)
      .single();

    if (error || !user) {
      return { success: false, error: "사용자를 찾을 수 없습니다." };
    }

    // 비밀번호 확인
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return { success: false, error: "비밀번호가 일치하지 않습니다." };
    }

    // 계정 탈퇴 처리 (정보 마스킹)
    const currentDate = new Date().toISOString();
    const { error: deleteError } = await supabaseAdmin
      .from("users")
      .update({
        email: "알수없음",
        name: "알수없음",
        nickname: "알수없음",
        phone: "알수없음",
        education: "알수없음",
        deleted_at: currentDate,
      })
      .eq("id", userId);

    if (deleteError) {
      return { success: false, error: "계정 탈퇴 처리 중 오류가 발생했습니다." };
    }

    return { success: true };
  } catch (error) {
    console.error("Delete account error:", error);
    return { success: false, error: "서버 오류가 발생했습니다." };
  }
};

/**
 * 프로필 정보 수정
 * 닉네임, 생년월일, 교육 수준만 수정 가능
 */
export const updateProfile = async (
  userId: string,
  updateData: UpdateProfileRequest
): Promise<ApiResponse<User>> => {
  try {
    // 수정 가능한 필드만 추출
    const allowedUpdates: Partial<UserUpdate> = {};

    if (updateData.nickname !== undefined) {
      // 닉네임 중복 확인
      const { data: existingUser } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("nickname", updateData.nickname)
        .neq("id", userId)
        .is("deleted_at", null)
        .single();

      if (existingUser) {
        return { success: false, error: "이미 사용 중인 닉네임입니다." };
      }

      allowedUpdates.nickname = updateData.nickname;
    }

    if (updateData.birth_date !== undefined) {
      allowedUpdates.birth_date = updateData.birth_date;
    }

    if (updateData.education !== undefined) {
      // 교육 수준 검증
      if (!Object.values(EDUCATION_LEVELS).includes(updateData.education)) {
        return { success: false, error: "올바른 교육 수준을 선택해주세요." };
      }
      allowedUpdates.education = updateData.education;
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return { success: false, error: "수정할 정보가 없습니다." };
    }

    // 정보 업데이트
    const { data: updatedUser, error } = await supabaseAdmin
      .from("users")
      .update(allowedUpdates)
      .eq("id", userId)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      return { success: false, error: "정보 수정 중 오류가 발생했습니다." };
    }

    // 비밀번호 제외하고 반환
    const { password, ...userWithoutPassword } = updatedUser;
    return { success: true, data: userWithoutPassword as User };
  } catch (error) {
    console.error("Update profile error:", error);
    return { success: false, error: "서버 오류가 발생했습니다." };
  }
};

/**
 * 사용자 정보 조회
 */
export const getUser = async (userId: string): Promise<ApiResponse<User>> => {
  try {
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", userId)
      .is("deleted_at", null)
      .single();

    if (error || !user) {
      return { success: false, error: "사용자를 찾을 수 없습니다." };
    }

    // 비밀번호 제외하고 반환
    const { password, ...userWithoutPassword } = user;
    return { success: true, data: userWithoutPassword as User };
  } catch (error) {
    console.error("Get user error:", error);
    return { success: false, error: "사용자 정보 조회 중 오류가 발생했습니다." };
  }
};

/**
 * 사용자 검색 (닉네임, 이메일, 전화번호로 검색)
 */
export interface SearchUserResult {
  id: string;
  name: string;
  nickname: string;
  email: string;
  phone: string;
}

export const searchUsers = async (query: string): Promise<ApiResponse<SearchUserResult[]>> => {
  try {
    if (!query || query.trim().length < 2) {
      return { success: false, error: "검색어는 2자리 이상 입력해주세요." };
    }

    const searchTerm = query.trim();

    // 이메일, 전화번호, 닉네임으로 검색
    const { data: users, error } = await supabaseAdmin
      .from("users")
      .select("id, name, nickname, email, phone")
      .is("deleted_at", null)
      .or(`nickname.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
      .limit(10);

    if (error) {
      console.error("Search users error:", error);
      return { success: false, error: "사용자 검색에 실패했습니다." };
    }

    return { success: true, data: users || [] };
  } catch (error) {
    console.error("Search users error:", error);
    return { success: false, error: "사용자 검색 중 오류가 발생했습니다." };
  }
};

/**
 * 이메일 또는 전화번호로 사용자 찾기
 */
export const findUserByIdentifier = async (identifier: string): Promise<ApiResponse<User>> => {
  try {
    if (!identifier || identifier.trim() === "") {
      return { success: false, error: "이메일 또는 전화번호를 입력해주세요." };
    }

    const isEmail = validateEmail(identifier);

    let query = supabaseAdmin
      .from("users")
      .select("id, name, nickname, email, phone")
      .is("deleted_at", null);

    if (isEmail) {
      query = query.eq("email", identifier);
    } else {
      query = query.eq("phone", identifier);
    }

    const { data: user, error } = await query.single();

    if (error || !user) {
      return { success: false, error: "해당 사용자를 찾을 수 없습니다." };
    }

    return { success: true, data: user as User };
  } catch (error) {
    console.error("Find user by identifier error:", error);
    return { success: false, error: "사용자 검색 중 오류가 발생했습니다." };
  }
};
