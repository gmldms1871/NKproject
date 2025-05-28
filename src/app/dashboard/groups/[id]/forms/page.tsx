"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getFormTemplatesByGroupId, deleteFormTemplate } from "@/lib/form-templates";
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
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { FormattedFormTemplate } from "../../../../../../types";

export default function FormsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: groupId } = use(params);

  const [formTemplates, setFormTemplates] = useState<FormattedFormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<FormattedFormTemplate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 폼 템플릿 목록 불러오기
  useEffect(() => {
    const fetchFormTemplates = async () => {
      try {
        const data = await getFormTemplatesByGroupId(groupId);
        setFormTemplates(data);
      } catch (error) {
        console.error("폼 템플릿 목록 불러오기 오류:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFormTemplates();
  }, [groupId]);

  // 검색된 폼 템플릿 목록
  const filteredTemplates = formTemplates.filter(
    (template) =>
      template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (template.description &&
        template.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (template.exam_type && template.exam_type.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // 폼 템플릿 생성 페이지로 이동
  const goToCreateForm = () => {
    router.push(`/dashboard/groups/${groupId}/forms/create`);
  };

  // 폼 템플릿 수정 페이지로 이동
  const goToEditForm = (templateId: string) => {
    router.push(`/dashboard/groups/${groupId}/forms/${templateId}/edit`);
  };

  // 폼 템플릿 삭제 다이얼로그 열기
  const openDeleteDialog = (template: FormattedFormTemplate) => {
    setSelectedTemplate(template);
    setIsDeleteDialogOpen(true);
  };

  // 폼 템플릿 삭제
  const handleDelete = async () => {
    if (!selectedTemplate) return;

    setIsSubmitting(true);
    try {
      await deleteFormTemplate(selectedTemplate.id);
      setFormTemplates(formTemplates.filter((template) => template.id !== selectedTemplate.id));
      setIsDeleteDialogOpen(false);
      setSelectedTemplate(null);
    } catch (error) {
      console.error("폼 템플릿 삭제 오류:", error);
    } finally {
      setIsSubmitting(false);
    }
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
          <h1 className="text-3xl font-bold tracking-tight">폼 관리</h1>
          <p className="text-muted-foreground">평가 폼 템플릿을 생성하고 관리할 수 있습니다.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="폼 검색..."
              className="w-[200px] pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={goToCreateForm}>
            <Plus className="mr-2 h-4 w-4" />폼 생성
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>폼 템플릿 목록</CardTitle>
          <CardDescription>총 {filteredTemplates.length}개의 폼 템플릿이 있습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>제목</TableHead>
                <TableHead>시험 종류</TableHead>
                <TableHead>문항 수</TableHead>
                <TableHead>난이도</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>생성일</TableHead>
                <TableHead className="text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTemplates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    등록된 폼 템플릿이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTemplates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/dashboard/groups/${groupId}/forms/${template.id}`}
                        className="hover:underline"
                      >
                        {template.title}
                      </Link>
                    </TableCell>
                    <TableCell>{template.exam_type || "-"}</TableCell>
                    <TableCell>{template.total_questions || "-"}</TableCell>
                    <TableCell>
                      {template.difficulty_level ? `${template.difficulty_level}` : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={template.is_active ? "default" : "secondary"}>
                        {template.is_active ? "활성" : "비활성"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {template.created_at
                        ? new Date(template.created_at).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => goToEditForm(template.id)}>
                        수정
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => openDeleteDialog(template)}
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

      {/* 폼 템플릿 삭제 다이얼로그 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>폼 템플릿 삭제</DialogTitle>
            <DialogDescription>
              정말로 이 폼 템플릿을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p>
              <strong>제목:</strong> {selectedTemplate?.title}
            </p>
            {selectedTemplate?.exam_type && (
              <p>
                <strong>시험 종류:</strong> {selectedTemplate.exam_type}
              </p>
            )}
            {selectedTemplate?.description && (
              <p>
                <strong>설명:</strong> {selectedTemplate.description}
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
