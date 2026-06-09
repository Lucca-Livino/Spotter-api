CREATE TYPE "public"."status_solicitacao" AS ENUM('PENDENTE', 'ACEITA', 'RECUSADA');--> statement-breakpoint
CREATE TABLE "exercicio_midia_cache" (
	"nome_pt" varchar(255) PRIMARY KEY NOT NULL,
	"animacao_url" varchar(500) NOT NULL,
	"exercisedb_id" varchar(50),
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "solicitacao_treinador" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"aluno_id" uuid NOT NULL,
	"treinador_id" uuid NOT NULL,
	"status" "status_solicitacao" DEFAULT 'PENDENTE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "solicitacao_treinador" ADD CONSTRAINT "solicitacao_treinador_aluno_id_aluno_id_fk" FOREIGN KEY ("aluno_id") REFERENCES "public"."aluno"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitacao_treinador" ADD CONSTRAINT "solicitacao_treinador_treinador_id_treinador_id_fk" FOREIGN KEY ("treinador_id") REFERENCES "public"."treinador"("id") ON DELETE cascade ON UPDATE no action;