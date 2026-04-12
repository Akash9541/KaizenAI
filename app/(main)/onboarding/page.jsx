import { redirect } from "next/navigation";
import { industries } from "@/data/industries";
import OnboardingForm from "./_components/onboarding-form";
import { getUserOnboardingStatus } from "@/actions/user";
import { requireCurrentUser } from "@/lib/auth";

export default async function OnboardingPage({ searchParams }) {
  const params = await searchParams;
  const isEditing = params?.edit === "true";
  const user = await requireCurrentUser({
    select: {
      industry: true,
      experience: true,
      bio: true,
      skills: true,
    },
  });
  // Check if user is already onboarded
  const { isOnboarded } = await getUserOnboardingStatus();

  if (isOnboarded && !isEditing) {
    redirect("/dashboard");
  }

  return (
    <main>
      <OnboardingForm
        industries={industries}
        isEditing={isEditing}
        initialValues={user}
      />
    </main>
  );
}
