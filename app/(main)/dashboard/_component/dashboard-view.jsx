"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  BriefcaseIcon,
  LineChart,
  TrendingUp,
  TrendingDown,
  Brain,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const DashboardView = ({ insights }) => {
  const usdFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  const inrFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
  const safeInsights = {
    salaryRanges: Array.isArray(insights?.salaryRanges) ? insights.salaryRanges : [],
    growthRate: Number.isFinite(Number(insights?.growthRate))
      ? Number(insights.growthRate)
      : 0,
    demandLevel:
      typeof insights?.demandLevel === "string" && insights.demandLevel
        ? insights.demandLevel
        : "Medium",
    topSkills: Array.isArray(insights?.topSkills) ? insights.topSkills : [],
    marketOutlook:
      typeof insights?.marketOutlook === "string" && insights.marketOutlook
        ? insights.marketOutlook
        : "Neutral",
    keyTrends: Array.isArray(insights?.keyTrends) ? insights.keyTrends : [],
    recommendedSkills: Array.isArray(insights?.recommendedSkills)
      ? insights.recommendedSkills
      : [],
    lastUpdated:
      insights?.lastUpdated && !Number.isNaN(new Date(insights.lastUpdated).getTime())
        ? new Date(insights.lastUpdated)
        : new Date(),
    nextUpdate:
      insights?.nextUpdate && !Number.isNaN(new Date(insights.nextUpdate).getTime())
        ? new Date(insights.nextUpdate)
        : new Date(),
  };

  // Transform salary data for the chart
  const salaryData = safeInsights.salaryRanges
    .map((range) => {
      const minUsd = Number(range.minUsd ?? range.min ?? 0);
      const medianUsd = Number(range.medianUsd ?? range.median ?? 0);
      const maxUsd = Number(range.maxUsd ?? range.max ?? 0);
      const minInr = Number(range.minInr ?? 0);
      const medianInr = Number(range.medianInr ?? 0);
      const maxInr = Number(range.maxInr ?? 0);

      return {
        name: range.role,
        location: range.location || "Global",
        minUsd,
        medianUsd,
        maxUsd,
        minUsdChart: minUsd / 1000,
        medianUsdChart: medianUsd / 1000,
        maxUsdChart: maxUsd / 1000,
        minInr,
        medianInr,
        maxInr,
      };
    })
    .filter((range) => range.maxUsd > 0);

  const getDemandLevelColor = (level) => {
    switch (level.toLowerCase()) {
      case "high":
        return "bg-green-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getMarketOutlookInfo = (outlook) => {
    switch (outlook.toLowerCase()) {
      case "positive":
        return { icon: TrendingUp, color: "text-green-500" };
      case "neutral":
        return { icon: LineChart, color: "text-yellow-500" };
      case "negative":
        return { icon: TrendingDown, color: "text-red-500" };
      default:
        return { icon: LineChart, color: "text-gray-500" };
    }
  };

  const outlookColor = getMarketOutlookInfo(safeInsights.marketOutlook).color;
  const SafeOutlookIcon = getMarketOutlookInfo(safeInsights.marketOutlook).icon;

  // Format dates using date-fns
  const lastUpdatedDate = format(safeInsights.lastUpdated, "dd/MM/yyyy");
  const nextUpdateDistance = formatDistanceToNow(safeInsights.nextUpdate, {
    addSuffix: true,
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Badge variant="outline">Last updated: {lastUpdatedDate}</Badge>
      </div>

      {/* Market Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Market Outlook
            </CardTitle>
            <SafeOutlookIcon className={`h-4 w-4 ${outlookColor}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeInsights.marketOutlook}</div>
            <p className="text-xs text-muted-foreground">
              Quarterly refresh {nextUpdateDistance}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Industry Growth
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {safeInsights.growthRate.toFixed(1)}%
            </div>
            <Progress value={safeInsights.growthRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Demand Level</CardTitle>
            <BriefcaseIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeInsights.demandLevel}</div>
            <div
              className={`h-2 w-full rounded-full mt-2 ${getDemandLevelColor(
                safeInsights.demandLevel
              )}`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Skills</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {safeInsights.topSkills.map((skill) => (
                <Badge key={skill} variant="secondary">
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Salary Ranges Chart */}
      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>Salary Ranges by Role</CardTitle>
          <CardDescription>
            USD salary chart with INR equivalents for each role
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salaryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const salaryRange = payload[0]?.payload;

                      if (!salaryRange) {
                        return null;
                      }

                      return (
                        <div className="bg-background border rounded-lg p-2 shadow-md">
                          <p className="font-medium">{label}</p>
                          <p className="text-sm text-muted-foreground">
                            {salaryRange.location}
                          </p>
                          <p className="text-sm">
                            Min: {usdFormatter.format(salaryRange.minUsd)} /{" "}
                            {inrFormatter.format(salaryRange.minInr)}
                          </p>
                          <p className="text-sm">
                            Median: {usdFormatter.format(salaryRange.medianUsd)} /{" "}
                            {inrFormatter.format(salaryRange.medianInr)}
                          </p>
                          <p className="text-sm">
                            Max: {usdFormatter.format(salaryRange.maxUsd)} /{" "}
                            {inrFormatter.format(salaryRange.maxInr)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="minUsdChart" fill="#94a3b8" name="Min Salary (K USD)" />
                <Bar
                  dataKey="medianUsdChart"
                  fill="#64748b"
                  name="Median Salary (K USD)"
                />
                <Bar dataKey="maxUsdChart" fill="#475569" name="Max Salary (K USD)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {salaryData.map((range) => (
              <div key={range.name} className="rounded-lg border p-4">
                <p className="font-medium">{range.name}</p>
                <p className="text-sm text-muted-foreground">{range.location}</p>
                <p className="mt-2 text-sm">
                  USD: {usdFormatter.format(range.minUsd)} -{" "}
                  {usdFormatter.format(range.maxUsd)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Median: {usdFormatter.format(range.medianUsd)}
                </p>
                <p className="mt-2 text-sm">
                  INR: {inrFormatter.format(range.minInr)} -{" "}
                  {inrFormatter.format(range.maxInr)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Median: {inrFormatter.format(range.medianInr)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Industry Trends */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Key Industry Trends</CardTitle>
            <CardDescription>
              Current trends shaping the industry
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {safeInsights.keyTrends.map((trend, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <div className="h-2 w-2 mt-2 rounded-full bg-primary" />
                  <span>{trend}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommended Skills</CardTitle>
            <CardDescription>Skills to consider developing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {safeInsights.recommendedSkills.map((skill) => (
                <Badge key={skill} variant="outline">
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardView;
