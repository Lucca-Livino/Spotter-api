# Suite de Testes E2E — Treinadores (`/treinadores`)

> Testes E2E com Jest + Supertest contra banco real, validando regras de negócio e validações das rotas de treinadores.

> **Arquivo:** `src/tests/routes/treinadorRoutes.test.ts`

---

## Rastreabilidade de Requisitos (`PROJETO.md`)

| Requisito | Descrição no projeto | Cobertura nesta suíte |
| :--- | :--- | :--- |
| **RF003** | Tipos de usuários | Cobertura indireta: criação/listagem de perfil de treinador vinculado ao usuário autenticado. |
| **RF004** | Informações de usuário | Cobertura direta: criação, consulta e atualização de dados do perfil de treinador. |
| **RF0015** | Procurar treinador | Cobertura direta: listagem paginada em `GET /treinadores` para descoberta de perfis. |

---

## GET /treinadores — Listagem de Treinadores

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** |  |  |  |
| Usuário autenticado lista treinadores | Deve retornar lista paginada com `200`. | Fazer `GET /treinadores` com autenticação válida. | Retorna `200`; contém `dados`, `total`, `page`, `limite`, `totalPages`. |
| Query vazia usa padrão do schema | Deve usar `page=1` e `limite=10`. | Fazer `GET /treinadores` sem query params. | Retorna `200`; metadados com valores padrão. |
| Paginação explícita | Deve respeitar `page` e `limite`. | Fazer `GET /treinadores?page=1&limite=1`. | Retorna `200`; no máximo 1 item em `dados`; metadados coerentes. |
| **Cenários tristes** |  |  |  |
| `page` inválido | Deve rejeitar com `422`. | Fazer `GET /treinadores?page=0`. | Retorna `422`; erro de validação em `errors`. |
| `limite` inválido | Deve rejeitar com `422`. | Fazer `GET /treinadores?limite=101`. | Retorna `422`; erro de validação em `errors`. |
| `limite` não numérico | Deve rejeitar com `422`. | Fazer `GET /treinadores?limite=abc`. | Retorna `422`; erro de validação em `errors`. |
| Campo extra na query (`.strict()`) | Deve rejeitar com `422`. | Fazer `GET /treinadores?foo=bar`. | Retorna `422`; erro Zod de campo não reconhecido. |
| Sem autenticação | Deve rejeitar com `401`. | Fazer `GET /treinadores` sem sessão/token válido. | Retorna `401`. |

---

## GET /treinadores/:id — Detalhe de Treinador

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** |  |  |  |
| Buscar treinador existente por ID | Deve retornar treinador com `200`. | Fazer `GET /treinadores/:id` com UUID existente. | Retorna `200`; `data` contém os campos do perfil de treinador. |
| **Cenários tristes** |  |  |  |
| ID inexistente (UUID válido) | Deve rejeitar com `404`. | Fazer `GET /treinadores/{uuid-valido-inexistente}`. | Retorna `404`; mensagem de não encontrado. |
| ID inválido (não UUID) | Deve rejeitar com `422`. | Fazer `GET /treinadores/nao-e-uuid`. | Retorna `422`; erro de validação em `errors`. |
| Sem autenticação | Deve rejeitar com `401`. | Fazer `GET /treinadores/:id` sem sessão/token válido. | Retorna `401`. |

---

## POST /treinadores — Criação de Treinador

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** |  |  |  |
| Criação válida com campos obrigatórios | Deve criar treinador com `201`. | Fazer `POST /treinadores` com `nome`, `data_nascimento`, `sexo`, `cref`, `turnos`, `especializacao`, `graduacao`, `academia_id`. | Retorna `201`; `data` contém treinador criado vinculado ao usuário autenticado. |
| Criação válida com campos opcionais | Deve persistir opcionais (`url_foto`, `status_conta`). | Fazer `POST /treinadores` com opcionais preenchidos. | Retorna `201`; campos opcionais refletidos na resposta. |
| `status_conta` padrão | Deve assumir `true` quando não informado. | Fazer `POST /treinadores` sem `status_conta`. | Retorna `201`; `data.status_conta` igual a `true`. |
| **Cenários tristes** |  |  |  |
| `nome` ausente | Deve rejeitar com `400`. | Fazer `POST /treinadores` sem `nome`. | Retorna `400`; mensagem de dados obrigatórios. |
| `academia_id` inválido | Deve rejeitar com `422`. | Fazer `POST /treinadores` com `academia_id` não UUID. | Retorna `422`; erro de validação em `errors`. |
| `data_nascimento` inválida (formato) | Deve rejeitar com `422`. | Fazer `POST /treinadores` com `data_nascimento: "01-01-2000"`. | Retorna `422`; erro de validação em `errors`. |
| `data_nascimento` inválida (data impossível) | Deve rejeitar com `422`. | Fazer `POST /treinadores` com `2025-02-30`. | Retorna `422`; erro de validação em `errors`. |
| `sexo` fora do enum | Deve rejeitar com `422`. | Fazer `POST /treinadores` com `sexo: "X"`. | Retorna `422`; erro de validação em `errors`. |
| `turnos` vazio | Deve rejeitar com `422`. | Fazer `POST /treinadores` com `turnos: []`. | Retorna `422`; erro de validação em `errors`. |
| `academia_id` inexistente na tabela `academia` | Deve rejeitar com `422`. | Fazer `POST /treinadores` com UUID válido não existente em `academia_id`. | Retorna `422`; mensagem de referência inválida. |
| Usuário autenticado já possui perfil de treinador | Deve rejeitar com `409`. | Fazer `POST /treinadores` novamente com mesmo usuário autenticado. | Retorna `409`; mensagem de conflito de duplicidade. |
| Sem autenticação | Deve rejeitar com `401`. | Fazer `POST /treinadores` sem sessão/token válido. | Retorna `401`. |

---

## PATCH /treinadores/:id — Atualização de Treinador

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** |  |  |  |
| Atualização parcial válida | Deve atualizar campos e retornar `200`. | Fazer `PATCH /treinadores/:id` com subset de campos válidos. | Retorna `200`; `data` com valores atualizados. |
| Atualização de `status_conta` | Deve aceitar alteração de status de conta. | Fazer `PATCH /treinadores/:id` com `{ status_conta: false }`. | Retorna `200`; `status_conta` refletido na resposta. |
| Atualização de `turnos` | Deve aceitar atualização dos turnos de atendimento. | Fazer `PATCH /treinadores/:id` com novo array de `turnos`. | Retorna `200`; `turnos` atualizados na resposta. |
| **Cenários tristes** |  |  |  |
| Body vazio | Deve rejeitar com `400`. | Fazer `PATCH /treinadores/:id` com `{}`. | Retorna `400`; mensagem de corpo obrigatório. |
| ID inválido | Deve rejeitar com `422`. | Fazer `PATCH /treinadores/nao-e-uuid`. | Retorna `422`; erro de validação em `errors`. |
| Treinador inexistente | Deve rejeitar com `404`. | Fazer `PATCH /treinadores/{uuid-inexistente}`. | Retorna `404`; mensagem de não encontrado. |
| Campo inválido (`sexo` fora do enum) | Deve rejeitar com `422`. | Fazer `PATCH /treinadores/:id` com `sexo: "X"`. | Retorna `422`; erro de validação em `errors`. |
| `turnos` vazio | Deve rejeitar com `422`. | Fazer `PATCH /treinadores/:id` com `turnos: []`. | Retorna `422`; erro de validação em `errors`. |
| Sem autenticação | Deve rejeitar com `401`. | Fazer `PATCH /treinadores/:id` sem sessão/token válido. | Retorna `401`. |
