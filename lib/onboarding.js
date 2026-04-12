import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth";

const withIndustryRequirement = (query = {}) => {
  if (query.select) {
    return {
      ...query,
      select: {
        ...query.select,
        industry: true,
      },
    };
  }

  if (query.include) {
    return {
      ...query,
      select: undefined,
      include: {
        ...query.include,
      },
    };
  }

  return query;
};

export const requireOnboardedUser = async (query = {}) => {
  const user = await requireCurrentUser(withIndustryRequirement(query));

  if (!user?.industry) {
    throw new Error("Complete onboarding first");
  }

  return user;
};

export const requireOnboardedPageUser = async (query = {}) => {
  const user = await requireCurrentUser(withIndustryRequirement(query));

  if (!user?.industry) {
    redirect("/onboarding");
  }

  return user;
};
