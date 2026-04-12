"use server";

import { ensureIndustryInsights } from "@/lib/industry-insights";
import { requireCurrentUser } from "@/lib/auth";

export async function getIndustryInsights() {
  const user = await requireCurrentUser({
    include: {
      industryInsight: true,
    },
  });

  if (!user.industry) throw new Error("User not onboarded");

  return ensureIndustryInsights(user.industry);
}
