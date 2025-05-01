"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";

interface InputSetting {
  id: string;
  group_id: string;
  field_name: string;
  field_type: "select" | "text";
  is_inquired: boolean;
}

type FormValues = {
  name: string;                // 사용자 입력용 이름
  type: "select" | "text";  // DB의 field_type에 매핑
  required: boolean;           // DB의 is_inquired
};

export default function InputSettingsPage() {
  const { id } = useParams();
  const groupId = Array.isArray(id) ? id[0] : id ?? "";
  const [settings, setSettings] = useState<InputSetting[]>([]);
  const form = useForm<FormValues>({
    defaultValues: { name: "", type: "text", required: false }
  });

  const fetchSettings = useCallback(async () => {
    if (!groupId) return;
    const { data, error } = await supabase
      .from("input_settings")
      .select("id, group_id, field_name, field_type, is_inquired")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true });
    if (error) console.error(error);
    else setSettings(data as InputSetting[]);
  }, [groupId]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const onSubmit = async (values: FormValues) => {
    if (!groupId) return;
    const newSetting = {
      id: crypto.randomUUID(),
      group_id: groupId,
      field_name: values.name,
      field_type: values.type,
      is_inquired: values.required,
    };
    const { error } = await supabase.from("input_settings").insert(newSetting);
    if (error) console.error(error);
    else {
      form.reset();
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
    <div className="space-y-6 p-4">
      <Card>
        <CardHeader>
          <CardTitle>업무 입력 항목 추가</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>항목명</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="예: 숙제 상태" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>타입</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="선택형 or 주관식" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">주관식 (Text)</SelectItem>
                          <SelectItem value="select">선택형 (Select)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="required"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel>필수 여부</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="col-span-full">
                <Button type="submit">추가하기</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {settings.map(setting => (
          <Card key={setting.id}>
            <CardContent className="flex justify-between items-center">
              <div>
                <h4 className="text-lg font-medium">{setting.field_name}</h4>
                <p className="text-sm text-muted-foreground">
                  {setting.field_type === "select" ? "선택형" : "주관식"} / {setting.is_inquired ? "필수" : "선택"}
                </p>
              </div>
              <Button variant="destructive" size="sm" onClick={() => deleteSetting(setting.id)}>
                삭제
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
