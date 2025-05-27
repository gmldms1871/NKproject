"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getInputSettings } from "../../../../lib/input-settings";
import { supabase } from "../../../../lib/supabase";
import { getCurrentUser } from "../../../../lib/supabase";
import { summarizeWithGemini } from "../../../../lib/gemini";
import type { ExtendedInputSetting } from "../../../../../types";

export default function CreateReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [groupId, setGroupId] = useState<string>("");
  const [inputSettings, setInputSettings] = useState<ExtendedInputSetting[]>([]);
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const gid = searchParams.get("groupId");
    if (gid) {
      setGroupId(gid);
      fetchInputSettings(gid);
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  const fetchInputSettings = async (gid: string) => {
    try {
      const result = await getInputSettings(gid);
      if (result.success && result.settings) {
        setInputSettings(result.settings);
      }
    } catch (error) {
      console.error("입력 설정 가져오기 오류:", error);
    } finally {
      setLoading(false);
    }
  };

  // 보고서 생성 함수
  const createReport = async (data: {
    title: string;
    content: string;
    groupId: string;
    customFields?: Record<string, string>;
  }) => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        return { success: false, error: "인증되지 않은 사용자입니다." };
      }

      // 보고서 내용 요약 생성
      let summary = null;
      try {
        if (data.content.length > 100) {
          summary = await summarizeWithGemini(data.content);
        }
      } catch (error) {
        console.error("요약 생성 오류:", error);
        // 요약 생성 실패해도 계속 진행
      }

      // 보고서 생성
      const { data: report, error } = await supabase
        .from("reports")
        .insert({
          title: data.title,
          content: data.content,
          group_id: data.groupId,
          auther_id: currentUser.id,
          summary,
          custom_fields: data.customFields ? JSON.stringify(data.customFields) : null,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return { success: true, reportId: report.id };
    } catch (error) {
      console.error("보고서 생성 오류:", error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  };

  const handleCustomFieldChange = (fieldId: string, value: string) => {
    setCustomFields((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!title.trim()) {
      toast({
        title: "제목 필요",
        description: "보고서 제목을 입력해주세요.",
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

    if (!groupId) {
      toast({
        title: "그룹 필요",
        description: "보고서를 작성할 그룹을 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    // 필수 필드 검증
    const requiredFields = inputSettings.filter(
      (setting) => setting.is_required || setting.is_inquired
    );
    for (const field of requiredFields) {
      if (!customFields[field.id] || !customFields[field.id].trim()) {
        toast({
          title: "필수 필드 누락",
          description: `${field.field_name} 필드는 필수입니다.`,
          variant: "destructive",
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const result = await createReport({
        title,
        content,
        groupId,
        customFields,
      });

      if (result.success) {
        toast({
          title: "보고서 작성 완료",
          description: "보고서가 성공적으로 작성되었습니다.",
        });
        router.push(`/dashboard/groups/${groupId}`);
      } else {
        toast({
          title: "보고서 작성 실패",
          description: result.error || "보고서 작성에 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("보고서 제출 중 오류:", error);
      toast({
        title: "보고서 작성 실패",
        description: "예기치 않은 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="icon" asChild>
          <Link href={groupId ? `/dashboard/groups/${groupId}` : "/dashboard/groups"}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">보고서 작성</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>보고서 정보</CardTitle>
            <CardDescription>보고서의 기본 정보를 입력해주세요.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">제목</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="보고서 제목"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">내용</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="보고서 내용을 작성해주세요."
                className="min-h-[200px]"
                required
              />
            </div>

            {inputSettings.length > 0 && (
              <div className="space-y-4 rounded-md border p-4">
                <h3 className="font-medium">추가 정보</h3>
                {inputSettings.map((setting) => (
                  <div key={setting.id} className="space-y-2">
                    <Label htmlFor={`field-${setting.id}`}>
                      {setting.field_name}
                      {setting.is_required && <span className="ml-1 text-red-500">*</span>}
                    </Label>
                    <Input
                      id={`field-${setting.id}`}
                      value={customFields[setting.id] || ""}
                      onChange={(e) => handleCustomFieldChange(setting.id, e.target.value)}
                      placeholder={`${setting.field_name} 입력`}
                      required={setting.is_required}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "제출 중..." : "보고서 제출"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
