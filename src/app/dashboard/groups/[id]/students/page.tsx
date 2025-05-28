"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStudentsByGroupId, createStudent, updateStudent, deleteStudent } from "@/lib/students";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Download, Loader2, Plus, Search, Upload } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import type { FormattedStudent } from "../../../../../../types";

// 학생 폼 스키마
const studentFormSchema = z.object({
  name: z.string().min(1, "이름은 필수입니다"),
  student_number: z.string().optional(),
  class_name: z.string().optional(),
  phone: z.string().optional(),
  parent_phone: z.string().optional(),
});

type StudentFormValues = z.infer<typeof studentFormSchema>;

export default function StudentsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const groupId = params.id;

  const [students, setStudents] = useState<FormattedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<FormattedStudent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 학생 폼
  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      name: "",
      student_number: "",
      class_name: "",
      phone: "",
      parent_phone: "",
    },
  });

  // 학생 목록 불러오기
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const data = await getStudentsByGroupId(groupId);
        setStudents(data);
      } catch (error) {
        console.error("학생 목록 불러오기 오류:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [groupId]);

  // 검색된 학생 목록
  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.student_number &&
        student.student_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (student.class_name && student.class_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // 학생 추가 다이얼로그 열기
  const openAddDialog = () => {
    form.reset({
      name: "",
      student_number: "",
      class_name: "",
      phone: "",
      parent_phone: "",
    });
    setIsAddDialogOpen(true);
  };

  // 학생 수정 다이얼로그 열기
  const openEditDialog = (student: FormattedStudent) => {
    setSelectedStudent(student);
    form.reset({
      name: student.name,
      student_number: student.student_number || "",
      class_name: student.class_name || "",
      phone: student.phone || "",
      parent_phone: student.parent_phone || "",
    });
    setIsEditDialogOpen(true);
  };

  // 학생 삭제 다이얼로그 열기
  const openDeleteDialog = (student: FormattedStudent) => {
    setSelectedStudent(student);
    setIsDeleteDialogOpen(true);
  };

  // 학생 추가 제출
  const handleAddSubmit = async (values: StudentFormValues) => {
    setIsSubmitting(true);
    try {
      const result = await createStudent({
        name: values.name,
        student_number: values.student_number || null,
        class_name: values.class_name || null,
        phone: values.phone || null,
        parent_phone: values.parent_phone || null,
        group_id: groupId,
      });

      if (result.success && result.student) {
        // FormattedStudent 형식으로 변환
        const formattedStudent: FormattedStudent = {
          id: result.student.id,
          name: result.student.name,
          student_number: result.student.student_number,
          class_name: result.student.class_name,
          group_id: result.student.group_id,
          phone: result.student.phone,
          parent_phone: result.student.parent_phone,
          created_at: result.student.created_at,
          updated_at: result.student.updated_at,
        };

        setStudents([...students, formattedStudent]);
        setIsAddDialogOpen(false);
        form.reset();
      }
    } catch (error) {
      console.error("학생 추가 오류:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 학생 수정 제출
  const handleEditSubmit = async (values: StudentFormValues) => {
    if (!selectedStudent) return;

    setIsSubmitting(true);
    try {
      const result = await updateStudent(selectedStudent.id, {
        name: values.name,
        student_number: values.student_number || null,
        class_name: values.class_name || null,
        phone: values.phone || null,
        parent_phone: values.parent_phone || null,
      });

      if (result.success && result.student) {
        // FormattedStudent 형식으로 변환
        const formattedStudent: FormattedStudent = {
          id: result.student.id,
          name: result.student.name,
          student_number: result.student.student_number,
          class_name: result.student.class_name,
          group_id: result.student.group_id,
          phone: result.student.phone,
          parent_phone: result.student.parent_phone,
          created_at: result.student.created_at,
          updated_at: result.student.updated_at,
        };

        setStudents(
          students.map((student) =>
            student.id === selectedStudent.id ? formattedStudent : student
          )
        );
        setIsEditDialogOpen(false);
        setSelectedStudent(null);
      }
    } catch (error) {
      console.error("학생 수정 오류:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 학생 삭제
  const handleDelete = async () => {
    if (!selectedStudent) return;

    setIsSubmitting(true);
    try {
      await deleteStudent(selectedStudent.id);
      setStudents(students.filter((student) => student.id !== selectedStudent.id));
      setIsDeleteDialogOpen(false);
      setSelectedStudent(null);
    } catch (error) {
      console.error("학생 삭제 오류:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Excel 파일 업로드 (구현 예정)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // TODO: Excel 파일 업로드 및 처리 로직 구현
    console.log("파일 업로드:", e.target.files);
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">학생 관리</h1>
          <p className="text-muted-foreground">
            그룹 내 학생들을 관리하고 평가 폼을 배포할 수 있습니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="학생 검색..."
              className="w-[200px] pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={() => {}}>
            <Download className="mr-2 h-4 w-4" />
            엑셀 다운로드
          </Button>
          <div className="relative">
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              엑셀 업로드
            </Button>
            <Input
              type="file"
              accept=".xlsx,.xls"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={handleFileUpload}
            />
          </div>
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            학생 추가
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>학생 목록</CardTitle>
          <CardDescription>
            총 {filteredStudents.length}명의 학생이 등록되어 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead>학번</TableHead>
                <TableHead>반</TableHead>
                <TableHead>연락처</TableHead>
                <TableHead>학부모 연락처</TableHead>
                <TableHead className="text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    등록된 학생이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.student_number || "-"}</TableCell>
                    <TableCell>{student.class_name || "-"}</TableCell>
                    <TableCell>{student.phone || "-"}</TableCell>
                    <TableCell>{student.parent_phone || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(student)}>
                        수정
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => openDeleteDialog(student)}
                      >
                        삭제
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 학생 추가 다이얼로그 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>학생 추가</DialogTitle>
            <DialogDescription>새로운 학생 정보를 입력하세요.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이름 *</FormLabel>
                    <FormControl>
                      <Input placeholder="홍길동" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="student_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>학번</FormLabel>
                    <FormControl>
                      <Input placeholder="2025001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="class_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>반</FormLabel>
                    <FormControl>
                      <Input placeholder="1-A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>연락처</FormLabel>
                    <FormControl>
                      <Input placeholder="010-1234-5678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="parent_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>학부모 연락처</FormLabel>
                    <FormControl>
                      <Input placeholder="010-8765-4321" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  취소
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  추가
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* 학생 수정 다이얼로그 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>학생 정보 수정</DialogTitle>
            <DialogDescription>학생 정보를 수정하세요.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEditSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이름 *</FormLabel>
                    <FormControl>
                      <Input placeholder="홍길동" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="student_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>학번</FormLabel>
                    <FormControl>
                      <Input placeholder="2025001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="class_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>반</FormLabel>
                    <FormControl>
                      <Input placeholder="1-A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>연락처</FormLabel>
                    <FormControl>
                      <Input placeholder="010-1234-5678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="parent_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>학부모 연락처</FormLabel>
                    <FormControl>
                      <Input placeholder="010-8765-4321" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  취소
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  저장
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* 학생 삭제 다이얼로그 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>학생 삭제</DialogTitle>
            <DialogDescription>
              정말로 이 학생을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p>
              <strong>이름:</strong> {selectedStudent?.name}
            </p>
            {selectedStudent?.student_number && (
              <p>
                <strong>학번:</strong> {selectedStudent.student_number}
              </p>
            )}
            {selectedStudent?.class_name && (
              <p>
                <strong>반:</strong> {selectedStudent.class_name}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              취소
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
