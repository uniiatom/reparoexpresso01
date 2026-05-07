import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Pencil, Check, X, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const ALL_SERVICES = [
  { type: "eletrica", label: "Elétrica" },
  { type: "hidraulica", label: "Hidráulica" },
  { type: "pintura", label: "Pintura" },
  { type: "reparo_geral", label: "Reparo Geral" },
  { type: "montagem", label: "Montagem" },
  { type: "alvenaria", label: "Alvenaria" },
  { type: "fechadura", label: "Fechadura / Chaveiro" },
  { type: "ar_condicionado", label: "Ar Condicionado" },
  { type: "limpeza_caixa_dagua", label: "Limpeza Caixa d'Água" },
  { type: "limpeza_calha", label: "Limpeza de Calha" },
  { type: "substituicao_telha", label: "Substituição de Telha" },
  { type: "limpeza_telhado", label: "Limpeza de Telhado" },
  { type: "instalacao_coifa_parede", label: "Coifa de Parede" },
  { type: "instalacao_coifa_ilha", label: "Coifa Ilha" },
  { type: "conversao_vaso_coplado", label: "Conversão Vaso CX Acoplada" },
  { type: "instalacao_vaso_monobloco", label: "Vaso Monobloco" },
  { type: "reparo_forro_gesso", label: "Reparo Forro de Gesso" },
  { type: "desentupimento", label: "Desentupimento" },
  { type: "troca_pneu", label: "Troca de Pneu" },
  { type: "recarga_bateria", label: "Recarga de Bateria" },
  { type: "conserto_pneu", label: "Conserto de Pneu" },
  { type: "reboque", label: "Reboque" },
  { type: "outros", label: "Outros" },
  ];

function PricingRow({ service, allPricings, onSave, onDelete }) {
   const [editing, setEditing] = useState(false);
   const [expanded, setExpanded] = useState(false);
   const [min, setMin] = useState('');
   const [max, setMax] = useState('');
   const [ticketMedio, setTicketMedio] = useState('');
   const [repasseValue, setRepasseValue] = useState('');
   const [repassePercent, setRepassePercent] = useState('');
   const [repassePercentTicket, setRepassePercentTicket] = useState('');
   const [note, setNote] = useState('');
   const [locationType, setLocationType] = useState('zone');
   const [zone, setZone] = useState('');
   const [city, setCity] = useState('');
   const [state, setState] = useState('');

   const servicePricings = allPricings.filter(p => p.service_type === service.type);
   const defaultPricing = servicePricings.find(p => !p.zone && !p.city);

   const handleAddLocation = () => {
     const data = { 
       service_type: service.type, 
       price_min: Number(min), 
       price_max: Number(max),
       ticket_medio: ticketMedio !== '' ? Number(ticketMedio) : null,
       repasse_value: repasseValue !== '' ? Number(repasseValue) : null,
       repasse_percent: repassePercent !== '' ? Number(repassePercent) : null,
       repasse_percent_ticket: repassePercentTicket !== '' ? Number(repassePercentTicket) : null,
       note 
     };
     if (locationType === 'city') {
       data.city = city;
       data.state = state;
     } else if (locationType === 'zone') {
       data.zone = zone;
     }
     onSave(data);
     setMin('');
     setMax('');
     setTicketMedio('');
     setRepasseValue('');
     setRepassePercent('');
     setRepassePercentTicket('');
     setNote('');
     setZone('');
     setCity('');
     setState('');
   };

   const handleCancel = () => {
     setEditing(false);
     setMin('');
     setMax('');
     setTicketMedio('');
     setRepasseValue('');
     setRepassePercent('');
     setRepassePercentTicket('');
     setNote('');
     setZone('');
     setCity('');
     setState('');
   };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between gap-3 hover:opacity-75 transition-opacity"
        >
          <div className="flex items-center gap-2">
            <div className={`transform transition-transform ${expanded ? 'rotate-180' : ''}`}>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground text-sm">{service.label}</p>
            <span className="text-xs text-muted-foreground">({servicePricings.length})</span>
          </div>
          {defaultPricing && (
            <div className="text-right">
              <p className="text-xs font-bold text-primary">
                R$ {defaultPricing.price_min} – R$ {defaultPricing.price_max}
              </p>
            </div>
          )}
        </button>

        {expanded && (
          <div className="pl-6 border-l-2 border-border space-y-2">
            {servicePricings.map(pricing => (
              <div key={pricing.id} className="flex items-center justify-between gap-2 p-2 bg-muted/40 rounded-lg">
                <div className="text-xs space-y-0.5">
                  <p className="font-semibold text-foreground">💰 Cliente: R$ {pricing.price_min} – R$ {pricing.price_max}</p>
                  {pricing.ticket_medio && <p className="text-primary">📊 Ticket: R$ {pricing.ticket_medio}</p>}
                  <div className="text-muted-foreground space-y-0.5">
                    {pricing.repasse_value && <p>✓ Repasse: R$ {pricing.repasse_value}</p>}
                    {pricing.repasse_percent && <p>✓ Repasse: {pricing.repasse_percent}% do serviço</p>}
                    {pricing.repasse_percent_ticket && <p>✓ Repasse: {pricing.repasse_percent_ticket}% do ticket médio</p>}
                    <p>{pricing.zone ? `Zona: ${pricing.zone}` : pricing.city ? `${pricing.city}/${pricing.state}` : 'Padrão (todas regiões)'}</p>
                    {pricing.note && <p>Obs: {pricing.note}</p>}
                  </div>
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
               <div className="space-y-2 p-2 bg-primary/5 rounded-lg border border-primary/20">
                 <div className="text-xs font-semibold text-foreground mb-1">💰 Valor que cliente paga:</div>
                 <div className="flex gap-1 flex-wrap">
                   <Input value={min} onChange={e => setMin(e.target.value)} placeholder="Preço Mín" className="w-24 h-7 text-xs" type="number" />
                   <span className="text-xs text-muted-foreground py-1">R$ a</span>
                   <Input value={max} onChange={e => setMax(e.target.value)} placeholder="Preço Máx" className="w-24 h-7 text-xs" type="number" />
                   <span className="text-xs text-muted-foreground py-1">R$</span>
                 </div>

                 <div className="text-xs font-semibold text-foreground mt-2 mb-1">📊 Ticket médio esperado:</div>
                 <div className="flex gap-1">
                   <Input value={ticketMedio} onChange={e => setTicketMedio(e.target.value)} placeholder="Ticket Médio" className="flex-1 h-7 text-xs" type="number" />
                   <span className="text-xs text-muted-foreground py-1">R$</span>
                 </div>

                 <div className="text-xs font-semibold text-foreground mt-2 mb-1">💵 Repasse ao prestador (escolha uma opção):</div>
                 <div className="space-y-1">
                   <div className="flex gap-1">
                     <Input value={repasseValue} onChange={e => setRepasseValue(e.target.value)} placeholder="Valor fixo" className="flex-1 h-7 text-xs" type="number" />
                     <span className="text-xs text-muted-foreground py-1">R$</span>
                   </div>
                   <div className="flex gap-1">
                     <Input value={repassePercent} onChange={e => setRepassePercent(e.target.value)} placeholder="% do valor do serviço" className="flex-1 h-7 text-xs" type="number" />
                     <span className="text-xs text-muted-foreground py-1">%</span>
                   </div>
                   <div className="flex gap-1">
                     <Input value={repassePercentTicket} onChange={e => setRepassePercentTicket(e.target.value)} placeholder="% do ticket médio" className="flex-1 h-7 text-xs" type="number" />
                     <span className="text-xs text-muted-foreground py-1">%</span>
                   </div>
                 </div>

                 <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Observação (ex: por ponto, por metro)" className="h-7 text-xs" />

                <div className="flex gap-2 text-xs">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="radio" checked={locationType === 'zone'} onChange={() => setLocationType('zone')} className="w-3 h-3" />
                    Zona
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="radio" checked={locationType === 'city'} onChange={() => setLocationType('city')} className="w-3 h-3" />
                    Cidade
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="radio" checked={locationType === 'default'} onChange={() => setLocationType('default')} className="w-3 h-3" />
                    Padrão
                  </label>
                </div>

                {locationType === 'zone' && (
                  <Input value={zone} onChange={e => setZone(e.target.value)} placeholder="Ex: Centro, Zona Sul" className="h-7 text-xs" />
                )}
                {locationType === 'city' && (
                  <div className="flex gap-1">
                    <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Cidade" className="h-7 text-xs flex-1" />
                    <Input value={state} onChange={e => setState(e.target.value)} placeholder="UF" className="h-7 text-xs w-12" maxLength="2" />
                  </div>
                )}

                <div className="flex gap-1">
                  <Button size="icon" className="h-7 w-7 rounded-lg bg-green-600 text-white" onClick={handleAddLocation}><Plus className="w-3 h-3" /></Button>
                  <Button size="icon" variant="outline" className="h-7 w-7 rounded-lg" onClick={handleCancel}><X className="w-3 h-3" /></Button>
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
      </CardContent>
    </Card>
  );
  }

export default function ServicePricing() {
   const queryClient = useQueryClient();

   const { data: pricingList = [] } = useQuery({
     queryKey: ['service-pricing'],
     queryFn: () => base44.entities.ServicePricing.list(),
   });

   const savePricing = useMutation({
     mutationFn: async (data) => {
       const existing = pricingList.find(p => 
         p.service_type === data.service_type && 
         (p.zone || null) === (data.zone || null) && 
         (p.city || null) === (data.city || null) && 
         (p.state || null) === (data.state || null)
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
     <div className="space-y-3">
       <p className="text-sm text-muted-foreground mb-4">Configure por serviço:</p>
       <ul className="text-xs text-muted-foreground space-y-1 mb-4 pl-4">
         <li>💰 <strong>Valor cliente</strong>: faixa de preço que será cobrado</li>
         <li>📊 <strong>Ticket médio</strong>: valor médio esperado para referência do prestador</li>
         <li>💵 <strong>Repasse ao prestador</strong>: valor fixo, % do serviço, ou % do ticket médio</li>
       </ul>
       {ALL_SERVICES.map(service => (
         <PricingRow
           key={service.type}
           service={service}
           allPricings={pricingList}
           onSave={(data) => savePricing.mutate(data)}
           onDelete={(id) => deletePricing.mutate(id)}
         />
       ))}
     </div>
   );
}