"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/prisma";
import { getGeminiModel } from "@/lib/gemini";
import { requireOnboardedUser } from "@/lib/onboarding";

export async function generateCoverLetter(data) {
  const user = await requireOnboardedUser();

  const prompt = `
    Write a professional cover letter for a ${data.jobTitle} position at ${
    data.companyName
  }.
    
    About the candidate:
    - Industry: ${user.industry || "Not provided"}
    - Years of Experience: ${user.experience ?? "Not provided"}
    - Skills: ${user.skills?.length ? user.skills.join(", ") : "Not provided"}
    - Professional Background: ${user.bio || "Not provided"}
    
    Job Description:
    ${data.jobDescription}
    
    Requirements:
    1. Use a professional, enthusiastic tone
    2. Highlight relevant skills and experience
    3. Show understanding of the company's needs
    4. Keep it concise (max 400 words)
    5. Use proper business letter formatting in markdown
    6. Include specific examples of achievements
    7. Relate candidate's background to job requirements
    
    Format the letter in markdown.
  `;

  try {
    const result = await getGeminiModel().generateContent(prompt);
    const content = result.response.text().trim();

    const coverLetter = await db.coverLetter.create({
      data: {
        content,
        jobDescription: data.jobDescription,
        companyName: data.companyName,
        jobTitle: data.jobTitle,
        status: "completed",
        userId: user.id,
      },
    });

    return coverLetter;
  } catch (error) {
    console.error("Error generating cover letter:", error);
    throw new Error("Failed to generate cover letter");
  }
}

export async function getCoverLetters() {
  const user = await requireOnboardedUser();

  return await db.coverLetter.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getCoverLetter(id) {
  const user = await requireOnboardedUser();

  return await db.coverLetter.findFirst({
    where: {
      id,
      userId: user.id,
    },
  });
}

export async function deleteCoverLetter(id) {
  const user = await requireOnboardedUser();
  const existingCoverLetter = await db.coverLetter.findFirst({
    where: {
      id,
      userId: user.id,
    },
    select: {
      id: true,
    },
  });

  if (!existingCoverLetter) {
    throw new Error("Cover letter not found");
  }

  return await db.coverLetter.delete({
    where: {
      id: existingCoverLetter.id,
    },
  });
}

export async function updateCoverLetter(id, content) {
  const user = await requireOnboardedUser();
  const sanitizedContent = typeof content === "string" ? content.trim() : "";

  if (!sanitizedContent) {
    throw new Error("Cover letter content is required");
  }

  const existingCoverLetter = await db.coverLetter.findFirst({
    where: {
      id,
      userId: user.id,
    },
    select: {
      id: true,
    },
  });

  if (!existingCoverLetter) {
    throw new Error("Cover letter not found");
  }

  const updatedCoverLetter = await db.coverLetter.update({
    where: {
      id: existingCoverLetter.id,
    },
    data: {
      content: sanitizedContent,
    },
  });

  revalidatePath("/ai-cover-letter");
  revalidatePath(`/ai-cover-letter/${id}`);

  return updatedCoverLetter;
}
