import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import ImagePickerField from '@/components/media/ImagePickerField';
import { CRLV_VEHICLE_TYPES, PROVIDER_DOCUMENT_FIELD_MAP } from '@/lib/providerRegistrationFields';

const DOCUMENT_FORM_FIELDS = [
  { configKey: 'cnh', expiryKey: 'cnh_expiry', expiryLabel: 'Validade da CNH (opcional)' },
  { configKey: 'crlv', expiryKey: 'crlv_expiry', expiryLabel: 'Validade do CRLV (opcional)' },
  { configKey: 'address_proof' },
  { configKey: 'id_holding_document' },
  { configKey: 'background_check' },
];

export default function ProviderDocumentsSection({ form, set, isRequired }) {
  return (
    <div className="space-y-4">
      {DOCUMENT_FORM_FIELDS.map(({ configKey, expiryKey, expiryLabel }) => {
        const def = PROVIDER_DOCUMENT_FIELD_MAP[configKey];
        return (
          <div key={configKey} className="space-y-3 rounded-xl border border-border/50 p-4 bg-card/30">
            <ImagePickerField
              label={`${def.label}${isRequired(configKey) ? ' *' : ' (opcional)'}`}
              value={form[def.urlKey] || ''}
              onChange={(url) => set(def.urlKey, url)}
              uploadSource="provider_document"
            />
            {expiryKey && (
              <div className="space-y-1.5">
                <Label>{expiryLabel}</Label>
                <Input
                  type="date"
                  value={form[expiryKey] || ''}
                  onChange={(e) => set(expiryKey, e.target.value)}
                  className="rounded-xl"
                />
              </div>
            )}
          </div>
        );
      })}

      <div className="space-y-1.5 rounded-xl border border-border/50 p-4 bg-card/30">
        <Label>Tipo de veículo (CRLV) {isRequired('crlv_vehicle_type') ? '*' : '(opcional)'}</Label>
        <p className="text-xs text-muted-foreground mb-2">Informe se o CRV é de carro ou moto.</p>
        <Select value={form.crlv_vehicle_type || ''} onValueChange={(v) => set('crlv_vehicle_type', v)}>
          <SelectTrigger className="rounded-xl"><SelectValue placeholder="Carro ou moto" /></SelectTrigger>
          <SelectContent>
            {CRLV_VEHICLE_TYPES.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
