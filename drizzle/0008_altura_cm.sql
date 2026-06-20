--> statement-breakpoint
ALTER TABLE "aluno" ADD COLUMN "altura_cm" integer;
--> statement-breakpoint
UPDATE "aluno" SET "altura_cm" = ROUND("altura_m"::numeric * 100)::integer WHERE "altura_m" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "aluno" DROP COLUMN IF EXISTS "altura_m";
--> statement-breakpoint
ALTER TABLE "avaliacao_fisica" ADD COLUMN "altura_cm" integer;
--> statement-breakpoint
UPDATE "avaliacao_fisica" SET "altura_cm" = ROUND("altura_m"::numeric * 100)::integer WHERE "altura_m" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "avaliacao_fisica" DROP COLUMN IF EXISTS "altura_m";
