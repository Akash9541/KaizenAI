ALTER TABLE "User"
ALTER COLUMN "clerkUserId" DROP NOT NULL,
ADD COLUMN "passwordHash" TEXT,
ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "emailVerificationToken" TEXT,
ADD COLUMN "emailVerificationExpiry" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_emailVerificationToken_key"
ON "User"("emailVerificationToken");
