"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { supabase } from "../../../../lib/supabase";
import { getCurrentUser } from "../../../../lib/supabase";

export default function CreateGroupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [groupName, setGroupName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // 그룹 생성 함수
  const createGroup = async (name: string) => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        return { success: false, error: "인증되지 않은 사용자입니다." };
      }

      // 그룹 생성
      const { data: groupData, error: groupError } = await supabase
        .from("groups")
        .insert({
          name,
          owner_id: currentUser.id,
        })
        .select()
        .single();

      if (groupError) {
        throw groupError;
      }

      // 그룹 ID가 없는 경우 처리
      if (!groupData || !groupData.id) {
        throw new Error("그룹 ID를 가져올 수 없습니다.");
      }

      const groupId = groupData.id;

      // 그룹 멤버십 생성 (소유자를 관리자로 추가)
      const { error: membershipError } = await supabase.from("group_members").insert({
        group_id: groupId,
        user_id: currentUser.id,
        role: "manager",
        accepted_at: new Date().toISOString(),
      });

      if (membershipError) {
        throw membershipError;
      }

      return { success: true, groupId };
    } catch (error) {
      console.error("그룹 생성 오류:", error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  };

  // 기본 입력 설정 생성 함수
  const createDefaultInputSettings = async (groupId: string) => {
    try {
      // 기본 입력 필드 설정
      const defaultSettings = [
        {
          group_id: groupId,
          field_name: "제목",
          field_type: "text",
          is_inquired: true,
        },
        {
          group_id: groupId,
          field_name: "내용",
          field_type: "text",
          is_inquired: true,
        },
      ];

      const { error } = await supabase.from("input_settings").insert(defaultSettings);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error("기본 입력 설정 생성 오류:", error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast({
        title: "그룹 이름 필요",
        description: "그룹 이름을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      // 그룹 생성
      const result = await createGroup(groupName);

      if (!result.success) {
        throw new Error(result.error || "그룹 생성에 실패했습니다.");
      }

      // 기본 입력 설정 생성
      if (result.groupId) {
        await createDefaultInputSettings(result.groupId);
      }

      toast({
        title: "그룹 생성 완료",
        description: "새 그룹이 성공적으로 생성되었습니다.",
      });

      // 생성된 그룹 페이지로 이동
      if (result.groupId) {
        router.push(`/dashboard/groups/${result.groupId}`);
      }
    } catch (error) {
      console.error("그룹 생성 중 오류:", error);
      toast({
        title: "그룹 생성 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/groups">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">새 그룹 만들기</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>그룹 정보</CardTitle>
          <CardDescription>새 그룹의 기본 정보를 입력해주세요.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">그룹 이름</Label>
            <Input
              id="name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="예: 마케팅팀, 개발팀, 프로젝트 A"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleCreateGroup} disabled={isCreating} className="w-full">
            {isCreating ? "생성 중..." : "그룹 생성"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
