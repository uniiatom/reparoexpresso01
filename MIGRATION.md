# Migração Reparo Expresso: React → Flutter (3 apps)

> Documento vivo. Atualizar a cada marco relevante — status, decisões novas, o que mudou de plano.
> Última atualização: 2026-08-11

## 1. Status atual

| App | Tecnologia (atual/planejada) | Status |
|---|---|---|
| Backend | Supabase (Postgres + Auth + Edge Functions + Storage) | ✅ Ativo, inalterado |
| Legado (referência) | React 18 + Vite | ✅ Congelado em `legacy/`, buildável isoladamente |
| Cliente (mobile) | Flutter | ⬜ Não iniciado |
| Prestador (mobile + web) | Flutter | ⬜ Não iniciado |
| Admin (web) | Flutter Web *(a validar)* ou React | ⬜ Não iniciado — decisão na Fase 5 |

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
- **Tentativa de Flutter nos 3 apps.** Cliente e prestador são bons encaixes (mobile nativo; prestador ganha mobile+web de uma codebase só). Admin é o caso duvidoso — Flutter Web ainda é fraco para dashboards densos (tabelas, SEO, editores rich-text). Vamos validar com um protótipo antes de comprometer todo o admin (Fase 5). Se não convencer, plano B é manter admin em React, migrando só cliente e prestador.
  - Alternativa que ficou registrada mas não escolhida: React Native no lugar do Flutter para cliente/prestador, o que manteria tudo em JS/TS e reaproveitaria mais lógica do `legacy/`. Descartada por ora porque o objetivo agora é validar o caminho Flutter primeiro.
- **Backend permanece 100% Supabase.** Nenhuma lógica nova entra na pasta `base44/` (dentro de `legacy/`), que é resquício da plataforma Base44 original, já superada.
- **Catálogos hoje hardcoded no frontend** (`legacy/src/lib/serviceTypes.js`, `offeredServices.js`) devem migrar para as tabelas `ServiceCategory`/`ServiceSubcategory` já existentes no Supabase ao construir `packages/shared`, para não duplicar esse catálogo em 3 codebases diferentes.
- **App não está em produção** (confirmado em 2026-08-11) — por isso `legacy/` foi congelado sem se preocupar em manter o deploy Netlify ativo a partir da nova localização. Se isso mudar antes da migração terminar, reavaliar.

## 4. Checklist faseado

### Fase 0 — Reestruturação do repo ✅ concluída (2026-08-11)
- [x] Mover app React para `legacy/` (com `git mv`, histórico preservado)
- [x] Backend Supabase permanece na raiz, inalterado
- [x] Criar esqueleto `apps/{client,provider,admin}` e `packages/shared`
- [x] Confirmar que `legacy/` builda isolado (`pnpm install && pnpm run build` ok)
- [x] Criar este `MIGRATION.md`

### Fase 1 — Fundação Flutter
- [ ] Instalar Flutter SDK + rodar `flutter doctor`
- [ ] Decidir ferramenta de monorepo (começar sem Melos; adicionar só se a dor de gerenciar 3 apps + 1 package aparecer)
- [ ] `flutter create` para `apps/client`, `apps/provider`, `apps/admin`
- [ ] Criar `packages/shared` como package Dart (models/constantes/lógica comuns aos 3 apps)

### Fase 2 — Camada de dados compartilhada (`packages/shared`)
- [ ] Cliente Supabase Dart (`supabase_flutter`) usando as mesmas credenciais do `.env` do `legacy/`
- [ ] Modelos a partir das 47 entidades em `legacy/base44/entities/*.jsonc` (referência rápida de schema) cruzado com `supabase/migrations` (fonte real do banco)
- [ ] Portar `legacy/src/lib/auth/roles.js` e `supabaseAuthAdapter.js` → sessão/roles em Dart
- [ ] Migrar catálogos hardcoded para tabelas `ServiceCategory`/`ServiceSubcategory`
- [ ] Portar `legacy/tailwind.config.js` (cores/tipografia) para `ThemeData` Flutter

### Fase 3 — App Cliente (mobile)
- [ ] Auth/onboarding (ref: `legacy/src/pages/ClientRegister.jsx`)
- [ ] Home + catálogo de serviços + busca (ref: `Home.jsx`)
- [ ] Fluxo de solicitação multi-step (ref: `SolicitarServico.jsx`)
- [ ] Rastreamento em tempo real + chat (ref: `AcompanharServico.jsx`)
- [ ] Pagamento Stripe + PIX (ref: `PaymentModal.jsx`, `PixPaymentModal.jsx`)
- [ ] Perfil, carteira, fidelidade, favoritos, indicação

### Fase 4 — App Prestador (mobile + web)
- [ ] Auth/onboarding + CNPJ (ref: `ProviderRegister.jsx`, `ProviderCNPJRegistration.jsx`)
- [ ] Fila de chamados + alerta sonoro + aceite/recusa (ref: `ProviderApp.jsx`, `useNewJobAlert.js`)
- [ ] Job ativo: mapa, chat, checklist, assinatura, fotos (ref: `ActiveJobCard.jsx`)
- [ ] Agenda/disponibilidade (ref: `ProviderSchedule.jsx`)
- [ ] Ganhos, saque, fundo de reserva (ref: `ProviderEarnings.jsx`)
- [ ] Gamificação: níveis, cashback, conquistas (ref: `ProviderAwards.jsx`)

### Fase 5 — Checkpoint Admin
- [ ] Protótipo pequeno em Flutter Web (uma tela densa, ex. lista de OS com filtros) para validar DX/UX
- [ ] Decisão final registrada aqui: Flutter Web completo vs. manter React
- [ ] Construir `apps/admin` na tecnologia escolhida

### Fase 6 — Hardening do backend
- [ ] Auditar RLS de todas as tabelas por role (isolamento entre os 3 apps passa a depender 100% do banco)
- [ ] Revisar Edge Functions quanto a checagem de role/permissão
- [ ] Gerar types/models a partir do schema Supabase para manter os 3 apps sincronizados

### Fase 7 — QA de paridade
- [ ] Checklist de paridade funcional contra `PRD.md`, por módulo
- [ ] Teste lado a lado com `legacy/` rodando em paralelo

### Fase 8 — Publicação
- [ ] Build e publicação iOS/Android (App Store, Google Play)
- [ ] Deploy web do app prestador e do admin

### Fase 9 — Corte final
- [ ] Tag no git congelando `legacy/` definitivamente
- [ ] Atualizar este documento com status "concluído"

## 5. Notas para sessões futuras

- `legacy/` é somente leitura/referência. Qualquer feature nova ou correção de produto vai para os apps em `apps/`, nunca para `legacy/`.
- Antes de portar qualquer tela, checar primeiro se a lógica correspondente já é uma Edge Function em `supabase/functions/` — se for, o app novo só precisa chamar a function, não reimplementar a regra.
- Atualizar a tabela de status (seção 1) e marcar os itens do checklist (seção 4) conforme o trabalho avança, para qualquer sessão futura (humana ou IA) recuperar o contexto rapidamente.
