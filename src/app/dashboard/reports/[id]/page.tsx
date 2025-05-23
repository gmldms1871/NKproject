"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { deleteReport, getReportDetails, summarizeReport } from "@/lib/reports";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import type { Report } from "@/types";
import { ArrowLeft, Calendar, FileEdit, Trash2, User } from "lucide-react";

export default function ReportDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    const fetchReportDetails = async () => {
      try {
        const result = await getReportDetails(params.id);
        if (result.success && result.report) {
          setReport(result.report);
        } else {
          toast({
            title: "오류",
            description: "보고서 상세 정보를 불러오는데 실패했습니다.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("보고서 상세 정보 가져오기 오류:", error);
        toast({
          title: "오류",
          description: "예기치 않은 오류가 발생했습니다.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchReportDetails();
    }
  }, [params.id, toast]);

  const handleDeleteReport = async () => {
    if (!report) return;

    setIsDeleting(true);
    try {
      const result = await deleteReport(report.id);
      if (result.success) {
        toast({
          title: "보고서 삭제 완료",
          description: "보고서가 성공적으로 삭제되었습니다.",
        });
        router.push("/dashboard/reports");
      } else {
        toast({
          title: "삭제 실패",
          description: result.error || "보고서 삭제에 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("보고서 삭제 오류:", error);
      toast({
        title: "오류",
        description: "예기치 않은 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!report) return;

    setIsSummarizing(true);
    try {
      const result = await summarizeReport(report.content);
      if (result.success && result.summary) {
        setSummary(result.summary);
      } else {
        toast({
          title: "요약 생성 실패",
          description: result.error || "보고서 요약 생성에 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("보고서 요약 생성 오류:", error);
      toast({
        title: "오류",
        description: "예기치 않은 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSummarizing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" disabled>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Skeleton className="h-8 w-48" />
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
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
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">
            {report.title || `보고서 #${report.id.substring(0, 8)}`}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/reports/${report.id}/edit`}>
              <FileEdit className="mr-2 h-4 w-4" />
              수정
            </Link>
          </Button>
          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                삭제
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>보고서 삭제</DialogTitle>
                <DialogDescription>
                  정말로 이 보고서를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteDialogOpen(false)}
                  disabled={isDeleting}
                >
                  취소
                </Button>
                <Button variant="destructive" onClick={handleDeleteReport} disabled={isDeleting}>
                  {isDeleting ? "삭제 중..." : "삭제"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>보고서 정보</CardTitle>
          <CardDescription>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <div className="flex items-center">
                <User className="mr-1 h-3 w-3" />
                <span>작성자: {report.user_name || "사용자"}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="mr-1 h-3 w-3" />
                <span>작성일: {new Date(report.created_at).toLocaleString()}</span>
              </div>
              {report.updated_at && report.updated_at !== report.created_at && (
                <div className="flex items-center">
                  <Calendar className="mr-1 h-3 w-3" />
                  <span>수정일: {new Date(report.updated_at).toLocaleString()}</span>
                </div>
              )}
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="whitespace-pre-wrap rounded-md border p-4">{report.content}</div>

          {summary && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">AI 요약</h3>
              <div className="rounded-md border bg-muted/50 p-4 text-sm">{summary}</div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          {!summary && (
            <Button variant="outline" onClick={handleGenerateSummary} disabled={isSummarizing}>
              {isSummarizing ? "요약 생성 중..." : "AI로 요약 생성"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
