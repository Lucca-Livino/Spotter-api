# Mapa de Notificações Push - Spotter

Este documento mapeia as possíveis notificações push para o ecossistema Spotter, categorizadas por viabilidade de implementação com base no estado atual do código (backend).

---

## 🟢 1. Prontas para Implementar
Estas notificações dependem de serviços, rotas e repositórios que já existem e estão totalmente funcionais. A integração exige apenas chamadas à API do NPaaS nos métodos corretos.

### 1.1. Gestão de Treinos
*   **Novo Treino Atribuído**
    *   **De:** Treinador
    *   **Para:** Aluno
    *   **Descrição:** Notifica o aluno que uma nova ficha de treino foi criada para ele.
    *   **Gatilho:** `TreinoService.createTreino` (quando o payload contém `aluno_id`) e `TreinoService.duplicarTreinoParaAlunos`.
*   **Treino Atualizado**
    *   **De:** Treinador
    *   **Para:** Aluno
    *   **Descrição:** Notifica o aluno sobre modificações nos exercícios, séries ou dias de um treino existente.
    *   **Gatilho:** `TreinoService.updateTreino`.

### 1.2. Acompanhamento de Atividade
*   **Aviso de Início de Sessão (Aluno)**
    *   **De:** Sistema
    *   **Para:** Aluno
    *   **Descrição:** Mensagem motivacional ao iniciar o treino.
    *   **Gatilho:** `SessaoService.createSessao` *(Já parcialmente implementado)*.
*   **Resumo de Treino Finalizado (Aluno)**
    *   **De:** Sistema
    *   **Para:** Aluno
    *   **Descrição:** Parabéns pela conclusão com dados como volume total ou exercícios concluídos.
    *   **Gatilho:** `SessaoService.finalizarSessao` *(Já parcialmente implementado)*.
*   **Notificação de Treino Concluído (Treinador)**
    *   **De:** Sistema
    *   **Para:** Treinador vinculado
    *   **Descrição:** Avisa ao treinador que um de seus alunos finalizou uma sessão.
    *   **Gatilho:** `SessaoService.finalizarSessao` (buscando o `treinador_id` do aluno antes de enviar).

### 1.3. Comunicação (Chat)
*   **Nova Mensagem de Chat**
    *   **De:** Aluno/Treinador
    *   **Para:** Treinador/Aluno
    *   **Descrição:** Aviso de nova mensagem na aba de chat. O payload deve conter o `conversa_id` para *deep linking*.
    *   **Gatilho:** `MensagemConversaService.create`.

---

## 🟡 2. Parcialmente Possíveis (Falta Infraestrutura)
Estas notificações fazem sentido para a regra de negócio, mas dependem de módulos ou fluxos que ainda não foram totalmente construídos ou refinados na API.

*   **Avaliação Física Disponível**
    *   **De:** Treinador
    *   **Para:** Aluno
    *   **Descrição:** Notifica que um novo laudo/medidas foi anexado ao perfil.
    *   **O que falta:** O `AvaliacaoFisicaService` e o repositório/controller correspondente ainda não existem no backend (embora a tabela exista no schema).
*   **Alerta de Recorde Pessoal (PR)**
    *   **De:** Sistema
    *   **Para:** Aluno
    *   **Descrição:** "Parabéns! Você bateu seu recorde de carga no Supino Reto (80kg)."
    *   **O que falta:** Um serviço analítico ou lógica dentro do `SessaoService` (ou `HistoricoService`) que compare a carga/volume atual com os registros passados do mesmo exercício de forma assíncrona.
*   **Lembrete de Treino (Inatividade)**
    *   **De:** Sistema
    *   **Para:** Aluno
    *   **Descrição:** "Sentimos sua falta! Você não treina há 3 dias. Que tal ir hoje?"
    *   **O que falta:** Um worker/CRON Job no servidor (ex: `node-cron` ou AWS EventBridge) que rode diariamente verificando o `created_at` da última sessão de cada aluno.

---

## 🔴 3. Ideias Futuras (Requerem Novas Features)
Notificações interessantes, mas que exigem a criação de novas funcionalidades, tabelas e lógicas não previstas no escopo atual.

*   **Agendamento de Aulas/Consultorias**
    *   **Descrição:** Notificar 1 hora antes de uma mentoria em vídeo ou aula presencial marcada.
    *   **Depende de:** Criação de módulo de `Agendamento` / `Calendário` no backend.
*   **Vencimento de Mensalidade/Plano**
    *   **Descrição:** Aviso financeiro.
    *   **Depende de:** Integração com gateway de pagamento (Stripe, Pagar.me) e módulo financeiro.
*   **Gamificação (Badges/Conquistas)**
    *   **Descrição:** "Você alcançou a marca de 50 treinos no ano! Distintivo desbloqueado."
    *   **Depende de:** Criação de tabelas de `conquistas`, `pontuacao` e um motor de regras de gamificação.
*   **Alerta de Equipamento em Manutenção**
    *   **Descrição:** (Focado na administração da Academia). Avisar alunos que o aparelho X está quebrado.
    *   **Depende de:** Módulo de gestão de hardware/manutenção vinculado à `Academia`.
