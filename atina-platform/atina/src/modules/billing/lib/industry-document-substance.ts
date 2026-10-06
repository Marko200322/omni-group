/**
 * Industry-specific document substance overlays for consulting/doc PDFs.
 * Ensures fallbacks differ by vertical (not a single template with the industry word swapped).
 */
import { getIndustryCategory } from './category-pricing';
import { normalizeCategorySlug } from '../../../shared/industry/industry-catalog';

export type IndustryDocumentSubstance = {
  /** Canonical category slug (catalog form). */
  categorySlug: string;
  /** English display label for English PDF bodies. */
  labelEn: string;
  /** Distinctive domain tokens — tests assert these appear in generated docs. */
  distinctiveTokens: string[];
  complianceChecklist: string[];
  operationalRisks: string[];
  kpiSet: string[];
  discoveryQuestions: string[];
  salesPains: string[];
  integrationNotes: string[];
  auditLenses: string[];
  workflowNuances: string[];
  setupMilestones: string[];
};

const DEFAULT_SUBSTANCE: Omit<IndustryDocumentSubstance, 'categorySlug' | 'labelEn'> = {
  distinctiveTokens: ['SMB operations', 'lead response SLA', 'CRM hygiene'],
  complianceChecklist: [
    'PII retention policy reviewed for local regulations',
    'Consent recorded for outbound sequences',
    'Access least-privilege for admin vs client roles',
  ],
  operationalRisks: [
    'Leads stall without owner + SLA clock',
    'Payment confirm → fulfillment handoff is manual',
    'No single source of truth for stages',
  ],
  kpiSet: [
    'Median time-to-first-response',
    'Stage conversion %',
    'Fulfillment cycle time',
    'SLA breach count',
  ],
  discoveryQuestions: [
    'Where do leads stall today?',
    'Who confirms payments / owns follow-up?',
    'What does “done” look like in 30 days?',
  ],
  salesPains: [
    'Admin overload and slow follow-up',
    'Unclear delivery path after payment',
    'CRM exists but stages are ignored',
  ],
  integrationNotes: [
    'Tag webhook payloads with vertical source for reporting',
    'Map payment_id ↔ external invoice id durably',
    'Prefer short-lived JWT + server-side refresh',
  ],
  auditLenses: [
    'Stack readiness vs peer benchmarks',
    'Conversion funnel integrity',
    'Automation maturity and closed-loop reliability',
  ],
  workflowNuances: [
    'Human override on every automation step',
    'Consent + source required before outreach',
    'Escalate exceptions to a human queue',
  ],
  setupMilestones: [
    'Portal login without Omni assistance',
    'Payment path smoke-tested',
    'First automation dry-run signed off',
  ],
};

/** Explicit overlays for industries we prove differ meaningfully in unit tests. */
export const INDUSTRY_DOCUMENT_SUBSTANCE: Record<string, IndustryDocumentSubstance> = {
  healthcare: {
    categorySlug: 'healthcare',
    labelEn: 'Healthcare',
    distinctiveTokens: [
      'HIPAA',
      'PHI',
      'patient intake',
      'clinical scheduling',
      'BAA',
      'ehr',
    ],
    complianceChecklist: [
      'HIPAA/PHI handling: encryption at rest + access audit trail',
      'Business Associate Agreement (BAA) path documented for vendors',
      'Patient intake consent + retention schedule reviewed',
      'Break-glass emergency access procedure for clinical staff',
      'No PHI in marketing CRM notes or outbound email bodies',
    ],
    operationalRisks: [
      'Patient intake forms leak PHI into generic CRM fields',
      'Appointment no-show rate without reminder automation',
      'EHR ↔ portal identity mismatch blocks scheduling',
      'Referral follow-up stalls without clinical owner',
    ],
    kpiSet: [
      'Patient intake completion rate',
      'Appointment show rate / no-show %',
      'Referral-to-scheduled conversion',
      'PHI access audit exceptions per month',
    ],
    discoveryQuestions: [
      'Where is PHI stored today (EHR, forms, email, spreadsheets)?',
      'How are referrals handed off from front desk to clinicians?',
      'What is the current no-show rate and reminder channel?',
      'Which vendors need a BAA before go-live?',
    ],
    salesPains: [
      'Front-desk overload on intake and rescheduling',
      'Referral leakage between clinics and specialists',
      'Compliance fear blocking useful automation',
    ],
    integrationNotes: [
      'Never put PHI in webhook payloads — use opaque patient refs',
      'Separate clinical schedule sync from marketing CRM stages',
      'Token-scope clinical read endpoints separately from billing',
      'Log every PHI-adjacent API call with actor + purpose',
    ],
    auditLenses: [
      'PHI exposure surface (forms, backups, logs, CRM notes)',
      'Clinical scheduling reliability and reminder coverage',
      'EHR / practice-management integration readiness',
      'Vendor BAA coverage vs live connectors',
    ],
    workflowNuances: [
      'Intake → eligibility check → schedule → reminder → visit close',
      'Clinical owner required before any referral outreach',
      'Automation stops if consent flag missing',
    ],
    setupMilestones: [
      'PHI-safe CRM field map approved',
      'Intake form + reminder path live',
      'BAA vendor list attached to go-live pack',
    ],
  },

  legal: {
    categorySlug: 'legal',
    labelEn: 'Legal',
    distinctiveTokens: [
      'attorney-client privilege',
      'matter intake',
      'conflict check',
      'retainer',
      'e-sign',
      'trust accounting',
    ],
    complianceChecklist: [
      'Attorney-client privilege boundaries for CRM notes and AI drafts',
      'Conflict-check gate before matter open',
      'Retainer / trust accounting separation from operating invoices',
      'Document retention schedule per practice area',
      'E-sign audit trail retained with matter ID',
    ],
    operationalRisks: [
      'Matters open without conflict check',
      'Privilege notes copied into marketing sequences',
      'Retainer depletion without client notice',
      'Deadline / statute clocks not owned in CRM',
    ],
    kpiSet: [
      'Matter intake → engagement letter cycle time',
      'Conflict-check completion before open',
      'Retainer collect-to-work start days',
      'Deadline miss / near-miss count',
    ],
    discoveryQuestions: [
      'How do conflict checks run today before a matter opens?',
      'Where do engagement letters and retainers live?',
      'Who owns statute / filing deadline clocks?',
      'Which practice areas need privilege-safe note templates?',
    ],
    salesPains: [
      'Intake bottleneck for new matters',
      'Manual conflict checks delay engagement',
      'Clients stall on retainer payment before work starts',
    ],
    integrationNotes: [
      'Matter ID is the correlation key across CRM, contracts, e-sign',
      'Block outreach sequences on privileged contact flags',
      'Trust/retainer ledger events stay out of marketing webhooks',
      'E-sign completion webhook must attach matter + template version',
    ],
    auditLenses: [
      'Privilege / confidentiality posture of CRM + AI tools',
      'Conflict-check completeness',
      'Retainer and trust accounting handoffs',
      'Deadline ownership and escalation paths',
    ],
    workflowNuances: [
      'Lead → conflict check → engagement → retainer → matter work',
      'No outreach until conflict check Pass',
      'Privilege-safe templates only for client-facing mail',
    ],
    setupMilestones: [
      'Conflict-check stage live in CRM',
      'Engagement + e-sign path smoke-tested',
      'Retainer invoice path separated from ops billing',
    ],
  },

  finance: {
    categorySlug: 'finance',
    labelEn: 'Finance',
    distinctiveTokens: [
      'KYC',
      'AML',
      'reconciliation',
      'audit trail',
      'segregation of duties',
      'client onboarding ledger',
    ],
    complianceChecklist: [
      'KYC/AML onboarding checklist with evidence locations',
      'Segregation of duties: billing confirm ≠ fulfillment operator',
      'Immutable audit trail for payment confirm and privilege changes',
      'Reconciliation cadence (daily/weekly) with exception owners',
      'Data retention for financial records vs marketing PII',
    ],
    operationalRisks: [
      'Bank transfers without unique payment references',
      'Reconciliation lag creates false “paid” states',
      'Same operator confirms payment and releases artifacts',
      'Client onboarding ledger diverges from CRM stages',
    ],
    kpiSet: [
      'Days sales outstanding (DSO)',
      'Reconciliation exception rate',
      'Payment confirm → artifact unlock latency',
      'KYC packet completion rate',
    ],
    discoveryQuestions: [
      'How do you reconcile bank transfers to invoices today?',
      'Who can both confirm payment and release deliverables?',
      'What KYC evidence is required before kickoff?',
      'Where do audit trails live for privilege changes?',
    ],
    salesPains: [
      'Slow cash collection and unclear payment status',
      'Manual reconciliation eating analyst hours',
      'Compliance friction delaying client onboarding',
    ],
    integrationNotes: [
      'Idempotency-Key required on payment-confirm retries',
      'Ledger export must include payment_reference + amount + currency',
      'Segregate roles in JWT scopes: billing.confirm vs deliverable.release',
      'Dead-letter failed webhooks into a reconciliation queue',
    ],
    auditLenses: [
      'Cash controls and segregation of duties',
      'Reconciliation reliability',
      'KYC/AML packet completeness',
      'Audit trail integrity for money movement',
    ],
    workflowNuances: [
      'Quote → KYC → invoice → reconcile → unlock → review',
      'No artifact release until reconciliation Pass or dual control',
      'Exception queue for unmatched references',
    ],
    setupMilestones: [
      'Unique payment reference flow live',
      'Dual-control confirm path documented',
      'First reconciliation dry-run signed',
    ],
  },

  ecommerce: {
    categorySlug: 'ecommerce',
    labelEn: 'E-commerce',
    distinctiveTokens: [
      'cart abandonment',
      'SKU',
      'conversion rate',
      'fulfillment SLA',
      'AOV',
      'product catalog',
    ],
    complianceChecklist: [
      'Consumer refund / chargeback policy linked from checkout',
      'Product claim accuracy review before catalog publish',
      'Consent for remarketing pixels documented',
      'PCI scope minimized (hosted checkout / no card storage)',
      'Shipping / delivery promise language matches ops capacity',
    ],
    operationalRisks: [
      'Cart abandonment without recovery sequence',
      'SKU / inventory drift between catalog and ops',
      'Fulfillment SLA missed after peak campaigns',
      'AOV drops when upsell path is undefined',
    ],
    kpiSet: [
      'Conversion rate (session → paid)',
      'Cart abandonment recovery rate',
      'Average order value (AOV)',
      'Fulfillment SLA hit rate by SKU class',
    ],
    discoveryQuestions: [
      'What is current conversion rate and where do carts die?',
      'How is catalog / SKU truth maintained?',
      'What fulfillment SLA do you promise vs hit?',
      'Which channels drive highest AOV today?',
    ],
    salesPains: [
      'Traffic without conversion',
      'Manual order follow-up after bank transfer',
      'Catalog and ops out of sync during campaigns',
    ],
    integrationNotes: [
      'Order events: created → paid → fulfilled → refunded',
      'Catalog sync uses SKU as durable key',
      'Abandonment webhooks feed CRM recovery stages only (no card data)',
      'Bank-transfer orders need payment_reference before fulfillment',
    ],
    auditLenses: [
      'Funnel conversion integrity',
      'Catalog / inventory truthfulness',
      'Fulfillment SLA realism',
      'Checkout + refund compliance posture',
    ],
    workflowNuances: [
      'Browse → cart → checkout → pay → fulfill → review ask',
      'Abandonment recovery after SLA window',
      'SKU class drives fulfillment routing',
    ],
    setupMilestones: [
      'Catalog sample SKUs live',
      'Paid order → fulfillment notify path green',
      'Abandonment recovery sequence dry-run',
    ],
  },

  real_estate: {
    categorySlug: 'real_estate',
    labelEn: 'Real estate',
    distinctiveTokens: [
      'listing',
      'showing',
      'buyer qualification',
      'MLS',
      'offer deadline',
      'commission split',
    ],
    complianceChecklist: [
      'Fair housing / anti-discrimination language on outreach templates',
      'Listing data accuracy and photo rights documented',
      'Buyer qualification criteria recorded before showings',
      'Offer deadline clocks owned in CRM with escalation',
      'Commission split / co-broke notes not mixed into marketing copy',
    ],
    operationalRisks: [
      'Hot listings without rapid buyer follow-up',
      'Showing no-shows without SMS/email reminders',
      'Offer deadlines missed across dual agency handoffs',
      'MLS/listing status out of sync with CRM',
    ],
    kpiSet: [
      'Lead → showing booked conversion',
      'Showing show rate',
      'Offer response time vs deadline',
      'Days on market for exclusive listings',
    ],
    discoveryQuestions: [
      'How fast do buyer leads get a first human response?',
      'Where do listing statuses sync from (MLS, portal, sheets)?',
      'Who owns offer deadline clocks?',
      'What buyer qualification is required before a showing?',
    ],
    salesPains: [
      'Buyer leads go cold overnight',
      'Showing logistics eat agent hours',
      'Offer paperwork stalls after verbal interest',
    ],
    integrationNotes: [
      'Listing ID correlates CRM, portal, and outreach',
      'Showing reminders use consent-checked SMS/email only',
      'Offer deadline events must be timezone-aware',
      'Do not push commission splits into public webhook payloads',
    ],
    auditLenses: [
      'Lead response SLA for buyers and sellers',
      'Listing data integrity vs MLS',
      'Showing operations reliability',
      'Offer / deadline control maturity',
    ],
    workflowNuances: [
      'Lead → qualify → showing → feedback → offer → close',
      'No showing book without qualification notes',
      'Escalate if offer deadline < 24h without owner',
    ],
    setupMilestones: [
      'Listing pipeline stages live',
      'Showing reminder path tested',
      'Offer deadline SLA clock configured',
    ],
  },

  education: {
    categorySlug: 'education',
    labelEn: 'Education',
    distinctiveTokens: [
      'enrollment',
      'cohort',
      'attendance',
      'curriculum',
      'learner progress',
      'FERPA',
    ],
    complianceChecklist: [
      'FERPA / student-data minimization for CRM fields',
      'Guardian consent captured where required for minors',
      'Curriculum version attached to each cohort',
      'Attendance records retained per institutional policy',
      'Marketing lists separated from active learner rosters',
    ],
    operationalRisks: [
      'Enrollment drop-off between inquiry and paid seat',
      'Cohort start without complete attendance tooling',
      'Learner progress invisible to advisors',
      'Curriculum updates not versioned across cohorts',
    ],
    kpiSet: [
      'Inquiry → enrollment conversion',
      'Cohort fill rate by start date',
      'Attendance % by week',
      'Learner progress milestone completion',
    ],
    discoveryQuestions: [
      'Where do enrollments stall (payment, paperwork, placement)?',
      'How is attendance taken and who sees exceptions?',
      'What defines learner progress milestones?',
      'Which student fields must never enter marketing CRM?',
    ],
    salesPains: [
      'Inquiry volume without enrollment conversion',
      'Manual cohort onboarding checklists',
      'Parents/learners unclear on next steps after payment',
    ],
    integrationNotes: [
      'Enrollment ID keys billing, roster, and portal access',
      'Attendance webhooks must not include sensitive grades by default',
      'Cohort start events unlock curriculum pack artifacts',
      'Separate guardian vs learner notification preferences',
    ],
    auditLenses: [
      'Enrollment funnel integrity',
      'Student-data privacy posture (FERPA-minded)',
      'Attendance and progress visibility',
      'Curriculum version control readiness',
    ],
    workflowNuances: [
      'Inquiry → advise → enroll → onboarding → attendance → progress',
      'Paid enrollment required before roster unlock',
      'Advisor escalate if attendance < threshold Week 2',
    ],
    setupMilestones: [
      'Enrollment payment → roster unlock path live',
      'Cohort onboarding checklist signed',
      'Attendance exception owner named',
    ],
  },

  marketing: {
    categorySlug: 'marketing',
    labelEn: 'Marketing',
    distinctiveTokens: [
      'attribution',
      'campaign ROI',
      'lead scoring',
      'UTM',
      'pipeline velocity',
      'creative brief',
    ],
    complianceChecklist: [
      'Consent + unsubscribe for outreach domains',
      'UTM / attribution taxonomy documented',
      'Claim substantiation for campaign creative',
      'Client reporting cadence and data sources agreed',
      'Warmup / domain reputation guardrails before send',
    ],
    operationalRisks: [
      'Spend without closed-loop attribution',
      'Lead scoring ignored by sales handoff',
      'Creative briefs drift from landing promises',
      'Pipeline velocity collapses after MQL handoff',
    ],
    kpiSet: [
      'Cost per qualified lead',
      'MQL → SQL conversion',
      'Campaign ROI by channel',
      'Pipeline velocity (days in stage)',
    ],
    discoveryQuestions: [
      'Which channels have proven attribution today?',
      'How are MQLs scored and accepted by sales?',
      'What is the creative brief → landing approval path?',
      'Where does reporting break between ads and CRM?',
    ],
    salesPains: [
      'Agency clients demand ROI proof weekly',
      'Leads not followed up after campaign spikes',
      'Creative and CRM stages out of sync',
    ],
    integrationNotes: [
      'UTM parameters required on all paid/owned links',
      'Lead score events sync into CRM stages within SLA',
      'Campaign IDs correlate ads, landing, and CRM source tags',
      'Suppress outreach on unsubscribed / bounced contacts',
    ],
    auditLenses: [
      'Attribution completeness',
      'Lead scoring ↔ sales acceptance',
      'Creative / landing consistency',
      'Domain warmup and deliverability posture',
    ],
    workflowNuances: [
      'Hunt → score → outreach → CRM → analytics',
      'No sequence send without lead score threshold',
      'Weekly ROI review gate before budget increase',
    ],
    setupMilestones: [
      'UTM taxonomy live',
      'Lead scoring → CRM stage map approved',
      'First campaign ROI snapshot scheduled',
    ],
  },
};

/** Compact seed → full substance (majority of catalog beyond the 7 deep overlays). */
type SubstanceSeed = {
  labelEn: string;
  tokens: string[];
  compliance: string[];
  risks: string[];
  kpis: string[];
  discovery: string[];
  pains: string[];
  integrations: string[];
  lenses: string[];
  workflows: string[];
  milestones: string[];
};

function expandSubstanceSeed(slug: string, seed: SubstanceSeed): IndustryDocumentSubstance {
  return {
    categorySlug: slug,
    labelEn: seed.labelEn,
    distinctiveTokens: seed.tokens,
    complianceChecklist: seed.compliance,
    operationalRisks: seed.risks,
    kpiSet: seed.kpis,
    discoveryQuestions: seed.discovery,
    salesPains: seed.pains,
    integrationNotes: seed.integrations,
    auditLenses: seed.lenses,
    workflowNuances: seed.workflows,
    setupMilestones: seed.milestones,
  };
}

const SUBSTANCE_SEEDS: Record<string, SubstanceSeed> = {
  // —— Freelance platform categories ——
  admin_support: {
    labelEn: 'Admin Support',
    tokens: ['virtual assistant', 'inbox triage', 'calendar management', 'SOP checklist', 'task SLA'],
    compliance: [
      'PII access limited to assigned VA roles',
      'Client credential vault policy (no shared passwords in chat)',
      'Outbound email send-as authorization documented',
    ],
    risks: [
      'Inbox backlog without triage SLA',
      'Calendar double-books across timezones',
      'SOPs drift when VA turnover happens',
    ],
    kpis: ['Inbox first-response time', 'Task completion SLA %', 'Calendar conflict rate'],
    discovery: [
      'Which inboxes and tools must the VA own day-one?',
      'What is the escalation path for VIP clients?',
      'Where do SOPs live today?',
    ],
    pains: ['Founder stuck in inbox', 'Missed follow-ups', 'No documented handoff for assistants'],
    integrations: [
      'Tag tasks with client + source channel',
      'Calendar webhooks for conflict detection',
      'Shared vault tokens scoped per client workspace',
    ],
    lenses: ['Inbox hygiene', 'Calendar reliability', 'SOP coverage'],
    workflows: ['Triage → assign → execute → confirm → log', 'VIP escalate within SLA'],
    milestones: ['Inbox triage live', 'Calendar ownership mapped', 'SOP pack signed'],
  },
  ai_data: {
    labelEn: 'AI & Data',
    tokens: ['model evaluation', 'RAG pipeline', 'data lineage', 'prompt governance', 'hallucination rate'],
    compliance: [
      'Training/eval data provenance recorded',
      'PII redaction before model context',
      'Prompt/version change log retained',
    ],
    risks: [
      'Hallucinations shipped without human review',
      'Stale embeddings after source updates',
      'Unclear ownership of model quality gates',
    ],
    kpis: ['Eval pass rate', 'Hallucination / escalation rate', 'RAG retrieval precision@k'],
    discovery: [
      'Which workflows need human-in-the-loop vs auto?',
      'What is the source-of-truth corpus?',
      'How are model failures detected today?',
    ],
    pains: ['AI demos that fail in production', 'No eval harness', 'Data quality blocking automation'],
    integrations: [
      'Version prompts + retrieval configs with deploy tags',
      'Log every AI decision with input hash (no raw PII)',
      'Dead-letter low-confidence outputs to review queue',
    ],
    lenses: ['Eval rigor', 'Data lineage', 'Human override coverage'],
    workflows: ['Ingest → embed → retrieve → generate → review → ship'],
    milestones: ['Eval suite baseline', 'RAG corpus indexed', 'Human review queue live'],
  },
  audio_music: {
    labelEn: 'Audio & Music',
    tokens: ['session stems', 'loudness LUFS', 'rights clearance', 'podcast episode', 'mix revision'],
    compliance: [
      'Music rights / licensing attested per deliverable',
      'Talent release forms stored with project ID',
      'Loudness targets documented (e.g. podcast LUFS)',
    ],
    risks: [
      'Revision loops without scope gates',
      'Rights clearance missing before publish',
      'Stem version chaos across collaborators',
    ],
    kpis: ['Revision cycles per episode', 'On-time delivery %', 'Rights clearance lead time'],
    discovery: [
      'What loudness / format specs are required?',
      'Who owns final approval?',
      'Where are stems and licenses stored?',
    ],
    pains: ['Endless mix revisions', 'Lost stems', 'Publish blocked on licensing'],
    integrations: [
      'Project ID correlates stems, contracts, and invoices',
      'Approval webhook unlocks delivery folder',
      'Do not put unlicensed assets into public CDN',
    ],
    lenses: ['Rights posture', 'Revision control', 'Delivery format compliance'],
    workflows: ['Brief → record → edit → mix → approve → deliver'],
    milestones: ['Spec sheet agreed', 'Stem vault ready', 'First approved episode delivered'],
  },
  business_consulting: {
    labelEn: 'Business & Consulting',
    tokens: ['operating model', 'stakeholder map', 'OKR cascade', 'change readiness', 'decision log'],
    compliance: [
      'Client confidentiality / NDA scope for artifacts',
      'Recommendation evidence links retained',
      'Decision log owners named for each workstream',
    ],
    risks: [
      'Recommendations without owner or KPI',
      'Stakeholder misalignment kills adoption',
      'Change fatigue without readiness plan',
    ],
    kpis: ['Recommendation adoption %', 'Time-to-decision', 'OKR progress at 30/60/90'],
    discovery: [
      'Who can approve operating-model changes?',
      'What OKRs matter this quarter?',
      'Where do prior consulting artifacts live?',
    ],
    pains: ['Shelfware decks', 'No decision owners', 'Initiatives stall after kickoff'],
    integrations: [
      'Decision log events sync to project tracker',
      'OKR IDs correlate workshops and deliverables',
      'Portal hosts living operating model, not one-off PDFs only',
    ],
    lenses: ['Decision clarity', 'Adoption readiness', 'OKR alignment'],
    workflows: ['Diagnose → design → decide → pilot → scale'],
    milestones: ['Stakeholder map signed', 'Decision log live', 'Pilot OKRs baseline'],
  },
  community_moderation: {
    labelEn: 'Community & Moderation',
    tokens: ['moderation queue', 'toxicity score', 'community guidelines', 'escalation ladder', 'trust & safety'],
    compliance: [
      'Community guidelines published and versioned',
      'Escalation path for illegal / harmful content',
      'Moderator access audit trail',
    ],
    risks: [
      'Toxic spikes without queue coverage',
      'Inconsistent enforcement across channels',
      'Burnout from unprioritized moderation load',
    ],
    kpis: ['Median moderation response time', 'Repeat offender rate', 'Appeals overturn %'],
    discovery: [
      'Which channels need 24/7 vs business-hours coverage?',
      'What is the escalation ladder today?',
      'How are appeals handled?',
    ],
    pains: ['Community trust erosion', 'Moderator overload', 'Unclear guidelines'],
    integrations: [
      'Moderation tickets carry channel + message refs',
      'Auto-flag toxic content into review queue',
      'Suppress banned users across connected channels',
    ],
    lenses: ['Trust & safety coverage', 'Guideline clarity', 'Moderator capacity'],
    workflows: ['Flag → triage → action → notify → appeal'],
    milestones: ['Guidelines published', 'Moderation queue live', 'Escalation ladder tested'],
  },
  creator_services: {
    labelEn: 'Creator Services',
    tokens: ['content calendar', 'sponsorship brief', 'platform analytics', 'audience retention', 'creator CRM'],
    compliance: [
      'Sponsorship disclosure rules followed per platform',
      'Brand-safe content checklist before publish',
      'Audience data minimization for CRM sync',
    ],
    risks: [
      'Missed publish windows',
      'Sponsorship briefs without deliverable SLAs',
      'Analytics siloed per platform',
    ],
    kpis: ['Publish cadence adherence', 'Audience retention', 'Sponsorship on-time delivery'],
    discovery: [
      'What is the weekly content cadence?',
      'How are sponsorships scoped and billed?',
      'Which analytics matter for brand deals?',
    ],
    pains: ['Inconsistent posting', 'Chaotic brand deals', 'No single creator CRM'],
    integrations: [
      'Content calendar IDs link assets + captions + publish status',
      'Sponsorship invoices attach deliverable checklist',
      'Pull platform analytics into weekly ROI snapshot',
    ],
    lenses: ['Cadence reliability', 'Sponsorship ops', 'Audience insight'],
    workflows: ['Ideate → produce → approve → publish → measure'],
    milestones: ['Calendar live', 'Sponsorship brief template', 'Analytics snapshot scheduled'],
  },
  customer_service: {
    labelEn: 'Customer Service',
    tokens: ['ticket SLA', 'CSAT', 'deflection rate', 'knowledge base', 'escalation tier'],
    compliance: [
      'Customer PII retention for tickets documented',
      'Escalation tiers and after-hours coverage defined',
      'Refund / complaint handling policy linked',
    ],
    risks: [
      'SLA breaches without owner alerts',
      'Knowledge base stale → repeat tickets',
      'Escalations lost between tiers',
    ],
    kpis: ['First response SLA', 'CSAT', 'Deflection rate', 'Reopen rate'],
    discovery: [
      'What channels are in scope (email, chat, phone)?',
      'What is the current CSAT and top ticket drivers?',
      'How are refunds approved?',
    ],
    pains: ['Slow responses', 'Agents reinvent answers', 'VIP escalations ignored'],
    integrations: [
      'Ticket ID correlates CRM + billing + portal',
      'KB article suggestions from ticket topic tags',
      'SLA breach webhooks page on-call owner',
    ],
    lenses: ['SLA reliability', 'Knowledge freshness', 'Escalation integrity'],
    workflows: ['Intake → classify → resolve / escalate → CSAT → close'],
    milestones: ['Ticket SLA clocks live', 'KB seed articles published', 'Escalation tier map signed'],
  },
  design_creative: {
    labelEn: 'Design & Creative',
    tokens: ['brand system', 'design critique', 'asset versioning', 'creative brief', 'handoff specs'],
    compliance: [
      'Brand asset usage rights documented',
      'Accessibility contrast checks for UI deliverables',
      'Source file ownership / license clarified',
    ],
    risks: [
      'Briefs without success criteria',
      'Version chaos in shared drives',
      'Handoff specs incomplete for engineering',
    ],
    kpis: ['Revision cycles per brief', 'On-brief first-pass %', 'Handoff defect rate'],
    discovery: [
      'Where does the brand system live?',
      'Who approves creative?',
      'What handoff format does eng expect?',
    ],
    pains: ['Endless revisions', 'Lost source files', 'Dev rebuilds from screenshots'],
    integrations: [
      'Brief ID links Figma/source + approvals + invoice',
      'Export tokens / specs into engineering handoff pack',
      'Block publish until accessibility checklist Pass',
    ],
    lenses: ['Brief clarity', 'Version control', 'Handoff quality'],
    workflows: ['Brief → concepts → critique → revise → handoff'],
    milestones: ['Brand system linked', 'Critique cadence set', 'Handoff pack template live'],
  },
  development_it: {
    labelEn: 'Development & IT',
    tokens: ['CI/CD pipeline', 'incident runbook', 'SLA uptime', 'code review gate', 'environment parity'],
    compliance: [
      'Secret scanning on CI required',
      'Access least-privilege for prod environments',
      'Change / incident runbooks versioned',
    ],
    risks: [
      'Prod changes without rollback plan',
      'Environment drift breaks releases',
      'Incidents without clear severity matrix',
    ],
    kpis: ['Deploy success rate', 'MTTR', 'Change failure rate', 'Uptime SLA'],
    discovery: [
      'What is the current CI/CD path to prod?',
      'Who owns incident response?',
      'How are secrets and access managed?',
    ],
    pains: ['Fear of deploy', 'Firefighting without runbooks', 'No staging parity'],
    integrations: [
      'Deploy tags correlate commits + tickets + incidents',
      'Alert webhooks create incident tickets automatically',
      'Block merge without required code-review checks',
    ],
    lenses: ['Release reliability', 'Incident readiness', 'Access hygiene'],
    workflows: ['Plan → build → review → deploy → observe → improve'],
    milestones: ['CI green path', 'Staging parity check', 'Incident runbook drill'],
  },
  engineering_architecture: {
    labelEn: 'Engineering & Architecture',
    tokens: ['drawing revision', 'BIM coordination', 'RFIs', 'permit package', 'spec sheet'],
    compliance: [
      'Drawing revision control with stamp/date',
      'Permit package completeness checklist',
      'Consultant coordination matrix owned',
    ],
    risks: [
      'Stale drawings used on site',
      'RFI backlog delays construction',
      'Spec conflicts across disciplines',
    ],
    kpis: ['RFI cycle time', 'Revision turnaround', 'Permit resubmittal count'],
    discovery: [
      'Where is the current drawing set truth?',
      'How are RFIs tracked?',
      'Which jurisdictions govern permits?',
    ],
    pains: ['Version chaos', 'Slow RFIs', 'Permit surprises'],
    integrations: [
      'Drawing revision IDs on all field packages',
      'RFI tickets link sheets + markups',
      'Do not publish unstamped sets to contractors',
    ],
    lenses: ['Revision integrity', 'Coordination maturity', 'Permit readiness'],
    workflows: ['Program → design → coordinate → permit → issue for construction'],
    milestones: ['Revision register live', 'RFI workflow tested', 'Permit checklist signed'],
  },
  engineering_science: {
    labelEn: 'Engineering & Science',
    tokens: ['experiment protocol', 'lab notebook', 'reproducibility', 'data package', 'peer review'],
    compliance: [
      'Protocol version locked before runs',
      'Raw data retention for audit/reproducibility',
      'Safety / ethics approvals attached when required',
    ],
    risks: [
      'Irreproducible results from undocumented steps',
      'Data packages incomplete for handoff',
      'Peer review skipped under deadline pressure',
    ],
    kpis: ['Protocol adherence %', 'Reproducibility pass rate', 'Data package completeness'],
    discovery: [
      'What protocols must be versioned?',
      'Where do raw datasets live?',
      'Who signs off before publish?',
    ],
    pains: ['Lost lab notes', 'Unreproducible claims', 'Messy data handoffs'],
    integrations: [
      'Experiment ID keys protocol, notebook, and datasets',
      'Block publish until peer-review checklist Pass',
      'Export data package with checksums',
    ],
    lenses: ['Protocol rigor', 'Data integrity', 'Review gates'],
    workflows: ['Hypothesis → protocol → run → analyze → review → package'],
    milestones: ['Protocol template live', 'Data vault path set', 'Review checklist signed'],
  },
  hr_recruiting: {
    labelEn: 'HR & Recruiting',
    tokens: ['candidate pipeline', 'interview scorecard', 'offer letter', 'EEO tracking', 'time-to-hire'],
    compliance: [
      'EEO / anti-bias process documented',
      'Candidate PII retention limits enforced',
      'Offer letter version control with approvals',
    ],
    risks: [
      'Scorecards ignored → biased hiring',
      'Slow time-to-hire loses candidates',
      'Offer letters sent without approval',
    ],
    kpis: ['Time-to-hire', 'Offer accept rate', 'Pipeline stage conversion', 'Scorecard completion %'],
    discovery: [
      'What roles are open and who owns hiring?',
      'How are interviews scored today?',
      'Where do offer approvals live?',
    ],
    pains: ['Ghosted candidates', 'Inconsistent interviews', 'Offer chaos'],
    integrations: [
      'Candidate ID correlates ATS, interviews, and offers',
      'Block offer send without approval gate',
      'Suppress marketing sequences on active candidates',
    ],
    lenses: ['Pipeline hygiene', 'Fairness / scorecard use', 'Offer control'],
    workflows: ['Source → screen → interview → score → offer → onboard'],
    milestones: ['Scorecard templates live', 'Approval gate for offers', 'Pipeline SLA clocks set'],
  },
  localization: {
    labelEn: 'Localization',
    tokens: ['locale glossary', 'TM leverage', 'LQA score', 'string freeze', 'i18n keys'],
    compliance: [
      'Locale glossary / style guide approved',
      'String freeze policy before LQA',
      'PII not embedded in translation memories unnecessarily',
    ],
    risks: [
      'Inconsistent terminology across locales',
      'Late string changes after freeze',
      'LQA finds critical defects post-release',
    ],
    kpis: ['TM leverage %', 'LQA score', 'On-time locale delivery'],
    discovery: [
      'Which locales are in scope?',
      'Where is the glossary?',
      'What is the string freeze process?',
    ],
    pains: ['Term inconsistency', 'Last-minute string dumps', 'Failed LQA'],
    integrations: [
      'i18n keys correlate source → TM → locale files',
      'Block release if LQA below threshold',
      'Webhook notify linguists on string freeze',
    ],
    lenses: ['Glossary discipline', 'Freeze adherence', 'LQA rigor'],
    workflows: ['Extract → translate → review → LQA → release'],
    milestones: ['Glossary approved', 'String freeze calendar', 'LQA rubric signed'],
  },
  photography: {
    labelEn: 'Photography',
    tokens: ['shot list', 'retouch round', 'color profile', 'model release', 'delivery gallery'],
    compliance: [
      'Model / property releases stored with shoot ID',
      'Color profile and delivery specs agreed',
      'Usage rights for client vs portfolio clarified',
    ],
    risks: [
      'Retouch rounds without scope',
      'Missing releases block publish',
      'Wrong color profile on delivery',
    ],
    kpis: ['Retouch rounds per shoot', 'On-time gallery delivery', 'Release completeness'],
    discovery: [
      'What is the shot list and must-have frames?',
      'Who approves retouch?',
      'Where are releases stored?',
    ],
    pains: ['Endless retouch', 'Lost releases', 'Client confused on usage rights'],
    integrations: [
      'Shoot ID links shot list, selects, and invoices',
      'Gallery unlock after payment confirm',
      'Never publish without release checklist Pass',
    ],
    lenses: ['Rights completeness', 'Retouch control', 'Delivery specs'],
    workflows: ['Brief → shoot → select → retouch → deliver'],
    milestones: ['Shot list signed', 'Release vault ready', 'Delivery gallery template'],
  },
  product_project_management: {
    labelEn: 'Product & Project Management',
    tokens: ['backlog grooming', 'sprint goal', 'RAID log', 'definition of done', 'dependency map'],
    compliance: [
      'Definition of done published per workstream',
      'RAID log reviewed on cadence',
      'Stakeholder RACI for go-live decisions',
    ],
    risks: [
      'Scope creep without change control',
      'Hidden dependencies slip dates',
      'Sprint goals ignored mid-cycle',
    ],
    kpis: ['Sprint goal hit rate', 'Carry-over story points', 'RAID aging', 'On-time milestone %'],
    discovery: [
      'What is the current backlog tool of truth?',
      'Who can change scope?',
      'What are the next three milestones?',
    ],
    pains: ['Missed dates', 'Unclear ownership', 'Status theater without DoD'],
    integrations: [
      'Ticket IDs correlate commits, docs, and releases',
      'Milestone webhooks update client portal status',
      'Change requests require approval before sprint pull-in',
    ],
    lenses: ['Scope control', 'Dependency visibility', 'DoD adherence'],
    workflows: ['Discover → prioritize → sprint → review → release'],
    milestones: ['DoD published', 'RAID log live', 'First sprint goal hit'],
  },
  sales: {
    labelEn: 'Sales',
    tokens: ['pipeline stages', 'MEDDIC', 'quota attainment', 'objection handling', 'next-step commit'],
    compliance: [
      'CRM stage definitions enforced (no skipping)',
      'Discount approval matrix documented',
      'Outbound consent / suppression lists respected',
    ],
    risks: [
      'Fake pipeline without next steps',
      'Discounting without approval',
      'Handoffs to CS without context',
    ],
    kpis: ['Win rate', 'Pipeline coverage', 'Quota attainment', 'Stage conversion'],
    discovery: [
      'What is the sales process / methodology?',
      'Who approves discounts?',
      'Where do deals stall?',
    ],
    pains: ['Unpredictable forecast', 'CRM ignored', 'Deals die after demo'],
    integrations: [
      'Opportunity ID keys calls, proposals, and invoices',
      'Stage changes require next-step commit field',
      'Won deals auto-create fulfillment kickoff',
    ],
    lenses: ['Pipeline hygiene', 'Forecast integrity', 'Handoff quality'],
    workflows: ['Prospect → qualify → demo → propose → close → handoff'],
    milestones: ['Stage definitions live', 'Discount matrix signed', 'Handoff checklist tested'],
  },
  video_animation: {
    labelEn: 'Video & Animation',
    tokens: ['storyboard', 'animatic', 'frame rate', 'color grade', 'delivery codec'],
    compliance: [
      'Music / footage licenses attached to project',
      'Delivery codec and frame-rate spec agreed',
      'Talent releases stored with cut ID',
    ],
    risks: [
      'Storyboard skipped → costly reshoots',
      'Wrong delivery codec rejects upload',
      'License gaps before launch',
    ],
    kpis: ['Revision rounds per cut', 'On-spec first delivery %', 'License completeness'],
    discovery: [
      'What platforms and codecs are required?',
      'Who approves storyboard and final cut?',
      'Where do licensed assets live?',
    ],
    pains: ['Scope creep in revisions', 'Last-minute music swaps', 'Failed platform uploads'],
    integrations: [
      'Cut ID correlates storyboard, edits, and invoices',
      'Block final delivery until license checklist Pass',
      'Publish webhook after client approval',
    ],
    lenses: ['Storyboard discipline', 'Spec compliance', 'Rights readiness'],
    workflows: ['Brief → storyboard → animatic → produce → grade → deliver'],
    milestones: ['Storyboard approved', 'Codec spec locked', 'License vault ready'],
  },
  web3: {
    labelEn: 'Web3',
    tokens: ['smart contract audit', 'wallet connect', 'gas estimation', 'multisig', 'mainnet deploy'],
    compliance: [
      'Smart contract audit / review evidence before mainnet',
      'Multisig ownership and key ceremony documented',
      'Testnet dry-run signed before mainnet deploy',
    ],
    risks: [
      'Unaudited contracts on mainnet',
      'Key custody ambiguity',
      'Gas spikes break UX without estimation',
    ],
    kpis: ['Audit findings closed', 'Testnet success rate', 'Mainnet incident count'],
    discovery: [
      'What chains and wallets are in scope?',
      'Who holds multisig keys?',
      'Has an audit been done?',
    ],
    pains: ['Fear of exploit', 'Broken wallet UX', 'Unclear deploy ownership'],
    integrations: [
      'Deploy tags correlate contracts, audits, and runbooks',
      'Wallet connect events never log seed phrases',
      'Block mainnet until audit checklist Pass',
    ],
    lenses: ['Audit posture', 'Key custody', 'Deploy readiness'],
    workflows: ['Design → testnet → audit → multisig → mainnet → monitor'],
    milestones: ['Testnet dry-run', 'Audit findings closed', 'Multisig ceremony done'],
  },
  writing_translation: {
    labelEn: 'Writing & Translation',
    tokens: ['editorial calendar', 'style guide', 'source language', 'proofreading pass', 'SEO brief'],
    compliance: [
      'Style guide / tone documented per client',
      'Plagiarism / originality checks for published pieces',
      'Source attribution for translated research',
    ],
    risks: [
      'Tone drift across writers',
      'SEO briefs ignored',
      'Translations without native review',
    ],
    kpis: ['On-brief acceptance %', 'Revision rounds', 'Publish cadence adherence'],
    discovery: [
      'Where is the style guide?',
      'What languages and SEO targets matter?',
      'Who does final proofreading?',
    ],
    pains: ['Inconsistent voice', 'Endless edits', 'Missed publish dates'],
    integrations: [
      'Doc ID links brief, draft, and CMS publish status',
      'SEO brief fields required before draft start',
      'Translation memory keys for recurring clients',
    ],
    lenses: ['Style consistency', 'Brief adherence', 'Publish reliability'],
    workflows: ['Brief → draft → edit → proof → publish'],
    milestones: ['Style guide linked', 'Editorial calendar live', 'Proof pass owner named'],
  },

  // —— Legacy SMB categories ——
  retail: {
    labelEn: 'Retail',
    tokens: ['POS sync', 'inventory turn', 'foot traffic', 'omnichannel', 'planogram'],
    compliance: [
      'Consumer refund / returns policy at POS and online',
      'Inventory accuracy cycle counts scheduled',
      'PCI scope minimized for card acceptance',
    ],
    risks: [
      'POS ↔ inventory drift',
      'Stockouts during campaigns',
      'Omnichannel promises exceed store capacity',
    ],
    kpis: ['Inventory accuracy %', 'Sell-through rate', 'Omnichannel order cycle time'],
    discovery: [
      'What POS and inventory systems are live?',
      'How are online and store stock reconciled?',
      'What is the returns process?',
    ],
    pains: ['Stockouts', 'Manual inventory counts', 'Channel conflict'],
    integrations: [
      'SKU is durable key across POS, ecommerce, and WMS',
      'Order events: created → paid → picked → shipped → returned',
      'Campaign tags must not bypass inventory reservation',
    ],
    lenses: ['Inventory truth', 'Omnichannel readiness', 'Returns control'],
    workflows: ['Demand → reserve → sell → fulfill → replenish'],
    milestones: ['SKU map approved', 'POS sync dry-run', 'Returns path documented'],
  },
  hospitality: {
    labelEn: 'Hospitality',
    tokens: ['reservation system', 'occupancy rate', 'guest journey', 'upsell attach', 'housekeeping SLA'],
    compliance: [
      'Guest data retention / privacy for reservations',
      'Food safety / allergen notes where applicable',
      'No-show and cancellation policy disclosed',
    ],
    risks: [
      'Overbooking without recovery playbook',
      'Housekeeping SLA misses peak days',
      'Guest complaints without owner',
    ],
    kpis: ['Occupancy rate', 'RevPAR / ADR proxy', 'Guest CSAT', 'Upsell attach rate'],
    discovery: [
      'What reservation / PMS is used?',
      'How are complaints escalated?',
      'What upsells work today?',
    ],
    pains: ['No-shows', 'Chaotic peak ops', 'Missed upsells'],
    integrations: [
      'Reservation ID keys guest CRM and billing',
      'Housekeeping task webhooks from checkout events',
      'Consent-checked SMS for confirmations only',
    ],
    lenses: ['Occupancy ops', 'Guest experience', 'Upsell discipline'],
    workflows: ['Inquire → book → pre-arrival → stay → review → rebook'],
    milestones: ['Reservation confirm path live', 'Housekeeping SLA set', 'Upsell script tested'],
  },
  construction: {
    labelEn: 'Construction',
    tokens: ['job site', 'change order', 'punch list', 'subcontractor', 'safety briefing'],
    compliance: [
      'Safety briefing / toolbox talk cadence documented',
      'Change order approval before extra work',
      'Subcontractor insurance evidence on file',
    ],
    risks: [
      'Scope creep via verbal change orders',
      'Punch list delays closeout',
      'Safety incidents without reporting path',
    ],
    kpis: ['Change order cycle time', 'Punch list close rate', 'On-time milestone %'],
    discovery: [
      'How are change orders approved today?',
      'Where do punch lists live?',
      'Who owns site safety reporting?',
    ],
    pains: ['Budget overruns', 'Lost change orders', 'Slow closeout'],
    integrations: [
      'Job ID correlates drawings, COs, and invoices',
      'Block extra billing without CO approval',
      'Daily report photos attach to job timeline',
    ],
    lenses: ['Change control', 'Safety posture', 'Closeout readiness'],
    workflows: ['Bid → contract → mobilize → execute → punch → close'],
    milestones: ['CO workflow live', 'Safety briefing cadence', 'Punch list template'],
  },
  logistics: {
    labelEn: 'Logistics',
    tokens: ['shipment tracking', 'carrier SLA', 'warehouse slot', 'POD proof', 'route optimization'],
    compliance: [
      'POD retention for disputed deliveries',
      'Hazmat / restricted goods handling if applicable',
      'Carrier SLA penalties tracked',
    ],
    risks: [
      'Lost tracking updates',
      'Warehouse slot congestion',
      'POD missing on high-value shipments',
    ],
    kpis: ['On-time delivery %', 'Scan compliance', 'POD capture rate', 'Exception aging'],
    discovery: [
      'Which carriers and WMS are in play?',
      'How are exceptions handled?',
      'What is the POD process?',
    ],
    pains: ['Blind shipments', 'Exception pileups', 'Customer “where is my order?”'],
    integrations: [
      'Tracking number is correlation key across carrier and CRM',
      'Exception webhooks create ops tickets',
      'POD images attach to delivery events',
    ],
    lenses: ['Tracking integrity', 'Exception ops', 'Carrier SLA realism'],
    workflows: ['Order → pick → ship → track → POD → exception close'],
    milestones: ['Tracking webhook live', 'Exception queue owned', 'POD checklist signed'],
  },
  beauty: {
    labelEn: 'Beauty',
    tokens: ['appointment book', 'treatment consent', 'product retail attach', 'no-show fee', 'stylist utilization'],
    compliance: [
      'Treatment consent forms retained',
      'Allergen / patch-test notes where required',
      'No-show fee policy disclosed at booking',
    ],
    risks: [
      'No-shows destroy utilization',
      'Consent missing for new treatments',
      'Retail attach ignored at checkout',
    ],
    kpis: ['Booking fill rate', 'No-show %', 'Stylist utilization', 'Retail attach rate'],
    discovery: [
      'What booking tool is used?',
      'How are consents captured?',
      'What retail attach goals exist?',
    ],
    pains: ['Empty chairs', 'Paper consents', 'Weak rebooking'],
    integrations: [
      'Appointment ID keys CRM, POS, and reminders',
      'Consent flag required before treatment start',
      'Rebook SMS only with marketing consent',
    ],
    lenses: ['Book utilization', 'Consent hygiene', 'Retail attach'],
    workflows: ['Book → remind → consult → treat → retail → rebook'],
    milestones: ['Online book live', 'Consent forms digital', 'Reminder path tested'],
  },
  fitness: {
    labelEn: 'Fitness',
    tokens: ['class capacity', 'membership freeze', 'PT utilization', 'check-in scan', 'churn risk'],
    compliance: [
      'Liability waiver collected before first visit',
      'Membership freeze / cancel policy disclosed',
      'Health notes minimized in CRM fields',
    ],
    risks: [
      'Overbooked classes',
      'Churn without win-back',
      'PT hours underutilized',
    ],
    kpis: ['Class fill rate', 'Membership churn', 'PT utilization', 'Check-in compliance'],
    discovery: [
      'How do members check in?',
      'What drives churn today?',
      'How is PT booked and billed?',
    ],
    pains: ['Empty classes', 'Silent churn', 'Manual check-ins'],
    integrations: [
      'Member ID keys access, billing, and CRM',
      'Class capacity enforced at booking',
      'Churn-risk tags feed win-back sequences',
    ],
    lenses: ['Capacity planning', 'Churn control', 'PT economics'],
    workflows: ['Lead → trial → join → check-in → engage → renew'],
    milestones: ['Waiver digital', 'Check-in scan live', 'Churn win-back dry-run'],
  },
  agriculture: {
    labelEn: 'Agriculture',
    tokens: ['crop cycle', 'field sensor', 'traceability lot', 'harvest window', 'input inventory'],
    compliance: [
      'Lot traceability for food-safety recalls',
      'Agrochemical application logs retained',
      'Worker safety briefings documented',
    ],
    risks: [
      'Missed harvest windows',
      'Input inventory stockouts',
      'Traceability gaps on lots',
    ],
    kpis: ['Yield vs plan', 'Lot traceability completeness', 'Input waste %'],
    discovery: [
      'How are fields and lots identified?',
      'What sensors / logs exist today?',
      'Who owns harvest scheduling?',
    ],
    pains: ['Paper field logs', 'Recall fear', 'Weather-driven chaos'],
    integrations: [
      'Lot ID correlates field, inputs, and shipments',
      'Sensor alerts create ops tasks',
      'Block ship if traceability checklist incomplete',
    ],
    lenses: ['Traceability', 'Harvest timing', 'Input control'],
    workflows: ['Plan → plant → monitor → harvest → pack → ship'],
    milestones: ['Lot ID scheme live', 'Input inventory baseline', 'Traceability dry-run'],
  },
  automotive: {
    labelEn: 'Automotive',
    tokens: ['RO repair order', 'parts ETA', 'bay utilization', 'OEM recall', 'test drive'],
    compliance: [
      'OEM recall campaigns tracked to VIN',
      'Customer authorization before extra repairs',
      'Warranty vs customer-pay split documented',
    ],
    risks: [
      'Parts ETA slips stall bays',
      'Unauthorized upsells damage trust',
      'Recall work missed on service visits',
    ],
    kpis: ['Bay utilization', 'RO cycle time', 'Parts ETA accuracy', 'CSI / CSAT'],
    discovery: [
      'What DMS / RO system is used?',
      'How are parts ordered and tracked?',
      'How are recalls handled?',
    ],
    pains: ['Cars sitting for parts', 'Advisor overload', 'Missed recalls'],
    integrations: [
      'VIN + RO ID correlate parts, labor, and invoices',
      'Customer auth required before adding lines',
      'Recall campaigns flag open ROs',
    ],
    lenses: ['RO throughput', 'Parts reliability', 'Recall compliance'],
    workflows: ['Appt → RO → diagnose → auth → repair → QC → deliver'],
    milestones: ['RO stages live', 'Parts ETA alerts', 'Recall flag tested'],
  },
  manufacturing: {
    labelEn: 'Manufacturing',
    tokens: ['BOM', 'work order', 'OEE', 'quality hold', 'MRP'],
    compliance: [
      'Quality hold / release authority documented',
      'BOM revision control',
      'Traceability from lot to finished goods',
    ],
    risks: [
      'BOM drift causes scrap',
      'Quality holds without clear owners',
      'MRP signals ignored → stockouts',
    ],
    kpis: ['OEE', 'First-pass yield', 'Work order cycle time', 'Scrap rate'],
    discovery: [
      'Where is BOM truth?',
      'How are quality holds released?',
      'What MRP / MES is used?',
    ],
    pains: ['Scrap surprises', 'Tribal process knowledge', 'Late work orders'],
    integrations: [
      'Work order ID keys materials, labor, and QC',
      'Block ship on quality hold',
      'BOM revision events notify production',
    ],
    lenses: ['BOM integrity', 'Quality control', 'OEE visibility'],
    workflows: ['Plan → issue WO → produce → QC → release → ship'],
    milestones: ['BOM revision register', 'Quality hold workflow', 'OEE baseline'],
  },
  technology: {
    labelEn: 'Technology',
    tokens: ['product roadmap', 'SLA uptime', 'on-call rotation', 'feature flag', 'customer success handoff'],
    compliance: [
      'Security review gate for material releases',
      'Customer data processing addendum when needed',
      'On-call / incident severity matrix published',
    ],
    risks: [
      'Roadmap without customer success feedback',
      'Feature flags left half-rolled',
      'On-call burnout without ownership',
    ],
    kpis: ['Uptime SLA', 'Release success rate', 'Time-to-mitigate incidents', 'NRR / expansion'],
    discovery: [
      'What is the roadmap cadence?',
      'Who owns on-call?',
      'How do CS issues become backlog?',
    ],
    pains: ['Firefighting', 'Vague roadmap', 'CS ↔ eng gap'],
    integrations: [
      'Issue IDs correlate incidents, flags, and releases',
      'CS tickets can spawn backlog items with templates',
      'Feature flag cleanup tasks auto-create after rollouts',
    ],
    lenses: ['Release safety', 'On-call maturity', 'CS feedback loop'],
    workflows: ['Discover → build → flag → release → observe → learn'],
    milestones: ['Severity matrix live', 'Flag hygiene policy', 'CS→backlog path tested'],
  },
  media: {
    labelEn: 'Media',
    tokens: ['editorial slate', 'embargo', 'rights window', 'audience segment', 'syndication'],
    compliance: [
      'Embargo / rights window tracked per asset',
      'Attribution and licensing for third-party content',
      'Correction / takedown process documented',
    ],
    risks: [
      'Embargo breaks',
      'Rights windows expire unnoticed',
      'Syndication without tracking',
    ],
    kpis: ['On-time publish %', 'Embargo incidents', 'Rights renewal lead time'],
    discovery: [
      'How is the editorial slate managed?',
      'Who owns rights renewals?',
      'What syndication partners exist?',
    ],
    pains: ['Missed publish slots', 'Rights panic', 'Scattered assets'],
    integrations: [
      'Asset ID keys slate, rights, and CMS',
      'Embargo clocks alert owners',
      'Block publish if rights window expired',
    ],
    lenses: ['Slate discipline', 'Rights control', 'Syndication hygiene'],
    workflows: ['Pitch → assign → produce → legal/rights → publish → syndicate'],
    milestones: ['Slate tool live', 'Rights register', 'Embargo alert tested'],
  },
  nonprofit: {
    labelEn: 'Nonprofit',
    tokens: ['donor stewardship', 'grant reporting', 'campaign appeal', 'restricted funds', 'volunteer shift'],
    compliance: [
      'Restricted vs unrestricted fund tracking',
      'Donor privacy / opt-out honored',
      'Grant report deadlines owned in CRM',
    ],
    risks: [
      'Restricted funds misallocated',
      'Grant reports late',
      'Donor fatigue from over-mailing',
    ],
    kpis: ['Donor retention', 'Grant on-time reporting %', 'Cost per dollar raised'],
    discovery: [
      'How are restricted funds tagged?',
      'What grant deadlines are upcoming?',
      'How do volunteers get scheduled?',
    ],
    pains: ['Spreadsheet fundraising', 'Missed grant reports', 'Volunteer no-shows'],
    integrations: [
      'Donor ID keys gifts, appeals, and receipts',
      'Grant deadlines create tasks with evidence folders',
      'Volunteer shifts sync to calendar with reminders',
    ],
    lenses: ['Fund integrity', 'Donor trust', 'Grant readiness'],
    workflows: ['Appeal → gift → thank → steward → report → renew'],
    milestones: ['Fund tags live', 'Grant deadline calendar', 'Stewardship sequence dry-run'],
  },
  government: {
    labelEn: 'Government',
    tokens: ['case number', 'FOIA request', 'procurement lane', 'citizen portal', 'records retention'],
    compliance: [
      'Records retention schedule enforced',
      'FOIA / public-records request SLA tracked',
      'Procurement lane documentation complete',
    ],
    risks: [
      'Missed FOIA deadlines',
      'Citizen requests without case numbers',
      'Procurement gaps delay vendors',
    ],
    kpis: ['FOIA on-time %', 'Citizen case cycle time', 'Portal self-serve rate'],
    discovery: [
      'Which request types need case numbers?',
      'What is the FOIA SLA?',
      'Where do retention schedules live?',
    ],
    pains: ['Paper queues', 'FOIA panic', 'Low portal adoption'],
    integrations: [
      'Case number correlates portal, email, and records',
      'FOIA clocks escalate owners',
      'Never put restricted data in public webhooks',
    ],
    lenses: ['Records compliance', 'Citizen experience', 'Procurement readiness'],
    workflows: ['Intake → classify → route → resolve → retain → audit'],
    milestones: ['Case numbering live', 'FOIA SLA clocks', 'Portal FAQ published'],
  },
  energy: {
    labelEn: 'Energy',
    tokens: ['outage ticket', 'meter data', 'safety lockout', 'grid interconnection', 'compliance filing'],
    compliance: [
      'Safety lockout / tagout procedures documented',
      'Regulatory filing calendar owned',
      'Meter data integrity controls',
    ],
    risks: [
      'Outage tickets without field status',
      'Missed compliance filings',
      'Unsafe work without lockout evidence',
    ],
    kpis: ['Outage MTTR', 'Filing on-time %', 'Lockout checklist completion'],
    discovery: [
      'How are outages reported and closed?',
      'What filings are due this quarter?',
      'Where is meter data stored?',
    ],
    pains: ['Blind field status', 'Filing fire drills', 'Safety paperwork gaps'],
    integrations: [
      'Outage ticket IDs key field updates and customer notices',
      'Filing deadlines create evidence tasks',
      'Block energize without lockout checklist Pass',
    ],
    lenses: ['Safety control', 'Outage ops', 'Filing readiness'],
    workflows: ['Detect → dispatch → isolate → repair → restore → report'],
    milestones: ['Outage workflow live', 'Filing calendar', 'Lockout checklist signed'],
  },
  travel: {
    labelEn: 'Travel',
    tokens: ['itinerary', 'PNR', 'supplier confirm', 'traveler preference', 'disruption recovery'],
    compliance: [
      'Traveler PII minimization in shared itineraries',
      'Supplier confirmation numbers retained',
      'Cancellation / change fee policy disclosed',
    ],
    risks: [
      'PNRs without supplier confirms',
      'Disruption without recovery playbook',
      'Preference mismatches on group travel',
    ],
    kpis: ['Booking accuracy', 'Disruption recovery time', 'Traveler CSAT'],
    discovery: [
      'What GDS / booking tools are used?',
      'How are disruptions handled?',
      'Where do traveler preferences live?',
    ],
    pains: ['Last-minute changes', 'Missing confirms', 'Angry travelers after delays'],
    integrations: [
      'PNR / booking ID keys itinerary, invoices, and CRM',
      'Disruption alerts create recovery tasks',
      'Consent-checked SMS for travel updates only',
    ],
    lenses: ['Confirm integrity', 'Disruption readiness', 'Preference accuracy'],
    workflows: ['Quote → book → confirm → travel → support → review'],
    milestones: ['Confirm checklist live', 'Disruption playbook', 'Preference CRM fields'],
  },
  professional: {
    labelEn: 'Professional services',
    tokens: ['engagement letter', 'utilization rate', 'SOW scope', 'billable hour', 'client steering'],
    compliance: [
      'Engagement letter / SOW signed before work',
      'Scope change control for out-of-SOW requests',
      'Client data confidentiality in workspaces',
    ],
    risks: [
      'Work starts without SOW',
      'Utilization without billable capture',
      'Steering committees without decisions',
    ],
    kpis: ['Utilization rate', 'SOW margin', 'AR days', 'Change-order rate'],
    discovery: [
      'How are engagements opened?',
      'Where is time captured?',
      'Who chairs steering?',
    ],
    pains: ['Scope creep', 'Write-offs', 'Status meetings without decisions'],
    integrations: [
      'Engagement ID keys SOW, time, and invoices',
      'Block time entry without open engagement',
      'Steering decisions logged to client portal',
    ],
    lenses: ['SOW control', 'Utilization hygiene', 'Decision cadence'],
    workflows: ['Propose → SOW → staff → deliver → invoice → renew'],
    milestones: ['SOW template live', 'Time capture path', 'Steering log started'],
  },
  entertainment: {
    labelEn: 'Entertainment',
    tokens: ['talent contract', 'show rundown', 'venue rider', 'ticketing hold', 'promo window'],
    compliance: [
      'Talent contracts and riders stored with event ID',
      'Ticketing holds / comps policy documented',
      'Promo claims match licensed rights windows',
    ],
    risks: [
      'Rider misses on show day',
      'Over-comp tickets',
      'Promo before rights clear',
    ],
    kpis: ['Sell-through rate', 'Rider issue count', 'Promo-to-sales lift'],
    discovery: [
      'How are events and talent tracked?',
      'What ticketing system is used?',
      'Who owns promo windows?',
    ],
    pains: ['Show-day surprises', 'Scattered contracts', 'Weak promo timing'],
    integrations: [
      'Event ID keys contracts, rundown, and tickets',
      'Block promo if rights window not open',
      'Comp tickets require approval gate',
    ],
    lenses: ['Contract readiness', 'Ticketing control', 'Promo timing'],
    workflows: ['Book talent → contract → promo → show → settle → wrap'],
    milestones: ['Contract vault ready', 'Rundown template', 'Comp approval gate'],
  },
  home_services: {
    labelEn: 'Home services',
    tokens: ['job dispatch', 'technician ETA', 'quote-to-job', 'parts truck stock', 'review ask'],
    compliance: [
      'Customer authorization before extra work on-site',
      'Technician background / insurance evidence',
      'Warranty terms on completed jobs',
    ],
    risks: [
      'No-shows / late ETAs destroy reviews',
      'Parts missing on truck',
      'Quotes never convert to jobs',
    ],
    kpis: ['First-time fix rate', 'ETA accuracy', 'Quote-to-job conversion', 'Review rate'],
    discovery: [
      'How is dispatch done today?',
      'What is first-time fix rate?',
      'How are reviews requested?',
    ],
    pains: ['Wasted truck rolls', 'Slow quoting', 'Few Google reviews'],
    integrations: [
      'Job ID keys quote, dispatch, parts, and invoice',
      'ETA SMS with consent',
      'Review ask after job completion SLA',
    ],
    lenses: ['Dispatch efficiency', 'First-time fix', 'Reputation loop'],
    workflows: ['Lead → quote → book → dispatch → complete → review'],
    milestones: ['Dispatch board live', 'ETA SMS tested', 'Review ask automation'],
  },
  pets: {
    labelEn: 'Pets',
    tokens: ['pet profile', 'vaccination record', 'boarding reservation', 'vet referral', 'grooming notes'],
    compliance: [
      'Vaccination records required before boarding',
      'Pet medical notes access limited',
      'Emergency contact / vet referral on file',
    ],
    risks: [
      'Boarding without vaccine proof',
      'Lost grooming notes across visits',
      'Emergency contacts outdated',
    ],
    kpis: ['Booking fill rate', 'Vaccine compliance %', 'Repeat visit rate'],
    discovery: [
      'How are pet profiles stored?',
      'What vaccine rules apply?',
      'How are grooming notes shared?',
    ],
    pains: ['Paper vaccine cards', 'No-show boarders', 'Inconsistent pet notes'],
    integrations: [
      'Pet ID keys profile, vaccines, and bookings',
      'Block boarding if vaccine checklist Fail',
      'Reminder sequences for due vaccines',
    ],
    lenses: ['Vaccine compliance', 'Booking ops', 'Care continuity'],
    workflows: ['Profile → book → check-in → service → checkout → rebook'],
    milestones: ['Pet profiles live', 'Vaccine gate', 'Rebook reminder path'],
  },
  industrial: {
    labelEn: 'Industrial',
    tokens: ['work permit', 'lockout tagout', 'asset hierarchy', 'PM schedule', 'spare parts'],
    compliance: [
      'Permit-to-work required for hazardous tasks',
      'Lockout/tagout evidence before energize',
      'PM schedule adherence tracked',
    ],
    risks: [
      'PM deferred until failure',
      'Spare parts stockouts',
      'Work without permits',
    ],
    kpis: ['PM compliance %', 'MTBF / MTTR', 'Permit checklist completion', 'Spare fill rate'],
    discovery: [
      'What is the asset hierarchy?',
      'How are permits issued?',
      'Where is the PM schedule?',
    ],
    pains: ['Unplanned downtime', 'Paper permits', 'Tribal maintenance knowledge'],
    integrations: [
      'Asset ID keys PM, work orders, and spares',
      'Block energize without LOTO checklist Pass',
      'PM due alerts create work orders',
    ],
    lenses: ['Permit discipline', 'PM reliability', 'Spares readiness'],
    workflows: ['Plan PM → permit → isolate → maintain → test → restore'],
    milestones: ['Asset hierarchy loaded', 'Permit workflow live', 'PM calendar baseline'],
  },
};

for (const [slug, seed] of Object.entries(SUBSTANCE_SEEDS)) {
  if (!INDUSTRY_DOCUMENT_SUBSTANCE[slug]) {
    INDUSTRY_DOCUMENT_SUBSTANCE[slug] = expandSubstanceSeed(slug, seed);
  }
}

/** Alias keys so hyphen/underscore and freelance twin categories resolve. */
const ALIASES: Record<string, string> = {
  'real-estate': 'real_estate',
  real_estate_services: 'real_estate',
  legal_services: 'legal',
  finance_accounting: 'finance',
  education_training: 'education',
  e_commerce: 'ecommerce',
  'e-commerce': 'ecommerce',
  // hyphen forms for underscored freelance slugs
  'admin-support': 'admin_support',
  'ai-data': 'ai_data',
  'audio-music': 'audio_music',
  'business-consulting': 'business_consulting',
  'community-moderation': 'community_moderation',
  'creator-services': 'creator_services',
  'customer-service': 'customer_service',
  'design-creative': 'design_creative',
  'development-it': 'development_it',
  'engineering-architecture': 'engineering_architecture',
  'engineering-science': 'engineering_science',
  'hr-recruiting': 'hr_recruiting',
  'product-project-management': 'product_project_management',
  'video-animation': 'video_animation',
  'writing-translation': 'writing_translation',
  'home-services': 'home_services',
};

export function listIndustryDocumentSubstanceSlugs(): string[] {
  return Object.keys(INDUSTRY_DOCUMENT_SUBSTANCE).sort();
}

export function resolveIndustryDocumentSubstance(
  industryCategory?: string | null,
): IndustryDocumentSubstance {
  const raw = (industryCategory ?? '').trim().toLowerCase();
  if (!raw) {
    return {
      categorySlug: 'professional',
      labelEn: 'Professional services',
      ...DEFAULT_SUBSTANCE,
    };
  }

  const normalized = normalizeCategorySlug(raw);
  const mapped = ALIASES[normalized] ?? ALIASES[raw] ?? normalized;
  const hit = INDUSTRY_DOCUMENT_SUBSTANCE[mapped] ?? INDUSTRY_DOCUMENT_SUBSTANCE[normalized];
  if (hit) return hit;

  const meta = getIndustryCategory(normalized) ?? getIndustryCategory(raw);
  const labelEn = meta?.name ?? normalized.replace(/_/g, ' ');
  return {
    categorySlug: meta?.slug ?? normalized,
    labelEn,
    ...DEFAULT_SUBSTANCE,
    distinctiveTokens: [
      labelEn,
      `${labelEn} operations`,
      ...DEFAULT_SUBSTANCE.distinctiveTokens,
    ],
  };
}

export function industrySubstanceTokenList(industryCategory?: string | null): string[] {
  return resolveIndustryDocumentSubstance(industryCategory).distinctiveTokens;
}
