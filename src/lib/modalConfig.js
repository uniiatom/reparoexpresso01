// Configuração para o modal de Pressurizador
export const PRESSURIZADOR_TIPOS = [
  { value: 'visita_tecnica', label: 'Visita Técnica', emoji: '🔧' },
  { value: 'instalacao', label: 'Instalação', emoji: '⚙️' },
  { value: 'reparo', label: 'Reparo/Manutenção', emoji: '🔩' },
];

export const getPressurizadorDescription = (tipo) => {
  const descriptions = {
    visita_tecnica: 'Visita técnica para avaliar instalação',
    instalacao: 'Instalação de novo pressurizador',
    reparo: 'Reparo ou manutenção do pressurizador existente',
  };
  return descriptions[tipo] || tipo;
};

export const getPressurizadorLabel = (tipo) => {
  const labels = {
    visita_tecnica: 'Visita',
    instalacao: 'Instalação',
    reparo: 'Reparo',
  };
  return labels[tipo] || tipo;
};