import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { VerticalLanding } from '@/components/marketing/VerticalLanding';
import { fetchSolution } from '@/lib/public-site-api';
import { marketingOpenGraph, marketingTwitter } from '@/lib/site-metadata';

type PageProps = { params: Promise<{ slug: string }> };

function isThinSolution(solution: NonNullable<Awaited<ReturnType<typeof fetchSolution>>>): boolean {
  const prop = solution.deliveryPack.valueProp?.trim() ?? '';
  return prop.length < 24 || solution.status === 'draft';
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const solution = await fetchSolution(slug);
  if (!solution) return { title: 'Industry solution' };
  const description = solution.deliveryPack.valueProp || `Delivery packages and pricing for ${solution.name}.`;
  const thin = isThinSolution(solution);
  return {
    title: solution.name,
    description,
    ...(thin ? { robots: { index: false, follow: true } } : {}),
    openGraph: marketingOpenGraph(solution.name, description),
    twitter: marketingTwitter(solution.name, description),
  };
}

export const dynamic = 'force-dynamic';

export default async function SolutionPage({ params }: PageProps) {
  const { slug } = await params;
  const solution = await fetchSolution(slug);
  if (!solution) notFound();
  return <VerticalLanding solution={solution} />;
}
