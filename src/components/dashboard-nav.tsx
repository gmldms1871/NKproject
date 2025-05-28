"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  FileText,
  GraduationCap,
  Home,
  ListChecks,
  Settings,
  User,
  Users,
  ClipboardList,
} from "lucide-react";

export function DashboardNav() {
  const pathname = usePathname();

  // 현재 그룹 ID 추출 (URL에서)
  const groupIdMatch = pathname.match(/\/dashboard\/groups\/([^/]+)/);
  const groupId = groupIdMatch ? groupIdMatch[1] : null;

  const navItems = [
    {
      title: "대시보드",
      href: "/dashboard",
      icon: Home,
    },
    {
      title: "그룹",
      href: "/dashboard/groups",
      icon: Users,
    },
    {
      title: "보고서",
      href: "/dashboard/reports",
      icon: FileText,
    },
  ];

  // 그룹 내부에 있을 때만 표시되는 메뉴들
  const groupNavItems = groupId
    ? [
        {
          title: "그룹 개요",
          href: `/dashboard/groups/${groupId}`,
          icon: Users,
          exact: true,
        },
        {
          title: "학생 관리",
          href: `/dashboard/groups/${groupId}/students`,
          icon: GraduationCap,
        },
        {
          title: "폼 관리",
          href: `/dashboard/groups/${groupId}/forms`,
          icon: ClipboardList,
        },
        {
          title: "평가 결과",
          href: `/dashboard/groups/${groupId}/evaluations`,
          icon: ListChecks,
        },
        {
          title: "그룹 설정",
          href: `/dashboard/groups/${groupId}/settings`,
          icon: Settings,
        },
      ]
    : [];

  const profileNavItems = [
    {
      title: "프로필",
      href: "/dashboard/profile",
      icon: User,
    },
    {
      title: "설정",
      href: "/dashboard/settings",
      icon: Settings,
    },
  ];

  // 현재 경로가 정확히 일치하는지 또는 시작 부분만 일치하는지 확인하는 함수
  const isActive = (itemHref: string, exact?: boolean) => {
    if (exact) {
      return pathname === itemHref;
    }
    return pathname.startsWith(itemHref);
  };

  return (
    <nav className="grid gap-4">
      {/* 기본 메뉴 */}
      <div className="grid gap-2">
        {navItems.map((item) => (
          <Button
            key={item.href}
            variant={isActive(item.href) ? "secondary" : "ghost"}
            className={cn("justify-start", isActive(item.href) ? "bg-secondary" : "")}
            asChild
          >
            <Link href={item.href}>
              <item.icon className="mr-2 h-4 w-4" />
              {item.title}
            </Link>
          </Button>
        ))}
      </div>

      {/* 그룹 내부 메뉴 */}
      {groupId && (
        <div className="grid gap-2">
          <div className="px-2 py-1">
            <h3 className="text-xs font-medium text-muted-foreground">그룹 메뉴</h3>
          </div>
          {groupNavItems.map((item) => (
            <Button
              key={item.href}
              variant={isActive(item.href, item.exact) ? "secondary" : "ghost"}
              className={cn("justify-start", isActive(item.href, item.exact) ? "bg-secondary" : "")}
              asChild
            >
              <Link href={item.href}>
                <item.icon className="mr-2 h-4 w-4" />
                {item.title}
              </Link>
            </Button>
          ))}
        </div>
      )}

      {/* 프로필 메뉴 */}
      <div className="grid gap-2">
        <div className="px-2 py-1">
          <h3 className="text-xs font-medium text-muted-foreground">사용자</h3>
        </div>
        {profileNavItems.map((item) => (
          <Button
            key={item.href}
            variant={isActive(item.href) ? "secondary" : "ghost"}
            className={cn("justify-start", isActive(item.href) ? "bg-secondary" : "")}
            asChild
          >
            <Link href={item.href}>
              <item.icon className="mr-2 h-4 w-4" />
              {item.title}
            </Link>
          </Button>
        ))}
      </div>
    </nav>
  );
}
