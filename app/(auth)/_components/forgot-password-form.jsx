"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

export default function ForgotPasswordForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [awaitingReset, setAwaitingReset] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    code: "",
    password: "",
    confirmPassword: "",
  });

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
      const response = await fetch(
        awaitingReset
          ? "/api/auth/reset-password"
          : "/api/auth/forgot-password",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            awaitingReset
              ? {
                  email: formData.email,
                  code: formData.code,
                  password: formData.password,
                  confirmPassword: formData.confirmPassword,
                }
              : {
                  email: formData.email,
                },
          ),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Request failed");
      }

      if (!awaitingReset) {
        setAwaitingReset(true);
        toast.success("If the account exists, reset OTP has been sent.");
        return;
      }

      toast.success("Password reset successful. You are now signed in.");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl">
          {awaitingReset ? "Reset password" : "Forgot password"}
        </CardTitle>
        <CardDescription>
          {awaitingReset
            ? "Enter the OTP and your new password."
            : "Enter your registered email and we will send an OTP."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              disabled={awaitingReset}
              required
            />
          </div>

          {awaitingReset && (
            <>
              <div className="space-y-2">
                <Label htmlFor="code">OTP code</Label>
                <Input
                  id="code"
                  name="code"
                  inputMode="numeric"
                  maxLength={6}
                  value={formData.code}
                  onChange={handleChange}
                  placeholder="Enter 6-digit OTP"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  minLength={8}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Minimum 8 characters"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  minLength={8}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter password"
                  required
                />
              </div>
            </>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Please wait
              </>
            ) : awaitingReset ? (
              "Reset Password"
            ) : (
              "Send OTP"
            )}
          </Button>
        </form>

        <p className="mt-4 text-sm text-muted-foreground">
          Remembered your password?{" "}
          <Link href="/sign-in" className="text-primary underline">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
