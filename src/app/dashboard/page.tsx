"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getReportsByUser } from "../../lib/reports";
import { getReportStatistics } from "../../lib/statistics";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { FormattedReport, ReportStatistics } from "../../../types";
import { BarChart, FileText, PieChart, Plus } from "lucide-react";

export default function DashboardPage() {
  const { toast } = useToast();
  const [reports, setReports] = useState<FormattedReport[]>([]);
  const [statistics, setStatistics] = useState<ReportStatistics>({
    total: 0,
    byUser: [],
    monthlyTrend: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 사용자의 보고서 가져오기
        const reportsResult = await getReportsByUser();
        if (reportsResult.success && reportsResult.reports) {
          setReports(reportsResult.reports);
        }

        // 통계 데이터 가져오기
        const statsResult = await getReportStatistics({ timeRange: "month" });
        if (statsResult.success) {
          setStatistics(statsResult.statistics);
        }
      } catch (error) {
        console.error("대시보드 데이터 가져오기 오류:", error);
        toast({
          title: "오류",
          description: "데이터를 불러오는데 실패했습니다. 다시 시도해주세요.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-3xl font-bold tracking-tight">대시보드</h1>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/dashboard/groups">
              <Plus className="mr-2 h-4 w-4" />
              그룹 관리
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 보고서</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.total}</div>
            <p className="text-xs text-muted-foreground">최근 한 달간 작성된 보고서 수</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">월별 추이</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics.monthlyTrend.length > 0
                ? statistics.monthlyTrend[statistics.monthlyTrend.length - 1].count
                : 0}
            </div>
            <p className="text-xs text-muted-foreground">이번 달 작성된 보고서 수</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">사용자별 통계</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.byUser.length}</div>
            <p className="text-xs text-muted-foreground">보고서를 작성한 사용자 수</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">최근 보고서</h2>
          <Button variant="outline" asChild>
            <Link href="/dashboard/reports">모든 보고서 보기</Link>
          </Button>
        </div>

        {reports.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reports.slice(0, 6).map((report) => (
              <Link key={report.id} href={`/dashboard/reports/${report.id}`}>
                <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="line-clamp-1">{report.title}</CardTitle>
                    <CardDescription>
                      작성일: {new Date(report.created_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="line-clamp-3 text-sm text-muted-foreground">
                      {report.summary || report.content.substring(0, 150)}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>보고서가 없습니다</CardTitle>
              <CardDescription>아직 작성한 보고서가 없습니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                그룹에 가입하여 첫 번째 보고서를 작성해보세요.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
