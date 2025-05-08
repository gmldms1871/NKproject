// src/app/reports/create/page.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

interface GroupOption { id: string; name: string; }

export default function ReportCreatePage() {
  const router = useRouter();
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [groupId, setGroupId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

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

  const handleSubmit = async () => {
    if (!groupId || !title.trim() || !content.trim()) return;
    const { data: { session } } = await supabase.auth.getSession();
    const author_id = session!.user.id;
    const { error } = await supabase.from("reports").insert({
      group_id: groupId,
      author_id,
      title,
      content
    });
    if (!error) router.push("/reports");
  };

  return (
    <div className="p-6 space-y-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold">새 보고서 작성</h1>

      <div>
        <label className="block text-sm mb-1">그룹 선택</label>
        <Select value={groupId} onValueChange={setGroupId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="그룹 선택" />
          </SelectTrigger>
          <SelectContent>
            {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Input placeholder="제목" value={title} onChange={e => setTitle(e.target.value)} />
      <Textarea placeholder="내용" value={content} onChange={e => setContent(e.target.value)} rows={8} />
      <Button onClick={handleSubmit}>제출하기</Button>
    </div>
  );
}
