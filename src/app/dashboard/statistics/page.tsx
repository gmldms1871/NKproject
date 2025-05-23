"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getReportStatistics } from "@/lib/statistics";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import type { ReportStatistics } from "@/types";
import { ArrowLeft, BarChart, FileText, Users } from "lucide-react";

export default function StatisticsPage() {
  const { toast } = useToast();
  const [statistics, setStatistics] = useState<ReportStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [timeRange, setTimeRange] = useState("all");

  useEffect(() => {
    const fetchStatistics = async () => {
      setLoading(true);
      try {
        const result = await getReportStatistics({ timeRange });
        if (result.success && result.statistics) {
          setStatistics(result.statistics);
        } else {
          const errorMessage =
            typeof result.error === "string"
              ? result.error
              : "통계 데이터를 불러오는데 실패했습니다.";
          console.error("통계 데이터 가져오기 실패:", errorMessage);
          toast({
            title: "오류",
            description: errorMessage,
            variant: "destructive",
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("통계 데이터 가져오기 오류:", errorMessage);
        toast({
          title: "오류",
          description: "예기치 않은 오류가 발생했습니다.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [timeRange, toast]);

  const renderMonthlyChart = () => {
    if (!statistics || !statistics.monthlyTrend || statistics.monthlyTrend.length === 0) {
      return (
        <div className="flex h-40 items-center justify-center">
          <p className="text-muted-foreground">데이터가 없습니다</p>
        </div>
      );
    }

    const maxCount = Math.max(...statistics.monthlyTrend.map((item) => item.count));
    const chartHeight = 200;

    return (
      <div className="mt-4">
        <div className="flex h-[200px] items-end space-x-2">
          {statistics.monthlyTrend.map((item, index) => {
            const height = maxCount > 0 ? (item.count / maxCount) * chartHeight : 0;
            return (
              <div key={index} className="flex flex-1 flex-col items-center">
                <div
                  className="w-full rounded-t bg-primary"
                  style={{ height: `${height}px`, minHeight: item.count > 0 ? "10px" : "0" }}
                ></div>
                <div className="mt-2 text-xs">{item.month}</div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 text-center text-sm text-muted-foreground">월별 보고서 작성 수</div>
      </div>
    );
  };

  const renderUserChart = () => {
    if (!statistics || !statistics.byUser || statistics.byUser.length === 0) {
      return (
        <div className="flex h-40 items-center justify-center">
          <p className="text-muted-foreground">데이터가 없습니다</p>
        </div>
      );
    }

    const totalReports = statistics.byUser.reduce((sum, user) => sum + user.count, 0);

    return (
      <div className="mt-4 space-y-4">
        {statistics.byUser.map((user, index) => {
          const percentage = totalReports > 0 ? (user.count / totalReports) * 100 : 0;
          return (
            <div key={index} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{user.userName || "사용자"}</span>
                <span>
                  {user.count}개 ({percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary" style={{ width: `${percentage}%` }}></div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">통계</h1>
      </div>

      <div className="flex justify-end">
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="기간 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>기간</SelectLabel>
              <SelectItem value="all">전체 기간</SelectItem>
              <SelectItem value="month">최근 1개월</SelectItem>
              <SelectItem value="quarter">최근 3개월</SelectItem>
              <SelectItem value="year">최근 1년</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-5 w-32 animate-pulse rounded-md bg-muted"></div>
                <div className="h-4 w-24 animate-pulse rounded-md bg-muted"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 w-full animate-pulse rounded-md bg-muted"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-medium">작성자 수</CardTitle>
                  <CardDescription>보고서를 작성한 사용자 수</CardDescription>
                </div>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics?.byUser?.length || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-medium">월평균</CardTitle>
                  <CardDescription>월 평균 보고서 작성 수</CardDescription>
                </div>
                <BarChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statistics?.monthlyTrend && statistics.monthlyTrend.length > 0
                    ? (
                        statistics.monthlyTrend.reduce((sum, month) => sum + month.count, 0) /
                        statistics.monthlyTrend.length
                      ).toFixed(1)
                    : "0"}
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">월별 추이</TabsTrigger>
              <TabsTrigger value="users">사용자별 통계</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>월별 보고서 작성 추이</CardTitle>
                  <CardDescription>
                    {timeRange === "all"
                      ? "전체 기간"
                      : timeRange === "month"
                      ? "최근 1개월"
                      : timeRange === "quarter"
                      ? "최근 3개월"
                      : "최근 1년"}
                    의 월별 보고서 작성 추이
                  </CardDescription>
                </CardHeader>
                <CardContent>{renderMonthlyChart()}</CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users" className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>사용자별 보고서 작성 통계</CardTitle>
                  <CardDescription>
                    {timeRange === "all"
                      ? "전체 기간"
                      : timeRange === "month"
                      ? "최근 1개월"
                      : timeRange === "quarter"
                      ? "최근 3개월"
                      : "최근 1년"}
                    의 사용자별 보고서 작성 통계
                  </CardDescription>
                </CardHeader>
                <CardContent>{renderUserChart()}</CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
