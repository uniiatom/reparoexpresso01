import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Trash2, Settings, Award } from 'lucide-react';
import { toast } from 'sonner';

const REGISTRATION_FIELDS = [
  { id: 'birth_date', label: 'Data de Nascimento' },
  { id: 'cpf', label: 'CPF' },
  { id: 'rg', label: 'RG' },
  { id: 'zip_code', label: 'CEP' },
  { id: 'address', label: 'Endereço' },
  { id: 'neighborhood', label: 'Bairro' },
  { id: 'city', label: 'Cidade' },
  { id: 'state', label: 'Estado (UF)' },
  { id: 'qualifications', label: 'Qualificações' },
  { id: 'experience_years', label: 'Anos de Experiência' },
  { id: 'bio', label: 'Biografia / Observações' },
];

export default function ProviderSettings() {
  const queryClient = useQueryClient();
  const [newQualName, setNewQualName] = useState('');

  // Config
  const { data: config = { required_fields: [] }, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['provider-config'],
    queryFn: async () => {
      const list = await base44.entities.ProviderConfig.list();
      return list[0] || { required_fields: [] };
    },
  });

  const saveConfig = useMutation({
    mutationFn: async (requiredFields) => {
      if (config.id) {
        return base44.entities.ProviderConfig.update(config.id, { required_fields: requiredFields });
      } else {
        return base44.entities.ProviderConfig.create({ required_fields: requiredFields });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-config'] });
      toast.success('Configurações salvas!');
    },
  });

  const toggleField = (fieldId) => {
    const current = config.required_fields || [];
    const next = current.includes(fieldId)
      ? current.filter(id => id !== fieldId)
      : [...current, fieldId];
    saveConfig.mutate(next);
  };

  // Qualifications
  const { data: qualifications = [], isLoading: isLoadingQuals } = useQuery({
    queryKey: ['qualifications'],
    queryFn: () => base44.entities.Qualification.list(),
  });

  const addQual = useMutation({
    mutationFn: (name) => base44.entities.Qualification.create({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qualifications'] });
      setNewQualName('');
      toast.success('Qualificação adicionada!');
    },
  });

  const deleteQual = useMutation({
    mutationFn: (id) => base44.entities.Qualification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qualifications'] });
      toast.success('Qualificação removida.');
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" /> Campos Obrigatórios no Cadastro
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Defina quais campos o prestador deve obrigatoriamente preencher ao se cadastrar.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {REGISTRATION_FIELDS.map(field => (
              <div key={field.id} className="flex items-center gap-2 p-3 border rounded-xl hover:bg-muted/50 transition-colors">
                <Checkbox 
                  id={`field-${field.id}`}
                  checked={config.required_fields?.includes(field.id)}
                  onCheckedChange={() => toggleField(field.id)}
                  disabled={saveConfig.isPending}
                />
                <label 
                  htmlFor={`field-${field.id}`}
                  className="text-sm font-medium cursor-pointer flex-1"
                >
                  {field.label}
                </label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" /> Lista de Qualificações
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Cadastre as qualificações que estarão disponíveis para os prestadores selecionarem.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input 
              placeholder="Ex: NR-10, Curso SENAI, etc."
              value={newQualName}
              onChange={e => setNewQualName(e.target.value)}
              className="rounded-xl"
            />
            <Button 
              onClick={() => addQual.mutate(newQualName)}
              disabled={!newQualName.trim() || addQual.isPending}
              className="rounded-xl gap-2"
            >
              <Plus className="w-4 h-4" /> Adicionar
            </Button>
          </div>

          <div className="space-y-2">
            {isLoadingQuals ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : qualifications.length === 0 ? (
              <p className="text-sm text-muted-foreground italic text-center py-4">Nenhuma qualificação cadastrada.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {qualifications.map(qual => (
                  <div key={qual.id} className="flex items-center justify-between p-3 border rounded-xl bg-muted/30">
                    <span className="text-sm font-medium">{qual.name}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive h-8 w-8"
                      onClick={() => deleteQual.mutate(qual.id)}
                      disabled={deleteQual.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
