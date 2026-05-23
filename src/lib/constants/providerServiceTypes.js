/** Tipos de serviço canônicos — alinhados a ServicePricing / ServiceRequest */
export const PROVIDER_SERVICE_TYPES = [
  { value: 'eletrica', label: 'Elétrica' },
  { value: 'hidraulica', label: 'Hidráulica' },
  { value: 'fechadura', label: 'Fechadura' },
  { value: 'ar_condicionado', label: 'Ar Condicionado' },
  { value: 'limpeza_caixa_dagua', label: "Limpeza Caixa d'Água" },
  { value: 'limpeza_calha', label: 'Limpeza de Calha' },
  { value: 'substituicao_telha', label: 'Substituição de Telha' },
  { value: 'desentupimento', label: 'Desentupimento' },
  { value: 'pintura', label: 'Pintura' },
  { value: 'reparo_geral', label: 'Reparo Geral' },
  { value: 'montagem', label: 'Montagem' },
  { value: 'alvenaria', label: 'Alvenaria' },
  { value: 'portao_eletronico', label: 'Portão Eletrônico' },
  { value: 'troca_pneu', label: 'Troca de Pneu' },
  { value: 'recarga_bateria', label: 'Recarga de Bateria' },
  { value: 'reboque', label: 'Reboque' },
  { value: 'outros', label: 'Outros' },
];

export const WEEKDAYS = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

export function getServiceLabel(value) {
  return PROVIDER_SERVICE_TYPES.find((t) => t.value === value)?.label ?? value;
}
