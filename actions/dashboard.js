"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { ensureIndustryInsights } from "@/lib/industry-insights";

export async function getIndustryInsights() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      industryInsight: true,
    },
  });

  if (!user) throw new Error("User not found");

  // If no insights exist, generate them
  if (!user.industryInsight) {
    return ensureIndustryInsights(user.industry);
  }

  return user.industryInsight;
}
