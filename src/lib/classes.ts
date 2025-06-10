// lib/classes.ts
// 반(클래스) 관리 관련 함수들 - 생성, 수정, 삭제, 멤버 관리, 통계 등

import { supabase } from "./supabase";
import type {
  Class,
  ClassInsert,
  ClassUpdate,
  ClassWithMembers,
  ClassMember,
  ClassMemberInsert,
  User,
  APIResponse,
  ClassStatistics,
  UserRole,
} from "./types";

/**
 * 새 반 생성
 * @param classData 반 정보
 * @returns 생성된 반 정보
 */
export async function createClass(
  classData: Omit<ClassInsert, "id" | "created_at" | "updated_at">
): Promise<APIResponse<Class>> {
  try {
    const { data, error } = await supabase
      .from("classes")
      .insert({
        ...classData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "반 생성 중 오류가 발생했습니다." };
  }
}

/**
 * 반 정보 조회
 * @param classId 반 ID
 * @returns 반 정보
 */
export async function getClass(classId: string): Promise<APIResponse<Class>> {
  try {
    const { data, error } = await supabase.from("classes").select("*").eq("id", classId).single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "반 정보 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 반 정보를 멤버와 함께 조회
 * @param classId 반 ID
 * @returns 멤버 정보가 포함된 반 데이터
 */
export async function getClassWithMembers(classId: string): Promise<APIResponse<ClassWithMembers>> {
  try {
    const { data, error } = await supabase
      .from("classes")
      .select(
        `
        *,
        class_members (
          id,
          role,
          joined_at,
          users (
            id,
            name,
            email,
            phone,
            birth_date
          )
        )
      `
      )
      .eq("id", classId)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // 학생과 시간제 강사 수 계산
    const students = data.class_members.filter((member) => member.role === "student");
    const partTimeTeachers = data.class_members.filter((member) => member.role === "part_time");

    const classWithStats = {
      ...data,
      _count: {
        students: students.length,
        part_time_teachers: partTimeTeachers.length,
      },
    };

    return { success: true, data: classWithStats };
  } catch (error) {
    return { success: false, error: "반 정보 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 반 정보 업데이트
 * @param classId 반 ID
 * @param updates 업데이트할 정보
 * @returns 업데이트된 반 정보
 */
export async function updateClass(
  classId: string,
  updates: ClassUpdate
): Promise<APIResponse<Class>> {
  try {
    const { data, error } = await supabase
      .from("classes")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", classId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "반 정보 업데이트 중 오류가 발생했습니다." };
  }
}

/**
 * 반 삭제
 * @param classId 반 ID
 * @returns 삭제 결과
 */
export async function deleteClass(classId: string): Promise<APIResponse> {
  try {
    const { error } = await supabase.from("classes").delete().eq("id", classId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, message: "반이 성공적으로 삭제되었습니다." };
  } catch (error) {
    return { success: false, error: "반 삭제 중 오류가 발생했습니다." };
  }
}

/**
 * 반에 멤버 추가
 * @param classId 반 ID
 * @param userId 사용자 ID
 * @param role 역할 (student 또는 part_time)
 * @returns 추가 결과
 */
export async function addClassMember(
  classId: string,
  userId: string,
  role: "student" | "part_time"
): Promise<APIResponse<ClassMember>> {
  try {
    // 이미 해당 반에 속해있는지 확인
    const { data: existingMember, error: checkError } = await supabase
      .from("class_members")
      .select("id")
      .eq("class_id", classId)
      .eq("user_id", userId)
      .single();

    if (existingMember) {
      return { success: false, error: "이미 해당 반에 속한 사용자입니다." };
    }

    const { data, error } = await supabase
      .from("class_members")
      .insert({
        class_id: classId,
        user_id: userId,
        role,
        joined_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "반 멤버 추가 중 오류가 발생했습니다." };
  }
}

/**
 * 반에서 멤버 제거
 * @param classId 반 ID
 * @param userId 사용자 ID
 * @returns 제거 결과
 */
export async function removeClassMember(classId: string, userId: string): Promise<APIResponse> {
  try {
    const { error } = await supabase
      .from("class_members")
      .delete()
      .eq("class_id", classId)
      .eq("user_id", userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, message: "반 멤버가 성공적으로 제거되었습니다." };
  } catch (error) {
    return { success: false, error: "반 멤버 제거 중 오류가 발생했습니다." };
  }
}

/**
 * 반 멤버 목록 조회
 * @param classId 반 ID
 * @param role 역할 필터 (선택)
 * @returns 멤버 목록
 */
export async function getClassMembers(
  classId: string,
  role?: "student" | "part_time"
): Promise<APIResponse<Array<ClassMember & { users: User }>>> {
  try {
    let query = supabase
      .from("class_members")
      .select(
        `
        *,
        users (
          id,
          name,
          email,
          phone,
          birth_date,
          created_at
        )
      `
      )
      .eq("class_id", classId);

    if (role) {
      query = query.eq("role", role);
    }

    const { data, error } = await query.order("joined_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "반 멤버 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 그룹 내 모든 반 조회
 * @param groupId 그룹 ID
 * @returns 반 목록
 */
export async function getGroupClasses(groupId: string): Promise<APIResponse<ClassWithMembers[]>> {
  try {
    const { data, error } = await supabase
      .from("classes")
      .select(
        `
        *,
        class_members (
          id,
          role,
          joined_at,
          users (
            id,
            name,
            email
          )
        )
      `
      )
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    // 각 반에 대한 통계 정보 추가
    const classesWithStats = data.map((classData) => ({
      ...classData,
      _count: {
        students: classData.class_members.filter((m) => m.role === "student").length,
        part_time_teachers: classData.class_members.filter((m) => m.role === "part_time").length,
      },
    }));

    return { success: true, data: classesWithStats };
  } catch (error) {
    return { success: false, error: "반 목록 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 사용자가 속한 반 목록 조회
 * @param userId 사용자 ID
 * @param role 역할 (선택)
 * @returns 사용자가 속한 반 목록
 */
export async function getUserClasses(
  userId: string,
  role?: "student" | "part_time"
): Promise<APIResponse<Array<{ class: Class; role: string; joined_at: string }>>> {
  try {
    let query = supabase
      .from("class_members")
      .select(
        `
        role,
        joined_at,
        classes (
          id,
          name,
          description,
          group_id,
          created_at,
          updated_at
        )
      `
      )
      .eq("user_id", userId);

    if (role) {
      query = query.eq("role", role);
    }

    const { data, error } = await query.order("joined_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    const userClasses = data.map((item) => ({
      class: item.classes,
      role: item.role,
      joined_at: item.joined_at!,
    }));

    return { success: true, data: userClasses };
  } catch (error) {
    return { success: false, error: "사용자 반 목록 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 반 통계 조회
 * @param classId 반 ID
 * @returns 반 통계 정보
 */
export async function getClassStatistics(classId: string): Promise<APIResponse<ClassStatistics>> {
  try {
    // 기본 반 정보 조회
    const { data: classInfo, error: classError } = await supabase
      .from("classes")
      .select("*")
      .eq("id", classId)
      .single();

    if (classError) {
      return { success: false, error: classError.message };
    }

    // 멤버 수 조회
    const { data: members, error: memberError } = await supabase
      .from("class_members")
      .select("role")
      .eq("class_id", classId);

    if (memberError) {
      return { success: false, error: memberError.message };
    }

    const studentCount = members.filter((m) => m.role === "student").length;
    const teacherCount = members.filter((m) => m.role === "part_time").length;

    // 폼 완료율 조회
    const { data: formInstances, error: formError } = await supabase
      .from("form_instances")
      .select("status, form_responses(value)")
      .in(
        "student_id",
        members.filter((m) => m.role === "student").map((m) => m.user_id)
      );

    if (formError) {
      return { success: false, error: formError.message };
    }

    const totalAssignments = formInstances.length;
    const completedAssignments = formInstances.filter(
      (instance) => instance.status === "final_completed"
    ).length;

    const completionRate =
      totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;

    // 평균 점수 계산 (폼 응답에서 점수 관련 필드가 있다면)
    let averageScore: number | undefined;
    // TODO: 실제 점수 계산 로직 구현 필요

    const statistics: ClassStatistics = {
      class_id: classId,
      class_name: classInfo.name,
      student_count: studentCount,
      teacher_count: teacherCount,
      completion_rate: completionRate,
      average_score: averageScore,
    };

    return { success: true, data: statistics };
  } catch (error) {
    return { success: false, error: "반 통계 조회 중 오류가 발생했습니다." };
  }
}

/**
 * 학생을 여러 반에 일괄 배정
 * @param studentIds 학생 ID 배열
 * @param classId 반 ID
 * @returns 배정 결과
 */
export async function assignStudentsToClass(
  studentIds: string[],
  classId: string
): Promise<APIResponse<ClassMember[]>> {
  try {
    // 이미 배정된 학생들 확인
    const { data: existingMembers, error: checkError } = await supabase
      .from("class_members")
      .select("user_id")
      .eq("class_id", classId)
      .in("user_id", studentIds);

    if (checkError) {
      return { success: false, error: checkError.message };
    }

    const existingUserIds = existingMembers.map((m) => m.user_id);
    const newStudentIds = studentIds.filter((id) => !existingUserIds.includes(id));

    if (newStudentIds.length === 0) {
      return { success: false, error: "모든 학생이 이미 해당 반에 배정되어 있습니다." };
    }

    // 새로운 학생들만 배정
    const membersToInsert = newStudentIds.map((studentId) => ({
      class_id: classId,
      user_id: studentId,
      role: "student" as const,
      joined_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase.from("class_members").insert(membersToInsert).select();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data,
      message: `${newStudentIds.length}명의 학생이 성공적으로 배정되었습니다.`,
    };
  } catch (error) {
    return { success: false, error: "학생 일괄 배정 중 오류가 발생했습니다." };
  }
}

/**
 * 시간제 강사를 반에 배정
 * @param partTimeTeacherIds 시간제 강사 ID 배열
 * @param classId 반 ID
 * @returns 배정 결과
 */
export async function assignPartTimeTeachersToClass(
  partTimeTeacherIds: string[],
  classId: string
): Promise<APIResponse<ClassMember[]>> {
  try {
    // 이미 배정된 강사들 확인
    const { data: existingMembers, error: checkError } = await supabase
      .from("class_members")
      .select("user_id")
      .eq("class_id", classId)
      .eq("role", "part_time")
      .in("user_id", partTimeTeacherIds);

    if (checkError) {
      return { success: false, error: checkError.message };
    }

    const existingUserIds = existingMembers.map((m) => m.user_id);
    const newTeacherIds = partTimeTeacherIds.filter((id) => !existingUserIds.includes(id));

    if (newTeacherIds.length === 0) {
      return { success: false, error: "모든 강사가 이미 해당 반에 배정되어 있습니다." };
    }

    // 새로운 강사들만 배정
    const membersToInsert = newTeacherIds.map((teacherId) => ({
      class_id: classId,
      user_id: teacherId,
      role: "part_time" as const,
      joined_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase.from("class_members").insert(membersToInsert).select();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data,
      message: `${newTeacherIds.length}명의 시간제 강사가 성공적으로 배정되었습니다.`,
    };
  } catch (error) {
    return { success: false, error: "시간제 강사 배정 중 오류가 발생했습니다." };
  }
}

/**
 * 반의 학생을 다른 반으로 이동
 * @param studentIds 이동할 학생 ID 배열
 * @param fromClassId 원래 반 ID
 * @param toClassId 이동할 반 ID
 * @returns 이동 결과
 */
export async function moveStudentsToClass(
  studentIds: string[],
  fromClassId: string,
  toClassId: string
): Promise<APIResponse> {
  try {
    // 기존 반에서 제거
    const { error: removeError } = await supabase
      .from("class_members")
      .delete()
      .eq("class_id", fromClassId)
      .eq("role", "student")
      .in("user_id", studentIds);

    if (removeError) {
      return { success: false, error: removeError.message };
    }

    // 새 반에 추가
    const result = await assignStudentsToClass(studentIds, toClassId);

    if (!result.success) {
      // 실패 시 롤백 (원래 반에 다시 추가)
      await assignStudentsToClass(studentIds, fromClassId);
      return { success: false, error: "학생 이동 중 오류가 발생했습니다." };
    }

    return {
      success: true,
      message: `${studentIds.length}명의 학생이 성공적으로 이동되었습니다.`,
    };
  } catch (error) {
    return { success: false, error: "학생 이동 중 오류가 발생했습니다." };
  }
}

/**
 * 반별 학생 목록 조회 (그룹 전체)
 * @param groupId 그룹 ID
 * @returns 반별로 구분된 학생 목록
 */
export async function getStudentsByClass(
  groupId: string
): Promise<APIResponse<Record<string, Array<User & { class_name: string }>>>> {
  try {
    const { data, error } = await supabase
      .from("class_members")
      .select(
        `
        users (
          id,
          name,
          email,
          phone,
          birth_date
        ),
        classes (
          id,
          name,
          group_id
        )
      `
      )
      .eq("role", "student")
      .eq("classes.group_id", groupId);

    if (error) {
      return { success: false, error: error.message };
    }

    // 반별로 그룹화
    const studentsByClass: Record<string, Array<User & { class_name: string }>> = {};

    data.forEach((item) => {
      if (item.users && item.classes) {
        const className = item.classes.name;
        if (!studentsByClass[className]) {
          studentsByClass[className] = [];
        }

        studentsByClass[className].push({
          ...item.users,
          class_name: className,
        } as User & { class_name: string });
      }
    });

    return { success: true, data: studentsByClass };
  } catch (error) {
    return { success: false, error: "반별 학생 조회 중 오류가 발생했습니다." };
  }
}
