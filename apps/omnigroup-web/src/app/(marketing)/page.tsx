import { HomePageClient } from './HomePageClient';
import { getPublicCatalogStats } from '@/lib/public-catalog-stats';

export default function HomePage() {
  const catalog = getPublicCatalogStats();
  return (
    <HomePageClient
      catalogStats={{
        industryGroups: catalog.industryGroups,
        verticalLandings: catalog.verticalLandings,
      }}
    />
  );
}
