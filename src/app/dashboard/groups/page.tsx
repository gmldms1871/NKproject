"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Users } from "lucide-react";

interface GroupWithDetails {
  id: string;
  name: string;
  created_at: string;
  owner_id: string;
}

export default function GroupsPage() {
  const { toast } = useToast();
  const [groups, setGroups] = useState<GroupWithDetails[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<GroupWithDetails[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const userGroups = await getUserGroups();
        if (userGroups && userGroups.length > 0) {
          const formattedGroups = userGroups
            .filter((membership) => membership.groups)
            .map((membership) => membership.groups) as GroupWithDetails[];
          setGroups(formattedGroups);
          setFilteredGroups(formattedGroups);
        }
      } catch (error) {
        console.error("그룹 가져오기 오류:", error);
        toast({
          title: "오류",
          description: "그룹을 불러오는데 실패했습니다. 다시 시도해주세요.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, [toast]);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setFilteredGroups(groups);
      return;
    }

    const filtered = groups.filter((group) =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredGroups(filtered);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-3xl font-bold tracking-tight">그룹</h1>
        <Link href="/dashboard/groups/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            그룹 생성
          </Button>
        </Link>
      </div>

      <div className="flex items-center space-x-2">
        <Input
          placeholder="그룹 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="max-w-sm"
        />
        <Button variant="outline" onClick={handleSearch}>
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      ) : filteredGroups.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredGroups.map((group) => (
            <Link key={group.id} href={`/dashboard/groups/${group.id}`}>
              <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardTitle>{group.name}</CardTitle>
                  <CardDescription>
                    생성일: {new Date(group.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="mr-2 h-4 w-4" />
                    <span>멤버 관리 및 보고서 작성</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    그룹 보기
                  </Button>
                </CardFooter>
              </Card>
            </Link>
          ))}
          <Card className="flex h-full flex-col items-center justify-center p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-medium">새 그룹 만들기</h3>
            <p className="mb-4 mt-2 text-center text-sm text-muted-foreground">
              보고서와 업무를 관리할 새 그룹을 만들어보세요
            </p>
            <Link href="/dashboard/groups/create" className="w-full">
              <Button className="w-full">그룹 생성</Button>
            </Link>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>그룹을 찾을 수 없습니다</CardTitle>
            <CardDescription>
              {searchQuery ? "검색 결과가 없습니다." : "아직 어떤 그룹에도 속해있지 않습니다."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              시작하려면 새 그룹을 만들거나 초대를 기다려주세요.
            </p>
          </CardContent>
          <CardFooter>
            <Link href="/dashboard/groups/create" className="w-full">
              <Button className="w-full">그룹 생성</Button>
            </Link>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
