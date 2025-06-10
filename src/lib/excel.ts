// lib/excel.ts
// Excel 파일 처리 관련 함수들 - 읽기, 쓰기, 템플릿 생성, 데이터 변환 등

import * as XLSX from "xlsx";
import type { APIResponse, UserRole, GroupStatistics, FormStatistics } from "./types";

/**
 * Excel 컬럼 정의
 */
export interface ExcelColumn {
  key: string;
  header: string;
  width?: number;
  type?: "string" | "number" | "date" | "boolean";
  required?: boolean;
  validation?: (value: any) => boolean;
  transform?: (value: any) => any;
}

/**
 * Excel 읽기 결과
 */
export interface ExcelReadResult<T = any> {
  success: boolean;
  data?: T[];
  errors?: Array<{
    row: number;
    column: string;
    message: string;
    value: any;
  }>;
  warnings?: Array<{
    row: number;
    column: string;
    message: string;
    value: any;
  }>;
  totalRows: number;
  validRows: number;
}

/**
 * 학생 데이터 인터페이스
 */
export interface StudentExcelData {
  name: string;
  email: string;
  phone?: string;
  birth_date?: string;
  student_number?: string;
  class_name?: string;
  parent_phone?: string;
}

/**
 * 선생님/시간제 강사 데이터 인터페이스
 */
export interface TeacherExcelData {
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  assigned_classes?: string;
}

/**
 * 학생 Excel 템플릿 컬럼 정의
 */
export const STUDENT_EXCEL_COLUMNS: ExcelColumn[] = [
  {
    key: "name",
    header: "이름",
    width: 15,
    type: "string",
    required: true,
    validation: (value) => typeof value === "string" && value.trim().length >= 2,
    transform: (value) => String(value).trim(),
  },
  {
    key: "email",
    header: "이메일",
    width: 25,
    type: "string",
    required: true,
    validation: (value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(String(value));
    },
    transform: (value) => String(value).trim().toLowerCase(),
  },
  {
    key: "phone",
    header: "전화번호",
    width: 15,
    type: "string",
    required: false,
    validation: (value) => {
      if (!value) return true;
      const phoneRegex = /^01[0-9]\d{8}$/;
      return phoneRegex.test(String(value).replace(/\D/g, ""));
    },
    transform: (value) => (value ? String(value).replace(/\D/g, "") : undefined),
  },
  {
    key: "birth_date",
    header: "생년월일",
    width: 12,
    type: "date",
    required: false,
    validation: (value) => {
      if (!value) return true;
      const date = new Date(value);
      return !isNaN(date.getTime()) && date < new Date();
    },
    transform: (value) => {
      if (!value) return undefined;
      const date = new Date(value);
      return date.toISOString().split("T")[0];
    },
  },
  {
    key: "student_number",
    header: "학번",
    width: 15,
    type: "string",
    required: false,
    transform: (value) => (value ? String(value).trim() : undefined),
  },
  {
    key: "class_name",
    header: "반 이름",
    width: 15,
    type: "string",
    required: false,
    transform: (value) => (value ? String(value).trim() : undefined),
  },
  {
    key: "parent_phone",
    header: "학부모 전화번호",
    width: 15,
    type: "string",
    required: false,
    validation: (value) => {
      if (!value) return true;
      const phoneRegex = /^01[0-9]\d{8}$/;
      return phoneRegex.test(String(value).replace(/\D/g, ""));
    },
    transform: (value) => (value ? String(value).replace(/\D/g, "") : undefined),
  },
];

/**
 * 선생님/시간제 강사 Excel 템플릿 컬럼 정의
 */
export const TEACHER_EXCEL_COLUMNS: ExcelColumn[] = [
  {
    key: "name",
    header: "이름",
    width: 15,
    type: "string",
    required: true,
    validation: (value) => typeof value === "string" && value.trim().length >= 2,
    transform: (value) => String(value).trim(),
  },
  {
    key: "email",
    header: "이메일",
    width: 25,
    type: "string",
    required: true,
    validation: (value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(String(value));
    },
    transform: (value) => String(value).trim().toLowerCase(),
  },
  {
    key: "phone",
    header: "전화번호",
    width: 15,
    type: "string",
    required: false,
    validation: (value) => {
      if (!value) return true;
      const phoneRegex = /^01[0-9]\d{8}$/;
      return phoneRegex.test(String(value).replace(/\D/g, ""));
    },
    transform: (value) => (value ? String(value).replace(/\D/g, "") : undefined),
  },
  {
    key: "role",
    header: "역할",
    width: 12,
    type: "string",
    required: true,
    validation: (value) => ["teacher", "part_time"].includes(String(value)),
    transform: (value) => String(value).toLowerCase(),
  },
  {
    key: "assigned_classes",
    header: "배정 반 (쉼표로 구분)",
    width: 25,
    type: "string",
    required: false,
    transform: (value) => (value ? String(value).trim() : undefined),
  },
];

/**
 * Excel 파일에서 데이터 읽기
 * @param file Excel 파일
 * @param columns 컬럼 정의
 * @param sheetName 시트명 (선택)
 * @returns 읽기 결과
 */
export async function readExcelFile<T>(
  file: File,
  columns: ExcelColumn[],
  sheetName?: string
): Promise<ExcelReadResult<T>> {
  try {
    // 파일을 ArrayBuffer로 읽기
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    // 시트 선택
    const sheet = sheetName ? workbook.Sheets[sheetName] : workbook.Sheets[workbook.SheetNames[0]];

    if (!sheet) {
      return {
        success: false,
        errors: [
          { row: 0, column: "file", message: "유효한 시트를 찾을 수 없습니다.", value: null },
        ],
        totalRows: 0,
        validRows: 0,
      };
    }

    // 시트를 JSON으로 변환
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (jsonData.length < 2) {
      return {
        success: false,
        errors: [
          { row: 0, column: "file", message: "데이터가 없거나 헤더만 있습니다.", value: null },
        ],
        totalRows: 0,
        validRows: 0,
      };
    }

    // 헤더 행 추출 및 매핑
    const headerRow = jsonData[0] as string[];
    const columnMapping = createColumnMapping(headerRow, columns);

    const data: T[] = [];
    const errors: ExcelReadResult["errors"] = [];
    const warnings: ExcelReadResult["warnings"] = [];

    // 데이터 행 처리 (1번째 행부터 시작, 0번째는 헤더)
    for (let rowIndex = 1; rowIndex < jsonData.length; rowIndex++) {
      const row = jsonData[rowIndex] as any[];
      const rowData: any = {};
      let hasError = false;

      // 각 컬럼 처리
      for (const column of columns) {
        const cellIndex = columnMapping[column.key];
        let cellValue = cellIndex !== undefined ? row[cellIndex] : undefined;

        // 빈 셀 처리
        if (cellValue === undefined || cellValue === null || cellValue === "") {
          if (column.required) {
            errors.push({
              row: rowIndex + 1,
              column: column.header,
              message: "필수 항목입니다.",
              value: cellValue,
            });
            hasError = true;
          }
          continue;
        }

        // 데이터 변환
        if (column.transform) {
          cellValue = column.transform(cellValue);
        }

        // 데이터 검증
        if (column.validation && !column.validation(cellValue)) {
          errors.push({
            row: rowIndex + 1,
            column: column.header,
            message: "유효하지 않은 값입니다.",
            value: cellValue,
          });
          hasError = true;
        }

        rowData[column.key] = cellValue;
      }

      // 유효한 행만 추가
      if (!hasError) {
        data.push(rowData as T);
      }
    }

    return {
      success: true,
      data,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      totalRows: jsonData.length - 1,
      validRows: data.length,
    };
  } catch (error) {
    return {
      success: false,
      errors: [
        {
          row: 0,
          column: "file",
          message: `파일 읽기 오류: ${error instanceof Error ? error.message : "알 수 없는 오류"}`,
          value: null,
        },
      ],
      totalRows: 0,
      validRows: 0,
    };
  }
}

/**
 * 학생 Excel 파일 읽기
 * @param file Excel 파일
 * @returns 학생 데이터 읽기 결과
 */
export async function readStudentExcel(file: File): Promise<ExcelReadResult<StudentExcelData>> {
  return readExcelFile<StudentExcelData>(file, STUDENT_EXCEL_COLUMNS);
}

/**
 * 선생님/시간제 강사 Excel 파일 읽기
 * @param file Excel 파일
 * @returns 선생님 데이터 읽기 결과
 */
export async function readTeacherExcel(file: File): Promise<ExcelReadResult<TeacherExcelData>> {
  return readExcelFile<TeacherExcelData>(file, TEACHER_EXCEL_COLUMNS);
}

/**
 * Excel 템플릿 생성
 * @param columns 컬럼 정의
 * @param templateName 템플릿 이름
 * @param sampleData 샘플 데이터 (선택)
 * @returns Excel 파일 Blob
 */
export function createExcelTemplate(
  columns: ExcelColumn[],
  templateName: string,
  sampleData?: any[]
): Blob {
  // 새 워크북 생성
  const workbook = XLSX.utils.book_new();

  // 헤더 데이터 생성
  const headers = columns.map((col) => col.header);
  const wsData = [headers];

  // 샘플 데이터 추가
  if (sampleData && sampleData.length > 0) {
    sampleData.forEach((sample) => {
      const row = columns.map((col) => sample[col.key] || "");
      wsData.push(row);
    });
  } else {
    // 기본 샘플 행 추가
    const sampleRow = columns.map((col) => {
      switch (col.type) {
        case "string":
          return col.key === "email" ? "example@email.com" : "예시";
        case "number":
          return 0;
        case "date":
          return "2024-01-01";
        case "boolean":
          return false;
        default:
          return "";
      }
    });
    wsData.push(sampleRow);
  }

  // 워크시트 생성
  const worksheet = XLSX.utils.aoa_to_sheet(wsData);

  // 컬럼 너비 설정
  const colWidths = columns.map((col) => ({ wch: col.width || 15 }));
  worksheet["!cols"] = colWidths;

  // 헤더 스타일 설정 (범위 지정)
  const headerRange = XLSX.utils.encode_range({
    s: { c: 0, r: 0 },
    e: { c: columns.length - 1, r: 0 },
  });
  worksheet["!ref"] = headerRange;

  // 워크북에 시트 추가
  XLSX.utils.book_append_sheet(workbook, worksheet, templateName);

  // Excel 파일로 변환
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  return new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/**
 * 학생 Excel 템플릿 생성
 * @returns Excel 파일 Blob
 */
export function createStudentExcelTemplate(): Blob {
  const sampleData = [
    {
      name: "홍길동",
      email: "student@example.com",
      phone: "01012345678",
      birth_date: "2000-01-01",
      student_number: "2024001",
      class_name: "A반",
      parent_phone: "01087654321",
    },
  ];

  return createExcelTemplate(STUDENT_EXCEL_COLUMNS, "학생 목록", sampleData);
}

/**
 * 선생님/시간제 강사 Excel 템플릿 생성
 * @returns Excel 파일 Blob
 */
export function createTeacherExcelTemplate(): Blob {
  const sampleData = [
    {
      name: "김선생",
      email: "teacher@example.com",
      phone: "01012345678",
      role: "teacher",
      assigned_classes: "A반, B반",
    },
    {
      name: "이강사",
      email: "parttime@example.com",
      phone: "01087654321",
      role: "part_time",
      assigned_classes: "C반",
    },
  ];

  return createExcelTemplate(TEACHER_EXCEL_COLUMNS, "교직원 목록", sampleData);
}

/**
 * 데이터를 Excel 파일로 내보내기
 * @param data 데이터 배열
 * @param columns 컬럼 정의
 * @param filename 파일명
 * @returns Excel 파일 Blob
 */
export function exportToExcel<T>(data: T[], columns: ExcelColumn[], filename: string): Blob {
  const workbook = XLSX.utils.book_new();

  // 헤더 생성
  const headers = columns.map((col) => col.header);

  // 데이터 변환
  const excelData = [headers];
  data.forEach((item) => {
    const row = columns.map((col) => {
      const value = (item as any)[col.key];

      // 날짜 형식 처리
      if (col.type === "date" && value) {
        return new Date(value).toLocaleDateString("ko-KR");
      }

      // 숫자 형식 처리
      if (col.type === "number" && value !== null && value !== undefined) {
        return Number(value);
      }

      return value || "";
    });
    excelData.push(row);
  });

  // 워크시트 생성
  const worksheet = XLSX.utils.aoa_to_sheet(excelData);

  // 컬럼 너비 설정
  const colWidths = columns.map((col) => ({ wch: col.width || 15 }));
  worksheet["!cols"] = colWidths;

  // 워크북에 시트 추가
  XLSX.utils.book_append_sheet(workbook, worksheet, filename);

  // Excel 파일로 변환
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  return new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/**
 * 그룹 통계를 Excel로 내보내기
 * @param statistics 그룹 통계 데이터
 * @param groupName 그룹명
 * @returns Excel 파일 Blob
 */
export function exportGroupStatistics(statistics: GroupStatistics, groupName: string): Blob {
  const workbook = XLSX.utils.book_new();

  // 개요 시트
  const overviewData = [
    ["항목", "값"],
    ["그룹명", groupName],
    ["총 학생 수", statistics.total_students],
    ["총 선생님 수", statistics.total_teachers],
    ["총 시간제 강사 수", statistics.total_part_time],
    ["총 반 수", statistics.total_classes],
    ["총 폼 수", statistics.total_forms],
    ["완료된 폼 수", statistics.completed_forms],
    ["대기 중인 폼 수", statistics.pending_forms],
    ["완료율", `${statistics.completion_rate}%`],
    ["생성일", new Date().toLocaleDateString("ko-KR")],
  ];

  const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
  overviewSheet["!cols"] = [{ wch: 20 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, overviewSheet, "개요");

  // Excel 파일로 변환
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  return new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/**
 * 폼 통계를 Excel로 내보내기
 * @param statistics 폼 통계 데이터
 * @returns Excel 파일 Blob
 */
export function exportFormStatistics(statistics: FormStatistics): Blob {
  const workbook = XLSX.utils.book_new();

  // 폼 개요 시트
  const overviewData = [
    ["항목", "값"],
    ["폼 제목", statistics.form_title],
    ["총 배정 수", statistics.total_assigned],
    ["완료 수", statistics.completed],
    ["진행 중", statistics.in_progress],
    ["미시작", statistics.not_started],
    ["완료율", `${statistics.completion_rate}%`],
    ["내보내기 일시", new Date().toLocaleString("ko-KR")],
  ];

  const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
  overviewSheet["!cols"] = [{ wch: 15 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, overviewSheet, "폼 개요");

  // 반별 통계 시트
  if (statistics.class_stats && statistics.class_stats.length > 0) {
    const classData = [["반 이름", "학생 수", "선생님 수", "완료율", "평균 점수"]];

    statistics.class_stats.forEach((cls) => {
      classData.push([
        cls.class_name,
        cls.student_count,
        cls.teacher_count,
        `${cls.completion_rate}%`,
        cls.average_score || "-",
      ]);
    });

    const classSheet = XLSX.utils.aoa_to_sheet(classData);
    classSheet["!cols"] = [{ wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(workbook, classSheet, "반별 통계");
  }

  // Excel 파일로 변환
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  return new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/**
 * 컬럼 매핑 생성 (헤더와 컬럼 정의 매칭)
 * @param headers 헤더 배열
 * @param columns 컬럼 정의 배열
 * @returns 컬럼 매핑 객체
 */
function createColumnMapping(headers: string[], columns: ExcelColumn[]): Record<string, number> {
  const mapping: Record<string, number> = {};

  columns.forEach((column) => {
    const headerIndex = headers.findIndex(
      (header) => header === column.header || header === column.key
    );

    if (headerIndex !== -1) {
      mapping[column.key] = headerIndex;
    }
  });

  return mapping;
}

/**
 * Excel 파일 검증
 * @param file 파일
 * @returns 검증 결과
 */
export function validateExcelFile(file: File): APIResponse {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = [
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];

  if (!file) {
    return { success: false, error: "파일을 선택해 주세요." };
  }

  if (file.size > maxSize) {
    return { success: false, error: "파일 크기는 10MB 이하여야 합니다." };
  }

  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: "Excel 파일(.xlsx, .xls)만 업로드 가능합니다." };
  }

  return { success: true };
}

/**
 * Excel 파일 다운로드 트리거
 * @param blob Excel 파일 Blob
 * @param filename 파일명
 */
export function downloadExcelFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * CSV를 Excel로 변환
 * @param csvContent CSV 내용
 * @param filename 파일명
 * @returns Excel 파일 Blob
 */
export function csvToExcel(csvContent: string, filename: string): Blob {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(csvContent.split("\n").map((row) => row.split(",")));

  XLSX.utils.book_append_sheet(workbook, worksheet, filename);

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  return new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/**
 * Excel에서 CSV로 변환
 * @param file Excel 파일
 * @param sheetName 시트명 (선택)
 * @returns CSV 내용
 */
export async function excelToCsv(file: File, sheetName?: string): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });

  const sheet = sheetName ? workbook.Sheets[sheetName] : workbook.Sheets[workbook.SheetNames[0]];

  return XLSX.utils.sheet_to_csv(sheet);
}
