# PROJETO DE SOFTWARE — SPOTTER

## Stakeholders

| Nome | Cargo / Papel | Contato |
|------|--------------|---------|
| José Lucas Brandão Montes | Professor / Cliente | lucas.montes@ifro.edu.br |

## Equipe de Desenvolvimento

| Nome | Cargo / Papel | Contato |
|------|--------------|---------|
| Yuri Zetoles | Desenvolvedor | yurizetoles0123@gmail.com |
| Lucca Livino | Desenvolvedor | lucca.f.livino@gmail.com |
| Ruan Lopes | Desenvolvedor | intel.spec.lopes@gmail.com |

---

## Resumo do Projeto

| | |
|--|--|
| **Nome** | Spotter |
| **Objetivo principal** | Plataforma de comunicação e gestão de rotinas de treino entre personal trainers e alunos |
| **Benefícios esperados** | Facilitar o acompanhamento de treinos, melhorar a comunicação instrutor-aluno e centralizar o progresso em um único ecossistema |
| **Período** | 10/02/2026 – 23/06/2026 |
| **Instituição** | IFRO — Instituto Federal de Rondônia |
| **Disciplina** | Fábrica de Software IV |

---

## Introdução

O **Spotter** é uma solução integrada para o gerenciamento de atividades físicas, focada na interação entre treinadores e alunos. O sistema permite que treinadores prescrevam treinos personalizados, acompanhem a evolução dos alunos e mantenham um canal de comunicação direto via chat. Ao mesmo tempo, os alunos podem visualizar suas rotinas, registrar a execução dos exercícios e monitorar seu próprio progresso através de gráficos e histórico.

A concepção do sistema partiu de uma necessidade identificada de reunir, em um único ecossistema, funcionalidades que estavam dispersas em múltiplos aplicativos: dados estatísticos de progressão, comunicação via chat, demonstração de exercícios com GIFs animados, organização de locais de treino e informações de personal trainers. Os sistemas de referência avaliados foram **GymDay** (foco na execução durante o treino) e **Trainiac** (foco na prescrição de treinos pelo profissional).

---

## Descrição Geral

### Usuários do sistema (atores)

| Ator | Descrição |
|------|-----------|
| Treinador / Personal Trainer | Gerencia os treinos dos alunos, cria, edita e remove rotinas. Acompanha execução e progressão. Comunica-se via chat em tempo real. |
| Aluno | Visualiza e executa rotinas de treino. Pode criar treinos próprios, ajustar cargas e séries, e monitorar seu progresso via gráficos. |

### Repositórios do projeto

| Componente | Repositório |
|-----------|-------------|
| API (backend) | `fabrica-4-api-controle-de-atividades-fisicas` (este repositório) |
| Aplicativo Android | `fabrica-4-mobile-controle-de-atividades-fisicas` |

---

## Arquitetura Geral

```
┌─────────────────────────────────┐
│   Aplicativo Android (Kotlin)   │
│   Jetpack Compose + Retrofit    │
└─────────┬───────────────────────┘
          │ HTTPS + WebSocket (Socket.IO)
          ▼
┌─────────────────────────────────┐
│         API (Node.js)           │
│   Express + Drizzle + BetterAuth│
├─────────────────────────────────┤
│  PostgreSQL 17   │   MinIO      │
│  (dados)         │   (mídias)   │
└─────────────────────────────────┘
          │
          ├── ExerciseDB (RapidAPI) — GIFs de exercícios
          ├── NPaaS (fslab) — notificações push
          └── Hermes (fslab) — e-mail transacional
```

---

## Stack Tecnológico

### Backend (API)

| Tecnologia | Versão | Uso |
|-----------|--------|-----|
| Node.js | 22+ | Runtime |
| TypeScript | 5+ | Linguagem |
| Express.js | 4+ | Framework HTTP |
| Drizzle ORM | latest | Acesso ao banco |
| PostgreSQL | 17 | Banco de dados relacional |
| BetterAuth | latest | Autenticação (JWT + sessões) |
| Socket.IO | 4+ | Chat em tempo real |
| MinIO | latest | Armazenamento de mídias |
| Zod | 3+ | Validação de dados |
| Jest + Supertest | latest | Testes de integração |
| Docker | latest | Containerização |
| Kubernetes / k3s | latest | Orquestração em produção |

### Mobile (Android)

| Tecnologia | Versão | Uso |
|-----------|--------|-----|
| Kotlin | 1.9+ | Linguagem |
| Jetpack Compose | BOM 2024.09 | UI declarativa |
| Material3 | latest | Design system |
| Retrofit2 | 2.9.0 | Cliente HTTP |
| OkHttp3 | 4.12.0 | Interceptores HTTP |
| Socket.IO Client | 2.1.1 | Chat em tempo real |
| Coil | 2.5.0 | Carregamento de imagens e GIFs |
| ExoPlayer / Media3 | 1.3.1 | Reprodução de vídeo |
| Firebase Cloud Messaging | 33.7.0 | Notificações push |
| Navigation Compose | 2.7.7 | Navegação entre telas |
| DataStore | 1.0.0 | Persistência local de preferências |
| CameraX + ML Kit | 1.3.1 / 17.2.0 | Leitura de QR Code |
| Biometric API | 1.2.0 | Autenticação biométrica |

---

## Integrações de Terceiros

### ExerciseDB (API)
Serviço utilizado pela **API** para obter GIFs animados e metadados de exercícios físicos (músculo-alvo, aparelho, instruções).

- **Provedor:** [ExerciseDB via RapidAPI](https://rapidapi.com/justin-WFnsXH_t6/api/exercisedb)
- **Plano:** Free (Basic) — 500 requisições/mês sem custo
- **Uso:** os dados são cacheados em banco após a primeira requisição, reduzindo chamadas externas
- **Termos:** [RapidAPI Terms of Use](https://rapidapi.com/terms)

### workout-planner (Mobile)
Repositório open-source utilizado como **referência de design e arquitetura** no desenvolvimento do aplicativo Android.

- **Repositório:** [https://github.com/adanzan/workout-planner](https://github.com/adanzan/workout-planner)
- **Uso:** referência de interface e organização de componentes Jetpack Compose para telas de treino

---

## Ambientes de Deploy

| Ambiente | URL | Branch | Banco |
|----------|-----|--------|-------|
| **Produção** | `https://atividadesfisicas-api.yuriprojects.dpdns.org` | `main` | `aplicativo_atividades_fisicas` |
| **QA** | `https://atividadesfisicas-api-qa.yuriprojects.dpdns.org` | `develop` | `aplicativo_atividades_fisicas_qa` |

> O aplicativo Android em uso aponta para o ambiente **QA**, que está sempre atualizado com a branch `develop`. Para testes manuais, recomenda-se usar o QA.

---

## Requisitos Funcionais

| ID | Nome | Descrição | Prioridade |
|----|------|-----------|-----------|
| RF001 | Cadastro de usuário | Registro de usuários como Aluno ou Treinador | Alta |
| RF002 | Autenticação | Login seguro com sessões via BetterAuth | Alta |
| RF003 | Perfil do usuário | Gestão de informações básicas e foto de perfil | Alta |
| RF004 | Demonstração de exercícios | Exibição de GIFs/vídeos demonstrativos (ExerciseDB) | Alta |
| RF005 | Execução de treino | Registro de séries, repetições e cargas em tempo real | Alta |
| RF006 | Histórico de treino | Consulta de sessões realizadas com gráficos de evolução | Alta |
| RF007 | Treino próprio | Aluno pode criar treinos independentes | Alta |
| RF008 | Prescrição de treinos | Treinador cria e atribui treinos aos alunos | Alta |
| RF009 | Gestão de alunos | Treinador visualiza e gerencia alunos vinculados | Alta |
| RF010 | Chat integrado | Comunicação direta aluno-treinador via chat em tempo real | Alta |
| RF011 | Estatísticas de progresso | Gráficos de evolução de carga, peso e frequência | Média |
| RF012 | Busca de treinador | Aluno busca profissionais para acompanhamento | Média |
| RF013 | Gestão de academias | Cadastro e vínculo de usuários a academias | Média |
| RF014 | Notificações push | Push notifications para novas mensagens e treinos | Média |
| RF015 | Vinculação aluno-treinador | Fluxo de solicitação e aceite de vínculo | Alta |

## Requisitos Não Funcionais

| ID | Nome | Descrição | Prioridade |
|----|------|-----------|-----------|
| RNF001 | Segurança | JWT, hashing de senhas, CORS e validação via Zod | Alta |
| RNF002 | Performance | Respostas da API abaixo de 300ms em condições normais | Média |
| RNF003 | Disponibilidade | Meta de 99.5% de uptime | Alta |
| RNF004 | Escalabilidade | Arquitetura containerizada pronta para escalonamento horizontal | Média |
| RNF005 | Integridade | Transações de banco e validações de dados em todas as entradas | Alta |
| RNF006 | Conformidade | Tratamento de dados sensíveis de saúde em conformidade com a LGPD | Alta |

---

## Metodologia

Desenvolvimento ágil com **Kanban**, utilizando o GitLab para gestão de issues, merge requests e CI/CD. Cada funcionalidade é desenvolvida em branch própria (nomeada com o número da issue) e mesclada via MR após revisão.

---

## Viabilidade

- **Técnica:** stack moderna, estável e amplamente adotada. Arquitetura REST clara com separação total entre backend e frontend/mobile. Docker facilita implantação. ✅
- **Econômica:** infraestrutura baseada em open-source e planos gratuitos (ExerciseDB Free). Custo real restrito a tempo de desenvolvimento da equipe. ✅
- **Operacional:** sistema projetado para uso durante o treino — interface rápida e intuitiva. Manutenção facilitada pelo uso de TypeScript e Drizzle (type-safety total). ✅
- **Legal:** bibliotecas com licenças permissivas (MIT/Apache). Conformidade com LGPD no tratamento de dados de saúde e biometria. ✅

---

## Licença

Este projeto é de uso acadêmico. Todos os direitos reservados aos autores.
