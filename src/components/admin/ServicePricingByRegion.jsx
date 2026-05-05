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
  const [editing, setEditing] = useState(false);
  const [selectedZone, setSelectedZone] = useState('');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [note, setNote] = useState('');

  const cityPricings = pricings.filter(p => p.service_type === service.type && p.city === city);

  const handleAddPrice = () => {
    const data = {
      service_type: service.type,
      city,
      zone: selectedZone,
      price_min: Number(min),
      price_max: Number(max),
      note
    };
    onAdd(data);
    setSelectedZone('');
    setMin('');
    setMax('');
    setNote('');
    setEditing(false);
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-3 p-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ChevronDown className={`w-4 h-4 text-muted-foreground transform transition-transform ${expanded ? 'rotate-180' : ''}`} />
          <p className="font-semibold text-foreground text-sm">{city}</p>
          <span className="text-xs text-muted-foreground">({cityPricings.length})</span>
        </div>
      </button>

      {expanded && (
        <div className="bg-muted/30 p-3 border-t space-y-2">
          {cityPricings.map(pricing => (
            <div key={pricing.id} className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border">
              <div className="text-xs">
                <p className="font-semibold text-foreground">
                  R$ {pricing.price_min} – R$ {pricing.price_max}
                </p>
                <p className="text-muted-foreground">
                  {pricing.zone || 'Todos os bairros'} {pricing.note && `· ${pricing.note}`}
                </p>
              </div>
              <button
                onClick={() => onDelete(pricing.id)}
                className="p-1 hover:bg-red-100 rounded-lg transition-colors text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {editing ? (
            <div className="space-y-2 p-2 bg-white rounded-lg border-2 border-primary/20">
              <select
                value={selectedZone}
                onChange={e => setSelectedZone(e.target.value)}
                className="w-full h-8 text-xs border rounded-md px-2 bg-white"
              >
                <option value="">Todos os bairros/zonas</option>
                {zones.map(zone => (
                  <option key={zone} value={zone}>{zone}</option>
                ))}
              </select>
              
              <div className="flex gap-1">
                <Input value={min} onChange={e => setMin(e.target.value)} placeholder="Mín" className="w-20 h-7 text-xs" type="number" />
                <span className="text-xs text-muted-foreground py-1">R$</span>
                <Input value={max} onChange={e => setMax(e.target.value)} placeholder="Máx" className="w-20 h-7 text-xs" type="number" />
              </div>
              
              <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Observação (opcional)" className="h-7 text-xs" />

              <div className="flex gap-1">
                <Button size="icon" className="h-7 w-7 rounded-lg bg-green-600 text-white" onClick={handleAddPrice}><Plus className="w-3 h-3" /></Button>
                <Button size="icon" variant="outline" className="h-7 w-7 rounded-lg" onClick={() => {
                  setEditing(false);
                  setSelectedZone('');
                  setMin('');
                  setMax('');
                  setNote('');
                }}>✕</Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="w-full py-2 rounded-lg border-2 border-dashed border-border hover:border-primary transition-colors text-xs text-muted-foreground hover:text-primary flex items-center justify-center gap-1"
            >
              <Plus className="w-3 h-3" /> Adicionar preço
            </button>
          )}
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