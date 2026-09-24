import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { VerticalLanding } from '@/components/marketing/VerticalLanding';
import { fetchSolution, fallbackSolutionFromIndex } from '@/lib/public-site-api';
import { formatPublicTitle } from '@/lib/industry-catalog';
import { marketingCanonical, marketingOpenGraph, marketingTwitter } from '@/lib/site-metadata';
import { buildVerticalLandingCopy } from '@/lib/vertical-landing-copy';

type PageProps = { params: Promise<{ slug: string }> };

function landingCopy(solution: NonNullable<Awaited<ReturnType<typeof fetchSolution>>>) {
  return buildVerticalLandingCopy({
    slug: solution.slug,
    name: solution.name,
    category: solution.category,
    valueProp: solution.deliveryPack.valueProp,
  });
}

function isDraftSolution(solution: { status: string }): boolean {
  return solution.status === 'draft';
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const solution = await fetchSolution(slug);
  if (!solution) {
    const fallback = fallbackSolutionFromIndex(slug);
    if (!fallback) return { title: 'Industry solution' };
    const description = landingCopy(fallback).lede;
    const thin = isDraftSolution(fallback);
    const title = formatPublicTitle(fallback.name);
    const path = `/solutions/${slug}`;
    return {
      title,
      description,
      alternates: { canonical: marketingCanonical(path) },
      ...(thin ? { robots: { index: false, follow: true } } : {}),
      openGraph: marketingOpenGraph(title, description, path),
      twitter: marketingTwitter(title, description),
    };
  }
  const description = landingCopy(solution).lede;
  const thin = isDraftSolution(solution);
  const title = formatPublicTitle(solution.name);
  const path = `/solutions/${slug}`;
  return {
    title,
    description,
    alternates: { canonical: marketingCanonical(path) },
    ...(thin ? { robots: { index: false, follow: true } } : {}),
    openGraph: marketingOpenGraph(title, description, path),
    twitter: marketingTwitter(title, description),
  };
}

export const dynamic = 'force-dynamic';

export default async function SolutionPage({ params }: PageProps) {
  const { slug } = await params;
  const solution = (await fetchSolution(slug)) ?? fallbackSolutionFromIndex(slug);
  if (!solution) notFound();
  return <VerticalLanding solution={solution} />;
}
