import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, User, Shield, LogOut, ClipboardList, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import NotificationCenter from '@/components/NotificationCenter';
import { base44 } from '@/api/base44Client';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [user, setUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    base44.auth.me().then(u => setUser(u)).catch(() => setUser(null));
  }, []);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = () => setDropdownOpen(false);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [dropdownOpen]);

  const isAdmin = user?.role === 'admin';

  return (
    <nav className="sticky top-0 z-50 bg-card/90 backdrop-blur-xl border-b border-border/50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img
            src="https://media.base44.com/images/public/69bdfd09a4593d6a3b1890df/b2b780191_d9741c6a-dbbe-4b19-a2b3-b5734557ae14.jpg"
            alt="Me Socorro - Marido de Aluguel"
            className="h-10 w-auto object-contain"
          />
        </Link>

        {/* Desktop */}
        <div className="hidden sm:flex items-center gap-1">
          <NotificationCenter />
          <Link to="/prestador">
            <Button variant="ghost" size="sm" className={cn("rounded-xl text-sm", location.pathname === '/prestador' && "bg-accent")}>
              Sou Prestador
            </Button>
          </Link>
          {isAdmin && (
            <Link to="/admin">
              <Button variant="ghost" size="sm" className={cn("rounded-xl text-sm", location.pathname === '/admin' && "bg-accent")}>
                <Shield className="w-3.5 h-3.5 mr-1.5" /> Admin
              </Button>
            </Link>
          )}

          {user ? (
            <div className="relative ml-1" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setDropdownOpen(p => !p)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-accent transition-colors border border-border"
              >
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">{user.full_name?.charAt(0) || 'U'}</span>
                </div>
                <span className="text-sm font-semibold text-foreground max-w-[100px] truncate">{user.full_name?.split(' ')[0]}</span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-card border border-border rounded-2xl shadow-xl py-2 z-50">
                  <Link to="/perfil" onClick={() => setDropdownOpen(false)}>
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent rounded-xl mx-1 transition-colors" style={{width: 'calc(100% - 8px)'}}>
                      <User className="w-4 h-4 text-muted-foreground" /> Meu Perfil
                    </button>
                  </Link>
                  <Link to="/meus-pedidos" onClick={() => setDropdownOpen(false)}>
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent rounded-xl mx-1 transition-colors" style={{width: 'calc(100% - 8px)'}}>
                      <ClipboardList className="w-4 h-4 text-muted-foreground" /> Meus Pedidos
                    </button>
                  </Link>
                  <div className="h-px bg-border mx-3 my-1" />
                  <button
                    onClick={() => base44.auth.logout('/')}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 rounded-xl mx-1 transition-colors" style={{width: 'calc(100% - 8px)'}}
                  >
                    <LogOut className="w-4 h-4" /> Sair
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1 ml-1">
              <Button size="sm" variant="outline" className="rounded-xl font-semibold" onClick={() => base44.auth.redirectToLogin('/cadastro')}>
                <User className="w-3.5 h-3.5 mr-1.5" /> Criar conta
              </Button>
              <Button size="sm" variant="ghost" className="rounded-xl font-semibold" onClick={() => base44.auth.redirectToLogin('/')}>
                Entrar
              </Button>
            </div>
          )}

          <Link to="/solicitar">
            <Button size="sm" className="ml-1 rounded-xl bg-primary text-primary-foreground font-semibold">
              Pedir Serviço
            </Button>
          </Link>
        </div>

        {/* Mobile right */}
        <div className="flex items-center gap-2 sm:hidden">
          <NotificationCenter />
          {!user && (
            <Button size="sm" className="rounded-xl text-xs font-semibold px-3 h-8" onClick={() => base44.auth.redirectToLogin('/')}>
              Entrar
            </Button>
          )}
          <button className="p-2 rounded-xl hover:bg-accent" onClick={() => setOpen(!open)}>
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="sm:hidden border-t border-border bg-card px-4 py-3 space-y-1">
          {user ? (
            <>
              <div className="flex items-center gap-3 px-3 py-3 mb-2 bg-primary/5 rounded-2xl">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">{user.full_name?.charAt(0) || 'U'}</span>
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{user.full_name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <Link to="/perfil" onClick={() => setOpen(false)}>
                <Button variant="ghost" className="w-full justify-start rounded-xl gap-2">
                  <User className="w-4 h-4" /> Meu Perfil
                </Button>
              </Link>
              <Link to="/meus-pedidos" onClick={() => setOpen(false)}>
                <Button variant="ghost" className="w-full justify-start rounded-xl gap-2">
                  <ClipboardList className="w-4 h-4" /> Meus Pedidos
                </Button>
              </Link>
            </>
          ) : (
            <div className="space-y-1">
              <Button variant="outline" className="w-full rounded-xl font-semibold gap-2" onClick={() => { setOpen(false); base44.auth.redirectToLogin('/cadastro'); }}>
                <User className="w-4 h-4" /> Criar conta
              </Button>
              <Button variant="ghost" className="w-full rounded-xl font-semibold gap-2" onClick={() => { setOpen(false); base44.auth.redirectToLogin('/'); }}>
                Entrar / Login
              </Button>
            </div>
          )}
          <Link to="/prestador" onClick={() => setOpen(false)}>
            <Button variant="ghost" className="w-full justify-start rounded-xl">Sou Prestador</Button>
          </Link>
          {isAdmin && (
            <Link to="/admin" onClick={() => setOpen(false)}>
              <Button variant="ghost" className="w-full justify-start rounded-xl gap-2">
                <Shield className="w-4 h-4" /> Admin
              </Button>
            </Link>
          )}
          <Link to="/solicitar" onClick={() => setOpen(false)}>
            <Button className="w-full rounded-xl bg-primary text-primary-foreground font-semibold">Pedir Serviço</Button>
          </Link>
          {user && (
            <>
              <div className="h-px bg-border my-1" />
              <Button
                variant="ghost"
                className="w-full justify-start rounded-xl gap-2 text-destructive hover:bg-destructive/10"
                onClick={() => base44.auth.logout('/')}
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