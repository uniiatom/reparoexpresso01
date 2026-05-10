import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Shield, ArrowLeft } from 'lucide-react';
import WarrantyPanel from '../components/WarrantyPanel';
import RetornoModal from '../components/RetornoModal';

export default function ClientWarranty() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showRetornoModal, setShowRetornoModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {
      navigate('/');
    });
  }, [navigate]);

  const handleRequestReturn = (service) => {
    setSelectedService(service);
    setShowRetornoModal(true);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/')}
          className="rounded-xl"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Minha Garantia</h1>
          <p className="text-xs text-muted-foreground">Visualize serviços cobertos pela garantia</p>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-primary/5 rounded-2xl p-4 border border-primary/20 mb-6 flex items-start gap-3">
        <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-foreground text-sm">Garantia Automática</p>
          <p className="text-xs text-muted-foreground mt-1">
            Todos os serviços concluídos recebem automaticamente 90 dias de garantia. Se o problema persistir, você pode solicitar um atendimento de retorno sem custos adicionais.
          </p>
        </div>
      </div>

      {/* Warranty Panel */}
      <WarrantyPanel
        clientEmail={user?.email}
        onRequestReturn={handleRequestReturn}
      />

      {/* Retorno Modal */}
      {showRetornoModal && selectedService && (
        <RetornoModal
          request={selectedService}
          isWarrantyReturn={true}
          onClose={() => {
            setShowRetornoModal(false);
            setSelectedService(null);
          }}
        />
      )}
    </div>
  );
}