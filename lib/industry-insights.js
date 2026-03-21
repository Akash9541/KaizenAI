import { db } from "@/lib/prisma";
import { getGeminiModel } from "@/lib/gemini";

const DEFAULT_UPDATE_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

const toTitleCase = (value) =>
  value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildFallbackInsights = (industry) => {
  const industryLabel = toTitleCase(industry);

  return {
    salaryRanges: [
      {
        role: `${industryLabel} Analyst`,
        min: 55000,
        max: 90000,
        median: 72000,
        location: "Global",
      },
      {
        role: `${industryLabel} Specialist`,
        min: 70000,
        max: 110000,
        median: 88000,
        location: "Global",
      },
      {
        role: `${industryLabel} Manager`,
        min: 90000,
        max: 140000,
        median: 112000,
        location: "Global",
      },
      {
        role: `${industryLabel} Consultant`,
        min: 80000,
        max: 130000,
        median: 102000,
        location: "Global",
      },
      {
        role: `${industryLabel} Lead`,
        min: 110000,
        max: 165000,
        median: 136000,
        location: "Global",
      },
    ],
    growthRate: 8,
    demandLevel: "Medium",
    topSkills: [
      "Communication",
      "Problem Solving",
      "Adaptability",
      "Domain Knowledge",
      "AI Literacy",
    ],
    marketOutlook: "Neutral",
    keyTrends: [
      `Hiring remains steady across ${industryLabel} roles`,
      "Teams are adopting AI-assisted workflows",
      "Cross-functional collaboration is increasingly important",
      "Employers are prioritizing practical tool proficiency",
      "Continuous learning is a stronger hiring signal",
    ],
    recommendedSkills: [
      "Data Analysis",
      "Stakeholder Communication",
      "Process Improvement",
      "Prompt Engineering",
      "Project Planning",
    ],
  };
};

const normalizeInsights = (industry, rawInsights) => {
  const fallback = buildFallbackInsights(industry);

  return {
    salaryRanges:
      Array.isArray(rawInsights?.salaryRanges) && rawInsights.salaryRanges.length
        ? rawInsights.salaryRanges.map((range, index) => ({
            role:
              typeof range?.role === "string" && range.role.trim()
                ? range.role.trim()
                : fallback.salaryRanges[index % fallback.salaryRanges.length].role,
            min: toNumber(
              range?.min,
              fallback.salaryRanges[index % fallback.salaryRanges.length].min
            ),
            max: toNumber(
              range?.max,
              fallback.salaryRanges[index % fallback.salaryRanges.length].max
            ),
            median: toNumber(
              range?.median,
              fallback.salaryRanges[index % fallback.salaryRanges.length].median
            ),
            location:
              typeof range?.location === "string" && range.location.trim()
                ? range.location.trim()
                : "Global",
          }))
        : fallback.salaryRanges,
    growthRate: toNumber(rawInsights?.growthRate, fallback.growthRate),
    demandLevel:
      typeof rawInsights?.demandLevel === "string" && rawInsights.demandLevel
        ? rawInsights.demandLevel
        : fallback.demandLevel,
    topSkills:
      Array.isArray(rawInsights?.topSkills) && rawInsights.topSkills.length
        ? rawInsights.topSkills
        : fallback.topSkills,
    marketOutlook:
      typeof rawInsights?.marketOutlook === "string" && rawInsights.marketOutlook
        ? rawInsights.marketOutlook
        : fallback.marketOutlook,
    keyTrends:
      Array.isArray(rawInsights?.keyTrends) && rawInsights.keyTrends.length
        ? rawInsights.keyTrends
        : fallback.keyTrends,
    recommendedSkills:
      Array.isArray(rawInsights?.recommendedSkills) &&
      rawInsights.recommendedSkills.length
        ? rawInsights.recommendedSkills
        : fallback.recommendedSkills,
  };
};

export const generateAIInsights = async (industry) => {
  const prompt = `
          Analyze the current state of the ${industry} industry and provide insights in ONLY the following JSON format without any additional notes or explanations:
          {
            "salaryRanges": [
              { "role": "string", "min": number, "max": number, "median": number, "location": "string" }
            ],
            "growthRate": number,
            "demandLevel": "High" | "Medium" | "Low",
            "topSkills": ["skill1", "skill2"],
            "marketOutlook": "Positive" | "Neutral" | "Negative",
            "keyTrends": ["trend1", "trend2"],
            "recommendedSkills": ["skill1", "skill2"]
          }

          IMPORTANT: Return ONLY the JSON. No additional text, notes, or markdown formatting.
          Include at least 5 common roles for salary ranges.
          Growth rate should be a percentage.
          Include at least 5 skills and trends.
        `;

  const result = await getGeminiModel().generateContent(prompt);
  const response = result.response;
  const text = response.text();
  const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

  return normalizeInsights(industry, JSON.parse(cleanedText));
};

export const ensureIndustryInsights = async (industry) => {
  const existingInsight = await db.industryInsight.findUnique({
    where: { industry },
  });

  if (existingInsight) {
    return existingInsight;
  }

  let insights;

  try {
    insights = await generateAIInsights(industry);
  } catch (error) {
    console.error(
      `Falling back to default insights for ${industry}:`,
      error instanceof Error ? error.message : error
    );
    insights = buildFallbackInsights(industry);
  }

  const nextUpdate = new Date(Date.now() + DEFAULT_UPDATE_INTERVAL_MS);

  return db.industryInsight.upsert({
    where: { industry },
    update: {
      ...insights,
      lastUpdated: new Date(),
      nextUpdate,
    },
    create: {
      industry,
      ...insights,
      nextUpdate,
    },
  });
};
