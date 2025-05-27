"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getReportDetails, deleteReport, summarizeReport } from "../../../../lib/reports";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { FormattedReport } from "../../../../../types";
import { ArrowLeft, FileText, Trash, User } from "lucide-react";

export default function ReportDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [report, setReport] = useState<FormattedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        const result = await getReportDetails(params.id);
        if (!result.success) {
          throw new Error(result.error || "보고서 정보를 가져오는데 실패했습니다");
        }
        setReport(result.report || null);
      } catch (error) {
        console.error("보고서 데이터 가져오기 오류:", error);
        toast({
          title: "오류",
          description: "보고서 정보를 불러오는데 실패했습니다.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchReportData();
    }
  }, [params.id, toast]);

  const handleSummarize = async () => {
    if (!report) return;

    setIsSummarizing(true);
    try {
      const result = await summarizeReport(report.id);

      if (result.success) {
        setReport((prev) =>
          prev ? { ...prev, summary: result.summary || null, reviewed: true } : null
        );
        toast({
          title: "요약 생성 완료",
          description: "보고서 요약이 생성되었습니다.",
        });
      } else {
        toast({
          title: "요약 생성 실패",
          description: result.error || "보고서 요약 생성에 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "요약 생성 실패",
        description: "예기치 않은 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleDelete = async () => {
    if (!report) return;

    if (!confirm("이 보고서를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteReport(report.id);

      if (result.success) {
        toast({
          title: "보고서 삭제 완료",
          description: "보고서가 삭제되었습니다.",
        });
        router.push(`/dashboard/groups/${report.group_id}`);
      } else {
        toast({
          title: "보고서 삭제 실패",
          description: result.error || "보고서 삭제에 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "보고서 삭제 실패",
        description: "예기치 않은 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-2xl font-bold">보고서를 찾을 수 없습니다</h1>
        <p className="mt-2 text-muted-foreground">
          찾으시는 보고서가 존재하지 않거나 접근 권한이 없습니다.
        </p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/reports">보고서 목록으로 돌아가기</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/dashboard/groups/${report.group_id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">{report.title}</h1>
        </div>
        <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting}>
          <Trash className="mr-2 h-4 w-4" />
          {isDeleting ? "삭제 중..." : "삭제"}
        </Button>
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="md:w-2/3">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>보고서 내용</CardTitle>
              <CardDescription>
                작성일: {new Date(report.created_at).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap">{report.content}</div>
            </CardContent>
          </Card>
        </div>

        <div className="md:w-1/3 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>작성자 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{report.user_name || "사용자"}</p>
                  <p className="text-sm text-muted-foreground">{report.user_email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>요약</CardTitle>
                {!report.summary && (
                  <Button size="sm" onClick={handleSummarize} disabled={isSummarizing}>
                    {isSummarizing ? "요약 중..." : "요약 생성"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {report.summary ? (
                <div className="whitespace-pre-wrap">{report.summary}</div>
              ) : (
                <div className="text-center text-muted-foreground">
                  <FileText className="mx-auto h-8 w-8 opacity-50" />
                  <p className="mt-2">요약이 없습니다</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
