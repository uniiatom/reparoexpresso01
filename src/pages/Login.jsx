import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wrench } from 'lucide-react';

export default function Login() {
  const { isAuthenticated, isLoadingAuth, signInWithPassword } = useAuth();
  const location = useLocation();
  const from = location.state?.from || '/inicio';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="h-10 w-10 border-2 border-zinc-700 border-t-amber-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={from === '/' ? '/inicio' : from} replace />;
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signInWithPassword(email.trim(), password);
    } catch (err) {
      setError(err.message || 'Não foi possível entrar. Verifique e-mail e senha.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-zinc-950 text-zinc-100">
      <div className="lg:w-1/2 relative overflow-hidden flex flex-col justify-between p-8 lg:p-12 border-b lg:border-b-0 lg:border-r border-zinc-800/80">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/15 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
            <Wrench className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Reparo Expresso</h1>
            <p className="text-xs text-zinc-500 uppercase tracking-widest">Marketplace de reparos</p>
          </div>
        </div>
        <div className="relative z-10 mt-10 lg:mt-0 max-w-md">
          <p className="text-2xl lg:text-3xl font-semibold text-white leading-snug">
            Profissionais homologados, atendimento rápido e acompanhamento em tempo real.
          </p>
          <p className="mt-4 text-sm text-zinc-400 leading-relaxed">
            Entre com sua conta para solicitar serviços, acompanhar chamados ou gerenciar sua operação como prestador.
          </p>
        </div>
        <p className="relative z-10 text-[11px] text-zinc-600 mt-8">© {new Date().getFullYear()} Reparo Expresso</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Entrar</h2>
            <p className="text-sm text-zinc-400 mt-1">Use o e-mail cadastrado no Supabase Auth.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 h-11"
                placeholder="voce@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-300">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-zinc-900 border-zinc-700 text-white h-11"
              />
            </div>
            {error && (
              <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">{error}</p>
            )}
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-11 rounded-xl bg-amber-500 text-zinc-950 font-semibold hover:bg-amber-400"
            >
              {submitting ? 'Entrando…' : 'Entrar na plataforma'}
            </Button>
          </form>

          <p className="text-center text-sm text-zinc-500">
            Ainda não tem conta?{' '}
            <Link to="/cadastro" className="text-amber-400 font-medium hover:underline">
              Cadastro de cliente
            </Link>
          </p>
          <p className="text-center text-xs text-zinc-600">
            Prestador?{' '}
            <Link to="/cadastro-prestador" className="text-zinc-400 hover:text-amber-400/90 underline-offset-2 hover:underline">
              Cadastro prestador
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
