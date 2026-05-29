ALTER TABLE "aluno" ADD COLUMN "peso_atual_kg" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "aluno" ADD COLUMN "altura_m" numeric(3, 2);--> statement-breakpoint
ALTER TABLE "aluno" ADD COLUMN "fcm_token" text;--> statement-breakpoint
ALTER TABLE "treinador" ADD COLUMN "fcm_token" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "tipo" text DEFAULT 'aluno' NOT NULL;