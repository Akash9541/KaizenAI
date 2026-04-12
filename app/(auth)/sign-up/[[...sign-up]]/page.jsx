import { redirect } from "next/navigation";
import AuthForm from "../../_components/auth-form";
import { getSession } from "@/lib/auth";

export default async function Page() {
  const session = await getSession();

  if (session?.userId) {
    redirect("/onboarding");
  }

  return <AuthForm mode="sign-up" redirectTo="/onboarding" />;
}
