# Suite de Testes E2E — Aparelhos (`/aparelhos`)

> Testes E2E com Jest + Supertest contra banco real, validando toda a regra de negócio das rotas de aparelhos.

> **Arquivo:** `src/tests/routes/aparelhoRoutes.test.ts`

---

## GET /aparelhos — Listagem de Aparelhos

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** |  |  |  |
| Usuário autenticado lista aparelhos | Deve retornar lista paginada com `200`. | Fazer `GET /aparelhos` como aluno (e repetir para treinador/admin). | Retorna `200`; resposta com `dados`, `total`, `page`, `limite`, `totalPages`. |
| Parâmetros padrão quando query omitida | Deve usar defaults do schema. | Fazer `GET /aparelhos` sem query params. | Retorna `200`; `page: 1`, `limite: 20`, ordenação por `nome_asc`. |
| Paginação explícita | Deve respeitar `page` e `limite`. | Fazer `GET /aparelhos?page=2&limite=2` com 5+ aparelhos no banco. | Retorna `200`; no máximo 2 itens em `dados`; metadados coerentes. |
| Filtro por `nome` (busca parcial case/accent-insensitive) | Deve retornar apenas aparelhos com nome compatível. | Fazer `GET /aparelhos?nome=halter` com aparelho cadastrado como "Hálter". | Retorna `200`; resultados contêm o termo independentemente de caixa/acento. |
| Ordenação `nome_desc` | Deve ordenar Z→A. | Fazer `GET /aparelhos?ordem=nome_desc` com nomes distintos. | Retorna `200`; nomes em ordem decrescente. |
| Ordenação `popularidade_desc` | Deve ordenar por total de exercícios ativos vinculados. | Fazer `GET /aparelhos?ordem=popularidade_desc` com aparelhos de popularidade diferente. | Retorna `200`; aparelho com mais exercícios ativos aparece primeiro. |
| `popularidade_desc` ignora exercícios inativos | Exercícios com `deletado_em` preenchido não devem contar. | Vincular aparelho a exercícios ativos e inativos, depois listar com `popularidade_desc`. | Retorna `200`; ranking considera apenas vínculos com exercícios ativos. |
| Paginação alfanumérica (comportamento atual do parser) | Deve aceitar prefixo numérico via `parseInt`. | Fazer `GET /aparelhos?page=2abc&limite=3xyz`. | Retorna `200`; `page: 2`, `limite: 3`. |
| Sem resultados para filtro restritivo | Deve retornar vazio com metadados coerentes. | Fazer `GET /aparelhos?nome=nao-existe`. | Retorna `200`; `dados: []`, `total: 0`, `totalPages: 0`. |
| **Cenários tristes** |  |  |  |
| `ordem` fora do enum | Deve rejeitar com `422`. | Fazer `GET /aparelhos?ordem=asc`. | Retorna `422`; erro Zod de enum inválido. |
| `page` inválido | Deve rejeitar com `422`. | Fazer `GET /aparelhos?page=0`. | Retorna `422`; mensagem: "page deve ser um número inteiro maior que 0". |
| `limite` acima de 100 | Deve rejeitar com `422`. | Fazer `GET /aparelhos?limite=101`. | Retorna `422`; mensagem: "limite deve ser entre 1 e 100". |
| `limite` não numérico | Deve rejeitar com `422`. | Fazer `GET /aparelhos?limite=abc`. | Retorna `422`; mensagem: "limite deve ser entre 1 e 100". |
| Query com campo extra (`.strict()`) | Deve rejeitar com `422`. | Fazer `GET /aparelhos?foo=bar`. | Retorna `422`; erro Zod de chave não reconhecida. |
| Requisição sem header `Authorization` | Deve rejeitar com `401`. | Fazer `GET /aparelhos` sem autenticação. | Retorna `401`. |

---

## GET /aparelhos/:id — Detalhe de Aparelho

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** |  |  |  |
| Usuário autenticado consulta aparelho existente | Deve retornar aparelho com `200`. | Fazer `GET /aparelhos/:id` com ID válido existente. | Retorna `200`; `id`, `nome`, `descricao` e array `exercicios`. |
| Detalhe exclui exercícios inativos | Exercícios com soft delete não devem aparecer. | Vincular aparelho a exercício ativo e inativo, depois consultar por ID. | Retorna `200`; somente exercícios ativos no array `exercicios`. |
| Aparelho sem exercícios vinculados | Deve retornar array vazio. | Consultar aparelho existente sem vínculos em `exercicio_aparelho`. | Retorna `200`; `exercicios: []`. |
| **Cenários tristes** |  |  |  |
| ID inexistente (UUID válido) | Deve rejeitar com `404`. | Fazer `GET /aparelhos/{uuid-inexistente}`. | Retorna `404`; mensagem: "Aparelho não encontrado". |
| ID com formato inválido | Deve rejeitar com `422`. | Fazer `GET /aparelhos/nao-e-uuid`. | Retorna `422`; mensagem da API: "ID inválido". |
| Requisição sem header `Authorization` | Deve rejeitar com `401`. | Fazer `GET /aparelhos/:id` sem autenticação. | Retorna `401`. |
