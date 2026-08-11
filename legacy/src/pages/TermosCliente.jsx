import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, FileText } from 'lucide-react';

export default function TermosCliente() {
  return (
    <div className="min-h-screen bg-background max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="p-2 hover:bg-accent rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Contrato de Intermediação de Serviços</h1>
        </div>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-6 flex items-start gap-3">
        <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <p className="text-sm text-foreground">
          Ao solicitar um serviço através da plataforma <strong>Reparo Expresso</strong>, você concorda com este contrato. Leia com atenção antes de confirmar.
        </p>
      </div>

      <div className="space-y-4 text-sm text-foreground leading-relaxed">

        <section>
          <h2 className="text-base font-bold text-foreground mb-3">PARTES</h2>
          <p className="text-muted-foreground mb-2"><strong>INTERMEDIADORA:</strong> REPARO EXPRESSO TECNOLOGIA, CNPJ 39.973.464/0001-10, com sede na Rua Leozino de Oliveira, 273, Bairro Filadélfia, Betim, Minas Gerais, CEP 32670-054.</p>
          <p className="text-muted-foreground"><strong>CLIENTE:</strong> Pessoa física ou jurídica que aceita este termo ao solicitar um serviço via plataforma/app Reparo Expresso.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">1. Objeto</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
            <li><strong>1.1</strong> A REPARO EXPRESSO TECNOLOGIA conecta CLIENTE a prestadores autônomos para serviços residenciais de natureza rápida e emergencial.</li>
            <li><strong>1.2</strong> Prazo de atendimento: O prazo estimado para chegada do prestador será informado na plataforma antes da confirmação do pagamento.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">2. Pagamento e Taxa de Urgência</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
            <li><strong>2.1</strong> Valor do serviço: Apresentado na plataforma antes da confirmação, composto por: custo do serviço + taxa de intermediação da REPARO EXPRESSO TECNOLOGIA.</li>
            <li><strong>2.2</strong> Taxa de emergência: Aplicável para chamados noturnos, fins de semana e feriados. O percentual de acréscimo será informado na plataforma antes da confirmação do chamado.</li>
            <li><strong>2.3</strong> Pagamento 100% antecipado via plataforma. Sem pagamento, sem deslocamento.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">3. Escopo e Limites do Serviço Emergencial</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
            <li><strong>3.1</strong> Serviço emergencial = conter o problema. Não inclui reforma completa.</li>
            <li><strong>3.2</strong> Se no local o prestador identificar necessidade além do emergencial, novo orçamento será gerado e aprovado pelo CLIENTE via app antes da execução.</li>
            <li><strong>3.3</strong> Materiais: Não inclusos. Caso o prestador possua materiais disponíveis, os valores serão apresentados para aprovação via app antes do uso.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">4. Cancelamento e Deslocamento</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
            <li><strong>4.1</strong> Cancelamento pelo CLIENTE após o prestador sair para o local: cobrança de taxa de deslocamento, cujo valor será informado na plataforma no momento do chamado.</li>
            <li><strong>4.2</strong> Atraso do prestador: Se o prestador não chegar no prazo informado no app, CLIENTE tem direito a estorno integral ou remarcação prioritária.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">5. Obrigações do Cliente e Segurança</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
            <li><strong>5.1</strong> Garantir acesso seguro ao local do serviço.</li>
            <li><strong>5.2</strong> PRESENÇA OBRIGATÓRIA: É expressamente proibido ao prestador adentrar o imóvel se não houver um maior de 18 anos presente durante toda a execução do serviço.</li>
            <li><strong>5.3</strong> Caso não haja maior de idade no local, o prestador não iniciará o serviço. Será cobrada taxa de deslocamento e o chamado será cancelado.</li>
            <li><strong>5.4</strong> O CLIENTE declara que a pessoa que receberá o prestador é maior de idade e se responsabiliza pela veracidade da informação.</li>
            <li><strong>5.5</strong> TOLERÂNCIA DE ESPERA: Caso o prestador chegue ao local e não encontre ninguém para atendê-lo, aguardará por no máximo 15 minutos a partir do horário de chegada registrado no app. Ultrapassado esse prazo sem contato ou presença de maior de 18 anos, o chamado será encerrado com cobrança integral da taxa de deslocamento. Não haverá direito a retorno gratuito, devendo o CLIENTE abrir novo chamado na plataforma caso ainda deseje o serviço.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">6. Condições Operacionais do Local</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
            <li><strong>6.1</strong> O CLIENTE declara que o local possui condições mínimas de segurança e operação.</li>
            <li><strong>6.2</strong> RECUSA JUSTIFICADA: O prestador está autorizado a recusar o serviço, sem ônus, caso identifique no local:
              <ul className="list-[lower-alpha] list-inside ml-4 mt-1 space-y-0.5">
                <li>Risco à integridade física: falta de luz, local alagado com risco de choque, estrutura com risco de desabamento, animais agressivos soltos.</li>
                <li>Insalubridade extrema: risco biológico, químico ou ambiental.</li>
                <li>Impedimento técnico: ausência de ponto de água/energia necessário, ou local inacessível.</li>
              </ul>
            </li>
            <li><strong>6.3</strong> Na hipótese de recusa por falta de condições operacionais, será cobrada taxa de deslocamento.</li>
            <li><strong>6.4</strong> O prestador deverá registrar com foto/vídeo via app o motivo da recusa antes de deixar o local.</li>
            <li><strong>6.5</strong> A REPARO EXPRESSO TECNOLOGIA avaliará o registro e, se confirmado, fará estorno do valor do serviço ao CLIENTE, descontada a taxa de deslocamento.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">7. Serviços Adicionais Não Previstos</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
            <li><strong>7.1</strong> ORÇAMENTO COMPLEMENTAR: Caso o prestador identifique necessidade de serviços não cobertos no chamado inicial, poderá apresentar orçamento complementar.</li>
            <li><strong>7.2</strong> OBRIGATORIEDADE DE REGISTRO: Toda negociação e aprovação de serviços adicionais deverá ocorrer exclusivamente através da plataforma/app, na função "Adicionar Serviço".</li>
            <li><strong>7.3</strong> É vedado ao prestador e ao CLIENTE combinar, executar ou pagar qualquer serviço adicional por fora da plataforma.</li>
            <li><strong>7.4</strong> CONSEQUÊNCIAS: Se identificado acordo particular, ambos poderão ser suspensos. A REPARO EXPRESSO TECNOLOGIA não se responsabiliza por serviços não registrados.</li>
            <li><strong>7.5</strong> O valor do serviço adicional será cobrado via plataforma, seguindo a mesma regra de comissão e repasse.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">8. Alertas de Complexidade e Custo Adicional</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
            <li><strong>8.1</strong> AVISO PRÉVIO: A REPARO EXPRESSO TECNOLOGIA informará ao CLIENTE quando o tipo de serviço possuir variáveis que podem gerar custo adicional.</li>
            <li><strong>8.2</strong> EXEMPLOS DE ALERTA: Serão emitidos avisos para situações como:
              <ul className="list-[lower-alpha] list-inside ml-4 mt-1 space-y-0.5">
                <li>Altura: Uso de escada acima de 2m, andaime, cadeira suspensa ou balancim.</li>
                <li>Acesso: Local de difícil acesso, necessidade de remoção de móveis, ou vaga de estacionamento paga.</li>
                <li>Material: Serviços que notoriamente consomem material específico não incluso.</li>
                <li>Risco: Trabalho em telhado, área molhada com risco elétrico, ou local confinado.</li>
              </ul>
            </li>
            <li><strong>8.3</strong> O alerta é informativo. O valor final só será definido após avaliação do prestador no local.</li>
            <li><strong>8.4</strong> Ao confirmar o chamado após o alerta, o CLIENTE declara ciência de que o valor base pode sofrer acréscimo. A recusa do orçamento complementar no local implica cobrança da taxa de deslocamento.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">9. Limitações Técnicas e Serviços de Terceiros</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
            <li><strong>9.1</strong> VEDAÇÃO DE DESMONTAGEM: Os prestadores não estão autorizados a desmontar, quebrar ou remover estruturas de vidro, gesso, alvenaria ou drywall para acesso a shafts, colunas técnicas ou áreas confinadas.</li>
            <li><strong>9.2</strong> PROCEDIMENTO CORRETO: Caso o acesso dependa da remoção de vidro ou similar, o CLIENTE deverá:
              <ul className="list-[lower-alpha] list-inside ml-4 mt-1 space-y-0.5">
                <li>Contratar previamente um vidraceiro qualificado, por sua conta e risco, para abertura segura do acesso.</li>
                <li>Somente após a liberação, solicitar novo chamado na plataforma para o reparo.</li>
              </ul>
            </li>
            <li><strong>9.3</strong> A REPARO EXPRESSO TECNOLOGIA e prestadores não se responsabilizam por danos a estruturas de vidro por tentativa de acesso não autorizada.</li>
            <li><strong>9.4</strong> Se constatada necessidade de remoção de vidro sem vidraceiro contratado, o chamado será encerrado com cobrança da taxa de deslocamento.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">10. Escopo dos Serviços - Limitação</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
            <li><strong>10.1</strong> SERVIÇOS COBERTOS: Exclusivamente serviços emergenciais e pequenos reparos pontuais, de rápida execução e que não alterem estrutura principal do imóvel.
              <ul className="list-[lower-alpha] list-inside ml-4 mt-1 space-y-0.5">
                <li>Elétrica: troca de chuveiro, resistência, tomada, interruptor, disjuntor.</li>
                <li>Hidráulica: troca de torneira, sifão, flexível, reparo de registro de pressão, registro de gaveta.</li>
                <li>Desentupimento: serviço específico, desde desentupimento simples até com uso de máquina roto rooter. Inclui: pia, vaso sanitário, ralo, caixa de gordura, caixa de inspeção.</li>
                <li>Gesso/Drywall: exclusivamente reparo pontual e rebaixamento simples. Ex: tampar buraco de infiltração sanada, fechar abertura feita para reparo. Inclui apenas acabamento do gesso/drywall. Pintura e retoque de pintura não estão inclusos e serão cobrados à parte caso solicitados.</li>
                <li>Ponto novo de água: permitido apenas se for extensão simples de até 2 metros de tubulação, sem quebra estrutural significativa e sujeito à análise técnica do prestador no local.</li>
                <li>Pintura: exclusivamente retoque pontual decorrente de reparo executado no mesmo chamado, exceto para serviços de gesso/drywall.</li>
                <li>Gerais: troca de fechadura, fixação de prateleira.</li>
                <li>Telhado: exclusivamente substituição pontual de telhas e limpeza de calha, limitado à altura máxima de 6 metros do solo. Sujeito à análise técnica do prestador no local quanto à segurança.</li>
              </ul>
            </li>
            <li><strong>10.1.1</strong> PRODUTOS DE ALTO VALOR: Serviços envolvendo instalação, manuseio ou reparo de produtos com valor de mercado superior ao limite definido na plataforma não seguem o valor padrão. Será realizada análise técnica obrigatória no local, com orçamento específico a ser aprovado pelo CLIENTE via app antes da execução. A REPARO EXPRESSO TECNOLOGIA não se responsabiliza por danos a produtos de alto valor sem aceite prévio do orçamento específico.</li>
            <li><strong>10.2</strong> SERVIÇOS NÃO COBERTOS: Expressamente excluídos:
              <ul className="list-[lower-alpha] list-inside ml-4 mt-1 space-y-0.5">
                <li>Obras de qualquer porte: pequenas reformas, construção, demolição, forro de gesso completo.</li>
                <li>Serviços estruturais: alteração de alvenaria, telhado, laje, piso, vigas.</li>
                <li>Desentupimento de coluna de prédio: exige equipamento industrial e acesso à área comum.</li>
                <li>Pintura de ambientes: parede inteira, cômodo, apartamento ou casa completa. Se para consertar tubulação for necessário quebrar a parede, o serviço cobre tampar o buraco e fazer apenas o retoque no local afetado.</li>
                <li>Instalações novas complexas: pontos novos de água, luz, gás ou esgoto acima de 2 metros, que exijam quebra extensa ou projeto.</li>
                <li>Projetos que exijam ART, RRT ou responsável técnico.</li>
                <li>Serviços em altura superior a 6 metros: Substituição de telhas, limpeza de calha, ou qualquer trabalho em telhado acima de 6 metros de altura do solo.</li>
              </ul>
            </li>
            <li><strong>10.3</strong> ANÁLISE TÉCNICA PRÉVIA: Serviços de gesso, ponto novo de água, produtos de alto valor e telhado dependem de aprovação do prestador no local. Se constatada complexidade acima do previsto, o serviço não será executado e será cobrada apenas a taxa de deslocamento.</li>
            <li><strong>10.4</strong> Se no local o prestador constatar que o serviço se enquadra na cláusula 10.2, o trabalho não será executado. Será cobrada apenas a taxa de deslocamento.</li>
            <li><strong>10.5</strong> CHAMADO FORA DE ESCOPO: Caso o CLIENTE solicite através da plataforma um serviço expressamente listado na cláusula 10.2 como "não coberto", e o prestador se desloque até o local, será devida a taxa de deslocamento, mesmo que nenhum serviço seja executado.</li>
            <li><strong>10.6</strong> RECUSA DE ORÇAMENTO: Se no local o prestador identificar que o serviço está dentro do escopo da cláusula 10.1, mas necessita de orçamento complementar conforme cláusula 7.1, e o CLIENTE não aceitar a precificação apresentada pelo prestador, o chamado será encerrado e será cobrada apenas a taxa de deslocamento.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">11. Responsabilidade e Garantia</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
            <li><strong>11.1</strong> A REPARO EXPRESSO TECNOLOGIA não executa o serviço e não garante solução definitiva, apenas o atendimento emergencial inicial.</li>
            <li><strong>11.2</strong> Garantia: Prazo informado na plataforma no momento da contratação, aplicável apenas ao serviço emergencial executado, não para problemas preexistentes.</li>
            <li><strong>11.3</strong> Seguro: Cobertura informada na plataforma, para danos causados comprovadamente pelo prestador durante o atendimento.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">12. Não Aliciamento</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
            <li><strong>12.1</strong> CLIENTE se compromete a não contratar o mesmo prestador por fora da plataforma pelo prazo informado no app, sob multa também informada na plataforma.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">13. Proteção de Dados - LGPD</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
            <li><strong>13.1</strong> COLETA DE DADOS: A REPARO EXPRESSO TECNOLOGIA coleta e trata dados pessoais do CLIENTE necessários para execução do contrato, incluindo: nome, CPF, telefone, endereço do serviço, geolocalização e dados de pagamento, nos termos da Lei 13.709/2018.</li>
            <li><strong>13.2</strong> FINALIDADE: Os dados serão usados exclusivamente para: conectar CLIENTE ao prestador, processar pagamento, emitir nota fiscal, garantir segurança da operação, suporte e cumprimento de obrigação legal.</li>
            <li><strong>13.3</strong> COMPARTILHAMENTO: Dados de endereço e telefone serão compartilhados apenas com o prestador designado para o chamado. Dados de pagamento são tratados por gateway terceirizado e não ficam armazenados pela REPARO EXPRESSO TECNOLOGIA.</li>
            <li><strong>13.4</strong> REGISTROS: Imagens, vídeos e áudios capturados pelo prestador no local via app servem como prova de execução, recusa justificada ou condições do imóvel, e poderão ser usados em defesa judicial ou administrativa.</li>
            <li><strong>13.5</strong> DIREITOS DO TITULAR: O CLIENTE pode solicitar a qualquer momento: confirmação de tratamento, acesso, correção, anonimização, bloqueio ou eliminação de dados, através do canal [inserir email].</li>
            <li><strong>13.6</strong> RETENÇÃO: Dados serão mantidos pelo prazo necessário para cumprimento do contrato, garantia, obrigação legal ou defesa em processo, após o qual serão eliminados.</li>
            <li><strong>13.7</strong> SEGURANÇA: A REPARO EXPRESSO TECNOLOGIA adota medidas técnicas e administrativas para proteger os dados contra acessos não autorizados, incidentes e vazamentos.</li>
            <li><strong>13.8</strong> CONSENTIMENTO: Ao aceitar este contrato, o CLIENTE consente expressamente com a coleta e tratamento dos dados conforme esta cláusula.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">14. Aceite e Foro</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
            <li><strong>14.1</strong> Ao solicitar o chamado e confirmar o pagamento, o CLIENTE declara que leu, compreendeu e concorda com todos os termos deste contrato.</li>
            <li><strong>14.2</strong> Este contrato tem validade a partir da data do aceite eletrônico na plataforma Reparo Expresso.</li>
            <li><strong>14.3</strong> Fica eleito o foro da comarca de Betim/MG para dirimir quaisquer dúvidas ou litígios decorrentes deste contrato.</li>
          </ul>
        </section>

        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mt-6">
          <p className="text-xs text-muted-foreground">
            Ao clicar em aceitar e confirmar seu pagamento, você declara que leu, compreendeu e concordou com todos os termos e condições acima.
          </p>
        </div>
      </div>
    </div>
  );
}