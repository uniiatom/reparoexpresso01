import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, User, Shield, LogOut, ClipboardList, ChevronDown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import NotificationCenter from '@/components/NotificationCenter';
import { useAuth } from '@/lib/AuthContext';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = () => setDropdownOpen(false);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [dropdownOpen]);

  const isAdmin = user?.role === 'admin';
  const isAttendant = user?.role === 'attendant';
  const showAdminNav = isAdmin || isAttendant;

  const handleLogout = async () => {
    setDropdownOpen(false);
    setOpen(false);
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border">
      <div className="h-[2px] bg-gradient-to-r from-primary via-primary/60 to-transparent" />

      <div className="max-w-5xl mx-auto px-4 h-15 flex items-center justify-between" style={{ height: '60px' }}>
        <Link to="/inicio" className="flex items-center gap-2 group" aria-label="Reparo Expresso — Início">
          <div className="relative flex items-center">
            {/* Halo âmbar sutil atrás da logo */}
            <span className="absolute inset-0 rounded-xl bg-amber-500/10 blur-md scale-110 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <img
              src="/logo.png"
              alt="Reparo Expresso"
              className="relative h-10 w-auto object-contain drop-shadow-[0_0_8px_rgba(245,158,11,0.35)] group-hover:drop-shadow-[0_0_14px_rgba(245,158,11,0.65)] transition-all duration-300 group-hover:scale-105"
              style={{ filter: 'drop-shadow(0 0 6px rgba(245,158,11,0.3))' }}
            />
          </div>
        </Link>

        <div className="hidden sm:flex items-center gap-1">
          <NotificationCenter />
          <Link to="/prestador">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all",
                location.pathname === '/prestador' && "bg-accent text-foreground"
              )}
            >
              Sou Prestador
            </Button>
          </Link>
          {showAdminNav && (
            <Link to="/admin">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent",
                  location.pathname === '/admin' && "bg-accent text-foreground"
                )}
              >
                <Shield className="w-3.5 h-3.5 mr-1.5" />{' '}
                {isAttendant && !isAdmin ? 'Suporte' : 'Admin'}
              </Button>
            </Link>
          )}

          {user ? (
            <div className="relative ml-1" onClick={e => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setDropdownOpen(p => !p)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-accent transition-colors border border-border"
              >
                <div className="w-7 h-7 rounded-md bg-primary/15 border border-primary/30 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">{user.full_name?.charAt(0) || 'U'}</span>
                </div>
                <span className="text-sm font-semibold text-foreground max-w-[100px] truncate">
                  {user.full_name?.split(' ')[0]}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-card border border-border rounded-xl shadow-2xl py-1.5 z-50">
                  <Link to="/perfil" onClick={() => setDropdownOpen(false)}>
                    <button type="button" className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-lg mx-1 transition-colors" style={{ width: 'calc(100% - 8px)' }}>
                      <User className="w-4 h-4 text-muted-foreground" /> Meu Perfil
                    </button>
                  </Link>
                  <Link to="/meus-pedidos" onClick={() => setDropdownOpen(false)}>
                    <button type="button" className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-lg mx-1 transition-colors" style={{ width: 'calc(100% - 8px)' }}>
                      <ClipboardList className="w-4 h-4 text-muted-foreground" /> Meus Pedidos
                    </button>
                  </Link>
                  <div className="h-px bg-border mx-2 my-1" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg mx-1 transition-colors"
                    style={{ width: 'calc(100% - 8px)' }}
                  >
                    <LogOut className="w-4 h-4" /> Sair
                  </button>
                </div>
              )}
            </div>
          ) : null}

          <Link to="/solicitar">
            <Button
              size="sm"
              className="ml-1 rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary/90 amber-glow-sm transition-all"
            >
              <Zap className="w-3.5 h-3.5 mr-1.5" />
              Pedir Serviço
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:hidden">
          <NotificationCenter />
          <button type="button" className="p-2 rounded-lg hover:bg-accent transition-colors" onClick={() => setOpen(!open)}>
            {open ? <X className="w-5 h-5 text-foreground" /> : <Menu className="w-5 h-5 text-foreground" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="sm:hidden border-t border-border bg-card px-4 py-3 space-y-1">
          {user && (
            <>
              <div className="flex items-center gap-3 px-3 py-3 mb-2 bg-primary/8 border border-primary/20 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">{user.full_name?.charAt(0) || 'U'}</span>
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{user.full_name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <Link to="/perfil" onClick={() => setOpen(false)}>
                <Button variant="ghost" className="w-full justify-start rounded-lg gap-2 text-foreground hover:bg-accent">
                  <User className="w-4 h-4" /> Meu Perfil
                </Button>
              </Link>
              <Link to="/meus-pedidos" onClick={() => setOpen(false)}>
                <Button variant="ghost" className="w-full justify-start rounded-lg gap-2 text-foreground hover:bg-accent">
                  <ClipboardList className="w-4 h-4" /> Meus Pedidos
                </Button>
              </Link>
            </>
          )}
          <Link to="/prestador" onClick={() => setOpen(false)}>
            <Button variant="ghost" className="w-full justify-start rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent">
              Sou Prestador
            </Button>
          </Link>
          {showAdminNav && (
            <Link to="/admin" onClick={() => setOpen(false)}>
              <Button variant="ghost" className="w-full justify-start rounded-lg gap-2 text-muted-foreground hover:text-foreground hover:bg-accent">
                <Shield className="w-4 h-4" /> {isAttendant && !isAdmin ? 'Suporte' : 'Admin'}
              </Button>
            </Link>
          )}
          <Link to="/solicitar" onClick={() => setOpen(false)}>
            <Button className="w-full rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary/90 gap-2 amber-glow-sm">
              <Zap className="w-4 h-4" /> Pedir Serviço
            </Button>
          </Link>
          {user && (
            <>
              <div className="h-px bg-border my-1" />
              <Button
                variant="ghost"
                className="w-full justify-start rounded-lg gap-2 text-destructive hover:bg-destructive/10"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" /> Sair da conta
              </Button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
