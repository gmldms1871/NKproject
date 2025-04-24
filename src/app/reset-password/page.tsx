"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { supabase } from "@/lib/supabaseClient"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Alert, AlertDescription } from "@/components/ui/alert"

const formSchema = z.object({
  password: z.string().min(6, {
    message: "비밀번호는 최소 6자 이상이어야 합니다.",
  }),
  confirmPassword: z.string().min(6, {
    message: "비밀번호 확인은 최소 6자 이상이어야 합니다.",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "비밀번호가 일치하지 않습니다.",
  path: ["confirmPassword"],
})

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [resetComplete, setResetComplete] = useState(false)
  const [validToken, setValidToken] = useState(false)
  const [checkingToken, setCheckingToken] = useState(true)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  })

  useEffect(() => {
    async function verifyToken() {
      setCheckingToken(true)
      try {
        // URL에서 토큰 관련 파라미터 확인
        // Supabase는 여기서 자동으로 URL의 토큰을 처리합니다
        
        // 세션 확인만 하고 별도로 이메일 입력 요구하지 않음
        const { data } = await supabase.auth.getSession()
        
        if (data && data.session) {
          // 세션이 있으면 바로 비밀번호 변경 가능
          setValidToken(true)
        } else {
          // 세션이 없으면 유효하지 않은 링크
          setError("비밀번호 재설정 링크가 만료되었거나 유효하지 않습니다.")
          setValidToken(false)
        }
      } catch (error) {
        console.error("토큰 검증 에러:", error)
        setError("비밀번호 재설정 링크 검증 중 오류가 발생했습니다.")
        setValidToken(false)
      } finally {
        setCheckingToken(false)
      }
    }

    verifyToken()
  }, [searchParams])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!validToken) {
      setError("유효하지 않은 비밀번호 재설정 세션입니다.")
      return
    }

    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      const { error } = await supabase.auth.updateUser({
        password: values.password
      })

      if (error) {
        setError(error.message)
      } else {
        setSuccess("비밀번호가 성공적으로 변경되었습니다.")
        setResetComplete(true)
        form.reset()
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : "비밀번호 재설정 중 오류가 발생했습니다."
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // 토큰 확인 중 로딩 상태 표시
  if (checkingToken) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">비밀번호 재설정</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
            <p className="text-center text-gray-500">재설정 링크를 확인하는 중입니다...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">비밀번호 재설정</CardTitle>
          <CardDescription className="text-center">
            {validToken ? "새로운 비밀번호를 입력해주세요." : "비밀번호 재설정 링크가 유효하지 않습니다."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!validToken ? (
            <div className="space-y-4">
              <Alert className="mt-4" variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <Button
                className="w-full mt-4"
                onClick={() => router.push("/reset-password/request")}
              >
                비밀번호 재설정 요청으로 돌아가기
              </Button>
            </div>
          ) : !resetComplete ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>새 비밀번호</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="******" 
                          {...field} 
                          type="password"
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>새 비밀번호 확인</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="******" 
                          {...field} 
                          type="password"
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "처리 중..." : "비밀번호 변경하기"}
                </Button>
                
                {error && (
                  <Alert className="mt-4" variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </form>
            </Form>
          ) : (
            <div className="space-y-4">
              <Alert className="mt-4">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
              
              <Button
                className="w-full mt-4"
                onClick={() => router.push("/login")}
              >
                로그인하기
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}