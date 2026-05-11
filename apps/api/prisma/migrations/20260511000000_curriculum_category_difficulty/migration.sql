-- Add category + difficulty to Curriculum to power the multi-domain
-- bounty catalog and its filter UI. Existing rows default to engineering
-- + intermediate; seed.ts re-tags them with their real values.

ALTER TABLE "Curriculum" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'engineering';
ALTER TABLE "Curriculum" ADD COLUMN "difficulty" TEXT NOT NULL DEFAULT 'intermediate';

CREATE INDEX "Curriculum_category_idx" ON "Curriculum"("category");
CREATE INDEX "Curriculum_difficulty_idx" ON "Curriculum"("difficulty");
