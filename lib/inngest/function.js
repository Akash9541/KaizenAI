import { db } from "@/lib/prisma";
import { inngest } from "./client";
import {
  generateAIInsights,
  INDUSTRY_INSIGHTS_UPDATE_INTERVAL_MS,
} from "@/lib/industry-insights";

export const generateIndustryInsights = inngest.createFunction(
  { name: "Generate Industry Insights" },
  { cron: "0 0 1 */3 *" }, // Run quarterly on the first day of every third month
  async ({ step }) => {
    const industries = await step.run("Fetch industries", async () => {
      return await db.industryInsight.findMany({
        select: { industry: true },
      });
    });

    for (const { industry } of industries) {
      let insights;

      try {
        insights = await step.run(`Generate ${industry} insights`, async () =>
          generateAIInsights(industry)
        );
      } catch (error) {
        console.error(
          `Skipping scheduled insight refresh for ${industry}:`,
          error
        );
        continue;
      }

      await step.run(`Update ${industry} insights`, async () => {
        await db.industryInsight.update({
          where: { industry },
          data: {
            ...insights,
            lastUpdated: new Date(),
            nextUpdate: new Date(
              Date.now() + INDUSTRY_INSIGHTS_UPDATE_INTERVAL_MS
            ),
          },
        });
      });
    }
  }
);
