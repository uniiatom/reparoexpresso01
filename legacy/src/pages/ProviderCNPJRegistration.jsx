import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Upload, Check, AlertCircle, Loader2, FileText } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";

const REQUIRED_DOCS = [
  { id: 'cnpj_file', label: 'Comprovante CNPJ', description: 'Recibo de entrega de inscrição (RCI) ou Print do portal da Receita' },
  { id: 'address_proof', label: 'Comprovante de Endereço', description: 'Conta de água, luz, gás ou contrato de aluguel' },
  { id: 'legal_rep_id', label: 'ID do Representante Legal', description: 'RG ou CNH do responsável pela empresa' },
];

export default function ProviderCNPJRegistration() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [cnpj, setCnpj] = useState('');
  const [validating, setValidating] = useState(false);
  const [companyData, setCompanyData] = useState(null);
  const [uploadedDocs, setUploadedDocs] = useState({});
  const [uploading, setUploading] = useState({});
  const [saving, setSaving] = useState(false);

  const formatCNPJ = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 5) return `${cleaned.slice(0, 2)}.${cleaned.slice(2)}`;
    if (cleaned.length <= 8) return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5)}`;
    if (cleaned.length <= 12) return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8)}`;
    return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12, 14)}`;
  };

  const handleCNPJChange = (e) => {
    setCnpj(formatCNPJ(e.target.value));
  };

  const validateCNPJ = async () => {
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    if (cleanCNPJ.length !== 14) {
      toast.error('CNPJ deve ter 14 dígitos');
      return;
    }

    try {
      setValidating(true);
      const response = await base44.functions.invoke('validateCNPJ', {
        cnpj: cleanCNPJ,
      });

      if (response.data?.valid) {
        setCompanyData(response.data.company_data);
        setStep(2);
        toast.success('CNPJ validado com sucesso!');
      } else {
        toast.error('CNPJ não encontrado ou inválido');
      }
    } catch (error) {
      console.error('Erro ao validar CNPJ:', error);
      toast.error('Erro ao validar CNPJ. Tente novamente.');
    } finally {
      setValidating(false);
    }
  };

  const handleDocUpload = async (docId, file) => {
    if (!file) return;

    try {
      setUploading(prev => ({ ...prev, [docId]: true }));
      
      const response = await base44.integrations.Core.UploadFile({ file });
      
      setUploadedDocs(prev => ({
        ...prev,
        [docId]: response.file_url
      }));
      
      toast.success('Documento enviado com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao enviar documento');
    } finally {
      setUploading(prev => ({ ...prev, [docId]: false }));
    }
  };

  const canSave = REQUIRED_DOCS.every(doc => uploadedDocs[doc.id]);

  const handleSave = async () => {
    if (!canSave) {
      toast.error('Todos os documentos são obrigatórios');
      return;
    }

    try {
      setSaving(true);
      const cleanCNPJ = cnpj.replace(/\D/g, '');
      
      await base44.functions.invoke('saveProviderCNPJData', {
        cnpj: cleanCNPJ,
        company_data: companyData,
        documents: uploadedDocs,
      });

      toast.success('Dados fiscais salvos com sucesso!');
      setTimeout(() => navigate('/prestador'), 2000);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar dados');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-muted rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Cadastro Fiscal</h1>
            <p className="text-sm text-muted-foreground">Registre seu CNPJ para receber pelos serviços</p>
          </div>
        </div>

        {/* Step 1: CNPJ Validation */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</span>
                Verificar CNPJ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
                <p className="font-semibold mb-2">ℹ️ Por que preciso registrar meu CNPJ?</p>
                <ul className="space-y-1 text-xs list-disc list-inside">
                  <li>Para cumprir com obrigações legais e fiscais</li>
                  <li>Para receber corretamente pelos serviços prestados</li>
                  <li>Para emitir Notas Fiscais dos seus atendimentos</li>
                </ul>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">CNPJ da Empresa</label>
                <Input
                  placeholder="00.000.000/0000-00"
                  value={cnpj}
                  onChange={handleCNPJChange}
                  maxLength="18"
                  className="rounded-lg text-lg tracking-widest"
                />
                <p className="text-xs text-muted-foreground">O CNPJ será validado automaticamente na Receita Federal</p>
              </div>

              <Button
                onClick={validateCNPJ}
                disabled={validating || cnpj.replace(/\D/g, '').length !== 14}
                className="w-full rounded-lg bg-primary text-primary-foreground"
              >
                {validating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Validando...
                  </>
                ) : (
                  'Validar CNPJ'
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Company Data & Documents */}
        {step === 2 && companyData && (
          <div className="space-y-4">
            {/* Company Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-600" />
                  Dados da Empresa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Razão Social</p>
                    <p className="font-semibold text-foreground">{companyData.razao_social}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Nome Fantasia</p>
                    <p className="font-semibold text-foreground">{companyData.nome_fantasia || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">CNPJ</p>
                    <p className="font-semibold text-foreground">{companyData.cnpj}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Situação</p>
                    <p className="font-semibold text-green-600">{companyData.situacao}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Endereço</p>
                    <p className="font-semibold text-foreground text-sm">
                      {companyData.endereco}, {companyData.numero}, {companyData.cidade} - {companyData.uf}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Documents Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">2</span>
                  Enviar Documentos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">Envie os documentos necessários para validação:</p>
                
                {REQUIRED_DOCS.map(doc => (
                  <div key={doc.id} className="border border-border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-foreground">{doc.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">{doc.description}</p>
                      </div>
                      {uploadedDocs[doc.id] && (
                        <div className="flex items-center gap-2 text-green-600">
                          <Check className="w-5 h-5" />
                        </div>
                      )}
                    </div>

                    <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                      <Upload className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {uploading[doc.id] ? 'Enviando...' : uploadedDocs[doc.id] ? 'Substituir arquivo' : 'Clique ou arraste'}
                      </span>
                      <input
                        type="file"
                        onChange={(e) => handleDocUpload(doc.id, e.target.files?.[0])}
                        disabled={uploading[doc.id]}
                        className="hidden"
                        accept="image/*,.pdf"
                      />
                    </label>
                  </div>
                ))}

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
                  <p className="font-semibold mb-2">⚠️ Documentos válidos</p>
                  <ul className="space-y-1 text-xs list-disc list-inside">
                    <li>Formatos aceitos: JPG, PNG, PDF</li>
                    <li>Tamanho máximo: 5MB por arquivo</li>
                    <li>Documentos devem estar legíveis e em dia</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={() => setStep(1)}
                variant="outline"
                className="flex-1 rounded-lg"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
              </Button>
              <Button
                onClick={handleSave}
                disabled={!canSave || saving}
                className="flex-1 rounded-lg bg-green-600 text-white hover:bg-green-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" /> Concluir Cadastro
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}