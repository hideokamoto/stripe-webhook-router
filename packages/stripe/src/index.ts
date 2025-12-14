import type Stripe from 'stripe';

/**
 * Maps Stripe event type strings to their corresponding event types.
 *
 * IMPORTANT: This map is MANUALLY MAINTAINED and must be updated when
 * new Stripe events are added. Run `pnpm run check-events` to detect
 * any missing or extra events compared to the installed Stripe SDK.
 *
 * @see MAINTAINING_STRIPE_EVENTMAP.md for maintenance instructions.
 */
export type StripeEventMap = {
  // Account events
  'account.application.authorized': Stripe.AccountApplicationAuthorizedEvent;
  'account.application.deauthorized': Stripe.AccountApplicationDeauthorizedEvent;
  'account.external_account.created': Stripe.AccountExternalAccountCreatedEvent;
  'account.external_account.deleted': Stripe.AccountExternalAccountDeletedEvent;
  'account.external_account.updated': Stripe.AccountExternalAccountUpdatedEvent;
  'account.updated': Stripe.AccountUpdatedEvent;

  // Application fee events
  'application_fee.created': Stripe.ApplicationFeeCreatedEvent;
  'application_fee.refund.updated': Stripe.ApplicationFeeRefundUpdatedEvent;
  'application_fee.refunded': Stripe.ApplicationFeeRefundedEvent;

  // Balance events
  'balance.available': Stripe.BalanceAvailableEvent;
  'balance_settings.updated': Stripe.BalanceSettingsUpdatedEvent;

  // Billing events
  'billing.alert.triggered': Stripe.BillingAlertTriggeredEvent;
  'billing.credit_balance_transaction.created': Stripe.BillingCreditBalanceTransactionCreatedEvent;
  'billing.credit_grant.created': Stripe.BillingCreditGrantCreatedEvent;
  'billing.credit_grant.updated': Stripe.BillingCreditGrantUpdatedEvent;
  'billing.meter.created': Stripe.BillingMeterCreatedEvent;
  'billing.meter.deactivated': Stripe.BillingMeterDeactivatedEvent;
  'billing.meter.reactivated': Stripe.BillingMeterReactivatedEvent;
  'billing.meter.updated': Stripe.BillingMeterUpdatedEvent;
  'billing_portal.configuration.created': Stripe.BillingPortalConfigurationCreatedEvent;
  'billing_portal.configuration.updated': Stripe.BillingPortalConfigurationUpdatedEvent;
  'billing_portal.session.created': Stripe.BillingPortalSessionCreatedEvent;

  // Capability events
  'capability.updated': Stripe.CapabilityUpdatedEvent;

  // Cash balance events
  'cash_balance.funds_available': Stripe.CashBalanceFundsAvailableEvent;

  // Charge events
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

  // Checkout events
  'checkout.session.async_payment_failed': Stripe.CheckoutSessionAsyncPaymentFailedEvent;
  'checkout.session.async_payment_succeeded': Stripe.CheckoutSessionAsyncPaymentSucceededEvent;
  'checkout.session.completed': Stripe.CheckoutSessionCompletedEvent;
  'checkout.session.expired': Stripe.CheckoutSessionExpiredEvent;

  // Climate events
  'climate.order.canceled': Stripe.ClimateOrderCanceledEvent;
  'climate.order.created': Stripe.ClimateOrderCreatedEvent;
  'climate.order.delayed': Stripe.ClimateOrderDelayedEvent;
  'climate.order.delivered': Stripe.ClimateOrderDeliveredEvent;
  'climate.order.product_substituted': Stripe.ClimateOrderProductSubstitutedEvent;
  'climate.product.created': Stripe.ClimateProductCreatedEvent;
  'climate.product.pricing_updated': Stripe.ClimateProductPricingUpdatedEvent;

  // Coupon events
  'coupon.created': Stripe.CouponCreatedEvent;
  'coupon.deleted': Stripe.CouponDeletedEvent;
  'coupon.updated': Stripe.CouponUpdatedEvent;

  // Credit note events
  'credit_note.created': Stripe.CreditNoteCreatedEvent;
  'credit_note.updated': Stripe.CreditNoteUpdatedEvent;
  'credit_note.voided': Stripe.CreditNoteVoidedEvent;

  // Customer events
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

  // Entitlements events
  'entitlements.active_entitlement_summary.updated': Stripe.EntitlementsActiveEntitlementSummaryUpdatedEvent;

  // File events
  'file.created': Stripe.FileCreatedEvent;

  // Financial Connections events
  'financial_connections.account.account_numbers_updated': Stripe.FinancialConnectionsAccountAccountNumbersUpdatedEvent;
  'financial_connections.account.created': Stripe.FinancialConnectionsAccountCreatedEvent;
  'financial_connections.account.deactivated': Stripe.FinancialConnectionsAccountDeactivatedEvent;
  'financial_connections.account.disconnected': Stripe.FinancialConnectionsAccountDisconnectedEvent;
  'financial_connections.account.reactivated': Stripe.FinancialConnectionsAccountReactivatedEvent;
  'financial_connections.account.refreshed_balance': Stripe.FinancialConnectionsAccountRefreshedBalanceEvent;
  'financial_connections.account.refreshed_ownership': Stripe.FinancialConnectionsAccountRefreshedOwnershipEvent;
  'financial_connections.account.refreshed_transactions': Stripe.FinancialConnectionsAccountRefreshedTransactionsEvent;
  'financial_connections.account.upcoming_account_number_expiry': Stripe.FinancialConnectionsAccountUpcomingAccountNumberExpiryEvent;

  // Identity events
  'identity.verification_session.canceled': Stripe.IdentityVerificationSessionCanceledEvent;
  'identity.verification_session.created': Stripe.IdentityVerificationSessionCreatedEvent;
  'identity.verification_session.processing': Stripe.IdentityVerificationSessionProcessingEvent;
  'identity.verification_session.redacted': Stripe.IdentityVerificationSessionRedactedEvent;
  'identity.verification_session.requires_input': Stripe.IdentityVerificationSessionRequiresInputEvent;
  'identity.verification_session.verified': Stripe.IdentityVerificationSessionVerifiedEvent;

  // Invoice events
  'invoice.created': Stripe.InvoiceCreatedEvent;
  'invoice.deleted': Stripe.InvoiceDeletedEvent;
  'invoice.finalization_failed': Stripe.InvoiceFinalizationFailedEvent;
  'invoice.finalized': Stripe.InvoiceFinalizedEvent;
  'invoice.marked_uncollectible': Stripe.InvoiceMarkedUncollectibleEvent;
  'invoice.overdue': Stripe.InvoiceOverdueEvent;
  'invoice.overpaid': Stripe.InvoiceOverpaidEvent;
  'invoice.paid': Stripe.InvoicePaidEvent;
  'invoice.payment_action_required': Stripe.InvoicePaymentActionRequiredEvent;
  'invoice.payment_attempt_required': Stripe.InvoicePaymentAttemptRequiredEvent;
  'invoice.payment_failed': Stripe.InvoicePaymentFailedEvent;
  'invoice.payment_succeeded': Stripe.InvoicePaymentSucceededEvent;
  'invoice.sent': Stripe.InvoiceSentEvent;
  'invoice.upcoming': Stripe.InvoiceUpcomingEvent;
  'invoice.updated': Stripe.InvoiceUpdatedEvent;
  'invoice.voided': Stripe.InvoiceVoidedEvent;
  'invoice.will_be_due': Stripe.InvoiceWillBeDueEvent;
  'invoice_payment.paid': Stripe.InvoicePaymentPaidEvent;
  'invoiceitem.created': Stripe.InvoiceItemCreatedEvent;
  'invoiceitem.deleted': Stripe.InvoiceItemDeletedEvent;

  // Issuing events
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
  'issuing_dispute.funds_rescinded': Stripe.IssuingDisputeFundsRescindedEvent;
  'issuing_dispute.submitted': Stripe.IssuingDisputeSubmittedEvent;
  'issuing_dispute.updated': Stripe.IssuingDisputeUpdatedEvent;
  'issuing_personalization_design.activated': Stripe.IssuingPersonalizationDesignActivatedEvent;
  'issuing_personalization_design.deactivated': Stripe.IssuingPersonalizationDesignDeactivatedEvent;
  'issuing_personalization_design.rejected': Stripe.IssuingPersonalizationDesignRejectedEvent;
  'issuing_personalization_design.updated': Stripe.IssuingPersonalizationDesignUpdatedEvent;
  'issuing_token.created': Stripe.IssuingTokenCreatedEvent;
  'issuing_token.updated': Stripe.IssuingTokenUpdatedEvent;
  'issuing_transaction.created': Stripe.IssuingTransactionCreatedEvent;
  'issuing_transaction.purchase_details_receipt_updated': Stripe.IssuingTransactionPurchaseDetailsReceiptUpdatedEvent;
  'issuing_transaction.updated': Stripe.IssuingTransactionUpdatedEvent;

  // Mandate events
  'mandate.updated': Stripe.MandateUpdatedEvent;

  // Payment intent events
  'payment_intent.amount_capturable_updated': Stripe.PaymentIntentAmountCapturableUpdatedEvent;
  'payment_intent.canceled': Stripe.PaymentIntentCanceledEvent;
  'payment_intent.created': Stripe.PaymentIntentCreatedEvent;
  'payment_intent.partially_funded': Stripe.PaymentIntentPartiallyFundedEvent;
  'payment_intent.payment_failed': Stripe.PaymentIntentPaymentFailedEvent;
  'payment_intent.processing': Stripe.PaymentIntentProcessingEvent;
  'payment_intent.requires_action': Stripe.PaymentIntentRequiresActionEvent;
  'payment_intent.succeeded': Stripe.PaymentIntentSucceededEvent;

  // Payment link events
  'payment_link.created': Stripe.PaymentLinkCreatedEvent;
  'payment_link.updated': Stripe.PaymentLinkUpdatedEvent;

  // Payment method events
  'payment_method.attached': Stripe.PaymentMethodAttachedEvent;
  'payment_method.automatically_updated': Stripe.PaymentMethodAutomaticallyUpdatedEvent;
  'payment_method.detached': Stripe.PaymentMethodDetachedEvent;
  'payment_method.updated': Stripe.PaymentMethodUpdatedEvent;

  // Payout events
  'payout.canceled': Stripe.PayoutCanceledEvent;
  'payout.created': Stripe.PayoutCreatedEvent;
  'payout.failed': Stripe.PayoutFailedEvent;
  'payout.paid': Stripe.PayoutPaidEvent;
  'payout.reconciliation_completed': Stripe.PayoutReconciliationCompletedEvent;
  'payout.updated': Stripe.PayoutUpdatedEvent;

  // Person events
  'person.created': Stripe.PersonCreatedEvent;
  'person.deleted': Stripe.PersonDeletedEvent;
  'person.updated': Stripe.PersonUpdatedEvent;

  // Plan events
  'plan.created': Stripe.PlanCreatedEvent;
  'plan.deleted': Stripe.PlanDeletedEvent;
  'plan.updated': Stripe.PlanUpdatedEvent;

  // Price events
  'price.created': Stripe.PriceCreatedEvent;
  'price.deleted': Stripe.PriceDeletedEvent;
  'price.updated': Stripe.PriceUpdatedEvent;

  // Product events
  'product.created': Stripe.ProductCreatedEvent;
  'product.deleted': Stripe.ProductDeletedEvent;
  'product.updated': Stripe.ProductUpdatedEvent;

  // Promotion code events
  'promotion_code.created': Stripe.PromotionCodeCreatedEvent;
  'promotion_code.updated': Stripe.PromotionCodeUpdatedEvent;

  // Quote events
  'quote.accepted': Stripe.QuoteAcceptedEvent;
  'quote.canceled': Stripe.QuoteCanceledEvent;
  'quote.created': Stripe.QuoteCreatedEvent;
  'quote.finalized': Stripe.QuoteFinalizedEvent;

  // Radar events
  'radar.early_fraud_warning.created': Stripe.RadarEarlyFraudWarningCreatedEvent;
  'radar.early_fraud_warning.updated': Stripe.RadarEarlyFraudWarningUpdatedEvent;

  // Refund events
  'refund.created': Stripe.RefundCreatedEvent;
  'refund.failed': Stripe.RefundFailedEvent;
  'refund.updated': Stripe.RefundUpdatedEvent;

  // Reporting events
  'reporting.report_run.failed': Stripe.ReportingReportRunFailedEvent;
  'reporting.report_run.succeeded': Stripe.ReportingReportRunSucceededEvent;
  'reporting.report_type.updated': Stripe.ReportingReportTypeUpdatedEvent;

  // Review events
  'review.closed': Stripe.ReviewClosedEvent;
  'review.opened': Stripe.ReviewOpenedEvent;

  // Setup intent events
  'setup_intent.canceled': Stripe.SetupIntentCanceledEvent;
  'setup_intent.created': Stripe.SetupIntentCreatedEvent;
  'setup_intent.requires_action': Stripe.SetupIntentRequiresActionEvent;
  'setup_intent.setup_failed': Stripe.SetupIntentSetupFailedEvent;
  'setup_intent.succeeded': Stripe.SetupIntentSucceededEvent;

  // Sigma events
  'sigma.scheduled_query_run.created': Stripe.SigmaScheduledQueryRunCreatedEvent;

  // Source events
  'source.canceled': Stripe.SourceCanceledEvent;
  'source.chargeable': Stripe.SourceChargeableEvent;
  'source.failed': Stripe.SourceFailedEvent;
  'source.mandate_notification': Stripe.SourceMandateNotificationEvent;
  'source.refund_attributes_required': Stripe.SourceRefundAttributesRequiredEvent;
  'source.transaction.created': Stripe.SourceTransactionCreatedEvent;
  'source.transaction.updated': Stripe.SourceTransactionUpdatedEvent;

  // Subscription schedule events
  'subscription_schedule.aborted': Stripe.SubscriptionScheduleAbortedEvent;
  'subscription_schedule.canceled': Stripe.SubscriptionScheduleCanceledEvent;
  'subscription_schedule.completed': Stripe.SubscriptionScheduleCompletedEvent;
  'subscription_schedule.created': Stripe.SubscriptionScheduleCreatedEvent;
  'subscription_schedule.expiring': Stripe.SubscriptionScheduleExpiringEvent;
  'subscription_schedule.released': Stripe.SubscriptionScheduleReleasedEvent;
  'subscription_schedule.updated': Stripe.SubscriptionScheduleUpdatedEvent;

  // Tax events
  'tax.settings.updated': Stripe.TaxSettingsUpdatedEvent;
  'tax_rate.created': Stripe.TaxRateCreatedEvent;
  'tax_rate.updated': Stripe.TaxRateUpdatedEvent;

  // Terminal events
  'terminal.reader.action_failed': Stripe.TerminalReaderActionFailedEvent;
  'terminal.reader.action_succeeded': Stripe.TerminalReaderActionSucceededEvent;
  'terminal.reader.action_updated': Stripe.TerminalReaderActionUpdatedEvent;

  // Test helpers events
  'test_helpers.test_clock.advancing': Stripe.TestHelpersTestClockAdvancingEvent;
  'test_helpers.test_clock.created': Stripe.TestHelpersTestClockCreatedEvent;
  'test_helpers.test_clock.deleted': Stripe.TestHelpersTestClockDeletedEvent;
  'test_helpers.test_clock.internal_failure': Stripe.TestHelpersTestClockInternalFailureEvent;
  'test_helpers.test_clock.ready': Stripe.TestHelpersTestClockReadyEvent;

  // Top-up events
  'topup.canceled': Stripe.TopupCanceledEvent;
  'topup.created': Stripe.TopupCreatedEvent;
  'topup.failed': Stripe.TopupFailedEvent;
  'topup.reversed': Stripe.TopupReversedEvent;
  'topup.succeeded': Stripe.TopupSucceededEvent;

  // Transfer events
  'transfer.created': Stripe.TransferCreatedEvent;
  'transfer.reversed': Stripe.TransferReversedEvent;
  'transfer.updated': Stripe.TransferUpdatedEvent;

  // Treasury events
  'treasury.credit_reversal.created': Stripe.TreasuryCreditReversalCreatedEvent;
  'treasury.credit_reversal.posted': Stripe.TreasuryCreditReversalPostedEvent;
  'treasury.debit_reversal.completed': Stripe.TreasuryDebitReversalCompletedEvent;
  'treasury.debit_reversal.created': Stripe.TreasuryDebitReversalCreatedEvent;
  'treasury.debit_reversal.initial_credit_granted': Stripe.TreasuryDebitReversalInitialCreditGrantedEvent;
  'treasury.financial_account.closed': Stripe.TreasuryFinancialAccountClosedEvent;
  'treasury.financial_account.created': Stripe.TreasuryFinancialAccountCreatedEvent;
  'treasury.financial_account.features_status_updated': Stripe.TreasuryFinancialAccountFeaturesStatusUpdatedEvent;
  'treasury.inbound_transfer.canceled': Stripe.TreasuryInboundTransferCanceledEvent;
  'treasury.inbound_transfer.created': Stripe.TreasuryInboundTransferCreatedEvent;
  'treasury.inbound_transfer.failed': Stripe.TreasuryInboundTransferFailedEvent;
  'treasury.inbound_transfer.succeeded': Stripe.TreasuryInboundTransferSucceededEvent;
  'treasury.outbound_payment.canceled': Stripe.TreasuryOutboundPaymentCanceledEvent;
  'treasury.outbound_payment.created': Stripe.TreasuryOutboundPaymentCreatedEvent;
  'treasury.outbound_payment.expected_arrival_date_updated': Stripe.TreasuryOutboundPaymentExpectedArrivalDateUpdatedEvent;
  'treasury.outbound_payment.failed': Stripe.TreasuryOutboundPaymentFailedEvent;
  'treasury.outbound_payment.posted': Stripe.TreasuryOutboundPaymentPostedEvent;
  'treasury.outbound_payment.returned': Stripe.TreasuryOutboundPaymentReturnedEvent;
  'treasury.outbound_payment.tracking_details_updated': Stripe.TreasuryOutboundPaymentTrackingDetailsUpdatedEvent;
  'treasury.outbound_transfer.canceled': Stripe.TreasuryOutboundTransferCanceledEvent;
  'treasury.outbound_transfer.created': Stripe.TreasuryOutboundTransferCreatedEvent;
  'treasury.outbound_transfer.expected_arrival_date_updated': Stripe.TreasuryOutboundTransferExpectedArrivalDateUpdatedEvent;
  'treasury.outbound_transfer.failed': Stripe.TreasuryOutboundTransferFailedEvent;
  'treasury.outbound_transfer.posted': Stripe.TreasuryOutboundTransferPostedEvent;
  'treasury.outbound_transfer.returned': Stripe.TreasuryOutboundTransferReturnedEvent;
  'treasury.outbound_transfer.tracking_details_updated': Stripe.TreasuryOutboundTransferTrackingDetailsUpdatedEvent;
  'treasury.received_credit.created': Stripe.TreasuryReceivedCreditCreatedEvent;
  'treasury.received_credit.failed': Stripe.TreasuryReceivedCreditFailedEvent;
  'treasury.received_credit.succeeded': Stripe.TreasuryReceivedCreditSucceededEvent;
  'treasury.received_debit.created': Stripe.TreasuryReceivedDebitCreatedEvent;
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
import { WebhookRouter, type WebhookEvent, type EventHandler } from '@tayori/core';
export { WebhookRouter, type WebhookEvent, type EventHandler };

/**
 * Type-safe Stripe Webhook Router
 * Uses Stripe's event types for full type inference
 */
export class StripeWebhookRouter extends WebhookRouter<StripeEventMap> {}
