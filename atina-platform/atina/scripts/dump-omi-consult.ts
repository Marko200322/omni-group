/**
 * Prints real OMI consult replies from the catalog engine (same path as AI-off fallback).
 * Run: npx ts-node --transpile-only scripts/dump-omi-consult.ts
 */
import { formatOmiAdvisorReply, recommendOmiProducts } from '../src/modules/omi/omi-recommend';
import { extractOmiConsultFacts } from '../src/modules/omi/omi-consult';

const cases: Array<{
  id: string;
  message: string;
  pagePath?: string;
  history?: string[];
}> = [
  { id: 'A', message: 'I need a new website.' },
  { id: 'B', message: 'Our website gets 10,000 visitors but hardly anyone buys.' },
  {
    id: 'C',
    message: 'Our employees spend all day copying data. Two people, 200 hours per month, €30 per hour.',
  },
  { id: 'D', message: 'We need more customers.' },
  { id: 'E', message: "I don't know what we need. Everything is a mess." },
  { id: 'F', message: 'We need something custom.' },
  { id: 'G', message: "Your package doesn't solve my problem." },
  {
    id: 'H',
    message:
      'We lose leads, someone responds manually, and reporting is a mess. I have €2000. What should I buy?',
  },
  {
    id: 'A2-followup',
    message: 'Poor conversion. People land and bounce. The design is fine.',
    history: ['I need a new website.'],
  },
  {
    id: 'C2-followup-buy',
    message: 'Yes that is the bottleneck. What should I buy?',
    history: [
      'Our employees spend all day copying data. Two people, 200 hours per month, €30 per hour.',
    ],
  },
  {
    id: 'G2-after-rec',
    message: "No, that's not the problem.",
    history: ['We lose leads and I have €2000. What should I buy?'],
  },
  { id: 'nuclear', message: 'I need a licensed nuclear reactor control system with radiation hardware.' },
  { id: 'pricing-page', message: 'What am I buying on this page?', pagePath: '/pricing' },
  { id: 'quick-setup-price', message: 'Koliko košta Quick Setup?' },
  {
    id: 'memory-headcount',
    message:
      'We have 25 employees. They spend 200 hours per month copying orders at €30 per hour. What should I buy?',
  },
];

function judge(id: string, reply: string, rec: ReturnType<typeof recommendOmiProducts>): string[] {
  const fail: string[] = [];
  if (id === 'A') {
    if (/I would consider website-business/i.test(reply)) fail.push('dumped website SKU too early');
    if (!/before I point you toward a package|bottleneck|conversion/i.test(reply)) fail.push('did not investigate');
  }
  if (id === 'B') {
    if (!/conversion/i.test(reply)) fail.push('missed conversion');
    if (/I would consider website-business/i.test(reply)) fail.push('recommended rebuild');
  }
  if (id === 'C') {
    if (!/72,000|72000/.test(reply)) fail.push('missing labour figure');
    if (rec.budgetEur != null) fail.push(`hourly treated as budget=${rec.budgetEur}`);
  }
  if (id === 'D') {
    if (/lead-gen-retainer/i.test(reply)) fail.push('jumped to marketing SKU');
    if (!/will not jump to a marketing package|acquisition, conversion/i.test(reply)) fail.push('no discovery');
  }
  if (id === 'E' && !/without a package name|work backwards|time, money/i.test(reply)) fail.push('no structured discovery');
  if (id === 'F' && !/requirement first|standard Omni package/i.test(reply)) fail.push('routed to custom too fast');
  if (id === 'G' && !/drop that package assumption|rebuild the problem/i.test(reply)) fail.push('defended the package');
  if (id === 'H') {
    if (rec.problems.length < 2) fail.push(`only ${rec.problems.length} problem(s)`);
    if (!/Do not buy all of them|Separate issues|would not automatically/i.test(reply)) fail.push('upsold all SKUs');
  }
  if (id === 'nuclear' && !/does not currently have a verified solution/i.test(reply)) fail.push('force-fit a package');
  if (id === 'pricing-page' && /website-business|setup-quick/i.test(reply)) fail.push('dumped expert SKUs on /pricing');
  if (id === 'G2-after-rec' && !/drop that package assumption|rebuild the problem/i.test(reply)) {
    fail.push('did not reassess');
  }
  if (id === 'memory-headcount' && /how many employees/i.test(reply)) fail.push('re-asked headcount');
  return fail;
}

function main() {
  let failed = 0;
  for (const c of cases) {
    const combined = [...(c.history ?? []), c.message].join('\n');
    const rec = recommendOmiProducts({ message: combined, pagePath: c.pagePath });
    const reply = formatOmiAdvisorReply(rec);
    const facts = extractOmiConsultFacts(combined);
    const fails = judge(c.id, reply, rec);
    if (fails.length) failed += 1;
    console.log(`\n======== ${c.id} ${fails.length ? 'FAIL' : 'PASS'} ========`);
    console.log(`USER: ${c.message}`);
    console.log(
      `stage=${rec.consultStage} problems=${JSON.stringify(rec.problems)} budget=${rec.budgetEur ?? '-'} noSuitable=${rec.noSuitable} skus=${rec.products.map((p) => `${p.id}:€${p.priceEur}`).join(',') || '-'}`,
    );
    if (facts.loadedLabourYearEur) {
      console.log(`facts labourYear=${facts.loadedLabourYearEur} save30=${facts.illustrativeSaveYearEur}`);
    }
    console.log(`REPLY:\n${reply}`);
    if (fails.length) console.log(`CHECKS: ${fails.join('; ')}`);
  }
  console.log(`\nDUMP ${failed === 0 ? 'PASS' : 'FAIL'} failedCases=${failed}/${cases.length}`);
  process.exit(failed === 0 ? 0 : 1);
}

main();
