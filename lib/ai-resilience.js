const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_BACKOFF_MS = 750;
const DEFAULT_MAX_BACKOFF_MS = 6000;

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const RETRYABLE_MESSAGE_PATTERNS = [
  "service unavailable",
  "high demand",
  "temporarily unavailable",
  "timeout",
  "timed out",
  "rate limit",
  "resource exhausted",
  "overloaded",
];

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const getAiRetryConfig = () => ({
  maxRetries: toPositiveInt(
    process.env.GEMINI_MAX_RETRIES,
    DEFAULT_MAX_RETRIES,
  ),
  baseBackoffMs: toPositiveInt(
    process.env.GEMINI_RETRY_BASE_MS,
    DEFAULT_BASE_BACKOFF_MS,
  ),
  maxBackoffMs: toPositiveInt(
    process.env.GEMINI_RETRY_MAX_MS,
    DEFAULT_MAX_BACKOFF_MS,
  ),
});

export const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const isRetryableAiError = (error) => {
  const status = Number(error?.status);
  if (Number.isFinite(status) && RETRYABLE_STATUSES.has(status)) {
    return true;
  }

  const message = String(error?.message || "").toLowerCase();
  return RETRYABLE_MESSAGE_PATTERNS.some((pattern) =>
    message.includes(pattern),
  );
};

export const getBackoffWithJitter = ({
  attempt,
  baseBackoffMs,
  maxBackoffMs,
}) => {
  const cappedAttempt = Math.max(1, attempt);
  const exponentialDelay = baseBackoffMs * 2 ** (cappedAttempt - 1);
  const jitter = Math.floor(Math.random() * Math.max(1, baseBackoffMs));
  return Math.min(exponentialDelay + jitter, maxBackoffMs);
};

const extractJsonCandidate = (text) => {
  const cleaned = String(text || "")
    .replace(/```(?:json)?/gi, "")
    .trim();

  const firstObject = cleaned.indexOf("{");
  const firstArray = cleaned.indexOf("[");
  let start = -1;
  let opening = "";
  let closing = "";

  if (firstObject === -1 && firstArray === -1) {
    return "";
  }

  if (firstObject === -1 || (firstArray !== -1 && firstArray < firstObject)) {
    start = firstArray;
    opening = "[";
    closing = "]";
  } else {
    start = firstObject;
    opening = "{";
    closing = "}";
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < cleaned.length; index += 1) {
    const char = cleaned[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === opening) {
      depth += 1;
    } else if (char === closing) {
      depth -= 1;
      if (depth === 0) {
        return cleaned.slice(start, index + 1);
      }
    }
  }

  return cleaned.slice(start).trim();
};

export const parseAiJsonResponse = (text) => {
  const cleaned = String(text || "")
    .replace(/```(?:json)?/gi, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const candidate = extractJsonCandidate(cleaned);
    if (!candidate) {
      throw new Error("Model response did not contain JSON content");
    }
    return JSON.parse(candidate);
  }
};
