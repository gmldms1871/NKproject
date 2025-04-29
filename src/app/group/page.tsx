"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function GroupPage() {
  const [groupName, setGroupName] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [role, setRole] = useState("teacher")
  const [message, setMessage] = useState("")
  const [groupId, setGroupId] = useState<number | null>(null)

  // 그룹 생성
  const handleCreateGroup = async () => {
    const user = (await supabase.auth.getUser()).data.user

    if (!user) {
      setMessage("로그인 후 이용해주세요.")
      return
    }

    const { data, error } = await supabase
      .from("groups")
      .insert([{ name: groupName, owner_id: user.id }])
      .select()
      .single()

    if (error) {
      setMessage(error.message)
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
    }
  }

  // 멤버 초대
  const handleInvite = async () => {
    if (!groupId) {
      setMessage("먼저 그룹을 생성하세요.")
      return
    }

    const { data: invitedUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", inviteEmail)
      .single()

    if (!invitedUser) {
      setMessage("해당 이메일로 등록된 사용자가 없습니다.")
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
    } else {
      setMessage(`${inviteEmail} 님을 ${role} 역할로 초대했습니다.`)
      setInviteEmail("")
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md space-y-4">
        <CardHeader>
          <CardTitle className="text-center">그룹 관리</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Input 
              placeholder="그룹 이름 입력" 
              value={groupName} 
              onChange={(e) => setGroupName(e.target.value)} 
            />
            <Button onClick={handleCreateGroup} className="w-full mt-2">
              그룹 생성
            </Button>
          </div>

          {groupId && (
            <div className="space-y-2">
              <Input 
                placeholder="초대할 이메일" 
                value={inviteEmail} 
                onChange={(e) => setInviteEmail(e.target.value)} 
              />
              <select 
                value={role} 
                onChange={(e) => setRole(e.target.value)} 
                className="w-full p-2 border rounded">
                <option value="teacher">Teacher</option>
                <option value="part-timeLecturer">Part-time Lecturer</option>
              </select>
              <Button onClick={handleInvite} className="w-full mt-2">
                멤버 초대
              </Button>
            </div>
          )}

          {message && (
            <Alert>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
