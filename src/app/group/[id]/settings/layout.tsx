"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface InputSetting {
  id: string;
  group_id: string;
  field_name: string;
  field_type: "select" | "text";
  is_inquired: boolean;
}

type NewRow = {
  name: string;
  type: "select" | "text";
  required: boolean;
};

export default function InputSettingsPage() {
  const { id } = useParams();
  const groupId = Array.isArray(id) ? id[0] : id ?? "";
  const [settings, setSettings] = useState<InputSetting[]>([]);
  const [newRow, setNewRow] = useState<NewRow>({ name: "", type: "text", required: false });

  const fetchSettings = useCallback(async () => {
    if (!groupId) return;
    const { data, error } = await supabase
      .from("input_settings")
      .select("id, field_name, field_type, is_inquired")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true });
    if (error) console.error(error);
    else setSettings(data as InputSetting[]);
  }, [groupId]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const addSetting = async () => {
    if (!newRow.name.trim()) return;
    const record = {
      id: crypto.randomUUID(),
      group_id: groupId,
      field_name: newRow.name,
      field_type: newRow.type,
      is_inquired: newRow.required,
    };
    const { error } = await supabase.from("input_settings").insert(record);
    if (error) console.error(error);
    else {
      setNewRow({ name: "", type: "text", required: false });
      fetchSettings();
    }
  };

  const deleteSetting = async (settingId: string) => {
    const { error } = await supabase
      .from("input_settings")
      .delete()
      .eq("id", settingId);
    if (error) console.error(error);
    else fetchSettings();
  };

  return (
    <Card className="p-4">
      <CardHeader>
        <CardTitle>업무 입력 항목 설정</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium">항목명</th>
                <th className="px-4 py-2 text-left text-sm font-medium">타입</th>
                <th className="px-4 py-2 text-left text-sm font-medium">필수 여부</th>
                <th className="px-4 py-2 text-center text-sm font-medium">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {settings.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-2 text-sm">{s.field_name}</td>
                  <td className="px-4 py-2 text-sm">{s.field_type === "select" ? "선택형" : "주관식"}</td>
                  <td className="px-4 py-2 text-sm">{s.is_inquired ? "●" : "○"}</td>
                  <td className="px-4 py-2 text-center">
                    <Button variant="destructive" size="sm" onClick={() => deleteSetting(s.id)}>
                      삭제
                    </Button>
                  </td>
                </tr>
              ))}

              {/* 신규 입력행 */}
              <tr>
                <td className="px-4 py-2">
                  <Input
                    value={newRow.name}
                    onChange={(e) => setNewRow(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="새 항목명"
                  />
                </td>
                <td className="px-4 py-2">
                  <Select
                    value={newRow.type}
                    onValueChange={(v: "select" | "text") => setNewRow(prev => ({ ...prev, type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="타입" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">주관식</SelectItem>
                      <SelectItem value="select">선택형</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-2 text-center">
                  <Switch
                    checked={newRow.required}
                    onCheckedChange={(v) => setNewRow(prev => ({ ...prev, required: v }))}
                  />
                </td>
                <td className="px-4 py-2 text-center">
                  <Button onClick={addSetting}>추가</Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
