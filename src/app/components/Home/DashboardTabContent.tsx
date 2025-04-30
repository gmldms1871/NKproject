"use client"

import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface DashboardTabContentProps {
  newReportsCount: number
  totalGroups: number
  onCreateGroup: () => void
}

export function DashboardTabContent({ newReportsCount, totalGroups, onCreateGroup }: DashboardTabContentProps) {
  return (
    <>
      <h2 className="text-xl font-semibold mb-6">대시보드</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { title: newReportsCount, desc: '미확인 보고서', link: '/reports', linkText: '보고서 확인하기' },
          { title: '--', desc: '오늘 업무 입력', link: '/statistics', linkText: '세부 정보 보기' },
          { title: totalGroups, desc: '전체 그룹', action: onCreateGroup, actionText: '새 그룹 생성' }
        ].map((item, idx) => (
          <Card key={idx}>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl">{item.title}</CardTitle>
              <CardDescription>{item.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              {item.link ? (
                <Link href={item.link} className="text-sm text-primary">{item.linkText}</Link>
              ) : (
                <Button variant="link" size="sm" className="p-0" onClick={onCreateGroup}>{item.actionText}</Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <h3 className="text-lg font-semibold mb-4">최근 활동</h3>
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center py-4">최근 활동 내역이 없습니다.</p>
        </CardContent>
      </Card>
    </>
  )
}