'use client';

import { useMemo } from 'react';
import { useAds } from '@/hooks/useAds';
import { StatsGrid } from '@/components/dashboard/StatsGrid';
import { HealthIndicators } from '@/components/dashboard/HealthIndicators';
import { ScheduleCalendar } from '@/components/dashboard/ScheduleCalendar';
import { PerformanceMetrics } from '@/components/dashboard/PerformanceMetrics';
import { PriceChart } from '@/components/dashboard/PriceChart';
import { CategoryBars } from '@/components/dashboard/CategoryBars';
import { DistributionCharts } from '@/components/dashboard/DistributionCharts';
import { StatsSection } from '@/components/dashboard/StatsSection';
import { PageLoader } from '@/components/ui';
import { useAdStats } from '@/hooks/useAdStats';
import styles from './page.module.scss';

export default function DashboardPage() {
  const { data: adsData, isLoading: adsLoading } = useAds();
  const ads = useMemo(() => adsData?.ads ?? [], [adsData]);

  const adNames = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const ad of ads) {
      if (ad.id != null) map[String(ad.id)] = ad.title;
    }
    return map;
  }, [ads]);

  // Shared react-query cache with StatsGrid: one fetch, same data everywhere.
  const { data: statsData } = useAdStats();

  if (adsLoading) {
    return <PageLoader />;
  }

  return (
    <div className={`${styles.dashboard} animStagger`}>
      <StatsGrid ads={ads} />
      <HealthIndicators ads={ads} />
      <ScheduleCalendar ads={ads} stats={statsData?.ads} />
      <PerformanceMetrics ads={ads} />
      <PriceChart ads={ads} />
      <CategoryBars ads={ads} />
      <DistributionCharts ads={ads} />
      <StatsSection stats={statsData?.ads ?? {}} lastUpdated={statsData?.last_updated ?? null} adNames={adNames} />
    </div>
  );
}
