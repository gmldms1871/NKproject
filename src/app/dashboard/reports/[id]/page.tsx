"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getReportDetails, updateReport, deleteReport } from "@/lib/reports";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import type { Report, UndefinedInput, InputSetting, User } from "@/types";
import { ArrowLeft, Check, Trash } from "lucide-react";

export default function ReportDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

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

  const handleMarkAsReviewed = async () => {
    if (!report) return;

    setIsUpdating(true);
    try {
      const result = await updateReport(report.id, { reviewed: true });
      if (result.success) {
        setReport({ ...report, reviewed: true });
        toast({
          title: "보고서 업데이트",
          description: "보고서가 검토 완료로 표시되었습니다.",
        });
      } else {
        toast({
          title: "업데이트 실패",
          description: result.error || "보고서 상태 업데이트에 실패했습니다.",
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
      setIsUpdating(false);
    }
  };

  const handleDeleteReport = async () => {
    if (!report) return;

    if (!window.confirm("이 보고서를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteReport(report.id);
      if (result.success) {
        toast({
          title: "보고서 삭제됨",
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

  // 필드 유형별로 입력 그룹화
  const statusInputs: UndefinedInput[] = [];
  const textInputs: UndefinedInput[] = [];

  report.undefined_inputs?.forEach((input) => {
    const field = input.field as unknown as InputSetting;
    if (field?.field_type === "select") {
      statusInputs.push(input);
    } else {
      textInputs.push(input);
    }
  });

  const author = report.author as unknown as User;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">보고서 상세</h1>
        </div>
        <div className="flex space-x-2">
          {!report.reviewed && (
            <Button variant="outline" onClick={handleMarkAsReviewed} disabled={isUpdating}>
              <Check className="mr-2 h-4 w-4" />
              검토 완료 표시
            </Button>
          )}
          <Button variant="destructive" onClick={handleDeleteReport} disabled={isDeleting}>
            <Trash className="mr-2 h-4 w-4" />
            삭제
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>보고서 요약</CardTitle>
              <CardDescription>
                작성일: {new Date(report.created_at).toLocaleString()}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                {author?.name?.charAt(0) || author?.email?.charAt(0) || "U"}
              </div>
              <div>
                <p className="text-sm font-medium">{author?.name || "알 수 없는 사용자"}</p>
                <p className="text-xs text-muted-foreground">{author?.email}</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {report.summary && (
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm italic">{report.summary}</p>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-lg font-medium">상태</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {statusInputs.length > 0 ? (
                statusInputs.map((input) => {
                  const field = input.field as unknown as InputSetting;
                  return (
                    <div
                      key={input.id}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <span className="font-medium">{field?.field_name}</span>
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          input.value === "완료"
                            ? "bg-green-100 text-green-800"
                            : input.value === "진행중"
                            ? "bg-blue-100 text-blue-800"
                            : input.value === "미완료"
                            ? "bg-red-100 text-red-800"
                            : input.value === "연장"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {input.value}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">상태 정보가 없습니다.</p>
              )}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h3 className="text-lg font-medium">추가 정보</h3>
            <div className="space-y-4">
              {textInputs.length > 0 ? (
                textInputs.map((input) => {
                  const field = input.field as unknown as InputSetting;
                  return (
                    <div key={input.id} className="space-y-1">
                      <h4 className="text-sm font-medium">{field?.field_name}</h4>
                      <p className="rounded-md border p-3 text-sm">{input.value || "N/A"}</p>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">추가 정보가 없습니다.</p>
              )}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h3 className="text-lg font-medium">전체 보고서</h3>
            <div className="rounded-md border p-4">
              <div className="prose max-w-none">
                {report.content.split("\n").map((paragraph, index) => (
                  <p key={index} className="mb-4 last:mb-0">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
