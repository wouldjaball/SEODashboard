"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle } from "lucide-react"
import { useCompany } from "@/lib/company-context"

export function LinkedInDebugInfo() {
  const { company } = useCompany()

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          LinkedIn Debug Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {company.liVisitorMetrics ? (
                <CheckCircle className="h-3 w-3 text-green-500" />
              ) : (
                <AlertCircle className="h-3 w-3 text-red-500" />
              )}
              <span>Visitor Metrics</span>
              {company.liVisitorMetrics && (
                <Badge variant="secondary" className="text-xs">
                  {company.liVisitorMetrics.uniqueVisitors} visitors
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {company.liFollowerMetrics ? (
                <CheckCircle className="h-3 w-3 text-green-500" />
              ) : (
                <AlertCircle className="h-3 w-3 text-red-500" />
              )}
              <span>Follower Metrics</span>
              {company.liFollowerMetrics && (
                <Badge variant="secondary" className="text-xs">
                  {company.liFollowerMetrics.newFollowers} new
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {company.liContentMetrics ? (
                <CheckCircle className="h-3 w-3 text-green-500" />
              ) : (
                <AlertCircle className="h-3 w-3 text-red-500" />
              )}
              <span>Content Metrics</span>
              {company.liContentMetrics && (
                <Badge variant="secondary" className="text-xs">
                  {company.liContentMetrics.impressions} impressions
                </Badge>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">Data Source:</span>
              <Badge variant={company.liError ? "destructive" : "default"}>
                {company.liError ? "Error" : (company.liDataSource || "Unknown")}
              </Badge>
            </div>
            
            {company.liError && (
              <div className="text-red-600 text-xs font-mono">
                {company.liError}
              </div>
            )}
            
            {company.liErrorType && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Error Type:</span>
                <Badge variant="destructive" className="text-xs">
                  {company.liErrorType}
                </Badge>
              </div>
            )}
          </div>
        </div>
        
        <div className="border-t pt-3 mt-3">
          <div className="text-xs text-gray-600 space-y-1">
            <div>💡 <strong>If no data showing:</strong></div>
            <div>1. Check LinkedIn page mapping in Integrations</div>
            <div>2. Verify OAuth tokens aren't expired</div>
            <div>3. Check if cron job ran recently</div>
            <div>4. Look for API errors in server logs</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}