"use server";

import { db } from "@/lib/prisma";
import { generateGeminiContent } from "@/lib/gemini";
import { parseAiJsonResponse } from "@/lib/ai-resilience";
import { requireOnboardedUser } from "@/lib/onboarding";

const QUIZ_LEVELS = {
  beginner:
    "Focus on fundamentals, terminology, basic concepts, and straightforward practical questions.",
  intermediate:
    "Focus on applied knowledge, common workflows, problem solving, and moderate scenario-based questions.",
  advanced:
    "Focus on complex tradeoffs, edge cases, system thinking, optimization, and senior-level decision making.",
};

const FALLBACK_QUESTION_TEMPLATES = {
  beginner: [
    {
      question:
        "In {{industry}}, what is the best first step when starting a new task using {{skill}}?",
      options: [
        "Clarify requirements and expected output",
        "Start coding without context",
        "Skip planning and deploy directly",
        "Disable validation to move faster",
      ],
      correctAnswer: "Clarify requirements and expected output",
      explanation:
        "Understanding scope first prevents rework and aligns implementation with business goals.",
    },
    {
      question: "Which HTTP status code typically indicates success for GET?",
      options: ["200", "401", "404", "500"],
      correctAnswer: "200",
      explanation:
        "HTTP 200 means the request succeeded and the server returned a valid response.",
    },
    {
      question: "Why are environment variables used in production apps?",
      options: [
        "To keep secrets and deploy config out of source code",
        "To replace database backups",
        "To avoid authentication logic",
        "To skip runtime validation",
      ],
      correctAnswer: "To keep secrets and deploy config out of source code",
      explanation:
        "Environment variables separate sensitive or environment-specific values from code.",
    },
    {
      question: "What is the most useful first debugging action?",
      options: [
        "Reproduce the issue and inspect logs",
        "Delete recent code immediately",
        "Increase all timeouts",
        "Disable error handling",
      ],
      correctAnswer: "Reproduce the issue and inspect logs",
      explanation:
        "Reliable reproduction and logs provide evidence for root-cause analysis.",
    },
    {
      question: "What is the primary purpose of input validation?",
      options: [
        "Reject malformed or unsafe data",
        "Increase screen refresh rate",
        "Replace authorization",
        "Hide server errors",
      ],
      correctAnswer: "Reject malformed or unsafe data",
      explanation:
        "Validation prevents unexpected data from reaching core application logic.",
    },
    {
      question: "Why are indexes used in relational databases?",
      options: [
        "To speed up frequent lookups and filters",
        "To encrypt all rows",
        "To replace transactions",
        "To eliminate schema design",
      ],
      correctAnswer: "To speed up frequent lookups and filters",
      explanation:
        "Indexes improve read performance for selected query patterns.",
    },
    {
      question: "What is a key benefit of automated tests?",
      options: [
        "Catch regressions early during changes",
        "Remove need for code review",
        "Guarantee zero incidents forever",
        "Automatically optimize SQL queries",
      ],
      correctAnswer: "Catch regressions early during changes",
      explanation:
        "Tests give fast feedback when behavior breaks after code changes.",
    },
    {
      question: "Why do APIs commonly use pagination?",
      options: [
        "To limit payload size and improve performance",
        "To bypass authentication",
        "To avoid indexing data",
        "To remove sorting capability",
      ],
      correctAnswer: "To limit payload size and improve performance",
      explanation:
        "Pagination keeps responses predictable and efficient for large datasets.",
    },
    {
      question:
        "What is the safest behavior when an external API is temporarily down?",
      options: [
        "Use retries/fallbacks and return clear errors",
        "Crash the app process",
        "Return random stale data silently",
        "Disable user accounts",
      ],
      correctAnswer: "Use retries/fallbacks and return clear errors",
      explanation:
        "Resilient systems handle transient dependency failures gracefully.",
    },
    {
      question: "What collaboration practice improves code quality most?",
      options: [
        "Small pull requests with reviews",
        "Pushing directly to production",
        "Skipping tests for speed",
        "Avoiding shared standards",
      ],
      correctAnswer: "Small pull requests with reviews",
      explanation:
        "Small reviewed changes improve readability, feedback quality, and maintainability.",
    },
  ],
  intermediate: [
    {
      question:
        "For {{industry}} APIs, which latency metric is most useful for user experience?",
      options: ["p95/p99 latency", "Average only", "CPU model", "Disk size"],
      correctAnswer: "p95/p99 latency",
      explanation:
        "Tail latencies better represent worst-case user impact than averages.",
    },
    {
      question:
        "What is the best strategy to prevent N+1 query issues in data access?",
      options: [
        "Use batching/eager loading patterns",
        "Run queries sequentially with delays",
        "Disable relationships",
        "Use larger VM sizes only",
      ],
      correctAnswer: "Use batching/eager loading patterns",
      explanation:
        "Batching or eager loading reduces repeated query round trips.",
    },
    {
      question: "Why are idempotency keys important on write endpoints?",
      options: [
        "Prevent duplicate side effects on retries",
        "Replace authentication",
        "Increase browser rendering speed",
        "Disable transaction logs",
      ],
      correctAnswer: "Prevent duplicate side effects on retries",
      explanation:
        "Idempotency guarantees repeated requests resolve to one consistent outcome.",
    },
    {
      question:
        "What is a robust pattern for unreliable third-party integrations?",
      options: [
        "Timeouts + retry backoff + circuit breaker",
        "Infinite immediate retries",
        "Disable logging entirely",
        "Always fail open",
      ],
      correctAnswer: "Timeouts + retry backoff + circuit breaker",
      explanation:
        "These controls isolate failures and prevent cascading service degradation.",
    },
    {
      question:
        "Which token/session storage choice is generally safer for web auth?",
      options: [
        "HTTP-only secure cookies",
        "Plaintext LocalStorage tokens",
        "Query parameter tokens",
        "Inline JS global variables",
      ],
      correctAnswer: "HTTP-only secure cookies",
      explanation:
        "HTTP-only cookies reduce exposure of auth tokens to client-side scripts.",
    },
    {
      question:
        "Why use structured logging with correlation IDs in backend services?",
      options: [
        "To trace requests across services",
        "To replace metrics systems",
        "To avoid monitoring",
        "To eliminate test coverage needs",
      ],
      correctAnswer: "To trace requests across services",
      explanation:
        "Structured logs with IDs improve debugging and incident triage speed.",
    },
    {
      question:
        "What is the most reliable way to enforce API request contracts?",
      options: [
        "Schema validation at boundaries",
        "Trusting client-side validation only",
        "Manual checks in random handlers",
        "Ignoring parse errors",
      ],
      correctAnswer: "Schema validation at boundaries",
      explanation:
        "Boundary validation keeps business logic safe from malformed input.",
    },
    {
      question: "How should password reset flows be designed securely?",
      options: [
        "Short-lived OTP + rate limiting + one-time invalidation",
        "Permanent reset links",
        "No expiration for convenience",
        "Sending passwords in email",
      ],
      correctAnswer: "Short-lived OTP + rate limiting + one-time invalidation",
      explanation:
        "Short TTL and one-time use reduce replay and account takeover risk.",
    },
    {
      question: "What is a safe approach for introducing breaking API changes?",
      options: [
        "Version APIs and provide migration window",
        "Change contracts silently overnight",
        "Remove old clients immediately",
        "Skip release notes",
      ],
      correctAnswer: "Version APIs and provide migration window",
      explanation:
        "Versioning minimizes disruptions and gives consumers a controlled upgrade path.",
    },
    {
      question: "What does least privilege mean for service credentials?",
      options: [
        "Grant only minimum required access",
        "Grant full admin by default",
        "Share root keys among all services",
        "Disable auth in non-dev environments",
      ],
      correctAnswer: "Grant only minimum required access",
      explanation:
        "Limiting privileges reduces blast radius if credentials are compromised.",
    },
  ],
  advanced: [
    {
      question:
        "What is the best approach to protect critical paths from upstream {{skill}} outages?",
      options: [
        "Circuit breakers with bounded retries and fallbacks",
        "Unlimited retries with no delay",
        "Single global lock for all traffic",
        "Ignore error budgets",
      ],
      correctAnswer: "Circuit breakers with bounded retries and fallbacks",
      explanation:
        "Isolation plus bounded recovery preserves service quality under dependency failures.",
    },
    {
      question:
        "What tradeoff does strict serializable isolation introduce at scale?",
      options: [
        "Higher consistency with potential throughput cost",
        "Lower consistency by default",
        "No effect on lock contention",
        "Eliminates all deadlocks",
      ],
      correctAnswer: "Higher consistency with potential throughput cost",
      explanation:
        "Stronger guarantees can increase contention and latency under heavy concurrency.",
    },
    {
      question:
        "How do you safely implement idempotent retries for external side effects?",
      options: [
        "Persist idempotency keys with deterministic replay",
        "Use random duplicate suppression",
        "Retry writes without request identity",
        "Disable retries completely",
      ],
      correctAnswer: "Persist idempotency keys with deterministic replay",
      explanation:
        "Durable idempotency state ensures consistent outcomes across retries.",
    },
    {
      question:
        "What rollout strategy is safest for major auth architecture changes?",
      options: [
        "Feature-flagged staged rollout with telemetry gates",
        "Big-bang deployment without canary",
        "Turn off monitoring until stable",
        "Remove rollback paths",
      ],
      correctAnswer: "Feature-flagged staged rollout with telemetry gates",
      explanation:
        "Progressive rollout limits risk and enables controlled rollback decisions.",
    },
    {
      question: "How do you mitigate OTP replay attacks effectively?",
      options: [
        "Hash OTPs, enforce short TTL, invalidate after successful use",
        "Store plaintext OTPs indefinitely",
        "Allow unlimited verification attempts",
        "Use static OTP values",
      ],
      correctAnswer:
        "Hash OTPs, enforce short TTL, invalidate after successful use",
      explanation:
        "Short-lived one-time secrets and invalidation prevent reuse and replay abuse.",
    },
    {
      question:
        "Why combine logs, metrics, and traces in production observability?",
      options: [
        "Each signal reveals different failure dimensions",
        "Only traces are needed",
        "Metrics make logs unnecessary",
        "Logs should be disabled in prod",
      ],
      correctAnswer: "Each signal reveals different failure dimensions",
      explanation:
        "A combined signal set accelerates root-cause analysis during incidents.",
    },
    {
      question: "What is the safest JWT signing secret rotation strategy?",
      options: [
        "Use key IDs with overlapping validation windows",
        "Instantly invalidate all old tokens without transition",
        "Embed secrets in frontend code",
        "Never rotate signing keys",
      ],
      correctAnswer: "Use key IDs with overlapping validation windows",
      explanation:
        "Key versioning enables zero-downtime rotation with predictable token handling.",
    },
    {
      question:
        "When should model failover activate in AI-dependent workflows?",
      options: [
        "After retry budget is exhausted on retryable failures",
        "After every first error regardless of type",
        "Randomly per request",
        "Only after manual operator action",
      ],
      correctAnswer: "After retry budget is exhausted on retryable failures",
      explanation:
        "Deterministic failover thresholds improve reliability and reduce flapping behavior.",
    },
    {
      question:
        "What is the most effective guard against LLM prompt-injection impact?",
      options: [
        "Strict output validation and least-privilege tool access",
        "Blindly trust model output",
        "Execute model text as shell commands",
        "Disable all server-side checks",
      ],
      correctAnswer: "Strict output validation and least-privilege tool access",
      explanation:
        "Validation and permission boundaries contain bad or adversarial model output.",
    },
    {
      question:
        "What is the right reliability response to intermittent upstream 503 spikes?",
      options: [
        "Automated retries, fallback content, alerting, and post-incident tuning",
        "Ignore the failures until customers complain",
        "Permanently disable the affected feature",
        "Increase timeouts indefinitely",
      ],
      correctAnswer:
        "Automated retries, fallback content, alerting, and post-incident tuning",
      explanation:
        "Layered controls keep user flows functional while operational telemetry drives improvements.",
    },
  ],
};

const renderTemplate = (text, replacements) =>
  Object.entries(replacements).reduce(
    (acc, [key, value]) => acc.replaceAll(`{{${key}}}`, value),
    text,
  );

const buildFallbackQuiz = ({ difficulty, industry, skills }) => {
  const templates =
    FALLBACK_QUESTION_TEMPLATES[difficulty] ||
    FALLBACK_QUESTION_TEMPLATES.intermediate;
  const replacements = {
    industry: industry || "technology",
    skill: skills?.[0] || "core engineering practices",
  };

  return templates.map((template) => ({
    question: renderTemplate(template.question, replacements),
    options: template.options,
    correctAnswer: template.correctAnswer,
    explanation: template.explanation,
  }));
};

const normalizeQuestion = (question, index, fallbackQuestions) => {
  const fallbackQuestion = fallbackQuestions[index];
  const rawOptions = Array.isArray(question?.options) ? question.options : [];
  const options = rawOptions
    .filter((option) => typeof option === "string")
    .map((option) => option.trim())
    .filter(Boolean);

  const prompt =
    typeof question?.question === "string" ? question.question.trim() : "";
  const correctAnswer =
    typeof question?.correctAnswer === "string"
      ? question.correctAnswer.trim()
      : "";
  const explanation =
    typeof question?.explanation === "string"
      ? question.explanation.trim()
      : "";

  if (
    !prompt ||
    options.length !== 4 ||
    !correctAnswer ||
    !options.includes(correctAnswer) ||
    !explanation
  ) {
    return fallbackQuestion;
  }

  return {
    question: prompt,
    options,
    correctAnswer,
    explanation,
  };
};

export async function generateQuiz(level = "intermediate") {
  const difficulty =
    typeof level === "string" && QUIZ_LEVELS[level.toLowerCase()]
      ? level.toLowerCase()
      : "intermediate";

  const user = await requireOnboardedUser({
    select: {
      industry: true,
      skills: true,
    },
  });

  const fallbackQuestions = buildFallbackQuiz({
    difficulty,
    industry: user.industry,
    skills: user.skills,
  });

  const prompt = `
    Generate 10 technical interview questions for a ${
      user.industry
    } professional${
      user.skills?.length ? ` with expertise in ${user.skills.join(", ")}` : ""
    } at the ${difficulty} level.

    Difficulty guidance:
    ${QUIZ_LEVELS[difficulty]}
    
    Each question should be multiple choice with 4 options.
    The questions must clearly match the selected level and progress in a realistic interview style.
    
    Return the response in this JSON format only, no additional text:
    {
      "questions": [
        {
          "question": "string",
          "options": ["string", "string", "string", "string"],
          "correctAnswer": "string",
          "explanation": "string"
        }
      ]
    }
  `;

  try {
    const result = await generateGeminiContent(prompt, {
      label: "quiz generation",
      allowFallback: true,
    });
    const parsed = parseAiJsonResponse(result.response.text());
    const rawQuestions = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.questions)
        ? parsed.questions
        : [];

    if (!rawQuestions.length) {
      throw new Error("Quiz response was empty or malformed");
    }

    return Array.from({ length: 10 }, (_, index) =>
      normalizeQuestion(rawQuestions[index], index, fallbackQuestions),
    );
  } catch (error) {
    console.error("Error generating quiz, using fallback questions:", error);
    return fallbackQuestions;
  }
}

export async function saveQuizResult(questions, answers, score) {
  const user = await requireOnboardedUser({
    select: {
      id: true,
      industry: true,
    },
  });

  const questionResults = questions.map((q, index) => ({
    question: q.question,
    answer: q.correctAnswer,
    userAnswer: answers[index],
    isCorrect: q.correctAnswer === answers[index],
    explanation: q.explanation,
  }));

  const wrongAnswers = questionResults.filter((q) => !q.isCorrect);

  let improvementTip = null;
  if (wrongAnswers.length > 0) {
    const wrongQuestionsText = wrongAnswers
      .map(
        (q) =>
          `Question: "${q.question}"\nCorrect Answer: "${q.answer}"\nUser Answer: "${q.userAnswer}"`,
      )
      .join("\n\n");

    const improvementPrompt = `
      The user got the following ${user.industry} technical interview questions wrong:

      ${wrongQuestionsText}

      Based on these mistakes, provide a concise, specific improvement tip.
      Focus on the knowledge gaps revealed by these wrong answers.
      Keep the response under 2 sentences and make it encouraging.
      Don't explicitly mention the mistakes, instead focus on what to learn/practice.
    `;

    try {
      const tipResult = await generateGeminiContent(improvementPrompt, {
        label: "improvement tip",
        allowFallback: true,
      });

      improvementTip = tipResult.response.text().trim();
    } catch (error) {
      console.error("Error generating improvement tip:", error);
    }
  }

  try {
    const assessment = await db.assessment.create({
      data: {
        userId: user.id,
        quizScore: score,
        questions: questionResults,
        category: "Technical",
        improvementTip,
      },
    });

    return assessment;
  } catch (error) {
    console.error("Error saving quiz result:", error);
    throw new Error("Failed to save quiz result");
  }
}

export async function getAssessments() {
  const user = await requireOnboardedUser({
    select: {
      id: true,
    },
  });

  try {
    const assessments = await db.assessment.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return assessments;
  } catch (error) {
    console.error("Error fetching assessments:", error);
    return [];
  }
}
