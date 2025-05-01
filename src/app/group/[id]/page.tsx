"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PostgrestError } from "@supabase/supabase-js"
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
  FileText,
  Settings,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  Mail,
  UserX,
  BarChart3,
} from "lucide-react"

// 타입 정의
interface Member {
  id: string
  user_id: string
  group_id: number
  role: string
  invited_at: string
  accepted_at: string | null
  user: {
    id: string
    name: string
    email: string
    nick_name: string | null
  }
}

interface Group {
  id: number
  name: string
  owner_id: string
  created_at: string
  userRole?: string
  members?: Member[]
}

interface Report {
  id: number
  group_id: number
  user_id: string
  title: string
  content: string
  created_at: string
  reviewed: boolean
  user: {
    name: string
    nick_name: string | null
  }
}

export default function GroupDetailPage() {
  const router = useRouter()
  const params = useParams()
  // UUID는 정수로 변환하지 않고 문자열 그대로 사용
  const groupId = params.id as string

  // State 관리
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null)

  // 데이터 상태
  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isCEO, setIsCEO] = useState(false)
  const [isTeacher, setIsTeacher] = useState(false)

  // 초대 관련 상태
  const [inviteEmail, setInviteEmail] = useState("")
  const [selectedRole, setSelectedRole] = useState("teacher")

  // 그룹 및 사용자 데이터 조회
  useEffect(() => {
    const fetchGroupData = async () => {
      try {
        setLoading(true)
        
        // 빈 ID 체크
        if (!groupId) {
          setError("유효하지 않은 그룹 ID입니다.");
          setLoading(false);
          return;
        }

        // 1. 로그인 확인
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push("/login")
          return
        }
        const currentUser = session.user

        console.log("그룹 ID 확인:", groupId);
        console.log("현재 사용자 ID:", currentUser.id);

        // 3. 그룹 멤버 조회 (사용자 정보 포함)
        console.log("그룹 ID 확인:", groupId);
        console.log("현재 사용자 ID:", currentUser.id);
        
        // 먼저 그룹 정보 조회 (소유자 확인을 위해)
        const { data: groupData, error: groupError } = await supabase
          .from("groups")
          .select("*")
          .eq("id", groupId)
          .single();
          
        if (groupError) {
          logSupabaseError(groupError, "그룹 정보 조회");
          
          if (groupError.code === "PGRST116") {
            setError("해당 그룹을 찾을 수 없습니다.");
            setLoading(false);
            return;
          } else if (groupError.code === "PGRST104") {
            setError("이 그룹에 대한 접근 권한이 없습니다. (RLS 정책 위반)");
            setLoading(false);
            return;
          } else {
            setError(`그룹 정보 조회 중 오류가 발생했습니다: ${groupError.message}`);
            setLoading(false);
            return;
          }
        }
        
        setGroup(groupData);
        
        // 현재 사용자가 그룹 소유자인지 확인
        const isOwner = groupData.owner_id === currentUser.id;
        console.log("소유자 확인:", isOwner, groupData.owner_id, currentUser.id);
        
        if (isOwner) {
          console.log("소유자 접근 권한 확인됨");
          
          // 소유자인데 group_members에 등록이 안되어 있다면 자동으로 등록
          const { data: membershipData, error: membershipError } = await supabase
            .from("group_members")
            .select("id, role")
            .eq("group_id", groupId)
            .eq("user_id", currentUser.id);
            
          if (membershipError) {
            console.error("소유자 멤버십 확인 오류:", membershipError);
          }
          
          if (!membershipData || membershipData.length === 0) {
            console.log("소유자가 group_members에 없어 자동 등록합니다.");
            
            // API 라우트를 통해 CEO로 자동 등록 시도 (RLS 우회)
            try {
              const response = await fetch('/api/group/members', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  groupId: groupId,
                  userId: currentUser.id,
                  role: 'ceo'
                }),
              });
              
              const result = await response.json();
              
              if (!response.ok) {
                console.error("API를 통한 소유자 멤버십 등록 실패:", result.error);
                // 실패해도 계속 진행 (소유자는 접근 가능)
              } else {
                console.log("API를 통한 소유자 멤버십 등록 성공:", result);
              }
            } catch (err) {
              console.error("API 호출 중 예외 발생:", err);
            }
          } else {
            console.log("소유자 멤버십 이미 존재:", membershipData[0]);
          }
          
          // 소유자는 항상 CEO 권한을 가짐
          setUserRole("ceo");
          setIsCEO(true);
          setIsTeacher(true);
        } else {
          // 소유자가 아닌 경우 멤버십 확인
          const { data: membershipData, error: membershipError } = await supabase
            .from("group_members")
            .select("id, role")
            .eq("group_id", groupId)
            .eq("user_id", currentUser.id);
          
          if (membershipError) {
            logSupabaseError(membershipError, "멤버십 확인 오류");
            setError("이 그룹에 대한 접근 권한이 없습니다. (멤버십 확인 실패)");
            setLoading(false);
            return;
          }
          
          // 멤버십 확인
          if (!membershipData || membershipData.length === 0) {
            console.log("멤버십 없음");
            setError("이 그룹에 대한 접근 권한이 없습니다. (멤버가 아님)");
            setLoading(false);
            return;
          }
          
          console.log("멤버십 확인:", membershipData[0]);
          setUserRole(membershipData[0].role);
          setIsCEO(membershipData[0].role === "ceo");
          setIsTeacher(membershipData[0].role === "teacher" || membershipData[0].role === "ceo");
        }

        // 이미 멤버십이 확인되었으므로 다른 멤버들 조회
        const { data: membersData, error: membersError } = await supabase
          .from("group_members")
          .select(`
            id,
            user_id,
            group_id,
            role,
            invited_at,
            accepted_at,
            user:users(id, name, email, nick_name)
          `)
          .eq("group_id", groupId)

        if (membersError) {
          logSupabaseError(membersError, "멤버 조회 오류");
          throw membersError;
        }
        
        // 데이터 형식 변환 (user 배열을 객체로 변환)
        const formattedMembers = (membersData || []).map(member => ({
          ...member,
          user: Array.isArray(member.user) && member.user.length > 0 
            ? member.user[0] 
            : { id: '', name: '', email: '', nick_name: null }
        }))
        
        setMembers(formattedMembers)
        
        setMembers(formattedMembers)

        // 4. 현재 사용자의 역할 확인 - 이미 위에서 멤버십 체크를 통해 설정했으므로 생략
        /*
        const currentUserMembership = membersData?.find(
          (member) => member.user_id === currentUser.id
        )

        if (!currentUserMembership) {
          setError("이 그룹에 대한 접근 권한이 없습니다.")
          return
        }

        setUserRole(currentUserMembership.role)
        setIsCEO(currentUserMembership.role === "ceo")
        setIsTeacher(currentUserMembership.role === "teacher" || currentUserMembership.role === "ceo")
        */

        // 5. CEO인 경우 보고서 데이터 조회
        if (userRole === "ceo") {
          const { data: reportsData, error: reportsError } = await supabase
            .from("reports")
            .select(`
              id, 
              group_id,
              user_id,
              title,
              content,
              created_at,
              reviewed,
              user:users(name, nick_name)
            `)
            .eq("group_id", groupId)
            .order("created_at", { ascending: false })

          if (reportsError) throw reportsError
          
          // 데이터 형식 변환 (user 배열을 객체로 변환)
          const formattedReports = (reportsData || []).map(report => ({
            ...report,
            user: Array.isArray(report.user) && report.user.length > 0 
              ? report.user[0] 
              : { name: '', nick_name: null }
          }))
          
          setReports(formattedReports)
        }
      } catch (err) {
        console.error("데이터 조회 중 오류 발생:", err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("알 수 없는 오류가 발생했습니다.");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchGroupData()

    // 보고서 실시간 구독
    const reportsChannel = supabase
      .channel("reports-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reports",
          filter: `group_id=eq.${groupId}`
        },
        () => {
          // 변경 시 보고서 데이터 새로고침
          fetchGroupData()
        }
      )
      .subscribe()

    // 그룹 멤버 실시간 구독
    const membersChannel = supabase
      .channel("members-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_members",
          filter: `group_id=eq.${groupId}`
        },
        () => {
          // 변경 시 멤버 데이터 새로고침
          fetchGroupData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(reportsChannel)
      supabase.removeChannel(membersChannel)
    }
  }, [groupId, router])

  // 멤버 초대
  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) {
      setMessage("초대할 이메일을 입력해주세요.")
      setMessageType("error")
      return
    }

    try {
      setLoading(true)

      // 1. 사용자 존재 여부 확인
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("email", inviteEmail)
        .single()

      if (userError) {
        setMessage("해당 이메일로 등록된 사용자가 없습니다.")
        setMessageType("error")
        return
      }

      // 2. 이미 초대된 멤버인지 확인
      const { data: existingMember } = await supabase
        .from("group_members")
        .select("id")
        .eq("group_id", groupId)
        .eq("user_id", userData.id)
        .single()

      if (existingMember) {
        setMessage("이미 그룹에 초대된 사용자입니다.")
        setMessageType("error")
        return
      }

      // 3. 멤버 초대
      const { error: inviteError } = await supabase
        .from("group_members")
        .insert([
          {
            group_id: groupId,
            user_id: userData.id,
            role: selectedRole,
            invited_at: new Date().toISOString()
          }
        ])

      if (inviteError) {
        logSupabaseError(inviteError, "멤버 초대 오류");
        throw inviteError;
      }

      setMessage(`${inviteEmail} 님을 ${getRoleName(selectedRole)} 역할로 초대했습니다.`)
      setMessageType("success")
      setInviteEmail("")
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err))
      setMessageType("error")
    } finally {
      setLoading(false)
    }
  }

  // 멤버 삭제
  const handleRemoveMember = async (memberId: string) => {
    if (!isCEO) {
      setMessage("CEO만 멤버를 삭제할 수 있습니다.")
      setMessageType("error")
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("id", memberId)

      if (error) throw error

      setMessage("멤버가 삭제되었습니다.")
      setMessageType("success")
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err))
      setMessageType("error")
    } finally {
      setLoading(false)
    }
  }

  // 보고서 확인 처리
  const handleReviewReport = async (reportId: number) => {
    if (!isCEO) {
      setMessage("CEO만 보고서를 확인 처리할 수 있습니다.")
      setMessageType("error")
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase
        .from("reports")
        .update({ reviewed: true })
        .eq("id", reportId)

      if (error) throw error

      setMessage("보고서가 확인 처리되었습니다.")
      setMessageType("success")
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err))
      setMessageType("error")
    } finally {
      setLoading(false)
    }
  }

  // 역할명 변환
  const getRoleName = (role: string) => {
    switch (role) {
      case 'ceo': return 'CEO';
      case 'teacher': return '선생님';
      case 'part-timeLecturer': return '시간강사';
      default: return role;
    }
  }

  // 뒤로가기
  const handleGoBack = () => {
    router.push("/")
  }

  // 에러 로깅 함수
  const logSupabaseError = (error: PostgrestError, context: string) => {
    console.error(`Supabase 에러 (${context}):`, error);
    console.log("오류 코드:", error.code);
    console.log("오류 메시지:", error.message);
    console.log("오류 세부정보:", error.details);
    console.log("오류 힌트:", error.hint);
  }

  // 로딩 상태
  if (loading && !group) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center mb-6">
            <Skeleton className="h-8 w-48" />
            <div className="ml-auto">
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
          
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Skeleton className="h-10 w-full" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Skeleton className="h-32 w-full rounded-lg" />
                  <Skeleton className="h-32 w-full rounded-lg" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4 mr-2" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <div className="flex justify-center mt-6">
                <Button onClick={handleGoBack}>홈으로 돌아가기</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center text-gray-800">
            <Users className="mr-2 h-6 w-6" />
            {group?.name} 
            <Badge className="ml-3" variant={isCEO ? "default" : "outline"}>
              {getRoleName(userRole || "")}
            </Badge>
          </h1>
          <Button variant="outline" onClick={handleGoBack}>
            뒤로가기
          </Button>
        </div>

        {message && (
          <Alert 
            variant={messageType === "error" ? "destructive" : "default"}
            className={`mb-6 ${messageType === "success" ? "bg-green-50 text-green-800 border-green-200" : ""}`}
          >
            {messageType === "success" ? (
              <CheckCircle className="h-4 w-4 mr-2" />
            ) : (
              <AlertCircle className="h-4 w-4 mr-2" />
            )}
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="members" className="w-full">
          <TabsList className="mb-6 bg-white border border-gray-200">
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>멤버 관리</span>
            </TabsTrigger>
            
            {isTeacher && (
              <TabsTrigger value="reports" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>보고서</span>
              </TabsTrigger>
            )}
            
            {isTeacher && (
              <TabsTrigger value="schedule" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>일정</span>
              </TabsTrigger>
            )}
            
            {isCEO && (
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span>통계</span>
              </TabsTrigger>
            )}
            
            {isCEO && (
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span>설정</span>
              </TabsTrigger>
            )}
          </TabsList>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {/* 멤버 관리 탭 */}
            <TabsContent value="members" className="mt-0">
              <div className="space-y-6">
                {isCEO && (
                  <>
                    <div className="space-y-4">
                      <h2 className="text-lg font-medium">멤버 초대</h2>
                      <Card className="border border-gray-200 bg-gray-50">
                        <CardContent className="pt-6">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                              <Label htmlFor="invite-email" className="text-sm font-medium mb-2 block">
                                초대할 이메일
                              </Label>
                              <div className="flex">
                                <div className="mr-2 flex-1">
                                  <Input
                                    id="invite-email"
                                    placeholder="이메일 주소"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                  />
                                </div>
                              </div>
                            </div>
                            <div>
                              <Label htmlFor="role-select" className="text-sm font-medium mb-2 block">
                                역할
                              </Label>
                              <Select
                                value={selectedRole}
                                onValueChange={setSelectedRole}
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
                          </div>
                          <Button 
                            onClick={handleInviteMember} 
                            className="w-full mt-4 flex items-center justify-center gap-2"
                          >
                            <UserPlus className="h-4 w-4" />
                            멤버 초대
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                    <Separator />
                  </>
                )}

                <div className="space-y-4">
                  <h2 className="text-lg font-medium">그룹 멤버 ({members.length}명)</h2>
                  
                  <div className="space-y-4">
                    {members.map((member) => (
                      <Card key={member.id} className="border border-gray-200">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <Avatar className="h-10 w-10 mr-4">
                                <AvatarFallback>
                                  {member.user.name ? member.user.name.charAt(0).toUpperCase() : 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{member.user.name}</p>
                                <div className="flex items-center text-sm text-gray-500">
                                  <Mail className="h-3 w-3 mr-1" />
                                  <span>{member.user.email}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <Badge variant={member.role === "ceo" ? "default" : "outline"}>
                                {getRoleName(member.role)}
                              </Badge>
                              
                              {!member.accepted_at && (
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">
                                  <Clock className="h-3 w-3 mr-1" /> 대기 중
                                </Badge>
                              )}
                              
                              {isCEO && member.role !== "ceo" && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleRemoveMember(member.id)}
                                >
                                  <UserX className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* 보고서 탭 */}
            {isTeacher && (
              <TabsContent value="reports" className="mt-0">
                <div className="space-y-6">
                  {isCEO && (
                    <>
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-medium">모든 보고서</h2>
                        <Badge variant={reports.some(r => !r.reviewed) ? "destructive" : "outline"}>
                          확인 필요: {reports.filter(r => !r.reviewed).length}건
                        </Badge>
                      </div>
                      
                      {reports.length === 0 ? (
                        <div className="bg-gray-50 p-6 rounded-lg text-center">
                          <p className="text-gray-500">아직 제출된 보고서가 없습니다.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {reports.map((report) => (
                            <Card key={report.id} className={`border ${!report.reviewed ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
                              <CardContent className="pt-6">
                                <div className="flex items-center justify-between mb-4">
                                  <div>
                                    <h3 className="text-md font-medium">{report.title}</h3>
                                    <div className="flex items-center text-sm text-gray-500 mt-1">
                                      <span>작성자: {report.user.name}</span>
                                      <span className="mx-2">•</span>
                                      <span>{new Date(report.created_at).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    {report.reviewed ? (
                                      <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200">
                                        <CheckCircle className="h-3 w-3 mr-1" /> 확인 완료
                                      </Badge>
                                    ) : (
                                      <Button 
                                        size="sm" 
                                        onClick={() => handleReviewReport(report.id)}
                                        className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                                      >
                                        <CheckCircle className="h-4 w-4 mr-1" /> 확인 처리
                                      </Button>
                                    )}
                                  </div>
                                </div>
                                <p className="text-gray-700 whitespace-pre-line">{report.content}</p>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                  
                  {!isCEO && (
                    <div className="space-y-4">
                      <h2 className="text-lg font-medium">보고서 작성</h2>
                      <p className="text-gray-500">이 기능은 아직 개발 중입니다.</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            )}

            {/* 일정 탭 */}
            {isTeacher && (
              <TabsContent value="schedule" className="mt-0">
                <div className="space-y-4">
                  <h2 className="text-lg font-medium">그룹 일정</h2>
                  <Card className="border border-gray-200 bg-gray-50">
                    <CardContent className="p-8 text-center">
                      <div className="flex flex-col items-center justify-center py-6">
                        <Calendar className="h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium mb-2">일정 관리</h3>
                        <p className="text-gray-500 max-w-md mb-4">
                          이 기능은 아직 개발 중입니다. 추후 업데이트를 통해 그룹의 일정을 관리할 수 있습니다.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            )}

            {/* 통계 탭 */}
            {isCEO && (
              <TabsContent value="analytics" className="mt-0">
                <div className="space-y-4">
                  <h2 className="text-lg font-medium">그룹 통계</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">총 멤버</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">{members.length}</div>
                        <p className="text-sm text-gray-500 mt-1">
                          승인됨: {members.filter(m => m.accepted_at).length}명
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">총 보고서</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">{reports.length}</div>
                        <p className="text-sm text-gray-500 mt-1">
                          미확인: {reports.filter(r => !r.reviewed).length}건
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">활동 기간</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">
                          {group 
                            ? Math.ceil((new Date().getTime() - new Date(group.created_at).getTime()) / (1000 * 60 * 60 * 24)) 
                            : 0}일
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          생성일: {group ? new Date(group.created_at).toLocaleDateString() : '-'}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle>상세 통계</CardTitle>
                      <CardDescription>
                        그룹의 상세 활동 통계는 개발 중입니다.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="h-64 flex items-center justify-center">
                      <BarChart3 className="h-16 w-16 text-gray-300" />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            )}

            {/* 설정 탭 */}
            {isCEO && (
              <TabsContent value="settings" className="mt-0">
                <div className="space-y-6">
                  <h2 className="text-lg font-medium">그룹 설정</h2>
                  <Card className="border border-gray-200">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="group-name" className="text-sm font-medium">그룹 이름</Label>
                          <Input id="group-name" defaultValue={group?.name} />
                        </div>
                        
                        <Button className="w-full md:w-auto mt-2">
                          그룹 정보 업데이트
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Separator />
                  
                  <div className="pt-4">
                    <h3 className="text-md font-medium mb-4 text-red-600">위험 영역</h3>
                    <Button variant="destructive" className="w-full md:w-auto">
                      그룹 삭제
                    </Button>
                  </div>
                </div>
              </TabsContent>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  )
}