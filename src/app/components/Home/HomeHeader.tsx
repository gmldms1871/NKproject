"use client"

import React from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

interface HomeHeaderProps {
  userName: string
  rolesList: string[]
  onLogout: () => void
}

export function HomeHeader({ userName, rolesList, onLogout }: HomeHeaderProps) {
  return (
    <div className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">NK Academy 관리 시스템</h1>
        <div className="flex items-center gap-4">
          <Avatar className="h-8 w-8">
            <AvatarImage src="" alt={userName} />
            <AvatarFallback>{userName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <Link href="/mypage">
              <p className="text-sm font-medium">{userName}</p>
            </Link>
            <p className="text-xs text-muted-foreground">
              {rolesList.length > 0
                ? rolesList.join(", ")
                : "초대 대기 중"}
            </p>
          </div>
          <Button variant="outline" onClick={onLogout}>
            로그아웃
          </Button>
        </div>
      </div>
    </div>
  )
}
