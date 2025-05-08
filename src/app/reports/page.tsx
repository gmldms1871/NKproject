// src/app/reports/page.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Report {
  id: string;
  title: string;
  summary: string | null;
  reviewed: boolean;
  created_at: string;
}

interface GroupOption { id: string; name: string; }
interface MemberRow {
  group_id: string;
  group: { name: string };
}

export default function ReportsPage() {
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [groupId, setGroupId] = useState<string>("");
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      // 내 그룹 목록
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
      .select("id,title,summary,reviewed,created_at")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setReports(data);
      });
  }, [groupId]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">보고서 목록</h1>

      <div>
        <label className="block mb-1 text-sm">그룹 선택</label>
        <Select value={groupId} onValueChange={setGroupId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="그룹 선택" />
          </SelectTrigger>
          <SelectContent>
            {groups.map(g => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {reports.map(r => (
          <Card key={r.id}>
            <CardHeader>
              <CardTitle className="flex justify-between">
                {r.title}
                <span className={r.reviewed ? "text-green-600" : "text-red-600"}>
                  {r.reviewed ? "✔️" : "❌"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-2 text-sm text-gray-500">{new Date(r.created_at).toLocaleString()}</p>
              <p>{r.summary ?? <em>요약 없음</em>}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
