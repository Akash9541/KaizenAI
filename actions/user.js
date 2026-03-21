"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { ensureIndustryInsights } from "@/lib/industry-insights";
import { syncUser } from "@/lib/checkUser";

export async function updateUser(data) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user =
    (await db.user.findUnique({
      where: { clerkUserId: userId },
    })) || (await syncUser());

  if (!user) throw new Error("User not found");

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
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const existingUser =
    (await db.user.findUnique({
      where: { clerkUserId: userId },
    })) || (await syncUser());

  try {
    return {
      isOnboarded: !!existingUser?.industry,
    };
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    throw new Error("Failed to check onboarding status");
  }
}
