// src/app/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { HomeHeader } from "@/app/components/Home/HomeHeader"
import { HomeSidebar } from "@/app/components/Home/HomeSidebar"
import GroupsTabContent, { Group } from "@/app/components/Home/GroupsTabContent"
import { DashboardTabContent } from "@/app/components/Home/DashboardTabContent"
import { QuickAccessTabContent } from "@/app/components/Home/QuickAccessTabContent"
import {
  AlertCircle,
  Users,
  LayoutDashboard,
  PanelTop,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export default function HomePage() {
  const router = useRouter()

  // 사용자명
  const [userName, setUserName] = useState<string>("")
  // 그룹별 역할 리스트
  const [rolesList, setRolesList] = useState<string[]>([])
  // 그 중 가장 높은 권한
  const [highestRole, setHighestRole] = useState<
    "CEO" | "Teacher" | "Part-time Lecturer" | null
  >(null)
  // 그룹 데이터
  const [groups, setGroups] = useState<Group[]>([])
  // CEO용 새 보고서 카운트
  const [newReportsCount, setNewReportsCount] = useState<number>(0)

  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>("")

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1) 세션 확인
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()
        if (sessionError) throw sessionError
        if (!session) {
          router.push("/login")
          return
        }
        const currentUser = session.user

        // 2) 사용자 이름 조회
        const {
          data: userInfo,
          error: userInfoError,
        } = await supabase
          .from("users")
          .select("name")
          .eq("id", currentUser.id)
          .single()
        if (userInfoError) throw userInfoError
        setUserName(userInfo.name)

        // 3) 내 멤버십 조회
        const { data: _membershipData, error: membershipError } =
          await supabase
            .from("group_members")
            .select("group_id, role")
            .eq("user_id", currentUser.id)
        if (membershipError) throw membershipError
        const safeMembershipData = (_membershipData ?? []) as {
          group_id: string
          role: string
        }[]

        // 4) 내가 소유한 그룹 ID 조회
        const { data: _ownedGroups, error: ownedError } =
          await supabase
            .from("groups")
            .select("id")
            .eq("owner_id", currentUser.id)
        if (ownedError) throw ownedError
        const safeOwnedGroups = (_ownedGroups ?? []) as { id: string }[]

        // 5) 두 결과에서 고유한 그룹 ID 합치기
        const allGroupIds = Array.from(
          new Set([
            ...safeMembershipData.map((m) => m.group_id),
            ...safeOwnedGroups.map((g) => g.id),
          ])
        )

        // 6) 상세 정보 조회 및 userRole 결합
        let combined: Group[] = []
        if (allGroupIds.length > 0) {
          const { data: _groupData, error: groupError } = await supabase
            .from("groups")
            .select("*")
            .in("id", allGroupIds)
          if (groupError) throw groupError
          const safeGroupData = (_groupData ?? []) as Group[]

          combined = safeGroupData.map((g) => {
            const membership = safeMembershipData.find(
              (m) => m.group_id === g.id
            )
            return {
              ...g,
              userRole: membership?.role ?? "CEO",
            }
          })
        }

        // 7) 상태 업데이트
        const rolesOnly = combined
          .map((g) => g.userRole)
          .filter((r): r is string => r !== null)
        setRolesList(Array.from(new Set(rolesOnly)))

        const hr =
          combined.some((g) => g.userRole === "CEO")
            ? "CEO"
            : combined.some((g) => g.userRole === "Teacher")
            ? "Teacher"
            : combined.some((g) => g.userRole === "Part-time Lecturer")
            ? "Part-time Lecturer"
            : null
        setHighestRole(hr)
        setGroups(combined)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // 8) Realtime 구독
    const channel = supabase
      .channel("reports-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reports" },
        () => {
          if (highestRole === "CEO") {
            setNewReportsCount((prev) => prev + 1)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router, highestRole])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push("/login")
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleGroup = () => {
    router.push("/group")
  }

  // 로딩 스켈레톤
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="h-16 bg-white shadow mb-8">
          <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1">
              <Skeleton className="h-96 w-full rounded-lg" />
            </div>
            <div className="md:col-span-3">
              <Skeleton className="h-10 w-48 mb-6" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton className="h-64 w-full rounded-lg" />
                <Skeleton className="h-64 w-full rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }


  // 메인 렌더링
  return (
    <div className="min-h-screen bg-gray-50">
      <HomeHeader
        userName={userName}
        rolesList={rolesList}
        onLogout={handleLogout}
      />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4 mr-2" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <aside className="hidden lg:block lg:col-span-1">
            <HomeSidebar
              role={highestRole}
              newReportsCount={newReportsCount}
              onCreateGroup={handleGroup}
            />
          </aside>

          {/* Tab & Content */}
          <div className="col-span-1 lg:col-span-3">
            <Tabs defaultValue="groups" className="w-full">
              <div className="flex items-center justify-between mb-6">
                <TabsList className="bg-white border border-gray-200">
                  <TabsTrigger value="groups" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>내 그룹</span>
                  </TabsTrigger>

                  {highestRole === "CEO" && (
                    <TabsTrigger
                      value="dashboard"
                      className="flex items-center gap-2"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      <span>대시보드</span>
                    </TabsTrigger>
                  )}

                  {(highestRole === "Teacher" ||
                    highestRole === "Part-time Lecturer") && (
                    <TabsTrigger
                      value="quickaccess"
                      className="flex items-center gap-2"
                    >
                      <PanelTop className="h-4 w-4" />
                      <span>빠른 입력</span>
                    </TabsTrigger>
                  )}
                </TabsList>

                <div className="block lg:hidden">
                  <Button
                    variant="outline"
                    onClick={() =>
                      document
                        .getElementById("mobile-sidebar")
                        ?.classList.toggle("hidden")
                    }
                  >
                    메뉴
                  </Button>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
              <TabsContent value="groups" className="mt-0">
                  {groups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 bg-white rounded-lg shadow">
                      <p className="mb-4 text-lg">참여 중인 그룹이 없습니다.</p>
                      <Button onClick={handleGroup}>
                        그룹 만들기
                      </Button>
                    </div>
                  ) : (
                    <GroupsTabContent
                      groups={groups}
                      onCreateGroup={handleGroup}
                    />
                  )}
                </TabsContent>

                {highestRole === "CEO" && (
                  <TabsContent value="dashboard">
                    <DashboardTabContent
                      newReportsCount={newReportsCount}
                      totalGroups={groups.length}
                      onCreateGroup={handleGroup}
                    />
                  </TabsContent>
                )}

                {(highestRole === "Teacher" ||
                  highestRole === "Part-time Lecturer") && (
                  <TabsContent value="quickaccess">
                    <QuickAccessTabContent />
                  </TabsContent>
                )}
              </div>
            </Tabs>
          </div>
        </div>
      </main>

      {/* Mobile Sidebar */}
      <div
        id="mobile-sidebar"
        className="fixed inset-0 bg-black bg-opacity-50 z-50 hidden lg:hidden"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            document
              .getElementById("mobile-sidebar")
              ?.classList.add("hidden")
          }
        }}
      >
        <div className="h-full w-64 bg-white p-4 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">메뉴</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                document
                  .getElementById("mobile-sidebar")
                  ?.classList.add("hidden")
              }
            >
              ✕
            </Button>
          </div>
          <HomeSidebar
            role={highestRole}
            newReportsCount={newReportsCount}
            onCreateGroup={handleGroup}
          />
        </div>
      </div>
    </div>
  )
}
