"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Globe, Smartphone, Monitor, Tablet, Users, MapPin, Clock, Briefcase, Building2, TrendingUp } from "lucide-react"

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
  
  // Get LinkedIn demographics data
  const liIndustryDemographics = analytics?.liIndustryDemographics || []
  const liSeniorityDemographics = analytics?.liSeniorityDemographics || []
  const liJobFunctionDemographics = analytics?.liJobFunctionDemographics || []
  const liCompanySizeDemographics = analytics?.liCompanySizeDemographics || []
  
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
  const regionData = gaRegions.slice(0, 8)
    .filter((region: any) => region.country && region.totalUsers > 0)
    .map((region: any) => ({
      country: region.country,
      users: region.totalUsers,
      keyEvents: region.keyEvents || 0
    }))
    .sort((a: any, b: any) => b.users - a.users)

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
    .sort((a: any, b: any) => {
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
        
        {/* Audience Overview */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
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
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{formatNumber(gaRegions.reduce((sum: number, region: any) => sum + region.totalUsers, 0))}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    vs. previous 30 days
                  </p>
                </div>
                <Users className="h-6 w-6 text-green-500" />
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
                        label={({ name, value }: any) => {
                          const total = deviceData.reduce((sum: number, device: any) => sum + device.value, 0)
                          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0
                          return `${name}: ${percentage}%`
                        }}
                      >
                        {deviceData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={deviceColors[index % deviceColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number | undefined) => [formatNumber(value || 0), 'Users']}
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

          {/* Geographic Distribution - Pie Chart */}
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
                    <PieChart>
                      <Pie
                        data={(() => {
                          const sortedCountries = regionData
                            .sort((a: any, b: any) => b.users - a.users)
                            .slice(0, 6)
                          
                          const others = regionData
                            .slice(6)
                            .reduce((sum: number, country: any) => sum + country.users, 0)
                          
                          const pieData = sortedCountries.map((country: any, index: number) => ({
                            name: country.country,
                            value: country.users,
                            keyEvents: country.keyEvents,
                            fill: `hsl(${(index * 60) % 360}, 70%, 50%)`
                          }))
                          
                          if (others > 0) {
                            pieData.push({
                              name: 'Others',
                              value: others,
                              keyEvents: 0,
                              fill: '#8b5cf6'
                            })
                          }
                          
                          return pieData
                        })()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => 
                          (percent && percent > 0.05) ? `${name}: ${(percent * 100).toFixed(0)}%` : ''
                        }
                        outerRadius={80}
                        dataKey="value"
                      >
                        {(() => {
                          const sortedCountries = regionData
                            .sort((a: any, b: any) => b.users - a.users)
                            .slice(0, 6)
                          
                          const colors = sortedCountries.map((_: any, index: number) => 
                            `hsl(${(index * 60) % 360}, 70%, 50%)`
                          )
                          
                          if (regionData.length > 6) {
                            colors.push('#8b5cf6')
                          }
                          
                          return colors.map((color: string, index: number) => (
                            <Cell key={`cell-${index}`} fill={color} />
                          ))
                        })()}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number | undefined, name: string | undefined, props: any) => [
                          `${formatNumber(value || 0)} users`,
                          props.payload.keyEvents > 0 ? `${formatNumber(props.payload.keyEvents)} events` : ''
                        ].filter(Boolean)}
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
                        {genderData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={genderColors[index % genderColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number | undefined) => [formatNumber(value || 0), 'Users']}
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
                        formatter={(value: number | undefined) => [formatNumber(value || 0), 'Users']}
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

        {/* LinkedIn Professional Demographics */}
        {(liIndustryDemographics.length > 0 || liSeniorityDemographics.length > 0) && (
          <div className="mt-6">
            <h4 className="text-md font-semibold mb-4 text-blue-600">LinkedIn Professional Demographics</h4>
            <div className="grid gap-6 lg:grid-cols-2">
              
              {/* Industry Distribution */}
              {liIndustryDemographics.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-blue-600" />
                      Industry Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={liIndustryDemographics.slice(0, 8)}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="segment" 
                            className="text-sm" 
                            tick={{ fontSize: 10 }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis className="text-sm" tick={{ fontSize: 12 }} />
                          <Tooltip 
                            formatter={(value: number | undefined) => [formatNumber(value || 0), 'Followers']}
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--background))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '6px'
                            }}
                          />
                          <Bar 
                            dataKey="value" 
                            fill="#2563eb" 
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Seniority Distribution */}
              {liSeniorityDemographics.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                      Seniority Levels
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={liSeniorityDemographics.slice(0, 6)}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={false}
                          >
                            {liSeniorityDemographics.slice(0, 6).map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={['#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a', '#312e81', '#3730a3'][index]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number | undefined) => [formatNumber(value || 0), 'Followers']}
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

              {/* Job Function Distribution */}
              {liJobFunctionDemographics.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      Job Functions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={liJobFunctionDemographics.slice(0, 6)} layout="horizontal">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis type="number" className="text-sm" tick={{ fontSize: 12 }} />
                          <YAxis 
                            type="category" 
                            dataKey="segment" 
                            className="text-sm" 
                            tick={{ fontSize: 10 }}
                            width={100}
                          />
                          <Tooltip 
                            formatter={(value: number | undefined) => [formatNumber(value || 0), 'Followers']}
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--background))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '6px'
                            }}
                          />
                          <Bar 
                            dataKey="value" 
                            fill="#1d4ed8" 
                            radius={[0, 4, 4, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Company Size Distribution */}
              {liCompanySizeDemographics.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-blue-600" />
                      Company Sizes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={liCompanySizeDemographics.slice(0, 8)}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="segment" 
                            className="text-sm" 
                            tick={{ fontSize: 10 }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis className="text-sm" tick={{ fontSize: 12 }} />
                          <Tooltip 
                            formatter={(value: number | undefined) => [formatNumber(value || 0), 'Followers']}
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--background))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '6px'
                            }}
                          />
                          <Bar 
                            dataKey="value" 
                            fill="#1e40af" 
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}