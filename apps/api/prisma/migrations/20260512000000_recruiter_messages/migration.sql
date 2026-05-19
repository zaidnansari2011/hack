-- Recruiter outreach: a public /recruit visitor can send an anonymous
-- message to a verified candidate. Recipient is resolved by wallet address
-- (matched against OnchainProof.studentAddress) and stored as a real userId
-- so the student's inbox can read them with a normal join. The reply is
-- stored inline; we don't expose a recruiter inbox in this app.

CREATE TABLE "RecruiterMessage" (
  "id"               TEXT PRIMARY KEY,
  "recipientUserId"  TEXT NOT NULL,
  "recipientAddress" TEXT NOT NULL,
  "senderName"       TEXT NOT NULL,
  "senderEmail"      TEXT NOT NULL,
  "senderCompany"    TEXT,
  "subject"          TEXT NOT NULL,
  "body"             TEXT NOT NULL,
  "readAt"           TIMESTAMP(3),
  "replyBody"        TEXT,
  "repliedAt"        TIMESTAMP(3),
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecruiterMessage_recipientUserId_fkey"
    FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "RecruiterMessage_recipientUserId_createdAt_idx"
  ON "RecruiterMessage"("recipientUserId", "createdAt");
