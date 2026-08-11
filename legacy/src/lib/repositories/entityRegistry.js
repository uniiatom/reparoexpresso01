import { createProviderEntityAdapters } from '@/lib/repositories/providersRepository';
import { createSupabaseEntityAdapter } from '@/lib/repositories/supabaseEntityAdapter';

/** Entidades migradas para Supabase (nome Base44 → tabela Postgres). */
const ENTITY_TABLES = {
  ServiceRequest: { table: 'service_requests', realtime: true },
  Client: { table: 'clients' },
  Ticket: { table: 'tickets', realtime: true },
  TicketMessage: { table: 'ticket_messages', realtime: true },
  ChatMessage: { table: 'chat_messages' },
  ServicePricing: { table: 'service_pricing' },
  ServicePart: { table: 'service_parts' },
  ServicePriceHistory: { table: 'service_price_history', realtime: true },
  Coupon: { table: 'coupons' },
  Wallet: { table: 'wallets' },
  WalletTransaction: { table: 'wallet_transactions' },
  WalletBonus: { table: 'wallet_bonuses' },
  Cashback: { table: 'cashbacks' },
  CashbackConfig: { table: 'cashback_configs' },
  Favorite: { table: 'favorites' },
  Referral: { table: 'referrals' },
  Review: { table: 'reviews' },
  ClientNotification: { table: 'client_notifications', realtime: true },
  ProviderNotification: { table: 'provider_notifications', realtime: true },
  BusyAlert: { table: 'busy_alerts', realtime: true },
  RecurringServiceSchedule: { table: 'recurring_service_schedules' },
  PreventiveServiceReminder: { table: 'preventive_service_reminders' },
  Invoice: { table: 'invoices' },
  BiweeklyClosing: { table: 'biweekly_closings' },
  ReserveFund: { table: 'reserve_funds' },
  ReserveFundTransaction: { table: 'reserve_fund_transactions' },
  SurchargeRule: { table: 'surcharge_rules' },
  SatisfactionSurvey: { table: 'satisfaction_surveys' },
  AdminActivityLog: { table: 'admin_activity_logs' },
  MonthlyGoal: { table: 'monthly_goals' },
  BonusRelease: { table: 'bonus_releases' },
  Achievement: { table: 'achievements' },
  ProviderAchievement: { table: 'provider_achievements' },
  ProviderLevelHistory: { table: 'provider_level_history' },
  CustomerLoyalty: { table: 'customer_loyalty' },
  LoyaltyTransaction: { table: 'loyalty_transactions' },
  Partner: { table: 'partners' },
  Professional: { table: 'professionals' },
  QuoteRequest: { table: 'quote_requests' },
  ServiceCategory: { table: 'service_categories' },
  OfferedService: { table: 'offered_services', defaultSort: 'sort_order' },
  OfferedServiceGroup: { table: 'offered_service_groups', defaultSort: 'sort_order' },
  OfferedServiceFieldTemplate: { table: 'offered_service_field_templates', defaultSort: 'sort_order' },
  MediaLibrary: { table: 'media_library', defaultSort: '-created_at' },
};

/**
 * Retorna adaptadores base44.entities.* para todas as entidades no Supabase.
 */
export function createAllEntityAdapters() {
  const adapters = {};

  for (const [entityName, config] of Object.entries(ENTITY_TABLES)) {
    adapters[entityName] = createSupabaseEntityAdapter(config.table, {
      realtime: config.realtime ?? false,
      defaultSort: config.defaultSort,
    });
  }

  Object.assign(adapters, createProviderEntityAdapters());

  return adapters;
}
