"use client";

import type React from "react";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { inviteToGroup } from "@/lib/groups";
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

export default function InviteMembersPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [emails, setEmails] = useState("");
  const [role, setRole] = useState<string>("teacher");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 이메일 목록 분리 (쉼표, 세미콜론, 공백으로 구분)
      const emailList = emails
        .split(/[,;\s]+/)
        .map((email) => email.trim())
        .filter((email) => email.length > 0);

      if (emailList.length === 0) {
        toast({
          title: "이메일 필요",
          description: "초대할 이메일 주소를 입력해주세요.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const result = await inviteToGroup(params.id, emailList, role);

      if (result.success) {
        toast({
          title: "초대 발송 완료",
          description: `${result.invited}명에게 초대를 발송했습니다.`,
        });

        if (result.notFound && result.notFound.length > 0) {
          toast({
            title: "일부 이메일 찾을 수 없음",
            description: `다음 이메일은 시스템에 등록되지 않았습니다: ${result.notFound.join(
              ", "
            )}`,
            variant: "destructive",
          });
        }

        router.push(`/dashboard/groups/${params.id}`);
      } else {
        toast({
          title: "초대 실패",
          description: result.error || "멤버 초대 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "초대 실패",
        description: "예기치 않은 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center space-x-2">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">멤버 초대</h1>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>그룹에 멤버 초대하기</CardTitle>
            <CardDescription>이메일 주소를 입력하여 새 멤버를 초대하세요.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emails">이메일 주소</Label>
              <Input
                id="emails"
                placeholder="이메일 주소 (쉼표로 구분하여 여러 명 초대 가능)"
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                여러 명을 초대하려면 이메일 주소를 쉼표(,)로 구분하세요.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">역할</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="역할 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">관리자</SelectItem>
                  <SelectItem value="teacher">교사</SelectItem>
                  <SelectItem value="part-time-lecturer">시간제 강사</SelectItem>
                  <SelectItem value="staff">직원</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                역할에 따라 그룹 내에서 수행할 수 있는 작업이 결정됩니다.
              </p>
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
              {isLoading ? "초대 중..." : "초대 보내기"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
