import { base44 } from '@/api/base44Client';

/**
 * Registra uma ação administrativa no log de atividades.
 * @param {object} params
 * @param {string} params.action - Chave da ação (ex: 'provider_approved')
 * @param {string} params.actorName - Nome de quem agiu
 * @param {string} [params.actorEmail] - Email/login de quem agiu
 * @param {string} params.entityType - Tipo da entidade (Provider, Ticket, etc.)
 * @param {string} [params.entityId] - ID da entidade
 * @param {string} [params.entityLabel] - Descrição legível
 * @param {string} [params.oldValue] - Valor anterior
 * @param {string} [params.newValue] - Novo valor
 * @param {string} [params.details] - Detalhes extras
 */
export async function logAdminAction({
  action,
  actorName,
  actorEmail = '',
  entityType,
  entityId = '',
  entityLabel = '',
  oldValue = '',
  newValue = '',
  details = '',
}) {
  try {
    await base44.entities.AdminActivityLog.create({
      action,
      actor_name: actorName,
      actor_email: actorEmail,
      entity_type: entityType,
      entity_id: entityId,
      entity_label: entityLabel,
      old_value: oldValue,
      new_value: newValue,
      details,
    });
  } catch (e) {
    // Não bloqueia o fluxo principal se o log falhar
    console.warn('[adminLog] Falha ao registrar log:', e);
  }
}