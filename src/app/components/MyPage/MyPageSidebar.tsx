// src/app/mypage/components/MyPageSidebar.tsx
"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  UserCircle,
  Users,
  Settings as SettingsIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

// 탭 키 타입 정의 (page.tsx와 동일하게)
export type TabKey = "profile" | "groups" | "settings"

interface MyPageSidebarProps {
  tab: TabKey
  setTab: (tab: TabKey) => void
  name: string
  email?: string
  onBack: () => void
}

export function MyPageSidebar({
  tab,
  setTab,
  name,
  email,
  onBack,
}: MyPageSidebarProps) {
  // 사이드바 네비게이션 아이템
  const navItems: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "profile", label: "내 정보", icon: <UserCircle className="h-4 w-4" /> },
    { key: "groups",  label: "내 그룹", icon: <Users       className="h-4 w-4" /> },
    { key: "settings",label: "설정",   icon: <SettingsIcon className="h-4 w-4" /> },
  ]

  return (
    <div className="md:w-64 flex-shrink-0">
      <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
        {/* 프로필 헤더 */}
        <div className="flex flex-col items-center mb-4">
          <Avatar className="h-16 w-16 mb-3">
            <AvatarFallback className="bg-primary/10 text-primary text-xl">
              {name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-lg font-bold">{name}</h2>
          <p className="text-xs text-muted-foreground">{email}</p>
        </div>

        {/* 네비게이션 버튼 리스트 */}
        <div className="flex flex-col space-y-1 mb-4">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100",
                tab === item.key
                  ? "bg-gray-200 text-gray-900"
                  : "text-gray-600"
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        {/* 홈으로 돌아가기 */}
        <div className="text-center">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    </div>
  )
}
