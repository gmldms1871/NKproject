export type UserRole = "ceo" | "manager" | "teacher" | "part-time-lecturer" | "staff"

export type FieldType = "text" | "select" | "number" | "date"

export type TaskStatus = "pending" | "in-progress" | "completed" | "cancelled"

export interface User {
  id: string
  email: string
  name: string | null
  nick_name: string | null
  phone: string | null
  created_at: string
}

export interface Group {
  id: string
  name: string
  owner_id: string
  created_at: string
  owner?: User
}

export interface GroupMember {
  id: string
  group_id: string
  user_id: string
  role: UserRole
  invited_at: string | null
  accepted_at: string | null
  user?: User
}

export interface InputSetting {
  id: string
  group_id: string
  field_name: string
  field_type: FieldType
  is_required: boolean
  created_at: string
}

export interface Report {
  id: string
  group_id: string
  auther_id: string
  content: string
  summary: string | null
  reviewed: boolean | null
  created_at: string
  author?: {
    id: string
    name: string | null
    email: string
    nick_name: string | null
  }
  group?: {
    id: string
    name: string
  }
  undefined_inputs?: UndefinedInput[]
}

export interface UndefinedInput {
  id: string
  group_id: string
  field_id: string
  report_id: string | null
  value: string
  created_at: string
  field?: {
    id: string
    field_name: string
    field_type: string
  }
}

export interface Task {
  id: string
  group_id: string | null
  user_id: string | null
  title: string
  description: string | null
  status: TaskStatus
  due_date: string | null
  created_at: string | null
}

export interface ReportStatistics {
  totalReports: number
  statusCounts: Record<string, number>
  fieldStats: Record<string, Record<string, number>>
  teacherStats: Record<
    string,
    {
      total: number
      completed: number
      inProgress: number
      incomplete: number
    }
  >
  dateStats: Record<string, number>
}

export interface MonthlyTrend {
  month: string
  reports: number
  completed: number
  inProgress: number
  incomplete: number
}

export interface ReportStats {
  total: number
  reviewed: number
  pending: number
  byAuthor: Record<string, number>
  byDate: Record<string, number>
}
