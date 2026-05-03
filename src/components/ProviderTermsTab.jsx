import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";

export default function ProviderTermsTab({ providerId }) {
  const [termsContent, setTermsContent] = useState('');
  const [hasAccepted, setHasAccepted] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptedAt, setAcceptedAt] = useState(null);

  useEffect(() => {
    // Carrega os termos do localStorage (salvos pelo admin)
    const stored = localStorage.getItem('provider_terms_content');
    if (stored) {
      setTermsContent(stored);
    }

    // Verifica se o prestador já aceitou
    const accepted = localStorage.getItem(`provider_terms_accepted_${providerId}`);
    if (accepted) {
      setHasAccepted(true);
      setAcceptedAt(new Date(accepted).toLocaleDateString('pt-BR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }));
    }
  }, [providerId]);

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      // Salva no localStorage que aceitou
      const now = new Date().toISOString();
      localStorage.setItem(`provider_terms_accepted_${providerId}`, now);
      
      // Marca no banco de dados do prestador
      await base44.asServiceRole.entities.Provider.update(providerId, {
        terms_accepted_at: now
      });

      setHasAccepted(true);
      setAcceptedAt(new Date().toLocaleDateString('pt-BR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }));
      toast.success('Termos aceitos com sucesso!');
    } catch (error) {
      toast.error('Erro ao aceitar termos');
      console.error('Erro:', error);
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <div className="space-y-4">
      {hasAccepted ? (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-green-900">Termos Aceitos</h3>
            <p className="text-sm text-green-700">Você aceitou os termos em {acceptedAt}</p>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-900">Aceitação Obrigatória</h3>
            <p className="text-sm text-amber-700">Você precisa aceitar os termos para continuar operando na plataforma</p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📋 Termos de Serviço para Prestadores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-background rounded-lg p-4 min-h-96 overflow-y-auto border border-border whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {termsContent || 'Carregando termos...'}
          </div>

          {!hasAccepted && (
            <>
              <div className="flex items-center gap-2 bg-muted p-3 rounded-lg">
                <Checkbox
                  id="accept-terms"
                  checked={hasAccepted}
                  disabled
                  className="cursor-pointer"
                />
                <label htmlFor="accept-terms" className="text-sm font-medium text-foreground cursor-pointer flex-1">
                  Li e concordo com todos os termos acima
                </label>
              </div>
              <Button
                onClick={handleAccept}
                disabled={isAccepting}
                className="w-full bg-primary hover:bg-primary/90 h-10 font-semibold"
              >
                {isAccepting ? 'Processando...' : 'Aceitar Termos'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}