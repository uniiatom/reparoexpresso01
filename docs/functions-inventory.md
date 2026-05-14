# Inventário — Base44 Functions (transição para Supabase Edge)

Este arquivo agrupa as funções em [base44/functions](../base44/functions/) por **domínio**, para priorizar migração para **Supabase Edge Functions** (ver PRD + plano de migração).

## Pagamentos e Stripe

- `createCheckoutSession`, `stripeWebhook`, `updateCheckoutWithExtraCharges`
- `generatePixQrCode`, `processTipPayment`, `createTipCheckoutSession`
- `processWalletWithdrawal`, `creditBonusToWallet`, `processCashback`, `processCashbackRedemption`
- `validateCoupon`, `incrementCouponUsage`, `processCouponBonus`, `applyBonusToService`
- `approveExtraCharges`, `rejectExtraCharges`, `sendExtraChargesRequest`, `notifyExtraChargesApproval`, `notifyExtraChargesRejected`, `getApplicableSurcharges`, `updateCheckoutWithExtraCharges`

## Ordem de serviço (OS) e prestador

- `onServiceCreated`, `completeServiceRequest`, `assignServiceToProvider`, `rankProvidersForService`
- `processServiceRefusal`, `validateServiceCompletion`, `initializeServiceParts`
- `sendServiceReminders24h`, `sendPreventiveServiceReminders`, `scheduleReminders`
- `updateProviderJobCount`, `calculateProviderLevel`, `recalcAllProviderLevels`, `sendProviderLevelIncentive`
- `recordTechVisitResult`, `recordPressurizadorFeasibility`, `optimizeServiceRoute`, `optimizeRouteV2`

## Fidelidade e bônus

- `awardLoyaltyPoints`, `redeemLoyaltyPoints`, `processPendingBonuses`, `creditAllPendingBonuses`
- `initializeAchievements`, `grantEliteReviewerBadge`

## Notificações e termos

- `sendPushNotification`, `notifyTermsUpdate`, `notifyClientTermsUpdate`, `notifyWarrantyActivation`
- `acceptClientTerms`, `acceptProviderTerms`, `notificarOutrosServico`
- `sendEstimateApprovalNotification`, `sendClosingAlert`, `sendSatisfactionSurvey`

## Financeiro / fechamentos / NF

- `generateBiweeklyClosings`, `updateBiweeklyClosings`, `recordPriceHistory`, `generateServiceReport`
- `generateServicePasswords`, `autoClosingReview`, `processServiceReserveFund`, `processProviderRepayment`

## Agendamento e recorrência

- `createRecurringServiceRequest`, `processRecurringServices`, `checkExpiringServices`, `setWarrantyPeriod`

## Utilitários e integrações

- `getGoogleMapsKey`, `validateCNPJ`, `saveProviderCNPJData`
- `processBusyAlerts`, `approveServiceEstimate`

## Próximos passos sugeridos

1. Migrar primeiro **webhooks de pagamento** (`stripeWebhook`, PIX) para Edge + secrets no painel Supabase.
2. Registrar cada função migrada aqui com link para `supabase/functions/<nome>/`.
