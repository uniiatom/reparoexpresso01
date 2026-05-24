# Spec: Área de Cadastro e Perfil do Prestador de Serviço

**Data:** 2026-05-23  
**Status:** Aprovado  
**Escopo:** Formulário de cadastro do prestador + aba de perfil editável no app

---

## Contexto

O projeto já possui a rota `/cadastro-prestador` com `ProviderRegistrationForm`, que inclui dados pessoais, endereço, serviços e disponibilidade. O fluxo de aprovação também já existe (`is_approved: false` no create).

**O que falta / precisa mudar:**
1. Campos de email + senha no cadastro (criação de conta Supabase Auth)
2. Campo "Região de atuação" com GPS auto-detect
3. Aba "Meu Perfil" editável no app do prestador (pós-aprovação)
4. Botão de solicitação de redefinição de senha → notificação ao admin

---

## Fluxo de Cadastro

```
Prestador acessa /cadastro-prestador (rota pública)
  ↓
Preenche formulário único scrollável em seções
  ↓
Submit:
  1. supabase.auth.signUp({ email, password }) → obtém user_id
  2. base44.Provider.create({ ...dados, user_id, is_approved: false })
  3. base44.ProviderAvailability.create(...) para cada dia selecionado
  ↓
Tela de confirmação: "Cadastro enviado! Aguardando aprovação."
  ↓
Admin aprova → prestador pode logar e usar o app
```

---

## Seções do Formulário de Cadastro

### 1. Acesso (novo)
| Campo | Tipo | Validação |
|-------|------|-----------|
| E-mail | `input[type=email]` | obrigatório, formato válido |
| Senha | `input[type=password]` + toggle show/hide | obrigatório, mín. 6 caracteres |
| Confirmar senha | `input[type=password]` + toggle show/hide | deve ser igual à senha |

### 2. Dados Pessoais (já existe, sem mudanças)
- Nome completo*, telefone/WhatsApp*, data de nascimento*, CPF*, RG*

### 3. Endereço (já existe, sem mudanças)
- CEP*, rua e número*, bairro, cidade*, estado*

### 4. Região de Atuação (novo)
**Comportamento:**
- Botão primário **"📡 Usar minha localização atual"**
  - Chama `navigator.geolocation.getCurrentPosition()`
  - Em caso de sucesso: envia coordenadas para Nominatim (já usado no projeto) para reverse geocode
  - Retorna `neighbourhood` + `city` → exibe como tag confirmável
  - Em caso de negação/erro: mostra campo de texto manual sem bloquear o fluxo
- Input de texto livre para adicionar regiões manualmente
- O prestador pode ter **múltiplas regiões** (array de strings)
- Ao menos **1 região obrigatória**

**Armazenamento:** campo `coverage_regions` (array de strings) no Provider. Coordenadas GPS (quando obtidas) salvas em `latitude` + `longitude`.

### 5. Qualificações (já existe, sem mudanças)
- Certificações/cursos*, anos de experiência*, observações (opcional)

### 6. Serviços e Preço por Hora (já existe, sem mudanças)
- Tipo de serviço + R$/hora, mínimo 1 entrada*

### 7. Disponibilidade (já existe, sem mudanças)
- Dias da semana (checkboxes visuais: Dom–Sáb)*, horário início*, horário fim*, máx. serviços/dia

### 8. Homologação (já existe, sem mudanças)
- Checkbox de aceite do processo de homologação na Escola Prática*

---

## Aba "Meu Perfil" no ProviderApp

Nova aba adicionada à navegação do `ProviderApp.jsx` com ícone 👤 e label "Perfil".

### Seções editáveis:
1. **Dados básicos** — nome, telefone, email (read-only — não pode trocar email pelo app)
2. **Região de atuação** — mesma UX do cadastro: GPS + tags editáveis
3. **Disponibilidade** — dias da semana + horário início/fim
4. **Segurança** — botão "🔑 Solicitar redefinição de senha"

### Comportamento "Solicitar redefinição de senha":
- O prestador clica no botão
- Cria um registro na tabela `Ticket` (sistema existente) com:
  - `type: 'outro'` (tipos válidos: `problema_tecnico`, `pagamento`, `duvida`, `outro`)
  - `subject: 'Redefinição de senha'`  
  - `message: 'Prestador [nome] solicita redefinição de senha. Email: [email]'`
  - `provider_id: provider.id`
  - `status: 'aberto'`
- Toast de confirmação: "Solicitação enviada! Nossa equipe entrará em contato."
- Botão fica desabilitado por 24h (controle via `localStorage`) para evitar spam

### Salvar alterações:
- Botão "Salvar" por seção (edição independente)
- `base44.Provider.update(provider.id, { coverage_regions, ... })`
- Para disponibilidade: `base44.ProviderAvailability.update/create` por dia

---

## Mudanças no Admin (TicketsAdmin)

Nenhuma mudança estrutural necessária. O ticket de "Redefinição de senha" aparece automaticamente na lista de tickets existente com tag `suporte`. O admin pode ver o email do prestador na mensagem e enviar o reset via painel Supabase ou diretamente.

---

## Arquivos a criar / modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/providers/ProviderRegistrationForm.jsx` | Modificar | Adicionar seção Acesso (email+senha) e seção Região GPS |
| `src/lib/providerRegistration.js` | Modificar | Chamar `supabase.auth.signUp` antes do create; incluir `coverage_regions` no payload |
| `src/lib/constants/providerServiceTypes.js` | Modificar | Nenhuma mudança necessária (regiões são texto livre) |
| `src/pages/ProviderApp.jsx` | Modificar | Adicionar aba "Perfil" na navegação + renderizar ProviderProfileTab |
| `src/components/providers/ProviderProfileTab.jsx` | Criar | Componente da aba Perfil: dados, região, disponibilidade, reset senha |

---

## Validações críticas no submit

1. Email não pode já existir no Supabase Auth → tratar erro `"User already registered"`
2. Senha e confirmação devem ser iguais → validar no frontend antes de chamar signUp
3. Ao menos 1 região de atuação
4. Se signUp Supabase falhar → não criar o Provider (fail fast, mostrar erro)
5. Se create Provider falhar após signUp → logar erro (não há rollback automático do auth; aceitar como edge case raro)

## Pré-requisito Supabase

A opção **"Confirm email"** no painel Supabase (Authentication → Settings) deve estar **desabilitada** para que o prestador consiga logar imediatamente após o cadastro sem precisar verificar o email. Se estiver habilitada, o fluxo vai pedir verificação antes de permitir acesso — o que bloquearia o uso do app antes mesmo da aprovação do admin. Recomenda-se manter desabilitada já que a aprovação manual do admin é o controle de acesso principal.

---

## Restrições / fora do escopo

- Não migrar autenticação de base44 para Supabase (já está parcialmente migrado)
- Não alterar o fluxo de aprovação do admin (já funciona)
- Não criar nova tela/rota para o admin gerenciar resets (usa sistema de tickets existente)
- Edição de email não é permitida pelo app (requer fluxo Supabase separado)
