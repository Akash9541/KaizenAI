import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import ForgotPasswordForm from "../_components/forgot-password-form";

export default async function ForgotPasswordPage() {
  const session = await getSession();

  if (session?.userId) {
    redirect("/dashboard");
  }

  return <ForgotPasswordForm />;
}
