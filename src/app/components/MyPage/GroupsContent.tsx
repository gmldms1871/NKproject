"use client"

import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
import { Users, BadgeCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export interface Group {
  id: string
  name: string
  role: string
}

interface GroupsContentProps {
  groups: Group[]
}

export function GroupsContent({ groups }: GroupsContentProps) {
  const router = useRouter()
  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case "ceo":
        return "bg-blue-100 text-blue-800"
      case "teacher":
        return "bg-green-100 text-green-800"
      case "part-time lecturer":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Card className="shadow-sm border-0">
      <CardHeader className="pb-4 border-b">
        <CardTitle className="text-xl text-slate-800 flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          내 그룹
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {groups.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-md">
            <Users className="h-12 w-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-600">가입된 그룹이 없습니다.</p>
            <p className="text-sm text-slate-500 mt-1">
              초대를 기다려주세요.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((g) => (
              <div
                key={g.id}
                className="p-4 bg-white border rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{g.name}</h3>
                      <Badge className={`${getRoleBadgeColor(g.role)} ml-1`}>
                        {g.role}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500">ID: {g.id}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/group/${g.id}`)}
                  >
                    바로가기
                  </Button>
                </div>
                <Separator className="my-3" />
                <p className="text-sm flex items-center gap-1">
                  <BadgeCheck className="h-4 w-4 text-primary" />
                  역할: <span className="font-medium">{g.role}</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
