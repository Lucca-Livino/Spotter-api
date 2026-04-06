# Suite de Testes E2E - Auth (`/api/auth`)

> Testes E2E com Jest + Supertest contra servidor real e banco real, validando o fluxo de autenticacao.

> **Arquivo:** `src/tests/routes/authRoutes.test.ts`

> **Escopo desta suite:** cadastro, login, logout, me e session.

> **Fora de escopo neste momento:** reset/forget/change password, pois o fluxo de envio de email ainda nao esta integrado.

---

## POST /api/auth/sign-up/email - Cadastro

| Funcionalidade | Comportamento Esperado | Verificacoes | Criterios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenarios felizes** |  |  |  |
| Cadastro com payload valido | Deve criar usuario e sessao inicial. | Fazer `POST /api/auth/sign-up/email` com `name`, `email` e `password` validos. | Retorna `200`; body contem `token` e `user`; resposta inclui cookie `better-auth.session_token`. |
| **Cenarios tristes** |  |  |  |
| Cadastro duplicado com mesmo email | Deve bloquear novo cadastro para email existente. | Fazer dois `POST /api/auth/sign-up/email` com o mesmo payload. | Primeira requisicao retorna `200`; segunda retorna `422` com `code: USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`. |
| Cadastro sem email | Deve rejeitar payload incompleto. | Fazer `POST /api/auth/sign-up/email` sem `email`. | Retorna `400` com `code: VALIDATION_ERROR`. |
| Cadastro sem nome | Deve rejeitar payload incompleto. | Fazer `POST /api/auth/sign-up/email` sem `name`. | Retorna `400` com `code: VALIDATION_ERROR`. |
| Cadastro com email invalido | Deve rejeitar formato invalido de email. | Fazer `POST /api/auth/sign-up/email` com email invalido. | Retorna `400` com `code: VALIDATION_ERROR`. |
| Cadastro com senha curta | Deve rejeitar senha abaixo do minimo do Better Auth. | Fazer `POST /api/auth/sign-up/email` com senha curta. | Retorna `400` com `code: PASSWORD_TOO_SHORT`. |

---

## POST /api/auth/sign-in/email - Login

| Funcionalidade | Comportamento Esperado | Verificacoes | Criterios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenarios felizes** |  |  |  |
| Login com credenciais validas | Deve autenticar usuario e criar sessao. | Fazer `POST /api/auth/sign-in/email` com email/senha validos. | Retorna `200`; body contem `token`, `user`, `redirect: false`; resposta inclui cookie de sessao. |
| **Cenarios tristes** |  |  |  |
| Login com senha invalida | Deve negar autenticacao. | Fazer `POST /api/auth/sign-in/email` com senha errada. | Retorna `401` com `code: INVALID_EMAIL_OR_PASSWORD`. |
| Login com usuario inexistente | Deve negar autenticacao. | Fazer `POST /api/auth/sign-in/email` com email nao cadastrado. | Retorna `401` com `code: INVALID_EMAIL_OR_PASSWORD`. |
| Login sem email | Deve rejeitar payload invalido. | Fazer `POST /api/auth/sign-in/email` sem `email`. | Retorna `400` com `code: VALIDATION_ERROR`. |
| Login sem senha | Deve rejeitar payload invalido. | Fazer `POST /api/auth/sign-in/email` sem `password`. | Retorna `400` com `code: VALIDATION_ERROR`. |
| Login com email invalido | Deve rejeitar formato invalido. | Fazer `POST /api/auth/sign-in/email` com email invalido. | Retorna `400` com `code: INVALID_EMAIL`. |

---

## GET /api/auth/get-session - Sessao Atual

| Funcionalidade | Comportamento Esperado | Verificacoes | Criterios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenarios felizes** |  |  |  |
| Sessao com bearer valido | Deve retornar sessao e usuario autenticado. | Fazer `GET /api/auth/get-session` com `Authorization: Bearer <token>`. | Retorna `200`; body contem `session` e `user` correspondentes ao usuario logado. |
| Sessao com cookie valido | Deve retornar sessao e usuario autenticado. | Fazer `GET /api/auth/get-session` com cookie de sessao. | Retorna `200`; body contem `session` e `user`. |
| **Cenarios tristes** |  |  |  |
| Sem autenticacao | Deve retornar ausencia de sessao sem erro HTTP. | Fazer `GET /api/auth/get-session` sem token/cookie. | Retorna `200` com body `null`. |
| Token invalido | Deve retornar ausencia de sessao sem erro HTTP. | Fazer `GET /api/auth/get-session` com bearer invalido. | Retorna `200` com body `null`. |

---

## GET /api/me - Usuario Autenticado

| Funcionalidade | Comportamento Esperado | Verificacoes | Criterios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenarios felizes** |  |  |  |
| /me com bearer valido | Deve retornar dados basicos do usuario. | Fazer `GET /api/me` com `Authorization: Bearer <token>`. | Retorna `200`; body contem `success: true` e `data` com `id`, `name`, `email`, `image`. |
| /me com cookie valido | Deve retornar dados basicos do usuario. | Fazer `GET /api/me` com cookie de sessao. | Retorna `200`; body contem dados do usuario autenticado. |
| **Cenarios tristes** |  |  |  |
| /me sem autenticacao | Deve bloquear acesso. | Fazer `GET /api/me` sem token/cookie. | Retorna `401` com mensagem de nao autorizado. |
| /me com token invalido | Deve bloquear acesso. | Fazer `GET /api/me` com bearer invalido. | Retorna `401` com mensagem de nao autorizado. |

---

## POST /api/auth/sign-out - Logout

| Funcionalidade | Comportamento Esperado | Verificacoes | Criterios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenarios felizes** |  |  |  |
| Logout com Origin e bearer valido | Deve encerrar sessao do token informado. | Fazer `POST /api/auth/sign-out` com `Origin` valido e bearer valido. | Retorna `200` com `success: true`; `GET /api/auth/get-session` no mesmo token retorna `200` com `null`. |
| Logout com Origin e cookie valido | Deve encerrar sessao do cookie informado. | Fazer `POST /api/auth/sign-out` com `Origin` valido e cookie de sessao. | Retorna `200` com `success: true`; sessao nao fica mais ativa. |
| Logout com Origin sem autenticacao | Deve ser idempotente. | Fazer `POST /api/auth/sign-out` apenas com `Origin`. | Retorna `200` com `success: true`. |
| **Cenarios tristes** |  |  |  |
| Logout sem header Origin (cookie flow) | Deve ser bloqueado por protecao CSRF do Better Auth. | Fazer `POST /api/auth/sign-out` com cookie e sem `Origin`. | Retorna `403` com `code: MISSING_OR_NULL_ORIGIN`. |

---

## Fluxo Completo E2E de Auth

| Funcionalidade | Comportamento Esperado | Verificacoes | Criterios de Aceite |
| :--- | :--- | :--- | :--- |
| Cadastro -> Login -> Session -> Me -> Logout -> Sessao invalida | Deve validar o ciclo completo de autenticacao e invalidacao de sessao. | Executar sequencia encadeada dos endpoints de auth. | Fluxo retorna sucesso nas etapas autenticadas e, apos logout, `get-session` retorna `null` e `/me` retorna `401`. |