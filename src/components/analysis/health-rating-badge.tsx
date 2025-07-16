import { cn } from '@/lib/utils';

interface HealthRatingBadgeProps {
  rating: string;
}

export function HealthRatingBadge({ rating }: HealthRatingBadgeProps) {
  const getRatingColor = () => {
    const upperRating = rating.toUpperCase();
    if (['A', 'B'].includes(upperRating)) {
      return 'bg-healthy text-white border-healthy/80';
    }
    if (['D', 'F'].includes(upperRating)) {
      return 'bg-unhealthy text-white border-unhealthy/80';
    }
    if (upperRating === 'C') {
        return 'bg-secondary text-secondary-foreground border-secondary/80';
    }
    return 'bg-muted text-muted-foreground border-muted-foreground/50';
  };

  const getGlowEffectClass = () => {
    const upperRating = rating.toUpperCase();
    if (['A', 'B'].includes(upperRating)) {
        return 'shadow-[0_0_15px_hsl(var(--healthy)/0.7)]';
    }
    if (['D', 'F'].includes(upperRating)) {
        return 'shadow-[0_0_15px_hsl(var(--unhealthy)/0.7)]';
    }
    return '';
  };

  return (
    <div
      className={cn(
        'flex items-center justify-center w-20 h-20 rounded-full border-4 flex-shrink-0',
        getRatingColor(),
        getGlowEffectClass()
      )}
    >
      <span className="text-4xl font-bold drop-shadow-sm">{rating.toUpperCase()}</span>
    </div>
  );
}
