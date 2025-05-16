import { supabase } from "./supabase";
import { summarizeWithGemini } from "./gemini";
import type { Report, UndefinedInput, ReportStats } from "@/types";

interface ReportFilters {
  status?: string;
  authorId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

// 보고서 생성
export const createReport = async (
  groupId: string,
  authorId: string,
  content: string,
  taskStatuses: Record<string, string>,
  additionalInputs: Record<string, string>
): Promise<{ success: boolean; report?: Report; error?: string }> => {
  try {
    // 1. 보고서 내용 요약 (Gemini API 사용)
    const summary = await summarizeWithGemini(content);

    // 2. 보고서 생성
    const { data: reportData, error: reportError } = await supabase
      .from("reports")
      .insert({
        group_id: groupId,
        auther_id: authorId,
        content,
        summary,
        reviewed: false,
      })
      .select()
      .single();

    if (reportError) throw reportError;

    // 3. 입력 설정 가져오기
    const { data: inputSettings, error: settingsError } = await supabase
      .from("input_settings")
      .select("id, field_name, field_type")
      .eq("group_id", groupId);

    if (settingsError) throw settingsError;

    // 4. 상태 및 추가 입력 저장
    const inputs: Array<{
      group_id: string;
      report_id: string;
      field_id: string;
      value: string;
    }> = [];

    // 상태 입력 처리
    for (const [fieldName, value] of Object.entries(taskStatuses)) {
      const setting = inputSettings.find((s) => s.field_name === fieldName);
      if (setting) {
        inputs.push({
          group_id: groupId,
          report_id: reportData.id,
          field_id: setting.id,
          value,
        });
      }
    }

    // 추가 입력 처리
    for (const [fieldName, value] of Object.entries(additionalInputs)) {
      const setting = inputSettings.find((s) => s.field_name === fieldName);
      if (setting && value) {
        inputs.push({
          group_id: groupId,
          report_id: reportData.id,
          field_id: setting.id,
          value,
        });
      }
    }

    // 입력 데이터 저장
    if (inputs.length > 0) {
      const { error: inputsError } = await supabase
        .from("undefined_inputs")
        .insert(inputs);

      if (inputsError) throw inputsError;
    }

    return { success: true, report: reportData as Report };
  } catch (error) {
    console.error(
      "Error creating report:",
      error instanceof Error ? error.message : String(error)
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

// 보고서 목록 가져오기
export const getReports = async (
  groupId: string,
  filters: ReportFilters = {}
): Promise<{ success: boolean; reports?: Report[]; error?: string }> => {
  try {
    // 1. 보고서 기본 정보 가져오기
    let query = supabase
      .from("reports")
      .select(
        `
        id,
        group_id,
        auther_id,
        content,
        summary,
        reviewed,
        created_at
      `
      )
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });

    // 필터 적용
    if (filters.authorId) {
      query = query.eq("auther_id", filters.authorId);
    }

    if (filters.startDate) {
      query = query.gte("created_at", filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte("created_at", filters.endDate);
    }

    // 검색어 필터
    if (filters.search) {
      query = query.or(
        `content.ilike.%${filters.search}%,summary.ilike.%${filters.search}%`
      );
    }

    const { data: reports, error: reportsError } = await query;

    if (reportsError) throw reportsError;

    // 2. 보고서 ID 목록 추출
    const reportIds = reports.map((report) => report.id);

    if (reportIds.length === 0) {
      return { success: true, reports: [] };
    }

    // 3. 작성자 정보 가져오기
    const { data: authors, error: authorsError } = await supabase
      .from("users")
      .select("id, name, email, nick_name")
      .in(
        "id",
        reports.map((report) => report.auther_id)
      );

    if (authorsError) throw authorsError;

    // 4. 보고서별 입력 데이터 가져오기
    const { data: inputsData, error: inputsError } = await supabase
      .from("undefined_inputs")
      .select(
        `
        id,
        report_id,
        field_id,
        value
      `
      )
      .in("report_id", reportIds);

    if (inputsError) throw inputsError;

    // 5. 필드 정보 가져오기
    const fieldIds = [...new Set(inputsData.map((input) => input.field_id))];

    let fields: Array<{ id: string; field_name: string; field_type: string }> =
      [];

    if (fieldIds.length > 0) {
      const { data: fieldsData, error: fieldsError } = await supabase
        .from("input_settings")
        .select("id, field_name, field_type")
        .in("id", fieldIds);

      if (fieldsError) throw fieldsError;

      fields = fieldsData;
    }

    // 6. 데이터 결합
    const reportsWithData = reports.map((report) => {
      // 작성자 정보 찾기
      const author = authors.find((author) => author.id === report.auther_id);

      // 보고서 입력 데이터 찾기
      const reportInputs = inputsData
        .filter((input) => input.report_id === report.id)
        .map((input) => {
          // 필드 정보 찾기
          const field = fields.find((field) => field.id === input.field_id);
          return {
            id: input.id,
            group_id: report.group_id, // group_id 추가
            report_id: input.report_id,
            field_id: input.field_id,
            value: input.value,
            created_at: report.created_at, // created_at 추가 (실제 값이 없으므로 보고서의 created_at 사용)
            field: field
              ? {
                  id: field.id,
                  field_name: field.field_name,
                  field_type: field.field_type,
                }
              : undefined,
          };
        });

      return {
        ...report,
        author: author
          ? {
              id: author.id,
              name: author.name,
              email: author.email,
              nick_name: author.nick_name,
            }
          : undefined,
        undefined_inputs: reportInputs,
      };
    });

    // 7. 상태 필터 적용
    let filteredReports = reportsWithData;
    if (filters.status) {
      filteredReports = reportsWithData.filter((report) => {
        const statusInputs = report.undefined_inputs.filter((input) => {
          return input.field?.field_type === "select";
        });
        return statusInputs.some((input) => input.value === filters.status);
      });
    }

    return { success: true, reports: filteredReports };
  } catch (error) {
    console.error(
      "Error getting reports:",
      error instanceof Error ? error.message : String(error)
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

// 보고서 상세 정보 가져오기
export const getReportDetails = async (
  reportId: string
): Promise<{ success: boolean; report?: Report; error?: string }> => {
  try {
    // 1. 보고서 기본 정보 가져오기
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .select(
        `
        id,
        group_id,
        auther_id,
        content,
        summary,
        reviewed,
        created_at
      `
      )
      .eq("id", reportId)
      .single();

    if (reportError) throw reportError;

    // 2. 작성자 정보 가져오기
    const { data: author, error: authorError } = await supabase
      .from("users")
      .select("id, name, email, nick_name")
      .eq("id", report.auther_id)
      .single();

    if (authorError) throw authorError;

    // 3. 보고서 입력 데이터 가져오기
    const { data: inputsData, error: inputsError } = await supabase
      .from("undefined_inputs")
      .select(
        `
        id,
        field_id,
        value
      `
      )
      .eq("report_id", reportId);

    if (inputsError) throw inputsError;

    // 4. 필드 정보 가져오기
    const fieldIds = [...new Set(inputsData.map((input) => input.field_id))];

    let inputsWithFields: UndefinedInput[] = [];

    if (fieldIds.length > 0) {
      const { data: fields, error: fieldsError } = await supabase
        .from("input_settings")
        .select("id, field_name, field_type")
        .in("id", fieldIds);

      if (fieldsError) throw fieldsError;

      // 5. 입력 데이터와 필드 정보 결합
      inputsWithFields = inputsData.map((input) => {
        const field = fields.find((field) => field.id === input.field_id);
        return {
          id: input.id,
          field_id: input.field_id,
          group_id: report.group_id,
          report_id: reportId,
          value: input.value,
          created_at: new Date().toISOString(), // 실제 created_at 값이 없으므로 현재 시간 사용
          field: field
            ? {
                id: field.id,
                field_name: field.field_name,
                field_type: field.field_type,
              }
            : undefined,
        };
      });
    }

    // 6. 보고서와 모든 데이터 결합
    const reportWithData: Report = {
      ...report,
      author: {
        id: author.id,
        name: author.name,
        email: author.email,
        nick_name: author.nick_name,
      },
      undefined_inputs: inputsWithFields,
    };

    return { success: true, report: reportWithData };
  } catch (error) {
    console.error(
      "Error getting report details:",
      error instanceof Error ? error.message : String(error)
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

// 보고서 업데이트
export const updateReport = async (
  reportId: string,
  updates: {
    content?: string;
    reviewed?: boolean;
  }
): Promise<{ success: boolean; error?: string }> => {
  try {
    const updatedFields: Record<string, unknown> = { ...updates };

    // 내용이 변경된 경우 요약 다시 생성
    if (updates.content) {
      updatedFields.summary = await summarizeWithGemini(updates.content);
    }

    const { error } = await supabase
      .from("reports")
      .update(updatedFields)
      .eq("id", reportId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error(
      "Error updating report:",
      error instanceof Error ? error.message : String(error)
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

// 보고서 삭제
export const deleteReport = async (
  reportId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // 1. 연결된 입력 데이터 삭제
    const { error: inputsError } = await supabase
      .from("undefined_inputs")
      .delete()
      .eq("report_id", reportId);

    if (inputsError) throw inputsError;

    // 2. 보고서 삭제
    const { error } = await supabase
      .from("reports")
      .delete()
      .eq("id", reportId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error(
      "Error deleting report:",
      error instanceof Error ? error.message : String(error)
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

// 보고서 입력 값 업데이트
export const updateReportInput = async (
  inputId: string,
  value: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from("undefined_inputs")
      .update({ value })
      .eq("id", inputId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error(
      "Error updating report input:",
      error instanceof Error ? error.message : String(error)
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

// 보고서에 새 입력 추가
export const addReportInput = async (
  reportId: string,
  groupId: string,
  fieldId: string,
  value: string
): Promise<{ success: boolean; input?: UndefinedInput; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from("undefined_inputs")
      .insert({
        report_id: reportId,
        group_id: groupId,
        field_id: fieldId,
        value,
      })
      .select()
      .single();

    if (error) throw error;

    // 필드 정보 가져오기
    const { data: field, error: fieldError } = await supabase
      .from("input_settings")
      .select("id, field_name, field_type")
      .eq("id", fieldId)
      .single();

    if (fieldError) throw fieldError;

    const inputWithField: UndefinedInput = {
      id: data.id,
      group_id: data.group_id,
      report_id: data.report_id,
      field_id: data.field_id,
      value: data.value,
      created_at: data.created_at,
      field: {
        id: field.id,
        field_name: field.field_name,
        field_type: field.field_type,
      },
    };

    return { success: true, input: inputWithField };
  } catch (error) {
    console.error(
      "Error adding report input:",
      error instanceof Error ? error.message : String(error)
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

// 보고서 입력 삭제
export const deleteReportInput = async (
  inputId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from("undefined_inputs")
      .delete()
      .eq("id", inputId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error(
      "Error deleting report input:",
      error instanceof Error ? error.message : String(error)
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

// 최근 보고서 가져오기
export const getRecentReports = async (
  groupId: string,
  limit = 5
): Promise<{ success: boolean; reports?: Report[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from("reports")
      .select(
        `
        id,
        content,
        summary,
        reviewed,
        created_at,
        auther_id,
        group_id
      `
      )
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    // 작성자 정보 가져오기
    if (data.length > 0) {
      const { data: authors, error: authorsError } = await supabase
        .from("users")
        .select("id, name, email, nick_name")
        .in(
          "id",
          data.map((report) => report.auther_id)
        );

      if (authorsError) throw authorsError;

      // 데이터 결합
      const reportsWithAuthors: Report[] = data.map((report) => {
        const author = authors.find((author) => author.id === report.auther_id);
        return {
          ...report,
          author: author
            ? {
                id: author.id,
                name: author.name,
                email: author.email,
                nick_name: author.nick_name,
              }
            : undefined,
          undefined_inputs: [], // 빈 배열 추가
        };
      });

      return { success: true, reports: reportsWithAuthors };
    }

    return { success: true, reports: data as Report[] };
  } catch (error) {
    console.error(
      "Error getting recent reports:",
      error instanceof Error ? error.message : String(error)
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

// 사용자별 보고서 가져오기
export const getUserReports = async (
  userId: string,
  limit = 10
): Promise<{ success: boolean; reports?: Report[]; error?: string }> => {
  try {
    const { data: reports, error: reportsError } = await supabase
      .from("reports")
      .select(
        `
        id,
        content,
        summary,
        reviewed,
        created_at,
        group_id,
        auther_id
      `
      )
      .eq("auther_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (reportsError) throw reportsError;

    // 그룹 정보 가져오기
    if (reports.length > 0) {
      const { data: groups, error: groupsError } = await supabase
        .from("groups")
        .select("id, name")
        .in(
          "id",
          reports.map((report) => report.group_id)
        );

      if (groupsError) throw groupsError;

      // 데이터 결합
      const reportsWithGroups: Report[] = reports.map((report) => {
        const group = groups.find((group) => group.id === report.group_id);
        return {
          ...report,
          group: group
            ? {
                id: group.id,
                name: group.name,
              }
            : undefined,
          undefined_inputs: [], // 빈 배열 추가
        };
      });

      return { success: true, reports: reportsWithGroups };
    }

    return {
      success: true,
      reports: reports.map((report) => ({
        ...report,
        undefined_inputs: [],
      })),
    };
  } catch (error) {
    console.error(
      "Error getting user reports:",
      error instanceof Error ? error.message : String(error)
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

// 그룹별 보고서 통계 가져오기
export const getReportStats = async (
  groupId: string,
  period: "day" | "week" | "month" = "week"
): Promise<{ success: boolean; stats?: ReportStats; error?: string }> => {
  try {
    // 기간에 따른 시작일 계산
    const now = new Date();
    const startDate = new Date();

    switch (period) {
      case "day":
        startDate.setDate(now.getDate() - 1);
        break;
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(now.getMonth() - 1);
        break;
    }

    // 보고서 데이터 가져오기
    const { data: reports, error: reportsError } = await supabase
      .from("reports")
      .select(
        `
        id,
        created_at,
        reviewed,
        auther_id
      `
      )
      .eq("group_id", groupId)
      .gte("created_at", startDate.toISOString());

    if (reportsError) throw reportsError;

    // 작성자 정보 가져오기
    const authorIds = [...new Set(reports.map((report) => report.auther_id))];

    let authorMap: Record<string, string> = {};

    if (authorIds.length > 0) {
      const { data: authors, error: authorsError } = await supabase
        .from("users")
        .select("id, name")
        .in("id", authorIds);

      if (authorsError) throw authorsError;

      // 작성자 ID -> 이름 매핑
      authorMap = authors.reduce((map, author) => {
        map[author.id] = author.name || "Unknown";
        return map;
      }, {} as Record<string, string>);
    }

    // 통계 계산
    const stats: ReportStats = {
      total: reports.length,
      reviewed: reports.filter((report) => report.reviewed).length,
      pending: reports.filter((report) => !report.reviewed).length,
      byAuthor: {} as Record<string, number>,
      byDate: {} as Record<string, number>,
    };

    // 작성자별 통계
    reports.forEach((report) => {
      const authorName = authorMap[report.auther_id] || "Unknown";

      if (!stats.byAuthor[authorName]) {
        stats.byAuthor[authorName] = 0;
      }
      stats.byAuthor[authorName]++;

      // 날짜별 통계 (YYYY-MM-DD 형식)
      const reportDate = new Date(report.created_at)
        .toISOString()
        .split("T")[0];
      if (!stats.byDate[reportDate]) {
        stats.byDate[reportDate] = 0;
      }
      stats.byDate[reportDate]++;
    });

    return { success: true, stats };
  } catch (error) {
    console.error(
      "Error getting report stats:",
      error instanceof Error ? error.message : String(error)
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

// 보고서 일괄 검토 상태 변경
export const bulkUpdateReportStatus = async (
  reportIds: string[],
  reviewed: boolean
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from("reports")
      .update({ reviewed })
      .in("id", reportIds);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error(
      "Error bulk updating report status:",
      error instanceof Error ? error.message : String(error)
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};
