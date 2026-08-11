import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, X, Plus, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PartsEstimator({ serviceType, onEstimateChange }) {
  const [selectedParts, setSelectedParts] = useState([]);
  const [laborCost, setLaborCost] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState(null);

  // Busca peças disponíveis para o tipo de serviço
  const { data: availableParts = [], isLoading } = useQuery({
    queryKey: ['service-parts', serviceType],
    queryFn: () => base44.entities.ServicePart.filter({ 
      service_type: serviceType,
      is_active: true 
    }),
    enabled: !!serviceType,
  });

  // Agrupa peças por categoria
  const partsByCategory = availableParts.reduce((acc, part) => {
    if (!acc[part.category]) acc[part.category] = [];
    acc[part.category].push(part);
    return acc;
  }, {});

  const CATEGORY_LABELS = { material: '🔧 Materiais', servico: '👨‍🔧 Serviços Adicionais' };

  // Calcula totais
  const calculateTotals = () => {
    const partsTotal = selectedParts.reduce((sum, item) => sum + (item.part.unit_price * item.quantity), 0);
    const total = partsTotal + laborCost;
    return { partsTotal, laborCost, total };
  };

  const { partsTotal, total } = calculateTotals();

  // Notifica o componente pai das mudanças
  useEffect(() => {
    if (onEstimateChange) {
      onEstimateChange({
        selectedParts,
        laborCost,
        partsTotal,
        total,
      });
    }
  }, [selectedParts, laborCost]);

  const addPart = (part) => {
    setSelectedParts([...selectedParts, { part, quantity: 1 }]);
  };

  const removePart = (index) => {
    setSelectedParts(selectedParts.filter((_, i) => i !== index));
  };

  const updateQuantity = (index, quantity) => {
    const updated = [...selectedParts];
    updated[index].quantity = Math.max(1, quantity);
    setSelectedParts(updated);
  };

  const filteredParts = Object.entries(partsByCategory).reduce((acc, [cat, parts]) => {
    const filtered = parts.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[cat] = filtered;
    }
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Busca e adição de peças */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">🔍 Buscar peças/serviços</Label>
        <div className="relative">
          <Input
            placeholder="Digite para filtrar..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="rounded-2xl"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
            {Object.entries(filteredParts).map(([category, parts]) => (
              <div key={category}>
                <button
                  onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-muted hover:bg-muted/80 transition-all text-sm font-semibold text-foreground"
                >
                  <span>{CATEGORY_LABELS[category] || category}</span>
                  <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-1">
                    {parts.length}
                  </span>
                </button>

                {expandedCategory === category && (
                  <div className="space-y-2 mt-2 pl-2 border-l-2 border-primary/30">
                    {parts.map(part => (
                      <button
                        key={part.id}
                        onClick={() => addPart(part)}
                        className="w-full flex items-center justify-between p-2.5 rounded-lg bg-primary/5 hover:bg-primary/10 transition-all text-left text-xs"
                      >
                        <div>
                          <p className="font-semibold text-foreground">{part.name}</p>
                          {part.description && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">{part.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-primary font-bold text-xs whitespace-nowrap">
                            R$ {part.unit_price.toFixed(2)}
                          </span>
                          <Plus className="w-4 h-4 text-primary" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Peças selecionadas */}
      {selectedParts.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-semibold">✅ Peças/Serviços Selecionados</Label>
          <div className="space-y-2">
            {selectedParts.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 p-3 rounded-xl bg-card border border-border">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{item.part.name}</p>
                  <p className="text-xs text-muted-foreground">
                    R$ {item.part.unit_price.toFixed(2)} / {item.part.unit}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={e => updateQuantity(idx, Number(e.target.value))}
                    className="w-12 h-9 text-center rounded-lg"
                  />
                  <span className="text-xs text-muted-foreground w-16 text-right">
                    R$ {(item.part.unit_price * item.quantity).toFixed(2)}
                  </span>
                  <button
                    onClick={() => removePart(idx)}
                    className="p-1.5 hover:bg-destructive/10 rounded-lg transition-all"
                  >
                    <X className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mão de obra */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">👨‍🔧 Mão de Obra (R$)</Label>
        <Input
          type="number"
          min="0"
          step="10"
          value={laborCost}
          onChange={e => setLaborCost(Math.max(0, Number(e.target.value)))}
          placeholder="Custo da mão de obra..."
          className="rounded-2xl"
        />
      </div>

      {/* Resumo detalhado */}
      <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">Resumo Detalhado</h3>
        </div>

        <div className="space-y-2 text-sm">
          {selectedParts.map((item, idx) => (
            <div key={idx} className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                {item.part.name} × {item.quantity}
              </span>
              <span className="font-semibold text-foreground">
                R$ {(item.part.unit_price * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}

          {selectedParts.length > 0 && (
            <div className="border-t border-primary/20 pt-2 my-2" />
          )}

          {partsTotal > 0 && (
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-foreground">Total em peças:</span>
              <span className="text-primary">R$ {partsTotal.toFixed(2)}</span>
            </div>
          )}

          {laborCost > 0 && (
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-foreground">Mão de obra:</span>
              <span className="text-primary">R$ {laborCost.toFixed(2)}</span>
            </div>
          )}

          {(partsTotal > 0 || laborCost > 0) && (
            <div className="border-t border-primary/20 pt-2 my-2" />
          )}

          {(partsTotal > 0 || laborCost > 0) ? (
            <div className="flex justify-between items-center">
              <span className="text-base font-black text-foreground">TOTAL:</span>
              <span className="text-2xl font-black text-primary">
                R$ {total.toFixed(2)}
              </span>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground text-center py-2">
              Selecione peças/serviços para calcular o orçamento
            </div>
          )}
        </div>
      </div>
    </div>
  );
}