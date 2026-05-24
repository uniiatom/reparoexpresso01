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

1. Configurar secrets no Supabase — ver [edge-functions-secrets.md](./edge-functions-secrets.md).
2. Deploy: `supabase functions deploy --project-ref sedvqswypuhpiglnilxk` (ou MCP).
3. Migrar Sprint P5+ (lembretes, recorrência, gamificação restante).

## Funções já migradas para `supabase/functions/`

| Função | Sprint |
|--------|--------|
| `validateCoupon`, `generateServicePasswords`, `getGoogleMapsKey` | Base |
| `createCheckoutSession`, `stripeWebhook`, `generatePixQrCode`, `incrementCouponUsage` | P0 |
| `assignServiceToProvider`, `completeServiceRequest`, `approveServiceEstimate`, `onServiceCreated` | P1 |
| `sendExtraChargesRequest`, `approveExtraCharges`, `rejectExtraCharges`, `notifyExtraChargesApproval`, `notifyExtraChargesRejected`, `updateCheckoutWithExtraCharges`, `recordPriceHistory`, `getApplicableSurcharges` | P2 |
| `processWalletWithdrawal`, `creditBonusToWallet`, `processCashbackRedemption`, `processCouponBonus`, `acceptClientTerms`, `acceptProviderTerms`, `notifyTermsUpdate`, `notifyClientTermsUpdate`, `createTipCheckoutSession`, `validateCNPJ`, `saveProviderCNPJData`, `notificarOutrosServico`, `processProviderRepayment`, `processServiceRefusal` | P3 |
| `autoClosingReview`, `generateBiweeklyClosings`, `sendClosingAlert`, `grantEliteReviewerBadge`, `recordTechVisitResult`, `generateServiceReport`, `sendProviderLevelIncentive`, `optimizeRouteV2`, `optimizeServiceRoute` | P4 |
| `sendPushNotification`, `rankProvidersForService`, `updateProviderJobCount`, `validateServiceCompletion`, `sendServiceReminders24h`, `processRecurringServices`, `checkExpiringServices`, `processBusyAlerts`, `calculateProviderLevel`, `recalcAllProviderLevels`, `updateBiweeklyClosings`, `processServiceReserveFund`, `sendEstimateApprovalNotification`, `creditAllPendingBonuses` | P5 |
