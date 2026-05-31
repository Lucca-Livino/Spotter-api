CREATE TABLE "exercicio_midia_cache" (
	"nome_pt" varchar(255) PRIMARY KEY NOT NULL,
	"animacao_url" varchar(500) NOT NULL,
	"exercisedb_id" varchar(50),
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "aluno" ADD COLUMN "peso_atual_kg" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "aluno" ADD COLUMN "altura_m" numeric(3, 2);--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "tipo" text DEFAULT 'aluno' NOT NULL;