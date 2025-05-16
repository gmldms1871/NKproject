"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createGroup, createDefaultInputSettings } from "@/lib/groups";
import { getCurrentUser } from "@/lib/supabase";
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
import { useToast } from "@/hooks/use-toast";

export default function CreateGroupPage() {
  const [groupName, setGroupName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        toast({
          title: "Authentication error",
          description: "You must be logged in to create a group.",
          variant: "destructive",
        });
        return;
      }

      const result = await createGroup(groupName, currentUser.id);

      if (result.success && result.group) {
        // Create default input settings for the new group
        await createDefaultInputSettings(result.group.id);

        toast({
          title: "Group created",
          description: `${groupName} has been created successfully.`,
        });
        router.push(`/dashboard/groups/${result.group.id}`);
      } else {
        toast({
          title: "Failed to create group",
          description: result.error || "An error occurred while creating the group.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to create group",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-3xl font-bold">Create a New Group</h1>
      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Group Details</CardTitle>
            <CardDescription>
              Create a new group to manage reports and collaborate with team members.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Group Name</Label>
              <Input
                id="name"
                placeholder="Enter group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Group"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
