import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Search, UserCheck, Shield, Headphones, Briefcase,
  User, Edit2, Trash2, Key, X, Eye, EyeOff, Loader2,
  AlertTriangle, ChevronDown, MoreHorizontal, Mail, Phone,
  CalendarDays, CheckCircle2, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { invokeFunction } from '@/lib/supabaseFunctions';

// ── Helpers ────────────────────────────────────────────────────────────────

const ROLES = [
  { value: 'user',      label: 'Cliente',      icon: User,       color: 'text-sky-400',    bg: 'bg-sky-500/12 border-sky-500/25',   dot: 'bg-sky-400' },
  { value: 'provider',  label: 'Prestador',    icon: Briefcase,  color: 'text-amber-400',  bg: 'bg-amber-500/12 border-amber-500/25', dot: 'bg-amber-400' },
  { value: 'admin',     label: 'Admin',        icon: Shield,     color: 'text-rose-400',   bg: 'bg-rose-500/12 border-rose-500/25',  dot: 'bg-rose-400' },
  { value: 'attendant', label: 'Atendente',    icon: Headphones, color: 'text-violet-400', bg: 'bg-violet-500/12 border-violet-500/25', dot: 'bg-violet-400' },
  { value: 'partner',   label: 'Parceiro',     icon: UserCheck,  color: 'text-emerald-400',bg: 'bg-emerald-500/12 border-emerald-500/25', dot: 'bg-emerald-400' },
];

function getRoleConfig(role) {
  return ROLES.find(r => r.value === role) ?? {
    value: role, label: role, icon: User,
    color: 'text-muted-foreground', bg: 'bg-muted/40 border-border',
    dot: 'bg-muted-foreground',
  };
}

function RoleBadge({ role, size = 'sm' }) {
  const cfg = getRoleConfig(role);
  const Icon = cfg.icon;
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full border font-semibold',
      size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
      cfg.bg, cfg.color,
    )}>
      <Icon className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      {cfg.label}
    </span>
  );
}

function Avatar({ name, role, size = 'md' }) {
  const cfg = getRoleConfig(role);
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-11 h-11 text-base' };
  return (
    <div className={cn(
      'rounded-xl flex items-center justify-center font-black border flex-shrink-0',
      sizes[size], cfg.bg, cfg.color,
    )}>
      {initial}
    </div>
  );
}

// ── Card ───────────────────────────────────────────────────────────────────

function AdminCard({ children, className }) {
  return (
    <div className={cn('rounded-2xl border border-white/[0.07] bg-card/60 backdrop-blur-sm overflow-hidden', className)}>
      {children}
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────

function Field({ label, required, error, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}

function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'w-full px-3 py-2 rounded-xl border border-white/[0.09] bg-background/60',
        'text-sm text-foreground placeholder:text-muted-foreground/50',
        'focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40',
        'transition-colors',
        className,
      )}
      {...props}
    />
  );
}

function Select({ value, onChange, children, className }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className={cn(
        'w-full px-3 py-2 rounded-xl border border-white/[0.09] bg-background/60',
        'text-sm text-foreground',
        'focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40',
        'transition-colors appearance-none',
        className,
      )}
    >
      {children}
    </select>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="relative z-10 w-full max-w-md"
          >
            <AdminCard>
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                <h3 className="text-sm font-bold text-foreground">{title}</h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 hover:bg-white/[0.06] rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="px-5 py-5">{children}</div>
            </AdminCard>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ── Confirm Delete Modal ──────────────────────────────────────────────────

function ConfirmDeleteModal({ user, onConfirm, onClose, isPending }) {
  return (
    <Modal open={!!user} onClose={onClose} title="Confirmar exclusão">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-xl bg-rose-500/8 border border-rose-500/20">
          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-rose-300 leading-relaxed">
            Tem certeza que deseja excluir <strong>{user?.full_name}</strong>?
            Esta ação é irreversível e removerá o acesso imediatamente.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 rounded-xl text-sm"
            onClick={onClose}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1 rounded-xl text-sm bg-rose-500 hover:bg-rose-600 text-white border-rose-500"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1.5" />}
            Excluir
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Section divider ──────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 pt-1 pb-0.5">
      <div className="w-5 h-5 rounded-md bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0">
        <Icon className="w-2.5 h-2.5 text-primary" />
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="flex-1 h-px bg-white/[0.05]" />
    </div>
  );
}

// ── Create / Edit Form ────────────────────────────────────────────────────

const EMPTY_FORM = { full_name: '', email: '', password: '', role: 'user', phone: '' };

function UserForm({ initial = EMPTY_FORM, isEdit = false, onSubmit, isPending, onClose }) {
  const [form, setForm]           = useState({ ...EMPTY_FORM, ...initial });
  const [showPwd, setShowPwd]     = useState(false);
  const [errors, setErrors]       = useState({});

  const originalEmail = initial.email ?? '';
  const emailChanged  = isEdit && form.email.trim().toLowerCase() !== originalEmail.trim().toLowerCase();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = 'Nome obrigatório';
    if (!form.email.trim())     e.email     = 'E-mail obrigatório';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'E-mail inválido';
    if (!isEdit && (!form.password || form.password.length < 6)) e.password = 'Mínimo 6 caracteres';
    if (isEdit && form.password && form.password.length < 6) e.password = 'Mínimo 6 caracteres';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = { ...form };
    if (isEdit && !payload.password) delete payload.password;
    if (!payload.phone) delete payload.phone;
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">

      {/* ── Seção 1: Dados pessoais ── */}
      <SectionHeader icon={User} label="Dados pessoais" />

      <Field label="Nome completo" required error={errors.full_name}>
        <Input
          value={form.full_name}
          onChange={e => set('full_name', e.target.value)}
          placeholder="João da Silva"
          autoFocus
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo de conta" required>
          <div className="relative">
            <Select value={form.role} onChange={e => set('role', e.target.value)}>
              {ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </Select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </Field>

        <Field label="Telefone">
          <Input
            type="tel"
            value={form.phone}
            onChange={e => set('phone', e.target.value)}
            placeholder="(11) 99999-9999"
          />
        </Field>
      </div>

      {/* ── Seção 2: Dados de acesso ── */}
      <SectionHeader icon={Key} label="Dados de acesso" />

      {/* E-mail */}
      <Field label="E-mail de acesso" required error={errors.email}>
        <Input
          type="email"
          value={form.email}
          onChange={e => set('email', e.target.value)}
          placeholder="joao@email.com"
          autoComplete="off"
        />
        {emailChanged && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex items-start gap-1.5 mt-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/8 border border-amber-500/20"
          >
            <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-300 leading-relaxed">
              O e-mail será alterado. O usuário deverá usar o novo endereço para acessar.
            </p>
          </motion.div>
        )}
      </Field>

      {/* Senha */}
      <Field
        label={isEdit ? 'Nova senha' : 'Senha'}
        required={!isEdit}
        error={errors.password}
      >
        <div className="relative">
          <Input
            type={showPwd ? 'text' : 'password'}
            value={form.password}
            onChange={e => set('password', e.target.value)}
            placeholder={isEdit ? 'Deixe vazio para não alterar' : '••••••••'}
            autoComplete="new-password"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPwd(p => !p)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
        {isEdit && (
          <p className="text-[10px] text-muted-foreground/60 mt-1 pl-0.5">
            Preencha apenas se quiser definir uma nova senha.
          </p>
        )}
      </Field>

      <div className="flex gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          className="flex-1 rounded-xl text-sm"
          onClick={onClose}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          className="flex-1 rounded-xl text-sm"
          disabled={isPending}
        >
          {isPending
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : isEdit
              ? <><CheckCircle2 className="w-4 h-4 mr-1.5" />Salvar alterações</>
              : <><Plus className="w-4 h-4 mr-1.5" />Criar usuário</>
          }
        </Button>
      </div>
    </form>
  );
}

// ── User Row Card ─────────────────────────────────────────────────────────

function UserCard({ user, onEdit, onDelete, onResetPassword, index }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const cfg = getRoleConfig(user.role);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      className="group relative"
    >
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/[0.06] bg-card/40 hover:bg-card/70 hover:border-white/[0.10] transition-all duration-200">

        {/* Avatar */}
        <Avatar name={user.full_name} role={user.role} size="md" />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground truncate">
              {user.full_name || '—'}
            </p>
            <RoleBadge role={user.role} />
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-xs text-muted-foreground flex items-center gap-1 truncate">
              <Mail className="w-3 h-3 flex-shrink-0" />{user.email}
            </span>
            {user.phone && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="w-3 h-3 flex-shrink-0" />{user.phone}
              </span>
            )}
            {user.created_at && (
              <span className="text-xs text-muted-foreground/60 flex items-center gap-1 hidden sm:flex">
                <CalendarDays className="w-3 h-3 flex-shrink-0" />
                {new Date(user.created_at).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
        </div>

        {/* Actions — desktop */}
        <div className="hidden sm:flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onResetPassword(user)}
            className="p-1.5 hover:bg-white/[0.08] rounded-lg transition-colors text-muted-foreground hover:text-foreground"
            title="Redefinir senha"
          >
            <Key className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onEdit(user)}
            className="p-1.5 hover:bg-white/[0.08] rounded-lg transition-colors text-muted-foreground hover:text-primary"
            title="Editar"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(user)}
            className="p-1.5 hover:bg-rose-500/10 rounded-lg transition-colors text-muted-foreground hover:text-rose-400"
            title="Excluir"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Actions — mobile (menu) */}
        <div className="sm:hidden relative">
          <button
            type="button"
            onClick={() => setMenuOpen(p => !p)}
            className="p-1.5 hover:bg-white/[0.08] rounded-lg transition-colors"
          >
            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-white/[0.09] rounded-xl shadow-xl shadow-black/30 overflow-hidden min-w-[140px]">
              {[
                { icon: Key,    label: 'Redefinir senha', action: () => { onResetPassword(user); setMenuOpen(false); }, color: '' },
                { icon: Edit2,  label: 'Editar',           action: () => { onEdit(user);          setMenuOpen(false); }, color: '' },
                { icon: Trash2, label: 'Excluir',          action: () => { onDelete(user);        setMenuOpen(false); }, color: 'text-rose-400' },
              ].map(item => (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.action}
                  className={cn(
                    'flex items-center gap-2 w-full px-3 py-2 text-xs font-medium hover:bg-white/[0.06] transition-colors',
                    item.color || 'text-foreground',
                  )}
                >
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Password Reset Modal ──────────────────────────────────────────────────

function ResetPasswordModal({ user, onClose, onSubmit, isPending }) {
  const [pwd, setPwd]         = useState('');
  const [show, setShow]       = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!pwd || pwd.length < 6) { setError('Mínimo 6 caracteres'); return; }
    onSubmit(pwd);
  };

  return (
    <Modal open={!!user} onClose={onClose} title="Redefinir senha">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
          <Key className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-xs text-amber-300">
            Definindo nova senha para <strong>{user?.full_name}</strong>
          </p>
        </div>
        <Field label="Nova senha" required error={error}>
          <div className="relative">
            <Input
              type={show ? 'text' : 'password'}
              value={pwd}
              onChange={e => { setPwd(e.target.value); setError(''); }}
              placeholder="Mínimo 6 caracteres"
              autoFocus
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShow(p => !p)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground"
            >
              {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </Field>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1 rounded-xl text-sm" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" className="flex-1 rounded-xl text-sm" disabled={isPending}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Key className="w-4 h-4 mr-1.5" />Salvar</>}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Filter Tabs ───────────────────────────────────────────────────────────

const FILTER_TABS = [
  { value: 'all', label: 'Todos' },
  ...ROLES,
];

// ── Main Component ────────────────────────────────────────────────────────

export default function AdminUsersManager() {
  const queryClient = useQueryClient();

  const [search, setSearch]               = useState('');
  const [roleFilter, setRoleFilter]       = useState('all');
  const [createOpen, setCreateOpen]       = useState(false);
  const [editUser, setEditUser]           = useState(null);
  const [deleteUser, setDeleteUser]       = useState(null);
  const [resetUser, setResetUser]         = useState(null);

  // ── Data ──────────────────────────────────────────────────────────────
  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await invokeFunction('adminManageUsers', { action: 'list' });
      return res.users ?? [];
    },
    staleTime: 30_000,
  });

  // ── Mutations ─────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload) => invokeFunction('adminManageUsers', { action: 'create', ...payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Usuário criado com sucesso!');
      setCreateOpen(false);
    },
    onError: (err) => toast.error(err?.message ?? 'Erro ao criar usuário'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ userId, ...payload }) =>
      invokeFunction('adminManageUsers', { action: 'update', user_id: userId, ...payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Usuário atualizado!');
      setEditUser(null);
    },
    onError: (err) => toast.error(err?.message ?? 'Erro ao atualizar usuário'),
  });

  const deleteMutation = useMutation({
    mutationFn: (userId) =>
      invokeFunction('adminManageUsers', { action: 'delete', user_id: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Usuário excluído.');
      setDeleteUser(null);
    },
    onError: (err) => toast.error(err?.message ?? 'Erro ao excluir usuário'),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ userId, password }) =>
      invokeFunction('adminManageUsers', { action: 'update', user_id: userId, password }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Senha redefinida!');
      setResetUser(null);
    },
    onError: (err) => toast.error(err?.message ?? 'Erro ao redefinir senha'),
  });

  // ── Filter ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchRole = roleFilter === 'all' || u.role === roleFilter || (!u.role && roleFilter === 'user');
      const matchSearch = !q || (u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
      return matchRole && matchSearch;
    });
  }, [users, search, roleFilter]);

  const countByRole = useMemo(() => {
    const counts = {};
    users.forEach(u => {
      const r = u.role || 'user';
      counts[r] = (counts[r] || 0) + 1;
    });
    return counts;
  }, [users]);

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-3 flex-wrap"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Gerenciar Usuários</h2>
            <p className="text-xs text-muted-foreground">{users.length} usuários cadastrados</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="p-2 hover:bg-white/[0.06] rounded-xl transition-colors border border-white/[0.06]"
            title="Atualizar lista"
          >
            <RefreshCw className={cn('w-3.5 h-3.5 text-muted-foreground', isLoading && 'animate-spin')} />
          </button>
          <Button
            onClick={() => setCreateOpen(true)}
            className="rounded-xl h-9 text-xs font-bold gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Criar Usuário
          </Button>
        </div>
      </motion.div>

      {/* ── Stats row ── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2"
      >
        {ROLES.map((r) => {
          const Icon = r.icon;
          const count = countByRole[r.value] ?? 0;
          return (
            <button
              key={r.value}
              type="button"
              onClick={() => setRoleFilter(prev => prev === r.value ? 'all' : r.value)}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all text-left',
                roleFilter === r.value
                  ? cn(r.bg, 'border-opacity-50')
                  : 'border-white/[0.06] bg-card/40 hover:bg-card/70',
              )}
            >
              <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', r.bg)}>
                <Icon className={cn('w-3.5 h-3.5', r.color)} />
              </div>
              <div>
                <p className={cn('text-base font-bold leading-tight', r.color)}>{count}</p>
                <p className="text-[10px] text-muted-foreground">{r.label}s</p>
              </div>
            </button>
          );
        })}
      </motion.div>

      {/* ── Search + Filter row ── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
      >
        <AdminCard>
          <div className="px-4 py-3 flex flex-col sm:flex-row gap-2">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nome ou e-mail…"
                className="pl-8"
              />
            </div>
            {/* Role filter */}
            <div className="relative sm:w-40">
              <Select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                <option value="all">Todos os tipos</option>
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </Select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Count info */}
          <div className="px-4 pb-2.5">
            <p className="text-xs text-muted-foreground">
              {filtered.length === users.length
                ? `${users.length} usuários`
                : `${filtered.length} de ${users.length} usuários`}
              {roleFilter !== 'all' && ` · Filtrando: ${getRoleConfig(roleFilter).label}s`}
              {search && ` · Busca: "${search}"`}
            </p>
          </div>
        </AdminCard>
      </motion.div>

      {/* ── User List ── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.10 }}
      >
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted/30 border border-white/[0.05] flex items-center justify-center mb-3">
              <Users className="w-5 h-5 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground">Nenhum usuário encontrado</p>
            {(search || roleFilter !== 'all') && (
              <button
                type="button"
                onClick={() => { setSearch(''); setRoleFilter('all'); }}
                className="text-xs text-primary mt-2 hover:underline"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map((user, i) => (
              <UserCard
                key={user.id}
                user={user}
                index={i}
                onEdit={setEditUser}
                onDelete={setDeleteUser}
                onResetPassword={setResetUser}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Modals ── */}

      {/* Create */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Criar novo usuário">
        <UserForm
          onSubmit={(payload) => createMutation.mutate(payload)}
          isPending={createMutation.isPending}
          onClose={() => setCreateOpen(false)}
        />
      </Modal>

      {/* Edit */}
      <Modal
        open={!!editUser}
        onClose={() => setEditUser(null)}
        title={`Editar — ${editUser?.full_name}`}
      >
        {editUser && (
          <UserForm
            isEdit
            initial={{
              full_name: editUser.full_name ?? '',
              email: editUser.email ?? '',
              password: '',
              role: editUser.role ?? 'user',
              phone: editUser.phone ?? '',
            }}
            onSubmit={(payload) =>
              updateMutation.mutate({ userId: editUser.id, ...payload })
            }
            isPending={updateMutation.isPending}
            onClose={() => setEditUser(null)}
          />
        )}
      </Modal>

      {/* Reset Password */}
      <ResetPasswordModal
        user={resetUser}
        onClose={() => setResetUser(null)}
        isPending={resetPasswordMutation.isPending}
        onSubmit={(password) =>
          resetPasswordMutation.mutate({ userId: resetUser.id, password })
        }
      />

      {/* Delete Confirm */}
      <ConfirmDeleteModal
        user={deleteUser}
        onClose={() => setDeleteUser(null)}
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(deleteUser.id)}
      />
    </div>
  );
}
