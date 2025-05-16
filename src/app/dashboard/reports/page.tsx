"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { getReports } from "@/lib/reports"
import { getCurrentUser, getUserGroups } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import type { Group, Report, User } from "@/types"
import { FileText, Plus, Search } from "lucide-react"

export default function ReportsPage() {
  const { toast } = useToast()
  const [reports, setReports] = useState<Report[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const currentUser = await getCurrentUser()
        if (currentUser) {
          const userGroups = await getUserGroups(currentUser.id)
          const formattedGroups = userGroups.map((membership: any) => membership.groups) as Group[]
          setGroups(formattedGroups)

          if (formattedGroups.length > 0) {
            setSelectedGroupId(formattedGroups[0].id)
            fetchReports(formattedGroups[0].id)
          } else {
            setLoading(false)
          }
        }
      } catch (error) {
        console.error("Error fetching groups:", error)
        toast({
          title: "Error",
          description: "Failed to load your groups. Please try again.",
          variant: "destructive",
        })
        setLoading(false)
      }
    }

    fetchGroups()
  }, [toast])

  const fetchReports = async (groupId: string) => {
    setLoading(true)
    try {
      const result = await getReports(groupId, {
        search: searchQuery,
      })

      if (result.success) {
        setReports(result.reports || [])
      } else {
        toast({
          title: "Error",
          description: "Failed to load reports. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching reports:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGroupChange = (groupId: string) => {
    setSelectedGroupId(groupId)
    fetchReports(groupId)
  }

  const handleSearch = () => {
    if (selectedGroupId) {
      fetchReports(selectedGroupId)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <Link href="/dashboard/reports/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Report
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Reports</CardTitle>
          <CardDescription>Select a group and search for specific reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex-1">
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
            <div className="flex flex-1 gap-2">
              <Input
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button variant="outline" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      ) : reports.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => {
            const author = report.author as unknown as User
            return (
              <Link key={report.id} href={`/dashboard/reports/${report.id}`}>
                <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="line-clamp-1 text-base">{report.summary || "Report"}</CardTitle>
                      {report.reviewed ? (
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">Reviewed</span>
                      ) : (
                        <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-800">Pending</span>
                      )}
                    </div>
                    <CardDescription>{new Date(report.created_at).toLocaleDateString()}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-2 line-clamp-3 text-sm text-muted-foreground">{report.content}</div>
                    <div className="flex items-center space-x-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs">
                        {author?.name?.charAt(0) || author?.email?.charAt(0) || "U"}
                      </div>
                      <span className="text-xs text-muted-foreground">{author?.name || "Unknown User"}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Reports Found</CardTitle>
            <CardDescription>
              {selectedGroupId ? "No reports found for the selected group." : "Please select a group to view reports."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-4 text-center text-muted-foreground">
              {selectedGroupId
                ? "Create your first report to get started."
                : "Join or create a group to start creating reports."}
            </p>
            {selectedGroupId && (
              <Link href={`/dashboard/reports/create?groupId=${selectedGroupId}`}>
                <Button>Create Report</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
