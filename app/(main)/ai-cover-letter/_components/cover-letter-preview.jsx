"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import MDEditor from "@uiw/react-md-editor";
import { Download, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { updateCoverLetter } from "@/actions/cover-letter";

const removeScripts = (value) =>
  (value ?? "").replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    "",
  );

const CoverLetterPreview = ({ id, content, companyName, jobTitle }) => {
  const router = useRouter();
  const pdfRef = useRef(null);
  const [draftContent, setDraftContent] = useState(removeScripts(content));
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraftContent(removeScripts(content));
  }, [content]);

  const sanitizedContent = useMemo(
    () => removeScripts(draftContent),
    [draftContent],
  );

  const hasChanges = sanitizedContent !== removeScripts(content);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateCoverLetter(id, sanitizedContent);
      toast.success("Cover letter saved successfully!");
      router.refresh();
    } catch (error) {
      toast.error(error.message || "Failed to save cover letter");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (typeof window === "undefined") {
      return;
    }

    setIsDownloading(true);
    try {
      const { default: html2pdf } =
        await import("html2pdf.js/dist/html2pdf.min.js");

      if (!pdfRef.current) {
        throw new Error("PDF content is not ready yet");
      }

      const safeCompanyName = (companyName || "company")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const safeJobTitle = (jobTitle || "cover-letter")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      await html2pdf()
        .set({
          margin: [12, 12],
          filename: `${safeJobTitle}-${safeCompanyName || "cover-letter"}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(pdfRef.current)
        .save();
    } catch (error) {
      toast.error(error.message || "Failed to export PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="py-4 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <Button
          variant="outline"
          onClick={handleDownloadPdf}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Exporting PDF...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Export PDF
            </>
          )}
        </Button>
        <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <MDEditor
          value={sanitizedContent}
          onChange={(value) => setDraftContent(value ?? "")}
          preview="live"
          height={700}
        />
      </div>

      <div className="fixed left-[-9999px] top-0 w-[794px] bg-white p-8">
        <div ref={pdfRef}>
          <MDEditor.Markdown
            source={sanitizedContent}
            style={{
              background: "white",
              color: "black",
              fontFamily: "Georgia, serif",
              fontSize: "15px",
              lineHeight: "1.7",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default CoverLetterPreview;
