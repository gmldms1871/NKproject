"use client"

import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
import { Settings as SettingsIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function SettingsContent() {
  return (
    <Card className="shadow-sm border-0">
      <CardHeader className="pb-4 border-b">
        <CardTitle className="text-xl text-slate-800 flex items-center gap-2">
          <SettingsIcon className="h-5 w-5 text-primary" />
          계정 설정
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="bg-slate-50 p-4 rounded-lg">
          <h3 className="font-medium mb-2">보안 설정</h3>
          <p className="text-sm text-slate-600 mb-4">
            비밀번호 변경 링크를 이메일로 보냅니다.
          </p>
          <Link href="/reset-password-email">
            <Button variant="default" className="w-full">
              비밀번호 변경하기
            </Button>
          </Link>
        </div>
        <div className="bg-slate-50 p-4 rounded-lg">
          <h3 className="font-medium mb-2">알림 설정</h3>
          <p className="text-sm text-slate-600">현재 준비 중입니다.</p>
        </div>
      </CardContent>
    </Card>
  )
}
