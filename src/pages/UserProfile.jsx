import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, LogOut, Calendar, Gift, Camera, Wrench } from "lucide-react";
import { useNavigate, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import ServiceHistory from '@/components/ServiceHistory';
import { Loader2 } from 'lucide-react';

export default function UserProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (err) {
        navigate('/');
      } finally {
        setUserLoading(false);
      }
    };
    fetchUser();
  }, [navigate]);

  const { data: provider } = useQuery({
    queryKey: ['my-provider-profile'],
    queryFn: async () => {
      if (!user?.id) return null;
      const list = await base44.entities.Provider.filter({ user_id: user.id });
      return list[0] || null;
    },
    enabled: !!user?.id,
  });

  const { data: serviceRequests = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['user-service-history'],
    queryFn: async () => {
      if (!user?.email) return [];
      const all = await base44.entities.ServiceRequest.list('-updated_date', 100);
      return all.filter(s => s.created_by === user.email);
    },
    enabled: !!user?.email,
  });

  const handleLogout = () => {
    base44.auth.logout('/');
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const stats = {
    total: serviceRequests.length,
    completed: serviceRequests.filter(s => s.status === 'concluido').length,
    pending: serviceRequests.filter(s => ['aguardando', 'aceito', 'a_caminho', 'em_andamento'].includes(s.status)).length,
  };

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-accent rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-foreground flex-1">Meu Perfil</h1>
      </div>

      {/* User Card */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-3xl p-6 border border-primary/20 mb-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-foreground">{user?.full_name || 'Usuário'}</h2>
            <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>
          </div>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground mb-6">
          {user?.role && <p>👤 Tipo: <span className="text-foreground font-semibold capitalize">{user.role}</span></p>}
          {user?.created_date && (
            <p className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Membro desde {new Date(user.created_date).toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold text-primary">{stats.total}</p>
            <p className="text-xs text-muted-foreground mt-1">Serviços</p>
          </div>
          <div className="bg-card rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            <p className="text-xs text-muted-foreground mt-1">Concluídos</p>
          </div>
          <div className="bg-card rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
            <p className="text-xs text-muted-foreground mt-1">Pendentes</p>
          </div>
        </div>
      </div>

      {/* Service History */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-foreground mb-4">Histórico de Serviços</h3>
        {servicesLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : serviceRequests.length === 0 ? (
          <div className="bg-muted/50 rounded-2xl p-8 text-center">
            <p className="text-muted-foreground">Nenhum serviço solicitado ainda</p>
          </div>
        ) : (
          <ServiceHistory serviceRequests={serviceRequests} />
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2">
        {provider && (
          <>
            <Link to="/prestador" className="block">
              <Button variant="outline" className="w-full rounded-2xl h-12 font-semibold border-primary/30 text-primary hover:bg-primary/10">
                <Wrench className="w-4 h-4 mr-2" /> Painel do Prestador
              </Button>
            </Link>
            <Link to="/prestador" state={{ tab: 'fotos' }} className="block">
              <Button variant="outline" className="w-full rounded-2xl h-12 font-semibold border-orange-300 text-orange-600 hover:bg-orange-50">
                <Camera className="w-4 h-4 mr-2" /> Editar minhas fotos
                {provider.photos_pending_review && (
                  <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Pendente</span>
                )}
              </Button>
            </Link>
          </>
        )}
        <Link to="/recompensas" className="block">
          <Button variant="outline" className="w-full rounded-2xl h-12 font-semibold border-primary/30 text-primary hover:bg-primary/10">
            <Gift className="w-4 h-4 mr-2" /> Meu Programa de Fidelidade
          </Button>
        </Link>
        <Button onClick={handleLogout} variant="outline" className="w-full rounded-2xl h-12 text-destructive border-destructive/30 hover:bg-destructive/10">
          <LogOut className="w-4 h-4 mr-2" /> Sair da conta
        </Button>
      </div>
    </div>
  );
}