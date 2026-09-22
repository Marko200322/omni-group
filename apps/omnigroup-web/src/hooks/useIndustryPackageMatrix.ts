'use client';

import { useEffect, useState } from 'react';
import {
  fetchPackageIndustryMatrix,
  matrixRowByDeliverableId,
  type PackageIndustryMatrixRow,
} from '@/lib/package-industry-matrix';

export function useIndustryPackageMatrix(industryCategory: string) {
  const [matrix, setMatrix] = useState<Map<string, PackageIndustryMatrixRow>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!industryCategory.trim()) {
      setMatrix(new Map());
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchPackageIndustryMatrix(industryCategory)
      .then((data) => {
        if (cancelled) return;
        setMatrix(matrixRowByDeliverableId(data?.packages));
      })
      .catch(() => {
        if (!cancelled) setMatrix(new Map());
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [industryCategory]);

  return { matrix, loading, packageCount: matrix.size };
}
