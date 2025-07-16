'use client';

import type { GenerateTruthSummaryOutput } from '@/ai/flows/generate-truth-summary';
import type { Product, ScanHistoryItem } from '@/lib/types';
import Image from 'next/image';
import { HealthRatingBadge } from './health-rating-badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { IngredientChip } from './ingredient-chip';
import { Button } from '../ui/button';
import Link from 'next/link';
import { Share2, Scan, AlertTriangle, Lightbulb } from 'lucide-react';
import { Separator } from '../ui/separator';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface AnalysisClientProps {
  product: Product;
  analysis: GenerateTruthSummaryOutput;
}

export function AnalysisClient({ product, analysis }: AnalysisClientProps) {
  const { toast } = useToast();

  useEffect(() => {
    try {
      const history: ScanHistoryItem[] = JSON.parse(
        localStorage.getItem('scanHistory') || '[]'
      );
      const newHistoryItem: ScanHistoryItem = {
        barcode: product.barcode,
        name: product.name,
        brand: product.brand,
        imageUrl: product.imageUrl,
        dataAiHint: product.dataAiHint,
        scanDate: new Date().toISOString(),
      };

      // Avoid duplicates
      const existingIndex = history.findIndex(
        (item) => item.barcode === product.barcode
      );
      if (existingIndex > -1) {
        history.splice(existingIndex, 1);
      }

      const newHistory = [newHistoryItem, ...history].slice(0, 50); // Keep last 50 scans
      localStorage.setItem('scanHistory', JSON.stringify(newHistory));
    } catch (error) {
      console.error('Failed to save scan history:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not save this scan to your history.',
      });
    }
  }, [product, toast]);

  const getRecommendationIcon = () => {
    switch (analysis.recommendation.toLowerCase()) {
      case 'yes':
        return <span className="text-3xl">👍</span>;
      case 'no':
        return <span className="text-3xl">👎</span>;
      case 'caution':
        return <span className="text-3xl">🤔</span>;
      default:
        return null;
    }
  };
  
  const getRecommendationColor = () => {
    switch (analysis.recommendation.toLowerCase()) {
      case 'yes':
        return 'border-green-500 bg-green-500/10';
      case 'no':
        return 'border-red-500 bg-red-500/10';
      case 'caution':
        return 'border-yellow-500 bg-yellow-500/10';
      default:
        return 'border-border';
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <Image
          src={product.imageUrl}
          alt={product.name}
          width={128}
          height={128}
          className="rounded-lg shadow-md"
          data-ai-hint={product.dataAiHint}
        />
        <div>
          <h1 className="text-3xl font-bold font-headline">{product.name}</h1>
          <p className="text-lg text-muted-foreground">{product.brand}</p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Truth Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <HealthRatingBadge rating={analysis.healthRating} />
            <p className="text-lg font-semibold">{analysis.summary}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Key Ingredients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {analysis.keyIngredients.map((ingredient) => (
              <IngredientChip
                key={ingredient.name}
                productName={product.name}
                ingredient={ingredient}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className={cn("transition-colors", getRecommendationColor())}>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl font-headline">
            {getRecommendationIcon()}
            Should I eat this?
          </CardTitle>
        </CardHeader>
        <CardContent>
            <Badge variant={
                analysis.recommendation.toLowerCase() === 'yes' ? 'default' :
                analysis.recommendation.toLowerCase() === 'no' ? 'destructive' :
                'secondary'
            } className="mb-2 text-lg">{analysis.recommendation}</Badge>
            <p>{analysis.explanation}</p>
        </CardContent>
      </Card>
      
      <Alert className="bg-amber-100/50 border-amber-300 dark:bg-amber-900/20 dark:border-amber-700/50">
        <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        <AlertTitle className="font-semibold text-amber-800 dark:text-amber-300">Unlock Full Analysis</AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-400">
          Watch a short ad to get a deep dive into hidden additives and processing techniques.
          <Button variant="outline" size="sm" className="mt-2">Watch Ad</Button>
        </AlertDescription>
      </Alert>


      <Separator />

      <div className="flex flex-col gap-4 sm:flex-row">
        <Link href="/scan" passHref className="flex-1">
          <Button size="lg" className="w-full">
            <Scan className="w-5 h-5 mr-2" />
            Scan Another
          </Button>
        </Link>
        <Button size="lg" variant="outline" className="flex-1">
          <Share2 className="w-5 h-5 mr-2" />
          Share
        </Button>
      </div>
    </div>
  );
}
