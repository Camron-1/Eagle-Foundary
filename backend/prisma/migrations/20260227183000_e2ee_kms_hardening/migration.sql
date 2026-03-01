-- Message thread encryption metadata
ALTER TABLE "MessageThread"
  ADD COLUMN IF NOT EXISTS "encryptionRequired" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "currentKeyVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "isLegacyPlaintextThread" BOOLEAN NOT NULL DEFAULT false;

-- Message encrypted payload columns
ALTER TABLE "Message"
  ALTER COLUMN "content" DROP NOT NULL;

ALTER TABLE "Message"
  ADD COLUMN IF NOT EXISTS "ciphertext" TEXT,
  ADD COLUMN IF NOT EXISTS "iv" TEXT,
  ADD COLUMN IF NOT EXISTS "keyVersion" INTEGER,
  ADD COLUMN IF NOT EXISTS "encryptionVersion" INTEGER,
  ADD COLUMN IF NOT EXISTS "isEncrypted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "senderKeyFingerprint" TEXT;

CREATE INDEX IF NOT EXISTS "Message_threadId_isEncrypted_idx" ON "Message"("threadId", "isEncrypted");

-- User message key table
CREATE TABLE IF NOT EXISTS "UserMessageKey" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "publicKeyPem" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "algorithm" TEXT NOT NULL DEFAULT 'RSA-OAEP-SHA256',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "UserMessageKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserMessageKey_userId_key" ON "UserMessageKey"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "UserMessageKey_fingerprint_key" ON "UserMessageKey"("fingerprint");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserMessageKey_userId_fkey'
  ) THEN
    ALTER TABLE "UserMessageKey"
      ADD CONSTRAINT "UserMessageKey_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Thread participants table
CREATE TABLE IF NOT EXISTS "MessageThreadParticipant" (
  "id" TEXT NOT NULL,
  "threadId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "removedAt" TIMESTAMP(3),
  CONSTRAINT "MessageThreadParticipant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MessageThreadParticipant_threadId_userId_key"
  ON "MessageThreadParticipant"("threadId", "userId");
CREATE INDEX IF NOT EXISTS "MessageThreadParticipant_threadId_idx"
  ON "MessageThreadParticipant"("threadId");
CREATE INDEX IF NOT EXISTS "MessageThreadParticipant_userId_removedAt_idx"
  ON "MessageThreadParticipant"("userId", "removedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MessageThreadParticipant_threadId_fkey'
  ) THEN
    ALTER TABLE "MessageThreadParticipant"
      ADD CONSTRAINT "MessageThreadParticipant_threadId_fkey"
      FOREIGN KEY ("threadId") REFERENCES "MessageThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MessageThreadParticipant_userId_fkey'
  ) THEN
    ALTER TABLE "MessageThreadParticipant"
      ADD CONSTRAINT "MessageThreadParticipant_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Per-user wrapped thread keys
CREATE TABLE IF NOT EXISTS "MessageKeyEnvelope" (
  "id" TEXT NOT NULL,
  "threadId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "keyVersion" INTEGER NOT NULL,
  "wrappedThreadKey" TEXT NOT NULL,
  "recipientKeyFingerprint" TEXT NOT NULL,
  "wrappedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MessageKeyEnvelope_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MessageKeyEnvelope_threadId_userId_keyVersion_key"
  ON "MessageKeyEnvelope"("threadId", "userId", "keyVersion");
CREATE INDEX IF NOT EXISTS "MessageKeyEnvelope_threadId_keyVersion_idx"
  ON "MessageKeyEnvelope"("threadId", "keyVersion");
CREATE INDEX IF NOT EXISTS "MessageKeyEnvelope_userId_keyVersion_idx"
  ON "MessageKeyEnvelope"("userId", "keyVersion");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MessageKeyEnvelope_threadId_fkey'
  ) THEN
    ALTER TABLE "MessageKeyEnvelope"
      ADD CONSTRAINT "MessageKeyEnvelope_threadId_fkey"
      FOREIGN KEY ("threadId") REFERENCES "MessageThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MessageKeyEnvelope_userId_fkey'
  ) THEN
    ALTER TABLE "MessageKeyEnvelope"
      ADD CONSTRAINT "MessageKeyEnvelope_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MessageKeyEnvelope_wrappedByUserId_fkey'
  ) THEN
    ALTER TABLE "MessageKeyEnvelope"
      ADD CONSTRAINT "MessageKeyEnvelope_wrappedByUserId_fkey"
      FOREIGN KEY ("wrappedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- File key envelope metadata
ALTER TABLE "File"
  ADD COLUMN IF NOT EXISTS "s3KeyEncrypted" JSONB,
  ADD COLUMN IF NOT EXISTS "s3KeyHash" TEXT,
  ADD COLUMN IF NOT EXISTS "encryptionKeyVersion" INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS "File_s3KeyHash_key" ON "File"("s3KeyHash");

-- High-risk form payload encryption
ALTER TABLE "Application"
  ADD COLUMN IF NOT EXISTS "sensitivePayloadEncrypted" JSONB;

ALTER TABLE "JoinRequest"
  ADD COLUMN IF NOT EXISTS "sensitivePayloadEncrypted" JSONB;

ALTER TABLE "Report"
  ADD COLUMN IF NOT EXISTS "evidenceText" TEXT,
  ADD COLUMN IF NOT EXISTS "evidenceMessageId" TEXT;

CREATE INDEX IF NOT EXISTS "Report_evidenceMessageId_idx" ON "Report"("evidenceMessageId");

-- Legacy thread backfill
UPDATE "MessageThread"
SET "isLegacyPlaintextThread" = true,
    "encryptionRequired" = false
WHERE EXISTS (
  SELECT 1
  FROM "Message" m
  WHERE m."threadId" = "MessageThread"."id"
    AND m."content" IS NOT NULL
    AND m."ciphertext" IS NULL
);
