// types/index.ts
import { Database } from "./supabase"

// 개별 테이블 타입 추출
export type Group = Database['public']['Tables']['groups']['Row']
export type GroupInsert = Database['public']['Tables']['groups']['Insert']
export type GroupUpdate = Database['public']['Tables']['groups']['Update']

export type GroupMember = Database['public']['Tables']['group_members']['Row']
export type GroupMemberInsert = Database['public']['Tables']['group_members']['Insert']
export type GroupMemberUpdate = Database['public']['Tables']['group_members']['Update']

export type Report = Database['public']['Tables']['reports']['Row']
export type ReportInsert = Database['public']['Tables']['reports']['Insert']
export type ReportUpdate = Database['public']['Tables']['reports']['Update']

export type Task = Database['public']['Tables']['tasks']['Row']
export type TaskInsert = Database['public']['Tables']['tasks']['Insert']
export type TaskUpdate = Database['public']['Tables']['tasks']['Update']

export type User = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

export type InputSetting = Database['public']['Tables']['input_settings']['Row']
export type InputSettingInsert = Database['public']['Tables']['input_settings']['Insert']
export type InputSettingUpdate = Database['public']['Tables']['input_settings']['Update']

export type UndefinedInput = Database['public']['Tables']['undefined_inputs']['Row']
export type UndefinedInputInsert = Database['public']['Tables']['undefined_inputs']['Insert']
export type UndefinedInputUpdate = Database['public']['Tables']['undefined_inputs']['Update']


// 확장된 타입 정의
export interface FormattedGroupMember {
  id: string
  group_id: string
  user_id: string
  user_name: string | null
  user_email: string | null
  role: string | null
  invited_at: string | null
  accepted_at: string | null
}

export interface FormattedReport {
  id: string
  content: string
  group_id: string
  user_id: string
  user_name: string | null
  user_email: string | null
  created_at: string
  summary: string | null
  reviewed: boolean | null
  auther_id: string
  title?: string
  updated_at?: string
}

export interface ReportStatistics {
  total: number
  byUser: Array<{
    userId: string
    userName: string
    count: number
  }>
  monthlyTrend: Array<{
    month: string
    count: number
  }>
}

// 확장된 InputSetting 타입 (options 필드 추가)
export interface ExtendedInputSetting extends InputSetting {
  // 실제 DB에는 없지만 프론트엔드에서 사용하는 필드
  options?: string[]
}

// 사용자 정의 타입
export interface UserWithEmail {
  id: string
  email: string
}

export interface GroupMemberWithUser {
  id: string
  role: string | null
  invited_at: string | null
  accepted_at: string | null
  users: {
    id: string
    name: string | null
    email: string
  }
}

export interface ReportWithUser {
  id: string
  content: string
  created_at: string
  summary: string | null
  reviewed: boolean | null
  users: {
    id: string
    name: string | null
    email: string
  }
}
