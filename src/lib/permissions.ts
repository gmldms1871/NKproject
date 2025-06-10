// lib/permissions.ts
// 권한 관리 관련 함수들 - 역할별 권한 정의, 권한 검증, 접근 제어 등

import type { UserRole, Permission, RolePermissions } from "./types";

/**
 * 액션 타입 정의
 */
export const ACTIONS = {
  // 그룹 관련
  CREATE_GROUP: "group:create",
  READ_GROUP: "group:read",
  UPDATE_GROUP: "group:update",
  DELETE_GROUP: "group:delete",
  MANAGE_GROUP_MEMBERS: "group:manage_members",
  INVITE_MEMBERS: "group:invite_members",

  // 반 관련
  CREATE_CLASS: "class:create",
  READ_CLASS: "class:read",
  UPDATE_CLASS: "class:update",
  DELETE_CLASS: "class:delete",
  MANAGE_CLASS_MEMBERS: "class:manage_members",

  // 폼 관련
  CREATE_FORM: "form:create",
  READ_FORM: "form:read",
  UPDATE_FORM: "form:update",
  DELETE_FORM: "form:delete",
  SEND_FORM: "form:send",
  RESPOND_FORM: "form:respond",
  VIEW_ALL_FORMS: "form:view_all",
  VIEW_ASSIGNED_FORMS: "form:view_assigned",

  // 보고서 관련
  CREATE_REPORT: "report:create",
  READ_REPORT: "report:read",
  UPDATE_REPORT: "report:update",
  DELETE_REPORT: "report:delete",
  REVIEW_REPORT: "report:review",
  VIEW_ALL_REPORTS: "report:view_all",
  UPDATE_STAGE1: "report:update_stage1",
  UPDATE_STAGE2: "report:update_stage2",
  FINALIZE_REPORT: "report:finalize",

  // 통계 관련
  VIEW_STATISTICS: "statistics:view",
  VIEW_ALL_STATISTICS: "statistics:view_all",
  VIEW_CLASS_STATISTICS: "statistics:view_class",
  VIEW_STUDENT_STATISTICS: "statistics:view_student",

  // 알림 관련
  SEND_NOTIFICATION: "notification:send",
  VIEW_NOTIFICATION: "notification:view",
  MANAGE_NOTIFICATIONS: "notification:manage",

  // 사용자 관련
  VIEW_USER_PROFILE: "user:view_profile",
  UPDATE_USER_PROFILE: "user:update_profile",
  VIEW_ALL_USERS: "user:view_all",
  MANAGE_USER_ROLES: "user:manage_roles",

  // 시스템 관리
  SYSTEM_ADMIN: "system:admin",
  BACKUP_DATA: "system:backup",
  EXPORT_DATA: "system:export",
} as const;

/**
 * 리소스 타입 정의
 */
export const RESOURCES = {
  GROUP: "group",
  CLASS: "class",
  FORM: "form",
  REPORT: "report",
  USER: "user",
  NOTIFICATION: "notification",
  STATISTICS: "statistics",
  SYSTEM: "system",
} as const;

/**
 * 역할별 권한 정의
 */
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: [
    // 그룹 전체 권한
    ACTIONS.CREATE_GROUP,
    ACTIONS.READ_GROUP,
    ACTIONS.UPDATE_GROUP,
    ACTIONS.DELETE_GROUP,
    ACTIONS.MANAGE_GROUP_MEMBERS,
    ACTIONS.INVITE_MEMBERS,

    // 반 전체 권한
    ACTIONS.CREATE_CLASS,
    ACTIONS.READ_CLASS,
    ACTIONS.UPDATE_CLASS,
    ACTIONS.DELETE_CLASS,
    ACTIONS.MANAGE_CLASS_MEMBERS,

    // 폼 전체 권한
    ACTIONS.CREATE_FORM,
    ACTIONS.READ_FORM,
    ACTIONS.UPDATE_FORM,
    ACTIONS.DELETE_FORM,
    ACTIONS.SEND_FORM,
    ACTIONS.VIEW_ALL_FORMS,

    // 보고서 전체 권한
    ACTIONS.CREATE_REPORT,
    ACTIONS.READ_REPORT,
    ACTIONS.UPDATE_REPORT,
    ACTIONS.DELETE_REPORT,
    ACTIONS.REVIEW_REPORT,
    ACTIONS.VIEW_ALL_REPORTS,
    ACTIONS.UPDATE_STAGE1,
    ACTIONS.UPDATE_STAGE2,
    ACTIONS.FINALIZE_REPORT,

    // 통계 전체 권한
    ACTIONS.VIEW_STATISTICS,
    ACTIONS.VIEW_ALL_STATISTICS,
    ACTIONS.VIEW_CLASS_STATISTICS,
    ACTIONS.VIEW_STUDENT_STATISTICS,

    // 알림 권한
    ACTIONS.SEND_NOTIFICATION,
    ACTIONS.VIEW_NOTIFICATION,
    ACTIONS.MANAGE_NOTIFICATIONS,

    // 사용자 관리 권한
    ACTIONS.VIEW_USER_PROFILE,
    ACTIONS.UPDATE_USER_PROFILE,
    ACTIONS.VIEW_ALL_USERS,
    ACTIONS.MANAGE_USER_ROLES,

    // 시스템 관리 권한
    ACTIONS.SYSTEM_ADMIN,
    ACTIONS.BACKUP_DATA,
    ACTIONS.EXPORT_DATA,
  ],

  teacher: [
    // 그룹 읽기 및 멤버 초대
    ACTIONS.READ_GROUP,
    ACTIONS.INVITE_MEMBERS,

    // 반 관리 권한
    ACTIONS.CREATE_CLASS,
    ACTIONS.READ_CLASS,
    ACTIONS.UPDATE_CLASS,
    ACTIONS.MANAGE_CLASS_MEMBERS,

    // 폼 관리 권한
    ACTIONS.CREATE_FORM,
    ACTIONS.READ_FORM,
    ACTIONS.UPDATE_FORM,
    ACTIONS.SEND_FORM,
    ACTIONS.VIEW_ALL_FORMS,

    // 보고서 권한 (2단계까지)
    ACTIONS.CREATE_REPORT,
    ACTIONS.READ_REPORT,
    ACTIONS.UPDATE_REPORT,
    ACTIONS.REVIEW_REPORT,
    ACTIONS.VIEW_ALL_REPORTS,
    ACTIONS.UPDATE_STAGE2,
    ACTIONS.FINALIZE_REPORT,

    // 통계 권한
    ACTIONS.VIEW_STATISTICS,
    ACTIONS.VIEW_ALL_STATISTICS,
    ACTIONS.VIEW_CLASS_STATISTICS,
    ACTIONS.VIEW_STUDENT_STATISTICS,

    // 알림 권한
    ACTIONS.SEND_NOTIFICATION,
    ACTIONS.VIEW_NOTIFICATION,

    // 사용자 정보 권한
    ACTIONS.VIEW_USER_PROFILE,
    ACTIONS.UPDATE_USER_PROFILE,
    ACTIONS.VIEW_ALL_USERS,

    // 데이터 내보내기
    ACTIONS.EXPORT_DATA,
  ],

  part_time: [
    // 그룹 읽기
    ACTIONS.READ_GROUP,

    // 배정된 반만 읽기
    ACTIONS.READ_CLASS,

    // 배정된 폼만 읽기 및 응답
    ACTIONS.READ_FORM,
    ACTIONS.VIEW_ASSIGNED_FORMS,

    // 보고서 1단계 권한
    ACTIONS.READ_REPORT,
    ACTIONS.UPDATE_STAGE1,

    // 배정된 학생 통계만
    ACTIONS.VIEW_STATISTICS,
    ACTIONS.VIEW_CLASS_STATISTICS,

    // 알림 읽기
    ACTIONS.VIEW_NOTIFICATION,

    // 개인 정보 관리
    ACTIONS.VIEW_USER_PROFILE,
    ACTIONS.UPDATE_USER_PROFILE,
  ],

  student: [
    // 그룹 읽기
    ACTIONS.READ_GROUP,

    // 소속 반 읽기
    ACTIONS.READ_CLASS,

    // 배정된 폼 응답
    ACTIONS.READ_FORM,
    ACTIONS.RESPOND_FORM,
    ACTIONS.VIEW_ASSIGNED_FORMS,

    // 본인 보고서 읽기
    ACTIONS.READ_REPORT,

    // 본인 통계만
    ACTIONS.VIEW_STATISTICS,

    // 알림 읽기
    ACTIONS.VIEW_NOTIFICATION,

    // 개인 정보 관리
    ACTIONS.VIEW_USER_PROFILE,
    ACTIONS.UPDATE_USER_PROFILE,
  ],
};

/**
 * 사용자 권한 확인
 * @param userRole 사용자 역할
 * @param action 수행하려는 액션
 * @param resource 리소스 (선택)
 * @param context 추가 컨텍스트 (선택)
 * @returns 권한 보유 여부
 */
export function hasPermission(
  userRole: UserRole,
  action: string,
  resource?: string,
  context?: {
    ownerId?: string;
    userId?: string;
    groupId?: string;
    classId?: string;
    assignedTo?: string[];
  }
): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole];

  if (!rolePermissions.includes(action)) {
    return false;
  }

  // 컨텍스트 기반 추가 검증
  if (context) {
    return checkContextualPermission(userRole, action, resource, context);
  }

  return true;
}

/**
 * 컨텍스트 기반 권한 검증
 * @param userRole 사용자 역할
 * @param action 액션
 * @param resource 리소스
 * @param context 컨텍스트
 * @returns 권한 보유 여부
 */
function checkContextualPermission(
  userRole: UserRole,
  action: string,
  resource?: string,
  context?: {
    ownerId?: string;
    userId?: string;
    groupId?: string;
    classId?: string;
    assignedTo?: string[];
  }
): boolean {
  if (!context) return true;

  // 관리자는 모든 권한
  if (userRole === "admin") return true;

  // 소유자 권한 검증
  if (context.ownerId && context.userId) {
    if (context.ownerId === context.userId) return true;
  }

  // 학생별 특별 규칙
  if (userRole === "student") {
    // 학생은 본인 관련 리소스만 접근 가능
    if (action.includes("view") || action.includes("read")) {
      if (context.userId && context.assignedTo) {
        return context.assignedTo.includes(context.userId);
      }
    }

    // 폼 응답은 본인에게 배정된 것만
    if (action === ACTIONS.RESPOND_FORM) {
      if (context.userId && context.assignedTo) {
        return context.assignedTo.includes(context.userId);
      }
    }
  }

  // 시간제 강사별 특별 규칙
  if (userRole === "part_time") {
    // 배정된 반의 학생들만 접근 가능
    if (action.includes("class") || action.includes("student")) {
      if (context.userId && context.assignedTo) {
        return context.assignedTo.includes(context.userId);
      }
    }
  }

  return true;
}

/**
 * 여러 권한 중 하나라도 보유하는지 확인
 * @param userRole 사용자 역할
 * @param actions 액션 배열
 * @param resource 리소스
 * @param context 컨텍스트
 * @returns 권한 보유 여부
 */
export function hasAnyPermission(
  userRole: UserRole,
  actions: string[],
  resource?: string,
  context?: any
): boolean {
  return actions.some((action) => hasPermission(userRole, action, resource, context));
}

/**
 * 모든 권한을 보유하는지 확인
 * @param userRole 사용자 역할
 * @param actions 액션 배열
 * @param resource 리소스
 * @param context 컨텍스트
 * @returns 권한 보유 여부
 */
export function hasAllPermissions(
  userRole: UserRole,
  actions: string[],
  resource?: string,
  context?: any
): boolean {
  return actions.every((action) => hasPermission(userRole, action, resource, context));
}

/**
 * 리소스별 접근 가능한 액션 목록 조회
 * @param userRole 사용자 역할
 * @param resource 리소스
 * @returns 접근 가능한 액션 배열
 */
export function getAvailableActions(userRole: UserRole, resource: string): string[] {
  const rolePermissions = ROLE_PERMISSIONS[userRole];
  return rolePermissions.filter((permission) => permission.startsWith(`${resource}:`));
}

/**
 * 권한 기반 메뉴 필터링
 * @param userRole 사용자 역할
 * @param menuItems 메뉴 아이템 배열
 * @returns 필터링된 메뉴 아이템
 */
export function filterMenuByPermissions<T extends { requiredPermission?: string; children?: T[] }>(
  userRole: UserRole,
  menuItems: T[]
): T[] {
  return menuItems
    .filter((item) => {
      if (!item.requiredPermission) return true;
      return hasPermission(userRole, item.requiredPermission);
    })
    .map((item) => ({
      ...item,
      children: item.children ? filterMenuByPermissions(userRole, item.children) : undefined,
    }));
}

/**
 * 폼 필드별 접근 권한 확인
 * @param userRole 사용자 역할
 * @param fieldFilledByRole 필드 작성자 역할
 * @param mode 모드 ('read' | 'write')
 * @returns 접근 가능 여부
 */
export function canAccessFormField(
  userRole: UserRole,
  fieldFilledByRole: string,
  mode: "read" | "write" = "read"
): boolean {
  // 관리자와 선생님은 모든 필드 접근 가능
  if (userRole === "admin" || userRole === "teacher") {
    return true;
  }

  // 읽기 모드에서는 더 관대한 정책
  if (mode === "read") {
    // 시간제 강사는 학생 필드 읽기 가능
    if (userRole === "part_time" && fieldFilledByRole === "student") {
      return true;
    }

    // 학생은 본인이 작성한 필드만 읽기 가능
    if (userRole === "student" && fieldFilledByRole === "student") {
      return true;
    }
  }

  // 쓰기 모드에서는 엄격한 정책
  if (mode === "write") {
    return userRole === fieldFilledByRole;
  }

  return false;
}

/**
 * 보고서 단계별 접근 권한 확인
 * @param userRole 사용자 역할
 * @param reportStage 보고서 단계
 * @param action 수행하려는 액션
 * @returns 접근 가능 여부
 */
export function canAccessReportStage(
  userRole: UserRole,
  reportStage: string,
  action: "read" | "write" | "review"
): boolean {
  // 관리자는 모든 단계 접근 가능
  if (userRole === "admin") return true;

  switch (reportStage) {
    case "stage_0":
      // 0단계: 학생이 미완료한 상태
      return action === "read"; // 모든 역할이 읽기만 가능

    case "stage_1":
      // 1단계: 시간제 강사가 작업할 단계
      if (userRole === "part_time") {
        return action === "write" || action === "review";
      }
      if (userRole === "teacher") {
        return action === "read";
      }
      return action === "read";

    case "stage_2":
      // 2단계: 선생님이 작업할 단계
      if (userRole === "teacher") {
        return action === "write" || action === "review";
      }
      return action === "read";

    case "completed":
      // 완료: 모든 역할이 읽기 가능
      return action === "read";

    default:
      return false;
  }
}

/**
 * 그룹 내 역할별 권한 매트릭스 생성
 * @param groupId 그룹 ID
 * @returns 권한 매트릭스
 */
export function generatePermissionMatrix(
  groupId: string
): Record<UserRole, Record<string, boolean>> {
  const matrix: Record<UserRole, Record<string, boolean>> = {
    admin: {},
    teacher: {},
    part_time: {},
    student: {},
  };

  const allActions = Object.values(ACTIONS);

  Object.keys(matrix).forEach((role) => {
    const userRole = role as UserRole;
    allActions.forEach((action) => {
      matrix[userRole][action] = hasPermission(userRole, action);
    });
  });

  return matrix;
}

/**
 * 동적 권한 확인 (데이터베이스 기반)
 * @param userId 사용자 ID
 * @param groupId 그룹 ID
 * @param action 액션
 * @param resourceId 리소스 ID
 * @returns 권한 확인 함수 (Promise)
 */
export function createDynamicPermissionChecker(
  getUserRole: (userId: string, groupId: string) => Promise<UserRole | null>,
  getResourceContext: (resourceId: string) => Promise<any>
) {
  return async function checkDynamicPermission(
    userId: string,
    groupId: string,
    action: string,
    resourceId?: string
  ): Promise<boolean> {
    try {
      const userRole = await getUserRole(userId, groupId);
      if (!userRole) return false;

      let context: any = { userId, groupId };

      if (resourceId) {
        const resourceContext = await getResourceContext(resourceId);
        context = { ...context, ...resourceContext };
      }

      return hasPermission(userRole, action, undefined, context);
    } catch (error) {
      console.error("동적 권한 확인 오류:", error);
      return false;
    }
  };
}

/**
 * 권한 기반 데이터 필터링
 * @param userRole 사용자 역할
 * @param data 데이터 배열
 * @param filterFn 필터 함수
 * @returns 필터링된 데이터
 */
export function filterDataByPermissions<T>(
  userRole: UserRole,
  data: T[],
  filterFn: (item: T, userRole: UserRole) => boolean
): T[] {
  return data.filter((item) => filterFn(item, userRole));
}

/**
 * 권한 에러 메시지 생성
 * @param action 액션
 * @param resource 리소스
 * @returns 에러 메시지
 */
export function getPermissionErrorMessage(action: string, resource?: string): string {
  const actionName = action.split(":")[1] || action;
  const resourceName = resource || "리소스";

  const messages: Record<string, string> = {
    create: `${resourceName} 생성 권한이 없습니다.`,
    read: `${resourceName} 조회 권한이 없습니다.`,
    update: `${resourceName} 수정 권한이 없습니다.`,
    delete: `${resourceName} 삭제 권한이 없습니다.`,
    manage: `${resourceName} 관리 권한이 없습니다.`,
    view: `${resourceName} 열람 권한이 없습니다.`,
    send: `${resourceName} 전송 권한이 없습니다.`,
    respond: `${resourceName} 응답 권한이 없습니다.`,
  };

  return messages[actionName] || "해당 작업을 수행할 권한이 없습니다.";
}

/**
 * 권한 상수들 내보내기
 */
export { ACTIONS as PERMISSIONS };
export type PermissionAction = (typeof ACTIONS)[keyof typeof ACTIONS];
export type ResourceType = (typeof RESOURCES)[keyof typeof RESOURCES];
