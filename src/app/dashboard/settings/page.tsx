"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import { Moon, Save, Sun } from "lucide-react";

export default function SettingsPage() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveSettings = async () => {
    setIsSaving(true);

    // 실제 구현에서는 설정을 저장하는 API 호출
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: "설정 저장 완료",
        description: "설정이 성공적으로 저장되었습니다.",
      });
    }, 1000);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">설정</h1>

      <Card>
        <CardHeader>
          <CardTitle>테마 설정</CardTitle>
          <CardDescription>애플리케이션 테마를 관리합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <div className="flex items-center">
                {theme === "dark" ? (
                  <Moon className="mr-2 h-4 w-4" />
                ) : (
                  <Sun className="mr-2 h-4 w-4" />
                )}
                <span className="text-sm font-medium">
                  {theme === "dark" ? "다크 모드" : "라이트 모드"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {theme === "dark"
                  ? "어두운 테마를 사용 중입니다. 밝은 테마로 전환하려면 클릭하세요."
                  : "밝은 테마를 사용 중입니다. 어두운 테마로 전환하려면 클릭하세요."}
              </p>
            </div>
            <Button variant="outline" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>알림 설정</CardTitle>
          <CardDescription>알림 및 이메일 설정을 관리합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="email-notifications"
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
            <Label htmlFor="email-notifications">이메일 알림</Label>
          </div>
          <p className="text-sm text-muted-foreground">
            새 보고서, 그룹 초대 및 중요 업데이트에 대한 이메일 알림을 받습니다.
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveSettings} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "저장 중..." : "설정 저장"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
