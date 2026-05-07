import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const BELO_HORIZONTE_REGION = {
  'Belo Horizonte': {
    label: 'Belo Horizonte',
    zones: [
      'Centro', 'Zona Norte', 'Zona Sul', 'Zona Leste', 'Zona Oeste',
      'Savassi', 'Funcionários', 'Santo Agostinho', 'Lourdes', 'Buritis'
    ]
  },
  'Contagem': {
    label: 'Contagem',
    zones: ['Centro', 'Zona Norte', 'Zona Sul', 'Zona Leste', 'Zona Oeste']
  },
  'Betim': {
    label: 'Betim',
    zones: ['Centro', 'Zona Norte', 'Zona Sul', 'Zona Leste', 'Zona Oeste']
  },
  'Sabará': {
    label: 'Sabará',
    zones: ['Centro', 'Zona Oeste', 'Zona Leste']
  },
  'Santa Luzia': {
    label: 'Santa Luzia',
    zones: ['Centro', 'Zona Norte', 'Zona Leste']
  },
  'Vespasiano': {
    label: 'Vespasiano',
    zones: ['Centro', 'Zona Norte', 'Zona Leste']
  },
  'Ribeirão das Neves': {
    label: 'Ribeirão das Neves',
    zones: ['Centro', 'Zona Norte', 'Zona Leste']
  },
  'Nova Lima': {
    label: 'Nova Lima',
    zones: ['Centro', 'Zona Sul', 'Zona Oeste']
  },
  'Brumadinho': {
    label: 'Brumadinho',
    zones: ['Centro', 'Zona Leste', 'Zona Oeste']
  }
};

const ALL_SERVICES = [
  { type: 'eletrica', label: 'Elétrica' },
  { type: 'hidraulica', label: 'Hidráulica' },
  { type: 'pintura', label: 'Pintura' },
  { type: 'montagem', label: 'Montagem' },
  { type: 'reparo_geral', label: 'Reparo Geral' },
];

function CityPricingSection({ service, city, zones, pricings, onAdd, onDelete }) {
  const [expanded, setExpanded] = useState(false);
   const [zoneValues, setZoneValues] = useState({});

   const cityPricings = pricings.filter(p => p.service_type === service.type && p.city === city);

   const initializeZoneValues = () => {
     const values = {};
     zones.forEach(zone => {
       const existing = cityPricings.find(p => p.zone === zone);
       values[zone] = {
         min: existing?.price_min || '',
         max: existing?.price_max || '',
         ticketMedio: existing?.ticket_medio || '',
         repasseValue: existing?.repasse_value || '',
         repassePercent: existing?.repasse_percent || '',
         repassePercentTicket: existing?.repasse_percent_ticket || '',
         note: existing?.note || '',
         id: existing?.id || null
       };
     });
     setZoneValues(values);
   };

  const handleSaveZone = (zone) => {
    const { min, max, ticketMedio, repasseValue, repassePercent, repassePercentTicket, note, id } = zoneValues[zone];
    if (!min || !max) {
      toast.error('Preencha valores mín e máx');
      return;
    }
    const data = {
      service_type: service.type,
      city,
      zone,
      price_min: Number(min),
      price_max: Number(max),
      ticket_medio: ticketMedio !== '' ? Number(ticketMedio) : null,
      repasse_value: repasseValue !== '' ? Number(repasseValue) : null,
      repasse_percent: repassePercent !== '' ? Number(repassePercent) : null,
      repasse_percent_ticket: repassePercentTicket !== '' ? Number(repassePercentTicket) : null,
      note
    };
    onAdd(data);
  };

  const handleDeleteZone = (zone) => {
    const { id } = zoneValues[zone];
    if (id) {
      onDelete(id);
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => {
          setExpanded(!expanded);
          if (!expanded) initializeZoneValues();
        }}
        className="w-full flex items-center justify-between gap-3 p-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ChevronDown className={`w-4 h-4 text-muted-foreground transform transition-transform ${expanded ? 'rotate-180' : ''}`} />
          <p className="font-semibold text-foreground text-sm">{city}</p>
          <span className="text-xs text-muted-foreground">({cityPricings.length})</span>
        </div>
      </button>

      {expanded && (
        <div className="bg-muted/30 p-4 border-t space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {zones.map(zone => {
              const values = zoneValues[zone] || {};
              const isSaved = values.id;
              
              return (
                <div key={zone} className={`p-3 rounded-lg border-2 transition-colors ${isSaved ? 'bg-white border-green-200' : 'bg-white border-border'}`}>
                  <p className="font-semibold text-foreground text-sm mb-2">{zone}</p>
                  
                  <div className="space-y-2 mb-2">
                    <div className="text-xs font-semibold text-foreground mb-1">💰 Cliente</div>
                    <div className="flex gap-1 mb-2">
                      <Input 
                        value={values.min || ''} 
                        onChange={e => setZoneValues(prev => ({
                          ...prev, 
                          [zone]: { ...prev[zone], min: e.target.value }
                        }))} 
                        placeholder="Mín" 
                        className="w-16 h-7 text-xs" 
                        type="number" 
                      />
                      <span className="text-xs text-muted-foreground py-1">R$</span>
                      <Input 
                        value={values.max || ''} 
                        onChange={e => setZoneValues(prev => ({
                          ...prev, 
                          [zone]: { ...prev[zone], max: e.target.value }
                        }))} 
                        placeholder="Máx" 
                        className="w-16 h-7 text-xs" 
                        type="number" 
                      />
                      <span className="text-xs text-muted-foreground py-1">R$</span>
                    </div>

                    <div className="text-xs font-semibold text-foreground mb-1">📊 Ticket</div>
                    <div className="flex gap-1 mb-2">
                      <Input 
                        value={values.ticketMedio || ''} 
                        onChange={e => setZoneValues(prev => ({
                          ...prev, 
                          [zone]: { ...prev[zone], ticketMedio: e.target.value }
                        }))} 
                        placeholder="Ticket médio" 
                        className="flex-1 h-7 text-xs" 
                        type="number" 
                      />
                      <span className="text-xs text-muted-foreground py-1">R$</span>
                    </div>

                    <div className="text-xs font-semibold text-foreground mb-1">💵 Repasse</div>
                    <div className="space-y-1 mb-2">
                      <div className="flex gap-1">
                        <Input 
                          value={values.repasseValue || ''} 
                          onChange={e => setZoneValues(prev => ({
                            ...prev, 
                            [zone]: { ...prev[zone], repasseValue: e.target.value }
                          }))} 
                          placeholder="Valor fixo" 
                          className="flex-1 h-7 text-xs" 
                          type="number" 
                        />
                        <span className="text-xs text-muted-foreground py-1">R$</span>
                      </div>
                      <div className="flex gap-1">
                        <Input 
                          value={values.repassePercent || ''} 
                          onChange={e => setZoneValues(prev => ({
                            ...prev, 
                            [zone]: { ...prev[zone], repassePercent: e.target.value }
                          }))} 
                          placeholder="% serviço" 
                          className="flex-1 h-7 text-xs" 
                          type="number" 
                        />
                        <span className="text-xs text-muted-foreground py-1">%</span>
                      </div>
                      <div className="flex gap-1">
                        <Input 
                          value={values.repassePercentTicket || ''} 
                          onChange={e => setZoneValues(prev => ({
                            ...prev, 
                            [zone]: { ...prev[zone], repassePercentTicket: e.target.value }
                          }))} 
                          placeholder="% ticket" 
                          className="flex-1 h-7 text-xs" 
                          type="number" 
                        />
                        <span className="text-xs text-muted-foreground py-1">%</span>
                      </div>
                    </div>

                    <Input 
                      value={values.note || ''} 
                      onChange={e => setZoneValues(prev => ({
                        ...prev, 
                        [zone]: { ...prev[zone], note: e.target.value }
                      }))} 
                      placeholder="Obs (ex: por ponto)" 
                      className="h-7 text-xs" 
                    />
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={() => handleSaveZone(zone)}
                      className="flex-1 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors"
                    >
                      {isSaved ? '✓ Salvo' : 'Salvar'}
                    </button>
                    {isSaved && (
                      <button
                        onClick={() => handleDeleteZone(zone)}
                        className="p-1.5 hover:bg-red-100 rounded-lg transition-colors text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ServicePricingByRegion() {
  const queryClient = useQueryClient();

  const { data: pricingList = [] } = useQuery({
    queryKey: ['service-pricing'],
    queryFn: () => base44.entities.ServicePricing.list(),
  });

  const savePricing = useMutation({
    mutationFn: async (data) => {
      const existing = pricingList.find(p =>
        p.service_type === data.service_type &&
        p.city === data.city &&
        (p.zone || null) === (data.zone || null)
      );
      if (existing) {
        return base44.entities.ServicePricing.update(existing.id, data);
      } else {
        return base44.entities.ServicePricing.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-pricing'] });
      toast.success("Preço salvo!");
    },
  });

  const deletePricing = useMutation({
    mutationFn: (id) => base44.entities.ServicePricing.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-pricing'] });
      toast.success("Preço removido!");
    },
  });

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Configure preços para a região metropolitana de Belo Horizonte. Clique em cada cidade para adicionar preços por bairro/zona.
      </p>

      {ALL_SERVICES.map(service => (
        <div key={service.type}>
          <h3 className="font-semibold text-foreground mb-3 text-base">{service.label}</h3>
          <div className="space-y-2">
            {Object.entries(BELO_HORIZONTE_REGION).map(([cityKey, cityData]) => (
              <CityPricingSection
                key={cityKey}
                service={service}
                city={cityKey}
                zones={cityData.zones}
                pricings={pricingList}
                onAdd={(data) => savePricing.mutate(data)}
                onDelete={(id) => deletePricing.mutate(id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default ServicePricingByRegion;