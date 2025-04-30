"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import {
  Users,
  UserPlus,
  PlusCircle,
  CheckCircle,
  AlertCircle,
  InfoIcon
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

export default function GroupPage() {
  const [groupName, setGroupName] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [role, setRole] = useState("teacher")
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null)
  const [groupId, setGroupId] = useState<number | null>(null)
  const [loading, setLoading] = useState<boolean>(false)

  // 그룹 생성
  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setMessage("그룹 이름을 입력해주세요.")
      setMessageType("error")
      return
    }

    setLoading(true)

    try {
      const user = (await supabase.auth.getUser()).data.user

      if (!user) {
        setMessage("로그인 후 이용해주세요.")
        setMessageType("error")
        return
      }

      const { data, error } = await supabase
        .from("groups")
        .insert([{ name: groupName, owner_id: user.id }])
        .select()
        .single()

      if (error) {
        setMessage(error.message)
        setMessageType("error")
      } else {
        // 그룹 멤버로 CEO 등록
        await supabase.from("group_members").insert([{
          group_id: data.id,
          user_id: user.id,
          role: "ceo",
          invited_at: new Date().toISOString(),
          accepted_at: new Date().toISOString(),
        }])

        setGroupId(data.id)
        setMessage(`그룹 "${groupName}" 생성 완료!`)
        setMessageType("success")
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err))
      setMessageType("error")
    } finally {
      setLoading(false)
    }
  }

  // 멤버 초대
  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      setMessage("초대할 이메일을 입력해주세요.")
      setMessageType("error")
      return
    }

    if (!groupId) {
      setMessage("먼저 그룹을 생성하세요.")
      setMessageType("error")
      return
    }

    setLoading(true)

    try {
      const { data: invitedUser } = await supabase
        .from("users")
        .select("id")
        .eq("email", inviteEmail)
        .single()

      if (!invitedUser) {
        setMessage("해당 이메일로 등록된 사용자가 없습니다.")
        setMessageType("error")
        return
      }

      const { error } = await supabase.from("group_members").insert([{
        group_id: groupId,
        user_id: invitedUser.id,
        role: role,
        invited_at: new Date().toISOString(),
      }])

      if (error) {
        setMessage(error.message)
        setMessageType("error")
      } else {
        setMessage(`${inviteEmail} 님을 ${getRoleName(role)} 역할로 초대했습니다.`)
        setMessageType("success")
        setInviteEmail("")
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err))
      setMessageType("error")
    } finally {
      setLoading(false)
    }
  }

  const getRoleName = (role: string) => {
    switch (role) {
      case 'teacher': return '선생님';
      case 'part-timeLecturer': return '시간강사';
      default: return role;
    }
  }

  // 로딩 상태 표시
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <Skeleton className="h-8 w-48 mb-6" />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 flex items-center text-gray-800">
          <Users className="mr-2 h-6 w-6" />
          그룹 관리
        </h1>

        <Card className="border border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium">그룹 생성 및 멤버 초대</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="create" className="w-full">
              <TabsList className="mb-4 bg-gray-100 border border-gray-200">
                <TabsTrigger value="create" className="flex items-center gap-2">
                  <PlusCircle className="h-4 w-4" />
                  <span>그룹 생성</span>
                </TabsTrigger>
                {groupId && (
                  <TabsTrigger value="invite" className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    <span>멤버 초대</span>
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="create" className="mt-0">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="group-name" className="text-sm font-medium">
                      그룹 이름
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="group-name"
                        placeholder="그룹 이름 입력"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        className="flex-1"
                      />
                      <Button 
                        onClick={handleCreateGroup} 
                        className="flex items-center gap-2"
                      >
                        <PlusCircle className="h-4 w-4" />
                        그룹 생성
                      </Button>
                    </div>
                  </div>

                  {groupId && (
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg mt-4">
                      <div className="flex items-center text-blue-700 mb-2">
                        <CheckCircle className="h-5 w-5 mr-2" />
                        <span className="font-medium">&quot;{groupName}&quot; 그룹이 생성되었습니다</span>
                      </div>
                      <p className="text-sm text-blue-600">
                        이제 멤버를 초대할 수 있습니다. &quot;멤버 초대&quot; 탭으로 이동하세요.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {groupId && (
                <TabsContent value="invite" className="mt-0">
                  <div className="space-y-4">
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg mb-4">
                      <div className="flex items-center text-gray-700">
                        <InfoIcon className="h-4 w-4 mr-2 text-blue-600" />
                        <span className="text-sm">현재 그룹: <span className="font-medium">{groupName}</span></span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="invite-email" className="text-sm font-medium">
                        초대할 이메일
                      </Label>
                      <Input
                        id="invite-email"
                        placeholder="이메일 주소"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role-select" className="text-sm font-medium">
                        역할
                      </Label>
                      <Select
                        value={role}
                        onValueChange={setRole}
                      >
                        <SelectTrigger id="role-select">
                          <SelectValue placeholder="역할 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="teacher">선생님</SelectItem>
                          <SelectItem value="part-timeLecturer">시간강사</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button 
                      onClick={handleInvite} 
                      className="w-full mt-2 flex items-center justify-center gap-2"
                    >
                      <UserPlus className="h-4 w-4" />
                      멤버 초대
                    </Button>
                  </div>
                </TabsContent>
              )}
            </Tabs>

            {message && (
              <>
                <Separator className="my-6" />
                <Alert 
                  variant={messageType === "error" ? "destructive" : "default"}
                  className={messageType === "success" ? "bg-green-50 text-green-800 border-green-200" : ""}
                >
                  {messageType === "success" ? (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  ) : (
                    <AlertCircle className="h-4 w-4 mr-2" />
                  )}
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}