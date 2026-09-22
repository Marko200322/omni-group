/** Rows from GET /api/atina/billing/package-matrix (Atina package-industry-problems). */

export type PackageIndustryMatrixRow = {
  deliverableId: string;
  industryCategory: string;
  industryLabel: string;
  primaryProblem: string;
  secondaryProblems: string[];
  businessOutcome: string;
  industrySolutionPitch: string;
  industryPainPoints: string[];
  recommendedForIndustry: boolean;
  competitiveBonusIncludes: string[];
};

export type PackageIndustryMatrixResponse = {
  industryCategory: string;
  packages: PackageIndustryMatrixRow[];
};

export function matrixRowByDeliverableId(
  packages: PackageIndustryMatrixRow[] | undefined,
): Map<string, PackageIndustryMatrixRow> {
  const map = new Map<string, PackageIndustryMatrixRow>();
  for (const row of packages ?? []) {
    map.set(row.deliverableId, row);
  }
  return map;
}

export async function fetchPackageIndustryMatrix(
  industryCategory: string,
): Promise<PackageIndustryMatrixResponse | null> {
  const q = encodeURIComponent(industryCategory);
  const res = await fetch(`/api/atina/billing/package-matrix?industryCategory=${q}`, {
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { ok?: boolean; data?: PackageIndustryMatrixResponse };
  if (!body.ok || !body.data?.packages) return null;
  return body.data;
}
