import { GoogleGenerativeAI } from "@google/generative-ai";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

export const GEMINI_MODEL =
  process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

export const getGeminiModel = () => {
  if (!genAI) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  return genAI.getGenerativeModel({ model: GEMINI_MODEL });
};
