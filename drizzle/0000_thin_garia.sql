CREATE TYPE "public"."dia_semana" AS ENUM('SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO', 'DOMINGO');--> statement-breakpoint
CREATE TYPE "public"."grupo_muscular" AS ENUM('PEITO', 'COSTAS', 'PERNAS', 'BRAÇOS', 'OMBROS', 'ABDOMEN');--> statement-breakpoint
CREATE TYPE "public"."remetente_tipo" AS ENUM('ALUNO', 'TREINADOR');--> statement-breakpoint
CREATE TYPE "public"."sexo" AS ENUM('M', 'F');--> statement-breakpoint
CREATE TYPE "public"."status_serie" AS ENUM('PENDENTE', 'CONCLUIDA', 'PULADA');--> statement-breakpoint
CREATE TYPE "public"."status_sessao" AS ENUM('EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA');--> statement-breakpoint
CREATE TYPE "public"."tipo_ativacao" AS ENUM('PRIMARIO', 'SECUNDARIO');--> statement-breakpoint
CREATE TYPE "public"."turno" AS ENUM('MANHA', 'TARDE', 'NOITE');--> statement-breakpoint
CREATE TABLE "academia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" varchar(255) NOT NULL,
	"endereco_numero" varchar(20) NOT NULL,
	"endereco_rua" varchar(255) NOT NULL,
	"endereco_bairro" varchar(255) NOT NULL,
	"endereco_cidade" varchar(255) NOT NULL,
	"endereco_estado" varchar(2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aluno" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"url_foto" varchar(255),
	"nome" varchar(255) NOT NULL,
	"data_nascimento" date NOT NULL,
	"sexo" "sexo" NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"status_conta" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"academia_id" uuid NOT NULL,
	"treinador_id" uuid,
	CONSTRAINT "aluno_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "aluno_academia" (
	"aluno_id" uuid NOT NULL,
	"academia_id" uuid NOT NULL,
	CONSTRAINT "aluno_academia_aluno_id_academia_id_pk" PRIMARY KEY("aluno_id","academia_id")
);
--> statement-breakpoint
CREATE TABLE "aparelho" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" varchar(255) NOT NULL,
	"descricao" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "avaliacao_fisica" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"data_avaliacao" date DEFAULT CURRENT_DATE NOT NULL,
	"peso_kg" numeric(5, 2) NOT NULL,
	"altura_m" numeric(3, 2) NOT NULL,
	"aluno_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"treinador_id" uuid NOT NULL,
	"aluno_id" uuid NOT NULL,
	"ativa" boolean DEFAULT true NOT NULL,
	"ultima_mensagem_em" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercicio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" varchar(255) NOT NULL,
	"descricao" text,
	"animacao_url" varchar(255),
	"aluno_id" uuid,
	"deletado_em" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercicio_aparelho" (
	"exercicio_id" uuid NOT NULL,
	"aparelho_id" uuid NOT NULL,
	CONSTRAINT "exercicio_aparelho_exercicio_id_aparelho_id_pk" PRIMARY KEY("exercicio_id","aparelho_id")
);
--> statement-breakpoint
CREATE TABLE "exercicio_musculo" (
	"tipo_ativacao" "tipo_ativacao" NOT NULL,
	"exercicio_id" uuid NOT NULL,
	"musculo_id" uuid NOT NULL,
	CONSTRAINT "exercicio_musculo_exercicio_id_musculo_id_pk" PRIMARY KEY("exercicio_id","musculo_id")
);
--> statement-breakpoint
CREATE TABLE "mensagem_conversa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversa_id" uuid NOT NULL,
	"remetente_tipo" "remetente_tipo" NOT NULL,
	"remetente_user_id" text NOT NULL,
	"conteudo" text NOT NULL,
	"enviada_em" timestamp DEFAULT now() NOT NULL,
	"lida_em" timestamp,
	"lida_por_user_id" text,
	"ativa" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "musculo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" varchar(255) NOT NULL,
	"grupo_muscular" "grupo_muscular" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessao_exercicio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sessao_treino_id" uuid NOT NULL,
	"treino_exercicio_id" uuid NOT NULL,
	"concluido" boolean DEFAULT false NOT NULL,
	"observacoes" text,
	"ordem" integer DEFAULT 0 NOT NULL,
	"inicio" timestamp,
	"fim" timestamp
);
--> statement-breakpoint
CREATE TABLE "sessao_serie" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sessao_exercicio_id" uuid NOT NULL,
	"numero_serie" integer NOT NULL,
	"repeticoes_realizadas" integer,
	"carga_utilizada" numeric(5, 2),
	"status" "status_serie" DEFAULT 'PENDENTE' NOT NULL,
	"observacoes" text
);
--> statement-breakpoint
CREATE TABLE "sessao_treino" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"aluno_id" uuid NOT NULL,
	"treino_id" uuid NOT NULL,
	"status" "status_sessao" DEFAULT 'EM_ANDAMENTO' NOT NULL,
	"inicio" timestamp DEFAULT now() NOT NULL,
	"fim" timestamp,
	"observacoes" text
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "treinador" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"url_foto" varchar(255),
	"nome" varchar(255) NOT NULL,
	"data_nascimento" date NOT NULL,
	"sexo" "sexo" NOT NULL,
	"cref" varchar(50) NOT NULL,
	"turnos" "turno"[] NOT NULL,
	"especializacao" varchar(255) NOT NULL,
	"graduacao" varchar(255) NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"status_conta" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"academia_id" uuid NOT NULL,
	CONSTRAINT "treinador_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "treinador_cref_unique" UNIQUE("cref")
);
--> statement-breakpoint
CREATE TABLE "treinador_academia" (
	"treinador_id" uuid NOT NULL,
	"academia_id" uuid NOT NULL,
	CONSTRAINT "treinador_academia_treinador_id_academia_id_pk" PRIMARY KEY("treinador_id","academia_id")
);
--> statement-breakpoint
CREATE TABLE "treino" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" varchar(255) NOT NULL,
	"descricao" text,
	"data_criacao" timestamp DEFAULT now() NOT NULL,
	"deletado_em" timestamp,
	"usuario_id" uuid NOT NULL,
	"treinador_id" uuid,
	"dias_semana" "dia_semana"[],
	"ordem" integer
);
--> statement-breakpoint
CREATE TABLE "treino_exercicio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"series" integer NOT NULL,
	"repeticoes" varchar(50) NOT NULL,
	"carga_sugerida" numeric(5, 2),
	"tempo_descanso_segundos" integer NOT NULL,
	"ordem_execucao" integer NOT NULL,
	"treino_id" uuid NOT NULL,
	"exercicio_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aluno" ADD CONSTRAINT "aluno_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aluno" ADD CONSTRAINT "aluno_academia_id_academia_id_fk" FOREIGN KEY ("academia_id") REFERENCES "public"."academia"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aluno" ADD CONSTRAINT "aluno_treinador_id_treinador_id_fk" FOREIGN KEY ("treinador_id") REFERENCES "public"."treinador"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aluno_academia" ADD CONSTRAINT "aluno_academia_aluno_id_aluno_id_fk" FOREIGN KEY ("aluno_id") REFERENCES "public"."aluno"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aluno_academia" ADD CONSTRAINT "aluno_academia_academia_id_academia_id_fk" FOREIGN KEY ("academia_id") REFERENCES "public"."academia"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avaliacao_fisica" ADD CONSTRAINT "avaliacao_fisica_aluno_id_aluno_id_fk" FOREIGN KEY ("aluno_id") REFERENCES "public"."aluno"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversa" ADD CONSTRAINT "conversa_treinador_id_treinador_id_fk" FOREIGN KEY ("treinador_id") REFERENCES "public"."treinador"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversa" ADD CONSTRAINT "conversa_aluno_id_aluno_id_fk" FOREIGN KEY ("aluno_id") REFERENCES "public"."aluno"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercicio" ADD CONSTRAINT "exercicio_aluno_id_aluno_id_fk" FOREIGN KEY ("aluno_id") REFERENCES "public"."aluno"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercicio_aparelho" ADD CONSTRAINT "exercicio_aparelho_exercicio_id_exercicio_id_fk" FOREIGN KEY ("exercicio_id") REFERENCES "public"."exercicio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercicio_aparelho" ADD CONSTRAINT "exercicio_aparelho_aparelho_id_aparelho_id_fk" FOREIGN KEY ("aparelho_id") REFERENCES "public"."aparelho"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercicio_musculo" ADD CONSTRAINT "exercicio_musculo_exercicio_id_exercicio_id_fk" FOREIGN KEY ("exercicio_id") REFERENCES "public"."exercicio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercicio_musculo" ADD CONSTRAINT "exercicio_musculo_musculo_id_musculo_id_fk" FOREIGN KEY ("musculo_id") REFERENCES "public"."musculo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensagem_conversa" ADD CONSTRAINT "mensagem_conversa_conversa_id_conversa_id_fk" FOREIGN KEY ("conversa_id") REFERENCES "public"."conversa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensagem_conversa" ADD CONSTRAINT "mensagem_conversa_remetente_user_id_user_id_fk" FOREIGN KEY ("remetente_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensagem_conversa" ADD CONSTRAINT "mensagem_conversa_lida_por_user_id_user_id_fk" FOREIGN KEY ("lida_por_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessao_exercicio" ADD CONSTRAINT "sessao_exercicio_sessao_treino_id_sessao_treino_id_fk" FOREIGN KEY ("sessao_treino_id") REFERENCES "public"."sessao_treino"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessao_exercicio" ADD CONSTRAINT "sessao_exercicio_treino_exercicio_id_treino_exercicio_id_fk" FOREIGN KEY ("treino_exercicio_id") REFERENCES "public"."treino_exercicio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessao_serie" ADD CONSTRAINT "sessao_serie_sessao_exercicio_id_sessao_exercicio_id_fk" FOREIGN KEY ("sessao_exercicio_id") REFERENCES "public"."sessao_exercicio"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessao_treino" ADD CONSTRAINT "sessao_treino_aluno_id_aluno_id_fk" FOREIGN KEY ("aluno_id") REFERENCES "public"."aluno"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessao_treino" ADD CONSTRAINT "sessao_treino_treino_id_treino_id_fk" FOREIGN KEY ("treino_id") REFERENCES "public"."treino"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treinador" ADD CONSTRAINT "treinador_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treinador" ADD CONSTRAINT "treinador_academia_id_academia_id_fk" FOREIGN KEY ("academia_id") REFERENCES "public"."academia"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treinador_academia" ADD CONSTRAINT "treinador_academia_treinador_id_treinador_id_fk" FOREIGN KEY ("treinador_id") REFERENCES "public"."treinador"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treinador_academia" ADD CONSTRAINT "treinador_academia_academia_id_academia_id_fk" FOREIGN KEY ("academia_id") REFERENCES "public"."academia"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treino" ADD CONSTRAINT "treino_usuario_id_aluno_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."aluno"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treino" ADD CONSTRAINT "treino_treinador_id_treinador_id_fk" FOREIGN KEY ("treinador_id") REFERENCES "public"."treinador"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treino_exercicio" ADD CONSTRAINT "treino_exercicio_treino_id_treino_id_fk" FOREIGN KEY ("treino_id") REFERENCES "public"."treino"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treino_exercicio" ADD CONSTRAINT "treino_exercicio_exercicio_id_exercicio_id_fk" FOREIGN KEY ("exercicio_id") REFERENCES "public"."exercicio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "conversa_treinador_aluno_unique" ON "conversa" USING btree ("treinador_id","aluno_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessao_treino_aluno_em_andamento_idx" ON "sessao_treino" USING btree ("aluno_id") WHERE "sessao_treino"."status" = 'EM_ANDAMENTO';