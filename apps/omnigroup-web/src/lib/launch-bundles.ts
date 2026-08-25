/**
 * Launch bundles — fixed promo prices for faster first-client acquisition.
 */
import { getPackageAnchorEur } from './package-delivery-spec';

export type LaunchBundleSpec = {
  id: string;
  title: string;
  titleSr: string;
  deliverableIds: string[];
  bundleEur: number;
  description: string;
  descriptionSr: string;
  contactTopic: string;
};

export const LAUNCH_BUNDLE_SPECS: LaunchBundleSpec[] = [
  {
    id: 'launch-trio',
    title: 'Launch trio',
    titleSr: 'Launch trio paket',
    deliverableIds: ['setup-quick', 'audit', 'landing'],
    bundleEur: 1599,
    description: 'Portal setup + technical audit + live landing — fastest path to first clients.',
    descriptionSr: 'Portal setup + tehnički audit + live landing — najbrži put do prvih klijenata.',
    contactTopic: 'launch-trio-bundle',
  },
  {
    id: 'site-crm',
    title: 'Site + CRM',
    titleSr: 'Sajt + CRM',
    deliverableIds: ['website-business', 'setup-full'],
    bundleEur: 2790,
    description: '5-page live site plus CRM seed, automation modules, and 30-day support window.',
    descriptionSr: '5+ strana live sajt plus CRM seed, automation moduli i 30-dnevni support prozor.',
    contactTopic: 'site-crm-bundle',
  },
  {
    id: 'niche-launch',
    title: 'Niche launch',
    titleSr: 'Niche launch',
    deliverableIds: ['vertical-package', 'support-priority'],
    bundleEur: 279,
    description: 'Industry CRM vertical + priority support retainer (monthly).',
    descriptionSr: 'Industrijski CRM vertikal + priority support retainer (mesečno).',
    contactTopic: 'niche-launch-bundle',
  },
];

export type ResolvedLaunchBundle = LaunchBundleSpec & {
  listEur: number;
  savingsEur: number;
};

export function resolveLaunchBundles(): ResolvedLaunchBundle[] {
  return LAUNCH_BUNDLE_SPECS.map((bundle) => {
    const listEur = bundle.deliverableIds.reduce(
      (sum, id) => sum + getPackageAnchorEur(id),
      0,
    );
    return {
      ...bundle,
      listEur,
      savingsEur: Math.max(0, listEur - bundle.bundleEur),
    };
  });
}
