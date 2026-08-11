# packages/shared

Futuro package Dart compartilhado pelos 3 apps (`client`, `provider`, `admin`): cliente Supabase, models, lógica de sessão/roles, design tokens, catálogo de serviços.

Ainda não iniciado. Ver checklist da Fase 2 em [`/MIGRATION.md`](../../MIGRATION.md).

Referência de código (React, congelado) para portar:
- [`/legacy/src/lib/supabase`](../../legacy/src/lib/supabase) — cliente Supabase
- [`/legacy/src/lib/auth`](../../legacy/src/lib/auth) — roles e mapeamento de sessão
- [`/legacy/src/lib/repositories`](../../legacy/src/lib/repositories) — acesso a dados
- [`/legacy/src/lib/serviceTypes.js`](../../legacy/src/lib/serviceTypes.js), [`offeredServices.js`](../../legacy/src/lib/offeredServices.js) — catálogos (migrar para tabelas `ServiceCategory`/`ServiceSubcategory` no Supabase em vez de portar 1:1)
- [`/legacy/tailwind.config.js`](../../legacy/tailwind.config.js) — cores/tipografia para portar para `ThemeData`
