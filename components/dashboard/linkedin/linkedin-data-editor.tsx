"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Save, Edit3, X, Info } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type {
  LIVisitorMetrics,
  LIFollowerMetrics,
  LIContentMetrics,
  LIVisitorDaily,
  LIDemographic,
  LIUpdate,
  LIFollowerDaily,
  LIImpressionDaily,
} from "@/lib/types"

interface ManualLinkedInData {
  visitorMetrics: LIVisitorMetrics
  followerMetrics: LIFollowerMetrics
  contentMetrics: LIContentMetrics
  visitorDaily: LIVisitorDaily[]
  followerDaily: LIFollowerDaily[]
  impressionDaily: LIImpressionDaily[]
  industryDemographics: LIDemographic[]
  seniorityDemographics: LIDemographic[]
  jobFunctionDemographics: LIDemographic[]
  companySizeDemographics: LIDemographic[]
  updates: LIUpdate[]
}

interface LinkedInDataEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
  companyName: string
  dateRange: { from: Date; to: Date }
  currentData?: Partial<ManualLinkedInData>
  onSave: (data: ManualLinkedInData) => Promise<void>
}

export function LinkedInDataEditor({
  open,
  onOpenChange,
  companyId,
  companyName,
  dateRange,
  currentData,
  onSave
}: LinkedInDataEditorProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("visitor")
  
  // Form state
  const [visitorMetrics, setVisitorMetrics] = useState<LIVisitorMetrics>(
    currentData?.visitorMetrics || {
      pageViews: 0,
      uniqueVisitors: 0,
      customButtonClicks: 0,
      previousPeriod: {
        pageViews: 0,
        uniqueVisitors: 0,
        customButtonClicks: 0
      }
    }
  )

  const [followerMetrics, setFollowerMetrics] = useState<LIFollowerMetrics>(
    currentData?.followerMetrics || {
      totalFollowers: 0,
      newFollowers: 0,
      previousPeriod: {
        totalFollowers: 0,
        newFollowers: 0
      }
    }
  )

  const [contentMetrics, setContentMetrics] = useState<LIContentMetrics>(
    currentData?.contentMetrics || {
      reactions: 0,
      comments: 0,
      reposts: 0,
      previousPeriod: {
        reactions: 0,
        comments: 0,
        reposts: 0
      }
    }
  )

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const data: ManualLinkedInData = {
        visitorMetrics,
        followerMetrics,
        contentMetrics,
        visitorDaily: currentData?.visitorDaily || [],
        followerDaily: currentData?.followerDaily || [],
        impressionDaily: currentData?.impressionDaily || [],
        industryDemographics: currentData?.industryDemographics || [],
        seniorityDemographics: currentData?.seniorityDemographics || [],
        jobFunctionDemographics: currentData?.jobFunctionDemographics || [],
        companySizeDemographics: currentData?.companySizeDemographics || [],
        updates: currentData?.updates || []
      }
      
      await onSave(data)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save LinkedIn data:', error)
      alert('Failed to save data. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Edit LinkedIn Data - {companyName}
          </DialogTitle>
          <DialogDescription>
            Manually input LinkedIn analytics data for the period{" "}
            {dateRange.from.toLocaleDateString()} to {dateRange.to.toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
            <strong>Manual Data Override:</strong> This data will override any LinkedIn API data 
            for this company and date range. Leave fields at 0 if no data is available.
          </AlertDescription>
        </Alert>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="visitor">Page Metrics</TabsTrigger>
            <TabsTrigger value="follower">Followers</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
          </TabsList>

          {/* Visitor/Page Metrics Tab */}
          <TabsContent value="visitor" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Page Visitor Metrics</CardTitle>
                <CardDescription>LinkedIn page views, unique visitors, and button clicks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Current Period</h4>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="pageViews">Page Views</Label>
                        <Input
                          id="pageViews"
                          type="number"
                          min="0"
                          value={visitorMetrics.pageViews}
                          onChange={(e) => setVisitorMetrics(prev => ({
                            ...prev,
                            pageViews: parseInt(e.target.value) || 0
                          }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="uniqueVisitors">Unique Visitors</Label>
                        <Input
                          id="uniqueVisitors"
                          type="number"
                          min="0"
                          value={visitorMetrics.uniqueVisitors}
                          onChange={(e) => setVisitorMetrics(prev => ({
                            ...prev,
                            uniqueVisitors: parseInt(e.target.value) || 0
                          }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="customButtonClicks">Custom Button Clicks</Label>
                        <Input
                          id="customButtonClicks"
                          type="number"
                          min="0"
                          value={visitorMetrics.customButtonClicks}
                          onChange={(e) => setVisitorMetrics(prev => ({
                            ...prev,
                            customButtonClicks: parseInt(e.target.value) || 0
                          }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Previous Period (for comparison)</h4>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="prevPageViews">Previous Page Views</Label>
                        <Input
                          id="prevPageViews"
                          type="number"
                          min="0"
                          value={visitorMetrics.previousPeriod?.pageViews || 0}
                          onChange={(e) => setVisitorMetrics(prev => ({
                            ...prev,
                            previousPeriod: {
                              ...prev.previousPeriod!,
                              pageViews: parseInt(e.target.value) || 0
                            }
                          }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="prevUniqueVisitors">Previous Unique Visitors</Label>
                        <Input
                          id="prevUniqueVisitors"
                          type="number"
                          min="0"
                          value={visitorMetrics.previousPeriod?.uniqueVisitors || 0}
                          onChange={(e) => setVisitorMetrics(prev => ({
                            ...prev,
                            previousPeriod: {
                              ...prev.previousPeriod!,
                              uniqueVisitors: parseInt(e.target.value) || 0
                            }
                          }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="prevCustomButtonClicks">Previous Custom Button Clicks</Label>
                        <Input
                          id="prevCustomButtonClicks"
                          type="number"
                          min="0"
                          value={visitorMetrics.previousPeriod?.customButtonClicks || 0}
                          onChange={(e) => setVisitorMetrics(prev => ({
                            ...prev,
                            previousPeriod: {
                              ...prev.previousPeriod!,
                              customButtonClicks: parseInt(e.target.value) || 0
                            }
                          }))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Follower Metrics Tab */}
          <TabsContent value="follower" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Follower Metrics</CardTitle>
                <CardDescription>LinkedIn page follower growth and totals</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Current Period</h4>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="totalFollowers">Total Followers</Label>
                        <Input
                          id="totalFollowers"
                          type="number"
                          min="0"
                          value={followerMetrics.totalFollowers}
                          onChange={(e) => setFollowerMetrics(prev => ({
                            ...prev,
                            totalFollowers: parseInt(e.target.value) || 0
                          }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="newFollowers">New Followers (in period)</Label>
                        <Input
                          id="newFollowers"
                          type="number"
                          min="0"
                          value={followerMetrics.newFollowers}
                          onChange={(e) => setFollowerMetrics(prev => ({
                            ...prev,
                            newFollowers: parseInt(e.target.value) || 0
                          }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Previous Period (for comparison)</h4>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="prevTotalFollowers">Previous Total Followers</Label>
                        <Input
                          id="prevTotalFollowers"
                          type="number"
                          min="0"
                          value={followerMetrics.previousPeriod?.totalFollowers || 0}
                          onChange={(e) => setFollowerMetrics(prev => ({
                            ...prev,
                            previousPeriod: {
                              ...prev.previousPeriod!,
                              totalFollowers: parseInt(e.target.value) || 0
                            }
                          }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="prevNewFollowers">Previous New Followers</Label>
                        <Input
                          id="prevNewFollowers"
                          type="number"
                          min="0"
                          value={followerMetrics.previousPeriod?.newFollowers || 0}
                          onChange={(e) => setFollowerMetrics(prev => ({
                            ...prev,
                            previousPeriod: {
                              ...prev.previousPeriod!,
                              newFollowers: parseInt(e.target.value) || 0
                            }
                          }))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Metrics Tab */}
          <TabsContent value="content" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Content Engagement Metrics</CardTitle>
                <CardDescription>LinkedIn post reactions, comments, and reposts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Current Period</h4>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="reactions">Total Reactions</Label>
                        <Input
                          id="reactions"
                          type="number"
                          min="0"
                          value={contentMetrics.reactions}
                          onChange={(e) => setContentMetrics(prev => ({
                            ...prev,
                            reactions: parseInt(e.target.value) || 0
                          }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="comments">Total Comments</Label>
                        <Input
                          id="comments"
                          type="number"
                          min="0"
                          value={contentMetrics.comments}
                          onChange={(e) => setContentMetrics(prev => ({
                            ...prev,
                            comments: parseInt(e.target.value) || 0
                          }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="reposts">Total Reposts/Shares</Label>
                        <Input
                          id="reposts"
                          type="number"
                          min="0"
                          value={contentMetrics.reposts}
                          onChange={(e) => setContentMetrics(prev => ({
                            ...prev,
                            reposts: parseInt(e.target.value) || 0
                          }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Previous Period (for comparison)</h4>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="prevReactions">Previous Reactions</Label>
                        <Input
                          id="prevReactions"
                          type="number"
                          min="0"
                          value={contentMetrics.previousPeriod?.reactions || 0}
                          onChange={(e) => setContentMetrics(prev => ({
                            ...prev,
                            previousPeriod: {
                              ...prev.previousPeriod!,
                              reactions: parseInt(e.target.value) || 0
                            }
                          }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="prevComments">Previous Comments</Label>
                        <Input
                          id="prevComments"
                          type="number"
                          min="0"
                          value={contentMetrics.previousPeriod?.comments || 0}
                          onChange={(e) => setContentMetrics(prev => ({
                            ...prev,
                            previousPeriod: {
                              ...prev.previousPeriod!,
                              comments: parseInt(e.target.value) || 0
                            }
                          }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="prevReposts">Previous Reposts</Label>
                        <Input
                          id="prevReposts"
                          type="number"
                          min="0"
                          value={contentMetrics.previousPeriod?.reposts || 0}
                          onChange={(e) => setContentMetrics(prev => ({
                            ...prev,
                            previousPeriod: {
                              ...prev.previousPeriod!,
                              reposts: parseInt(e.target.value) || 0
                            }
                          }))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save LinkedIn Data
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}