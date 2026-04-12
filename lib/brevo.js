const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const isDev = process.env.NODE_ENV !== "production";

const getBrevoConfig = () => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "AI Career Coach";

  if (!apiKey || !senderEmail) {
    return null;
  }

  return {
    apiKey,
    senderEmail,
    senderName,
  };
};

export const sendBrevoEmail = async ({ to, subject, htmlContent }) => {
  const config = getBrevoConfig();

  if (!config) {
    return { skipped: true };
  }

  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": config.apiKey,
    },
    body: JSON.stringify({
      sender: {
        email: config.senderEmail,
        name: config.senderName,
      },
      to: [{ email: to }],
      subject,
      htmlContent,
    }),
  });

  const bodyText = await response.text();

  if (!response.ok) {
    throw new Error(`Brevo email failed: ${bodyText}`);
  }

  let parsedBody = { raw: bodyText };
  try {
    parsedBody = bodyText ? JSON.parse(bodyText) : {};
  } catch {
    parsedBody = { raw: bodyText };
  }

  if (isDev) {
    console.log("Brevo email accepted:", {
      to,
      subject,
      messageId: parsedBody?.messageId || parsedBody?.messageIds?.[0] || null,
    });
  }

  return parsedBody;
};

export const sendVerificationEmail = async ({ email, token }) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const verificationUrl = `${baseUrl}/verify-email?token=${token}`;

  return sendBrevoEmail({
    to: email,
    subject: "Verify your AI Career Coach account",
    htmlContent: `
      <p>Welcome to AI Career Coach.</p>
      <p>Verify your email by clicking the link below:</p>
      <p><a href="${verificationUrl}">Verify Email</a></p>
      <p>If you did not create this account, you can ignore this email.</p>
    `,
  });
};

export const sendAuthCodeEmail = async ({ email, code, purpose }) => {
  const authPurposeMap = {
    "sign-up": "complete your sign up",
    "password-reset": "reset your password",
    "legacy-sign-in": "sign in to your account",
  };
  const authPurpose = authPurposeMap[purpose] || "verify your request";

  if (isDev) {
    console.log(`Auth code for ${email}: ${code}`);
  }

  if (!getBrevoConfig()) {
    if (isDev) {
      return { skipped: true, devCode: code };
    }

    throw new Error("Brevo email is not configured");
  }

  return sendBrevoEmail({
    to: email,
    subject: "Your AI Career Coach verification code",
    htmlContent: `
      <p>Use the following code to ${authPurpose}:</p>
      <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">${code}</p>
      <p>This code will expire in 10 minutes.</p>
      <p>If you did not request this code, you can ignore this email.</p>
    `,
  });
};
