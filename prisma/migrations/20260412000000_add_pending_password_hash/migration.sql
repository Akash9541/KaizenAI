-- Migration: add_pending_password_hash
-- Date: 2026-04-12
-- Description:
--   Adds the `pendingPasswordHash` column to the User table.
--
--   This column temporarily stores a user's hashed password during sign-up,
--   BEFORE their email address is verified via OTP. On successful OTP
--   verification (POST /api/auth/verify-code), the value is atomically
--   promoted to `passwordHash` and this field is cleared to NULL.
--
--   This fixes the security issue where `passwordHash` was committed to the
--   database for unverified accounts, allowing an attacker to register with
--   a victim's email and permanently occupy the account slot.
--
-- Safe to run on existing databases: uses IF NOT EXISTS to prevent errors
-- if the column was manually added.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pendingPasswordHash" TEXT;
