# Spotter — API de Controle de Atividades Físicas

Backend da plataforma **Spotter**, responsável por toda a lógica de negócio, persistência de dados, autenticação, chat em tempo real e notificações push.

---

## O que é

O Spotter é uma solução integrada para gerenciamento de atividades físicas, conectando **personal trainers** e **alunos** em um único ecossistema. A API fornece os endpoints consumidos pelo aplicativo Android, além de gerenciar mídia de exercícios, histórico de treinos e comunicação em tempo real.

---

## Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Runtime | Node.js 22+ com TypeScript |
| Framework HTTP | Express.js |
| ORM | Drizzle ORM |
| Banco de dados | PostgreSQL 17 |
| Autenticação | BetterAuth (JWT + sessões seguras) |
| Chat em tempo real | Socket.IO |
| Object storage (mídia) | MinIO |
| Validação de dados | Zod |
| Documentação da API | Swagger / OpenAPI 3 (`@asteasolutions/zod-to-openapi`) |
| Testes | Jest + Supertest |
| Containerização | Docker + Docker Compose |
| Deploy | Kubernetes / k3s (Traefik Ingress) |
| E-mail transacional | Hermes (serviço interno fslab) |
| Notificações push | NPaaS (serviço interno fslab) |

---

## Integrações externas

### ExerciseDB via RapidAPI

A API consome a [ExerciseDB](https://rapidapi.com/justin-WFnsXH_t6/api/exercisedb) — disponível gratuitamente no plano Basic da RapidAPI — para obter GIFs animados e metadados de exercícios (nome, músculo-alvo, aparelho e URL de animação).

O consumo é feito sob demanda e os resultados são cacheados na tabela `exercicio_midia_cache` do banco de dados, minimizando chamadas à API externa.

Variáveis de ambiente necessárias:
```
EXERCISEDB_API_KEY=<sua-chave-rapidapi>
EXERCISEDB_API_HOST=exercisedb.p.rapidapi.com
EXERCISEDB_BASE_URL=https://exercisedb.p.rapidapi.com
```

> **Licença de uso:** plano Free (Basic) da RapidAPI — 500 requisições/mês sem custo.
> Consulte os [Termos de Uso da RapidAPI](https://rapidapi.com/terms) e a [página da ExerciseDB](https://rapidapi.com/justin-WFnsXH_t6/api/exercisedb) para detalhes de cotas e condições.

---

## Ambientes de deploy

| Ambiente | URL | Branch | Banco |
|----------|-----|--------|-------|
| **Produção** | `https://atividadesfisicas-api.yuriprojects.dpdns.org` | `main` | `aplicativo_atividades_fisicas` |
| **QA** | `https://atividadesfisicas-api-qa.yuriprojects.dpdns.org` | `develop` | `aplicativo_atividades_fisicas_qa` |

> **Recomendação:** utilize o ambiente **QA** para testes, pois é o ambiente integrado à versão atual do aplicativo Android em uso. O ambiente de produção reflete apenas versões estáveis mescladas à `main`.

A documentação interativa (Swagger UI) está disponível em `/api/docs` em ambos os ambientes:
- QA: `https://atividadesfisicas-api-qa.yuriprojects.dpdns.org/api/docs`
- Prod: `https://atividadesfisicas-api.yuriprojects.dpdns.org/api/docs`

---

## Infraestrutura

```
Internet
  └─ Traefik (Ingress Controller)
       ├─ atividadesfisicas-api.yuriprojects.dpdns.org     → Pod API (:1350)  [main → prod]
       └─ atividadesfisicas-api-qa.yuriprojects.dpdns.org  → Pod API QA (:1350)  [develop → qa]
            └─ PostgreSQL 17 (:5432)
                 ├─ aplicativo_atividades_fisicas      (prod)
                 └─ aplicativo_atividades_fisicas_qa   (qa — banco isolado)
```

O CI/CD é gerenciado pelo GitLab Runner instalado no namespace `tools` do cluster. A cada merge na `develop` ou `main`, a imagem Docker é construída, publicada no Docker Hub (`yurizetoles/atividades_fisicas_api:latest`) e o deployment reiniciado automaticamente.

Para instruções completas de deploy (Kubernetes), consulte [`deploy/DEPLOY-API.md`](deploy/DEPLOY-API.md).

---

## Como rodar localmente

### Pré-requisitos

- [Node.js 22+](https://nodejs.org/)
- [Docker](https://www.docker.com/) e Docker Compose

### Opção 1 — Dev local (banco via Docker)

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com as credenciais do banco local

# 3. Subir apenas o PostgreSQL
docker compose up -d

# 4. Criar tabelas (apenas na primeira vez ou após mudanças no schema)
npm run migrate:push

# 5. Popular o banco com dados iniciais
npm run seed

# 6. Iniciar a API com hot reload
npm run dev
```

API disponível em `http://localhost:1350`

### Opção 2 — Dev completo com Docker (recomendado)

```bash
# 1. Configurar variáveis de ambiente
cp .env.example .env

# 2. Subir API + banco com hot reload via volume
docker compose -f docker-compose-dev.yml up --build
```

Com os containers rodando, em outro terminal:

```bash
# 3. Criar tabelas (apenas na primeira vez)
docker exec api-atividades-fisicas npx drizzle-kit push --force

# 4. Popular o banco com dados iniciais
docker exec api-atividades-fisicas npm run seed
```

API disponível em `http://localhost:1350`

---

## Scripts disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia com hot reload (tsx watch) |
| `npm run build` | Compila TypeScript para `dist/` |
| `npm run start` | Inicia versão compilada (produção) |
| `npm run seed` | Limpa e repopula o banco com dados iniciais |
| `npm run migrate:push` | Aplica o schema Drizzle diretamente no banco |
| `npm run migrate:studio` | Abre o Drizzle Studio (interface visual do banco) |
| `npm test` | Executa os testes com Jest |

---

## Estrutura do projeto

```
src/
├── config/         # Conexão com banco e schema Drizzle
├── controllers/    # Camada de entrada HTTP
├── services/       # Lógica de negócio
├── repositories/   # Acesso ao banco de dados
├── routes/         # Definição de rotas Express
├── middlewares/    # Auth, validação, upload
├── integrations/   # Clientes externos (ExerciseDB, Hermes, NPaaS)
├── seeds/          # Dados iniciais para desenvolvimento
├── types/          # Tipos TypeScript globais
├── utils/          # Helpers e utilitários
├── docs/           # Schemas OpenAPI
└── server.ts       # Ponto de entrada
```

---

## Principais rotas

| Prefixo | Descrição |
|---------|-----------|
| `/api/auth` | Autenticação (login, registro, sessão — BetterAuth) |
| `/api/aluno` | Perfil e dados do aluno |
| `/api/treinador` | Perfil e dados do treinador |
| `/api/treino` | CRUD de treinos e exercícios |
| `/api/sessao` | Registro e histórico de sessões de treino |
| `/api/conversa` | Chat (REST + Socket.IO) |
| `/api/exercicio` | Biblioteca de exercícios |
| `/api/exercisedb` | Sincronização de mídias via ExerciseDB |
| `/api/academia` | Cadastro e gestão de academias |
| `/api/aparelho` | Catálogo de aparelhos |
| `/api/historico` | Estatísticas e gráficos de progresso |
| `/api/solicitacao-treinador` | Fluxo de vinculação aluno-treinador |
| `/api/upload` | Upload de arquivos e fotos de perfil |
| `/api/media` | Servir mídias de exercícios (MinIO) |
| `/api/docs` | Swagger UI |

---

## Usuários seed para desenvolvimento/QA

| Tipo | E-mail | Senha |
|------|--------|-------|
| Treinador | `marcos.rocha@personalfit.com` | `Treinador@2026!` |
| Treinador | `fernanda.almeida@personalfit.com` | `Treinador@2026!` |
| Aluno (com treinador vinculado) | `carlos.silva@gmail.com` | `Aluno@2026!` |
| Aluno (sem treinador) | `juliana.lima@outlook.com` | `Aluno@2026!` |

---

## Equipe

Projeto acadêmico desenvolvido no **IFRO** — Instituto Federal de Rondônia, disciplina Fábrica de Software IV (2026).

| Nome | Papel | Contato |
|------|-------|---------|
| Yuri Zetoles | Desenvolvedor | yurizetoles0123@gmail.com |
| Lucca Livino | Desenvolvedor | lucca.f.livino@gmail.com |
| Ruan Lopes | Desenvolvedor | intel.spec.lopes@gmail.com |
| José Lucas Brandão Montes | Professor / Cliente | lucas.montes@ifro.edu.br |

---

## Licença

Este projeto é de uso acadêmico e não possui licença de distribuição pública. Todos os direitos reservados aos autores.
