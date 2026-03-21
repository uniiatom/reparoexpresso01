import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, FileText } from 'lucide-react';

export default function TermosCliente() {
  return (
    <div className="min-h-screen bg-background max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="p-2 hover:bg-accent rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Termos de Uso — Cliente</h1>
        </div>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-6 flex items-start gap-3">
        <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <p className="text-sm text-foreground">
          Ao utilizar a plataforma <strong>Me Socorro</strong>, você concorda com os termos abaixo. Leia com atenção antes de solicitar qualquer serviço.
        </p>
      </div>

      <div className="space-y-6 text-sm text-foreground leading-relaxed">

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">1. Aceitação dos Termos</h2>
          <p className="text-muted-foreground">
            O uso da plataforma Me Socorro implica na aceitação integral destes Termos de Uso. Caso não concorde com algum item, pedimos que não utilize os serviços.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">2. Sobre a Plataforma</h2>
          <p className="text-muted-foreground">
            A Me Socorro é uma plataforma de intermediação que conecta clientes a prestadores de serviços autônomos homologados pela <strong>Escola Prática</strong>. A Me Socorro <strong>não é empregadora</strong> dos prestadores, nem presta diretamente os serviços anunciados.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">3. Cadastro e Dados Pessoais</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>O cliente deve fornecer informações verdadeiras e atualizadas.</li>
            <li>O uso indevido de dados de terceiros é de responsabilidade exclusiva do usuário.</li>
            <li>Os dados são tratados conforme nossa Política de Privacidade e a LGPD (Lei nº 13.709/2018).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">4. Solicitação de Serviços</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>O cliente é responsável pela descrição precisa do serviço solicitado.</li>
            <li>Fotos e informações enviadas devem ser verídicas.</li>
            <li>O endereço informado deve ser acessível e correto.</li>
            <li>Solicitações falsas ou de má-fé poderão resultar em bloqueio da conta.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">5. Preços e Pagamentos</h2>
          <p className="text-muted-foreground">
            Os valores dos serviços são estimados previamente e podem ser ajustados mediante acordo entre cliente e prestador. O pagamento é combinado diretamente entre as partes. A Me Socorro não é responsável por cobranças indevidas realizadas fora da plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">6. Cancelamento</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Cancelamentos devem ser realizados com antecedência razoável.</li>
            <li>Cancelamentos após o deslocamento do prestador podem gerar cobrança de taxa de visita.</li>
            <li>Cancelamentos recorrentes poderão resultar em suspensão da conta.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">7. Avaliações</h2>
          <p className="text-muted-foreground">
            O cliente pode avaliar o prestador após a conclusão do serviço. As avaliações devem ser honestas e baseadas na experiência real. Avaliações falsas ou ofensivas serão removidas.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">8. Responsabilidades</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>A Me Socorro não se responsabiliza por danos causados pelo prestador durante a execução do serviço.</li>
            <li>Recomendamos que o cliente acompanhe a execução do serviço e documente eventuais problemas.</li>
            <li>Em caso de conflito, a Me Socorro poderá atuar como mediadora, sem obrigação de resolução.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">9. Conduta do Cliente</h2>
          <p className="text-muted-foreground">
            É proibido assediar, ameaçar ou desrespeitar os prestadores de serviço. Comportamentos inadequados resultarão em banimento permanente da plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">10. Alterações nos Termos</h2>
          <p className="text-muted-foreground">
            A Me Socorro reserva-se o direito de alterar estes Termos a qualquer momento. As alterações serão comunicadas pelo aplicativo ou e-mail cadastrado. O uso continuado da plataforma após as alterações implica em aceitação dos novos termos.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">11. Foro</h2>
          <p className="text-muted-foreground">
            Fica eleito o foro da comarca de domicílio do usuário para dirimir quaisquer controvérsias oriundas destes Termos, renunciando-se a qualquer outro, por mais privilegiado que seja.
          </p>
        </section>

        <p className="text-xs text-muted-foreground pt-4 border-t border-border">
          Última atualização: março de 2026. Dúvidas? Entre em contato pelo suporte da plataforma.
        </p>
      </div>
    </div>
  );
}