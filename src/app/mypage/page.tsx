"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { User } from "@supabase/supabase-js"

interface Group {
  id: string;
  name: string;
  role: string;
}

export default function MyPage() {
  const router = useRouter()
  const [tab, setTab] = useState("profile")
  const [user, setUser] = useState<User | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [editMode, setEditMode] = useState(false)
  const [name, setName] = useState("")
  const [nickName, setNickName] = useState("")
  const [phone, setPhone] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push("/login")
        return
      }

      const { user } = session
      setUser(user)

      const { data: userInfo } = await supabase
        .from("users")
        .select("name, nick_name, phone")
        .eq("id", user.id)
        .single()

      if (userInfo) {
        setName(userInfo.name || "")
        setNickName(userInfo.nick_name || "")
        setPhone(userInfo.phone || "")
      }

      const { data: memberships } = await supabase
        .from("group_members")
        .select("group_id, role")
        .eq("user_id", user.id)

      if (memberships && memberships.length > 0) {
        const groupIds = memberships.map(m => m.group_id)
        const { data: groupsData } = await supabase
          .from("groups")
          .select("id, name")
          .in("id", groupIds)

        if (groupsData) {
          const combined = groupsData.map(g => ({
            id: g.id,
            name: g.name,
            role: memberships.find(m => m.group_id === g.id)?.role || "",
          }))
          setGroups(combined)
        }
      }
    }
    fetchData()
  }, [router])

  const handleSave = async () => {
    if (!user) return
  
    const { error } = await supabase
      .from("users")
      .update({ name, nick_name: nickName, phone })
      .eq("id", user.id)
  
    if (error) {
      setError("수정 중 오류가 발생했습니다.")
    } else {
      setEditMode(false)
      setError("")
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">NK Academy 관리 시스템</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={tab} onValueChange={setTab} className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <TabsList className="flex flex-col space-y-2">
            <TabsTrigger value="profile">내 정보</TabsTrigger>
            <TabsTrigger value="groups">내 그룹</TabsTrigger>
            <TabsTrigger value="settings">계정 설정</TabsTrigger>
          </TabsList>

          <div className="md:col-span-3">
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>내 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {editMode ? (
                    <>
                      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" />
                      <Input value={nickName} onChange={(e) => setNickName(e.target.value)} placeholder="닉네임" />
                      <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="전화번호" />
                      <Button onClick={handleSave}>저장</Button>
                    </>
                  ) : (
                    <>
                      <p><b>이름:</b> {name}</p>
                      <p><b>닉네임:</b> {nickName}</p>
                      <p><b>전화번호:</b> {phone}</p>
                      <Button onClick={() => setEditMode(true)}>프로필 수정</Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="groups">
              <Card>
                <CardHeader>
                  <CardTitle>내 그룹</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {groups.length === 0 ? (
                    <p>가입된 그룹이 없습니다.</p>
                  ) : (
                    groups.map((group) => (
                      <Card key={group.id} className="p-4">
                        <p><b>그룹명:</b> {group.name}</p>
                        <p><b>역할:</b> {group.role}</p>
                      </Card>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>계정 설정</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p>비밀번호 변경 기능 준비중...</p>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}
