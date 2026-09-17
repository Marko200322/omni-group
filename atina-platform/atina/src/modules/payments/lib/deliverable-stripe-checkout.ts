import type Stripe from 'stripe';
import type { DeliverableDefinition } from '../../billing/lib/deliverable-catalog';
import type { MaintenanceTier } from '../../billing/lib/package-maintenance-tiers';

export type DeliverableStripeSessionBuildInput = {
  deliverable: DeliverableDefinition;
  amountEur: number;
  categoryLabel: string;
  maintenanceTier: MaintenanceTier | null;
  paymentId: string;
  userId: string;
  industryCategory?: string;
};

export type DeliverableStripeSessionBuildResult = {
  mode: 'payment' | 'subscription';
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
  subscriptionData?: Stripe.Checkout.SessionCreateParams.SubscriptionData;
};

function deliverableProductLine(
  deliverable: DeliverableDefinition,
  amountEur: number,
  categoryLabel: string,
): Stripe.Checkout.SessionCreateParams.LineItem {
  return {
    price_data: {
      currency: 'eur',
      product_data: {
        name: `${deliverable.name}${categoryLabel}`,
        description: deliverable.description.slice(0, 200),
      },
      unit_amount: Math.round(amountEur * 100),
    },
    quantity: 1,
  };
}

function maintenanceRecurringLine(tier: MaintenanceTier): Stripe.Checkout.SessionCreateParams.LineItem {
  return {
    price_data: {
      currency: 'eur',
      product_data: {
        name: `Maintenance — ${tier.label}`,
        description: tier.includes.join(' · ').slice(0, 200),
      },
      unit_amount: Math.round(tier.monthlyEur * 100),
      recurring: { interval: 'month' },
    },
    quantity: 1,
  };
}

export function buildDeliverableStripeSessionParams(
  input: DeliverableStripeSessionBuildInput,
): DeliverableStripeSessionBuildResult {
  const { deliverable, amountEur, categoryLabel, maintenanceTier } = input;
  const baseLine = deliverableProductLine(deliverable, amountEur, categoryLabel);
  const isRecurringDeliverable = deliverable.billing === 'monthly' || deliverable.billing === 'yearly';
  const interval = deliverable.billing === 'yearly' ? 'year' : 'month';

  const sharedSubscriptionMeta = {
    purchaseType: 'deliverable',
    paymentId: input.paymentId,
    userId: input.userId,
    deliverableId: deliverable.id,
    industryCategory: input.industryCategory ?? '',
    maintenanceTierId: maintenanceTier?.id ?? '',
    maintenanceIncludedInPrice: isRecurringDeliverable ? '1' : '',
  };

  if (isRecurringDeliverable) {
    return {
      mode: 'subscription',
      lineItems: [
        {
          price_data: {
            ...baseLine.price_data!,
            recurring: { interval },
          },
          quantity: 1,
        },
      ],
      subscriptionData: { metadata: sharedSubscriptionMeta },
    };
  }

  if (maintenanceTier) {
    return {
      mode: 'subscription',
      lineItems: [baseLine, maintenanceRecurringLine(maintenanceTier)],
      subscriptionData: { metadata: sharedSubscriptionMeta },
    };
  }

  return { mode: 'payment', lineItems: [baseLine] };
}
