import React from 'react';
import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-card border-t border-border mt-auto">
      {/* Amber top accent */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <span className="font-display text-xl text-foreground tracking-widest">REPARO EXPRESSO</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Profissionais homologados, atendimento rápido, segurança garantida.
            </p>
          </div>

          <div>
            <h4 className="font-display text-sm tracking-widest text-primary mb-4">CLIENTES</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/solicitar" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Solicitar Serviço
                </Link>
              </li>
              <li>
                <Link to="/meus-pedidos" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Meus Pedidos
                </Link>
              </li>
              <li>
                <Link to="/perfil" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Meu Perfil
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm tracking-widest text-primary mb-4">PRESTADORES</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/prestador" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Área do Prestador
                </Link>
              </li>
              <li>
                <Link to="/cadastro-prestador" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Quero me Cadastrar
                </Link>
              </li>
              <li>
                <Link to="/cadastro-parceiro" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Seja Parceiro
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm tracking-widest text-primary mb-4">SUPORTE</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Central de Ajuda
                </a>
              </li>
              <li>
                <Link to="/termos-cliente" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Termos de Uso
                </Link>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Política de Privacidade
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">© 2026 Reparo Expresso. Todos os direitos reservados.</p>
          <p className="text-xs text-muted-foreground">
            Certificado pela <span className="text-primary font-semibold">Escola Prática</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
