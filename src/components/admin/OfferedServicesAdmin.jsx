import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import OfferedServiceCard from '@/components/offered-services/OfferedServiceCard';
import {
  FIELD_TYPE_LABELS,
  OFFERED_SERVICE_ICON_MAP,
  slugifyServiceName,
} from '@/lib/offeredServices';
import {
  Settings2, Plus, Pencil, Trash2, Loader2, Layers, Sparkles, Search, X,
} from 'lucide-react';
import ImagePickerField from '@/components/media/ImagePickerField';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const EMPTY_SERVICE = {
  name: '',
  slug: '',
  description: '',
  average_price: '',
  estimated_duration_minutes: '',
  image_url: '',
  service_group: 'casa',
  icon_key: 'Wrench',
  is_active: true,
  sort_order: 0,
  field_values: {},
  extra_field_definitions: [],
};

const EMPTY_TEMPLATE = {
  field_key: '',
  field_label: '',
  field_type: 'text',
  placeholder: '',
  is_required: false,
  is_active: true,
  sort_order: 0,
  options: [],
};

function FieldValueInput({ field, value, onChange }) {
  if (field.field_type === 'boolean') {
    return <Switch checked={!!value} onCheckedChange={onChange} />;
  }
  if (field.field_type === 'textarea') {
    return (
      <Textarea
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder || ''}
        className="rounded-xl min-h-[80px]"
      />
    );
  }
  return (
    <Input
      type={field.field_type === 'number' ? 'number' : 'text'}
      value={value ?? ''}
      onChange={(e) => onChange(field.field_type === 'number' ? Number(e.target.value) : e.target.value)}
      placeholder={field.placeholder || ''}
      className="rounded-xl"
    />
  );
}

export default function OfferedServicesAdmin() {
  const qc = useQueryClient();
  const [groupFilter, setGroupFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceDialog, setServiceDialog] = useState(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [templateEdit, setTemplateEdit] = useState(null);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['admin-offered-services'],
    queryFn: () => base44.entities.OfferedService.list('sort_order', 300),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['admin-offered-service-templates'],
    queryFn: () => base44.entities.OfferedServiceFieldTemplate.list('sort_order', 100),
  });

  const activeTemplates = useMemo(
    () => templates.filter((t) => t.is_active !== false),
    [templates],
  );

  const filteredServices = useMemo(() => {
    let list = services;
    if (groupFilter !== 'all') {
      list = list.filter((s) => s.service_group === groupFilter);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((s) => {
        const name = (s.name || '').toLowerCase();
        const slug = (s.slug || '').toLowerCase();
        const description = (s.description || '').toLowerCase();
        return name.includes(q) || slug.includes(q) || description.includes(q);
      });
    }
    return list;
  }, [services, groupFilter, searchQuery]);

  const totalServices = services.length;
  const activeServicesCount = useMemo(
    () => services.filter((s) => s.is_active !== false).length,
    [services],
  );

  const saveService = useMutation({
    mutationFn: (payload) => (
      payload.id
        ? base44.entities.OfferedService.update(payload.id, payload)
        : base44.entities.OfferedService.create(payload)
    ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-offered-services'] });
      qc.invalidateQueries({ queryKey: ['offered-services'] });
      qc.invalidateQueries({ queryKey: ['provider-service-options'] });
      qc.invalidateQueries({ queryKey: ['media-library'] });
      setServiceDialog(null);
      toast.success('Serviço salvo com sucesso.');
    },
    onError: (err) => toast.error(err.message || 'Erro ao salvar serviço.'),
  });

  const deleteService = useMutation({
    mutationFn: (id) => base44.entities.OfferedService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-offered-services'] });
      qc.invalidateQueries({ queryKey: ['offered-services'] });
      qc.invalidateQueries({ queryKey: ['provider-service-options'] });
      qc.invalidateQueries({ queryKey: ['media-library'] });
      toast.success('Serviço removido.');
    },
  });

  const saveTemplate = useMutation({
    mutationFn: (payload) => (
      payload.id
        ? base44.entities.OfferedServiceFieldTemplate.update(payload.id, payload)
        : base44.entities.OfferedServiceFieldTemplate.create(payload)
    ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-offered-service-templates'] });
      qc.invalidateQueries({ queryKey: ['offered-service-field-templates'] });
      setTemplateEdit(null);
      toast.success('Campo padrão salvo.');
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: (id) => base44.entities.OfferedServiceFieldTemplate.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-offered-service-templates'] });
      toast.success('Campo removido.');
    },
  });

  const openCreate = () => setServiceDialog({ ...EMPTY_SERVICE, sort_order: services.length + 1 });

  const openEdit = (service) => setServiceDialog({
    ...EMPTY_SERVICE,
    ...service,
    average_price: service.average_price ?? '',
    estimated_duration_minutes: service.estimated_duration_minutes ?? '',
    field_values: service.field_values ?? {},
    extra_field_definitions: service.extra_field_definitions ?? [],
  });

  const submitService = () => {
    if (!serviceDialog?.name?.trim()) {
      toast.error('Informe o nome do serviço.');
      return;
    }
    const slug = serviceDialog.slug?.trim() || slugifyServiceName(serviceDialog.name);
    saveService.mutate({
      ...serviceDialog,
      slug,
      average_price: serviceDialog.average_price === '' ? null : Number(serviceDialog.average_price),
      estimated_duration_minutes: serviceDialog.estimated_duration_minutes === ''
        ? null
        : Number(serviceDialog.estimated_duration_minutes),
      sort_order: Number(serviceDialog.sort_order) || 0,
    });
  };

  const updateFieldValue = (key, value) => {
    setServiceDialog((prev) => ({
      ...prev,
      field_values: { ...(prev.field_values || {}), [key]: value },
    }));
  };

  const addExtraFieldDef = () => {
    setServiceDialog((prev) => ({
      ...prev,
      extra_field_definitions: [
        ...(prev.extra_field_definitions || []),
        {
          field_key: `extra_${Date.now()}`,
          field_label: 'Novo campo',
          field_type: 'text',
          is_required: false,
        },
      ],
    }));
  };

  const updateExtraFieldDef = (index, patch) => {
    setServiceDialog((prev) => {
      const list = [...(prev.extra_field_definitions || [])];
      list[index] = { ...list[index], ...patch };
      return { ...prev, extra_field_definitions: list };
    });
  };

  const removeExtraFieldDef = (index) => {
    setServiceDialog((prev) => ({
      ...prev,
      extra_field_definitions: (prev.extra_field_definitions || []).filter((_, i) => i !== index),
    }));
  };

  const submitTemplate = () => {
    if (!templateEdit?.field_label?.trim()) {
      toast.error('Informe o rótulo do campo.');
      return;
    }
    const field_key = templateEdit.field_key?.trim()
      || slugifyServiceName(templateEdit.field_label);
    saveTemplate.mutate({
      ...templateEdit,
      field_key,
      sort_order: Number(templateEdit.sort_order) || 0,
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-amber-400/15 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.12),transparent_45%),linear-gradient(135deg,rgba(24,24,27,0.95),rgba(9,9,11,0.98))] p-6">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-400/10 blur-2xl" />
        <div className="relative mb-5 flex flex-wrap items-center gap-3">
          <div className="inline-flex items-baseline gap-2 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-2.5">
            <span className="text-3xl font-bold tabular-nums text-amber-300 leading-none">
              {totalServices}
            </span>
            <span className="text-sm font-medium text-amber-100/90">
              {totalServices === 1 ? 'serviço cadastrado' : 'serviços cadastrados'}
            </span>
          </div>
          <span className="text-xs text-zinc-500">
            {activeServicesCount} ativo{activeServicesCount === 1 ? '' : 's'}
            {totalServices > activeServicesCount && (
              <> · {totalServices - activeServicesCount} inativo{totalServices - activeServicesCount === 1 ? '' : 's'}</>
            )}
          </span>
          {(groupFilter !== 'all' || searchQuery.trim()) && (
            <span className="text-xs text-zinc-500">
              · {filteredServices.length} exibido{filteredServices.length === 1 ? '' : 's'}
              {searchQuery.trim() ? ' na busca' : ' neste filtro'}
            </span>
          )}
        </div>
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-amber-400/90 text-xs font-bold uppercase tracking-[0.18em] mb-2">
              <Layers className="w-4 h-4" />
              Cadastros
            </div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Serviços Prestados</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Cada serviço cadastrado aqui aparece como card para o cliente solicitar e para o prestador consultar no catálogo.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-xl border-amber-400/30 hover:bg-amber-400/10" onClick={() => setConfigOpen(true)}>
              <Settings2 className="w-4 h-4 mr-2" />
              Campos padrão
            </Button>
            <Button className="rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Novo serviço
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Buscar por nome, identificador ou descrição..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 rounded-xl border-white/10 bg-zinc-900/50"
            aria-label="Buscar serviço"
          />
          {searchQuery.trim() && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 transition-colors"
              aria-label="Limpar busca"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'casa', label: '🏠 Casa' },
            { id: 'veiculo', label: '🚗 Veículo' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setGroupFilter(tab.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
                groupFilter === tab.id
                  ? 'bg-amber-400/15 border-amber-400/40 text-amber-300'
                  : 'border-white/10 text-zinc-400 hover:text-zinc-200',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filteredServices.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 py-14 px-6 text-center">
          <Search className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">Nenhum serviço encontrado</p>
          <p className="text-xs text-muted-foreground mt-1">
            {searchQuery.trim()
              ? `Não há resultados para "${searchQuery.trim()}". Tente outro termo ou limpe a busca.`
              : 'Nenhum serviço nesta categoria. Cadastre um novo ou altere o filtro.'}
          </p>
          {searchQuery.trim() && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4 rounded-xl"
              onClick={() => setSearchQuery('')}
            >
              Limpar busca
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
          {filteredServices.map((service) => (
            <OfferedServiceCard
              key={service.id}
              service={service}
              showDescription
              admin
              onEdit={() => openEdit(service)}
              onDelete={() => deleteService.mutate(service.id)}
            />
          ))}
        </div>
      )}

      <Dialog open={!!serviceDialog} onOpenChange={(v) => !v && setServiceDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              {serviceDialog?.id ? 'Editar serviço' : 'Novo serviço'}
            </DialogTitle>
          </DialogHeader>

          {serviceDialog && (
            <div className="space-y-4 py-2">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Nome do serviço *</Label>
                  <Input value={serviceDialog.name} onChange={(e) => setServiceDialog((p) => ({ ...p, name: e.target.value }))} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Identificador (slug)</Label>
                  <Input
                    value={serviceDialog.slug}
                    onChange={(e) => setServiceDialog((p) => ({ ...p, slug: e.target.value }))}
                    placeholder={slugifyServiceName(serviceDialog.name || 'servico')}
                    className="rounded-xl font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Preço médio (R$)</Label>
                  <Input type="number" min="0" step="0.01" value={serviceDialog.average_price} onChange={(e) => setServiceDialog((p) => ({ ...p, average_price: e.target.value }))} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Tempo estimado (min)</Label>
                  <Input type="number" min="0" value={serviceDialog.estimated_duration_minutes} onChange={(e) => setServiceDialog((p) => ({ ...p, estimated_duration_minutes: e.target.value }))} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Grupo</Label>
                  <Select value={serviceDialog.service_group} onValueChange={(v) => setServiceDialog((p) => ({ ...p, service_group: v }))}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="casa">Casa</SelectItem>
                      <SelectItem value="veiculo">Veículo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={serviceDialog.description || ''} onChange={(e) => setServiceDialog((p) => ({ ...p, description: e.target.value }))} className="rounded-xl min-h-[90px]" />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Ícone</Label>
                  <Select value={serviceDialog.icon_key || 'Wrench'} onValueChange={(v) => setServiceDialog((p) => ({ ...p, icon_key: v }))}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(OFFERED_SERVICE_ICON_MAP).map((key) => (
                        <SelectItem key={key} value={key}>{key}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ordem</Label>
                  <Input type="number" value={serviceDialog.sort_order} onChange={(e) => setServiceDialog((p) => ({ ...p, sort_order: e.target.value }))} className="rounded-xl" />
                </div>
              </div>

              <ImagePickerField
                label="Imagem para o cliente"
                value={serviceDialog.image_url || ''}
                onChange={(url) => setServiceDialog((p) => ({ ...p, image_url: url }))}
                uploadSource="offered_service"
              />

              {activeTemplates.length > 0 && (
                <div className="rounded-2xl border border-white/10 p-4 space-y-3">
                  <p className="text-sm font-semibold text-foreground">Campos padrão do catálogo</p>
                  {activeTemplates.map((field) => (
                    <div key={field.id} className="space-y-1.5">
                      <Label className="text-xs">
                        {field.field_label}
                        {field.is_required && <span className="text-amber-400 ml-1">*</span>}
                      </Label>
                      <FieldValueInput
                        field={field}
                        value={serviceDialog.field_values?.[field.field_key]}
                        onChange={(v) => updateFieldValue(field.field_key, v)}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-2xl border border-white/10 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Campos extras deste serviço</p>
                  <Button size="sm" variant="outline" className="rounded-lg" onClick={addExtraFieldDef}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Campo
                  </Button>
                </div>
                {(serviceDialog.extra_field_definitions || []).map((field, index) => (
                  <div key={field.field_key || index} className="grid sm:grid-cols-3 gap-2 items-end">
                    <Input value={field.field_label} onChange={(e) => updateExtraFieldDef(index, { field_label: e.target.value })} placeholder="Nome do campo" className="rounded-xl" />
                    <Select value={field.field_type || 'text'} onValueChange={(v) => updateExtraFieldDef(index, { field_type: v })}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(FIELD_TYPE_LABELS).map(([k, label]) => (
                          <SelectItem key={k} value={k}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" className="text-destructive" onClick={() => removeExtraFieldDef(index)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={!!serviceDialog.is_active} onCheckedChange={(v) => setServiceDialog((p) => ({ ...p, is_active: v }))} />
                <Label>Serviço ativo (visível para cliente e prestador)</Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setServiceDialog(null)}>Cancelar</Button>
            <Button className="rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950" onClick={submitService} disabled={saveService.isPending}>
              Salvar serviço
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Campos padrão para todos os serviços</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            Defina quais informações extras aparecem em todo cadastro de serviço.
          </p>
          <div className="space-y-2">
            {templates.map((tpl) => (
              <div key={tpl.id} className="flex items-center gap-2 p-3 rounded-xl border border-white/10">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tpl.field_label}</p>
                  <p className="text-xs text-muted-foreground">{FIELD_TYPE_LABELS[tpl.field_type]} · {tpl.field_key}</p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => setTemplateEdit({ ...EMPTY_TEMPLATE, ...tpl })}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteTemplate.mutate(tpl.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button variant="outline" className="rounded-xl w-full" onClick={() => setTemplateEdit({ ...EMPTY_TEMPLATE, sort_order: templates.length + 1 })}>
            <Plus className="w-4 h-4 mr-2" /> Novo campo padrão
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!templateEdit} onOpenChange={(v) => !v && setTemplateEdit(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{templateEdit?.id ? 'Editar campo padrão' : 'Novo campo padrão'}</DialogTitle>
          </DialogHeader>
          {templateEdit && (
            <div className="space-y-3 py-2">
              <div className="space-y-2">
                <Label>Rótulo</Label>
                <Input value={templateEdit.field_label} onChange={(e) => setTemplateEdit((p) => ({ ...p, field_label: e.target.value }))} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={templateEdit.field_type} onValueChange={(v) => setTemplateEdit((p) => ({ ...p, field_type: v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(FIELD_TYPE_LABELS).map(([k, label]) => (
                      <SelectItem key={k} value={k}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Placeholder</Label>
                <Input value={templateEdit.placeholder || ''} onChange={(e) => setTemplateEdit((p) => ({ ...p, placeholder: e.target.value }))} className="rounded-xl" />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={!!templateEdit.is_required} onCheckedChange={(v) => setTemplateEdit((p) => ({ ...p, is_required: v }))} />
                <Label>Obrigatório</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateEdit(null)}>Cancelar</Button>
            <Button onClick={submitTemplate} className="bg-amber-500 text-zinc-950 hover:bg-amber-400">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
