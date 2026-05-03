import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Check, X, Eye } from "lucide-react";
import { toast } from "sonner";

export default function TermsManager() {
  const [termsContent, setTermsContent] = useState('');
  const [editing, setEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTerms();
  }, []);

  const loadTerms = async () => {
    try {
      setLoading(true);
      // Tenta carregar do localStorage primeiro (para fazer persistência local)
      const localTerms = localStorage.getItem('client_terms_content');
      if (localTerms) {
        setTermsContent(localTerms);
      } else {
        // Termos padrão se não houver salvos
        setTermsContent(getDefaultTerms());
      }
    } catch (err) {
      console.error('Erro ao carregar termos:', err);
      setTermsContent(getDefaultTerms());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultTerms = () => `Termos de Uso - Cliente

Ao criar sua conta no Reparo Expresso, você concorda com os seguintes termos e condições:

1. Uso da Plataforma
Você é responsável por manter a confidencialidade de sua conta e senha. Concorda em usar a plataforma apenas para fins legítimos e não para atividades ilegais ou prejudiciais.

2. Dados Pessoais
Seus dados serão utilizados apenas para prover serviços de reparo e não serão compartilhados com terceiros sem consentimento.

3. Política de Pagamento
O pagamento pelos serviços pode ser realizado via PIX ou cartão de crédito. Os valores são estabelecidos pelos prestadores de serviço.

4. Cancelamento
Você pode cancelar uma solicitação de serviço antes que o prestador chegue. Após isso, o serviço está confirmado.

5. Avaliação
Solicitamos que avalie o prestador após o término do serviço para melhorar a qualidade da plataforma.

6. Responsabilidade
A plataforma não é responsável por danos causados pelos prestadores de serviço. Recomendamos verificar referências e avaliações antes de confirmar.`;

  const handleSave = async () => {
    try {
      setSaving(true);
      // Salva no localStorage para persistência
      localStorage.setItem('client_terms_content', termsContent);
      toast.success('Termos atualizados com sucesso!');
      setEditing(false);
    } catch (err) {
      toast.error('Erro ao salvar termos');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = () => {
    if (window.confirm('Deseja restaurar os termos padrão? Esta ação não pode ser desfeita.')) {
      const defaultTerms = getDefaultTerms();
      setTermsContent(defaultTerms);
      localStorage.setItem('client_terms_content', defaultTerms);
      setEditing(false);
      toast.success('Termos restaurados para o padrão');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Termo de Uso - Cliente</CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
              className="rounded-lg"
            >
              <Eye className="w-4 h-4 mr-1" /> {showPreview ? 'Editar' : 'Visualizar'}
            </Button>
            {!editing && (
              <Button
                size="sm"
                onClick={() => setEditing(true)}
                className="rounded-lg bg-primary text-primary-foreground"
              >
                <Pencil className="w-4 h-4 mr-1" /> Editar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <>
              <Textarea
                value={termsContent}
                onChange={(e) => setTermsContent(e.target.value)}
                className="min-h-96 rounded-lg font-mono text-sm"
                placeholder="Edite o conteúdo do termo aqui..."
              />
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditing(false);
                    loadTerms();
                  }}
                  className="rounded-lg"
                >
                  <X className="w-4 h-4 mr-1" /> Cancelar
                </Button>
                <Button
                  variant="outline"
                  onClick={handleResetToDefault}
                  className="rounded-lg text-amber-600 border-amber-200 hover:bg-amber-50"
                >
                  Restaurar padrão
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-lg bg-green-600 text-white hover:bg-green-700"
                >
                  <Check className="w-4 h-4 mr-1" /> {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </>
          ) : showPreview ? (
            <div className="bg-muted/30 rounded-lg p-6 max-h-96 overflow-y-auto whitespace-pre-wrap text-sm text-foreground leading-relaxed">
              {termsContent}
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
              <p className="font-semibold mb-2">ℹ️ Informações</p>
              <ul className="space-y-1 text-xs">
                <li>• Este termo é exibido para clientes no momento do cadastro</li>
                <li>• O cliente deve aceitar para completar o registro</li>
                <li>• Alterações aplicam-se imediatamente a novos cadastros</li>
                <li>• Use a visualização para verificar como o termo aparecerá</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}