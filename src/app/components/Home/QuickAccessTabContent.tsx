"use client"

import { Card, CardHeader, CardDescription, CardFooter, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export function QuickAccessTabContent() {
  const router = useRouter()

  return (
    <>
      <h2 className="text-xl font-semibold mb-6">빠른 입력</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { title: '업무 입력하기', desc: '숙제, 테스트 등 일상 업무 입력', path: '/tasks' },
          { title: '보고서 작성하기', desc: '일별/주별 보고서 작성 및 제출', path: '/reports/create' },
        ].map((item, idx) => (
          <Card key={idx} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(item.path)}>
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.desc}</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button variant="outline" size="sm">{item.title}</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </>
  )
}
