# Suite de Testes E2E — Treinos (`/treinos`)

> Testes E2E com Jest + Supertest contra banco real, validando toda a regra de negócio das rotas de treinos.

> **Arquivo:** `src/tests/routes/treinoRoutes.test.ts`

---

## POST /treinos — Criação de Treino

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** |  |  |  |
| Aluno cria treino para si mesmo (sem `aluno_id`) | Deve criar treino com `usuario_id` do aluno autenticado e retornar `201`. | Fazer `POST /treinos` como aluno com `{ nome: "Treino A" }` sem `aluno_id`. | Retorna `201`; `usuario_id` igual ao ID do aluno autenticado. |
| Aluno cria treino informando o próprio `aluno_id` | Deve criar treino com `201`. | Fazer `POST /treinos` como aluno com `aluno_id` igual ao próprio ID. | Retorna `201`; `usuario_id` igual ao informado. |
| Treinador cria treino para aluno atribuído | Deve criar treino com `201` e `treinador_id` auto-preenchido. | Fazer `POST /treinos` como treinador com `aluno_id` de aluno existente. | Retorna `201`; `treinador_id` preenchido com o ID do treinador autenticado. |
| Admin cria treino para qualquer aluno | Deve criar treino com `201`. | Fazer `POST /treinos` como admin com qualquer `aluno_id`. | Retorna `201`; treino com `usuario_id` do aluno informado. |
| Treino criado com exercícios na composição inicial | Deve criar treino com exercícios vinculados e retornar `201`. | Fazer `POST /treinos` com array `exercicios` contendo 2 itens. | Retorna `201`; resposta contém `exercicios` com 2 itens, cada um com `series`, `repeticoes`, `tempo_descanso_segundos`, `ordem_execucao` e dados do exercício. |
| Treino criado sem exercícios | Deve criar treino vazio com `201`. | Fazer `POST /treinos` sem campo `exercicios`. | Retorna `201`; `exercicios` é array vazio. |
| Treino criado com `dias_semana` | Deve persistir os dias da semana informados. | Fazer `POST /treinos` com `dias_semana: ["SEGUNDA", "QUINTA"]`. | Retorna `201`; `dias_semana` com os valores informados. |
| Treino criado com exercício global | Qualquer usuário pode usar exercícios globais. | Fazer `POST /treinos` como aluno com exercício global (sem `aluno_id` no exercício). | Retorna `201`; exercício vinculado ao treino. |
| Treino criado com exercício pessoal do próprio aluno | Aluno pode usar seus próprios exercícios pessoais. | Fazer `POST /treinos` como aluno com exercício pessoal próprio. | Retorna `201`; exercício vinculado. |
| Treinador cria treino com exercício pessoal do aluno | Deve vincular o exercício pessoal do aluno com `201`. | Fazer `POST /treinos` como treinador com exercício pessoal do aluno informado. | Retorna `201`. |
| Usuário com perfil híbrido (aluno + treinador) cria treino sem `aluno_id` | Deve assumir o próprio `aluno_id` e preencher `treinador_id` com o treinador autenticado. | Fazer `POST /treinos` com usuário que tenha ambos perfis, enviando apenas `{ nome }`. | Retorna `201`; `usuario_id` do próprio aluno e `treinador_id` do autenticado. |
| Treino criado com `carga_sugerida: null` | Deve aceitar carga nula na composição inicial. | Fazer `POST /treinos` com `exercicios` contendo item com `carga_sugerida: null`. | Retorna `201`; item criado com `carga_sugerida` nula. |
| **Cenários tristes** |  |  |  |
| Aluno tenta criar treino para outro aluno | Deve rejeitar com `403`. | Fazer `POST /treinos` como aluno com `aluno_id` de outro aluno. | Retorna `403`; mensagem: "aluno só pode criar treino para si mesmo". |
| Usuário sem perfil tenta criar treino | Deve rejeitar com `403`. | Fazer `POST /treinos` como usuário sem perfil aluno/treinador/admin. | Retorna `403`; mensagem: "usuário sem perfil para criar treinos". |
| Treinador sem `aluno_id` e sem perfil de aluno | Deve rejeitar com `422`. | Fazer `POST /treinos` como treinador puro sem `aluno_id`. | Retorna `422`; mensagem: "aluno_id é obrigatório para este perfil". |
| `aluno_id` de aluno inexistente | Deve rejeitar com `404`. | Fazer `POST /treinos` com UUID válido mas inexistente em `aluno_id`. | Retorna `404`; mensagem: "Aluno não encontrado". |
| Exercício inexistente na composição | Deve rejeitar com `422`. | Fazer `POST /treinos` com `exercicio_id` UUID válido mas inexistente. | Retorna `422`; mensagem: "um ou mais exercícios informados não existem". |
| Exercício soft-deleted na composição | Deve rejeitar com `422`. | Fazer `POST /treinos` com exercício desativado. | Retorna `422`; mensagem: "não é permitido adicionar exercício inativo ao treino". |
| Exercício pessoal de outro aluno | Deve rejeitar com `403`. | Fazer `POST /treinos` como aluno com exercício pessoal de outro aluno. | Retorna `403`; mensagem: "você não tem permissão para usar um ou mais exercícios informados". |
| Treinador tenta usar exercício pessoal de aluno diferente do dono do treino | Deve rejeitar com `403`. | Fazer `POST /treinos` como treinador para aluno A, incluindo exercício pessoal do aluno B. | Retorna `403`; mensagem: "você não tem permissão para usar um ou mais exercícios informados". |
| `ordem_execucao` duplicada na composição inicial | Deve rejeitar com `422`. | Enviar dois exercícios com mesmo `ordem_execucao`. | Retorna `422`; mensagem: "Não é permitido repetir ordem_execucao na composição do treino". |
| `exercicio_id` duplicado na composição inicial | Deve rejeitar com `422`. | Enviar dois exercícios com mesmo `exercicio_id`. | Retorna `422`; mensagem: "Não é permitido repetir exercicio_id na composição inicial do treino". |
| `nome` ausente | Deve rejeitar com `422`. | Fazer `POST /treinos` sem campo `nome`. | Retorna `422`; mensagem: "O nome do treino é obrigatório". |
| `nome` excede 255 caracteres | Deve rejeitar com `422`. | Fazer `POST /treinos` com `nome` de 256+ caracteres. | Retorna `422`; mensagem: "O nome do treino deve ter no máximo 255 caracteres". |
| `descricao` excede 1000 caracteres | Deve rejeitar com `422`. | Fazer `POST /treinos` com `descricao` de 1001+ caracteres. | Retorna `422`; mensagem: "A descrição deve ter no máximo 1000 caracteres". |
| `series` fora do intervalo (0 ou >20) | Deve rejeitar com `422`. | Enviar exercício com `series: 0` ou `series: 21`. | Retorna `422`; mensagem: "series deve ser maior que 0" ou "series deve ser no máximo 20". |
| `tempo_descanso_segundos` negativo ou acima de 3600 | Deve rejeitar com `422`. | Enviar exercício com `tempo_descanso_segundos: -1` ou `3601`. | Retorna `422`; mensagem: "tempo_descanso_segundos não pode ser negativo" ou "deve ser no máximo 3600". |
| `carga_sugerida` negativa | Deve rejeitar com `422`. | Enviar exercício com `carga_sugerida: -5`. | Retorna `422`; mensagem: "carga_sugerida deve ser positiva". |
| Body com campo desconhecido (schema strict) | Deve rejeitar com `422`. | Fazer `POST /treinos` com campo extra, ex.: `{ nome, foo: "bar" }`. | Retorna `422`; erro Zod de chave não reconhecida. |
| Item de `exercicios` com campo desconhecido (schema strict) | Deve rejeitar com `422`. | Enviar item de `exercicios` com chave extra, ex.: `observacao`. | Retorna `422`; erro Zod de chave não reconhecida no item. |
| Requisição sem header `Authorization` | Deve rejeitar com `401`. | Fazer `POST /treinos` sem autenticação. | Retorna `401`. |

---

## GET /treinos — Listagem de Treinos

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** |  |  |  |
| Aluno lista apenas os próprios treinos | Deve retornar somente treinos do aluno autenticado com `200`. | Fazer `GET /treinos` como aluno. | Retorna `200`; resposta com `dados`, `total`, `page`, `limite`, `totalPages`; todos os treinos têm `usuario_id` do aluno. |
| Treinador lista apenas os treinos que criou | Deve retornar somente treinos onde `treinador_id` é o do treinador autenticado. | Fazer `GET /treinos` como treinador. | Retorna `200`; todos os treinos têm `treinador_id` do treinador. |
| Admin lista todos os treinos | Deve retornar treinos de todos os alunos com `200`. | Fazer `GET /treinos` como admin. | Retorna `200`; treinos de múltiplos alunos. |
| Filtro por `nome` (busca parcial case-insensitive) | Deve retornar treinos cujo nome contém o termo. | Fazer `GET /treinos?nome=peito` com treino "Treino de Peito" no banco. | Retorna `200`; apenas treinos cujo nome contém "peito", independente de case. |
| Filtro por `usuario_id` (admin) | Deve retornar treinos do aluno informado. | Fazer `GET /treinos?usuario_id={ID_ALUNO}` como admin. | Retorna `200`; todos os treinos pertencem ao aluno do filtro. |
| Filtro por `treinador_id` (admin) | Deve retornar treinos vinculados ao treinador informado. | Fazer `GET /treinos?treinador_id={ID_TREINADOR}` como admin. | Retorna `200`; todos os treinos têm `treinador_id` do filtro. |
| Filtro por `dias_semana` | Deve retornar treinos com ao menos um dos dias informados. | Fazer `GET /treinos?dias_semana=SEGUNDA,QUARTA`. | Retorna `200`; cada treino retornado tem SEGUNDA ou QUARTA (ou ambos) em `dias_semana`. |
| `incluir_exercicios=true` | Deve retornar treinos com array de exercícios populado. | Fazer `GET /treinos?incluir_exercicios=true`. | Retorna `200`; cada treino contém `exercicios` com dados detalhados. |
| `somente_com_exercicios=true` | Deve retornar apenas treinos que têm ao menos um exercício. | Fazer `GET /treinos?somente_com_exercicios=true` com treinos vazios e não-vazios. | Retorna `200`; nenhum treino retornado tem `exercicios` vazio. |
| Filtro de exercício na listagem autoativa composição (`nome_exercicio`/`grupo_muscular`/`tipo_ativacao`) | Deve aplicar filtro por exercício e retornar treinos já com `exercicios` populados, mesmo sem enviar `incluir_exercicios` e `somente_com_exercicios`. | Fazer `GET /treinos?nome_exercicio=supino` (ou `grupo_muscular=PEITO` / `tipo_ativacao=PRIMARIO`) sem flags adicionais. | Retorna `200`; resposta contém apenas treinos com exercícios compatíveis com o filtro e cada item já traz o array `exercicios` preenchido. |
| Aluno lista com `incluir_inativos=true` no próprio escopo | Deve incluir treinos soft-deleted do próprio aluno. | Soft-deletar treino do aluno, depois fazer `GET /treinos?incluir_inativos=true` como o mesmo aluno. | Retorna `200`; resultado inclui treinos do próprio aluno com `deletado_em` preenchido. |
| Treinador lista com `incluir_inativos=true` no próprio escopo | Deve incluir treinos soft-deleted onde ele é o treinador. | Soft-deletar treino do treinador, depois fazer `GET /treinos?incluir_inativos=true` como o mesmo treinador. | Retorna `200`; resultado inclui treinos com `treinador_id` do autenticado, incluindo `deletado_em` preenchido. |
| Admin lista com `incluir_inativos=true` | Deve incluir treinos soft-deleted de qualquer aluno. | Soft-deletar treino, depois fazer `GET /treinos?incluir_inativos=true` como admin. | Retorna `200`; treinos com `deletado_em` preenchido aparecem no resultado. |
| Ordenação por `ordem_data_criacao=asc` | Deve retornar treinos mais antigos primeiro. | Criar 3 treinos em momentos distintos e fazer `GET /treinos?ordem_data_criacao=asc`. | Retorna `200`; treino mais antigo aparece primeiro. |
| Ordenação por `ordem_treino=asc` | Deve ordenar pelo campo `ordem` dos treinos. | Criar treinos com `ordem: 3`, `ordem: 1`, `ordem: 2`. | Retorna `200`; treinos ordenados por `ordem` crescente (1, 2, 3). |
| Precedência de ordenação: `ordem_treino` sobre `ordem_data_criacao` | Quando ambos forem informados, deve prevalecer `ordem_treino`. | Fazer `GET /treinos?ordem_treino=asc&ordem_data_criacao=desc` com dados conflitantes. | Retorna `200`; ordenação segue `ordem` (não `data_criacao`). |
| Paginação: `page=2&limite=2` | Deve retornar segunda página com metadados corretos. | Criar 5 treinos e fazer `GET /treinos?page=2&limite=2`. | Retorna `200`; `page: 2`, `limite: 2`, `totalPages: 3`. |
| Paginação com valor alfanumérico (comportamento atual do parser) | Deve converter prefixo numérico com `parseInt` e responder normalmente. | Fazer `GET /treinos?page=2abc&limite=2xyz`. | Retorna `200`; `page: 2` e `limite: 2` no payload. |
| **Cenários tristes** |  |  |  |
| Treinador filtra por `treinador_id` diferente do próprio | Deve rejeitar com `403`. | Fazer `GET /treinos?treinador_id={OUTRO_TREINADOR}` como treinador autenticado. | Retorna `403`; mensagem: "treinador só pode listar os próprios treinos". |
| Treinador tenta filtrar por `usuario_id` alheio | Deve rejeitar com `403`. | Fazer `GET /treinos?usuario_id={ALUNO_ALHEIO}` como treinador. | Retorna `403`; mensagem: "treinador só pode listar os próprios treinos". |
| Aluno tenta filtrar por `usuario_id` alheio | Deve rejeitar com `403`. | Fazer `GET /treinos?usuario_id={OUTRO_ALUNO}` como aluno. | Retorna `403`; mensagem: "aluno só pode listar os próprios treinos". |
| Usuário sem perfil | Deve rejeitar com `403`. | Fazer `GET /treinos` como usuário sem perfil. | Retorna `403`; mensagem: "usuário sem perfil para acessar treinos". |
| `page` inválido | Deve rejeitar com `422`. | Fazer `GET /treinos?page=0`. | Retorna `422`; mensagem de validação Zod. |
| `limite` acima de 100 | Deve rejeitar com `422`. | Fazer `GET /treinos?limite=101`. | Retorna `422`; mensagem de validação Zod. |
| `ordem_treino` inválido | Deve rejeitar com `422`. | Fazer `GET /treinos?ordem_treino=up`. | Retorna `422`; erro Zod para enum inválido. |
| `grupo_muscular` inválido | Deve rejeitar com `422`. | Fazer `GET /treinos?grupo_muscular=PESCOCO`. | Retorna `422`; erro Zod para enum inválido. |
| Query com parâmetro desconhecido (schema strict) | Deve rejeitar com `422`. | Fazer `GET /treinos?dia_semana=SEGUNDA` (chave incorreta). | Retorna `422`; erro Zod de chave não reconhecida. |
| Requisição sem header `Authorization` | Deve rejeitar com `401`. | Fazer `GET /treinos` sem autenticação. | Retorna `401`. |

---

## GET /treinos/:id — Detalhe do Treino

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** |  |  |  |
| Aluno consulta próprio treino | Deve retornar treino com exercícios com `200`. | Fazer `GET /treinos/:id` como aluno dono do treino. | Retorna `200`; treino com `id`, `nome`, `usuario_id`, `exercicios`. |
| Treinador consulta treino que criou | Deve retornar treino com `200`. | Fazer `GET /treinos/:id` como treinador para treino com seu `treinador_id`. | Retorna `200`. |
| Admin consulta qualquer treino | Deve retornar treino com `200`. | Fazer `GET /treinos/:id` como admin para treino de qualquer aluno. | Retorna `200`. |
| `incluir_musculos=true` | Deve retornar exercícios com músculos populados. | Fazer `GET /treinos/:id?incluir_musculos=true`. | Retorna `200`; cada exercício contém `musculos` com `musculo_id`, `nome`, `grupo_muscular`, `tipo_ativacao`. |
| `incluir_aparelhos=true` | Deve retornar exercícios com aparelhos populados. | Fazer `GET /treinos/:id?incluir_aparelhos=true`. | Retorna `200`; cada exercício contém `aparelhos`. |
| `apenas_ativos=false` | Deve incluir exercícios soft-deleted no treino. | Desativar exercício, depois fazer `GET /treinos/:id?apenas_ativos=false`. | Retorna `200`; exercício desativado aparece na lista. |
| `incluir_treino_inativo=true` | Deve retornar treino soft-deleted. | Soft-deletar treino, depois fazer `GET /treinos/:id?incluir_treino_inativo=true`. | Retorna `200`; treino com `deletado_em` preenchido retornado. |
| Filtro por `nome_exercicio` | Deve retornar apenas exercícios cujo nome contém o termo. | Fazer `GET /treinos/:id?nome_exercicio=supino`. | Retorna `200`; apenas exercícios com "supino" no nome. |
| `ordem_execucao=desc` | Deve retornar exercícios em ordem decrescente. | Fazer `GET /treinos/:id?ordem_execucao=desc`. | Retorna `200`; exercícios ordenados por `ordem_execucao` decrescente. |
| **Cenários tristes** |  |  |  |
| Aluno consulta treino de outro aluno | Deve rejeitar com `403`. | Fazer `GET /treinos/:id` como aluno para treino de outro aluno. | Retorna `403`; mensagem: "você não tem permissão para visualizar este treino". |
| Treinador consulta treino sem ser seu treinador | Deve rejeitar com `403`. | Fazer `GET /treinos/:id` como treinador para treino onde não é o `treinador_id`. | Retorna `403`; mensagem: "você não tem permissão para visualizar este treino". |
| Usuário sem perfil | Deve rejeitar com `403`. | Fazer `GET /treinos/:id` como usuário sem perfil. | Retorna `403`; mensagem: "usuário sem perfil para acessar treinos". |
| ID inexistente (UUID válido) | Deve rejeitar com `404`. | Fazer `GET /treinos/{uuid-valido-inexistente}`. | Retorna `404`; mensagem: "Treino não encontrado". |
| Treino soft-deleted sem `incluir_treino_inativo=true` | Deve rejeitar com `404`. | Soft-deletar treino e consultar `GET /treinos/:id` sem query extra. | Retorna `404`; mensagem: "Treino não encontrado". |
| ID com formato inválido | Deve rejeitar com `422`. | Fazer `GET /treinos/nao-e-uuid`. | Retorna `422`; erro Zod de validação. |
| `ordem_execucao` inválido na query | Deve rejeitar com `422`. | Fazer `GET /treinos/:id?ordem_execucao=up`. | Retorna `422`; erro Zod para enum inválido. |
| Query com parâmetro desconhecido (schema strict) | Deve rejeitar com `422`. | Fazer `GET /treinos/:id?foo=bar`. | Retorna `422`; erro Zod de chave não reconhecida. |
| Requisição sem header `Authorization` | Deve rejeitar com `401`. | Fazer `GET /treinos/:id` sem autenticação. | Retorna `401`. |

---

## PATCH /treinos/:id — Atualização de Treino

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** |  |  |  |
| Aluno atualiza nome do próprio treino | Deve atualizar e retornar treino com `200`. | Fazer `PATCH /treinos/:id` como aluno com `{ nome: "Novo Nome" }`. | Retorna `200`; `nome` alterado na resposta. |
| Aluno atualiza `dias_semana` | Deve persistir os novos dias. | Fazer `PATCH /treinos/:id` com `{ dias_semana: ["TERCA", "SEXTA"] }`. | Retorna `200`; `dias_semana` atualizado. |
| Aluno remove `dias_semana` com `null` | Deve limpar o campo. | Fazer `PATCH /treinos/:id` com `{ dias_semana: null }`. | Retorna `200`; `dias_semana: null`. |
| Treinador atualiza treino que criou | Deve atualizar com `200`. | Fazer `PATCH /treinos/:id` como treinador para treino com seu `treinador_id`. | Retorna `200`. |
| Admin atualiza qualquer treino | Deve atualizar com `200`. | Fazer `PATCH /treinos/:id` como admin. | Retorna `200`. |
| Adicionar exercício ao treino (`adicionar_exercicios`) | Deve inserir novo exercício no treino com `ordem_execucao` informado. | Fazer `PATCH /treinos/:id` com `adicionar_exercicios: [{ exercicio_id, series, ... }]`. | Retorna `200`; treino retornado contém o novo exercício. |
| Atualizar exercício existente no treino (`atualizar_exercicios`) | Deve atualizar campos do exercício informado. | Fazer `PATCH /treinos/:id` com `atualizar_exercicios: [{ id, series: 5 }]`. | Retorna `200`; exercício com `series` atualizado. |
| Remover exercício por `treino_exercicio.id` | Deve remover o vínculo específico. | Fazer `PATCH /treinos/:id` com `remover_exercicios_ids: [{treino_exercicio_id}]`. | Retorna `200`; exercício não aparece mais na lista. |
| Remover todos os vínculos de um exercício por `exercicio.id` | Deve remover todos os vínculos daquele exercício neste treino. | Adicionar mesmo exercício com 2 `ordem_execucao` distintas, depois remover pelo `exercicio.id`. | Retorna `200`; ambos os vínculos removidos. |
| Vincular treinador ao treino (`treinador_id`) | Deve atualizar `treinador_id` do treino. | Fazer `PATCH /treinos/:id` com `{ treinador_id: "UUID_TREINADOR" }`. | Retorna `200`; `treinador_id` atualizado. |
| Desvincular treinador (`treinador_id: null`) | Deve limpar `treinador_id`. | Fazer `PATCH /treinos/:id` com `{ treinador_id: null }`. | Retorna `200`; `treinador_id: null`. |
| Atualizar `carga_sugerida` para `null` em item existente | Deve permitir limpar a carga sugerida do vínculo treino-exercício. | Fazer `PATCH` com `atualizar_exercicios: [{ id, carga_sugerida: null }]`. | Retorna `200`; item com `carga_sugerida: null`. |
| PATCH combinado (remover + atualizar + adicionar) sem conflitos | Deve aplicar todas as alterações em uma única requisição. | Fazer `PATCH` com os três blocos (`remover_exercicios_ids`, `atualizar_exercicios`, `adicionar_exercicios`) válidos. | Retorna `200`; resposta reflete remoção, atualização e adição corretamente. |
| **Cenários tristes** |  |  |  |
| `ordem_execucao` de novo exercício conflita com existente | Deve rejeitar com `422`. | Fazer `PATCH` com `adicionar_exercicios` usando `ordem_execucao` já existente no treino. | Retorna `422`; mensagem: "ordem_execucao já utilizada por outro item do treino". |
| `ordem_execucao` de atualização conflita com exercício mantido | Deve rejeitar com `422`. | Fazer `PATCH` com `atualizar_exercicios` usando `ordem_execucao` de outro exercício não removido. | Retorna `422`; mensagem: "ordem_execucao conflita com outro item do treino". |
| `id` duplicado em `atualizar_exercicios` | Deve rejeitar com `422`. | Enviar dois itens com o mesmo `id` em `atualizar_exercicios`. | Retorna `422`; mensagem: "Não é permitido repetir id em atualizar_exercicios". |
| `ordem_execucao` duplicada em `atualizar_exercicios` | Deve rejeitar com `422`. | Enviar dois itens distintos em `atualizar_exercicios` com o mesmo `ordem_execucao`. | Retorna `422`; mensagem: "Não é permitido repetir ordem_execucao em atualizar_exercicios". |
| Item de `remover_exercicios_ids` não pertence ao treino | Deve rejeitar com `422`. | Enviar UUID válido mas que não é deste treino em `remover_exercicios_ids`. | Retorna `422`; mensagem: "um ou mais itens informados para remoção não pertencem a este treino". |
| IDs duplicados em `remover_exercicios_ids` | Deve rejeitar com `422`. | Enviar o mesmo UUID duas vezes em `remover_exercicios_ids`. | Retorna `422`; mensagem: "Não é permitido repetir IDs em remover_exercicios_ids". |
| Item de `atualizar_exercicios` não pertence ao treino | Deve rejeitar com `422`. | Enviar `{ id: UUID_OUTRO_TREINO, series: 5 }` em `atualizar_exercicios`. | Retorna `422`; mensagem: "um ou mais itens de atualizar_exercicios não pertencem a este treino ou estão sendo removidos". |
| `treinador_id` inexistente | Deve rejeitar com `422`. | Fazer `PATCH` com `{ treinador_id: "UUID_INEXISTENTE" }`. | Retorna `422`; mensagem: "treinador não encontrado". |
| Exercício adicionado inexistente | Deve rejeitar com `422`. | Adicionar exercício com UUID inexistente em `adicionar_exercicios`. | Retorna `422`; mensagem: "um ou mais exercícios informados não existem". |
| Exercício inativo em `adicionar_exercicios` | Deve rejeitar com `422`. | Adicionar exercício soft-deleted. | Retorna `422`; mensagem: "não é permitido adicionar exercício inativo ao treino". |
| Body vazio (nenhum campo) | Deve rejeitar com `422`. | Fazer `PATCH /treinos/:id` com body `{}`. | Retorna `422`; mensagem: "Informe ao menos uma alteração: nome, descricao, treinador_id, dias_semana, ordem, adicionar_exercicios, atualizar_exercicios ou remover_exercicios_ids". |
| `adicionar_exercicios` array vazio | Deve rejeitar com `422`. | Fazer `PATCH` com `{ adicionar_exercicios: [] }`. | Retorna `422`; mensagem: "adicionar_exercicios deve conter ao menos 1 item". |
| `atualizar_exercicios` array vazio | Deve rejeitar com `422`. | Fazer `PATCH` com `{ atualizar_exercicios: [] }`. | Retorna `422`; mensagem: "atualizar_exercicios deve conter ao menos 1 item". |
| `remover_exercicios_ids` array vazio | Deve rejeitar com `422`. | Fazer `PATCH` com `{ remover_exercicios_ids: [] }`. | Retorna `422`; mensagem: "remover_exercicios_ids deve conter ao menos 1 item". |
| `atualizar_exercicios` item sem nenhum campo além do `id` | Deve rejeitar com `422`. | Enviar `{ id: UUID }` sem campos adicionais em `atualizar_exercicios`. | Retorna `422`; mensagem: "Informe ao menos um campo para atualizar além do id". |
| `ordem_execucao` duplicada em `adicionar_exercicios` | Deve rejeitar com `422`. | Enviar dois exercícios com mesmo `ordem_execucao` em `adicionar_exercicios`. | Retorna `422`; mensagem: "Não é permitido repetir ordem_execucao em adicionar_exercicios". |
| `exercicio_id` duplicado em `adicionar_exercicios` | Deve rejeitar com `422`. | Enviar duas entradas com mesmo `exercicio_id` em `adicionar_exercicios`. | Retorna `422`; mensagem: "Não é permitido repetir exercicio_id em adicionar_exercicios". |
| Body com campo desconhecido (schema strict) | Deve rejeitar com `422`. | Fazer `PATCH` com chave extra, ex.: `{ nome: "Novo", foo: "bar" }`. | Retorna `422`; erro Zod de chave não reconhecida. |
| Item de `atualizar_exercicios` com campo desconhecido (schema strict) | Deve rejeitar com `422`. | Enviar `atualizar_exercicios: [{ id, series: 4, observacao: "x" }]`. | Retorna `422`; erro Zod de chave não reconhecida no item. |
| Aluno atualiza treino de outro aluno | Deve rejeitar com `403`. | Fazer `PATCH /treinos/:id` como aluno para treino alheio. | Retorna `403`; mensagem: "você não tem permissão para atualizar este treino". |
| Treinador atualiza treino onde não é o treinador | Deve rejeitar com `403`. | Fazer `PATCH /treinos/:id` como treinador para treino sem seu `treinador_id`. | Retorna `403`; mensagem: "você não tem permissão para atualizar este treino". |
| Usuário sem perfil | Deve rejeitar com `403`. | Fazer `PATCH /treinos/:id` como usuário sem perfil. | Retorna `403`; mensagem: "usuário sem perfil para atualizar treinos". |
| ID inexistente | Deve rejeitar com `404`. | Fazer `PATCH /treinos/{uuid-inexistente}`. | Retorna `404`; mensagem: "Treino não encontrado". |
| Treino soft-deleted (sem suporte a update de inativo) | Deve rejeitar com `404`. | Soft-deletar treino e tentar `PATCH /treinos/:id`. | Retorna `404`; mensagem: "Treino não encontrado". |
| ID com formato inválido | Deve rejeitar com `422`. | Fazer `PATCH /treinos/nao-e-uuid`. | Retorna `422`; erro Zod de validação. |
| Requisição sem header `Authorization` | Deve rejeitar com `401`. | Fazer `PATCH /treinos/:id` sem autenticação. | Retorna `401`. |

---

## DELETE /treinos/:id — Exclusão de Treino

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** |  |  |  |
| Aluno deleta próprio treino (soft delete padrão) | Deve marcar `deletado_em` e retornar `200` com `tipo_exclusao: 'soft'`. | Fazer `DELETE /treinos/:id` como aluno sem query params. | Retorna `200`; `data.tipo_exclusao: 'soft'`; `treino.deletado_em` preenchido; treino não aparece em `GET /treinos` normal. |
| Treinador deleta treino que criou (soft delete) | Deve soft-deletar e retornar `200`. | Fazer `DELETE /treinos/:id` como treinador para treino com seu `treinador_id`. | Retorna `200`; `tipo_exclusao: 'soft'`. |
| Admin deleta qualquer treino com `?force=true` (hard delete) | Deve excluir permanentemente e retornar `200` com `tipo_exclusao: 'hard'`. | Fazer `DELETE /treinos/:id?force=true` como admin. | Retorna `200`; `data.tipo_exclusao: 'hard'`; treino não pode ser encontrado mesmo com `incluir_inativos=true`. |
| Admin deleta com `?force=false` explícito (soft delete) | Deve manter comportamento padrão de soft delete. | Fazer `DELETE /treinos/:id?force=false` como admin. | Retorna `200`; `tipo_exclusao: 'soft'`; `deletado_em` preenchido. |
| Hard delete remove vínculos em cascata (`treino_exercicio`) | Deve remover também os itens vinculados ao treino. | Criar treino com exercícios, executar `DELETE ?force=true` e validar ausência dos vínculos no banco/consulta de composição. | Retorna `200`; nenhum vínculo remanescente para o `treino_id` removido. |
| Aluno pode criar novo treino com mesmo nome após soft-delete | Treino soft-deleted não deve bloquear criação. | Soft-deletar treino, depois criar novo com mesmo nome. | Retorna `201` no segundo `POST`; sem conflito de nome. |
| **Cenários tristes** |  |  |  |
| Não-admin tenta `?force=true` | Deve rejeitar com `403`. | Fazer `DELETE /treinos/:id?force=true` como aluno ou treinador. | Retorna `403`; mensagem: "apenas administradores podem forçar a exclusão permanente de treinos". |
| Aluno deleta treino de outro aluno | Deve rejeitar com `403`. | Fazer `DELETE /treinos/:id` como aluno para treino alheio. | Retorna `403`; mensagem: "você não tem permissão para excluir este treino". |
| Treinador deleta treino onde não é o treinador | Deve rejeitar com `403`. | Fazer `DELETE /treinos/:id` como treinador para treino sem seu `treinador_id`. | Retorna `403`; mensagem: "você não tem permissão para excluir este treino". |
| Usuário sem perfil | Deve rejeitar com `403`. | Fazer `DELETE /treinos/:id` como usuário sem perfil. | Retorna `403`; mensagem: "usuário sem perfil para excluir treinos". |
| ID inexistente | Deve rejeitar com `404`. | Fazer `DELETE /treinos/{uuid-inexistente}`. | Retorna `404`; mensagem: "Treino não encontrado". |
| ID com formato inválido | Deve rejeitar com `422`. | Fazer `DELETE /treinos/nao-e-uuid`. | Retorna `422`; erro Zod de validação. |
| `force` com valor inválido | Deve rejeitar com `422`. | Fazer `DELETE /treinos/:id?force=1` (ou `force=TRUE`). | Retorna `422`; erro Zod para enum inválido. |
| Query com parâmetro desconhecido (schema strict) | Deve rejeitar com `422`. | Fazer `DELETE /treinos/:id?foo=bar`. | Retorna `422`; erro Zod de chave não reconhecida. |
| Treino já soft-deleted (tentativa de deletar novamente) | Deve rejeitar com `404` pois não aparece nas queries normais. | Soft-deletar treino, depois tentar `DELETE` novamente (sem `incluir_inativos`). | Retorna `404`; mensagem: "Treino não encontrado". |
| Requisição sem header `Authorization` | Deve rejeitar com `401`. | Fazer `DELETE /treinos/:id` sem autenticação. | Retorna `401`. |
