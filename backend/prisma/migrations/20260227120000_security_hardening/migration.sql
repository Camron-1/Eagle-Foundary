-- Extend enums
ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'PENDING_ORG_VERIFICATION';
ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'PENDING_ORG_APPROVAL';

CREATE TYPE "OrgVerificationStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');
CREATE TYPE "OrgJoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "AuthChallengeType" AS ENUM ('MFA_SETUP', 'MFA_VERIFY');

-- User MFA + lockout columns
ALTER TABLE "User"
  ADD COLUMN "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "mfaSecretEncrypted" TEXT,
  ADD COLUMN "mfaEnabledAt" TIMESTAMP(3),
  ADD COLUMN "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastFailedLoginAt" TIMESTAMP(3),
  ADD COLUMN "lockedUntil" TIMESTAMP(3);

-- Refresh token session metadata
ALTER TABLE "RefreshToken"
  ADD COLUMN "userAgent" TEXT,
  ADD COLUMN "ipHash" TEXT,
  ADD COLUMN "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "revokedAt" TIMESTAMP(3);

-- Org verification columns
ALTER TABLE "Org"
  ADD COLUMN "verificationStatus" "OrgVerificationStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  ADD COLUMN "verificationSubmittedAt" TIMESTAMP(3),
  ADD COLUMN "verificationReviewedAt" TIMESTAMP(3),
  ADD COLUMN "verificationReviewNotes" TEXT,
  ADD COLUMN "verifiedDomains" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Backfill existing orgs as approved
UPDATE "Org"
SET "verificationStatus" = 'APPROVED'
WHERE "verificationStatus" = 'PENDING_REVIEW';

-- Backfill verified domains from org member emails where possible
UPDATE "Org" o
SET "verifiedDomains" = COALESCE(
  (
    SELECT ARRAY_AGG(DISTINCT split_part(lower(u."email"), '@', 2))
    FROM "User" u
    WHERE u."orgId" = o."id"
      AND position('@' in u."email") > 0
      AND u."role" IN ('COMPANY_ADMIN', 'COMPANY_MEMBER')
  ),
  ARRAY[]::TEXT[]
);

-- Org join request table
CREATE TABLE "OrgJoinRequest" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "OrgJoinRequestStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "adminNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OrgJoinRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrgJoinRequest_userId_key" ON "OrgJoinRequest"("userId");
CREATE INDEX "OrgJoinRequest_orgId_status_idx" ON "OrgJoinRequest"("orgId", "status");
CREATE INDEX "OrgJoinRequest_status_idx" ON "OrgJoinRequest"("status");

ALTER TABLE "OrgJoinRequest"
  ADD CONSTRAINT "OrgJoinRequest_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrgJoinRequest"
  ADD CONSTRAINT "OrgJoinRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrgJoinRequest"
  ADD CONSTRAINT "OrgJoinRequest_reviewedBy_fkey"
  FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- MFA auth challenge table
CREATE TABLE "AuthChallenge" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "challengeHash" TEXT NOT NULL,
  "type" "AuthChallengeType" NOT NULL,
  "tempSecretEncrypted" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AuthChallenge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuthChallenge_challengeHash_key" ON "AuthChallenge"("challengeHash");
CREATE INDEX "AuthChallenge_userId_idx" ON "AuthChallenge"("userId");
CREATE INDEX "AuthChallenge_expiresAt_idx" ON "AuthChallenge"("expiresAt");

ALTER TABLE "AuthChallenge"
  ADD CONSTRAINT "AuthChallenge_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- MFA backup codes table
CREATE TABLE "UserBackupCode" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserBackupCode_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserBackupCode_userId_usedAt_idx" ON "UserBackupCode"("userId", "usedAt");

ALTER TABLE "UserBackupCode"
  ADD CONSTRAINT "UserBackupCode_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
