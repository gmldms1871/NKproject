"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createReport } from "@/lib/reports";
import { getInputSettings } from "@/lib/input-settings";
import { getCurrentUser, getUserGroups } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { Group, InputSetting } from "@/types";

export default function CreateReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [content, setContent] = useState("");
  const [inputSettings, setInputSettings] = useState<InputSetting[]>([]);
  const [taskStatuses, setTaskStatuses] = useState<Record<string, string>>({});
  const [additionalInputs, setAdditionalInputs] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          const userGroups = await getUserGroups(currentUser.id);
          const formattedGroups = userGroups.map((membership: any) => membership.groups) as Group[];
          setGroups(formattedGroups);

          // URL에서 groupId가 제공되었는지 확인
          const groupId = searchParams.get("groupId");
          if (groupId && formattedGroups.some((g) => g.id === groupId)) {
            setSelectedGroupId(groupId);
            fetchInputSettings(groupId);
          }
        }
      } catch (error) {
        console.error("그룹 가져오기 오류:", error);
        toast({
          title: "오류",
          description: "그룹을 불러오는데 실패했습니다. 다시 시도해주세요.",
          variant: "destructive",
        });
      } finally {
        setInitialLoading(false);
      }
    };

    fetchGroups();
  }, [searchParams, toast]);

  const fetchInputSettings = async (groupId: string) => {
    try {
      const result = await getInputSettings(groupId);
      if (result.success && result.settings) {
        setInputSettings(result.settings);

        // 업무 상태 및 추가 입력 초기화
        const initialTaskStatuses: Record<string, string> = {};
        const initialAdditionalInputs: Record<string, string> = {};

        result.settings.forEach((setting) => {
          if (setting.field_type === "select") {
            initialTaskStatuses[setting.field_name] = "미완료"; // 기본값
          } else {
            initialAdditionalInputs[setting.field_name] = "";
          }
        });

        setTaskStatuses(initialTaskStatuses);
        setAdditionalInputs(initialAdditionalInputs);
      }
    } catch (error) {
      console.error("입력 설정 가져오기 오류:", error);
    }
  };

  const handleGroupChange = (groupId: string) => {
    setSelectedGroupId(groupId);
    fetchInputSettings(groupId);
  };

  const handleTaskStatusChange = (fieldName: string, value: string) => {
    setTaskStatuses((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleAdditionalInputChange = (fieldName: string, value: string) => {
    setAdditionalInputs((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        toast({
          title: "인증 오류",
          description: "보고서를 작성하려면 로그인해야 합니다.",
          variant: "destructive",
        });
        return;
      }

      if (!selectedGroupId) {
        toast({
          title: "그룹 필요",
          description: "이 보고서의 그룹을 선택해주세요.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (!content.trim()) {
        toast({
          title: "내용 필요",
          description: "보고서 내용을 입력해주세요.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const result = await createReport(
        selectedGroupId,
        currentUser.id,
        content,
        taskStatuses,
        additionalInputs
      );

      if (result.success && result.report) {
        toast({
          title: "보고서 작성 완료",
          description: "보고서가 성공적으로 작성되었습니다.",
        });
        router.push(`/dashboard/reports/${result.report.id}`);
      } else {
        toast({
          title: "보고서 작성 실패",
          description: result.error || "보고서 작성 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "보고서 작성 실패",
        description: "예기치 않은 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-3xl font-bold">새 보고서 작성</h1>
      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>보고서 정보</CardTitle>
            <CardDescription>그룹을 선택하고 보고서 내용을 입력하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="group">그룹</Label>
              <Select value={selectedGroupId} onValueChange={handleGroupChange}>
                <SelectTrigger>
                  <SelectValue placeholder="그룹 선택" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">보고서 내용</Label>
              <Textarea
                id="content"
                placeholder="보고서 내용을 입력하세요..."
                className="min-h-[200px]"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
            </div>
          </CardContent>
        </Card>

        {selectedGroupId && inputSettings.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>상태 필드</CardTitle>
              <CardDescription>업무 상태를 업데이트하세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {inputSettings
                .filter((setting) => setting.field_type === "select")
                .map((setting) => (
                  <div key={setting.id} className="space-y-2">
                    <Label htmlFor={setting.id}>{setting.field_name}</Label>
                    <Select
                      value={taskStatuses[setting.field_name] || "미완료"}
                      onValueChange={(value) => handleTaskStatusChange(setting.field_name, value)}
                    >
                      <SelectTrigger id={setting.id}>
                        <SelectValue placeholder="상태 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="완료">완료</SelectItem>
                        <SelectItem value="진행중">진행중</SelectItem>
                        <SelectItem value="미완료">미완료</SelectItem>
                        <SelectItem value="연장">연장</SelectItem>
                        <SelectItem value="없음">없음</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
            </CardContent>
          </Card>
        )}

        {selectedGroupId && inputSettings.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>추가 정보</CardTitle>
              <CardDescription>보고서에 대한 추가 세부 정보를 제공하세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {inputSettings
                .filter((setting) => setting.field_type === "text")
                .map((setting) => (
                  <div key={setting.id} className="space-y-2">
                    <Label htmlFor={setting.id}>{setting.field_name}</Label>
                    <Input
                      id={setting.id}
                      placeholder={`${setting.field_name.toLowerCase()} 입력`}
                      value={additionalInputs[setting.field_name] || ""}
                      onChange={(e) =>
                        handleAdditionalInputChange(setting.field_name, e.target.value)
                      }
                    />
                  </div>
                ))}
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            취소
          </Button>
          <Button type="submit" disabled={isLoading || !selectedGroupId}>
            {isLoading ? "작성 중..." : "보고서 작성"}
          </Button>
        </div>
      </form>
    </div>
  );
}
