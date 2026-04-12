"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { format, isValid } from "date-fns";

const formatAssessmentDate = (value) => {
  if (!value) return "Unknown";

  const date = new Date(value);
  return isValid(date) ? format(date, "MMM dd") : "Unknown";
};

export default function PerformanceChart({ assessments }) {
  const chartData = useMemo(
    () =>
      Array.isArray(assessments)
        ? assessments.map((assessment) => ({
            date: formatAssessmentDate(assessment.createdAt),
            score:
              typeof assessment.quizScore === "number"
                ? assessment.quizScore
                : 0,
          }))
        : [],
    [assessments],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="gradient-title text-3xl md:text-4xl">
          Performance Trend
        </CardTitle>
        <CardDescription>Your quiz scores over time</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload?.length) {
                    return (
                      <div className="bg-background border rounded-lg p-2 shadow-md">
                        <p className="text-sm font-medium">
                          Score: {payload[0].value}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {payload[0].payload.date}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
