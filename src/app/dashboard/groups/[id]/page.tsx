"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getGroupDetails, getGroupMembers } from "@/lib/groups";
import { getCurrentUser, getUserRole } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Group, GroupMember, UserRole } from "@/types";
import { Plus, Users } from "lucide-react";

export default function GroupPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGroupData = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          router.push("/login");
          return;
        }

        // 그룹 상세 정보 가져오기
        const groupResult = await getGroupDetails(params.id);
        if (!groupResult.success) {
          throw new Error(groupResult.error || "그룹 상세 정보를 가져오는데 실패했습니다");
        }
        setGroup(groupResult.group || null);

        // 그룹 멤버 가져오기
        const membersResult = await getGroupMembers(params.id);
        if (!membersResult.success) {
          throw new Error(membersResult.error || "그룹 멤버를 가져오는데 실패했습니다");
        }
        setMembers(membersResult.members || []);

        // 사용자의 그룹 내 역할 가져오기
        const role = await getUserRole(currentUser.id, params.id);
        setUserRole(role as UserRole);
      } catch (error) {
        console.error("그룹 데이터 가져오기 오류:", error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchGroupData();
    }
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-2xl font-bold">그룹을 찾을 수 없습니다</h1>
        <p className="mt-2 text-muted-foreground">
          찾으시는 그룹이 존재하지 않거나 접근 권한이 없습니다.
        </p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/groups">그룹 목록으로 돌아가기</Link>
        </Button>
      </div>
    );
  }

  const isAdmin = userRole === "ceo" || userRole === "manager";

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{group.name}</h1>
          <p className="text-muted-foreground">
            생성일: {new Date(group.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link href={`/dashboard/groups/${params.id}/invite`}>
              <Button variant="outline">
                <Users className="mr-2 h-4 w-4" />
                멤버 초대
              </Button>
            </Link>
          )}
          <Link href={`/dashboard/reports/create?groupId=${params.id}`}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              보고서 작성
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="members">멤버</TabsTrigger>
          <TabsTrigger value="reports">보고서</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <div>Overview Content</div>
        </TabsContent>
        <TabsContent value="members">
          <div>Members Content</div>
        </TabsContent>
        <TabsContent value="reports">
          <div>Reports Content</div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
