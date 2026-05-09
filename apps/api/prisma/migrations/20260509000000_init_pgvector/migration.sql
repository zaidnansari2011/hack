-- Enable extensions before Prisma builds the rest of the schema.
-- (Prisma applies this migration before its generated CREATE TABLEs.)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;
