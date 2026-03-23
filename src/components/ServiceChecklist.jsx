import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, CheckCircle2, Loader2, X, ClipboardList, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import SignaturePad from './SignaturePad';

const DEFAULT_ITEMS = [
  "Apresentei minha identificação ao cliente",
  "Avaliei o problema antes de iniciar",
  "Utilizei EPI adequado",
  "Executei o serviço conforme combinado",
  "Testei e validei com o cliente",
  "Área de trabalho limpa e organizada",
];

const AUTHORIZATION_ITEMS = [
  "Cliente autorizou os trabalhos realizados",
  "Cliente recebeu explicação clara do executado",
  "Cliente concorda com o serviço entregue",
];

export default function ServiceChecklist({ job, onClose }) {
  const [checkedItems, setCheckedItems] = useState({});
  const [authorizationItems, setAuthorizationItems] = useState({});
  const [photos, setPhotos] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [location, setLocation] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [notes, setNotes] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [preAuthSignature, setPreAuthSignature] = useState(null);
  const [finalSignature, setFinalSignature] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggleItem = (item) => {
    setCheckedItems(prev => ({ ...prev, [item]: !prev[item] }));
  };

  const toggleAuthorizationItem = (item) => {
    setAuthorizationItems(prev => ({ ...prev, [item]: !prev[item] }));
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingPhoto(true);
    const urls = await Promise.all(
      files.map(f => base44.integrations.Core.UploadFile({ file: f }).then(r => r.file_url))
    );
    setPhotos(prev => [...prev, ...urls]);
    setUploadingPhoto(false);
  };

  const removePhoto = (idx) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const getLocation = () => {
    if (!navigator.geolocation) return;
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setGettingLocation(false);
      },
      () => setGettingLocation(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const allChecked = DEFAULT_ITEMS.every(item => checkedItems[item]);
  const allAuthorizationsChecked = AUTHORIZATION_ITEMS.every(item => authorizationItems[item]);
  const canSave = allChecked && allAuthorizationsChecked && preAuthSignature && finalSignature && serviceDescription.trim().length > 5;

  const handleSave = async () => {
    setSaving(true);
    const checklistData = {
      items: DEFAULT_ITEMS.map(item => ({ label: item, checked: !!checkedItems[item] })),
      authorizations: AUTHORIZATION_ITEMS.map(item => ({ label: item, checked: !!authorizationItems[item] })),
      photos,
      notes,
      location,
      completed_at: new Date().toISOString(),
    };
    await base44.entities.ServiceRequest.update(job.id, {
      checklist: checklistData,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(onClose, 1500);
  };

  if (saved) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-3xl p-8 text-center max-w-sm w-full shadow-2xl">
          <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-foreground">Checklist salvo!</h3>
          <p className="text-muted-foreground text-sm mt-1">Registro concluído com sucesso.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-background w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card flex-shrink-0">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground text-lg">Checklist do Serviço</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-accent">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-6">
          {/* Itens do checklist */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Itens obrigatórios</p>
            {DEFAULT_ITEMS.map(item => (
              <button
                key={item}
                onClick={() => toggleItem(item)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all",
                  checkedItems[item] ? "border-green-500 bg-green-50" : "border-border hover:border-primary/40"
                )}
              >
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                  checkedItems[item] ? "bg-green-500 border-green-500" : "border-muted-foreground"
                )}>
                  {checkedItems[item] && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                </div>
                <span className={cn("text-sm", checkedItems[item] ? "text-green-700 font-medium line-through" : "text-foreground")}>
                  {item}
                </span>
              </button>
            ))}
          </div>

          {/* Autorização prévia do cliente */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Autorização prévia do cliente</p>
            {AUTHORIZATION_ITEMS.map(item => (
              <button
                key={item}
                onClick={() => toggleAuthorizationItem(item)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all",
                  authorizationItems[item] ? "border-blue-500 bg-blue-50" : "border-border hover:border-primary/40"
                )}
              >
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                  authorizationItems[item] ? "bg-blue-500 border-blue-500" : "border-muted-foreground"
                )}>
                  {authorizationItems[item] && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                </div>
                <span className={cn("text-sm", authorizationItems[item] ? "text-blue-700 font-medium" : "text-foreground")}>
                  {item}
                </span>
              </button>
            ))}
            <p className="text-xs text-muted-foreground mt-2">O cliente deve confirmar a conclusão satisfatória do serviço</p>
          </div>

          {/* Geolocalização */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Geolocalização</p>
            <button
              onClick={getLocation}
              disabled={gettingLocation}
              className={cn(
                "w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left",
                location ? "border-green-500 bg-green-50" : "border-dashed border-border hover:border-primary/50"
              )}
            >
              {gettingLocation
                ? <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
                : <MapPin className={cn("w-5 h-5 flex-shrink-0", location ? "text-green-600" : "text-muted-foreground")} />}
              <div>
                <p className={cn("font-semibold text-sm", location ? "text-green-700" : "text-foreground")}>
                  {gettingLocation ? "Obtendo localização..." : location ? "Localização registrada ✓" : "Registrar localização atual"}
                </p>
                {location && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)} · precisão ~{Math.round(location.accuracy)}m
                  </p>
                )}
              </div>
            </button>
          </div>

          {/* Fotos */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Fotos do serviço</p>
            <div className="flex flex-wrap gap-2">
              {photos.map((url, idx) => (
                <div key={idx} className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-border">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removePhoto(idx)}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center"
                  >
                    <X className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              ))}
              {photos.length < 8 && (
                <label className={cn(
                  "w-24 h-24 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors",
                  uploadingPhoto && "opacity-50 pointer-events-none"
                )}>
                  {uploadingPhoto
                    ? <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                    : <><Plus className="w-6 h-6 text-muted-foreground" /><span className="text-xs text-muted-foreground mt-1">Foto</span></>}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} capture="environment" />
                </label>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Fotografe o antes, durante e depois do serviço (máx. 8)</p>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Observações (opcional)</p>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Anote qualquer informação relevante sobre o serviço..."
              className="rounded-2xl min-h-[80px]"
            />
          </div>

          {/* Data/hora automática */}
          <div className="bg-muted/60 rounded-2xl p-3 text-xs text-muted-foreground flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
            Data e hora serão registradas automaticamente: {new Date().toLocaleString('pt-BR')}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border bg-card flex-shrink-0">
          {(!allChecked || !allAuthorizationsChecked) && (
            <p className="text-xs text-orange-600 text-center mb-2">
              {!allChecked ? "Marque todos os itens obrigatórios" : "Obtenha a autorização do cliente"}
            </p>
          )}
          <Button
            onClick={handleSave}
            disabled={!allChecked || !allAuthorizationsChecked || saving}
            className="w-full h-12 rounded-2xl font-bold bg-primary text-primary-foreground"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-2" /> Salvar checklist</>}
          </Button>
        </div>
      </div>
    </div>
  );
}