"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft } from "lucide-react"
import { Tabs, TabsContent } from "@/components/ui/tabs"

import { MyPageSidebar } from "@/app/components/MyPage/MyPageSidebar"
import { ProfileContent } from "@/app/components/MyPage/ProfileContent"
import { GroupsContent, Group } from "@/app/components/MyPage/GroupsContent"
import { SettingsContent } from "@/app/components/MyPage/SettingsContent"

// 탭 키 타입 정의
type TabKey = "profile" | "groups" | "settings"

export default function MyPage() {
  const router = useRouter()

  // 탭, 유저, 그룹, 프로필 편집 상태 및 필드, 알림/로딩 상태
  const [tab, setTab] = useState<TabKey>("profile")
  const [user, setUser] = useState<import("@supabase/supabase-js").User | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [editMode, setEditMode] = useState(false)
  const [name, setName] = useState("")
  const [nickName, setNickName] = useState("")
  const [phone, setPhone] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  // 데이터 불러오기
  useEffect(() => {
    async function fetchData() {
      // 세션 확인
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        router.push("/login")
        return
      }
      const currentUser = session.user
      setUser(currentUser)

      // 사용자 정보 조회
      const { data: userInfo, error: userInfoError } = await supabase
        .from("users")
        .select("name, nick_name, phone")
        .eq("id", currentUser.id)
        .single()
      if (userInfoError) {
        setError("사용자 정보를 불러오는 중 오류가 발생했습니다.")
      } else if (userInfo) {
        setName(userInfo.name || "")
        setNickName(userInfo.nick_name || "")
        setPhone(userInfo.phone || "")
      }

      // 그룹 및 역할 조회
      const { data: memberships, error: membershipError } = await supabase
        .from("group_members")
        .select("group_id, role")
        .eq("user_id", currentUser.id)
      if (membershipError) {
        setError("그룹 정보를 불러오는 중 오류가 발생했습니다.")
      } else if (memberships && memberships.length > 0) {
        const groupIds = memberships.map(m => m.group_id)
        const { data: groupsData, error: groupError } = await supabase
          .from("groups")
          .select("id, name")
          .in("id", groupIds)
        if (groupError) {
          setError("그룹 목록을 불러오는 중 오류가 발생했습니다.")
        } else if (groupsData) {
          setGroups(
            groupsData.map(g => ({
              id: g.id,
              name: g.name,
              role: memberships.find(m => m.group_id === g.id)?.role || "",
            }))
          )
        }
      }
    }

    fetchData()
  }, [router])

  // 프로필 저장 핸들러
  const handleSave = async () => {
    if (!user) return
    setLoading(true)
    setError("")
    try {
      const { error: updateError } = await supabase
        .from("users")
        .update({ name, nick_name: nickName, phone })
        .eq("id", user.id)
      if (updateError) {
        setError("수정 중 오류가 발생했습니다.")
      } else {
        setEditMode(false)
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch {
      setError("수정 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    // 세션 확인 전 혹은 리다이렉트 처리 중
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/")}
              className="mr-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-slate-800">
              NK Academy 관리 시스템
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 border">
              <AvatarImage src="" alt={name} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium hidden sm:inline">
              {name}
            </span>
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200 text-green-800">
            <AlertDescription>프로필이 업데이트되었습니다.</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col md:flex-row gap-6">
          {/* 사이드바 */}
          <MyPageSidebar
            tab={tab}
            setTab={setTab}
            name={name}
            email={user.email}
            onBack={() => router.push("/")}
          />

          {/* 탭 컨텐츠 */}
          <div className="flex-1">
          <Tabs value={tab} onValueChange={(value: string) => setTab(value as TabKey)}>
              <TabsContent value="profile">
                <ProfileContent
                  editMode={editMode}
                  name={name}
                  nickName={nickName}
                  phone={phone}
                  loading={loading}
                  onEdit={() => setEditMode(true)}
                  onCancel={() => setEditMode(false)}
                  onSave={handleSave}
                  onNameChange={setName}
                  onNickNameChange={setNickName}
                  onPhoneChange={setPhone}
                />
              </TabsContent>
              <TabsContent value="groups">
                <GroupsContent groups={groups} />
              </TabsContent>
              <TabsContent value="settings">
                <SettingsContent />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}
