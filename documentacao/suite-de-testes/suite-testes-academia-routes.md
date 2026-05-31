# Suite de Testes E2E — Academia (`/academia`)

> Testes E2E com Jest + Supertest contra banco real, e testes unitários com mocks do repositório, validando as regras de negócio e validações das rotas de academia.

> **Arquivo:** `src/tests/routes/academiaRoutes.test.ts`

---

## Rastreabilidade de Requisitos

| Requisito | Descrição | Cobertura nesta suíte |
| :--- | :--- | :--- |
| **RF002** | Login de usuário | Cobertura indireta: todas as rotas exigem autenticação (`401` sem token). |
| **RF003** | Tipos de usuários | Cobertura direta: operações de criação, edição e exclusão exigem perfil de **admin** (`is_admin: true`); usuário comum recebe `403`. |
| **RF-AC01** | Cadastro de academia | Cobertura direta: `POST /academia` cria registro com todos os campos obrigatórios validados. |
| **RF-AC02** | Listagem de academias | Cobertura direta: `GET /academia` retorna lista paginada acessível a qualquer usuário autenticado. |
| **RF-AC03** | Detalhe de academia | Cobertura direta: `GET /academia/:id` retorna um registro ou `null` quando não encontrado. |
| **RF-AC04** | Edição de academia | Cobertura direta: `PATCH /academia/:id` aceita atualização parcial com validação de campos. |
| **RF-AC05** | Exclusão de academia | Cobertura direta: `DELETE /academia/:id` remove o registro e confirma a remoção. |

---

## Estrutura do Arquivo de Teste

O arquivo é dividido em dois blocos:

| Bloco | Tipo | Descrição |
| :--- | :--- | :--- |
| **Bloco 1** | Integração (E2E) | Testes HTTP contra banco real usando Supertest. Valida rotas, autenticação e regras de negócio de ponta a ponta. |
| **Bloco 2** | Unitários (mocked) | Testes do `AcademiaService` com repositório mockado. Valida lógica de negócio, validações Zod e tratamento de erros em isolamento. |

---

## Setup e Teardown

| Fase | Ação |
| :--- | :--- |
| `beforeAll` | Conecta ao banco; cria app Express; insere **academia base**, **usuário admin** (treinador com `is_admin: true`) e **usuário normal** (treinador com `is_admin: false`). |
| `beforeEach` | Garante que o mock de autenticação aponta para o **admin** antes de cada teste. |
| `afterEach` | Remove academias temporárias criadas durante testes (`tempAcademiaIds`); redefine autenticação para admin. |
| `afterAll` | Remove treinadores, usuários e academia base criados no setup; desconecta do banco; restaura spies de console. |

---

## GET /academia — Listagem de Academias

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** | | | |
| Usuário comum autenticado lista academias | Deve retornar lista paginada com `200`. | `GET /academia` com usuário `normal`. | Retorna `200`; contém `dados` (array), `total`, `page`, `limite`, `totalPages`; `dados.length >= 1`. |
| Admin autenticado lista academias | Deve retornar lista paginada com `200`. | `GET /academia` com usuário `admin`. | Retorna `200`; `dados` é um array. |
| Paginação explícita | Deve respeitar `page` e `limite`. | `GET /academia?page=1&limite=1`. | Retorna `200`; `page=1`, `limite=1`; `dados.length <= 1`. |
| **Cenários tristes** | | | |
| `page` inválido (`page=0`) | Deve rejeitar com `422`. | `GET /academia?page=0`. | Retorna `422`; erro de validação. |
| Campo extra na query (`.strict()`) | Deve rejeitar com `422`. | `GET /academia?foo=bar`. | Retorna `422`; `error: true`. |
| Sem autenticação | Deve rejeitar com `401`. | `GET /academia` sem token/sessão. | Retorna `401`. |

---

## POST /academia — Criação de Academia

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** | | | |
| Admin cria academia com payload completo | Deve persistir todos os campos e retornar `201`. | `POST /academia` com `nome`, `endereco_numero`, `endereco_rua`, `endereco_bairro`, `endereco_cidade`, `endereco_estado`. | Retorna `201`; `data.nome`, `data.id` e `data.endereco_rua` presentes e corretos. |
| Admin cria academia com campos mínimos obrigatórios | Deve persistir e retornar `201`. | `POST /academia` com todos os 6 campos obrigatórios. | Retorna `201`; `data.endereco_numero` reflete o valor enviado. |
| **Cenários tristes** | | | |
| Usuário normal (não admin) tenta criar academia | Deve rejeitar com `403`. | `POST /academia` autenticado como usuário `normal` (`is_admin: false`). | Retorna `403`. |
| `nome` ausente | Deve rejeitar com `422`. | `POST /academia` sem o campo `nome`. | Retorna `422`; erro de validação Zod. |
| `endereco_estado` com mais de 2 caracteres | Deve rejeitar com `422`. | `POST /academia` com `endereco_estado: "RONDONIA"`. | Retorna `422`; erro de validação Zod (`max 2 chars`). |
| Sem autenticação | Deve rejeitar com `401`. | `POST /academia` sem token/sessão. | Retorna `401`. |

---

## GET /academia/:id — Detalhe de Academia

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** | | | |
| Busca academia por ID existente | Deve retornar os dados da academia com `200`. | `GET /academia/:id` com UUID da academia base. | Retorna `200`; `data.id` igual ao UUID buscado; `data.nome` presente. |
| **Cenários tristes** | | | |
| ID inexistente (UUID válido) | O controller retorna `200` com `data: null` (sem lançar exceção de not-found). | `GET /academia/00000000-0000-0000-0000-000000000000`. | Retorna `200` ou `404`; se `200`, `data` é `null`. |
| Sem autenticação | Deve rejeitar com `401`. | `GET /academia/:id` sem token/sessão. | Retorna `401`. |

> **Nota:** A ausência de validação de UUID formato (não-UUID) nesta rota indica que o service não valida o formato do ID — diferente de outros módulos. Testes de `422` por ID inválido não se aplicam aqui.

---

## PATCH /academia/:id — Atualização Parcial de Academia

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** | | | |
| Admin atualiza `nome` da academia | Deve persistir o novo nome e retornar `200`. | `PATCH /academia/:id` com `{ nome: "Novo Nome" }`. | Retorna `200`; `data.nome` igual ao novo valor enviado. |
| Admin atualiza campo de endereço parcialmente | Deve persistir apenas o campo enviado e retornar `200`. | `PATCH /academia/:id` com `{ endereco_cidade: "Ji-Paraná" }`. | Retorna `200`; `data.endereco_cidade` igual ao valor enviado. |
| **Cenários tristes** | | | |
| Usuário normal tenta atualizar academia | Deve rejeitar com `403`. | `PATCH /academia/:id` autenticado como `normal`. | Retorna `403`. |
| `endereco_estado` com mais de 2 caracteres | Deve rejeitar com `422`. | `PATCH /academia/:id` com `{ endereco_estado: "TOOLONG" }`. | Retorna `422`; erro de validação Zod. |
| Sem autenticação | Deve rejeitar com `401`. | `PATCH /academia/:id` sem token/sessão. | Retorna `401`. |

---

## DELETE /academia/:id — Exclusão de Academia

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** | | | |
| Admin deleta academia existente | Deve remover o registro e retornar `200`; consulta posterior confirma remoção. | `DELETE /academia/:id` com ID de academia temporária; depois `GET /academia/:id`. | Retorna `200`; GET subsequente retorna `data: null`. |
| **Cenários tristes** | | | |
| Usuário normal tenta deletar academia | Deve rejeitar com `403`. | `DELETE /academia/:id` autenticado como `normal`. | Retorna `403`. |
| Sem autenticação | Deve rejeitar com `401`. | `DELETE /academia/:id` sem token/sessão. | Retorna `401`. |

---

## AcademiaService — Testes Unitários (mocked)

### `createAcademia`

| Cenário | Comportamento Esperado | Critérios de Aceite |
| :--- | :--- | :--- |
| Dados válidos | Chama `repository.createAcademia` e retorna o resultado. | `mockRepository.createAcademia` chamado com os dados; retorno igual ao mock. |
| `nome` vazio | Lança `ZodError` antes de chamar o repository. | Rejeita com `ZodError`; repository **não** é chamado. |
| Repository lança `ZodError` | Propaga o erro sem encapsulamento. | Rejeita com `ZodError`. |
| Repository lança `DatabaseError` | Propaga o erro sem encapsulamento. | Rejeita com `DatabaseError`. |
| Repository lança `Error` genérico | Propaga o erro. | Rejeita com a mensagem original do erro. |

### `getAllAcademias`

| Cenário | Comportamento Esperado | Critérios de Aceite |
| :--- | :--- | :--- |
| Query válida (`page=1`, `limite=10`) | Chama `repository.getAllAcademias(1, 10)` e retorna resultado. | Repository chamado com `(1, 10)`; retorna mock. |
| Query vazia | Usa defaults `page=1`, `limite=10`. | Repository chamado com `(1, 10)`. |
| `page=0` (inválido) | Lança `ZodError` (`page deve ser maior que 0`). | Rejeita com `ZodError`. |
| Campo extra na query (`.strict()`) | Lança `ZodError`. | Rejeita com `ZodError`. |
| Repository lança `Error` | Encapsula em `Error("Erro ao buscar academias")`. | Rejeita com mensagem `"Erro ao buscar academias"`. |
| Repository lança não-`Error` (string) | Encapsula em `Error("Erro ao buscar academias")`. | Rejeita com mensagem `"Erro ao buscar academias"`. |

### `getAcademiaById`

| Cenário | Comportamento Esperado | Critérios de Aceite |
| :--- | :--- | :--- |
| ID válido e existente | Retorna o registro mockado. | Retorno igual ao mock. |
| ID é string vazia | Lança `Error("O id é obrigatório")` sem chamar o repository. | Rejeita com mensagem `"O id é obrigatório"`. |
| Repository lança `Error` | Encapsula em `Error("Erro ao buscar academia")`. | Rejeita com mensagem `"Erro ao buscar academia"`. |
| Repository lança não-`Error` (string) | Encapsula em `Error("Erro ao buscar academia")`. | Rejeita com mensagem `"Erro ao buscar academia"`. |

### `updateAcademia`

| Cenário | Comportamento Esperado | Critérios de Aceite |
| :--- | :--- | :--- |
| Dados válidos | Chama `repository.updateAcademia(id, data)` e retorna resultado. | Repository chamado corretamente; retorno igual ao mock. |
| `endereco_estado` com mais de 2 chars | Lança `ZodError` antes de chamar o repository. | Rejeita com `ZodError`. |
| Repository lança `ZodError` | Propaga o erro. | Rejeita com `ZodError`. |
| Repository lança `Error` genérico | Encapsula em `Error("Erro ao criar academia")`. | Rejeita com mensagem `"Erro ao criar academia"`. |
| Repository lança não-`Error` (string) | Encapsula em `Error("Erro ao criar academia")`. | Rejeita com mensagem `"Erro ao criar academia"`. |

### `deleteAcademia`

| Cenário | Comportamento Esperado | Critérios de Aceite |
| :--- | :--- | :--- |
| ID existente | Chama `repository.deleteAcademia(id)` e retorna o registro deletado. | Repository chamado com o ID; retorno igual ao mock. |
| Repository lança `Error` | Encapsula em `Error("Erro ao criar academia")`. | Rejeita com mensagem `"Erro ao criar academia"`. |
| Repository lança não-`Error` (string) | Encapsula em `Error("Erro desconhecido")`. | Rejeita com mensagem `"Erro desconhecido"`. |

---

## Resumo de Cobertura

| Bloco | Total de testes | Aprovados |
| :--- | :--- | :--- |
| Integração HTTP (rotas) | 23 | 23 ✅ |
| Unitários `AcademiaService` (mocked) | 23 | 23 ✅ |
| **Total** | **46** | **46 ✅** |

> Resultado de execução: `npx jest --testPathPattern="academiaRoutes" --no-coverage`
