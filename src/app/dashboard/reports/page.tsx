"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getReportsByUser } from "../../../lib/reports";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { FormattedReport } from "../../../../types";
import { ArrowLeft, Search } from "lucide-react";

export default function ReportsPage() {
  const { toast } = useToast();
  const [reports, setReports] = useState<FormattedReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<FormattedReport[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const result = await getReportsByUser();
        if (result.success && result.reports) {
          setReports(result.reports);
          setFilteredReports(result.reports);
        }
      } catch (error) {
        console.error("보고서 가져오기 오류:", error);
        toast({
          title: "오류",
          description: "보고서를 불러오는데 실패했습니다. 다시 시도해주세요.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [toast]);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setFilteredReports(reports);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = reports.filter(
      (report) =>
        report.title.toLowerCase().includes(query) ||
        report.content.toLowerCase().includes(query) ||
        (report.summary && report.summary.toLowerCase().includes(query))
    );
    setFilteredReports(filtered);
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">내 보고서</h1>
      </div>

      <div className="flex items-center space-x-2">
        <Input
          placeholder="보고서 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="max-w-sm"
        />
        <Button variant="outline" onClick={handleSearch}>
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {filteredReports.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredReports.map((report) => (
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
            <CardTitle>보고서를 찾을 수 없습니다</CardTitle>
            <CardDescription>
              {searchQuery ? "검색 결과가 없습니다." : "아직 작성한 보고서가 없습니다."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {searchQuery
                ? "다른 검색어로 다시 시도해보세요."
                : "그룹에 가입하여 첫 번째 보고서를 작성해보세요."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
