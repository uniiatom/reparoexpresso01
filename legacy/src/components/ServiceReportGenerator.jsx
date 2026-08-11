import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, FileText, Download, Eye, X } from "lucide-react";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function ServiceReportGenerator({ 
  requestId, 
  selectedParts = [], 
  laborCost = 0,
  onReportGenerated 
}) {
  const [observations, setObservations] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [reportHtml, setReportHtml] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleGenerateReport = async () => {
    if (!requestId) return;
    setGenerating(true);

    try {
      const response = await base44.functions.invoke('generateServiceReport', {
        request_id: requestId,
        selectedParts,
        laborCost,
        observations,
        additionalNotes
      });

      setReportHtml(response.data.html);
      if (onReportGenerated) {
        onReportGenerated({
          html: response.data.html,
          total: response.data.totalAmount
        });
      }
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      alert('Erro ao gerar relatório: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!reportHtml) return;

    try {
      // Cria um elemento temporário com o HTML
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'fixed';
      tempDiv.style.left = '-9999px';
      tempDiv.innerHTML = reportHtml;
      document.body.appendChild(tempDiv);

      // Converte para canvas
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      // Cria PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - 20; // Margem de 10mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let yPosition = 10;

      // Adiciona imagens ao PDF (se necessário dividir em múltiplas páginas)
      pdf.addImage(imgData, 'PNG', 10, yPosition, imgWidth, imgHeight);

      let totalHeight = imgHeight + 20;
      while (totalHeight > pdfHeight) {
        pdf.addPage();
        totalHeight -= pdfHeight;
      }

      // Download
      const date = new Date().toISOString().split('T')[0];
      pdf.save(`relatorio-servico-${requestId}-${date}.pdf`);

      // Limpa elemento temporário
      document.body.removeChild(tempDiv);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Formulário para observações */}
      {!reportHtml ? (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-foreground">Gerar Relatório de Serviço</h3>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">📝 Observações do Prestador</Label>
            <Textarea
              placeholder="Descreva o serviço realizado, problemas encontrados, recomendações para o cliente..."
              value={observations}
              onChange={e => setObservations(e.target.value)}
              className="min-h-[100px] rounded-2xl"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">📌 Notas Adicionais (Opcional)</Label>
            <Textarea
              placeholder="Informações adicionais, garantias, prazos, instruções de manutenção..."
              value={additionalNotes}
              onChange={e => setAdditionalNotes(e.target.value)}
              className="min-h-[80px] rounded-2xl"
            />
          </div>

          <Button
            onClick={handleGenerateReport}
            disabled={!observations.trim() || generating}
            className="w-full h-12 rounded-2xl font-bold bg-primary text-primary-foreground"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <FileText className="w-4 h-4 mr-2" />
            )}
            {generating ? 'Gerando relatório...' : 'Gerar Relatório PDF'}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-foreground">✅ Relatório Gerado</h3>

          <div className="flex gap-2">
            <Button
              onClick={() => setShowPreview(true)}
              variant="outline"
              className="flex-1 rounded-2xl h-11"
            >
              <Eye className="w-4 h-4 mr-2" />
              Visualizar
            </Button>
            <Button
              onClick={handleDownloadPDF}
              className="flex-1 rounded-2xl h-11 bg-primary text-primary-foreground"
            >
              <Download className="w-4 h-4 mr-2" />
              Baixar PDF
            </Button>
          </div>

          <Button
            onClick={() => {
              setReportHtml(null);
              setObservations('');
              setAdditionalNotes('');
            }}
            variant="outline"
            className="w-full rounded-2xl"
          >
            Gerar Novo Relatório
          </Button>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && reportHtml && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl overflow-auto">
            <div className="sticky top-0 bg-white border-b border-border p-4 flex items-center justify-between">
              <h3 className="font-bold text-foreground">Prévia do Relatório</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="p-1.5 hover:bg-muted rounded-lg transition-all"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div
              className="p-8"
              dangerouslySetInnerHTML={{ __html: reportHtml }}
            />
          </div>
        </div>
      )}
    </div>
  );
}