import React from 'react';
import { Link } from 'react-router-dom';
import { Briefcase } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-foreground text-background/80 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-background">ServiçoPro</span>
            </div>
            <p className="text-sm text-background/60 leading-relaxed">
              Conectando você aos melhores profissionais da sua região.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-background mb-4 text-sm uppercase tracking-wider">Para Clientes</h4>
            <ul className="space-y-2">
              <li><Link to="/categories" className="text-sm hover:text-primary transition-colors">Buscar Serviços</Link></li>
              <li><Link to="/request-quote" className="text-sm hover:text-primary transition-colors">Pedir Orçamento</Link></li>
              <li><Link to="/how-it-works" className="text-sm hover:text-primary transition-colors">Como Funciona</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-background mb-4 text-sm uppercase tracking-wider">Para Profissionais</h4>
            <ul className="space-y-2">
              <li><Link to="/dashboard" className="text-sm hover:text-primary transition-colors">Painel</Link></li>
              <li><Link to="/professionals" className="text-sm hover:text-primary transition-colors">Profissionais</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-background mb-4 text-sm uppercase tracking-wider">Suporte</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-sm hover:text-primary transition-colors">Central de Ajuda</a></li>
              <li><a href="#" className="text-sm hover:text-primary transition-colors">Termos de Uso</a></li>
              <li><a href="#" className="text-sm hover:text-primary transition-colors">Política de Privacidade</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-background/10 mt-10 pt-6 text-center">
          <p className="text-sm text-background/40">© 2026 ServiçoPro. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}