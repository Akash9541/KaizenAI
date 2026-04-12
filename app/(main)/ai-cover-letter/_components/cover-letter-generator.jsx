"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowRight, Loader2, Sparkles, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { generateCoverLetter } from "@/actions/cover-letter";
import useFetch from "@/hooks/use-fetch";
import { coverLetterSchema } from "@/app/lib/schema";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CoverLetterGenerator({ profileSummary }) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(coverLetterSchema),
  });

  const {
    loading: generating,
    fn: generateLetterFn,
    data: generatedLetter,
  } = useFetch(generateCoverLetter);

  // Update content when letter is generated
  useEffect(() => {
    if (generatedLetter) {
      toast.success("Cover letter generated successfully!");
      router.push(`/ai-cover-letter/${generatedLetter.id}`);
      reset();
    }
  }, [generatedLetter, reset, router]);

  const onSubmit = async (data) => {
    try {
      await generateLetterFn(data);
    } catch (error) {
      toast.error(error.message || "Failed to generate cover letter");
    }
  };

  const hasProfileContext = Boolean(
    profileSummary?.industry ||
    profileSummary?.experience ||
    profileSummary?.skills?.length,
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.4fr,0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound className="h-5 w-5" />
              Profile Context
            </CardTitle>
            <CardDescription>
              Your saved profile is used to tailor the generated letter.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {profileSummary?.industry ? (
                <Badge variant="secondary">{profileSummary.industry}</Badge>
              ) : (
                <Badge variant="outline">Industry not set</Badge>
              )}
              {typeof profileSummary?.experience === "number" && (
                <Badge variant="secondary">
                  {profileSummary.experience} years experience
                </Badge>
              )}
              {profileSummary?.skills?.slice(0, 3).map((skill) => (
                <Badge key={skill} variant="outline">
                  {skill}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              {hasProfileContext
                ? "Your profile details and industry context will be blended into the draft automatically."
                : "Complete your profile to make the generated cover letter more accurate and personalized."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Quick Access
            </CardTitle>
            <CardDescription>
              Update the supporting context without leaving your workflow.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Link href="/onboarding?edit=true">
              <Button variant="outline" className="w-full justify-between">
                Edit Profile
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" className="w-full justify-between">
                View Industry Insights
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Job Details</CardTitle>
          <CardDescription>
            Provide the role details and we&apos;ll draft a letter using your
            saved profile plus the job description.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Form fields remain the same */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  placeholder="Enter company name"
                  {...register("companyName")}
                />
                {errors.companyName && (
                  <p className="text-sm text-red-500">
                    {errors.companyName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input
                  id="jobTitle"
                  placeholder="Enter job title"
                  {...register("jobTitle")}
                />
                {errors.jobTitle && (
                  <p className="text-sm text-red-500">
                    {errors.jobTitle.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="jobDescription">Job Description</Label>
              <Textarea
                id="jobDescription"
                placeholder="Paste the job description here"
                className="h-32"
                {...register("jobDescription")}
              />
              {errors.jobDescription && (
                <p className="text-sm text-red-500">
                  {errors.jobDescription.message}
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={generating}>
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Cover Letter"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
