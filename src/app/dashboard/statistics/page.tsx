"use client"

import { useEffect, useState } from "react"
import { getReportStatistics, getMonthlyTrends } from "@/lib/statistics"
import { getUserGroups, getCurrentUser } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import type { Group, ReportStatistics, MonthlyTrend } from "@/types"
import { BarChart, BarChart3, PieChart } from "lucide-react"

export default function StatisticsPage() {
  const { toast } = useToast()
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string>("")
  const [period, setPeriod] = useState<"day" | "week" | "month" | "year">("week")
  const [statistics, setStatistics] = useState<ReportStatistics | null>(null)
  const [trends, setTrends] = useState<MonthlyTrend[]>([])
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
            fetchStatistics(formattedGroups[0].id, period)
            fetchTrends(formattedGroups[0].id)
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
  }, [toast, period])

  const fetchStatistics = async (groupId: string, timePeriod: "day" | "week" | "month" | "year") => {
    setLoading(true)
    try {
      const result = await getReportStatistics(groupId, timePeriod)

      if (result.success) {
        setStatistics(result.statistics)
      } else {
        toast({
          title: "Error",
          description: "Failed to load statistics. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching statistics:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchTrends = async (groupId: string) => {
    try {
      const result = await getMonthlyTrends(groupId, 6)

      if (result.success) {
        setTrends(result.trends)
      } else {
        console.error("Failed to load trends:", result.error)
      }
    } catch (error) {
      console.error("Error fetching trends:", error)
    }
  }

  const handleGroupChange = (groupId: string) => {
    setSelectedGroupId(groupId)
    fetchStatistics(groupId, period)
    fetchTrends(groupId)
  }

  const handlePeriodChange = (newPeriod: "day" | "week" | "month" | "year") => {
    setPeriod(newPeriod)
    if (selectedGroupId) {
      fetchStatistics(selectedGroupId, newPeriod)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-3xl font-bold tracking-tight">Statistics</h1>
        <div className="flex items-center gap-2">
          <Select value={selectedGroupId} onValueChange={handleGroupChange}>
            <SelectTrigger className="w-[180px]">
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
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={period === "day" ? "default" : "outline"} onClick={() => handlePeriodChange("day")}>
          Day
        </Button>
        <Button variant={period === "week" ? "default" : "outline"} onClick={() => handlePeriodChange("week")}>
          Week
        </Button>
        <Button variant={period === "month" ? "default" : "outline"} onClick={() => handlePeriodChange("month")}>
          Month
        </Button>
        <Button variant={period === "year" ? "default" : "outline"} onClick={() => handlePeriodChange("year")}>
          Year
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : statistics ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
                  <BarChart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statistics.totalReports}</div>
                  <p className="text-xs text-muted-foreground">Reports in the selected period</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                  <PieChart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statistics.totalReports > 0
                      ? Math.round(((statistics.statusCounts["완료"] || 0) / statistics.totalReports) * 100)
                      : 0}
                    %
                  </div>
                  <p className="text-xs text-muted-foreground">Tasks marked as completed</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Teachers</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Object.keys(statistics.teacherStats).length}</div>
                  <p className="text-xs text-muted-foreground">Teachers who submitted reports</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Statistics Available</CardTitle>
                <CardDescription>
                  {selectedGroupId
                    ? "No statistics found for the selected group."
                    : "Please select a group to view statistics."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Create reports to start generating statistics.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : statistics ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Status Distribution</CardTitle>
                  <CardDescription>Distribution of task statuses</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(statistics.statusCounts).map(([status, count]) => (
                      <div key={status} className="flex items-center">
                        <div className="w-40 text-sm font-medium">{status}</div>
                        <div className="flex-1">
                          <div className="h-2 w-full rounded-full bg-muted">
                            <div
                              className={`h-2 rounded-full ${
                                status === "완료"
                                  ? "bg-green-500"
                                  : status === "진행중"
                                    ? "bg-blue-500"
                                    : status === "미완료"
                                      ? "bg-red-500"
                                      : status === "연장"
                                        ? "bg-yellow-500"
                                        : "bg-gray-500"
                              }`}
                              style={{
                                width: `${statistics.totalReports > 0 ? (count / statistics.totalReports) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div className="ml-4 w-12 text-right text-sm">{count}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Teacher Performance</CardTitle>
                  <CardDescription>Reports submitted by teachers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(statistics.teacherStats).map(([teacher, stats]) => (
                      <div key={teacher} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{teacher}</div>
                          <div className="text-sm text-muted-foreground">{stats.total} reports</div>
                        </div>
                        <div className="flex h-2 space-x-1 rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-green-500"
                            style={{
                              width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%`,
                            }}
                          />
                          <div
                            className="h-2 rounded-full bg-blue-500"
                            style={{
                              width: `${stats.total > 0 ? (stats.inProgress / stats.total) * 100 : 0}%`,
                            }}
                          />
                          <div
                            className="h-2 rounded-full bg-red-500"
                            style={{
                              width: `${stats.total > 0 ? (stats.incomplete / stats.total) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <div>Completed: {stats.completed}</div>
                          <div>In Progress: {stats.inProgress}</div>
                          <div>Incomplete: {stats.incomplete}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Status Data Available</CardTitle>
                <CardDescription>No status data found for the selected group and period.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Create reports with status updates to see this data.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : trends.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Monthly Trends</CardTitle>
                <CardDescription>Report submission trends over the past 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <div className="flex h-full flex-col">
                    <div className="flex flex-1 items-end space-x-2">
                      {trends.map((trend) => (
                        <div key={trend.month} className="flex h-full flex-1 flex-col justify-end">
                          <div className="space-y-1">
                            <div
                              className="w-full rounded-t bg-green-500"
                              style={{
                                height: `${(trend.completed / Math.max(...trends.map((t) => t.reports))) * 100}%`,
                              }}
                            />
                            <div
                              className="w-full rounded-t bg-blue-500"
                              style={{
                                height: `${(trend.inProgress / Math.max(...trends.map((t) => t.reports))) * 100}%`,
                              }}
                            />
                            <div
                              className="w-full rounded-t bg-red-500"
                              style={{
                                height: `${(trend.incomplete / Math.max(...trends.map((t) => t.reports))) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex space-x-2">
                      {trends.map((trend) => (
                        <div key={trend.month} className="flex-1 text-center text-xs">
                          {trend.month}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex justify-center space-x-4">
                  <div className="flex items-center">
                    <div className="mr-1 h-3 w-3 rounded-full bg-green-500" />
                    <span className="text-xs">Completed</span>
                  </div>
                  <div className="flex items-center">
                    <div className="mr-1 h-3 w-3 rounded-full bg-blue-500" />
                    <span className="text-xs">In Progress</span>
                  </div>
                  <div className="flex items-center">
                    <div className="mr-1 h-3 w-3 rounded-full bg-red-500" />
                    <span className="text-xs">Incomplete</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Trend Data Available</CardTitle>
                <CardDescription>No trend data found for the selected group.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Create reports over time to see trend data.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
