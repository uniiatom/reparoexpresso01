# Design: Configurações de Prestadores no Admin

**Data:** 2026-05-24  
**Rota:** `admin?tab=providers` → botão "Configurações" → modal `ProviderSettings`  
**Status:** Aprovado

---

## Contexto

O painel de configurações de prestadores (`ProviderSettings.jsx`) permite ao admin definir regras globais que afetam o cadastro e a atuação dos prestadores. Este spec descreve três evoluções nesse painel:

1. **Campos obrigatórios customizados** — além de ligar/desligar campos fixos, o admin pode criar campos personalizados livres.
2. **Serviços disponíveis** — a lista de serviços que aparecem no cadastro do prestador passa a vir de `OfferedService` (cadastrado em `admin?tab=servicos-prestados`), não mais de uma lista estática.
3. **Horários por dia com múltiplos intervalos** — substituir a janela única global (início/fim) por uma grade semanal onde cada dia pode ter N intervalos de horário independentes.

---

## Modelo de Dados

### Nova migration: `supabase/migrations/20260524_provider_config_v2.sql`

```sql
ALTER TABLE public.provider_config
  ADD COLUMN IF NOT EXISTS allowed_day_schedules      jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS custom_registration_fields jsonb DEFAULT '[]';
```

Os campos `allowed_weekdays`, `allowed_hours_start` e `allowed_hours_end` permanecem no banco por compatibilidade mas deixam de ser usados pela UI nova.

### Estrutura de `allowed_day_schedules`

Objeto JSON com chaves `"0"` a `"6"` (0 = Domingo, 6 = Sábado). Chave ausente ou valor `[]` significa dia desabilitado.

```json
{
  "1": [{ "start": "11:00", "end": "20:00" }],
  "2": [
    { "start": "20:00", "end": "22:00" },
    { "start": "22:00", "end": "23:00" }
  ],
  "3": [
    { "start": "08:00", "end": "11:00" },
    { "start": "13:00", "end": "15:00" }
  ]
}
```

### Estrutura de `custom_registration_fields`

Array de objetos, um por campo personalizado:

```json
[
  {
    "id": "registro_crea",
    "label": "Registro CREA",
    "field_type": "text",
    "is_required": true,
    "sort_order": 0
  },
  {
    "id": "foto_veiculo",
    "label": "Foto do veículo",
    "field_type": "file",
    "is_required": false,
    "sort_order": 1
  }
]
```

Tipos suportados: `text`, `textarea`, `file`, `number`.

---

## Componentes

### `src/components/admin/ProviderSettings.jsx`

Três cards evoluídos dentro do arquivo existente. Usar sub-componentes internos para manter o arquivo legível.

#### Card 1 — Campos Obrigatórios no Cadastro

**Seção A — campos fixos (atual, sem mudança):**
- Grid de checkboxes para `REGISTRATION_FIELDS` (CPF, RG, CEP, etc.)
- Persiste em `provider_config.required_fields`

**Seção B — campos personalizados (novo):**
- Lista dos campos já criados, exibidos como linhas com: ícone do tipo, label, badge "Obrigatório" se aplicável, botão editar (pencil), botão deletar (trash)
- Botão `+ Novo campo` abre um form inline (não modal) com:
  - Input de texto: **Label** (ex: "Registro CREA")
  - Select de **Tipo**: Texto / Parágrafo / Arquivo (foto) / Número
  - Toggle **Obrigatório**
  - Botões Salvar / Cancelar
- Ao salvar, adiciona ao array `custom_registration_fields` e chama `saveConfig`
- `id` gerado como slug do label (ex: "Registro CREA" → `registro_crea_<timestamp>`)

#### Card 2 — Serviços Disponíveis

- Remove lista de checkboxes de `PROVIDER_SERVICE_TYPES`
- Exibe:
  - Contagem de serviços ativos (query `OfferedService.list()` filtrado por `is_active = true`)
  - Texto: *"Os serviços cadastrados em Serviços Prestados aparecem automaticamente no cadastro do prestador."*
  - Botão `→ Gerenciar serviços` que: (1) chama prop `onClose()` para fechar o modal, (2) usa `useSearchParams` do `react-router-dom` para `setSearchParams({ tab: 'servicos-prestados' })`
  - `ProviderSettings` aceita prop opcional `onClose?: () => void` passada pelo `AdminProvidersPanel` via `<ProviderSettings onClose={() => setShowSettings(false)} />`

#### Card 3 — Horários por Dia

Substitui os dois cards atuais ("Dias de Atuação" e "Horários de Atendimento").

**Layout — Grade semanal visual (opção B escolhida):**
- 7 colunas, uma por dia da semana (Dom → Sáb)
- Header de cada coluna: nome abreviado do dia + toggle (Switch) para habilitar/desabilitar
- Corpo da coluna (apenas se habilitado):
  - Chips de slots: `"11:00–20:00"` — clicável para editar
  - Botão `+` no rodapé da coluna para adicionar novo slot
- Clicar num chip ou no `+` abre um **Popover** (usando `Popover` do shadcn/ui) com:
  - `<input type="time">` para início
  - `<input type="time">` para fim
  - Botão "Salvar slot" / "Remover slot"
- Botão "Salvar horários" no rodapé do card chama `saveConfig({ allowed_day_schedules: ... })`

**Estado local:**
```js
// Exemplo de estado antes de salvar
const [daySchedules, setDaySchedules] = useState({});
// daySchedules["2"] = [{ start: "20:00", end: "22:00" }, { start: "22:00", end: "23:00" }]
```

**Inicialização:** ao carregar `savedConfig`, se `allowed_day_schedules` vier preenchido, usa ele; caso contrário, converte `allowed_weekdays` + `allowed_hours_start/end` para o novo formato como migração suave.

---

### `src/components/providers/ProviderRegistrationForm.jsx`

Duas mudanças:

**1. Serviços do prestador — substituir lista estática:**
- Adicionar query: `useQuery(['offered-services'], () => OfferedService.list('sort_order', 200).filter(s => s.is_active !== false))`
- Substituir os checkboxes de `PROVIDER_SERVICE_TYPES` por checkboxes gerados a partir dessa lista
- Cada checkbox exibe `service.name` e guarda `service.slug` como valor

**2. Campos personalizados — renderização dinâmica:**
- Após carregar `provider_config`, ler `custom_registration_fields`
- Renderizar cada campo após os campos fixos do formulário
- Tipos → componentes:
  - `text` → `<Input>`
  - `textarea` → `<Textarea>`
  - `file` → `<input type="file">` com upload via `base44.integrations.Core.UploadFile`
  - `number` → `<Input type="number">`
- Validação: se `is_required === true`, bloquear submit se vazio

---

## Fluxo de salvamento

Todos os três cards usam a mesma mutation `saveConfig` já existente, passando apenas o patch do campo alterado:

```js
saveConfig.mutate({ custom_registration_fields: [...] });
saveConfig.mutate({ allowed_day_schedules: { ... } });
```

Nenhuma nova mutation é necessária.

---

## Tratamento de erros

- Campos fixos obrigatórios: sem mudança (já funciona)
- Campo personalizado sem label → toast de erro, não salva
- Slot com `end <= start` → toast de aviso, não salva o slot
- Falha na query de `OfferedService` → exibe mensagem "Não foi possível carregar os serviços" em vez de lista vazia silenciosa

---

## Testes manuais (pós-implementação)

1. Adicionar campo personalizado "Foto do veículo" (tipo Arquivo, obrigatório) → abrir cadastro de prestador → campo aparece e bloqueia envio se vazio
2. Configurar Terça com slots 20–22 e 22–23 → salvar → recarregar página → configuração persiste
3. Cadastrar novo serviço em `Serviços Prestados` → abrir cadastro de prestador → serviço aparece na lista
4. Desabilitar Domingo na grade → salvar → `allowed_day_schedules` não tem chave `"0"`
