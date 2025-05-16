"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createGroup, createDefaultInputSettings } from "@/lib/groups";
import { getCurrentUser } from "@/lib/supabase";
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

export default function CreateGroupPage() {
  const [groupName, setGroupName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        toast({
          title: "인증 오류",
          description: "그룹을 생성하려면 로그인해야 합니다.",
          variant: "destructive",
        });
        return;
      }

      const result = await createGroup(groupName, currentUser.id);

      if (result.success && result.group) {
        // 새 그룹에 대한 기본 입력 설정 생성
        await createDefaultInputSettings(result.group.id);

        toast({
          title: "그룹 생성됨",
          description: `${groupName} 그룹이 성공적으로 생성되었습니다.`,
        });
        router.push(`/dashboard/groups/${result.group.id}`);
      } else {
        toast({
          title: "그룹 생성 실패",
          description: result.error || "그룹 생성 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "그룹 생성 실패",
        description: "예기치 않은 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-3xl font-bold">새 그룹 만들기</h1>
      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>그룹 정보</CardTitle>
            <CardDescription>보고서를 관리하고 팀원들과 협업할 새 그룹을 만드세요.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">그룹 이름</Label>
              <Input
                id="name"
                placeholder="그룹 이름 입력"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              취소
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "생성 중..." : "그룹 생성"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
