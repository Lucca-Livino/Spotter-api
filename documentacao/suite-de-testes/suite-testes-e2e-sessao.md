# Suite de Testes E2E — Sessões (`/sessoes`)

> Testes E2E com Jest + Supertest contra banco real, validando toda a regra de negócio das rotas de sessões de treino.

> **Arquivo:** `src/tests/routes/sessaoRoutes.test.ts`

---

## POST /sessoes — Iniciar Sessão de Treino

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** |  |  |  |
| Aluno inicia sessão com treino próprio | Deve criar sessão com status `EM_ANDAMENTO` e retornar `201`. | Fazer `POST /sessoes` como aluno com `treino_id` de treino que lhe pertence. | Retorna `201`; sessão com `status: 'EM_ANDAMENTO'`, `aluno_id` do aluno autenticado, `treino_id` correto, e arrays de `exercicios` e `series` populados. |
| Exercícios e séries copiados do treino | Exercícios e séries do treino devem ser instanciados na sessão. | Fazer `POST /sessoes` com treino que contém 2 exercícios, cada um com 3 séries. | Retorna `201`; sessão contém `exercicios` com 2 itens; cada exercício contém 3 séries com `status: 'PENDENTE'`. |
| Séries iniciam com `status: 'PENDENTE'` | Todas as séries criadas devem estar pendentes. | Fazer `POST /sessoes` e inspecionar `sessao_serie`. | Retorna `201`; todas as séries têm `status: 'PENDENTE'`. |
| **Cenários tristes** |  |  |  |
| Aluno não pode iniciar segunda sessão simultânea | Deve rejeitar com `409` quando já existe sessão `EM_ANDAMENTO`. | Iniciar sessão A, depois tentar iniciar sessão B sem finalizar A. | Retorna `409`; mensagem: "já existe uma sessão em andamento para este aluno". |
| Treinador tenta iniciar sessão | Deve rejeitar com `403`. | Fazer `POST /sessoes` como treinador puro (sem perfil de aluno). | Retorna `403`; mensagem: "apenas alunos podem iniciar sessões de treino". |
| Admin tenta iniciar sessão | Deve rejeitar com `403` (sem perfil de aluno). | Fazer `POST /sessoes` como admin puro (sem perfil de aluno). | Retorna `403`; mensagem: "apenas alunos podem iniciar sessões de treino". |
| Usuário autenticado sem perfil tenta iniciar sessão | Deve rejeitar com `403`. | Fazer `POST /sessoes` como usuário sem perfil aluno/treinador/admin. | Retorna `403`; mensagem: "apenas alunos podem iniciar sessões de treino". |
| `treino_id` inexistente ou não pertence ao aluno | Deve rejeitar com `422`. | Fazer `POST /sessoes` com UUID válido mas de treino de outro aluno ou inexistente. | Retorna `422`; mensagem: "Treino não encontrado ou não pertence ao aluno autenticado". |
| `treino_id` com UUID inválido | Deve rejeitar com `422`. | Fazer `POST /sessoes` com `treino_id: "nao-e-uuid"`. | Retorna `422`; mensagem: "O ID do treino deve ser um UUID válido". |
| Body vazio | Deve rejeitar com `422`. | Fazer `POST /sessoes` com body `{}`. | Retorna `422`; erro Zod indicando `treino_id` obrigatório. |
| Body com campo desconhecido (schema strict) | Deve rejeitar com `422`. | Fazer `POST /sessoes` com `{ treino_id, foo: "bar" }`. | Retorna `422`; erro Zod de chave não reconhecida. |
| Requisição sem header `Authorization` | Deve rejeitar com `401`. | Fazer `POST /sessoes` sem autenticação. | Retorna `401`. |

---

## GET /sessoes/em-andamento — Sessão em Andamento do Aluno

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** |  |  |  |
| Aluno consulta sessão em andamento existente | Deve retornar a sessão atual do aluno com `200`. | Iniciar sessão, depois fazer `GET /sessoes/em-andamento` como o mesmo aluno. | Retorna `200`; sessão com `status: 'EM_ANDAMENTO'` e dados completos de exercícios e séries. |
| Aluno consulta quando não há sessão em andamento | Deve retornar `null` com `200`. | Fazer `GET /sessoes/em-andamento` como aluno sem sessão ativa. | Retorna `200`; `data: null`. |
| **Cenários tristes** |  |  |  |
| Treinador tenta consultar sessão em andamento | Deve rejeitar com `403`. | Fazer `GET /sessoes/em-andamento` como treinador puro. | Retorna `403`; mensagem: "apenas alunos podem consultar sessão em andamento". |
| Admin tenta consultar sessão em andamento | Deve rejeitar com `403` (sem perfil de aluno). | Fazer `GET /sessoes/em-andamento` como admin puro. | Retorna `403`; mensagem: "apenas alunos podem consultar sessão em andamento". |
| Usuário autenticado sem perfil consulta sessão em andamento | Deve rejeitar com `403`. | Fazer `GET /sessoes/em-andamento` como usuário sem perfil aluno/treinador/admin. | Retorna `403`; mensagem: "apenas alunos podem consultar sessão em andamento". |
| Requisição sem header `Authorization` | Deve rejeitar com `401`. | Fazer `GET /sessoes/em-andamento` sem autenticação. | Retorna `401`. |

---

## GET /sessoes — Listagem de Sessões (Paginada)

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** |  |  |  |
| Aluno lista próprias sessões | Deve retornar apenas as sessões do aluno autenticado com `200`. | Fazer `GET /sessoes` como aluno com sessões cadastradas. | Retorna `200`; resposta com `dados`, `total`, `page`, `limite`, `totalPages`; todas as sessões pertencem ao aluno. |
| Admin lista sessões de qualquer aluno (sem filtro) | Deve retornar todas as sessões com `200`. | Fazer `GET /sessoes` como admin. | Retorna `200`; sessões de todos os alunos. |
| Admin filtra por `aluno_id` | Deve retornar apenas sessões do aluno informado. | Fazer `GET /sessoes?aluno_id={ID_ALUNO}` como admin. | Retorna `200`; todas as sessões pertencem ao aluno do filtro. |
| Treinador lista sessões dos seus alunos | Deve retornar sessões de todos os alunos que ele treina. | Fazer `GET /sessoes` como treinador com alunos atribuídos. | Retorna `200`; sessões são dos alunos atribuídos ao treinador. |
| Treinador sem alunos atribuídos lista sessões | Deve retornar lista vazia com `200`. | Fazer `GET /sessoes` como treinador sem alunos vinculados. | Retorna `200`; `dados: []`, `total: 0`, `totalPages: 0`. |
| Treinador filtra por `aluno_id` fora da carteira | Deve retornar lista vazia com `200`. | Fazer `GET /sessoes?aluno_id={ALUNO_NAO_ATRIBUIDO}` como treinador. | Retorna `200`; `dados: []`, `total: 0`, `totalPages: 0`. |
| Filtro por `status` | Deve retornar apenas sessões com o status informado. | Fazer `GET /sessoes?status=CONCLUIDA`. | Retorna `200`; todas as sessões têm `status: 'CONCLUIDA'`. |
| Filtro por `treino_id` | Deve retornar apenas sessões do treino informado. | Fazer `GET /sessoes?treino_id={ID_TREINO}`. | Retorna `200`; todas as sessões pertencem ao treino do filtro. |
| Filtro por `data_inicio` e `data_fim` | Deve retornar sessões com `inicio` dentro do período. | Fazer `GET /sessoes?data_inicio=...&data_fim=...`. | Retorna `200`; sessões com `inicio` dentro do intervalo. |
| Paginação: `page=2&limite=3` | Deve retornar segunda página com metadados corretos. | Criar 6+ sessões e fazer `GET /sessoes?page=2&limite=3`. | Retorna `200`; `page: 2`, `limite: 3`, `dados` com 3 itens (ou menos na última página). |
| Paginação com valor alfanumérico (comportamento atual do parser) | Deve converter prefixo numérico com `parseInt` e responder normalmente. | Fazer `GET /sessoes?page=2abc&limite=3xyz`. | Retorna `200`; `page: 2` e `limite: 3` no payload. |
| `ordem_data_inicio=asc` | Deve retornar sessões em ordem crescente por data de início. | Fazer `GET /sessoes?ordem_data_inicio=asc`. | Retorna `200`; sessão mais antiga aparece primeiro. |
| **Cenários tristes** |  |  |  |
| Aluno filtra por `aluno_id` alheio | Deve rejeitar com `403`. | Fazer `GET /sessoes?aluno_id={OUTRO_ALUNO}` como aluno. | Retorna `403`; mensagem: "você só pode visualizar suas próprias sessões". |
| Perfil sem acesso (usuário sem nenhum perfil válido) | Deve rejeitar com `403`. | Fazer `GET /sessoes` como usuário sem perfil aluno/treinador/admin. | Retorna `403`; mensagem: "perfil de acesso não autorizado". |
| `aluno_id` com UUID inválido | Deve rejeitar com `422`. | Fazer `GET /sessoes?aluno_id=invalido`. | Retorna `422`; mensagem: "aluno_id deve ser um UUID válido". |
| `status` fora do enum | Deve rejeitar com `422`. | Fazer `GET /sessoes?status=PAUSADA`. | Retorna `422`; erro Zod indicando valores válidos: `EM_ANDAMENTO`, `CONCLUIDA`, `CANCELADA`. |
| `page` inválido | Deve rejeitar com `422`. | Fazer `GET /sessoes?page=0`. | Retorna `422`; mensagem: "page deve ser um número inteiro maior que 0". |
| `limite` inválido (acima de 100) | Deve rejeitar com `422`. | Fazer `GET /sessoes?limite=101`. | Retorna `422`; mensagem: "limite deve ser entre 1 e 100". |
| `data_inicio` com formato inválido | Deve rejeitar com `422`. | Fazer `GET /sessoes?data_inicio=31-12-2025`. | Retorna `422`; mensagem: "data_inicio deve ser uma data ISO 8601 válida". |
| `data_fim` com formato inválido | Deve rejeitar com `422`. | Fazer `GET /sessoes?data_fim=31-12-2025`. | Retorna `422`; mensagem: "data_fim deve ser uma data ISO 8601 válida". |
| `ordem_data_inicio` fora do enum | Deve rejeitar com `422`. | Fazer `GET /sessoes?ordem_data_inicio=up`. | Retorna `422`; erro Zod para enum inválido. |
| Query com parâmetro desconhecido (schema strict) | Deve rejeitar com `422`. | Fazer `GET /sessoes?foo=bar`. | Retorna `422`; erro Zod de chave não reconhecida. |
| Requisição sem header `Authorization` | Deve rejeitar com `401`. | Fazer `GET /sessoes` sem autenticação. | Retorna `401`. |

---

## GET /sessoes/:id — Detalhe da Sessão

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** |  |  |  |
| Aluno consulta própria sessão | Deve retornar sessão com detalhes completos com `200`. | Fazer `GET /sessoes/:id` como aluno dono da sessão. | Retorna `200`; sessão com `id`, `status`, `inicio`, `aluno_id`, `treino_id`, `exercicios` (com séries). |
| Admin consulta qualquer sessão | Deve retornar sessão com `200`. | Fazer `GET /sessoes/:id` como admin para sessão de qualquer aluno. | Retorna `200`. |
| Treinador consulta sessão de aluno atribuído | Deve retornar sessão com `200`. | Fazer `GET /sessoes/:id` como treinador para sessão de aluno que ele treina. | Retorna `200`. |
| **Cenários tristes** |  |  |  |
| Aluno consulta sessão de outro aluno | Deve rejeitar com `403`. | Fazer `GET /sessoes/:id` como aluno para sessão de outro aluno. | Retorna `403`; mensagem: "você não tem permissão para visualizar esta sessão". |
| Treinador consulta sessão de aluno não atribuído | Deve rejeitar com `403`. | Fazer `GET /sessoes/:id` como treinador para sessão de aluno que não é seu. | Retorna `403`; mensagem: "você não tem permissão para visualizar esta sessão". |
| Usuário autenticado sem perfil consulta sessão por ID | Deve rejeitar com `403`. | Fazer `GET /sessoes/:id` como usuário sem perfil aluno/treinador/admin. | Retorna `403`; mensagem de permissão negada para visualização. |
| ID inexistente (UUID válido) | Deve rejeitar com `404`. | Fazer `GET /sessoes/{uuid-valido-inexistente}`. | Retorna `404`; mensagem: "Sessão não encontrada". |
| ID com formato inválido (não-UUID) | Deve rejeitar com `422`. | Fazer `GET /sessoes/nao-e-uuid`. | Retorna `422`; mensagem: "ID inválido, deve ser um UUID válido". |
| Requisição sem header `Authorization` | Deve rejeitar com `401`. | Fazer `GET /sessoes/:id` sem autenticação. | Retorna `401`. |

---

## GET /sessoes/:id/resumo — Resumo da Sessão

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** |  |  |  |
| Aluno consulta resumo de sessão concluída | Deve retornar métricas calculadas com `200`. | Finalizar sessão, depois fazer `GET /sessoes/:id/resumo`. | Retorna `200`; resposta com `duracao_minutos`, `exercicios_concluidos`, `exercicios_total`, `series_concluidas`, `series_total`, `volume_total_kg`, `taxa_conclusao`. |
| `duracao_minutos` é null para sessão `EM_ANDAMENTO` sem `fim` | Deve retornar `null` enquanto sessão não foi finalizada. | Fazer `GET /sessoes/:id/resumo` para sessão em andamento. | Retorna `200`; `duracao_minutos: null`. |
| `taxa_conclusao` calculada corretamente | Deve ser `(series_concluidas / series_total) × 100`, arredondado. | Criar sessão com 10 séries; concluir 7. | Retorna `200`; `taxa_conclusao: 70`, `series_concluidas: 7`, `series_total: 10`. |
| `volume_total_kg` considera apenas séries `CONCLUIDA` com carga e reps | Volume deve ignorar séries PULADA e séries sem carga/reps. | Criar sessão com mix de séries CONCLUIDA (com carga), PULADA e sem carga. | Retorna `200`; `volume_total_kg` reflete apenas o produto das séries com ambos os valores. |
| Admin consulta resumo de qualquer sessão | Deve retornar resumo com `200`. | Fazer `GET /sessoes/:id/resumo` como admin para sessão de qualquer aluno. | Retorna `200`. |
| **Cenários tristes** |  |  |  |
| Treinador consulta resumo de sessão de aluno não atribuído | Deve rejeitar com `403`. | Fazer `GET /sessoes/:id/resumo` como treinador para sessão de aluno fora da sua carteira. | Retorna `403`; mensagem: "você não tem permissão para visualizar esta sessão". |
| Aluno consulta resumo de sessão de outro aluno | Deve rejeitar com `403`. | Fazer `GET /sessoes/:id/resumo` como aluno para sessão alheia. | Retorna `403`; mensagem: "você não tem permissão para visualizar esta sessão". |
| Usuário autenticado sem perfil consulta resumo | Deve rejeitar com `403`. | Fazer `GET /sessoes/:id/resumo` como usuário sem perfil aluno/treinador/admin. | Retorna `403`; mensagem de permissão negada para visualização. |
| ID inexistente | Deve rejeitar com `404`. | Fazer `GET /sessoes/{uuid-inexistente}/resumo`. | Retorna `404`; mensagem: "Sessão não encontrada". |
| ID com formato inválido | Deve rejeitar com `422`. | Fazer `GET /sessoes/nao-e-uuid/resumo`. | Retorna `422`; mensagem: "ID inválido, deve ser um UUID válido". |
| Requisição sem header `Authorization` | Deve rejeitar com `401`. | Fazer `GET /sessoes/:id/resumo` sem autenticação. | Retorna `401`. |

---

## PATCH /sessoes/:id — Atualizar Observações da Sessão

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** |  |  |  |
| Aluno atualiza observações de sessão própria em andamento | Deve atualizar e retornar sessão com `200`. | Fazer `PATCH /sessoes/:id` como aluno com `{ observacoes: "Senti dor no ombro" }`. | Retorna `200`; `observacoes` alterada na resposta. |
| Admin atualiza observações de qualquer sessão em andamento | Deve atualizar com `200`. | Fazer `PATCH /sessoes/:id` como admin para sessão de qualquer aluno. | Retorna `200`. |
| Treinador atualiza observações de sessão de aluno atribuído | Deve atualizar com `200`. | Fazer `PATCH /sessoes/:id` como treinador para sessão de aluno seu. | Retorna `200`. |
| **Cenários tristes** |  |  |  |
| Tentativa de atualizar sessão `CONCLUIDA` | Deve rejeitar com `409`. | Finalizar sessão e tentar `PATCH /sessoes/:id`. | Retorna `409`; mensagem: "apenas sessões em andamento podem ser atualizadas". |
| Tentativa de atualizar sessão `CANCELADA` | Deve rejeitar com `409`. | Cancelar sessão e tentar `PATCH /sessoes/:id`. | Retorna `409`; mensagem: "apenas sessões em andamento podem ser atualizadas". |
| Aluno atualiza sessão de outro aluno | Deve rejeitar com `403`. | Fazer `PATCH /sessoes/:id` como aluno para sessão alheia. | Retorna `403`; mensagem: "você não tem permissão para atualizar esta sessão". |
| Treinador atualiza sessão de aluno não atribuído | Deve rejeitar com `403`. | Fazer `PATCH /sessoes/:id` como treinador para sessão de aluno que não é seu. | Retorna `403`; mensagem: "você não tem permissão para atualizar esta sessão". |
| Usuário autenticado sem perfil atualiza sessão | Deve rejeitar com `403`. | Fazer `PATCH /sessoes/:id` como usuário sem perfil aluno/treinador/admin. | Retorna `403`; mensagem de permissão negada para atualização. |
| `observacoes` excede 1000 caracteres | Deve rejeitar com `422`. | Fazer `PATCH /sessoes/:id` com `observacoes` de 1001+ caracteres. | Retorna `422`; mensagem: "Observações devem ter no máximo 1000 caracteres". |
| Body vazio | Deve rejeitar com `422`. | Fazer `PATCH /sessoes/:id` com body `{}`. | Retorna `422`; erro Zod indicando `observacoes` obrigatória. |
| Body com campo desconhecido (schema strict) | Deve rejeitar com `422`. | Fazer `PATCH /sessoes/:id` com `{ observacoes: "ok", foo: "bar" }`. | Retorna `422`; erro Zod de chave não reconhecida. |
| ID inexistente | Deve rejeitar com `404`. | Fazer `PATCH /sessoes/{uuid-inexistente}`. | Retorna `404`; mensagem: "Sessão não encontrada". |
| ID com formato inválido | Deve rejeitar com `422`. | Fazer `PATCH /sessoes/nao-e-uuid`. | Retorna `422`; mensagem: "ID inválido, deve ser um UUID válido". |
| Requisição sem header `Authorization` | Deve rejeitar com `401`. | Fazer `PATCH /sessoes/:id` sem autenticação. | Retorna `401`. |

---

## PATCH /sessoes/:id/exercicios/:exercicioId — Atualizar Exercício na Sessão

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** |  |  |  |
| Aluno marca exercício como concluído | Deve atualizar `concluido: true` e preencher `fim` automaticamente. | Fazer `PATCH /sessoes/:id/exercicios/:exercicioId` com `{ concluido: true }`. | Retorna `200`; exercício com `concluido: true` e `fim` preenchido com timestamp atual. |
| `fim` informado sem `inicio` preenchido — `inicio` é auto-preenchido | Quando `inicio` ainda é null e `fim` é definido, `inicio` deve ser igual ao `fim`. | Fazer `PATCH` com `{ concluido: true }` em exercício com `inicio: null`. | Retorna `200`; `inicio` e `fim` iguais ao timestamp definido. |
| Aluno atualiza observações do exercício | Deve atualizar campo `observacoes`. | Fazer `PATCH /sessoes/:id/exercicios/:exercicioId` com `{ concluido: false, observacoes: "Ajustei carga" }`. | Retorna `200`; `observacoes` alterada na resposta. |
| Admin atualiza exercício de qualquer sessão | Deve atualizar com `200`. | Fazer `PATCH` como admin para exercício de sessão de qualquer aluno. | Retorna `200`. |
| Treinador atualiza exercício de aluno atribuído | Deve atualizar com `200`. | Fazer `PATCH` como treinador para exercício de sessão de aluno seu. | Retorna `200`. |
| **Cenários tristes** |  |  |  |
| Treinador atualiza exercício de aluno não atribuído | Deve rejeitar com `403`. | Fazer `PATCH` como treinador para exercício de sessão de aluno fora da sua carteira. | Retorna `403`; mensagem: "você não tem permissão para atualizar esta sessão". |
| Sessão não está `EM_ANDAMENTO` | Deve rejeitar com `409`. | Finalizar/cancelar sessão e tentar atualizar exercício. | Retorna `409`; mensagem: "apenas sessões em andamento podem ser atualizadas". |
| `exercicioId` não pertence à sessão | Deve rejeitar com `404`. | Fazer `PATCH` com ID de exercício de outra sessão. | Retorna `404`; mensagem: "Exercício não encontrado nesta sessão". |
| Aluno atualiza exercício de sessão alheia | Deve rejeitar com `403`. | Fazer `PATCH` como aluno para exercício de sessão de outro aluno. | Retorna `403`; mensagem: "você não tem permissão para atualizar esta sessão". |
| Usuário autenticado sem perfil atualiza exercício da sessão | Deve rejeitar com `403`. | Fazer `PATCH` como usuário sem perfil aluno/treinador/admin. | Retorna `403`; mensagem de permissão negada para atualização da sessão. |
| `inicio` com formato ISO 8601 inválido | Deve rejeitar com `422`. | Fazer `PATCH` com `{ concluido: false, inicio: "amanha" }`. | Retorna `422`; mensagem: "inicio deve ser ISO 8601 válido". |
| `observacoes` excede 1000 caracteres | Deve rejeitar com `422`. | Fazer `PATCH` com `observacoes` de 1001+ caracteres. | Retorna `422`; mensagem: "Observações devem ter no máximo 1000 caracteres". |
| Body sem `concluido` | Deve rejeitar com `422`. | Fazer `PATCH` com apenas `{ observacoes: "teste" }`. | Retorna `422`; erro Zod indicando `concluido` obrigatório. |
| Body com campo desconhecido (schema strict) | Deve rejeitar com `422`. | Fazer `PATCH` com `{ concluido: true, foo: "bar" }`. | Retorna `422`; erro Zod de chave não reconhecida. |
| ID de sessão inexistente | Deve rejeitar com `404`. | Fazer `PATCH /sessoes/{uuid-inexistente}/exercicios/:exercicioId`. | Retorna `404`; mensagem: "Sessão não encontrada". |
| ID de sessão com formato inválido | Deve rejeitar com `422`. | Fazer `PATCH /sessoes/nao-e-uuid/exercicios/:exercicioId`. | Retorna `422`; mensagem: "ID inválido, deve ser um UUID válido". |
| `exercicioId` com formato inválido | Deve rejeitar com `422`. | Fazer `PATCH /sessoes/:id/exercicios/nao-e-uuid`. | Retorna `422`; mensagem: "ID do exercício inválido, deve ser um UUID válido". |
| Requisição sem header `Authorization` | Deve rejeitar com `401`. | Fazer `PATCH /sessoes/:id/exercicios/:exercicioId` sem autenticação. | Retorna `401`. |

---

## PUT /sessoes/:id/exercicios/:exercicioId/series — Substituir Séries do Exercício

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** |  |  |  |
| Aluno substitui todas as séries de um exercício | Deve deletar as antigas e inserir as novas com `200`. | Fazer `PUT .../series` com novo array de séries. | Retorna `200`; séries retornadas correspondem exatamente ao array enviado; séries antigas removidas. |
| Série com `status: 'CONCLUIDA'` registra dados de execução | Deve persistir `carga_utilizada`, `repeticoes_realizadas` e `observacoes`. | Fazer `PUT .../series` com série `{ status: "CONCLUIDA", carga_utilizada: "80.50", repeticoes_realizadas: 10 }`. | Retorna `200`; série com `carga_utilizada: "80.50"`, `repeticoes_realizadas: 10`. |
| Série com `status: 'PULADA'` | Deve criar série pulada sem obrigatoriedade de carga ou reps. | Fazer `PUT .../series` com `{ status: "PULADA" }`. | Retorna `200`; série com `status: 'PULADA'`, `carga_utilizada` e `repeticoes_realizadas` podem ser null. |
| `inicio` do exercício auto-preenchido se era null | Ao atualizar séries de exercício com `inicio` null, deve definir `inicio` como now(). | Fazer `PUT .../series` em exercício com `inicio: null`. | Retorna `200`; exercício pai tem `inicio` preenchido. |
| Admin substitui séries de qualquer sessão | Deve atualizar com `200`. | Fazer `PUT .../series` como admin para sessão de qualquer aluno. | Retorna `200`. |
| Treinador substitui séries de aluno atribuído | Deve atualizar com `200`. | Fazer `PUT .../series` como treinador para sessão de aluno seu. | Retorna `200`. |
| **Cenários tristes** |  |  |  |
| Treinador substitui séries de aluno não atribuído | Deve rejeitar com `403`. | Fazer `PUT .../series` como treinador para sessão de aluno que não pertence à sua carteira. | Retorna `403`; mensagem: "você não tem permissão para acessar esta sessão". |
| Sessão não está `EM_ANDAMENTO` | Deve rejeitar com `409`. | Finalizar sessão e tentar `PUT .../series`. | Retorna `409`; mensagem: "a sessão não está em andamento". |
| `exercicioId` não pertence à sessão | Deve rejeitar com `404`. | Fazer `PUT .../series` com ID de sessao_exercicio de outra sessão. | Retorna `404`; mensagem: "Exercício não encontrado nesta sessão". |
| ID de sessão inexistente | Deve rejeitar com `404`. | Fazer `PUT /sessoes/{uuid-inexistente}/exercicios/:id/series`. | Retorna `404`; mensagem: "Sessão não encontrada". |
| Aluno atualiza séries de sessão alheia | Deve rejeitar com `403`. | Fazer `PUT .../series` como aluno para sessão de outro aluno. | Retorna `403`; mensagem: "você não tem permissão para acessar esta sessão". |
| Usuário autenticado sem perfil atualiza séries | Deve rejeitar com `403`. | Fazer `PUT .../series` como usuário sem perfil aluno/treinador/admin. | Retorna `403`; mensagem de permissão negada para acesso à sessão. |
| Array `series` vazio | Deve rejeitar com `422`. | Fazer `PUT .../series` com `{ series: [] }`. | Retorna `422`; mensagem: "series deve conter ao menos uma série". |
| `numero_serie` duplicado no array | Deve rejeitar com `422`. | Enviar duas séries com o mesmo `numero_serie`. | Retorna `422`; mensagem: "numero_serie deve ser único dentro do array. Duplicados: N". |
| `repeticoes_realizadas` negativo | Deve rejeitar com `422`. | Enviar série com `repeticoes_realizadas: -1`. | Retorna `422`; mensagem: "repeticoes_realizadas deve ser um número inteiro positivo". |
| `carga_utilizada` com formato inválido | Deve rejeitar com `422`. | Enviar série com `carga_utilizada: "abc"`. | Retorna `422`; mensagem: "carga_utilizada deve ser um número decimal válido (ex: 80 ou 80.50)". |
| `status` fora do enum | Deve rejeitar com `422`. | Enviar série com `status: "PAUSADA"`. | Retorna `422`; mensagem: "status deve ser PENDENTE, CONCLUIDA ou PULADA". |
| `observacoes` excede 1000 caracteres | Deve rejeitar com `422`. | Enviar série com `observacoes` de 1001+ caracteres. | Retorna `422`; mensagem: "observacoes deve ter no máximo 1000 caracteres". |
| Body com campo desconhecido no root (schema strict) | Deve rejeitar com `422`. | Fazer `PUT .../series` com `{ series: [...], foo: "bar" }`. | Retorna `422`; erro Zod de chave não reconhecida. |
| Item de `series` com campo desconhecido (schema strict) | Deve rejeitar com `422`. | Enviar item de série com chave extra, ex.: `tempo_descanso`. | Retorna `422`; erro Zod de chave não reconhecida no item. |
| ID de sessão com formato inválido | Deve rejeitar com `422`. | Fazer `PUT /sessoes/nao-e-uuid/exercicios/:id/series`. | Retorna `422`; mensagem: "ID inválido, deve ser um UUID válido". |
| `exercicioId` com formato inválido | Deve rejeitar com `422`. | Fazer `PUT /sessoes/:id/exercicios/nao-e-uuid/series`. | Retorna `422`; mensagem: "ID do exercício inválido, deve ser um UUID válido". |
| Requisição sem header `Authorization` | Deve rejeitar com `401`. | Fazer `PUT .../series` sem autenticação. | Retorna `401`. |

---

## PATCH /sessoes/:id/exercicios/reordenar — Reordenar Exercícios

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** |  |  |  |
| Aluno reordena todos os exercícios da sessão | Deve atualizar a `ordem` de cada exercício e retornar `200`. | Fazer `PATCH /sessoes/:id/exercicios/reordenar` com array incluindo todos os exercícios em nova ordem. | Retorna `200`; exercícios retornados com `ordem` atualizada conforme enviado. |
| Admin reordena exercícios de qualquer sessão | Deve atualizar com `200`. | Fazer `PATCH .../reordenar` como admin para sessão de qualquer aluno. | Retorna `200`. |
| Treinador reordena exercícios de aluno atribuído | Deve atualizar com `200`. | Fazer `PATCH .../reordenar` como treinador para sessão de aluno seu. | Retorna `200`. |
| **Cenários tristes** |  |  |  |
| Treinador reordena exercícios de aluno não atribuído | Deve rejeitar com `403`. | Fazer `PATCH .../reordenar` como treinador para sessão de aluno que não pertence à sua carteira. | Retorna `403`; mensagem: "você não tem permissão para acessar esta sessão". |
| Sessão não está `EM_ANDAMENTO` | Deve rejeitar com `409`. | Finalizar sessão e tentar `PATCH .../reordenar`. | Retorna `409`; mensagem: "apenas sessões em andamento podem ter exercícios reordenados". |
| Array não inclui todos os exercícios da sessão | Deve rejeitar com `422`. | Enviar array com N-1 exercícios para sessão com N exercícios. | Retorna `422`; mensagem: "a reordenação deve incluir todos os N exercício(s) da sessão. Foram enviados M." |
| Array contém ID de exercício de outra sessão | Deve rejeitar com `422`. | Enviar array com um ID válido mas de outra sessão. | Retorna `422`; mensagem: "exercício(s) não pertencem a esta sessão: [ids]". |
| `ordem` duplicada no array | Deve rejeitar com `422`. | Enviar dois exercícios com o mesmo valor de `ordem`. | Retorna `422`; mensagem: "ordem deve ser única. Duplicados: N". |
| `sessao_exercicio_id` duplicado no array | Deve rejeitar com `422`. | Enviar dois itens com o mesmo `sessao_exercicio_id` e ordens diferentes. | Retorna `422`; mensagem de regra de negócio indicando IDs duplicados na reordenação. |
| `ordem` igual a zero ou negativo | Deve rejeitar com `422`. | Enviar exercício com `ordem: 0`. | Retorna `422`; mensagem: "ordem deve ser maior que 0". |
| `sessao_exercicio_id` com UUID inválido | Deve rejeitar com `422`. | Enviar item com `sessao_exercicio_id: "nao-e-uuid"`. | Retorna `422`; mensagem: "sessao_exercicio_id deve ser UUID válido". |
| Array `exercicios` vazio | Deve rejeitar com `422`. | Fazer `PATCH .../reordenar` com `{ exercicios: [] }`. | Retorna `422`; mensagem: "exercicios deve conter ao menos um item". |
| Aluno reordena exercícios de sessão alheia | Deve rejeitar com `403`. | Fazer `PATCH .../reordenar` como aluno para sessão de outro aluno. | Retorna `403`; mensagem: "você não tem permissão para acessar esta sessão". |
| Usuário autenticado sem perfil reordena exercícios | Deve rejeitar com `403`. | Fazer `PATCH .../reordenar` como usuário sem perfil aluno/treinador/admin. | Retorna `403`; mensagem de permissão negada para acesso à sessão. |
| Body com campo desconhecido no root (schema strict) | Deve rejeitar com `422`. | Fazer `PATCH .../reordenar` com `{ exercicios: [...], foo: "bar" }`. | Retorna `422`; erro Zod de chave não reconhecida. |
| Item de `exercicios` com campo desconhecido (schema strict) | Deve rejeitar com `422`. | Enviar item com chave extra, ex.: `nome`. | Retorna `422`; erro Zod de chave não reconhecida no item. |
| ID de sessão inexistente | Deve rejeitar com `404`. | Fazer `PATCH /sessoes/{uuid-inexistente}/exercicios/reordenar`. | Retorna `404`; mensagem: "Sessão não encontrada". |
| ID de sessão com formato inválido | Deve rejeitar com `422`. | Fazer `PATCH /sessoes/nao-e-uuid/exercicios/reordenar`. | Retorna `422`; mensagem: "ID inválido, deve ser um UUID válido". |
| Requisição sem header `Authorization` | Deve rejeitar com `401`. | Fazer `PATCH .../reordenar` sem autenticação. | Retorna `401`. |

---

## POST /sessoes/:id/finalizar — Finalizar Sessão

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** |  |  |  |
| Aluno finaliza sessão em andamento | Deve alterar `status` para `CONCLUIDA`, preencher `fim` e retornar resumo com `200`. | Fazer `POST /sessoes/:id/finalizar` como aluno dono da sessão. | Retorna `200`; `status: 'CONCLUIDA'`, `fim` preenchido com timestamp, resposta contém objeto `resumo` com métricas. |
| Resumo retornado na finalização | Deve incluir métricas calculadas no momento da conclusão. | Finalizar sessão com exercícios e séries parcialmente concluídos. | Retorna `200`; `resumo` contém `duracao_minutos`, `exercicios_concluidos`, `exercicios_total`, `series_concluidas`, `series_total`, `volume_total_kg`, `taxa_conclusao`. |
| Admin finaliza qualquer sessão | Deve finalizar com `200`. | Fazer `POST /sessoes/:id/finalizar` como admin para sessão de qualquer aluno. | Retorna `200`. |
| Treinador finaliza sessão de aluno atribuído | Deve finalizar com `200`. | Fazer `POST /sessoes/:id/finalizar` como treinador para sessão de aluno seu. | Retorna `200`. |
| **Cenários tristes** |  |  |  |
| Treinador finaliza sessão de aluno não atribuído | Deve rejeitar com `403`. | Fazer `POST /sessoes/:id/finalizar` como treinador para sessão de aluno fora da sua carteira. | Retorna `403`; mensagem: "você não tem permissão para acessar esta sessão". |
| Tentativa de finalizar sessão já `CONCLUIDA` | Deve rejeitar com `409`. | Finalizar sessão, depois tentar finalizar novamente. | Retorna `409`; mensagem: "a sessão já foi finalizada ou cancelada". |
| Tentativa de finalizar sessão já `CANCELADA` | Deve rejeitar com `409`. | Cancelar sessão, depois tentar finalizar. | Retorna `409`; mensagem: "a sessão já foi finalizada ou cancelada". |
| Aluno finaliza sessão de outro aluno | Deve rejeitar com `403`. | Fazer `POST /sessoes/:id/finalizar` como aluno para sessão alheia. | Retorna `403`. |
| Usuário autenticado sem perfil finaliza sessão | Deve rejeitar com `403`. | Fazer `POST /sessoes/:id/finalizar` como usuário sem perfil aluno/treinador/admin. | Retorna `403`; mensagem de permissão negada para acesso à sessão. |
| ID inexistente | Deve rejeitar com `404`. | Fazer `POST /sessoes/{uuid-inexistente}/finalizar`. | Retorna `404`; mensagem: "Sessão não encontrada". |
| ID com formato inválido | Deve rejeitar com `422`. | Fazer `POST /sessoes/nao-e-uuid/finalizar`. | Retorna `422`; mensagem: "ID inválido, deve ser um UUID válido". |
| Requisição sem header `Authorization` | Deve rejeitar com `401`. | Fazer `POST /sessoes/:id/finalizar` sem autenticação. | Retorna `401`. |

---

## POST /sessoes/:id/cancelar — Cancelar Sessão

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** |  |  |  |
| Aluno cancela sessão em andamento | Deve alterar `status` para `CANCELADA`, preencher `fim` e retornar `200`. | Fazer `POST /sessoes/:id/cancelar` como aluno dono da sessão. | Retorna `200`; `status: 'CANCELADA'`, `fim` preenchido com timestamp. |
| Admin cancela qualquer sessão | Deve cancelar com `200`. | Fazer `POST /sessoes/:id/cancelar` como admin para sessão de qualquer aluno. | Retorna `200`. |
| Treinador cancela sessão de aluno atribuído | Deve cancelar com `200`. | Fazer `POST /sessoes/:id/cancelar` como treinador para sessão de aluno seu. | Retorna `200`. |
| Aluno pode iniciar nova sessão após cancelar a anterior | Deve permitir nova sessão após cancelamento. | Cancelar sessão, depois fazer `POST /sessoes` novamente. | Retorna `201`; nova sessão criada com `status: 'EM_ANDAMENTO'`. |
| **Cenários tristes** |  |  |  |
| Treinador cancela sessão de aluno não atribuído | Deve rejeitar com `403`. | Fazer `POST /sessoes/:id/cancelar` como treinador para sessão de aluno fora da sua carteira. | Retorna `403`; mensagem: "você não tem permissão para acessar esta sessão". |
| Tentativa de cancelar sessão já `CONCLUIDA` | Deve rejeitar com `409`. | Finalizar sessão, depois tentar cancelar. | Retorna `409`; mensagem: "a sessão já foi finalizada ou cancelada". |
| Tentativa de cancelar sessão já `CANCELADA` | Deve rejeitar com `409`. | Cancelar sessão, depois tentar cancelar novamente. | Retorna `409`; mensagem: "a sessão já foi finalizada ou cancelada". |
| Aluno cancela sessão de outro aluno | Deve rejeitar com `403`. | Fazer `POST /sessoes/:id/cancelar` como aluno para sessão alheia. | Retorna `403`. |
| Usuário autenticado sem perfil cancela sessão | Deve rejeitar com `403`. | Fazer `POST /sessoes/:id/cancelar` como usuário sem perfil aluno/treinador/admin. | Retorna `403`; mensagem de permissão negada para acesso à sessão. |
| ID inexistente | Deve rejeitar com `404`. | Fazer `POST /sessoes/{uuid-inexistente}/cancelar`. | Retorna `404`; mensagem: "Sessão não encontrada". |
| ID com formato inválido | Deve rejeitar com `422`. | Fazer `POST /sessoes/nao-e-uuid/cancelar`. | Retorna `422`; mensagem: "ID inválido, deve ser um UUID válido". |
| Requisição sem header `Authorization` | Deve rejeitar com `401`. | Fazer `POST /sessoes/:id/cancelar` sem autenticação. | Retorna `401`. |
