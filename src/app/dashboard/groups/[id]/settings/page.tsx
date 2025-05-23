"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getGroupDetails, updateGroup } from "@/lib/groups";
import {
  getInputSettings,
  updateInputSetting,
  createInputSettings,
  deleteInputSetting,
} from "@/lib/input-settings";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import type { Group, InputSetting } from "@/types";
import { ArrowLeft, Plus, Save, Trash } from "lucide-react";

export default function GroupSettingsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [group, setGroup] = useState<Group | null>(null);
  const [groupName, setGroupName] = useState("");
  const [inputSettings, setInputSettings] = useState<InputSetting[]>([]);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState<"text" | "select">("text");
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingField, setIsAddingField] = useState(false);

  useEffect(() => {
    const fetchGroupData = async () => {
      try {
        // 그룹 상세 정보 가져오기
        const groupResult = await getGroupDetails(params.id);
        if (!groupResult.success) {
          throw new Error(groupResult.error || "그룹 상세 정보를 가져오는데 실패했습니다");
        }
        setGroup(groupResult.group || null);
        setGroupName(groupResult.group?.name || "");

        // 입력 설정 가져오기
        const settingsResult = await getInputSettings(params.id);
        if (settingsResult.success) {
          setInputSettings(settingsResult.settings || []);
        }
      } catch (error) {
        console.error("그룹 데이터 가져오기 오류:", error);
        toast({
          title: "오류",
          description: "그룹 정보를 불러오는데 실패했습니다.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchGroupData();
    }
  }, [params.id, toast]);

  const handleSaveGroup = async () => {
    if (!group) return;

    setIsSaving(true);
    try {
      const result = await updateGroup(group.id, { name: groupName });

      if (result.success) {
        setGroup({ ...group, name: groupName });
        toast({
          title: "그룹 업데이트 완료",
          description: "그룹 정보가 성공적으로 업데이트되었습니다.",
        });
      } else {
        toast({
          title: "업데이트 실패",
          description: result.error || "그룹 정보 업데이트에 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "업데이트 실패",
        description: "예기치 않은 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateSetting = async (
    settingId: string,
    updates: { field_name?: string; is_required?: boolean }
  ) => {
    try {
      const result = await updateInputSetting(settingId, updates);

      if (result.success) {
        // 로컬 상태 업데이트
        setInputSettings((prev) =>
          prev.map((setting) => (setting.id === settingId ? { ...setting, ...updates } : setting))
        );
        toast({
          title: "설정 업데이트 완료",
          description: "입력 필드 설정이 업데이트되었습니다.",
        });
      } else {
        toast({
          title: "설정 업데이트 실패",
          description: result.error || "입력 필드 설정 업데이트에 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "설정 업데이트 실패",
        description: "예기치 않은 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSetting = async (settingId: string) => {
    if (!confirm("이 입력 필드를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      return;
    }

    try {
      const result = await deleteInputSetting(settingId);

      if (result.success) {
        // 로컬 상태 업데이트
        setInputSettings((prev) => prev.filter((setting) => setting.id !== settingId));
        toast({
          title: "필드 삭제 완료",
          description: "입력 필드가 삭제되었습니다.",
        });
      } else {
        toast({
          title: "필드 삭제 실패",
          description: result.error || "입력 필드 삭제에 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "필드 삭제 실패",
        description: "예기치 않은 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    }
  };

  const handleAddField = async () => {
    if (!newFieldName.trim()) {
      toast({
        title: "필드 이름 필요",
        description: "새 입력 필드의 이름을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsAddingField(true);
    try {
      const result = await createInputSettings(params.id, [
        {
          field_name: newFieldName,
          field_type: newFieldType,
          is_required: newFieldRequired,
        },
      ]);

      if (result.success) {
        // 새로운 필드 정보 가져오기 (ID 포함)
        const settingsResult = await getInputSettings(params.id);
        if (settingsResult.success) {
          setInputSettings(settingsResult.settings || []);
        }

        setNewFieldName("");
        setNewFieldType("text");
        setNewFieldRequired(false);
        toast({
          title: "필드 추가 완료",
          description: "새 입력 필드가 추가되었습니다.",
        });
      } else {
        toast({
          title: "필드 추가 실패",
          description: result.error || "입력 필드 추가에 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "필드 추가 실패",
        description: "예기치 않은 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsAddingField(false);
    }
  };

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

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">{group.name} 설정</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
          <CardDescription>그룹의 기본 정보를 관리합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">그룹 이름</Label>
            <Input
              id="name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="그룹 이름"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveGroup} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "저장 중..." : "저장"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>보고서 입력 필드</CardTitle>
          <CardDescription>보고서 작성 시 사용할 입력 필드를 관리합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {inputSettings.length > 0 ? (
            <div className="space-y-4">
              {inputSettings.map((setting) => (
                <div
                  key={setting.id}
                  className="flex items-center justify-between space-x-2 rounded-md border p-4"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center">
                      <Input
                        value={setting.field_name}
                        onChange={(e) =>
                          handleUpdateSetting(setting.id, { field_name: e.target.value })
                        }
                        className="max-w-[300px]"
                      />
                      <span className="ml-2 rounded-full bg-muted px-2 py-1 text-xs">
                        {setting.field_type === "text" ? "텍스트" : "선택"}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 pt-2">
                      <Switch
                        checked={setting.is_required}
                        onCheckedChange={(checked) =>
                          handleUpdateSetting(setting.id, { is_required: checked })
                        }
                        id={`required-${setting.id}`}
                      />
                      <Label htmlFor={`required-${setting.id}`} className="text-sm">
                        필수 입력
                      </Label>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDeleteSetting(setting.id)}
                  >
                    <Trash className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-md bg-muted p-4 text-center">
              <p className="text-sm text-muted-foreground">
                입력 필드가 없습니다. 새 필드를 추가해주세요.
              </p>
            </div>
          )}

          <div className="space-y-4 rounded-md border p-4">
            <h3 className="text-sm font-medium">새 입력 필드 추가</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-field-name">필드 이름</Label>
                <Input
                  id="new-field-name"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  placeholder="예: 상담 내용"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-field-type">필드 유형</Label>
                <Select
                  value={newFieldType}
                  onValueChange={(value) => setNewFieldType(value as "text" | "select")}
                >
                  <SelectTrigger id="new-field-type">
                    <SelectValue placeholder="유형 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">텍스트</SelectItem>
                    <SelectItem value="select">선택</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Switch
                checked={newFieldRequired}
                onCheckedChange={setNewFieldRequired}
                id="new-field-required"
              />
              <Label htmlFor="new-field-required" className="text-sm">
                필수 입력
              </Label>
            </div>
            <Button onClick={handleAddField} disabled={isAddingField} className="mt-2">
              <Plus className="mr-2 h-4 w-4" />
              {isAddingField ? "추가 중..." : "필드 추가"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
