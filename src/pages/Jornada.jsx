import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { ArrowLeft, Star, Trophy, Zap, Gift, Shield, Clock, ChevronRight, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import JornadaHeroCard from '@/components/jornada/JornadaHeroCard';
import JornadaNivelRoadmap from '@/components/jornada/JornadaNivelRoadmap';
import JornadaBadgesGrid from '@/components/jornada/JornadaBadgesGrid';
import JornadaBeneficios from '@/components/jornada/JornadaBeneficios';

export default function Jornada() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('jornada');

  const { data: loyalty } = useQuery({
    queryKey: ['customer-loyalty', user?.id],
    queryFn: async () => {
      const list = await base44.entities.CustomerLoyalty.filter({ client_id: user.id });
      return list[0] || null;
    },
    enabled: !!user?.id,
  });

  const { data: serviceRequests = [] } = useQuery({
    queryKey: ['client-services-completed', user?.email],
    queryFn: () => base44.entities.ServiceRequest.filter(
      { created_by: user.email, status: 'concluido' },
      '-updated_date',
      200
    ),
    enabled: !!user?.email,
  });

  const totalServices = loyalty?.total_services ?? serviceRequests.length;
  const totalSpent = loyalty?.total_spent ?? 0;
  const totalPoints = loyalty?.total_points ?? 0;

  const tabs = [
    { id: 'jornada', label: '🗺️ Jornada' },
    { id: 'badges', label: '🏅 Badges' },
    { id: 'beneficios', label: '🎁 Benefícios' },
  ];

  return (
    <div className="min-h-screen bg-background max-w-2xl mx-auto px-4 py-6 pb-16">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-accent rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Minha Jornada</h1>
          <p className="text-xs text-muted-foreground">Conquistas & benefícios exclusivos</p>
        </div>
      </div>

      {/* Hero Card */}
      <JornadaHeroCard
        totalServices={totalServices}
        totalSpent={totalSpent}
        totalPoints={totalPoints}
        userName={user?.full_name}
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-muted rounded-2xl p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all',
              activeTab === tab.id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'jornada' && (
        <JornadaNivelRoadmap totalServices={totalServices} />
      )}
      {activeTab === 'badges' && (
        <JornadaBadgesGrid totalServices={totalServices} totalSpent={totalSpent} totalPoints={totalPoints} serviceRequests={serviceRequests} />
      )}
      {activeTab === 'beneficios' && (
        <JornadaBeneficios totalServices={totalServices} />
      )}
    </div>
  );
}