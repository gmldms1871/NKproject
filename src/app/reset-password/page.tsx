"use client";

import type React from "react";

import { useState } from "react";
import Link from "next/link";
import { resetPassword } from "@/lib/auth";
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

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await resetPassword(email);

      if (result.success) {
        setIsSubmitted(true);
        toast({
          title: "재설정 이메일 발송",
          description: "해당 이메일로 계정이 존재하는 경우, 비밀번호 재설정 링크가 발송됩니다.",
        });
      } else {
        toast({
          title: "재설정 이메일 발송 실패",
          description: result.error || "이메일을 확인하고 다시 시도해주세요.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "재설정 이메일 발송 실패",
        description: "예기치 않은 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">비밀번호 재설정</CardTitle>
          <CardDescription>
            이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다
          </CardDescription>
        </CardHeader>
        {!isSubmitted ? (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "전송 중..." : "재설정 링크 보내기"}
              </Button>
              <p className="mt-4 text-center text-sm text-muted-foreground">
                비밀번호가 기억나셨나요?{" "}
                <Link href="/login" className="text-primary underline-offset-4 hover:underline">
                  로그인으로 돌아가기
                </Link>
              </p>
            </CardFooter>
          </form>
        ) : (
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-6 text-center">
              <h3 className="mb-2 text-lg font-medium">이메일을 확인해주세요</h3>
              <p className="text-sm text-muted-foreground">
                비밀번호 재설정 링크를 보내드렸습니다. 이메일을 확인해주세요.
              </p>
            </div>
            <Button asChild className="w-full">
              <Link href="/login">로그인으로 돌아가기</Link>
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
