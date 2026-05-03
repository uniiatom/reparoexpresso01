import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import { useMutation } from '@tanstack/react-query';

export default function ProviderTermsTab({ providerId }) {
  const [termsContent, setTermsContent] = useState('');
  const [hasAccepted, setHasAccepted] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptedAt, setAcceptedAt] = useState(null);
  const [confirmAccept, setConfirmAccept] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      // Carrega os termos do localStorage (salvos pelo admin)
      const stored = localStorage.getItem('provider_terms_content');
      if (stored) {
        setTermsContent(stored);
      }

      // Verifica se o prestador já aceitou consultando o banco
      if (providerId) {
        try {
          const provider = await base44.entities.Provider.get(providerId);
          if (provider && provider.terms_accepted_at) {
            setHasAccepted(true);
            setAcceptedAt(new Date(provider.terms_accepted_at).toLocaleDateString('pt-BR', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }));
          }
        } catch (error) {
          console.error('Erro ao carregar status de aceite:', error);
        }
      }
    };
    
    loadData();
  }, [providerId]);

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('acceptProviderTerms', {
        provider_id: providerId
      });
      return response.data;
    },
    onSuccess: (data) => {
      const now = new Date(data.accepted_at);
      localStorage.setItem(`provider_terms_accepted_${providerId}`, data.accepted_at);
      setHasAccepted(true);
      setAcceptedAt(now.toLocaleDateString('pt-BR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }));
      setConfirmAccept(false);
      toast.success('Termos aceitos com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao aceitar termos');
      console.error('Erro:', error);
    }
  });

  const handleAccept = () => {
    acceptMutation.mutate();
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
                  checked={confirmAccept}
                  onCheckedChange={setConfirmAccept}
                  className="cursor-pointer"
                />
                <label htmlFor="accept-terms" className="text-sm font-medium text-foreground cursor-pointer flex-1">
                  Li e concordo com todos os termos acima
                </label>
              </div>
              <Button
                onClick={handleAccept}
                disabled={acceptMutation.isPending || !confirmAccept}
                className="w-full bg-primary hover:bg-primary/90 h-10 font-semibold disabled:opacity-50"
              >
                {acceptMutation.isPending ? 'Processando...' : 'Aceitar Termos'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}