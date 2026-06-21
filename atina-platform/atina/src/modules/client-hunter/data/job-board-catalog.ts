/**
 * Global job board & freelance platform catalog for Client Hunter scraping.
 * Each entry: seed URL, region, primary locale, platform kind.
 */

export type JobBoardKind = 'job_board' | 'freelance' | 'government' | 'aggregator' | 'application_portal';

export type JobBoardPlatform = {
  slug: string;
  name: string;
  seedUrl: string;
  /** ISO 3166-1 alpha-2 or GLOBAL */
  region: string;
  /** BCP-47 locale for outreach copy (de, en, fr, …) */
  locale: string;
  kind: JobBoardKind;
  /** Higher = scrape first when capping platforms per run */
  priority: number;
  enabled: boolean;
};

export const JOB_BOARD_PLATFORMS: JobBoardPlatform[] = [
  // --- GLOBAL AGGREGATORS ---
  { slug: 'linkedin_jobs', name: 'LinkedIn Jobs', seedUrl: 'https://www.linkedin.com/jobs/search/', region: 'GLOBAL', locale: 'en', kind: 'aggregator', priority: 100, enabled: true },
  { slug: 'indeed_global', name: 'Indeed (Global)', seedUrl: 'https://www.indeed.com/jobs', region: 'GLOBAL', locale: 'en', kind: 'aggregator', priority: 98, enabled: true },
  { slug: 'glassdoor', name: 'Glassdoor', seedUrl: 'https://www.glassdoor.com/Job/index.htm', region: 'GLOBAL', locale: 'en', kind: 'job_board', priority: 85, enabled: true },
  { slug: 'monster_global', name: 'Monster', seedUrl: 'https://www.monster.com/jobs/search/', region: 'GLOBAL', locale: 'en', kind: 'job_board', priority: 80, enabled: true },
  { slug: 'ziprecruiter', name: 'ZipRecruiter', seedUrl: 'https://www.ziprecruiter.com/jobs-search', region: 'GLOBAL', locale: 'en', kind: 'job_board', priority: 78, enabled: true },
  { slug: 'simplyhired', name: 'SimplyHired', seedUrl: 'https://www.simplyhired.com/search', region: 'GLOBAL', locale: 'en', kind: 'aggregator', priority: 72, enabled: true },

  // --- DACH (DE / AT / CH) ---
  { slug: 'stepstone_de', name: 'StepStone Germany', seedUrl: 'https://www.stepstone.de/jobs', region: 'DE', locale: 'de', kind: 'job_board', priority: 95, enabled: true },
  { slug: 'indeed_de', name: 'Indeed Germany', seedUrl: 'https://de.indeed.com/jobs', region: 'DE', locale: 'de', kind: 'aggregator', priority: 94, enabled: true },
  { slug: 'arbeitsagentur', name: 'Bundesagentur für Arbeit', seedUrl: 'https://www.arbeitsagentur.de/jobsuche/suche', region: 'DE', locale: 'de', kind: 'government', priority: 92, enabled: true },
  { slug: 'xing_jobs', name: 'XING Jobs', seedUrl: 'https://www.xing.com/jobs', region: 'DE', locale: 'de', kind: 'job_board', priority: 88, enabled: true },
  { slug: 'monster_de', name: 'Monster Germany', seedUrl: 'https://www.monster.de/jobs/suche/', region: 'DE', locale: 'de', kind: 'job_board', priority: 75, enabled: true },
  { slug: 'jobvector', name: 'jobvector', seedUrl: 'https://www.jobvector.de/jobs/', region: 'DE', locale: 'de', kind: 'job_board', priority: 70, enabled: true },
  { slug: 'indeed_at', name: 'Indeed Austria', seedUrl: 'https://at.indeed.com/jobs', region: 'AT', locale: 'de', kind: 'aggregator', priority: 82, enabled: true },
  { slug: 'karriere_at', name: 'karriere.at', seedUrl: 'https://www.karriere.at/jobs', region: 'AT', locale: 'de', kind: 'job_board', priority: 80, enabled: true },
  { slug: 'indeed_ch', name: 'Indeed Switzerland', seedUrl: 'https://www.indeed.ch/jobs', region: 'CH', locale: 'de', kind: 'aggregator', priority: 82, enabled: true },
  { slug: 'jobs_ch', name: 'jobs.ch', seedUrl: 'https://www.jobs.ch/en/vacancies/', region: 'CH', locale: 'de', kind: 'job_board', priority: 78, enabled: true },

  // --- UK / IE ---
  { slug: 'indeed_uk', name: 'Indeed UK', seedUrl: 'https://uk.indeed.com/jobs', region: 'GB', locale: 'en', kind: 'aggregator', priority: 90, enabled: true },
  { slug: 'reed_uk', name: 'Reed.co.uk', seedUrl: 'https://www.reed.co.uk/jobs', region: 'GB', locale: 'en', kind: 'job_board', priority: 88, enabled: true },
  { slug: 'totaljobs', name: 'Totaljobs', seedUrl: 'https://www.totaljobs.com/jobs', region: 'GB', locale: 'en', kind: 'job_board', priority: 84, enabled: true },
  { slug: 'cv_library', name: 'CV-Library', seedUrl: 'https://www.cv-library.co.uk/jobs', region: 'GB', locale: 'en', kind: 'job_board', priority: 76, enabled: true },
  { slug: 'irishjobs', name: 'IrishJobs', seedUrl: 'https://www.irishjobs.ie/jobs', region: 'IE', locale: 'en', kind: 'job_board', priority: 74, enabled: true },

  // --- FRANCE / BE ---
  { slug: 'indeed_fr', name: 'Indeed France', seedUrl: 'https://fr.indeed.com/jobs', region: 'FR', locale: 'fr', kind: 'aggregator', priority: 90, enabled: true },
  { slug: 'pole_emploi', name: 'France Travail', seedUrl: 'https://candidat.francetravail.fr/offres/recherche', region: 'FR', locale: 'fr', kind: 'government', priority: 92, enabled: true },
  { slug: 'apec', name: 'APEC', seedUrl: 'https://www.apec.fr/candidat/recherche-emploi.html', region: 'FR', locale: 'fr', kind: 'job_board', priority: 85, enabled: true },
  { slug: 'meteojob', name: 'Meteojob', seedUrl: 'https://www.meteojob.com/jobs', region: 'FR', locale: 'fr', kind: 'job_board', priority: 80, enabled: true },
  { slug: 'indeed_be', name: 'Indeed Belgium', seedUrl: 'https://be.indeed.com/jobs', region: 'BE', locale: 'fr', kind: 'aggregator', priority: 78, enabled: true },

  // --- NORDICS ---
  { slug: 'indeed_se', name: 'Indeed Sweden', seedUrl: 'https://se.indeed.com/jobs', region: 'SE', locale: 'sv', kind: 'aggregator', priority: 82, enabled: true },
  { slug: 'arbetsformedlingen', name: 'Arbetsförmedlingen', seedUrl: 'https://arbetsformedlingen.se/platsbanken/annonser', region: 'SE', locale: 'sv', kind: 'government', priority: 88, enabled: true },
  { slug: 'indeed_no', name: 'Indeed Norway', seedUrl: 'https://no.indeed.com/jobs', region: 'NO', locale: 'no', kind: 'aggregator', priority: 80, enabled: true },
  { slug: 'finn_no', name: 'FINN Jobb', seedUrl: 'https://www.finn.no/job/fulltime/search.html', region: 'NO', locale: 'no', kind: 'job_board', priority: 78, enabled: true },
  { slug: 'indeed_dk', name: 'Indeed Denmark', seedUrl: 'https://dk.indeed.com/jobs', region: 'DK', locale: 'da', kind: 'aggregator', priority: 80, enabled: true },
  { slug: 'jobindex', name: 'Jobindex', seedUrl: 'https://www.jobindex.dk/jobsoegning', region: 'DK', locale: 'da', kind: 'job_board', priority: 82, enabled: true },

  // --- BENELUX ---
  { slug: 'indeed_nl', name: 'Indeed Netherlands', seedUrl: 'https://nl.indeed.com/jobs', region: 'NL', locale: 'nl', kind: 'aggregator', priority: 86, enabled: true },
  { slug: 'nationale_vacaturebank', name: 'Nationale Vacaturebank', seedUrl: 'https://www.nationalevacaturebank.nl/vacatures', region: 'NL', locale: 'nl', kind: 'job_board', priority: 84, enabled: true },

  // --- IBERIA ---
  { slug: 'infojobs_es', name: 'InfoJobs Spain', seedUrl: 'https://www.infojobs.net/jobsearch/search-results/list.xhtml', region: 'ES', locale: 'es', kind: 'job_board', priority: 88, enabled: true },
  { slug: 'indeed_es', name: 'Indeed Spain', seedUrl: 'https://es.indeed.com/jobs', region: 'ES', locale: 'es', kind: 'aggregator', priority: 86, enabled: true },
  { slug: 'infojobs_it', name: 'InfoJobs Italy', seedUrl: 'https://www.infojobs.it/offerte-lavoro', region: 'IT', locale: 'it', kind: 'job_board', priority: 86, enabled: true },
  { slug: 'indeed_it', name: 'Indeed Italy', seedUrl: 'https://it.indeed.com/jobs', region: 'IT', locale: 'it', kind: 'aggregator', priority: 84, enabled: true },

  // --- CEE / BALKANS ---
  { slug: 'pracuj_pl', name: 'Pracuj.pl', seedUrl: 'https://www.pracuj.pl/praca', region: 'PL', locale: 'pl', kind: 'job_board', priority: 88, enabled: true },
  { slug: 'indeed_pl', name: 'Indeed Poland', seedUrl: 'https://pl.indeed.com/jobs', region: 'PL', locale: 'pl', kind: 'aggregator', priority: 84, enabled: true },
  { slug: 'profesia_sk', name: 'Profesia.sk', seedUrl: 'https://www.profesia.sk/praca/', region: 'SK', locale: 'sk', kind: 'job_board', priority: 78, enabled: true },
  { slug: 'profession_hu', name: 'Profession.hu', seedUrl: 'https://www.profession.hu/allasok', region: 'HU', locale: 'hu', kind: 'job_board', priority: 78, enabled: true },
  { slug: 'jobs_cz', name: 'Jobs.cz', seedUrl: 'https://www.jobs.cz/prace/', region: 'CZ', locale: 'cs', kind: 'job_board', priority: 78, enabled: true },
  { slug: 'bestjobs_ro', name: 'BestJobs Romania', seedUrl: 'https://www.bestjobs.eu/ro', region: 'RO', locale: 'ro', kind: 'job_board', priority: 76, enabled: true },
  { slug: 'posao_hr', name: 'Posao.hr', seedUrl: 'https://www.posao.hr/', region: 'HR', locale: 'hr', kind: 'job_board', priority: 74, enabled: true },
  { slug: 'poslovi_infostud', name: 'Infostud Poslovi', seedUrl: 'https://poslovi.infostud.com/', region: 'RS', locale: 'sr', kind: 'job_board', priority: 74, enabled: true },

  // --- AMERICAS ---
  { slug: 'indeed_us', name: 'Indeed USA', seedUrl: 'https://www.indeed.com/jobs', region: 'US', locale: 'en', kind: 'aggregator', priority: 96, enabled: true },
  { slug: 'careerbuilder_us', name: 'CareerBuilder', seedUrl: 'https://www.careerbuilder.com/jobs', region: 'US', locale: 'en', kind: 'job_board', priority: 82, enabled: true },
  { slug: 'dice', name: 'Dice (Tech)', seedUrl: 'https://www.dice.com/jobs', region: 'US', locale: 'en', kind: 'job_board', priority: 80, enabled: true },
  { slug: 'indeed_ca', name: 'Indeed Canada', seedUrl: 'https://ca.indeed.com/jobs', region: 'CA', locale: 'en', kind: 'aggregator', priority: 84, enabled: true },
  { slug: 'indeed_mx', name: 'Indeed Mexico', seedUrl: 'https://mx.indeed.com/jobs', region: 'MX', locale: 'es', kind: 'aggregator', priority: 80, enabled: true },
  { slug: 'computrabajo', name: 'Computrabajo', seedUrl: 'https://www.computrabajo.com/', region: 'MX', locale: 'es', kind: 'job_board', priority: 78, enabled: true },
  { slug: 'indeed_br', name: 'Indeed Brazil', seedUrl: 'https://br.indeed.com/jobs', region: 'BR', locale: 'pt', kind: 'aggregator', priority: 82, enabled: true },
  { slug: 'catho', name: 'Catho', seedUrl: 'https://www.catho.com.br/vagas/', region: 'BR', locale: 'pt', kind: 'job_board', priority: 78, enabled: true },

  // --- APAC ---
  { slug: 'indeed_au', name: 'Indeed Australia', seedUrl: 'https://au.indeed.com/jobs', region: 'AU', locale: 'en', kind: 'aggregator', priority: 84, enabled: true },
  { slug: 'seek_au', name: 'SEEK Australia', seedUrl: 'https://www.seek.com.au/jobs', region: 'AU', locale: 'en', kind: 'job_board', priority: 88, enabled: true },
  { slug: 'indeed_in', name: 'Indeed India', seedUrl: 'https://in.indeed.com/jobs', region: 'IN', locale: 'en', kind: 'aggregator', priority: 86, enabled: true },
  { slug: 'naukri', name: 'Naukri.com', seedUrl: 'https://www.naukri.com/job-listings', region: 'IN', locale: 'en', kind: 'job_board', priority: 90, enabled: true },
  { slug: 'indeed_sg', name: 'Indeed Singapore', seedUrl: 'https://sg.indeed.com/jobs', region: 'SG', locale: 'en', kind: 'aggregator', priority: 80, enabled: true },
  { slug: 'jobsdb', name: 'JobsDB', seedUrl: 'https://www.jobsdb.com/', region: 'SG', locale: 'en', kind: 'job_board', priority: 82, enabled: true },
  { slug: 'indeed_jp', name: 'Indeed Japan', seedUrl: 'https://jp.indeed.com/jobs', region: 'JP', locale: 'ja', kind: 'aggregator', priority: 82, enabled: true },
  { slug: 'rikunabi', name: 'Rikunabi Next', seedUrl: 'https://next.rikunabi.com/job_search/', region: 'JP', locale: 'ja', kind: 'job_board', priority: 84, enabled: true },

  // --- MENA ---
  { slug: 'bayt', name: 'Bayt.com', seedUrl: 'https://www.bayt.com/en/jordan/jobs/', region: 'AE', locale: 'ar', kind: 'job_board', priority: 80, enabled: true },
  { slug: 'gulftalent', name: 'GulfTalent', seedUrl: 'https://www.gulftalent.com/jobs', region: 'AE', locale: 'en', kind: 'job_board', priority: 78, enabled: true },

  // --- FREELANCE / GIG (application-style listings) ---
  { slug: 'upwork', name: 'Upwork', seedUrl: 'https://www.upwork.com/nx/search/jobs/', region: 'GLOBAL', locale: 'en', kind: 'freelance', priority: 93, enabled: true },
  { slug: 'fiverr', name: 'Fiverr', seedUrl: 'https://www.fiverr.com/search/gigs', region: 'GLOBAL', locale: 'en', kind: 'freelance', priority: 88, enabled: true },
  { slug: 'freelancer_com', name: 'Freelancer.com', seedUrl: 'https://www.freelancer.com/jobs/', region: 'GLOBAL', locale: 'en', kind: 'freelance', priority: 85, enabled: true },
  { slug: 'peopleperhour', name: 'PeoplePerHour', seedUrl: 'https://www.peopleperhour.com/freelance-jobs', region: 'GB', locale: 'en', kind: 'freelance', priority: 80, enabled: true },
  { slug: 'guru', name: 'Guru', seedUrl: 'https://www.guru.com/d/jobs/', region: 'GLOBAL', locale: 'en', kind: 'freelance', priority: 76, enabled: true },
  { slug: 'malt', name: 'Malt', seedUrl: 'https://www.malt.com/find-freelancers', region: 'FR', locale: 'fr', kind: 'freelance', priority: 82, enabled: true },
  { slug: 'twago', name: 'Twago', seedUrl: 'https://www.twago.de/', region: 'DE', locale: 'de', kind: 'freelance', priority: 74, enabled: true },
  { slug: 'toptal', name: 'Toptal', seedUrl: 'https://www.toptal.com/freelance-jobs', region: 'GLOBAL', locale: 'en', kind: 'freelance', priority: 72, enabled: true },

  // --- APPLICATION PORTALS (company ATS aggregators — search pages) ---
  { slug: 'greenhouse_board', name: 'Greenhouse Job Board', seedUrl: 'https://boards.greenhouse.io/', region: 'GLOBAL', locale: 'en', kind: 'application_portal', priority: 65, enabled: true },
  { slug: 'lever_jobs', name: 'Lever Jobs', seedUrl: 'https://jobs.lever.co/', region: 'GLOBAL', locale: 'en', kind: 'application_portal', priority: 63, enabled: true },
  { slug: 'workable', name: 'Workable', seedUrl: 'https://jobs.workable.com/', region: 'GLOBAL', locale: 'en', kind: 'application_portal', priority: 62, enabled: true },
];

export function listJobBoardPlatforms(filter?: {
  region?: string;
  locale?: string;
  kind?: JobBoardKind;
  slugs?: string[];
  enabledOnly?: boolean;
  limit?: number;
}): JobBoardPlatform[] {
  let list = JOB_BOARD_PLATFORMS.filter((p) => (filter?.enabledOnly !== false ? p.enabled : true));
  if (filter?.region) {
    const r = filter.region.toUpperCase();
    list = list.filter((p) => p.region === r || p.region === 'GLOBAL');
  }
  if (filter?.locale) list = list.filter((p) => p.locale === filter.locale);
  if (filter?.kind) list = list.filter((p) => p.kind === filter.kind);
  if (filter?.slugs?.length) list = list.filter((p) => filter.slugs!.includes(p.slug));
  list.sort((a, b) => b.priority - a.priority);
  if (filter?.limit && filter.limit > 0) list = list.slice(0, filter.limit);
  return list;
}

export function getJobBoardPlatform(slug: string): JobBoardPlatform | undefined {
  return JOB_BOARD_PLATFORMS.find((p) => p.slug === slug);
}

export function jobBoardSeedUrlMap(slugs?: string[]): Record<string, string> {
  const platforms = slugs?.length
    ? listJobBoardPlatforms({ slugs, enabledOnly: true })
    : listJobBoardPlatforms({ enabledOnly: true });
  return Object.fromEntries(platforms.map((p) => [p.slug, p.seedUrl]));
}

export function countJobBoardPlatforms(): { total: number; byLocale: Record<string, number>; byKind: Record<string, number> } {
  const byLocale: Record<string, number> = {};
  const byKind: Record<string, number> = {};
  for (const p of JOB_BOARD_PLATFORMS.filter((x) => x.enabled)) {
    byLocale[p.locale] = (byLocale[p.locale] ?? 0) + 1;
    byKind[p.kind] = (byKind[p.kind] ?? 0) + 1;
  }
  return { total: JOB_BOARD_PLATFORMS.filter((x) => x.enabled).length, byLocale, byKind };
}
