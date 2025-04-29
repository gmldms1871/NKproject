"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { toast } from "sonner"

// 회원가입 폼 스키마
const formSchema = z.object({
  name: z.string().min(2, { message: "이름은 최소 2자 이상이어야 합니다." }),
  email: z.string().email({ message: "유효한 이메일 주소를 입력해주세요." }),
  password: z.string().min(6, { message: "비밀번호는 최소 6자 이상이어야 합니다." }),
  confirmPassword: z.string().min(6, { message: "비밀번호 확인은 최소 6자 이상이어야 합니다." }),
  phone: z.string()
    .min(13, { message: "전화번호 형식이 올바르지 않습니다." })
    .regex(/^01[0-9]-[0-9]{3,4}-[0-9]{4}$/, { message: "전화번호 형식이 올바르지 않습니다. (예: 010-1234-5678)" }),
  nickname: z.string().min(2, { message: "닉네임은 최소 2자 이상이어야 합니다." }),
  terms: z.boolean().refine(val => val === true, { message: "이용약관에 동의해야 합니다." }),
}).refine(data => data.password === data.confirmPassword, {
  message: "비밀번호가 일치하지 않습니다.",
  path: ["confirmPassword"],
})

export default function SignupPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      nickname: "",
      terms: false,
    },
  })

  // 전화번호를 E.164 포맷으로 변환 (한국 기준)
  function toE164Format(phone: string): string {
    const onlyNumbers = phone.replace(/[^0-9]/g, "")
    if (onlyNumbers.startsWith("0")) {
      return `+82${onlyNumbers.slice(1)}`
    }
    return phone
  }


  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    setError("")

    try {
      const { phone, ...rest } = values;
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...rest,
          signupPhone: toE164Format(phone),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || "회원가입 실패")
        return
      }

      toast.success("회원가입이 완료되었습니다!")
      setTimeout(() => {
        router.push("/login")
      }, 1000)

    } catch (e) {
      const message = e instanceof Error ? e.message : "회원가입 중 오류가 발생했습니다."
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">회원가입</CardTitle>
          <CardDescription className="text-center">
            아래 항목을 모두 입력하고 가입을 완료하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              
              {/* 이름 */}
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>이름</FormLabel>
                  <FormControl><Input {...field} disabled={isLoading} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* 이메일 */}
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>이메일</FormLabel>
                  <FormControl><Input type="email" {...field} disabled={isLoading} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* 비밀번호 */}
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>비밀번호</FormLabel>
                  <FormControl><Input type="password" {...field} disabled={isLoading} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* 비밀번호 확인 */}
              <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel>비밀번호 확인</FormLabel>
                  <FormControl><Input type="password" {...field} disabled={isLoading} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* 전화번호 */}
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>전화번호</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      {...field}
                      placeholder="010-1234-5678"
                      onChange={(e) => {
                        const onlyNums = e.target.value.replace(/[^0-9]/g, "")
                        let formatted = ""
                        if (onlyNums.length <= 3) {
                          formatted = onlyNums
                        } else if (onlyNums.length <= 7) {
                          formatted = `${onlyNums.slice(0, 3)}-${onlyNums.slice(3)}`
                        } else {
                          formatted = `${onlyNums.slice(0, 3)}-${onlyNums.slice(3, 7)}-${onlyNums.slice(7, 11)}`
                        }
                        field.onChange(formatted)
                      }}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* 닉네임 */}
              <FormField control={form.control} name="nickname" render={({ field }) => (
                <FormItem>
                  <FormLabel>닉네임</FormLabel>
                  <FormControl><Input {...field} disabled={isLoading} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* 약관 동의 */}
              <FormField control={form.control} name="terms" render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <input type="checkbox" checked={field.value} onChange={field.onChange} disabled={isLoading} />
                  </FormControl>
                  <FormLabel className="text-sm">이용약관에 동의합니다</FormLabel>
                  <FormMessage />
                </FormItem>
              )} />

              {/* 버튼 */}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "가입 처리 중..." : "회원가입"}
              </Button>

              {/* 에러 메세지 */}
              {error && (
                <Alert className="mt-4" variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

            </form>
          </Form>
        </CardContent>

        <CardFooter className="flex justify-center">
          <div className="text-sm text-gray-600">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="text-blue-600 hover:underline">
              로그인
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
