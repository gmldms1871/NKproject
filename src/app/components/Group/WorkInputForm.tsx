"use client";

import { useEffect, useCallback, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type Setting = {
  id: string;
  field_name: string;
  field_type: "text" | "select";
  options: string[];
  is_inquired: boolean;
};

type FormValues = {
  [key: string]: string | boolean;
};

interface Props {
  groupId: string;
  userId: string;
}

export function WorkInputForm({ groupId, userId }: Props) {
  const [settings, setSettings] = useState<Setting[]>([]);
  const form = useForm<FormValues>({ defaultValues: {} });

  const fetchSettings = useCallback(async () => {
    const { data, error } = await supabase
      .from("input_settings")
      .select("id, field_name, field_type, options, is_inquired")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true });

    if (!error && data) setSettings(data as Setting[]);
  }, [groupId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    // unified_inputs 테이블에 저장
    const records = settings.map(s => ({
      id: crypto.randomUUID(),
      group_id: groupId,
      user_id: userId,
      setting_id: s.id,
      // text 타입은 string, select 타입도 string
      value: values[s.id] || "",
      created_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from("unified_inputs").insert(records);
    if (error) console.error("업무 입력 저장 오류:", error);
    else {
      form.reset();
      alert("업무 입력이 저장되었습니다.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>업무 입력</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {settings.map(s => (
              <FormField
                key={s.id}
                control={form.control}
                name={s.id}
                rules={{ required: s.is_inquired }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {s.field_name} {s.is_inquired && <span className="text-red-500">*</span>}
                    </FormLabel>
                    <FormControl>
                    {s.field_type === "text" ? (
                        <Input
                          value={field.value as string}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            field.onChange(e.target.value)
                          }
                        />
                      ) : (
                        <Select onValueChange={(v: string) => field.onChange(v)}
                                                  value={field.value as string}>
                          <SelectTrigger>
                            <SelectValue placeholder="선택하세요" />
                          </SelectTrigger>
                          <SelectContent>
                            {s.options.map(opt => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <Button type="submit" className="mt-4">제출하기</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
