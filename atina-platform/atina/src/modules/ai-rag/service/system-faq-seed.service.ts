/**
 * SystemFaqSeedService — seeds system-level Omni FAQ chunks into ai_rag_chunks.
 * Chunks are stored using the first admin user's UUID so the FK constraint is satisfied.
 * All users can find them via AiRagRepository.searchChunks which includes
 * OR source_id = 'omni-system-faq' in the WHERE clause.
 */
import { query } from '../../../database/connection';
import logger from '../../../utils/logger';

const SOURCE_ID = 'omni-system-faq';

/** Resolve a real UUID from the users table (first admin, then any user). */
async function resolveSystemUserId(): Promise<string> {
  const { rows } = await query<{ id: string }>(
    `SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1`
  );
  if (rows[0]?.id) return rows[0].id;
  const fallback = await query<{ id: string }>(`SELECT id FROM users ORDER BY created_at ASC LIMIT 1`);
  if (fallback.rows[0]?.id) return fallback.rows[0].id;
  throw new Error('SystemFaqSeed: no users found in DB — seed skipped');
}
const CHUNK_SIZE = 1500;

/** Raw FAQ knowledge — split into ~8 topical chunks. */
const FAQ_CHUNKS: string[] = [
  // Chunk 0 — Package catalogue (all 23 base packages)
  `Omni Group Package Catalogue (23 base packages):
Setup packages: setup-quick (rapid onboarding docs), setup-full (full onboarding document set), setup-custom (tailored onboarding for specific business).
Audit packages: audit (technical/business audit report).
Integration & workflow: integration (system integration guide), workflow-design (workflow blueprint documents).
Support retainers: support-priority (priority support retainer, monthly), support-dedicated (dedicated agent support retainer, monthly).
Website packages: landing (landing page), website-business (business website), website-ecommerce (e-commerce website), white-label-setup (white-label configuration).
Sales & marketing: sales-enablement (sales deck + materials), vertical-package (industry-specific vertical content), lead-gen-retainer (monthly lead generation retainer), email-marketing (email campaign setup), reputation-management (online reputation management).
AI & custom software: ai-support-retainer (monthly AI-powered support retainer), custom-software (bespoke software delivery).
Bundles: bundle-portal-presence (portal + website presence combo), bundle-sales-launch (sales enablement + landing combo), bundle-ops-clarity (operations clarity bundle).
SEO: seo-audit (search engine optimisation audit).
Total: 23 packages. All packages produce a PDF deliverable plus a Markdown companion file delivered to the client portal.`,

  // Chunk 1 — How delivery works
  `How Omni Group package delivery works:
1. Client purchases a package via the Omni portal checkout.
2. Payment is confirmed (IBAN bank transfer; reference from invoice).
3. The platform automatically triggers fulfillment: a PDF document and a Markdown companion are generated and stored as a deliverable.
4. A tax invoice is issued and available under /dashboard/documents.
5. The client receives an in-app notification and email confirming delivery.
6. Deliverable files (PDF + Markdown) are available under /dashboard/deliveries.
7. For retainer packages (monthly): the same flow repeats each billing cycle.
8. For bundle packages: each component sub-package is fulfilled as a separate deliverable; all are grouped under the same order.
Timeline expectation: automated delivery happens within minutes of payment confirmation for standard packages. Custom-software packages involve a manual scoping phase and a separate delivery timeline agreed by email.`,

  // Chunk 2 — Package category details
  `Omni Group package category breakdown:
SETUP packages (setup-quick, setup-full, setup-custom): Deliver onboarding documentation — business setup guide, platform usage guide, initial configuration checklist. No live infrastructure changes are made by Omni; client configures their own services using the provided guides.
AUDIT packages (audit, seo-audit): Deliver a structured report — findings, recommendations, priority ranking. Does not include implementation; a follow-up package (integration, workflow-design, etc.) is required for implementation.
WEBSITE packages (landing, website-business, website-ecommerce, white-label-setup): Omni delivers the site structure, content, and design assets as documents/configs. CONFIGURATION REQUIRED: client must point their domain DNS, apply SSL certificate, and configure any payment gateway (Stripe LIVE keys, PayPal) themselves. Omni documents provide the step-by-step guide.
RETAINER packages (support-priority, support-dedicated, lead-gen-retainer, ai-support-retainer): Monthly recurring subscription. Each month generates a new deliverable (monthly report / tasks log / AI session log). Cancel any time via /dashboard/subscriptions.
SALES & MARKETING packages: Deliver documents, templates, scripts, and campaign plans. Ads accounts, budgets, and API keys (Google Ads, Meta Ads) are CONFIGURATION REQUIRED — client-owned and client-managed.`,

  // Chunk 3 — Portal navigation
  `Omni Group client portal navigation guide:
/dashboard — main dashboard overview; shows open tasks, recent notifications, active subscriptions.
/dashboard/orders — all purchases with status (pending, fulfilled, refund-requested, etc.).
/dashboard/deliveries — list of all deliverable files; click any row to download the PDF and Markdown companion.
/dashboard/documents — invoices, receipts, tax documents, contracts. Download as PDF.
/dashboard/support — raise a support ticket; view ticket history and AI-generated resolution steps.
/dashboard/subscriptions — active retainer subscriptions; cancel, upgrade, or pause from here.
/dashboard/profile — update contact info, billing address, notification preferences.
/dashboard/projects — internal task/project tracker linked to your deliverables; shows AI solver results (legacy /dashboard/tasks redirects here).
/dashboard/billing — payment history, outstanding invoices, add/change payment method.
Tips: Use /dashboard/deliveries to confirm you received your package artifacts. If a delivery is missing, raise a support ticket from /dashboard/support with the order ID.`,

  // Chunk 4 — Payment methods and IBAN instructions
  `Omni Group payment process:
Accepted payment method: IBAN bank transfer.
Steps: 1) Complete checkout → an invoice is generated with the exact IBAN, BIC/SWIFT, beneficiary name, and a unique payment reference code. 2) Transfer the exact amount shown to the IBAN listed on the invoice. 3) Use the payment reference code in the transfer description — this is mandatory for automatic reconciliation. 4) Allow 1–3 business days for bank transfer clearing. 5) Once payment clears, fulfillment triggers automatically.
Important: Do NOT omit the payment reference. Transfers without the reference require manual matching and may delay fulfillment by up to 5 business days.
Invoice is available immediately after checkout under /dashboard/documents.
For any payment dispute or confirmation delay beyond 5 business days, raise a support ticket via /dashboard/support with your invoice number.`,

  // Chunk 5 — CONFIGURATION REQUIRED items
  `Omni Group CONFIGURATION REQUIRED items (not fulfilled by Omni autonomously):
These items require the business owner (Marko / legal entity owner) to take manual action. They are NOT completed by Omni as part of any package:
1. Stripe LIVE keys — merchant Stripe account must be created and LIVE keys entered in the platform settings. Stripe TEST mode is active by default; no real card payments process until LIVE keys are configured.
2. PayPal / Wise / Kriptoman payment gateways — must be connected by the owner.
3. Custom domain DNS — client must update DNS records at their registrar to point to the deployed site.
4. SSL certificate — auto-issued via Let's Encrypt only after DNS propagation; requires client action first.
5. Google Ads / Meta Ads API keys — client must supply their own ad account credentials.
6. External CRM / ERP API keys — integration packages deliver the guide; client must obtain and enter their own API credentials.
7. Legal entity / VAT / companyLegalName — must be set by the owner; agent must NOT fill these fields.
If a client ticket references any of the above, the correct response is: "This item is CONFIGURATION REQUIRED — it requires the account owner to complete a manual action. Please contact support with your specific step for guidance."`,

  // Chunk 6 — Intro promo and pricing
  `Omni Group introductory promotion and pricing policy:
Intro promo: The first 50 clients receive a 15% discount on their first purchase. This is tracked automatically by the platform. Once 50 introductory clients have been onboarded, the promo ends and full list prices apply to all subsequent clients.
Current promo status: tracked in platform; the /api/v1/package-pricing endpoint returns whether the intro price is active for the requesting user.
Full list prices: see the public package catalogue at /packages or the pricing page on the Omni Group website.
Pricing is in EUR. Invoices are issued in EUR. Bank transfer must be in EUR to the IBAN on the invoice.
Bundle discount: bundles (bundle-portal-presence, bundle-sales-launch, bundle-ops-clarity) are already priced below the sum of individual packages — no additional bundle discount applies on top of the intro promo.
Price changes: Omni reserves the right to update prices for new orders. Existing active retainers are billed at the rate at time of subscription creation for the first 12 months.`,

  // Chunk 7 — Support SLA and AI solver
  `Omni Group support process and SLA:
How to raise a ticket: Go to /dashboard/support → click "New Ticket" → describe your issue. Attach screenshots, order IDs, or invoice numbers if relevant.
Response SLA: First human response within 48 business hours for standard tickets. Priority support retainer (support-priority) clients receive a 24-hour SLA. Dedicated support retainer (support-dedicated) clients receive a 4-hour SLA during business hours.
AI solver: When a ticket is submitted, the platform's AI support agent automatically attempts to resolve the issue using knowledge of Omni packages, portal navigation, and common problems. The AI resolution appears in the ticket within minutes. If the AI marks the ticket as solved, the client can confirm resolution or escalate to human review.
Human escalation: Any ticket marked needsHuman=true is automatically queued for a human agent. Do not re-submit the same ticket repeatedly; it is already in the queue.
AI limitations: The AI solver cannot: activate Stripe LIVE, complete DNS configuration, process refunds, modify legal/VAT data, or confirm bank transfer receipt. These require human action.
Refund policy: Requests reviewed within 14 days of purchase for defective deliverables. Contact support with your order ID.`,
];

export class SystemFaqSeedService {
  /**
   * Seeds system FAQ chunks if not already present.
   * @param force — if true, re-seeds even if chunks already exist (for updates).
   */
  static async seedSystemFaq(force = false): Promise<void> {
    // Resolve a real UUID for the system FAQ owner (admin user)
    let userId: string;
    try {
      userId = await resolveSystemUserId();
    } catch (err) {
      logger.warn('SystemFaqSeed: skipped —', { err: String(err) });
      return;
    }

    // Check existing count by source_id (user_id may vary across redeploys)
    const countResult = await query(
      `SELECT COUNT(*) AS cnt FROM ai_rag_chunks WHERE source_id = $1`,
      [SOURCE_ID],
    );
    const existing = parseInt(String(countResult.rows[0]?.cnt ?? '0'), 10);

    if (existing > 0 && !force) {
      logger.info(`SystemFaqSeed: ${existing} system FAQ chunks already present — skipping.`);
      return;
    }

    if (force && existing > 0) {
      // Remove old chunks before re-seeding
      await query(`DELETE FROM ai_rag_chunks WHERE source_id = $1`, [SOURCE_ID]);
      logger.info(`SystemFaqSeed: Removed ${existing} stale system FAQ chunks for re-seed.`);
    }

    let inserted = 0;
    for (let i = 0; i < FAQ_CHUNKS.length; i++) {
      const text = FAQ_CHUNKS[i];
      // Split oversized chunks using the same chunkSize limit
      const parts: string[] = [];
      for (let offset = 0; offset < text.length; offset += CHUNK_SIZE) {
        parts.push(text.slice(offset, offset + CHUNK_SIZE));
      }
      for (let partIdx = 0; partIdx < parts.length; partIdx++) {
        await query(
          `INSERT INTO ai_rag_chunks (user_id, source_id, chunk_index, content, metadata)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            userId,
            SOURCE_ID,
            i * 10 + partIdx,
            parts[partIdx],
            JSON.stringify({ topic: i, part: partIdx, totalTopics: FAQ_CHUNKS.length }),
          ],
        );
        inserted++;
      }
    }

    logger.info(`SystemFaqSeed: Seeded ${inserted} system FAQ chunks (source=${SOURCE_ID}).`);
  }
}
