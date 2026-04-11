# Suite de Testes E2E — Histórico (`/historico`)

> Testes E2E com Jest + Supertest contra banco real, validando toda a regra de negócio das rotas de histórico.

> **Arquivo:** `src/tests/routes/historicoRoutes.test.ts`

---

## GET /historico/estatisticas — Estatísticas Gerais

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** |  |  |  |
| Aluno consulta próprias estatísticas (sem filtros) | Deve retornar métricas agregadas de toda a história do aluno com `200`. | Fazer `GET /historico/estatisticas` como aluno sem query params. | Retorna `200`; resposta contém `total_sessoes`, `sessoes_concluidas`, `sessoes_canceladas`, `tempo_total_minutos`, `media_duracao_minutos`, `volume_total_kg`, `sequencia_atual`, `melhor_sequencia`, `treinos_por_semana_media`. |
| Aluno consulta estatísticas com filtro de período (`data_inicio` e `data_fim`) | Deve retornar métricas filtradas pelo período informado com `200`. | Fazer `GET /historico/estatisticas?data_inicio=2026-01-01T00:00:00Z&data_fim=2026-04-01T00:00:00Z` como aluno. | Retorna `200`; contadores refletem apenas sessões dentro do período. |
| Aluno informa `aluno_id` igual ao próprio | Deve retornar as próprias estatísticas normalmente com `200`. | Fazer `GET /historico/estatisticas?aluno_id={PROPRIO_ID}` como aluno. | Retorna `200`; mesmo resultado de consulta sem `aluno_id`. |
| Admin consulta estatísticas informando `aluno_id` | Deve retornar estatísticas do aluno indicado com `200`. | Fazer `GET /historico/estatisticas?aluno_id={ID_ALUNO}` como admin. | Retorna `200`; dados pertencem ao aluno informado. |
| Treinador consulta estatísticas de aluno atribuído | Deve retornar estatísticas do aluno com `200`. | Fazer `GET /historico/estatisticas?aluno_id={ID_ALUNO_ATRIBUIDO}` como treinador com aluno na sua lista. | Retorna `200`; dados pertencem ao aluno informado. |
| `sequencia_atual` e `melhor_sequencia` não são filtrados por período | Devem refletir o histórico completo mesmo com `data_inicio`/`data_fim`. | Fazer `GET /historico/estatisticas?data_inicio=ONTEM&data_fim=HOJE` com histórico de semanas anteriores. | Retorna `200`; `sequencia_atual` e `melhor_sequencia` consideram toda a história, não apenas o período. |
| `sequencia_atual` é zero quando última sessão foi há mais de 1 dia | Deve retornar `sequencia_atual: 0`. | Criar sessão concluída há 2+ dias e fazer `GET /historico/estatisticas`. | Retorna `200`; `sequencia_atual: 0`. |
| Sessões `EM_ANDAMENTO` contam em `total_sessoes`, mas não em concluídas/canceladas | Deve refletir corretamente os contadores por status. | Criar sessão `EM_ANDAMENTO` e consultar `GET /historico/estatisticas`. | Retorna `200`; `total_sessoes` incrementa, `sessoes_concluidas` e `sessoes_canceladas` não incrementam por esta sessão. |
| Múltiplas sessões concluídas no mesmo dia não inflacionam streak | Deve contar dia único para sequência atual/melhor sequência. | Criar 2 sessões concluídas no mesmo dia e consultar estatísticas. | Retorna `200`; sequência considera 1 dia, não 2. |
| `volume_total_kg` ignora séries sem `carga_utilizada` ou `repeticoes_realizadas` | Deve calcular volume apenas de séries CONCLUIDA com ambos os campos preenchidos. | Criar sessão com séries CONCLUIDA: algumas com carga+reps, outras com null. | Retorna `200`; `volume_total_kg` conta apenas o produto `carga × reps` das séries completas. |
| Aluno sem nenhuma sessão | Deve retornar todos os contadores zerados com `200`. | Fazer `GET /historico/estatisticas` como aluno recém-criado sem sessões. | Retorna `200`; todos os campos numéricos iguais a `0`. |
| Admin consulta `aluno_id` inexistente (UUID válido) | Deve retornar estatísticas zeradas sem erro. | Fazer `GET /historico/estatisticas?aluno_id={UUID_INEXISTENTE}` como admin. | Retorna `200`; campos numéricos zerados. |
| **Cenários tristes** |  |  |  |
| Aluno informa `aluno_id` de outro aluno | Deve rejeitar com `403`. | Fazer `GET /historico/estatisticas?aluno_id={OUTRO_ALUNO}` como aluno. | Retorna `403`; mensagem: "você só pode visualizar seu próprio histórico". |
| Treinador consulta aluno não atribuído | Deve rejeitar com `403`. | Fazer `GET /historico/estatisticas?aluno_id={ALUNO_NAO_ATRIBUIDO}` como treinador. | Retorna `403`; mensagem: "você não tem permissão para visualizar o histórico deste aluno". |
| Admin consulta sem informar `aluno_id` | Deve rejeitar com `422`. | Fazer `GET /historico/estatisticas` como admin sem `aluno_id`. | Retorna `422`; mensagem: "admin deve informar aluno_id". |
| Treinador consulta sem informar `aluno_id` | Deve rejeitar com `422`. | Fazer `GET /historico/estatisticas` como treinador sem `aluno_id`. | Retorna `422`; mensagem: "treinador deve informar aluno_id". |
| Usuário sem perfil de acesso consulta estatísticas | Deve rejeitar com `403`. | Fazer `GET /historico/estatisticas` como usuário sem perfil aluno/treinador/admin. | Retorna `403`; mensagem: "perfil de acesso não autorizado". |
| `aluno_id` com UUID inválido | Deve rejeitar com `422`. | Fazer `GET /historico/estatisticas?aluno_id=nao-e-uuid`. | Retorna `422`; mensagem: "aluno_id deve ser um UUID válido". |
| `data_inicio` com formato inválido | Deve rejeitar com `422`. | Fazer `GET /historico/estatisticas?data_inicio=31-12-2025`. | Retorna `422`; mensagem: "data_inicio deve ser uma data ISO 8601 válida". |
| `data_fim` com formato inválido | Deve rejeitar com `422`. | Fazer `GET /historico/estatisticas?data_fim=amanha`. | Retorna `422`; mensagem: "data_fim deve ser uma data ISO 8601 válida". |
| Campo extra não previsto (`.strict()`) | Deve rejeitar com `422`. | Fazer `GET /historico/estatisticas?campo_invalido=x`. | Retorna `422`; erro Zod de campo não reconhecido. |
| Requisição sem header `Authorization` | Deve rejeitar com `401`. | Fazer `GET /historico/estatisticas` sem header de autenticação. | Retorna `401`. |

---

## GET /historico/progressao/:exercicioId — Progressão de Exercício

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** |  |  |  |
| Aluno consulta progressão de exercício próprio | Deve retornar série temporal de desempenho do exercício com `200`. | Fazer `GET /historico/progressao/{exercicioId}` como aluno com sessões contendo o exercício. | Retorna `200`; array com objetos contendo `data`, `sessao_id`, `maior_carga`, `media_repeticoes`, `volume_total`. |
| Resultado ordenado do mais recente para o mais antigo | Deve retornar entradas em ordem decrescente de data. | Fazer `GET /historico/progressao/{exercicioId}` com múltiplas sessões em datas distintas. | Retorna `200`; primeiro item tem a data mais recente; último item tem a data mais antiga. |
| Admin consulta progressão de exercício de um aluno | Deve retornar progressão com `200`. | Fazer `GET /historico/progressao/{exercicioId}?aluno_id={ID_ALUNO}` como admin. | Retorna `200`; dados correspondem ao aluno informado. |
| Treinador consulta progressão de aluno atribuído | Deve retornar progressão com `200`. | Fazer `GET /historico/progressao/{exercicioId}?aluno_id={ALUNO_ATRIBUIDO}` como treinador. | Retorna `200`. |
| Filtro por `data_inicio` e `data_fim` | Deve retornar apenas sessões dentro do período. | Fazer `GET /historico/progressao/{exercicioId}?data_inicio=...&data_fim=...`. | Retorna `200`; apenas sessões dentro do período informado. |
| Parâmetro `limite` personalizado | Deve retornar no máximo `limite` registros. | Fazer `GET /historico/progressao/{exercicioId}?limite=5` com 10+ sessões no banco. | Retorna `200`; array contém no máximo 5 itens. |
| `limite` padrão é 50 | Deve usar 50 como padrão quando não informado. | Fazer `GET /historico/progressao/{exercicioId}` sem `limite` com 60 sessões no banco. | Retorna `200`; array contém no máximo 50 itens. |
| Exercício sem sessões concluídas | Deve retornar array vazio com `200`. | Fazer `GET /historico/progressao/{exercicioId}` para exercício que nunca foi treinado. | Retorna `200`; `data` é array vazio. |
| `maior_carga` é null quando séries não têm `carga_utilizada` | Deve retornar `null` quando nenhuma série tem carga registrada. | Criar sessão com séries CONCLUIDA sem `carga_utilizada`. | Retorna `200`; `maior_carga: null` para aquela sessão. |
| `maior_carga` usa maior valor numérico real | Deve considerar comparação numérica da carga. | Criar sessão com séries CONCLUIDA de cargas `95` e `100`. | Retorna `200`; `maior_carga` igual a `100`, não `95`. |
| Progressão ignora séries não concluídas | Deve calcular métricas apenas com séries `CONCLUIDA`. | Criar sessão com séries `PENDENTE`/`PULADA` e outras `CONCLUIDA` no mesmo exercício. | Retorna `200`; métricas refletem somente séries `CONCLUIDA`. |
| `limite` alfanumérico (comportamento atual do parser) | Deve aceitar prefixo numérico via `parseInt`. | Fazer `GET /historico/progressao/{exercicioId}?limite=5abc`. | Retorna `200`; no máximo 5 registros. |
| Admin consulta progressão para `aluno_id` inexistente | Deve retornar array vazio sem erro. | Fazer `GET /historico/progressao/{exercicioId}?aluno_id={UUID_INEXISTENTE}` como admin. | Retorna `200`; array vazio. |
| **Cenários tristes** |  |  |  |
| Aluno consulta progressão de exercício de outro aluno | Deve rejeitar com `403`. | Fazer `GET /historico/progressao/{exercicioId}?aluno_id={OUTRO_ALUNO}` como aluno. | Retorna `403`; mensagem: "você só pode visualizar seu próprio histórico". |
| Treinador consulta aluno não atribuído | Deve rejeitar com `403`. | Fazer `GET /historico/progressao/{exercicioId}?aluno_id={ALUNO_NAO_ATRIBUIDO}` como treinador. | Retorna `403`; mensagem: "você não tem permissão para visualizar o histórico deste aluno". |
| Admin sem `aluno_id` | Deve rejeitar com `422`. | Fazer `GET /historico/progressao/{exercicioId}` como admin sem `aluno_id`. | Retorna `422`; mensagem: "admin deve informar aluno_id". |
| Treinador sem `aluno_id` | Deve rejeitar com `422`. | Fazer `GET /historico/progressao/{exercicioId}` como treinador sem `aluno_id`. | Retorna `422`; mensagem: "treinador deve informar aluno_id". |
| Usuário sem perfil de acesso consulta progressão | Deve rejeitar com `403`. | Fazer `GET /historico/progressao/{exercicioId}` como usuário sem perfil aluno/treinador/admin. | Retorna `403`; mensagem: "perfil de acesso não autorizado". |
| `exercicioId` inválido (não-UUID) | Deve rejeitar com `422`. | Fazer `GET /historico/progressao/nao-e-uuid`. | Retorna `422`; mensagem: "exercicioId inválido, deve ser um UUID válido". |
| `limite` acima de 100 | Deve rejeitar com `422`. | Fazer `GET /historico/progressao/{exercicioId}?limite=101`. | Retorna `422`; mensagem: "limite deve ser entre 1 e 100". |
| `limite` igual a zero | Deve rejeitar com `422`. | Fazer `GET /historico/progressao/{exercicioId}?limite=0`. | Retorna `422`; mensagem: "limite deve ser entre 1 e 100". |
| `limite` não numérico | Deve rejeitar com `422`. | Fazer `GET /historico/progressao/{exercicioId}?limite=abc`. | Retorna `422`; mensagem: "limite deve ser entre 1 e 100". |
| `data_inicio` com formato inválido | Deve rejeitar com `422`. | Fazer `GET /historico/progressao/{exercicioId}?data_inicio=31-12-2025`. | Retorna `422`; mensagem: "data_inicio deve ser uma data ISO 8601 válida". |
| `data_fim` com formato inválido | Deve rejeitar com `422`. | Fazer `GET /historico/progressao/{exercicioId}?data_fim=amanha`. | Retorna `422`; mensagem: "data_fim deve ser uma data ISO 8601 válida". |
| Campo extra não previsto (`.strict()`) | Deve rejeitar com `422`. | Fazer `GET /historico/progressao/{exercicioId}?campo_invalido=x`. | Retorna `422`; erro Zod. |
| Requisição sem header `Authorization` | Deve rejeitar com `401`. | Fazer `GET /historico/progressao/{exercicioId}` sem autenticação. | Retorna `401`. |

---

## GET /historico/grupos-musculares — Distribuição por Grupo Muscular

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** |  |  |  |
| Aluno consulta distribuição muscular | Deve retornar array com grupos musculares e métricas com `200`. | Fazer `GET /historico/grupos-musculares` como aluno com sessões concluídas. | Retorna `200`; array com objetos contendo `grupo_muscular`, `total_series`, `volume_total_kg`, `percentual`. |
| Resultados ordenados por `total_series` decrescente | Deve retornar grupos mais treinados primeiro. | Criar sessões com mais séries de PEITO do que COSTAS. | Retorna `200`; PEITO aparece antes de COSTAS na lista. |
| `percentual` soma 100 entre grupos | A soma dos percentuais deve ser igual a 100. | Fazer `GET /historico/grupos-musculares` com múltiplos grupos musculares. | Retorna `200`; soma de todos os `percentual` é igual a 100 (ou próximo por arredondamento). |
| Exercício com múltiplos músculos é contado em cada grupo | Séries de exercício multi-muscular incrementam todos os grupos envolvidos. | Criar exercício com músculos PEITO e BRAÇOS, realizar séries. | Retorna `200`; `total_series` de PEITO e BRAÇOS ambos incrementados pela mesma série. |
| Filtro por período (`data_inicio`/`data_fim`) | Deve considerar apenas sessões dentro do período. | Fazer `GET /historico/grupos-musculares?data_inicio=...&data_fim=...`. | Retorna `200`; métricas refletem apenas sessões no período. |
| Admin consulta com `aluno_id` | Deve retornar distribuição do aluno informado com `200`. | Fazer `GET /historico/grupos-musculares?aluno_id={ID_ALUNO}` como admin. | Retorna `200`. |
| Treinador consulta aluno atribuído | Deve retornar distribuição com `200`. | Fazer `GET /historico/grupos-musculares?aluno_id={ALUNO_ATRIBUIDO}` como treinador. | Retorna `200`. |
| `volume_total_kg` ignora séries sem carga/repetições | Deve considerar apenas séries CONCLUIDA com ambos os campos preenchidos. | Criar séries CONCLUIDA com carga/reps e outras com null. | Retorna `200`; volume soma apenas séries completas. |
| Aluno sem sessões concluídas | Deve retornar array vazio com `200`. | Fazer `GET /historico/grupos-musculares` como aluno sem histórico. | Retorna `200`; array vazio. |
| Admin consulta `aluno_id` inexistente | Deve retornar array vazio sem erro. | Fazer `GET /historico/grupos-musculares?aluno_id={UUID_INEXISTENTE}` como admin. | Retorna `200`; array vazio. |
| **Cenários tristes** |  |  |  |
| Aluno informa `aluno_id` de outro aluno | Deve rejeitar com `403`. | Fazer `GET /historico/grupos-musculares?aluno_id={OUTRO_ALUNO}` como aluno. | Retorna `403`; mensagem: "você só pode visualizar seu próprio histórico". |
| Treinador consulta aluno não atribuído | Deve rejeitar com `403`. | Fazer `GET /historico/grupos-musculares?aluno_id={ALUNO_NAO_ATRIBUIDO}` como treinador. | Retorna `403`; mensagem: "você não tem permissão para visualizar o histórico deste aluno". |
| Admin sem `aluno_id` | Deve rejeitar com `422`. | Fazer `GET /historico/grupos-musculares` como admin sem `aluno_id`. | Retorna `422`; mensagem: "admin deve informar aluno_id". |
| Treinador sem `aluno_id` | Deve rejeitar com `422`. | Fazer `GET /historico/grupos-musculares` como treinador sem `aluno_id`. | Retorna `422`; mensagem: "treinador deve informar aluno_id". |
| Usuário sem perfil de acesso consulta grupos musculares | Deve rejeitar com `403`. | Fazer `GET /historico/grupos-musculares` como usuário sem perfil aluno/treinador/admin. | Retorna `403`; mensagem: "perfil de acesso não autorizado". |
| `aluno_id` com UUID inválido | Deve rejeitar com `422`. | Fazer `GET /historico/grupos-musculares?aluno_id=invalido`. | Retorna `422`; mensagem: "aluno_id deve ser um UUID válido". |
| `data_inicio` com formato inválido | Deve rejeitar com `422`. | Fazer `GET /historico/grupos-musculares?data_inicio=31-12-2025`. | Retorna `422`; mensagem: "data_inicio deve ser uma data ISO 8601 válida". |
| `data_fim` com formato inválido | Deve rejeitar com `422`. | Fazer `GET /historico/grupos-musculares?data_fim=amanha`. | Retorna `422`; mensagem: "data_fim deve ser uma data ISO 8601 válida". |
| Campo extra não previsto (`.strict()`) | Deve rejeitar com `422`. | Fazer `GET /historico/grupos-musculares?campo_invalido=x`. | Retorna `422`; erro Zod de campo não reconhecido. |
| Requisição sem header `Authorization` | Deve rejeitar com `401`. | Fazer `GET /historico/grupos-musculares` sem autenticação. | Retorna `401`. |

---

## GET /historico/exercicios-frequentes — Exercícios Mais Frequentes

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** |  |  |  |
| Aluno consulta exercícios mais frequentes | Deve retornar ranking de exercícios por frequência de uso com `200`. | Fazer `GET /historico/exercicios-frequentes` como aluno com histórico. | Retorna `200`; array com objetos contendo `exercicio_id`, `nome`, `total_sessoes`, `total_series`, `volume_total_kg`. |
| Resultados ordenados por `total_sessoes` decrescente | Exercício mais praticado aparece primeiro. | Criar histórico com exercício A em 5 sessões e B em 2 sessões. | Retorna `200`; exercício A aparece antes de B. |
| Parâmetro `limite` personalizado | Deve retornar no máximo `limite` registros. | Fazer `GET /historico/exercicios-frequentes?limite=3` com 10 exercícios diferentes no histórico. | Retorna `200`; array contém no máximo 3 itens. |
| `limite` padrão é 10 | Deve usar 10 como padrão quando não informado. | Fazer `GET /historico/exercicios-frequentes` com 15 exercícios diferentes no histórico. | Retorna `200`; array contém no máximo 10 itens. |
| Filtro por período | Deve considerar apenas sessões no período. | Fazer `GET /historico/exercicios-frequentes?data_inicio=...&data_fim=...`. | Retorna `200`; apenas exercícios praticados dentro do período. |
| Admin consulta com `aluno_id` | Deve retornar ranking do aluno informado com `200`. | Fazer `GET /historico/exercicios-frequentes?aluno_id={ID_ALUNO}` como admin. | Retorna `200`. |
| Treinador consulta aluno atribuído | Deve retornar ranking com `200`. | Fazer `GET /historico/exercicios-frequentes?aluno_id={ALUNO_ATRIBUIDO}` como treinador. | Retorna `200`. |
| `limite` alfanumérico (comportamento atual do parser) | Deve aceitar prefixo numérico via `parseInt`. | Fazer `GET /historico/exercicios-frequentes?limite=3abc`. | Retorna `200`; no máximo 3 itens. |
| Aluno sem histórico | Deve retornar array vazio com `200`. | Fazer `GET /historico/exercicios-frequentes` como aluno sem sessões. | Retorna `200`; array vazio. |
| Admin consulta `aluno_id` inexistente | Deve retornar array vazio sem erro. | Fazer `GET /historico/exercicios-frequentes?aluno_id={UUID_INEXISTENTE}` como admin. | Retorna `200`; array vazio. |
| **Cenários tristes** |  |  |  |
| Aluno informa `aluno_id` de outro aluno | Deve rejeitar com `403`. | Fazer `GET /historico/exercicios-frequentes?aluno_id={OUTRO_ALUNO}` como aluno. | Retorna `403`; mensagem: "você só pode visualizar seu próprio histórico". |
| Treinador consulta aluno não atribuído | Deve rejeitar com `403`. | Fazer `GET /historico/exercicios-frequentes?aluno_id={NAO_ATRIBUIDO}` como treinador. | Retorna `403`; mensagem: "você não tem permissão para visualizar o histórico deste aluno". |
| Admin sem `aluno_id` | Deve rejeitar com `422`. | Fazer `GET /historico/exercicios-frequentes` como admin. | Retorna `422`; mensagem: "admin deve informar aluno_id". |
| Treinador sem `aluno_id` | Deve rejeitar com `422`. | Fazer `GET /historico/exercicios-frequentes` como treinador sem `aluno_id`. | Retorna `422`; mensagem: "treinador deve informar aluno_id". |
| `limite` acima de 50 | Deve rejeitar com `422`. | Fazer `GET /historico/exercicios-frequentes?limite=51`. | Retorna `422`; mensagem: "limite deve ser entre 1 e 50". |
| `limite` igual a zero | Deve rejeitar com `422`. | Fazer `GET /historico/exercicios-frequentes?limite=0`. | Retorna `422`; mensagem: "limite deve ser entre 1 e 50". |
| `limite` não numérico | Deve rejeitar com `422`. | Fazer `GET /historico/exercicios-frequentes?limite=abc`. | Retorna `422`; mensagem: "limite deve ser entre 1 e 50". |
| Usuário sem perfil de acesso consulta exercícios frequentes | Deve rejeitar com `403`. | Fazer `GET /historico/exercicios-frequentes` como usuário sem perfil aluno/treinador/admin. | Retorna `403`; mensagem: "perfil de acesso não autorizado". |
| `aluno_id` com UUID inválido | Deve rejeitar com `422`. | Fazer `GET /historico/exercicios-frequentes?aluno_id=invalido`. | Retorna `422`; mensagem: "aluno_id deve ser um UUID válido". |
| `data_inicio` com formato inválido | Deve rejeitar com `422`. | Fazer `GET /historico/exercicios-frequentes?data_inicio=31-12-2025`. | Retorna `422`; mensagem: "data_inicio deve ser uma data ISO 8601 válida". |
| `data_fim` com formato inválido | Deve rejeitar com `422`. | Fazer `GET /historico/exercicios-frequentes?data_fim=amanha`. | Retorna `422`; mensagem: "data_fim deve ser uma data ISO 8601 válida". |
| Campo extra não previsto (`.strict()`) | Deve rejeitar com `422`. | Fazer `GET /historico/exercicios-frequentes?campo_invalido=x`. | Retorna `422`; erro Zod. |
| Requisição sem header `Authorization` | Deve rejeitar com `401`. | Fazer `GET /historico/exercicios-frequentes` sem autenticação. | Retorna `401`. |

---

## GET /historico/comparativo — Comparativo Entre Períodos

| Funcionalidade | Comportamento Esperado | Verificações | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cenários felizes** |  |  |  |
| Aluno consulta comparativo padrão (4 semanas) | Deve retornar estatísticas do período atual, anterior e variação com `200`. | Fazer `GET /historico/comparativo` como aluno com histórico nos últimos 2 meses. | Retorna `200`; resposta contém `periodo_atual`, `periodo_anterior` e `variacao` com 8 métricas: `sessoes_concluidas_pct`, `sessoes_concluidas_abs`, `volume_total_kg_pct`, `volume_total_kg_abs`, `media_duracao_minutos_pct`, `media_duracao_minutos_abs`, `treinos_por_semana_pct`, `treinos_por_semana_abs`. |
| Parâmetro `semanas` customizado | Deve calcular períodos baseado no número de semanas informado. | Fazer `GET /historico/comparativo?semanas=8`. | Retorna `200`; cada período equivale a 56 dias (8 × 7). |
| `variacao._pct` é `null` quando período anterior tem valor zero | Deve retornar `null` para percentual quando denominador é zero. | Criar histórico apenas no período atual (sem histórico anterior). | Retorna `200`; campos `*_pct` em `variacao` são `null` (divisão por zero evitada). |
| `sequencia_atual` e `melhor_sequencia` ausentes da variação | Não devem aparecer como métricas de variação. | Fazer `GET /historico/comparativo` e inspecionar `variacao`. | Retorna `200`; objeto `variacao` não contém `sequencia_atual_pct` nem `melhor_sequencia_pct`. |
| `periodo_atual` e `periodo_anterior` não incluem streaks | Campos de streak não devem existir nesses objetos. | Fazer `GET /historico/comparativo` e inspecionar ambos os períodos. | Retorna `200`; `periodo_atual` e `periodo_anterior` não têm `sequencia_atual` nem `melhor_sequencia`. |
| Admin consulta com `aluno_id` | Deve retornar comparativo do aluno indicado com `200`. | Fazer `GET /historico/comparativo?aluno_id={ID_ALUNO}` como admin. | Retorna `200`. |
| Treinador consulta aluno atribuído | Deve retornar comparativo com `200`. | Fazer `GET /historico/comparativo?aluno_id={ALUNO_ATRIBUIDO}` como treinador. | Retorna `200`. |
| `semanas` alfanumérico (comportamento atual do parser) | Deve aceitar prefixo numérico via `parseInt`. | Fazer `GET /historico/comparativo?semanas=8abc`. | Retorna `200`; períodos calculados com 8 semanas. |
| Aluno sem histórico em nenhum período | Deve retornar zeros e `null` nos percentuais com `200`. | Fazer `GET /historico/comparativo` como aluno sem sessões. | Retorna `200`; contadores zerados; campos `*_pct` são `null`. |
| Admin consulta `aluno_id` inexistente | Deve retornar períodos zerados e percentuais nulos sem erro. | Fazer `GET /historico/comparativo?aluno_id={UUID_INEXISTENTE}` como admin. | Retorna `200`; períodos com zero e `variacao.*_pct` nulos. |
| **Cenários tristes** |  |  |  |
| Aluno informa `aluno_id` de outro aluno | Deve rejeitar com `403`. | Fazer `GET /historico/comparativo?aluno_id={OUTRO_ALUNO}` como aluno. | Retorna `403`; mensagem: "você só pode visualizar seu próprio histórico". |
| Treinador consulta aluno não atribuído | Deve rejeitar com `403`. | Fazer `GET /historico/comparativo?aluno_id={NAO_ATRIBUIDO}` como treinador. | Retorna `403`; mensagem: "você não tem permissão para visualizar o histórico deste aluno". |
| Admin sem `aluno_id` | Deve rejeitar com `422`. | Fazer `GET /historico/comparativo` como admin. | Retorna `422`; mensagem: "admin deve informar aluno_id". |
| Treinador sem `aluno_id` | Deve rejeitar com `422`. | Fazer `GET /historico/comparativo` como treinador sem `aluno_id`. | Retorna `422`; mensagem: "treinador deve informar aluno_id". |
| Usuário sem perfil de acesso consulta comparativo | Deve rejeitar com `403`. | Fazer `GET /historico/comparativo` como usuário sem perfil aluno/treinador/admin. | Retorna `403`; mensagem: "perfil de acesso não autorizado". |
| `semanas` abaixo de 1 | Deve rejeitar com `422`. | Fazer `GET /historico/comparativo?semanas=0`. | Retorna `422`; mensagem: "semanas deve ser entre 1 e 52". |
| `semanas` acima de 52 | Deve rejeitar com `422`. | Fazer `GET /historico/comparativo?semanas=53`. | Retorna `422`; mensagem: "semanas deve ser entre 1 e 52". |
| `semanas` não numérico | Deve rejeitar com `422`. | Fazer `GET /historico/comparativo?semanas=abc`. | Retorna `422`; mensagem: "semanas deve ser entre 1 e 52". |
| `aluno_id` com UUID inválido | Deve rejeitar com `422`. | Fazer `GET /historico/comparativo?aluno_id=invalido`. | Retorna `422`; mensagem: "aluno_id deve ser um UUID válido". |
| Campo extra não previsto (`.strict()`) | Deve rejeitar com `422`. | Fazer `GET /historico/comparativo?campo_invalido=x`. | Retorna `422`; erro Zod. |
| Requisição sem header `Authorization` | Deve rejeitar com `401`. | Fazer `GET /historico/comparativo` sem autenticação. | Retorna `401`. |
