import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { VerticalLanding } from '@/components/marketing/VerticalLanding';
import { fetchSolution } from '@/lib/public-site-api';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const solution = await fetchSolution(slug);
  if (!solution) return { title: 'Rešenje | Omni Group' };
  return {
    title: `${solution.name} | Omni Group`,
    description: solution.deliveryPack.valueProp,
  };
}

export const dynamic = 'force-dynamic';

export default async function SolutionPage({ params }: PageProps) {
  const { slug } = await params;
  const solution = await fetchSolution(slug);
  if (!solution) notFound();
  return <VerticalLanding solution={solution} />;
}
