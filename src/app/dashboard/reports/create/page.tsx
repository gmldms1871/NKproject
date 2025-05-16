"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createReport } from "@/lib/reports"
import { getInputSettings } from "@/lib/input-settings"
import { getCurrentUser, getUserGroups } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import type { Group, InputSetting } from "@/types"

export default function CreateReportPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string>("")
  const [content, setContent] = useState("")
  const [inputSettings, setInputSettings] = useState<InputSetting[]>([])
  const [taskStatuses, setTaskStatuses] = useState<Record<string, string>>({})
  const [additionalInputs, setAdditionalInputs] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const currentUser = await getCurrentUser()
        if (currentUser) {
          const userGroups = await getUserGroups(currentUser.id)
          const formattedGroups = userGroups.map((membership: any) => membership.groups) as Group[]
          setGroups(formattedGroups)

          // Check if groupId is provided in URL
          const groupId = searchParams.get("groupId")
          if (groupId && formattedGroups.some((g) => g.id === groupId)) {
            setSelectedGroupId(groupId)
            fetchInputSettings(groupId)
          }
        }
      } catch (error) {
        console.error("Error fetching groups:", error)
        toast({
          title: "Error",
          description: "Failed to load your groups. Please try again.",
          variant: "destructive",
        })
      } finally {
        setInitialLoading(false)
      }
    }

    fetchGroups()
  }, [searchParams, toast])

  const fetchInputSettings = async (groupId: string) => {
    try {
      const result = await getInputSettings(groupId)
      if (result.success && result.settings) {
        setInputSettings(result.settings)

        // Initialize task statuses and additional inputs
        const initialTaskStatuses: Record<string, string> = {}
        const initialAdditionalInputs: Record<string, string> = {}

        result.settings.forEach((setting) => {
          if (setting.field_type === "select") {
            initialTaskStatuses[setting.field_name] = "미완료" // Default value
          } else {
            initialAdditionalInputs[setting.field_name] = ""
          }
        })

        setTaskStatuses(initialTaskStatuses)
        setAdditionalInputs(initialAdditionalInputs)
      }
    } catch (error) {
      console.error("Error fetching input settings:", error)
    }
  }

  const handleGroupChange = (groupId: string) => {
    setSelectedGroupId(groupId)
    fetchInputSettings(groupId)
  }

  const handleTaskStatusChange = (fieldName: string, value: string) => {
    setTaskStatuses((prev) => ({
      ...prev,
      [fieldName]: value,
    }))
  }

  const handleAdditionalInputChange = (fieldName: string, value: string) => {
    setAdditionalInputs((prev) => ({
      ...prev,
      [fieldName]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        toast({
          title: "Authentication error",
          description: "You must be logged in to create a report.",
          variant: "destructive",
        })
        return
      }

      if (!selectedGroupId) {
        toast({
          title: "Group required",
          description: "Please select a group for this report.",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      if (!content.trim()) {
        toast({
          title: "Content required",
          description: "Please enter report content.",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      const result = await createReport(selectedGroupId, currentUser.id, content, taskStatuses, additionalInputs)

      if (result.success && result.report) {
        toast({
          title: "Report created",
          description: "Your report has been created successfully.",
        })
        router.push(`/dashboard/reports/${result.report.id}`)
      } else {
        toast({
          title: "Failed to create report",
          description: result.error || "An error occurred while creating the report.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Failed to create report",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-3xl font-bold">Create a New Report</h1>
      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Report Details</CardTitle>
            <CardDescription>Select a group and enter your report content</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="group">Group</Label>
              <Select value={selectedGroupId} onValueChange={handleGroupChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Report Content</Label>
              <Textarea
                id="content"
                placeholder="Enter your report content here..."
                className="min-h-[200px]"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
            </div>
          </CardContent>
        </Card>

        {selectedGroupId && inputSettings.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Status Fields</CardTitle>
              <CardDescription>Update the status of your tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {inputSettings
                .filter((setting) => setting.field_type === "select")
                .map((setting) => (
                  <div key={setting.id} className="space-y-2">
                    <Label htmlFor={setting.id}>{setting.field_name}</Label>
                    <Select
                      value={taskStatuses[setting.field_name] || "미완료"}
                      onValueChange={(value) => handleTaskStatusChange(setting.field_name, value)}
                    >
                      <SelectTrigger id={setting.id}>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="완료">완료</SelectItem>
                        <SelectItem value="진행중">진행중</SelectItem>
                        <SelectItem value="미완료">미완료</SelectItem>
                        <SelectItem value="연장">연장</SelectItem>
                        <SelectItem value="없음">��음</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
            </CardContent>
          </Card>
        )}

        {selectedGroupId && inputSettings.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
              <CardDescription>Provide additional details for your report</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {inputSettings
                .filter((setting) => setting.field_type === "text")
                .map((setting) => (
                  <div key={setting.id} className="space-y-2">
                    <Label htmlFor={setting.id}>{setting.field_name}</Label>
                    <Input
                      id={setting.id}
                      placeholder={`Enter ${setting.field_name.toLowerCase()}`}
                      value={additionalInputs[setting.field_name] || ""}
                      onChange={(e) => handleAdditionalInputChange(setting.field_name, e.target.value)}
                    />
                  </div>
                ))}
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || !selectedGroupId}>
            {isLoading ? "Creating..." : "Create Report"}
          </Button>
        </div>
      </form>
    </div>
  )
}
