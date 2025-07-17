import { supabaseAdmin } from "./supabase";
import { Database } from "./types/types";

// 데이터베이스 타입 import
type Report = Database["public"]["Tables"]["reports"]["Row"];
type ReportInsert = Database["public"]["Tables"]["reports"]["Insert"];
type ReportUpdate = Database["public"]["Tables"]["reports"]["Update"];

type FormResponse = Database["public"]["Tables"]["form_responses"]["Row"];
type FormQuestionResponse = Database["public"]["Tables"]["form_question_responses"]["Row"];
type Form = Database["public"]["Tables"]["forms"]["Row"];
type FormQuestion = Database["public"]["Tables"]["form_questions"]["Row"];
type FormTarget = Database["public"]["Tables"]["form_targets"]["Row"];
type User = Database["public"]["Tables"]["users"]["Row"];
type Class = Database["public"]["Tables"]["classes"]["Row"];
type SupervisionMapping = Database["public"]["Tables"]["supervision_mappings"]["Row"];
type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"];

// API 응답 타입 정의
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ===== 요청 타입 정의 =====

export interface AddCommentRequest {
  reportId: string;
  comment: string;
  commentType: "time_teacher" | "teacher"; // 시간강사 또는 부장선생님
}

export interface RejectReportRequest {
  reportId: string;
  rejectionReason: string;
}

export interface ResetReportRequest {
  reportId: string;
  resetReason: string;
}

export interface ReportSearchConditions {
  formId?: string;
  studentName?: string;
  className?: string;
  stage?: number[];
  status?: string[]; // 'completed', 'in_progress', 'rejected'
  createdAfter?: string;
  createdBefore?: string;
  groupId: string;
}

export interface UpdateReportAssignmentRequest {
  reportId: string;
  timeTeacherId?: string;
  teacherId?: string;
}

// ===== 상세 정보 포함 타입 =====

export interface ReportWithDetails {
  id: string;
  form_id: string | null;
  form_response_id: string | null;
  stage: number | null;
  student_name: string | null;
  class_name: string | null;
  teacher_id: string | null;
  time_teacher_id: string | null;
  supervision_id: string | null;
  teacher_comment: string | null;
  teacher_completed_at: string | null;
  time_teacher_comment: string | null;
  time_teacher_completed_at: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  rejection_reason: string | null;
  draft_status: string | null;
  created_at: string | null;
  updated_at: string | null;
  // 연결된 정보
  form: {
    id: string;
    title: string;
    description: string | null;
    creator_name: string;
  };
  student: {
    id: string;
    name: string;
    nickname: string;
    class_name?: string | undefined;
  };
  timeTeacher?: {
    id: string;
    name: string;
    nickname: string;
  };
  teacher?: {
    id: string;
    name: string;
    nickname: string;
  };
  formResponse?: {
    id: string;
    status: string;
    submitted_at: string | null;
    responses: FormQuestionResponseWithDetails[];
  };
}

export interface FormQuestionResponseWithDetails {
  id: string;
  question_id: string | null;
  text_response: string | null;
  number_response: number | null;
  rating_response: number | null;
  exam_response: Record<string, unknown> | null; // JSON
  created_at: string | null;
  question: {
    id: string;
    question_type: string;
    question_text: string;
    is_required: boolean | null;
    order_index: number;
  };
}

export interface ReportStageInfo {
  stage: number;
  status: "pending" | "in_progress" | "completed" | "rejected";
  statusText: string;
  description: string;
  canComment: boolean;
  canReject: boolean;
  nextStage?: number;
}

export interface ReportStats {
  totalReports: number;
  stage1Reports: number; // 학생 응답 완료
  stage2Reports: number; // 시간강사 검토 완료
  stage3Reports: number; // 부장선생님 검토 완료 (최종)
  rejectedReports: number;
  completionRate: number;
}

// ===== 알림 생성 헬퍼 함수 =====
const createNotification = async (notificationData: NotificationInsert) => {
  try {
    await supabaseAdmin.from("notifications").insert(notificationData);
  } catch (error) {
    console.error("알림 생성 실패:", error);
  }
};

// ===== 유틸리티 함수들 =====

/**
 * 보고서 단계 정보 가져오기
 */
export const getReportStageInfo = (
  report: Report,
  userRole: "time_teacher" | "teacher" | "admin",
  userId: string
): ReportStageInfo => {
  const stage = report.stage || 1;
  const isRejected = !!report.rejected_at;
  const isTimeTeacher = userRole === "time_teacher" && report.time_teacher_id === userId;
  const isTeacher = userRole === "teacher" && report.teacher_id === userId;
  const isAdmin = userRole === "admin";

  if (isRejected) {
    return {
      stage,
      status: "rejected",
      statusText: "반려됨",
      description: `반려 사유: ${report.rejection_reason}`,
      canComment: false,
      canReject: false,
    };
  }

  switch (stage) {
    case 1:
      return {
        stage: 1,
        status: "pending",
        statusText: "학생 응답 완료",
        description: "시간강사 검토 대기 중",
        canComment: isTimeTeacher || isAdmin,
        canReject: isTimeTeacher || isAdmin,
        nextStage: 2,
      };

    case 2:
      return {
        stage: 2,
        status: "in_progress",
        statusText: "시간강사 검토 완료",
        description: "부장선생님 검토 대기 중",
        canComment: isTeacher || isAdmin,
        canReject: isTeacher || isAdmin,
        nextStage: 3,
      };

    case 3:
      return {
        stage: 3,
        status: "completed",
        statusText: "최종 완료",
        description: "모든 검토가 완료되었습니다",
        canComment: false,
        canReject: false,
      };

    default:
      return {
        stage,
        status: "pending",
        statusText: "진행 중",
        description: "상태를 확인할 수 없습니다",
        canComment: false,
        canReject: false,
      };
  }
};

/**
 * 사용자의 역할 확인
 */
const getUserRole = async (
  userId: string,
  groupId: string,
  reportId?: string
): Promise<"time_teacher" | "teacher" | "admin" | "student" | null> => {
  try {
    // 그룹 멤버인지 먼저 확인
    const { data: member } = await supabaseAdmin
      .from("group_member")
      .select("group_roles (name)")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .single();

    if (!member) return null;

    const roleName = member.group_roles?.name?.toLowerCase();

    // 관리자 역할 확인
    if (roleName?.includes("admin") || roleName?.includes("관리자")) {
      return "admin";
    }

    // 특정 보고서의 담당자인지 확인
    if (reportId) {
      const { data: report } = await supabaseAdmin
        .from("reports")
        .select("time_teacher_id, teacher_id")
        .eq("id", reportId)
        .single();

      if (report) {
        if (report.time_teacher_id === userId) return "time_teacher";
        if (report.teacher_id === userId) return "teacher";
      }
    }

    // 일반적인 역할 확인
    if (roleName?.includes("teacher") || roleName?.includes("강사")) {
      return "time_teacher";
    }
    if (roleName?.includes("supervisor") || roleName?.includes("부장")) {
      return "teacher";
    }

    return "student";
  } catch (error) {
    console.error("Get user role error:", error);
    return null;
  }
};

// ===== API 함수들 =====

/**
 * 보고서 목록 조회
 */
export const getReports = async (
  groupId: string,
  userId: string,
  conditions?: ReportSearchConditions
): Promise<ApiResponse<ReportWithDetails[]>> => {
  try {
    // 그룹 멤버 확인
    const { data: memberCheck } = await supabaseAdmin
      .from("group_member")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .single();

    if (!memberCheck) {
      return { success: false, error: "그룹 멤버만 보고서를 조회할 수 있습니다." };
    }

    // 기본 쿼리 구성 - forms를 통해 그룹 필터링
    const { data: groupForms } = await supabaseAdmin
      .from("forms")
      .select("id")
      .eq("group_id", groupId);

    const formIds = groupForms?.map((f) => f.id) || [];
    if (formIds.length === 0) {
      return { success: true, data: [] };
    }

    let query = supabaseAdmin.from("reports").select("*").in("form_id", formIds);

    // 검색 조건 적용
    if (conditions) {
      if (conditions.formId) {
        query = query.eq("form_id", conditions.formId);
      }
      if (conditions.studentName) {
        query = query.ilike("student_name", `%${conditions.studentName}%`);
      }
      if (conditions.className) {
        query = query.ilike("class_name", `%${conditions.className}%`);
      }
      if (conditions.stage && conditions.stage.length > 0) {
        query = query.in("stage", conditions.stage);
      }
      if (conditions.createdAfter) {
        query = query.gte("created_at", conditions.createdAfter);
      }
      if (conditions.createdBefore) {
        query = query.lte("created_at", conditions.createdBefore);
      }
    }

    query = query.order("created_at", { ascending: false });

    const { data: reports, error } = await query;

    if (error) {
      console.error("Get reports error:", error);
      return { success: false, error: "보고서 목록 조회에 실패했습니다." };
    }

    // 상세 정보 구성
    const reportsWithDetails: ReportWithDetails[] = await Promise.all(
      (reports || []).map(async (report: Report) => {
        // 폼 정보 조회
        const { data: form } = await supabaseAdmin
          .from("forms")
          .select(
            `
            id, title, description,
            users!forms_creator_id_fkey (name)
          `
          )
          .eq("id", report.form_id || "")
          .single();

        // 학생 정보 조회
        let student = { id: "", name: report.student_name || "", nickname: "" };
        if (report.form_response_id) {
          const { data: formResponse } = await supabaseAdmin
            .from("form_responses")
            .select(
              `
              users!form_responses_student_id_fkey (id, name, nickname)
            `
            )
            .eq("id", report.form_response_id)
            .single();

          if (formResponse?.users) {
            student = formResponse.users;
          }
        }

        // 시간강사 정보 조회
        let timeTeacher = undefined;
        if (report.time_teacher_id) {
          const { data: teacherData } = await supabaseAdmin
            .from("users")
            .select("id, name, nickname")
            .eq("id", report.time_teacher_id)
            .single();

          if (teacherData) {
            timeTeacher = teacherData;
          }
        }

        // 부장선생님 정보 조회
        let teacher = undefined;
        if (report.teacher_id) {
          const { data: teacherData } = await supabaseAdmin
            .from("users")
            .select("id, name, nickname")
            .eq("id", report.teacher_id)
            .single();

          if (teacherData) {
            teacher = teacherData;
          }
        }

        return {
          ...report,
          form: {
            id: form?.id || "",
            title: form?.title || "",
            description: form?.description || null,
            creator_name: form?.users?.name || "",
          },
          student: {
            id: student.id,
            name: student.name,
            nickname: student.nickname,
            class_name: report.class_name || undefined,
          },
          timeTeacher,
          teacher,
          formResponse: undefined, // 필요시 별도 조회
        };
      })
    );

    return { success: true, data: reportsWithDetails };
  } catch (error) {
    console.error("Get reports error:", error);
    return { success: false, error: "보고서 목록 조회 중 오류가 발생했습니다." };
  }
};

/**
 * 보고서 상세 조회
 */
export const getReportDetails = async (
  reportId: string,
  userId: string
): Promise<ApiResponse<ReportWithDetails>> => {
  try {
    const { data: report, error: reportError } = await supabaseAdmin
      .from("reports")
      .select("*")
      .eq("id", reportId)
      .single();

    if (reportError || !report) {
      return { success: false, error: "보고서를 찾을 수 없습니다." };
    }

    // 폼 정보를 통해 그룹 확인
    const { data: form } = await supabaseAdmin
      .from("forms")
      .select("group_id")
      .eq("id", report.form_id || "")
      .single();

    if (!form?.group_id) {
      return { success: false, error: "연결된 폼을 찾을 수 없습니다." };
    }

    // 접근 권한 확인
    const userRole = await getUserRole(userId, form.group_id, reportId);
    if (!userRole) {
      return { success: false, error: "접근 권한이 없습니다." };
    }

    // 폼 응답 상세 정보 조회
    let formResponseDetails = undefined;
    if (report.form_response_id) {
      const { data: questionResponses } = await supabaseAdmin
        .from("form_question_responses")
        .select(
          `
          *,
          form_questions!form_question_responses_question_id_fkey (
            id, question_type, question_text, is_required, order_index
          )
        `
        )
        .eq("form_response_id", report.form_response_id)
        .order("form_questions.order_index");

      const { data: formResponse } = await supabaseAdmin
        .from("form_responses")
        .select("id, status, submitted_at")
        .eq("id", report.form_response_id)
        .single();

      if (questionResponses && formResponse) {
        formResponseDetails = {
          id: formResponse.id,
          status: formResponse.status,
          submitted_at: formResponse.submitted_at,
          responses: questionResponses.map(
            (qr: FormQuestionResponse & { form_questions: FormQuestion }) => ({
              ...qr,
              question: qr.form_questions,
            })
          ),
        };
      }
    }

    // 나머지 정보들 조회 (getForms와 유사한 로직)
    const reportsResult = await getReports(form.group_id, userId, {
      formId: report.form_id || undefined,
    });

    if (!reportsResult.success || !reportsResult.data) {
      return { success: false, error: "보고서 상세 조회에 실패했습니다." };
    }

    const reportDetail = reportsResult.data.find((r) => r.id === reportId);
    if (!reportDetail) {
      return { success: false, error: "보고서를 찾을 수 없습니다." };
    }

    // 상세 응답 정보 추가
    reportDetail.formResponse = formResponseDetails;

    return { success: true, data: reportDetail };
  } catch (error) {
    console.error("Get report details error:", error);
    return { success: false, error: "보고서 상세 조회 중 오류가 발생했습니다." };
  }
};

/**
 * 보고서에 코멘트 추가 (단계 올림)
 */
export const addReportComment = async (
  userId: string,
  commentData: AddCommentRequest
): Promise<ApiResponse<Report>> => {
  try {
    // 보고서 조회
    const { data: report, error: reportError } = await supabaseAdmin
      .from("reports")
      .select("*")
      .eq("id", commentData.reportId)
      .single();

    if (reportError || !report) {
      return { success: false, error: "보고서를 찾을 수 없습니다." };
    }

    // 폼을 통해 그룹 정보 가져오기
    const { data: form } = await supabaseAdmin
      .from("forms")
      .select("group_id")
      .eq("id", report.form_id || "")
      .single();

    if (!form?.group_id) {
      return { success: false, error: "연결된 폼을 찾을 수 없습니다." };
    }

    // 권한 확인
    const userRole = await getUserRole(userId, form.group_id, commentData.reportId);

    if (
      commentData.commentType === "time_teacher" &&
      userRole !== "time_teacher" &&
      userRole !== "admin"
    ) {
      return { success: false, error: "시간강사 권한이 없습니다." };
    }

    if (commentData.commentType === "teacher" && userRole !== "teacher" && userRole !== "admin") {
      return { success: false, error: "부장선생님 권한이 없습니다." };
    }

    // 반려된 보고서는 수정 불가
    if (report.rejected_at) {
      return { success: false, error: "반려된 보고서입니다." };
    }

    // 단계 확인 및 업데이트
    const updateData: Partial<ReportUpdate> = {
      updated_at: new Date().toISOString(),
    };

    if (commentData.commentType === "time_teacher") {
      if (report.stage !== 1) {
        return { success: false, error: "잘못된 단계입니다." };
      }
      updateData.time_teacher_comment = commentData.comment;
      updateData.time_teacher_completed_at = new Date().toISOString();
      updateData.stage = 2;
    } else if (commentData.commentType === "teacher") {
      if (report.stage !== 2) {
        return { success: false, error: "잘못된 단계입니다." };
      }
      updateData.teacher_comment = commentData.comment;
      updateData.teacher_completed_at = new Date().toISOString();
      updateData.stage = 3; // 최종 완성
    }

    const { data: updatedReport, error: updateError } = await supabaseAdmin
      .from("reports")
      .update(updateData)
      .eq("id", commentData.reportId)
      .select()
      .single();

    if (updateError) {
      console.error("Update report error:", updateError);
      return { success: false, error: "코멘트 추가에 실패했습니다." };
    }

    // 알림 생성
    const nextStage = updateData.stage;
    const isCompleted = nextStage === 3;

    if (isCompleted) {
      // 최종 완료 알림 (폼 작성자에게)
      const { data: formData } = await supabaseAdmin
        .from("forms")
        .select("creator_id, group_id, title")
        .eq("id", report.form_id || "")
        .single();

      if (formData) {
        await createNotification({
          target_id: formData.creator_id,
          creator_id: userId,
          group_id: formData.group_id,
          related_id: commentData.reportId,
          type: "report_completed",
          title: "보고서가 완료되었습니다",
          content: `"${formData.title}" 폼의 보고서가 최종 완료되었습니다.`,
          action_url: `/reports/${commentData.reportId}`,
        });
      }
    } else {
      // 단계 진행 알림 (다음 담당자에게)
      const nextAssigneeId = nextStage === 2 ? report.teacher_id : null;

      if (nextAssigneeId) {
        await createNotification({
          target_id: nextAssigneeId,
          creator_id: userId,
          group_id: form.group_id,
          related_id: commentData.reportId,
          type: "report_stage_updated",
          title: "보고서 검토 요청",
          content: `새로운 보고서 검토가 요청되었습니다.`,
          action_url: `/reports/${commentData.reportId}`,
        });
      }
    }

    return { success: true, data: updatedReport };
  } catch (error) {
    console.error("Add comment error:", error);
    return { success: false, error: "코멘트 추가 중 오류가 발생했습니다." };
  }
};

/**
 * 보고서 반려
 */
export const rejectReport = async (
  userId: string,
  rejectData: RejectReportRequest
): Promise<ApiResponse<Report>> => {
  try {
    // 권한 확인
    const { data: report, error: reportError } = await supabaseAdmin
      .from("reports")
      .select("*")
      .eq("id", rejectData.reportId)
      .single();

    if (reportError || !report) {
      return { success: false, error: "보고서를 찾을 수 없습니다." };
    }

    // 폼을 통해 그룹 정보 가져오기
    const { data: form } = await supabaseAdmin
      .from("forms")
      .select("group_id")
      .eq("id", report.form_id || "")
      .single();

    if (!form?.group_id) {
      return { success: false, error: "연결된 폼을 찾을 수 없습니다." };
    }

    const userRole = await getUserRole(userId, form.group_id, rejectData.reportId);

    if (userRole !== "time_teacher" && userRole !== "teacher" && userRole !== "admin") {
      return { success: false, error: "반려 권한이 없습니다." };
    }

    // 보고서 반려 처리
    const { data: updatedReport, error: updateError } = await supabaseAdmin
      .from("reports")
      .update({
        rejected_at: new Date().toISOString(),
        rejected_by: userId,
        rejection_reason: rejectData.rejectionReason,
        stage: 1, // 1단계로 리셋
        updated_at: new Date().toISOString(),
      })
      .eq("id", rejectData.reportId)
      .select()
      .single();

    if (updateError) {
      console.error("Reject report error:", updateError);
      return { success: false, error: "보고서 반려에 실패했습니다." };
    }

    // 학생에게 반려 알림
    if (report.form_response_id) {
      const { data: formResponse } = await supabaseAdmin
        .from("form_responses")
        .select("student_id")
        .eq("id", report.form_response_id)
        .single();

      if (formResponse?.student_id) {
        await createNotification({
          target_id: formResponse.student_id,
          creator_id: userId,
          group_id: form.group_id,
          related_id: rejectData.reportId,
          type: "report_rejected",
          title: "보고서가 반려되었습니다",
          content: `반려 사유: ${rejectData.rejectionReason}`,
          action_url: `/reports/${rejectData.reportId}`,
        });
      }
    }

    return { success: true, data: updatedReport };
  } catch (error) {
    console.error("Reject report error:", error);
    return { success: false, error: "보고서 반려 중 오류가 발생했습니다." };
  }
};

/**
 * 보고서를 폼 상태로 리셋
 */
export const resetReportToForm = async (
  userId: string,
  resetData: ResetReportRequest
): Promise<ApiResponse<Report>> => {
  try {
    // 권한 확인 (선생님만 가능)
    const { data: report, error: reportError } = await supabaseAdmin
      .from("reports")
      .select("*")
      .eq("id", resetData.reportId)
      .single();

    if (reportError || !report) {
      return { success: false, error: "보고서를 찾을 수 없습니다." };
    }

    // 폼을 통해 그룹 정보 가져오기
    const { data: form } = await supabaseAdmin
      .from("forms")
      .select("group_id")
      .eq("id", report.form_id || "")
      .single();

    if (!form?.group_id) {
      return { success: false, error: "연결된 폼을 찾을 수 없습니다." };
    }

    const userRole = await getUserRole(userId, form.group_id, resetData.reportId);

    if (userRole !== "teacher" && userRole !== "admin") {
      return { success: false, error: "리셋 권한이 없습니다." };
    }

    // 보고서 리셋 (스테이지만 없애고 기본 내용은 유지)
    const { data: updatedReport, error: updateError } = await supabaseAdmin
      .from("reports")
      .update({
        stage: null, // 스테이지 리셋
        teacher_comment: null,
        teacher_completed_at: null,
        time_teacher_comment: null,
        time_teacher_completed_at: null,
        rejected_at: null,
        rejected_by: null,
        rejection_reason: null,
        draft_status: "reset",
        updated_at: new Date().toISOString(),
      })
      .eq("id", resetData.reportId)
      .select()
      .single();

    if (updateError) {
      console.error("Reset report error:", updateError);
      return { success: false, error: "보고서 리셋에 실패했습니다." };
    }

    // 해당 폼 응답을 수정 가능 상태로 변경
    if (report.form_response_id) {
      await supabaseAdmin
        .from("form_responses")
        .update({
          status: "draft", // 수정 가능한 상태로
          updated_at: new Date().toISOString(),
        })
        .eq("id", report.form_response_id);

      // 학생에게 리셋 알림
      const { data: formResponse } = await supabaseAdmin
        .from("form_responses")
        .select("student_id")
        .eq("id", report.form_response_id)
        .single();

      if (formResponse?.student_id) {
        await createNotification({
          target_id: formResponse.student_id,
          creator_id: userId,
          group_id: form.group_id,
          related_id: resetData.reportId,
          type: "report_reset",
          title: "보고서가 재작성 요청되었습니다",
          content: `재작성 사유: ${resetData.resetReason}`,
          action_url: `/forms/${report.form_id}/respond`,
        });
      }
    }

    return { success: true, data: updatedReport };
  } catch (error) {
    console.error("Reset report error:", error);
    return { success: false, error: "보고서 리셋 중 오류가 발생했습니다." };
  }
};

/**
 * 보고서 필터링 조회
 */
export const getFilteredReports = async (
  groupId: string,
  userId: string,
  filters: {
    creatorName?: string;
    dateRange?: { start: string; end: string };
    formTags?: string[];
    stage?: number[];
    studentName?: string;
    className?: string;
  }
): Promise<ApiResponse<ReportWithDetails[]>> => {
  try {
    const conditions: ReportSearchConditions = {
      groupId,
      ...filters,
      createdAfter: filters.dateRange?.start,
      createdBefore: filters.dateRange?.end,
      stage: filters.stage,
    };

    return await getReports(groupId, userId, conditions);
  } catch (error) {
    console.error("Get filtered reports error:", error);
    return { success: false, error: "필터링된 보고서 조회 중 오류가 발생했습니다." };
  }
};

/**
 * 보고서 통계 조회
 */
export const getReportStats = async (
  groupId: string,
  userId: string,
  formId?: string
): Promise<ApiResponse<ReportStats>> => {
  try {
    // 그룹 멤버 확인
    const { data: memberCheck } = await supabaseAdmin
      .from("group_member")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .single();

    if (!memberCheck) {
      return { success: false, error: "접근 권한이 없습니다." };
    }

    // 그룹의 폼들 조회
    const { data: groupForms } = await supabaseAdmin
      .from("forms")
      .select("id")
      .eq("group_id", groupId);

    const formIds = formId ? [formId] : groupForms?.map((f) => f.id) || [];

    if (formIds.length === 0) {
      return {
        success: true,
        data: {
          totalReports: 0,
          stage1Reports: 0,
          stage2Reports: 0,
          stage3Reports: 0,
          rejectedReports: 0,
          completionRate: 0,
        },
      };
    }

    const { data: reports, error } = await supabaseAdmin
      .from("reports")
      .select("stage, rejected_at")
      .in("form_id", formIds);

    if (error) {
      console.error("Get report stats error:", error);
      return { success: false, error: "보고서 통계 조회에 실패했습니다." };
    }

    const totalReports = reports?.length || 0;
    const stage1Reports = reports?.filter((r) => r.stage === 1 && !r.rejected_at).length || 0;
    const stage2Reports = reports?.filter((r) => r.stage === 2 && !r.rejected_at).length || 0;
    const stage3Reports = reports?.filter((r) => r.stage === 3 && !r.rejected_at).length || 0;
    const rejectedReports = reports?.filter((r) => r.rejected_at).length || 0;
    const completionRate = totalReports > 0 ? (stage3Reports / totalReports) * 100 : 0;

    const stats: ReportStats = {
      totalReports,
      stage1Reports,
      stage2Reports,
      stage3Reports,
      rejectedReports,
      completionRate: Math.round(completionRate),
    };

    return { success: true, data: stats };
  } catch (error) {
    console.error("Get report stats error:", error);
    return { success: false, error: "보고서 통계 조회 중 오류가 발생했습니다." };
  }
};

/**
 * 보고서 담당자 업데이트
 */
export const updateReportAssignment = async (
  userId: string,
  assignmentData: UpdateReportAssignmentRequest
): Promise<ApiResponse<Report>> => {
  try {
    // 권한 확인 (관리자만 가능)
    const { data: report, error: reportError } = await supabaseAdmin
      .from("reports")
      .select("*")
      .eq("id", assignmentData.reportId)
      .single();

    if (reportError || !report) {
      return { success: false, error: "보고서를 찾을 수 없습니다." };
    }

    // 폼을 통해 그룹 정보 가져오기
    const { data: form } = await supabaseAdmin
      .from("forms")
      .select("group_id")
      .eq("id", report.form_id || "")
      .single();

    if (!form?.group_id) {
      return { success: false, error: "연결된 폼을 찾을 수 없습니다." };
    }

    const userRole = await getUserRole(userId, form.group_id);

    if (userRole !== "admin") {
      return { success: false, error: "담당자 변경 권한이 없습니다." };
    }

    // 담당자 업데이트
    const updateData: Partial<ReportUpdate> = {
      updated_at: new Date().toISOString(),
    };

    if (assignmentData.timeTeacherId !== undefined) {
      updateData.time_teacher_id = assignmentData.timeTeacherId;
    }
    if (assignmentData.teacherId !== undefined) {
      updateData.teacher_id = assignmentData.teacherId;
    }

    const { data: updatedReport, error: updateError } = await supabaseAdmin
      .from("reports")
      .update(updateData)
      .eq("id", assignmentData.reportId)
      .select()
      .single();

    if (updateError) {
      console.error("Update assignment error:", updateError);
      return { success: false, error: "담당자 업데이트에 실패했습니다." };
    }

    return { success: true, data: updatedReport };
  } catch (error) {
    console.error("Update assignment error:", error);
    return { success: false, error: "담당자 업데이트 중 오류가 발생했습니다." };
  }
};
