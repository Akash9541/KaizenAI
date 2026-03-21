import { db } from "@/lib/prisma";
import { inngest } from "./client";
import { generateAIInsights } from "@/lib/industry-insights";

export const generateIndustryInsights = inngest.createFunction(
  { name: "Generate Industry Insights" },
  { cron: "0 0 * * 0" }, // Run every Sunday at midnight
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
            nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });
      });
    }
  }
);
