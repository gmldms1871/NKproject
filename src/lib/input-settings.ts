import { supabase } from "./supabase"
import type { InputSetting, InputSettingInsert } from "../../types"

export const getInputSettings = async (
  groupId: string,
): Promise<{ success: boolean; settings?: InputSetting[]; error?: string }> => {
  try {
    const { data: settings, error } = await supabase
      .from("input_settings")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true })

    if (error) {
      throw error
    }

    return { success: true, settings: settings || [] }
  } catch (error) {
    console.error("입력 설정 가져오기 오류:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    }
  }
}

export const createInputSettings = async (
  groupId: string,
  settings: {
    field_name: string
    field_type: string
    is_inquired?: boolean
  }[],
): Promise<{ success: boolean; error?: string }> => {
  try {
    const inputSettings: InputSettingInsert[] = settings.map((setting) => ({
      group_id: groupId,
      field_name: setting.field_name,
      field_type: setting.field_type,
      is_inquired: setting.is_inquired || false,
    }))

    const { error } = await supabase.from("input_settings").insert(inputSettings)

    if (error) {
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error("입력 설정 생성 오류:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    }
  }
}

export const updateInputSetting = async (
  settingId: string,
  updates: { field_name?: string; is_inquired?: boolean },
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.from("input_settings").update(updates).eq("id", settingId)

    if (error) {
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error("입력 설정 업데이트 오류:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    }
  }
}

export const deleteInputSetting = async (settingId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.from("input_settings").delete().eq("id", settingId)

    if (error) {
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error("입력 설정 삭제 오류:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    }
  }
}
