// lib/exports.ts
// 데이터 내보내기 관련 함수들 - Excel, PDF, CSV 내보내기, 보고서 생성 등

import { exportToExcel, exportGroupStatistics, exportFormStatistics } from "./excel";
import { uploadFile, STORAGE_BUCKETS } from "./storage";
import { getGroupStatistics } from "./groups";
import { getFormStatistics } from "./forms";
import { getGroupMembers } from "./groups";
import { getFormInstance } from "./forms";
import { getGroupReports } from "./reports";
import { dateUtils, stringUtils } from "./utils";
import type {
  APIResponse,
  GroupStatistics,
  FormStatistics,
  UserRole,
  FormInstanceWithDetails,
  ReportWithDetails,
  User,
} from "./types";

/**
 * 내보내기 형식
 */
export type ExportFormat = "excel" | "csv" | "pdf" | "json";

/**
 * 내보내기 타입
 */
export type ExportType =
  | "group_statistics"
  | "form_statistics"
  | "student_list"
  | "teacher_list"
  | "form_responses"
  | "reports"
  | "attendance"
  | "grades";

/**
 * 내보내기 옵션
 */
export interface ExportOptions {
  format: ExportFormat;
  type: ExportType;
  filters?: {
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    role?: UserRole;
    classId?: string;
  };
  includeFields?: string[];
  excludeFields?: string[];
  customFileName?: string;
  includeSummary?: boolean;
  groupData?: boolean;
}

/**
 * 내보내기 결과
 */
export interface ExportResult {
  success: boolean;
  fileName?: string;
  downloadUrl?: string;
  fileSize?: number;
  recordCount?: number;
  error?: string;
}

/**
 * 내보내기 작업 상태
 */
export interface ExportJob {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  type: ExportType;
  format: ExportFormat;
  progress: number;
  fileName?: string;
  downloadUrl?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

/**
 * 그룹 통계 내보내기
 */
export async function exportGroupStats(
  groupId: string,
  groupName: string,
  format: ExportFormat = "excel"
): Promise<ExportResult> {
  try {
    // 그룹 통계 조회
    const statsResult = await getGroupStatistics(groupId);
    if (!statsResult.success || !statsResult.data) {
      return { success: false, error: "그룹 통계를 조회할 수 없습니다." };
    }

    const stats = statsResult.data;
    const timestamp = dateUtils.formatKorean(new Date(), { includeTime: true });
    const fileName = `그룹_통계_${groupName}_${timestamp}`;

    switch (format) {
      case "excel":
        const excelBlob = exportGroupStatistics(stats, groupName);
        return await saveAndUploadFile(excelBlob, fileName + ".xlsx", "excel", stats);

      case "json":
        const jsonData = JSON.stringify(stats, null, 2);
        const jsonBlob = new Blob([jsonData], { type: "application/json" });
        return await saveAndUploadFile(jsonBlob, fileName + ".json", "json", stats);

      case "csv":
        const csvData = convertStatsToCSV(stats);
        const csvBlob = new Blob([csvData], { type: "text/csv;charset=utf-8" });
        return await saveAndUploadFile(csvBlob, fileName + ".csv", "csv", stats);

      default:
        return { success: false, error: "지원하지 않는 형식입니다." };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "내보내기 중 오류가 발생했습니다.",
    };
  }
}

/**
 * 폼 통계 내보내기
 */
export async function exportFormStats(
  formTemplateId: string,
  formTitle: string,
  format: ExportFormat = "excel"
): Promise<ExportResult> {
  try {
    // 폼 통계 조회
    const statsResult = await getFormStatistics(formTemplateId);
    if (!statsResult.success || !statsResult.data) {
      return { success: false, error: "폼 통계를 조회할 수 없습니다." };
    }

    const stats = statsResult.data;
    const timestamp = dateUtils.formatKorean(new Date(), { includeTime: true });
    const fileName = `폼_통계_${stringUtils.truncate(formTitle, 20)}_${timestamp}`;

    switch (format) {
      case "excel":
        const excelBlob = exportFormStatistics(stats);
        return await saveAndUploadFile(excelBlob, fileName + ".xlsx", "excel", stats);

      case "json":
        const jsonData = JSON.stringify(stats, null, 2);
        const jsonBlob = new Blob([jsonData], { type: "application/json" });
        return await saveAndUploadFile(jsonBlob, fileName + ".json", "json", stats);

      case "csv":
        const csvData = convertFormStatsToCSV(stats);
        const csvBlob = new Blob([csvData], { type: "text/csv;charset=utf-8" });
        return await saveAndUploadFile(csvBlob, fileName + ".csv", "csv", stats);

      default:
        return { success: false, error: "지원하지 않는 형식입니다." };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "내보내기 중 오류가 발생했습니다.",
    };
  }
}

/**
 * 학생 목록 내보내기
 */
export async function exportStudentList(
  groupId: string,
  groupName: string,
  format: ExportFormat = "excel",
  classId?: string
): Promise<ExportResult> {
  try {
    // 학생 목록 조회
    const membersResult = await getGroupMembers(groupId, "student");
    if (!membersResult.success || !membersResult.data) {
      return { success: false, error: "학생 목록을 조회할 수 없습니다." };
    }

    let students = membersResult.data;

    // 특정 반 필터링
    if (classId) {
      // TODO: 반별 필터링 로직 구현
    }

    const timestamp = dateUtils.formatKorean(new Date(), { includeTime: true });
    const fileName = `학생_목록_${groupName}_${timestamp}`;

    // 학생 데이터 변환
    const studentData = students.map((member) => ({
      이름: member.users.name,
      이메일: member.users.email,
      전화번호: member.users.phone || "-",
      생년월일: member.users.birth_date || "-",
      가입일: dateUtils.formatKorean(member.accepted_at || member.invited_at!),
    }));

    switch (format) {
      case "excel":
        const columns = [
          { key: "이름", header: "이름", width: 15 },
          { key: "이메일", header: "이메일", width: 25 },
          { key: "전화번호", header: "전화번호", width: 15 },
          { key: "생년월일", header: "생년월일", width: 12 },
          { key: "가입일", header: "가입일", width: 15 },
        ];
        const excelBlob = exportToExcel(studentData, columns, fileName);
        return await saveAndUploadFile(excelBlob, fileName + ".xlsx", "excel", {
          count: studentData.length,
        });

      case "csv":
        const csvData = convertArrayToCSV(studentData);
        const csvBlob = new Blob([csvData], { type: "text/csv;charset=utf-8" });
        return await saveAndUploadFile(csvBlob, fileName + ".csv", "csv", {
          count: studentData.length,
        });

      case "json":
        const jsonData = JSON.stringify(studentData, null, 2);
        const jsonBlob = new Blob([jsonData], { type: "application/json" });
        return await saveAndUploadFile(jsonBlob, fileName + ".json", "json", {
          count: studentData.length,
        });

      default:
        return { success: false, error: "지원하지 않는 형식입니다." };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "내보내기 중 오류가 발생했습니다.",
    };
  }
}

/**
 * 선생님 목록 내보내기
 */
export async function exportTeacherList(
  groupId: string,
  groupName: string,
  format: ExportFormat = "excel"
): Promise<ExportResult> {
  try {
    // 선생님 및 시간제 강사 목록 조회
    const [teachersResult, partTimeResult] = await Promise.all([
      getGroupMembers(groupId, "teacher"),
      getGroupMembers(groupId, "part_time"),
    ]);

    if (!teachersResult.success || !partTimeResult.success) {
      return { success: false, error: "교직원 목록을 조회할 수 없습니다." };
    }

    const allTeachers = [...(teachersResult.data || []), ...(partTimeResult.data || [])];

    const timestamp = dateUtils.formatKorean(new Date(), { includeTime: true });
    const fileName = `교직원_목록_${groupName}_${timestamp}`;

    // 교직원 데이터 변환
    const teacherData = allTeachers.map((member) => ({
      이름: member.users.name,
      이메일: member.users.email,
      전화번호: member.users.phone || "-",
      역할: member.role === "teacher" ? "선생님" : "시간제 강사",
      가입일: dateUtils.formatKorean(member.accepted_at || member.invited_at!),
    }));

    switch (format) {
      case "excel":
        const columns = [
          { key: "이름", header: "이름", width: 15 },
          { key: "이메일", header: "이메일", width: 25 },
          { key: "전화번호", header: "전화번호", width: 15 },
          { key: "역할", header: "역할", width: 12 },
          { key: "가입일", header: "가입일", width: 15 },
        ];
        const excelBlob = exportToExcel(teacherData, columns, fileName);
        return await saveAndUploadFile(excelBlob, fileName + ".xlsx", "excel", {
          count: teacherData.length,
        });

      case "csv":
        const csvData = convertArrayToCSV(teacherData);
        const csvBlob = new Blob([csvData], { type: "text/csv;charset=utf-8" });
        return await saveAndUploadFile(csvBlob, fileName + ".csv", "csv", {
          count: teacherData.length,
        });

      case "json":
        const jsonData = JSON.stringify(teacherData, null, 2);
        const jsonBlob = new Blob([jsonData], { type: "application/json" });
        return await saveAndUploadFile(jsonBlob, fileName + ".json", "json", {
          count: teacherData.length,
        });

      default:
        return { success: false, error: "지원하지 않는 형식입니다." };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "내보내기 중 오류가 발생했습니다.",
    };
  }
}

/**
 * 폼 응답 내보내기
 */
export async function exportFormResponses(
  formInstanceId: string,
  format: ExportFormat = "excel"
): Promise<ExportResult> {
  try {
    // 폼 인스턴스 상세 조회
    const instanceResult = await getFormInstance(formInstanceId);
    if (!instanceResult.success || !instanceResult.data) {
      return { success: false, error: "폼 데이터를 조회할 수 없습니다." };
    }

    const instance = instanceResult.data;
    const timestamp = dateUtils.formatKorean(new Date(), { includeTime: true });
    const fileName = `폼_응답_${stringUtils.truncate(
      instance.form_template.title,
      20
    )}_${timestamp}`;

    // 응답 데이터 변환
    const responseData = instance.form_responses.map((response) => {
      const field = instance.form_template.form_fields.find((f) => f.id === response.field_id);
      return {
        필드명: field?.field_name || "알 수 없음",
        필드타입: field?.field_type || "-",
        응답값: response.value,
        제출일시: dateUtils.formatKorean(response.submitted_at || "", { includeTime: true }),
      };
    });

    switch (format) {
      case "excel":
        const columns = [
          { key: "필드명", header: "필드명", width: 20 },
          { key: "필드타입", header: "필드타입", width: 15 },
          { key: "응답값", header: "응답값", width: 30 },
          { key: "제출일시", header: "제출일시", width: 20 },
        ];
        const excelBlob = exportToExcel(responseData, columns, fileName);
        return await saveAndUploadFile(excelBlob, fileName + ".xlsx", "excel", {
          count: responseData.length,
        });

      case "csv":
        const csvData = convertArrayToCSV(responseData);
        const csvBlob = new Blob([csvData], { type: "text/csv;charset=utf-8" });
        return await saveAndUploadFile(csvBlob, fileName + ".csv", "csv", {
          count: responseData.length,
        });

      case "json":
        const jsonData = JSON.stringify(responseData, null, 2);
        const jsonBlob = new Blob([jsonData], { type: "application/json" });
        return await saveAndUploadFile(jsonBlob, fileName + ".json", "json", {
          count: responseData.length,
        });

      default:
        return { success: false, error: "지원하지 않는 형식입니다." };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "내보내기 중 오류가 발생했습니다.",
    };
  }
}

/**
 * 보고서 목록 내보내기
 */
export async function exportReportsList(
  groupId: string,
  groupName: string,
  format: ExportFormat = "excel"
): Promise<ExportResult> {
  try {
    // 그룹 보고서 목록 조회
    const reportsResult = await getGroupReports(groupId);
    if (!reportsResult.success || !reportsResult.data) {
      return { success: false, error: "보고서 목록을 조회할 수 없습니다." };
    }

    const reports = reportsResult.data;
    const timestamp = dateUtils.formatKorean(new Date(), { includeTime: true });
    const fileName = `보고서_목록_${groupName}_${timestamp}`;

    // 보고서 데이터 변환
    const reportData = reports.map((report) => ({
      학생명: report.form_instance?.student?.name || "-",
      폼제목: report.form_instance?.form_template?.title || "-",
      보고서단계: getReportStageLabel(report.stage || ""),
      작성자: report.reviewer?.name || "-",
      생성일: dateUtils.formatKorean(report.created_at || "", { includeTime: true }),
      수정일: dateUtils.formatKorean(report.updated_at || "", { includeTime: true }),
    }));

    switch (format) {
      case "excel":
        const columns = [
          { key: "학생명", header: "학생명", width: 15 },
          { key: "폼제목", header: "폼제목", width: 25 },
          { key: "보고서단계", header: "보고서단계", width: 15 },
          { key: "작성자", header: "작성자", width: 15 },
          { key: "생성일", header: "생성일", width: 20 },
          { key: "수정일", header: "수정일", width: 20 },
        ];
        const excelBlob = exportToExcel(reportData, columns, fileName);
        return await saveAndUploadFile(excelBlob, fileName + ".xlsx", "excel", {
          count: reportData.length,
        });

      case "csv":
        const csvData = convertArrayToCSV(reportData);
        const csvBlob = new Blob([csvData], { type: "text/csv;charset=utf-8" });
        return await saveAndUploadFile(csvBlob, fileName + ".csv", "csv", {
          count: reportData.length,
        });

      case "json":
        const jsonData = JSON.stringify(reportData, null, 2);
        const jsonBlob = new Blob([jsonData], { type: "application/json" });
        return await saveAndUploadFile(jsonBlob, fileName + ".json", "json", {
          count: reportData.length,
        });

      default:
        return { success: false, error: "지원하지 않는 형식입니다." };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "내보내기 중 오류가 발생했습니다.",
    };
  }
}

/**
 * 일괄 내보내기 (여러 타입을 ZIP으로)
 */
export async function exportBulkData(
  groupId: string,
  groupName: string,
  exportTypes: ExportType[],
  format: ExportFormat = "excel"
): Promise<ExportResult> {
  try {
    const timestamp = dateUtils.formatKorean(new Date(), { includeTime: true });
    const zipFileName = `${groupName}_전체_데이터_${timestamp}.zip`;

    // 모든 내보내기 작업을 병렬로 실행
    const exportPromises = exportTypes.map(async (type) => {
      switch (type) {
        case "group_statistics":
          return exportGroupStats(groupId, groupName, format);
        case "student_list":
          return exportStudentList(groupId, groupName, format);
        case "teacher_list":
          return exportTeacherList(groupId, groupName, format);
        case "reports":
          return exportReportsList(groupId, groupName, format);
        default:
          return { success: false, error: `지원하지 않는 내보내기 타입: ${type}` };
      }
    });

    const results = await Promise.allSettled(exportPromises);
    const successfulExports = results
      .filter(
        (result): result is PromiseFulfilledResult<ExportResult> =>
          result.status === "fulfilled" && result.value.success
      )
      .map((result) => result.value);

    if (successfulExports.length === 0) {
      return { success: false, error: "내보낼 데이터가 없습니다." };
    }

    // TODO: ZIP 파일 생성 로직 구현
    // 현재는 첫 번째 성공한 내보내기 결과만 반환
    return successfulExports[0];
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "일괄 내보내기 중 오류가 발생했습니다.",
    };
  }
}

/**
 * 파일 저장 및 업로드
 */
async function saveAndUploadFile(
  blob: Blob,
  fileName: string,
  format: string,
  metadata?: any
): Promise<ExportResult> {
  try {
    // 파일을 File 객체로 변환
    const file = new File([blob], fileName, { type: blob.type });

    // 스토리지에 업로드
    const uploadResult = await uploadFile(file, {
      bucket: STORAGE_BUCKETS.EXPORTS,
      folder: "exports",
      filename: fileName,
    });

    if (!uploadResult.success) {
      return {
        success: false,
        error: uploadResult.error || "파일 업로드에 실패했습니다.",
      };
    }

    return {
      success: true,
      fileName,
      downloadUrl: uploadResult.url,
      fileSize: file.size,
      recordCount: metadata?.count || metadata?.total_students || 0,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "파일 처리 중 오류가 발생했습니다.",
    };
  }
}

/**
 * 그룹 통계를 CSV로 변환
 */
function convertStatsToCSV(stats: GroupStatistics): string {
  const rows = [
    ["항목", "값"],
    ["총 학생 수", stats.total_students.toString()],
    ["총 선생님 수", stats.total_teachers.toString()],
    ["총 시간제 강사 수", stats.total_part_time.toString()],
    ["총 반 수", stats.total_classes.toString()],
    ["총 폼 수", stats.total_forms.toString()],
    ["완료된 폼 수", stats.completed_forms.toString()],
    ["대기 중인 폼 수", stats.pending_forms.toString()],
    ["완료율", `${stats.completion_rate}%`],
  ];

  return rows.map((row) => row.join(",")).join("\n");
}

/**
 * 폼 통계를 CSV로 변환
 */
function convertFormStatsToCSV(stats: FormStatistics): string {
  const rows = [
    ["항목", "값"],
    ["폼 제목", stats.form_title],
    ["총 배정 수", stats.total_assigned.toString()],
    ["완료 수", stats.completed.toString()],
    ["진행 중", stats.in_progress.toString()],
    ["미시작", stats.not_started.toString()],
    ["완료율", `${stats.completion_rate}%`],
  ];

  return rows.map((row) => row.join(",")).join("\n");
}

/**
 * 배열 데이터를 CSV로 변환
 */
function convertArrayToCSV(data: Record<string, any>[]): string {
  if (data.length === 0) return "";

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          // 쉼표나 따옴표가 포함된 경우 따옴표로 감싸기
          if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(",")
    ),
  ].join("\n");

  return csvContent;
}

/**
 * 보고서 단계 라벨 변환
 */
function getReportStageLabel(stage: string): string {
  const labels: Record<string, string> = {
    stage_0: "0단계 (학생 미완료)",
    stage_1: "1단계 (시간제 강사 검토)",
    stage_2: "2단계 (선생님 검토)",
    completed: "최종 완료",
  };
  return labels[stage] || stage;
}

/**
 * 내보내기 작업 관리 클래스
 */
class ExportJobManager {
  private jobs: Map<string, ExportJob> = new Map();

  /**
   * 새 내보내기 작업 생성
   */
  createJob(type: ExportType, format: ExportFormat): ExportJob {
    const job: ExportJob = {
      id: generateJobId(),
      status: "pending",
      type,
      format,
      progress: 0,
      createdAt: new Date().toISOString(),
    };

    this.jobs.set(job.id, job);
    return job;
  }

  /**
   * 작업 상태 업데이트
   */
  updateJob(id: string, updates: Partial<ExportJob>): void {
    const job = this.jobs.get(id);
    if (job) {
      Object.assign(job, updates);
      if (updates.status === "completed" || updates.status === "failed") {
        job.completedAt = new Date().toISOString();
      }
    }
  }

  /**
   * 작업 조회
   */
  getJob(id: string): ExportJob | undefined {
    return this.jobs.get(id);
  }

  /**
   * 모든 작업 조회
   */
  getAllJobs(): ExportJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * 완료된 작업 정리 (24시간 후)
   */
  cleanup(): void {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    for (const [id, job] of this.jobs.entries()) {
      if (job.completedAt && new Date(job.completedAt).getTime() < oneDayAgo) {
        this.jobs.delete(id);
      }
    }
  }
}

/**
 * 작업 ID 생성
 */
function generateJobId(): string {
  return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 전역 내보내기 작업 매니저
export const exportJobManager = new ExportJobManager();

// 정기적으로 완료된 작업 정리
if (typeof window !== "undefined") {
  setInterval(() => {
    exportJobManager.cleanup();
  }, 60 * 60 * 1000); // 1시간마다
}

/**
 * 비동기 내보내기 (대용량 데이터용)
 */
export async function exportDataAsync(
  options: ExportOptions,
  groupId: string,
  groupName: string
): Promise<{ jobId: string }> {
  const job = exportJobManager.createJob(options.type, options.format);

  // 비동기로 내보내기 작업 실행
  setTimeout(async () => {
    try {
      exportJobManager.updateJob(job.id, { status: "processing", progress: 10 });

      let result: ExportResult;

      switch (options.type) {
        case "group_statistics":
          exportJobManager.updateJob(job.id, { progress: 50 });
          result = await exportGroupStats(groupId, groupName, options.format);
          break;
        case "student_list":
          exportJobManager.updateJob(job.id, { progress: 50 });
          result = await exportStudentList(groupId, groupName, options.format);
          break;
        case "teacher_list":
          exportJobManager.updateJob(job.id, { progress: 50 });
          result = await exportTeacherList(groupId, groupName, options.format);
          break;
        case "reports":
          exportJobManager.updateJob(job.id, { progress: 50 });
          result = await exportReportsList(groupId, groupName, options.format);
          break;
        default:
          result = { success: false, error: "지원하지 않는 내보내기 타입입니다." };
      }

      if (result.success) {
        exportJobManager.updateJob(job.id, {
          status: "completed",
          progress: 100,
          fileName: result.fileName,
          downloadUrl: result.downloadUrl,
        });
      } else {
        exportJobManager.updateJob(job.id, {
          status: "failed",
          progress: 0,
          error: result.error,
        });
      }
    } catch (error) {
      exportJobManager.updateJob(job.id, {
        status: "failed",
        progress: 0,
        error: error instanceof Error ? error.message : "내보내기 작업 중 오류가 발생했습니다.",
      });
    }
  }, 100);

  return { jobId: job.id };
}

/**
 * 내보내기 작업 상태 조회
 */
export function getExportJobStatus(jobId: string): ExportJob | null {
  return exportJobManager.getJob(jobId) || null;
}

/**
 * 지원되는 내보내기 형식 조회
 */
export function getSupportedFormats(type: ExportType): ExportFormat[] {
  const allFormats: ExportFormat[] = ["excel", "csv", "json"];

  switch (type) {
    case "form_responses":
      return ["excel", "csv", "json"];
    case "reports":
      return ["excel", "csv", "pdf", "json"];
    default:
      return allFormats;
  }
}

export default {
  exportGroupStats,
  exportFormStats,
  exportStudentList,
  exportTeacherList,
  exportFormResponses,
  exportReportsList,
  exportBulkData,
  exportDataAsync,
  getExportJobStatus,
  getSupportedFormats,
  exportJobManager,
};
