# PRD — Reparo Expresso
**Product Requirements Document — Documentação Técnica e Funcional Completa**

> Versão: 1.0 | Data: 08/05/2026 | Autor: Michael Douglas

---

## Índice

1. [Visão Geral do Produto](#1-visão-geral-do-produto)
2. [Personas e Papéis de Usuário](#2-personas-e-papéis-de-usuário)
3. [Arquitetura e Stack Tecnológica](#3-arquitetura-e-stack-tecnológica)
4. [Estrutura de Rotas e Páginas](#4-estrutura-de-rotas-e-páginas)
5. [Módulo Cliente](#5-módulo-cliente)
6. [Módulo Prestador](#6-módulo-prestador)
7. [Módulo Administrativo](#7-módulo-administrativo)
8. [Módulo Parceiro](#8-módulo-parceiro)
9. [Sistema de Serviços](#9-sistema-de-serviços)
10. [Sistema de Pagamentos](#10-sistema-de-pagamentos)
11. [Sistema de Notificações](#11-sistema-de-notificações)
12. [Sistema de Mapas e Localização](#12-sistema-de-mapas-e-localização)
13. [Sistema de Fidelidade e Gamificação](#13-sistema-de-fidelidade-e-gamificação)
14. [Sistema de Suporte e Atendimento](#14-sistema-de-suporte-e-atendimento)
15. [Hooks Customizados](#15-hooks-customizados)
16. [Autenticação e Controle de Acesso](#16-autenticação-e-controle-de-acesso)
17. [Fluxos de Trabalho Principais](#17-fluxos-de-trabalho-principais)
18. [Componentes de UI Compartilhados](#18-componentes-de-ui-compartilhados)
19. [Glossário de Status](#19-glossário-de-status)

---

## 1. Visão Geral do Produto

**Reparo Expresso** é uma plataforma marketplace de serviços de reparo residencial e automotivo que conecta clientes a profissionais técnicos homologados pela **Escola Prática**. Funciona como um modelo tipo Uber para reparos — o cliente solicita, o prestador aceita, a plataforma gerencia toda a operação.

### Proposta de Valor
- **Para o cliente**: Acesso rápido a profissionais verificados, previsão de chegada em tempo real, pagamento digital seguro, rastreamento da OS.
- **Para o prestador**: Fluxo contínuo de chamados, gestão de agenda, controle de ganhos, sistema de reputação e premiação.
- **Para o admin**: Controle total da operação, gestão financeira, analytics de performance, suporte e compliance.

### Tipos de Serviço Suportados
| Categoria | Subcategorias |
|---|---|
| **Casa** | Elétrica, Hidráulica, Fechadura, Ar-Condicionado, Limpeza Caixa d'Água, Limpeza de Calha, Substituição de Telha, Limpeza de Telhado, Coifa de Parede, Conversão Vaso, Reparo Forro de Gesso, Desentupimento, Caça Vazamento, Check-up, Rejunte, Portão Eletrônico, Pressurizador |
| **Veículo** | Troca de Pneu, Recarga de Bateria, Conserto de Pneu, Reboque |

---

## 2. Personas e Papéis de Usuário

### 2.1 Cliente (role: `user`)
- Pessoa física que solicita serviços de reparo
- Pode ser anônimo para navegar, mas precisa de conta para solicitar
- Acessa histórico de pedidos, favoritos, carteira, programa de fidelidade

### 2.2 Prestador (role: `provider`)
- Técnico autônomo ou empresa homologado pela Escola Prática
- Pode ser Pessoa Física ou Pessoa Jurídica (com CNPJ)
- Gerencia disponibilidade, agenda, ganhos e reputação
- Recebe alertas sonoros de novos chamados

### 2.3 Administrador (role: `admin`)
- Equipe interna com acesso total à plataforma
- Gerencia prestadores, clientes, finanças, suporte e analytics
- Acesso ao painel `/admin` e ao dashboard `/admin-dashboard`

### 2.4 Atendente de Suporte (role: `attendant`)
- Subpapel administrativo com acesso restrito ao módulo de tickets
- Login gerado automaticamente pelo sistema
- Recebe alertas sonoros e push de novos tickets

### 2.5 Parceiro (role: `partner`)
- Lojistas e vendedores que integram à rede
- Cadastro via fluxo dedicado `/cadastro-parceiro`
- Acesso a comissões e gestão de loja

---

## 3. Arquitetura e Stack Tecnológica

### 3.1 Frontend
| Tecnologia | Versão | Uso |
|---|---|---|
| React | 18.2.0 | Framework principal |
| Vite | 6.1.0 | Build tool e dev server |
| React Router DOM | 6.26.0 | Roteamento SPA |
| Tailwind CSS | 3.4.17 | Estilização utility-first |
| Framer Motion | 11.16.4 | Animações e transições |
| Radix UI | múltiplas | Componentes headless acessíveis |

### 3.2 Backend / BaaS
| Tecnologia | Versão | Uso |
|---|---|---|
| Base44 SDK | 0.8.27 | Backend-as-a-Service (auth, entities, realtime) |

### 3.3 Estado e Data Fetching
| Tecnologia | Versão | Uso |
|---|---|---|
| TanStack React Query | 5.84.1 | Cache e sincronização de dados do servidor |
| React Context API | — | Estado global de autenticação e notificações |
| React Hook Form | 7.54.2 | Gerenciamento de formulários |
| Zod | 3.24.2 | Validação de schemas |

### 3.4 Pagamentos
| Tecnologia | Versão | Uso |
|---|---|---|
| Stripe (React Stripe JS) | 3.0.0 | Pagamento com cartão de crédito |
| PIX | — | Pagamento instantâneo via QR Code |

### 3.5 Mapas e Localização
| Tecnologia | Versão | Uso |
|---|---|---|
| Leaflet | 1.9.4 | Renderização de mapas interativos |
| React Leaflet | 4.2.1 | Componentes React para Leaflet |
| Nominatim (OpenStreetMap) | — | Geocodificação reversa (sem API key) |

### 3.6 Notificações
| Tecnologia | Uso |
|---|---|
| Web Push API + Service Worker | Push notifications nativas do browser |
| Browser Notification API | Notificações do sistema operacional |
| Sonner | Toast notifications inline |
| React Hot Toast | Toasts alternativos |
| Web Audio API | Alertas sonoros para prestadores e atendentes |

### 3.7 Utilitários e Export
| Tecnologia | Versão | Uso |
|---|---|---|
| jsPDF | 4.0.0 | Geração de PDFs (notas fiscais, relatórios) |
| html2canvas | 1.4.1 | Captura de tela para PDF |
| Canvas Confetti | 1.9.4 | Animações de celebração (gamificação) |
| Recharts | 2.15.4 | Gráficos e dashboards analíticos |
| Date-fns | 3.6.0 | Manipulação de datas |
| Lodash | 4.17.21 | Funções utilitárias |
| Lucide React | 0.475.0 | Ícones SVG |

---

## 4. Estrutura de Rotas e Páginas

### 4.1 Rotas Públicas
| Rota | Componente | Descrição |
|---|---|---|
| `/` | `Home.jsx` | Página inicial — seleção de serviços |
| `/como-funciona` | `HowItWorks.jsx` | Tutorial de uso da plataforma |
| `/categorias` | `Categories.jsx` | Browse de categorias de serviço |
| `/profissionais` | `Professionals.jsx` | Listagem de profissionais |
| `/profissional/:id` | `ProfessionalProfile.jsx` | Perfil detalhado do profissional |
| `/termos-cliente` | `TermosCliente.jsx` | Termos e condições do cliente |
| `/termos-prestador` | `TermosPrestador.jsx` | Termos e condições do prestador |

### 4.2 Rotas Autenticadas (Cliente)
| Rota | Componente | Descrição |
|---|---|---|
| `/solicitar` | `SolicitarServico.jsx` | Fluxo de solicitação de serviço |
| `/acompanhar/:id` | `AcompanharServico.jsx` | Rastreamento em tempo real da OS |
| `/meus-pedidos` | `MeusPedidos.jsx` | Histórico de pedidos do cliente |
| `/meus-servicos` | `MeusServicos.jsx` | Serviços ativos |
| `/perfil` | `UserProfile.jsx` | Perfil do usuário |
| `/carteira` | `Wallet.jsx` | Carteira digital |
| `/fidelidade` | `LoyaltyRewards.jsx` | Programa de pontos e recompensas |
| `/cadastro` | `ClientRegister.jsx` | Onboarding do cliente |
| `/dossie` | `ClienteDossie.jsx` | Dossiê e histórico analítico do cliente |

### 4.3 Rotas do Prestador
| Rota | Componente | Descrição |
|---|---|---|
| `/prestador` | `ProviderApp.jsx` | App principal do prestador |
| `/prestador/dashboard` | `ProviderDashboard.jsx` | Dashboard analítico do prestador |
| `/prestador/perfil` | `ProviderProfile.jsx` | Gerenciamento de perfil |
| `/prestador/agenda` | `ProviderSchedule.jsx` | Gestão de agenda e disponibilidade |
| `/prestador/ganhos` | `ProviderEarnings.jsx` | Rastreamento de ganhos e saques |
| `/prestador/premios` | `ProviderAwards.jsx` | Sistema de premiação e gamificação |
| `/prestador/mapa` | `ProviderLocationMap.jsx` | Mapa da área de atuação |
| `/cadastro-prestador` | `ProviderRegister.jsx` | Onboarding do prestador |
| `/cadastro-cnpj` | `ProviderCNPJRegistration.jsx` | Registro de CNPJ para PJ |

### 4.4 Rotas Administrativas
| Rota | Componente | Acesso |
|---|---|---|
| `/admin` | `AdminPanel.jsx` | Admin |
| `/admin-dashboard` | `DashboardAdmin.jsx` | Admin |
| `/dashboard` | `Dashboard.jsx` | Admin/Profissional |

### 4.5 Rotas Parceiro
| Rota | Componente | Descrição |
|---|---|---|
| `/cadastro-parceiro` | `PartnerRegister.jsx` | Onboarding de parceiro |
| `/orcamento` | `RequestQuote.jsx` | Solicitação de orçamento |

---

## 5. Módulo Cliente

### 5.1 Home (Página Inicial) — `Home.jsx`

**Splash Screen**
- Exibida na primeira carga da sessão
- Imagem da marca em fullscreen, fundo dark
- Toque/clique para continuar
- Animação de entrada com Framer Motion

**Tabs Principais**
O app é organizado em 5 abas na tela inicial:

| Aba | Conteúdo | Visível para |
|---|---|---|
| 👤 Cliente | Grid de serviços, busca, OS ativas | Todos |
| 🔧 Prestador | Benefícios e CTA de cadastro | Todos |
| 🏪 Parceiro | Benefícios e CTA de parceria | Todos |
| ❤️ Favoritos | Lista de prestadores favoritos | Usuários logados |
| 🎁 Ganhe | Referral card e programa de indicação | Usuários logados |

**Banner de OS Ativas**
- Exibido automaticamente para usuários com serviços em andamento
- Mostra status em tempo real com indicador pulsante
- Exibe tempo estimado de chegada (quando disponível)
- Nome do prestador designado
- Clique navega para `/acompanhar/:id`

**Grid de Serviços**
- **Sub-aba Casa**: Grid 4 colunas com 17 tipos de serviço
- **Sub-aba Veículo**: Grid 3 colunas com 4 tipos de serviço
- Busca em tempo real por nome/subtítulo (`ServiceSearch`)
- Cada card exibe: ícone colorido, nome do serviço, preço ou subtítulo

**Modais de Serviço Especializados**

*Modal Elétrica*:
- Lista de 6 subtipos (Chuveiro, Tomada, QDC, Curto, Lâmpada, Ventilador)
- Pode ser minimizado para canto da tela
- Seleção leva ao detalhe com preço e botão de agendamento

*Modal Hidráulica*:
- Lista de 5 subtipos (Cano Furado, Registro, Torneira, Vaso Sanitário, Descarga)
- Pode ser minimizado
- Seleção leva ao detalhe com preço e botão de agendamento

*Modal de Agendamento*:
- Dois modos: **Agora** (imediato, ≤5 min para conectar) ou **Agendar** (data/hora)
- Fluxo imediato confirma diretamente e abre `PaymentModal`
- Fluxo agendado usa `AvailableScheduleSelector` para seleção de data

**Botão Frota ao Vivo**
- Abre `FleetMap` com localização em tempo real da frota (Fiorino, Reboque, Moto)
- Badge "Ao vivo" com indicador verde pulsante

**Seção de Confiança**
- Três cards: Homologados, Rápido, Avaliados
- Com ícones em container âmbar

---

### 5.2 Solicitar Serviço — `SolicitarServico.jsx`

Fluxo multi-step para criação de uma Ordem de Serviço.

**Steps do Fluxo**
1. **Verificação de perfil** — checa se cliente tem dados completos
2. **Seleção do tipo de serviço** — com categorização (casa/veículo)
3. **Modais especializados** (quando aplicável):
   - TV: seleção do tamanho (32"/43"/50"+)
   - Caixa d'Água: capacidade em litros
   - Pressurizador: formulário de viabilidade (`PressurizadorFeasibilityForm`)
   - Válvula Transferidora: modal dedicado (`ValvulaTransfModal`)
4. **Localização** — mapa interativo ou entrada de endereço manual
5. **Nível de urgência** — Agora / Hoje / Esta Semana
6. **Upload de fotos** — evidências do problema
7. **Busca de prestadores** — filtra por proximidade, disponibilidade e serviço
8. **Agendamento** — `AvailableScheduleSelector` para serviços não imediatos
9. **Perguntas especializadas** — para Reboque (`TowServiceQuestions`)
10. **Pagamento** — `PaymentModal` com Stripe ou PIX + cupom

**Estados da OS após criação**
`aguardando` → `aceito` → `a_caminho` → `em_andamento` → `em_espera` → `concluido`

---

### 5.3 Acompanhar Serviço — `AcompanharServico.jsx`

**Rastreamento em tempo real**
- Status atual com progress bar visual
- Tempo estimado de chegada (quando prestador a caminho)
- Nome, foto e avaliação do prestador
- Mapa com localização ao vivo (`LocationTracker`)

**Chat integrado**
- `ServiceChat` para comunicação direta com o prestador
- Notificação de novas mensagens

**Checklist de progresso**
- `ServiceChecklist` mostrando etapas de execução

**Aprovação de orçamento**
- `EstimateApprovalPanel` — quando prestador envia estimativa de peças/custo adicional
- Cliente aprova ou recusa com notificação sonora

**Avaliação e encerramento**
- `RatingModal` — 5 estrelas + comentário após conclusão
- `SatisfactionSurveyModal` — pesquisa pós-serviço opcional

**Garantia**
- `WarrantyBanner` — exibe prazo de garantia do serviço concluído

---

### 5.4 Meus Pedidos — `MeusPedidos.jsx`

- Listagem de todos os pedidos do cliente
- Filtros: Novos / Ativos / Concluídos
- Card detalhado por OS: tipo, data, prestador, status, valor
- Acesso rápido ao tracking de OS ativas

---

### 5.5 Meus Serviços — `MeusServicos.jsx`

- Serviços em andamento com detalhes completos
- Informações do prestador, localização, chat
- Acesso a rastreamento em tempo real

---

### 5.6 Perfil do Usuário — `UserProfile.jsx`

- Edição de nome, telefone, email, foto
- Endereços salvos
- Configurações de notificação
- Acesso à carteira e programa de fidelidade

---

### 5.7 Carteira — `Wallet.jsx`

**Componentes**
- `WalletCard` — exibe saldo disponível
- `TransactionList` — histórico de movimentações (créditos, débitos, cashback)
- `WithdrawModal` — solicitação de saque (para prestadores)

**Funcionalidades**
- Visualização de saldo
- Histórico de transações paginado
- Recarga via Stripe ou PIX
- Transferência de cashback para saldo

---

### 5.8 Programa de Fidelidade — `LoyaltyRewards.jsx`

**Sistema de Pontos**
- Pontos acumulados por serviço contratado
- Pontos por indicações bem-sucedidas

**Resgates disponíveis**
| Pontos | Benefício |
|---|---|
| 100 | Desconto de R$ 10 no próximo serviço |
| 250 | Desconto de R$ 25 |
| 500 | Serviço gratuito de até R$ 50 |
| 1000 | Serviço gratuito premium |

---

### 5.9 Cadastro Cliente — `ClientRegister.jsx`

- Formulário de dados pessoais: nome, email, telefone, CPF
- Validação com Zod
- Aceite de termos de uso
- Upload de foto de perfil

---

### 5.10 Dossiê do Cliente — `ClienteDossie.jsx`

- Histórico completo de serviços
- Analytics de gastos por categoria e período
- Dados para uso administrativo

---

### 5.11 Referral (Indicação) — `ReferralCard.jsx`

- Código de indicação editável pelo usuário
- Botão de copiar e compartilhar (WhatsApp, etc.)
- Estatísticas: indicações pendentes e convertidas
- Bônus: R$ 10 por indicação concluída

---

## 6. Módulo Prestador

### 6.1 App do Prestador — `ProviderApp.jsx`

Tela principal após login do prestador.

**Fila de Chamados**
- Lista de OS com status `aguardando` disponíveis para aceite
- `NewJobBanner` — banner de alerta ao topo
- `NewServiceFullscreenModal` — modal fullscreen com detalhes do novo chamado
- Botões **Aceitar** / **Recusar** (com `DeclineReasonModal`)
- Alerta sonoro: buzina de caminhão em loop (2 segundos, 100–135 Hz)

**Gestão de Disponibilidade**
- Toggle de online/offline
- Aceite de termos pendentes (`ProviderTermsNotificationBanner`)
- Visualização de agenda do dia

**Histórico de Jobs**
- Lista de serviços aceitos, em andamento e concluídos
- Acesso rápido a detalhes de cada OS

---

### 6.2 ActiveJobCard — `ActiveJobCard.jsx`

Componente central para gerenciamento de OS ativa pelo prestador.

**Funcionalidades**
- Exibe todos os dados da OS: endereço, tipo, cliente, horário
- Mapa com localização do cliente
- Chat em tempo real com o cliente
- Checklist de progresso da execução
- Alertas de chegada iminente (≤ 2 minutos)
- Mudança de status: aceitar → a_caminho → em_andamento → concluído
- Envio de estimativa de peças/custos adicionais
- Upload de fotos de conclusão
- `SignaturePad` — captura de assinatura digital do cliente
- Botão de encerramento da OS

---

### 6.3 Dashboard do Prestador — `ProviderDashboard.jsx`

**Métricas exibidas**
- Total de ganhos (semanal/mensal)
- Serviços concluídos
- Jobs ativos
- Avaliação média
- Histórico de pagamentos recebidos

**Configurações**
- Toggle de disponibilidade global
- Definição de horários de trabalho por dia da semana
- Máximo de atendimentos simultâneos

---

### 6.4 Perfil do Prestador — `ProviderProfile.jsx`

- Edição de dados pessoais e profissionais
- Upload e edição de fotos (`ProviderPhotoEditor`)
- Especialidades e serviços oferecidos
- Área de atuação (raio de km)
- Badge de nível (`ProviderLevelBadge`)
- QR Code para review no Google (`GoogleReviewQRCode`)

---

### 6.5 Agenda — `ProviderSchedule.jsx`

- Calendário visual de serviços agendados
- Configuração de disponibilidade por dia/hora
- Marcação de indisponibilidades (`ProviderUnavailabilitySection`)
- Visualização de slots disponíveis

---

### 6.6 Ganhos — `ProviderEarnings.jsx`

- Extrato detalhado por período
- Valor bruto, desconto da plataforma, valor líquido
- Histórico de repasses
- `ProviderEarningsWithdrawal` — solicitação de saque
- `ProviderReserveFund` — visualização do fundo de reserva retido

---

### 6.7 Prêmios e Gamificação — `ProviderAwards.jsx`

**Níveis de Prestador**

| Nível | Nome | Requisitos |
|---|---|---|
| 1 | Iniciante | 0–9 serviços |
| 2 | Pro | 10–49 serviços |
| 3 | Elite | 50–199 serviços |
| 4 | Lendário | 200–499 serviços |
| 5 | Imperador | 500+ serviços |

**Funcionalidades**
- Ranking de prestadores da plataforma
- Bônus por nível (percentual adicional por serviço)
- Indicadores de progresso para próximo nível
- Conquistas e badges (`AchievementsPanel`)
- Histórico de bônus recebidos (`BonusHistoryPanel`)
- `CashbackPanel` — cashback acumulado por indicação de amigos
- `ProviderLevelIncentive` — incentivos para subir de nível

---

### 6.8 Cadastro de Prestador — `ProviderRegister.jsx`

**Etapas de onboarding**
1. Dados pessoais (nome, CPF, telefone, email)
2. Upload de documentos (RG/CNH frente e verso)
3. Upload de foto profissional
4. Seleção de especialidades e serviços oferecidos
5. Área de atuação e localização
6. Aceite de termos da plataforma
7. Aceite de termos da Escola Prática

**Validações**
- Documentos passam por revisão manual do admin (`ProviderDocumentReview`)
- Fotos precisam de aprovação (`ProviderPhotosApproval`)
- Serviços oferecidos revisados (`ProviderServiceReview`)

---

### 6.9 Registro CNPJ — `ProviderCNPJRegistration.jsx`

- Formulário para prestadores que são Pessoa Jurídica
- CNPJ, Razão Social, IE
- Dados bancários para repasse PJ
- Integração com status de aprovação

---

### 6.10 Mapa de Localização — `ProviderLocationMap.jsx`

- Mapa interativo para definir área de atuação
- Raio de atendimento ajustável
- Visualização dos bairros/regiões cobertas

---

## 7. Módulo Administrativo

### 7.1 Painel Admin — `AdminPanel.jsx`

Central de controle da operação com acesso via role `admin`.

**Gestão de Serviços**
- Monitoramento de todas as OS abertas, ativas e concluídas
- Atualização manual de status de qualquer OS
- Cancelamento de serviços com log de motivo
- Confirmação de conclusão com checklist

**Gestão de Prestadores**
- `ProviderDetailsModal` — visualizar/editar perfil completo
- Aprovação de documentos (`ProviderDocumentReview`)
- Aprovação de fotos (`ProviderPhotosApproval`)
- Revisão de serviços cadastrados (`ProviderServiceReview`)
- Gerenciamento de termos (`ProviderTermsManager`)
- Blacklist/bloqueio de prestadores

**Gestão de Clientes**
- `ClientHistoryPanel` — histórico completo de serviços
- `ClientConsultaAdmin` — busca rápida por email/CPF/telefone
- `ClientBlacklist` — blacklist de clientes problemáticos
- `ClientTermsManager` — gestão dos termos aceitos

**Ações de Reversão**
- `UndoProviderAction` — reverter ações feitas em prestadores
- `RiskActionModal` — avaliação antes de ações de risco
- `ClosingAlertModal` — alerta ao fechar OS

---

### 7.2 Dashboard Administrativo — `DashboardAdmin.jsx`

**Tabs de Analytics**

1. **Visão Geral** (`Analytics.jsx`):
   - Receita total por período (gráfico de linha)
   - Número de serviços realizados
   - Taxa de cancelamento
   - NPS e avaliação média
   - Top prestadores por volume e nota
   - Volume por categoria de serviço
   - Gráficos Recharts interativos

2. **Métricas de Serviço** (`ServiceMetrics.jsx`):
   - Tempo médio de aceitação de chamados
   - Tempo médio de chegada
   - Tempo médio de execução
   - Taxa de conclusão por tipo de serviço

3. **Risco Operacional** (`DelayRiskChart.jsx`):
   - Identificação de OS com risco de atraso
   - Alertas de SLA em risco

4. **Serviços Expirados** (`ExpiringServicesAlert.jsx`):
   - OS próximas do prazo de garantia
   - Alertas automáticos de renovação

5. **Auto-Encerramento** (`AutoClosingPanel.jsx`):
   - Configuração de regras de auto-fechamento
   - OS candidatas ao fechamento automático

6. **Calendário** (`ScheduledCalendar.jsx`):
   - Visualização de todos os serviços agendados
   - `ScheduledServicesOptimizer` — otimizador automático de alocação

---

### 7.3 Gestão Financeira

**Faturas** — `InvoicesAdmin.jsx`
- Geração de notas fiscais em PDF
- Listagem de faturas por período
- Exportação de relatórios financeiros

**Repasses a Prestadores** — `ProviderRepasse.jsx`
- Cálculo de comissão da plataforma por serviço
- Marcação de repasses realizados
- Histórico de pagamentos por prestador

**Reembolsos** — `ReembolsosRepasses.jsx`
- Gestão de pedidos de reembolso
- Aprovação/recusa com justificativa
- Devolução via carteira ou PIX

**Fechamento Quinzenal** — `BiweeklyClosingAdmin.jsx`
- Consolidação de todos os repasses do período
- Geração de relatório de fechamento
- Aprovação para liberação de pagamentos

**Fundo de Reserva** — `AdminReserveFundDashboard.jsx`
- Gestão do fundo retido por garantias
- Liberação após período de garantia
- Dashboard de reservas por prestador

**Configurações de Pagamento** — `PaymentSettings.jsx`
- Percentual da comissão da plataforma
- Configurações de gateway (Stripe/PIX)
- Dados bancários para repasses

---

### 7.4 Gestão de Preços

**Por Serviço** — `ServicePricing.jsx`
- Preço mínimo e máximo por tipo de serviço
- Base para exibição ao cliente

**Por Categoria** — `ServicePricingByCategory.jsx`
- Configuração de faixas por categoria (casa/veículo)

**Por Região** — `ServicePricingByRegion.jsx`
- Preços diferenciados por cidade/bairro

**Preços de Reboque** — `TowPricing.jsx`
- Tabela de preços por km rodado
- Tipos de veículo rebocado

---

### 7.5 Promoções e Cupons

**Gestão de Cupons** — `CouponsAdmin.jsx`
| Campo | Descrição |
|---|---|
| Código | String única (ex: REPARO10) |
| Tipo de desconto | Percentual ou valor fixo |
| Valor | Percentagem ou R$ |
| Validade | Data de expiração |
| Limite de uso | Usos totais ou por usuário |
| Restrição | Prestador específico ou todos |
| Serviço aplicável | Tipo de serviço ou todos |

**Analytics de Cupons** — `CouponUsagePanel.jsx`
- Quantidade de resgates por cupom
- Valor total de desconto concedido
- Taxa de conversão

---

### 7.6 Gestão de Checklists — `ChecklistsAdmin.jsx`

- Criação de checklists de conclusão por tipo de serviço
- Itens obrigatórios vs. opcionais
- Integração com `ServiceChecklist` no app do prestador

---

### 7.7 Pontos Adicionais — `AdditionalPointsAdmin.jsx`

- Atribuição manual de pontos de fidelidade a clientes
- Histórico de atribuições por operador
- Justificativa obrigatória

---

### 7.8 Log de Atividades — `ActivityLog.jsx`

- Registro imutável de todas as ações administrativas
- Campos: ação, operador, OS/entidade afetada, data/hora, IP
- Filtros por operador, tipo de ação e período
- Exportação para CSV

---

## 8. Módulo Parceiro

### 8.1 Cadastro Parceiro — `PartnerRegister.jsx`

**Perfis suportados**
- **Lojista**: gerencia loja e catálogo de produtos
- **Vendedor**: comercializa serviços/produtos pela plataforma

**Etapas**
1. Dados pessoais/empresariais
2. Tipo de parceria (lojista/vendedor)
3. Documentação (CNPJ ou CPF)
4. Aceite de contrato de parceria

### 8.2 Benefícios do Parceiro
- Acesso a comissões por vendas
- Badge de credibilidade na plataforma
- Painel de métricas de performance
- Integração com fluxo de pagamento da plataforma

---

## 9. Sistema de Serviços

### 9.1 Tipos de Serviço — `serviceTypes.js`

**21 tipos cadastrados, divididos em 2 categorias:**

**Categoria Casa (17 tipos):**

| Tipo | Label | Detalhe |
|---|---|---|
| `eletrica` | Elétrica | Abre modal com 6 subtipos |
| `hidraulica` | Hidráulica | Abre modal com 5 subtipos |
| `fechadura` | Fechadura | Serviços de fechadura |
| `ar_condicionado` | Ar Condicionado | Instalação e manutenção |
| `limpeza_caixa_dagua` | Limpeza Caixa d'Água | Requer informação de capacidade |
| `limpeza_calha` | Limpeza de Calha | Desobstrução |
| `substituicao_telha` | Substituição de Telha | Reparos de cobertura |
| `limpeza_telhado` | Limpeza de Telhado | Higienização de cobertura |
| `instalacao_coifa_parede` | Coifa de Parede | Instalação de coifa |
| `conversao_vaso_coplado` | Conversão Vaso CX Acoplada | Adaptação sanitária |
| `reparo_forro_gesso` | Reparo Forro de Gesso | Manutenção de forro |
| `desentupimento` | Desentupimento | Desobstrução rápida |
| `caca_vazamento` | Caça Vazamento | Detecção de vazamentos |
| `checkup` | Check-up | Vistoria completa da residência |
| `rejunte` | Rejunte | Rejunte de azulejos |
| `portao_eletronico` | Portão Eletrônico | Instalação e reparo |
| `pressurizador` | Pressurizador | Requer formulário de viabilidade |

**Categoria Veículo (4 tipos):**

| Tipo | Label | Detalhe |
|---|---|---|
| `troca_pneu` | Troca de Pneu | Pneus novos ou usados |
| `recarga_bateria` | Recarga Bateria | Carregamento rápido no local |
| `conserto_pneu` | Conserto Pneu | Reparo de furos |
| `reboque` | Reboque | Requer perguntas específicas (`TowServiceQuestions`) |

### 9.2 Subtipos de Elétrica

| Subtipo | Descrição | Preço estimado |
|---|---|---|
| `eletrica_chuveiro` | Chuveiro | R$ 80–R$ 150 |
| `eletrica_tomada` | Tomada | R$ 60–R$ 120 |
| `eletrica_qdc` | Quadro de Distribuição | R$ 100–R$ 200 |
| `eletrica_curto` | Curto-circuito | R$ 120–R$ 250 |
| `eletrica_lampada` | Troca de Lâmpada | R$ 40–R$ 80 |
| `eletrica_ventilador_teto` | Ventilador de Teto | R$ 80–R$ 180 |

### 9.3 Subtipos de Hidráulica

| Subtipo | Descrição | Preço estimado |
|---|---|---|
| `hidraulica_cano_furado` | Cano Furado | R$ 80–R$ 200 |
| `hidraulica_registro` | Registro de Gaveta/Pressão | R$ 60–R$ 150 |
| `hidraulica_torneira` | Torneira | R$ 60–R$ 150 |
| `hidraulica_vaso` | Reparo de Vaso Sanitário | R$ 80–R$ 200 |
| `hidraulica_descarga` | Descarga | R$ 100–R$ 250 |

### 9.4 Ciclo de Vida de uma OS

```
[NOVO PEDIDO]
      │
      ▼
 aguardando ──── (timeout / cancelamento) ──► cancelado
      │
      ▼
   aceito ────── (prestador desiste) ────────► aguardando
      │
      ▼
  a_caminho
      │
      ▼
em_andamento ── (aguardando peças) ──► em_espera
      │                                      │
      │◄─────────────────────────────────────┘
      ▼
  concluido
```

### 9.5 Status de OS — Labels e Cores

| Status | Label | Estilo |
|---|---|---|
| `aguardando` | Procurando prestador... | Âmbar |
| `aceito` | Prestador confirmado | Azul |
| `a_caminho` | Prestador a caminho! | Laranja |
| `em_andamento` | Em execução | Verde (primary) |
| `em_espera` | Em espera (peças) | Âmbar |
| `concluido` | Concluído | Verde |
| `cancelado` | Cancelado | Vermelho |

---

## 10. Sistema de Pagamentos

### 10.1 PaymentModal — `PaymentModal.jsx`

**Métodos suportados**
- **Cartão de Crédito** (Stripe Elements)
- **PIX** (QR Code gerado dinamicamente)

**Fluxo de pagamento**
1. Exibe resumo do serviço com valor
2. Campo de cupom (`CouponInput`) com validação em tempo real
3. Desconto aplicado automaticamente
4. Seleção do método de pagamento
5. Processamento seguro (Stripe ou PIX)
6. Confirmação e criação da OS no sistema

**Validações de cupom**
- Código existente e ativo
- Dentro do prazo de validade
- Dentro do limite de uso
- Compatível com o tipo de serviço
- Não usado anteriormente pelo usuário (se limite unitário)

### 10.2 PixPaymentModal — `PixPaymentModal.jsx`

- Geração de QR Code PIX
- Chave PIX e código copia-e-cola
- Timer de expiração do QR Code (5 minutos)
- Polling de confirmação de pagamento
- Confirmação automática ao detectar pagamento

### 10.3 Carteira Digital — `Wallet.jsx`

- **Saldo disponível**: créditos, cashback, bônus
- **Histórico**: todas as movimentações com tipo e data
- **Recarga**: via Stripe ou PIX
- **Saque** (prestadores): transferência para conta bancária

### 10.4 Gestão Financeira Admin

**Comissão da plataforma**: configurável por tipo de serviço ou percentual global  
**Repasse**: quinzenal ou sob demanda para prestadores aprovados  
**Fundo de reserva**: percentual retido por período de garantia

---

## 11. Sistema de Notificações

### 11.1 NotificationCenter — `NotificationCenter.jsx`

- Ícone de sino na navbar com badge de não lidas
- Dropdown com lista de notificações recentes
- Marcar como lida (individual e todas)
- Limpar todas
- Categorias: status de OS, mensagens, promoções, sistema

### 11.2 Push Notifications — `usePushNotifications.js`

**Gatilhos de push**
| Evento | Mensagem |
|---|---|
| OS aceita | "Prestador confirmado para seu serviço" |
| Prestador a caminho | "Seu prestador está a caminho!" |
| OS concluída | "Serviço concluído! Avalie o prestador" |
| OS cancelada | "Seu serviço foi cancelado" |
| Nova mensagem | "Você tem uma nova mensagem" |
| Lembrete de agendamento | "Serviço agendado para hoje" |

**Implementação técnica**
- Service Worker para recepção em background
- VAPID keys para autenticação
- Subscrição salva no registro do usuário/prestador

### 11.3 Alertas Sonoros

**Para Prestadores** — `useNewJobAlert.js`
- Frequência: 100–135 Hz, padrão de buzina de caminhão
- Duração: loop de 2 segundos
- Gatilho: nova OS com status `aguardando`
- Stop: `window.__stopProviderHorn()`
- Clear: `window.__clearSeenJobIds()`

**Para Atendentes** — `useAttendantPush.js`
| Evento | Tom | Duração |
|---|---|---|
| Novo ticket | 880 Hz | 0.3s |
| Resposta do cliente | 660 Hz | 0.3s |
| Urgente | 1100 Hz duplo | 0.6s |
| Expirando (>22h) | 660 Hz | alerta especial |

---

## 12. Sistema de Mapas e Localização

### 12.1 FleetMap — `FleetMap.jsx`

- Mapa Leaflet em fullscreen
- Marcadores em tempo real da frota
- Filtros por tipo de veículo: Fiorino, Reboque, Moto
- Localização do usuário
- Botão de refresh
- Fechar mapa (volta para home)

### 12.2 LocationTracker — `LocationTracker.jsx`

- Rastreamento GPS do prestador durante deslocamento
- Atualização periódica da posição
- Exibido no `AcompanharServico` para o cliente

### 12.3 NearbyProvidersMap — `NearbyProvidersMap.jsx`

- Mapa de prestadores disponíveis na região
- Filtro por tipo de serviço
- Exibe distância e tempo estimado de chegada

### 12.4 Geolocalização — `useGeolocation.js`

- Usa API nativa do browser (`navigator.geolocation`)
- Geocodificação reversa via Nominatim/OpenStreetMap
- Retorna: latitude, longitude, logradouro, bairro, cidade, estado
- Não requer API key
- Tratamento de permissão negada

### 12.5 Prestadores Próximos — `useNearbyProviders.js`

- Cálculo de distância via fórmula de Haversine
- Raio padrão: 20 km
- Filtros: status `aprovado`, disponibilidade `online`
- Estimativa de chegada: 30 km/h de velocidade média
- Resultado ordenado por distância

---

## 13. Sistema de Fidelidade e Gamificação

### 13.1 Cashback — `CashbackPanel.jsx`

**Níveis e bônus por serviço**

| Nível | Nome | Bônus/Serviço |
|---|---|---|
| 1 | Iniciante | 2% |
| 2 | Pro | 3% |
| 3 | Elite | 4% |
| 4 | Lendário | 5% |
| 5 | Imperador | 7% |

- Bônus por indicação de amigos
- Saldo de cashback resgatável na carteira
- Histórico de acúmulo

### 13.2 Referral — `ReferralCard.jsx`

- Código personalizável pelo usuário
- Link de convite compartilhável
- Rastreamento de conversões
- R$ 10 de bônus por indicação que completa o primeiro serviço
- Estatísticas: pendentes vs. convertidas

### 13.3 Achievements — `AchievementsPanel.jsx`

- Conquistas desbloqueadas por marcos
- Badges visuais (ex: "Primeiro Serviço", "10 Serviços", "Super Indicador")
- Notificação de nova conquista com confetti (`canvas-confetti`)

### 13.4 Gamificação de Prestadores — `ProviderAwards.jsx`

- Ranking público de prestadores por volume/nota
- Sistema de níveis com benefícios crescentes
- Bônus percentual automático na comissão
- `ProviderLevelIncentive` — mostra o que o próximo nível oferece

---

## 14. Sistema de Suporte e Atendimento

### 14.1 Tickets Admin — `TicketsAdmin.jsx`

**Workflow de ticket**
```
aberto → em_atendimento → resolvido → fechado
```

**Funcionalidades**
- Login de atendente com credenciais geradas automaticamente
- Painel de tickets com filtros de prioridade e status
- Respostas rápidas (`QuickReplies`) com templates pré-definidos
- Histórico do cliente para contexto
- Histórico de atendentes (`AttendantsManager`)
- Tempo de resposta monitorado (SLA)
- Tickets urgentes destacados
- Alertas de ticket expirando (>22h sem resposta)

### 14.2 Atendentes — `AttendantsManager.jsx`

- Criação de atendentes com login/senha gerados automaticamente
- Ativação/desativação de atendentes
- Log de atividade por atendente
- Gerenciamento de permissões

### 14.3 Suporte para Clientes — `ClientTicketForm.jsx`

- Formulário de abertura de chamado
- Categorias: problema com serviço, pagamento, prestador, outro
- Upload de evidências (fotos)
- Acompanhamento do status do ticket

### 14.4 Suporte para Prestadores — `ProviderTicketForm.jsx`

- Formulário específico para prestadores
- Categorias: pagamento, cliente, sistema, documentação
- Acesso ao histórico de tickets abertos

---

## 15. Hooks Customizados

### `useAuth()`
**Arquivo**: `src/lib/AuthContext.jsx`

| Retorno | Tipo | Descrição |
|---|---|---|
| `user` | Object | Dados do usuário logado |
| `isAuthenticated` | Boolean | Sessão ativa |
| `isLoadingAuth` | Boolean | Carregando estado de auth |
| `authError` | String/null | Erro de autenticação |
| `appPublicSettings` | Object | Configurações públicas do app |
| `logout(shouldRedirect)` | Function | Encerra sessão |
| `navigateToLogin()` | Function | Redireciona para login |
| `checkAppState()` | Function | Verifica estado atual |

**Tratamento de erros**
- `auth_required` → redireciona para login
- `user_not_registered` → exibe `UserNotRegisteredError`
- HTTP 401/403 → logout automático

---

### `useGeolocation()`
**Arquivo**: `src/hooks/useGeolocation.js`

| Retorno | Tipo | Descrição |
|---|---|---|
| `latitude` | Number | Latitude atual |
| `longitude` | Number | Longitude atual |
| `address` | String | Logradouro |
| `city` | String | Cidade |
| `state` | String | Estado |
| `fullAddress` | String | Endereço completo |
| `error` | String/null | Erro (ex: permissão negada) |
| `loading` | Boolean | Aguardando localização |

---

### `useNearbyProviders()`
**Arquivo**: `src/hooks/useNearbyProviders.js`

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `serviceType` | String | Tipo de serviço |
| `latitude` | Number | Lat do cliente |
| `longitude` | Number | Lng do cliente |
| `radiusKm` | Number | Raio de busca (padrão 20) |

| Retorno | Tipo | Descrição |
|---|---|---|
| `providers` | Array | Prestadores ordenados por distância |
| `loading` | Boolean | Buscando |
| `error` | String/null | Erro |

---

### `useNewJobAlert()`
**Arquivo**: `src/hooks/useNewJobAlert.js`

- Monitora OS com status `aguardando`
- Toca buzina de caminhão via Web Audio API (100–135 Hz, 2s loop)
- Persiste IDs vistos em `sessionStorage` para não renotificar
- Expõe globais:
  - `window.__stopProviderHorn()` — para o áudio
  - `window.__clearSeenJobIds()` — limpa cache de IDs

---

### `useAttendantPush()`
**Arquivo**: `src/hooks/useAttendantPush.js`

- Monitora tickets em tempo real via Base44 subscribe
- Dispara alertas sonoros diferenciados por evento
- Envia notificações do browser
- Armazena tickets vistos em `localStorage` (últimos 500)

---

### `useScheduleAvailability()`
**Arquivo**: `src/hooks/useScheduleAvailability.js`

| Retorno | Tipo | Descrição |
|---|---|---|
| `availabilityData` | Object | Slots disponíveis por dia |
| `isTimeAvailable(date, time)` | Function | Verifica slot específico |

**Lógica de validação**
- Cruza com configuração de disponibilidade do prestador (dia + hora)
- Desconta serviços já agendados nos status: `agendado`, `aceito`, `a_caminho`, `em_andamento`
- Respeita limite máximo de atendimentos simultâneos por dia

---

### `useIsMobile()`
**Arquivo**: `src/hooks/useIsMobile.js`

- Threshold: 768px
- Retorna `Boolean`
- Atualiza automaticamente no resize

---

### `useProviderPush()`
**Arquivo**: `src/hooks/useProviderPush.js`

- Registra Service Worker
- Gera subscrição Web Push com VAPID keys
- Salva subscrição no registro do prestador via Base44
- Permite envio de push mesmo com app fechado

---

### `usePushNotifications()`
**Arquivo**: `src/hooks/usePushNotifications.js`

- Dispara `Notification` nativa do browser
- Auto-fecha após 5 segundos
- `requireInteraction: true` para notificações críticas
- Previne duplicatas por ID de OS

---

### `useServiceNotifications()`
**Arquivo**: `src/hooks/useServiceNotifications.js`

- Apenas para status `aceito`, `a_caminho` e `concluido`
- Áudio sutil (base64 encoded) em mudanças de status
- Previne re-notificação do mesmo estado

---

## 16. Autenticação e Controle de Acesso

### 16.1 Provedor de Auth — `AuthContext.jsx`

- Baseado em Base44 SDK (`base44.auth`)
- Context global com `AuthProvider` envolvendo o app
- Hook `useAuth()` para acesso em qualquer componente

### 16.2 Rota Protegida — `ProtectedRoute.jsx`

- Bloqueia rotas não autenticadas
- Redireciona para login com `returnUrl`
- Suporte a proteção por role (`admin`, `provider`, etc.)

### 16.3 Fluxo de Login

1. Usuário acessa rota protegida
2. `ProtectedRoute` detecta não autenticado
3. `base44.auth.redirectToLogin(returnUrl)` chamado
4. Base44 autentica (social login / email)
5. Callback retorna com token
6. `checkAppState()` carrega dados do usuário
7. Usuário redirecionado para `returnUrl`

### 16.4 Roles e Permissões

| Role | Acesso |
|---|---|
| Não autenticado | Páginas públicas, home (visualizar) |
| `user` | Solicitar serviços, meus pedidos, perfil, carteira |
| `provider` | App do prestador, dashboard, ganhos, agenda |
| `admin` | Tudo + painel admin, dashboards, gestão financeira |
| `attendant` | Módulo de tickets apenas |
| `partner` | Painel de parceiro |

---

## 17. Fluxos de Trabalho Principais

### 17.1 Fluxo Completo: Solicitação de Serviço (Cliente)

```
1. Home → seleciona tipo de serviço
        │
        ├─ Elétrica → Modal com subtipos → seleciona subtipo
        ├─ Hidráulica → Modal com subtipos → seleciona subtipo
        ├─ Pressurizador → PressurizadorFeasibilityForm
        ├─ TV → seleção de tamanho
        └─ Outros → SolicitarServico diretamente
                │
                ▼
2. Localização (mapa ou endereço manual)
        │
        ▼
3. Urgência: Agora / Hoje / Esta Semana
        │
        ▼
4. Upload de fotos do problema
        │
        ▼
5. Busca de prestadores disponíveis (filtro: proximidade + serviço)
        │
        ▼
6. [se agendado] AvailableScheduleSelector (próximos 7 dias, 8h–17h)
        │
        ▼
7. [se reboque] TowServiceQuestions
        │
        ▼
8. PaymentModal (Stripe / PIX + cupom)
        │
        ▼
9. OS criada com status = aguardando
        │
        ▼
10. Rastreamento em AcompanharServico
```

---

### 17.2 Fluxo Completo: Aceitação de Chamado (Prestador)

```
1. ProviderApp exibe OS disponíveis (status = aguardando)
        │
        ▼
2. Alerta sonoro (buzina de caminhão) + NewJobBanner
        │
        ▼
3. NewServiceFullscreenModal com detalhes do chamado
        │
        ├─ Recusar → DeclineReasonModal → OS volta para fila
        │
        └─ Aceitar → OS status = aceito
                │
                ▼
4. ActiveJobCard ativo — prestador se dirige ao local
        │
        ▼
5. Atualiza status → a_caminho (cliente notificado)
        │
        ▼
6. Atualiza status → em_andamento (serviço iniciado)
        │
        ▼
7. [opcional] Envia orçamento de peças → EstimateApprovalPanel
              │
              ├─ Cliente aprova → em_espera → peças chegam → em_andamento
              └─ Cliente recusa → prestador reporta impossibilidade
                │
                ▼
8. Conclusão → ServiceCompletionModal
              │
              ├─ ServiceChecklist preenchido
              ├─ Fotos de conclusão uploadadas
              └─ SignaturePad (assinatura do cliente)
                │
                ▼
9. OS status = concluido
        │
        ▼
10. Ganhos registrados + avaliação solicitada ao cliente
```

---

### 17.3 Fluxo Completo: Agendamento de Serviço

```
1. AvailableScheduleSelector exibe próximos 7 dias
        │
        ▼
2. Apenas dias/horários em que o prestador está disponível
   (cruza configuração do prestador vs. agenda já preenchida)
        │
        ▼
3. Slots disponíveis: 8h, 9h, 10h, 11h, 13h, 14h, 15h, 16h, 17h
        │
        ▼
4. Usuário seleciona data + hora
        │
        ▼
5. OS criada com modality = agendado + data/hora registrados
        │
        ▼
6. No dia/hora: notificação automática ao prestador
        │
        ▼
7. Fluxo normal de aceitação e execução
```

---

### 17.4 Fluxo Completo: Atendimento de Ticket (Suporte)

```
1. Atendente acessa painel com login gerado pelo sistema
        │
        ▼
2. Alertas sonoros e push para novos tickets (useAttendantPush)
        │
        ▼
3. Painel mostra tickets ordenados por urgência e tempo
        │
        ▼
4. Atendente abre ticket → vê histórico do cliente
        │
        ▼
5. Resposta via QuickReplies (templates) ou texto livre
        │
        ▼
6. Status: aberto → em_atendimento → resolvido → fechado
        │
        ▼
7. Ação registrada em ActivityLog
```

---

### 17.5 Fluxo de Onboarding de Prestador

```
1. ProviderRegister.jsx
        │
        ▼
2. Dados pessoais + CPF validado
        │
        ▼
3. Upload de documentos (RG/CNH)
        │
        ▼
4. Upload de foto profissional
        │
        ▼
5. Seleção de especialidades e serviços
        │
        ▼
6. Área de atuação (raio no mapa)
        │
        ▼
7. [PJ] ProviderCNPJRegistration — dados da empresa
        │
        ▼
8. Aceite de termos (plataforma + Escola Prática)
        │
        ▼
9. Admin revisa: documentos → fotos → serviços
        │
        ├─ Aprovado → status = aprovado → pode receber chamados
        └─ Reprovado → notificação com motivo → pode corrigir
```

---

## 18. Componentes de UI Compartilhados

### 18.1 AvailableScheduleSelector — `AvailableScheduleSelector.jsx`
- Exibe os próximos 7 dias úteis em cards horizontais
- Horários disponíveis: 8h–17h (intervals de 1h)
- Cinza: ocupado | Âmbar: disponível
- Retorna `{ date, time }` via `onConfirm`

### 18.2 ServiceSearch — `ServiceSearch.jsx`
- Input de busca com debounce
- Filtra por `label` e `subtitle` dos serviços
- Retorna array filtrado via `onFilterChange`
- Limpar busca com botão X

### 18.3 ProfessionalCard — `ProfessionalCard.jsx`
- Foto de perfil com fallback
- Nome, especialidade, nota (StarRating), número de reviews
- Cidade/bairro, experiência em anos
- Faixa de preço
- Botão de favoritar (`FavoriteButton`)
- Link para perfil completo

### 18.4 StarRating — `StarRating.jsx`
- 5 estrelas SVG
- Modo leitura (exibe nota) ou interativo (permite avaliar)
- Nota com uma casa decimal

### 18.5 SignaturePad — `SignaturePad.jsx`
- Canvas para assinatura digital
- Botão de limpar
- Exporta assinatura como base64 PNG

### 18.6 FavoritesList — `FavoritesList.jsx`
- Grid de prestadores favoritos do cliente
- Foto com zoom ao clicar
- Acesso rápido ao perfil e solicitação de serviço

### 18.7 PartsEstimator — `PartsEstimator.jsx`
- Formulário para o prestador listar peças necessárias
- Nome da peça, quantidade, preço unitário
- Total calculado automaticamente
- Enviado ao cliente para aprovação

### 18.8 EstimateApprovalPanel — `EstimateApprovalPanel.jsx`
- Exibido ao cliente quando prestador envia estimativa
- Lista de peças com valores
- Total da estimativa
- Botões: Aprovar / Recusar
- Alerta sonoro ao receber nova estimativa

### 18.9 CouponInput — `CouponInput.jsx`
- Input de código com botão "Aplicar"
- Feedback inline: válido (verde), inválido (vermelho)
- Exibe desconto calculado após aplicação
- Remove cupom se necessário

### 18.10 RetornoModal — `RetornoModal.jsx` + `RetornoButton.jsx`
- Solicita retorno do prestador para ajuste/garantia
- Seleção de motivo do retorno
- Agenda nova visita

### 18.11 BusyAlert — `BusyAlertBanner.jsx` + `BusyAlertClientView.jsx`
- Banner exibido quando prestador está ocupado
- Cliente vê estimativa de quando ficará disponível
- Prestador responde via `BusyAlertResponseModal`

### 18.12 PreventiveServiceAlarm — `PreventiveServiceAlarmForm.jsx` + `PreventiveServiceAlarmsList.jsx`
- Cria lembretes de manutenção preventiva (ex: limpeza de ar-condicionado a cada 6 meses)
- Lista de alarmes ativos com próxima data
- Notificação via push na data configurada

### 18.13 RecurringService — `RecurringServiceForm.jsx` + `RecurringServicesList.jsx` + `RecurringServiceCalendar.jsx`
- Serviços com recorrência (semanal, quinzenal, mensal)
- Calendário visual dos próximos agendamentos
- Cancelamento de recorrência

---

## 19. Glossário de Status

### Status de OS

| Código | Português | Descrição |
|---|---|---|
| `aguardando` | Aguardando | OS criada, buscando prestador |
| `aceito` | Aceito | Prestador aceitou o chamado |
| `a_caminho` | A caminho | Prestador em deslocamento |
| `em_andamento` | Em andamento | Serviço em execução |
| `em_espera` | Em espera | Aguardando peças ou autorização |
| `concluido` | Concluído | Serviço finalizado |
| `cancelado` | Cancelado | OS cancelada por cliente ou admin |

### Status de Prestador

| Código | Descrição |
|---|---|
| `pendente` | Aguardando revisão de documentos |
| `aprovado` | Ativo, pode receber chamados |
| `reprovado` | Documentação ou foto rejeitada |
| `bloqueado` | Suspenso pelo admin |

### Status de Ticket de Suporte

| Código | Descrição |
|---|---|
| `aberto` | Aguardando atendimento |
| `em_atendimento` | Atendente respondeu |
| `resolvido` | Solução aplicada |
| `fechado` | Ticket encerrado |

### Status de Pagamento

| Código | Descrição |
|---|---|
| `pendente` | Aguardando confirmação |
| `aprovado` | Pagamento confirmado |
| `cancelado` | Pagamento cancelado/estornado |
| `em_processo` | Em processamento |

---

*Documentação gerada em 08/05/2026. Para atualizações, editar este arquivo conforme evolução do produto.*
