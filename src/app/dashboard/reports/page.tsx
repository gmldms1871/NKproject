"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getReportsByGroup, getReportsByUser } from "@/lib/reports";
import { getUserGroups } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { Group, Report } from "../../../../types";
import { Calendar, FileText, Plus, Search } from "lucide-react";

export default function ReportsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // URL에서 그룹 ID 가져오기
  useEffect(() => {
    const groupId = searchParams.get("groupId");
    if (groupId) {
      setSelectedGroupId(groupId);
    }
  }, [searchParams]);

  // 사용자의 그룹 목록 가져오기
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const userGroups = await getUserGroups();
        if (userGroups && userGroups.length > 0) {
          const formattedGroups = userGroups.map((membership: any) => membership.groups) as Group[];
          setGroups(formattedGroups);
        }
      } catch (error) {
        console.error("그룹 가져오기 오류:", error);
        toast({
          title: "오류",
          description: "그룹 목록을 불러오는데 실패했습니다.",
          variant: "destructive",
        });
      }
    };

    fetchGroups();
  }, [toast]);

  // 보고서 목록 가져오기
  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        let result;
        if (selectedGroupId) {
          // 특정 그룹의 보고서 가져오기
          result = await getReportsByGroup(selectedGroupId, { search: searchQuery });
        } else {
          // 사용자의 모든 보고서 가져오기
          result = await getReportsByUser({ search: searchQuery });
        }

        if (result.success) {
          setReports(result.reports || []);
          setFilteredReports(result.reports || []);
        } else {
          toast({
            title: "오류",
            description: "보고서 목록을 불러오는데 실패했습니다.",
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

    fetchReports();
  }, [selectedGroupId, searchQuery, toast]);

  const handleSearch = () => {
    // 검색 쿼리가 변경될 때 useEffect에서 처리
  };

  const handleGroupChange = (groupId: string) => {
    setSelectedGroupId(groupId);
    // URL 업데이트
    if (groupId) {
      router.push(`/dashboard/reports?groupId=${groupId}`);
    } else {
      router.push("/dashboard/reports");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-3xl font-bold tracking-tight">보고서</h1>
        <Button asChild>
          <Link
            href={`/dashboard/reports/create${
              selectedGroupId ? `?groupId=${selectedGroupId}` : ""
            }`}
          >
            <Plus className="mr-2 h-4 w-4" />
            보고서 작성
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="w-full md:w-64">
          <Select value={selectedGroupId} onValueChange={handleGroupChange}>
            <SelectTrigger>
              <SelectValue placeholder="모든 그룹" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 그룹</SelectItem>
              <SelectGroup>
                <SelectLabel>내 그룹</SelectLabel>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-1 items-center space-x-2">
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

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredReports.length > 0 ? (
        <div className="space-y-4">
          {filteredReports.map((report) => (
            <Link key={report.id} href={`/dashboard/reports/${report.id}`}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardTitle>{report.title || `보고서 #${report.id.substring(0, 8)}`}</CardTitle>
                  <CardDescription>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      <div className="flex items-center">
                        <Calendar className="mr-1 h-3 w-3" />
                        <span>{new Date(report.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center">
                        <FileText className="mr-1 h-3 w-3" />
                        <span>작성자: {report.user_name || "사용자"}</span>
                      </div>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {report.content.length > 150
                      ? `${report.content.substring(0, 150)}...`
                      : report.content}
                  </p>
                </CardContent>
                <CardFooter>
                  <div className="text-xs text-muted-foreground">
                    {report.updated_at && report.updated_at !== report.created_at
                      ? `수정됨: ${new Date(report.updated_at).toLocaleString()}`
                      : ""}
                  </div>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">보고서가 없습니다</h3>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              {searchQuery
                ? "검색 결과가 없습니다. 다른 검색어를 시도해보세요."
                : selectedGroupId
                ? "이 그룹에 작성된 보고서가 없습니다. 새 보고서를 작성해보세요."
                : "작성된 보고서가 없습니다. 새 보고서를 작성해보세요."}
            </p>
            <Button className="mt-4" asChild>
              <Link
                href={`/dashboard/reports/create${
                  selectedGroupId ? `?groupId=${selectedGroupId}` : ""
                }`}
              >
                <Plus className="mr-2 h-4 w-4" />
                보고서 작성
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
