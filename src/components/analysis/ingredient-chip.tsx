'use client';
import { useState } from 'react';
import { Badge } from '../ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import { explainIngredient } from '@/ai/flows/explain-ingredient';
import { Skeleton } from '../ui/skeleton';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface IngredientChipProps {
  ingredient: {
    name: string;
    category: string;
    explanation: string;
  };
  productName: string;
}

export function IngredientChip({ ingredient, productName }: IngredientChipProps) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();


  const getCategoryColor = (category: string) => {
    if (!category) return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700';
    switch (category.toLowerCase()) {
      case 'natural':
        return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700';
      case 'preservative':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700';
      case 'artificial':
        return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700';
      case 'organic':
        return 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/50 dark:text-teal-300 dark:border-teal-700';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700';
    }
  };

  const handleOpenChange = async (open: boolean) => {
    if (open && !explanation && !isLoading) {
      setIsLoading(true);
      try {
        const result = await explainIngredient({ ingredientName: ingredient.name, productName });
        setExplanation(result.explanation);
      } catch (error) {
          console.error("Failed to explain ingredient", error);
          toast({
              variant: 'destructive',
              title: 'Error',
              description: 'Could not fetch explanation for this ingredient.'
          })
          // Set a default explanation to avoid re-fetching on next open
          setExplanation(ingredient.explanation || "Could not load explanation.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <Popover onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Badge
          variant="outline"
          className={cn('cursor-pointer text-sm py-1 px-3', getCategoryColor(ingredient.category))}
        >
          {ingredient.name}
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">{ingredient.name}</h4>
            <p className="text-sm text-muted-foreground">{ingredient.category}</p>
          </div>
          <div className="text-sm">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              explanation || ingredient.explanation
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
