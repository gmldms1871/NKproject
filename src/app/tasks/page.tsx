// src/app/tasks/page.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { WorkInputForm } from "@/app/components/Group/WorkInputForm";

interface GroupOption { id: string; name: string; }
interface MemberRow {
  group_id: string;
  group: { name: string };
}

export default function TasksPage() {
  const [userId, setUserId] = useState<string>("");
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [groupId, setGroupId] = useState<string>("");
  
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUserId(session.user.id);
        // 내 그룹 목록 로드
        supabase
        .from("group_members")
        .select("group_id, group:groups(name)")
        .then(({ data }) => {
          // data comes back as any[], so assert to MemberRow[]
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
      }
    });
  }, []);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">업무 입력</h1>

      <div>
        <label className="block mb-1 text-sm">그룹 선택</label>
        <Select value={groupId} onValueChange={setGroupId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="그룹을 선택하세요" />
          </SelectTrigger>
          <SelectContent>
            {groups.map(g => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {groupId
        ? <WorkInputForm groupId={groupId} userId={userId} />
        : <p className="text-gray-500">먼저 그룹을 선택해주세요.</p>}
    </div>
  );
}
