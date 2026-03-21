"use client";

import React from "react";
import MDEditor from "@uiw/react-md-editor";

const CoverLetterPreview = ({ content }) => {
  const sanitizedContent = (content ?? "").replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    ""
  );

  return (
    <div className="py-4">
      <MDEditor value={sanitizedContent} preview="preview" height={700} />
    </div>
  );
};

export default CoverLetterPreview;
