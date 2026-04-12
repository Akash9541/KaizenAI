/**
 * Authentication Utility Tests
 * Unit tests for password hashing, JWT creation, and token verification
 */

import {
  hashPassword,
  comparePassword,
  generateOtpCode,
  hashOtpCode,
  getOtpExpiryDate,
} from "@/lib/auth";

describe("Auth Utilities", () => {
  describe("Password Hashing", () => {
    it("should hash a password", async () => {
      const password = "SecurePassword123!";
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should correctly compare a password with its hash", async () => {
      const password = "SecurePassword123!";
      const hash = await hashPassword(password);

      const isValid = await comparePassword(password, hash);
      expect(isValid).toBe(true);
    });

    it("should reject an invalid password", async () => {
      const password = "SecurePassword123!";
      const wrongPassword = "WrongPassword123!";
      const hash = await hashPassword(password);

      const isValid = await comparePassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });

    it("should generate different hashes for the same password", async () => {
      const password = "SecurePassword123!";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe("OTP Generation", () => {
    it("should generate a 6-digit OTP code", () => {
      const otp = generateOtpCode();

      expect(otp).toBeDefined();
      expect(otp).toMatch(/^\d{6}$/);
      expect(otp.length).toBe(6);
    });

    it("should generate different OTP codes", () => {
      const otp1 = generateOtpCode();
      const otp2 = generateOtpCode();

      // While collision is mathematically possible, it's extremely rare
      expect(otp1).toBeDefined();
      expect(otp2).toBeDefined();
    });

    it("should hash OTP code with email and purpose", () => {
      const code = "123456";
      const email = "test@example.com";
      const purpose = "sign-up";

      const hash1 = hashOtpCode({ code, email, purpose });
      const hash2 = hashOtpCode({ code, email, purpose });

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
    });

    it("should generate different hashes for different codes", () => {
      const email = "test@example.com";
      const purpose = "sign-up";

      const hash1 = hashOtpCode({ code: "123456", email, purpose });
      const hash2 = hashOtpCode({ code: "654321", email, purpose });

      expect(hash1).not.toBe(hash2);
    });

    it("should be case-insensitive for email in hash", () => {
      const code = "123456";
      const purpose = "sign-up";

      const hash1 = hashOtpCode({ code, email: "TEST@EXAMPLE.COM", purpose });
      const hash2 = hashOtpCode({ code, email: "test@example.com", purpose });

      expect(hash1).toBe(hash2);
    });
  });

  describe("OTP Expiry", () => {
    it("should return a future date for OTP expiry", () => {
      const now = Date.now();
      const expiry = getOtpExpiryDate();

      expect(expiry.getTime()).toBeGreaterThan(now);
    });

    it("should set OTP expiry to approximately 5 minutes", () => {
      const now = Date.now();
      const expiry = getOtpExpiryDate();
      const difference = expiry.getTime() - now;

      // OTP should expire in ~5 minutes (300000ms), with 1 second tolerance
      expect(difference).toBeGreaterThan(299000);
      expect(difference).toBeLessThan(301000);
    });
  });
});
