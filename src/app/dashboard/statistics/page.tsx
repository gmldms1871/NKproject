"use client";

import { useEffect, useState } from "react";
import { getReportStatistics, getMonthlyTrends } from "@/lib/statistics";
import { getUserGroups, getCurrentUser } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import type { Group, ReportStatistics, MonthlyTrend } from "@/types";
import { BarChart, BarChart3, PieChart } from "lucide-react";

export default function StatisticsPage() {
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [period, setPeriod] = useState<"day" | "week" | "month" | "year">("week");
  const [statistics, setStatistics] = useState<ReportStatistics | null>(null);
  const [trends, setTrends] = useState<MonthlyTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          const userGroups = await getUserGroups(currentUser.id);
          const formattedGroups = userGroups.map((membership: any) => membership.groups) as Group[];
          setGroups(formattedGroups);

          if (formattedGroups.length > 0) {
            setSelectedGroupId(formattedGroups[0].id);
            fetchStatistics(formattedGroups[0].id, period);
            fetchTrends(formattedGroups[0].id);
          } else {
            setLoading(false);
          }
        }
      } catch (error) {
        console.error("그룹 가져오기 오류:", error);
        toast({
          title: "오류",
          description: "그룹을 불러오는데 실패했습니다. 다시 시도해주세요.",
          variant: "destructive",
        });
        setLoading(false);
      }
    };

    fetchGroups();
  }, [toast, period]);

  const fetchStatistics = async (
    groupId: string,
    timePeriod: "day" | "week" | "month" | "year"
  ) => {
    setLoading(true);
    try {
      const result = await getReportStatistics(groupId, timePeriod);

      if (result.success) {
        setStatistics(result.statistics || null);
      } else {
        toast({
          title: "오류",
          description: "통계를 불러오는데 실패했습니다. 다시 시도해주세요.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("통계 가져오기 오류:", error);
      toast({
        title: "오류",
        description: "예기치 않은 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTrends = async (groupId: string) => {
    try {
      const result = await getMonthlyTrends(groupId, 6);

      if (result.success) {
        setTrends(result.trends || []);
      } else {
        console.error("추세 불러오기 실패:", result.error);
      }
    } catch (error) {
      console.error("추세 가져오기 오류:", error);
    }
  };

  const handleGroupChange = (groupId: string) => {
    setSelectedGroupId(groupId);
    fetchStatistics(groupId, period);
    fetchTrends(groupId);
  };

  const handlePeriodChange = (newPeriod: "day" | "week" | "month" | "year") => {
    setPeriod(newPeriod);
    if (selectedGroupId) {
      fetchStatistics(selectedGroupId, newPeriod);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-3xl font-bold tracking-tight">통계</h1>
        <div className="flex items-center gap-2">
          <Select value={selectedGroupId} onValueChange={handleGroupChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="그룹 선택" />
            </SelectTrigger>
            <SelectContent>
              {groups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={period === "day" ? "default" : "outline"}
          onClick={() => handlePeriodChange("day")}
        >
          일간
        </Button>
        <Button
          variant={period === "week" ? "default" : "outline"}
          onClick={() => handlePeriodChange("week")}
        >
          주간
        </Button>
        <Button
          variant={period === "month" ? "default" : "outline"}
          onClick={() => handlePeriodChange("month")}
        >
          월간
        </Button>
        <Button
          variant={period === "year" ? "default" : "outline"}
          onClick={() => handlePeriodChange("year")}
        >
          연간
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="status">상태</TabsTrigger>
          <TabsTrigger value="trends">추세</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : statistics ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">전체 보고서</CardTitle>
                  <BarChart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statistics.totalReports}</div>
                  <p className="text-xs text-muted-foreground">선택한 기간의 보고서</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">완료율</CardTitle>
                  <PieChart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statistics.totalReports > 0
                      ? Math.round(
                          ((statistics.statusCounts["완료"] || 0) / statistics.totalReports) * 100
                        )
                      : 0}
                    %
                  </div>
                  <p className="text-xs text-muted-foreground">완료로 표시된 업무</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">활동 교사</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Object.keys(statistics.teacherStats).length}
                  </div>
                  <p className="text-xs text-muted-foreground">보고서를 제출한 교사</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>통계 정보 없음</CardTitle>
                <CardDescription>
                  {selectedGroupId
                    ? "선택한 그룹에 대한 통계가 없습니다."
                    : "통계를 보려면 그룹을 선택하세요."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">통계를 생성하려면 보고서를 작성하세요.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : statistics ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>상태 분포</CardTitle>
                  <CardDescription>업무 상태 분포</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(statistics.statusCounts).map(([status, count]) => (
                      <div key={status} className="flex items-center">
                        <div className="w-40 text-sm font-medium">{status}</div>
                        <div className="flex-1">
                          <div className="h-2 w-full rounded-full bg-muted">
                            <div
                              className={`h-2 rounded-full ${
                                status === "완료"
                                  ? "bg-green-500"
                                  : status === "진행중"
                                  ? "bg-blue-500"
                                  : status === "미완료"
                                  ? "bg-red-500"
                                  : status === "연장"
                                  ? "bg-yellow-500"
                                  : "bg-gray-500"
                              }`}
                              style={{
                                width: `${
                                  statistics.totalReports > 0
                                    ? (count / statistics.totalReports) * 100
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                        <div className="ml-4 w-12 text-right text-sm">{count}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>교사 성과</CardTitle>
                  <CardDescription>교사별 제출 보고서</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(statistics.teacherStats).map(([teacher, stats]) => (
                      <div key={teacher} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{teacher}</div>
                          <div className="text-sm text-muted-foreground">{stats.total} 보고서</div>
                        </div>
                        <div className="flex h-2 space-x-1 rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-green-500"
                            style={{
                              width: `${
                                stats.total > 0 ? (stats.completed / stats.total) * 100 : 0
                              }%`,
                            }}
                          />
                          <div
                            className="h-2 rounded-full bg-blue-500"
                            style={{
                              width: `${
                                stats.total > 0 ? (stats.inProgress / stats.total) * 100 : 0
                              }%`,
                            }}
                          />
                          <div
                            className="h-2 rounded-full bg-red-500"
                            style={{
                              width: `${
                                stats.total > 0 ? (stats.incomplete / stats.total) * 100 : 0
                              }%`,
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <div>완료: {stats.completed}</div>
                          <div>진행중: {stats.inProgress}</div>
                          <div>미완료: {stats.incomplete}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>상태 데이터 없음</CardTitle>
                <CardDescription>
                  선택한 그룹 및 기간에 대한 상태 데이터가 없습니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  이 데이터를 보려면 상태 업데이트가 있는 보고서를 작성하세요.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : trends.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>월별 추세</CardTitle>
                <CardDescription>지난 6개월 동안의 보고서 제출 추세</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <div className="flex h-full flex-col">
                    <div className="flex flex-1 items-end space-x-2">
                      {trends.map((trend) => (
                        <div key={trend.month} className="flex h-full flex-1 flex-col justify-end">
                          <div className="space-y-1">
                            <div
                              className="w-full rounded-t bg-green-500"
                              style={{
                                height: `${
                                  (trend.completed / Math.max(...trends.map((t) => t.reports))) *
                                  100
                                }%`,
                              }}
                            />
                            <div
                              className="w-full rounded-t bg-blue-500"
                              style={{
                                height: `${
                                  (trend.inProgress / Math.max(...trends.map((t) => t.reports))) *
                                  100
                                }%`,
                              }}
                            />
                            <div
                              className="w-full rounded-t bg-red-500"
                              style={{
                                height: `${
                                  (trend.incomplete / Math.max(...trends.map((t) => t.reports))) *
                                  100
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex space-x-2">
                      {trends.map((trend) => (
                        <div key={trend.month} className="flex-1 text-center text-xs">
                          {trend.month}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex justify-center space-x-4">
                  <div className="flex items-center">
                    <div className="mr-1 h-3 w-3 rounded-full bg-green-500" />
                    <span className="text-xs">완료</span>
                  </div>
                  <div className="flex items-center">
                    <div className="mr-1 h-3 w-3 rounded-full bg-blue-500" />
                    <span className="text-xs">진행중</span>
                  </div>
                  <div className="flex items-center">
                    <div className="mr-1 h-3 w-3 rounded-full bg-red-500" />
                    <span className="text-xs">미완료</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>추세 데이터 없음</CardTitle>
                <CardDescription>선택한 그룹에 대한 추세 데이터가 없습니다.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  추세 데이터를 보려면 시간이 지남에 따라 보고서를 작성하세요.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
