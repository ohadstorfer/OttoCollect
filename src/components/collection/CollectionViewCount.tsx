import React from 'react';
import { Eye } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { statisticsService } from '@/services/statisticsService';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface CollectionViewCountProps {
  userId?: string;
  countryId?: string;
  className?: string;
}

export const CollectionViewCount: React.FC<CollectionViewCountProps> = ({
  userId,
  countryId,
  className,
}) => {
  const isMobile = useIsMobile();
  const { t } = useTranslation(['profile']);

  const { data } = useQuery({
    queryKey: ['collection-view-count', userId, countryId],
    queryFn: () => statisticsService.getCollectionViewCount(userId!, countryId!),
    enabled: Boolean(userId && countryId),
    staleTime: 60_000,
  });

  // RPC returns null when the caller isn't authorized; hide the badge.
  if (data === null || data === undefined) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-1 text-muted-foreground text-xs sm:text-sm shrink-0',
        className
      )}
      title={t('viewCount.tooltip', 'Total collection views')}
    >
      <Eye className="h-4 w-4" />
      <span>{data}</span>
      {!isMobile && <span>{t('viewCount.viewed', 'viewed')}</span>}
    </div>
  );
};

export default CollectionViewCount;
