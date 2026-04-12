import { redirect } from "next/navigation";

export default async function VerifyEmailPage({ searchParams }) {
  const params = await searchParams;
  const token = params?.token;

  if (!token) {
    redirect("/sign-in");
  }
  redirect(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
}
