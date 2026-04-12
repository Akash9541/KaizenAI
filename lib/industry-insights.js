import { db } from "@/lib/prisma";
import { getGeminiModel } from "@/lib/gemini";

export const INDUSTRY_INSIGHTS_UPDATE_INTERVAL_MS = 90 * 24 * 60 * 60 * 1000;
const USD_TO_INR_RATE = 83;

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

const isValidDateValue = (value) => {
  if (!value) return false;
  return !Number.isNaN(new Date(value).getTime());
};

const convertUsdToInr = (value) =>
  Math.round(toNumber(value, 0) * USD_TO_INR_RATE);

const buildSalaryRange = ({
  role,
  minUsd,
  maxUsd,
  medianUsd,
  location = "Global",
}) => {
  const normalizedMinUsd = toNumber(minUsd, 0);
  const normalizedMaxUsd = toNumber(maxUsd, normalizedMinUsd);
  const normalizedMedianUsd = toNumber(
    medianUsd,
    Math.round((normalizedMinUsd + normalizedMaxUsd) / 2),
  );

  return {
    role,
    min: normalizedMinUsd,
    max: normalizedMaxUsd,
    median: normalizedMedianUsd,
    minUsd: normalizedMinUsd,
    maxUsd: normalizedMaxUsd,
    medianUsd: normalizedMedianUsd,
    minInr: convertUsdToInr(normalizedMinUsd),
    maxInr: convertUsdToInr(normalizedMaxUsd),
    medianInr: convertUsdToInr(normalizedMedianUsd),
    location,
  };
};

const buildNextInsightUpdate = (baseDate = new Date()) =>
  new Date(baseDate.getTime() + INDUSTRY_INSIGHTS_UPDATE_INTERVAL_MS);

const hasQuarterlyCadence = (insight) => {
  if (
    !isValidDateValue(insight?.lastUpdated) ||
    !isValidDateValue(insight?.nextUpdate)
  ) {
    return false;
  }

  const lastUpdated = new Date(insight.lastUpdated).getTime();
  const nextUpdate = new Date(insight.nextUpdate).getTime();
  return nextUpdate - lastUpdated >= INDUSTRY_INSIGHTS_UPDATE_INTERVAL_MS * 0.8;
};

const buildFallbackInsights = (industry) => {
  const industryLabel = toTitleCase(industry);

  return {
    salaryRanges: [
      buildSalaryRange({
        role: `${industryLabel} Analyst`,
        minUsd: 55000,
        maxUsd: 90000,
        medianUsd: 72000,
      }),
      buildSalaryRange({
        role: `${industryLabel} Specialist`,
        minUsd: 70000,
        maxUsd: 110000,
        medianUsd: 88000,
      }),
      buildSalaryRange({
        role: `${industryLabel} Manager`,
        minUsd: 90000,
        maxUsd: 140000,
        medianUsd: 112000,
      }),
      buildSalaryRange({
        role: `${industryLabel} Consultant`,
        minUsd: 80000,
        maxUsd: 130000,
        medianUsd: 102000,
      }),
      buildSalaryRange({
        role: `${industryLabel} Lead`,
        minUsd: 110000,
        maxUsd: 165000,
        medianUsd: 136000,
      }),
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
      Array.isArray(rawInsights?.salaryRanges) &&
      rawInsights.salaryRanges.length
        ? rawInsights.salaryRanges.map((range, index) => {
            const fallbackRange =
              fallback.salaryRanges[index % fallback.salaryRanges.length];

            const minUsd = toNumber(
              range?.minUsd ?? range?.min,
              fallbackRange.minUsd,
            );
            const maxUsd = toNumber(
              range?.maxUsd ?? range?.max,
              fallbackRange.maxUsd,
            );
            const medianUsd = toNumber(
              range?.medianUsd ?? range?.median,
              fallbackRange.medianUsd,
            );

            return {
              ...buildSalaryRange({
                role:
                  typeof range?.role === "string" && range.role.trim()
                    ? range.role.trim()
                    : fallbackRange.role,
                minUsd,
                maxUsd,
                medianUsd,
                location:
                  typeof range?.location === "string" && range.location.trim()
                    ? range.location.trim()
                    : fallbackRange.location,
              }),
              minInr: toNumber(range?.minInr, convertUsdToInr(minUsd)),
              maxInr: toNumber(range?.maxInr, convertUsdToInr(maxUsd)),
              medianInr: toNumber(range?.medianInr, convertUsdToInr(medianUsd)),
            };
          })
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
      typeof rawInsights?.marketOutlook === "string" &&
      rawInsights.marketOutlook
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

const shouldRepairInsightRecord = (insight) => {
  if (!insight) return true;

  return (
    !Array.isArray(insight.salaryRanges) ||
    !insight.salaryRanges.length ||
    insight.salaryRanges.some(
      (range) =>
        !Number.isFinite(Number(range?.minUsd ?? range?.min)) ||
        !Number.isFinite(Number(range?.maxUsd ?? range?.max)) ||
        !Number.isFinite(Number(range?.medianUsd ?? range?.median)) ||
        !Number.isFinite(Number(range?.minInr)) ||
        !Number.isFinite(Number(range?.maxInr)) ||
        !Number.isFinite(Number(range?.medianInr)),
    ) ||
    !Array.isArray(insight.topSkills) ||
    !insight.topSkills.length ||
    !Array.isArray(insight.keyTrends) ||
    !insight.keyTrends.length ||
    !Array.isArray(insight.recommendedSkills) ||
    !insight.recommendedSkills.length ||
    typeof insight.marketOutlook !== "string" ||
    !insight.marketOutlook ||
    typeof insight.demandLevel !== "string" ||
    !insight.demandLevel ||
    !Number.isFinite(Number(insight.growthRate)) ||
    !isValidDateValue(insight.lastUpdated) ||
    !isValidDateValue(insight.nextUpdate) ||
    !hasQuarterlyCadence(insight)
  );
};

export const generateAIInsights = async (industry) => {
  const prompt = `
          Analyze the current state of the ${industry} industry and provide insights in ONLY the following JSON format without any additional notes or explanations:
          {
            "salaryRanges": [
              {
                "role": "string",
                "minUsd": number,
                "maxUsd": number,
                "medianUsd": number,
                "minInr": number,
                "maxInr": number,
                "medianInr": number,
                "location": "string"
              }
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
          Salary values should be annual compensation and include both USD and INR values.
          Focus on changes that materially shift over a 6 to 12 month horizon, not weekly fluctuations.
          The data should feel appropriate for quarterly insight refreshes.
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
    if (!shouldRepairInsightRecord(existingInsight)) {
      return existingInsight;
    }

    const repairedInsights = normalizeInsights(industry, existingInsight);

    return db.industryInsight.update({
      where: { industry },
      data: {
        ...repairedInsights,
        lastUpdated: isValidDateValue(existingInsight.lastUpdated)
          ? new Date(existingInsight.lastUpdated)
          : new Date(),
        nextUpdate: buildNextInsightUpdate(
          isValidDateValue(existingInsight.lastUpdated)
            ? new Date(existingInsight.lastUpdated)
            : new Date(),
        ),
      },
    });
  }

  let insights;

  try {
    insights = await generateAIInsights(industry);
  } catch (error) {
    console.error(
      `Falling back to default insights for ${industry}:`,
      error instanceof Error ? error.message : error,
    );
    insights = buildFallbackInsights(industry);
  }

  const nextUpdate = buildNextInsightUpdate();

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
