// src/app/group/manage/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export default function GroupManagePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [domainType, setDomainType] = useState<"academy"|"company">("academy");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push("/login");
    });
  }, [router]);

  type DomainType = "academy" | "company";
  const handleCreate = async () => {
    setError(null);
    if (!name.trim()) return setError("그룹 이름을 입력하세요.");
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session!.user.id;

    // 1) groups 테이블에 생성
    const { data: group, error: grpErr } = await supabase
      .from("groups")
      .insert({ name, owner_id: userId, domain_type: domainType })
      .select("id")
      .single();
    if (grpErr || !group) {
      setError(grpErr?.message || "그룹 생성 오류");
      setLoading(false);
      return;
    }

    // 2) group_members 테이블에 CEO로 등록 (accepted_at = now)
    const { error: memErr } = await supabase
      .from("group_members")
      .insert({
        group_id: group.id,
        user_id: userId,
        role: "ceo",
        invited_at: new Date().toISOString(),
        accepted_at: new Date().toISOString()
      });
    if (memErr) {
      setError(memErr.message);
      setLoading(false);
      return;
    }

    router.push(`/group/${group.id}`);
  };

  return (
    <div className="max-w-lg mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">그룹 생성 / 초대</h1>
      {error && <p className="text-red-600">{error}</p>}

      <div>
        <label className="block text-sm">그룹 이름</label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="예: NK Academy" />
      </div>

      <div>
        <label className="block text-sm mb-1">도메인 타입</label>
        <Select
   value={domainType}
   onValueChange={(v: string) => setDomainType(v as DomainType)}
 >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="선택하세요" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="academy">학원</SelectItem>
            <SelectItem value="company">회사</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button onClick={handleCreate} disabled={loading}>
        {loading ? "로딩 중..." : "그룹 생성하기"}
      </Button>
    </div>
  );
}
