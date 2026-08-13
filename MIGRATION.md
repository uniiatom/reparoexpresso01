# Migração Reparo Expresso: React → Flutter (3 apps)

> Documento vivo. Atualizar a cada marco relevante — status, decisões novas, o que mudou de plano.
> Última atualização: 2026-08-12 (continuação) — **leia a seção 0.1 antes de qualquer coisa**. Nesta rodada: auditoria completa das ~63 Edge Functions (ver seção 0.2) achou e corrigiu **mais 18 bugs reais** de coluna inexistente (alguns crashavam de verdade, ex. webhook do Stripe nunca marcava pagamento, aprovação de orçamento nunca mudava status, cron de serviço recorrente 100% quebrado); geolocalização do dispositivo capturada no app cliente (pacote `geolocator`) religando a prévia de prestadores disponíveis via `find_nearby_providers`; tela de gestão do catálogo novo no admin (`catalog_tab.dart` — grupos/profissões/sub-serviços); formulário dinâmico por sub-serviço religado no app cliente (`service_request_form_fields`/`_answers`); **cupons/regras de sobretaxa migrados do vocabulário antigo pro catálogo novo** (`profession_ids`, decisão tomada por autorização sua, ver seção 0.3). Sessão anterior (mesma data, rodada 1): schema real divergente descoberto, catálogo novo adaptado, 10 crashes de Edge Function corrigidos.

## 0.1. ⚠️ Schema real diverge deste repositório — leia isto primeiro (2026-08-12)

**Descoberta crítica desta sessão.** Ao conectar o MCP do Supabase no projeto certo (`sedvqswypuhpiglnilxk`) pela primeira vez, descobri que o banco real passou por uma reestruturação **feita inteiramente fora deste repositório git** — provavelmente outra ferramenta ou sessão trabalhando direto no Supabase, sem isso nunca voltar pro código aqui. `supabase/migrations/` neste repo tem ~20 arquivos; o banco real tem ~65 migrations aplicadas, incluindo ~30 que não existem neste git (nomes como `mvp_fresh_schema`, `maps_and_service_areas`, `provider_service_coverage`, `service_request_form`, `admin_registration_control`).

**O que existe no banco real e não neste repo** — um catálogo de serviço novo e mais completo, com dados reais (não teste):
- `service_groups` (3) → `professions` (16) → `sub_services` (51) — taxonomia específica do produto (encanador, eletricista, guincho, chaveiro etc.), substitui `offered_services`.
- Matching geográfico de verdade: `service_areas` (círculos com centro/raio — encontrei áreas reais em MG) + `provider_service_coverages` + RPCs (`find_nearby_providers`, `find_available_professions_at_location`, `find_available_catalog_at_location`) que fazem Haversine + checagem de cobertura no banco. Isso destrava boa parte do que estava marcado 🔒 "precisa de mapa" — a app só precisa do GPS do dispositivo (grátis) pra consultar; só a renderização visual do mapa continua precisando de chave paga.
- Formulário dinâmico por sub-serviço: `service_request_form_fields`/`_answers`/`_files`.
- `platform_settings`, `client_favorite_services`, `cities`/`neighborhoods`, `provider_professions`/`provider_sub_services` (many-to-many de habilidades do prestador).
- Edge Functions que não existem neste repo: `admin-registrations` (duplica `adminManageUsers`), `pdf-preview`.
- `app_role` (enum) já tem `partner` reservado — o módulo Parceiro adiado na seção 0 já tem lugar no schema novo.

**A quebra concreta:** `service_requests` **não tem mais a coluna `service_type`** — substituída por `profession_id` (obrigatório) + `sub_service_id` (opcional), FKs pro catálogo novo. Isso fazia `ServiceRequest.fromJson` **crashar** (`json['service_type'] as String` com `null`) em qualquer app assim que uma OS real fosse lida — não era só degradação cosmética, era crash. `service_requests.client_id` também mudou de sentido: hoje é FK pra `clients.id`, não mais o `auth.uid()` direto (mas **outras** tabelas como `client_notifications`, `customer_loyalty`, `favorites`, `reviews`, `tickets` continuam com `client_id`/`owner_id` = `auth.uid()` direto — só `service_requests` mudou).

**O que foi adaptado nesta sessão** (core, pra parar de crashar e usar o catálogo novo):
- `packages/shared`: novos `CatalogGroup`/`Profession`/`SubService`/`NearbyProvider` + `CatalogRepository` (`catalog.dart`/`catalog_repository.dart`).
- `ServiceRequest`: `serviceType` → `professionId`/`subServiceId` + `professionName`/`subServiceName` (via embed `professions(name), sub_services(name)`) + getter `serviceLabel` (fallback pra UI). `ServiceRequestRepository`: `createDraft()` recebe profession/sub-service; resolve `clients.id` a partir do `auth.uid()` antes de inserir (`_myClientId()`); todo `.select()` (exceto os `watch*`/Realtime, que não suportam embed) inclui o join do catálogo; `listForClient()` agora espera `clients.id`, não `user_id` (call site em `clients_tab.dart` corrigido).
- App cliente: `home_screen.dart` lista `Profession` por `CatalogGroup` (3 abas agora, era 2 fixas) em vez de `OfferedService`; `request_screen.dart` recebe `Profession`, sub-serviço vira chip selecionável (fetchado por `CatalogRepository`) em vez do hack antigo de subtypes hardcoded por slug. **Removida** a prévia "Ver prestadores disponíveis" (dependia de `ProviderRepository.listAvailableForService`, que usava o catálogo antigo) — o backend novo já tem o RPC certo (`find_nearby_providers`), só faltava capturar geolocalização no app. **Re-adicionada numa sessão seguinte (mesma data, ver seção 0.2)** com o pacote `geolocator`.
- Todas as 11 telas que liam `.serviceType` (client/provider/admin) trocadas pra `.serviceLabel`.
- **Bug real encontrado e corrigido** em 3 Edge Functions (`completeServiceRequest`, `awardLoyaltyPoints`, `sendEstimateApprovalNotification`): elas reaproveitavam `service_requests.client_id` (agora `clients.id`) como se fosse `auth.uid()` pra gravar em `client_notifications`/`customer_loyalty`/`loyalty_transactions` — silenciosamente gravaria pro `client_id` errado e a notificação/pontos nunca apareceriam pro cliente real. Corrigido resolvendo `clients.user_id` antes. Mesma checagem revisada em `generateServicePasswords` (a checagem de dono por `created_by`/email não cobria OS criadas pelo app novo, que não preenche esse campo — adicionado fallback via `clients.user_id`).
- **As 4 migrations locais pendentes (RLS de zonas, `extra_charges`, RLS de tickets, `service_status_transitions`) foram aplicadas de verdade** via MCP nesta sessão — antes só existiam como arquivo local. `service_status_transitions` ganhou também uma policy de dono (cliente/prestador da própria OS), não só staff.
- As 10 Edge Functions da sessão anterior (fidelidade + correções de auth) + as 3 corrigidas acima foram **deployadas de verdade** via MCP.

**Segunda rodada da mesma sessão — `providers` também divergia, e pior: causava crash real (não só degradação).** `Provider` model/`ProviderRepository`/`provider_register_screen.dart` assumiam ~30 colunas que não existem no schema real (`specialties`, `cnh_*`/`crlv_*`/`cnpj_*` como colunas, `is_rejected`, `rejected_at`, `block_reason`, `blocked_at`, `total_jobs`, `qualifications`, `coverage_regions`, `zip_code` etc.). O cadastro de prestador (`provider_register_screen.dart`) **não conseguia nem se inserir** — `INSERT` com `specialties` (coluna inexistente) falha com erro do Postgres. Adaptado:
- `Provider` model reescrito pras colunas reais (`company_name`, `id_holding_document_*`, `address_proof_*`, `crlv_vehicle_type`, `is_service_enabled`, `approval_request_type` etc.); `isRejected` virou getter computado (`!isApproved && rejectionReason != null`) já que não existe coluna `is_rejected`.
- `ProviderRepository`: `listPendingApproval`/`approve`/`reject`/`undoApprovalDecision`/`setBlocked`/`setDocumentStatus` reescritos pras colunas reais (bloqueio agora só liga/desliga `is_blocked`, sem motivo/timestamp — não existe coluna); `setDocumentStatus` agora opera em `id_holding_document`/`address_proof` (só 2 slots de documento revisável, não 3). Habilidades do prestador saíram do array `specialties` e viraram linhas em `provider_professions` (`listMyProfessionIds`/`listMyProfessions`/`setProfessions`, novos).
- `provider_register_screen.dart`: troca de chips de texto livre por seleção real de `Profession` (via `CatalogRepository`), grava em `provider_professions` depois de criar a linha em `providers`.
- `provider_documents_screen.dart`/`ProviderDocumentRepository`: upload de CNH+CRLV como 2 arquivos separados → 1 "documento de identificação" genérico (`id_holding_document_url`) + campo de texto pro tipo de veículo (`crlv_vehicle_type`, sem arquivo — não existe coluna de arquivo pro CRLV).
- `providers_approval_tab.dart` (admin): revisão de documento agora mostra os 2 slots reais em vez de CNH/CRLV/CNPJ; bloqueio sem captura de motivo (sem coluna).
- **Mais 4 crashes de Edge Function encontrados e corrigidos**, todos com `.select('col1, col2, ...')` explícito citando coluna que não existe — isso **sempre** dá erro do PostgREST (diferente de `select('*')`, que só retorna `undefined` pra coluna ausente): `calculateProviderLevel` e `sendProviderLevelIncentive` selecionavam `total_jobs` (não existe — recalculado a partir de `service_requests` agora); `sendPushNotification` selecionava `push_subscription` (nunca existiu em nenhuma versão do schema que vi — a função agora só salva a notificação in-app e retorna sucesso, sem tentar push de verdade); `saveProviderCNPJData` gravava em `cnpj`/`zip_code`/`cnpj_url`/`cnpj_status` (não existem — o número do CNPJ em si não tem onde ser persistido, só os dados resultantes da consulta). Todas redeployadas.
- **Ainda não corrigidos** (achados no mesmo grep, mas fora do escopo desta rodada — degradação silenciosa, não crash, porque usam `select('*')`): `optimizeServiceRoute` e `rankProvidersForService` leem `provider.specialties` (sempre `undefined` agora) — ambos ficam retornando lista vazia sem erro.

**O que ficou de fora — próximos passos, em ordem de impacto** (a maioria resolvida em sessões seguintes, ver seções 0.2/0.3 pra detalhes):
- [x] As 10 Edge Functions cosméticas + o filtro `service_type`/`surcharge_rules`/`coupons` foram todas corrigidas (ver seção 0.2 e 0.3).
- [x] Geolocalização do dispositivo capturada, `find_nearby_providers` religado (ver seção 0.2).
- [x] Formulário dinâmico por sub-serviço religado (ver seção 0.2, campos globais ficaram de fora de propósito).
- [x] Admin ganhou tela de gestão do catálogo novo (`catalog_tab.dart`, ver seção 0.2). `pricing_tab.dart` continua gerenciando preço por `service_type` livre (tabela `service_pricing`, que não mudou de schema) — decisão separada, não mexi.
- [x] **Resolvido (sessão nova):** auditoria completa de tipos numéricos — cruzei as ~140 colunas `bigint`/`integer`/`numeric`/`double precision` do schema real (via MCP) contra todo `fromJson` em `packages/shared/lib/src/models/`, procurando o mesmo padrão do bug de `clients.cpf` (coluna numérica lida como `String` sem conversão). **Nenhum outro caso encontrado** — `clients.cpf` era o único, já corrigido antes. Lat/lng usam um helper `parseDouble()` consistente, `sort_order`/contadores usam `as int?`, valores monetários usam `as num`/`num?`. Sem achado, mas escopo agora coberto de ponta a ponta (antes só cobria "o que os apps tocam hoje").
- `providers.pending_profile_data`/`approval_request_type`/`approval_requested_at` sugerem um fluxo de aprovação mais sofisticado (staging de mudanças antes de aplicar) que não investiguei a fundo — o fluxo direto que implementei (update imediato das colunas) funciona, mas pode não ser o que o resto do sistema (fora deste repo) espera.
- Ainda não auditei TODAS as ~60 Edge Functions em busca de `.select()`/`.update()` com coluna inexistente — só as que tocam `providers`/`service_requests` diretamente. Pode haver mais crashes latentes em functions que eu ainda não abri.

## 0.2. Auditoria completa das Edge Functions (2026-08-12, continuação) — 18 bugs reais corrigidos

Terminei a auditoria que a seção 0.1 tinha deixado pela metade ("só cobri as que tocam `providers`/`service_requests` diretamente"). Cruzei cada `.select()`/`.update()`/`.insert()`/`.upsert()` explícito de todas as ~63 functions contra as colunas reais das 66 tabelas (via MCP). Achados reais (fora os já descritos na seção 0.1), todos corrigidos e **redeployados**:

**Crashes de verdade (dado se perdia ou era rejeitado, com erro real ou silencioso):**
- `stripeWebhook`: `.update()` em `service_requests` citava `payment_status`/`payment_session_id`/`payment_completed_at` — colunas que nunca existiram no schema novo. Como é um `.update()` só (não por campo), a falha derrubava a chamada inteira **sem checar o erro** — ou seja, quando um cliente pagava com cartão via Stripe Checkout, nem `final_price` (que existe) era gravado. Corrigido restaurando as 3 colunas via migration (`20260601170000_fix_missing_payment_and_notification_columns.sql`) — é o webhook de pagamento de verdade, não dava pra só remover.
- `approveServiceEstimate`: `.update()` citava `approval_notes`/`approved_at`/`approved_by` (inexistentes) — o `status` (que vem no mesmo objeto) nunca era persistido, ou seja, aprovar/recusar um orçamento inicial não fazia nada. Function sem caller ativo nos apps novos hoje (só existia em componente órfão do legado), mas corrigida mesmo assim (só grava `status`).
- `processRecurringServices` (cron): `.insert()` em `service_requests` citava `service_type` (não existe mais, é `profession_id`/`sub_service_id` obrigatórios) — **o cron inteiro de serviços recorrentes estava 100% quebrado**, toda execução lançava erro na primeira agenda ativa. Corrigido de ponta a ponta: `recurring_service_schedules` ganhou colunas `profession_id`/`sub_service_id` (migration), `RecurringServiceSchedule`/`RecurringServiceRepository` (`packages/shared`) e `recurring_services_screen.dart` (app cliente) foram atualizados pra usar `Profession`/`SubService` do catálogo novo em vez de texto livre.
- `processCouponBonus`: `.insert()` em `wallet_bonuses` citava `owner_email` (não existe nessa tabela) — gerar bônus de excedente de cupom sempre lançava erro. Sem caller ativo nos apps novos ainda (só legado). Corrigido removendo o campo.
- `acceptProviderTerms`: `.update()` em `providers` citava `terms_accepted_at` (só existia em `clients`). Sem caller ativo nos apps novos ainda. Corrigido via migration, espelhando a coluna que já existe pro lado cliente.

**Notificações que nunca eram criadas (insert falhava, silenciosamente):**
- `approveExtraCharges`/`rejectExtraCharges`/`notifyExtraChargesRejected`/`approveServiceEstimate` — todas inseriam em `provider_notifications` citando `service_id`/`service_number`, colunas que só existiam em `client_notifications`. Corrigido via migration, adicionando as duas colunas em `provider_notifications` pra ter paridade com `client_notifications`.

**Write-only morto (gravava em coluna inexistente, nada lia de volta — removido em vez de recriar coluna):**
- `processProviderRepayment`: `provider_payout_amount`/`platform_fee`/`payout_processed_at`/`payment_status` em `service_requests` — repasse de prestador de verdade é rastreado via `biweekly_closings`, não por OS individual (decisão já documentada na Fase 5). Function só calcula e retorna o split agora, sem tentar persistir.
- `generatePixQrCode`: `pix_key`/`pix_id`/`pix_amount`/`pix_created_at`/`pix_status` em `service_requests` — nada lê esse estado hoje, o QR/copia-e-cola já vai direto pro caller. "Sem detecção automática de pagamento confirmado" continua limitação conhecida (seção 3).
- `updateCheckoutWithExtraCharges`: `checkout_url` em `service_requests` — idem, o link já vai direto na resposta.
- `adminManageUsers`: `phone` em `profiles` (não existe, só em `clients`) e `email` em `clients.upsert` (não existe, fica em auth/profiles) — nenhum dos dois caminhos é hoje alcançável pela UI (`attendants_tab.dart` só cria `role: 'attendant'`), mas corrigido por segurança.

**Cosmético (sem crash, `select('*')` retornava `undefined`, mas texto/filtro ficava errado) — os "7 Edge Functions" que já estavam listados na seção 5, mais 2 achados no mesmo padrão:**
- `autoClosingReview`, `generateServiceReport`, `processServiceRefusal`, `sendServiceReminders24h`: liam `service_type`/`clients.email` inexistentes — trocados por embed `professions(name)`/`sub_services(name)` e `created_by` (que já guarda o e-mail do cliente, mesmo padrão usado em outras functions).
- `optimizeServiceRoute`, `rankProvidersForService`: liam `providers.specialties` (nunca existiu, sempre `undefined`) — trocados por consulta em `provider_professions`. `rankProvidersForService` agora recebe `profession_id` em vez de `service_type` livre (breaking change de contrato, mas função não tem nenhum caller nos apps novos ainda).
- `processProviderRepayment`: filtro `service_pricing.eq('service_type', serviceRequest.service_type)` sempre vazio — trocado por `ilike` contra o nome do sub-serviço/profissão (best-effort, mesmo aviso de vocabulário divergente da seção "Novos gaps" abaixo).

**Migrations desta rodada** (ambas aplicadas de verdade via MCP): `supabase/migrations/20260601170000_fix_missing_payment_and_notification_columns.sql` (3 colunas em `service_requests`, 1 em `providers`, 2 em `provider_notifications`) + `20260601180000_recurring_schedules_catalog_columns.sql` (2 colunas em `recurring_service_schedules`). Todas as 14 functions com código alterado foram redeployadas de verdade via MCP.

**Auditoria de Edge Functions agora está completa** (não é mais "só as que tocam providers/service_requests") — risco residual: só cobre `.select()`/`.update()`/`.insert()`/`.upsert()` com objeto literal inline; não cobre objetos montados dinamicamente em variável antes da chamada (só achei 3 desse tipo — `calculateProviderLevel`, `assignServiceToProvider`, `adminManageUsers`/profileUpdate — todos verificados manualmente e sem problema).

## 0.3. Cupons/sobretaxas migrados pro catálogo novo + telas de catálogo/formulário dinâmico (2026-08-12, mesma sessão)

Você autorizou explicitamente ("se o que estiver no front for melhor, adapte o banco de dados... pode fazer como achar interessante") a decidir por conta própria o item que tinha ficado pendente na seção 0.2. Decisão tomada: **catálogo novo (`professions`, com FK de verdade) é objetivamente melhor que os slugs de texto livre do catálogo antigo**, então adaptei o banco pro padrão novo em vez de tentar reconciliar os dois vocabulários.

- Migration `20260601190000_coupons_surcharges_profession_ids.sql`: `coupons`/`surcharge_rules` ganharam `profession_ids uuid[]` (substitui `service_types text[]`, que fica na tabela marcada como deprecated via `comment on column`, não lida mais por nenhum código — não dropei por segurança/reversibilidade). **Sem dados reais em nenhuma das duas tabelas** (confirmado via MCP antes de mexer), então não teve migração de dados, só schema.
- `Coupon`/`SurchargeRule` (`packages/shared`) ganharam `professionIds`; `coupons_tab.dart` ganhou seletor de profissões (chips) na criação de cupom.
- `validateCoupon`/`getApplicableSurcharges` (Edge Functions, redeployadas) trocaram `service_type` por `profession_id`. `payment_screen.dart` agora manda `request.professionId` (antes mandava `request.serviceLabel`, que nunca batia com nada — cupom com `service_types` preenchido nunca teria validado).
- **Achado nesta rodada, documentado e parcialmente portado depois (ver seção 0.4):** existe um *segundo* sistema de sobretaxa no legado (`ProviderSearchModal.jsx`), independente da tabela `surcharge_rules` — calcula `night_surcharge`/`weekend_surcharge`/`holiday_surcharge` (booleanos em `service_requests`) com regra fixa no cliente (≥18h / sábado / feriado-domingo, 30%/40%/70% fixos). Esse sistema **continua não portado** (nem os booleanos, nem o cálculo fixo) — é uma feature de precificação separada, não fiz por conta própria sem confirmar se ainda é o comportamento desejado (o sistema configurável via `surcharge_rules` parece ter sido a evolução pretendida). O banner informativo (`SurchargeAlert.jsx`), que É baseado em `surcharge_rules`/`getApplicableSurcharges`, foi portado na sessão seguinte (seção 0.4).

Também nesta sessão: tela de gestão do catálogo novo no admin (`catalog_tab.dart` — Grupos/Profissões/Sub-serviços, CRUD com ativar/desativar) e formulário dinâmico por sub-serviço religado no app cliente (`ServiceRequestFormRepository`, `request_screen.dart` — só campos com `sub_service_id` preenchido; campos globais ficaram de fora de propósito pra não duplicar os campos fixos de endereço/descrição já existentes; upload de arquivo por campo não implementado, sem dado real desse tipo hoje). Detalhes completos na seção 0.2 (que documentou o resto do trabalho desta mesma sessão — auditoria de Edge Functions e geolocalização).

`flutter analyze`/`flutter test` limpos nos 3 apps + `packages/shared` depois de todas essas mudanças.

## 0.4. Sobretaxas: tela admin + banner no cliente; auditoria de tipos numéricos (2026-08-12, mesma sessão)

Fechei o loop do que tinha ficado só no backend na seção 0.3 (`surcharge_rules` corrigido pro catálogo novo, mas sem nenhuma tela em nenhuma ponta):

- **`surcharge_rules_tab.dart`** (admin, nova aba "Sobretaxas"): CRUD completo — nome, tipo de regra (`holiday`/`day_of_week`/`time_range`), dias da semana, horário início/fim, percentual, "aplica pra todos" + seletor de profissões quando restrito, ativar/desativar. `SurchargeRuleRepository` novo em `packages/shared` (`listAll`/`upsert`/`setActive`), RLS de admin já existia pronta (`surcharge_rules_admin`), não precisou migration.
- **Banner de sobretaxa no app cliente** (`request_screen.dart`) — porta de `SurchargeAlert.jsx`: chama `getApplicableSurcharges` com o `profession_id` da tela e mostra aviso "Sobretaxa aplicada: +X%" com a lista de regras, só informativo (o legado também não recalculava o preço no client — isso é feito em outro lugar, fora do que investiguei). `SurchargeCheckResult`/`AppliedSurcharge` novos em `packages/shared`.
- **Auditoria de tipos numéricos concluída** — cruzei as ~140 colunas numéricas do schema real contra todos os `fromJson` dos modelos; nenhum caso novo além do `clients.cpf` já corrigido antes. Ver seção 5, "Backend / infraestrutura".

`flutter analyze`/`flutter test` limpos nos 3 apps + `packages/shared` depois dessas mudanças.

## 0. Decisões adiadas — NÃO perguntar de novo, só lembrar que existem

O usuário disse explicitamente (2026-08-11) para **não implementar** os itens abaixo agora — ele vai revisar tudo primeiro e decide depois. Se uma sessão nova (humana ou IA) chegar aqui, é só continuar respeitando isso até ele sinalizar o contrário — não é preciso perguntar de novo nem propor solução.

- **Módulo Parceiro** (`PartnerRegister.jsx` + dashboard) — não iniciar. Não estava no escopo original dos "3 apps". Decisão de virar uma 4ª área ou entrar dentro de admin/cliente fica pra quando ele quiser retomar.
- **Schema para assinatura digital do cliente** (`service_requests` não tem coluna pra isso, `completeServiceRequest` também não aceita) — não criar tabela/coluna nova sem ele decidir o formato.
- **Schema para fotos de conclusão do serviço** (distintas das fotos do problema) — mesma situação, não inventar coluna.
- **Schema para checklist de conclusão configurável pelo admin** (`checklist_templates` ou equivalente não existe) — hoje o prestador usa uma lista fixa de 4 itens; não criar tabela de templates sem ele decidir a estrutura.
- Ver seção 5 ("Backend / infraestrutura") pra mais detalhe técnico de cada um desses.

Tudo o mais na lista de gaps (seção 5) que **não** depende de schema novo ou credencial externa (🔒) pode continuar sendo atacado livremente — é só o que está listado acima que fica parado até ele revisar.

## 1. Status atual

| App | Tecnologia (atual/planejada) | Status |
|---|---|---|
| Backend | Supabase (Postgres + Auth + Edge Functions + Storage) | ✅ Ativo, inalterado |
| Legado (referência) | React 18 + Vite | ✅ Congelado em `legacy/`, buildável isoladamente |
| Cliente (mobile) | Flutter | 🟡 Login/cadastro, catálogo, solicitação completa (modais especializados por serviço, agendamento, endereço, fotos, prévia de prestadores disponíveis), pagamento (Stripe/PIX/cupom + orçamento extra), pedidos em tempo real (detalhe+chat+avaliação+garantia+retorno), perfil, carteira, favoritos, fidelidade, indicação, notificações, suporte, lembretes preventivos, recorrentes, dossiê/gastos (ver Fase 3) |
| Prestador (mobile + web) | Flutter | 🟡 Cadastro + CNPJ + documentos, login, fila com alerta sonoro + modal fullscreen de novo chamado, online/offline, aceitar/recusar, job ativo completo, agenda, ganhos, gamificação, QR de review, suporte, dashboard de métricas (ver Fase 4) |
| Admin (web) | **Flutter Web** (decidido — ver Fase 5) | 🟡 13 abas, todas com funcionalidade ampliada: visão geral (+garantias expirando +agendados), serviços (+PDF), prestadores (+revisão individual de documento), clientes (+histórico), financeiro (+reembolsos), preços (+região), **catálogo** (grupos/profissões/sub-serviços), **sobretaxas** (regras de acréscimo por horário/dia/feriado), cupons, pontos, tickets (+respostas rápidas +SLA), atendentes, log (+CSV) (ver Fase 5) |
| `packages/shared` | Flutter package | 🟡 Supabase client, auth/roles, tema, e ~36 modelos/repositórios — ver Fase 2 |

**Toolchain local — `flutter doctor`: sem nenhuma pendência (confirmado em 2026-08-11).**
- ✅ Flutter 3.44.9 (`brew install --cask flutter`)
- ✅ Android toolchain (Android Studio + SDK 36.0.0, licenças aceitas)
- ✅ Xcode 26.6 completo + CocoaPods 1.17.0
- ✅ Web (Chrome) e macOS desktop
- ✅ Dispositivos conectados e recursos de rede ok

## 2. Onde encontrar o quê

| Preciso de... | Está em |
|---|---|
| Código de referência do app antigo (páginas, componentes, hooks) | `legacy/src/` — ver mapa detalhado em `legacy/README.md` |
| Regras de negócio, fluxos completos, glossário de status | `PRD.md` (raiz) |
| Referência de módulo de zonas geográficas (preço/disponibilidade por região) | `sistea-de-rotas-dois-sabores.md` (raiz) |
| Backend ativo (schema, RLS, Edge Functions) | `supabase/migrations/`, `supabase/functions/` (raiz) |
| Docs operacionais de backend (cron, secrets, inventário de functions) | `docs/` (raiz) |
| App Flutter do cliente | `apps/client/` |
| App Flutter do prestador | `apps/provider/` |
| App do admin | `apps/admin/` |
| Código/lógica compartilhada entre os 3 apps novos | `packages/shared/` |
| Credenciais/acessos (não versionado no git) | `Senhas e acessos.md` (raiz) |

## 3. Decisões tomadas

- **Split em 3 apps** (cliente mobile / prestador mobile+web / admin web) em vez de 1 app único com rotas por role — cada app só empacota o código do seu papel, isolamento de acesso por build, não só por rota client-side (como era no `legacy/`). O isolamento de dados continua dependendo do RLS do Supabase, que vale para qualquer frontend.
- **Tentativa de Flutter nos 3 apps.** Cliente e prestador são bons encaixes (mobile nativo; prestador ganha mobile+web de uma codebase só). Admin era o caso duvidoso — Flutter Web ainda é fraco para dashboards densos (tabelas, SEO, editores rich-text).
- **Decisão da Fase 5 (2026-08-11): Flutter Web para o admin também.** Protótipo real construído (`DataTable` com filtro de status sobre `service_requests` em tempo real + aprovação de prestadores) — `flutter build web` compilou limpo (~22s, bundle principal ~2.9MB antes de gzip, dentro do normal para Flutter Web). `DataTable`/`DropdownMenu` deram conta da tela densa sem gambiarra. Não achei nenhum bloqueio técnico que justificasse voltar pra React nesta etapa. **Revisável**: se nos testes manuais o usuário achar a UX de tabela/formulário pior que o React (SEO não é relevante aqui, painel é interno/autenticado), plano B continua sendo migrar só o admin de volta pra React — o resto (cliente/prestador) não seria afetado.
  - Alternativa que ficou registrada mas não escolhida: React Native no lugar do Flutter para cliente/prestador, o que manteria tudo em JS/TS e reaproveitaria mais lógica do `legacy/`. Descartada por ora porque o objetivo agora é validar o caminho Flutter primeiro.
- **Backend permanece 100% Supabase.** Nenhuma lógica nova entra na pasta `base44/` (dentro de `legacy/`), que é resquício da plataforma Base44 original, já superada.
- **Correção de rota (2026-08-11):** o catálogo de serviços **já não é hardcoded** — `ServiceCategory`/`ServiceSubcategory` eram entidades do Base44 antigo (`legacy/base44/entities/`), superadas pela tabela real `public.offered_services` (+ `offered_service_field_templates`) criada em `supabase/migrations/20260527120000_offered_services.sql`. `legacy/src/lib/serviceTypes.js`/`offeredServices.js` hoje só fazem mapeamento de ícones (lucide-react), não guardam o catálogo em si. `packages/shared` já modela `OfferedService`/`OfferedServiceFieldTemplate` em cima dessa tabela real — não há mais duplicação a resolver aqui.
- **Sem geração de código (`json_serializable`/`freezed`) nos modelos Dart por enquanto.** `fromJson`/`toJson` escritos à mão em `packages/shared/lib/src/models/`. Decisão de manter simples e sem build_runner enquanto o número de modelos é pequeno; reavaliar se a superfície crescer muito (schema tem ~50 tabelas).
- **`.env` de cada app Flutter reaproveita as mesmas credenciais do `legacy/.env`** (mesmo projeto Supabase, chave `anon`/`publishable` — segura para uso client-side, protegida por RLS). Cada app tem `.env.example` versionado e `.env` local gitignored; carregado via `flutter_dotenv` como asset (ver `ReparoSupabase.initialize()` em `packages/shared`).
- **App não está em produção** (confirmado em 2026-08-11) — por isso `legacy/` foi congelado sem se preocupar em manter o deploy Netlify ativo a partir da nova localização. Se isso mudar antes da migração terminar, reavaliar.
- **Bug de backend #1 — corrigido (2026-08-11), aplicado no banco em 2026-08-12:** a Edge Function `approveExtraCharges` (e `sendExtraChargesRequest`/`rejectExtraCharges`, que concordam no mesmo formato) referenciava `service_requests.extra_charges`, uma coluna que não existia no schema. Corrigido com `supabase/migrations/20260601140000_add_extra_charges_column.sql`, aplicada de verdade via MCP nesta sessão. Com a coluna, dava pra construir "orçamento extra" de verdade nos apps cliente e prestador — feito.
- **Bug de backend #2 — corrigido (2026-08-11), aplicado no banco em 2026-08-12:** `tickets`/`ticket_messages` só tinham policy de RLS pra staff (`is_staff()`), sem exceção pro cliente/prestador dono do ticket — abrir chamado pelo app cliente/prestador estava impossível via RLS. Combinado com o fato de `ClientTicketForm.jsx`/`ProviderTicketForm.jsx` no legado ainda chamarem `base44.entities.Ticket.create()` (backend desativado), abrir ticket estava quebrado até no app antigo. Corrigido com `supabase/migrations/20260601150000_tickets_owner_access.sql`, aplicada de verdade via MCP nesta sessão — adiciona a exceção de dono, no mesmo padrão das outras tabelas owner-based do schema.
- **Ambos os fixes de backend acima já estão aplicados no projeto Supabase real** (2026-08-12, MCP conectado ao projeto certo `sedvqswypuhpiglnilxk`) — não é mais uma pendência.
- **Decisões pragmáticas em áreas sem schema claro**, pra não inventar estrutura de banco sem confirmar com você:
  - Checklist de conclusão do prestador: lista fixa de 4 itens (não configurável pelo admin — não existe tabela `checklist_templates` no schema). Se quiser configurável de verdade, precisa de uma tabela nova.
  - Assinatura digital do cliente: **não implementada** — não existe coluna pra guardar isso em `service_requests` e o `completeServiceRequest` (Edge Function que finaliza a OS) também não aceita esse campo. Ficaria adivinhando o formato.
  - "Fotos de conclusão" do prestador: mesma situação — sem coluna dedicada. Não implementado.
  - QR Code de review no Google (perfil do prestador): usa um Place ID de placeholder (`SEU_PLACE_ID`) — precisa do Place ID real do negócio no Google, que só vocês têm.
- **Sem SDKs nativos que exigem credenciais que não tenho ou que seriam "coisa de deploy"**: sem `flutter_stripe` (uso o Checkout hospedado do Stripe via `url_launcher`), sem Google Maps SDK (uso deep link pro app de mapas do sistema via `https://maps.apple.com/?q=...`), sem push notifications (precisa de projeto Firebase/APNs configurado). Alerta sonoro do prestador usa `SystemSound.alert()` (som do sistema) em vez da buzina customizada do legado, que precisaria de um asset de áudio que não tenho.

## 4. Checklist faseado

### Fase 0 — Reestruturação do repo ✅ concluída (2026-08-11)
- [x] Mover app React para `legacy/` (com `git mv`, histórico preservado)
- [x] Backend Supabase permanece na raiz, inalterado
- [x] Criar esqueleto `apps/{client,provider,admin}` e `packages/shared`
- [x] Confirmar que `legacy/` builda isolado (`pnpm install && pnpm run build` ok)
- [x] Criar este `MIGRATION.md`

### Fase 1 — Fundação Flutter ✅ concluída (2026-08-11), pendências manuais abaixo
- [x] Instalar Flutter SDK (`brew install --cask flutter`, versão 3.44.9) + rodar `flutter doctor`
- [x] Decidir ferramenta de monorepo — sem Melos por enquanto, apenas path dependencies entre pastas (reavaliar se a dor aparecer)
- [x] `flutter create` para `apps/client` (ios,android), `apps/provider` (ios,android,web), `apps/admin` (web) — org `com.reparoexpresso`
- [x] Criar `packages/shared` como Flutter package (`--template=package`, não Dart puro — decisão: como vai embrulhar `supabase_flutter`, que é um plugin Flutter, o package precisa depender do SDK Flutter, não só de Dart puro)
- [x] Ligar os 3 apps a `packages/shared` via path dependency no `pubspec.yaml` (`flutter pub get` confirmou resolução nos 3)
- [x] Xcode completo instalado e ativado (`xcode-select`, `xcodebuild -runFirstLaunch`) + CocoaPods
- [x] Android Studio + SDK command-line tools instalados, licenças aceitas (`flutter doctor --android-licenses`)

### Fase 2 — Camada de dados compartilhada (`packages/shared`) 🟡 fundação pronta, modelos parciais
- [x] Cliente Supabase Dart (`supabase_flutter`) — `ReparoSupabase.initialize()`/`.client` em `lib/src/supabase/reparo_supabase.dart`, credenciais via `.env` (`flutter_dotenv`, mesmas chaves do `legacy/.env`)
- [x] Portar `legacy/src/lib/auth/roles.js` + `mapSessionUser.js` + `supabaseAuthAdapter.js` → `lib/src/auth/` (`AppRole`, `Profile`, `SessionUser`, `AuthService` com `me()`/`logout()`/`signInWithPassword()`/`signUp()`/`sessionChanges` stream)
- [x] Portar `legacy/tailwind.config.js` + `index.css` (paleta "Dark Industrial") → `lib/src/theme/` (`AppColors`, `AppTheme.dark` — fontes Bebas Neue/DM Sans via `google_fonts`)
- [x] Catálogo de serviços: `OfferedService`/`OfferedServiceFieldTemplate` + `OfferedServiceRepository` em cima da tabela real `offered_services` (ver correção na seção 3)
- [x] `ServiceRequest` (schema completo, ~60 colunas) + `ServiceRequestStatus` + `ServiceRequestRepository` (`listMyActive`, `listMine`, `createDraft`, `watchMine` via Realtime)
- [x] `Provider` (schema completo da tabela `providers`)
- [x] Testes unitários dos modelos/roles em `packages/shared/test/` (9 testes, todos passando) + smoke test de tema nos 3 apps
- [x] Os 3 apps atualizados (`main.dart`) para inicializar `ReparoSupabase` e aplicar `AppTheme.dark`, com uma tela de verificação que lê `offered_services` de verdade — prova que a integração funciona ponta a ponta
- [x] Modelos adicionais feitos on-demand pra dar suporte às telas das Fases 3-5 — 19 modelos/repositórios no total: `Wallet`/`WalletTransaction`, `Favorite`, `CustomerLoyalty`/`LoyaltyTransaction` (só leitura, ver nota), `ChatMessage` (tempo real), `CouponValidation` + `PaymentRepository` (Stripe Checkout, PIX, cupom), `StorageRepository`, `Coupon`, `Ticket`/`TicketMessage`, `Referral`, `Cashback`, `ServicePricing`, `AdminActivityLog`
- [x] **Resolvido (sessão nova):** `LoyaltyRepository.redeem()` + Edge Functions `redeemLoyaltyPoints`/`awardLoyaltyPoints` (novas em `supabase/functions/`, portadas do Base44 antigo). Descoberta importante ao portar: o Base44 antigo **nunca chamava** nenhuma das duas — `redeemLoyaltyPoints` era código morto (o frontend fazia o resgate direto no client contra tiers fixos, formato diferente do da function) e `awardLoyaltyPoints` também nunca era invocada de lugar nenhum (pontos por serviço concluído era um recurso anunciado na UI — "Ganhe 1 ponto a cada R$ 1,00 gasto" — mas nunca implementado de fato). A versão nova usa os **tiers fixos reais do frontend legado** (100/250/500/1000 pontos → R$10/30/70/160, ver `LoyaltyRepository.rewardTiers`) em vez da fórmula linear órfã, e `awardLoyaltyPoints` agora é chamada de dentro de `completeServiceRequest` quando o status vira `concluido` — fecha o loop que nunca fechou nem no legado. Precisa de `supabase db push` pra valer em produção (mesma pendência de acesso das outras migrations/functions — ver Backend/infraestrutura).
- [x] `ServiceRequestRepository` ganhou `rate()` (avaliação pós-serviço) e `declineJob()` (recusa de chamado já aceito, via Edge Function `processServiceRefusal` — exige motivo(s) + foto de evidência)
- [x] **Resolvido (sessão nova):** `Review`/`ReviewRepository` (tabela `reviews`) — avaliação **detalhada** pós-serviço, porta de `DetailedRatingModal.jsx` (o modal real usado em `AcompanharServico.jsx`; `RatingModal.jsx`, mais simples, era código morto não referenciado por nenhuma página). Descoberta ao portar: o app antigo já escrevia a avaliação simples em `service_requests.rating_client`, mas a avaliação **detalhada** (pontualidade/qualidade/comportamento + fotos, tabela `reviews`) e a recompensa "Avaliador de Elite" (`grantEliteReviewerBadge`, edge function que já existia mas nunca era chamada) nunca tinham sido portadas — `order_detail_screen.dart` só tinha 1 estrela solta. Corrigido: `_RatingSheet` em `order_detail_screen.dart` agora replica o fluxo completo (nota geral + 3 critérios + comentário + até 3 fotos + badge de 50 pontos quando comentário ≥20 caracteres e ≥1 foto).
- [x] **Resolvido (sessão nova):** modelos/repositórios pendentes criados — `WalletBonus`, `CashbackConfig`, `ReserveFundTransaction`, `Achievement`, `ProviderLevelHistory`, `MonthlyGoal`+`BonusRelease`, `BusyAlert`, `ServicePart`+`SurchargeRule`, `ServicePriceHistoryEntry`, `ProviderUnavailability`. Tabelas do módulo Parceiro (`partners`/`professionals`/`quote_requests`) ficaram de fora de propósito — adiado junto com o resto do módulo, ver seção 0. A maioria é só camada de dados (sem tela nova ainda, RLS documentada no código); exceção: `ProviderUnavailability` já foi ligada em `agenda_screen.dart` (bloqueio de período pontual, fechando a lacuna "sem indisponibilidade pontual" que constava aqui).

### Fase 3 — App Cliente (mobile) 🟡 fluxo principal quase completo
- [x] Roteamento com guarda de auth (`go_router` + `refreshListenable`) — `apps/client/lib/router.dart`, rotas: `/login`, `/register`, `/home`, `/request`, `/payment`, `/orders`, `/orders/detail`, `/profile`, `/wallet`, `/favorites`, `/loyalty`, `/referral`
- [x] `AuthController` (`ChangeNotifier` em `packages/shared`) ligando `AuthService` ao router e às telas via `provider`
- [x] Login (e-mail/senha) — `screens/login_screen.dart`, porta de `Login.jsx`
- [x] Cadastro — `screens/register_screen.dart`, porta de `ClientRegister.jsx`: signUp + criação da linha em `clients` num único formulário, **com upload de foto de perfil e checkbox de aceite de termos**
- [x] Home com catálogo real (tabs casa/veículo, busca) — `screens/home_screen.dart`, porta simplificada de `Home.jsx` (sem splash de marca nem frota ao vivo)
- [x] Solicitação de serviço — `screens/request_screen.dart`, porta de `SolicitarServico.jsx`: urgência (agora/hoje/esta semana), endereço (texto manual — sem mapa interativo, precisaria de API key de mapas), descrição, upload de fotos do problema (`image_picker` + `StorageRepository`)
- [x] Pagamento — `screens/payment_screen.dart`, porta de `PaymentModal.jsx`/`PixPaymentModal.jsx`/`CouponInput.jsx`: cupom validado via Edge Function, cartão abre Stripe Checkout hospedado no navegador (`url_launcher`), PIX mostra o código copia-e-cola. **Sem detecção automática de pagamento confirmado**
- [x] Meus pedidos em tempo real — `screens/orders_screen.dart` → `screens/order_detail_screen.dart` (timeline de status + chat em tempo real + **avaliação por estrelas pós-serviço**)
- [x] Perfil — `screens/profile_screen.dart`: editar nome/telefone, navegação pra carteira/favoritos/fidelidade/indicação
- [x] Carteira — `screens/wallet_screen.dart`: saldo, histórico, **resgate de cashback disponível via PIX**
- [x] Favoritos — `screens/favorites_screen.dart`: listar/remover
- [x] Fidelidade — `screens/loyalty_screen.dart`: pontos/tier/histórico + **resgate de recompensas fixas** (ver Fase 2)
- [x] Indicação — `screens/referral_screen.dart`: gera/mostra código (armazenado em `clients.referral_code`), estatísticas de indicações pendentes vs. convertidas
- [x] `flutter analyze` limpo, `flutter test` passando
- [x] Busca/exibição prévia de prestadores disponíveis antes de confirmar, agendamento com seletor de horários — `request_screen.dart` (checklist desatualizado antes; já estava feito, ver seção 5)
- [x] Perguntas especializadas por tipo de serviço — modais de elétrica/hidráulica/TV/caixa d'água em `request_screen.dart` (pressurizador/válvula transferidora sem slug no catálogo, ver seção 5)
- [x] Aprovação de orçamento extra — bug de backend corrigido (ver seção 3), funcional em `order_detail_screen.dart`
- [x] Garantia — banner + solicitação de retorno em `order_detail_screen.dart`
- [x] **Resolvido (sessão nova):** geolocalização de verdade via `geolocator` (a prévia de prestadores tinha sido removida na rodada anterior por falta disso) + formulário dinâmico por sub-serviço (`service_request_form_fields`) — ambos em `request_screen.dart`, ver seção 0.2
- [ ] Notificações push (`usePushNotifications.js`) — precisa de projeto Firebase/APNs configurado, fora do alcance sem essas credenciais

### Fase 4 — App Prestador (mobile + web) 🟡 fluxo principal quase completo
- [x] Roteamento com guarda de auth — `apps/provider/lib/router.dart`, rotas: `/login`, `/queue`, `/jobs`, `/jobs/detail`, `/earnings`, `/profile`
- [x] Login (e-mail/senha)
- [x] **Cadastro de prestador básico** (`provider_register_screen.dart`) — nome, telefone, cidade/UF, bio, especialidades; cria a linha em `providers` (`is_approved = false`, aguardando aprovação do admin). Acessível direto da tela de fila quando o usuário ainda não tem cadastro. **Sem upload de documentos (RG/CNH) nem CNPJ** — onboarding completo com validação de documentos é bem mais grande, ver pendências
- [x] `ProviderRepository` (`findMine()`, `setOnline()`)
- [x] `ServiceRequestRepository` com o lado prestador: `watchAvailableQueue()`, `listMyJobs()`, `acceptJob()`, `updateStatus()`, `declineJob()`
- [x] **Importante:** aceitar um chamado NÃO é um `UPDATE` direto — a RLS só libera update em OS já atribuídas ao prestador. Fiel ao legacy: `acceptJob()` chama a Edge Function `assignServiceToProvider` (service role). Já atribuída, sim dá pra `UPDATE` direto — é assim que `updateStatus()` avança o status e como `declineJob()` funciona (chama `processServiceRefusal`, que exige motivo(s) + foto de evidência — mesma exigência do legado)
- [x] Tela de fila (`queue_screen.dart`) — chamados em tempo real, aceita de verdade, toggle online/offline funcional, trata "sem cadastro" (com botão pra cadastrar) e "cadastro pendente/bloqueado"
- [x] "Meus jobs" (`jobs_screen.dart`) → **job ativo** (`active_job_screen.dart`): avançar status (aceito → a caminho → em andamento → concluído), **recusar com motivo + foto** (enquanto ainda não iniciou o serviço), **link "ver no mapa"** (abre o app de mapas do sistema via `maps.apple.com` — sem API key), chat em tempo real
- [x] Ganhos (`earnings_screen.dart`): saldo + histórico + **formulário de solicitação de saque via PIX** (chama `processWalletWithdrawal`)
- [x] Perfil do prestador (`provider_profile_screen.dart`): dados, nota, especialidades, logout
- [x] `flutter analyze` limpo, `flutter test` passando
- [x] CNPJ (valida via API pública + salva) + documento de identificação + tipo de veículo (CRLV) — `provider_documents_screen.dart`, reescrito em 2026-08-12 pro schema real (ver seção 0.1): não existem mais colunas separadas de CNH/CRLV como arquivo, só um slot genérico de documento (`id_holding_document_url`) + o tipo de veículo em texto (`crlv_vehicle_type`, sem upload)
- [x] Alerta sonoro de novo chamado + modal fullscreen — `queue_screen.dart` (som via `SystemSound.alert()`, sem asset de áudio customizado)
- [x] ~ Checklist de conclusão (lista fixa) + envio de orçamento de peças extra — `active_job_screen.dart`. Assinatura digital e fotos de conclusão **não implementadas** — sem coluna no schema, adiado a pedido seu (ver seção 0)
- [x] Agenda com disponibilidade por dia/hora + **bloqueio de período pontual** (`provider_unavailability`, sessão nova) — `agenda_screen.dart` (sem calendário visual de agendamentos ainda)
- [x] Gamificação: nível, bônus de cashback, conquistas desbloqueadas (leitura) — `provider_profile_screen.dart`
- [ ] Mapa de área de atuação com raio ajustável (`ProviderLocationMap.jsx`) — 🔒 API key de mapas
- [ ] Notificações push (`useNewJobAlert.js` parte de push) — 🔒 Firebase/APNs

### Fase 5 — Checkpoint Admin ✅ decisão tomada, dashboard com 7 áreas
- [x] Protótipo em Flutter Web: tabela de OS (`DataTable`) com filtro de status, tempo real — `service_requests_tab.dart`
- [x] Decisão final: **Flutter Web** (ver seção 3 — decisões tomadas)
- [x] Guarda de role no router (`admin`/`attendant`), tela `/forbidden` — `apps/admin/lib/router.dart`
- [x] Login funcional
- [x] **Visão geral** (`analytics_tab.dart`, porta de `DashboardAdmin.jsx`): receita (OS concluídas), total de OS, avaliação média, gráfico de barras de OS por status (`fl_chart`) — calculado no cliente a partir de todas as OS, sem otimização de query pra grandes volumes ainda
- [x] Serviços (`service_requests_tab.dart`): tabela de OS com filtro de status
- [x] Aprovação/reprovação de prestadores (`providers_approval_tab.dart`, porta de `ProviderDocumentReview.jsx`) — aprova/reprova o cadastro inteiro, sem revisão de documento por documento
- [x] **Preços** (`pricing_tab.dart`, porta de `ServicePricing.jsx`): listar/criar/editar preço mín-máx por tipo de serviço
- [x] Cupons (`coupons_tab.dart`, porta de `CouponsAdmin.jsx`): listar, criar, ativar/desativar
- [x] Tickets (`tickets_tab.dart`, porta simplificada de `TicketsAdmin.jsx`): lista em tempo real, detalhe com chat de mensagens, responder
- [x] **Log de atividade** (`activity_log_tab.dart`, porta de `ActivityLog.jsx`): lista as últimas 100 ações administrativas — só leitura, sem filtros
- [x] `flutter build web` real compilando limpo, `flutter analyze`/`flutter test` ok
- [x] Gestão financeira: faturas, fechamento quinzenal, fundo de reserva, reembolsos — `finance_tab.dart` (checklist desatualizado antes; ver seção 5)
- [x] Preços por região — `pricing_tab.dart`
- [x] Gestão de clientes com busca/blacklist/histórico — `clients_tab.dart`
- [x] Revisão individual de documentos de prestador (CNH/CRLV/CNPJ) + bloquear/desbloquear — `providers_approval_tab.dart`
- [x] Atribuição manual de pontos de fidelidade — `additional_points_tab.dart`
- [x] **Resolvido (sessão nova):** gestão do catálogo novo (`service_groups`/`professions`/`sub_services`) — `catalog_tab.dart`, nova aba "Catálogo"
- [x] **Resolvido (sessão nova):** gestão de regras de acréscimo (`surcharge_rules`) — `surcharge_rules_tab.dart`, nova aba "Sobretaxas" (13ª aba)
- [x] Gestão de atendentes (criar login real, ativar/desativar) — `attendants_tab.dart`
- [x] Respostas rápidas (templates) + filtro de prioridade + alerta de SLA — `tickets_tab.dart`
- [x] Geração de relatórios em PDF por OS — `pdf_report.dart`
- [x] CSV no log de atividade (copiável via diálogo, não baixa arquivo) — `activity_log_tab.dart`
- [ ] Checklists de conclusão configuráveis por tipo de serviço (ref: `ChecklistsAdmin.jsx`) — adiado a pedido seu, ver seção 0
- [x] Tempo médio de aceite/chegada/execução — `analytics_tab.dart`, via `service_status_transitions` (sessão nova, ver Fase 6)
- [ ] Analytics avançado restante: risco de atraso, auto-encerramento, otimizador de rota (🔒 mapa)

### Fase 6 — Hardening do backend 🟡 auditoria feita, 1 bug corrigido, itens de revisão documentados
Auditoria estática sobre `supabase/migrations/*.sql` e `supabase/functions/*/index.ts` (feita originalmente sem acesso MCP ao projeto Supabase real — a conexão disponível na época estava linkada a outro projeto/conta. **Em 2026-08-12 o MCP certo foi conectado** (`sedvqswypuhpiglnilxk`) e usado pra aplicar as migrations pendentes e fazer deploy das functions corrigidas — ver seção 0.1 pra a descoberta grande dessa sessão, a divergência de schema).

- [x] **RLS**: as ~56 tabelas do schema têm RLS habilitado e política definida (parte via `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` direto, parte via loop dinâmico em `20260525120000_full_base44_migration.sql` sobre `staff_tables`/`read_all_tables`). Nenhuma tabela sem RLS encontrada.
- [x] **Bug encontrado e corrigido, aplicado no banco em 2026-08-12:** as policies de admin do módulo de zonas (`20260528_service_zones.sql` — `zone_cities`, `zone_neighborhoods`, `zone_blocklist`, `service_coverage_requests`) checavam `auth.jwt()->>'role' = 'admin'`, mas este projeto **não tem hook de custom access token** configurado (confirmado — nenhuma menção em migrations nem `config.toml`). Isso significa que esse claim nunca reflete `profiles.role`; um admin de verdade logado no app nunca conseguiria gerenciar zonas direto pelo client, só via `service_role`. O resto do schema usa `public.is_admin()` (consulta `profiles`), que é a forma correta. **Fix em `supabase/migrations/20260601130000_fix_zone_admin_policies.sql`**, aplicado de verdade via MCP nesta sessão.
- [x] **Edge Functions — auditoria de padrão de auth** (60 functions, checagem por padrão de código):
  - `requireAdminOrService` (só admin ou service role): `adminManageProviderAuth`, `adminManageUsers`, `processProviderRepayment`
  - `requireUser` (qualquer autenticado; algumas fazem checagem de role adicional manualmente dentro da function, ex. `generateBiweeklyClosings` checa `role !== 'admin'`): a maioria das ~35 functions restantes
  - Segredo de cron (`isCronRequest`/`isServiceRoleRequest`, com `verify_jwt = false` no `config.toml` porque quem chama não manda JWT de usuário): `checkExpiringServices`, `processRecurringServices`, `processBusyAlerts`, `recalcAllProviderLevels`, `creditAllPendingBonuses`, `sendServiceReminders24h`
  - Assinatura do Stripe: `stripeWebhook`
  - **Resolvido (sessão nova):** as 7 functions com mutação e sem checagem de role foram corrigidas, uma a uma, depois de rastrear quem realmente as chama (grep em `supabase/functions/*/index.ts` por `invokeInternalFunction` + em `legacy/src` pelo nome da function):
    - `calculateProviderLevel`, `onServiceCreated`, `sendPushNotification`, `updateProviderJobCount`: só têm caller interno confirmado (`invokeInternalFunction`, service role key) — travadas com `isServiceRoleRequest()`.
    - `sendEstimateApprovalNotification`: **nenhum caller encontrado** em lugar nenhum do repo — `approveServiceEstimate` já notifica inline, sem passar por ela. Código morto (mesmo padrão do achado em `redeemLoyaltyPoints`/`awardLoyaltyPoints`, ver Fase 2). Travada com `isServiceRoleRequest()` por segurança, já que não há caller legítimo hoje.
    - `sendClosingAlert`: só chamada por `ClosingAlertModal.jsx` (admin) — trocado pra `requireAdminOrService`.
    - `generateServicePasswords`: chamada tanto pelo cliente (`SolicitarServico.jsx`) quanto pelo admin (`AdminCreateOrder.jsx`) — não dava pra travar por role. Reescrita com `requireUser` + checagem de dono (cliente da OS via `created_by`, ou prestador atribuído via `providers.user_id`, ou admin). Antes disso, **qualquer autenticado podia gerar/ver as senhas de segurança de validação presencial de qualquer OS alheia** só sabendo o `request_id` — bug de autorização real, não só falta de defesa em profundidade.
    - `getApplicableSurcharges`, `getGoogleMapsKey`, `validateCoupon` deixadas como estavam (só leitura, risco menor, avaliação original do audit já cobria isso).
  - **Deploy feito em 2026-08-12** via MCP — todas as 7 functions corrigidas (mais 3 corrigidas de novo no mesmo dia por causa do bug de `client_id`/`clients.id`, ver seção 0.1) estão ativas no projeto real.
- [ ] Gerar types/models a partir do schema Supabase para manter os 3 apps sincronizados (hoje os modelos em `packages/shared/lib/src/models/` são escritos à mão, cross-referenciados manualmente com as migrations)

### Fase 7 — QA de paridade
- [ ] Checklist de paridade funcional contra `PRD.md`, por módulo
- [ ] Teste lado a lado com `legacy/` rodando em paralelo

### Fase 8 — Publicação
- [ ] Build e publicação iOS/Android (App Store, Google Play)
- [ ] Deploy web do app prestador e do admin

### Fase 9 — Corte final
- [ ] Tag no git congelando `legacy/` definitivamente
- [ ] Atualizar este documento com status "concluído"

## 5. Lista completa de gaps para paridade total com o `legacy/`

Consolidado de tudo que falta. `🔒` = precisa de credencial/asset externo que não tenho. `~` = parcialmente feito com uma simplificação deliberada (ver seção 3, "decisões pragmáticas").

### Cliente
- [ ] Localização por mapa interativo + geocodificação reversa automática (hoje é texto manual) — 🔒 API key de mapas
- [x] Modais especializados por serviço: elétrica (6 subtipos), hidráulica (5 subtipos), TV (tamanho), caixa d'água (capacidade) — `request_screen.dart`. Pressurizador (formulário de viabilidade) e válvula transferidora não têm slug/service ainda no catálogo (`offered_services`) — nada pra condicionar
- [x] Agendamento com seletor de horários (próximos 7 dias, 8h-17h) — `request_screen.dart`
- [x] Busca/exibição de prestadores disponíveis antes de confirmar — `request_screen.dart` ("Ver prestadores disponíveis")
- [x] Aprovação de orçamento extra — bug de backend corrigido (ver seção 3), funcional em `order_detail_screen.dart`
- [x] Garantia (banner) e solicitação de retorno — `order_detail_screen.dart`
- [x] Dossiê do cliente / analytics de gastos — `dossie_screen.dart`
- [x] Central de notificações — `notifications_screen.dart`
- [ ] Rastreamento de localização ao vivo do prestador durante deslocamento (`LocationTracker.jsx`) — 🔒 mapa
- [ ] Frota ao vivo (`FleetMap.jsx`) — 🔒 mapa
- [ ] Prestadores próximos num mapa (`NearbyProvidersMap.jsx`) — 🔒 mapa (a lista sem mapa já existe, ver acima)
- [x] Abrir ticket de suporte pelo app — `support_ticket_screen.dart` (bug de RLS corrigido, ver seção 3)
- [x] Alarmes de manutenção preventiva — `preventive_reminders_screen.dart`
- [x] Serviços recorrentes (criar/listar/cancelar — a criação da OS em si já era feita pelo cron) — `recurring_services_screen.dart`
- [ ] Conquistas com confetti (`AchievementsPanel.jsx`) — schema só tem `provider_achievements`, não existe tabela equivalente pro lado cliente. Mesma situação dos itens da seção 0 (precisaria inventar uma tabela nova, ex. `client_achievements`) — não implementado até você decidir o formato
- [ ] ~ Assinatura digital do cliente — não implementada, sem coluna no schema (ver seção 0)
- [ ] Notificações push — 🔒 Firebase/APNs
- [x] Reboque: endereço de destino do veículo usando as colunas reais `delivery_*` do schema — `request_screen.dart`

### Prestador
- [x] Cadastro básico de prestador (com seleção de profissões reais, via `provider_professions`) — `provider_register_screen.dart`, reescrito em 2026-08-12 (o insert antigo usava a coluna `specialties`, que não existe — dava erro sempre, ver seção 0.1)
- [x] CNPJ (valida via API pública + salva) + documento de identificação + tipo de veículo (CRLV) — `provider_documents_screen.dart`, reescrito em 2026-08-12 pro schema real (ver seção 0.1)
- [x] Alerta sonoro de novo chamado + **modal fullscreen** (porta de `NewServiceFullscreenModal.jsx`) — `queue_screen.dart`. Som é `SystemSound.alert()`, não a buzina customizada (sem asset de áudio)
- [x] ~ Checklist de conclusão — lista fixa de 4 itens, não configurável pelo admin (sem tabela de templates, ver seção 0) — `active_job_screen.dart`
- [ ] Fotos de conclusão do serviço — não implementado, sem coluna no schema (ver seção 0)
- [ ] ~ Assinatura digital do cliente — não implementada (mesmo motivo, ver seção 0)
- [x] Envio de orçamento de peças extra — bug de backend corrigido, funcional — `active_job_screen.dart`
- [x] Agenda com disponibilidade por dia/hora — `agenda_screen.dart` (sem calendário visual de agendamentos, só a configuração de horários)
- [ ] Mapa de área de atuação com raio ajustável (`ProviderLocationMap.jsx`) — 🔒 mapa
- [x] Dashboard de métricas próprio (concluídos/cancelados/taxa de conclusão + gráfico mensal + **tempo médio de aceite/chegada**, sessão nova via `service_status_transitions`) — `metrics_screen.dart`
- [x] Gamificação: nível, bônus de cashback, conquistas desbloqueadas — `provider_profile_screen.dart` (leitura — sem timeline de mudança de nível nem incentivos)
- [x] Simulador de ganhos — `earnings_screen.dart`
- [x] Fundo de reserva (visualização) — `earnings_screen.dart`
- [x] Abrir ticket de suporte — `support_ticket_screen.dart`
- [x] QR Code para review no Google — `provider_profile_screen.dart` (usa Place ID placeholder, precisa do real — ver seção 3)
- [ ] Notificações push — 🔒 Firebase/APNs

### Admin
- [x] Gestão financeira: faturas, fechamento quinzenal, fundo de reserva, **reembolsos** (lança direto na carteira do cliente) — `finance_tab.dart`. Repasses de prestador ficam cobertos pelos fechamentos quinzenais (mesma tela); configurações de pagamento sem tabela no schema
- [x] Preços por região — `pricing_tab.dart` agora usa as colunas `zone`/`city` já existentes em `service_pricing`. "Por categoria" e tabela de reboque por km não têm coluna equivalente — fora
- [x] Gestão de clientes: busca, blacklist, **histórico detalhado por cliente** — `clients_tab.dart`. Gestão de termos sem tabela de conteúdo de termos — fora
- [x] Gestão de prestadores avançada: busca, bloquear/desbloquear, desfazer decisão, **revisão individual de documento (CNH/CRLV/CNPJ)** — `providers_approval_tab.dart`. Gestão de termos, mesma limitação acima
- [x] Garantias expirando em 7 dias + próximos agendamentos — `analytics_tab.dart`
- [x] Tempo médio de aceite/chegada/execução — `analytics_tab.dart`, via `service_status_transitions` (sessão nova, ver Fase 6)
- [ ] Analytics avançado restante: risco de atraso, auto-encerramento, otimizador de rota (🔒 mapa)
- [ ] ~ Checklists de conclusão configuráveis por serviço — não implementado (o prestador usa uma lista fixa, ver Prestador acima e seção 0)
- [x] Atribuição manual de pontos de fidelidade — `additional_points_tab.dart`
- [x] Gestão de atendentes: criar login (Supabase Auth de verdade via `adminManageUsers`), ativar/desativar — `attendants_tab.dart`
- [x] Respostas rápidas (templates fixos) + filtro de prioridade + alerta de SLA (>22h sem resposta) — `tickets_tab.dart`
- [x] Geração de relatórios em PDF (`pdf`+`printing`, download real no navegador) — `pdf_report.dart`, botão por OS em `service_requests_tab.dart`
- [x] Filtros/exportação CSV no log de atividade — `activity_log_tab.dart` (CSV é copiável via diálogo, não baixa arquivo)

### Módulo Parceiro — não iniciado (a pedido seu, fica só documentado — ver seção 0)
- [ ] Nenhum dos 3 apps tem nada do módulo Parceiro (`PartnerRegister.jsx`, dashboard de comissões/métricas). Não estava no escopo original de "3 apps" — decisão de virar uma 4ª área ou entrar em admin/cliente fica pra quando você quiser retomar.

### Backend / infraestrutura
- [x] **Aplicado em 2026-08-12:** as 4 migrations pendentes (RLS de zonas, coluna `extra_charges`, RLS de tickets, `service_status_transitions`) + deploy das 10 Edge Functions corrigidas/novas — MCP do Supabase conectado ao projeto certo pela primeira vez nesta sessão. Ver seção 0.1 pra a descoberta grande que veio junto (schema real diverge deste repo).
- [x] Revisar as 7 Edge Functions com mutação e sem checagem de role — feito (ver Fase 6), incluindo um bug de autorização real encontrado (`generateServicePasswords` vazava senhas de segurança de OS alheias)
- [x] Migrar `redeemLoyaltyPoints`/`awardLoyaltyPoints` do Base44 antigo pro Supabase — feito (ver Fase 2), com correção: usa os tiers fixos reais do legado, não a fórmula linear que nunca foi de fato usada
- [ ] Decidir e criar schema pra: assinatura digital, fotos de conclusão, checklists configuráveis por serviço (ver seção 0 — adiado a pedido seu)
- [ ] Gerar types/models a partir do schema Supabase automaticamente (hoje é manual) — decisão existente de não fazer por enquanto, ver seção 3
- [x] **Resolvido (sessão nova):** tabela `service_status_transitions` + trigger `record_service_status_transition` (migration `20260601160000_service_status_transitions.sql`) — grava toda mudança de status via trigger no banco (não pela aplicação), porque o app do prestador atualiza `service_requests.status` com `UPDATE` direto (RLS), não só via Edge Function; um trigger é o único jeito de capturar todo call site de uma vez. RLS libera staff (tudo) e dono da OS (cliente ou prestador atribuído, só a própria). Alimenta tempo médio de aceite/chegada/execução em `analytics_tab.dart` (Fase 5) **e** aceite/chegada em `metrics_screen.dart` (Fase 4) — lógica de cálculo compartilhada em `averageStatusDuration()`/`formatAverageDuration()` (`packages/shared`), pra não duplicar entre os dois apps.

**Novos gaps descobertos em 2026-08-12 (schema real ≠ este repo — ver seção 0.1 pros detalhes completos):**
- [x] Adaptar `provider_documents_screen.dart`/`Provider` model/`ProviderRepository`/`provider_register_screen.dart`/`providers_approval_tab.dart` pras colunas reais de `providers` — feito na mesma sessão (2ª rodada), incluindo 4 crashes reais de Edge Function (`.select()` citando coluna inexistente) encontrados e corrigidos de quebra: `calculateProviderLevel`, `sendProviderLevelIncentive`, `sendPushNotification`, `saveProviderCNPJData`.
- [x] **Resolvido (sessão nova, você autorizou decidir por conta própria):** `surcharge_rules`/`coupons` migrados do vocabulário antigo (`service_types text[]`, slugs tipo `'eletrica'`) pro catálogo novo (`profession_ids uuid[]`, FK de verdade pra `professions`). Sem dados reais em nenhuma das duas tabelas (confirmado via MCP), então não teve migração de dados — só schema. `service_types` continua na tabela (marcada `deprecated` via `comment on column`, não lida mais por nenhum código) em vez de dropada, por segurança/reversibilidade. Migration `20260601190000_coupons_surcharges_profession_ids.sql`.
  - `Coupon`/`SurchargeRule` (`packages/shared`) ganharam `professionIds`; `coupons_tab.dart` ganhou seletor de profissões (chips) na criação de cupom — cupom sem seleção continua valendo pra tudo, igual antes.
  - `validateCoupon`/`getApplicableSurcharges` (Edge Functions) trocaram o parâmetro `service_type` por `profession_id` — redeployadas.
  - `payment_screen.dart`/`PaymentRepository.validateCoupon()` agora mandam `request.professionId` em vez de `request.serviceLabel` (que nunca batia com nada).
  - **Achado ao investigar:** existe um *segundo* sistema de sobretaxa no legado, totalmente separado — `night_surcharge`/`weekend_surcharge`/`holiday_surcharge` (booleanos em `service_requests`) calculados com regra fixa no cliente (`ProviderSearchModal.jsx`: ≥18h, sábado, feriado/domingo — 30%/40%/70% fixos), sem relação com a tabela `surcharge_rules` configurável. **Continua não portado** (nem os booleanos fixos, nem o cálculo) — decisão de produto sobre se ainda é o comportamento desejado (parece redundante com o sistema configurável), não decidi por conta própria.
  - [x] **Resolvido (sessão seguinte, ver seção 0.4):** tela admin pra criar/editar `surcharge_rules` (`surcharge_rules_tab.dart`) + banner informativo "sobretaxa aplicada" no app cliente (porta de `SurchargeAlert.jsx`, baseado na tabela configurável, não no sistema fixo acima).
- [x] **Resolvido (sessão nova):** geolocalização do dispositivo no app cliente (`geolocator`) religando "prestadores disponíveis" via `find_nearby_providers` — `request_screen.dart` (permissões adicionadas em `AndroidManifest.xml`/`Info.plist`).
- [x] **Resolvido (sessão nova):** telas de gestão do catálogo novo no admin — `catalog_tab.dart` (3 sub-abas: Grupos/Profissões/Sub-serviços, CRUD completo com "ativar/desativar" em vez de excluir, já que são referenciados por FK em `service_requests`). RLS já tinha policy de admin pronta (`is_admin()`), não precisou de migration.
- [x] **Resolvido parcialmente (sessão nova):** formulário dinâmico por sub-serviço religado no app cliente (`ServiceRequestFormRepository`, `request_screen.dart`) — só os campos com `sub_service_id` preenchido (campos globais com `sub_service_id` nulo ficaram de fora de propósito, pois duplicariam os campos fixos existentes de endereço/descrição). Tipos suportados: `short_text`, `long_text`, `location` (via GPS do `geolocator`, reaproveitando o botão de localização). `service_request_form_files` (upload por campo) **não implementado** — nenhum campo do tipo arquivo existe nos dados reais ainda.
- [x] **Resolvido (sessão nova):** auditoria completa das ~63 Edge Functions por `.select()`/`.update()`/`.insert()`/`.upsert()` com coluna inexistente — 18 bugs reais a mais encontrados e corrigidos, incluindo o cron de recorrência (100% quebrado) e o webhook do Stripe (nunca marcava pagamento). Ver seção 0.2 pros detalhes completos.

### Fora do alcance sem ação sua (credenciais/contas que só você tem)
- 🔒 Mapa interativo de verdade (Google Maps/Mapbox API key)
- 🔒 Notificações push (projeto Firebase + certificado APNs)
- 🔒 Place ID real do Google Meu Negócio (pro QR code de review do prestador)
- 🔒 Publicação nas lojas (Apple Developer + Google Play Console) — Fase 8
- 🔒 QA em dispositivo real — Fase 7

## 6. Notas para sessões futuras

- `legacy/` é somente leitura/referência. Qualquer feature nova ou correção de produto vai para os apps em `apps/`, nunca para `legacy/`.
- Antes de portar qualquer tela, checar primeiro se a lógica correspondente já é uma Edge Function em `supabase/functions/` — se for, o app novo só precisa chamar a function, não reimplementar a regra.
- Atualizar a tabela de status (seção 1) e marcar os itens do checklist (seção 4) conforme o trabalho avança, para qualquer sessão futura (humana ou IA) recuperar o contexto rapidamente.
