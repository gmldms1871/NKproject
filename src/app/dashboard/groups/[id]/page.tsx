"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getGroupDetails, getGroupMembers, getGroupReports } from "@/lib/groups";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import type { Group, GroupMember, Report } from "@/types";
import {
  ArrowLeft,
  Calendar,
  FileText,
  PenSquare,
  Plus,
  Settings,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";

export default function GroupDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [isOwner, setIsOwner] = useState(false);
  const [isManager, setIsManager] = useState(false);

  useEffect(() => {
    const fetchGroupData = async () => {
      try {
        // 그룹 상세 정보 가져오기
        const groupResult = await getGroupDetails(params.id);
        if (!groupResult.success) {
          throw new Error(groupResult.error || "그룹 상세 정보를 가져오는데 실패했습니다");
        }
        setGroup(groupResult.group || null);

        // 현재 사용자가 그룹 소유자인지 확인
        if (groupResult.group && groupResult.isOwner) {
          setIsOwner(true);
        }

        // 현재 사용자가 관리자인지 확인
        if (groupResult.group && (groupResult.isOwner || groupResult.isManager)) {
          setIsManager(true);
        }

        // 그룹 멤버 가져오기
        const membersResult = await getGroupMembers(params.id);
        if (membersResult.success) {
          setMembers(membersResult.members || []);
        }

        // 그룹 보고서 가져오기
        const reportsResult = await getGroupReports(params.id);
        if (reportsResult.success) {
          setReports(reportsResult.reports || []);
        }
      } catch (error) {
        console.error("그룹 데이터 가져오기 오류:", error);
        toast({
          title: "오류",
          description: "그룹 정보를 불러오는데 실패했습니다.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchGroupData();
    }
  }, [params.id, toast]);

  const handleDeleteMember = async (memberId: string) => {
    // 실제 구현에서는 멤버 삭제 API 호출
    toast({
      title: "기능 준비 중",
      description: "멤버 삭제 기능은 아직 구현 중입니다.",
    });
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-2xl font-bold">그룹을 찾을 수 없습니다</h1>
        <p className="mt-2 text-muted-foreground">
          찾으시는 그룹이 존재하지 않거나 접근 권한이 없습니다.
        </p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/groups">그룹 목록으로 돌아가기</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={() => router.push("/dashboard/groups")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">{group.name}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {isManager && (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/groups/${group.id}/invite`}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  멤버 초대
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/groups/${group.id}/settings`}>
                  <Settings className="mr-2 h-4 w-4" />
                  그룹 설정
                </Link>
              </Button>
            </>
          )}
          <Button size="sm" asChild>
            <Link href={`/dashboard/reports/create?groupId=${group.id}`}>
              <PenSquare className="mr-2 h-4 w-4" />
              보고서 작성
            </Link>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="members">멤버 ({members.length})</TabsTrigger>
          <TabsTrigger value="reports">보고서 ({reports.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>그룹 정보</CardTitle>
              <CardDescription>
                생성일: {new Date(group.created_at).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">멤버</h3>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="mr-2 h-4 w-4" />
                    <span>{members.length}명의 멤버</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">보고서</h3>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <FileText className="mr-2 h-4 w-4" />
                    <span>{reports.length}개의 보고서</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>최근 활동</CardTitle>
              <CardDescription>그룹의 최근 활동 내역</CardDescription>
            </CardHeader>
            <CardContent>
              {reports.length > 0 ? (
                <div className="space-y-4">
                  {reports.slice(0, 3).map((report) => (
                    <div key={report.id} className="flex items-start space-x-4">
                      <div className="rounded-full bg-primary/10 p-2">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {report.user_name || "사용자"}님이 새 보고서를 작성했습니다.
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(report.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">아직 활동 내역이 없습니다.</p>
              )}
            </CardContent>
            {reports.length > 3 && (
              <CardFooter>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setActiveTab("reports")}
                >
                  모든 활동 보기
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">그룹 멤버</h2>
            {isManager && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/groups/${group.id}/invite`}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  멤버 초대
                </Link>
              </Button>
            )}
          </div>

          {members.length > 0 ? (
            <div className="space-y-4">
              {members.map((member) => (
                <Card key={member.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <span className="text-lg font-semibold text-primary">
                          {member.user_name ? member.user_name.charAt(0).toUpperCase() : "U"}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{member.user_name || "사용자"}</p>
                        <p className="text-sm text-muted-foreground">{member.user_email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">
                        {member.role === "owner"
                          ? "소유자"
                          : member.role === "manager"
                          ? "관리자"
                          : member.role === "teacher"
                          ? "교사"
                          : member.role === "part-time-lecturer"
                          ? "시간제 강사"
                          : member.role === "staff"
                          ? "직원"
                          : "멤버"}
                      </span>
                      {isOwner && member.role !== "owner" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteMember(member.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-6">
                <Users className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">멤버가 없습니다</h3>
                <p className="mt-2 text-center text-sm text-muted-foreground">
                  아직 그룹에 멤버가 없습니다. 새 멤버를 초대해보세요.
                </p>
                {isManager && (
                  <Button className="mt-4" asChild>
                    <Link href={`/dashboard/groups/${group.id}/invite`}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      멤버 초대
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">그룹 보고서</h2>
            <Button size="sm" asChild>
              <Link href={`/dashboard/reports/create?groupId=${group.id}`}>
                <Plus className="mr-2 h-4 w-4" />
                보고서 작성
              </Link>
            </Button>
          </div>

          {reports.length > 0 ? (
            <div className="space-y-4">
              {reports.map((report) => (
                <Link key={report.id} href={`/dashboard/reports/${report.id}`}>
                  <Card className="cursor-pointer transition-shadow hover:shadow-md">
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {report.title || `보고서 #${report.id.substring(0, 8)}`}
                          </p>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Calendar className="mr-1 h-3 w-3" />
                            <span>{new Date(report.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm text-muted-foreground">
                          작성자: {report.user_name || "사용자"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-6">
                <FileText className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">보고서가 없습니다</h3>
                <p className="mt-2 text-center text-sm text-muted-foreground">
                  아직 작성된 보고서가 없습니다. 새 보고서를 작성해보세요.
                </p>
                <Button className="mt-4" asChild>
                  <Link href={`/dashboard/reports/create?groupId=${group.id}`}>
                    <Plus className="mr-2 h-4 w-4" />
                    보고서 작성
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
