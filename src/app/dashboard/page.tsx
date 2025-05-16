"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { getCurrentUser, getUserGroups } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Group } from "@/types"
import { BarChart3, FileText, Plus, Users } from "lucide-react"

export default function DashboardPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const currentUser = await getCurrentUser()
        if (currentUser) {
          const userGroups = await getUserGroups(currentUser.id)
          const formattedGroups = userGroups.map((membership: any) => membership.groups) as Group[]
          setGroups(formattedGroups)
        }
      } catch (error) {
        console.error("Error fetching groups:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchGroups()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/groups/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Group
            </Button>
          </Link>
        </div>
      </div>
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
          <TabsTrigger value="reports">Recent Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Groups</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{loading ? "..." : groups.length}</div>
                <p className="text-xs text-muted-foreground">Groups you are a member of</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Reports</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">Reports in the last 7 days</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Statistics</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">View detailed statistics</p>
              </CardContent>
              <CardFooter>
                <Link href="/dashboard/statistics" className="w-full">
                  <Button variant="outline" className="w-full">
                    View Statistics
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="groups" className="space-y-4">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : groups.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {groups.map((group) => (
                <Card key={group.id}>
                  <CardHeader>
                    <CardTitle>{group.name}</CardTitle>
                    <CardDescription>Created on {new Date(group.created_at).toLocaleDateString()}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {group.owner_id === getCurrentUser()?.id ? "You are the owner" : "You are a member"}
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Link href={`/dashboard/groups/${group.id}`} className="w-full">
                      <Button variant="outline" className="w-full">
                        View Group
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
              <Card className="flex h-full flex-col items-center justify-center p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Plus className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-medium">Create a new group</h3>
                <p className="mb-4 mt-2 text-center text-sm text-muted-foreground">
                  Create a new group to manage reports and tasks
                </p>
                <Link href="/dashboard/groups/create" className="w-full">
                  <Button className="w-full">Create Group</Button>
                </Link>
              </Card>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Groups Found</CardTitle>
                <CardDescription>You are not a member of any groups yet.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Create a new group to get started or wait for an invitation.
                </p>
              </CardContent>
              <CardFooter>
                <Link href="/dashboard/groups/create" className="w-full">
                  <Button className="w-full">Create Group</Button>
                </Link>
              </CardFooter>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Reports</CardTitle>
              <CardDescription>Your recent reports across all groups</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No recent reports found. Create a new report to get started.
              </p>
            </CardContent>
            <CardFooter>
              <Link href="/dashboard/reports/create" className="w-full">
                <Button className="w-full">Create Report</Button>
              </Link>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
