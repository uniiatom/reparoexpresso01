import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Wrench, Menu, X, User, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import NotificationCenter from '@/components/NotificationCenter';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const links = [
    { to: "/cadastro", label: "Criar conta" },
    { to: "/prestador", label: "Sou Prestador" },
    { to: "/admin", label: "Admin", icon: Shield },
  ];

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

        <div className="hidden sm:flex items-center gap-1">
          <NotificationCenter />
          {links.map(l => (
            <Link key={l.to} to={l.to}>
              <Button
                variant="ghost"
                size="sm"
                className={cn("rounded-xl text-sm", location.pathname === l.to && "bg-accent text-foreground")}
              >
                {l.icon && <l.icon className="w-3.5 h-3.5 mr-1.5" />}
                {l.label}
              </Button>
            </Link>
          ))}
          <Link to="/solicitar">
            <Button size="sm" className="ml-2 rounded-xl bg-primary text-primary-foreground font-semibold">
              Pedir Serviço
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <NotificationCenter />
          <button className="sm:hidden p-2 rounded-xl hover:bg-accent" onClick={() => setOpen(!open)}>
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="sm:hidden border-t border-border bg-card px-4 py-3 space-y-1">
          {links.map(l => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)}>
              <Button variant="ghost" className="w-full justify-start rounded-xl">{l.label}</Button>
            </Link>
          ))}
          <Link to="/solicitar" onClick={() => setOpen(false)}>
            <Button className="w-full rounded-xl bg-primary text-primary-foreground font-semibold">Pedir Serviço</Button>
          </Link>
        </div>
      )}
    </nav>
  );
}