/// Camada de dados e infraestrutura compartilhada pelos 3 apps do
/// Reparo Expresso (client, provider, admin). Ver `/MIGRATION.md` na raiz
/// do repositório para o roadmap completo da migração.
library;

export 'package:supabase_flutter/supabase_flutter.dart' show SupabaseClient, User, Session;

export 'src/config/supabase_env.dart';
export 'src/supabase/reparo_supabase.dart';

export 'src/auth/app_role.dart';
export 'src/auth/profile.dart';
export 'src/auth/session_user.dart';
export 'src/auth/auth_service.dart';
export 'src/auth/auth_controller.dart';

export 'src/theme/app_colors.dart';
export 'src/theme/app_theme.dart';

export 'src/models/service_request_status.dart';
export 'src/models/service_request.dart';
export 'src/models/provider.dart';
export 'src/models/offered_service.dart';
export 'src/models/catalog.dart';
export 'src/models/client.dart';
export 'src/models/wallet.dart';
export 'src/models/favorite.dart';
export 'src/models/customer_loyalty.dart';
export 'src/models/chat_message.dart';
export 'src/models/coupon_validation.dart';
export 'src/models/coupon.dart';
export 'src/models/ticket.dart';
export 'src/models/referral.dart';
export 'src/models/cashback.dart';
export 'src/models/service_pricing.dart';
export 'src/models/admin_activity_log.dart';
export 'src/models/client_notification.dart';
export 'src/models/preventive_service_reminder.dart';
export 'src/models/recurring_service_schedule.dart';
export 'src/models/invoice.dart';
export 'src/models/biweekly_closing.dart';
export 'src/models/reserve_fund.dart';
export 'src/models/provider_achievement.dart';
export 'src/models/provider_availability.dart';
export 'src/models/review.dart';
export 'src/models/wallet_bonus.dart';
export 'src/models/cashback_config.dart';
export 'src/models/reserve_fund_transaction.dart';
export 'src/models/achievement.dart';
export 'src/models/provider_level_history.dart';
export 'src/models/monthly_goal.dart';
export 'src/models/bonus_release.dart';
export 'src/models/busy_alert.dart';
export 'src/models/service_part.dart';
export 'src/models/surcharge_rule.dart';
export 'src/models/service_price_history_entry.dart';
export 'src/models/provider_unavailability.dart';
export 'src/models/service_status_transition.dart';
export 'src/models/service_request_form_field.dart';

export 'src/repositories/service_request_repository.dart';
export 'src/repositories/service_request_form_repository.dart';
export 'src/repositories/offered_service_repository.dart';
export 'src/repositories/catalog_repository.dart';
export 'src/repositories/client_repository.dart';
export 'src/repositories/provider_repository.dart';
export 'src/repositories/wallet_repository.dart';
export 'src/repositories/favorite_repository.dart';
export 'src/repositories/loyalty_repository.dart';
export 'src/repositories/chat_repository.dart';
export 'src/repositories/payment_repository.dart';
export 'src/repositories/storage_repository.dart';
export 'src/repositories/coupon_repository.dart';
export 'src/repositories/ticket_repository.dart';
export 'src/repositories/referral_repository.dart';
export 'src/repositories/cashback_repository.dart';
export 'src/repositories/service_pricing_repository.dart';
export 'src/repositories/admin_activity_log_repository.dart';
export 'src/repositories/client_notification_repository.dart';
export 'src/repositories/preventive_service_reminder_repository.dart';
export 'src/repositories/recurring_service_repository.dart';
export 'src/repositories/finance_repository.dart';
export 'src/repositories/provider_achievement_repository.dart';
export 'src/repositories/admin_user_repository.dart';
export 'src/repositories/provider_document_repository.dart';
export 'src/repositories/provider_availability_repository.dart';
export 'src/repositories/review_repository.dart';
export 'src/repositories/wallet_bonus_repository.dart';
export 'src/repositories/cashback_config_repository.dart';
export 'src/repositories/reserve_fund_transaction_repository.dart';
export 'src/repositories/achievement_repository.dart';
export 'src/repositories/provider_level_history_repository.dart';
export 'src/repositories/monthly_goal_repository.dart';
export 'src/repositories/busy_alert_repository.dart';
export 'src/repositories/service_part_repository.dart';
export 'src/repositories/surcharge_rule_repository.dart';
export 'src/repositories/service_price_history_repository.dart';
export 'src/repositories/provider_unavailability_repository.dart';
export 'src/repositories/service_status_transition_repository.dart';
