// lib/storage.ts
// 파일 스토리지 관리 관련 함수들 - 업로드, 다운로드, 삭제, 권한 관리 등

import { supabase } from "./supabase";
import type { APIResponse } from "./types";

/**
 * 스토리지 버킷 정의
 */
export const STORAGE_BUCKETS = {
  REPORTS: "reports",
  FORM_ATTACHMENTS: "form-attachments",
  PROFILE_IMAGES: "profile-images",
  GROUP_ASSETS: "group-assets",
  EXPORTS: "exports",
  TEMP: "temp",
} as const;

/**
 * 파일 타입 정의
 */
export const FILE_TYPES = {
  IMAGE: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  DOCUMENT: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  SPREADSHEET: [
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
  PRESENTATION: [
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],
  ARCHIVE: ["application/zip", "application/x-rar-compressed", "application/x-7z-compressed"],
  TEXT: ["text/plain", "text/csv", "text/html", "text/markdown"],
} as const;

/**
 * 최대 파일 크기 (바이트)
 */
export const MAX_FILE_SIZES = {
  IMAGE: 5 * 1024 * 1024, // 5MB
  DOCUMENT: 10 * 1024 * 1024, // 10MB
  SPREADSHEET: 15 * 1024 * 1024, // 15MB
  PROFILE_IMAGE: 2 * 1024 * 1024, // 2MB
  REPORT: 50 * 1024 * 1024, // 50MB
  EXPORT: 100 * 1024 * 1024, // 100MB
} as const;

/**
 * 파일 업로드 옵션
 */
export interface UploadOptions {
  bucket: string;
  folder?: string;
  filename?: string;
  upsert?: boolean;
  cacheControl?: string;
  contentType?: string;
  metadata?: Record<string, any>;
}

/**
 * 파일 업로드 결과
 */
export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  size?: number;
  error?: string;
}

/**
 * 파일 정보
 */
export interface FileInfo {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  path: string;
  url: string;
  metadata?: Record<string, any>;
}

/**
 * 파일 업로드
 * @param file 업로드할 파일
 * @param options 업로드 옵션
 * @returns 업로드 결과
 */
export async function uploadFile(file: File, options: UploadOptions): Promise<UploadResult> {
  try {
    // 파일 검증
    const validation = validateFile(file, options.bucket);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    // 파일 경로 생성
    const filePath = generateFilePath(file, options);

    // Supabase Storage에 업로드
    const { data, error } = await supabase.storage.from(options.bucket).upload(filePath, file, {
      cacheControl: options.cacheControl || "3600",
      upsert: options.upsert || false,
      contentType: options.contentType || file.type,
      metadata: options.metadata,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // 공개 URL 생성
    const { data: urlData } = supabase.storage.from(options.bucket).getPublicUrl(data.path);

    return {
      success: true,
      url: urlData.publicUrl,
      path: data.path,
      size: file.size,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "파일 업로드 중 오류 발생",
    };
  }
}

/**
 * 여러 파일 업로드
 * @param files 업로드할 파일 배열
 * @param options 업로드 옵션
 * @returns 업로드 결과 배열
 */
export async function uploadMultipleFiles(
  files: File[],
  options: UploadOptions
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];

  for (const file of files) {
    const result = await uploadFile(file, {
      ...options,
      filename: undefined, // 각 파일마다 고유 이름 생성
    });
    results.push(result);
  }

  return results;
}

/**
 * 파일 다운로드
 * @param bucket 버킷명
 * @param path 파일 경로
 * @returns 다운로드 결과
 */
export async function downloadFile(bucket: string, path: string): Promise<APIResponse<Blob>> {
  try {
    const { data, error } = await supabase.storage.from(bucket).download(path);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "파일 다운로드 중 오류 발생",
    };
  }
}

/**
 * 파일 삭제
 * @param bucket 버킷명
 * @param paths 삭제할 파일 경로 배열
 * @returns 삭제 결과
 */
export async function deleteFiles(
  bucket: string,
  paths: string[]
): Promise<APIResponse<{ deleted: string[]; failed: string[] }>> {
  try {
    const { data, error } = await supabase.storage.from(bucket).remove(paths);

    if (error) {
      return { success: false, error: error.message };
    }

    const deleted = data?.map((item) => item.name) || [];
    const failed = paths.filter((path) => !deleted.includes(path.split("/").pop() || ""));

    return {
      success: true,
      data: { deleted, failed },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "파일 삭제 중 오류 발생",
    };
  }
}

/**
 * 단일 파일 삭제
 * @param bucket 버킷명
 * @param path 파일 경로
 * @returns 삭제 결과
 */
export async function deleteFile(bucket: string, path: string): Promise<APIResponse> {
  const result = await deleteFiles(bucket, [path]);

  if (!result.success) {
    return result;
  }

  const wasDeleted = result.data?.deleted.length > 0;
  return {
    success: wasDeleted,
    error: wasDeleted ? undefined : "파일을 찾을 수 없습니다.",
  };
}

/**
 * 파일 목록 조회
 * @param bucket 버킷명
 * @param folder 폴더 경로 (선택)
 * @param options 조회 옵션
 * @returns 파일 목록
 */
export async function listFiles(
  bucket: string,
  folder?: string,
  options: {
    limit?: number;
    offset?: number;
    sortBy?: { column: string; order: "asc" | "desc" };
  } = {}
): Promise<APIResponse<FileInfo[]>> {
  try {
    const { data, error } = await supabase.storage.from(bucket).list(folder, {
      limit: options.limit,
      offset: options.offset,
      sortBy: options.sortBy,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // 파일 정보 변환
    const files: FileInfo[] = data
      .filter((item) => item.name) // 폴더 제외
      .map((item) => {
        const path = folder ? `${folder}/${item.name}` : item.name;
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);

        return {
          name: item.name!,
          size: item.metadata?.size || 0,
          type: item.metadata?.mimetype || "",
          lastModified: new Date(item.updated_at || item.created_at || "").getTime(),
          path,
          url: urlData.publicUrl,
          metadata: item.metadata,
        };
      });

    return { success: true, data: files };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "파일 목록 조회 중 오류 발생",
    };
  }
}

/**
 * 파일 존재 여부 확인
 * @param bucket 버킷명
 * @param path 파일 경로
 * @returns 존재 여부
 */
export async function fileExists(bucket: string, path: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage.from(bucket).download(path);

    return !error && !!data;
  } catch {
    return false;
  }
}

/**
 * 파일 메타데이터 조회
 * @param bucket 버킷명
 * @param path 파일 경로
 * @returns 메타데이터
 */
export async function getFileMetadata(bucket: string, path: string): Promise<APIResponse<any>> {
  try {
    const folder = path.substring(0, path.lastIndexOf("/"));
    const filename = path.substring(path.lastIndexOf("/") + 1);

    const { data, error } = await supabase.storage.from(bucket).list(folder, {
      search: filename,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const file = data.find((item) => item.name === filename);
    if (!file) {
      return { success: false, error: "파일을 찾을 수 없습니다." };
    }

    return { success: true, data: file.metadata };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "메타데이터 조회 중 오류 발생",
    };
  }
}

/**
 * 파일 복사
 * @param bucket 버킷명
 * @param fromPath 원본 경로
 * @param toPath 대상 경로
 * @returns 복사 결과
 */
export async function copyFile(
  bucket: string,
  fromPath: string,
  toPath: string
): Promise<APIResponse<string>> {
  try {
    const { data, error } = await supabase.storage.from(bucket).copy(fromPath, toPath);

    if (error) {
      return { success: false, error: error.message };
    }

    // 새 파일의 공개 URL 생성
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);

    return { success: true, data: urlData.publicUrl };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "파일 복사 중 오류 발생",
    };
  }
}

/**
 * 파일 이동
 * @param bucket 버킷명
 * @param fromPath 원본 경로
 * @param toPath 대상 경로
 * @returns 이동 결과
 */
export async function moveFile(
  bucket: string,
  fromPath: string,
  toPath: string
): Promise<APIResponse<string>> {
  try {
    const { data, error } = await supabase.storage.from(bucket).move(fromPath, toPath);

    if (error) {
      return { success: false, error: error.message };
    }

    // 새 파일의 공개 URL 생성
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);

    return { success: true, data: urlData.publicUrl };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "파일 이동 중 오류 발생",
    };
  }
}

/**
 * 임시 서명된 URL 생성
 * @param bucket 버킷명
 * @param path 파일 경로
 * @param expiresIn 만료 시간 (초)
 * @returns 서명된 URL
 */
export async function createSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<APIResponse<string>> {
  try {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data.signedUrl };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "서명된 URL 생성 중 오류 발생",
    };
  }
}

/**
 * 파일 검증
 * @param file 파일
 * @param bucket 버킷명
 * @returns 검증 결과
 */
function validateFile(file: File, bucket: string): { isValid: boolean; error?: string } {
  // 파일 크기 검증
  let maxSize = MAX_FILE_SIZES.DOCUMENT; // 기본값

  switch (bucket) {
    case STORAGE_BUCKETS.PROFILE_IMAGES:
      maxSize = MAX_FILE_SIZES.PROFILE_IMAGE;
      break;
    case STORAGE_BUCKETS.REPORTS:
      maxSize = MAX_FILE_SIZES.REPORT;
      break;
    case STORAGE_BUCKETS.EXPORTS:
      maxSize = MAX_FILE_SIZES.EXPORT;
      break;
  }

  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return {
      isValid: false,
      error: `파일 크기는 ${maxSizeMB}MB 이하여야 합니다.`,
    };
  }

  // 파일 타입 검증
  const allowedTypes = getAllowedFileTypes(bucket);
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: "허용되지 않은 파일 형식입니다.",
    };
  }

  // 파일명 검증
  if (file.name.length > 255) {
    return {
      isValid: false,
      error: "파일명은 255자 이하여야 합니다.",
    };
  }

  // 악성 파일 확장자 검증
  const dangerousExtensions = [".exe", ".bat", ".cmd", ".scr", ".pif", ".com"];
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
  if (dangerousExtensions.includes(fileExtension)) {
    return {
      isValid: false,
      error: "보안상 허용되지 않는 파일 형식입니다.",
    };
  }

  return { isValid: true };
}

/**
 * 버킷별 허용 파일 타입 조회
 * @param bucket 버킷명
 * @returns 허용 파일 타입 배열
 */
function getAllowedFileTypes(bucket: string): string[] {
  switch (bucket) {
    case STORAGE_BUCKETS.PROFILE_IMAGES:
      return FILE_TYPES.IMAGE;
    case STORAGE_BUCKETS.REPORTS:
      return [...FILE_TYPES.DOCUMENT, ...FILE_TYPES.SPREADSHEET, ...FILE_TYPES.IMAGE];
    case STORAGE_BUCKETS.FORM_ATTACHMENTS:
      return [
        ...FILE_TYPES.IMAGE,
        ...FILE_TYPES.DOCUMENT,
        ...FILE_TYPES.SPREADSHEET,
        ...FILE_TYPES.TEXT,
      ];
    case STORAGE_BUCKETS.EXPORTS:
      return [...FILE_TYPES.SPREADSHEET, ...FILE_TYPES.ARCHIVE, ...FILE_TYPES.TEXT];
    default:
      return []; // 모든 타입 허용
  }
}

/**
 * 파일 경로 생성
 * @param file 파일
 * @param options 옵션
 * @returns 생성된 파일 경로
 */
function generateFilePath(file: File, options: UploadOptions): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const fileExtension = file.name.substring(file.name.lastIndexOf("."));

  const filename = options.filename || `${timestamp}_${randomString}${fileExtension}`;

  if (options.folder) {
    return `${options.folder}/${filename}`;
  }

  return filename;
}

/**
 * 이미지 리사이징 (클라이언트 사이드)
 * @param file 이미지 파일
 * @param maxWidth 최대 너비
 * @param maxHeight 최대 높이
 * @param quality 품질 (0-1)
 * @returns 리사이징된 파일
 */
export function resizeImage(
  file: File,
  maxWidth: number = 800,
  maxHeight: number = 600,
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      // 비율 계산
      let { width, height } = img;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // 이미지 그리기
      ctx?.drawImage(img, 0, 0, width, height);

      // Blob으로 변환
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(resizedFile);
          } else {
            reject(new Error("이미지 리사이징 실패"));
          }
        },
        file.type,
        quality
      );
    };

    img.onerror = () => reject(new Error("이미지 로드 실패"));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * 파일 미리보기 URL 생성
 * @param file 파일
 * @returns 미리보기 URL
 */
export function createPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * 미리보기 URL 해제
 * @param url 미리보기 URL
 */
export function revokePreviewUrl(url: string): void {
  URL.revokeObjectURL(url);
}

/**
 * 파일 크기 포맷팅
 * @param bytes 바이트 크기
 * @returns 포맷된 크기 문자열
 */
export function formatFileSize(bytes: number): string {
  const sizes = ["Bytes", "KB", "MB", "GB"];
  if (bytes === 0) return "0 Bytes";

  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);

  return `${Math.round(size * 100) / 100} ${sizes[i]}`;
}

/**
 * 파일 타입 아이콘 클래스 조회
 * @param fileType 파일 타입
 * @returns 아이콘 클래스명
 */
export function getFileTypeIcon(fileType: string): string {
  if (FILE_TYPES.IMAGE.includes(fileType)) return "file-image";
  if (FILE_TYPES.DOCUMENT.includes(fileType)) return "file-text";
  if (FILE_TYPES.SPREADSHEET.includes(fileType)) return "file-spreadsheet";
  if (FILE_TYPES.PRESENTATION.includes(fileType)) return "file-presentation";
  if (FILE_TYPES.ARCHIVE.includes(fileType)) return "file-archive";
  if (FILE_TYPES.TEXT.includes(fileType)) return "file-text";
  return "file";
}

/**
 * 스토리지 사용량 조회
 * @param bucket 버킷명
 * @returns 사용량 정보
 */
export async function getStorageUsage(
  bucket: string
): Promise<APIResponse<{ totalFiles: number; totalSize: number }>> {
  try {
    const filesResult = await listFiles(bucket);
    if (!filesResult.success) {
      return { success: false, error: filesResult.error };
    }

    const files = filesResult.data!;
    const totalFiles = files.length;
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);

    return {
      success: true,
      data: { totalFiles, totalSize },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "사용량 조회 중 오류 발생",
    };
  }
}
