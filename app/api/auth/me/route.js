import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser({
    select: {
      id: true,
      email: true,
      name: true,
      industry: true,
      emailVerified: true,
    },
  });

  return NextResponse.json({ user });
}
