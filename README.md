# Fabrica 4 Api - Controle de Atividades Físicas

## O que é o sistema?
Sistema de treino para comunicação entre aluno e personal trainer.

O sistema deve ser pensado a poder ser utilizado tanto antes, quanto durante e pós treino.

Aplicativo deve possuir capacidades semelhantes a de apps referência: **Trainiac** e **GymDay.**
#### GymDay
Facilidade de utilizar para o aluno durante os treinos.
#### Trainiac
Facilidade de montagem de treinos para o personal trainer.

## O que deve ter?
Chat Aluno-Instrutor

GIFs e/ou Videos demonstrando os exercícios

## Identidade Visual
**Cores:** Verde e Cinza

## Features
* Treinos
    * Capacidade de modificar os exercícios (peso, series de repetição, quantidade de repetições).
    * Histórico de treino para ambos: aluno e instrutor.
    * Lista pré existente de exercícios possíveis mas também a capacidade de **criar** um exercício novo livremente.
    * Capacidade de pesquisar exercícios tanto por tipo/modelo de aparelho quanto por músculo a ser treinado.
* Instrutor
    * Chat com seus alunos.
    * Capacidade de visualizar as estatísticas de progresso de seus alunos.
    * Montar e editar os treinos dos seus alunos.
    * Criar ou registrar treinos novos e/ou atribuir treinos aos alunos.
    * Ter um perfil com suas atribuições, especializações e graduação.
* Aluno
    * Chat com instrutor.
    * Editar seus próprios treinos.
    * Capacidade de criar um treino de forma independente.
    * Registrar qual ou quais academias frequenta (facilitar informações para que o instrutor possa ter noção da disposição e/ou presença de aparelhos na academia que o aluno frequenta).
    * Acesso as suas próprias estatísticas de progressão nos treinos.


## Como rodar o projeto

### Pré-requisitos
- [Node.js 22+](https://nodejs.org/)
- [Docker](https://www.docker.com/) e Docker Compose

---

### Opção 1 — Dev local (sem Docker para a API)

> O banco de dados ainda precisa estar rodando — use o `docker-compose.yml` para subir apenas o Postgres.

```bash
# 1. Instalar dependências
npm install

# 2. Copiar o arquivo de variáveis de ambiente
cp .env.example .env
# Edite o .env com as credenciais do seu banco local

# 3. Subir apenas o banco de dados
docker compose up -d

# 4. Criar as tabelas no banco (execute apenas na primeira vez ou após mudanças no schema)
npm run migrate:push

# 5. Popular o banco com dados iniciais
npm run seed

# 6. Iniciar a API em modo watch (hot reload)
npm run dev
```

API disponível em: `http://localhost:1350`

---

### Opção 2 — Dev com Docker (recomendado)

> Sobe a API **e** o banco juntos em containers. Possui hot reload via volume.

```bash
# 1. Copiar o arquivo de variáveis de ambiente
cp .env.example .env

# 2. Subir os containers com build (API + Postgres)
docker compose -f docker-compose-dev.yml up --build
```

Com os containers rodando, em outro terminal:

```bash
# 3. Criar as tabelas no banco (dentro do container, execute apenas na primeira vez ou após mudanças no schema)
docker exec api-atividades-fisicas npx drizzle-kit push --force

# 4. Popular o banco com dados iniciais
docker exec api-atividades-fisicas npm run seed
```

API disponível em: `http://localhost:1350`

---

### Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia a API com hot reload |
| `npm run build` | Compila TypeScript para `dist/` |
| `npm run start` | Inicia a API compilada (produção) |
| `npm run seed` | Limpa e repopula o banco com dados iniciais |
| `npm run migrate:push` | Aplica o schema do Drizzle diretamente no banco |
| `npm run migrate:studio` | Abre o Drizzle Studio (interface visual do banco) |

---


