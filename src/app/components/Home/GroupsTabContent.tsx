// src/app/components/Home/GroupsTabContent.tsx
import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

// ↓ export를 빠뜨리지 마세요!
export interface Group {
  id: string;
  name: string;
  created_at: string;
  owner_id: string;
  userRole: string | null;
}

interface GroupsTabContentProps {
  groups: Group[];
  role: string;
  onCreateGroup: () => void;
}

export default function GroupsTabContent({
  groups,
  role,
  onCreateGroup,
}: GroupsTabContentProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">내 그룹</h2>
        {role === "CEO" && (
          <Button onClick={onCreateGroup}>새 그룹 생성</Button>
        )}
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="pt-6 flex flex-col items-center justify-center py-10">
            <h3 className="text-lg font-medium mb-2">참여 중인 그룹이 없습니다</h3>
            <p className="text-muted-foreground mb-4 text-center">
              {role === "CEO"
                ? "새 그룹을 생성하거나 초대를 기다려주세요."
                : "그룹 초대를 기다려주세요."}
            </p>
            {role === "CEO" && (
              <Button onClick={onCreateGroup}>새 그룹 생성</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((group) => (
            <Link href={`/group/${group.id}`} key={group.id}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle>{group.name}</CardTitle>
                  <p className="text-sm">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                      {group.userRole} 역할
                    </span>
                  </p>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    생성일: {new Date(group.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button variant="ghost" size="sm" className="text-primary">
                    {group.userRole === "CEO" ? "관리하기" : "업무 입력하기"}
                  </Button>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
