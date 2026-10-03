/**
 * OMI UI context must stay catalog-bound and must not claim ticket APIs.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

const ctx = readFileSync(join(root, 'src/lib/omi-page-context.ts'), 'utf8');
const host = readFileSync(join(root, 'src/components/platform/AtinaAssistantHost.tsx'), 'utf8');
const panel = readFileSync(join(root, 'src/components/platform/ClientAiAssistant.tsx'), 'utf8');
const chat = readFileSync(join(root, 'src/app/api/atina/atina-assistant/chat/route.ts'), 'utf8');

assert(ctx.includes('resolveIndustryCategory'), 'Industry pages must map slugs to known categories');
assert(ctx.includes('offer-'), 'Product hash must accept offer-{id} and raw catalog ids');
assert(host.includes('HIDDEN'), 'Ask OMI stays off auth/admin screens');
assert(panel.includes('Ask'), 'Panel must expose Ask OMI');
assert(panel.includes('safe-area-inset-bottom'), 'Mobile must honor safe area');
assert(panel.includes('aria-label'), 'Panel must stay labelled');
assert(panel.includes('hasAnalyticsConsent'), 'Analytics must honor cookie consent');
assert(panel.includes('ThumbsUp') || panel.includes('feedback'), 'Feedback controls required');
assert(panel.includes('handoff') || panel.includes('Human handoff'), 'Human handoff UI required');
assert(panel.includes('freshConsultation') || panel.includes('New consultation'), 'Clear/new consultation required');
assert(panel.includes('Export') || panel.includes('exportTranscript'), 'Export/save summary required');
assert(panel.includes('temporarily unavailable'), 'Graceful degradation copy required');
assert(!panel.includes('dangerouslySetInnerHTML'), 'Chat must render messages as text, not HTML');
assert(!panel.includes('createTicket') && !chat.includes('createTicket'), 'Do not fake ticket creation');
assert(chat.includes('pageContext'), 'BFF must forward page context');
assert(chat.includes('getServerSession'), 'Portal chat must use the signed-in session');

const feedback = readFileSync(join(root, 'src/app/api/atina/atina-assistant/feedback/route.ts'), 'utf8');
const handoff = readFileSync(join(root, 'src/app/api/atina/atina-assistant/handoff/route.ts'), 'utf8');
assert(feedback.includes('rating'), 'Feedback API must accept rating');
assert(handoff.includes('pushContactToCrm'), 'Handoff must reuse CRM ingress');
assert(handoff.includes('Conversation ID'), 'Handoff must include conversation ID');
assert(
  ctx.includes('What SaaS plans am I buying on this page? Launch, Growth, and Scale.'),
  'Pricing chip must ask for Launch/Growth/Scale, not a generic catalog dump',
);

console.log('test-omi-page-context: ok');
