"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getFormInstancesByGroupId } from "@/lib/form-instances";
import { getStudentReportsByGroupId } from "@/lib/student-reports";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { FileText, Loader2, Search, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { FormattedFormInstance, FormattedStudentReport } from "../../../../../../types";

export default function EvaluationsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const groupId = params.id;

  const [formInstances, setFormInstances] = useState<FormattedFormInstance[]>([]);
  const [studentReports, setStudentReports] = useState<FormattedStudentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("instances");

  // 데이터 불러오기
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [instancesData, reportsData] = await Promise.all([
          getFormInstancesByGroupId(groupId),
          getStudentReportsByGroupId(groupId),
        ]);

        setFormInstances(instancesData);
        setStudentReports(reportsData);
      } catch (error) {
        console.error("평가 데이터 불러오기 오류:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [groupId]);

  // 검색된 폼 인스턴스 목록
  const filteredInstances = formInstances.filter((instance) => {
    const studentName = instance.student?.name || "";
    const formTitle = instance.form_template?.title || "";
    const status = instance.status || "";

    return (
      studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      formTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      status.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // 검색된 학생 보고서 목록
  const filteredReports = studentReports.filter((report) => {
    const studentName = report.student?.name || "";
    const status = report.status || "";

    return (
      studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      status.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // 상태에 따른 배지 색상
  const getStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="outline">-</Badge>;

    switch (status) {
      case "pending":
        return <Badge variant="outline">대기중</Badge>;
      case "in_progress":
        return <Badge variant="secondary">진행중</Badge>;
      case "completed":
        return <Badge variant="default">완료됨</Badge>;
      case "reviewed":
        return <Badge variant="success">검토됨</Badge>;
      case "draft":
        return <Badge variant="outline">초안</Badge>;
      case "ai_generated":
        return <Badge variant="secondary">AI 생성</Badge>;
      case "published":
        return <Badge variant="success">발행됨</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">평가 결과</h1>
          <p className="text-muted-foreground">
            학생 평가 폼과 생성된 보고서를 관리할 수 있습니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="검색..."
              className="w-[200px] pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Tabs defaultValue="instances" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="instances">평가 폼</TabsTrigger>
          <TabsTrigger value="reports">보고서</TabsTrigger>
        </TabsList>

        <TabsContent value="instances" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>평가 폼 목록</CardTitle>
              <CardDescription>
                총 {filteredInstances.length}개의 평가 폼이 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>학생</TableHead>
                    <TableHead>폼 제목</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>반 평균</TableHead>
                    <TableHead>제출일</TableHead>
                    <TableHead>검토일</TableHead>
                    <TableHead className="text-right">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInstances.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        등록된 평가 폼이 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInstances.map((instance) => (
                      <TableRow key={instance.id}>
                        <TableCell className="font-medium">
                          {instance.student?.name || "-"}
                        </TableCell>
                        <TableCell>{instance.form_template?.title || "-"}</TableCell>
                        <TableCell>{getStatusBadge(instance.status)}</TableCell>
                        <TableCell>
                          {instance.class_average !== null ? instance.class_average : "-"}
                        </TableCell>
                        <TableCell>
                          {instance.submitted_at
                            ? new Date(instance.submitted_at).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {instance.reviewed_at
                            ? new Date(instance.reviewed_at).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/forms/${instance.id}`}>보기</Link>
                          </Button>
                          {instance.status === "completed" && (
                            <Button variant="outline" size="sm" className="ml-2" asChild>
                              <Link
                                href={`/dashboard/groups/${groupId}/evaluations/${instance.id}/generate`}
                              >
                                <Sparkles className="mr-2 h-4 w-4" />
                                보고서 생성
                              </Link>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>보고서 목록</CardTitle>
              <CardDescription>총 {filteredReports.length}개의 보고서가 있습니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>학생</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>생성일</TableHead>
                    <TableHead>업데이트일</TableHead>
                    <TableHead className="text-right">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        생성된 보고서가 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">{report.student?.name || "-"}</TableCell>
                        <TableCell>{getStatusBadge(report.status)}</TableCell>
                        <TableCell>
                          {report.created_at
                            ? new Date(report.created_at).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {report.updated_at
                            ? new Date(report.updated_at).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link
                              href={`/dashboard/groups/${groupId}/evaluations/reports/${report.id}`}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              보기
                            </Link>
                          </Button>
                          {report.status === "draft" && (
                            <Button variant="outline" size="sm" className="ml-2" asChild>
                              <Link
                                href={`/dashboard/groups/${groupId}/evaluations/reports/${report.id}/edit`}
                              >
                                수정
                              </Link>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
