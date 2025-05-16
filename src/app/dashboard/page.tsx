"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCurrentUser, getUserGroups, getUserProfile } from "@/lib/supabase";
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
import type { Group, User } from "@/types";
import { BarChart3, FileText, Plus, Users } from "lucide-react";

export default function DashboardPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const supabaseUser = await getCurrentUser();
        if (supabaseUser) {
          // Supabase User를 내부 User 타입으로 변환
          const userProfile = await getUserProfile(supabaseUser.id);

          // 사용자 프로필 정보와 Supabase User 정보를 결합
          const userWithProfile: User = {
            id: supabaseUser.id,
            email: supabaseUser.email || "",
            name: userProfile?.name || null,
            nick_name: userProfile?.nick_name || null,
            phone: userProfile?.phone || null,
            created_at: userProfile?.created_at || new Date().toISOString(),
          };

          setCurrentUser(userWithProfile);

          const userGroups = await getUserGroups(supabaseUser.id);
          const formattedGroups = userGroups.map((membership: any) => membership.groups) as Group[];
          setGroups(formattedGroups);
        }
      } catch (error) {
        console.error("그룹 가져오기 오류:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-3xl font-bold tracking-tight">대시보드</h1>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/groups/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              그룹 생성
            </Button>
          </Link>
        </div>
      </div>
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="groups">그룹</TabsTrigger>
          <TabsTrigger value="reports">최근 보고서</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">전체 그룹</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{loading ? "..." : groups.length}</div>
                <p className="text-xs text-muted-foreground">회원으로 속한 그룹</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">최근 보고서</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">최근 7일간의 보고서</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">통계</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">상세 통계 보기</p>
              </CardContent>
              <CardFooter>
                <Link href="/dashboard/statistics" className="w-full">
                  <Button variant="outline" className="w-full">
                    통계 보기
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="groups" className="space-y-4">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : groups.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {groups.map((group) => (
                <Card key={group.id}>
                  <CardHeader>
                    <CardTitle>{group.name}</CardTitle>
                    <CardDescription>
                      생성일: {new Date(group.created_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {currentUser && currentUser.id === group.owner_id
                        ? "소유자입니다"
                        : "회원입니다"}
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Link href={`/dashboard/groups/${group.id}`} className="w-full">
                      <Button variant="outline" className="w-full">
                        그룹 보기
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
              <Card className="flex h-full flex-col items-center justify-center p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Plus className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-medium">새 그룹 만들기</h3>
                <p className="mb-4 mt-2 text-center text-sm text-muted-foreground">
                  보고서와 업무를 관리할 새 그룹을 만들어보세요
                </p>
                <Link href="/dashboard/groups/create" className="w-full">
                  <Button className="w-full">그룹 생성</Button>
                </Link>
              </Card>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>그룹을 찾을 수 없습니다</CardTitle>
                <CardDescription>아직 어떤 그룹에도 속해있지 않습니다.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  시작하려면 새 그룹을 만들거나 초대를 기다려주세요.
                </p>
              </CardContent>
              <CardFooter>
                <Link href="/dashboard/groups/create" className="w-full">
                  <Button className="w-full">그룹 생성</Button>
                </Link>
              </CardFooter>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>최근 보고서</CardTitle>
              <CardDescription>모든 그룹의 최근 보고서</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                최근 보고서가 없습니다. 시작하려면 새 보고서를 작성하세요.
              </p>
            </CardContent>
            <CardFooter>
              <Link href="/dashboard/reports/create" className="w-full">
                <Button className="w-full">보고서 작성</Button>
              </Link>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
