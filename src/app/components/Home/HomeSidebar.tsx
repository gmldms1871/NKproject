// src/app/components/Home/HomeSidebar.tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  Users,
  Settings,
  FileText,
  BarChart2,
  CheckSquare,
  PenSquare,
  GraduationCap,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// 네비게이션 아이템 타입
interface NavItem {
  href: string
  icon: React.ReactNode
  label: string
  roles: ("CEO" | "Teacher" | "Part-time Lecturer")[] // 이 아이템을 보여줄 최소 권한
  badge?: React.ReactNode
  onClick?: () => void
}

// HomeSidebar 프로퍼티 타입
interface HomeSidebarProps {
  role: "CEO" | "Teacher" | "Part-time Lecturer" | null
  newReportsCount: number
  onCreateGroup: () => void
}

export function HomeSidebar({
  role,
  newReportsCount,
  onCreateGroup,
}: HomeSidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) => pathname === href

  // 보여줄 네비게이션 정의 (roles에 해당 권한이 포함돼야 표시)
  const navItems: NavItem[] = [
    {
      href: "/",
      icon: <Home className="h-4 w-4" />,
      label: "홈",
      roles: ["CEO", "Teacher", "Part-time Lecturer"],
    },
    {
      href: "/group/manage",
      icon: <Users className="h-4 w-4" />,
      label: "구성원 관리",
      roles: ["CEO"],
    },
    {
      href: "/settings",
      icon: <Settings className="h-4 w-4" />,
      label: "업무 항목 설정",
      roles: ["CEO"],
    },
    {
      href: "/reports",
      icon: <FileText className="h-4 w-4" />,
      label: "보고서 관리",
      roles: ["CEO"],
      badge:
        newReportsCount > 0 ? (
          <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
            {newReportsCount}
          </span>
        ) : undefined,
    },
    {
      href: "/statistics",
      icon: <BarChart2 className="h-4 w-4" />,
      label: "통계",
      roles: ["CEO"],
    },
    {
      href: "/tasks",
      icon: <CheckSquare className="h-4 w-4" />,
      label: "업무 입력",
      roles: ["Teacher", "Part-time Lecturer"],
    },
    {
      href: "/reports/create",
      icon: <PenSquare className="h-4 w-4" />,
      label: "보고서 작성",
      roles: ["Teacher", "Part-time Lecturer"],
    },
    {
      href: "/students",
      icon: <GraduationCap className="h-4 w-4" />,
      label: "학생 관리",
      roles: ["Teacher"],
    },
  ]

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-lg text-gray-800">NK Academy</h3>
        <p className="text-sm text-gray-500">
          {role ?? "초대 대기 중"} 대시보드
        </p>
      </div>

      {/* 네비게이션 리스트 */}
      <nav className="p-3 space-y-1">
        {navItems.map((item) => {
          // 현재 role이 이 아이템 roles에 포함되는지 체크
          if (role && !item.roles.includes(role)) {
            return null
          }

          // onClick 핸들러가 있는 아이템 (버튼형)
          if (item.onClick) {
            return (
              <Button
                key={item.href}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-left"
                onClick={item.onClick}
              >
                <div className="flex items-center gap-2 w-full">
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge}
                </div>
              </Button>
            )
          }

          // 링크형 아이템: Button asChild 안에 Link만 한 번 사용
          return (
            <Button
              key={item.href}
              asChild
              variant={isActive(item.href) ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                "w-full justify-start text-left",
                isActive(item.href)
                  ? "bg-gray-100 hover:bg-gray-200"
                  : ""
              )}
            >
              <Link
                href={item.href}
                className="flex items-center gap-2 w-full"
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge}
              </Link>
            </Button>
          )
        })}
      </nav>

      {/* 빠른 작업 섹션 */}
      <div className="border-t border-gray-100 p-3 mt-2">
        <h4 className="text-xs font-medium text-gray-500 uppercase px-3 mb-2">
          빠른 작업
        </h4>

        {role === "CEO" ? (
          <Button
            variant="outline"
            size="sm"
            className="w-full flex items-center justify-between"
            onClick={onCreateGroup}
          >
            <span>새 그룹 생성</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            key="quick-tasks"
            asChild
            variant="outline"
            size="sm"
            className="w-full flex items-center justify-between"
          >
            <Link
              href="/tasks"
              className="flex items-center justify-between w-full"
            >
              <span>빠른 업무 입력</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}
