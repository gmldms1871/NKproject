"use client"

import type React from "react"

import { useEffect, useState } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getCurrentUser, getUserProfile } from "@/lib/supabase"
import { DashboardNav } from "@/components/dashboard-nav"
import { UserNav } from "@/components/user-nav"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from "lucide-react"
import type { User } from "@/types"

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          redirect("/login")
        }

        const profile = await getUserProfile(currentUser.id)
        if (profile) {
          setUser({
            id: currentUser.id,
            email: currentUser.email || "",
            name: profile.name,
            nick_name: profile.nick_name,
            phone: profile.phone,
            created_at: profile.created_at,
          })
        } else {
          setUser({
            id: currentUser.id,
            email: currentUser.email || "",
            name: null,
            nick_name: null,
            phone: null,
            created_at: new Date().toISOString(),
          })
        }
      } catch (error) {
        console.error("인증 확인 오류:", error)
        redirect("/login")
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">내비게이션 메뉴 토글</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <div className="grid gap-6 py-6">
              <div className="grid gap-3">
                <h3 className="text-lg font-semibold">내비게이션</h3>
                <DashboardNav />
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          보고서 관리 시스템
        </Link>
        <div className="ml-auto flex items-center gap-4">
          {user && <UserNav user={{ name: user.name, email: user.email }} />}
        </div>
      </header>
      <div className="grid flex-1 md:grid-cols-[220px_1fr]">
        <aside className="hidden border-r md:block">
          <div className="flex h-full max-h-screen flex-col gap-6 p-4">
            <DashboardNav />
          </div>
        </aside>
        <main className="flex flex-1 flex-col p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
