import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Inbox, CheckCircle2, Clock, XCircle, MessageSquare, Eye } from "lucide-react";
import { format } from "date-fns";

const statusConfig = {
  pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock },
  contacted: { label: "Contatado", color: "bg-blue-100 text-blue-800 border-blue-200", icon: MessageSquare },
  accepted: { label: "Aceito", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2 },
  rejected: { label: "Recusado", color: "bg-red-100 text-red-800 border-red-200", icon: XCircle },
  completed: { label: "Concluído", color: "bg-primary/10 text-primary border-primary/20", icon: CheckCircle2 },
};

const budgetLabels = {
  ate_200: "Até R$ 200",
  "200_500": "R$ 200-500",
  "500_1000": "R$ 500-1.000",
  "1000_3000": "R$ 1.000-3.000",
  acima_3000: "Acima de R$ 3.000",
  a_combinar: "A combinar",
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('all');
  const queryClient = useQueryClient();

  const { data: quotes, isLoading } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => base44.entities.QuoteRequest.list('-created_date'),
    initialData: [],
  });

  const updateQuote = useMutation({
    mutationFn: ({ id, data }) => base44.entities.QuoteRequest.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotes'] }),
  });

  const filteredQuotes = activeTab === 'all' ? quotes : quotes.filter(q => q.status === activeTab);

  const stats = {
    total: quotes.length,
    pending: quotes.filter(q => q.status === 'pending').length,
    accepted: quotes.filter(q => q.status === 'accepted').length,
    completed: quotes.filter(q => q.status === 'completed').length,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-foreground tracking-tight mb-8">Painel do Profissional</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total de Pedidos", value: stats.total, icon: Inbox, color: "text-foreground" },
          { label: "Pendentes", value: stats.pending, icon: Clock, color: "text-yellow-600" },
          { label: "Aceitos", value: stats.accepted, icon: CheckCircle2, color: "text-green-600" },
          { label: "Concluídos", value: stats.completed, icon: CheckCircle2, color: "text-primary" },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                </div>
                <stat.icon className={`w-8 h-8 ${stat.color} opacity-30`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="pending">Pendentes</TabsTrigger>
          <TabsTrigger value="contacted">Contatados</TabsTrigger>
          <TabsTrigger value="accepted">Aceitos</TabsTrigger>
          <TabsTrigger value="completed">Concluídos</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          {isLoading ? (
            <div className="text-center py-10 text-muted-foreground">Carregando...</div>
          ) : filteredQuotes.length === 0 ? (
            <div className="text-center py-16">
              <Inbox className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="font-semibold text-foreground">Nenhuma solicitação</h3>
              <p className="text-muted-foreground text-sm mt-1">Ainda não há solicitações nesta categoria</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQuotes.map(quote => {
                const status = statusConfig[quote.status || 'pending'];
                return (
                  <Card key={quote.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="font-semibold text-foreground">{quote.client_name}</h3>
                            <Badge className={`${status.color} border text-xs`}>
                              {status.label}
                            </Badge>
                            {quote.category_name && (
                              <Badge variant="secondary" className="text-xs">{quote.category_name}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{quote.description}</p>
                          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
                            {quote.city && <span>📍 {quote.city}{quote.state ? `, ${quote.state}` : ''}</span>}
                            {quote.budget && <span>💰 {budgetLabels[quote.budget] || quote.budget}</span>}
                            {quote.preferred_date && <span>📅 {format(new Date(quote.preferred_date), 'dd/MM/yyyy')}</span>}
                            {quote.client_phone && <span>📱 {quote.client_phone}</span>}
                            {quote.client_email && <span>✉️ {quote.client_email}</span>}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          {quote.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateQuote.mutate({ id: quote.id, data: { status: 'contacted' } })}
                              >
                                Contactar
                              </Button>
                              <Button
                                size="sm"
                                className="bg-primary text-primary-foreground"
                                onClick={() => updateQuote.mutate({ id: quote.id, data: { status: 'accepted' } })}
                              >
                                Aceitar
                              </Button>
                            </>
                          )}
                          {quote.status === 'contacted' && (
                            <Button
                              size="sm"
                              className="bg-primary text-primary-foreground"
                              onClick={() => updateQuote.mutate({ id: quote.id, data: { status: 'accepted' } })}
                            >
                              Aceitar
                            </Button>
                          )}
                          {quote.status === 'accepted' && (
                            <Button
                              size="sm"
                              className="bg-primary text-primary-foreground"
                              onClick={() => updateQuote.mutate({ id: quote.id, data: { status: 'completed' } })}
                            >
                              Concluir
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}