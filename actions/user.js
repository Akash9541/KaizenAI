"use server";

import { revalidatePath } from "next/cache";
import { ensureIndustryInsights } from "@/lib/industry-insights";
import { requireCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function updateUser(data) {
  const user = await requireCurrentUser();

  try {
    await ensureIndustryInsights(data.industry);

    const updatedUser = await db.user.update({
      where: {
        id: user.id,
      },
      data: {
        industry: data.industry,
        experience: data.experience,
        bio: data.bio,
        skills: data.skills,
      },
    });

    revalidatePath("/");
    return { success: true, user: updatedUser };
  } catch (error) {
    console.error("Error updating user and industry:", error);
    throw new Error("Failed to update profile");
  }
}

export async function getUserOnboardingStatus() {
  const existingUser = await requireCurrentUser({
    select: {
      industry: true,
    },
  });

  try {
    return {
      isOnboarded: !!existingUser?.industry,
    };
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    throw new Error("Failed to check onboarding status");
  }
}
