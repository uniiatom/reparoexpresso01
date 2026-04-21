import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, X, ThumbsUp } from 'lucide-react';
import { toast } from 'sonner';

export default function SatisfactionSurveyModal({ job, respondentType, respondentId, respondentName, onClose }) {
  const [qualityRating, setQualityRating] = useState(0);
  const [punctualityRating, setPunctualityRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);
  const [comment, setComment] = useState('');
  const [recommended, setRecommended] = useState(null);
  const [loading, setLoading] = useState(false);

  const isComplete = qualityRating > 0 && serviceRating > 0 && recommended !== null;

  const handleSubmit = async () => {
    if (!isComplete) return;
    setLoading(true);
    try {
      await base44.entities.SatisfactionSurvey.create({
        service_request_id: job.id,
        respondent_type: respondentType,
        respondent_id: respondentId,
        respondent_name: respondentName,
        quality_rating: qualityRating,
        punctuality_rating: punctualityRating,
        service_rating: serviceRating,
        comment: comment || null,
        recommended: recommended,
      });
      toast.success('Obrigado pela avaliação!');
      onClose();
    } catch (err) {
      toast.error('Erro ao enviar pesquisa: ' + (err?.message || 'tente novamente'));
    }
    setLoading(false);
  };

  const StarRating = ({ label, value, onChange }) => (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onClick={() => onChange(star)}
            className="transition-all"
          >
            <Star
              className={`w-8 h-8 ${
                star <= value
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-muted-foreground hover:text-yellow-300'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-card rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md p-6 border border-border shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">Como foi sua experiência?</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-5">Sua opinião é importante para melhorar nossos serviços</p>

        <div className="space-y-5">
          {/* Qualidade */}
          <StarRating
            label="Qualidade do trabalho"
            value={qualityRating}
            onChange={setQualityRating}
          />

          {/* Pontualidade */}
          <StarRating
            label="Pontualidade"
            value={punctualityRating}
            onChange={setPunctualityRating}
          />

          {/* Avaliação geral */}
          <StarRating
            label="Avaliação geral"
            value={serviceRating}
            onChange={setServiceRating}
          />

          {/* Comentário */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Deixe um comentário (opcional)</label>
            <Textarea
              placeholder="Conte-nos mais sobre sua experiência..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="text-sm rounded-xl resize-none h-24"
            />
          </div>

          {/* Recomendaria? */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Recomendaria este serviço?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setRecommended(true)}
                className={`flex-1 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                  recommended === true
                    ? 'bg-green-100 text-green-700 border-2 border-green-500'
                    : 'bg-muted text-muted-foreground border-2 border-transparent hover:bg-muted/80'
                }`}
              >
                <ThumbsUp className="w-4 h-4" /> Sim
              </button>
              <button
                onClick={() => setRecommended(false)}
                className={`flex-1 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                  recommended === false
                    ? 'bg-red-100 text-red-700 border-2 border-red-500'
                    : 'bg-muted text-muted-foreground border-2 border-transparent hover:bg-muted/80'
                }`}
              >
                Não
              </button>
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Pular
            </Button>
            <Button
              className="flex-1 bg-primary text-primary-foreground font-semibold"
              onClick={handleSubmit}
              disabled={!isComplete || loading}
            >
              {loading ? 'Enviando...' : 'Enviar'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}