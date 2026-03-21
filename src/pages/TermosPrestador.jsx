import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, FileText } from 'lucide-react';

export default function TermosPrestador() {
  return (
    <div className="min-h-screen bg-background max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="p-2 hover:bg-accent rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Termos de Uso — Prestador</h1>
        </div>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-6 flex items-start gap-3">
        <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <p className="text-sm text-foreground">
          Ao se cadastrar como prestador na plataforma <strong>Me Socorro</strong>, você concorda com os termos abaixo. Leia com atenção antes de aceitar chamados.
        </p>
      </div>

      <div className="space-y-6 text-sm text-foreground leading-relaxed">

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">1. Natureza da Relação</h2>
          <p className="text-muted-foreground">
            O prestador cadastrado na Me Socorro atua como <strong>profissional autônomo</strong>, não havendo qualquer vínculo empregatício, societário ou de subordinação com a plataforma. A Me Socorro atua exclusivamente como intermediadora de serviços.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">2. Homologação pela Escola Prática</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>O prestador deve ser homologado pela <strong>Escola Prática</strong> para operar na plataforma.</li>
            <li>A homologação inclui verificação de documentos, avaliação técnica e treinamento básico.</li>
            <li>A homologação pode ser suspensa ou revogada em caso de condutas inadequadas.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">3. Cadastro e Perfil</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>O prestador deve fornecer dados verdadeiros, completos e atualizados.</li>
            <li>Fotos de perfil e portfólio devem ser reais e condizentes com o serviço prestado.</li>
            <li>Informações falsas resultarão em cancelamento imediato do cadastro.</li>
            <li>Os dados são tratados conforme a LGPD (Lei nº 13.709/2018).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">4. Aceite e Execução de Chamados</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>O prestador é livre para aceitar ou recusar chamados disponíveis.</li>
            <li>Após aceitar um chamado, o prestador assume o compromisso de comparecer ao local.</li>
            <li>Cancelamentos frequentes ou sem justificativa poderão resultar em suspensão da conta.</li>
            <li>O prestador deve atualizar o status do serviço (a caminho, em andamento, concluído) em tempo real.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">5. Qualidade e Responsabilidade Técnica</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>O prestador é integralmente responsável pela qualidade técnica dos serviços executados.</li>
            <li>Danos materiais causados ao cliente durante a execução são de responsabilidade do prestador.</li>
            <li>Recomenda-se o uso de equipamentos adequados e EPIs quando necessário.</li>
            <li>A Me Socorro não se responsabiliza por acidentes ocorridos durante a prestação de serviço.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">6. Precificação e Recebimento</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>O prestador define seus preços dentro das faixas orientadas pela plataforma.</li>
            <li>O pagamento é acordado diretamente com o cliente.</li>
            <li>A Me Socorro poderá cobrar uma taxa de intermediação sobre os serviços realizados via plataforma.</li>
            <li>Cobranças indevidas ou abusivas ao cliente poderão resultar em banimento.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">7. Conduta e Ética</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>É proibido assediar, ameaçar ou desrespeitar clientes.</li>
            <li>É vedado realizar negociações fora da plataforma visando burlar taxas de intermediação.</li>
            <li>O prestador não deve solicitar dados bancários ou pessoais desnecessários ao cliente.</li>
            <li>Comportamentos antiéticos resultarão em banimento permanente.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">8. Disponibilidade e Geolocalização</h2>
          <p className="text-muted-foreground">
            O prestador autoriza o compartilhamento de sua localização em tempo real durante a execução de chamados aceitos. Essa informação é utilizada exclusivamente para permitir que o cliente acompanhe o deslocamento.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">9. Avaliações</h2>
          <p className="text-muted-foreground">
            As avaliações dos clientes são públicas e influenciam a visibilidade do prestador na plataforma. O prestador não pode contestar avaliações honestas, mas pode reportar avaliações falsas ou abusivas ao suporte.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">10. Suspensão e Cancelamento</h2>
          <p className="text-muted-foreground">
            A Me Socorro reserva-se o direito de suspender ou cancelar o cadastro do prestador em caso de violação destes Termos, baixas avaliações recorrentes, condutas inadequadas ou irregularidades documentais, sem necessidade de aviso prévio.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">11. Alterações nos Termos</h2>
          <p className="text-muted-foreground">
            A Me Socorro reserva-se o direito de atualizar estes Termos a qualquer momento. As alterações serão comunicadas pelo aplicativo ou e-mail cadastrado. O uso continuado da plataforma implica em aceitação dos novos termos.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">12. Foro</h2>
          <p className="text-muted-foreground">
            Fica eleito o foro da comarca de domicílio do prestador para dirimir quaisquer controvérsias oriundas destes Termos, renunciando-se a qualquer outro, por mais privilegiado que seja.
          </p>
        </section>

        <p className="text-xs text-muted-foreground pt-4 border-t border-border">
          Última atualização: março de 2026. Dúvidas? Entre em contato pelo suporte da plataforma.
        </p>
      </div>
    </div>
  );
}