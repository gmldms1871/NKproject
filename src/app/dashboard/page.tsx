"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getReportStatistics } from "@/lib/statistics";
import { getUserGroups } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { Group, ReportStatistics } from "../../../types";
import { BarChart, FileText, PieChart, Plus, Users } from "lucide-react";

export default function DashboardPage() {
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [statistics, setStatistics] = useState<ReportStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 사용자의 그룹 목록 가져오기
        const userGroups = await getUserGroups();
        if (userGroups && userGroups.length > 0) {
          const formattedGroups = userGroups.map((membership: any) => membership.groups) as Group[];
          setGroups(formattedGroups);
        }

        // 통계 데이터 가져오기
        const statsResult = await getReportStatistics();
        if (statsResult.success && statsResult.statistics) {
          setStatistics(statsResult.statistics);
        } else if (!statsResult.success) {
          const errorMessage =
            typeof statsResult.error === "string"
              ? statsResult.error
              : "통계 데이터를 불러오는데 실패했습니다.";
          console.error("통계 데이터 가져오기 실패:", errorMessage);
          toast({
            title: "통계 데이터 오류",
            description: errorMessage,
            variant: "destructive",
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("데이터 가져오기 오류:", errorMessage);
        toast({
          title: "오류",
          description: "데이터를 불러오는데 실패했습니다.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">대시보드</h1>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-medium">총 보고서</CardTitle>
                  <CardDescription>전체 작성된 보고서 수</CardDescription>
                </div>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics?.total || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {statistics?.monthlyTrend && statistics.monthlyTrend.length > 1
                    ? `지난 달 대비 ${
                        statistics.monthlyTrend[statistics.monthlyTrend.length - 1].count >
                        statistics.monthlyTrend[statistics.monthlyTrend.length - 2].count
                          ? "증가"
                          : "감소"
                      }`
                    : "통계 데이터 없음"}
                </p>
              </CardContent>
              <CardFooter>
                <Link
                  href="/dashboard/reports"
                  className="text-xs text-muted-foreground hover:underline"
                >
                  모든 보고서 보기
                </Link>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-medium">내 그룹</CardTitle>
                  <CardDescription>소속된 그룹 수</CardDescription>
                </div>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{groups.length}</div>
                <p className="text-xs text-muted-foreground">
                  {groups.length > 0 ? "활성 그룹 보유 중" : "아직 그룹이 없습니다"}
                </p>
              </CardContent>
              <CardFooter>
                <Link
                  href="/dashboard/groups"
                  className="text-xs text-muted-foreground hover:underline"
                >
                  모든 그룹 보기
                </Link>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-medium">통계</CardTitle>
                  <CardDescription>보고서 작성 통계</CardDescription>
                </div>
                <BarChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statistics?.byUser && statistics.byUser.length > 0
                    ? `${statistics.byUser[0].count}개`
                    : "0개"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {statistics?.byUser && statistics.byUser.length > 0
                    ? `가장 많은 보고서: ${statistics.byUser[0].userName || "사용자"}`
                    : "통계 데이터 없음"}
                </p>
              </CardContent>
              <CardFooter>
                <Link
                  href="/dashboard/statistics"
                  className="text-xs text-muted-foreground hover:underline"
                >
                  자세한 통계 보기
                </Link>
              </CardFooter>
            </Card>
          </div>

          <h2 className="text-xl font-semibold">최근 활동</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>최근 그룹</CardTitle>
                <CardDescription>최근에 활동한 그룹</CardDescription>
              </CardHeader>
              <CardContent>
                {groups.length > 0 ? (
                  <div className="space-y-4">
                    {groups.slice(0, 3).map((group) => (
                      <div key={group.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                            <Users className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{group.name}</p>
                            <p className="text-xs text-muted-foreground">
                              생성일: {new Date(group.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/groups/${group.id}`}>보기</Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4">
                    <Users className="mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">아직 그룹이 없습니다</p>
                    <Button className="mt-4" size="sm" asChild>
                      <Link href="/dashboard/groups/create">
                        <Plus className="mr-2 h-4 w-4" />
                        그룹 생성
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>통계 요약</CardTitle>
                <CardDescription>보고서 작성 통계 요약</CardDescription>
              </CardHeader>
              <CardContent>
                {statistics && statistics.total > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                          <BarChart className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">월별 추이</p>
                          <p className="text-xs text-muted-foreground">
                            {statistics.monthlyTrend && statistics.monthlyTrend.length > 0
                              ? `최근 ${statistics.monthlyTrend.length}개월 데이터`
                              : "데이터 없음"}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href="/dashboard/statistics">자세히</Link>
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                          <PieChart className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">사용자별 통계</p>
                          <p className="text-xs text-muted-foreground">
                            {statistics.byUser && statistics.byUser.length > 0
                              ? `${statistics.byUser.length}명의 사용자 데이터`
                              : "데이터 없음"}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href="/dashboard/statistics">자세히</Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4">
                    <BarChart className="mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">아직 통계 데이터가 없습니다</p>
                    <Button className="mt-4" size="sm" asChild>
                      <Link href="/dashboard/reports/create">
                        <Plus className="mr-2 h-4 w-4" />
                        보고서 작성
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
