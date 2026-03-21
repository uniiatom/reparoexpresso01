import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Wrench, Menu, X, User, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const links = [
    { to: "/prestador", label: "Sou Prestador" },
    { to: "/admin", label: "Admin", icon: Shield },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-card/90 backdrop-blur-xl border-b border-border/50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
            <Wrench className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-extrabold text-foreground tracking-tight">MaridoPro</span>
        </Link>

        <div className="hidden sm:flex items-center gap-1">
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

        <button className="sm:hidden p-2 rounded-xl hover:bg-accent" onClick={() => setOpen(!open)}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
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