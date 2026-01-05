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
import { formatNumber, formatPercent } from "@/lib/utils"
import type { GSCCountry } from "@/lib/types"

interface CountryPerformanceMapProps {
  data: GSCCountry[]
}

export function CountryPerformanceMap({ data }: CountryPerformanceMapProps) {
  const totalImpressions = data.reduce((sum, c) => sum + c.impressions, 0)

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Country Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Country</TableHead>
              <TableHead className="text-right">Impressions</TableHead>
              <TableHead className="text-right">Clicks</TableHead>
              <TableHead className="text-right">CTR</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.slice(0, 10).map((country) => (
              <TableRow key={country.countryCode}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getCountryFlag(country.countryCode)}</span>
                    {country.country}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(country.impressions)}
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(country.clicks)}
                </TableCell>
                <TableCell className="text-right">
                  {formatPercent(country.ctr)}
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
