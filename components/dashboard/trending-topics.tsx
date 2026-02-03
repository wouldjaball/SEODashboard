"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUp, ExternalLink, Clock, Target } from "lucide-react"

interface TrendingTopic {
  id: string
  title: string
  category: string
  priority: "high" | "medium" | "low"
  contentOpportunities: string[]
  impact: string
  timeframe: string
  source?: string
}

interface TrendingTopicsProps {
  companyId: string
  companyName: string
}

// Mock trending topics data based on our industry research
const getTrendingTopics = (companyId: string): TrendingTopic[] => {
  const vestigeTopics: TrendingTopic[] = [
    {
      id: "samsara-public-sector-roi",
      title: "Samsara Targets Public Sector with ROI Claims",
      category: "Competitive Threat",
      priority: "high",
      contentOpportunities: [
        "Why Basic Dashcams Aren't Enough for Modern Fleet Safety",
        "Public Sector ROI: AI Cameras vs Traditional Solutions",
        "The Hidden Costs of Reactive Safety Technology"
      ],
      impact: "Direct threat to public sector market share - 89% ROI claims",
      timeframe: "Immediate response needed",
      source: "Fleet Owner Magazine"
    },
    {
      id: "brain-monitoring-fleet-safety",
      title: "Brain-Monitoring Technology Enters Fleet Safety",
      category: "Emerging Technology",
      priority: "medium",
      contentOpportunities: [
        "The Future of Fleet Safety: Beyond What Eyes Can See",
        "Why Camera Systems Need Intelligence Upgrades",
        "Predictive vs Reactive Fleet Safety: The Evolution"
      ],
      impact: "Could make camera-only systems seem outdated",
      timeframe: "6-12 months to market",
      source: "Fleet Owner Technology"
    },
    {
      id: "dot-enforcement-intensifying",
      title: "Federal Safety Enforcement Increases Despite Deregulation",
      category: "Regulatory",
      priority: "high",
      contentOpportunities: [
        "2026 Fleet Compliance: What's Actually Changing",
        "How AI Cameras Simplify DOT Compliance",
        "Regulatory Readiness: Your Fleet Safety Checklist"
      ],
      impact: "Compliance demand driving safety tech adoption",
      timeframe: "Ongoing",
      source: "DOT Updates"
    },
    {
      id: "municipal-body-camera-adoption",
      title: "Municipal Worker Body Camera Programs Expand",
      category: "Market Opportunity",
      priority: "medium",
      contentOpportunities: [
        "Municipal Body Cameras: Beyond Law Enforcement",
        "Worker Protection Technology for Public Utilities",
        "Case Study: How Cities Protect Their Workforce"
      ],
      impact: "$45M market opportunity across 12 cities",
      timeframe: "Q1-Q2 2026 procurements",
      source: "Government Fleet"
    },
    {
      id: "ai-accuracy-improvements",
      title: "Computer Vision Accuracy Reaches 95% for Hazard Detection",
      category: "Technology Advancement",
      priority: "low",
      contentOpportunities: [
        "The AI Revolution in Fleet Safety: Real Numbers",
        "How Modern AI Eliminates False Safety Alerts",
        "Fleet Safety ROI: When Technology Actually Works"
      ],
      impact: "Credibility boost for AI-powered safety solutions",
      timeframe: "Ongoing advantage",
      source: "TechCrunch Transportation"
    }
  ]

  const fasterTopics: TrendingTopic[] = [
    {
      id: "predictive-maintenance-growth",
      title: "Public Sector Predictive Maintenance Adoption Up 34%",
      category: "Market Growth",
      priority: "high",
      contentOpportunities: [
        "The ROI of Predictive Fleet Maintenance in 2026",
        "How Public Fleets Are Cutting Maintenance Costs by 25%",
        "Predictive vs Reactive: The True Cost of Fleet Downtime"
      ],
      impact: "Strong market validation - matches Faster's 22% downtime reduction claims",
      timeframe: "Current trend",
      source: "Fleet Owner Research"
    },
    {
      id: "fleet-consolidation-acquisitions",
      title: "Major Fleet Consolidation: Werner Acquires FirstFleet for $245M",
      category: "Market Dynamics",
      priority: "medium",
      contentOpportunities: [
        "Fleet Consolidation Trend: What It Means for Technology",
        "How Large Fleet Acquisitions Change Maintenance Strategy",
        "Enterprise Fleet Management: Scaling for Growth"
      ],
      impact: "Larger fleets = bigger technology buying decisions",
      timeframe: "Ongoing consolidation trend",
      source: "Fleet Owner M&A"
    },
    {
      id: "government-fleet-funding",
      title: "$200M Federal Funding for Municipal Fleet Safety Upgrades",
      category: "Funding Opportunity",
      priority: "high",
      contentOpportunities: [
        "Federal Fleet Modernization Grants: A Complete Guide",
        "How to Win Government Fleet Technology Contracts",
        "Municipal Fleet ROI: Making the Business Case"
      ],
      impact: "Direct sales opportunity - applications due March 15",
      timeframe: "Immediate - Q1 2026",
      source: "Federal Transportation Funding"
    },
    {
      id: "eld-compliance-volatility",
      title: "ELD Compliance Changes Create Integration Opportunities",
      category: "Regulatory",
      priority: "medium",
      contentOpportunities: [
        "Fleet Compliance in 2026: Beyond Just ELD Requirements",
        "Integrated Fleet Management: Why Point Solutions Fail",
        "The Complete Guide to Fleet Technology Integration"
      ],
      impact: "Integration selling opportunity vs single-purpose tools",
      timeframe: "Ongoing regulatory evolution",
      source: "FMCSA Updates"
    },
    {
      id: "maintenance-software-roi-demands",
      title: "Fleet Managers Demand Measurable Maintenance Software ROI",
      category: "Buyer Behavior",
      priority: "high",
      contentOpportunities: [
        "Fleet Maintenance Software ROI: Real Numbers, Real Results",
        "The Hidden Costs of Manual Fleet Management",
        "Why Public Sector Fleets Choose Faster: Case Studies"
      ],
      impact: "Need competing ROI data against generic solutions",
      timeframe: "Immediate content need",
      source: "Industry Research"
    }
  ]

  // TODO: Implement real trending topics from actual data sources
  // This could come from industry APIs, news feeds, market research databases, etc.
  return []
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "high":
      return "destructive"
    case "medium":
      return "default"
    case "low":
      return "secondary"
    default:
      return "default"
  }
}

const getPriorityIcon = (priority: string) => {
  switch (priority) {
    case "high":
      return "🚨"
    case "medium":
      return "⚡"
    case "low":
      return "📈"
    default:
      return "📊"
  }
}

export function TrendingTopics({ companyId, companyName }: TrendingTopicsProps) {
  const topics = getTrendingTopics(companyId)

  if (topics.length === 0) {
    return null
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          Industry Trending Topics
        </CardTitle>
        <CardDescription>
          Current market trends and content opportunities for {companyName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {topics.map((topic) => (
          <div
            key={topic.id}
            className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{getPriorityIcon(topic.priority)}</span>
                  <h4 className="font-medium leading-tight">{topic.title}</h4>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">
                    {topic.category}
                  </Badge>
                  <Badge variant={getPriorityColor(topic.priority)} className="text-xs">
                    {topic.priority.toUpperCase()}
                  </Badge>
                  {topic.source && (
                    <span className="text-xs text-muted-foreground">
                      Source: {topic.source}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-3">
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Target className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">IMPACT</span>
                </div>
                <p className="text-sm">{topic.impact}</p>
              </div>
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">TIMEFRAME</span>
                </div>
                <p className="text-sm">{topic.timeframe}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1 mb-2">
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">CONTENT OPPORTUNITIES</span>
              </div>
              <div className="grid gap-1">
                {topic.contentOpportunities.map((opportunity, index) => (
                  <div
                    key={index}
                    className="text-sm bg-muted/30 rounded px-3 py-2 hover:bg-muted/50 transition-colors cursor-pointer flex items-center justify-between group"
                  >
                    <span>"{opportunity}"</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-6 px-2 text-xs"
                    >
                      Draft
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
        
        <div className="pt-2 border-t text-center">
          <p className="text-xs text-muted-foreground">
            Updated weekly • Next scan: Tuesday, Feb 4 @ 9:00 AM PST
          </p>
        </div>
      </CardContent>
    </Card>
  )
}