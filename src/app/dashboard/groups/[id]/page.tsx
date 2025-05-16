"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { getGroupDetails, getGroupMembers } from "@/lib/groups"
import { getCurrentUser, getUserRole } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Group, GroupMember, User, UserRole } from "@/types"
import { FileText, Plus, Settings, Users } from "lucide-react"

export default function GroupPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchGroupData = async () => {
      try {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          router.push("/login")
          return
        }

        // Get group details
        const groupResult = await getGroupDetails(params.id)
        if (!groupResult.success) {
          throw new Error(groupResult.error || "Failed to fetch group details")
        }
        setGroup(groupResult.group)

        // Get group members
        const membersResult = await getGroupMembers(params.id)
        if (!membersResult.success) {
          throw new Error(membersResult.error || "Failed to fetch group members")
        }
        setMembers(membersResult.members)

        // Get user's role in the group
        const role = await getUserRole(currentUser.id, params.id)
        setUserRole(role as UserRole)
      } catch (error) {
        console.error("Error fetching group data:", error)
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchGroupData()
    }
  }, [params.id, router])

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-2xl font-bold">Group not found</h1>
        <p className="mt-2 text-muted-foreground">
          The group you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/groups">Back to Groups</Link>
        </Button>
      </div>
    )
  }

  const isAdmin = userRole === "ceo" || userRole === "manager"

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{group.name}</h1>
          <p className="text-muted-foreground">Created on {new Date(group.created_at).toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link href={`/dashboard/groups/${params.id}/invite`}>
              <Button variant="outline">
                <Users className="mr-2 h-4 w-4" />
                Invite Members
              </Button>
            </Link>
          )}
          <Link href={`/dashboard/reports/create?groupId=${params.id}`}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Report
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          {isAdmin && <TabsTrigger value="settings">Settings</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{members.length}</div>
                <p className="text-xs text-muted-foreground">Active members in this group</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Reports</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">Total reports in this group</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Settings</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isAdmin ? "Admin Access" : "Member Access"}</div>
                <p className="text-xs text-muted-foreground">Your role: {userRole || "Member"}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Group Members</CardTitle>
              <CardDescription>Members of {group.name} and their roles</CardDescription>
            </CardHeader>
            <CardContent>
              {members.length > 0 ? (
                <div className="space-y-4">
                  {members.map((member) => {
                    const user = member.users as unknown as User
                    return (
                      <div key={member.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                            {user?.name?.charAt(0) || user?.email?.charAt(0) || "U"}
                          </div>
                          <div>
                            <p className="font-medium">{user?.name || "Unknown User"}</p>
                            <p className="text-sm text-muted-foreground">{user?.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="rounded-full bg-muted px-3 py-1 text-xs">{member.role}</span>
                          {isAdmin && member.user_id !== getCurrentUser()?.id && (
                            <Button variant="outline" size="sm">
                              Manage
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground">No members found.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Group Reports</CardTitle>
              <CardDescription>Reports created in {group.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No reports found. Create a new report to get started.</p>
              <div className="mt-4">
                <Link href={`/dashboard/reports/create?groupId=${params.id}`}>
                  <Button>Create Report</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Group Settings</CardTitle>
                <CardDescription>Manage settings for {group.name}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="mb-2 text-lg font-medium">Input Settings</h3>
                  <p className="text-sm text-muted-foreground">Configure the input fields for reports in this group.</p>
                  <Link href={`/dashboard/groups/${params.id}/settings/inputs`}>
                    <Button variant="outline" className="mt-2">
                      Manage Input Settings
                    </Button>
                  </Link>
                </div>
                <div>
                  <h3 className="mb-2 text-lg font-medium">Group Information</h3>
                  <p className="text-sm text-muted-foreground">Update group name and other details.</p>
                  <Link href={`/dashboard/groups/${params.id}/settings`}>
                    <Button variant="outline" className="mt-2">
                      Edit Group
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
