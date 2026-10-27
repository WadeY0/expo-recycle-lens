-- Additive migration: old OTPs have unknown purpose and cannot be reused.
CREATE TYPE "OtpPurpose" AS ENUM ('email_verification', 'password_reset');
ALTER TABLE "users" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "otps" ADD COLUMN "purpose" "OtpPurpose",
                   ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "otps_userId_purpose_createdAt_idx" ON "otps"("userId", "purpose", "createdAt");
ALTER TABLE "otps" ADD CONSTRAINT "otps_attempts_nonnegative" CHECK ("attempts" >= 0);
