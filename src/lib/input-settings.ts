import type { InputSettingInsert } from "../../types"

export const createInputSettings = async (
  groupId: string,
  settings: {
    field_name: string
    field_type: string
    is_inquired?: boolean // is_required 대신 is_inquired 사용
    options?: string[] // 프론트엔드에서만 사용하는 필드
  }[],
): Promise<{ success: boolean; error?: string }> => {
  try {
    // 입력 설정 생성 (options 필드는 제외)
    const inputSettings: InputSettingInsert[] = settings.map((setting) => ({
      group_id: groupId,
      field_name: setting.field_name,
      field_type: setting.field_type,
      is_inquired: setting.is_inquired || false, // 기본값 설정
    }))

    // TODO: DB에 저장하는 로직 추가 (예시)
    console.log("Input settings to be saved:", inputSettings)

    return { success: true }
  } catch (error) {
    console.error("입력 설정 생성 오류:", error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
