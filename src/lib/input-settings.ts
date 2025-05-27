import { supabase } from "./supabase"
import { getCurrentUser } from "./supabase"
import type { ExtendedInputSetting, InputSettingInsert } from "../../types"

// 그룹의 입력 설정 가져오기
export const getInputSettings = async (
  groupId: string,
): Promise<{ success: boolean; settings?: ExtendedInputSetting[]; error?: string }> => {
  try {
    // 현재 사용자 가져오기
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: "인증되지 않은 사용자입니다." }
    }

    // 그룹 멤버십 확인
    const { data: membership, error: membershipError } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", groupId)
      .eq("user_id", currentUser.id)
      .single()

    if (membershipError && membershipError.code !== "PGRST116") {
      throw membershipError
    }

    // 그룹 정보 가져오기
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("owner_id")
      .eq("id", groupId)
      .single()

    if (groupError) {
      throw groupError
    }

    // 소유자나 멤버가 아니면 접근 거부
    const isOwner = group.owner_id === currentUser.id
    if (!isOwner && !membership) {
      return { success: false, error: "이 그룹에 접근할 권한이 없습니다." }
    }

    // 입력 설정 가져오기
    const { data, error } = await supabase
      .from("input_settings")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true })

    if (error) {
      throw error
    }

    // 타입 안전하게 변환 (options 필드는 프론트엔드에서만 사용)
    const settings: ExtendedInputSetting[] = (data || []).map((setting) => ({
      ...setting,
      field_type: setting.field_type || "text",
      options: [], // 빈 배열로 초기화 (DB에는 없는 필드)
    }))

    return {
      success: true,
      settings,
    }
  } catch (error) {
    console.error("입력 설정 가져오기 오류:", error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 입력 설정 생성
export const createInputSettings = async (
  groupId: string,
  settings: {
    field_name: string
    field_type: string
    is_required?: boolean
    options?: string[] // 프론트엔드에서만 사용하는 필드
  }[],
): Promise<{ success: boolean; error?: string }> => {
  try {
    // 현재 사용자 가져오기
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: "인증되지 않은 사용자입니다." }
    }

    // 그룹 정보 가져오기
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("owner_id")
      .eq("id", groupId)
      .single()

    if (groupError) {
      throw groupError
    }

    // 그룹 멤버십 확인
    const { data: membership, error: membershipError } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", groupId)
      .eq("user_id", currentUser.id)
      .single()

    if (membershipError && membershipError.code !== "PGRST116") {
      throw membershipError
    }

    // 소유자나 관리자가 아니면 접근 거부
    const isOwner = group.owner_id === currentUser.id
    const isManager = membership?.role === "manager"
    if (!isOwner && !isManager) {
      return { success: false, error: "입력 설정을 생성할 권한이 없습니다." }
    }

    // 입력 설정 생성 (options 필드는 제외)
    const inputSettings: InputSettingInsert[] = settings.map((setting) => ({
      group_id: groupId,
      field_name: setting.field_name,
      field_type: setting.field_type,
      is_inquired: false, // 기본값 설정
    }))

    const { error } = await supabase.from("input_settings").insert(inputSettings)

    if (error) {
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error("입력 설정 생성 오류:", error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 입력 설정 업데이트
export const updateInputSetting = async (
  settingId: string,
  updates: {
    field_name?: string
    field_type?: string
    is_inquired?: boolean
    options?: string[] // 프론트엔드에서만 사용하는 필드
  },
): Promise<{ success: boolean; error?: string }> => {
  try {
    // 현재 사용자 가져오기
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: "인증되지 않은 사용자입니다." }
    }

    // 입력 설정 정보 가져오기
    const { data: setting, error: settingError } = await supabase
      .from("input_settings")
      .select("group_id")
      .eq("id", settingId)
      .single()

    if (settingError) {
      throw settingError
    }

    // 그룹 정보 가져오기
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("owner_id")
      .eq("id", setting.group_id)
      .single()

    if (groupError) {
      throw groupError
    }

    // 그룹 멤버십 확인
    const { data: membership, error: membershipError } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", setting.group_id)
      .eq("user_id", currentUser.id)
      .single()

    if (membershipError && membershipError.code !== "PGRST116") {
      throw membershipError
    }

    // 소유자나 관리자가 아니면 접근 거부
    const isOwner = group.owner_id === currentUser.id
    const isManager = membership?.role === "manager"
    if (!isOwner && !isManager) {
      return { success: false, error: "입력 설정을 수정할 권한이 없습니다." }
    }

    // options 필드 제거 (DB에 없는 필드이므로 사용하지 않음)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { options: _options, ...dbUpdates } = updates

    // 입력 설정 업데이트
    const { error } = await supabase.from("input_settings").update(dbUpdates).eq("id", settingId)

    if (error) {
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error("입력 설정 업데이트 오류:", error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 입력 설정 삭제
export const deleteInputSetting = async (settingId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // 현재 사용자 가져오기
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: "인증되지 않은 사용자입니다." }
    }

    // 입력 설정 정보 가져오기
    const { data: setting, error: settingError } = await supabase
      .from("input_settings")
      .select("group_id")
      .eq("id", settingId)
      .single()

    if (settingError) {
      throw settingError
    }

    // 그룹 정보 가져오기
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("owner_id")
      .eq("id", setting.group_id)
      .single()

    if (groupError) {
      throw groupError
    }

    // 그룹 멤버십 확인
    const { data: membership, error: membershipError } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", setting.group_id)
      .eq("user_id", currentUser.id)
      .single()

    if (membershipError && membershipError.code !== "PGRST116") {
      throw membershipError
    }

    // 소유자나 관리자가 아니면 접근 거부
    const isOwner = group.owner_id === currentUser.id
    const isManager = membership?.role === "manager"
    if (!isOwner && !isManager) {
      return { success: false, error: "입력 설정을 삭제할 권한이 없습니다." }
    }

    // 입력 설정 삭제
    const { error } = await supabase.from("input_settings").delete().eq("id", settingId)

    if (error) {
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error("입력 설정 삭제 오류:", error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
