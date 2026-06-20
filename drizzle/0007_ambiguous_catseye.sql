CREATE TABLE "exercicio_midia_cache" (
	"nome_pt" varchar(255) PRIMARY KEY NOT NULL,
	"animacao_url" varchar(500) NOT NULL,
	"exercisedb_id" varchar(50),
	"updated_at" timestamp DEFAULT now() NOT NULL
);
