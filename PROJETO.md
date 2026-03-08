# **PROJETO DE SOFTWARE \- ################**

## ***Stakeholders***

| NOME | CARGO/PAPEL | E-MAIL/CONTATO |
| :---- | :---- | :---- |
| Jose Lucas Brandao Montes | Professor/Cliente | lucas.montes@ifro.edu.br |

## ***Equipe de Desenvolvimento***

| NOME | CARGO/PAPEL | E-MAIL/CONTATO |
| :---- | :---- | :---- |
| Lucca Livino | Desenvolvedor | lucca.f.livino@gmail.com |
| Ruan Lopes | Desenvolvedor | intel.spec.lopes@gmail.com |
| Yuri Zetoles | Desenvolvedor | yurizetoles0123@gmail.com |
| João Kmniecik | Desenvolvedor | joao.kmniecik@estudante.ifro.edu.br |

<!-- # **Sumário** -->

<!-- * [RESUMO DO PROJETO](#resumo-do-projeto)  
* [INTRODUÇÃO](#introdução)  
  * [PROPÓSITO DESTE DOCUMENTO](#propósito-deste-documento)  
  * [CONCEPÇÃO DO SISTEMA](#concepção-do-sistema)  
* [DESCRIÇÃO GERAL](#descrição-geral)  
  * [USUÁRIOS DO SISTEMA (ATORES)](#usuários-do-sistema-atores)  
  * [ABRANGÊNCIA E SISTEMAS SIMILARES](#abrangência-e-sistemas-similares)  
  * [SUPOSIÇÕES E DEPENDÊNCIAS](#suposições-e-dependências)  
* [REQUISITOS DO SOFTWARE](#requisitos-do-software)  
  * [REQUISITOS FUNCIONAIS](#requisitos-funcionais)  
  * [REQUISITOS NÃO FUNCIONAIS](#requisitos-não-funcionais)  
* [PROTOTIPAGEM](#prototipagem)  
* [DIAGRAMA DE CASOS DE USO](#diagrama-de-casos-de-uso)  
  * [DESCRIÇÃO TEXTUAL DOS CASOS DE USO](#descrição-textual-dos-casos-de-uso)  
  * [ESPECIFICAÇÃO DOS CASOS DE USO](#especificação-dos-casos-de-uso)  
* [DIAGRAMA DE CLASSES](#diagrama-de-classes)  
* [DIAGRAMA DE SEQUÊNCIAS](#diagrama-de-sequências)  
* [DIAGRAMA DE ATIVIDADES](#diagrama-de-atividades) -->

# **RESUMO DO PROJETO**

|  |  |
| :---- | :---- |
| **NOME** | Spotter |
| **PRINCIPAL OBJETIVO** | Desenvolver um aplicativo que possibilite a boa comunicação entre personal trainer e alunos. |
| **BENEFÍCIOS ESPERADOS** | Facilitar a comunicação entre o personal trainer e seus alunos. |
| **INÍCIO E TÉRMINO PREVISTOS** | 10/02/2026 - 23/06/2026 |

# **INTRODUÇÃO**

################

## **PROPÓSITO DESTE DOCUMENTO**

O objetivo deste documento é detalhar a concepção, arquitetura, requisitos e funcionalidades do sistema. Ele serve como um guia para o desenvolvimento contínuo, manutenção e para que outros possam entender o software, garantindo que as informações relevantes estejam organizadas e acessíveis.

## **CONCEPÇÃO DO SISTEMA**

A ideia para o desenvolvimento do sistema partiu de uma necessidade identificada pelo nosso cliente de reunir funções existentes em outros aplicativos de organização de exercícios, como dados estatísticos de progressão, comunicação via chat, fácil organização, disposição e demonstração dos exercícios (com o objetivo de ajudar novos alunos a entender os exercícios a serem executados), organização de locais de treino bem como dados dos personal trainers, em um único aplicativo.

# **DESCRIÇÃO GERAL**

Aplicativo com objetivo de ser uma cartilha de treino para alunos e personal trainers poderem se organizar e executar rotinas de treinos de forma descomplicada, com fácil disposição das informações para que qualquer usuário, seja ele novo ou experiente em treinos de academia, consiga utilizar de forma ágil e direta.

## **USUÁRIOS DO SISTEMA (ATORES)**

| ATOR | DESCRIÇÃO |
| :---- | :---- |
| Instrutor/Personal Trainer | O personal trainer terá capacidade de gerenciar os treinos de seus alunos, criando, editando ou removendo (quando necessário) rotinas de treino. Acompanhar a execução e progressão dos treinos por seus alunos, bem como de enviar mensagens/notificações personalizadas ao aluno com lembretes ou informes relevantes sobre os treinos a serem executados |
| Aluno | O aluno terá capacidade de visualizar as rotinas de treinos criadas para ele por um personal trainer mas também a possibilidade de criar uma rotina própria de treinos, bem como a de editar a rotina de treino criada pelo persona trainer. |

## **ABRANGÊNCIA E SISTEMAS SIMILARES**

O objetivo é que qualquer individuo possa utilizar o aplicativo de forma descomplicada, bastando apenas instalar e utilizar.
Existem diversos aplicativos com propostas semelhantes, mas com caracteristicas próprias, que facilitam por um lado, mas podem não ser tão interessantes em outros pontos. Exemplos sendo os aplicativos: **Gym Day** e **Trainiac**.

## **SUPOSIÇÕES E DEPENDÊNCIAS**

* **Suposições:**
  * O usuário terá um dispositivo rodando sistema operacional Android.
  * Acesso a internet no primeiro momento de uso ou de forma pontual para sincronização dos dados.
  * Usuário terá acesso a academias ou aparelhos para executar seus treinos.
* **Dependências:**
  * **Android (Versão 7+ | SDK25+):** Sistema Operacional do dispositivo.

# **ESTUDO DE VIABILIDADE**

* **Viabilidade Técnica:**
  * As tecnologias utilizadas (Node.js, TypeScript, Express, MongoDB, Kotlin) são maduras e amplamente utilizadas, com bom suporte da comunidade.  
  * Sistema Operacional alvo é amplamente utilizado, possui atualizações constantes com novas funcionalidades e também de segurança.
  * A criação de APIs RESTful com Express é consolidada.
  * A IDE Android Studio é oficial e de desenvolvimento nativo.
  * **Conclusão:** Tecnicamente, o projeto é viável.  
* **Viabilidade Econômica:**
  * **Custos de Desenvolvimento:** Tempo e mão de obra da equipe de desenvolvedores.  
  * **Custos de Infraestrutura:** Variam conforme a hospedagem. Pode ser baixo (self-hosted, Docker, Mongo Atlas gratuito) ou aumentar com serviços pagos (AWS).  
  * **Conclusão:** É economicamente viável.
* **Viabilidade Operacional:**
  * Requer capacidade do usuário saber instalar aplicativos por fora (APK/Sideload)
  * A manutenção envolve atualizações e monitoramento.
  * **Conclusão:** É operacionalmente viável com a administração técnica adequada.  
* **Viabilidade Legal:**
  * Utiliza bibliotecas com licenças permissivas (ISC, MIT, Apache).  
  * É preciso respeitar os termos de uso do Android.
  * Atenção à LGPD no tratamento dos dados dos usuários.  
  * **Conclusão:** Legalmente viável, respeitando as políticas de terceiros e leis aplicáveis.

# **METODOLOGIA ADOTADA NO DESENVOLVIMENTO**

Para o desenvolvimento, a equipe de desenvolvedores optou pela metodologia ágil, utilizando de **Kanban** com definição clara de tasks e atribuições diretas a cada um.

* **Visualização:** Usaremos um quadro com colunas como: Backlog, A Fazer, Em Andamento, Teste, Concluído.  
* **Limitar WIP:** Definirei um limite de tarefas "Em Andamento" para manter o foco.  
* **Gerenciar Fluxo:** Priorizarei as tarefas do backlog.  
* **Melhoria Contínua:** Revisarei o processo periodicamente.

# **REQUISITOS DO SOFTWARE**

Aqui estão os requisitos funcionais e não funcionais que definem o que o aplicativo faz e como ele deve operar.

## **REQUISITOS FUNCIONAIS**

| ID | NOME | DESCRIÇÃO | PRIORIDADE |
| :---- | :---- | :---- | :---- |
| RF001 | Login e Cadastro de usuátio |O sistema deve permitir cadastro e login de usuários | Alta |
| RF002 | Tipos de usuários | O usuário deve poder se cadastrar como Aluno ou Treinador | Alta|
| RF003 | informações de usuário |Cada perfil deve conter informações básicas (nome, foto, dados físicos no caso do aluno)| Alta|
| RF004 | Demonstração de exercícios |  O sistema deve exibir os exercícios do treino com um GIF.| Alta|
| RF005 | Mudança de treino | O aluno deve poder modificar pesos e séries durante a execução do treino | Alta|
| RF006 | Histórico de treino | O sistema deve registrar e exibir um histórico de treinos realizados | Média |
| RF007 | Treino próprio | O aluno deve poder criar um treino próprio sem necessidade de treinador | Alta |
| RF008 | Treino para alunos | O treinador deve poder montar treinos para seus alunos | Alta |
| RF009 | Alterar treino de alunos | O treinador deve poder editar treinos já criados para um aluno | Alta |
| RF0010 | Acompanhamento de progresso | O treinador deve ter acesso a estatísticas dos seus alunos (ex: evolução de carga, frequência)| Média |
| RF0011 | Lista de alunos | O treinador deve poder visualizar a lista de seus alunos | Alta |
| RF0012 | Chat de alunos |  O sistema deve disponibilizar um chat entre aluno e treinador| Alta |
| RF0013 | Disponibilidade do chat | O chat deve ser acessível tanto pelo perfil do aluno quanto pelo do treinador| Alta |
| RF0014 | Procurar treinador | O sistema deve permitir que ao logar pela primeira vez, o aluno pode procurar um treinador para si | Média |
| RF0015 | Histórico de treino | O sistema deve registrar e exibir um histórico de treinos realizados | Média |



## **REQUISITOS NÃO FUNCIONAIS**

| ID | NOME | DESCRIÇÃO | PRIORIDADE |
| :---- | :---- | :---- | :---- |
| RNF001 | ################ | ################ | ################ |
| RNF002 | ################ | ################ | ################ |

# **DIAGRAMA DE CASOS DE USO**

<!-- ![Casos de Uso]() -->

## **DESCRIÇÃO TEXTUAL DOS CASOS DE USO**

* **Personal Trainer:**  
  * **################**: ################
* **Aluno:**  
  * **################**: ################

## **ESPECIFICAÇÃO DOS CASOS DE USO**

### **UC-01 \- ################**

| UC-01 \- ################ |  |
| :---- | :---- |
| **Descrição/Objetivo:** | ################ |
| **Ator:** | ################ |
| **Pré-condições:** | ################ |
| **Pós-condições:** | ################ |
| **FLUXO PRINCIPAL / BÁSICO:** | ################ |
| **FLUXOS ALTERNATIVOS / EXCEÇÕES:** | ################ |

### **UC-02 \- ################**

| UC-02 \- ################ |  |
| :---- | :---- |
| **Descrição/Objetivo:** | ################ |
| **Ator:** | ################ |
| **Pré-condições:** | ################ |
| **Pós-condições:** | ################ |
| **FLUXO (Gerar):** | ################ |
| **FLUXO (Listar):** | ################ |
| **FLUXO (Revogar):** | ################ |
| **FLUXO (Inativar/Reativar):** | ################ |
| **FLUXO (Aprovar/Reprovar):** | ################ |
| **FLUXOS ALTERNATIVOS:** | ################ |

# **DIAGRAMA DE CLASSES**

<!-- ![Atividade Envio de Email]() -->

# **DIAGRAMA DE SEQUÊNCIA**

<!-- ![Sequência Cadastro]() -->

# **DIAGRAMA DE ATIVIDADES**

<!-- ![Atividade]() -->