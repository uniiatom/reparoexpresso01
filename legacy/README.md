# legacy/ — app React/Vite (congelado, referência)

Este é o app original do Reparo Expresso (React 18 + Vite + Supabase), movido para cá em `2026-08-11` como ponto de partida da migração para Flutter. Ver [`/MIGRATION.md`](../MIGRATION.md) na raiz para o plano completo.

**Status: congelado.** Não recebe novas features nem correções de produto — só é mantido aqui para consulta enquanto os apps novos (`/apps/client`, `/apps/provider`, `/apps/admin`) são construídos. Bugs críticos podem ser corrigidos aqui se este app ainda estiver em uso paralelo, mas o destino de qualquer funcionalidade nova é o Flutter.

O backend (Supabase — migrations e Edge Functions) **não** está aqui, continua ativo em [`/supabase`](../supabase) na raiz e é compartilhado por este app legado e pelos apps novos.

## Rodar localmente

```bash
cd legacy
pnpm install
pnpm run dev      # dev server (porta 3002)
pnpm run build    # build de produção em legacy/dist
```

Variáveis de ambiente: copiar `.env.example` para `.env` (já existe um `.env` local não versionado). Ver `VITE_SUPABASE_*` — as mesmas credenciais do projeto Supabase usado pelos apps novos.

## Onde procurar o quê (para portar para Flutter)

| Área | Caminho |
|---|---|
| Páginas/telas | `src/pages/` |
| Componentes | `src/components/` (`admin/`, `provider/`, `auth/`, `wallet/`, `shared/`, `ui/` etc.) |
| Cliente Supabase | `src/lib/supabase/` |
| Auth e roles | `src/lib/auth/` (`roles.js`, `mapSessionUser.js`), `src/lib/AuthContext.jsx`, `src/lib/supabaseAuthAdapter.js` |
| Acesso a dados | `src/lib/repositories/` |
| Catálogo de serviços (hardcoded — migrar para tabelas `ServiceCategory`/`ServiceSubcategory`) | `src/lib/serviceTypes.js`, `src/lib/offeredServices.js` |
| Hooks customizados | `src/hooks/` |
| Design tokens (cores/tipografia) | `tailwind.config.js` |
| Config de páginas/rotas | `src/App.jsx` |

Documentação funcional completa (regras de negócio, fluxos, glossário de status) está em [`/PRD.md`](../PRD.md), não neste README.

## Histórico

Este projeto começou na plataforma Base44 (pasta `base44/` aqui dentro, hoje inativa) e foi migrado para Supabase — ver `docs/functions-inventory.md` na raiz para o inventário de Edge Functions.
