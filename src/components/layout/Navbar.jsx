import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, User, ClipboardList, ChevronDown, Shield, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import NotificationCenter from '@/components/NotificationCenter';
import { useAuth } from '@/lib/AuthContext';

export default function Navbar() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const isAdmin     = user?.role === 'admin';
  const isAttendant = user?.role === 'attendant';

  /* Fecha dropdown ao clicar fora */
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = () => setDropdownOpen(false);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [dropdownOpen]);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <nav className="sticky top-0 z-50 bg-card/92 backdrop-blur-xl border-b border-border">
      {/* Linha âmbar topo */}
      <div className="h-[2px] bg-gradient-to-r from-primary via-primary/50 to-transparent" />

      <div className="w-full px-4 sm:px-6 h-[56px] flex items-center justify-between">

        {/* ── Logo ── */}
        <Link to="/inicio" className="flex items-center group" aria-label="Reparo Expresso — Início">
          <span className="absolute inset-0 rounded-xl bg-amber-500/8 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <img
            src="/logo.png"
            alt="Reparo Expresso"
            className="relative h-9 w-auto object-contain
                       drop-shadow-[0_0_6px_rgba(245,158,11,0.3)]
                       group-hover:drop-shadow-[0_0_14px_rgba(245,158,11,0.6)]
                       transition-all duration-300 group-hover:scale-105"
          />
        </Link>

        {/* ── Direita: notificações + usuário ── */}
        <div className="flex items-center gap-2">
          <NotificationCenter />

          {/* Badge admin / atendente */}
          {(isAdmin || isAttendant) && (
            <span className={cn(
              'hidden sm:flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider',
              'px-2 py-1 rounded-md border',
              isAdmin
                ? 'text-amber-400 border-amber-400/30 bg-amber-400/8'
                : 'text-sky-400  border-sky-400/30  bg-sky-400/8',
            )}>
              <Shield className="w-3 h-3" />
              {isAdmin ? 'Admin' : 'Suporte'}
            </span>
          )}

          {/* Dropdown do usuário */}
          {user && (
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setDropdownOpen(p => !p)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg
                           hover:bg-accent transition-colors border border-border"
              >
                <div className="w-7 h-7 rounded-md bg-primary/15 border border-primary/30
                                flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary">
                    {user.full_name?.charAt(0) || 'U'}
                  </span>
                </div>
                <span className="hidden sm:block text-sm font-semibold text-foreground max-w-[96px] truncate">
                  {user.full_name?.split(' ')[0]}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-card border border-border
                                rounded-xl shadow-2xl py-1.5 z-50">
                  <Link to="/perfil" onClick={() => setDropdownOpen(false)}>
                    <button type="button"
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm
                                 text-foreground hover:bg-accent rounded-lg mx-1 transition-colors"
                      style={{ width: 'calc(100% - 8px)' }}
                    >
                      <User className="w-4 h-4 text-muted-foreground" /> Meu Perfil
                    </button>
                  </Link>

                  {user?.role === 'user' && (
                    <Link to="/meus-pedidos" onClick={() => setDropdownOpen(false)}>
                      <button type="button"
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm
                                   text-foreground hover:bg-accent rounded-lg mx-1 transition-colors"
                        style={{ width: 'calc(100% - 8px)' }}
                      >
                        <ClipboardList className="w-4 h-4 text-muted-foreground" /> Meus Pedidos
                      </button>
                    </Link>
                  )}

                  {user?.role === 'provider' && (
                    <Link to="/prestador" onClick={() => setDropdownOpen(false)}>
                      <button type="button"
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm
                                   text-foreground hover:bg-accent rounded-lg mx-1 transition-colors"
                        style={{ width: 'calc(100% - 8px)' }}
                      >
                        <ClipboardList className="w-4 h-4 text-muted-foreground" /> Meus Chamados
                      </button>
                    </Link>
                  )}

                  {user?.role === 'partner' && (
                    <Link to="/inicio" onClick={() => setDropdownOpen(false)}>
                      <button type="button"
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm
                                   text-foreground hover:bg-accent rounded-lg mx-1 transition-colors"
                        style={{ width: 'calc(100% - 8px)' }}
                      >
                        <LayoutDashboard className="w-4 h-4 text-muted-foreground" /> Dashboard Parceiro
                      </button>
                    </Link>
                  )}

                  {(isAdmin || isAttendant) && (
                    <>
                      <div className="h-px bg-border mx-2 my-1" />
                      <Link to="/admin" onClick={() => setDropdownOpen(false)}>
                        <button type="button"
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm
                                     text-amber-400 hover:bg-amber-400/8 rounded-lg mx-1 transition-colors"
                          style={{ width: 'calc(100% - 8px)' }}
                        >
                          <Shield className="w-4 h-4" />
                          {isAdmin ? 'Painel Admin' : 'Central de Suporte'}
                        </button>
                      </Link>
                    </>
                  )}

                  <div className="h-px bg-border mx-2 my-1" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm
                               text-destructive hover:bg-destructive/10 rounded-lg mx-1 transition-colors"
                    style={{ width: 'calc(100% - 8px)' }}
                  >
                    <LogOut className="w-4 h-4" /> Sair
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
