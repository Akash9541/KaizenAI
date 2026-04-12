import { getResume } from "@/actions/resume";
import ResumeBuilder from "./_components/resume-builder";
import { requireOnboardedPageUser } from "@/lib/onboarding";

export default async function ResumePage() {
  const user = await requireOnboardedPageUser({
    select: {
      name: true,
      email: true,
      industry: true,
      experience: true,
      skills: true,
    },
  });
  const resume = await getResume();

  return (
    <div className="container mx-auto py-6">
      <ResumeBuilder
        initialContent={resume?.content}
        initialUserName={user.name || user.email}
        profileSummary={user}
      />
    </div>
  );
}
