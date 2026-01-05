"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatNumber } from "@/lib/utils"
import type { GARegion } from "@/lib/types"

interface RegionMapProps {
  data: GARegion[]
}

export function RegionMap({ data }: RegionMapProps) {
  // For simplicity, we're using a table view of regions
  // A full implementation would use react-simple-maps
  const totalUsers = data.reduce((sum, r) => sum + r.totalUsers, 0)

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Region Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Country</TableHead>
              <TableHead className="text-right">Users</TableHead>
              <TableHead className="text-right">Key Events</TableHead>
              <TableHead className="text-right">% of Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.slice(0, 10).map((region) => (
              <TableRow key={region.countryCode}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getCountryFlag(region.countryCode)}</span>
                    {region.country}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(region.totalUsers)}
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(region.keyEvents, { suffix: false })}
                </TableCell>
                <TableCell className="text-right">
                  {((region.totalUsers / totalUsers) * 100).toFixed(1)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function getCountryFlag(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}
