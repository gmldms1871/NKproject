"use client";

import { useEffect, useState } from "react";
import { getCurrentUser, getUserProfile, updateUserProfile } from "@/lib/supabase";
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
import type { User } from "../../../../types";
import { Save } from "lucide-react";

export default function ProfilePage() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [nickName, setNickName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          const userProfile = await getUserProfile(currentUser.id);

          if (userProfile) {
            const userWithProfile: User = {
              id: currentUser.id,
              email: currentUser.email || "",
              name: userProfile.name,
              nick_name: userProfile.nick_name,
              phone: userProfile.phone,
              created_at: userProfile.created_at,
            };

            setUser(userWithProfile);
            setName(userProfile.name || "");
            setNickName(userProfile.nick_name || "");
            setPhone(userProfile.phone || "");
          }
        }
      } catch (error) {
        console.error("사용자 데이터 가져오기 오류:", error);
        toast({
          title: "오류",
          description: "프로필 정보를 불러오는데 실패했습니다.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [toast]);

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const result = await updateUserProfile(user.id, {
        name,
        nick_name: nickName,
        phone,
      });

      if (result.success) {
        setUser({
          ...user,
          name,
          nick_name: nickName,
          phone,
        });
        toast({
          title: "프로필 업데이트 완료",
          description: "프로필 정보가 성공적으로 업데이트되었습니다.",
        });
      } else {
        toast({
          title: "업데이트 실패",
          description: result.error || "프로필 정보 업데이트에 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "업데이트 실패",
        description: "예기치 않은 오류가 발생했습니다. 다시 시도해주세요.",
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

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-2xl font-bold">사용자 정보를 찾을 수 없습니다</h1>
        <p className="mt-2 text-muted-foreground">로그인이 필요합니다.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">내 프로필</h1>

      <Card>
        <CardHeader>
          <CardTitle>프로필 정보</CardTitle>
          <CardDescription>개인 정보를 관리합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input id="email" value={user.email} disabled />
            <p className="text-xs text-muted-foreground">이메일은 변경할 수 없습니다.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">이름</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nickName">닉네임</Label>
            <Input
              id="nickName"
              value={nickName}
              onChange={(e) => setNickName(e.target.value)}
              placeholder="닉네임"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">전화번호</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-1234-5678"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveProfile} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "저장 중..." : "저장"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>계정 정보</CardTitle>
          <CardDescription>
            계정 생성일: {new Date(user.created_at).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            비밀번호를 변경하려면 로그아웃 후 로그인 페이지에서 비밀번호 재설정을 요청하세요.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
