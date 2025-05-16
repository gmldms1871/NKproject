"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { getReportDetails, updateReport, deleteReport } from "@/lib/reports"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import type { Report, UndefinedInput, InputSetting, User } from "@/types"
import { ArrowLeft, Check, Trash } from "lucide-react"

export default function ReportDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { toast } = useToast()
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    const fetchReportDetails = async () => {
      try {
        const result = await getReportDetails(params.id)
        if (result.success && result.report) {
          setReport(result.report)
        } else {
          toast({
            title: "Error",
            description: "Failed to load report details.",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error fetching report details:", error)
        toast({
          title: "Error",
          description: "An unexpected error occurred.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchReportDetails()
    }
  }, [params.id, toast])

  const handleMarkAsReviewed = async () => {
    if (!report) return

    setIsUpdating(true)
    try {
      const result = await updateReport(report.id, { reviewed: true })
      if (result.success) {
        setReport({ ...report, reviewed: true })
        toast({
          title: "Report updated",
          description: "Report has been marked as reviewed.",
        })
      } else {
        toast({
          title: "Update failed",
          description: result.error || "Failed to update report status.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating report:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteReport = async () => {
    if (!report) return

    if (!window.confirm("Are you sure you want to delete this report? This action cannot be undone.")) {
      return
    }

    setIsDeleting(true)
    try {
      const result = await deleteReport(report.id)
      if (result.success) {
        toast({
          title: "Report deleted",
          description: "Report has been deleted successfully.",
        })
        router.push("/dashboard/reports")
      } else {
        toast({
          title: "Delete failed",
          description: result.error || "Failed to delete report.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting report:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-2xl font-bold">Report not found</h1>
        <p className="mt-2 text-muted-foreground">
          The report you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/reports">Back to Reports</Link>
        </Button>
      </div>
    )
  }

  // Group inputs by field type
  const statusInputs: UndefinedInput[] = []
  const textInputs: UndefinedInput[] = []

  report.undefined_inputs?.forEach((input) => {
    const field = input.field as unknown as InputSetting
    if (field?.field_type === "select") {
      statusInputs.push(input)
    } else {
      textInputs.push(input)
    }
  })

  const author = report.author as unknown as User

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Report Details</h1>
        </div>
        <div className="flex space-x-2">
          {!report.reviewed && (
            <Button variant="outline" onClick={handleMarkAsReviewed} disabled={isUpdating}>
              <Check className="mr-2 h-4 w-4" />
              Mark as Reviewed
            </Button>
          )}
          <Button variant="destructive" onClick={handleDeleteReport} disabled={isDeleting}>
            <Trash className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Report Summary</CardTitle>
              <CardDescription>Created on {new Date(report.created_at).toLocaleString()}</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                {author?.name?.charAt(0) || author?.email?.charAt(0) || "U"}
              </div>
              <div>
                <p className="text-sm font-medium">{author?.name || "Unknown User"}</p>
                <p className="text-xs text-muted-foreground">{author?.email}</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {report.summary && (
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm italic">{report.summary}</p>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-lg font-medium">Status</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {statusInputs.length > 0 ? (
                statusInputs.map((input) => {
                  const field = input.field as unknown as InputSetting
                  return (
                    <div key={input.id} className="flex items-center justify-between rounded-md border p-3">
                      <span className="font-medium">{field?.field_name}</span>
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          input.value === "완료"
                            ? "bg-green-100 text-green-800"
                            : input.value === "진행중"
                              ? "bg-blue-100 text-blue-800"
                              : input.value === "미완료"
                                ? "bg-red-100 text-red-800"
                                : input.value === "연장"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {input.value}
                      </span>
                    </div>
                  )
                })
              ) : (
                <p className="text-sm text-muted-foreground">No status information available.</p>
              )}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h3 className="text-lg font-medium">Additional Information</h3>
            <div className="space-y-4">
              {textInputs.length > 0 ? (
                textInputs.map((input) => {
                  const field = input.field as unknown as InputSetting
                  return (
                    <div key={input.id} className="space-y-1">
                      <h4 className="text-sm font-medium">{field?.field_name}</h4>
                      <p className="rounded-md border p-3 text-sm">{input.value || "N/A"}</p>
                    </div>
                  )
                })
              ) : (
                <p className="text-sm text-muted-foreground">No additional information available.</p>
              )}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h3 className="text-lg font-medium">Full Report</h3>
            <div className="rounded-md border p-4">
              <div className="prose max-w-none">
                {report.content.split("\n").map((paragraph, index) => (
                  <p key={index} className="mb-4 last:mb-0">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
