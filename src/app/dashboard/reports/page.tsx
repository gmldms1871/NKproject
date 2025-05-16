"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getReports } from "@/lib/reports";
import { getCurrentUser, getUserGroups } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Group, Report, User } from "@/types";
import { FileText, Plus, Search } from "lucide-react";

export default function ReportsPage() {
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
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
            fetchReports(formattedGroups[0].id);
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
  }, [toast]);

  const fetchReports = async (groupId: string) => {
    setLoading(true);
    try {
      const result = await getReports(groupId, {
        search: searchQuery,
      });

      if (result.success) {
        setReports(result.reports || []);
      } else {
        toast({
          title: "오류",
          description: "보고서를 불러오는데 실패했습니다. 다시 시도해주세요.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("보고서 가져오기 오류:", error);
      toast({
        title: "오류",
        description: "예기치 않은 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGroupChange = (groupId: string) => {
    setSelectedGroupId(groupId);
    fetchReports(groupId);
  };

  const handleSearch = () => {
    if (selectedGroupId) {
      fetchReports(selectedGroupId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-3xl font-bold tracking-tight">보고서</h1>
        <Link href="/dashboard/reports/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            보고서 작성
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>보고서 필터</CardTitle>
          <CardDescription>그룹을 선택하고 특정 보고서를 검색하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex-1">
              <Select value={selectedGroupId} onValueChange={handleGroupChange}>
                <SelectTrigger>
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
            <div className="flex flex-1 gap-2">
              <Input
                placeholder="보고서 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button variant="outline" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      ) : reports.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => {
            const author = report.author as unknown as User;
            return (
              <Link key={report.id} href={`/dashboard/reports/${report.id}`}>
                <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="line-clamp-1 text-base">
                        {report.summary || "보고서"}
                      </CardTitle>
                      {report.reviewed ? (
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">
                          검토 완료
                        </span>
                      ) : (
                        <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-800">
                          검토 대기
                        </span>
                      )}
                    </div>
                    <CardDescription>
                      {new Date(report.created_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-2 line-clamp-3 text-sm text-muted-foreground">
                      {report.content}
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs">
                        {author?.name?.charAt(0) || author?.email?.charAt(0) || "U"}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {author?.name || "알 수 없는 사용자"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>보고서를 찾을 수 없습니다</CardTitle>
            <CardDescription>
              {selectedGroupId
                ? "선택한 그룹에 대한 보고서가 없습니다."
                : "보고서를 보려면 그룹을 선택하세요."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-4 text-center text-muted-foreground">
              {selectedGroupId
                ? "첫 번째 보고서를 작성하여 시작하세요."
                : "보고서 작성을 시작하려면 그룹에 가입하거나 생성하세요."}
            </p>
            {selectedGroupId && (
              <Link href={`/dashboard/reports/create?groupId=${selectedGroupId}`}>
                <Button>보고서 작성</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
