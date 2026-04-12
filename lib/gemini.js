import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  getAiRetryConfig,
  getBackoffWithJitter,
  isRetryableAiError,
  sleep,
} from "@/lib/ai-resilience";

const DEFAULT_PRIMARY_MODEL = "gemini-2.5-flash";
const DEFAULT_FALLBACK_MODEL = "gemini-2.0-flash";

export const GEMINI_PRIMARY_MODEL =
  process.env.GEMINI_PRIMARY_MODEL ||
  process.env.GEMINI_MODEL ||
  DEFAULT_PRIMARY_MODEL;
export const GEMINI_FALLBACK_MODEL =
  process.env.GEMINI_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL;

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

export const getGeminiModel = (model = GEMINI_PRIMARY_MODEL) => {
  if (!genAI) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  return genAI.getGenerativeModel({ model });
};

const generateWithRetry = async ({ prompt, model, label, retryConfig }) => {
  let lastError = null;

  for (let attempt = 1; attempt <= retryConfig.maxRetries; attempt += 1) {
    try {
      return await getGeminiModel(model).generateContent(prompt);
    } catch (error) {
      lastError = error;
      const shouldRetry =
        isRetryableAiError(error) && attempt < retryConfig.maxRetries;

      if (!shouldRetry) {
        throw error;
      }

      const waitMs = getBackoffWithJitter({
        attempt,
        baseBackoffMs: retryConfig.baseBackoffMs,
        maxBackoffMs: retryConfig.maxBackoffMs,
      });
      console.warn(
        `[AI:${label}] ${model} attempt ${attempt}/${retryConfig.maxRetries} failed (${error?.status || "unknown"}). Retrying in ${waitMs}ms...`
      );
      await sleep(waitMs);
    }
  }

  throw lastError || new Error("Gemini request failed");
};

export const generateGeminiContent = async (
  prompt,
  { label = "request", allowFallback = true } = {}
) => {
  const retryConfig = getAiRetryConfig();

  try {
    return await generateWithRetry({
      prompt,
      model: GEMINI_PRIMARY_MODEL,
      label,
      retryConfig,
    });
  } catch (primaryError) {
    if (!allowFallback || GEMINI_FALLBACK_MODEL === GEMINI_PRIMARY_MODEL) {
      throw primaryError;
    }

    console.warn(
      `[AI:${label}] Primary model ${GEMINI_PRIMARY_MODEL} failed after retries. Switching to fallback ${GEMINI_FALLBACK_MODEL}.`
    );

    return generateWithRetry({
      prompt,
      model: GEMINI_FALLBACK_MODEL,
      label,
      retryConfig,
    });
  }
};
