-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "formAnswers" JSONB;

-- AlterTable
ALTER TABLE "JoinRequest" ADD COLUMN     "formAnswers" JSONB;

-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN     "customQuestions" JSONB;

-- AlterTable
ALTER TABLE "Startup" ADD COLUMN     "acceptingJoinRequests" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "customQuestions" JSONB;
