import { cn } from '@/lib/utils';

interface HealthRatingBadgeProps {
  rating: string;
}

export function HealthRatingBadge({ rating }: HealthRatingBadgeProps) {
  const getRatingColor = () => {
    switch (rating.toUpperCase()) {
      case 'A':
        return 'bg-green-500 border-green-700';
      case 'B':
        return 'bg-lime-500 border-lime-700';
      case 'C':
        return 'bg-yellow-500 border-yellow-700';
      case 'D':
        return 'bg-orange-500 border-orange-700';
      case 'F':
        return 'bg-red-500 border-red-700';
      default:
        return 'bg-gray-500 border-gray-700';
    }
  };

  return (
    <div
      className={cn(
        'flex items-center justify-center w-20 h-20 rounded-full shadow-lg border-4 text-white',
        getRatingColor()
      )}
    >
      <span className="text-4xl font-bold">{rating.toUpperCase()}</span>
    </div>
  );
}
