# Suite de Testes E2E — Conversas (`/conversas`)

> Testes E2E com Jest + Supertest contra banco real, validando regras de negócio, autenticação, autorização e validações das rotas de chat.

> **Arquivo:** `src/tests/routes/conversaRoutes.test.ts`

---

## Rastreabilidade de Requisitos (`PROJETO.md`)

| Requisito | Descrição no projeto | Cobertura nesta suíte |
| :--- | :--- | :--- |
| **RF002** | Login de usuário | Cobertura indireta: todas as rotas exigem autenticação (`401` sem sessão/token). |
| **RF003** | Tipos de usuários | Cobertura direta: regras distintas para perfil de aluno e treinador nas rotas de conversa. |
| **RF0013** | Chat de alunos | Cobertura direta: iniciar conversa, listar, buscar conversa, enviar/listar mensagens e marcar mensagens lidas. |
| **RF0014** | Disponibilidade do chat | Cobertura direta: chat acessível para aluno e treinador participantes da conversa. |

---

## POST /conversas — Iniciar ou Buscar Conversa

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** |  |  |  |
| Treinador inicia conversa com aluno vinculado | Deve criar conversa e retornar `201`. | Fazer `POST /conversas` como treinador com `aluno_id` de aluno vinculado. | Retorna `201`; `data` contém `treinador_id`, `aluno_id` e `ativa: true`. |
| Treinador repete criação para mesmo aluno | Deve retornar conversa já existente (idempotente). | Fazer 2x `POST /conversas` com mesmo `aluno_id`. | Ambas retornam `201`; segundo retorno mantém o mesmo `id` da conversa existente. |
| Aluno inicia conversa sem body | Deve usar automaticamente seu treinador vinculado. | Fazer `POST /conversas` como aluno sem payload. | Retorna `201`; conversa com `aluno_id` do aluno autenticado e `treinador_id` vinculado. |
| Aluno inicia conversa com próprio `aluno_id` | Deve permitir quando `aluno_id` informado é o próprio. | Fazer `POST /conversas` como aluno com `aluno_id` igual ao próprio id. | Retorna `201`; conversa criada/encontrada com sucesso. |
| **Cenários tristes** |  |  |  |
| Treinador sem `aluno_id` | Deve rejeitar com `422`. | Fazer `POST /conversas` como treinador com body `{}`. | Retorna `422`; mensagem de validação exigindo `aluno_id`. |
| `aluno_id` inválido (não UUID) | Deve rejeitar com `422`. | Fazer `POST /conversas` com `aluno_id: "nao-e-uuid"`. | Retorna `422`; erro de validação em `errors`. |
| Aluno inexistente | Deve rejeitar com `404`. | Fazer `POST /conversas` com UUID válido inexistente em `aluno_id`. | Retorna `404`; mensagem: "Aluno nao encontrado". |
| Treinador tenta conversar com aluno não vinculado | Deve rejeitar com `403`. | Fazer `POST /conversas` como treinador A com `aluno_id` vinculado ao treinador B. | Retorna `403`; mensagem de permissão negada. |
| Aluno informa `aluno_id` de outro aluno | Deve rejeitar com `403`. | Fazer `POST /conversas` como aluno com `aluno_id` de terceiro. | Retorna `403`; mensagem de permissão negada. |
| Aluno sem treinador vinculado | Deve rejeitar com `422`. | Fazer `POST /conversas` como aluno cujo `treinador_id` é `null`. | Retorna `422`; mensagem de validação para vínculo de treinador. |
| Usuário sem perfil (nem aluno nem treinador) | Deve rejeitar com `403`. | Fazer `POST /conversas` com usuário autenticado sem perfil em `aluno`/`treinador`. | Retorna `403`; mensagem informando ausência de perfil. |
| Usuário com perfil duplicado (aluno + treinador) | Deve rejeitar com `422`. | Fazer `POST /conversas` com usuário que possua ambos perfis. | Retorna `422`; mensagem de perfil duplicado. |
| Sem autenticação | Deve rejeitar com `401`. | Fazer `POST /conversas` sem sessão/token válido. | Retorna `401`. |

---

## GET /conversas — Listagem de Conversas

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** |  |  |  |
| Treinador lista suas conversas | Deve retornar apenas conversas do treinador autenticado com `200`. | Fazer `GET /conversas` como treinador. | Retorna `200`; `dados` contém apenas conversas com `treinador_id` do autenticado. |
| Aluno lista suas conversas | Deve retornar apenas conversas do aluno autenticado com `200`. | Fazer `GET /conversas` como aluno. | Retorna `200`; `dados` contém apenas conversas com `aluno_id` do autenticado. |
| Query vazia usa padrão do schema | Deve usar `page=1` e `limite=20`. | Fazer `GET /conversas` sem query params. | Retorna `200`; metadados com valores padrão. |
| Paginação explícita | Deve respeitar `page` e `limite`. | Fazer `GET /conversas?page=1&limite=1`. | Retorna `200`; no máximo 1 item em `dados`; metadados coerentes. |
| **Cenários tristes** |  |  |  |
| `page` inválido | Deve rejeitar com `422`. | Fazer `GET /conversas?page=0`. | Retorna `422`; erro de validação em `errors`. |
| `limite` inválido | Deve rejeitar com `422`. | Fazer `GET /conversas?limite=101`. | Retorna `422`; erro de validação em `errors`. |
| Campo extra na query (`.strict()`) | Deve rejeitar com `422`. | Fazer `GET /conversas?foo=bar`. | Retorna `422`; erro Zod de campo não reconhecido. |
| Usuário sem perfil | Deve rejeitar com `403`. | Fazer `GET /conversas` com usuário sem perfil em `aluno`/`treinador`. | Retorna `403`; mensagem de permissão negada. |
| Sem autenticação | Deve rejeitar com `401`. | Fazer `GET /conversas` sem sessão/token válido. | Retorna `401`. |

---

## GET /conversas/:id — Detalhe de Conversa

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** |  |  |  |
| Participante busca conversa por ID | Deve retornar conversa com `200`. | Fazer `GET /conversas/:id` como aluno ou treinador participante. | Retorna `200`; `data.id` igual ao informado. |
| **Cenários tristes** |  |  |  |
| Não participante busca conversa | Deve rejeitar com `403`. | Fazer `GET /conversas/:id` com usuário que não participa. | Retorna `403`; mensagem de permissão negada. |
| ID inexistente (UUID válido) | Deve rejeitar com `404`. | Fazer `GET /conversas/{uuid-valido-inexistente}`. | Retorna `404`; mensagem: "Conversa nao encontrada". |
| ID inválido (não UUID) | Deve rejeitar com `422`. | Fazer `GET /conversas/nao-e-uuid`. | Retorna `422`; erro de validação em `errors`. |
| Sem autenticação | Deve rejeitar com `401`. | Fazer `GET /conversas/:id` sem sessão/token válido. | Retorna `401`. |

---

## GET /conversas/:conversaId/mensagens — Listagem de Mensagens

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** |  |  |  |
| Participante lista mensagens | Deve retornar lista paginada com `200`. | Fazer `GET /conversas/:conversaId/mensagens` como participante. | Retorna `200`; contém `dados`, `total`, `page`, `limite`, `totalPages`. |
| Query vazia usa padrão do schema | Deve usar `page=1` e `limite=30`. | Fazer `GET` sem query params. | Retorna `200`; metadados com valores padrão. |
| Paginação explícita | Deve respeitar `page` e `limite`. | Fazer `GET .../mensagens?page=1&limite=1`. | Retorna `200`; no máximo 1 item em `dados`. |
| Ordenação cronológica ascendente | Deve listar mensagens por `enviada_em` ascendente. | Criar mensagens com datas crescentes e listar. | Retorna `200`; primeira mensagem da resposta é a mais antiga. |
| **Cenários tristes** |  |  |  |
| Não participante lista mensagens | Deve rejeitar com `403`. | Fazer `GET .../mensagens` com usuário que não participa da conversa. | Retorna `403`; mensagem de permissão negada. |
| `conversaId` inexistente | Deve rejeitar com `404`. | Fazer `GET .../mensagens` com UUID válido inexistente. | Retorna `404`; mensagem: "Conversa nao encontrada". |
| `conversaId` inválido | Deve rejeitar com `422`. | Fazer `GET .../mensagens/nao-e-uuid`. | Retorna `422`; erro de validação em `errors`. |
| `page` inválido | Deve rejeitar com `422`. | Fazer `GET .../mensagens?page=0`. | Retorna `422`; erro de validação em `errors`. |
| `limite` inválido | Deve rejeitar com `422`. | Fazer `GET .../mensagens?limite=101`. | Retorna `422`; erro de validação em `errors`. |
| Campo extra na query (`.strict()`) | Deve rejeitar com `422`. | Fazer `GET .../mensagens?foo=bar`. | Retorna `422`; erro Zod de campo não reconhecido. |
| Sem autenticação | Deve rejeitar com `401`. | Fazer `GET .../mensagens` sem sessão/token válido. | Retorna `401`. |

---

## POST /conversas/:conversaId/mensagens — Envio de Mensagem

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** |  |  |  |
| Treinador participante envia mensagem | Deve criar mensagem com `201` e `remetente_tipo=TREINADOR`. | Fazer `POST .../mensagens` como treinador participante com `conteudo` válido. | Retorna `201`; `data` contém mensagem persistida e tipo do remetente correto. |
| Aluno participante envia mensagem | Deve criar mensagem com `201` e `remetente_tipo=ALUNO`. | Fazer `POST .../mensagens` como aluno participante com `conteudo` válido. | Retorna `201`; mensagem criada com tipo do remetente correto. |
| Conteúdo com espaços nas bordas | Deve aplicar `trim` e persistir conteúdo normalizado. | Fazer `POST .../mensagens` com `conteudo: "  ola  "`. | Retorna `201`; `data.conteudo` igual a `"ola"`. |
| Atualização de `ultima_mensagem_em` na conversa | Deve atualizar timestamp da conversa após envio. | Enviar mensagem e consultar a conversa em seguida. | `ultima_mensagem_em` fica preenchido com data recente. |
| **Cenários tristes** |  |  |  |
| Conteúdo vazio/branco | Deve rejeitar com `422`. | Fazer `POST .../mensagens` com `conteudo: "   "`. | Retorna `422`; erro de validação em `errors`. |
| Conteúdo acima de 2000 caracteres | Deve rejeitar com `422`. | Fazer `POST .../mensagens` com string de 2001+ chars. | Retorna `422`; erro de validação em `errors`. |
| Não participante envia mensagem | Deve rejeitar com `403`. | Fazer `POST .../mensagens` com usuário fora da conversa. | Retorna `403`; mensagem de permissão negada. |
| `conversaId` inexistente | Deve rejeitar com `404`. | Fazer `POST .../mensagens` com UUID válido inexistente. | Retorna `404`; mensagem: "Conversa nao encontrada". |
| `conversaId` inválido | Deve rejeitar com `422`. | Fazer `POST .../mensagens/nao-e-uuid`. | Retorna `422`; erro de validação em `errors`. |
| Body com campo extra (`.strict()`) | Deve rejeitar com `422`. | Fazer `POST .../mensagens` com `conteudo` e campo adicional. | Retorna `422`; erro Zod de campo não reconhecido. |
| Sem autenticação | Deve rejeitar com `401`. | Fazer `POST .../mensagens` sem sessão/token válido. | Retorna `401`. |

---

## PATCH /conversas/:conversaId/mensagens/lidas — Marcar Mensagens como Lidas

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** |  |  |  |
| Participante marca mensagens recebidas como lidas | Deve atualizar mensagens não lidas recebidas e retornar quantidade com `200`. | Fazer `PATCH .../mensagens/lidas` como participante após mensagens do outro lado. | Retorna `200`; `data.marcadas` > 0. |
| Não marcar mensagens enviadas pelo próprio usuário | Deve ignorar mensagens de autoria do leitor. | Criar mensagens do próprio usuário e executar `PATCH .../lidas`. | Retorna `200`; contador não inclui mensagens próprias. |
| Segunda marcação sem novas mensagens | Deve retornar `marcadas: 0`. | Executar `PATCH .../lidas` duas vezes seguidas. | Segunda execução retorna `200` com `marcadas = 0`. |
| **Cenários tristes** |  |  |  |
| Não participante marca mensagens | Deve rejeitar com `403`. | Fazer `PATCH .../mensagens/lidas` com usuário fora da conversa. | Retorna `403`; mensagem de permissão negada. |
| `conversaId` inexistente | Deve rejeitar com `404`. | Fazer `PATCH .../mensagens/lidas` com UUID válido inexistente. | Retorna `404`; mensagem: "Conversa nao encontrada". |
| `conversaId` inválido | Deve rejeitar com `422`. | Fazer `PATCH .../mensagens/lidas` com id inválido. | Retorna `422`; erro de validação em `errors`. |
| Sem autenticação | Deve rejeitar com `401`. | Fazer `PATCH .../mensagens/lidas` sem sessão/token válido. | Retorna `401`. |
