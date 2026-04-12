import { redirect } from "next/navigation";
import AuthForm from "../../_components/auth-form";
import { getSession } from "@/lib/auth";

export default async function Page({ searchParams }) {
  const session = await getSession();
  const params = await searchParams;
  const redirectUrl = params?.redirect_url || "/dashboard";

  if (session?.userId) {
    redirect(redirectUrl);
  }

  return <AuthForm mode="sign-in" redirectTo={redirectUrl} />;
}
