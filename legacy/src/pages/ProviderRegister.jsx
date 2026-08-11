import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import ProviderRegistrationForm from '@/components/providers/ProviderRegistrationForm';

export default function ProviderRegister() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Cadastro enviado!</h2>
        <p className="text-muted-foreground text-sm max-w-md mb-8">
          Recebemos suas qualificações, serviços, horários e endereço. Nossa equipe analisará e você será
          convocado para homologação na Escola Prática, se necessário.
        </p>
        <Button className="w-full max-w-xs h-12 rounded-2xl" onClick={() => navigate(user ? '/inicio' : '/')}>
          Voltar ao início
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-2xl mx-auto px-4 py-6 pb-24">
      <button
        type="button"
        onClick={() => navigate(user ? '/inicio' : '/')}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-5 h-5" /> Voltar
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Cadastro de prestador</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Preencha qualificações, tipos de serviço, preço por hora, horários e endereço.
        </p>
      </div>

      <ProviderRegistrationForm
        mode="self"
        userId={user?.id}
        onSuccess={() => setDone(true)}
      />
    </div>
  );
}
