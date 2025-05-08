
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface GroupOption { id: string; name: string; }

export default function StatisticsPage() {
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [groupId, setGroupId] = useState<string>("");
  const [totalReports, setTotalReports] = useState(0);
  const [pendingReports, setPendingReports] = useState(0);

  interface MemberRow {
        group_id: string;
        group: { name: string };
    }
    
      useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session) return;
          supabase
              .from("group_members")
            .select("group_id, group:groups(name)")
            .eq("user_id", session.user.id)
            .then(({ data }) => {
                const rows = data as MemberRow[] | null;
                if (rows) {
                  setGroups(
                    rows.map(({ group_id, group }) => ({
                      id: group_id,
                      name: group.name,
                    }))
                  );
                }
            });
        });
      }, []);

  useEffect(() => {
    if (!groupId) return;
    supabase
      .from("reports")
      .select("*", { count: "exact" })
      .eq("group_id", groupId)
      .then(({ count }) => setTotalReports(count ?? 0));
    supabase
      .from("reports")
      .select("*", { count: "exact" })
      .eq("group_id", groupId)
      .eq("reviewed", false)
      .then(({ count }) => setPendingReports(count ?? 0));
  }, [groupId]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">통계</h1>
      <div>
        <label className="block mb-1 text-sm">그룹 선택</label>
        <Select value={groupId} onValueChange={setGroupId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="그룹 선택" />
          </SelectTrigger>
          <SelectContent>
            {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {groupId && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle>총 보고서 수</CardTitle></CardHeader>
            <CardContent><p className="text-3xl">{totalReports}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>미확인 보고서</CardTitle></CardHeader>
            <CardContent><p className="text-3xl text-red-600">{pendingReports}</p></CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
