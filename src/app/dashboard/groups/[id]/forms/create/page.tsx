"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { createFormTemplate } from "@/lib/form-templates";

// 폼 템플릿 스키마
const formTemplateSchema = z.object({
  title: z.string().min(1, "제목은 필수입니다"),
  description: z.string().optional(),
  exam_type: z.string().optional(),
  test_range: z.string().optional(),
  difficulty_level: z.coerce.number().min(1).max(5).optional(),
  is_active: z.boolean(),
});

type FormTemplateValues = z.infer<typeof formTemplateSchema>;

export default function CreateFormPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: groupId } = use(params);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 폼
  const form = useForm<FormTemplateValues>({
    resolver: zodResolver(formTemplateSchema) as any,
    defaultValues: {
      title: "",
      description: "",
      exam_type: "",
      test_range: "",
      difficulty_level: 3,
      is_active: true,
    },
  });

  // 폼 제출
  const onSubmit = async (data: FormTemplateValues) => {
    setIsSubmitting(true);
    try {
      const result = await createFormTemplate({
        title: data.title,
        description: data.description || null,
        exam_type: data.exam_type || null,
        test_range: data.test_range || null,
        difficulty_level: data.difficulty_level || null,
        is_active: data.is_active,
        group_id: groupId,
      });

      if (result.success) {
        router.push(`/dashboard/groups/${groupId}/forms`);
      } else {
        console.error("폼 템플릿 생성 오류:", result.error);
        // 오류 처리
      }
    } catch (error) {
      console.error("폼 템플릿 생성 오류:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push(`/dashboard/groups/${groupId}/forms`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">새 폼 템플릿 생성</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>폼 템플릿 정보</CardTitle>
          <CardDescription>새로운 평가 폼 템플릿을 생성합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control as any}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>제목 *</FormLabel>
                    <FormControl>
                      <Input placeholder="2025학년도 1학기 중간고사" {...field} />
                    </FormControl>
                    <FormDescription>폼 템플릿의 제목을 입력하세요.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>설명</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="이 폼 템플릿에 대한 설명을 입력하세요."
                        className="min-h-[100px]"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control as any}
                  name="exam_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>시험 종류</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="시험 종류 선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="midterm">중간고사</SelectItem>
                          <SelectItem value="final">기말고사</SelectItem>
                          <SelectItem value="quiz">퀴즈</SelectItem>
                          <SelectItem value="assignment">과제</SelectItem>
                          <SelectItem value="project">프로젝트</SelectItem>
                          <SelectItem value="other">기타</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control as any}
                  name="test_range"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>시험 범위</FormLabel>
                      <FormControl>
                        <Input placeholder="1~5장" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control as any}
                name="difficulty_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>난이도</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number.parseInt(value))}
                      value={field.value?.toString() || "3"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="난이도 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">매우 쉬움</SelectItem>
                        <SelectItem value="2">쉬움</SelectItem>
                        <SelectItem value="3">보통</SelectItem>
                        <SelectItem value="4">어려움</SelectItem>
                        <SelectItem value="5">매우 어려움</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">활성화</FormLabel>
                      <FormDescription>
                        폼 템플릿을 즉시 사용 가능하도록 활성화합니다.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/dashboard/groups/${groupId}/forms`)}
                >
                  취소
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  생성
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
