import { supabase } from "./supabase"
import type { InputSetting } from "@/types"

interface InputSettingCreate {
  field_name: string
  field_type: string
  is_required: boolean
}

interface InputSettingUpdate {
  field_name?: string
  field_type?: string
  is_required?: boolean
}

// 입력 설정 생성
export const createInputSettings = async (
  groupId: string,
  settings: InputSettingCreate[],
): Promise<{ success: boolean; error?: string }> => {
  try {
    // 설정 데이터 준비
    const inputSettings = settings.map((setting) => ({
      group_id: groupId,
      field_name: setting.field_name,
      field_type: setting.field_type,
      is_inquired: setting.is_required, // is_required를 is_inquired로 변경
    }))

    // 입력 설정 저장
    const { error } = await supabase.from("input_settings").insert(inputSettings)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("Error creating input settings:", error instanceof Error ? error.message : String(error))
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 입력 설정 가져오기
export const getInputSettings = async (
  groupId: string,
): Promise<{ success: boolean; settings?: InputSetting[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from("input_settings")
      .select("*")
      .eq("group_id", groupId)
      .order("field_name", { ascending: true })

    if (error) throw error

    // 데이터 변환: is_inquired를 is_required로 변환하여 반환
    const transformedData = data?.map((item) => ({
      ...item,
      is_required: item.is_inquired,
    }))

    return { success: true, settings: transformedData as InputSetting[] }
  } catch (error) {
    console.error("Error getting input settings:", error instanceof Error ? error.message : String(error))
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 입력 설정 업데이트
export const updateInputSetting = async (
  settingId: string,
  updates: InputSettingUpdate,
): Promise<{ success: boolean; error?: string }> => {
  try {
    // is_required를 is_inquired로 변환
    const dbUpdates: Record<string, unknown> = { ...updates }
    if (updates.is_required !== undefined) {
      dbUpdates.is_inquired = updates.is_required
      delete dbUpdates.is_required
    }

    const { error } = await supabase.from("input_settings").update(dbUpdates).eq("id", settingId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("Error updating input setting:", error instanceof Error ? error.message : String(error))
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 입력 설정 삭제
export const deleteInputSetting = async (settingId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.from("input_settings").delete().eq("id", settingId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("Error deleting input setting:", error instanceof Error ? error.message : String(error))
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 기본 입력 설정 생성
export const createDefaultInputSettings = async (groupId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // 기본 입력 설정 정의
    const defaultSettings: InputSettingCreate[] = [
      // 상태 필드
      { field_name: "숙제·테스트 관리", field_type: "select", is_required: true },
      { field_name: "교재 점검", field_type: "select", is_required: true },
      { field_name: "상담 진행", field_type: "select", is_required: true },
      { field_name: "분석", field_type: "select", is_required: true },

      // 추가 입력 필드
      { field_name: "테스트 입력 상세", field_type: "text", is_required: false },
      { field_name: "숙제 관련 상세", field_type: "text", is_required: false },
      { field_name: "상담 내용", field_type: "text", is_required: false },
      { field_name: "추가 업무", field_type: "text", is_required: false },
    ]

    return await createInputSettings(groupId, defaultSettings)
  } catch (error) {
    console.error("Error creating default input settings:", error instanceof Error ? error.message : String(error))
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
