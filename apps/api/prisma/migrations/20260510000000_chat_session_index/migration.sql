-- Add sessionIndex to ChatMessage to support multiple conversation sessions
-- per enrollment. Existing messages default to session 0.

ALTER TABLE "ChatMessage" ADD COLUMN "sessionIndex" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "ChatMessage_enrollmentId_sessionIndex_idx" ON "ChatMessage"("enrollmentId", "sessionIndex");
