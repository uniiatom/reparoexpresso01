/** Campos configuráveis no cadastro de prestador (admin → Configurações) */

export const REGISTRATION_FIELD_GROUPS = [
  {
    id: 'access',
    label: 'Acesso',
    fields: [
      { id: 'email', label: 'E-mail de acesso' },
    ],
  },
  {
    id: 'personal',
    label: 'Dados pessoais',
    fields: [
      { id: 'birth_date', label: 'Data de nascimento' },
      { id: 'cpf', label: 'CPF' },
      { id: 'rg', label: 'RG' },
      { id: 'photo_url', label: 'Foto de rosto' },
      { id: 'photo_body_url', label: 'Foto de corpo inteiro' },
    ],
  },
  {
    id: 'address',
    label: 'Endereço',
    fields: [
      { id: 'address_number', label: 'Número do endereço' },
      { id: 'neighborhood', label: 'Bairro' },
    ],
  },
  {
    id: 'profile',
    label: 'Perfil',
    fields: [
      { id: 'bio', label: 'Observações / Bio' },
    ],
  },
  {
    id: 'documents',
    label: 'Documentos',
    fields: [
      { id: 'cnh', label: 'CNH (Carteira de Habilitação)' },
      { id: 'crlv', label: 'CRLV / CRV do veículo' },
      { id: 'crlv_vehicle_type', label: 'Tipo de veículo (carro ou moto)' },
      { id: 'address_proof', label: 'Comprovante de endereço' },
      { id: 'id_holding_document', label: 'Foto segurando o documento' },
      { id: 'background_check', label: 'Antecedentes criminais' },
    ],
  },
];

/** Lista plana (compatibilidade) */
export const REGISTRATION_FIELDS = REGISTRATION_FIELD_GROUPS.flatMap((g) => g.fields);

/** Mapeamento campo config → colunas do prestador */
export const PROVIDER_DOCUMENT_FIELD_MAP = {
  cnh: {
    label: 'CNH – Carteira de Habilitação',
    urlKey: 'cnh_url',
    statusKey: 'cnh_status',
    rejectionKey: 'cnh_rejection_reason',
    defaultStatus: 'pendente',
  },
  crlv: {
    label: 'CRLV – Registro do Veículo (CRV)',
    urlKey: 'crlv_url',
    statusKey: 'crlv_status',
    rejectionKey: 'crlv_rejection_reason',
    defaultStatus: 'pendente',
  },
  address_proof: {
    label: 'Comprovante de endereço',
    urlKey: 'address_proof_url',
    statusKey: 'address_proof_status',
    rejectionKey: 'address_proof_rejection_reason',
    defaultStatus: 'nao_enviado',
  },
  id_holding_document: {
    label: 'Foto segurando o documento',
    urlKey: 'id_holding_document_url',
    statusKey: 'id_holding_document_status',
    rejectionKey: 'id_holding_document_rejection_reason',
    defaultStatus: 'nao_enviado',
  },
  background_check: {
    label: 'Antecedentes criminais',
    urlKey: 'background_check_url',
    statusKey: 'background_check_status',
    rejectionKey: 'background_check_rejection_reason',
    defaultStatus: 'nao_enviado',
  },
};

export const CRLV_VEHICLE_TYPES = [
  { value: 'carro', label: 'Carro' },
  { value: 'moto', label: 'Moto' },
];

/** Campos de formulário simples (não-documento) */
export const FORM_FIELD_VALUE_KEYS = {
  email: 'email',
  birth_date: 'birth_date',
  cpf: 'cpf',
  rg: 'rg',
  photo_url: 'photo_url',
  photo_body_url: 'photo_body_url',
  address_number: 'address_number',
  neighborhood: 'neighborhood',
  bio: 'bio',
  crlv_vehicle_type: 'crlv_vehicle_type',
};

export function getDocumentFieldsFromConfig(requiredFields = []) {
  return Object.keys(PROVIDER_DOCUMENT_FIELD_MAP).filter((key) => {
    if (key === 'crlv_vehicle_type') return false;
    return requiredFields.includes(key);
  });
}

export function providerCanBeReleased(provider, requiredFields = []) {
  const requiredDocs = Object.keys(PROVIDER_DOCUMENT_FIELD_MAP).filter((key) =>
    requiredFields.includes(key),
  );

  for (const key of requiredDocs) {
    const def = PROVIDER_DOCUMENT_FIELD_MAP[key];
    if (!provider?.[def.urlKey]) return false;
    if (provider[def.statusKey] !== 'aprovado') return false;
  }

  for (const def of Object.values(PROVIDER_DOCUMENT_FIELD_MAP)) {
    const url = provider?.[def.urlKey];
    if (!url) continue;
    const status = provider[def.statusKey] || def.defaultStatus;
    if (status !== 'aprovado') return false;
  }

  if (requiredFields.includes('crlv_vehicle_type') && !provider?.crlv_vehicle_type) {
    return false;
  }

  return true;
}

export function getProviderDocumentReviewStatus(provider, requiredFields = []) {
  const docKeys = getDocumentFieldsFromConfig(requiredFields);
  const relevant = docKeys.length > 0 ? docKeys : Object.keys(PROVIDER_DOCUMENT_FIELD_MAP);

  const statuses = relevant.map((key) => {
    const def = PROVIDER_DOCUMENT_FIELD_MAP[key];
    const url = provider?.[def.urlKey];
    if (!url) return 'pendente';
    return provider?.[def.statusKey] || def.defaultStatus;
  });

  if (statuses.some((s) => s === 'reprovado')) return 'reprovado';
  if (statuses.every((s) => s === 'aprovado')) return 'aprovado';
  if (statuses.some((s) => s === 'pendente' || s === 'nao_enviado')) return 'pendente';
  return 'pendente';
}
