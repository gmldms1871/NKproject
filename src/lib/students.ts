import { supabase } from "./supabase";
import type { Student, StudentInsert, StudentUpdate, FormattedStudent } from "../../types";

// 학생 생성
export async function createStudent(
  student: StudentInsert
): Promise<{ success: boolean; student?: Student; error?: string }> {
  try {
    console.log("Creating student with data:", JSON.stringify(student, null, 2));

    // 필수 필드 검증
    if (!student.name) {
      return { success: false, error: "이름은 필수 항목입니다." };
    }

    if (!student.group_id) {
      return { success: false, error: "그룹 ID는 필수 항목입니다." };
    }

    // 데이터 정제
    const cleanedStudent = {
      name: student.name,
      group_id: student.group_id,
      student_number: student.student_number || null,
      class_name: student.class_name || null,
      phone: student.phone || null,
      parent_phone: student.parent_phone || null,
    };

    console.log("Cleaned student data:", JSON.stringify(cleanedStudent, null, 2));

    const { data, error } = await supabase
      .from("students")
      .insert(cleanedStudent)
      .select()
      .single();

    if (error) {
      console.error("Supabase error creating student:", error);
      return { success: false, error: error.message || JSON.stringify(error) };
    }

    console.log("Student created successfully:", data);
    return { success: true, student: data };
  } catch (error) {
    console.error("Error creating student:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
}

// 그룹별 학생 목록 조회
export async function getStudentsByGroupId(groupId: string): Promise<FormattedStudent[]> {
  try {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("group_id", groupId)
      .order("name");

    if (error) {
      console.error("Error fetching students:", error);
      return [];
    }

    const formattedStudents: FormattedStudent[] = (data || []).map((student) => ({
      id: student.id,
      name: student.name,
      student_number: student.student_number,
      class_name: student.class_name,
      group_id: student.group_id,
      phone: student.phone,
      parent_phone: student.parent_phone,
      created_at: student.created_at,
      updated_at: student.updated_at,
    }));

    return formattedStudents;
  } catch (error) {
    console.error("Error fetching students:", error);
    return [];
  }
}

// 학생 상세 정보 조회
export async function getStudentById(
  studentId: string
): Promise<{ success: boolean; student?: FormattedStudent; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("id", studentId)
      .single();

    if (error) {
      console.error("Error fetching student:", error);
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: "학생을 찾을 수 없습니다." };
    }

    const formattedStudent: FormattedStudent = {
      id: data.id,
      name: data.name,
      student_number: data.student_number,
      class_name: data.class_name,
      group_id: data.group_id,
      phone: data.phone,
      parent_phone: data.parent_phone,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    return { success: true, student: formattedStudent };
  } catch (error) {
    console.error("Error fetching student:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
}

// 학생 정보 업데이트
export async function updateStudent(
  studentId: string,
  updates: StudentUpdate
): Promise<{ success: boolean; student?: Student; error?: string }> {
  try {
    console.log("Updating student with ID:", studentId, "Data:", JSON.stringify(updates, null, 2));

    // 데이터 정제
    const cleanedUpdates = {
      name: updates.name,
      student_number: updates.student_number || null,
      class_name: updates.class_name || null,
      phone: updates.phone || null,
      parent_phone: updates.parent_phone || null,
    };

    const { data, error } = await supabase
      .from("students")
      .update(cleanedUpdates)
      .eq("id", studentId)
      .select()
      .single();

    if (error) {
      console.error("Error updating student:", error);
      return { success: false, error: error.message || JSON.stringify(error) };
    }

    console.log("Student updated successfully:", data);
    return { success: true, student: data };
  } catch (error) {
    console.error("Error updating student:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
}

// 학생 삭제
export async function deleteStudent(
  studentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("Deleting student with ID:", studentId);

    const { error } = await supabase.from("students").delete().eq("id", studentId);

    if (error) {
      console.error("Error deleting student:", error);
      return { success: false, error: error.message || JSON.stringify(error) };
    }

    console.log("Student deleted successfully");
    return { success: true };
  } catch (error) {
    console.error("Error deleting student:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
}

// 반별 학생 목록 조회
export async function getStudentsByClass(
  groupId: string,
  className: string
): Promise<{ success: boolean; students?: FormattedStudent[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("group_id", groupId)
      .eq("class_name", className)
      .order("name");

    if (error) {
      console.error("Error fetching students by class:", error);
      return { success: false, error: error.message };
    }

    const formattedStudents: FormattedStudent[] = (data || []).map((student) => ({
      id: student.id,
      name: student.name,
      student_number: student.student_number,
      class_name: student.class_name,
      group_id: student.group_id,
      phone: student.phone,
      parent_phone: student.parent_phone,
      created_at: student.created_at,
      updated_at: student.updated_at,
    }));

    return { success: true, students: formattedStudents };
  } catch (error) {
    console.error("Error fetching students by class:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
}

// 그룹 내 반 목록 조회
export async function getClassesByGroup(
  groupId: string
): Promise<{ success: boolean; classes?: string[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("students")
      .select("class_name")
      .eq("group_id", groupId)
      .not("class_name", "is", null);

    if (error) {
      console.error("Error fetching classes:", error);
      return { success: false, error: error.message };
    }

    // null 값을 필터링하고 중복 제거
    const classNames = (data || [])
      .map((item) => item.class_name)
      .filter((className): className is string => className !== null);

    const classes = [...new Set(classNames)];

    return { success: true, classes };
  } catch (error) {
    console.error("Error fetching classes:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
}

// 학생 일괄 생성 (Excel 업로드용)
export async function createStudentsBatch(
  students: StudentInsert[]
): Promise<{ success: boolean; students?: Student[]; error?: string }> {
  try {
    console.log("Creating students batch:", JSON.stringify(students, null, 2));

    // 데이터 정제
    const cleanedStudents = students.map((student) => ({
      name: student.name,
      group_id: student.group_id,
      student_number: student.student_number || null,
      class_name: student.class_name || null,
      phone: student.phone || null,
      parent_phone: student.parent_phone || null,
    }));

    const { data, error } = await supabase.from("students").insert(cleanedStudents).select();

    if (error) {
      console.error("Error creating students batch:", error);
      return { success: false, error: error.message || JSON.stringify(error) };
    }

    console.log("Students batch created successfully:", data);
    return { success: true, students: data };
  } catch (error) {
    console.error("Error creating students batch:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
    };
  }
}
