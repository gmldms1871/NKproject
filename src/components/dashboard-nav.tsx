"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FileText, Home, Settings, User, Users } from "lucide-react";

export function DashboardNav() {
  const pathname = usePathname();

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

  return (
    <nav className="grid gap-2">
      {navItems.map((item) => (
        <Button
          key={item.href}
          variant={pathname === item.href ? "secondary" : "ghost"}
          className={cn("justify-start", pathname === item.href ? "bg-secondary" : "")}
          asChild
        >
          <Link href={item.href}>
            <item.icon className="mr-2 h-4 w-4" />
            {item.title}
          </Link>
        </Button>
      ))}
    </nav>
  );
}
