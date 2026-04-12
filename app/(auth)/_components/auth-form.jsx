"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const formContent = {
  "sign-in": {
    title: "Welcome back",
    description:
      "Sign in securely with your email and password to continue building your career plan.",
    submitLabel: "Sign In",
    endpoint: "/api/auth/sign-in",
    alternateLabel: "Create account",
    alternateHref: "/sign-up",
    alternateText: "Don't have an account?",
  },
  "sign-up": {
    title: "Create your account",
    description:
      "Sign up with your details, then verify your email with OTP.",
    submitLabel: "Create Account",
    endpoint: "/api/auth/sign-up",
    alternateLabel: "Sign in",
    alternateHref: "/sign-in",
    alternateText: "Already have an account?",
  },
};

export default function AuthForm({ mode, redirectTo }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const content = formContent[mode];
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    code: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");

  const verifiedStatus = searchParams.get("verified");
  const redirectParam = searchParams.get("redirect_url");
  const redirectTarget =
    redirectParam || searchParams.get("after_sign_in_url") || redirectTo;
  const alternateHref = redirectParam
    ? `${content.alternateHref}?redirect_url=${encodeURIComponent(redirectParam)}`
    : content.alternateHref;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const isSignUpVerificationStep = mode === "sign-up" && awaitingCode;
      const response = await fetch(
        isSignUpVerificationStep ? "/api/auth/verify-code" : content.endpoint,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            isSignUpVerificationStep
              ? {
                  email: pendingEmail || formData.email,
                  code: formData.code,
                  purpose: "sign-up",
                }
              : mode === "sign-up"
                ? {
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                  }
                : {
                    email: formData.email,
                    password: formData.password,
                  }
          ),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Authentication failed");
      }

      if (mode === "sign-up" && !awaitingCode) {
        setPendingEmail(result.email || formData.email);
        setAwaitingCode(true);
        toast.success("Verification code sent to your email");
        return;
      }

      toast.success("Signed in successfully");
      router.push(redirectTarget);
      router.refresh();
    } catch (error) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    setAwaitingCode(false);
    setFormData((current) => ({
      ...current,
      code: "",
      password: "",
    }));
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl">
          {awaitingCode ? "Enter verification code" : content.title}
        </CardTitle>
        <CardDescription>
          {awaitingCode
            ? `We sent a 6-digit code to ${pendingEmail || formData.email}.`
            : content.description}
        </CardDescription>
        {verifiedStatus === "success" && (
          <p className="text-sm text-green-500">
            Your email has been verified successfully.
          </p>
        )}
        {verifiedStatus === "invalid" && (
          <p className="text-sm text-red-500">
            That verification link is invalid or expired.
          </p>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!awaitingCode && mode === "sign-up" && (
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Your full name"
                required
              />
            </div>
          )}

          {!awaitingCode && (
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
              />
            </div>
          )}

          {!awaitingCode && (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                minLength={8}
                required
              />
            </div>
          )}

          {awaitingCode && (
            <div className="space-y-2">
              <Label htmlFor="code">Verification code</Label>
              <Input
                id="code"
                name="code"
                inputMode="numeric"
                maxLength={6}
                value={formData.code}
                onChange={handleChange}
                placeholder="Enter 6-digit code"
                required
              />
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Please wait
              </>
            ) : mode === "sign-up" && awaitingCode ? (
              "Verify & Continue"
            ) : (
              content.submitLabel
            )}
          </Button>

          {mode === "sign-up" && awaitingCode && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleBack}
              disabled={submitting}
            >
              Change Email
            </Button>
          )}
        </form>

        {!awaitingCode && mode === "sign-in" && (
          <p className="mt-4 text-sm text-muted-foreground">
            Forgot your password?{" "}
            <Link href="/forgot-password" className="text-primary underline">
              Reset it with OTP
            </Link>
          </p>
        )}

        {!awaitingCode && (
          <p className="mt-4 text-sm text-muted-foreground">
            {content.alternateText}{" "}
            <Link href={alternateHref} className="text-primary underline">
              {content.alternateLabel}
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
