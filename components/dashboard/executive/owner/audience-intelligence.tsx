"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Globe, Smartphone, Monitor, Tablet, Users, MapPin, Clock } from "lucide-react"

interface AudienceIntelligenceProps {
  analytics: any
  realtime: {
    activeUsers: number
    topPages: Array<{ pagePath: string; activeUsers: number }>
    topReferrers: Array<{ source: string; activeUsers: number }>
  }
}

export function AudienceIntelligence({ analytics, realtime }: AudienceIntelligenceProps) {
  // Get audience data from analytics
  const gaDevices = analytics?.gaDevices || []
  const gaRegions = analytics?.gaRegions || []
  const gaGender = analytics?.gaGender || []
  const gaAge = analytics?.gaAge || []
  
  // Device data formatting
  const deviceData = gaDevices.map((device: any) => ({
    name: device.category.charAt(0).toUpperCase() + device.category.slice(1),
    value: device.totalUsers,
    percentage: 0 // Will be calculated below
  }))
  
  const totalDeviceUsers = deviceData.reduce((sum: number, device: any) => sum + device.value, 0)
  deviceData.forEach((device: any) => {
    device.percentage = totalDeviceUsers > 0 ? (device.value / totalDeviceUsers * 100).toFixed(1) : 0
  })

  // Region data formatting (top 8 countries)
  const regionData = gaRegions.slice(0, 8).map((region: any) => ({
    country: region.country,
    users: region.totalUsers,
    keyEvents: region.keyEvents
  }))

  // Gender data formatting
  const genderData = gaGender
    .filter((g: any) => g.segment && g.segment !== 'unknown' && g.segment !== '(not set)')
    .map((gender: any) => ({
      name: gender.segment.charAt(0).toUpperCase() + gender.segment.slice(1),
      value: gender.totalUsers
    }))

  // Age data formatting
  const ageData = gaAge
    .filter((a: any) => a.segment && a.segment !== 'unknown' && a.segment !== '(not set)')
    .map((age: any) => ({
      name: age.segment,
      value: age.totalUsers
    }))
    .sort((a, b) => {
      // Sort age ranges properly (18-24, 25-34, etc.)
      const parseAge = (str: string) => parseInt(str.split('-')[0])
      return parseAge(a.name) - parseAge(b.name)
    })

  // Colors for charts
  const deviceColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']
  const genderColors = ['#8b5cf6', '#ec4899']
  
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toLocaleString()
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Audience Intelligence</h3>
        
        {/* Real-time Overview */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatNumber(realtime.activeUsers)}
                  </p>
                  <Badge variant="secondary" className="mt-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                    LIVE
                  </Badge>
                </div>
                <Users className="h-6 w-6 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Top Countries</p>
                  <p className="text-2xl font-bold">{regionData.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {regionData[0]?.country || 'No data'} leads
                  </p>
                </div>
                <Globe className="h-6 w-6 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Device Types</p>
                  <p className="text-2xl font-bold">{deviceData.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {deviceData[0]?.name || 'No data'} primary
                  </p>
                </div>
                <Smartphone className="h-6 w-6 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Device Breakdown */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Device Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {deviceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deviceData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percentage }) => `${name}: ${percentage}%`}
                      >
                        {deviceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={deviceColors[index % deviceColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [formatNumber(value), 'Users']}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No device data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Geographic Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Top Countries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {regionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={regionData} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" className="text-sm" tick={{ fontSize: 12 }} />
                      <YAxis 
                        type="category" 
                        dataKey="country" 
                        className="text-sm" 
                        tick={{ fontSize: 12 }}
                        width={80}
                      />
                      <Tooltip 
                        formatter={(value: number) => [formatNumber(value), 'Users']}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px'
                        }}
                      />
                      <Bar 
                        dataKey="users" 
                        fill="#3b82f6" 
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No geographic data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Demographics - Gender */}
          {genderData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Gender Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={genderData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${formatNumber(value)}`}
                      >
                        {genderData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={genderColors[index % genderColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [formatNumber(value), 'Users']}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Demographics - Age */}
          {ageData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Age Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ageData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="name" 
                        className="text-sm" 
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis className="text-sm" tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value: number) => [formatNumber(value), 'Users']}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px'
                        }}
                      />
                      <Bar 
                        dataKey="value" 
                        fill="#10b981" 
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Real-time Activity */}
        <div className="grid gap-6 lg:grid-cols-2 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Top Active Pages
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                  LIVE
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {realtime.topPages.length > 0 ? (
                  realtime.topPages.map((page, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="truncate flex-1">
                        <p className="text-sm font-medium truncate">{page.pagePath}</p>
                      </div>
                      <Badge variant="secondary">
                        {page.activeUsers} users
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No active pages data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top Traffic Sources
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                  LIVE
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {realtime.topReferrers.length > 0 ? (
                  realtime.topReferrers.map((referrer, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="truncate flex-1">
                        <p className="text-sm font-medium truncate">{referrer.source}</p>
                      </div>
                      <Badge variant="secondary">
                        {referrer.activeUsers} users
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No traffic source data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}