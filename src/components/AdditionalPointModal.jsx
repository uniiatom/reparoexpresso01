import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { X, MapPin, Camera, Plus, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function AdditionalPointModal({ job, onClose }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [extraCost, setExtraCost] = useState('');
  const [photos, setPhotos] = useState([]);
  const [location, setLocation] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const removePhoto = (idx) => setPhotos(prev => prev.filter((_, i) => i !== idx));

  const getLocation = () => {
    if (!navigator.geolocation) return;
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setGettingLocation(false);
      },
      () => setGettingLocation(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);

    const newPoint = {
      title: title.trim(),
      description: description.trim(),
      extra_cost: extraCost ? Number(extraCost) : null,
      photos,
      location,
      created_at: new Date().toISOString(),
    };

    const existing = job.additional_points || [];
    await base44.entities.ServiceRequest.update(job.id, {
      additional_points: [...existing, newPoint],
    });

    setSaving(false);
    toast.success("Ponto adicional registrado!");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-background w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card flex-shrink-0">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground text-lg">Ponto Adicional</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-accent">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Registre um problema ou serviço extra identificado durante o atendimento.
          </p>

          {/* Título */}
          <div className="space-y-1.5">
            <Label>Descrição do ponto adicional *</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Fiação danificada encontrada no forro"
              className="rounded-2xl"
            />
          </div>

          {/* Detalhes */}
          <div className="space-y-1.5">
            <Label>Detalhes (opcional)</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descreva com mais detalhes o que foi encontrado..."
              className="rounded-2xl min-h-[80px]"
            />
          </div>

          {/* Custo extra */}
          <div className="space-y-1.5">
            <Label>Custo adicional estimado (R$)</Label>
            <Input
              type="number"
              value={extraCost}
              onChange={e => setExtraCost(e.target.value)}
              placeholder="0,00"
              className="rounded-2xl"
              min={0}
            />
          </div>

          {/* Geolocalização */}
          <div className="space-y-1.5">
            <Label>Localização</Label>
            <button
              onClick={getLocation}
              disabled={gettingLocation}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all ${
                location ? 'border-green-500 bg-green-50' : 'border-dashed border-border hover:border-primary/50'
              }`}
            >
              {gettingLocation
                ? <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
                : <MapPin className={`w-4 h-4 flex-shrink-0 ${location ? 'text-green-600' : 'text-muted-foreground'}`} />}
              <span className={`text-sm font-medium ${location ? 'text-green-700' : 'text-foreground'}`}>
                {gettingLocation ? 'Obtendo...' : location
                  ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)} ✓`
                  : 'Registrar localização atual'}
              </span>
            </button>
          </div>

          {/* Fotos */}
          <div className="space-y-1.5">
            <Label>Fotos (opcional)</Label>
            <div className="flex flex-wrap gap-2">
              {photos.map((url, idx) => (
                <div key={idx} className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-border">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removePhoto(idx)}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              {photos.length < 5 && (
                <label className={`w-20 h-20 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors ${uploadingPhoto ? 'opacity-50 pointer-events-none' : ''}`}>
                  {uploadingPhoto
                    ? <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                    : <><Camera className="w-5 h-5 text-muted-foreground" /><span className="text-xs text-muted-foreground mt-1">Foto</span></>}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} capture="environment" />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border bg-card flex-shrink-0">
          <Button
            onClick={handleSave}
            disabled={!title.trim() || saving}
            className="w-full h-12 rounded-2xl font-bold bg-primary text-primary-foreground"
          >
            {saving
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : <><CheckCircle2 className="w-4 h-4 mr-2" /> Salvar ponto adicional</>}
          </Button>
        </div>
      </div>
    </div>
  );
}