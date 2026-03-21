import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Menu, X, Search, User, Briefcase } from "lucide-react";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground tracking-tight">ServiçoPro</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            <Link to="/categories">
              <Button variant="ghost" className="text-sm font-medium">Categorias</Button>
            </Link>
            <Link to="/professionals">
              <Button variant="ghost" className="text-sm font-medium">Profissionais</Button>
            </Link>
            <Link to="/how-it-works">
              <Button variant="ghost" className="text-sm font-medium">Como Funciona</Button>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/request-quote">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5">
                Pedir Orçamento
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="outline" size="icon">
                <User className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <button
            className="md:hidden p-2 rounded-lg hover:bg-accent"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-card px-4 py-4 space-y-2">
          <Link to="/categories" onClick={() => setMobileOpen(false)}>
            <Button variant="ghost" className="w-full justify-start">Categorias</Button>
          </Link>
          <Link to="/professionals" onClick={() => setMobileOpen(false)}>
            <Button variant="ghost" className="w-full justify-start">Profissionais</Button>
          </Link>
          <Link to="/how-it-works" onClick={() => setMobileOpen(false)}>
            <Button variant="ghost" className="w-full justify-start">Como Funciona</Button>
          </Link>
          <Link to="/request-quote" onClick={() => setMobileOpen(false)}>
            <Button className="w-full bg-primary text-primary-foreground font-semibold">
              Pedir Orçamento
            </Button>
          </Link>
          <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
            <Button variant="outline" className="w-full">Painel do Profissional</Button>
          </Link>
        </div>
      )}
    </nav>
  );
}