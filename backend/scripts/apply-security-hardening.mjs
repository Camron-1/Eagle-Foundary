import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const statements = [
  `ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'PENDING_ORG_VERIFICATION'`,
  `ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'PENDING_ORG_APPROVAL'`,

  `DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrgVerificationStatus') THEN
      CREATE TYPE "OrgVerificationStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');
    END IF;
  END
  $$`,
  `DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrgJoinRequestStatus') THEN
      CREATE TYPE "OrgJoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
    END IF;
  END
  $$`,
  `DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuthChallengeType') THEN
      CREATE TYPE "AuthChallengeType" AS ENUM ('MFA_SETUP', 'MFA_VERIFY');
    END IF;
  END
  $$`,

  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaEnabled" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaSecretEncrypted" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaEnabledAt" TIMESTAMP(3)`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "failedLoginCount" INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastFailedLoginAt" TIMESTAMP(3)`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3)`,

  `ALTER TABLE "RefreshToken" ADD COLUMN IF NOT EXISTS "userAgent" TEXT`,
  `ALTER TABLE "RefreshToken" ADD COLUMN IF NOT EXISTS "ipHash" TEXT`,
  `ALTER TABLE "RefreshToken" ADD COLUMN IF NOT EXISTS "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
  `ALTER TABLE "RefreshToken" ADD COLUMN IF NOT EXISTS "revokedAt" TIMESTAMP(3)`,

  `ALTER TABLE "Org" ADD COLUMN IF NOT EXISTS "verificationStatus" "OrgVerificationStatus" NOT NULL DEFAULT 'PENDING_REVIEW'`,
  `ALTER TABLE "Org" ADD COLUMN IF NOT EXISTS "verificationSubmittedAt" TIMESTAMP(3)`,
  `ALTER TABLE "Org" ADD COLUMN IF NOT EXISTS "verificationReviewedAt" TIMESTAMP(3)`,
  `ALTER TABLE "Org" ADD COLUMN IF NOT EXISTS "verificationReviewNotes" TEXT`,
  `ALTER TABLE "Org" ADD COLUMN IF NOT EXISTS "verifiedDomains" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]`,

  `UPDATE "Org"
   SET "verificationStatus" = 'APPROVED'
   WHERE "verificationStatus" = 'PENDING_REVIEW'`,
  `UPDATE "Org" o
   SET "verifiedDomains" = COALESCE(
    (
      SELECT ARRAY_AGG(DISTINCT split_part(lower(u."email"), '@', 2))
      FROM "User" u
      WHERE u."orgId" = o."id"
        AND position('@' in u."email") > 0
        AND u."role" IN ('COMPANY_ADMIN', 'COMPANY_MEMBER')
    ),
    ARRAY[]::TEXT[]
   )
   WHERE COALESCE(array_length(o."verifiedDomains", 1), 0) = 0`,

  `CREATE TABLE IF NOT EXISTS "OrgJoinRequest" (
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
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "OrgJoinRequest_userId_key" ON "OrgJoinRequest"("userId")`,
  `CREATE INDEX IF NOT EXISTS "OrgJoinRequest_orgId_status_idx" ON "OrgJoinRequest"("orgId", "status")`,
  `CREATE INDEX IF NOT EXISTS "OrgJoinRequest_status_idx" ON "OrgJoinRequest"("status")`,
  `DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrgJoinRequest_orgId_fkey') THEN
      ALTER TABLE "OrgJoinRequest"
      ADD CONSTRAINT "OrgJoinRequest_orgId_fkey"
      FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrgJoinRequest_userId_fkey') THEN
      ALTER TABLE "OrgJoinRequest"
      ADD CONSTRAINT "OrgJoinRequest_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrgJoinRequest_reviewedBy_fkey') THEN
      ALTER TABLE "OrgJoinRequest"
      ADD CONSTRAINT "OrgJoinRequest_reviewedBy_fkey"
      FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END
  $$`,

  `CREATE TABLE IF NOT EXISTS "AuthChallenge" (
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
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "AuthChallenge_challengeHash_key" ON "AuthChallenge"("challengeHash")`,
  `CREATE INDEX IF NOT EXISTS "AuthChallenge_userId_idx" ON "AuthChallenge"("userId")`,
  `CREATE INDEX IF NOT EXISTS "AuthChallenge_expiresAt_idx" ON "AuthChallenge"("expiresAt")`,
  `DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AuthChallenge_userId_fkey') THEN
      ALTER TABLE "AuthChallenge"
      ADD CONSTRAINT "AuthChallenge_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END
  $$`,

  `CREATE TABLE IF NOT EXISTS "UserBackupCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserBackupCode_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "UserBackupCode_userId_usedAt_idx" ON "UserBackupCode"("userId", "usedAt")`,
  `DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserBackupCode_userId_fkey') THEN
      ALTER TABLE "UserBackupCode"
      ADD CONSTRAINT "UserBackupCode_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END
  $$`,
];

function isIgnorableSqlError(message) {
  const normalized = String(message || '').toLowerCase();
  return (
    normalized.includes('already exists') ||
    normalized.includes('duplicate_object') ||
    normalized.includes('duplicate key value')
  );
}

async function run() {
  let applied = 0;
  let skipped = 0;

  for (const statement of statements) {
    try {
      await db.$executeRawUnsafe(statement);
      applied += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isIgnorableSqlError(message)) {
        skipped += 1;
        continue;
      }
      throw error;
    }
  }

  console.log(`Security schema sync complete. Applied: ${applied}, skipped: ${skipped}.`);
}

run()
  .catch((error) => {
    console.error('Security schema sync failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
