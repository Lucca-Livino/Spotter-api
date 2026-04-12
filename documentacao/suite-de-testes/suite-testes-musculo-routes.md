# Suite de Testes E2E — Músculos (`/musculos`)

> Testes E2E com Jest + Supertest contra banco real, validando toda a regra de negócio das rotas de músculos.

> **Arquivo:** `src/tests/routes/musculoRoutes.test.ts`

---

## GET /musculos — Listagem de Músculos

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** |  |  |  |
| Usuário autenticado lista músculos | Deve retornar lista paginada com `200`. | Fazer `GET /musculos` como aluno (e repetir para treinador/admin). | Retorna `200`; resposta com `dados`, `total`, `page`, `limite`, `totalPages`. |
| Parâmetros padrão quando query omitida | Deve usar defaults do schema. | Fazer `GET /musculos` sem query params. | Retorna `200`; `page: 1`, `limite: 20`, ordenação por `nome_asc`. |
| Paginação explícita | Deve respeitar `page` e `limite`. | Fazer `GET /musculos?page=2&limite=2` com 5+ músculos no banco. | Retorna `200`; no máximo 2 itens em `dados`; metadados coerentes. |
| Filtro por `nome` (busca parcial case/accent-insensitive) | Deve retornar apenas músculos com nome compatível. | Fazer `GET /musculos?nome=triceps` com músculo cadastrado como "Tríceps". | Retorna `200`; resultados contêm o termo independentemente de caixa/acento. |
| Filtro por `grupo_muscular` canônico | Deve retornar apenas músculos do grupo informado. | Fazer `GET /musculos?grupo_muscular=PEITO`. | Retorna `200`; todos os itens têm `grupo_muscular: "PEITO"`. |
| Filtro por `grupo_muscular` com normalização | Deve aceitar variações de caixa/acento. | Fazer `GET /musculos?grupo_muscular=bracos` e `GET /musculos?grupo_muscular=Braços`. | Retorna `200`; todos os itens têm `grupo_muscular: "BRAÇOS"`. |
| Ordenação `nome_desc` | Deve ordenar Z→A. | Fazer `GET /musculos?ordem=nome_desc` com nomes distintos. | Retorna `200`; nomes em ordem decrescente. |
| Ordenação `popularidade_desc` | Deve ordenar por total de exercícios ativos vinculados. | Fazer `GET /musculos?ordem=popularidade_desc` com músculos de popularidade diferente. | Retorna `200`; músculo com mais exercícios ativos aparece primeiro. |
| `popularidade_desc` ignora exercícios inativos | Exercícios com `deletado_em` preenchido não devem contar. | Vincular músculo a exercícios ativos e inativos, depois listar com `popularidade_desc`. | Retorna `200`; ranking considera apenas vínculos com exercícios ativos. |
| `incluir_contagem_grupo=true` | Deve incluir contagem completa por grupo. | Fazer `GET /musculos?incluir_contagem_grupo=true`. | Retorna `200`; payload contém `contagem_por_grupo` com os 6 grupos, inclusive com zero quando aplicável. |
| `contagem_por_grupo` independente de filtro de nome | Contagem é global por grupo, não apenas dos itens filtrados. | Fazer `GET /musculos?nome=peitoral&incluir_contagem_grupo=true`. | Retorna `200`; `dados` filtrado por nome e `contagem_por_grupo` com totais globais. |
| Paginação alfanumérica (comportamento atual do parser) | Deve aceitar prefixo numérico via `parseInt`. | Fazer `GET /musculos?page=2abc&limite=3xyz`. | Retorna `200`; `page: 2`, `limite: 3`. |
| Sem resultados para filtro restritivo | Deve retornar vazio com metadados coerentes. | Fazer `GET /musculos?nome=nao-existe`. | Retorna `200`; `dados: []`, `total: 0`, `totalPages: 0`. |
| **Cenários tristes** |  |  |  |
| `grupo_muscular` fora do enum | Deve rejeitar com `422`. | Fazer `GET /musculos?grupo_muscular=PESCOCO`. | Retorna `422`; erro Zod de enum inválido. |
| `ordem` fora do enum | Deve rejeitar com `422`. | Fazer `GET /musculos?ordem=asc`. | Retorna `422`; erro Zod de enum inválido. |
| `page` inválido | Deve rejeitar com `422`. | Fazer `GET /musculos?page=0`. | Retorna `422`; mensagem: "page deve ser um número inteiro maior que 0". |
| `limite` acima de 100 | Deve rejeitar com `422`. | Fazer `GET /musculos?limite=101`. | Retorna `422`; mensagem: "limite deve ser entre 1 e 100". |
| `limite` não numérico | Deve rejeitar com `422`. | Fazer `GET /musculos?limite=abc`. | Retorna `422`; mensagem: "limite deve ser entre 1 e 100". |
| Query com campo extra (`.strict()`) | Deve rejeitar com `422`. | Fazer `GET /musculos?foo=bar`. | Retorna `422`; erro Zod de chave não reconhecida. |
| Requisição sem header `Authorization` | Deve rejeitar com `401`. | Fazer `GET /musculos` sem autenticação. | Retorna `401`. |

---

## GET /musculos/:id — Detalhe de Músculo

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** |  |  |  |
| Usuário autenticado consulta músculo existente | Deve retornar músculo com `200`. | Fazer `GET /musculos/:id` com ID válido existente. | Retorna `200`; `id`, `nome`, `grupo_muscular` e array `exercicios`. |
| Exercícios vinculados incluem `tipo_ativacao` | Deve retornar metadados do vínculo exercício-músculo. | Consultar músculo com exercícios vinculados como PRIMARIO/SECUNDARIO. | Retorna `200`; cada item de `exercicios` contém `tipo_ativacao`. |
| Detalhe exclui exercícios inativos | Exercícios com soft delete não devem aparecer. | Vincular músculo a exercício ativo e inativo, depois consultar por ID. | Retorna `200`; somente exercícios ativos no array `exercicios`. |
| Músculo sem exercícios vinculados | Deve retornar array vazio. | Consultar músculo existente sem vínculos em `exercicio_musculo`. | Retorna `200`; `exercicios: []`. |
| **Cenários tristes** |  |  |  |
| ID inexistente (UUID válido) | Deve rejeitar com `404`. | Fazer `GET /musculos/{uuid-inexistente}`. | Retorna `404`; mensagem: "Músculo não encontrado". |
| ID com formato inválido | Deve rejeitar com `422`. | Fazer `GET /musculos/nao-e-uuid`. | Retorna `422`; mensagem da API: "ID inválido". |
| Requisição sem header `Authorization` | Deve rejeitar com `401`. | Fazer `GET /musculos/:id` sem autenticação. | Retorna `401`. |
