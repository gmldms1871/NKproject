"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getReportDetails, updateReport } from "@/lib/reports";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { Report } from "@/types";
import { ArrowLeft, Save } from "lucide-react";

export default function EditReportPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [report, setReport] = useState<Report | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchReportDetails = async () => {
      try {
        const result = await getReportDetails(params.id);
        if (result.success && result.report) {
          setReport(result.report);
          setContent(result.report.content);
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

  const handleSaveReport = async () => {
    if (!report) return;

    setIsSaving(true);
    try {
      const result = await updateReport(report.id, { content });
      if (result.success) {
        toast({
          title: "보고서 업데이트 완료",
          description: "보고서가 성공적으로 업데이트되었습니다.",
        });
        router.push(`/dashboard/reports/${report.id}`);
      } else {
        toast({
          title: "업데이트 실패",
          description: result.error || "보고서 업데이트에 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("보고서 업데이트 오류:", error);
      toast({
        title: "오류",
        description: "예기치 않은 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
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
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">보고서 수정</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>보고서 내용 수정</CardTitle>
          <CardDescription>작성일: {new Date(report.created_at).toLocaleString()}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="보고서 내용을 입력하세요..."
              className="min-h-[300px]"
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => router.back()} disabled={isSaving}>
            취소
          </Button>
          <Button onClick={handleSaveReport} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "저장 중..." : "저장"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
