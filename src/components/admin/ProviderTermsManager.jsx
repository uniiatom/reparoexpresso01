import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Eye, RotateCcw, Save, X, Bell } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";

export default function ProviderTermsManager() {
  const [mode, setMode] = useState('view');
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifySummary, setNotifySummary] = useState('');

  const DEFAULT_TERMS = `TERMOS DE SERVIÇO PARA PRESTADORES

1. Aceitação dos Termos
Ao se cadastrar na plataforma Reparo Expresso, você concorda em cumprir todos os termos e condições descritos neste documento. Estes termos regem o relacionamento entre você (prestador) e a plataforma.

2. Responsabilidades do Prestador
Como prestador de serviço, você é responsável por:
- Realizar serviços de qualidade dentro do escopo definido
- Manter profissionalismo e educação com os clientes
- Cumprir os horários agendados ou informar com antecedência
- Respeitar a privacidade e propriedade do cliente
- Manter seus dados e documentação atualizados
- Seguir todas as normas de segurança e saúde

3. Aceitação e Recusa de Serviços
Você tem a liberdade de aceitar ou recusar serviços oferecidos pela plataforma. No entanto, recusas frequentes podem afetar sua visibilidade na plataforma. Após iniciar o deslocamento para o local do cliente, você não pode recusar o serviço.

4. Avaliações e Reputação
Os clientes podem avaliar seu trabalho. Sua reputação é importante e avaliações negativas podem resultar em redução de visibilidade ou suspensão da conta. Você pode responder às avaliações de forma profissional.

5. Conduta Profissional
Você concorda em:
- Não discriminar clientes por raça, gênero, religião ou origem
- Não ofender, assediar ou ameaçar clientes
- Não fazer propaganda de serviços fora da plataforma para reduzir comissão
- Manter sigilo sobre informações pessoais do cliente
- Usar equipamento de segurança adequado

6. Documentação e Verificação
Você deve manter toda documentação atualizada e válida (CNH, CRLV, documentos de identidade). A plataforma pode solicitar verificação de documentos a qualquer momento.

7. Suspensão e Bloqueio
A plataforma pode suspender ou bloquear sua conta se:
- Violar estes termos
- Receber múltiplas avaliações negativas
- Causar danos ao cliente ou suas propriedades
- Não manter documentação válida
- Cometer fraude ou atividade ilegal

8. Comissão e Pagamento
Os valores de comissão e condições de pagamento são definidos pela plataforma e podem sofrer alterações mediante notificação prévia. O pagamento é realizado via PIX conforme agenda estabelecida.

9. Seguro e Responsabilidade
Você é responsável por manter seguro adequado para sua atividade. A plataforma não se responsabiliza por danos causados por negligência do prestador ou por uso indevido de equipamento.

10. Modificação dos Termos
A plataforma pode modificar estes termos a qualquer momento. Modificações serão notificadas aos prestadores. O uso contínuo da plataforma após as modificações constitui aceitação dos novos termos.`;

  useEffect(() => {
    const stored = localStorage.getItem('provider_terms_content');
    if (stored) {
      setContent(stored);
      setOriginalContent(stored);
    } else {
      setContent(DEFAULT_TERMS);
      setOriginalContent(DEFAULT_TERMS);
      localStorage.setItem('provider_terms_content', DEFAULT_TERMS);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('provider_terms_content', content);
    setOriginalContent(content);
    setShowNotifyModal(true);
  };

  const handleReset = () => {
    setContent(DEFAULT_TERMS);
    localStorage.setItem('provider_terms_content', DEFAULT_TERMS);
    setOriginalContent(DEFAULT_TERMS);
    toast.success('Termos restaurados para padrão');
  };

  const handleNotifyProviders = async () => {
    if (!notifySummary.trim()) {
      toast.error('Adicione um resumo da alteração');
      return;
    }

    try {
      await base44.functions.invoke('notifyProviderTermsUpdate', {
        summary: notifySummary,
        timestamp: new Date().toISOString()
      });
      toast.success('Prestadores notificados sobre as alterações');
      setShowNotifyModal(false);
      setNotifySummary('');
    } catch (error) {
      toast.error('Erro ao notificar prestadores');
      console.error('Erro:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
        <h3 className="font-bold text-foreground mb-2">📋 Termos de Serviço para Prestadores</h3>
        <p className="text-sm text-muted-foreground">
          Gerencie os termos e condições que os prestadores de serviço devem aceitar. Alterações serão notificadas via email.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Conteúdo dos Termos</CardTitle>
          <div className="flex gap-2">
            {mode === 'view' ? (
              <>
                <Button
                  onClick={() => setMode('edit')}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Pencil className="w-4 h-4" /> Editar
                </Button>
                <Button
                  onClick={() => setMode('preview')}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Eye className="w-4 h-4" /> Visualizar
                </Button>
              </>
            ) : null}
            {mode === 'edit' ? (
              <>
                <Button
                  onClick={handleSave}
                  size="sm"
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  <Save className="w-4 h-4" /> Salvar
                </Button>
                <Button
                  onClick={() => setMode('view')}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <X className="w-4 h-4" /> Cancelar
                </Button>
              </>
            ) : null}
            {mode === 'preview' ? (
              <Button
                onClick={() => setMode('view')}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <X className="w-4 h-4" /> Fechar
              </Button>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {mode === 'edit' && (
            <>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-96 font-mono text-sm"
                placeholder="Edite os termos aqui..."
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="gap-2"
                >
                  <RotateCcw className="w-4 h-4" /> Restaurar Padrão
                </Button>
                <span className="text-xs text-muted-foreground self-center">
                  Alterações são salvas automaticamente no navegador.
                </span>
              </div>
            </>
          )}

          {mode === 'view' && (
            <div className="text-sm text-muted-foreground">
              ✓ Termos salvos
              <p className="mt-2 text-xs">
                Última atualização: {new Date(localStorage.getItem('provider_terms_updated') || Date.now()).toLocaleDateString('pt-BR')}
              </p>
            </div>
          )}

          {mode === 'preview' && (
            <div className="bg-background rounded-lg p-4 min-h-96 overflow-y-auto border border-border whitespace-pre-wrap text-sm leading-relaxed">
              {content}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Notificação */}
      <Dialog open={showNotifyModal} onOpenChange={setShowNotifyModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-600" />
              Notificar Prestadores
            </DialogTitle>
            <DialogDescription>
              Deseja notificar todos os prestadores sobre as alterações nos termos?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-foreground block mb-2">
                Resumo da Alteração
              </label>
              <Textarea
                placeholder="Ex: Adicionada cláusula sobre horários de deslocamento..."
                value={notifySummary}
                onChange={(e) => setNotifySummary(e.target.value)}
                className="min-h-24"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              onClick={() => setShowNotifyModal(false)}
              variant="outline"
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleNotifyProviders}
              className="flex-1 bg-amber-600 hover:bg-amber-700"
            >
              <Bell className="w-4 h-4 mr-2" /> Notificar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}