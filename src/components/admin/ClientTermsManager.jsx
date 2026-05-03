import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Save, X, RotateCcw, Eye, Bell } from 'lucide-react';
import { toast } from "sonner";
import { base44 } from '@/api/base44Client';

const DEFAULT_TERMS = `TERMOS DE SERVIÇO PARA CLIENTES

1. ACEITAÇÃO DOS TERMOS
Ao utilizar os serviços da Reparo Expresso, você aceita integralmente estes Termos de Serviço e se compromete a cumpri-los.

2. DESCRIÇÃO DOS SERVIÇOS
A Reparo Expresso é uma plataforma que conecta clientes a prestadores de serviços especializados. Não somos responsáveis diretamente pelos serviços executados.

3. RESPONSABILIDADES DO CLIENTE
- Fornecer informações precisas e completas ao solicitar um serviço
- Estar presente no endereço indicado na data e hora agendada
- Comunicar mudanças ou cancelamentos com antecedência

4. PRIVACIDADE E DADOS
Seus dados pessoais são processados conforme nossa Política de Privacidade. Utilizamos essas informações apenas para operar a plataforma.

5. CANCELAMENTO DE SERVIÇOS
Cancelamentos realizados com menos de 24 horas podem sofrer retenção de taxa administrativa.

6. RESPONSABILIDADE
A Reparo Expresso não se responsabiliza por danos causados durante a execução dos serviços pelos prestadores terceirizados.

7. ALTERAÇÕES NOS TERMOS
Reservamos o direito de atualizar estes termos a qualquer momento. Notificaremos todos os usuários sobre mudanças significativas.

8. LEI APLICÁVEL
Estes termos são regidos pelas leis da República Federativa do Brasil.`;

export default function ClientTermsManager() {
  const [mode, setMode] = useState('view');
  const [content, setContent] = useState('');
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifySummary, setNotifySummary] = useState('');

  React.useEffect(() => {
    const stored = localStorage.getItem('client_terms_content');
    if (stored) {
      setContent(stored);
    } else {
      setContent(DEFAULT_TERMS);
      localStorage.setItem('client_terms_content', DEFAULT_TERMS);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('client_terms_content', content);
    localStorage.setItem('client_terms_updated', new Date().toISOString());
    toast.success('Termos salvos com sucesso');
    setMode('view');
  };

  const handleReset = () => {
    if (confirm('Tem certeza que deseja restaurar os termos padrão?')) {
      setContent(DEFAULT_TERMS);
    }
  };

  const handleNotifyClients = async () => {
    try {
      await base44.functions.invoke('notifyClientTermsUpdate', {
        terms_content: content,
        change_summary: notifySummary
      });
      toast.success('Clientes notificados sobre as alterações');
      setShowNotifyModal(false);
      setNotifySummary('');
    } catch (error) {
      toast.error('Erro ao notificar clientes');
      console.error('Erro:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <h3 className="font-bold text-foreground mb-2">📋 Termos de Serviço para Clientes</h3>
        <p className="text-sm text-muted-foreground">
          Gerencie os termos e condições que os clientes devem aceitar. Alterações serão notificadas via email e in-app.
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
                <Button
                  onClick={() => setShowNotifyModal(true)}
                  size="sm"
                  className="gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Bell className="w-4 h-4" /> Notificar Clientes
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
                Última atualização: {new Date(localStorage.getItem('client_terms_updated') || Date.now()).toLocaleDateString('pt-BR')}
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
              <Bell className="w-5 h-5 text-blue-600" />
              Notificar Clientes
            </DialogTitle>
            <DialogDescription>
              Deseja notificar todos os clientes sobre as alterações nos termos?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-foreground block mb-2">
                Resumo da Alteração
              </label>
              <Textarea
                placeholder="Ex: Adicionada política de cancelamento com prazo de 24h..."
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
              onClick={handleNotifyClients}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <Bell className="w-4 h-4 mr-2" /> Notificar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}