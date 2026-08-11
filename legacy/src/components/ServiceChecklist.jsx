import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, CheckCircle2, Loader2, X, ClipboardList, Plus, Video, Play, Trash2, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import SignaturePad from './SignaturePad';

const PRE_AUTH_ITEMS = [
  "Apresentei minha identificação ao cliente",
  "Avaliei o problema antes de iniciar",
];

const POST_AUTH_ITEMS = [
  "Utilizei EPI adequado",
  "Executei o serviço conforme combinado",
  "Testei e validei com o cliente",
  "Área de trabalho limpa e organizada",
];

const DEFAULT_ITEMS = [...PRE_AUTH_ITEMS, ...POST_AUTH_ITEMS];

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
  const [videos, setVideos] = useState([]);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [location, setLocation] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [notes, setNotes] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [preAuthDescription, setPreAuthDescription] = useState('');
  const [postAuthDescription, setPostAuthDescription] = useState('');
  const [preAuthSignature, setPreAuthSignature] = useState(null);
  const [preAuthSignerPhoto, setPreAuthSignerPhoto] = useState(null);
  const [preAuthCpf, setPreAuthCpf] = useState('');
  const [finalSignature, setFinalSignature] = useState(null);
  const [finalSignerPhoto, setFinalSignerPhoto] = useState(null);
  const [finalCpf, setFinalCpf] = useState('');
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

  const handleVideoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingVideo(true);
    const urls = await Promise.all(
      files.map(f => base44.integrations.Core.UploadFile({ file: f }).then(r => r.file_url))
    );
    setVideos(prev => [...prev, ...urls]);
    setUploadingVideo(false);
  };

  const removeVideo = (idx) => {
    setVideos(prev => prev.filter((_, i) => i !== idx));
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

  const uploadBase64AsFile = async (base64DataUrl, filename) => {
    if (!base64DataUrl) return null;
    const res = await fetch(base64DataUrl);
    const blob = await res.blob();
    const file = new File([blob], filename, { type: blob.type });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    return file_url;
  };

  const handleSave = async () => {
    setSaving(true);

    // Upload base64 photos to storage before saving
    const [preAuthSignerPhotoUrl, preAuthSignatureUrl, finalSignerPhotoUrl, finalSignatureUrl] = await Promise.all([
      uploadBase64AsFile(preAuthSignerPhoto, 'pre_auth_signer_photo.jpg'),
      uploadBase64AsFile(preAuthSignature, 'pre_auth_signature.png'),
      uploadBase64AsFile(finalSignerPhoto, 'final_signer_photo.jpg'),
      uploadBase64AsFile(finalSignature, 'final_signature.png'),
    ]);

    const checklistData = {
      items: DEFAULT_ITEMS.map(item => ({ label: item, checked: !!checkedItems[item] })),
      authorizations: AUTHORIZATION_ITEMS.map(item => ({ label: item, checked: !!authorizationItems[item] })),
      photos,
      videos,
      notes,
      pre_auth_description: preAuthDescription,
      service_description: serviceDescription,
      post_auth_description: postAuthDescription,
      pre_auth_signature: preAuthSignatureUrl,
      pre_auth_signer_photo: preAuthSignerPhotoUrl,
      pre_auth_cpf: preAuthCpf,
      final_signature: finalSignatureUrl,
      final_signer_photo: finalSignerPhotoUrl,
      final_cpf: finalCpf,
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
          {/* Itens pré-autorização */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Itens obrigatórios</p>
            {PRE_AUTH_ITEMS.map(item => (
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

          {/* Descrição antes da autorização prévia */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Descrição antes da autorização (opcional)</p>
            <Textarea
              value={preAuthDescription}
              onChange={e => setPreAuthDescription(e.target.value)}
              placeholder="Descreva o que encontrou ao chegar, o problema identificado, avaliação inicial..."
              className="rounded-2xl min-h-[80px]"
            />
          </div>

          {/* Descrição do serviço a ser realizado - pelo prestador */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Descrição do serviço a ser realizado *</p>
            <Textarea
              value={serviceDescription}
              onChange={e => setServiceDescription(e.target.value)}
              placeholder="Descreva detalhadamente o que será executado, materiais a utilizar, peças a trocar..."
              className="rounded-2xl min-h-[100px]"
            />
            {serviceDescription.trim().length < 6 && serviceDescription.length > 0 && (
              <p className="text-xs text-orange-500">Descreva com mais detalhes o que será realizado</p>
            )}
          </div>

          {/* Assinatura de autorização prévia */}
          <div className="space-y-3 bg-blue-50 rounded-2xl p-4 border border-blue-200">
            <p className="text-sm font-bold text-blue-900">✍️ Autorização prévia do cliente</p>
            <p className="text-xs text-blue-700">O cliente deve assinar antes do início do serviço, autorizando a execução dos trabalhos.</p>
            <div className="bg-white rounded-xl p-3 border border-blue-300">
              <p className="text-xs text-blue-900 font-semibold mb-1">📋 Consentimento:</p>
              <p className="text-xs text-blue-800 leading-relaxed">Ao assinar, concordo com a coleta da minha foto para fins de registro e validação de presença neste atendimento.</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-blue-800 flex items-center gap-1 mb-1">
                <CreditCard className="w-3.5 h-3.5" /> CPF do cliente (opcional)
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={14}
                placeholder="000.000.000-00"
                value={preAuthCpf}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, '');
                  const fmt = v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
                               .replace(/(\d{3})(\d{3})(\d{3})/, '$1.$2.$3')
                               .replace(/(\d{3})(\d{3})/, '$1.$2')
                               .replace(/(\d{3})/, '$1');
                  setPreAuthCpf(fmt);
                }}
                className="w-full rounded-xl border border-blue-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <SignaturePad label="Assinatura do cliente (antes do serviço)" onSave={(data) => {
              if (!data) { setPreAuthSignature(null); setPreAuthSignerPhoto(null); return; }
              setPreAuthSignature(data.signature);
              setPreAuthSignerPhoto(data.signer_photo || null);
            }} />
          </div>

          {/* Confirmações de autorização */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Confirmações de autorização</p>
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
          </div>

          {/* Itens pós-autorização */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Execução do serviço</p>
            {POST_AUTH_ITEMS.map(item => (
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

          {/* Descrição após execução do serviço */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Descrição do serviço realizado (opcional)</p>
            <Textarea
              value={postAuthDescription}
              onChange={e => setPostAuthDescription(e.target.value)}
              placeholder="Descreva o que foi realizado, como ficou o resultado, validação com cliente..."
              className="rounded-2xl min-h-[80px]"
            />
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

          {/* Vídeos */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Vídeos do serviço (opcional)</p>
            <div className="flex flex-wrap gap-2">
              {videos.map((url, idx) => (
                <div key={idx} className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-border bg-black">
                  <video src={url} className="w-full h-full object-cover opacity-80" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Play className="w-7 h-7 text-white drop-shadow" />
                  </div>
                  <button
                    onClick={() => removeVideo(idx)}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center"
                  >
                    <X className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              ))}
              {videos.length < 3 && (
                <label className={cn(
                  "w-24 h-24 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors",
                  uploadingVideo && "opacity-50 pointer-events-none"
                )}>
                  {uploadingVideo
                    ? <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                    : <><Video className="w-6 h-6 text-muted-foreground" /><span className="text-xs text-muted-foreground mt-1">Vídeo</span></>}
                  <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} capture="environment" />
                </label>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Grave ou escolha vídeos do serviço (máx. 3, direto da câmera)</p>
          </div>

          {/* Assinatura final do cliente */}
          <div className="space-y-3 bg-green-50 rounded-2xl p-4 border border-green-200">
            <p className="text-sm font-bold text-green-900">✅ Assinatura final do cliente</p>
            <p className="text-xs text-green-700">O cliente deve assinar confirmando que o serviço foi concluído de forma satisfatória.</p>
            <div className="bg-white rounded-xl p-3 border border-green-300">
              <p className="text-xs text-green-900 font-semibold mb-1">📋 Consentimento:</p>
              <p className="text-xs text-green-800 leading-relaxed">Ao assinar, concordo com a coleta da minha foto para fins de registro e validação de presença neste atendimento.</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-green-800 flex items-center gap-1 mb-1">
                <CreditCard className="w-3.5 h-3.5" /> CPF do cliente (opcional)
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={14}
                placeholder="000.000.000-00"
                value={finalCpf}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, '');
                  const fmt = v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
                               .replace(/(\d{3})(\d{3})(\d{3})/, '$1.$2.$3')
                               .replace(/(\d{3})(\d{3})/, '$1.$2')
                               .replace(/(\d{3})/, '$1');
                  setFinalCpf(fmt);
                }}
                className="w-full rounded-xl border border-green-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
            <SignaturePad label="Assinatura do cliente (conclusão do serviço)" onSave={(data) => {
              if (!data) { setFinalSignature(null); setFinalSignerPhoto(null); return; }
              setFinalSignature(data.signature);
              setFinalSignerPhoto(data.signer_photo || null);
            }} />
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
          {!canSave && (
            <p className="text-xs text-orange-600 text-center mb-2">
              {!allChecked ? "Marque todos os itens obrigatórios" :
               !allAuthorizationsChecked ? "Confirme todos os itens de autorização" :
               !preAuthSignature ? "Obtenha a assinatura prévia do cliente" :
               !serviceDescription.trim() || serviceDescription.trim().length < 6 ? "Descreva o serviço realizado" :
               !finalSignature ? "Obtenha a assinatura final do cliente" : ""}
            </p>
          )}
          <Button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="w-full h-12 rounded-2xl font-bold bg-primary text-primary-foreground"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-2" /> Salvar checklist</>}
          </Button>
        </div>
      </div>
    </div>
  );
}