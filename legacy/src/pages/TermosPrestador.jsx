import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, FileText } from 'lucide-react';

export default function TermosPrestador() {
  return (
    <div className="min-h-screen bg-background max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="p-2 hover:bg-accent rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Contrato de Prestação de Serviços</h1>
        </div>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-6 flex items-start gap-3">
        <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <p className="text-sm text-foreground">
          Ao se cadastrar como prestador na plataforma <strong>Reparo Expresso</strong>, você concorda com este contrato. Leia com atenção antes de aceitar.
        </p>
      </div>

      <div className="space-y-4 text-sm text-foreground leading-relaxed">

        <section>
          <h2 className="text-base font-bold text-foreground mb-3">1. Partes</h2>
          <p className="text-muted-foreground mb-2"><strong>Contratante:</strong> REPARO EXPRESSO TECNOLOGIA, CNPJ 39.973.464/0001-10, com sede na Rua Leozino de Oliveira, 273, Filadélfia, Betim/MG, CEP 32670-054</p>
          <p className="text-muted-foreground"><strong>Contratado:</strong> [Razão social do PJ], CNPJ [nº], endereço completo</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">2. Objeto</h2>
          <p className="text-muted-foreground">
            Prestação de serviços de [descrever atividade] através da plataforma, sem vínculo empregatício, nos termos do art. 442-B da CLT.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">3. Remuneração</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
            <li><strong>3.1</strong> O Contratado será remunerado exclusivamente por serviço efetivamente realizado e concluído através da plataforma, conforme tabela de valores vigente no momento da execução.</li>
            <li><strong>3.2</strong> O fechamento dos valores será realizado quinzenalmente. A Contratante apurará os serviços executados e informará ao Contratado o valor total para emissão da nota fiscal.</li>
            <li><strong>3.3</strong> Após o envio da nota fiscal pelo Contratado, a Contratante terá prazo de até 7 dias corridos para efetuar o pagamento via PIX ou TED.</li>
            <li><strong>3.4</strong> Não há garantia de valor mínimo, remuneração fixa ou pagamento por período à disposição. O Contratado só recebe pelos serviços que aceitar e executar.</li>
            <li><strong>3.5</strong> Todos os tributos incidentes sobre os valores pagos são de responsabilidade exclusiva do Contratado.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">4. Prazo e Vigência</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
            <li><strong>4.1</strong> O presente contrato terá vigência de 12 meses, com início em [data] e término em [data].</li>
            <li><strong>4.2</strong> O contrato será renovado automaticamente por iguais períodos, salvo manifestação contrária de qualquer das partes, por escrito, com antecedência mínima de 30 dias do término da vigência.</li>
            <li><strong>4.3</strong> Em caso de não renovação, os serviços em andamento deverão ser concluídos conforme acordado.</li>
            <li><strong>4.4</strong> Este contrato poderá ser rescindido a qualquer tempo, por qualquer parte, mediante aviso prévio de 30 dias, sem ônus, ressalvados os pagamentos por serviços já prestados.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">5. Obrigações do Contratado</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
            <li><strong>5.1</strong> Emitir nota fiscal no valor informado pela Contratante após cada fechamento quinzenal, no prazo máximo de 2 dias úteis.</li>
            <li><strong>5.2</strong> Cumprir prazos e qualidade acordados na plataforma.</li>
            <li><strong>5.3</strong> Manter sigilo sobre dados e informações da Contratante.</li>
            <li><strong>5.4</strong> Manter sua regularidade fiscal e cadastral durante toda a vigência.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">6. Independência e Autonomia</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
            <li><strong>6.1</strong> O Contratado atua com total autonomia operacional e profissional, sem qualquer subordinação jurídica à Contratante.</li>
            <li><strong>6.2</strong> O Contratado tem liberdade plena para aceitar ou recusar serviços oferecidos pela plataforma, sem necessidade de justificativa e sem qualquer penalidade.</li>
            <li><strong>6.3</strong> O Contratado definirá sua própria agenda, horários de trabalho, períodos de folga e dias de indisponibilidade, através de ferramentas disponibilizadas na plataforma.</li>
            <li><strong>6.4</strong> O Contratado utiliza recursos, ferramentas e equipamentos próprios para execução dos serviços, salvo os itens de padronização fornecidos conforme cláusula 7.</li>
            <li><strong>6.5</strong> Não há exclusividade. O Contratado poderá prestar serviços para terceiros, outras plataformas ou clientes próprios, inclusive durante a vigência deste contrato.</li>
            <li><strong>6.6</strong> A Contratante não exercerá controle de jornada, não exigirá cumprimento de metas mínimas e não aplicará sanções disciplinares típicas de relação de emprego.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">7. Padronização e Imagem</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
            <li><strong>7.1</strong> Para manter a identidade visual, o Contratado deverá utilizar uniforme e plotagem nos veículos conforme manual da Contratante durante a prestação dos serviços.</li>
            <li><strong>7.2</strong> Os custos de aquisição do uniforme e de plotagem/adesivagem dos veículos serão integralmente suportados pela Contratante. O Contratado não terá qualquer desconto ou cobrança por esses itens.</li>
            <li><strong>7.3</strong> O fornecimento do uniforme e da plotagem tem finalidade exclusiva de padronização e identificação do serviço prestado via plataforma, não configurando vínculo empregatício.</li>
            <li><strong>7.4</strong> Em caso de rescisão, o Contratado deverá devolver os uniformes e remover a plotagem no prazo de 5 dias úteis. A Contratante arcará com os custos de remoção.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">8. Qualidade e Refação de Serviços</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
            <li><strong>8.1</strong> Caso o serviço executado pelo Contratado apresente vício, falha técnica ou seja recusado justificadamente pelo cliente final, a Contratante poderá acionar outro prestador para refazê-lo.</li>
            <li><strong>8.2</strong> Na hipótese do item 8.1, o Contratado que executou o serviço com falha não fará jus ao recebimento do valor referente àquele atendimento específico.</li>
            <li><strong>8.3</strong> A recusa do cliente deverá ser registrada na plataforma com justificativa. O Contratado poderá apresentar contestação em até 48h pelo canal de suporte.</li>
            <li><strong>8.4</strong> Esta regra não se aplica quando a falha decorrer de informações incorretas fornecidas pela Contratante ou pelo cliente final.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">9. Responsabilidade por Valores e Indenização</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
            <li><strong>9.1</strong> É vedado ao Contratado receber, reter ou solicitar qualquer valor diretamente do cliente final, salvo se expressamente autorizado pela plataforma.</li>
            <li><strong>9.2</strong> Caso o Contratado realize saque, retenção indevida ou desvio de valores pertencentes ao cliente final ou à Contratante, fica obrigado a restituir integralmente o montante no prazo de 48h após notificação.</li>
            <li><strong>9.3</strong> O valor devido será descontado dos créditos que o Contratado tiver a receber da Contratante. Caso não haja saldo suficiente, o Contratado deverá realizar o pagamento via PIX no prazo do item 9.2.</li>
            <li><strong>9.4</strong> A prática prevista no item 9.2 constitui falta grave e autoriza a rescisão imediata do contrato por justa causa, sem prejuízo da cobrança judicial.</li>
            <li><strong>9.5</strong> A Contratante poderá reter pagamentos futuros até a integral quitação do débito apurado.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">10. Fundo de Reserva</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
            <li><strong>10.1</strong> A Contratante reterá 3% do valor bruto de todos os serviços executados pelo Contratado, a título de fundo de reserva para eventuais indenizações a clientes e cobertura de débitos operacionais.</li>
            <li><strong>10.2</strong> O fundo funcionará também como poupança do Contratado. Os valores retidos ficarão sob custódia da Contratante durante toda a vigência do contrato.</li>
            <li><strong>10.3</strong> Em caso de rescisão por iniciativa de qualquer das partes, a devolução do saldo ocorrerá após o decurso do prazo de garantia de 3 meses, contados da data do desligamento da plataforma.</li>
            <li><strong>10.4</strong> Se dentro do prazo de 3 meses não houver reclamação de clientes, débitos pendentes, avarias ou valores não repassados, o saldo integral será devolvido ao Contratado em até 5 dias úteis após o término da garantia.</li>
            <li><strong>10.5</strong> Havendo débitos comprovados dentro do prazo de garantia, a Contratante utilizará o saldo do fundo para quitação, devolvendo apenas o remanescente ao Contratado.</li>
            <li><strong>10.6</strong> A Contratante fornecerá extrato detalhado dos valores retidos e movimentações sempre que solicitado pelo Contratado.</li>
            <li><strong>10.7</strong> A retenção prevista nesta cláusula não caracteriza desconto salarial, tratando-se de relação comercial entre pessoas jurídicas.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">11. Rescisão</h2>
          <p className="text-muted-foreground">
            Além do previsto na cláusula 4.4, o contrato será rescindido imediatamente por descumprimento grave de qualquer cláusula, uso indevido da marca ou condenação criminal relacionada à atividade.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">12. Disposições Gerais</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
            <li><strong>12.1</strong> O Contratado declara que não mantém vínculo empregatício com a Contratante e que esta relação é regida pelo Código Civil e pela Lei 13.429/2017.</li>
            <li><strong>12.2</strong> Alterações neste contrato somente terão validade mediante aditivo assinado pelas partes.</li>
            <li><strong>12.3</strong> A tolerância de uma parte quanto ao descumprimento de qualquer obrigação não implica renúncia ao direito de exigi-la futuramente.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">13. Foro</h2>
          <p className="text-muted-foreground">
            Fica eleito o foro de Betim/MG para dirimir quaisquer controvérsias oriundas deste contrato.
          </p>
        </section>

        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mt-6">
          <p className="text-xs text-muted-foreground">
            <strong>Betim/MG, 05 de maio de 2026.</strong>
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Ao clicar em aceitar, você declara ter lido, compreendido e concordado com todos os termos e condições acima.
          </p>
        </div>
      </div>
    </div>
  );
}