"use client"

import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { UserCircle, Edit2 } from "lucide-react"

interface ProfileContentProps {
  editMode: boolean
  name: string
  nickName: string
  phone: string
  loading: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: () => void
  onNameChange: (v: string) => void
  onNickNameChange: (v: string) => void
  onPhoneChange: (v: string) => void
}

export function ProfileContent({
  editMode,
  name,
  nickName,
  phone,
  loading,
  onEdit,
  onCancel,
  onSave,
  onNameChange,
  onNickNameChange,
  onPhoneChange,
}: ProfileContentProps) {
  return (
    <Card className="shadow-sm border-0">
      <CardHeader className="pb-4 border-b">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl text-slate-800 flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-primary" />
            내 정보
          </CardTitle>
          {!editMode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="flex items-center gap-1 text-slate-600"
            >
              <Edit2 className="h-4 w-4" />
              프로필 수정
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {editMode ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">이름</label>
              <Input
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="이름"
                className="max-w-md"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">닉네임</label>
              <Input
                value={nickName}
                onChange={(e) => onNickNameChange(e.target.value)}
                placeholder="닉네임"
                className="max-w-md"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">전화번호</label>
              <Input
                value={phone}
                onChange={(e) => onPhoneChange(e.target.value)}
                placeholder="전화번호"
                className="max-w-md"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button onClick={onSave} disabled={loading}>
                {loading ? "저장 중..." : "저장하기"}
              </Button>
              <Button variant="outline" onClick={onCancel} disabled={loading}>
                취소
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">이름</p>
                <p className="font-medium">{name || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">닉네임</p>
                <p className="font-medium">{nickName || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">전화번호</p>
                <p className="font-medium">{phone || "-"}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
