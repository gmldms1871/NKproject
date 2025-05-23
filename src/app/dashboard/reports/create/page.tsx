"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createReport } from "@/lib/reports";
import { getUserGroups } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { Group } from "@/types";
import { ArrowLeft, Save } from "lucide-react";

export default function CreateReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // URL에서 그룹 ID 가져오기
  useEffect(() => {
    const groupId = searchParams.get("groupId");
    if (groupId) {
      setSelectedGroupId(groupId);
    }
  }, [searchParams]);

  // 사용자의 그룹 목록 가져오기
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const userGroups = await getUserGroups();
        if (userGroups && userGroups.length > 0) {
          const formattedGroups = userGroups.map((membership: any) => membership.groups) as Group[];
          setGroups(formattedGroups);

          // URL에서 그룹 ID가 없고 그룹이 하나만 있으면 자동 선택
          if (!selectedGroupId && formattedGroups.length === 1) {
            setSelectedGroupId(formattedGroups[0].id);
          }
        }
      } catch (error) {
        console.error("그룹 가져오기 오류:", error);
        toast({
          title: "오류",
          description: "그룹 목록을 불러오는데 실패했습니다.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, [selectedGroupId, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedGroupId) {
      toast({
        title: "그룹 선택 필요",
        description: "보고서를 작성할 그룹을 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!content.trim()) {
      toast({
        title: "내용 필요",
        description: "보고서 내용을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const result = await createReport({
        title: title.trim() || "제목 없음",
        content,
        group_id: selectedGroupId,
      });

      if (result.success && (result.reportId || (result.report && result.report.id))) {
        toast({
          title: "보고서 작성 완료",
          description: "보고서가 성공적으로 작성되었습니다.",
        });
        // reportId 또는 report.id 사용
        const id = result.reportId || (result.report ? result.report.id : "");
        router.push(`/dashboard/reports/${id}`);
      } else {
        toast({
          title: "보고서 작성 실패",
          description: result.error || "보고서 작성에 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("보고서 작성 오류:", error);
      toast({
        title: "오류",
        description: "예기치 않은 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">보고서 작성</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>새 보고서</CardTitle>
            <CardDescription>보고서 내용을 작성하세요.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="group">그룹 선택</Label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId} required>
                <SelectTrigger id="group">
                  <SelectValue placeholder="그룹 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>내 그룹</SelectLabel>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">제목 (선택사항)</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="보고서 제목"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">내용</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="보고서 내용을 입력하세요..."
                className="min-h-[300px]"
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSaving}
            >
              취소
            </Button>
            <Button type="submit" disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "저장 중..." : "저장"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
