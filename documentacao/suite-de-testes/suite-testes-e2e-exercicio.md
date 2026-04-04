# Suite de Testes E2E — Exercícios (`/exercicios`)

> Testes E2E com Jest + Supertest contra banco real, validando toda a regra de negócio das rotas de exercícios.

> **Arquivo:** `src/tests/routes/exercicioRoutes.test.ts`

---

## POST /exercicios — Criação de Exercício

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** |  |  |  |
| Admin cria exercício global (sem `aluno_id`) | Deve criar exercício global com status `201`, `aluno_id: null` e músculos vinculados. | Fazer `POST /exercicios` como admin com `nome`, `musculos` (sem `aluno_id`). | Retorna `201`; resposta contém `aluno_id: null`, array de `musculos` preenchido com `musculo_id`, `tipo_ativacao`, `nome` e `grupo_muscular`. |
| Admin cria exercício pessoal para um aluno | Deve criar exercício pessoal com status `201` e `aluno_id` preenchido. | Fazer `POST /exercicios` como admin com `aluno_id` de aluno existente. | Retorna `201`; resposta contém `aluno_id` igual ao informado. |
| Aluno cria exercício pessoal sem informar `aluno_id` | Deve inferir `aluno_id` do perfil do aluno autenticado e criar com `201`. | Fazer `POST /exercicios` como aluno sem campo `aluno_id`. | Retorna `201`; `aluno_id` na resposta é o ID do aluno autenticado (inferido automaticamente). |
| Aluno cria exercício pessoal informando o próprio `aluno_id` | Deve criar exercício pessoal com `201` quando aluno informa seu próprio ID. | Fazer `POST /exercicios` como aluno com `aluno_id` igual ao próprio ID. | Retorna `201`; `aluno_id` na resposta é o ID informado. |
| Treinador cria exercício pessoal para um aluno | Deve criar exercício pessoal com `201` quando treinador informa `aluno_id` de aluno existente. | Fazer `POST /exercicios` como treinador com `aluno_id` de aluno existente. | Retorna `201`; `aluno_id` na resposta é o do aluno informado. |
| Exercício criado com aparelhos opcionais | Deve criar exercício com aparelhos vinculados e retornar `201`. | Fazer `POST /exercicios` com array de `aparelhos` preenchido. | Retorna `201`; resposta contém array `aparelhos` com `aparelho_id`, `nome` e `descricao`. |
| Exercício criado sem aparelhos | Deve criar exercício sem aparelhos e retornar `201`. | Fazer `POST /exercicios` omitindo campo `aparelhos`. | Retorna `201`; campo `aparelhos` na resposta é array vazio. |
| Nomes iguais entre exercício global e pessoal | Não deve conflitar (escopos diferentes). | Criar exercício global e depois pessoal com o mesmo `nome`. | Ambos criados com `201` — escopos distintos não geram conflito de nome. |
| **Cenários tristes** |  |  |  |
| Aluno tenta criar exercício para outro aluno | Deve negar acesso com `403`. | Fazer `POST /exercicios` como aluno com `aluno_id` de outro aluno. | Retorna `403`; mensagem: "você não pode criar exercícios para outro aluno". |
| Treinador tenta criar exercício global (sem `aluno_id` e sem perfil de aluno) | Deve negar acesso com `403`. | Fazer `POST /exercicios` como treinador sem perfil de aluno e sem `aluno_id`. | Retorna `403`; mensagem: "apenas administradores podem criar exercícios globais". |
| Body vazio | Deve rejeitar com `422` e erros Zod. | Fazer `POST /exercicios` com body `{}`. | Retorna `422`; resposta contém issues Zod indicando campos obrigatórios. |
| `nome` ausente | Deve rejeitar com `422`. | Fazer `POST /exercicios` sem campo `nome`. | Retorna `422`; mensagem: "O nome do exercício é obrigatório". |
| `nome` excede 255 caracteres | Deve rejeitar com `422`. | Fazer `POST /exercicios` com `nome` de 256+ caracteres. | Retorna `422`; mensagem: "O nome do exercício deve ter no máximo 255 caracteres". |
| `descricao` excede 1000 caracteres | Deve rejeitar com `422`. | Fazer `POST /exercicios` com `descricao` de 1001+ caracteres. | Retorna `422`; mensagem: "A descrição deve ter no máximo 1000 caracteres". |
| `musculos` ausente ou array vazio | Deve rejeitar com `422`. | Fazer `POST /exercicios` sem `musculos` ou com `musculos: []`. | Retorna `422`; mensagem: "É obrigatório informar ao menos um músculo associado". |
| `musculo_id` com UUID inválido | Deve rejeitar com `422`. | Fazer `POST /exercicios` com `musculo_id: "nao-e-uuid"`. | Retorna `422`; mensagem: "O ID do músculo deve ser um UUID válido". |
| `tipo_ativacao` fora do enum | Deve rejeitar com `422`. | Fazer `POST /exercicios` com `tipo_ativacao: "TERCIARIO"`. | Retorna `422`; mensagem: "Tipo de ativação deve ser 'PRIMARIO' ou 'SECUNDARIO'". |
| `aparelho_id` com UUID inválido | Deve rejeitar com `422`. | Fazer `POST /exercicios` com `aparelho_id: "nao-e-uuid"`. | Retorna `422`; mensagem: "O ID do aparelho deve ser um UUID válido". |
| `aluno_id` com UUID inválido | Deve rejeitar com `422`. | Fazer `POST /exercicios` com `aluno_id: "nao-e-uuid"`. | Retorna `422`; mensagem: "O ID do aluno deve ser um UUID válido". |
| Músculo(s) com ID inexistente no banco | Deve rejeitar com `422`. | Fazer `POST /exercicios` com UUID válido mas inexistente em `musculo_id`. | Retorna `422`; mensagem: "Músculo(s) não encontrado(s): [ids]". |
| Aparelho(s) com ID inexistente no banco | Deve rejeitar com `422`. | Fazer `POST /exercicios` com UUID válido mas inexistente em `aparelho_id`. | Retorna `422`; mensagem: "Aparelho(s) não encontrado(s): [ids]". |
| `aluno_id` informado mas aluno não existe | Deve rejeitar com `422`. | Fazer `POST /exercicios` com UUID válido mas inexistente em `aluno_id`. | Retorna `422`; mensagem: "Aluno não encontrado". |
| Campo extra não previsto no schema (`.strict()`) | Deve rejeitar com `422`. | Fazer `POST /exercicios` com campo adicional não previsto (ex: `peso: 10`). | Retorna `422`; erro Zod de campo não reconhecido. |
| Criar exercício com nome duplicado para o mesmo aluno | Deve rejeitar com `409`. | Fazer `POST /exercicios` com mesmo `nome` e `aluno_id` de exercício já existente. | Retorna `409`; mensagem: "Já existe um exercício com este nome". |
| Criar exercício global com nome duplicado | Deve rejeitar com `409`. | Fazer `POST /exercicios` como admin com mesmo `nome` de exercício global existente. | Retorna `409`; mensagem: "Já existe um exercício com este nome". |
| Requisição sem header `Authorization` | Deve rejeitar com `401`. | Fazer `POST /exercicios` sem header de autenticação. | Retorna `401`. |
| Token inválido/expirado | Deve rejeitar com `401`. | Fazer `POST /exercicios` com token inválido no header `Authorization`. | Retorna `401`. |

---

## GET /exercicios — Listagem de Exercícios

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** |  |  |  |
| Aluno lista exercícios com escopo padrão (`TODOS`) | Deve retornar exercícios globais + pessoais do aluno com `200`. | Fazer `GET /exercicios` como aluno sem query params de escopo. | Retorna `200`; resultado contém exercícios globais e exercícios pessoais do aluno autenticado. |
| Aluno lista exercícios com `escopo=GLOBAL` | Deve retornar apenas exercícios sem `aluno_id` com `200`. | Fazer `GET /exercicios?escopo=GLOBAL` como aluno. | Retorna `200`; todos os exercícios retornados têm `aluno_id: null`. |
| Aluno lista exercícios com `escopo=PESSOAL` | Deve retornar apenas exercícios com `aluno_id` do aluno com `200`. | Fazer `GET /exercicios?escopo=PESSOAL` como aluno. | Retorna `200`; todos os exercícios retornados têm `aluno_id` igual ao do aluno autenticado. |
| Admin lista exercícios com `escopo=GLOBAL` | Deve retornar exercícios globais com `200`. | Fazer `GET /exercicios?escopo=GLOBAL` como admin. | Retorna `200`; resultado contém apenas exercícios globais. |
| Treinador sem perfil de aluno lista exercícios (escopo padrão) | Escopo padrão deve ser `GLOBAL` para treinador sem perfil de aluno. | Fazer `GET /exercicios` como treinador sem perfil de aluno. | Retorna `200`; resultado contém apenas exercícios globais (escopo padrão `GLOBAL`). |
| Treinador lista exercícios de um aluno por `aluno_id` | Deve retornar exercícios do aluno informado com `200`. | Fazer `GET /exercicios?aluno_id={ID_ALUNO}` como treinador. | Retorna `200`; resultado contém exercícios do aluno informado. |
| Filtro por `nome` (busca parcial case-insensitive) | Deve retornar exercícios filtrados por nome com `200`. | Fazer `GET /exercicios?nome=supino` (minúsculo) com exercício "Supino Reto" no banco. | Retorna `200`; resultados contêm apenas exercícios cujo nome contém "supino", independente de case. |
| Filtro por `grupo_muscular` | Deve retornar exercícios filtrados pelo grupo muscular com `200`. | Fazer `GET /exercicios?grupo_muscular=PEITO`. | Retorna `200`; exercícios retornados possuem ao menos um músculo do grupo `PEITO`. |
| Filtro por `tipo_ativacao` | Deve retornar exercícios filtrados pelo tipo de ativação com `200`. | Fazer `GET /exercicios?tipo_ativacao=PRIMARIO`. | Retorna `200`; exercícios retornados possuem ao menos um músculo com `tipo_ativacao: PRIMARIO`. |
| Filtro por `em_uso=true` | Deve retornar exercícios vinculados a treinos com `200`. | Fazer `GET /exercicios?em_uso=true` após vincular exercícios a treinos. | Retorna `200`; somente exercícios que existem em `treino_exercicio`. |
| Filtro por `em_uso=false` | Deve retornar exercícios não vinculados a treinos com `200`. | Fazer `GET /exercicios?em_uso=false`. | Retorna `200`; somente exercícios que não possuem referência em `treino_exercicio`. |
| Paginação: `page=1&limite=2` | Deve retornar dados paginados com metadados com `200`. | Cadastrar 5+ exercícios e fazer `GET /exercicios?page=1&limite=2`. | Retorna `200`; resposta contém `dados` (2 itens), `total`, `page: 1`, `limite: 2`, `totalPages`. |
| Segunda página da paginação | Deve retornar dados da segunda página com metadados corretos. | Cadastrar 5+ exercícios e fazer `GET /exercicios?page=2&limite=2`. | Retorna `200`; `page: 2`; `dados` contém os exercícios correspondentes à segunda página. |
| `incluir_musculos=false` | Deve retornar exercícios sem o array de músculos com `200`. | Fazer `GET /exercicios?incluir_musculos=false`. | Retorna `200`; exercícios não incluem dados detalhados de músculos (resposta mais leve). |
| `incluir_aparelhos=false` | Deve retornar exercícios sem o array de aparelhos com `200`. | Fazer `GET /exercicios?incluir_aparelhos=false`. | Retorna `200`; exercícios não incluem dados detalhados de aparelhos. |
| `ordem_nome=desc` | Deve retornar exercícios em ordem decrescente por nome com `200`. | Fazer `GET /exercicios?ordem_nome=desc`. | Retorna `200`; exercícios ordenados alfabeticamente de Z a A. |
| `ordem_nome=asc` (padrão) | Deve retornar exercícios em ordem crescente por nome por padrão. | Fazer `GET /exercicios` sem `ordem_nome`. | Retorna `200`; exercícios ordenados alfabeticamente de A a Z. |
| Admin lista com `incluir_inativos=true` | Deve incluir exercícios soft-deleted com `200`. | Soft-deletar exercício, depois fazer `GET /exercicios?incluir_inativos=true` como admin. | Retorna `200`; resultado inclui exercícios com `deletado_em` preenchido. |
| Múltiplos filtros simultâneos | Deve aplicar todos os filtros em conjunto (AND) com `200`. | Fazer `GET /exercicios?nome=supino&grupo_muscular=PEITO&escopo=GLOBAL`. | Retorna `200`; somente exercícios que atendem a todos os filtros aplicados. |
| Query string vazia (valores padrão) | Deve processar sem erros usando valores padrão. | Fazer `GET /exercicios` sem parâmetros como aluno. | Retorna `200`; primeira página com até 10 registros, ordem `asc`, escopo `TODOS`. |
| **Cenários tristes** |  |  |  |
| Aluno tenta listar exercícios pessoais de outro aluno | Deve rejeitar com `403`. | Fazer `GET /exercicios?aluno_id={OUTRO_ALUNO}` como aluno. | Retorna `403`; mensagem: "você não pode listar exercícios de outro aluno". |
| Não-admin tenta `incluir_inativos=true` | Deve rejeitar com `403`. | Fazer `GET /exercicios?incluir_inativos=true` como aluno ou treinador. | Retorna `403`; mensagem: "apenas administradores podem listar exercícios inativos". |
| `escopo=TODOS` sem contexto de aluno (treinador sem perfil de aluno, sem `aluno_id`) | Deve rejeitar com `422`. | Fazer `GET /exercicios?escopo=TODOS` como treinador sem perfil de aluno e sem `aluno_id`. | Retorna `422`; mensagem: "aluno_id é obrigatório para escopo PESSOAL ou TODOS sem contexto de aluno autenticado". |
| `escopo=PESSOAL` sem contexto de aluno (treinador sem perfil de aluno, sem `aluno_id`) | Deve rejeitar com `422`. | Fazer `GET /exercicios?escopo=PESSOAL` como treinador sem perfil de aluno e sem `aluno_id`. | Retorna `422`; mensagem: "aluno_id é obrigatório para escopo PESSOAL ou TODOS sem contexto de aluno autenticado". |
| `aluno_id` com UUID inválido | Deve rejeitar com `422`. | Fazer `GET /exercicios?aluno_id=nao-e-uuid`. | Retorna `422`; mensagem: "aluno_id deve ser um UUID válido". |
| `page` inválido (zero, negativo, string) | Deve rejeitar com `422`. | Fazer `GET /exercicios?page=0` ou `page=-1` ou `page=abc`. | Retorna `422`; mensagem: "page deve ser um número inteiro maior que 0". |
| `limite` inválido (zero, negativo, acima de 100) | Deve rejeitar com `422`. | Fazer `GET /exercicios?limite=0` ou `limite=101`. | Retorna `422`; mensagem: "limite deve ser entre 1 e 100". |
| `grupo_muscular` fora do enum | Deve rejeitar com `422`. | Fazer `GET /exercicios?grupo_muscular=CABECA`. | Retorna `422`; erro Zod indicando valores permitidos: `PEITO`, `COSTAS`, `PERNAS`, `BRAÇOS`, `OMBROS`, `ABDOMEN`. |
| `escopo` fora do enum | Deve rejeitar com `422`. | Fazer `GET /exercicios?escopo=INVALIDO`. | Retorna `422`; erro Zod indicando valores permitidos: `GLOBAL`, `PESSOAL`, `TODOS`. |
| Campo extra não previsto na query (`.strict()`) | Deve rejeitar com `422`. | Fazer `GET /exercicios?campo_invalido=valor`. | Retorna `422`; erro Zod de campo não reconhecido. |
| Requisição sem header `Authorization` | Deve rejeitar com `401`. | Fazer `GET /exercicios` sem header de autenticação. | Retorna `401`. |

---

## GET /exercicios/:id — Detalhe do Exercício

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** |  |  |  |
| Buscar exercício global por ID (qualquer usuário autenticado) | Deve retornar exercício com músculos e aparelhos com `200`. | Fazer `GET /exercicios/:id` para exercício global como qualquer perfil autenticado. | Retorna `200`; exercício contém `id`, `nome`, `descricao`, `aluno_id: null`, `musculos` e `aparelhos` populados. |
| Buscar exercício pessoal pelo dono (aluno) | Deve retornar exercício pessoal do aluno com `200`. | Fazer `GET /exercicios/:id` como aluno dono do exercício. | Retorna `200`; exercício contém `aluno_id` igual ao do aluno autenticado. |
| Treinador busca exercício pessoal de um aluno | Deve permitir acesso com `200`. | Fazer `GET /exercicios/:id` como treinador para exercício pessoal de qualquer aluno. | Retorna `200`; treinador pode visualizar exercício pessoal de aluno. |
| Buscar exercício pessoal como admin | Deve permitir acesso com `200`. | Fazer `GET /exercicios/:id` como admin para exercício pessoal de qualquer aluno. | Retorna `200`; admin pode visualizar qualquer exercício pessoal. |
| **Cenários tristes** |  |  |  |
| Aluno busca exercício pessoal de outro aluno | Deve rejeitar com `403`. | Fazer `GET /exercicios/:id` como aluno para exercício pessoal de outro aluno. | Retorna `403`; mensagem: "você não tem permissão para visualizar este exercício". |
| ID inexistente (UUID válido) | Deve rejeitar com `404`. | Fazer `GET /exercicios/{uuid-valido-mas-inexistente}`. | Retorna `404`; mensagem: "Exercício não encontrado". |
| ID com formato inválido (não-UUID) | Deve rejeitar com `422`. | Fazer `GET /exercicios/nao-e-uuid`. | Retorna `422`; mensagem: "ID inválido, deve ser um UUID válido". |
| Exercício soft-deleted (busca por ID) | Deve rejeitar com `404` para exercício com `deletado_em` preenchido. | Soft-deletar exercício, depois fazer `GET /exercicios/:id` com o ID. | Retorna `404`; mensagem: "Exercício não encontrado" (filtro `deletado_em IS NULL` ativo). |
| Requisição sem header `Authorization` | Deve rejeitar com `401`. | Fazer `GET /exercicios/:id` sem header de autenticação. | Retorna `401`. |

---

## PATCH /exercicios/:id — Atualização de Exercício

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** |  |  |  |
| Admin atualiza nome de exercício global | Deve atualizar e retornar exercício com `200`. | Fazer `PATCH /exercicios/:id` como admin com `{ nome: "Novo Nome" }` em exercício global. | Retorna `200`; nome alterado na resposta. |
| Admin atualiza descrição | Deve atualizar descrição e retornar `200`. | Fazer `PATCH /exercicios/:id` como admin com `{ descricao: "Nova descrição" }`. | Retorna `200`; descrição alterada na resposta. |
| Admin atualiza músculos (replace total) | Deve substituir todos os vínculos de músculos e retornar `200`. | Fazer `PATCH /exercicios/:id` como admin com novo array de `musculos`. | Retorna `200`; novos músculos vinculados; antigos removidos. |
| Admin atualiza aparelhos | Deve substituir todos os vínculos de aparelhos e retornar `200`. | Fazer `PATCH /exercicios/:id` como admin com novo array de `aparelhos`. | Retorna `200`; novos aparelhos vinculados; antigos removidos. |
| Atualizar com `aparelhos: []` (remover todos) | Deve remover todos os aparelhos do exercício. | Fazer `PATCH /exercicios/:id` com `{ aparelhos: [] }`. | Retorna `200`; exercício não possui mais aparelhos vinculados. |
| Aluno atualiza exercício pessoal próprio | Deve permitir atualização e retornar `200`. | Fazer `PATCH /exercicios/:id` como aluno para exercício pessoal próprio. | Retorna `200`; campos alterados refletidos na resposta. |
| Treinador atualiza exercício pessoal de qualquer aluno | Deve permitir atualização e retornar `200`. | Fazer `PATCH /exercicios/:id` como treinador para exercício pessoal de aluno. | Retorna `200`; treinador pode editar exercício pessoal de qualquer aluno. |
| Atualizar `nome` para o mesmo valor atual | Não deve gerar conflito de duplicidade. | Fazer `PATCH /exercicios/:id` com o mesmo `nome` que o exercício já possui. | Retorna `200`; atualização aceita (comparação `nome !== exercicioExistente.nome` evita falso positivo). |
| **Cenários tristes** |  |  |  |
| Aluno tenta atualizar exercício global | Deve rejeitar com `403`. | Fazer `PATCH /exercicios/:id` como aluno para exercício global. | Retorna `403`; mensagem: "apenas administradores podem editar exercícios globais". |
| Aluno tenta atualizar exercício pessoal de outro aluno | Deve rejeitar com `403`. | Fazer `PATCH /exercicios/:id` como aluno para exercício pessoal de outro aluno. | Retorna `403`; mensagem: "você não tem permissão para editar este exercício". |
| Treinador tenta atualizar exercício global | Deve rejeitar com `403`. | Fazer `PATCH /exercicios/:id` como treinador para exercício global. | Retorna `403`; mensagem: "apenas administradores podem editar exercícios globais". |
| Body vazio (nenhum campo para atualizar) | Deve rejeitar com `422`. | Fazer `PATCH /exercicios/:id` com body `{}`. | Retorna `422`; mensagem: "Ao menos um campo deve ser informado para atualização". |
| `nome` excede 255 caracteres | Deve rejeitar com `422`. | Fazer `PATCH /exercicios/:id` com `nome` de 256+ caracteres. | Retorna `422`; mensagem: "O nome do exercício deve ter no máximo 255 caracteres". |
| `descricao` excede 1000 caracteres | Deve rejeitar com `422`. | Fazer `PATCH /exercicios/:id` com `descricao` de 1001+ caracteres. | Retorna `422`; mensagem: "A descrição deve ter no máximo 1000 caracteres". |
| Músculo(s) com ID inexistente | Deve rejeitar com `422`. | Fazer `PATCH /exercicios/:id` com `musculo_id` UUID válido mas inexistente. | Retorna `422`; mensagem: "Músculo(s) não encontrado(s): [ids]". |
| Aparelho(s) com ID inexistente | Deve rejeitar com `422`. | Fazer `PATCH /exercicios/:id` com `aparelho_id` UUID válido mas inexistente. | Retorna `422`; mensagem: "Aparelho(s) não encontrado(s): [ids]". |
| Campo extra não previsto no schema (`.strict()`) | Deve rejeitar com `422`. | Fazer `PATCH /exercicios/:id` com campo adicional não previsto. | Retorna `422`; erro Zod de campo não reconhecido. |
| Exercício não encontrado | Deve rejeitar com `404`. | Fazer `PATCH /exercicios/{uuid-valido-mas-inexistente}`. | Retorna `404`; mensagem: "Exercício não encontrado". |
| ID com formato inválido (não-UUID) | Deve rejeitar com `422`. | Fazer `PATCH /exercicios/nao-e-uuid`. | Retorna `422`; mensagem: "ID inválido, deve ser um UUID válido". |
| Nome duplicado (mesmo escopo) | Deve rejeitar com `409`. | Fazer `PATCH /exercicios/:id` com `nome` já existente no mesmo escopo (global ou pessoal). | Retorna `409`; mensagem: "Já existe um exercício com este nome". |
| Requisição sem header `Authorization` | Deve rejeitar com `401`. | Fazer `PATCH /exercicios/:id` sem header de autenticação. | Retorna `401`. |

---

## DELETE /exercicios/:id — Exclusão de Exercício

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** |  |  |  |
| Exercício sem referências em treinos (hard delete) | Deve excluir permanentemente com `200` e `tipo_exclusao: 'hard'`. | Criar exercício sem vínculo a treinos, fazer `DELETE /exercicios/:id`. | Retorna `200`; `tipo_exclusao: 'hard'`; exercício não pode ser encontrado por `GET /exercicios/:id` após exclusão. |
| Exercício com referências + `?soft=true` (soft delete) | Deve desativar sem remover, com `200` e `tipo_exclusao: 'soft'`. | Vincular exercício a treino, fazer `DELETE /exercicios/:id?soft=true`. | Retorna `200`; `tipo_exclusao: 'soft'`; exercício recebe `deletado_em` preenchido; vínculos em `treino_exercicio` preservados. |
| Exercício com referências + `?force=true` (cascade, admin) | Deve excluir em cascata com `200` e `tipo_exclusao: 'cascade'`. | Vincular exercício a treino, fazer `DELETE /exercicios/:id?force=true` como admin. | Retorna `200`; `tipo_exclusao: 'cascade'`; exercício, seus vínculos de músculo/aparelho e referências em `treino_exercicio` são removidos. |
| Aluno deleta exercício pessoal próprio | Deve permitir exclusão com `200`. | Fazer `DELETE /exercicios/:id` como aluno para exercício pessoal próprio sem referências. | Retorna `200`; exercício excluído com sucesso. |
| Treinador deleta exercício pessoal de aluno | Deve permitir exclusão com `200`. | Fazer `DELETE /exercicios/:id` como treinador para exercício pessoal de qualquer aluno. | Retorna `200`; treinador pode excluir exercício pessoal de qualquer aluno. |
| Admin deleta exercício global | Deve permitir exclusão com `200`. | Fazer `DELETE /exercicios/:id` como admin para exercício global. | Retorna `200`; exercício global excluído com sucesso. |
| **Cenários tristes** |  |  |  |
| Aluno tenta deletar exercício global | Deve rejeitar com `403`. | Fazer `DELETE /exercicios/:id` como aluno para exercício global. | Retorna `403`; mensagem: "apenas administradores podem excluir exercícios globais". |
| Aluno tenta deletar exercício pessoal de outro aluno | Deve rejeitar com `403`. | Fazer `DELETE /exercicios/:id` como aluno para exercício pessoal de outro aluno. | Retorna `403`; mensagem: "você não tem permissão para excluir este exercício". |
| Treinador tenta deletar exercício global | Deve rejeitar com `403`. | Fazer `DELETE /exercicios/:id` como treinador para exercício global. | Retorna `403`; mensagem: "apenas administradores podem excluir exercícios globais". |
| Não-admin tenta `?force=true` | Deve rejeitar com `403`. | Vincular exercício a treino, fazer `DELETE /exercicios/:id?force=true` como aluno ou treinador. | Retorna `403`; mensagem: "apenas administradores podem forçar a exclusão de exercícios em uso". |
| Exercício com referências, sem `?soft` nem `?force` | Deve rejeitar com `409` e orientar o cliente. | Vincular exercício a treino, fazer `DELETE /exercicios/:id` sem query params. | Retorna `409`; mensagem contém: "Exercício está vinculado a N rotina(s) de treino. Use ?soft=true para desativá-lo sem remover as rotinas, ou ?force=true (requer admin) para excluir permanentemente junto com as rotinas." |
| Exercício não encontrado | Deve rejeitar com `404`. | Fazer `DELETE /exercicios/{uuid-valido-mas-inexistente}`. | Retorna `404`; mensagem: "Exercício não encontrado". |
| ID com formato inválido (não-UUID) | Deve rejeitar com `422`. | Fazer `DELETE /exercicios/nao-e-uuid`. | Retorna `422`; mensagem: "ID inválido, deve ser um UUID válido". |
| Exercício soft-deleted (tentativa de deletar novamente) | Deve rejeitar com `404` pois exercício não é encontrado. | Soft-deletar exercício, depois fazer `DELETE /exercicios/:id` novamente. | Retorna `404`; mensagem: "Exercício não encontrado" (filtro `deletado_em IS NULL` ativo no `getByIdExercicio`). |
| Requisição sem header `Authorization` | Deve rejeitar com `401`. | Fazer `DELETE /exercicios/:id` sem header de autenticação. | Retorna `401`. |
