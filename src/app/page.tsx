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
  PanelTop
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export default function HomePage() {
  const router = useRouter()
  const [userName, setUserName] = useState<string>("")
  const [role, setRole] = useState<"CEO" | "Teacher" | "Part-time Lecturer">("Part-time Lecturer")
  const [groups, setGroups] = useState<Group[]>([])
  const [newReportsCount, setNewReportsCount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>("")

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError
        if (!session) {
          router.push("/login")
          return
        }
        const currentUser = session.user

        const { data: userInfo, error: userInfoError } = await supabase
          .from("users")
          .select("name")
          .eq("id", currentUser.id)
          .single()
        if (userInfoError) throw userInfoError
        setUserName(userInfo.name)

        const { data: memberships, error: membershipError } = await supabase
          .from("group_members")
          .select("group_id, role")
          .eq("user_id", currentUser.id)
        if (membershipError) throw membershipError

        const memberRoles = memberships.map(m => m.role)
        if (memberRoles.includes("CEO")) setRole("CEO")
        else if (memberRoles.includes("Teacher")) setRole("Teacher")
        else setRole("Part-time Lecturer")

        const groupIds = memberships.map(m => m.group_id)
        if (groupIds.length > 0) {
          const { data: groupData, error: groupError } = await supabase
            .from("groups")
            .select("*")
            .in("id", groupIds)
          if (groupError) throw groupError

          const combined = groupData.map(g => ({
            ...g,
            userRole: memberships.find(m => m.group_id === g.id)?.role ?? null
          }))
          setGroups(combined)

          if (role === "CEO") {
            const ceoIds = memberships.filter(m => m.role === "CEO").map(m => m.group_id)
            const { data: reports, error: reportError } = await supabase
              .from("reports")
              .select("id")
              .in("group_id", ceoIds)
              .eq("reviewed", false)
            if (!reportError && reports) setNewReportsCount(reports.length)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    const channel = supabase
      .channel("reports-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reports" },
        () => {
          if (role === "CEO") setNewReportsCount(prev => prev + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router, role])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push("/login")
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleCreateGroup = () => {
    router.push("/group/create")
  }

  // Loading skeletons for better UX during data loading
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

  return (
    <div className="min-h-screen bg-gray-50">
      <HomeHeader userName={userName} role={role} onLogout={handleLogout} />
      
      <main className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4 mr-2" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Hidden on mobile, shown as drawer */}
          <aside className="hidden lg:block lg:col-span-1">
            <HomeSidebar 
              role={role} 
              newReportsCount={newReportsCount} 
              onCreateGroup={handleCreateGroup} 
            />
          </aside>
          
          {/* Main Content Area */}
          <div className="col-span-1 lg:col-span-3">
            <Tabs defaultValue="groups" className="w-full">
              <div className="flex items-center justify-between mb-6">
                <TabsList className="bg-white border border-gray-200">
                  <TabsTrigger value="groups" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>내 그룹</span>
                  </TabsTrigger>
                  
                  {role === "CEO" && (
                    <TabsTrigger value="dashboard" className="flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4" />
                      <span>대시보드</span>
                    </TabsTrigger>
                  )}
                  
                  {(role === "Teacher" || role === "Part-time Lecturer") && (
                    <TabsTrigger value="quickaccess" className="flex items-center gap-2">
                      <PanelTop className="h-4 w-4" />
                      <span>빠른 입력</span>
                    </TabsTrigger>
                  )}
                </TabsList>
                
                {/* Mobile sidebar toggle */}
                <div className="block lg:hidden">
                  <Button 
                    variant="outline" 
                    onClick={() => document.getElementById('mobile-sidebar')?.classList.toggle('hidden')}
                  >
                    메뉴
                  </Button>
                </div>
              </div>

              {/* Tab Contents */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <TabsContent value="groups" className="mt-0">
                  <GroupsTabContent 
                    groups={groups} 
                    role={role} 
                    onCreateGroup={handleCreateGroup} 
                  />
                </TabsContent>

                {role === "CEO" && (
                  <TabsContent value="dashboard" className="mt-0">
                    <DashboardTabContent
                      newReportsCount={newReportsCount}
                      totalGroups={groups.length}
                      onCreateGroup={handleCreateGroup}
                    />
                  </TabsContent>
                )}

                {(role === "Teacher" || role === "Part-time Lecturer") && (
                  <TabsContent value="quickaccess" className="mt-0">
                    <QuickAccessTabContent />
                  </TabsContent>
                )}
              </div>
            </Tabs>
          </div>
        </div>
      </main>
      
      {/* Mobile Sidebar (hidden by default) */}
      <div 
        id="mobile-sidebar" 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 hidden lg:hidden"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            document.getElementById('mobile-sidebar')?.classList.add('hidden')
          }
        }}
      >
        <div className="h-full w-64 bg-white p-4 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">메뉴</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => document.getElementById('mobile-sidebar')?.classList.add('hidden')}
            >
              ✕
            </Button>
          </div>
          <HomeSidebar 
            role={role} 
            newReportsCount={newReportsCount} 
            onCreateGroup={handleCreateGroup} 
          />
        </div>
      </div>
    </div>
  )
}