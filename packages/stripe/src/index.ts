import type Stripe from 'stripe';

/**
 * Maps Stripe event type strings to their corresponding event types.
 * This is auto-generated from Stripe's SDK types.
 */
export type StripeEventMap = {
  'account.application.authorized': Stripe.AccountApplicationAuthorizedEvent;
  'account.application.deauthorized': Stripe.AccountApplicationDeauthorizedEvent;
  'account.external_account.created': Stripe.AccountExternalAccountCreatedEvent;
  'account.external_account.deleted': Stripe.AccountExternalAccountDeletedEvent;
  'account.external_account.updated': Stripe.AccountExternalAccountUpdatedEvent;
  'account.updated': Stripe.AccountUpdatedEvent;
  'application_fee.created': Stripe.ApplicationFeeCreatedEvent;
  'application_fee.refund.updated': Stripe.ApplicationFeeRefundUpdatedEvent;
  'application_fee.refunded': Stripe.ApplicationFeeRefundedEvent;
  'balance.available': Stripe.BalanceAvailableEvent;
  'billing_portal.configuration.created': Stripe.BillingPortalConfigurationCreatedEvent;
  'billing_portal.configuration.updated': Stripe.BillingPortalConfigurationUpdatedEvent;
  'billing_portal.session.created': Stripe.BillingPortalSessionCreatedEvent;
  'capability.updated': Stripe.CapabilityUpdatedEvent;
  'cash_balance.funds_available': Stripe.CashBalanceFundsAvailableEvent;
  'charge.captured': Stripe.ChargeCapturedEvent;
  'charge.dispute.closed': Stripe.ChargeDisputeClosedEvent;
  'charge.dispute.created': Stripe.ChargeDisputeCreatedEvent;
  'charge.dispute.funds_reinstated': Stripe.ChargeDisputeFundsReinstatedEvent;
  'charge.dispute.funds_withdrawn': Stripe.ChargeDisputeFundsWithdrawnEvent;
  'charge.dispute.updated': Stripe.ChargeDisputeUpdatedEvent;
  'charge.expired': Stripe.ChargeExpiredEvent;
  'charge.failed': Stripe.ChargeFailedEvent;
  'charge.pending': Stripe.ChargePendingEvent;
  'charge.refund.updated': Stripe.ChargeRefundUpdatedEvent;
  'charge.refunded': Stripe.ChargeRefundedEvent;
  'charge.succeeded': Stripe.ChargeSucceededEvent;
  'charge.updated': Stripe.ChargeUpdatedEvent;
  'checkout.session.async_payment_failed': Stripe.CheckoutSessionAsyncPaymentFailedEvent;
  'checkout.session.async_payment_succeeded': Stripe.CheckoutSessionAsyncPaymentSucceededEvent;
  'checkout.session.completed': Stripe.CheckoutSessionCompletedEvent;
  'checkout.session.expired': Stripe.CheckoutSessionExpiredEvent;
  'coupon.created': Stripe.CouponCreatedEvent;
  'coupon.deleted': Stripe.CouponDeletedEvent;
  'coupon.updated': Stripe.CouponUpdatedEvent;
  'credit_note.created': Stripe.CreditNoteCreatedEvent;
  'credit_note.updated': Stripe.CreditNoteUpdatedEvent;
  'credit_note.voided': Stripe.CreditNoteVoidedEvent;
  'customer.created': Stripe.CustomerCreatedEvent;
  'customer.deleted': Stripe.CustomerDeletedEvent;
  'customer.discount.created': Stripe.CustomerDiscountCreatedEvent;
  'customer.discount.deleted': Stripe.CustomerDiscountDeletedEvent;
  'customer.discount.updated': Stripe.CustomerDiscountUpdatedEvent;
  'customer.source.created': Stripe.CustomerSourceCreatedEvent;
  'customer.source.deleted': Stripe.CustomerSourceDeletedEvent;
  'customer.source.expiring': Stripe.CustomerSourceExpiringEvent;
  'customer.source.updated': Stripe.CustomerSourceUpdatedEvent;
  'customer.subscription.created': Stripe.CustomerSubscriptionCreatedEvent;
  'customer.subscription.deleted': Stripe.CustomerSubscriptionDeletedEvent;
  'customer.subscription.paused': Stripe.CustomerSubscriptionPausedEvent;
  'customer.subscription.pending_update_applied': Stripe.CustomerSubscriptionPendingUpdateAppliedEvent;
  'customer.subscription.pending_update_expired': Stripe.CustomerSubscriptionPendingUpdateExpiredEvent;
  'customer.subscription.resumed': Stripe.CustomerSubscriptionResumedEvent;
  'customer.subscription.trial_will_end': Stripe.CustomerSubscriptionTrialWillEndEvent;
  'customer.subscription.updated': Stripe.CustomerSubscriptionUpdatedEvent;
  'customer.tax_id.created': Stripe.CustomerTaxIdCreatedEvent;
  'customer.tax_id.deleted': Stripe.CustomerTaxIdDeletedEvent;
  'customer.tax_id.updated': Stripe.CustomerTaxIdUpdatedEvent;
  'customer.updated': Stripe.CustomerUpdatedEvent;
  'customer_cash_balance_transaction.created': Stripe.CustomerCashBalanceTransactionCreatedEvent;
  'file.created': Stripe.FileCreatedEvent;
  'identity.verification_session.canceled': Stripe.IdentityVerificationSessionCanceledEvent;
  'identity.verification_session.created': Stripe.IdentityVerificationSessionCreatedEvent;
  'identity.verification_session.processing': Stripe.IdentityVerificationSessionProcessingEvent;
  'identity.verification_session.redacted': Stripe.IdentityVerificationSessionRedactedEvent;
  'identity.verification_session.requires_input': Stripe.IdentityVerificationSessionRequiresInputEvent;
  'identity.verification_session.verified': Stripe.IdentityVerificationSessionVerifiedEvent;
  'invoice.created': Stripe.InvoiceCreatedEvent;
  'invoice.deleted': Stripe.InvoiceDeletedEvent;
  'invoice.finalization_failed': Stripe.InvoiceFinalizationFailedEvent;
  'invoice.finalized': Stripe.InvoiceFinalizedEvent;
  'invoice.marked_uncollectible': Stripe.InvoiceMarkedUncollectibleEvent;
  'invoice.paid': Stripe.InvoicePaidEvent;
  'invoice.payment_action_required': Stripe.InvoicePaymentActionRequiredEvent;
  'invoice.payment_failed': Stripe.InvoicePaymentFailedEvent;
  'invoice.payment_succeeded': Stripe.InvoicePaymentSucceededEvent;
  'invoice.sent': Stripe.InvoiceSentEvent;
  'invoice.upcoming': Stripe.InvoiceUpcomingEvent;
  'invoice.updated': Stripe.InvoiceUpdatedEvent;
  'invoice.voided': Stripe.InvoiceVoidedEvent;
  'invoiceitem.created': Stripe.InvoiceitemCreatedEvent;
  'invoiceitem.deleted': Stripe.InvoiceitemDeletedEvent;
  'invoiceitem.updated': Stripe.InvoiceitemUpdatedEvent;
  'issuing_authorization.created': Stripe.IssuingAuthorizationCreatedEvent;
  'issuing_authorization.request': Stripe.IssuingAuthorizationRequestEvent;
  'issuing_authorization.updated': Stripe.IssuingAuthorizationUpdatedEvent;
  'issuing_card.created': Stripe.IssuingCardCreatedEvent;
  'issuing_card.updated': Stripe.IssuingCardUpdatedEvent;
  'issuing_cardholder.created': Stripe.IssuingCardholderCreatedEvent;
  'issuing_cardholder.updated': Stripe.IssuingCardholderUpdatedEvent;
  'issuing_dispute.closed': Stripe.IssuingDisputeClosedEvent;
  'issuing_dispute.created': Stripe.IssuingDisputeCreatedEvent;
  'issuing_dispute.funds_reinstated': Stripe.IssuingDisputeFundsReinstatedEvent;
  'issuing_dispute.submitted': Stripe.IssuingDisputeSubmittedEvent;
  'issuing_dispute.updated': Stripe.IssuingDisputeUpdatedEvent;
  'issuing_token.created': Stripe.IssuingTokenCreatedEvent;
  'issuing_token.updated': Stripe.IssuingTokenUpdatedEvent;
  'issuing_transaction.created': Stripe.IssuingTransactionCreatedEvent;
  'issuing_transaction.updated': Stripe.IssuingTransactionUpdatedEvent;
  'mandate.updated': Stripe.MandateUpdatedEvent;
  'payment_intent.amount_capturable_updated': Stripe.PaymentIntentAmountCapturableUpdatedEvent;
  'payment_intent.canceled': Stripe.PaymentIntentCanceledEvent;
  'payment_intent.created': Stripe.PaymentIntentCreatedEvent;
  'payment_intent.partially_funded': Stripe.PaymentIntentPartiallyFundedEvent;
  'payment_intent.payment_failed': Stripe.PaymentIntentPaymentFailedEvent;
  'payment_intent.processing': Stripe.PaymentIntentProcessingEvent;
  'payment_intent.requires_action': Stripe.PaymentIntentRequiresActionEvent;
  'payment_intent.succeeded': Stripe.PaymentIntentSucceededEvent;
  'payment_link.created': Stripe.PaymentLinkCreatedEvent;
  'payment_link.updated': Stripe.PaymentLinkUpdatedEvent;
  'payment_method.attached': Stripe.PaymentMethodAttachedEvent;
  'payment_method.automatically_updated': Stripe.PaymentMethodAutomaticallyUpdatedEvent;
  'payment_method.detached': Stripe.PaymentMethodDetachedEvent;
  'payment_method.updated': Stripe.PaymentMethodUpdatedEvent;
  'payout.canceled': Stripe.PayoutCanceledEvent;
  'payout.created': Stripe.PayoutCreatedEvent;
  'payout.failed': Stripe.PayoutFailedEvent;
  'payout.paid': Stripe.PayoutPaidEvent;
  'payout.reconciliation_completed': Stripe.PayoutReconciliationCompletedEvent;
  'payout.updated': Stripe.PayoutUpdatedEvent;
  'person.created': Stripe.PersonCreatedEvent;
  'person.deleted': Stripe.PersonDeletedEvent;
  'person.updated': Stripe.PersonUpdatedEvent;
  'plan.created': Stripe.PlanCreatedEvent;
  'plan.deleted': Stripe.PlanDeletedEvent;
  'plan.updated': Stripe.PlanUpdatedEvent;
  'price.created': Stripe.PriceCreatedEvent;
  'price.deleted': Stripe.PriceDeletedEvent;
  'price.updated': Stripe.PriceUpdatedEvent;
  'product.created': Stripe.ProductCreatedEvent;
  'product.deleted': Stripe.ProductDeletedEvent;
  'product.updated': Stripe.ProductUpdatedEvent;
  'promotion_code.created': Stripe.PromotionCodeCreatedEvent;
  'promotion_code.updated': Stripe.PromotionCodeUpdatedEvent;
  'quote.accepted': Stripe.QuoteAcceptedEvent;
  'quote.canceled': Stripe.QuoteCanceledEvent;
  'quote.created': Stripe.QuoteCreatedEvent;
  'quote.finalized': Stripe.QuoteFinalizedEvent;
  'radar.early_fraud_warning.created': Stripe.RadarEarlyFraudWarningCreatedEvent;
  'radar.early_fraud_warning.updated': Stripe.RadarEarlyFraudWarningUpdatedEvent;
  'refund.created': Stripe.RefundCreatedEvent;
  'refund.updated': Stripe.RefundUpdatedEvent;
  'reporting.report_run.failed': Stripe.ReportingReportRunFailedEvent;
  'reporting.report_run.succeeded': Stripe.ReportingReportRunSucceededEvent;
  'reporting.report_type.updated': Stripe.ReportingReportTypeUpdatedEvent;
  'review.closed': Stripe.ReviewClosedEvent;
  'review.opened': Stripe.ReviewOpenedEvent;
  'setup_intent.canceled': Stripe.SetupIntentCanceledEvent;
  'setup_intent.created': Stripe.SetupIntentCreatedEvent;
  'setup_intent.requires_action': Stripe.SetupIntentRequiresActionEvent;
  'setup_intent.setup_failed': Stripe.SetupIntentSetupFailedEvent;
  'setup_intent.succeeded': Stripe.SetupIntentSucceededEvent;
  'sigma.scheduled_query_run.created': Stripe.SigmaScheduledQueryRunCreatedEvent;
  'source.canceled': Stripe.SourceCanceledEvent;
  'source.chargeable': Stripe.SourceChargeableEvent;
  'source.failed': Stripe.SourceFailedEvent;
  'source.mandate_notification': Stripe.SourceMandateNotificationEvent;
  'source.refund_attributes_required': Stripe.SourceRefundAttributesRequiredEvent;
  'source.transaction.created': Stripe.SourceTransactionCreatedEvent;
  'source.transaction.updated': Stripe.SourceTransactionUpdatedEvent;
  'subscription_schedule.aborted': Stripe.SubscriptionScheduleAbortedEvent;
  'subscription_schedule.canceled': Stripe.SubscriptionScheduleCanceledEvent;
  'subscription_schedule.completed': Stripe.SubscriptionScheduleCompletedEvent;
  'subscription_schedule.created': Stripe.SubscriptionScheduleCreatedEvent;
  'subscription_schedule.expiring': Stripe.SubscriptionScheduleExpiringEvent;
  'subscription_schedule.released': Stripe.SubscriptionScheduleReleasedEvent;
  'subscription_schedule.updated': Stripe.SubscriptionScheduleUpdatedEvent;
  'tax.settings.updated': Stripe.TaxSettingsUpdatedEvent;
  'tax_rate.created': Stripe.TaxRateCreatedEvent;
  'tax_rate.updated': Stripe.TaxRateUpdatedEvent;
  'terminal.reader.action_failed': Stripe.TerminalReaderActionFailedEvent;
  'terminal.reader.action_succeeded': Stripe.TerminalReaderActionSucceededEvent;
  'test_helpers.test_clock.advancing': Stripe.TestHelpersTestClockAdvancingEvent;
  'test_helpers.test_clock.created': Stripe.TestHelpersTestClockCreatedEvent;
  'test_helpers.test_clock.deleted': Stripe.TestHelpersTestClockDeletedEvent;
  'test_helpers.test_clock.internal_failure': Stripe.TestHelpersTestClockInternalFailureEvent;
  'test_helpers.test_clock.ready': Stripe.TestHelpersTestClockReadyEvent;
  'topup.canceled': Stripe.TopupCanceledEvent;
  'topup.created': Stripe.TopupCreatedEvent;
  'topup.failed': Stripe.TopupFailedEvent;
  'topup.reversed': Stripe.TopupReversedEvent;
  'topup.succeeded': Stripe.TopupSucceededEvent;
  'transfer.created': Stripe.TransferCreatedEvent;
  'transfer.reversed': Stripe.TransferReversedEvent;
  'transfer.updated': Stripe.TransferUpdatedEvent;
};

/**
 * All valid Stripe event type names
 */
export type StripeEventName = keyof StripeEventMap;

/**
 * Get the event type for a given event name
 */
export type StripeEventType<T extends StripeEventName> = StripeEventMap[T];

/**
 * Re-export Stripe.Event for convenience
 */
export type { Stripe };

// Re-export core types and classes
import { WebhookRouter, type WebhookEvent, type EventHandler } from '@and-subscribe/core';
export { WebhookRouter, type WebhookEvent, type EventHandler };

/**
 * Type-safe Stripe Webhook Router
 * Uses Stripe's event types for full type inference
 */
export class StripeWebhookRouter extends WebhookRouter<StripeEventMap> {}
