import React from 'react';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { AlertTriangle } from 'lucide-react';

export default function SupabaseConfigGuard({ children }) {
  if (isSupabaseConfigured()) return children;

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-lg w-full rounded-2xl border border-amber-500/30 bg-zinc-900/90 p-6 space-y-4 shadow-xl shadow-amber-500/10">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-amber-400 shrink-0" />
          <h1 className="text-lg font-bold">Configuração do Supabase pendente</h1>
        </div>
        <p className="text-sm text-zinc-400 leading-relaxed">
          O site foi publicado sem as variáveis de ambiente do Supabase. O login e os dados não funcionam até você configurá-las e gerar um <strong className="text-zinc-200">novo deploy</strong>.
        </p>
        <ol className="text-sm text-zinc-300 space-y-2 list-decimal list-inside">
          <li>No Netlify: <span className="text-amber-400">Site configuration → Environment variables</span></li>
          <li>Copie do seu <code className="text-xs bg-zinc-800 px-1 py-0.5 rounded">.env</code> local:
            <ul className="mt-2 ml-4 space-y-1 text-xs text-zinc-400 list-disc">
              <li>VITE_SUPABASE_URL</li>
              <li>VITE_SUPABASE_PUBLISHABLE_KEY</li>
              <li>VITE_SUPABASE_PROJECT_ID</li>
              <li>VITE_BASE44_APP_ID</li>
              <li>VITE_BASE44_APP_BASE_URL</li>
            </ul>
          </li>
          <li>No terminal do projeto: <code className="text-xs bg-zinc-800 px-1 py-0.5 rounded">pnpm netlify:env</code> (após <code className="text-xs bg-zinc-800 px-1 py-0.5 rounded">netlify login</code> e <code className="text-xs bg-zinc-800 px-1 py-0.5 rounded">netlify link</code>)</li>
          <li>Em <span className="text-amber-400">Deploys → Trigger deploy</span>, rode um deploy novo</li>
        </ol>
        <p className="text-xs text-zinc-500">
          Copie os valores do arquivo <code>.env</code> local ou do painel Supabase → Project Settings → API.
        </p>
      </div>
    </div>
  );
}
