"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import { User } from "@supabase/supabase-js"

// Shadcn UI 컴포넌트 임포트
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

// 필요한 타입 정의
interface Group {
  id: string
  name: string
  created_at: string
  owner_id: string
  userRole: string | null
}

interface UserData {
  name: string;
  nick_name: string;
}

export default function HomePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>("")
  const [role, setRole] = useState<string>("")
  const [newReportsCount, setNewReportsCount] = useState<number>(0)

  useEffect(() => {
    const checkSession = async () => {
      try {
        // 현재 로그인된 사용자 확인
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          throw sessionError
        }

        if (!session) {
          // 로그인되지 않은 경우 로그인 페이지로 리다이렉트
          router.push("/login")
          return
        }

        const { user } = session
        setUser(user)

        // 사용자 정보 가져오기
        const { data: userInfo, error: userError } = await supabase
          .from('users')
          .select('name, nick_name')
          .eq('id', user.id)
          .single()

        if (userError) {
          throw userError
        }
        
        setUserData(userInfo as UserData)

        // 사용자의 그룹 정보 가져오기
        const { data: groupMemberships, error: groupError } = await supabase
          .from('group_members')
          .select('group_id, role')
          .eq('user_id', user.id)

        if (groupError) {
          throw groupError
        }

        // 사용자가 속한 그룹 정보 가져오기
        if (groupMemberships && groupMemberships.length > 0) {
          const groupIds = groupMemberships.map(membership => membership.group_id)
          const { data: groupsData, error: groupsError } = await supabase
            .from('groups')
            .select('*')
            .in('id', groupIds)

          if (groupsError) {
            throw groupsError
          }

          // 그룹 정보와 사용자 역할 병합
          const groupsWithRole = groupsData.map(group => {
            const membership = groupMemberships.find(m => m.group_id === group.id)
            return {
              ...group,
              userRole: membership ? membership.role : null
            }
          })

          setGroups(groupsWithRole as Group[])
          
          // 역할 확인 (CEO, Teacher, Part-time Lecturer)
          const roles = groupMemberships.map(m => m.role)
          if (roles.includes('CEO')) {
            setRole('CEO')
            
            // CEO인 경우 확인하지 않은 새 보고서 개수 조회
            const ceoGroups = groupMemberships
              .filter(m => m.role === 'CEO')
              .map(m => m.group_id)
              
            if (ceoGroups.length > 0) {
              const { data: reportsData, error: reportsError } = await supabase
                .from('reports')
                .select('id')
                .in('group_id', ceoGroups)
                .eq('reviewed', false)
                
              if (!reportsError && reportsData) {
                setNewReportsCount(reportsData.length)
              }
            }
          } else if (roles.includes('Teacher')) {
            setRole('Teacher')
          } else {
            setRole('Part-time Lecturer')
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        setError(error instanceof Error ? error.message : '데이터를 불러오는 중 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    // Supabase Realtime 구독 설정 (새 보고서 알림)
    const reportsSubscription = supabase
      .channel('reports-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reports' },
        () => {
          if (role === 'CEO') {
            setNewReportsCount(prevCount => prevCount + 1)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(reportsSubscription)
    }
  }, [router, role])

  const handleCreateGroup = () => {
    router.push("/group/create")
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push("/login")
    } catch (error) {
      setError(error instanceof Error ? error.message : '로그아웃 중 오류가 발생했습니다.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">NK Academy 관리 시스템</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src="" alt={userData?.name || user?.email} />
                <AvatarFallback>{userData?.name?.charAt(0) || user?.email?.charAt(0)}</AvatarFallback>
              </Avatar>
                              <div>
                <p className="text-sm font-medium">{userData?.name || user?.email}</p>
                <p className="text-xs text-muted-foreground">{role}</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout}>로그아웃</Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* 사이드바/대시보드 영역 */}
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>대시보드</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-1 p-2">
                  <Button variant="secondary" className="w-full justify-start" asChild>
                    <Link href="/">홈</Link>
                  </Button>
                  
                  {role === 'CEO' && (
                    <>
                      <Button variant="ghost" className="w-full justify-start" asChild>
                        <Link href="/group/manage">구성원 관리</Link>
                      </Button>
                      <Button variant="ghost" className="w-full justify-start" asChild>
                        <Link href="/settings">업무 항목 설정</Link>
                      </Button>
                      <Button variant="ghost" className="w-full justify-between" asChild>
                        <Link href="/reports">
                          보고서 관리
                          {newReportsCount > 0 && (
                            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{newReportsCount}</span>
                          )}
                        </Link>
                      </Button>
                      <Button variant="ghost" className="w-full justify-start" asChild>
                        <Link href="/statistics">통계</Link>
                      </Button>
                    </>
                  )}
                  
                  {(role === 'Teacher' || role === 'Part-time Lecturer') && (
                    <>
                      <Button variant="ghost" className="w-full justify-start" asChild>
                        <Link href="/tasks">업무 입력</Link>
                      </Button>
                      <Button variant="ghost" className="w-full justify-start" asChild>
                        <Link href="/reports/create">보고서 작성</Link>
                      </Button>
                      {role === 'Teacher' && (
                        <Button variant="ghost" className="w-full justify-start" asChild>
                          <Link href="/students">학생 관리</Link>
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 메인 콘텐츠 영역 */}
          <div className="md:col-span-3">
            <Tabs defaultValue="groups" className="w-full">
              <TabsList>
                <TabsTrigger value="groups">내 그룹</TabsTrigger>
                {role === 'CEO' && (
                  <TabsTrigger value="dashboard">대시보드</TabsTrigger>
                )}
                {(role === 'Teacher' || role === 'Part-time Lecturer') && (
                  <TabsTrigger value="quickaccess">빠른 입력</TabsTrigger>
                )}
              </TabsList>
              
              <TabsContent value="groups" className="mt-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">내 그룹</h2>
                  {role === 'CEO' && (
                    <Button onClick={handleCreateGroup}>
                      새 그룹 생성
                    </Button>
                  )}
                </div>

                {groups.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6 flex flex-col items-center justify-center py-10">
                      <h3 className="text-lg font-medium mb-2">참여 중인 그룹이 없습니다</h3>
                      <p className="text-muted-foreground mb-4 text-center">
                        {role === 'CEO' 
                          ? '새 그룹을 생성하거나 초대를 기다려주세요.' 
                          : '그룹 초대를 기다려주세요.'}
                      </p>
                      {role === 'CEO' && (
                        <Button onClick={handleCreateGroup}>
                          새 그룹 생성
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groups.map((group) => (
                      <Link href={`/group/${group.id}`} key={group.id}>
                        <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                          <CardHeader>
                            <CardTitle>{group.name}</CardTitle>
                            <p className="text-sm">
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">{group.userRole} 역할</span>
                            </p>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground">
                              생성일: {new Date(group.created_at).toLocaleDateString()}
                            </p>
                          </CardContent>
                          <CardFooter className="flex justify-end">
                            <Button variant="ghost" size="sm" className="text-primary">
                              {group.userRole === 'CEO' ? '관리하기' : '업무 입력하기'}
                            </Button>
                          </CardFooter>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </TabsContent>
              
              {/* CEO용 대시보드 */}
              {role === 'CEO' && (
                <TabsContent value="dashboard" className="mt-6">
                  <h2 className="text-xl font-semibold mb-6">대시보드</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-2xl">{newReportsCount}</CardTitle>
                        <CardDescription>미확인 보고서</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Link href="/reports" className="text-sm text-primary">
                          보고서 확인하기
                        </Link>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-2xl">--</CardTitle>
                        <CardDescription>오늘 업무 입력</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Link href="/statistics" className="text-sm text-primary">
                          세부 정보 보기
                        </Link>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-2xl">{groups.length}</CardTitle>
                        <CardDescription>전체 그룹</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button variant="link" size="sm" className="p-0" onClick={handleCreateGroup}>
                          새 그룹 생성
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <h3 className="text-lg font-semibold mb-4">최근 활동</h3>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-muted-foreground text-center py-4">
                        최근 활동 내역이 없습니다.
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
              
              {/* Teacher와 Part-time Lecturer용 빠른 액세스 */}
              {(role === 'Teacher' || role === 'Part-time Lecturer') && (
                <TabsContent value="quickaccess" className="mt-6">
                  <h2 className="text-xl font-semibold mb-6">빠른 입력</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => router.push('/tasks')}>
                      <CardHeader>
                        <CardTitle>업무 입력하기</CardTitle>
                        <CardDescription>
                          숙제, 테스트 등 일상 업무 입력
                        </CardDescription>
                      </CardHeader>
                      <CardFooter>
                        <Button variant="outline" size="sm">업무 입력하기</Button>
                      </CardFooter>
                    </Card>
                    
                    <Card className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => router.push('/reports/create')}>
                      <CardHeader>
                        <CardTitle>보고서 작성하기</CardTitle>
                        <CardDescription>
                          일별/주별 보고서 작성 및 제출
                        </CardDescription>
                      </CardHeader>
                      <CardFooter>
                        <Button variant="outline" size="sm">보고서 작성하기</Button>
                      </CardFooter>
                    </Card>
                    
                    {role === 'Teacher' && (
                      <Card className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => router.push('/students')}>
                        <CardHeader>
                          <CardTitle>학생 관리</CardTitle>
                          <CardDescription>
                            학생 등록 및 상담 기록
                          </CardDescription>
                        </CardHeader>
                        <CardFooter>
                          <Button variant="outline" size="sm">학생 관리하기</Button>
                        </CardFooter>
                      </Card>
                    )}
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}